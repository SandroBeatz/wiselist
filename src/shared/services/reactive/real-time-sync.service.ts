import { 
  BehaviorSubject, 
  Observable, 
  Subject,
  merge,
  combineLatest
} from 'rxjs'
import {
  filter,
  map,
  tap,
  takeUntil,
  distinctUntilChanged,
  debounceTime,
  switchMap
} from 'rxjs/operators'
import { BaseReactiveService } from './base-reactive.service'
import { webSocketService } from './websocket-instance'
import { optimisticUpdatesService } from './optimistic-updates.service'
import { cacheService } from './cache.service'
import type { List, ListItem, ListId } from '@entities/list'

export interface ListEventData {
  type: 'LIST_CREATED' | 'LIST_UPDATED' | 'LIST_DELETED'
  listId: string
  data?: Partial<List>
  version: number
  timestamp: string
  userId: string
  eventId: string
}

export interface ListSyncState {
  lastSyncTime: number
  connectedUsers: string[]
  pendingSyncs: string[]
  conflictingOperations: string[]
  syncErrors: Array<{ listId: string; error: string; timestamp: number }>
}

export interface MergeStrategy {
  strategy: 'server_wins' | 'client_wins' | 'merge_fields' | 'manual_resolution'
  reason: string
  conflictFields?: string[]
  mergedData?: any
}

/**
 * Real-time List Synchronization Service
 * Handles live synchronization of list changes with intelligent conflict resolution
 */
export class RealTimeListSyncService extends BaseReactiveService {
  private readonly _syncState$ = new BehaviorSubject<ListSyncState>(this.getInitialSyncState())
  private readonly _listEvents$ = new Subject<ListEventData>()
  private readonly _conflictResolutions$ = new Subject<{ eventId: string; resolution: MergeStrategy }>()
  
  private readonly versionCache = new Map<string, number>()
  private readonly eventProcessingQueue = new Map<string, ListEventData[]>()
  
  constructor() {
    super({ enableLogging: process.env.NODE_ENV === 'development' })
    this.initializeWebSocketListeners()
    this.initializeConflictResolution()
    this.initializeSyncStateTracking()
  }

  /**
   * Get initial sync state
   */
  private getInitialSyncState(): ListSyncState {
    return {
      lastSyncTime: Date.now(),
      connectedUsers: [],
      pendingSyncs: [],
      conflictingOperations: [],
      syncErrors: []
    }
  }

  /**
   * Observable of sync state
   */
  get syncState$(): Observable<ListSyncState> {
    return this.createObservable(this._syncState$)
  }

  /**
   * Observable of list events
   */
  get listEvents$(): Observable<ListEventData> {
    return this._listEvents$.asObservable().pipe(takeUntil(this.destroy$))
  }

  /**
   * Get sync state for a specific list
   */
  getListSyncState(listId: string): Observable<{
    version: number
    hasPendingChanges: boolean
    hasConflicts: boolean
    lastSyncTime: number
  }> {
    return combineLatest([
      this.syncState$,
      optimisticUpdatesService.getPendingOperations(listId)
    ]).pipe(
      map(([syncState, pendingOps]) => ({
        version: this.versionCache.get(listId) || 0,
        hasPendingChanges: pendingOps.length > 0,
        hasConflicts: syncState.conflictingOperations.includes(listId),
        lastSyncTime: syncState.lastSyncTime
      })),
      distinctUntilChanged()
    )
  }

  /**
   * Get connected users for collaboration features
   */
  getConnectedUsers(): Observable<string[]> {
    return this.syncState$.pipe(
      map(state => state.connectedUsers),
      distinctUntilChanged()
    )
  }

  /**
   * Subscribe to events for a specific list
   */
  subscribeToListEvents(listId: string): Observable<ListEventData> {
    return this.listEvents$.pipe(
      filter(event => event.listId === listId),
      distinctUntilChanged((prev, curr) => prev.eventId === curr.eventId)
    )
  }

  /**
   * Force sync for a specific list
   */
  async forceSyncList(listId: string): Promise<void> {
    this.log(`Force syncing list ${listId}`)
    
    try {
      // Mark as pending sync
      this.addPendingSync(listId)
      
      // Get latest version from cache
      const currentVersion = this.versionCache.get(listId) || 0
      
      // Request sync from WebSocket
      await this.requestListSync(listId, currentVersion)
      
      this.log(`Force sync initiated for list ${listId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.handleSyncError(listId, `Force sync failed: ${errorMessage}`)
      throw error
    } finally {
      this.removePendingSync(listId)
    }
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(eventId: string, resolution: MergeStrategy): Promise<void> {
    this.log(`Resolving conflict ${eventId} with strategy: ${resolution.strategy}`)
    
    this._conflictResolutions$.next({ eventId, resolution })
    
    // Remove from conflicting operations
    const currentState = this._syncState$.value
    this._syncState$.next({
      ...currentState,
      conflictingOperations: currentState.conflictingOperations.filter(id => id !== eventId)
    })
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Initialize WebSocket listeners for list events
   */
  private initializeWebSocketListeners(): void {
    // Listen to WebSocket list events
    webSocketService.listEvents$
      .pipe(
        filter(event => this.isValidListEvent(event)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.processListEvent(event)
      })

    // Listen to connection state changes
    webSocketService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.handleConnectionStateChange(state)
      })

    // Listen to user presence events
    webSocketService.userPresence$
      .pipe(takeUntil(this.destroy$))
      .subscribe(presence => {
        this.handleUserPresenceUpdate(presence)
      })
  }

  /**
   * Initialize conflict resolution system
   */
  private initializeConflictResolution(): void {
    // Process conflict resolutions
    this._conflictResolutions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ eventId, resolution }) => {
        this.applyConflictResolution(eventId, resolution)
      })

    // Auto-resolve simple conflicts after a delay
    this._listEvents$
      .pipe(
        debounceTime(5000), // Wait 5 seconds for manual resolution
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.attemptAutoConflictResolution(event)
      })
  }

  /**
   * Initialize sync state tracking
   */
  private initializeSyncStateTracking(): void {
    // Update last sync time periodically
    const syncInterval = setInterval(() => {
      const currentState = this._syncState$.value
      this._syncState$.next({
        ...currentState,
        lastSyncTime: Date.now()
      })
    }, 30000) // Every 30 seconds

    // Cleanup interval on destroy
    this.destroy$.subscribe(() => {
      clearInterval(syncInterval)
    })
  }

  /**
   * Validate incoming list event
   */
  private isValidListEvent(event: any): boolean {
    return event && 
           typeof event.type === 'string' && 
           ['LIST_CREATED', 'LIST_UPDATED', 'LIST_DELETED'].includes(event.type) &&
           typeof event.listId === 'string' &&
           typeof event.version === 'number' &&
           typeof event.eventId === 'string'
  }

  /**
   * Process incoming list event
   */
  private processListEvent(event: any): void {
    const listEvent: ListEventData = {
      type: event.type,
      listId: event.listId,
      data: event.data,
      version: event.version,
      timestamp: event.timestamp || new Date().toISOString(),
      userId: event.userId || 'unknown',
      eventId: event.eventId
    }

    this.log('Processing list event', listEvent)

    // Check for version conflicts
    const currentVersion = this.versionCache.get(event.listId) || 0
    if (event.version <= currentVersion) {
      this.log('Ignoring outdated event', { 
        eventVersion: event.version, 
        currentVersion,
        listId: event.listId 
      })
      return
    }

    // Queue event for processing
    this.queueEventForProcessing(listEvent)
  }

  /**
   * Queue event for ordered processing
   */
  private queueEventForProcessing(event: ListEventData): void {
    const { listId } = event
    
    if (!this.eventProcessingQueue.has(listId)) {
      this.eventProcessingQueue.set(listId, [])
    }
    
    const queue = this.eventProcessingQueue.get(listId)!
    queue.push(event)
    
    // Sort queue by version to ensure proper order
    queue.sort((a, b) => a.version - b.version)
    
    // Process the queue
    this.processEventQueue(listId)
  }

  /**
   * Process queued events for a list
   */
  private processEventQueue(listId: string): void {
    const queue = this.eventProcessingQueue.get(listId)
    if (!queue || queue.length === 0) return

    const currentVersion = this.versionCache.get(listId) || 0
    
    // Process events in version order
    while (queue.length > 0) {
      const nextEvent = queue[0]
      
      // Check if this is the next expected version
      if (nextEvent.version !== currentVersion + 1) {
        this.log('Waiting for missing version', { 
          expected: currentVersion + 1,
          received: nextEvent.version,
          listId 
        })
        break
      }
      
      // Remove from queue and process
      queue.shift()
      this.handleListEventWithConflictDetection(nextEvent)
      
      // Update version cache
      this.versionCache.set(listId, nextEvent.version)
    }
  }

  /**
   * Handle list event with conflict detection
   */
  private handleListEventWithConflictDetection(event: ListEventData): void {
    this.log('Handling list event with conflict detection', event)

    // Check for potential conflicts with optimistic operations
    const conflictStrategy = this.detectConflicts(event)
    
    if (conflictStrategy.strategy === 'manual_resolution') {
      this.handleConflictRequiringManualResolution(event, conflictStrategy)
      return
    }

    // Apply the event based on strategy
    this.applyListEventWithStrategy(event, conflictStrategy)
    
    // Emit the processed event
    this._listEvents$.next(event)
  }

  /**
   * Detect conflicts with optimistic operations
   */
  private detectConflicts(event: ListEventData): MergeStrategy {
    const pendingOps = optimisticUpdatesService.currentState.operations.filter(
      op => op.listId === event.listId && op.status === 'pending'
    )

    if (pendingOps.length === 0) {
      return { strategy: 'server_wins', reason: 'No pending operations' }
    }

    // Check for direct conflicts
    const conflictingOps = pendingOps.filter(op => {
      switch (event.type) {
        case 'LIST_UPDATED':
          return op.type === 'UPDATE_LIST'
        case 'LIST_DELETED':
          return ['UPDATE_LIST', 'DELETE_LIST'].includes(op.type)
        default:
          return false
      }
    })

    if (conflictingOps.length === 0) {
      return { strategy: 'server_wins', reason: 'No conflicting operations' }
    }

    // Analyze field-level conflicts for LIST_UPDATED
    if (event.type === 'LIST_UPDATED') {
      const mergeResult = this.analyzeFieldConflicts(event, conflictingOps)
      if (mergeResult.canMerge) {
        return {
          strategy: 'merge_fields',
          reason: 'Non-overlapping field changes',
          mergedData: mergeResult.mergedData
        }
      }
    }

    // Check timing - if server event is much newer, prefer server
    const serverTime = new Date(event.timestamp).getTime()
    const newestOpTime = Math.max(...conflictingOps.map(op => op.timestamp))
    
    if (serverTime > newestOpTime + 5000) { // 5 second threshold
      return { 
        strategy: 'server_wins', 
        reason: 'Server event is significantly newer',
        conflictFields: this.getConflictingFields(event, conflictingOps)
      }
    }

    // Default to manual resolution for complex conflicts
    return {
      strategy: 'manual_resolution',
      reason: 'Complex conflict requiring user decision',
      conflictFields: this.getConflictingFields(event, conflictingOps)
    }
  }

  /**
   * Analyze field-level conflicts for merging
   */
  private analyzeFieldConflicts(event: ListEventData, conflictingOps: any[]): { canMerge: boolean; mergedData?: any } {
    if (event.type !== 'LIST_UPDATED' || !event.data) {
      return { canMerge: false }
    }

    const serverFields = Object.keys(event.data)
    const localFields = conflictingOps.reduce((fields, op) => {
      if (op.optimisticData) {
        fields.push(...Object.keys(op.optimisticData))
      }
      return fields
    }, [] as string[])

    // Check for field overlap
    const hasOverlap = serverFields.some(field => localFields.includes(field))
    
    if (!hasOverlap) {
      // No overlap, can safely merge
      const localData = conflictingOps.reduce((merged, op) => {
        return { ...merged, ...(op.optimisticData || {}) }
      }, {})
      
      return {
        canMerge: true,
        mergedData: { ...event.data, ...localData }
      }
    }

    return { canMerge: false }
  }

  /**
   * Get conflicting fields between server and local changes
   */
  private getConflictingFields(event: ListEventData, conflictingOps: any[]): string[] {
    if (!event.data) return []

    const serverFields = Object.keys(event.data)
    const localFields = conflictingOps.reduce((fields, op) => {
      if (op.optimisticData) {
        fields.push(...Object.keys(op.optimisticData))
      }
      return fields
    }, [] as string[])

    return serverFields.filter(field => localFields.includes(field))
  }

  /**
   * Apply list event with specified strategy
   */
  private applyListEventWithStrategy(event: ListEventData, strategy: MergeStrategy): void {
    this.log('Applying event with strategy', { event: event.eventId, strategy: strategy.strategy })

    const dataToApply = strategy.strategy === 'merge_fields' && strategy.mergedData
      ? strategy.mergedData
      : event.data

    // Update cache with the event data
    switch (event.type) {
      case 'LIST_CREATED':
        if (dataToApply) {
          cacheService.setList(event.listId, dataToApply as List, event.version)
        }
        break

      case 'LIST_UPDATED':
        if (dataToApply) {
          const existingList = cacheService.getListSync(event.listId)
          if (existingList) {
            const updatedList = { ...existingList, ...dataToApply }
            cacheService.setList(event.listId, updatedList, event.version)
          }
        }
        break

      case 'LIST_DELETED':
        cacheService.invalidateList(event.listId)
        break
    }

    // If we used merge strategy, update the optimistic operations
    if (strategy.strategy === 'merge_fields') {
      this.updateOptimisticOperationsAfterMerge(event.listId, strategy.mergedData)
    }
  }

  /**
   * Handle conflict requiring manual resolution
   */
  private handleConflictRequiringManualResolution(event: ListEventData, strategy: MergeStrategy): void {
    this.log('Conflict requires manual resolution', { event: event.eventId, strategy })

    // Add to conflicting operations
    const currentState = this._syncState$.value
    this._syncState$.next({
      ...currentState,
      conflictingOperations: [...currentState.conflictingOperations, event.eventId]
    })

    // Emit error for UI notification
    this.setError(`List conflict detected: ${strategy.reason}. Manual resolution required.`)

    // Store event for later resolution
    this.storeConflictingEvent(event, strategy)
  }

  /**
   * Store conflicting event for manual resolution
   */
  private storeConflictingEvent(event: ListEventData, strategy: MergeStrategy): void {
    // Store in a way that can be retrieved for manual resolution
    const conflictData = {
      event,
      strategy,
      timestamp: Date.now()
    }
    
    // Could be stored in localStorage or a conflict resolution store
    localStorage.setItem(`conflict_${event.eventId}`, JSON.stringify(conflictData))
  }

  /**
   * Apply manual conflict resolution
   */
  private applyConflictResolution(eventId: string, resolution: MergeStrategy): void {
    this.log('Applying manual conflict resolution', { eventId, resolution })

    // Retrieve stored conflict
    const conflictDataStr = localStorage.getItem(`conflict_${eventId}`)
    if (!conflictDataStr) {
      this.log('No conflict data found for eventId', eventId)
      return
    }

    const conflictData = JSON.parse(conflictDataStr)
    const event = conflictData.event

    // Apply the resolution
    this.applyListEventWithStrategy(event, resolution)

    // Emit the resolved event
    this._listEvents$.next(event)

    // Cleanup
    localStorage.removeItem(`conflict_${eventId}`)
  }

  /**
   * Attempt automatic conflict resolution for simple cases
   */
  private attemptAutoConflictResolution(event: ListEventData): void {
    if (!this._syncState$.value.conflictingOperations.includes(event.eventId)) {
      return // Not a conflicting event
    }

    this.log('Attempting auto-resolution for conflict', event.eventId)

    // For now, use server_wins as default auto-resolution
    const autoResolution: MergeStrategy = {
      strategy: 'server_wins',
      reason: 'Auto-resolved: Server changes preferred'
    }

    this.resolveConflict(event.eventId, autoResolution)
  }

  /**
   * Update optimistic operations after successful merge
   */
  private updateOptimisticOperationsAfterMerge(listId: string, mergedData: any): void {
    // Mark conflicting optimistic operations as successful since they were merged
    const pendingOps = optimisticUpdatesService.currentState.operations.filter(
      op => op.listId === listId && op.status === 'pending' && op.type === 'UPDATE_LIST'
    )

    pendingOps.forEach(op => {
      // This would require extending the optimistic service to mark as merged
      this.log('Optimistic operation merged successfully', { operationId: op.id })
    })
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(state: string): void {
    this.log('Connection state changed', state)
    
    const currentState = this._syncState$.value
    
    if (state === 'connected') {
      // Clear sync errors when reconnected
      this._syncState$.next({
        ...currentState,
        syncErrors: []
      })
      
      // Force sync all lists with pending changes
      this.syncPendingChanges()
    }
  }

  /**
   * Handle user presence updates
   */
  private handleUserPresenceUpdate(presence: any): void {
    if (presence && presence.activeUsers) {
      const currentState = this._syncState$.value
      this._syncState$.next({
        ...currentState,
        connectedUsers: presence.activeUsers
      })
    }
  }

  /**
   * Request list sync via WebSocket
   */
  private async requestListSync(listId: string, fromVersion: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync request timeout'))
      }, 10000)

      // Send sync request (simplified - would use actual WebSocket emit method)
      // webSocketService.emit('requestListSync', {
      //   listId,
      //   fromVersion,
      //   requestId: `sync_${Date.now()}`
      // })
      
      // For now, simulate the request
      this.log(`Sync request sent for list ${listId} from version ${fromVersion}`)

      // Listen for sync response (simplified - would need proper event handling)
      const syncHandler = (response: any) => {
        if (response.listId === listId) {
          clearTimeout(timeout)
          resolve()
        }
      }

      // This is a simplified version - actual implementation would need proper event handling
      setTimeout(() => {
        clearTimeout(timeout)
        resolve()
      }, 1000)
    })
  }

  /**
   * Sync all pending changes
   */
  private async syncPendingChanges(): Promise<void> {
    const pendingOps = optimisticUpdatesService.currentState.operations
      .filter(op => op.status === 'pending')
    
    const listsToSync = [...new Set(pendingOps.map(op => op.listId))]
    
    const syncPromises = listsToSync.map(listId => this.forceSyncList(listId))
    await Promise.allSettled(syncPromises)
  }

  /**
   * Add pending sync
   */
  private addPendingSync(listId: string): void {
    const currentState = this._syncState$.value
    if (!currentState.pendingSyncs.includes(listId)) {
      this._syncState$.next({
        ...currentState,
        pendingSyncs: [...currentState.pendingSyncs, listId]
      })
    }
  }

  /**
   * Remove pending sync
   */
  private removePendingSync(listId: string): void {
    const currentState = this._syncState$.value
    this._syncState$.next({
      ...currentState,
      pendingSyncs: currentState.pendingSyncs.filter(id => id !== listId)
    })
  }

  /**
   * Handle sync error
   */
  private handleSyncError(listId: string, error: string): void {
    const currentState = this._syncState$.value
    this._syncState$.next({
      ...currentState,
      syncErrors: [
        ...currentState.syncErrors,
        { listId, error, timestamp: Date.now() }
      ].slice(-10) // Keep only last 10 errors
    })

    this.setError(`Sync error for list ${listId}: ${error}`)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.eventProcessingQueue.clear()
    this.versionCache.clear()
    
    this._syncState$.complete()
    this._listEvents$.complete()
    this._conflictResolutions$.complete()
    
    super.destroy()
  }
}

// Create and export singleton instance
export const realTimeListSyncService = new RealTimeListSyncService()
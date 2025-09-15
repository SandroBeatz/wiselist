import { 
  BehaviorSubject, 
  Observable, 
  Subject,
  combineLatest
} from 'rxjs'
import {
  filter,
  map,
  takeUntil,
  distinctUntilChanged,
  debounceTime,
  groupBy,
  mergeMap
} from 'rxjs/operators'
import { BaseReactiveService } from './base-reactive.service'
import { webSocketService } from './websocket-instance'
import { optimisticUpdatesService } from './optimistic-updates.service'
import { cacheService } from './cache.service'
import type { ListItem } from '@entities/list'

export interface ItemEventData {
  type: 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED' | 'ITEM_CHECKED' | 'ITEM_REORDERED'
  listId: string
  itemId: string
  data?: Partial<ListItem>
  version: number
  timestamp: string
  userId: string
  eventId: string
  previousData?: Partial<ListItem>
  reorderData?: {
    itemId: string
    oldIndex: number
    newIndex: number
    affectedItems: Array<{ id: string; order: number }>
  }
}

export interface ItemSyncState {
  lastSyncTime: number
  itemVersions: Map<string, number>
  pendingItemSyncs: string[]
  conflictingItemOperations: string[]
  itemSyncErrors: Array<{ itemId: string; listId: string; error: string; timestamp: number }>
  reorderInProgress: Map<string, boolean> // listId -> boolean
  activeUsers: Map<string, { userId: string; username?: string; joinedAt: number; lastActivity: number }> // listId -> user info
  itemEditingUsers: Map<string, { userId: string; username?: string; startedAt: number }> // itemId -> user info
}

export interface ItemMergeStrategy {
  strategy: 'server_wins' | 'client_wins' | 'merge_fields' | 'manual_resolution' | 'keep_both'
  reason: string
  conflictFields?: string[]
  mergedData?: any
  resolution?: 'accept_server' | 'keep_local' | 'create_duplicate'
}

/**
 * Real-time Item Management Service
 * Handles live synchronization of list item changes with advanced conflict resolution
 */
export class RealTimeItemSyncService extends BaseReactiveService {
  private readonly _itemSyncState$ = new BehaviorSubject<ItemSyncState>(this.getInitialItemSyncState())
  private readonly _itemEvents$ = new Subject<ItemEventData>()
  private readonly _itemConflictResolutions$ = new Subject<{ eventId: string; resolution: ItemMergeStrategy }>()
  
  private readonly itemEventProcessingQueue = new Map<string, ItemEventData[]>()
  private readonly reorderDebounceMap = new Map<string, NodeJS.Timeout>()
  
  constructor() {
    super({ enableLogging: process.env.NODE_ENV === 'development' })
    this.initializeItemWebSocketListeners()
    this.initializeItemConflictResolution()
    this.initializeReorderManagement()
  }

  /**
   * Get initial item sync state
   */
  private getInitialItemSyncState(): ItemSyncState {
    return {
      lastSyncTime: Date.now(),
      itemVersions: new Map(),
      pendingItemSyncs: [],
      conflictingItemOperations: [],
      itemSyncErrors: [],
      reorderInProgress: new Map(),
      activeUsers: new Map(),
      itemEditingUsers: new Map()
    }
  }

  /**
   * Observable of item sync state
   */
  get itemSyncState$(): Observable<ItemSyncState> {
    return this.createObservable(this._itemSyncState$)
  }

  /**
   * Observable of item events
   */
  get itemEvents$(): Observable<ItemEventData> {
    return this._itemEvents$.asObservable().pipe(takeUntil(this.destroy$))
  }

  /**
   * Get item sync state for a specific item
   */
  getItemSyncState(itemId: string): Observable<{
    version: number
    hasPendingChanges: boolean
    hasConflicts: boolean
    isReorderInProgress: boolean
    lastSyncTime: number
  }> {
    return combineLatest([
      this.itemSyncState$,
      optimisticUpdatesService.state$
    ]).pipe(
      map(([itemSyncState, optimisticState]) => {
        const pendingItemOps = optimisticState.operations.filter(op => 
          op.optimisticData?.id === itemId && op.status === 'pending'
        )
        
        return {
          version: itemSyncState.itemVersions.get(itemId) || 0,
          hasPendingChanges: pendingItemOps.length > 0,
          hasConflicts: itemSyncState.conflictingItemOperations.includes(itemId),
          isReorderInProgress: false, // Will be determined by list context
          lastSyncTime: itemSyncState.lastSyncTime
        }
      }),
      distinctUntilChanged()
    )
  }

  /**
   * Subscribe to events for specific items in a list
   */
  subscribeToListItemEvents(listId: string): Observable<ItemEventData> {
    return this.itemEvents$.pipe(
      filter(event => event.listId === listId),
      distinctUntilChanged((prev, curr) => prev.eventId === curr.eventId)
    )
  }

  /**
   * Subscribe to events for a specific item
   */
  subscribeToItemEvents(itemId: string): Observable<ItemEventData> {
    return this.itemEvents$.pipe(
      filter(event => event.itemId === itemId),
      distinctUntilChanged((prev, curr) => prev.eventId === curr.eventId)
    )
  }

  /**
   * Get reorder status for a list
   */
  getListReorderStatus(listId: string): Observable<boolean> {
    return this.itemSyncState$.pipe(
      map(state => state.reorderInProgress.get(listId) || false),
      distinctUntilChanged()
    )
  }

  /**
   * Get active users for a list
   */
  getActiveUsersForList(listId: string): Observable<Array<{ userId: string; username?: string; joinedAt: number; lastActivity: number }>> {
    return this.itemSyncState$.pipe(
      map(state => {
        const listUsers = state.activeUsers.get(listId)
        return listUsers ? [listUsers] : []
      }),
      distinctUntilChanged()
    )
  }

  /**
   * Get user currently editing an item
   */
  getItemEditingUser(itemId: string): Observable<{ userId: string; username?: string; startedAt: number } | null> {
    return this.itemSyncState$.pipe(
      map(state => state.itemEditingUsers.get(itemId) || null),
      distinctUntilChanged()
    )
  }

  /**
   * Get all currently editing users for multiple items
   */
  getEditingUsersForItems(itemIds: string[]): Observable<Map<string, { userId: string; username?: string; startedAt: number }>> {
    return this.itemSyncState$.pipe(
      map(state => {
        const editingUsers = new Map()
        itemIds.forEach(itemId => {
          const user = state.itemEditingUsers.get(itemId)
          if (user) {
            editingUsers.set(itemId, user)
          }
        })
        return editingUsers
      }),
      distinctUntilChanged()
    )
  }

  /**
   * Start item sync for a list
   */
  async startItemSync(listId: string): Promise<void> {
    this.log(`Starting item sync for list ${listId}`)
    
    try {
      // Join the list room for real-time updates
      webSocketService.joinList(listId)
      
      // Request active users
      webSocketService.getActiveUsers(listId)
      
      // Initialize tracking for this list
      const currentState = this._itemSyncState$.value
      const updatedState = { ...currentState }
      updatedState.reorderInProgress.set(listId, false)
      this._itemSyncState$.next(updatedState)
      
      this.log(`Item sync started for list ${listId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.handleItemSyncError(listId, 'sync_start', `Failed to start sync: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Stop item sync for a list
   */
  stopItemSync(listId: string): void {
    this.log(`Stopping item sync for list ${listId}`)
    
    // Leave the list room
    webSocketService.leaveList(listId)
    
    // Clean up state for this list
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    
    // Remove list-specific state
    updatedState.reorderInProgress.delete(listId)
    updatedState.activeUsers.delete(listId)
    
    // Remove item editing sessions for items in this list
    // This would need a way to map itemId to listId - simplified for now
    
    this._itemSyncState$.next(updatedState)
    this.log(`Item sync stopped for list ${listId}`)
  }

  /**
   * Refresh items for a list
   */
  async refreshItems(listId: string): Promise<void> {
    this.log(`Refreshing items for list ${listId}`)
    
    try {
      // This would typically fetch from the API
      // For now, just trigger a heartbeat to get latest updates
      webSocketService.sendHeartbeat(listId)
      
      this.log(`Items refreshed for list ${listId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.handleItemSyncError(listId, 'refresh', `Failed to refresh: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Create item with optimistic update
   */
  async createItemOptimistic(listId: string, itemData: Partial<ListItem>): Promise<ListItem> {
    return optimisticUpdatesService.createItemOptimistic(listId, itemData, () => {
      this.log('Applying optimistic item creation')
      // The optimistic update is already applied by the service
    })
  }

  /**
   * Create item without optimistic update
   */
  async createItem(listId: string, itemData: Partial<ListItem>): Promise<ListItem> {
    // This would make the actual API call
    throw new Error('Direct item creation not implemented - use optimistic version')
  }

  /**
   * Update item with optimistic update
   */
  async updateItemOptimistic(itemId: string, updates: Partial<ListItem>): Promise<ListItem> {
    // Find the list ID for this item - this would need to be determined from context
    const listId = 'unknown-list' // Would need to be determined from context
    
    await optimisticUpdatesService.updateItemOptimistic(
      listId,
      itemId,
      updates,
      () => {
        this.log('Applying optimistic item update', itemId)
        this.notifyItemEditingStart(itemId)
      },
      (originalData: ListItem) => {
        this.log('Rolling back item update', { itemId, originalData })
      }
    )
    
    // Return the updated item (this is a placeholder)
    return { id: itemId, ...updates } as ListItem
  }

  /**
   * Update item without optimistic update
   */
  async updateItem(itemId: string, updates: Partial<ListItem>): Promise<ListItem> {
    throw new Error('Direct item update not implemented - use optimistic version')
  }

  /**
   * Delete item with optimistic update
   */
  async deleteItemOptimistic(itemId: string): Promise<void> {
    // Find the list ID for this item - this would need to be determined from context
    const listId = 'unknown-list' // Would need to be determined from context
    
    return optimisticUpdatesService.deleteItemOptimistic(
      listId,
      itemId,
      () => {
        this.log('Applying optimistic item deletion', itemId)
        this.notifyItemEditingStop(itemId)
      },
      (originalData: ListItem) => {
        this.log('Rolling back item deletion', { itemId, originalData })
      }
    )
  }

  /**
   * Delete item without optimistic update
   */
  async deleteItem(itemId: string): Promise<void> {
    throw new Error('Direct item deletion not implemented - use optimistic version')
  }

  /**
   * Toggle item checked state with optimistic update
   */
  async toggleItemOptimistic(itemId: string, checked: boolean): Promise<ListItem> {
    // Find the list ID for this item - this is a simplified implementation
    const listId = 'unknown-list' // Would need to be determined from context
    
    await optimisticUpdatesService.updateItemOptimistic(
      listId,
      itemId,
      { checked },
      (updates: Partial<ListItem>) => {
        this.log('Applying optimistic item toggle', { itemId, checked })
      },
      (originalData: ListItem) => {
        this.log('Rolling back item toggle', { itemId, originalChecked: originalData.checked })
      }
    )
    
    // Return the updated item (this is a placeholder)
    return { id: itemId, checked } as ListItem
  }

  /**
   * Toggle item without optimistic update
   */
  async toggleItem(itemId: string, checked: boolean): Promise<ListItem> {
    throw new Error('Direct item toggle not implemented - use optimistic version')
  }

  /**
   * Reorder items with optimistic update
   */
  async reorderItemsOptimistic(listId: string, itemIds: string[], newOrder: number[]): Promise<void> {
    // For now, we'll implement reordering as a list update operation
    // This would need to be enhanced based on the actual backend API
    
    this.log('Applying optimistic item reorder', { listId, itemCount: itemIds.length })
    
    // Mark reorder as in progress
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.reorderInProgress.set(listId, true)
    this._itemSyncState$.next(updatedState)
    
    // For now, we'll just log the reorder operation
    // In a full implementation, this would queue a reorder operation
    return Promise.resolve()
  }

  /**
   * Reorder items without optimistic update
   */
  async reorderItems(listId: string, itemIds: string[], newOrder: number[]): Promise<void> {
    throw new Error('Direct item reorder not implemented - use optimistic version')
  }

  /**
   * Force sync for specific items
   */
  async forceSyncItems(listId: string, itemIds: string[]): Promise<void> {
    this.log(`Force syncing ${itemIds.length} items in list ${listId}`)
    
    try {
      // Mark items as pending sync
      this.addPendingItemSyncs(itemIds)
      
      // Request item sync from WebSocket
      await this.requestItemsSync(listId, itemIds)
      
      this.log(`Force sync initiated for items in list ${listId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.handleItemSyncError(listId, 'batch', `Force sync failed: ${errorMessage}`)
      throw error
    } finally {
      this.removePendingItemSyncs(itemIds)
    }
  }

  /**
   * Resolve item conflict manually
   */
  async resolveItemConflict(eventId: string, resolution: ItemMergeStrategy): Promise<void> {
    this.log(`Resolving item conflict ${eventId} with strategy: ${resolution.strategy}`)
    
    this._itemConflictResolutions$.next({ eventId, resolution })
    
    // Remove from conflicting operations
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.conflictingItemOperations = updatedState.conflictingItemOperations.filter(id => id !== eventId)
    this._itemSyncState$.next(updatedState)
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Initialize WebSocket listeners for item events
   */
  private initializeItemWebSocketListeners(): void {
    // Listen to WebSocket list events and filter for item events
    webSocketService.listEvents$
      .pipe(
        filter(event => this.isValidItemEvent(event)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.processItemEvent(event)
      })

    // Listen to user presence for collaborative editing indicators
    webSocketService.userPresence$
      .pipe(takeUntil(this.destroy$))
      .subscribe(presence => {
        this.handleUserPresenceForItems(presence)
      })
  }

  /**
   * Initialize item conflict resolution system
   */
  private initializeItemConflictResolution(): void {
    // Process conflict resolutions
    this._itemConflictResolutions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ eventId, resolution }) => {
        this.applyItemConflictResolution(eventId, resolution)
      })

    // Auto-resolve simple item conflicts after a delay
    this._itemEvents$
      .pipe(
        debounceTime(3000), // Wait 3 seconds for manual resolution
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.attemptAutoItemConflictResolution(event)
      })
  }

  /**
   * Initialize reorder management with debouncing
   */
  private initializeReorderManagement(): void {
    // Handle reorder events with special debouncing
    this._itemEvents$
      .pipe(
        filter(event => event.type === 'ITEM_REORDERED'),
        groupBy(event => event.listId),
        mergeMap(group => 
          group.pipe(
            debounceTime(500) // Debounce reorder events per list
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.processReorderEvent(event)
      })
  }

  /**
   * Validate incoming item event
   */
  private isValidItemEvent(event: any): boolean {
    return event && 
           typeof event.type === 'string' && 
           ['ITEM_CREATED', 'ITEM_UPDATED', 'ITEM_DELETED', 'ITEM_CHECKED', 'ITEM_REORDERED'].includes(event.type) &&
           typeof event.listId === 'string' &&
           typeof event.itemId === 'string' &&
           typeof event.version === 'number' &&
           typeof event.eventId === 'string'
  }

  /**
   * Process incoming item event
   */
  private processItemEvent(event: any): void {
    const itemEvent: ItemEventData = {
      type: event.type,
      listId: event.listId,
      itemId: event.itemId,
      data: event.data,
      version: event.version,
      timestamp: event.timestamp || new Date().toISOString(),
      userId: event.userId || 'unknown',
      eventId: event.eventId,
      previousData: event.previousData,
      reorderData: event.reorderData
    }

    this.log('Processing item event', itemEvent)

    // Check for version conflicts
    const currentVersion = this._itemSyncState$.value.itemVersions.get(event.itemId) || 0
    if (event.version <= currentVersion && event.type !== 'ITEM_REORDERED') {
      this.log('Ignoring outdated item event', { 
        eventVersion: event.version, 
        currentVersion,
        itemId: event.itemId 
      })
      return
    }

    // Queue event for processing
    this.queueItemEventForProcessing(itemEvent)
  }

  /**
   * Queue item event for ordered processing
   */
  private queueItemEventForProcessing(event: ItemEventData): void {
    const queueKey = `${event.listId}_${event.itemId}`
    
    if (!this.itemEventProcessingQueue.has(queueKey)) {
      this.itemEventProcessingQueue.set(queueKey, [])
    }
    
    const queue = this.itemEventProcessingQueue.get(queueKey)!
    queue.push(event)
    
    // Sort queue by version to ensure proper order
    queue.sort((a, b) => a.version - b.version)
    
    // Process the queue
    this.processItemEventQueue(queueKey)
  }

  /**
   * Process queued item events
   */
  private processItemEventQueue(queueKey: string): void {
    const queue = this.itemEventProcessingQueue.get(queueKey)
    if (!queue || queue.length === 0) return

    const [listId, itemId] = queueKey.split('_')
    const currentVersion = this._itemSyncState$.value.itemVersions.get(itemId) || 0
    
    // Process events in version order
    while (queue.length > 0) {
      const nextEvent = queue[0]
      
      // For reorder events, we're more lenient with version checking
      if (nextEvent.type !== 'ITEM_REORDERED' && nextEvent.version !== currentVersion + 1) {
        this.log('Waiting for missing item version', { 
          expected: currentVersion + 1,
          received: nextEvent.version,
          itemId,
          listId 
        })
        break
      }
      
      // Remove from queue and process
      queue.shift()
      this.handleItemEventWithConflictDetection(nextEvent)
      
      // Update version cache
      this.updateItemVersion(itemId, nextEvent.version)
    }
  }

  /**
   * Handle item event with conflict detection
   */
  private handleItemEventWithConflictDetection(event: ItemEventData): void {
    this.log('Handling item event with conflict detection', event)

    // Check for potential conflicts with optimistic operations
    const conflictStrategy = this.detectItemConflicts(event)
    
    if (conflictStrategy.strategy === 'manual_resolution') {
      this.handleItemConflictRequiringManualResolution(event, conflictStrategy)
      return
    }

    // Apply the event based on strategy
    this.applyItemEventWithStrategy(event, conflictStrategy)
    
    // Emit the processed event
    this._itemEvents$.next(event)
  }

  /**
   * Detect conflicts with optimistic operations for items
   */
  private detectItemConflicts(event: ItemEventData): ItemMergeStrategy {
    const pendingOps = optimisticUpdatesService.currentState.operations.filter(
      op => (op.optimisticData?.id === event.itemId || op.listId === event.listId) && op.status === 'pending'
    )

    if (pendingOps.length === 0) {
      return { strategy: 'server_wins', reason: 'No pending operations' }
    }

    // Check for direct conflicts
    const conflictingOps = pendingOps.filter(op => {
      switch (event.type) {
        case 'ITEM_CREATED':
          return op.type === 'CREATE_ITEM' && op.listId === event.listId
        case 'ITEM_UPDATED':
          return (op.type === 'UPDATE_ITEM' || op.type === 'CHECK_ITEM') && op.optimisticData?.id === event.itemId
        case 'ITEM_CHECKED':
          return op.type === 'CHECK_ITEM' && op.optimisticData?.id === event.itemId
        case 'ITEM_DELETED':
          return ['UPDATE_ITEM', 'DELETE_ITEM', 'CHECK_ITEM'].includes(op.type) && op.optimisticData?.id === event.itemId
        case 'ITEM_REORDERED':
          return op.type === 'REORDER_ITEM' && op.listId === event.listId
        default:
          return false
      }
    })

    if (conflictingOps.length === 0) {
      return { strategy: 'server_wins', reason: 'No conflicting operations' }
    }

    // Analyze field-level conflicts for ITEM_UPDATED and ITEM_CHECKED
    if (event.type === 'ITEM_UPDATED' || event.type === 'ITEM_CHECKED') {
      const mergeResult = this.analyzeItemFieldConflicts(event, conflictingOps)
      if (mergeResult.canMerge) {
        return {
          strategy: 'merge_fields',
          reason: 'Non-overlapping field changes',
          mergedData: mergeResult.mergedData
        }
      }
    }

    // Handle delete conflicts specially
    if (event.type === 'ITEM_DELETED') {
      return {
        strategy: 'server_wins',
        reason: 'Server delete takes precedence',
        resolution: 'accept_server'
      }
    }

    // Check timing - if server event is much newer, prefer server
    const serverTime = new Date(event.timestamp).getTime()
    const newestOpTime = Math.max(...conflictingOps.map(op => op.timestamp))
    
    if (serverTime > newestOpTime + 3000) { // 3 second threshold for items
      return { 
        strategy: 'server_wins', 
        reason: 'Server event is significantly newer',
        conflictFields: this.getItemConflictingFields(event, conflictingOps)
      }
    }

    // For item operations, we're more permissive with auto-resolution
    if (event.type === 'ITEM_CHECKED') {
      return {
        strategy: 'server_wins',
        reason: 'Server check state preferred for consistency'
      }
    }

    // Default to manual resolution for complex conflicts
    return {
      strategy: 'manual_resolution',
      reason: 'Complex item conflict requiring user decision',
      conflictFields: this.getItemConflictingFields(event, conflictingOps)
    }
  }

  /**
   * Analyze field-level conflicts for items with server-side version control
   */
  private analyzeItemFieldConflicts(event: ItemEventData, conflictingOps: any[]): { canMerge: boolean; mergedData?: any } {
    if (!event.data) {
      return { canMerge: false }
    }

    const serverFields = Object.keys(event.data)
    const localFields = conflictingOps.reduce((fields, op) => {
      if (op.optimisticData) {
        fields.push(...Object.keys(op.optimisticData))
      }
      return fields
    }, [] as string[])

    // Use server-side version control for merging decisions
    const serverVersion = event.version || 0
    const clientVersions = conflictingOps.map(op => op.optimisticData?.version || 0)
    const maxClientVersion = Math.max(...clientVersions, 0)

    // If server version is significantly newer, prioritize server data
    if (serverVersion > maxClientVersion + 2) {
      this.log(`Server version (${serverVersion}) significantly newer, accepting server data`)
      return {
        canMerge: true,
        mergedData: { ...event.data, version: serverVersion }
      }
    }

    // Check for field overlap
    const hasOverlap = serverFields.some(field => localFields.includes(field))
    
    if (!hasOverlap) {
      // No overlap, can safely merge with incremented version
      const localData = conflictingOps.reduce((merged, op) => {
        return { ...merged, ...(op.optimisticData || {}) }
      }, {})
      
      return {
        canMerge: true,
        mergedData: { 
          ...event.data, 
          ...localData,
          version: Math.max(serverVersion, maxClientVersion) + 1,
          updatedAt: new Date().toISOString()
        }
      }
    }

    // Special handling for common field conflicts with version control
    if (serverFields.includes('checked') && localFields.includes('checked') && 
        serverFields.length === 1 && localFields.length === 1) {
      // Use timestamp-based resolution for checkbox conflicts
      const serverTime = new Date(event.timestamp).getTime()
      const clientTimes = conflictingOps.map(op => 
        new Date(op.optimisticData?.updatedAt || op.timestamp).getTime()
      )
      const maxClientTime = Math.max(...clientTimes, 0)
      
      const useServerValue = serverTime > maxClientTime
      return {
        canMerge: true,
        mergedData: { 
          ...event.data,
          checked: useServerValue ? event.data.checked : conflictingOps[0].optimisticData?.checked,
          version: Math.max(serverVersion, maxClientVersion) + 1,
          updatedAt: new Date().toISOString()
        }
      }
    }

    // For text fields, attempt smart merging
    if (serverFields.includes('content') && localFields.includes('content')) {
      const serverContent = event.data.content || ''
      const clientContent = conflictingOps[0]?.optimisticData?.content || ''
      
      // If one is a substring of the other, use the longer version
      if (serverContent.includes(clientContent) || clientContent.includes(serverContent)) {
        return {
          canMerge: true,
          mergedData: {
            ...event.data,
            content: serverContent.length > clientContent.length ? serverContent : clientContent,
            version: Math.max(serverVersion, maxClientVersion) + 1,
            updatedAt: new Date().toISOString()
          }
        }
      }
    }

    return { canMerge: false }
  }

  /**
   * Get conflicting fields between server and local item changes
   */
  private getItemConflictingFields(event: ItemEventData, conflictingOps: any[]): string[] {
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
   * Apply item event with specified strategy
   */
  private applyItemEventWithStrategy(event: ItemEventData, strategy: ItemMergeStrategy): void {
    this.log('Applying item event with strategy', { event: event.eventId, strategy: strategy.strategy })

    const dataToApply = strategy.strategy === 'merge_fields' && strategy.mergedData
      ? strategy.mergedData
      : event.data

    // Update cache based on event type
    this.updateItemInCache(event, dataToApply)

    // If we used merge strategy, update the optimistic operations
    if (strategy.strategy === 'merge_fields') {
      this.updateOptimisticItemOperationsAfterMerge(event.itemId)
    }
  }

  /**
   * Update item in cache based on event type
   */
  private updateItemInCache(event: ItemEventData, dataToApply: any): void {
    const cachedItems = cacheService.getListItemsSync(event.listId)
    if (!cachedItems) return

    let updatedItems = [...cachedItems]

    switch (event.type) {
      case 'ITEM_CREATED':
        if (dataToApply && !updatedItems.find(item => item.id === event.itemId)) {
          const newItem: ListItem = {
            id: event.itemId,
            listId: event.listId,
            content: dataToApply.content || '',
            checked: dataToApply.checked || false,
            createdAt: dataToApply.createdAt || event.timestamp,
            updatedAt: dataToApply.updatedAt || event.timestamp,
            ...dataToApply
          }
          updatedItems.push(newItem)
        }
        break

      case 'ITEM_UPDATED':
      case 'ITEM_CHECKED':
        if (dataToApply) {
          const index = updatedItems.findIndex(item => item.id === event.itemId)
          if (index !== -1) {
            updatedItems[index] = {
              ...updatedItems[index],
              ...dataToApply,
              updatedAt: event.timestamp
            }
          }
        }
        break

      case 'ITEM_DELETED':
        updatedItems = updatedItems.filter(item => item.id !== event.itemId)
        break

      case 'ITEM_REORDERED':
        if (event.reorderData) {
          this.applyReorderToItems(updatedItems, event.reorderData)
        }
        break
    }

    // Update cache with new items
    cacheService.setListItems(event.listId, updatedItems, event.version)
  }

  /**
   * Apply reorder data to items array
   */
  private applyReorderToItems(items: ListItem[], reorderData: any): void {
    const { affectedItems } = reorderData
    
    if (affectedItems && Array.isArray(affectedItems)) {
      affectedItems.forEach(({ id, order }) => {
        const item = items.find(item => item.id === id)
        if (item) {
          // Note: ListItem doesn't have order field in current interface
          // This would need to be extended if order tracking is needed
          this.log('Item reordered', { itemId: id, newOrder: order })
        }
      })
      
      // Sort items by new order if order field exists
      // items.sort((a, b) => (a.order || 0) - (b.order || 0))
    }
  }

  /**
   * Process reorder event with special handling
   */
  private processReorderEvent(event: ItemEventData): void {
    this.log('Processing reorder event', event)

    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    
    // Mark reorder as in progress
    updatedState.reorderInProgress.set(event.listId, true)
    this._itemSyncState$.next(updatedState)

    // Apply reorder after a delay to allow for batching
    setTimeout(() => {
      this.applyItemEventWithStrategy(event, { strategy: 'server_wins', reason: 'Reorder event' })
      this._itemEvents$.next(event)
      
      // Mark reorder as complete
      const finalState = this._itemSyncState$.value
      const finalUpdatedState = { ...finalState }
      finalUpdatedState.reorderInProgress.set(event.listId, false)
      this._itemSyncState$.next(finalUpdatedState)
    }, 100)
  }

  /**
   * Handle item conflict requiring manual resolution
   */
  private handleItemConflictRequiringManualResolution(event: ItemEventData, strategy: ItemMergeStrategy): void {
    this.log('Item conflict requires manual resolution', { event: event.eventId, strategy })

    // Add to conflicting operations
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.conflictingItemOperations = [...updatedState.conflictingItemOperations, event.itemId]
    this._itemSyncState$.next(updatedState)

    // Emit error for UI notification
    this.setError(`Item conflict detected: ${strategy.reason}. Manual resolution required.`)

    // Store event for later resolution
    this.storeConflictingItemEvent(event, strategy)
  }

  /**
   * Store conflicting item event for manual resolution
   */
  private storeConflictingItemEvent(event: ItemEventData, strategy: ItemMergeStrategy): void {
    const conflictData = {
      event,
      strategy,
      timestamp: Date.now()
    }
    
    localStorage.setItem(`item_conflict_${event.eventId}`, JSON.stringify(conflictData))
  }

  /**
   * Apply manual item conflict resolution
   */
  private applyItemConflictResolution(eventId: string, resolution: ItemMergeStrategy): void {
    this.log('Applying manual item conflict resolution', { eventId, resolution })

    // Retrieve stored conflict
    const conflictDataStr = localStorage.getItem(`item_conflict_${eventId}`)
    if (!conflictDataStr) {
      this.log('No item conflict data found for eventId', eventId)
      return
    }

    const conflictData = JSON.parse(conflictDataStr)
    const event = conflictData.event

    // Apply the resolution
    this.applyItemEventWithStrategy(event, resolution)

    // Emit the resolved event
    this._itemEvents$.next(event)

    // Cleanup
    localStorage.removeItem(`item_conflict_${eventId}`)
  }

  /**
   * Attempt automatic item conflict resolution for simple cases
   */
  private attemptAutoItemConflictResolution(event: ItemEventData): void {
    const currentState = this._itemSyncState$.value
    if (!currentState.conflictingItemOperations.includes(event.itemId)) {
      return // Not a conflicting event
    }

    this.log('Attempting auto-resolution for item conflict', event.eventId)

    // For items, we're more aggressive with auto-resolution
    let autoResolution: ItemMergeStrategy

    switch (event.type) {
      case 'ITEM_CHECKED':
        autoResolution = {
          strategy: 'server_wins',
          reason: 'Auto-resolved: Server check state preferred'
        }
        break
      case 'ITEM_DELETED':
        autoResolution = {
          strategy: 'server_wins',
          reason: 'Auto-resolved: Server delete takes precedence'
        }
        break
      default:
        autoResolution = {
          strategy: 'merge_fields',
          reason: 'Auto-resolved: Attempted field merge'
        }
    }

    this.resolveItemConflict(event.eventId, autoResolution)
  }

  /**
   * Handle user presence for collaborative item editing
   */
  private handleUserPresenceForItems(presence: any): void {
    this.log('User presence update for item collaboration', presence)

    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    
    switch (presence.type) {
      case 'userJoined':
        this.handleUserJoinedList(updatedState, presence)
        break
      case 'userLeft':
        this.handleUserLeftList(updatedState, presence)
        break
      case 'userStartedEditing':
        this.handleUserStartedEditingItem(updatedState, presence)
        break
      case 'userStoppedEditing':
        this.handleUserStoppedEditingItem(updatedState, presence)
        break
      case 'userActivity':
        this.handleUserActivity(updatedState, presence)
        break
    }

    this._itemSyncState$.next(updatedState)
  }

  /**
   * Handle user joined list event
   */
  private handleUserJoinedList(state: ItemSyncState, presence: any): void {
    const { listId, userId, username } = presence
    if (listId && userId) {
      state.activeUsers.set(listId, {
        userId,
        username,
        joinedAt: Date.now(),
        lastActivity: Date.now()
      })
      this.log(`User ${username || userId} joined list ${listId}`)
    }
  }

  /**
   * Handle user left list event
   */
  private handleUserLeftList(state: ItemSyncState, presence: any): void {
    const { listId, userId } = presence
    if (listId) {
      state.activeUsers.delete(listId)
      
      // Also remove from any item editing sessions
      const itemsToClean = Array.from(state.itemEditingUsers.entries())
        .filter(([, user]) => user.userId === userId)
        .map(([itemId]) => itemId)
      
      itemsToClean.forEach(itemId => {
        state.itemEditingUsers.delete(itemId)
      })
      
      this.log(`User ${userId} left list ${listId}, cleaned up ${itemsToClean.length} item editing sessions`)
    }
  }

  /**
   * Handle user started editing item event
   */
  private handleUserStartedEditingItem(state: ItemSyncState, presence: any): void {
    const { itemId, userId, username } = presence
    if (itemId && userId) {
      // Check if another user is already editing this item
      const currentEditor = state.itemEditingUsers.get(itemId)
      if (currentEditor && currentEditor.userId !== userId) {
        this.log(`Item ${itemId} editing conflict: ${currentEditor.userId} vs ${userId}`)
        // For now, latest user takes precedence
      }
      
      state.itemEditingUsers.set(itemId, {
        userId,
        username,
        startedAt: Date.now()
      })
      this.log(`User ${username || userId} started editing item ${itemId}`)
    }
  }

  /**
   * Handle user stopped editing item event
   */
  private handleUserStoppedEditingItem(state: ItemSyncState, presence: any): void {
    const { itemId, userId } = presence
    if (itemId && userId) {
      const currentEditor = state.itemEditingUsers.get(itemId)
      if (currentEditor && currentEditor.userId === userId) {
        state.itemEditingUsers.delete(itemId)
        this.log(`User ${userId} stopped editing item ${itemId}`)
      }
    }
  }

  /**
   * Handle user activity update
   */
  private handleUserActivity(state: ItemSyncState, presence: any): void {
    const { listId, userId } = presence
    if (listId && userId) {
      const activeUser = state.activeUsers.get(listId)
      if (activeUser && activeUser.userId === userId) {
        activeUser.lastActivity = Date.now()
      }
    }
  }

  /**
   * Update optimistic operations after successful merge
   */
  private updateOptimisticItemOperationsAfterMerge(itemId: string): void {
    // Mark conflicting optimistic operations as successful since they were merged
    const pendingOps = optimisticUpdatesService.currentState.operations.filter(
      op => (op.optimisticData?.id === itemId) && op.status === 'pending'
    )

    pendingOps.forEach(op => {
      this.log('Optimistic item operation merged successfully', { operationId: op.id, itemId })
    })
  }

  /**
   * Update item version
   */
  private updateItemVersion(itemId: string, version: number): void {
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.itemVersions.set(itemId, version)
    this._itemSyncState$.next(updatedState)
  }

  /**
   * Request items sync via WebSocket
   */
  private async requestItemsSync(listId: string, itemIds: string[]): Promise<void> {
    // Simplified implementation - would use actual WebSocket methods
    this.log(`Sync request sent for ${itemIds.length} items in list ${listId}`)
    
    // Simulate sync request
    return new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  /**
   * Add pending item syncs
   */
  private addPendingItemSyncs(itemIds: string[]): void {
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.pendingItemSyncs = [...new Set([...updatedState.pendingItemSyncs, ...itemIds])]
    this._itemSyncState$.next(updatedState)
  }

  /**
   * Remove pending item syncs
   */
  private removePendingItemSyncs(itemIds: string[]): void {
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.pendingItemSyncs = updatedState.pendingItemSyncs.filter(id => !itemIds.includes(id))
    this._itemSyncState$.next(updatedState)
  }

  /**
   * Notify that user started editing an item
   */
  private notifyItemEditingStart(itemId: string): void {
    // This would emit to WebSocket when that functionality is available
    this.log(`User started editing item ${itemId}`)
    
    // Update local state
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    
    // Add current user as editing this item
    const currentUserId = this.getCurrentUserId()
    if (currentUserId) {
      updatedState.itemEditingUsers.set(itemId, {
        userId: currentUserId,
        username: this.getCurrentUserName(),
        startedAt: Date.now()
      })
      this._itemSyncState$.next(updatedState)
    }
  }

  /**
   * Notify that user stopped editing an item
   */
  private notifyItemEditingStop(itemId: string): void {
    this.log(`User stopped editing item ${itemId}`)
    
    // Update local state
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.itemEditingUsers.delete(itemId)
    this._itemSyncState$.next(updatedState)
  }

  /**
   * Get current user ID (placeholder implementation)
   */
  private getCurrentUserId(): string | null {
    // This would get the actual user ID from auth service
    return 'current-user-id'
  }

  /**
   * Get current user name (placeholder implementation)
   */
  private getCurrentUserName(): string | undefined {
    // This would get the actual user name from auth service
    return 'Current User'
  }

  /**
   * Handle item sync error
   */
  private handleItemSyncError(listId: string, itemId: string, error: string): void {
    const currentState = this._itemSyncState$.value
    const updatedState = { ...currentState }
    updatedState.itemSyncErrors = [
      ...updatedState.itemSyncErrors,
      { itemId, listId, error, timestamp: Date.now() }
    ].slice(-50) // Keep only last 50 errors

    this._itemSyncState$.next(updatedState)
    this.setError(`Item sync error: ${error}`)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.itemEventProcessingQueue.clear()
    this.reorderDebounceMap.forEach(timeout => clearTimeout(timeout))
    this.reorderDebounceMap.clear()
    
    this._itemSyncState$.complete()
    this._itemEvents$.complete()
    this._itemConflictResolutions$.complete()
    
    super.destroy()
  }
}

// Create and export singleton instance
export const realTimeItemSyncService = new RealTimeItemSyncService()
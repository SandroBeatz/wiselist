import { Observable, of } from 'rxjs'
import { map, filter, distinctUntilChanged, catchError, takeUntil } from 'rxjs/operators'
import { ReactiveStoreService, webSocketService, cacheService, listCacheOperators, optimisticUpdatesService, realTimeListSyncService } from '@shared/services/reactive'
import type { List, ListId } from './types'
import { apiList } from '../api'
import { tokenService } from '@shared/services/token.service'

interface ListsState {
  lists: List[]
  loading: boolean
  connected: boolean
}

/**
 * Reactive Lists Store using RxJS patterns
 * Provides real-time synchronization with WebSocket events and offline-first approach
 */
export class ReactiveListsStore extends ReactiveStoreService<ListsState> {
  
  constructor() {
    super({
      enableLogging: true
    })
    
    this.initializeWebSocketSubscriptions()
    this.initializeRealTimeSyncIntegration()
    this.initializeAutoFetch()
  }

  protected getInitialState() {
    return {
      data: {
        lists: [],
        loading: false,
        connected: false
      },
      lastUpdated: Date.now(),
      version: 0
    }
  }

  // Observable getters for components
  get lists$(): Observable<List[]> {
    return this.data$.pipe(
      map(state => state.lists),
      distinctUntilChanged()
    )
  }

  get loading$(): Observable<boolean> {
    return this.data$.pipe(
      map(state => state.loading),
      distinctUntilChanged()
    )
  }

  get connected$(): Observable<boolean> {
    return this.data$.pipe(
      map(state => state.connected),
      distinctUntilChanged()
    )
  }

  // Methods for backward compatibility with Pinia store
  get isLoading(): boolean {
    return this.currentData.loading
  }

  get lists(): List[] {
    return this.currentData.lists
  }

  toggleLoader(value?: boolean): void {
    const currentState = this.currentData
    const loading = typeof value === 'boolean' ? value : !currentState.loading
    
    this.updateState({
      ...currentState,
      loading
    })
  }

  buildData(payload: List[]): void {
    const currentState = this.currentData
    this.updateState({
      ...currentState,
      lists: payload
    })

    // Cache all the lists
    const version = Date.now()
    payload.forEach(list => {
      const listVersion = new Date(list.updatedAt).getTime()
      cacheService.setList(list.id, list, listVersion)
    })

    // Cache the user lists index
    const listIds = payload.map(list => list.id)
    cacheService.setUserLists(listIds, version)
  }

  async fetchData(): Promise<void> {
    this.toggleLoader(true)
    this.clearError()

    try {
      // Use cache-first strategy with RxJS operators
      const lists$ = of(null).pipe(
        listCacheOperators.cacheFirstUserLists(() => 
          new Observable<List[]>(subscriber => {
            apiList.getAll()
              .then(lists => {
                subscriber.next(lists)
                subscriber.complete()
              })
              .catch(error => subscriber.error(error))
          })
        )
      )

      const lists = await lists$.toPromise()
      if (lists) {
        this.buildData(lists)
        this.log('Lists fetched successfully', { 
          count: lists.length, 
          source: cacheService.getListSync(lists[0]?.id) ? 'cache' : 'api' 
        })
      }
    } catch (error) {
      // Try to get cached data as fallback
      try {
        const cachedLists = await cacheService.getAllCachedLists().pipe(takeUntil(this.destroy$)).toPromise()
        if (cachedLists && cachedLists.length > 0) {
          this.buildData(cachedLists)
          this.log('Using cached lists as fallback', { count: cachedLists.length })
        } else {
          this.setError('Failed to fetch lists')
          this.log('Failed to fetch lists and no cache available', { error })
        }
      } catch (cacheError) {
        this.setError('Failed to fetch lists')
        this.log('Failed to fetch lists and cache error', { error, cacheError })
      }
    } finally {
      this.toggleLoader(false)
    }
  }

  // Reactive methods for real-time updates
  private initializeWebSocketSubscriptions(): void {
    if (!tokenService.isAuthenticated()) {
      this.log('User not authenticated, skipping WebSocket initialization')
      return
    }

    // Subscribe to WebSocket connection state
    webSocketService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connectionState => {
        const currentState = this.currentData
        const connected = connectionState === 'connected'
        
        this.updateState({
          ...currentState,
          connected
        })
        
        this.log('WebSocket connection state changed', { connectionState })
      })

    // Subscribe to list events for real-time updates
    webSocketService.listEvents$
      .pipe(
        filter(event => this.isListEvent(event)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.handleListEvent(event)
      })

    // Initialize WebSocket connection through auth service
    if (tokenService.isAuthenticated()) {
      webSocketService.connect()
    }
  }

  private initializeAutoFetch(): void {
    // Auto-fetch when component initializes if user is authenticated
    if (tokenService.isAuthenticated()) {
      this.fetchData()
    }
  }

  private performFetch(): Observable<List[]> {
    this.toggleLoader(true)
    
    return new Observable<List[]>(observer => {
      apiList.getAll()
        .then(lists => {
          this.buildData(lists)
          this.toggleLoader(false)
          observer.next(lists)
          observer.complete()
        })
        .catch(error => {
          this.setError('Failed to fetch lists')
          this.log('Failed to fetch lists', { error })
          this.toggleLoader(false)
          observer.error(error)
        })
    }).pipe(
      catchError(error => {
        this.log('Error in performFetch', { error })
        return []
      })
    )
  }

  private isListEvent(event: any): boolean {
    return event && 
           typeof event.type === 'string' && 
           ['LIST_CREATED', 'LIST_UPDATED', 'LIST_DELETED'].includes(event.type)
  }

  private handleListEvent(event: any): void {
    this.log('Handling list event (legacy handler)', { type: event.type, listId: event.listId })
    
    // The real-time sync service now handles the advanced event processing
    // This method is kept for backward compatibility and simple event handling
    
    const currentState = this.currentData
    let updatedLists = [...currentState.lists]

    switch (event.type) {
      case 'LIST_CREATED':
        if (event.data && !updatedLists.find(list => list.id === event.data.id)) {
          updatedLists.push(event.data)
          // Cache the new list
          cacheService.setList(event.data.id, event.data, event.version)
          this.log('List created via WebSocket', { listId: event.data.id })
        }
        break

      case 'LIST_UPDATED':
        if (event.data) {
          const index = updatedLists.findIndex(list => list.id === event.listId)
          if (index !== -1) {
            const updatedList = { ...updatedLists[index], ...event.data }
            updatedLists[index] = updatedList
            // Update cache with new version
            cacheService.setList(event.listId, updatedList, event.version)
            this.log('List updated via WebSocket', { listId: event.listId })
          }
        }
        break

      case 'LIST_DELETED':
        updatedLists = updatedLists.filter(list => list.id !== event.listId)
        // Remove from cache
        cacheService.invalidateList(event.listId)
        this.log('List deleted via WebSocket', { listId: event.listId })
        break

      default:
        this.log('Unknown list event type', { type: event.type })
        return
    }

    this.updateState({
      ...currentState,
      lists: updatedLists
    }, event.version)

    // Update cache with new lists array
    const listIds = updatedLists.map(list => list.id)
    cacheService.setUserLists(listIds, event.version)
  }

  // Helper method to add a new list optimistically
  addListOptimistic(list: List): void {
    const currentState = this.currentData
    const updatedLists = [...currentState.lists, list]
    
    this.updateState({
      ...currentState,
      lists: updatedLists
    })

    // Cache the optimistic list
    const version = new Date(list.updatedAt).getTime()
    cacheService.setList(list.id, list, version)
    
    // Update user lists cache
    const listIds = updatedLists.map(l => l.id)
    cacheService.setUserLists(listIds, version)
    
    this.log('List added optimistically', { listId: list.id })
  }

  // Helper method to update a list optimistically
  updateListOptimistic(listId: ListId, updatedFields: Partial<List>): void {
    const currentState = this.currentData
    const updatedLists = currentState.lists.map(list =>
      list.id === listId ? { ...list, ...updatedFields } : list
    )
    
    this.updateState({
      ...currentState,
      lists: updatedLists
    })

    // Update cache with optimistic changes
    const updatedList = updatedLists.find(list => list.id === listId)
    if (updatedList) {
      const version = new Date(updatedList.updatedAt).getTime()
      cacheService.setList(listId, updatedList, version)
    }
    
    this.log('List updated optimistically', { listId })
  }

  // Helper method to remove a list optimistically
  removeListOptimistic(listId: ListId): void {
    const currentState = this.currentData
    const updatedLists = currentState.lists.filter(list => list.id !== listId)
    
    this.updateState({
      ...currentState,
      lists: updatedLists
    })

    // Remove from cache
    cacheService.invalidateList(listId)
    
    // Update user lists cache
    const listIds = updatedLists.map(l => l.id)
    cacheService.setUserLists(listIds)
    
    this.log('List removed optimistically', { listId })
  }

  /**
   * Initialize real-time sync integration
   */
  private initializeRealTimeSyncIntegration(): void {
    if (!tokenService.isAuthenticated()) {
      this.log('User not authenticated, skipping real-time sync initialization')
      return
    }

    // Subscribe to processed list events from real-time sync service
    realTimeListSyncService.listEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.handleRealTimeSyncEvent(event)
      })

    // Subscribe to sync state changes
    realTimeListSyncService.syncState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(syncState => {
        this.handleSyncStateChange(syncState)
      })

    this.log('Real-time sync integration initialized')
  }

  /**
   * Handle processed events from real-time sync service
   */
  private handleRealTimeSyncEvent(event: any): void {
    this.log('Handling real-time sync event', { type: event.type, listId: event.listId, version: event.version })
    
    const currentState = this.currentData
    let updatedLists = [...currentState.lists]

    switch (event.type) {
      case 'LIST_CREATED':
        if (event.data && !updatedLists.find(list => list.id === event.data.id)) {
          // Add the new list with proper typing
          const newList: List = {
            id: event.data.id,
            title: event.data.title || event.data.name || 'Untitled List',
            type: event.data.type || 'OTHER',
            ownerId: event.data.ownerId || event.data.userId,
            createdAt: event.data.createdAt || event.timestamp,
            updatedAt: event.data.updatedAt || event.timestamp,
            items: event.data.items || [],
            owner: event.data.owner || {
              id: event.data.ownerId || event.data.userId,
              email: 'unknown@example.com',
              profile: {
                id: 'unknown',
                userId: event.data.ownerId || event.data.userId,
                fullName: 'Unknown User',
                notificationsEnabled: true,
                createdAt: event.timestamp,
                updatedAt: event.timestamp
              }
            },
            ...event.data
          }
          
          updatedLists.push(newList)
          this.log('List created via real-time sync', { listId: newList.id })
        }
        break

      case 'LIST_UPDATED':
        if (event.data && event.listId) {
          const index = updatedLists.findIndex(list => list.id === event.listId)
          if (index !== -1) {
            const updatedList = { 
              ...updatedLists[index], 
              ...event.data,
              updatedAt: event.timestamp || new Date().toISOString()
            }
            updatedLists[index] = updatedList
            this.log('List updated via real-time sync', { listId: event.listId })
          } else {
            this.log('List not found for update', { listId: event.listId })
          }
        }
        break

      case 'LIST_DELETED':
        const initialCount = updatedLists.length
        updatedLists = updatedLists.filter(list => list.id !== event.listId)
        if (updatedLists.length < initialCount) {
          this.log('List deleted via real-time sync', { listId: event.listId })
        }
        break

      default:
        this.log('Unknown real-time sync event type', { type: event.type })
        return
    }

    // Update state with version tracking
    this.updateState({
      ...currentState,
      lists: updatedLists
    }, event.version)

    // Update cache with new lists array and version
    const listIds = updatedLists.map(list => list.id)
    cacheService.setUserLists(listIds, event.version)
    
    this.log('State updated from real-time sync event', { 
      eventType: event.type,
      listId: event.listId,
      version: event.version,
      totalLists: updatedLists.length
    })
  }

  /**
   * Handle sync state changes
   */
  private handleSyncStateChange(syncState: any): void {
    // Update connection status based on sync state
    const currentState = this.currentData
    const hasConnectedUsers = syncState.connectedUsers.length > 0
    
    if (currentState.connected !== hasConnectedUsers) {
      this.updateState({
        ...currentState,
        connected: hasConnectedUsers
      })
      
      this.log('Connection state updated from sync service', { connected: hasConnectedUsers })
    }

    // Handle sync errors
    if (syncState.syncErrors.length > 0) {
      const latestError = syncState.syncErrors[syncState.syncErrors.length - 1]
      this.setError(`Sync error: ${latestError.error}`)
    }
  }

  // Method to manually refresh lists
  async refresh(): Promise<void> {
    await this.fetchData()
  }

  // ========== ENHANCED OPTIMISTIC METHODS ==========

  /**
   * Create list with full optimistic update support
   */
  async createListWithOptimisticUpdate(listData: Partial<List>): Promise<List> {
    return optimisticUpdatesService.createListOptimistic(
      listData,
      (tempList: List) => {
        // Apply optimistic update immediately
        this.addListOptimistic(tempList)
      }
    )
  }

  /**
   * Update list with optimistic update and rollback support
   */
  async updateListWithOptimisticUpdate(listId: ListId, updates: Partial<List>): Promise<void> {
    // Store original list for rollback
    const originalList = this.lists.find(list => list.id === listId)
    
    return optimisticUpdatesService.updateListOptimistic(
      listId,
      updates,
      (updates: Partial<List>) => {
        // Apply optimistic update immediately
        this.updateListOptimistic(listId, updates)
      },
      (originalData: List) => {
        // Rollback to original data if operation fails
        if (originalData) {
          this.updateListOptimistic(listId, originalData)
        }
      }
    )
  }

  /**
   * Delete list with optimistic update and rollback support
   */
  async deleteListWithOptimisticUpdate(listId: ListId): Promise<void> {
    // Store original list for rollback
    const originalList = this.lists.find(list => list.id === listId)
    const originalLists = [...this.lists]
    
    return optimisticUpdatesService.deleteListOptimistic(
      listId,
      () => {
        // Apply optimistic delete immediately
        this.removeListOptimistic(listId)
      },
      (originalData: List) => {
        // Rollback by restoring the deleted list
        if (originalData) {
          const currentState = this.currentData
          this.updateState({
            ...currentState,
            lists: originalLists
          })
          
          // Restore to cache
          const version = new Date(originalData.updatedAt).getTime()
          cacheService.setList(listId, originalData, version)
        }
      }
    )
  }

  /**
   * Get loading state for a specific list
   */
  isListLoading$(listId: string): Observable<boolean> {
    return optimisticUpdatesService.isLoading(listId)
  }

  /**
   * Get pending operations for a list
   */
  getListPendingOperations$(listId: string) {
    return optimisticUpdatesService.getPendingOperations(listId)
  }

  /**
   * Get optimistic updates state
   */
  getOptimisticUpdatesState$() {
    return optimisticUpdatesService.state$
  }

  /**
   * Retry failed operations for this store
   */
  async retryFailedOperations(): Promise<void> {
    await optimisticUpdatesService.retryAllFailedOperations()
  }

  // ========== REAL-TIME SYNC METHODS ==========

  /**
   * Force sync for a specific list
   */
  async forceSyncList(listId: ListId): Promise<void> {
    try {
      await realTimeListSyncService.forceSyncList(listId)
      this.log('Force sync completed for list', { listId })
    } catch (error) {
      this.log('Force sync failed for list', { listId, error })
      throw error
    }
  }

  /**
   * Get real-time sync state for a specific list
   */
  getListSyncState$(listId: ListId) {
    return realTimeListSyncService.getListSyncState(listId)
  }

  /**
   * Get connected users for collaboration
   */
  getConnectedUsers$() {
    return realTimeListSyncService.getConnectedUsers()
  }

  /**
   * Subscribe to events for a specific list
   */
  subscribeToListEvents$(listId: ListId) {
    return realTimeListSyncService.subscribeToListEvents(listId)
  }

  /**
   * Get global sync state
   */
  getSyncState$() {
    return realTimeListSyncService.syncState$
  }

  /**
   * Check if a list has pending changes
   */
  hasListPendingChanges$(listId: ListId): Observable<boolean> {
    return realTimeListSyncService.getListSyncState(listId).pipe(
      map(state => state.hasPendingChanges),
      distinctUntilChanged()
    )
  }

  /**
   * Check if a list has conflicts
   */
  hasListConflicts$(listId: ListId): Observable<boolean> {
    return realTimeListSyncService.getListSyncState(listId).pipe(
      map(state => state.hasConflicts),
      distinctUntilChanged()
    )
  }

  /**
   * Get list version
   */
  getListVersion$(listId: ListId): Observable<number> {
    return realTimeListSyncService.getListSyncState(listId).pipe(
      map(state => state.version),
      distinctUntilChanged()
    )
  }

  // Cleanup method
  override destroy(): void {
    this.log('Destroying ReactiveListsStore')
    super.destroy()
  }
}

// Create singleton instance
export const reactiveListsStore = new ReactiveListsStore()
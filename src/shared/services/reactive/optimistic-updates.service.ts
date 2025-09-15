import { 
  BehaviorSubject, 
  Observable, 
  Subject,
  from,
  of,
  EMPTY,
  throwError
} from 'rxjs'
import {
  switchMap,
  tap,
  catchError,
  timeout,
  takeUntil,
  distinctUntilChanged,
  map,
  filter
} from 'rxjs/operators'
import { BaseReactiveService } from './base-reactive.service'
import { syncQueueService } from './sync-queue.service'
import { cacheService } from './cache.service'
import { webSocketService } from './websocket-instance'
import type { List, ListItem, ListId } from '@entities/list'

export interface OptimisticOperation {
  id: string
  type: 'CREATE_LIST' | 'UPDATE_LIST' | 'DELETE_LIST' | 'CREATE_ITEM' | 'UPDATE_ITEM' | 'DELETE_ITEM' | 'CHECK_ITEM' | 'REORDER_ITEM'
  status: 'pending' | 'confirmed' | 'failed' | 'rolled_back'
  timestamp: number
  listId: string
  originalData?: any
  optimisticData: any
  errorMessage?: string
  retryCount: number
  maxRetries: number
}

export interface OptimisticUpdatesState {
  operations: OptimisticOperation[]
  pendingCount: number
  failedCount: number
}

/**
 * Service for managing optimistic updates with rollback capabilities
 * Works in conjunction with sync queue service for offline-first experience
 */
export class OptimisticUpdatesService extends BaseReactiveService {
  private readonly _state$ = new BehaviorSubject<OptimisticUpdatesState>(this.getInitialState())
  private readonly _loadingStates$ = new BehaviorSubject<Record<string, boolean>>({})
  private readonly operationsMap = new Map<string, OptimisticOperation>()
  
  private readonly defaultTimeout = 30000 // 30 seconds
  private readonly defaultMaxRetries = 3

  constructor() {
    super({ enableLogging: process.env.NODE_ENV === 'development' })
    this.initializeSyncQueueSubscription()
    this.initializeWebSocketEventHandling()
  }

  /**
   * Get initial state
   */
  private getInitialState(): OptimisticUpdatesState {
    return {
      operations: [],
      pendingCount: 0,
      failedCount: 0
    }
  }

  /**
   * Observable of current optimistic operations state
   */
  get state$(): Observable<OptimisticUpdatesState> {
    return this.createObservable(this._state$)
  }

  /**
   * Observable of loading states for individual entities
   */
  get loadingStates$(): Observable<Record<string, boolean>> {
    return this.createObservable(this._loadingStates$)
  }

  /**
   * Get current state
   */
  get currentState(): OptimisticUpdatesState {
    return this._state$.value
  }

  /**
   * Check if entity is currently loading
   */
  isLoading(entityId: string): Observable<boolean> {
    return this.loadingStates$.pipe(
      map(states => states[entityId] || false),
      distinctUntilChanged()
    )
  }

  /**
   * Get pending operations for a specific list
   */
  getPendingOperations(listId: string): Observable<OptimisticOperation[]> {
    return this.state$.pipe(
      map(state => state.operations.filter(op => 
        op.listId === listId && op.status === 'pending'
      )),
      distinctUntilChanged()
    )
  }

  /**
   * Get failed operations that can be retried
   */
  getFailedOperations(): Observable<OptimisticOperation[]> {
    return this.state$.pipe(
      map(state => state.operations.filter(op => 
        op.status === 'failed' && op.retryCount < op.maxRetries
      )),
      distinctUntilChanged()
    )
  }

  // ========== LIST OPERATIONS ==========

  /**
   * Create list optimistically
   */
  async createListOptimistic(
    listData: Partial<List>,
    applyOptimisticUpdate: (tempList: List) => void
  ): Promise<List> {
    const operationId = this.generateOperationId()
    const tempId = `temp_${operationId}`
    
    // Create temporary list with optimistic data
    const tempList: List = {
      id: tempId,
      title: listData.title || '',
      type: listData.type || 'OTHER',
      ownerId: 'current-user', // Will be replaced by server
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      owner: {
        id: 'current-user',
        email: 'temp@example.com',
        profile: {
          id: 'temp-profile',
          userId: 'current-user',
          fullName: 'Current User',
          notificationsEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      ...listData
    }

    // Create optimistic operation
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'CREATE_LIST',
      status: 'pending',
      timestamp: Date.now(),
      listId: tempId,
      optimisticData: tempList,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries
    }

    this.addOperation(operation)
    this.setEntityLoading(tempId, true)

    // Apply optimistic update immediately
    applyOptimisticUpdate(tempList)

    // Queue the actual sync operation
    try {
      const syncPromise = syncQueueService.enqueueOperation({
        type: 'CREATE_LIST',
        listId: tempId,
        data: listData
      })

      // Handle sync result
      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(tempId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error)
          this.setEntityLoading(tempId, false)
        })

      return tempList
    } catch (error) {
      this.handleOperationFailure(operationId, error)
      this.setEntityLoading(tempId, false)
      throw error
    }
  }

  /**
   * Update list optimistically
   */
  async updateListOptimistic(
    listId: string,
    updates: Partial<List>,
    applyOptimisticUpdate: (updates: Partial<List>) => void,
    rollbackUpdate: (originalData: any) => void
  ): Promise<void> {
    const operationId = this.generateOperationId()

    // Store original data for rollback
    const originalData = await this.getOriginalListData(listId)

    // Create optimistic operation
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'UPDATE_LIST',
      status: 'pending',
      timestamp: Date.now(),
      listId,
      originalData,
      optimisticData: updates,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries
    }

    this.addOperation(operation)
    this.setEntityLoading(listId, true)

    // Apply optimistic update immediately
    applyOptimisticUpdate(updates)

    // Queue the actual sync operation
    try {
      const syncPromise = syncQueueService.enqueueOperation({
        type: 'UPDATE_LIST',
        listId,
        data: updates
      })

      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(listId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error, rollbackUpdate)
          this.setEntityLoading(listId, false)
        })
    } catch (error) {
      this.handleOperationFailure(operationId, error, rollbackUpdate)
      this.setEntityLoading(listId, false)
      throw error
    }
  }

  /**
   * Delete list optimistically
   */
  async deleteListOptimistic(
    listId: string,
    applyOptimisticUpdate: () => void,
    rollbackUpdate: (originalData: any) => void
  ): Promise<void> {
    const operationId = this.generateOperationId()

    // Store original data for rollback
    const originalData = await this.getOriginalListData(listId)

    // Create optimistic operation
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'DELETE_LIST',
      status: 'pending',
      timestamp: Date.now(),
      listId,
      originalData,
      optimisticData: null,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries
    }

    this.addOperation(operation)
    this.setEntityLoading(listId, true)

    // Apply optimistic update immediately
    applyOptimisticUpdate()

    // Queue the actual sync operation
    try {
      const syncPromise = syncQueueService.enqueueOperation({
        type: 'DELETE_LIST',
        listId,
        data: { id: listId }
      })

      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(listId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error, rollbackUpdate)
          this.setEntityLoading(listId, false)
        })
    } catch (error) {
      this.handleOperationFailure(operationId, error, rollbackUpdate)
      this.setEntityLoading(listId, false)
      throw error
    }
  }

  // ========== ITEM OPERATIONS ==========

  /**
   * Create item optimistically
   */
  async createItemOptimistic(
    listId: string,
    itemData: Partial<ListItem>,
    applyOptimisticUpdate: (tempItem: ListItem) => void,
    rollbackUpdate?: () => void
  ): Promise<ListItem> {
    const operationId = this.generateOperationId()
    const tempId = `temp_item_${operationId}`

    // Create temporary item with optimistic data
    const tempItem: ListItem = {
      id: tempId,
      listId,
      content: itemData.content || '',
      checked: itemData.checked || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...itemData
    }

    // Create optimistic operation
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'CREATE_ITEM',
      status: 'pending',
      timestamp: Date.now(),
      listId,
      optimisticData: tempItem,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries
    }

    this.addOperation(operation)
    this.setEntityLoading(tempId, true)

    // Apply optimistic update immediately
    applyOptimisticUpdate(tempItem)

    // Queue the actual sync operation
    try {
      const syncPromise = syncQueueService.enqueueOperation({
        type: 'CREATE_ITEM',
        listId,
        data: itemData
      })

      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(tempId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error, rollbackUpdate)
          this.setEntityLoading(tempId, false)
        })

      return tempItem
    } catch (error) {
      this.handleOperationFailure(operationId, error, rollbackUpdate)
      this.setEntityLoading(tempId, false)
      throw error
    }
  }

  /**
   * Update item optimistically (including check/uncheck)
   */
  async updateItemOptimistic(
    listId: string,
    itemId: string,
    updates: Partial<ListItem>,
    applyOptimisticUpdate: (updates: Partial<ListItem>) => void,
    rollbackUpdate: (originalData: any) => void
  ): Promise<void> {
    const operationId = this.generateOperationId()
    const operationType = 'checked' in updates ? 'CHECK_ITEM' : 'UPDATE_ITEM'

    // Store original data for rollback
    const originalData = await this.getOriginalItemData(listId, itemId)

    // Create optimistic operation
    const operation: OptimisticOperation = {
      id: operationId,
      type: operationType,
      status: 'pending',
      timestamp: Date.now(),
      listId,
      originalData,
      optimisticData: updates,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries
    }

    this.addOperation(operation)
    this.setEntityLoading(itemId, true)

    // Apply optimistic update immediately
    applyOptimisticUpdate(updates)

    // Queue the appropriate sync operation
    try {
      const syncPromise = operationType === 'CHECK_ITEM'
        ? syncQueueService.enqueueOperation({
            type: 'CHECK_ITEM',
            listId,
            data: { id: itemId, checked: updates.checked }
          })
        : syncQueueService.enqueueOperation({
            type: 'UPDATE_ITEM',
            listId,
            data: { id: itemId, ...updates }
          })

      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(itemId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error, rollbackUpdate)
          this.setEntityLoading(itemId, false)
        })
    } catch (error) {
      this.handleOperationFailure(operationId, error, rollbackUpdate)
      this.setEntityLoading(itemId, false)
      throw error
    }
  }

  /**
   * Delete item optimistically
   */
  async deleteItemOptimistic(
    listId: string,
    itemId: string,
    applyOptimisticUpdate: () => void,
    rollbackUpdate: (originalData: any) => void
  ): Promise<void> {
    const operationId = this.generateOperationId()

    // Store original data for rollback
    const originalData = await this.getOriginalItemData(listId, itemId)

    // Create optimistic operation
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'DELETE_ITEM',
      status: 'pending',
      timestamp: Date.now(),
      listId,
      originalData,
      optimisticData: null,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries
    }

    this.addOperation(operation)
    this.setEntityLoading(itemId, true)

    // Apply optimistic update immediately
    applyOptimisticUpdate()

    // Queue the actual sync operation
    try {
      const syncPromise = syncQueueService.enqueueOperation({
        type: 'DELETE_ITEM',
        listId,
        data: { id: itemId }
      })

      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(itemId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error, rollbackUpdate)
          this.setEntityLoading(itemId, false)
        })
    } catch (error) {
      this.handleOperationFailure(operationId, error, rollbackUpdate)
      this.setEntityLoading(itemId, false)
      throw error
    }
  }

  // ========== MANAGEMENT METHODS ==========

  /**
   * Retry a failed operation
   */
  async retryOperation(operationId: string): Promise<void> {
    const operation = this.operationsMap.get(operationId)
    if (!operation || operation.status !== 'failed') {
      this.log(`Cannot retry operation ${operationId}: not found or not failed`)
      return
    }

    if (operation.retryCount >= operation.maxRetries) {
      this.log(`Cannot retry operation ${operationId}: max retries exceeded`)
      return
    }

    // Reset operation status and increment retry count
    const updatedOperation: OptimisticOperation = {
      ...operation,
      status: 'pending',
      retryCount: operation.retryCount + 1,
      errorMessage: undefined
    }

    this.updateOperation(updatedOperation)
    this.setEntityLoading(operation.listId, true)

    // Re-queue the sync operation
    try {
      const syncPromise = syncQueueService.enqueueOperation({
        type: operation.type,
        listId: operation.listId,
        data: operation.optimisticData
      })

      syncPromise
        .then((result) => {
          this.handleOperationSuccess(operationId, result)
          this.setEntityLoading(operation.listId, false)
        })
        .catch((error) => {
          this.handleOperationFailure(operationId, error)
          this.setEntityLoading(operation.listId, false)
        })
    } catch (error) {
      this.handleOperationFailure(operationId, error)
      this.setEntityLoading(operation.listId, false)
    }
  }

  /**
   * Cancel a pending operation and rollback changes
   */
  async cancelOperation(operationId: string, rollbackUpdate?: (originalData: any) => void): Promise<void> {
    const operation = this.operationsMap.get(operationId)
    if (!operation || operation.status !== 'pending') {
      this.log(`Cannot cancel operation ${operationId}: not found or not pending`)
      return
    }

    // Perform rollback if provided and original data exists
    if (rollbackUpdate && operation.originalData) {
      rollbackUpdate(operation.originalData)
    }

    // Mark operation as rolled back
    const updatedOperation: OptimisticOperation = {
      ...operation,
      status: 'rolled_back'
    }

    this.updateOperation(updatedOperation)
    this.setEntityLoading(operation.listId, false)
    
    this.log(`Operation ${operationId} cancelled and rolled back`)
  }

  /**
   * Retry all failed operations
   */
  async retryAllFailedOperations(): Promise<void> {
    const state = this.currentState
    const failedOperations = state.operations.filter(op => 
      op.status === 'failed' && op.retryCount < op.maxRetries
    )

    const retryPromises = failedOperations.map(op => this.retryOperation(op.id))
    await Promise.allSettled(retryPromises)
  }

  /**
   * Clear all completed operations from memory
   */
  clearCompletedOperations(): void {
    const state = this.currentState
    const activeOperations = state.operations.filter(op => 
      op.status === 'pending' || (op.status === 'failed' && op.retryCount < op.maxRetries)
    )

    // Remove completed operations from map
    state.operations.forEach(op => {
      if (!activeOperations.includes(op)) {
        this.operationsMap.delete(op.id)
      }
    })

    this.updateState({
      operations: activeOperations,
      pendingCount: activeOperations.filter(op => op.status === 'pending').length,
      failedCount: activeOperations.filter(op => op.status === 'failed').length
    })

    this.log(`Cleared ${state.operations.length - activeOperations.length} completed operations`)
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Initialize subscription to sync queue events
   */
  private initializeSyncQueueSubscription(): void {
    // Monitor sync queue for operation completions
    syncQueueService.operations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(operations => {
        // This helps us track when operations complete in the sync queue
        this.log(`Sync queue has ${operations.length} operations`)
      })

    // Monitor connection status to retry failed operations when online
    syncQueueService.connectionStatus$
      .pipe(
        filter(status => status === 'online'),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.log('Connection restored, retrying failed operations')
        this.retryAllFailedOperations()
      })
  }

  /**
   * Initialize WebSocket event handling for conflict resolution
   */
  private initializeWebSocketEventHandling(): void {
    // Listen to WebSocket events for conflict resolution
    webSocketService.listEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.handleWebSocketEvent(event)
      })
  }

  /**
   * Handle WebSocket events for conflict resolution
   */
  private handleWebSocketEvent(event: any): void {
    if (!event || !event.type || !event.listId) return

    const { type, listId, data, version, eventId } = event

    this.log('Handling WebSocket event for conflict resolution', { 
      type, 
      listId, 
      version,
      eventId 
    })

    // Find pending operations for this entity that might conflict
    const potentialConflicts = this.findPotentialConflicts(type, listId, data?.id)
    
    if (potentialConflicts.length > 0) {
      this.resolveConflicts(potentialConflicts, event)
    }
  }

  /**
   * Find operations that might conflict with incoming WebSocket event
   */
  private findPotentialConflicts(eventType: string, listId: string, entityId?: string): OptimisticOperation[] {
    const operations = this.currentState.operations.filter(op => 
      op.status === 'pending' && op.listId === listId
    )

    return operations.filter(op => {
      // Check for direct conflicts
      switch (eventType) {
        case 'LIST_UPDATED':
          return op.type === 'UPDATE_LIST'
        
        case 'LIST_DELETED':
          return ['UPDATE_LIST', 'DELETE_LIST'].includes(op.type)
        
        case 'ITEM_CREATED':
          // Conflict if we're trying to create an item with the same content
          return op.type === 'CREATE_ITEM'
        
        case 'ITEM_UPDATED':
        case 'ITEM_CHECKED':
          return entityId && op.optimisticData?.id === entityId && 
                 ['UPDATE_ITEM', 'CHECK_ITEM'].includes(op.type)
        
        case 'ITEM_DELETED':
          return entityId && op.optimisticData?.id === entityId
        
        case 'ITEM_REORDERED':
          return op.type === 'REORDER_ITEM'
        
        default:
          return false
      }
    })
  }

  /**
   * Resolve conflicts between optimistic operations and server events
   */
  private resolveConflicts(conflictingOperations: OptimisticOperation[], serverEvent: any): void {
    this.log('Resolving conflicts', { 
      conflicts: conflictingOperations.length,
      eventType: serverEvent.type 
    })

    conflictingOperations.forEach(operation => {
      const resolution = this.determineConflictResolution(operation, serverEvent)
      
      switch (resolution.action) {
        case 'accept_server':
          this.acceptServerChange(operation, serverEvent, resolution.rollback ?? false)
          break
        
        case 'keep_local':
          this.keepLocalChange(operation, serverEvent)
          break
        
        case 'merge':
          this.mergeChanges(operation, serverEvent, resolution.mergedData)
          break
        
        case 'defer_to_user':
          this.deferToUser(operation, serverEvent)
          break
      }
    })
  }

  /**
   * Determine how to resolve a conflict
   */
  private determineConflictResolution(operation: OptimisticOperation, serverEvent: any) {
    const { type: eventType, version, timestamp } = serverEvent
    
    // Simple conflict resolution strategy based on operation type and timing
    const operationTime = operation.timestamp
    const serverTime = timestamp ? new Date(timestamp).getTime() : Date.now()

    // For most operations, if server event is newer, accept it
    if (serverTime > operationTime) {
      switch (eventType) {
        case 'LIST_DELETED':
          // If list was deleted on server, cancel local operations
          return { 
            action: 'accept_server', 
            rollback: operation.type !== 'DELETE_LIST' 
          }
        
        case 'ITEM_DELETED':
          // If item was deleted on server, cancel local item operations
          return { 
            action: 'accept_server', 
            rollback: operation.type !== 'DELETE_ITEM' 
          }
        
        case 'LIST_UPDATED':
        case 'ITEM_UPDATED':
        case 'ITEM_CHECKED':
          // Try to merge changes if possible
          const canMerge = this.canMergeChanges(operation, serverEvent)
          if (canMerge) {
            return { 
              action: 'merge', 
              mergedData: this.createMergedData(operation, serverEvent) 
            }
          }
          // Otherwise accept server changes
          return { action: 'accept_server', rollback: true }
        
        default:
          // Keep local changes for other cases
          return { action: 'keep_local' }
      }
    } else {
      // Local operation is newer, usually keep it
      return { action: 'keep_local' }
    }
  }

  /**
   * Accept server changes and rollback local operation
   */
  private acceptServerChange(operation: OptimisticOperation, serverEvent: any, shouldRollback: boolean): void {
    this.log('Accepting server change, rolling back local operation', { 
      operationId: operation.id,
      eventType: serverEvent.type 
    })

    if (shouldRollback) {
      // Mark operation as resolved/cancelled and trigger rollback
      const updatedOperation: OptimisticOperation = {
        ...operation,
        status: 'rolled_back',
        errorMessage: 'Conflict resolved: Server change accepted'
      }
      
      this.updateOperation(updatedOperation)
      
      // The rollback will be handled by the component that initiated the operation
      // We can emit an event or use a callback mechanism here if needed
    }
  }

  /**
   * Keep local changes and ignore server event
   */
  private keepLocalChange(operation: OptimisticOperation, serverEvent: any): void {
    this.log('Keeping local change, ignoring server event', { 
      operationId: operation.id,
      eventType: serverEvent.type 
    })

    // Operation continues as normal, no action needed
    // The sync process will eventually reconcile differences
  }

  /**
   * Merge local and server changes
   */
  private mergeChanges(operation: OptimisticOperation, serverEvent: any, mergedData: any): void {
    this.log('Merging local and server changes', { 
      operationId: operation.id,
      eventType: serverEvent.type 
    })

    // Update the operation's optimistic data with merged changes
    const updatedOperation: OptimisticOperation = {
      ...operation,
      optimisticData: mergedData,
      errorMessage: undefined // Clear any previous errors
    }
    
    this.updateOperation(updatedOperation)
  }

  /**
   * Defer conflict resolution to user
   */
  private deferToUser(operation: OptimisticOperation, serverEvent: any): void {
    this.log('Deferring conflict resolution to user', { 
      operationId: operation.id,
      eventType: serverEvent.type 
    })

    // Mark operation as having a conflict that needs user resolution
    const updatedOperation: OptimisticOperation = {
      ...operation,
      status: 'failed',
      errorMessage: `Conflict with server changes. Manual resolution required.`,
      retryCount: this.defaultMaxRetries // Prevent auto-retry
    }
    
    this.updateOperation(updatedOperation)
    
    // Emit or trigger UI notification for user intervention
    this.setError(`Conflict detected: ${operation.type} operation needs manual resolution`)
  }

  /**
   * Check if changes can be merged automatically
   */
  private canMergeChanges(operation: OptimisticOperation, serverEvent: any): boolean {
    const { type: eventType } = serverEvent
    
    // Only merge for simple update operations
    if (!['LIST_UPDATED', 'ITEM_UPDATED'].includes(eventType)) {
      return false
    }

    // Check if the fields being modified don't overlap
    const localData = operation.optimisticData || {}
    const serverData = serverEvent.data || {}
    
    const localFields = Object.keys(localData)
    const serverFields = Object.keys(serverData)
    
    // Can merge if no field overlap
    return localFields.every(field => !serverFields.includes(field))
  }

  /**
   * Create merged data from local and server changes
   */
  private createMergedData(operation: OptimisticOperation, serverEvent: any): any {
    const localData = operation.optimisticData || {}
    const serverData = serverEvent.data || {}
    
    // Merge non-overlapping fields
    // Server data takes precedence for overlapping fields
    return {
      ...localData,
      ...serverData,
      // Add timestamp to track when merge occurred
      _mergedAt: Date.now()
    }
  }

  /**
   * Add operation to state and map
   */
  private addOperation(operation: OptimisticOperation): void {
    this.operationsMap.set(operation.id, operation)
    
    const state = this.currentState
    const operations = [...state.operations, operation]
    
    this.updateState({
      operations,
      pendingCount: operations.filter(op => op.status === 'pending').length,
      failedCount: operations.filter(op => op.status === 'failed').length
    })

    this.log(`Added optimistic operation: ${operation.type} for ${operation.listId}`)
  }

  /**
   * Update operation in state and map
   */
  private updateOperation(operation: OptimisticOperation): void {
    this.operationsMap.set(operation.id, operation)
    
    const state = this.currentState
    const operations = state.operations.map(op => 
      op.id === operation.id ? operation : op
    )
    
    this.updateState({
      operations,
      pendingCount: operations.filter(op => op.status === 'pending').length,
      failedCount: operations.filter(op => op.status === 'failed').length
    })
  }

  /**
   * Update state
   */
  private updateState(newState: OptimisticUpdatesState): void {
    this._state$.next(newState)
  }

  /**
   * Set loading state for entity
   */
  private setEntityLoading(entityId: string, loading: boolean): void {
    const currentStates = this._loadingStates$.value
    const updatedStates = { ...currentStates }
    
    if (loading) {
      updatedStates[entityId] = true
    } else {
      delete updatedStates[entityId]
    }
    
    this._loadingStates$.next(updatedStates)
  }

  /**
   * Handle operation success
   */
  private handleOperationSuccess(operationId: string, result: any): void {
    const operation = this.operationsMap.get(operationId)
    if (!operation) return

    const updatedOperation: OptimisticOperation = {
      ...operation,
      status: 'confirmed'
    }

    this.updateOperation(updatedOperation)
    this.log(`Operation ${operationId} confirmed successfully`)

    // Auto-cleanup after 5 seconds
    setTimeout(() => {
      this.operationsMap.delete(operationId)
      this.clearCompletedOperations()
    }, 5000)
  }

  /**
   * Handle operation failure
   */
  private handleOperationFailure(
    operationId: string, 
    error: any, 
    rollbackUpdate?: (originalData: any) => void
  ): void {
    const operation = this.operationsMap.get(operationId)
    if (!operation) return

    const updatedOperation: OptimisticOperation = {
      ...operation,
      status: 'failed',
      errorMessage: error.message || 'Unknown error'
    }

    this.updateOperation(updatedOperation)

    // Perform rollback if max retries exceeded
    if (operation.retryCount >= operation.maxRetries - 1) {
      if (rollbackUpdate && operation.originalData) {
        rollbackUpdate(operation.originalData)
        updatedOperation.status = 'rolled_back'
        this.updateOperation(updatedOperation)
      }
      this.log(`Operation ${operationId} failed permanently and rolled back`)
    } else {
      this.log(`Operation ${operationId} failed, will retry later`)
    }

    this.setError(`Operation failed: ${error.message}`)
  }

  /**
   * Get original list data for rollback
   */
  private async getOriginalListData(listId: string): Promise<any> {
    try {
      const cachedList = cacheService.getListSync(listId)
      return cachedList || null
    } catch (error) {
      this.log('Error getting original list data:', error)
      return null
    }
  }

  /**
   * Get original item data for rollback
   */
  private async getOriginalItemData(listId: string, itemId: string): Promise<any> {
    try {
      const cachedItems = cacheService.getListItemsSync(listId)
      const originalItem = cachedItems?.find(item => item.id === itemId)
      return originalItem || null
    } catch (error) {
      this.log('Error getting original item data:', error)
      return null
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this._state$.complete()
    this._loadingStates$.complete()
    this.operationsMap.clear()
    super.destroy()
  }
}

// Create and export singleton instance
export const optimisticUpdatesService = new OptimisticUpdatesService()
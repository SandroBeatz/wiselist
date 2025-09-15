import { 
  BehaviorSubject, 
  Observable, 
  Subject,
  timer,
  from,
  EMPTY,
  of
} from 'rxjs'
import {
  switchMap,
  mergeMap,
  catchError,
  tap,
  delay,
  retryWhen,
  take,
  takeUntil,
  filter,
} from 'rxjs/operators'
import { BaseReactiveService } from './base-reactive.service'
import { cacheService } from './cache.service'
import { API } from '@shared/instances/axios'
import type { AxiosRequestConfig } from 'axios'

export type SyncOperationType = 
  | 'CREATE_LIST'
  | 'UPDATE_LIST' 
  | 'DELETE_LIST'
  | 'CREATE_ITEM'
  | 'UPDATE_ITEM'
  | 'DELETE_ITEM'
  | 'CHECK_ITEM'
  | 'REORDER_ITEM'

export interface SyncOperation {
  id: string
  type: SyncOperationType
  listId: string
  data: any
  version?: number
  timestamp: number
  retries?: number
}

export interface SyncResponse {
  serverVersion: number
  conflicts: Array<{ operationId: string; reason: string }>
  appliedOperations: string[]
  delta: {
    items?: any[]
    list?: any
  }
}

export interface QueuedSyncOperation extends SyncOperation {
  resolve: (value: SyncResponse) => void
  reject: (error: any) => void
}

/**
 * Enhanced request queue service with RxJS support for differential synchronization
 */
export class SyncQueueService extends BaseReactiveService {
  private readonly _operations$ = new BehaviorSubject<SyncOperation[]>([])
  private readonly _isProcessing$ = new BehaviorSubject<boolean>(false)
  private readonly _connectionStatus$ = new BehaviorSubject<'online' | 'offline'>('online')
  private readonly processQueue$ = new Subject<void>()
  
  private operationsMap = new Map<string, QueuedSyncOperation>()
  private readonly maxRetries = 3
  private readonly baseDelay = 1000 // 1 second
  private readonly maxDelay = 30000 // 30 seconds
  private processingTimer?: NodeJS.Timeout

  constructor() {
    super({ enableLogging: process.env.NODE_ENV === 'development' })
    this.initializeQueueProcessor()
    this.monitorConnectionStatus()
  }

  /**
   * Get observable of queued operations
   */
  get operations$(): Observable<SyncOperation[]> {
    return this.createObservable(this._operations$)
  }

  /**
   * Get observable of processing status
   */
  get isProcessing$(): Observable<boolean> {
    return this.createObservable(this._isProcessing$)
  }

  /**
   * Get observable of connection status
   */
  get connectionStatus$(): Observable<'online' | 'offline'> {
    return this.createObservable(this._connectionStatus$)
  }

  /**
   * Get current queue size
   */
  get queueSize(): number {
    return this._operations$.value.length
  }

  /**
   * Enqueue a sync operation
   */
  enqueueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<SyncResponse> {
    return new Promise((resolve, reject) => {
      const id = this.generateOperationId()
      const timestamp = Date.now()
      
      const queuedOperation: QueuedSyncOperation = {
        ...operation,
        id,
        timestamp,
        retries: 0,
        resolve,
        reject
      }

      this.operationsMap.set(id, queuedOperation)
      
      const currentOps = this._operations$.value
      this._operations$.next([...currentOps, queuedOperation])
      
      this.log(`Operation enqueued: ${operation.type} for list ${operation.listId}`)
      
      // Trigger queue processing if we're online
      if (this._connectionStatus$.value === 'online') {
        this.scheduleProcessing()
      }
    })
  }

  /**
   * Remove operation from queue
   */
  removeOperation(operationId: string): void {
    const currentOps = this._operations$.value
    this._operations$.next(currentOps.filter(op => op.id !== operationId))
    this.operationsMap.delete(operationId)
    
    this.log(`Operation removed: ${operationId}`)
  }

  /**
   * Clear all operations
   */
  clearQueue(): void {
    const operations = Array.from(this.operationsMap.values())
    operations.forEach(op => {
      op.reject(new Error('Queue cleared'))
    })
    
    this._operations$.next([])
    this.operationsMap.clear()
    this.log('Queue cleared')
  }

  /**
   * Retry failed operations
   */
  retryFailedOperations(): void {
    if (this._connectionStatus$.value === 'online' && !this._isProcessing$.value) {
      this.scheduleProcessing()
    }
  }

  /**
   * Initialize queue processor
   */
  private initializeQueueProcessor(): void {
    this.processQueue$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this._connectionStatus$.value === 'online'),
        filter(() => !this._isProcessing$.value),
        filter(() => this._operations$.value.length > 0),
        tap(() => this._isProcessing$.next(true)),
        switchMap(() => this.processPendingOperations()),
        tap(() => this._isProcessing$.next(false)),
        catchError(error => {
          this.log('Queue processing error:', error)
          this._isProcessing$.next(false)
          return EMPTY
        })
      )
      .subscribe()
  }

  /**
   * Process all pending operations
   */
  private processPendingOperations(): Observable<void> {
    const operations = this._operations$.value
    
    if (operations.length === 0) {
      return of(undefined)
    }

    // Group operations by listId for batch processing
    const operationsByList = new Map<string, QueuedSyncOperation[]>()
    operations.forEach(op => {
      // Convert SyncOperation to QueuedSyncOperation by finding it in operationsMap
      const queuedOp = this.operationsMap.get(op.id)
      if (queuedOp) {
        if (!operationsByList.has(op.listId)) {
          operationsByList.set(op.listId, [])
        }
        operationsByList.get(op.listId)!.push(queuedOp)
      }
    })

    // Process each list's operations in parallel
    const processPromises = Array.from(operationsByList.entries()).map(
      ([listId, listOps]) => this.processListOperations(listId, listOps)
    )

    return from(Promise.all(processPromises)).pipe(
      switchMap(() => of(undefined))
    )
  }

  /**
   * Process operations for a specific list
   */
  private async processListOperations(listId: string, operations: QueuedSyncOperation[]): Promise<void> {
    this.log(`Processing ${operations.length} operations for list ${listId}`)

    // Determine client version (use the latest version from cache or 0)
    const clientVersion = this.getClientVersion(listId)

    // Prepare sync request
    const syncRequest = {
      clientVersion,
      operations: operations.map(op => ({
        id: op.id,
        type: op.type,
        data: op.data,
        ...(op.type.includes('ITEM') && { itemId: op.data.id })
      }))
    }

    try {
      const response = await this.performSyncRequest(listId, syncRequest)
      this.handleSyncSuccess(operations, response)
    } catch (error) {
      await this.handleSyncError(operations, error)
    }
  }

  /**
   * Perform sync request with retry logic
   */
  private performSyncRequest(listId: string, syncRequest: any): Promise<SyncResponse> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `/api/lists/${listId}/sync`,
      data: syncRequest
    }

    return from(API.request<SyncResponse>(config))
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            mergeMap((error, index) => {
              const retryDelay = Math.min(
                this.baseDelay * Math.pow(2, index),
                this.maxDelay
              )

              if (index >= this.maxRetries - 1) {
                throw error
              }

              this.log(`Sync request failed, retrying in ${retryDelay}ms (attempt ${index + 1})`)
              return timer(retryDelay)
            })
          )
        ),
        take(1)
      )
      .toPromise()
      .then(response => response!.data)
  }

  /**
   * Handle successful sync response
   */
  private handleSyncSuccess(operations: QueuedSyncOperation[], response: SyncResponse): void {
    this.log('Sync successful:', response)

    // Update client version
    operations.forEach(op => {
      if (response.appliedOperations.includes(op.id)) {
        // Operation was applied successfully
        op.resolve(response)
        this.removeOperation(op.id)
      } else {
        // Check if operation was conflicted
        const conflict = response.conflicts.find(c => c.operationId === op.id)
        if (conflict) {
          this.log(`Operation ${op.id} had conflict: ${conflict.reason}`)
          op.reject(new Error(`Sync conflict: ${conflict.reason}`))
          this.removeOperation(op.id)
        }
      }
    })

    // Update client version for this list
    this.updateClientVersion(operations[0]?.listId, response.serverVersion)
  }

  /**
   * Handle sync error with exponential backoff
   */
  private async handleSyncError(operations: QueuedSyncOperation[], error: any): Promise<void> {
    this.log('Sync error:', error)
    this.setError(`Sync failed: ${error.message}`)

    // Increment retry count for all operations
    operations.forEach(op => {
      op.retries = (op.retries || 0) + 1
      
      if (op.retries >= this.maxRetries) {
        // Max retries reached, reject the operation
        op.reject(new Error(`Max retries reached: ${error.message}`))
        this.removeOperation(op.id)
      }
    })

    // Set connection status to offline if request failed due to network
    if (error.code === 'NETWORK_ERROR' || error.response?.status >= 500) {
      this._connectionStatus$.next('offline')
      
      // Schedule retry when connection is restored
      this.scheduleRetryWhenOnline()
    }
  }

  /**
   * Monitor connection status
   */
  private monitorConnectionStatus(): void {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.log('Connection restored')
        this._connectionStatus$.next('online')
        this.clearError()
        this.scheduleProcessing()
      })
      
      window.addEventListener('offline', () => {
        this.log('Connection lost')
        this._connectionStatus$.next('offline')
      })
    }
  }

  /**
   * Schedule queue processing
   */
  private scheduleProcessing(delay = 100): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
    }
    
    this.processingTimer = setTimeout(() => {
      this.processQueue$.next()
    }, delay)
  }

  /**
   * Schedule retry when connection is restored
   */
  private scheduleRetryWhenOnline(): void {
    this.connectionStatus$
      .pipe(
        filter(status => status === 'online'),
        take(1),
        delay(1000) // Wait 1 second after connection is restored
      )
      .subscribe(() => {
        this.log('Retrying operations after connection restored')
        this.scheduleProcessing()
      })
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get client version for a list from localStorage
   */
  private getClientVersion(listId: string): number {
    try {
      const cacheKey = `list_version_${listId}`
      const storedVersion = localStorage.getItem(cacheKey)
      
      if (storedVersion) {
        const version = parseInt(storedVersion, 10)
        this.log(`Retrieved client version for list ${listId}: ${version}`)
        return version
      }
    } catch (error) {
      this.log('Error reading version from localStorage:', error)
    }
    
    this.log(`No cached version found for list ${listId}, defaulting to 0`)
    return 0
  }

  /**
   * Update client version for a list in localStorage
   */
  private updateClientVersion(listId: string, version: number): void {
    try {
      const cacheKey = `list_version_${listId}`
      localStorage.setItem(cacheKey, version.toString())
      this.log(`Updated client version for list ${listId} to ${version}`)
    } catch (error) {
      this.log('Error storing version to localStorage:', error)
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
    }
    
    this.clearQueue()
    
    this._operations$.complete()
    this._isProcessing$.complete()
    this._connectionStatus$.complete()
    this.processQueue$.complete()
    
    super.destroy()
  }
}

// Create and export singleton instance
export const syncQueueService = new SyncQueueService()
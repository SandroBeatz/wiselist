import { BehaviorSubject, Observable, interval, fromEvent, merge } from 'rxjs'
import { filter, debounceTime } from 'rxjs/operators'
import { API } from '@shared/instances/axios'
import { db, OperationType, SyncStatus } from '@shared/db'
import type { SyncOperation } from '@shared/db'
import { tokenService } from '@shared/services/token.service'
import { listRxService } from '@shared/services/rxjs/list.service'
import { listItemRxService } from '@shared/services/rxjs/list-item.service'
import { resolveConflict, mergeOperationsByEntity, sortOperations } from './ot-resolver'
import type { SyncState, SyncPayload, SyncResponse, SyncConfig } from './types'
import {
  OFFLINE_ONLY_MODE,
  AUTO_SYNC_INTERVAL,
  MAX_SYNC_RETRIES,
  SYNC_RETRY_BACKOFF,
} from '@shared/config/offline.config'

/**
 * SyncService - Main synchronization service
 *
 * Features:
 * - Network status monitoring
 * - Auto-sync every 30 seconds
 * - Manual sync trigger
 * - Token refresh before sync
 * - Retry mechanism with exponential backoff
 * - Conflict resolution
 *
 * Usage:
 * ```typescript
 * const syncService = SyncService.getInstance()
 * syncService.start() // Start auto-sync
 * syncService.getSyncState$().subscribe(state => console.log(state))
 * await syncService.forceSync() // Manual sync
 * ```
 */
export class SyncService {
  private static instance: SyncService | null = null

  // Sync state observable
  private syncState$ = new BehaviorSubject<SyncState>({
    isSyncing: false,
    isOnline: navigator.onLine,
    lastSync: null,
    pendingCount: 0,
    error: null,
  })

  // Configuration
  private config: SyncConfig = {
    autoSyncInterval: AUTO_SYNC_INTERVAL,
    maxRetries: MAX_SYNC_RETRIES,
    retryBackoff: SYNC_RETRY_BACKOFF,
    offlineOnly: OFFLINE_ONLY_MODE, // Set from config
  }

  // Auto-sync timer
  private autoSyncSubscription: any = null

  // Network event listeners
  private networkSubscription: any = null

  private constructor() {
    // Initialize with current online status
    this.syncState$.next({
      ...this.syncState$.value,
      isOnline: navigator.onLine,
    })

    this.initializeNetworkListeners()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  /**
   * Get observable of sync state
   */
  getSyncState$(): Observable<SyncState> {
    return this.syncState$.asObservable()
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return this.syncState$.value
  }

  /**
   * Start auto-sync and network monitoring
   */
  start(): void {
    // Start auto-sync interval
    this.autoSyncSubscription = interval(this.config.autoSyncInterval)
      .pipe(
        filter(() => this.getSyncState().isOnline && !this.getSyncState().isSyncing)
      )
      .subscribe(() => {
        this.sync().catch(error => {
          console.error('Auto-sync failed:', error)
        })
      })

    // Initial sync if online
    if (this.getSyncState().isOnline) {
      this.sync().catch(error => {
        console.error('Initial sync failed:', error)
      })
    }
  }

  /**
   * Stop auto-sync
   */
  stop(): void {
    if (this.autoSyncSubscription) {
      this.autoSyncSubscription.unsubscribe()
      this.autoSyncSubscription = null
    }
  }

  /**
   * Force manual sync
   */
  async forceSync(): Promise<void> {
    return this.sync()
  }

  /**
   * Main sync method
   */
  private async sync(retryCount = 0): Promise<void> {
    const state = this.getSyncState()

    // Don't sync if in offline-only mode (no backend available)
    if (this.config.offlineOnly) {
      console.log('Sync skipped: offline-only mode (no backend)')
      // Just clear pending operations queue and mark as synced locally
      const pendingOps = await db.syncOperations.toArray()
      if (pendingOps.length > 0) {
        await db.syncOperations.clear()
        this.updateSyncState({
          lastSync: Date.now(),
          pendingCount: 0,
        })
      }
      return
    }

    // Don't sync if offline
    if (!state.isOnline) {
      console.log('Sync skipped: offline')
      return
    }

    // Don't sync if already syncing
    if (state.isSyncing) {
      console.log('Sync skipped: already syncing')
      return
    }

    try {
      // Update state: syncing started
      this.updateSyncState({ isSyncing: true, error: null })

      // Step 1: Refresh token if needed
      await this.ensureValidToken()

      // Step 2: Get pending operations from IndexedDB
      const pendingOps = await db.syncOperations.toArray()

      // Update pending count
      this.updateSyncState({ pendingCount: pendingOps.length })

      // If no pending operations, just update lastSync
      if (pendingOps.length === 0) {
        this.updateSyncState({
          isSyncing: false,
          lastSync: Date.now(),
          pendingCount: 0,
        })
        return
      }

      // Step 3: Group and prepare operations
      const payload = await this.prepareSyncPayload(pendingOps)

      // Step 4: Send to server
      const response = await this.sendSyncRequest(payload)

      // Step 5: Process server response
      await this.processSyncResponse(response, pendingOps)

      // Step 6: Clear successful operations
      await this.clearSyncedOperations(pendingOps)

      // Success - update state
      this.updateSyncState({
        isSyncing: false,
        lastSync: Date.now(),
        pendingCount: 0,
        error: null,
      })

      console.log('Sync completed successfully')
    } catch (error: any) {
      console.error('Sync failed:', error)

      // Retry logic
      if (retryCount < this.config.maxRetries) {
        const backoff = this.config.retryBackoff * Math.pow(2, retryCount)
        console.log(`Retrying sync in ${backoff}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`)

        await new Promise(resolve => setTimeout(resolve, backoff))
        return this.sync(retryCount + 1)
      }

      // Max retries reached
      this.updateSyncState({
        isSyncing: false,
        error: error.message || 'Sync failed',
      })

      throw error
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!tokenService.hasValidAccessToken() && tokenService.hasValidRefreshToken()) {
      // Token will be refreshed automatically by axios interceptor
      // Just make a dummy request to trigger refresh
      try {
        const { apiAuth } = await import('../../../features/Auth/api')
        const response = await apiAuth.refreshToken(tokenService.refreshToken!)
        tokenService.setTokens(response.accessToken, response.refreshToken)
      } catch (error) {
        console.error('Token refresh failed:', error)
        throw new Error('Authentication required')
      }
    } else if (!tokenService.isAuthenticated()) {
      throw new Error('Not authenticated')
    }
  }

  /**
   * Prepare sync payload from pending operations
   */
  private async prepareSyncPayload(operations: SyncOperation[]): Promise<SyncPayload> {
    // Merge operations by entity (keep latest only)
    const mergedOps = mergeOperationsByEntity(operations)

    // Sort by priority (DELETE > UPDATE > CREATE)
    const sortedOps = sortOperations(mergedOps)

    // Group by entity type
    const listOps = sortedOps.filter(op => op.entityType === 'list')
    const itemOps = sortedOps.filter(op => op.entityType === 'listItem')

    return {
      listOperations: listOps.map(op => ({
        id: op.entityId,
        type: op.operationType as 'CREATE' | 'UPDATE' | 'DELETE',
        version: op.version,
        timestamp: op.timestamp,
        data: op.data,
      })),
      itemOperations: itemOps.map(op => ({
        id: op.entityId,
        type: op.operationType as 'CREATE' | 'UPDATE' | 'DELETE',
        version: op.version,
        timestamp: op.timestamp,
        data: op.data,
      })),
    }
  }

  /**
   * Send sync request to server
   */
  private async sendSyncRequest(payload: SyncPayload): Promise<SyncResponse> {
    const response = await API.post<SyncResponse>('lists/sync', payload)
    return response.data
  }

  /**
   * Process sync response from server
   */
  private async processSyncResponse(
    response: SyncResponse,
    sentOperations: SyncOperation[]
  ): Promise<void> {
    // Update lists from server
    if (response.lists && response.lists.length > 0) {
      await this.processServerLists(response.lists, sentOperations)
    }

    // Update items from server
    if (response.items && response.items.length > 0) {
      await this.processServerItems(response.items, sentOperations)
    }

    // Handle conflicts if any
    if (response.conflicts && response.conflicts.length > 0) {
      console.warn('Conflicts detected:', response.conflicts)
      // Conflicts are already resolved by the resolver logic above
    }
  }

  /**
   * Process server lists and resolve conflicts
   */
  private async processServerLists(
    serverLists: any[],
    sentOperations: SyncOperation[]
  ): Promise<void> {
    for (const serverList of serverLists) {
      const clientOp = sentOperations.find(
        op => op.entityType === 'list' && op.entityId === serverList.id
      )

      if (clientOp) {
        // Check for conflicts
        const clientData = await db.lists.get(serverList.id)

        if (clientData && clientData.version !== serverList.version) {
          // Conflict detected - resolve
          const resolution = resolveConflict(
            clientOp.operationType,
            clientData,
            clientOp.timestamp,
            serverList,
            new Date(serverList.updatedAt).getTime()
          )

          if (resolution.resolved) {
            // Update with resolved data
            await db.lists.put({
              ...resolution.resolved,
              syncStatus: SyncStatus.SYNCED,
            })
          } else {
            // Entity was deleted
            await db.lists.delete(serverList.id)
          }

          console.log(`List conflict resolved for ${serverList.id}:`, resolution.strategy)
        } else {
          // No conflict - just update
          await db.lists.put({
            ...serverList,
            syncStatus: SyncStatus.SYNCED,
          })
        }
      } else {
        // New list from server (no client operation)
        await db.lists.put({
          ...serverList,
          syncStatus: SyncStatus.SYNCED,
        })
      }
    }
  }

  /**
   * Process server items and resolve conflicts
   */
  private async processServerItems(
    serverItems: any[],
    sentOperations: SyncOperation[]
  ): Promise<void> {
    for (const serverItem of serverItems) {
      const clientOp = sentOperations.find(
        op => op.entityType === 'listItem' && op.entityId === serverItem.id
      )

      if (clientOp) {
        // Check for conflicts
        const clientData = await db.listItems.get(serverItem.id)

        if (clientData && clientData.version !== serverItem.version) {
          // Conflict detected - resolve
          const resolution = resolveConflict(
            clientOp.operationType,
            clientData,
            clientOp.timestamp,
            serverItem,
            new Date(serverItem.updatedAt).getTime()
          )

          if (resolution.resolved) {
            // Update with resolved data
            await db.listItems.put({
              ...resolution.resolved,
              syncStatus: SyncStatus.SYNCED,
            })
          } else {
            // Entity was deleted
            await db.listItems.delete(serverItem.id)
          }

          console.log(`Item conflict resolved for ${serverItem.id}:`, resolution.strategy)
        } else {
          // No conflict - just update
          await db.listItems.put({
            ...serverItem,
            syncStatus: SyncStatus.SYNCED,
          })
        }
      } else {
        // New item from server (no client operation)
        await db.listItems.put({
          ...serverItem,
          syncStatus: SyncStatus.SYNCED,
        })
      }
    }
  }

  /**
   * Clear successfully synced operations from queue
   */
  private async clearSyncedOperations(operations: SyncOperation[]): Promise<void> {
    const ids = operations.map(op => op.id!).filter(id => id !== undefined)
    await db.syncOperations.bulkDelete(ids)
  }

  /**
   * Initialize network event listeners
   */
  private initializeNetworkListeners(): void {
    const online$ = fromEvent(window, 'online')
    const offline$ = fromEvent(window, 'offline')

    this.networkSubscription = merge(online$, offline$)
      .pipe(debounceTime(500))
      .subscribe(() => {
        const isOnline = navigator.onLine

        this.updateSyncState({ isOnline })

        // Trigger sync when coming online
        if (isOnline && !this.getSyncState().isSyncing) {
          console.log('Network restored - triggering sync')
          this.sync().catch(error => {
            console.error('Sync after network restore failed:', error)
          })
        }
      })
  }

  /**
   * Update sync state
   */
  private updateSyncState(partial: Partial<SyncState>): void {
    this.syncState$.next({
      ...this.getSyncState(),
      ...partial,
    })
  }

  /**
   * Update sync configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart auto-sync with new interval if changed
    if (config.autoSyncInterval && this.autoSyncSubscription) {
      this.stop()
      this.start()
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop()

    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe()
      this.networkSubscription = null
    }
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance()

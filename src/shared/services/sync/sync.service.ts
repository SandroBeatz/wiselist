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

  // Debouncing to prevent too frequent sync calls
  private lastSyncAttemptTime = 0
  private readonly MIN_SYNC_INTERVAL = 3000 // 3 seconds minimum between sync attempts

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
    // Idempotency guard - prevent multiple starts
    if (this.autoSyncSubscription) {
      console.log('Sync service already started, skipping duplicate start() call')
      return
    }

    console.log('Starting sync service...')

    // Start auto-sync interval
    this.autoSyncSubscription = interval(this.config.autoSyncInterval)
      .pipe(
        filter(() =>
          this.getSyncState().isOnline &&
          !this.getSyncState().isSyncing &&
          tokenService.isAuthenticated()
        )
      )
      .subscribe(() => {
        this.sync().catch(error => {
          console.error('Auto-sync failed:', error)
        })
      })

    // Initial sync if online and authenticated
    if (this.getSyncState().isOnline && tokenService.isAuthenticated()) {
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
      console.log('Sync service stopped')
    }
  }

  /**
   * Check if sync service is currently started
   */
  isStarted(): boolean {
    return this.autoSyncSubscription !== null
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

    // Debouncing: Don't sync if called too soon after last attempt
    const now = Date.now()
    const timeSinceLastAttempt = now - this.lastSyncAttemptTime
    if (timeSinceLastAttempt < this.MIN_SYNC_INTERVAL && retryCount === 0) {
      console.log(`Sync skipped: too soon since last attempt (${timeSinceLastAttempt}ms < ${this.MIN_SYNC_INTERVAL}ms)`)
      return
    }
    this.lastSyncAttemptTime = now

    // Don't sync if not authenticated
    if (!tokenService.isAuthenticated()) {
      console.log('Sync skipped: not authenticated')
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

      // Step 3: Group and prepare operations (even if empty - fetch from server)
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
    // Enforce max 1000 operations limit
    const limitedOps = operations.slice(0, 1000)

    if (operations.length > 1000) {
      console.warn(`Truncating ${operations.length} operations to 1000 limit`)
    }

    // Merge operations by entity (keep latest only)
    const mergedOps = mergeOperationsByEntity(limitedOps)

    // Sort by priority (DELETE > UPDATE > CREATE)
    const sortedOps = sortOperations(mergedOps)

    // Group by entity type
    const listOps = sortedOps.filter(op => op.entityType === 'list')
    const itemOps = sortedOps.filter(op => op.entityType === 'listItem')

    // Get last sync timestamp for incremental sync
    const lastSync = localStorage.getItem('lastSyncTimestamp')
    const isInitialSync = !lastSync

    // Log sync type
    if (isInitialSync) {
      console.log('🔄 Preparing INITIAL SYNC (full data fetch from server)')
    } else {
      console.log('🔄 Preparing INCREMENTAL SYNC (changes since:', new Date(parseInt(lastSync)).toISOString(), ')')
    }

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
        listId: op.data?.listId || op.data?.data?.listId, // Extract listId from data
        type: op.operationType as 'CREATE' | 'UPDATE' | 'DELETE',
        version: op.version,
        timestamp: op.timestamp,
        data: op.data?.data || op.data, // Handle nested data structure
      })),
      lastSyncTimestamp: lastSync ? parseInt(lastSync) : undefined,
    }
  }

  /**
   * Send sync request to server
   */
  private async sendSyncRequest(payload: SyncPayload): Promise<SyncResponse> {
    try {
      const response = await API.post<SyncResponse>('lists/sync', payload)
      return response.data
    } catch (error: any) {
      // Handle specific HTTP error codes
      if (error.response) {
        const status = error.response.status

        switch (status) {
          case 400:
            // Bad Request - likely invalid payload or too many operations
            console.error('Sync request rejected - invalid data:', error.response.data)
            throw new Error('Invalid sync request - check operation data')

          case 403:
            // Forbidden - user doesn't have access to one or more lists
            console.error('Sync forbidden - access denied to one or more lists')
            throw new Error('Access denied to lists')

          case 429:
            // Rate limit exceeded - wait 60 seconds before retry
            console.warn('Sync rate limit exceeded - will retry after backoff')
            throw new Error('Rate limit exceeded')

          default:
            throw error
        }
      }
      throw error
    }
  }

  /**
   * Process sync response from server
   */
  private async processSyncResponse(
    response: SyncResponse,
    sentOperations: SyncOperation[]
  ): Promise<void> {
    // Debug: Log server response
    console.log('📥 Server sync response:', {
      listsCount: response.lists?.length || 0,
      itemsCount: response.items?.length || 0,
      conflictListIds: response.conflicts?.listIds?.length || 0,
      conflictItemIds: response.conflicts?.itemIds?.length || 0,
      serverTimestamp: response.serverTimestamp,
    })

    // Save serverTimestamp for next incremental sync
    if (response.serverTimestamp) {
      localStorage.setItem('lastSyncTimestamp', response.serverTimestamp.toString())
    }

    // Update lists from server
    if (response.lists && response.lists.length > 0) {
      console.log('📝 Processing', response.lists.length, 'lists from server')
      await this.processServerLists(response.lists, response.conflicts, sentOperations)
    }

    // Update items from server
    if (response.items && response.items.length > 0) {
      console.log('📝 Processing', response.items.length, 'items from server')
      await this.processServerItems(response.items, response.conflicts, sentOperations)
    }

    // Log conflicts if any
    if (response.conflicts) {
      if (response.conflicts.listIds?.length > 0) {
        console.warn('List conflicts resolved (server won):', response.conflicts.listIds)
      }
      if (response.conflicts.itemIds?.length > 0) {
        console.warn('Item conflicts resolved (server won):', response.conflicts.itemIds)
      }
    }
  }

  /**
   * Process server lists and resolve conflicts
   */
  private async processServerLists(
    serverLists: any[],
    conflicts: { listIds: string[]; itemIds: string[] },
    sentOperations: SyncOperation[]
  ): Promise<void> {
    console.log('💾 Saving lists to IndexedDB:', serverLists.length)

    for (const serverList of serverLists) {
      const isConflict = conflicts.listIds.includes(serverList.id)

      if (isConflict) {
        console.warn(`⚠️ List conflict resolved for ${serverList.id} - using server version`)
      }

      // Always use server data (conflicts already resolved by server using LWW)
      const listToSave = {
        ...serverList,
        version: serverList.version, // Ensure version is updated
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(), // Update timestamp to trigger liveQuery
      }

      await db.lists.put(listToSave)

      console.log('✅ Saved list to IndexedDB:', {
        id: serverList.id,
        title: serverList.title,
        ownerId: serverList.ownerId,
        itemsCount: serverList.items?.length || 0,
      })
    }
  }

  /**
   * Process server items and resolve conflicts
   */
  private async processServerItems(
    serverItems: any[],
    conflicts: { listIds: string[]; itemIds: string[] },
    sentOperations: SyncOperation[]
  ): Promise<void> {
    for (const serverItem of serverItems) {
      const isConflict = conflicts.itemIds.includes(serverItem.id)

      if (isConflict) {
        console.warn(`Item conflict resolved for ${serverItem.id} - using server version`)
      }

      // Always use server data (conflicts already resolved by server using LWW)
      await db.listItems.put({
        ...serverItem,
        version: serverItem.version, // Ensure version is updated
        syncStatus: SyncStatus.SYNCED,
      })
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

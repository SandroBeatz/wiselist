import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { Ref } from 'vue'
import { Subscription } from 'rxjs'
import { syncService } from '@shared/services/sync/sync.service'
import type { SyncState } from '@shared/services/sync/types'

/**
 * Vue composable for global sync status monitoring
 *
 * Features:
 * - Real-time sync state updates
 * - Network status monitoring
 * - Pending operations count
 * - Error tracking
 * - Last sync timestamp
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { useSyncStatus } from '@shared/composables/useSyncStatus'
 *
 * const {
 *   syncState,
 *   isOnline,
 *   isSyncing,
 *   pendingCount,
 *   lastSync,
 *   error,
 *   forceSync
 * } = useSyncStatus()
 * </script>
 * ```
 */
export function useSyncStatus() {
  // Reactive state
  const syncState = ref<SyncState>({
    isSyncing: false,
    isOnline: navigator.onLine,
    lastSync: null,
    pendingCount: 0,
    error: null,
  }) as Ref<SyncState>

  // Subscription
  let syncSubscription: Subscription | null = null

  /**
   * Initialize subscription
   */
  const initialize = () => {
    syncSubscription = syncService.getSyncState$().subscribe({
      next: (state) => {
        syncState.value = state
      },
      error: (err) => {
        console.error('Error monitoring sync state:', err)
      },
    })
  }

  /**
   * Cleanup subscription
   */
  const cleanup = () => {
    if (syncSubscription) {
      syncSubscription.unsubscribe()
      syncSubscription = null
    }
  }

  /**
   * Manually trigger sync
   */
  const forceSync = async () => {
    try {
      await syncService.forceSync()
    } catch (err) {
      console.error('Manual sync failed:', err)
      throw err
    }
  }

  // Computed properties for easier access
  const isOnline = computed(() => syncState.value.isOnline)
  const isSyncing = computed(() => syncState.value.isSyncing)
  const pendingCount = computed(() => syncState.value.pendingCount)
  const lastSync = computed(() => syncState.value.lastSync)
  const error = computed(() => syncState.value.error)

  /**
   * Check if sync is needed
   */
  const needsSync = computed(() => pendingCount.value > 0)

  /**
   * Get last sync time as human-readable string
   */
  const lastSyncFormatted = computed(() => {
    if (!lastSync.value) return 'Never'

    const now = Date.now()
    const diff = now - lastSync.value
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    if (seconds > 0) return `${seconds}s ago`
    return 'Just now'
  })

  /**
   * Get sync status as color/icon indicator
   */
  const syncIndicator = computed(() => {
    if (!isOnline.value) {
      return {
        color: 'gray',
        icon: 'cloud-offline',
        text: 'Offline',
      }
    }

    if (isSyncing.value) {
      return {
        color: 'blue',
        icon: 'sync',
        text: 'Syncing...',
      }
    }

    if (error.value) {
      return {
        color: 'red',
        icon: 'alert-circle',
        text: 'Sync Error',
      }
    }

    if (pendingCount.value > 0) {
      return {
        color: 'orange',
        icon: 'cloud-upload',
        text: `${pendingCount.value} pending`,
      }
    }

    return {
      color: 'green',
      icon: 'check-circle',
      text: 'Synced',
    }
  })

  // Lifecycle hooks
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Raw state
    syncState,

    // Computed properties
    isOnline,
    isSyncing,
    pendingCount,
    lastSync,
    error,
    needsSync,
    lastSyncFormatted,
    syncIndicator,

    // Methods
    forceSync,
  }
}

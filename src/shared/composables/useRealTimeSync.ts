import { computed, onUnmounted, ref } from 'vue'
import { realTimeListSyncService } from '@shared/services/reactive/real-time-sync.service'
import type { 
  ListEventData, 
  ListSyncState, 
  MergeStrategy 
} from '@shared/services/reactive/real-time-sync.service'

/**
 * Composable for using real-time list synchronization in Vue components
 * Provides reactive access to sync state and collaboration features
 */
export function useRealTimeSync(listId?: string) {
  const syncState = ref<ListSyncState>({
    lastSyncTime: Date.now(),
    connectedUsers: [],
    pendingSyncs: [],
    conflictingOperations: [],
    syncErrors: []
  })

  const listSyncState = ref<{
    version: number
    hasPendingChanges: boolean
    hasConflicts: boolean
    lastSyncTime: number
  }>({
    version: 0,
    hasPendingChanges: false,
    hasConflicts: false,
    lastSyncTime: Date.now()
  })

  const listEvents = ref<ListEventData[]>([])
  const recentEvents = ref<ListEventData[]>([])

  // Subscribe to global sync state
  const syncStateSubscription = realTimeListSyncService.syncState$.subscribe(state => {
    syncState.value = state
  })

  // Subscribe to list-specific sync state if listId provided
  let listSyncSubscription: any = null
  if (listId) {
    listSyncSubscription = realTimeListSyncService.getListSyncState(listId).subscribe(state => {
      listSyncState.value = state
    })

    // Subscribe to events for this specific list
    const listEventsSubscription = realTimeListSyncService.subscribeToListEvents(listId).subscribe(event => {
      listEvents.value = [event, ...listEvents.value].slice(0, 50) // Keep last 50 events
      
      // Track recent events (last 10 seconds)
      const now = Date.now()
      recentEvents.value = [event, ...recentEvents.value.filter(e => 
        now - new Date(e.timestamp).getTime() < 10000
      )].slice(0, 10)
    })

    // Cleanup list events subscription
    onUnmounted(() => {
      listEventsSubscription.unsubscribe()
    })
  }

  // Cleanup subscriptions
  onUnmounted(() => {
    syncStateSubscription.unsubscribe()
    if (listSyncSubscription) {
      listSyncSubscription.unsubscribe()
    }
  })

  // Computed properties
  const isConnected = computed(() => syncState.value.connectedUsers.length > 0)
  
  const hasPendingSyncs = computed(() => {
    if (listId) {
      return syncState.value.pendingSyncs.includes(listId)
    }
    return syncState.value.pendingSyncs.length > 0
  })
  
  const hasConflicts = computed(() => {
    if (listId) {
      return listSyncState.value.hasConflicts
    }
    return syncState.value.conflictingOperations.length > 0
  })
  
  const syncErrors = computed(() => {
    if (listId) {
      return syncState.value.syncErrors.filter(error => error.listId === listId)
    }
    return syncState.value.syncErrors
  })

  const connectedUsers = computed(() => syncState.value.connectedUsers)
  
  const lastSyncTime = computed(() => {
    if (listId) {
      return listSyncState.value.lastSyncTime
    }
    return syncState.value.lastSyncTime
  })

  const syncStatusMessage = computed(() => {
    if (hasConflicts.value) {
      return 'Conflicts need resolution'
    }
    if (hasPendingSyncs.value) {
      return 'Syncing changes...'
    }
    if (syncErrors.value.length > 0) {
      return `${syncErrors.value.length} sync error${syncErrors.value.length > 1 ? 's' : ''}`
    }
    if (isConnected.value) {
      return 'Real-time sync active'
    }
    return 'Offline - changes queued'
  })

  const collaborationStatus = computed(() => {
    const userCount = connectedUsers.value.length
    if (userCount === 0) {
      return 'Working alone'
    } else if (userCount === 1) {
      return '1 other user online'
    } else {
      return `${userCount} users online`
    }
  })

  // Event filtering helpers
  const getEventsOfType = (eventType: ListEventData['type']) =>
    computed(() => listEvents.value.filter(event => event.type === eventType))

  const getEventsByUser = (userId: string) =>
    computed(() => listEvents.value.filter(event => event.userId === userId))

  const getRecentActivity = () =>
    computed(() => recentEvents.value.slice(0, 5)) // Last 5 recent events

  // Actions
  const forceSyncList = async () => {
    if (!listId) {
      throw new Error('Cannot force sync: no listId provided')
    }
    
    try {
      await realTimeListSyncService.forceSyncList(listId)
    } catch (error) {
      console.error('Failed to force sync list:', error)
      throw error
    }
  }

  const resolveConflict = async (eventId: string, resolution: MergeStrategy) => {
    try {
      await realTimeListSyncService.resolveConflict(eventId, resolution)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      throw error
    }
  }

  // Conflict resolution helpers
  const getAvailableResolutionStrategies = (eventId: string): MergeStrategy[] => {
    return [
      {
        strategy: 'server_wins',
        reason: 'Accept server changes (recommended for most cases)'
      },
      {
        strategy: 'client_wins',
        reason: 'Keep your local changes'
      },
      {
        strategy: 'merge_fields',
        reason: 'Merge non-conflicting changes (if possible)'
      }
    ]
  }

  const createCustomResolution = (strategy: MergeStrategy['strategy'], reason: string, mergedData?: any): MergeStrategy => {
    return {
      strategy,
      reason,
      mergedData
    }
  }

  // Event analysis
  const getEventStats = () =>
    computed(() => {
      const events = listEvents.value
      const now = Date.now()
      const oneHourAgo = now - 3600000

      return {
        total: events.length,
        lastHour: events.filter(e => new Date(e.timestamp).getTime() > oneHourAgo).length,
        byType: {
          created: events.filter(e => e.type === 'LIST_CREATED').length,
          updated: events.filter(e => e.type === 'LIST_UPDATED').length,
          deleted: events.filter(e => e.type === 'LIST_DELETED').length
        },
        uniqueUsers: [...new Set(events.map(e => e.userId))].length
      }
    })

  // Real-time activity indicators
  const hasRecentActivity = computed(() => recentEvents.value.length > 0)
  
  const getActiveUsers = () =>
    computed(() => {
      const now = Date.now()
      const recentUserActivity = recentEvents.value.filter(event =>
        now - new Date(event.timestamp).getTime() < 30000 // Last 30 seconds
      )
      return [...new Set(recentUserActivity.map(event => event.userId))]
    })

  return {
    // State
    syncState: syncState.value,
    listSyncState: listSyncState.value,
    listEvents: listEvents.value,
    recentEvents: recentEvents.value,

    // Computed
    isConnected,
    hasPendingSyncs,
    hasConflicts,
    syncErrors,
    connectedUsers,
    lastSyncTime,
    syncStatusMessage,
    collaborationStatus,
    hasRecentActivity,

    // Actions
    forceSyncList,
    resolveConflict,

    // Event filtering
    getEventsOfType,
    getEventsByUser,
    getRecentActivity,
    getActiveUsers,

    // Conflict resolution
    getAvailableResolutionStrategies,
    createCustomResolution,

    // Analytics
    getEventStats
  }
}
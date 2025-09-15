import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRealTimeSync } from '@shared/composables/useRealTimeSync'
import { reactiveListsStore } from '@entities/list/model/lists-reactive.store'
import type { ListEventData, MergeStrategy } from '@shared/services/reactive/real-time-sync.service'
import type { List, ListId } from '@entities/list'

/**
 * Example demonstrating real-time collaboration features
 * Shows how multiple users can collaborate on lists with live updates and conflict resolution
 */
export function useRealTimeCollaborationExample(listId?: ListId) {
  // Use the real-time sync composable
  const {
    syncState,
    listSyncState,
    isConnected,
    hasPendingSyncs,
    hasConflicts,
    connectedUsers,
    syncStatusMessage,
    collaborationStatus,
    hasRecentActivity,
    forceSyncList,
    resolveConflict,
    getEventsOfType,
    getEventsByUser,
    getRecentActivity,
    getActiveUsers,
    getAvailableResolutionStrategies,
    getEventStats
  } = useRealTimeSync(listId)

  // Example state
  const selectedList = ref<List | null>(null)
  const conflictResolutionDialog = ref(false)
  const pendingConflict = ref<{ eventId: string; event: ListEventData } | null>(null)

  // Activity indicators
  const recentActivity = getRecentActivity()
  const activeUsers = getActiveUsers()
  const eventStats = getEventStats()

  // Event type filters
  const createdEvents = getEventsOfType('LIST_CREATED')
  const updatedEvents = getEventsOfType('LIST_UPDATED')
  const deletedEvents = getEventsOfType('LIST_DELETED')

  // Real-time status indicators
  const realTimeStatus = computed(() => {
    if (!isConnected.value) {
      return {
        status: 'offline',
        message: 'Offline - changes will sync when connected',
        color: 'medium',
        icon: 'cloud-offline'
      }
    }

    if (hasConflicts.value) {
      return {
        status: 'conflicts',
        message: 'Conflicts need resolution',
        color: 'warning',
        icon: 'warning'
      }
    }

    if (hasPendingSyncs.value) {
      return {
        status: 'syncing',
        message: 'Syncing changes...',
        color: 'primary',
        icon: 'sync'
      }
    }

    if (hasRecentActivity.value) {
      return {
        status: 'active',
        message: 'Live collaboration active',
        color: 'success',
        icon: 'people'
      }
    }

    return {
      status: 'connected',
      message: 'Connected - real-time sync enabled',
      color: 'success',
      icon: 'checkmark-circle'
    }
  })

  // Collaboration insights
  const collaborationInsights = computed(() => {
    const stats = eventStats.value
    const users = activeUsers.value
    
    return {
      totalEvents: stats.total,
      recentActivity: stats.lastHour,
      activeCollaborators: users.length,
      mostActiveUser: getMostActiveUser(),
      eventBreakdown: stats.byType,
      collaborationLevel: getCollaborationLevel(stats, users.length)
    }
  })

  const getMostActiveUser = (): string | null => {
    if (!listId) return null
    
    // This would analyze events to find the most active user
    const recentEvents = recentActivity.value
    const userActivity: Record<string, number> = {}
    
    recentEvents.forEach(event => {
      userActivity[event.userId] = (userActivity[event.userId] || 0) + 1
    })
    
    const entries = Object.entries(userActivity)
    if (entries.length === 0) return null
    
    return entries.reduce((a, b) => userActivity[a[0]] > userActivity[b[0]] ? a : b)[0]
  }

  const getCollaborationLevel = (stats: any, userCount: number): 'low' | 'medium' | 'high' => {
    if (userCount <= 1) return 'low'
    if (stats.lastHour < 5) return 'low'
    if (stats.lastHour < 15) return 'medium'
    return 'high'
  }

  // Example: Real-time list creation with live updates
  const createListWithLiveUpdates = async (listData: Partial<List>) => {
    try {
      console.log('🚀 Creating list with real-time updates...')
      
      // Create the list using optimistic updates
      const tempList = await reactiveListsStore.createListWithOptimisticUpdate(listData)
      selectedList.value = tempList
      
      console.log('✨ List appears instantly in UI')
      console.log('📡 WebSocket events will show when other users see the list')
      
      return tempList
    } catch (error) {
      console.error('❌ Failed to create list:', error)
      throw error
    }
  }

  // Example: Update list with conflict detection
  const updateListWithConflictDetection = async (updates: Partial<List>) => {
    if (!selectedList.value) return

    try {
      console.log('🔄 Updating list with conflict detection...')
      
      // Update using optimistic updates + real-time sync
      await reactiveListsStore.updateListWithOptimisticUpdate(selectedList.value.id, updates)
      
      console.log('✨ Update appears instantly')
      console.log('🔍 Conflict detection active for concurrent changes')
      
    } catch (error) {
      console.error('❌ Failed to update list:', error)
      throw error
    }
  }

  // Example: Force sync when needed
  const handleForceSyncExample = async () => {
    if (!listId) {
      console.warn('No list selected for force sync')
      return
    }

    try {
      console.log('🔄 Force syncing list...')
      await forceSyncList()
      console.log('✅ Force sync completed')
    } catch (error) {
      console.error('❌ Force sync failed:', error)
    }
  }

  // Example: Handle conflict resolution
  const handleConflictExample = async (eventId: string, strategy: 'server' | 'client' | 'merge') => {
    const strategies: Record<string, MergeStrategy> = {
      server: {
        strategy: 'server_wins',
        reason: 'Accept server changes (most recent)'
      },
      client: {
        strategy: 'client_wins',
        reason: 'Keep local changes'
      },
      merge: {
        strategy: 'merge_fields',
        reason: 'Merge non-conflicting fields'
      }
    }

    try {
      console.log(`🔄 Resolving conflict with ${strategy} strategy...`)
      await resolveConflict(eventId, strategies[strategy])
      console.log('✅ Conflict resolved')
      
      conflictResolutionDialog.value = false
      pendingConflict.value = null
    } catch (error) {
      console.error('❌ Failed to resolve conflict:', error)
    }
  }

  // Example: Monitor user activity
  const getUserActivitySummary = (userId: string) => {
    if (!listId) return null

    const userEvents = getEventsByUser(userId).value
    const recentUserEvents = userEvents.filter(event => 
      Date.now() - new Date(event.timestamp).getTime() < 3600000 // Last hour
    )

    return {
      totalEvents: userEvents.length,
      recentEvents: recentUserEvents.length,
      lastActivity: userEvents.length > 0 ? userEvents[0].timestamp : null,
      eventTypes: {
        created: userEvents.filter(e => e.type === 'LIST_CREATED').length,
        updated: userEvents.filter(e => e.type === 'LIST_UPDATED').length,
        deleted: userEvents.filter(e => e.type === 'LIST_DELETED').length
      }
    }
  }

  // Example: Live activity notifications
  const activityNotifications = ref<Array<{
    id: string
    message: string
    timestamp: number
    type: 'info' | 'warning' | 'success'
  }>>([])

  const addActivityNotification = (event: ListEventData) => {
    const messages = {
      'LIST_CREATED': `📝 ${event.userId} created a new list`,
      'LIST_UPDATED': `✏️ ${event.userId} updated the list`,
      'LIST_DELETED': `🗑️ ${event.userId} deleted the list`
    }

    const notification = {
      id: `notif_${Date.now()}`,
      message: messages[event.type] || `${event.userId} performed an action`,
      timestamp: Date.now(),
      type: 'info' as const
    }

    activityNotifications.value = [notification, ...activityNotifications.value].slice(0, 5)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      activityNotifications.value = activityNotifications.value.filter(n => n.id !== notification.id)
    }, 5000)
  }

  // Example: Simulation methods for testing
  const simulateMultiUserScenario = () => {
    console.log('🎭 Simulating multi-user collaboration scenario...')
    console.log('This would typically involve multiple browser tabs or users')
    console.log('Real implementation would show:')
    console.log('- Live cursor positions')
    console.log('- User presence indicators') 
    console.log('- Real-time conflict resolution')
    console.log('- Activity notifications')
  }

  const simulateConflict = () => {
    console.log('⚡ Simulating conflict scenario...')
    console.log('In a real app, conflicts occur when:')
    console.log('1. Two users edit the same field simultaneously')
    console.log('2. User A deletes while User B updates')
    console.log('3. Network issues cause out-of-order updates')
    
    // This would trigger the conflict resolution dialog
    conflictResolutionDialog.value = true
    pendingConflict.value = {
      eventId: 'example_conflict',
      event: {
        type: 'LIST_UPDATED',
        listId: listId || 'example',
        data: { title: 'Conflicting Title' },
        version: 5,
        timestamp: new Date().toISOString(),
        userId: 'other_user',
        eventId: 'example_conflict'
      }
    }
  }

  // Initialize example
  onMounted(() => {
    console.log('🚀 Real-time Collaboration Example initialized')
    console.log(`📊 Status: ${realTimeStatus.value.message}`)
    console.log(`👥 Collaboration: ${collaborationStatus}`)
    
    // Subscribe to activity for notifications (in real app)
    if (listId) {
      // This would be handled by the composable automatically
      console.log(`📡 Listening for real-time events on list: ${listId}`)
    }
  })

  return {
    // State
    selectedList,
    conflictResolutionDialog,
    pendingConflict,
    activityNotifications,
    
    // Real-time status
    realTimeStatus,
    collaborationInsights,
    syncStatusMessage,
    collaborationStatus,
    
    // Activity data
    recentActivity,
    activeUsers,
    eventStats,
    createdEvents,
    updatedEvents,
    deletedEvents,
    
    // Connection state
    isConnected,
    hasPendingSyncs,
    hasConflicts,
    connectedUsers,
    hasRecentActivity,
    
    // Actions
    createListWithLiveUpdates,
    updateListWithConflictDetection,
    handleForceSyncExample,
    handleConflictExample,
    
    // Utilities
    getUserActivitySummary,
    addActivityNotification,
    
    // Testing/Demo
    simulateMultiUserScenario,
    simulateConflict
  }
}
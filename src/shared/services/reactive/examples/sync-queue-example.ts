import { ref, computed, onMounted } from 'vue'
import { useSyncQueue } from '@shared/composables/useSyncQueue'
import type { List, ListItem } from '@entities/list'

/**
 * Example showing how to use the sync queue service for offline-first operations
 */
export function useSyncQueueExample() {
  const {
    // State
    isProcessing,
    connectionStatus,
    queueSize,
    isOffline,
    hasFailedOperations,
    operationsByList,
    
    // Operations
    createList,
    updateList,
    createItem,
    deleteItem,
    checkItem,
    
    // Management
    retryFailedOperations,
    clearQueue
  } = useSyncQueue()

  // Example list data
  const exampleList = ref<List | null>(null)
  const exampleItems = ref<ListItem[]>([])

  // Status indicators
  const statusMessage = computed(() => {
    if (isOffline.value) {
      return `Offline - ${queueSize.value} operations queued`
    }
    if (isProcessing.value) {
      return 'Syncing operations...'
    }
    if (hasFailedOperations.value) {
      return 'Some operations failed - tap to retry'
    }
    if (queueSize.value > 0) {
      return `${queueSize.value} operations pending`
    }
    return 'All synced'
  })

  // Example operations
  const createExampleList = async () => {
    try {
      console.log('Creating example list...')
      const result = await createList({
        title: 'Offline-First Shopping List',
        type: 'SHOPPING'
      })
      
      console.log('List creation queued:', result)
      
      // In real app, the list would be available via optimistic update
      exampleList.value = {
        id: 'temp-id', // Will be replaced by server
        title: 'Offline-First Shopping List',
        type: 'SHOPPING',
        ownerId: 'current-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        owner: {
          id: 'current-user-id',
          email: 'user@example.com',
          profile: {
            id: 'profile-id',
            userId: 'current-user-id',
            fullName: 'Example User',
            notificationsEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  const addExampleItem = async () => {
    if (!exampleList.value) {
      console.warn('No list available - create a list first')
      return
    }

    try {
      const itemData = {
        content: `Item ${exampleItems.value.length + 1}`,
        checked: false
      }
      
      console.log('Adding item...')
      const result = await createItem(exampleList.value.id, itemData)
      
      console.log('Item creation queued:', result)
      
      // Optimistic update for demo
      const newItem: ListItem = {
        id: `temp-item-${Date.now()}`,
        listId: exampleList.value.id,
        content: itemData.content,
        checked: itemData.checked,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      exampleItems.value.push(newItem)
      
    } catch (error) {
      console.error('Failed to create item:', error)
    }
  }

  const toggleItem = async (item: ListItem) => {
    if (!exampleList.value) return

    try {
      console.log('Toggling item:', item.id)
      const result = await checkItem(exampleList.value.id, item.id, !item.checked)
      
      console.log('Item toggle queued:', result)
      
      // Optimistic update for demo
      const itemIndex = exampleItems.value.findIndex(i => i.id === item.id)
      if (itemIndex !== -1) {
        exampleItems.value[itemIndex] = {
          ...exampleItems.value[itemIndex],
          checked: !item.checked
        }
      }
      
    } catch (error) {
      console.error('Failed to toggle item:', error)
    }
  }

  const removeItem = async (item: ListItem) => {
    if (!exampleList.value) return

    try {
      console.log('Removing item:', item.id)
      const result = await deleteItem(exampleList.value.id, item.id)
      
      console.log('Item removal queued:', result)
      
      // Optimistic update for demo
      exampleItems.value = exampleItems.value.filter(i => i.id !== item.id)
      
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  const updateListName = async (newName: string) => {
    if (!exampleList.value) return

    try {
      console.log('Updating list name...')
      const result = await updateList(exampleList.value.id, { title: newName })
      
      console.log('List update queued:', result)
      
      // Optimistic update for demo
      exampleList.value = {
        ...exampleList.value,
        title: newName
      }
      
    } catch (error) {
      console.error('Failed to update list:', error)
    }
  }

  const simulateOffline = () => {
    // For testing - dispatch offline event
    window.dispatchEvent(new Event('offline'))
    console.log('Simulated offline mode')
  }

  const simulateOnline = () => {
    // For testing - dispatch online event
    window.dispatchEvent(new Event('online'))
    console.log('Simulated online mode - operations will retry')
  }

  // Initialize example
  onMounted(() => {
    console.log('Sync Queue Example initialized')
    console.log('Connection status:', connectionStatus.value)
    console.log('Queue size:', queueSize.value)
  })

  return {
    // State
    exampleList,
    exampleItems,
    statusMessage,
    isProcessing,
    connectionStatus,
    queueSize,
    isOffline,
    hasFailedOperations,
    operationsByList,
    
    // Actions
    createExampleList,
    addExampleItem,
    toggleItem,
    removeItem,
    updateListName,
    retryFailedOperations,
    clearQueue,
    
    // Testing utilities
    simulateOffline,
    simulateOnline
  }
}
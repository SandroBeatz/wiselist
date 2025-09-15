import { ref, computed, onMounted } from 'vue'
import { useOptimisticUpdates } from '@shared/composables/useOptimisticUpdates'
import { reactiveListsStore } from '@entities/list/model/lists-reactive.store'
import type { List, ListItem, ListId } from '@entities/list'

/**
 * Example demonstrating optimistic updates with automatic rollback
 * Shows how to implement instant UI updates with background sync and error recovery
 */
export function useOptimisticUpdatesExample() {
  const {
    // State
    operations,
    pendingCount,
    failedCount,
    statusMessage,
    hasPendingOperations,
    hasFailedOperations,

    // Operations
    createListOptimistic,
    updateListOptimistic,
    deleteListOptimistic,
    createItemOptimistic,
    updateItemOptimistic,
    toggleItemOptimistic,
    deleteItemOptimistic,

    // Management
    retryOperation,
    retryAllFailedOperations,
    cancelOperation,

    // Helpers
    isEntityLoading,
    getPendingOperationsForList
  } = useOptimisticUpdates()

  // Example data
  const exampleList = ref<List | null>(null)
  const exampleItems = ref<ListItem[]>([])

  // Status indicators
  const syncStatus = computed(() => {
    if (hasPendingOperations.value) {
      return {
        type: 'syncing',
        message: statusMessage.value,
        color: 'primary'
      }
    }
    if (hasFailedOperations.value) {
      return {
        type: 'failed',
        message: statusMessage.value,
        color: 'danger'
      }
    }
    return {
      type: 'synced',
      message: 'All changes saved',
      color: 'success'
    }
  })

  // Example: Create list with optimistic updates
  const createExampleList = async () => {
    try {
      console.log('Creating list with optimistic update...')
      
      const tempList = await createListOptimistic(
        {
          title: 'Optimistic Shopping List',
          type: 'SHOPPING'
        },
        (tempList: List) => {
          // This runs immediately - UI updates instantly
          console.log('✨ Optimistic update: List appears in UI immediately', tempList.id)
          exampleList.value = tempList
          exampleItems.value = [] // Reset items for new list
        }
      )

      console.log('✅ List creation initiated with optimistic update')
      return tempList
    } catch (error) {
      console.error('❌ Failed to create list:', error)
      throw error
    }
  }

  // Example: Update list title with rollback
  const updateListTitle = async (newTitle: string) => {
    if (!exampleList.value) return

    const listId = exampleList.value.id
    const originalTitle = exampleList.value.title

    try {
      console.log('Updating list title with optimistic update...')
      
      await updateListOptimistic(
        listId,
        { title: newTitle },
        (updates) => {
          // This runs immediately - UI shows new title instantly
          console.log('✨ Optimistic update: Title changed instantly', updates.title)
          if (exampleList.value) {
            exampleList.value = { ...exampleList.value, ...updates }
          }
        },
        (originalData) => {
          // This runs only if sync fails - rollback to original
          console.log('🔄 Rollback: Reverting title change', originalData.title)
          if (exampleList.value && originalData) {
            exampleList.value = { ...exampleList.value, title: originalData.title }
          }
        }
      )

      console.log('✅ List title update initiated')
    } catch (error) {
      console.error('❌ Failed to update list title:', error)
      throw error
    }
  }

  // Example: Add item with optimistic updates
  const addExampleItem = async () => {
    if (!exampleList.value) return

    try {
      console.log('Adding item with optimistic update...')
      
      const itemData = {
        content: `Item ${exampleItems.value.length + 1}`,
        checked: false
      }

      const tempItem = await createItemOptimistic(
        exampleList.value.id,
        itemData,
        (tempItem: ListItem) => {
          // This runs immediately - item appears in UI instantly
          console.log('✨ Optimistic update: Item appears in UI immediately', tempItem.id)
          exampleItems.value = [...exampleItems.value, tempItem]
        },
        () => {
          // This runs only if sync fails - remove the optimistic item
          console.log('🔄 Rollback: Removing optimistic item')
          exampleItems.value = exampleItems.value.filter(item => item.id !== tempItem.id)
        }
      )

      console.log('✅ Item creation initiated with optimistic update')
      return tempItem
    } catch (error) {
      console.error('❌ Failed to add item:', error)
      throw error
    }
  }

  // Example: Toggle item with rollback
  const toggleItemChecked = async (item: ListItem) => {
    if (!exampleList.value) return

    const originalChecked = item.checked
    const newChecked = !originalChecked

    try {
      console.log('Toggling item with optimistic update...')
      
      await toggleItemOptimistic(
        exampleList.value.id,
        item.id,
        newChecked,
        (updates) => {
          // This runs immediately - checkbox state changes instantly
          console.log('✨ Optimistic update: Item toggled instantly', updates.checked ?? newChecked)
          const itemIndex = exampleItems.value.findIndex(i => i.id === item.id)
          if (itemIndex !== -1) {
            exampleItems.value[itemIndex] = { 
              ...exampleItems.value[itemIndex], 
              checked: updates.checked ?? newChecked
            }
          }
        },
        (originalData) => {
          // This runs only if sync fails - revert checkbox state
          console.log('🔄 Rollback: Reverting item toggle', originalData.checked)
          const itemIndex = exampleItems.value.findIndex(i => i.id === item.id)
          if (itemIndex !== -1 && originalData) {
            exampleItems.value[itemIndex] = { 
              ...exampleItems.value[itemIndex], 
              checked: originalData.checked 
            }
          }
        }
      )

      console.log('✅ Item toggle initiated')
    } catch (error) {
      console.error('❌ Failed to toggle item:', error)
      throw error
    }
  }

  // Example: Delete item with rollback
  const removeItem = async (item: ListItem) => {
    if (!exampleList.value) return

    // Store original items list for rollback
    const originalItems = [...exampleItems.value]

    try {
      console.log('Deleting item with optimistic update...')
      
      await deleteItemOptimistic(
        exampleList.value.id,
        item.id,
        () => {
          // This runs immediately - item disappears from UI instantly
          console.log('✨ Optimistic update: Item removed from UI immediately', item.id)
          exampleItems.value = exampleItems.value.filter(i => i.id !== item.id)
        },
        (originalData) => {
          // This runs only if sync fails - restore the item
          console.log('🔄 Rollback: Restoring deleted item', originalData?.id)
          if (originalData) {
            exampleItems.value = originalItems
          }
        }
      )

      console.log('✅ Item deletion initiated')
    } catch (error) {
      console.error('❌ Failed to delete item:', error)
      throw error
    }
  }

  // Example: Delete list with rollback
  const deleteExampleList = async () => {
    if (!exampleList.value) return

    // Store original data for rollback
    const originalList = { ...exampleList.value }
    const originalItems = [...exampleItems.value]

    try {
      console.log('Deleting list with optimistic update...')
      
      await deleteListOptimistic(
        exampleList.value.id,
        () => {
          // This runs immediately - list disappears from UI instantly
          console.log('✨ Optimistic update: List removed from UI immediately')
          exampleList.value = null
          exampleItems.value = []
        },
        (originalData) => {
          // This runs only if sync fails - restore the list
          console.log('🔄 Rollback: Restoring deleted list', originalData?.id)
          if (originalData) {
            exampleList.value = originalData
            exampleItems.value = originalItems
          }
        }
      )

      console.log('✅ List deletion initiated')
    } catch (error) {
      console.error('❌ Failed to delete list:', error)
      throw error
    }
  }

  // Example: Simulate network failure for testing rollbacks
  const simulateNetworkFailure = () => {
    // Temporarily go offline to test rollback behavior
    window.dispatchEvent(new Event('offline'))
    console.log('📡 Simulated offline mode - next operations will fail and rollback')
    
    // Restore connection after 5 seconds
    setTimeout(() => {
      window.dispatchEvent(new Event('online'))
      console.log('📡 Connection restored - failed operations will retry')
    }, 5000)
  }

  // Example: Retry specific failed operation
  const handleRetryOperation = async (operationId: string) => {
    try {
      console.log('Retrying operation:', operationId)
      await retryOperation(operationId)
      console.log('✅ Operation retry initiated')
    } catch (error) {
      console.error('❌ Failed to retry operation:', error)
    }
  }

  // Example: Retry all failed operations
  const handleRetryAllFailed = async () => {
    try {
      console.log('Retrying all failed operations...')
      await retryAllFailedOperations()
      console.log('✅ All failed operations retry initiated')
    } catch (error) {
      console.error('❌ Failed to retry operations:', error)
    }
  }

  // Example: Cancel pending operation
  const handleCancelOperation = async (operationId: string) => {
    try {
      console.log('Cancelling operation:', operationId)
      await cancelOperation(operationId, (originalData) => {
        // Perform manual rollback if needed
        console.log('🔄 Manual rollback after cancellation', originalData)
      })
      console.log('✅ Operation cancelled')
    } catch (error) {
      console.error('❌ Failed to cancel operation:', error)
    }
  }

  // Initialize example
  onMounted(() => {
    console.log('🚀 Optimistic Updates Example initialized')
    console.log('Try the following:')
    console.log('1. Create a list - see it appear instantly')
    console.log('2. Add items - see them appear instantly') 
    console.log('3. Toggle items - see changes instantly')
    console.log('4. Go offline and try operations - see rollback behavior')
    console.log('5. Come back online - see retry behavior')
  })

  return {
    // Example data
    exampleList,
    exampleItems,
    
    // Status
    syncStatus,
    operations,
    pendingCount,
    failedCount,
    statusMessage,
    hasPendingOperations,
    hasFailedOperations,

    // Example operations
    createExampleList,
    updateListTitle,
    addExampleItem,
    toggleItemChecked,
    removeItem,
    deleteExampleList,

    // Testing utilities
    simulateNetworkFailure,
    handleRetryOperation,
    handleRetryAllFailed,
    handleCancelOperation,

    // Helpers
    isEntityLoading,
    getPendingOperationsForList
  }
}
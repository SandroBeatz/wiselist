import { computed, onUnmounted, ref, watch } from 'vue'
import { syncQueueService } from '@shared/services/reactive/sync-queue.service'
import { SyncOperations } from '@shared/services/reactive/sync-operations'
import type { SyncOperation } from '@shared/services/reactive/sync-queue.service'
import type { List, ListItem, ListId } from '@entities/list'

/**
 * Composable for using the sync queue service in Vue components
 */
export function useSyncQueue() {
  const operations = ref<SyncOperation[]>([])
  const isProcessing = ref(false)
  const connectionStatus = ref<'online' | 'offline'>('online')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Subscribe to sync queue observables
  const operationsSubscription = syncQueueService.operations$.subscribe(ops => {
    operations.value = ops
  })

  const processingSubscription = syncQueueService.isProcessing$.subscribe(processing => {
    isProcessing.value = processing
  })

  const connectionSubscription = syncQueueService.connectionStatus$.subscribe(status => {
    connectionStatus.value = status
  })

  const loadingSubscription = syncQueueService.isLoading$.subscribe(loading => {
    isLoading.value = loading
  })

  const errorSubscription = syncQueueService.error$.subscribe(err => {
    error.value = err
  })

  // Cleanup subscriptions
  onUnmounted(() => {
    operationsSubscription.unsubscribe()
    processingSubscription.unsubscribe()
    connectionSubscription.unsubscribe()
    loadingSubscription.unsubscribe()
    errorSubscription.unsubscribe()
  })

  // Computed properties
  const queueSize = computed(() => operations.value.length)
  const isOffline = computed(() => connectionStatus.value === 'offline')
  const hasFailedOperations = computed(() => 
    operations.value.some(op => (op.retries || 0) > 0)
  )
  const hasPendingOperations = computed(() => operations.value.length > 0)

  // Group operations by list for better UX
  const operationsByList = computed(() => {
    const groups: Record<string, SyncOperation[]> = {}
    operations.value.forEach(op => {
      if (!groups[op.listId]) {
        groups[op.listId] = []
      }
      groups[op.listId].push(op)
    })
    return groups
  })

  // List operations
  const createList = async (listData: Partial<List>) => {
    try {
      return await SyncOperations.createList(listData)
    } catch (error) {
      console.error('Failed to create list:', error)
      throw error
    }
  }

  const updateList = async (listId: ListId, listData: Partial<List>) => {
    try {
      return await SyncOperations.updateList(listId, listData)
    } catch (error) {
      console.error('Failed to update list:', error)
      throw error
    }
  }

  const deleteList = async (listId: ListId) => {
    try {
      return await SyncOperations.deleteList(listId)
    } catch (error) {
      console.error('Failed to delete list:', error)
      throw error
    }
  }

  // Item operations
  const createItem = async (listId: ListId, itemData: Partial<ListItem>) => {
    try {
      return await SyncOperations.createItem(listId, itemData)
    } catch (error) {
      console.error('Failed to create item:', error)
      throw error
    }
  }

  const updateItem = async (listId: ListId, itemId: string, itemData: Partial<ListItem>) => {
    try {
      return await SyncOperations.updateItem(listId, itemId, itemData)
    } catch (error) {
      console.error('Failed to update item:', error)
      throw error
    }
  }

  const deleteItem = async (listId: ListId, itemId: string) => {
    try {
      return await SyncOperations.deleteItem(listId, itemId)
    } catch (error) {
      console.error('Failed to delete item:', error)
      throw error
    }
  }

  const checkItem = async (listId: ListId, itemId: string, checked: boolean) => {
    try {
      return await SyncOperations.checkItem(listId, itemId, checked)
    } catch (error) {
      console.error('Failed to check item:', error)
      throw error
    }
  }

  const reorderItem = async (listId: ListId, itemId: string, newOrder: number) => {
    try {
      return await SyncOperations.reorderItem(listId, itemId, newOrder)
    } catch (error) {
      console.error('Failed to reorder item:', error)
      throw error
    }
  }

  const reorderItems = async (listId: ListId, itemOrders: Array<{ id: string; order: number }>) => {
    try {
      return await SyncOperations.reorderItems(listId, itemOrders)
    } catch (error) {
      console.error('Failed to reorder items:', error)
      throw error
    }
  }

  // Queue management
  const retryFailedOperations = () => {
    SyncOperations.retryFailedOperations()
  }

  const clearQueue = () => {
    SyncOperations.clearQueue()
  }

  // Watch connection status and show notifications
  watch(connectionStatus, (newStatus, oldStatus) => {
    if (oldStatus === 'offline' && newStatus === 'online') {
      console.log('Connection restored, retrying pending operations')
    } else if (oldStatus === 'online' && newStatus === 'offline') {
      console.warn('Connection lost, operations will be queued')
    }
  })

  return {
    // State
    operations: operations.value,
    isProcessing,
    connectionStatus,
    isLoading,
    error,
    
    // Computed
    queueSize,
    isOffline,
    hasFailedOperations,
    hasPendingOperations,
    operationsByList,
    
    // List operations
    createList,
    updateList,
    deleteList,
    
    // Item operations
    createItem,
    updateItem,
    deleteItem,
    checkItem,
    reorderItem,
    reorderItems,
    
    // Queue management
    retryFailedOperations,
    clearQueue
  }
}
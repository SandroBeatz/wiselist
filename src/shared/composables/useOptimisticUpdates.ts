import { computed, onUnmounted, ref } from 'vue'
import { optimisticUpdatesService } from '@shared/services/reactive/optimistic-updates.service'
import type { OptimisticOperation, OptimisticUpdatesState } from '@shared/services/reactive/optimistic-updates.service'
import type { List, ListItem, ListId } from '@entities/list'

/**
 * Composable for using optimistic updates in Vue components
 * Provides reactive state and methods for optimistic operations with rollback
 */
export function useOptimisticUpdates() {
  const state = ref<OptimisticUpdatesState>({
    operations: [],
    pendingCount: 0,
    failedCount: 0
  })
  const loadingStates = ref<Record<string, boolean>>({})

  // Subscribe to optimistic updates state
  const stateSubscription = optimisticUpdatesService.state$.subscribe(newState => {
    state.value = newState
  })

  const loadingSubscription = optimisticUpdatesService.loadingStates$.subscribe(states => {
    loadingStates.value = states
  })

  // Cleanup subscriptions
  onUnmounted(() => {
    stateSubscription.unsubscribe()
    loadingSubscription.unsubscribe()
  })

  // Computed properties
  const operations = computed(() => state.value.operations)
  const pendingCount = computed(() => state.value.pendingCount)
  const failedCount = computed(() => state.value.failedCount)
  const hasPendingOperations = computed(() => pendingCount.value > 0)
  const hasFailedOperations = computed(() => failedCount.value > 0)

  // Helper to check if specific entity is loading
  const isEntityLoading = (entityId: string) => 
    computed(() => loadingStates.value[entityId] || false)

  // Get pending operations for a list
  const getPendingOperationsForList = (listId: string) =>
    computed(() => operations.value.filter(op => 
      op.listId === listId && op.status === 'pending'
    ))

  // Get failed operations
  const failedOperations = computed(() => 
    operations.value.filter(op => 
      op.status === 'failed' && op.retryCount < op.maxRetries
    )
  )

  // ========== LIST OPERATIONS ==========

  /**
   * Create list with optimistic update
   */
  const createListOptimistic = async (
    listData: Partial<List>,
    applyOptimisticUpdate: (tempList: List) => void
  ) => {
    try {
      return await optimisticUpdatesService.createListOptimistic(
        listData,
        applyOptimisticUpdate
      )
    } catch (error) {
      console.error('Failed to create list optimistically:', error)
      throw error
    }
  }

  /**
   * Update list with optimistic update and rollback
   */
  const updateListOptimistic = async (
    listId: string,
    updates: Partial<List>,
    applyOptimisticUpdate: (updates: Partial<List>) => void,
    rollbackUpdate: (originalData: any) => void
  ) => {
    try {
      await optimisticUpdatesService.updateListOptimistic(
        listId,
        updates,
        applyOptimisticUpdate,
        rollbackUpdate
      )
    } catch (error) {
      console.error('Failed to update list optimistically:', error)
      throw error
    }
  }

  /**
   * Delete list with optimistic update and rollback
   */
  const deleteListOptimistic = async (
    listId: string,
    applyOptimisticUpdate: () => void,
    rollbackUpdate: (originalData: any) => void
  ) => {
    try {
      await optimisticUpdatesService.deleteListOptimistic(
        listId,
        applyOptimisticUpdate,
        rollbackUpdate
      )
    } catch (error) {
      console.error('Failed to delete list optimistically:', error)
      throw error
    }
  }

  // ========== ITEM OPERATIONS ==========

  /**
   * Create item with optimistic update
   */
  const createItemOptimistic = async (
    listId: string,
    itemData: Partial<ListItem>,
    applyOptimisticUpdate: (tempItem: ListItem) => void,
    rollbackUpdate?: () => void
  ) => {
    try {
      return await optimisticUpdatesService.createItemOptimistic(
        listId,
        itemData,
        applyOptimisticUpdate,
        rollbackUpdate
      )
    } catch (error) {
      console.error('Failed to create item optimistically:', error)
      throw error
    }
  }

  /**
   * Update item with optimistic update and rollback
   */
  const updateItemOptimistic = async (
    listId: string,
    itemId: string,
    updates: Partial<ListItem>,
    applyOptimisticUpdate: (updates: Partial<ListItem>) => void,
    rollbackUpdate: (originalData: any) => void
  ) => {
    try {
      await optimisticUpdatesService.updateItemOptimistic(
        listId,
        itemId,
        updates,
        applyOptimisticUpdate,
        rollbackUpdate
      )
    } catch (error) {
      console.error('Failed to update item optimistically:', error)
      throw error
    }
  }

  /**
   * Toggle item checked state optimistically
   */
  const toggleItemOptimistic = async (
    listId: string,
    itemId: string,
    checked: boolean,
    applyOptimisticUpdate: (updates: Partial<ListItem>) => void,
    rollbackUpdate: (originalData: any) => void
  ) => {
    try {
      await optimisticUpdatesService.updateItemOptimistic(
        listId,
        itemId,
        { checked },
        applyOptimisticUpdate,
        rollbackUpdate
      )
    } catch (error) {
      console.error('Failed to toggle item optimistically:', error)
      throw error
    }
  }

  /**
   * Delete item with optimistic update and rollback
   */
  const deleteItemOptimistic = async (
    listId: string,
    itemId: string,
    applyOptimisticUpdate: () => void,
    rollbackUpdate: (originalData: any) => void
  ) => {
    try {
      await optimisticUpdatesService.deleteItemOptimistic(
        listId,
        itemId,
        applyOptimisticUpdate,
        rollbackUpdate
      )
    } catch (error) {
      console.error('Failed to delete item optimistically:', error)
      throw error
    }
  }

  // ========== MANAGEMENT METHODS ==========

  /**
   * Retry a specific failed operation
   */
  const retryOperation = async (operationId: string) => {
    try {
      await optimisticUpdatesService.retryOperation(operationId)
    } catch (error) {
      console.error('Failed to retry operation:', error)
      throw error
    }
  }

  /**
   * Cancel a pending operation and rollback changes
   */
  const cancelOperation = async (
    operationId: string,
    rollbackUpdate?: (originalData: any) => void
  ) => {
    try {
      await optimisticUpdatesService.cancelOperation(operationId, rollbackUpdate)
    } catch (error) {
      console.error('Failed to cancel operation:', error)
      throw error
    }
  }

  /**
   * Retry all failed operations
   */
  const retryAllFailedOperations = async () => {
    try {
      await optimisticUpdatesService.retryAllFailedOperations()
    } catch (error) {
      console.error('Failed to retry all operations:', error)
      throw error
    }
  }

  /**
   * Clear completed operations from memory
   */
  const clearCompletedOperations = () => {
    optimisticUpdatesService.clearCompletedOperations()
  }

  // ========== STATUS HELPERS ==========

  /**
   * Get operation by ID
   */
  const getOperation = (operationId: string) =>
    computed(() => operations.value.find(op => op.id === operationId))

  /**
   * Check if operation is pending
   */
  const isOperationPending = (operationId: string) =>
    computed(() => {
      const op = operations.value.find(op => op.id === operationId)
      return op?.status === 'pending'
    })

  /**
   * Check if operation failed
   */
  const isOperationFailed = (operationId: string) =>
    computed(() => {
      const op = operations.value.find(op => op.id === operationId)
      return op?.status === 'failed'
    })

  /**
   * Get operation status message
   */
  const getOperationStatusMessage = (operationId: string) =>
    computed(() => {
      const op = operations.value.find(op => op.id === operationId)
      if (!op) return ''

      switch (op.status) {
        case 'pending':
          return 'Syncing...'
        case 'confirmed':
          return 'Synced'
        case 'failed':
          return `Failed: ${op.errorMessage || 'Unknown error'}`
        case 'rolled_back':
          return 'Cancelled'
        default:
          return ''
      }
    })

  /**
   * Get summary status message for UI
   */
  const statusMessage = computed(() => {
    if (pendingCount.value > 0) {
      return `${pendingCount.value} operation${pendingCount.value > 1 ? 's' : ''} syncing...`
    }
    if (failedCount.value > 0) {
      return `${failedCount.value} operation${failedCount.value > 1 ? 's' : ''} failed - tap to retry`
    }
    return 'All changes synced'
  })

  return {
    // State
    operations,
    pendingCount,
    failedCount,
    loadingStates,
    hasPendingOperations,
    hasFailedOperations,
    failedOperations,
    statusMessage,

    // List operations
    createListOptimistic,
    updateListOptimistic,
    deleteListOptimistic,

    // Item operations
    createItemOptimistic,
    updateItemOptimistic,
    toggleItemOptimistic,
    deleteItemOptimistic,

    // Management
    retryOperation,
    cancelOperation,
    retryAllFailedOperations,
    clearCompletedOperations,

    // Helpers
    isEntityLoading,
    getPendingOperationsForList,
    getOperation,
    isOperationPending,
    isOperationFailed,
    getOperationStatusMessage
  }
}
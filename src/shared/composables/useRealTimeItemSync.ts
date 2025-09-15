import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { realTimeItemSyncService } from '@shared/services/reactive/real-time-item-sync.service'
import type { ListItem } from '@entities/list/model/types'

interface UseRealTimeItemSyncOptions {
  listId?: string
  autoStart?: boolean
  enableOptimisticUpdates?: boolean
}

interface UseRealTimeItemSyncReturn {
  isConnected: ComputedRef<boolean>
  activeUsers: ComputedRef<string[]>
  pendingOperations: ComputedRef<number>
  lastSyncTime: ComputedRef<Date | null>
  
  startSync: (listId: string) => Promise<void>
  stopSync: () => void
  refreshItems: () => Promise<void>
  
  createItemOptimistic: (itemData: Partial<ListItem>) => Promise<ListItem>
  updateItemOptimistic: (itemId: string, updates: Partial<ListItem>) => Promise<ListItem>
  deleteItemOptimistic: (itemId: string) => Promise<void>
  toggleItemOptimistic: (itemId: string, checked: boolean) => Promise<ListItem>
  reorderItemsOptimistic: (itemIds: string[], newOrder: number[]) => Promise<void>
}

export function useRealTimeItemSync(
  options: UseRealTimeItemSyncOptions = {}
): UseRealTimeItemSyncReturn {
  const { listId, autoStart = false, enableOptimisticUpdates = true } = options
  
  const service = realTimeItemSyncService
  const currentListId = ref<string | null>(listId || null)
  
  // Reactive state
  const isConnected = computed(() => true) // Would need to be connected to WebSocket state
  const activeUsers = computed(() => [] as string[]) // Would get from service state
  const pendingOperations = computed(() => 0) // Would get from service state
  const lastSyncTime = computed(() => new Date()) // Would get from service state
  
  // Methods
  const startSync = async (targetListId: string): Promise<void> => {
    currentListId.value = targetListId
    await service.startItemSync(targetListId)
  }
  
  const stopSync = (): void => {
    if (currentListId.value) {
      service.stopItemSync(currentListId.value)
      currentListId.value = null
    }
  }
  
  const refreshItems = async (): Promise<void> => {
    if (currentListId.value) {
      await service.refreshItems(currentListId.value)
    }
  }
  
  // Optimistic update methods
  const createItemOptimistic = async (itemData: Partial<ListItem>): Promise<ListItem> => {
    if (!currentListId.value) {
      throw new Error('No active list for item creation')
    }
    
    if (enableOptimisticUpdates) {
      return await service.createItemOptimistic(currentListId.value, itemData)
    } else {
      return await service.createItem(currentListId.value, itemData)
    }
  }
  
  const updateItemOptimistic = async (itemId: string, updates: Partial<ListItem>): Promise<ListItem> => {
    if (enableOptimisticUpdates) {
      return await service.updateItemOptimistic(itemId, updates)
    } else {
      return await service.updateItem(itemId, updates)
    }
  }
  
  const deleteItemOptimistic = async (itemId: string): Promise<void> => {
    if (enableOptimisticUpdates) {
      await service.deleteItemOptimistic(itemId)
    } else {
      await service.deleteItem(itemId)
    }
  }
  
  const toggleItemOptimistic = async (itemId: string, checked: boolean): Promise<ListItem> => {
    if (enableOptimisticUpdates) {
      return await service.toggleItemOptimistic(itemId, checked)
    } else {
      return await service.toggleItem(itemId, checked)
    }
  }
  
  const reorderItemsOptimistic = async (itemIds: string[], newOrder: number[]): Promise<void> => {
    if (!currentListId.value) {
      throw new Error('No active list for item reordering')
    }
    
    if (enableOptimisticUpdates) {
      await service.reorderItemsOptimistic(currentListId.value, itemIds, newOrder)
    } else {
      await service.reorderItems(currentListId.value, itemIds, newOrder)
    }
  }
  
  // Lifecycle
  onMounted(async () => {
    if (autoStart && listId) {
      await startSync(listId)
    }
  })
  
  onUnmounted(() => {
    stopSync()
  })
  
  return {
    isConnected,
    activeUsers,
    pendingOperations,
    lastSyncTime,
    
    startSync,
    stopSync,
    refreshItems,
    
    createItemOptimistic,
    updateItemOptimistic,
    deleteItemOptimistic,
    toggleItemOptimistic,
    reorderItemsOptimistic
  }
}
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { Subscription } from 'rxjs'
import { listItemRxService } from '@shared/services/rxjs/list-item.service'
import type { LocalListItem } from '@shared/db'

/**
 * Vue composable for reactive list items with RxJS
 *
 * Features:
 * - Automatic subscription to items for a specific list
 * - Real-time updates via RxJS observables
 * - Watches listId changes and re-subscribes
 * - CRUD operations with optimistic updates
 * - Instant toggle feedback
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { ref } from 'vue'
 * import { useListItemsRx } from '@entities/list-item'
 *
 * const listId = ref('list-1')
 * const {
 *   items,
 *   isLoading,
 *   createItem,
 *   toggleItem,
 *   updateItem,
 *   deleteItem
 * } = useListItemsRx(listId)
 * </script>
 * ```
 */
export function useListItemsRx(listId: Ref<string>) {
  // Reactive state
  const items = ref<LocalListItem[]>([]) as Ref<LocalListItem[]>
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // Subscriptions
  let itemsSubscription: Subscription | null = null

  /**
   * Initialize subscription for current listId
   */
  const initialize = () => {
    // Cleanup existing subscription
    cleanup()

    if (!listId.value) {
      items.value = []
      isLoading.value = false
      return
    }

    // Reset loading state
    isLoading.value = true

    // Subscribe to items for this list
    itemsSubscription = listItemRxService.getListItems$(listId.value).subscribe({
      next: (data) => {
        items.value = data
        isLoading.value = false
      },
      error: (err) => {
        console.error('Error loading list items:', err)
        error.value = err.message
        isLoading.value = false
      },
    })
  }

  /**
   * Cleanup subscriptions
   */
  const cleanup = () => {
    if (itemsSubscription) {
      itemsSubscription.unsubscribe()
      itemsSubscription = null
    }
  }

  /**
   * Create a new list item
   * @param content Item content
   */
  const createItem = async (content: string) => {
    try {
      const itemId = await listItemRxService.createListItem(listId.value, content)
      return itemId
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Toggle list item checked status
   * Provides instant feedback (optimistic update)
   * @param id Item ID
   * @param checked New checked status
   */
  const toggleItem = async (id: string, checked: boolean) => {
    try {
      await listItemRxService.toggleListItem(id, checked)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Update list item content
   * @param id Item ID
   * @param content New content
   */
  const updateItem = async (id: string, content: string) => {
    try {
      await listItemRxService.updateListItem(id, content)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Delete a list item
   * @param id Item ID
   */
  const deleteItem = async (id: string) => {
    try {
      await listItemRxService.deleteListItem(id)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Get item counts
   */
  const getItemCount = async (): Promise<number> => {
    return await listItemRxService.getItemCount(listId.value)
  }

  const getCheckedItemCount = async (): Promise<number> => {
    return await listItemRxService.getCheckedItemCount(listId.value)
  }

  /**
   * Get items by checked status
   */
  const checkedItems = ref<LocalListItem[]>([])
  const uncheckedItems = ref<LocalListItem[]>([])

  watch(
    items,
    (newItems) => {
      checkedItems.value = newItems.filter((item) => item.checked)
      uncheckedItems.value = newItems.filter((item) => !item.checked)
    },
    { immediate: true }
  )

  // Watch listId changes and re-subscribe
  watch(
    listId,
    () => {
      initialize()
    },
    { immediate: false }
  )

  // Lifecycle hooks
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    items,
    checkedItems,
    uncheckedItems,
    isLoading,
    error,

    // Methods
    createItem,
    toggleItem,
    updateItem,
    deleteItem,
    getItemCount,
    getCheckedItemCount,
  }
}

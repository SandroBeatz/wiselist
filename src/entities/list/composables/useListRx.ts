import { ref, onUnmounted, type Ref } from 'vue'
import { Subscription } from 'rxjs'
import { listRxService } from '@shared/services/rxjs/list.service'
import { listItemRxService } from '@shared/services/rxjs/list-item.service'
import type { LocalList } from '@shared/db'
import type { ListId } from '../model/types'

interface UseListRxReturn {
  list: Ref<LocalList | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  watchList: (id: string) => void
  updateList: (id: string, updates: Partial<Pick<LocalList, 'title' | 'type'>>) => Promise<void>
  deleteList: (id: string) => Promise<void>
  toggleItem: (itemId: string, checked: boolean) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
}

/**
 * Composable for managing a single list with reactive updates
 * Uses RxJS observables with IndexedDB for offline-first functionality
 *
 * @param listId - Optional list ID to watch immediately
 * @returns Object with list state and methods
 *
 * @example
 * ```typescript
 * const { list, isLoading, updateList, deleteItem } = useListRx('list-123')
 *
 * // List automatically updates when data changes
 * watch(list, (newList) => {
 *   console.log('List updated:', newList)
 * })
 * ```
 */
export function useListRx(listId?: ListId): UseListRxReturn {
  const list = ref<LocalList | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  let subscription: Subscription | null = null
  let currentListId: string | null = listId ?? null

  // Subscribe to list updates
  const subscribeToList = (id: string) => {
    // Unsubscribe from previous subscription
    if (subscription) {
      subscription.unsubscribe()
    }

    currentListId = id
    isLoading.value = true
    error.value = null

    try {
      subscription = listRxService.getList$(id).subscribe({
        next: (data) => {
          list.value = data ?? null
          isLoading.value = false
        },
        error: (err) => {
          error.value = err instanceof Error ? err.message : 'Failed to fetch list'
          console.error('[useListRx] Error fetching list:', err)
          isLoading.value = false
        },
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to subscribe to list'
      console.error('[useListRx] Error subscribing to list:', err)
      isLoading.value = false
    }
  }

  // Initialize subscription if listId provided
  if (listId) {
    subscribeToList(listId)
  }

  // Update list (title, type)
  const updateList = async (
    id: string,
    updates: Partial<Pick<LocalList, 'title' | 'type'>>
  ): Promise<void> => {
    try {
      error.value = null
      await listRxService.updateList(id, updates)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update list'
      console.error('[useListRx] Error updating list:', err)
      throw err
    }
  }

  // Delete list
  const deleteList = async (id: string): Promise<void> => {
    try {
      error.value = null
      await listRxService.deleteList(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete list'
      console.error('[useListRx] Error deleting list:', err)
      throw err
    }
  }

  // Toggle list item
  const toggleItem = async (itemId: string, checked: boolean): Promise<void> => {
    if (!currentListId) {
      throw new Error('No list ID set')
    }

    try {
      error.value = null
      await listItemRxService.toggleListItem(itemId, checked)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to toggle item'
      console.error('[useListRx] Error toggling item:', err)
      throw err
    }
  }

  // Delete list item
  const deleteItem = async (itemId: string): Promise<void> => {
    try {
      error.value = null
      await listItemRxService.deleteListItem(itemId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete item'
      console.error('[useListRx] Error deleting item:', err)
      throw err
    }
  }

  // Cleanup subscriptions
  onUnmounted(() => {
    if (subscription) {
      subscription.unsubscribe()
    }
  })

  return {
    list,
    isLoading,
    error,
    watchList: subscribeToList,
    updateList,
    deleteList,
    toggleItem,
    deleteItem,
  }
}

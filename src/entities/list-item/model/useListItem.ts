import { ref, readonly } from 'vue'
import { apiListItem } from '../api'
import type { ListItemId } from './types'

export const useListItem = () => {
  const isToggling = ref(false)
  const isDeleting = ref(false)
  const error = ref<string | null>(null)

  const toggleItem = async (itemId: ListItemId, checked: boolean) => {
    isToggling.value = true
    error.value = null

    try {
      await apiListItem.toggle(itemId, { checked })
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to toggle item'
      console.error('Failed to toggle item:', err)
      return false
    } finally {
      isToggling.value = false
    }
  }

  const deleteItem = async (itemId: ListItemId) => {
    isDeleting.value = true
    error.value = null

    try {
      await apiListItem.deleteOne(itemId)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete item'
      console.error('Failed to delete item:', err)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    isToggling: readonly(isToggling),
    isDeleting: readonly(isDeleting),
    error: readonly(error),
    toggleItem,
    deleteItem,
  }
}

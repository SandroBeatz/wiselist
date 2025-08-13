import { ref, type Ref } from 'vue'
import { apiList } from '@/entities/list/api'
import type { ListId } from '@/entities/list/model/types'

interface UseDeleteListReturn {
  isDeleting: Ref<boolean>
  error: Ref<string | null>
  deleteList: (id: ListId) => Promise<void>
}

export function useDeleteList(): UseDeleteListReturn {
  const isDeleting = ref(false)
  const error = ref<string | null>(null)

  const deleteList = async (id: ListId): Promise<void> => {
    if (isDeleting.value) return

    try {
      isDeleting.value = true
      error.value = null

      await apiList.deleteOne(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete list'
      console.error('Failed to delete list:', err)
      throw err
    } finally {
      isDeleting.value = false
    }
  }

  return {
    isDeleting,
    error,
    deleteList
  }
}

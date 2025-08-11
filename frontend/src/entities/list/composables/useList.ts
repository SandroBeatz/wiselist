import { ref, type Ref } from 'vue'
import { apiList } from '../api'
import type { List, listId } from '../model/types'

interface UseListReturn {
  list: Ref<List | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  fetchList: (id: listId) => Promise<void>
  refetch: () => Promise<void>
  deleteList: (id: listId) => Promise<void>
}

export function useList(): UseListReturn {
  const list = ref<List | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let currentId: listId | null = null

  const fetchList = async (id: listId): Promise<void> => {
    if (isLoading.value) return

    try {
      isLoading.value = true
      error.value = null
      currentId = id

      const response = await apiList.getOne(id) as List
      list.value = response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch list'
      list.value = null
      console.error('Failed to fetch list:', err)
    } finally {
      isLoading.value = false
    }
  }

  const refetch = async (): Promise<void> => {
    if (currentId) {
      await fetchList(currentId)
    }
  }

  const deleteList = async (id: listId): Promise<void> => {
    if (isLoading.value) return

    try {
      isLoading.value = true
      error.value = null

      await apiList.deleteOne(id)
      
      if (currentId === id) {
        list.value = null
        currentId = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete list'
      console.error('Failed to delete list:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    list,
    isLoading,
    error,
    fetchList,
    refetch,
    deleteList
  }
}

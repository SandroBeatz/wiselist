import { ref, type Ref } from 'vue'
import { apiList } from '../api'
import type { List, ListId } from '../model/types'

interface UseListReturn {
  list: Ref<List | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  fetchList: (id: ListId) => Promise<void>
  refetch: () => Promise<void>
}

export function useList(): UseListReturn {
  const list = ref<List | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let currentId: ListId | null = null

  const fetchList = async (id: ListId): Promise<void> => {
    if (isLoading.value) return

    try {
      isLoading.value = true
      error.value = null
      currentId = id

      list.value = (await apiList.getOne(id)) as List
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

  return {
    list,
    isLoading,
    error,
    fetchList,
    refetch,
  }
}

import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import type { List } from './types'
import { reactiveListsStore } from './lists-reactive.store'

export const useListsStore = defineStore('lists', () => {
  // Use reactive store internally but maintain Pinia interface
  const reactiveStore = reactiveListsStore
  
  // Reactive refs that sync with the reactive store
  const isLoading = ref(false)
  const lists = ref<List[]>([])
  
  // Subscribe to reactive store updates
  const listsSubscription = reactiveStore.lists$.subscribe(newLists => {
    lists.value = newLists
  })
  
  const loadingSubscription = reactiveStore.loading$.subscribe(loading => {
    isLoading.value = loading
  })
  
  // Actions that delegate to reactive store
  const toggleLoader = (value?: boolean) => {
    reactiveStore.toggleLoader(value)
  }
  
  const buildData = (payload: List[]) => {
    reactiveStore.buildData(payload)
  }
  
  const fetchData = async () => {
    await reactiveStore.fetchData()
  }

  const initializeAfterAuth = async () => {
    await reactiveStore.initializeAfterAuth()
  }
  
  // Additional reactive store methods for enhanced functionality
  const refresh = async () => {
    await reactiveStore.refresh()
  }
  
  const addListOptimistic = (list: List) => {
    reactiveStore.addListOptimistic(list)
  }
  
  const updateListOptimistic = (listId: string, updatedFields: Partial<List>) => {
    reactiveStore.updateListOptimistic(listId, updatedFields)
  }
  
  const removeListOptimistic = (listId: string) => {
    reactiveStore.removeListOptimistic(listId)
  }
  
  // Connection status from reactive store
  const connected = computed(() => reactiveStore.currentData.connected)
  
  // Cleanup subscriptions when store is destroyed
  onUnmounted(() => {
    listsSubscription.unsubscribe()
    loadingSubscription.unsubscribe()
  })
  
  return {
    // State (reactive refs)
    isLoading,
    lists,
    connected,
    
    // Actions (backward compatible)
    toggleLoader,
    buildData,
    fetchData,
    initializeAfterAuth,
    
    // Enhanced actions (new reactive features)
    refresh,
    addListOptimistic,
    updateListOptimistic,
    removeListOptimistic
  }
})

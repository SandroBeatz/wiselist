import { ReactiveListsStore } from './reactive-lists-store.example'

/**
 * Example usage and testing of the reactive store pattern
 * This demonstrates how to use the reactive store in practice
 */

// Create store instance
const listStore = new ReactiveListsStore({ enableLogging: true })

// Example data
const mockList = {
  id: '1',
  title: 'Shopping List',
  type: 'SHOPPING' as const,
  ownerId: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    { id: '1', content: 'Milk', checked: false },
    { id: '2', content: 'Bread', checked: true }
  ]
}

// Subscribe to state changes
const subscription = listStore.data$.subscribe(state => {
  console.log('State updated:', {
    listsCount: state.lists.length,
    selectedListId: state.selectedListId,
    filter: state.filter
  })
})

// Subscribe to loading states
const loadingSubscription = listStore.isLoading$.subscribe(loading => {
  console.log('Loading state:', loading)
})

// Subscribe to errors
const errorSubscription = listStore.error$.subscribe(error => {
  if (error) console.error('Store error:', error)
})

// Example operations
export function testReactiveStore() {
  console.log('=== Testing Reactive Store ===')
  
  // 1. Add a list
  listStore.addList(mockList)
  
  // 2. Select the list
  listStore.selectList(mockList.id)
  
  // 3. Set filter
  listStore.setFilter({ type: 'SHOPPING', search: 'shop' })
  
  // 4. Subscribe to filtered lists
  const filteredSubscription = listStore.filteredLists$.subscribe(lists => {
    console.log('Filtered lists:', lists.map(l => l.title))
  })
  
  // 5. Subscribe to selected list
  const selectedSubscription = listStore.selectedList$.subscribe(list => {
    console.log('Selected list:', list?.title || 'none')
  })
  
  // 6. Get statistics
  const statsSubscription = listStore.getListStats$().subscribe(stats => {
    console.log('List stats:', stats)
  })
  
  // 7. Test async loading
  listStore.loadLists(async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return [mockList, { ...mockList, id: '2', title: 'Todo List', type: 'TODO' }]
  })
  
  // Cleanup function
  return () => {
    subscription.unsubscribe()
    loadingSubscription.unsubscribe()
    errorSubscription.unsubscribe()
    filteredSubscription.unsubscribe()
    selectedSubscription.unsubscribe()
    statsSubscription.unsubscribe()
    listStore.destroy()
  }
}

// Export for use in development/testing
export { listStore }
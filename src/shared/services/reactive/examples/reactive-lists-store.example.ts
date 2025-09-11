import { Observable } from 'rxjs'
import { map, filter } from 'rxjs/operators'
import { ReactiveStoreService, ReactiveStoreState } from '../reactive-store.service'

// Example types (would normally import from entities)
interface List {
  id: string
  title: string
  type: 'SHOPPING' | 'TODO' | 'OTHER'
  ownerId: string
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    content: string
    checked: boolean
  }>
}

interface ListsState {
  lists: List[]
  selectedListId: string | null
  filter: {
    type?: string
    search?: string
  }
}

/**
 * Example implementation of a reactive lists store
 * Demonstrates the reactive store pattern using BehaviorSubject-based state management
 */
export class ReactiveListsStore extends ReactiveStoreService<ListsState> {
  
  protected getInitialState(): ReactiveStoreState<ListsState> {
    return {
      data: {
        lists: [],
        selectedListId: null,
        filter: {}
      },
      lastUpdated: 0,
      version: 0
    }
  }

  // Derived observables
  get lists$(): Observable<List[]> {
    return this.data$.pipe(
      map(state => state.lists),
      filter(lists => Array.isArray(lists))
    )
  }

  get selectedList$(): Observable<List | null> {
    return this.data$.pipe(
      map(state => {
        if (!state.selectedListId) return null
        return state.lists.find(list => list.id === state.selectedListId) || null
      })
    )
  }

  get filteredLists$(): Observable<List[]> {
    return this.data$.pipe(
      map(state => {
        let filtered = state.lists

        if (state.filter.type) {
          filtered = filtered.filter(list => list.type === state.filter.type)
        }

        if (state.filter.search) {
          const searchTerm = state.filter.search.toLowerCase()
          filtered = filtered.filter(list => 
            list.title.toLowerCase().includes(searchTerm)
          )
        }

        return filtered
      })
    )
  }

  // Actions
  setLists(lists: List[], version?: number): void {
    this.setLoading(false)
    this.clearError()
    this.patchState({ lists }, version)
    this.log('Lists updated', { count: lists.length })
  }

  addList(list: List): void {
    const currentLists = this.currentData.lists
    const updatedLists = [...currentLists, list]
    this.patchState({ lists: updatedLists })
    this.log('List added', { id: list.id, title: list.title })
  }

  updateList(updatedList: List): void {
    const currentLists = this.currentData.lists
    const updatedLists = currentLists.map(list =>
      list.id === updatedList.id ? updatedList : list
    )
    this.patchState({ lists: updatedLists })
    this.log('List updated', { id: updatedList.id })
  }

  removeList(listId: string): void {
    const currentLists = this.currentData.lists
    const updatedLists = currentLists.filter(list => list.id !== listId)
    
    // Clear selection if removing selected list
    const newSelectedId = this.currentData.selectedListId === listId 
      ? null 
      : this.currentData.selectedListId

    this.patchState({ 
      lists: updatedLists, 
      selectedListId: newSelectedId 
    })
    this.log('List removed', { id: listId })
  }

  selectList(listId: string | null): void {
    this.patchState({ selectedListId: listId })
    this.log('List selected', { id: listId })
  }

  setFilter(filter: Partial<ListsState['filter']>): void {
    const currentFilter = this.currentData.filter
    const updatedFilter = { ...currentFilter, ...filter }
    this.patchState({ filter: updatedFilter })
    this.log('Filter updated', filter)
  }

  clearFilter(): void {
    this.patchState({ filter: {} })
    this.log('Filter cleared')
  }

  // Async operations with loading states
  async loadLists(apiCall: () => Promise<List[]>): Promise<void> {
    this.setLoading(true)
    this.clearError()

    try {
      const lists = await apiCall()
      this.setLists(lists)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load lists'
      this.setError(errorMessage)
      this.log('Error loading lists', error)
    } finally {
      this.setLoading(false)
    }
  }

  // Optimistic updates
  optimisticAdd(list: List, apiCall: () => Promise<List>): void {
    // Immediately add to UI
    this.addList(list)

    // Perform API call in background
    apiCall()
      .then(confirmedList => {
        // Update with server response
        this.updateList(confirmedList)
        this.log('Optimistic add confirmed', { id: confirmedList.id })
      })
      .catch(error => {
        // Rollback on failure
        this.removeList(list.id)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create list'
        this.setError(errorMessage)
        this.log('Optimistic add failed, rolled back', { id: list.id, error })
      })
  }

  // Example of reactive data transformation
  getListStats$(): Observable<{
    total: number
    byType: Record<string, number>
    completed: number
  }> {
    return this.lists$.pipe(
      map(lists => ({
        total: lists.length,
        byType: lists.reduce((acc, list) => {
          acc[list.type] = (acc[list.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        completed: lists.filter(list => 
          list.items.every(item => item.checked)
        ).length
      }))
    )
  }
}
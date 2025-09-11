import { Observable, of } from 'rxjs'
import { map, filter, distinctUntilChanged, catchError, takeUntil } from 'rxjs/operators'
import { ReactiveStoreService, webSocketService, cacheService, listCacheOperators } from '@shared/services/reactive'
import type { List, ListId } from './types'
import { apiList } from '../api'
import { tokenService } from '@shared/services/token.service'

interface ListsState {
  lists: List[]
  loading: boolean
  connected: boolean
}

/**
 * Reactive Lists Store using RxJS patterns
 * Provides real-time synchronization with WebSocket events and offline-first approach
 */
export class ReactiveListsStore extends ReactiveStoreService<ListsState> {
  
  constructor() {
    super({
      enableLogging: true
    })
    
    this.initializeWebSocketSubscriptions()
    this.initializeAutoFetch()
  }

  protected getInitialState() {
    return {
      data: {
        lists: [],
        loading: false,
        connected: false
      },
      lastUpdated: Date.now(),
      version: 0
    }
  }

  // Observable getters for components
  get lists$(): Observable<List[]> {
    return this.data$.pipe(
      map(state => state.lists),
      distinctUntilChanged()
    )
  }

  get loading$(): Observable<boolean> {
    return this.data$.pipe(
      map(state => state.loading),
      distinctUntilChanged()
    )
  }

  get connected$(): Observable<boolean> {
    return this.data$.pipe(
      map(state => state.connected),
      distinctUntilChanged()
    )
  }

  // Methods for backward compatibility with Pinia store
  get isLoading(): boolean {
    return this.currentData.loading
  }

  get lists(): List[] {
    return this.currentData.lists
  }

  toggleLoader(value?: boolean): void {
    const currentState = this.currentData
    const loading = typeof value === 'boolean' ? value : !currentState.loading
    
    this.updateState({
      ...currentState,
      loading
    })
  }

  buildData(payload: List[]): void {
    const currentState = this.currentData
    this.updateState({
      ...currentState,
      lists: payload
    })

    // Cache all the lists
    const version = Date.now()
    payload.forEach(list => {
      const listVersion = new Date(list.updatedAt).getTime()
      cacheService.setList(list.id, list, listVersion)
    })

    // Cache the user lists index
    const listIds = payload.map(list => list.id)
    cacheService.setUserLists(listIds, version)
  }

  async fetchData(): Promise<void> {
    this.toggleLoader(true)
    this.clearError()

    try {
      // Use cache-first strategy with RxJS operators
      const lists$ = of(null).pipe(
        listCacheOperators.cacheFirstUserLists(() => 
          new Observable<List[]>(subscriber => {
            apiList.getAll()
              .then(lists => {
                subscriber.next(lists)
                subscriber.complete()
              })
              .catch(error => subscriber.error(error))
          })
        )
      )

      const lists = await lists$.toPromise()
      if (lists) {
        this.buildData(lists)
        this.log('Lists fetched successfully', { 
          count: lists.length, 
          source: cacheService.getListSync(lists[0]?.id) ? 'cache' : 'api' 
        })
      }
    } catch (error) {
      // Try to get cached data as fallback
      try {
        const cachedLists = await cacheService.getAllCachedLists().pipe(takeUntil(this.destroy$)).toPromise()
        if (cachedLists && cachedLists.length > 0) {
          this.buildData(cachedLists)
          this.log('Using cached lists as fallback', { count: cachedLists.length })
        } else {
          this.setError('Failed to fetch lists')
          this.log('Failed to fetch lists and no cache available', { error })
        }
      } catch (cacheError) {
        this.setError('Failed to fetch lists')
        this.log('Failed to fetch lists and cache error', { error, cacheError })
      }
    } finally {
      this.toggleLoader(false)
    }
  }

  // Reactive methods for real-time updates
  private initializeWebSocketSubscriptions(): void {
    if (!tokenService.isAuthenticated()) {
      this.log('User not authenticated, skipping WebSocket initialization')
      return
    }

    // Subscribe to WebSocket connection state
    webSocketService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connectionState => {
        const currentState = this.currentData
        const connected = connectionState === 'connected'
        
        this.updateState({
          ...currentState,
          connected
        })
        
        this.log('WebSocket connection state changed', { connectionState })
      })

    // Subscribe to list events for real-time updates
    webSocketService.listEvents$
      .pipe(
        filter(event => this.isListEvent(event)),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.handleListEvent(event)
      })

    // Initialize WebSocket connection through auth service
    if (tokenService.isAuthenticated()) {
      webSocketService.connect()
    }
  }

  private initializeAutoFetch(): void {
    // Auto-fetch when component initializes if user is authenticated
    if (tokenService.isAuthenticated()) {
      this.fetchData()
    }
  }

  private performFetch(): Observable<List[]> {
    this.toggleLoader(true)
    
    return new Observable<List[]>(observer => {
      apiList.getAll()
        .then(lists => {
          this.buildData(lists)
          this.toggleLoader(false)
          observer.next(lists)
          observer.complete()
        })
        .catch(error => {
          this.setError('Failed to fetch lists')
          this.log('Failed to fetch lists', { error })
          this.toggleLoader(false)
          observer.error(error)
        })
    }).pipe(
      catchError(error => {
        this.log('Error in performFetch', { error })
        return []
      })
    )
  }

  private isListEvent(event: any): boolean {
    return event && 
           typeof event.type === 'string' && 
           ['LIST_CREATED', 'LIST_UPDATED', 'LIST_DELETED'].includes(event.type)
  }

  private handleListEvent(event: any): void {
    this.log('Handling list event', { type: event.type, listId: event.listId })
    
    const currentState = this.currentData
    let updatedLists = [...currentState.lists]

    switch (event.type) {
      case 'LIST_CREATED':
        if (event.data && !updatedLists.find(list => list.id === event.data.id)) {
          updatedLists.push(event.data)
          // Cache the new list
          cacheService.setList(event.data.id, event.data, event.version)
          this.log('List created via WebSocket', { listId: event.data.id })
        }
        break

      case 'LIST_UPDATED':
        if (event.data) {
          const index = updatedLists.findIndex(list => list.id === event.listId)
          if (index !== -1) {
            const updatedList = { ...updatedLists[index], ...event.data }
            updatedLists[index] = updatedList
            // Update cache with new version
            cacheService.setList(event.listId, updatedList, event.version)
            this.log('List updated via WebSocket', { listId: event.listId })
          }
        }
        break

      case 'LIST_DELETED':
        updatedLists = updatedLists.filter(list => list.id !== event.listId)
        // Remove from cache
        cacheService.invalidateList(event.listId)
        this.log('List deleted via WebSocket', { listId: event.listId })
        break

      default:
        this.log('Unknown list event type', { type: event.type })
        return
    }

    this.updateState({
      ...currentState,
      lists: updatedLists
    }, event.version)

    // Update cache with new lists array
    const listIds = updatedLists.map(list => list.id)
    cacheService.setUserLists(listIds, event.version)
  }

  // Helper method to add a new list optimistically
  addListOptimistic(list: List): void {
    const currentState = this.currentData
    const updatedLists = [...currentState.lists, list]
    
    this.updateState({
      ...currentState,
      lists: updatedLists
    })

    // Cache the optimistic list
    const version = new Date(list.updatedAt).getTime()
    cacheService.setList(list.id, list, version)
    
    // Update user lists cache
    const listIds = updatedLists.map(l => l.id)
    cacheService.setUserLists(listIds, version)
    
    this.log('List added optimistically', { listId: list.id })
  }

  // Helper method to update a list optimistically
  updateListOptimistic(listId: ListId, updatedFields: Partial<List>): void {
    const currentState = this.currentData
    const updatedLists = currentState.lists.map(list =>
      list.id === listId ? { ...list, ...updatedFields } : list
    )
    
    this.updateState({
      ...currentState,
      lists: updatedLists
    })

    // Update cache with optimistic changes
    const updatedList = updatedLists.find(list => list.id === listId)
    if (updatedList) {
      const version = new Date(updatedList.updatedAt).getTime()
      cacheService.setList(listId, updatedList, version)
    }
    
    this.log('List updated optimistically', { listId })
  }

  // Helper method to remove a list optimistically
  removeListOptimistic(listId: ListId): void {
    const currentState = this.currentData
    const updatedLists = currentState.lists.filter(list => list.id !== listId)
    
    this.updateState({
      ...currentState,
      lists: updatedLists
    })

    // Remove from cache
    cacheService.invalidateList(listId)
    
    // Update user lists cache
    const listIds = updatedLists.map(l => l.id)
    cacheService.setUserLists(listIds)
    
    this.log('List removed optimistically', { listId })
  }

  // Method to manually refresh lists
  async refresh(): Promise<void> {
    await this.fetchData()
  }

  // Cleanup method
  override destroy(): void {
    this.log('Destroying ReactiveListsStore')
    super.destroy()
  }
}

// Create singleton instance
export const reactiveListsStore = new ReactiveListsStore()
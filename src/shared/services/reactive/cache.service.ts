import { BehaviorSubject, Observable } from 'rxjs'
import { map, distinctUntilChanged } from 'rxjs/operators'
import { BaseReactiveService } from './base-reactive.service'
import type { List, ListId, ListItem } from '@entities/list'

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: number
  etag?: string
}

interface CacheState {
  lists: Map<ListId, CacheEntry<List>>
  listItems: Map<ListId, CacheEntry<ListItem[]>>
  userLists: CacheEntry<ListId[]> | null
  lastSyncTime: number
}

interface CacheConfig {
  listsTTL: number // Time to live for lists cache
  itemsTTL: number // Time to live for items cache
  userListsTTL: number // Time to live for user lists index
  maxCacheSize: number // Maximum number of entries to keep
  persistToStorage: boolean // Whether to persist cache to localStorage
  storageKey: string // Storage key for persistence
  enableVersioning: boolean // Enable version-based cache invalidation
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  listsTTL: 5 * 60 * 1000, // 5 minutes (aligned with backend Redis)
  itemsTTL: 3 * 60 * 1000, // 3 minutes (aligned with backend Redis)
  userListsTTL: 10 * 60 * 1000, // 10 minutes
  maxCacheSize: 100, // Maximum 100 lists in cache
  persistToStorage: true,
  storageKey: 'wiselist_reactive_cache',
  enableVersioning: true
}

/**
 * Advanced cache service with TTL, versioning, and persistence
 * Provides offline-first caching for lists and items with intelligent invalidation
 */
export class CacheService extends BaseReactiveService {
  private readonly _state$ = new BehaviorSubject<CacheState>(this.getInitialState())
  private readonly cacheConfig: CacheConfig
  private cleanupTimer?: number

  constructor(config: Partial<CacheConfig> = {}) {
    super({ enableLogging: import.meta.env.DEV })
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config }
    
    this.loadFromStorage()
    this.startCleanupTimer()
  }

  private getInitialState(): CacheState {
    return {
      lists: new Map(),
      listItems: new Map(),
      userLists: null,
      lastSyncTime: 0
    }
  }

  // Observable getters
  get state$(): Observable<CacheState> {
    return this._state$.asObservable().pipe(distinctUntilChanged())
  }

  get currentState(): CacheState {
    return this._state$.getValue()
  }

  // List caching methods
  setList(listId: ListId, list: List, version?: number): void {
    const currentState = this.currentState
    const entry: CacheEntry<List> = {
      data: list,
      timestamp: Date.now(),
      version: version ?? Date.now(),
      etag: this.generateEtag(list)
    }

    const updatedLists = new Map(currentState.lists)
    updatedLists.set(listId, entry)

    // Enforce cache size limit
    this.enforceCacheLimit(updatedLists)

    this._state$.next({
      ...currentState,
      lists: updatedLists
    })

    this.persistToStorage()
    this.log('List cached', { listId, version })
  }

  getList(listId: ListId): Observable<List | null> {
    return this.state$.pipe(
      map(state => {
        const entry = state.lists.get(listId)
        if (!entry) return null
        
        // Check TTL
        const isExpired = Date.now() - entry.timestamp > this.cacheConfig.listsTTL
        if (isExpired) {
          this.invalidateList(listId)
          return null
        }

        return entry.data
      }),
      distinctUntilChanged()
    )
  }

  getListSync(listId: ListId): List | null {
    const entry = this.currentState.lists.get(listId)
    if (!entry) return null

    // Check TTL
    const isExpired = Date.now() - entry.timestamp > this.cacheConfig.listsTTL
    if (isExpired) {
      this.invalidateList(listId)
      return null
    }

    return entry.data
  }

  // List items caching methods
  setListItems(listId: ListId, items: ListItem[], version?: number): void {
    const currentState = this.currentState
    const entry: CacheEntry<ListItem[]> = {
      data: items,
      timestamp: Date.now(),
      version: version ?? Date.now(),
      etag: this.generateEtag(items)
    }

    const updatedItems = new Map(currentState.listItems)
    updatedItems.set(listId, entry)

    this._state$.next({
      ...currentState,
      listItems: updatedItems
    })

    this.persistToStorage()
    this.log('List items cached', { listId, count: items.length, version })
  }

  getListItems(listId: ListId): Observable<ListItem[] | null> {
    return this.state$.pipe(
      map(state => {
        const entry = state.listItems.get(listId)
        if (!entry) return null

        // Check TTL
        const isExpired = Date.now() - entry.timestamp > this.cacheConfig.itemsTTL
        if (isExpired) {
          this.invalidateListItems(listId)
          return null
        }

        return entry.data
      }),
      distinctUntilChanged()
    )
  }

  getListItemsSync(listId: ListId): ListItem[] | null {
    const entry = this.currentState.listItems.get(listId)
    if (!entry) return null

    // Check TTL
    const isExpired = Date.now() - entry.timestamp > this.cacheConfig.itemsTTL
    if (isExpired) {
      this.invalidateListItems(listId)
      return null
    }

    return entry.data
  }

  // User lists caching (index of all user's lists)
  setUserLists(listIds: ListId[], version?: number): void {
    const currentState = this.currentState
    const entry: CacheEntry<ListId[]> = {
      data: listIds,
      timestamp: Date.now(),
      version: version ?? Date.now()
    }

    this._state$.next({
      ...currentState,
      userLists: entry
    })

    this.persistToStorage()
    this.log('User lists index cached', { count: listIds.length, version })
  }

  getUserLists(): Observable<ListId[] | null> {
    return this.state$.pipe(
      map(state => {
        const entry = state.userLists
        if (!entry) return null

        // Check TTL
        const isExpired = Date.now() - entry.timestamp > this.cacheConfig.userListsTTL
        if (isExpired) {
          this.invalidateUserLists()
          return null
        }

        return entry.data
      }),
      distinctUntilChanged()
    )
  }

  // Bulk operations
  setLists(lists: List[], version?: number): void {
    lists.forEach(list => this.setList(list.id, list, version))
    
    // Update user lists index
    const listIds = lists.map(list => list.id)
    this.setUserLists(listIds, version)
  }

  getAllCachedLists(): Observable<List[]> {
    return this.state$.pipe(
      map(state => {
        const validLists: List[] = []
        const now = Date.now()

        for (const [, entry] of state.lists) {
          const isExpired = now - entry.timestamp > this.cacheConfig.listsTTL
          if (!isExpired) {
            validLists.push(entry.data)
          }
        }

        return validLists
      }),
      distinctUntilChanged()
    )
  }

  // Invalidation methods
  invalidateList(listId: ListId): void {
    const currentState = this.currentState
    const updatedLists = new Map(currentState.lists)
    updatedLists.delete(listId)

    this._state$.next({
      ...currentState,
      lists: updatedLists
    })

    this.persistToStorage()
    this.log('List cache invalidated', { listId })
  }

  invalidateListItems(listId: ListId): void {
    const currentState = this.currentState
    const updatedItems = new Map(currentState.listItems)
    updatedItems.delete(listId)

    this._state$.next({
      ...currentState,
      listItems: updatedItems
    })

    this.persistToStorage()
    this.log('List items cache invalidated', { listId })
  }

  invalidateUserLists(): void {
    const currentState = this.currentState
    this._state$.next({
      ...currentState,
      userLists: null
    })

    this.persistToStorage()
    this.log('User lists cache invalidated')
  }

  // Complete cache operations
  clearCache(): void {
    this._state$.next(this.getInitialState())
    this.clearStorage()
    this.log('Cache cleared completely')
  }

  invalidateExpired(): void {
    const currentState = this.currentState
    const now = Date.now()
    let hasChanges = false

    // Clean expired lists
    const validLists = new Map<ListId, CacheEntry<List>>()
    for (const [listId, entry] of currentState.lists) {
      const isExpired = now - entry.timestamp > this.cacheConfig.listsTTL
      if (!isExpired) {
        validLists.set(listId, entry)
      } else {
        hasChanges = true
      }
    }

    // Clean expired list items
    const validItems = new Map<ListId, CacheEntry<ListItem[]>>()
    for (const [listId, entry] of currentState.listItems) {
      const isExpired = now - entry.timestamp > this.cacheConfig.itemsTTL
      if (!isExpired) {
        validItems.set(listId, entry)
      } else {
        hasChanges = true
      }
    }

    // Check user lists expiry
    let validUserLists = currentState.userLists
    if (validUserLists && now - validUserLists.timestamp > this.cacheConfig.userListsTTL) {
      validUserLists = null
      hasChanges = true
    }

    if (hasChanges) {
      this._state$.next({
        lists: validLists,
        listItems: validItems,
        userLists: validUserLists,
        lastSyncTime: currentState.lastSyncTime
      })

      this.persistToStorage()
      this.log('Expired cache entries cleaned')
    }
  }

  // Cache statistics
  getCacheStats(): Observable<{
    listsCount: number
    itemsCount: number
    totalSize: number
    oldestEntry: number
    newestEntry: number
  }> {
    return this.state$.pipe(
      map(state => {
        const now = Date.now()
        let totalSize = 0
        let oldestEntry = now
        let newestEntry = 0

        // Calculate from lists
        for (const entry of state.lists.values()) {
          totalSize += JSON.stringify(entry.data).length
          oldestEntry = Math.min(oldestEntry, entry.timestamp)
          newestEntry = Math.max(newestEntry, entry.timestamp)
        }

        // Calculate from items
        for (const entry of state.listItems.values()) {
          totalSize += JSON.stringify(entry.data).length
          oldestEntry = Math.min(oldestEntry, entry.timestamp)
          newestEntry = Math.max(newestEntry, entry.timestamp)
        }

        return {
          listsCount: state.lists.size,
          itemsCount: state.listItems.size,
          totalSize,
          oldestEntry: oldestEntry === now ? 0 : oldestEntry,
          newestEntry
        }
      })
    )
  }

  // Version-based cache operations
  isVersionNewer(listId: ListId, version: number): boolean {
    const entry = this.currentState.lists.get(listId)
    return !entry || !entry.version || version > entry.version
  }

  updateSyncTime(): void {
    const currentState = this.currentState
    this._state$.next({
      ...currentState,
      lastSyncTime: Date.now()
    })
    this.persistToStorage()
  }

  getLastSyncTime(): number {
    return this.currentState.lastSyncTime
  }

  // Private utility methods
  private generateEtag(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16)
  }

  private enforceCacheLimit(cache: Map<any, any>): void {
    if (cache.size <= this.cacheConfig.maxCacheSize) return

    // Remove oldest entries
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const toRemove = entries.slice(0, cache.size - this.cacheConfig.maxCacheSize)
    toRemove.forEach(([key]) => cache.delete(key))

    this.log('Cache size limit enforced', { removed: toRemove.length })
  }

  private startCleanupTimer(): void {
    // Clean expired entries every 2 minutes
    this.cleanupTimer = window.setInterval(() => {
      this.invalidateExpired()
    }, 2 * 60 * 1000)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      window.clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  // Storage persistence
  private persistToStorage(): void {
    if (!this.cacheConfig.persistToStorage) return

    try {
      const state = this.currentState
      const serialized = {
        lists: Array.from(state.lists.entries()),
        listItems: Array.from(state.listItems.entries()),
        userLists: state.userLists,
        lastSyncTime: state.lastSyncTime,
        timestamp: Date.now()
      }
      
      localStorage.setItem(this.cacheConfig.storageKey, JSON.stringify(serialized))
    } catch (error) {
      this.log('Failed to persist cache to storage', { error })
    }
  }

  private loadFromStorage(): void {
    if (!this.cacheConfig.persistToStorage) return

    try {
      const stored = localStorage.getItem(this.cacheConfig.storageKey)
      if (!stored) return

      const parsed = JSON.parse(stored)
      
      // Reconstruct Maps from arrays
      const lists = new Map<ListId, CacheEntry<List>>(parsed.lists || [])
      const listItems = new Map<ListId, CacheEntry<ListItem[]>>(parsed.listItems || [])

      this._state$.next({
        lists,
        listItems,
        userLists: parsed.userLists || null,
        lastSyncTime: parsed.lastSyncTime || 0
      })

      this.log('Cache loaded from storage', { 
        listsCount: lists.size,
        itemsCount: listItems.size
      })
    } catch (error) {
      this.log('Failed to load cache from storage', { error })
    }
  }

  private clearStorage(): void {
    if (!this.cacheConfig.persistToStorage) return
    
    try {
      localStorage.removeItem(this.cacheConfig.storageKey)
    } catch (error) {
      this.log('Failed to clear cache storage', { error })
    }
  }

  // Cleanup
  override destroy(): void {
    this.stopCleanupTimer()
    this.persistToStorage()
    super.destroy()
  }
}

// Create singleton instance
export const cacheService = new CacheService()
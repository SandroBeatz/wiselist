import { Observable, of, throwError, EMPTY } from 'rxjs'
import { 
  switchMap, 
  catchError, 
  tap, 
  take,
  timeout,
  retry
} from 'rxjs/operators'
import { cacheService } from './cache.service'
import type { List, ListId, ListItem } from '@entities/list'

/**
 * Cache-first operator that tries cache first, then falls back to API
 */
export function cacheFirst<T>(
  cacheGetter: () => Observable<T | null>,
  apiFetcher: () => Observable<T>,
  cacheSetter: (data: T) => void,
  options: {
    timeout?: number
    retries?: number
    enableLogging?: boolean
  } = {}
) {
  const { timeout: timeoutMs = 10000, retries = 2, enableLogging = false } = options

  return () => 
    new Observable<T>(subscriber => {
      if (enableLogging) console.log('[CacheOperators] Starting cache-first operation')

      // Try cache first
      const cacheSubscription = cacheGetter()
        .pipe(take(1))
        .subscribe({
          next: (cachedData) => {
            if (cachedData !== null) {
              if (enableLogging) console.log('[CacheOperators] Cache hit, returning cached data')
              subscriber.next(cachedData)
              subscriber.complete()
              return
            }

            if (enableLogging) console.log('[CacheOperators] Cache miss, fetching from API')
            
            // Cache miss, fetch from API
            const apiSubscription = apiFetcher()
              .pipe(
                timeout(timeoutMs),
                retry(retries),
                tap(data => {
                  if (enableLogging) console.log('[CacheOperators] API fetch successful, caching data')
                  cacheSetter(data)
                }),
                catchError(error => {
                  if (enableLogging) console.error('[CacheOperators] API fetch failed', error)
                  return throwError(error)
                })
              )
              .subscribe({
                next: (data) => {
                  subscriber.next(data)
                  subscriber.complete()
                },
                error: (error) => subscriber.error(error)
              })

            return () => apiSubscription.unsubscribe()
          },
          error: (error) => subscriber.error(error)
        })

      return () => cacheSubscription.unsubscribe()
    })
}

/**
 * Network-first operator that tries API first, falls back to cache
 */
export function networkFirst<T>(
  apiFetcher: () => Observable<T>,
  cacheGetter: () => Observable<T | null>,
  cacheSetter: (data: T) => void,
  options: {
    timeout?: number
    enableLogging?: boolean
  } = {}
) {
  const { timeout: timeoutMs = 5000, enableLogging = false } = options

  return () =>
    new Observable<T>(subscriber => {
      if (enableLogging) console.log('[CacheOperators] Starting network-first operation')

      const apiSubscription = apiFetcher()
        .pipe(
          timeout(timeoutMs),
          tap(data => {
            if (enableLogging) console.log('[CacheOperators] API fetch successful, caching data')
            cacheSetter(data)
          }),
          catchError(error => {
            if (enableLogging) console.log('[CacheOperators] API failed, trying cache', error)
            
            return cacheGetter().pipe(
              take(1),
              switchMap(cachedData => {
                if (cachedData !== null) {
                  if (enableLogging) console.log('[CacheOperators] Cache fallback successful')
                  return of(cachedData)
                }
                if (enableLogging) console.log('[CacheOperators] Cache fallback failed, throwing error')
                return throwError(error)
              })
            )
          })
        )
        .subscribe({
          next: (data) => {
            subscriber.next(data)
            subscriber.complete()
          },
          error: (error) => subscriber.error(error)
        })

      return () => apiSubscription.unsubscribe()
    })
}

/**
 * Stale-while-revalidate operator that returns cache immediately, then updates with fresh data
 */
export function staleWhileRevalidate<T>(
  cacheGetter: () => Observable<T | null>,
  apiFetcher: () => Observable<T>,
  cacheSetter: (data: T) => void,
  options: {
    enableLogging?: boolean
  } = {}
) {
  const { enableLogging = false } = options

  return () =>
    new Observable<T>(subscriber => {
      if (enableLogging) console.log('[CacheOperators] Starting stale-while-revalidate operation')
      let hasEmittedCache = false

      // First, try to get cached data
      const cacheSubscription = cacheGetter()
        .pipe(take(1))
        .subscribe({
          next: (cachedData) => {
            if (cachedData !== null) {
              if (enableLogging) console.log('[CacheOperators] Emitting cached data')
              subscriber.next(cachedData)
              hasEmittedCache = true
            }

            // Always fetch fresh data in background
            if (enableLogging) console.log('[CacheOperators] Fetching fresh data in background')
            const apiSubscription = apiFetcher()
              .pipe(
                tap(data => {
                  if (enableLogging) console.log('[CacheOperators] Fresh data fetched, caching')
                  cacheSetter(data)
                }),
                catchError(error => {
                  if (enableLogging) console.log('[CacheOperators] Fresh data fetch failed', error)
                  return EMPTY
                })
              )
              .subscribe({
                next: (freshData) => {
                  if (enableLogging) console.log('[CacheOperators] Emitting fresh data')
                  subscriber.next(freshData)
                  if (!hasEmittedCache) {
                    subscriber.complete()
                  }
                },
                error: (error) => {
                  if (!hasEmittedCache) {
                    subscriber.error(error)
                  }
                },
                complete: () => {
                  if (hasEmittedCache) {
                    subscriber.complete()
                  }
                }
              })

            if (!hasEmittedCache) {
              return () => apiSubscription.unsubscribe()
            }
          },
          error: (error) => {
            if (!hasEmittedCache) {
              subscriber.error(error)
            }
          }
        })

      return () => cacheSubscription.unsubscribe()
    })
}

/**
 * Cache invalidation operator that clears cache on specific conditions
 */
export function invalidateOn<T>(
  condition: (data: T) => boolean,
  invalidateAction: () => void
) {
  return (source: Observable<T>) =>
    source.pipe(
      tap(data => {
        if (condition(data)) {
          invalidateAction()
        }
      })
    )
}

/**
 * Version-based cache update operator
 */
export function versionedCache<T>(
  getVersion: (data: T) => number,
  listId: ListId,
  cacheSetter: (data: T, version: number) => void
) {
  return (source: Observable<T>) =>
    source.pipe(
      tap(data => {
        const version = getVersion(data)
        if (cacheService.isVersionNewer(listId, version)) {
          cacheSetter(data, version)
        }
      })
    )
}

/**
 * Smart cache operator that combines multiple strategies
 */
export function smartCache<T>(
  options: {
    listId?: ListId
    cacheGetter: () => Observable<T | null>
    apiFetcher: () => Observable<T>
    cacheSetter: (data: T, version?: number) => void
    getVersion?: (data: T) => number
    strategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate'
    timeout?: number
    enableLogging?: boolean
  }
) {
  const {
    listId,
    cacheGetter,
    apiFetcher,
    cacheSetter,
    getVersion,
    strategy = 'cache-first',
    timeout = 10000,
    enableLogging = false
  } = options

  return () => {
    const versionedCacheSetter = (data: T) => {
      const version = getVersion?.(data) ?? Date.now()
      cacheSetter(data, version)
    }

    switch (strategy) {
      case 'cache-first':
        return of(null).pipe(
          cacheFirst(cacheGetter, apiFetcher, versionedCacheSetter, { timeout, enableLogging })
        )

      case 'network-first':
        return of(null).pipe(
          networkFirst(apiFetcher, cacheGetter, versionedCacheSetter, { timeout, enableLogging })
        )

      case 'stale-while-revalidate':
        return of(null).pipe(
          staleWhileRevalidate(cacheGetter, apiFetcher, versionedCacheSetter, { enableLogging })
        )

      default:
        return of(null).pipe(
          cacheFirst(cacheGetter, apiFetcher, versionedCacheSetter, { timeout, enableLogging })
        )
    }
  }
}

/**
 * List-specific cache operators
 */
export const listCacheOperators = {
  /**
   * Cache-first for single list
   */
  cacheFirstList: (listId: ListId, apiFetcher: () => Observable<List>) =>
    smartCache({
      listId,
      cacheGetter: () => cacheService.getList(listId),
      apiFetcher,
      cacheSetter: (data, version) => cacheService.setList(listId, data, version),
      getVersion: (list) => new Date(list.updatedAt).getTime(),
      strategy: 'cache-first',
      enableLogging: true
    }),

  /**
   * Cache-first for list items
   */
  cacheFirstItems: (listId: ListId, apiFetcher: () => Observable<ListItem[]>) =>
    smartCache({
      listId,
      cacheGetter: () => cacheService.getListItems(listId),
      apiFetcher,
      cacheSetter: (data, version) => cacheService.setListItems(listId, data, version),
      getVersion: (items) => Math.max(...items.map(item => new Date(item.updatedAt).getTime()), 0),
      strategy: 'cache-first',
      enableLogging: true
    }),

  /**
   * Cache-first for all user lists
   */
  cacheFirstUserLists: (apiFetcher: () => Observable<List[]>) =>
    smartCache({
      cacheGetter: () => cacheService.getAllCachedLists(),
      apiFetcher,
      cacheSetter: (data, version) => cacheService.setLists(data, version),
      getVersion: (lists) => Math.max(...lists.map(list => new Date(list.updatedAt).getTime()), 0),
      strategy: 'cache-first',
      enableLogging: true
    }),

  /**
   * Stale-while-revalidate for frequently accessed lists
   */
  staleWhileRevalidateList: (listId: ListId, apiFetcher: () => Observable<List>) =>
    smartCache({
      listId,
      cacheGetter: () => cacheService.getList(listId),
      apiFetcher,
      cacheSetter: (data, version) => cacheService.setList(listId, data, version),
      getVersion: (list) => new Date(list.updatedAt).getTime(),
      strategy: 'stale-while-revalidate',
      enableLogging: true
    })
}
import { BehaviorSubject, Observable, from, shareReplay } from 'rxjs'
import { liveQuery } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import { db, OperationType, SyncStatus } from '@shared/db'
import type { LocalList } from '@shared/db'
import type { ListForm } from '@entities/list'

/**
 * ListRxService - Reactive list service with RxJS and Dexie live queries
 *
 * Features:
 * - Real-time list updates via Dexie liveQuery
 * - Optimistic UI updates
 * - Automatic sync queue management
 * - Observable-based API for reactive components
 *
 * Usage:
 * ```typescript
 * const listService = ListRxService.getInstance()
 * listService.getLists$().subscribe(lists => console.log(lists))
 * await listService.createList({ title: 'Groceries', type: 'SHOPPING' })
 * ```
 */
export class ListRxService {
  private static instance: ListRxService | null = null

  // Observable of all lists from IndexedDB
  private lists$: Observable<LocalList[]>

  // BehaviorSubject for sync status
  private syncStatus$ = new BehaviorSubject<SyncStatus>(SyncStatus.SYNCED as SyncStatus)

  private constructor() {
    // Create observable from Dexie liveQuery
    // liveQuery automatically re-emits when data changes
    this.lists$ = from(
      liveQuery(() =>
        db.lists
          .orderBy('localTimestamp')
          .reverse()
          .toArray()
      )
    ).pipe(
      shareReplay(1) // Cache latest value for new subscribers
    )
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ListRxService {
    if (!ListRxService.instance) {
      ListRxService.instance = new ListRxService()
    }
    return ListRxService.instance
  }

  /**
   * Get observable of all lists
   * Automatically updates when IndexedDB changes
   */
  getLists$(): Observable<LocalList[]> {
    return this.lists$
  }

  /**
   * Get observable of a single list by ID with items
   * Automatically JOINs with listItems table
   * Updates when either list or items change
   * @param id List ID
   */
  getList$(id: string): Observable<LocalList | undefined> {
    return from(
      liveQuery(async () => {
        // Get list from database
        const list = await db.lists.get(id)
        if (!list) return undefined

        // Get all items for this list
        const items = await db.listItems
          .where('listId')
          .equals(id)
          .sortBy('localTimestamp')

        // Return list with populated items
        return {
          ...list,
          items: items,
        } as LocalList
      })
    ).pipe(
      shareReplay(1)
    )
  }

  /**
   * Get observable of lists by owner ID
   * @param ownerId Owner user ID
   */
  getListsByOwner$(ownerId: string): Observable<LocalList[]> {
    return from(
      liveQuery(() =>
        db.lists
          .where('ownerId')
          .equals(ownerId)
          .sortBy('localTimestamp')
      )
    ).pipe(
      shareReplay(1)
    )
  }

  /**
   * Get observable of sync status
   */
  getSyncStatus$(): Observable<SyncStatus> {
    return this.syncStatus$.asObservable()
  }

  /**
   * Create a new list with optimistic update
   * @param listForm List data (title, type)
   * @param ownerId Owner user ID
   * @returns Created list ID
   */
  async createList(listForm: ListForm, ownerId: string): Promise<string> {
    const id = uuidv4()
    const now = Date.now()

    const newList: LocalList = {
      id,
      title: listForm.title,
      type: listForm.type,
      ownerId,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      version: 1,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      // Include all fields from List
      items: [],
      owner: null as any, // Will be populated from backend or left null for offline-only
      shares: [],
    }

    // Optimistically add to IndexedDB
    await db.lists.add(newList)

    // Add to sync queue
    await this.addToSyncQueue(OperationType.CREATE, id, newList, 1, now)

    // Update sync status
    this.syncStatus$.next(SyncStatus.PENDING)

    return id
  }

  /**
   * Update an existing list with optimistic update
   * @param id List ID
   * @param updates Partial list data to update
   */
  async updateList(id: string, updates: Partial<Pick<LocalList, 'title' | 'type'>>): Promise<void> {
    const existingList = await db.lists.get(id)

    if (!existingList) {
      throw new Error(`List with id ${id} not found`)
    }

    const now = Date.now()
    const newVersion = existingList.version + 1

    const updatedList: LocalList = {
      ...existingList,
      ...updates,
      version: newVersion,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      updatedAt: new Date(now).toISOString(),
    }

    // Optimistically update in IndexedDB
    await db.lists.put(updatedList)

    // Add to sync queue
    await this.addToSyncQueue(OperationType.UPDATE, id, updatedList, newVersion, now)

    // Update sync status
    this.syncStatus$.next(SyncStatus.PENDING)
  }

  /**
   * Delete a list with optimistic update
   * @param id List ID
   */
  async deleteList(id: string): Promise<void> {
    const existingList = await db.lists.get(id)

    if (!existingList) {
      throw new Error(`List with id ${id} not found`)
    }

    const now = Date.now()
    const newVersion = existingList.version + 1

    // Optimistically delete from IndexedDB
    await db.lists.delete(id)

    // Delete all associated items
    await db.listItems.where('listId').equals(id).delete()

    // Add to sync queue
    await this.addToSyncQueue(OperationType.DELETE, id, { id }, newVersion, now)

    // Update sync status
    this.syncStatus$.next(SyncStatus.PENDING)
  }

  /**
   * Update sync status for a list
   * @param id List ID
   * @param status New sync status
   */
  async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
    const list = await db.lists.get(id)
    if (list) {
      await db.lists.update(id, { syncStatus: status })
    }
  }

  /**
   * Bulk update lists from server sync
   * Used by sync service to update local data with server response
   * @param lists Lists from server
   */
  async bulkUpdateFromSync(lists: LocalList[]): Promise<void> {
    await db.transaction('rw', db.lists, async () => {
      for (const list of lists) {
        await db.lists.put(list)
      }
    })
  }

  /**
   * Add operation to sync queue
   * @private
   */
  private async addToSyncQueue(
    operationType: OperationType,
    entityId: string,
    data: any,
    version: number,
    timestamp: number
  ): Promise<void> {
    await db.syncOperations.add({
      entityType: 'list',
      entityId,
      operationType,
      version,
      timestamp,
      data,
      retryCount: 0,
    })
  }

  /**
   * Clear all lists (for logout/testing)
   */
  async clearAll(): Promise<void> {
    await db.lists.clear()
    await db.listItems.clear()
    this.syncStatus$.next(SyncStatus.SYNCED)
  }
}

// Export singleton instance
export const listRxService = ListRxService.getInstance()

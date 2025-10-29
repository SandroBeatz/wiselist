import { BehaviorSubject, Observable, from, shareReplay } from 'rxjs'
import { liveQuery } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import { db, OperationType, SyncStatus } from '@shared/db'
import type { LocalListItem } from '@shared/db'

/**
 * ListItemRxService - Reactive list item service with RxJS and Dexie live queries
 *
 * Features:
 * - Real-time list item updates via Dexie liveQuery
 * - Optimistic UI updates
 * - Automatic sync queue management
 * - Observable-based API for reactive components
 * - Instant toggle feedback
 *
 * Usage:
 * ```typescript
 * const itemService = ListItemRxService.getInstance()
 * itemService.getListItems$('list-id').subscribe(items => console.log(items))
 * await itemService.createListItem('list-id', 'Buy milk')
 * await itemService.toggleListItem('item-id', true)
 * ```
 */
export class ListItemRxService {
  private static instance: ListItemRxService | null = null

  // BehaviorSubject for sync status
  private syncStatus$ = new BehaviorSubject<SyncStatus>('SYNCED' as SyncStatus)

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ListItemRxService {
    if (!ListItemRxService.instance) {
      ListItemRxService.instance = new ListItemRxService()
    }
    return ListItemRxService.instance
  }

  /**
   * Get observable of items for a specific list
   * Automatically updates when IndexedDB changes
   * @param listId List ID to filter items
   */
  getListItems$(listId: string): Observable<LocalListItem[]> {
    return from(
      liveQuery(() =>
        db.listItems
          .where('listId')
          .equals(listId)
          .sortBy('localTimestamp')
      )
    ).pipe(
      shareReplay(1) // Cache latest value for new subscribers
    )
  }

  /**
   * Get observable of a single list item by ID
   * @param id List item ID
   */
  getListItem$(id: string): Observable<LocalListItem | undefined> {
    return from(
      liveQuery(() => db.listItems.get(id))
    ).pipe(
      shareReplay(1)
    )
  }

  /**
   * Get observable of items by checked status
   * @param listId List ID
   * @param checked Filter by checked status
   */
  getItemsByStatus$(listId: string, checked: boolean): Observable<LocalListItem[]> {
    return from(
      liveQuery(() =>
        db.listItems
          .where('listId')
          .equals(listId)
          .filter(item => item.checked === checked)
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
   * Create a new list item with optimistic update
   * @param listId List ID
   * @param content Item content
   * @returns Created item ID
   */
  async createListItem(listId: string, content: string): Promise<string> {
    const id = uuidv4()
    const now = Date.now()

    const newItem: LocalListItem = {
      id,
      content,
      checked: false,
      listId,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      version: 1,
      syncStatus: 'PENDING',
      localTimestamp: now,
    }

    // Optimistically add to IndexedDB
    await db.listItems.add(newItem)

    // Add to sync queue
    await this.addToSyncQueue('CREATE', id, newItem, 1, now)

    // Update sync status
    this.syncStatus$.next('PENDING')

    return id
  }

  /**
   * Toggle list item checked status with optimistic update
   * Provides instant feedback to the user
   * @param id Item ID
   * @param checked New checked status
   */
  async toggleListItem(id: string, checked: boolean): Promise<void> {
    const existingItem = await db.listItems.get(id)

    if (!existingItem) {
      throw new Error(`ListItem with id ${id} not found`)
    }

    const now = Date.now()
    const newVersion = existingItem.version + 1

    const updatedItem: LocalListItem = {
      ...existingItem,
      checked,
      version: newVersion,
      syncStatus: 'PENDING',
      localTimestamp: now,
      updatedAt: new Date(now).toISOString(),
    }

    // Optimistically update in IndexedDB
    await db.listItems.put(updatedItem)

    // Add to sync queue
    await this.addToSyncQueue('UPDATE', id, updatedItem, newVersion, now)

    // Update sync status
    this.syncStatus$.next('PENDING')
  }

  /**
   * Update list item content with optimistic update
   * @param id Item ID
   * @param content New content
   */
  async updateListItem(id: string, content: string): Promise<void> {
    const existingItem = await db.listItems.get(id)

    if (!existingItem) {
      throw new Error(`ListItem with id ${id} not found`)
    }

    const now = Date.now()
    const newVersion = existingItem.version + 1

    const updatedItem: LocalListItem = {
      ...existingItem,
      content,
      version: newVersion,
      syncStatus: 'PENDING',
      localTimestamp: now,
      updatedAt: new Date(now).toISOString(),
    }

    // Optimistically update in IndexedDB
    await db.listItems.put(updatedItem)

    // Add to sync queue
    await this.addToSyncQueue('UPDATE', id, updatedItem, newVersion, now)

    // Update sync status
    this.syncStatus$.next('PENDING')
  }

  /**
   * Delete a list item with optimistic update
   * @param id Item ID
   */
  async deleteListItem(id: string): Promise<void> {
    const existingItem = await db.listItems.get(id)

    if (!existingItem) {
      throw new Error(`ListItem with id ${id} not found`)
    }

    const now = Date.now()
    const newVersion = existingItem.version + 1

    // Optimistically delete from IndexedDB
    await db.listItems.delete(id)

    // Add to sync queue
    await this.addToSyncQueue('DELETE', id, { id }, newVersion, now)

    // Update sync status
    this.syncStatus$.next('PENDING')
  }

  /**
   * Update sync status for a list item
   * @param id Item ID
   * @param status New sync status
   */
  async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
    const item = await db.listItems.get(id)
    if (item) {
      await db.listItems.update(id, { syncStatus: status })
    }
  }

  /**
   * Bulk update items from server sync
   * Used by sync service to update local data with server response
   * @param items Items from server
   */
  async bulkUpdateFromSync(items: LocalListItem[]): Promise<void> {
    await db.transaction('rw', db.listItems, async () => {
      for (const item of items) {
        await db.listItems.put(item)
      }
    })
  }

  /**
   * Delete all items for a specific list
   * Used when list is deleted
   * @param listId List ID
   */
  async deleteAllItemsForList(listId: string): Promise<void> {
    await db.listItems.where('listId').equals(listId).delete()
  }

  /**
   * Get count of items for a list
   * @param listId List ID
   * @returns Item count
   */
  async getItemCount(listId: string): Promise<number> {
    return await db.listItems.where('listId').equals(listId).count()
  }

  /**
   * Get count of checked items for a list
   * @param listId List ID
   * @returns Checked item count
   */
  async getCheckedItemCount(listId: string): Promise<number> {
    return await db.listItems
      .where('listId')
      .equals(listId)
      .filter(item => item.checked)
      .count()
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
      entityType: 'listItem',
      entityId,
      operationType,
      version,
      timestamp,
      data,
      retryCount: 0,
    })
  }

  /**
   * Clear all items (for logout/testing)
   */
  async clearAll(): Promise<void> {
    await db.listItems.clear()
    this.syncStatus$.next('SYNCED')
  }
}

// Export singleton instance
export const listItemRxService = ListItemRxService.getInstance()

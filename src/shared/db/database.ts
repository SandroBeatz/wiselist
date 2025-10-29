import Dexie, { type Table } from 'dexie'
import type {
  LocalList,
  LocalListItem,
  SyncOperation,
} from './types'

/**
 * WiselistDatabase - IndexedDB wrapper using Dexie
 *
 * This database provides offline-first storage for the Wiselist application.
 * It stores lists, list items, and sync operations for later synchronization
 * with the backend server.
 *
 * Tables:
 * - lists: User's shopping/todo lists with sync metadata
 * - listItems: Items within lists with sync metadata
 * - syncOperations: Queue of pending operations to sync with server
 */
export class WiselistDatabase extends Dexie {
  // Table declarations
  lists!: Table<LocalList, string>
  listItems!: Table<LocalListItem, string>
  syncOperations!: Table<SyncOperation, number>

  constructor() {
    super('WiselistDB')

    // Define database schema
    // Syntax: 'primaryKey, index1, index2, ...'
    this.version(1).stores({
      // Lists table with indexes for efficient queries
      lists: 'id, ownerId, syncStatus, localTimestamp',

      // ListItems table with compound index for list-specific queries
      listItems: 'id, listId, syncStatus, localTimestamp, [listId+syncStatus]',

      // SyncOperations table with auto-increment primary key
      syncOperations: '++id, entityType, entityId, timestamp, [entityType+entityId]',
    })
  }

  /**
   * Clear all data from the database
   * Useful for logout or testing
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.lists.clear(),
      this.listItems.clear(),
      this.syncOperations.clear(),
    ])
  }

  /**
   * Get database size in bytes (approximate)
   */
  async getSize(): Promise<number> {
    const listsCount = await this.lists.count()
    const itemsCount = await this.listItems.count()
    const operationsCount = await this.syncOperations.count()

    // Rough estimate: 1KB per list, 500B per item, 200B per operation
    return (listsCount * 1024) + (itemsCount * 512) + (operationsCount * 200)
  }

  /**
   * Check if database is empty
   */
  async isEmpty(): Promise<boolean> {
    const listsCount = await this.lists.count()
    return listsCount === 0
  }
}

// Singleton database instance
export const db = new WiselistDatabase()

// Export types for convenience
export * from './types'

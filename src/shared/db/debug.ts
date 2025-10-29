import { db } from './database'
import type { LocalList, LocalListItem, SyncOperation } from './types'

/**
 * Debug utilities for development
 * These functions should NOT be used in production
 */

interface DatabaseExport {
  version: number
  timestamp: number
  lists: LocalList[]
  listItems: LocalListItem[]
  syncOperations: SyncOperation[]
}

/**
 * Export entire database to JSON
 * Useful for debugging and backing up test data
 */
export async function exportDatabaseToJSON(): Promise<string> {
  try {
    const [lists, listItems, syncOperations] = await Promise.all([
      db.lists.toArray(),
      db.listItems.toArray(),
      db.syncOperations.toArray(),
    ])

    const exportData: DatabaseExport = {
      version: 1,
      timestamp: Date.now(),
      lists,
      listItems,
      syncOperations,
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    console.error('[DB Debug] Failed to export database:', error)
    throw error
  }
}

/**
 * Import database from JSON
 * WARNING: This will clear existing data
 */
export async function importDatabaseFromJSON(jsonString: string): Promise<void> {
  try {
    const data: DatabaseExport = JSON.parse(jsonString)

    // Clear existing data
    await db.clearAll()

    // Import data
    await Promise.all([
      db.lists.bulkAdd(data.lists),
      db.listItems.bulkAdd(data.listItems),
      db.syncOperations.bulkAdd(data.syncOperations),
    ])

    console.log('[DB Debug] Database imported successfully')
  } catch (error) {
    console.error('[DB Debug] Failed to import database:', error)
    throw error
  }
}

/**
 * Log current database state to console
 * Useful for debugging
 */
export async function logDatabaseState(): Promise<void> {
  try {
    const [lists, listItems, syncOperations] = await Promise.all([
      db.lists.toArray(),
      db.listItems.toArray(),
      db.syncOperations.toArray(),
    ])

    console.group('📊 Database State')
    console.log('Lists:', lists)
    console.log('List Items:', listItems)
    console.log('Sync Operations:', syncOperations)
    console.groupEnd()
  } catch (error) {
    console.error('[DB Debug] Failed to log database state:', error)
  }
}

/**
 * Download database as JSON file
 * Useful for debugging on mobile devices
 */
export async function downloadDatabaseAsFile(): Promise<void> {
  try {
    const json = await exportDatabaseToJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wiselist-db-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('[DB Debug] Database downloaded successfully')
  } catch (error) {
    console.error('[DB Debug] Failed to download database:', error)
    throw error
  }
}

/**
 * Seed database with mock data
 * Useful for testing and development
 */
export async function seedMockData(): Promise<void> {
  try {
    const mockLists: LocalList[] = [
      {
        id: 'mock-list-1',
        title: 'Grocery Shopping',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 1,
        syncStatus: 'SYNCED',
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mock-list-2',
        title: 'Weekend Tasks',
        type: 'TODO',
        ownerId: 'user-1',
        version: 1,
        syncStatus: 'PENDING',
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const mockItems: LocalListItem[] = [
      {
        id: 'mock-item-1',
        listId: 'mock-list-1',
        content: 'Milk',
        checked: false,
        version: 1,
        syncStatus: 'SYNCED',
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mock-item-2',
        listId: 'mock-list-1',
        content: 'Bread',
        checked: true,
        version: 1,
        syncStatus: 'SYNCED',
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mock-item-3',
        listId: 'mock-list-2',
        content: 'Clean garage',
        checked: false,
        version: 1,
        syncStatus: 'PENDING',
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    await db.lists.bulkAdd(mockLists)
    await db.listItems.bulkAdd(mockItems)

    console.log('[DB Debug] Mock data seeded successfully')
  } catch (error) {
    console.error('[DB Debug] Failed to seed mock data:', error)
    throw error
  }
}

/**
 * Attach debug functions to window for console access
 * Only in development mode
 */
export function attachDebugToWindow(): void {
  if (import.meta.env.DEV) {
    (window as any).__dbDebug = {
      export: exportDatabaseToJSON,
      import: importDatabaseFromJSON,
      log: logDatabaseState,
      download: downloadDatabaseAsFile,
      seed: seedMockData,
      clear: () => db.clearAll(),
      stats: async () => {
        const stats = {
          lists: await db.lists.count(),
          items: await db.listItems.count(),
          operations: await db.syncOperations.count(),
        }
        console.table(stats)
        return stats
      },
    }
    console.log('🔧 Database debug tools available at: window.__dbDebug')
  }
}

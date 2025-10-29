import { db } from './database'

/**
 * Initialize the database
 * Call this on app startup to ensure the database is ready
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Open the database (Dexie will handle creation and migrations)
    await db.open()
    console.log('[DB] Database initialized successfully')
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error)
    throw error
  }
}

/**
 * Clear all data from the database
 * Useful for logout or testing scenarios
 */
export async function clearDatabase(): Promise<void> {
  try {
    await db.clearAll()
    console.log('[DB] Database cleared successfully')
  } catch (error) {
    console.error('[DB] Failed to clear database:', error)
    throw error
  }
}

/**
 * Get database storage size
 * Returns approximate size in bytes
 */
export async function getDatabaseSize(): Promise<number> {
  try {
    return await db.getSize()
  } catch (error) {
    console.error('[DB] Failed to get database size:', error)
    return 0
  }
}

/**
 * Get formatted database size
 * Returns human-readable size (e.g., "2.5 MB")
 */
export function formatDatabaseSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Check if database is empty
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  try {
    return await db.isEmpty()
  } catch (error) {
    console.error('[DB] Failed to check if database is empty:', error)
    return true
  }
}

/**
 * Get database statistics
 */
export interface DatabaseStats {
  listsCount: number
  itemsCount: number
  pendingOperations: number
  totalSize: number
  formattedSize: string
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  try {
    const [listsCount, itemsCount, pendingOperations, totalSize] = await Promise.all([
      db.lists.count(),
      db.listItems.count(),
      db.syncOperations.count(),
      getDatabaseSize(),
    ])

    return {
      listsCount,
      itemsCount,
      pendingOperations,
      totalSize,
      formattedSize: formatDatabaseSize(totalSize),
    }
  } catch (error) {
    console.error('[DB] Failed to get database stats:', error)
    throw error
  }
}

/**
 * Close database connection
 * Use this before deleting the database
 */
export async function closeDatabase(): Promise<void> {
  try {
    db.close()
    console.log('[DB] Database closed')
  } catch (error) {
    console.error('[DB] Failed to close database:', error)
    throw error
  }
}

/**
 * Delete the entire database
 * WARNING: This will permanently delete all offline data
 */
export async function deleteDatabase(): Promise<void> {
  try {
    await closeDatabase()
    await db.delete()
    console.log('[DB] Database deleted successfully')
  } catch (error) {
    console.error('[DB] Failed to delete database:', error)
    throw error
  }
}

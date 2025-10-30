import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../database'
import {
  initializeDatabase,
  clearDatabase,
  getDatabaseSize,
  formatDatabaseSize,
  isDatabaseEmpty,
  getDatabaseStats,
  closeDatabase,
} from '../utils'
import { SyncStatus, OperationType } from '../types'
import type { LocalList, LocalListItem } from '../types'

describe('Database Utils', () => {
  beforeEach(async () => {
    await db.lists.clear()
    await db.listItems.clear()
    await db.syncOperations.clear()
  })

  afterEach(async () => {
    await db.lists.clear()
    await db.listItems.clear()
    await db.syncOperations.clear()
  })

  describe('initializeDatabase', () => {
    it('should initialize database without errors', async () => {
      await expect(initializeDatabase()).resolves.not.toThrow()
    })

    it('should log success message', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      await initializeDatabase()
      expect(consoleSpy).toHaveBeenCalledWith('[DB] Database initialized successfully')
      consoleSpy.mockRestore()
    })
  })

  describe('clearDatabase', () => {
    it('should clear all data from database', async () => {
      // Add some data
      await db.lists.add({
        id: 'test-list',
        title: 'Test',
        type: 'TODO',
        ownerId: 'user-1',
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        owner: null as any,
        shares: [],
      })

      await db.listItems.add({
        id: 'test-item',
        listId: 'test-list',
        content: 'Test',
        checked: false,
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Clear database
      await clearDatabase()

      // Verify all tables are empty
      const listsCount = await db.lists.count()
      const itemsCount = await db.listItems.count()

      expect(listsCount).toBe(0)
      expect(itemsCount).toBe(0)
    })
  })

  describe('getDatabaseSize', () => {
    it('should return 0 for empty database', async () => {
      const size = await getDatabaseSize()
      expect(size).toBe(0)
    })

    it('should calculate size based on counts', async () => {
      // Add a list (approximately 1KB)
      await db.lists.add({
        id: 'test-list',
        title: 'Test List',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        owner: null as any,
        shares: [],
      })

      const size = await getDatabaseSize()
      expect(size).toBeGreaterThan(0)
      expect(size).toBeCloseTo(1024, -2) // ~1KB with some tolerance
    })
  })

  describe('formatDatabaseSize', () => {
    it('should format 0 bytes', () => {
      expect(formatDatabaseSize(0)).toBe('0 B')
    })

    it('should format bytes', () => {
      expect(formatDatabaseSize(500)).toBe('500 B')
    })

    it('should format kilobytes', () => {
      expect(formatDatabaseSize(1024)).toBe('1 KB')
      expect(formatDatabaseSize(2048)).toBe('2 KB')
      expect(formatDatabaseSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatDatabaseSize(1048576)).toBe('1 MB')
      expect(formatDatabaseSize(2621440)).toBe('2.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatDatabaseSize(1073741824)).toBe('1 GB')
    })
  })

  describe('isDatabaseEmpty', () => {
    it('should return true for empty database', async () => {
      const isEmpty = await isDatabaseEmpty()
      expect(isEmpty).toBe(true)
    })

    it('should return false when lists exist', async () => {
      await db.lists.add({
        id: 'test-list',
        title: 'Test',
        type: 'TODO',
        ownerId: 'user-1',
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        owner: null as any,
        shares: [],
      })

      const isEmpty = await isDatabaseEmpty()
      expect(isEmpty).toBe(false)
    })
  })

  describe('getDatabaseStats', () => {
    it('should return stats for empty database', async () => {
      const stats = await getDatabaseStats()

      expect(stats).toEqual({
        listsCount: 0,
        itemsCount: 0,
        pendingOperations: 0,
        totalSize: 0,
        formattedSize: '0 B',
      })
    })

    it('should return correct stats with data', async () => {
      // Add lists
      await db.lists.bulkAdd([
        {
          id: 'list-1',
          title: 'List 1',
          type: 'SHOPPING',
          ownerId: 'user-1',
          version: 1,
          syncStatus: SyncStatus.SYNCED,
          localTimestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'list-2',
          title: 'List 2',
          type: 'TODO',
          ownerId: 'user-1',
          version: 1,
          syncStatus: SyncStatus.SYNCED,
          localTimestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      // Add items
      await db.listItems.bulkAdd([
        {
          id: 'item-1',
          listId: 'list-1',
          content: 'Item 1',
          checked: false,
          version: 1,
          syncStatus: SyncStatus.SYNCED,
          localTimestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'item-2',
          listId: 'list-1',
          content: 'Item 2',
          checked: false,
          version: 1,
          syncStatus: SyncStatus.SYNCED,
          localTimestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'item-3',
          listId: 'list-2',
          content: 'Item 3',
          checked: false,
          version: 1,
          syncStatus: SyncStatus.SYNCED,
          localTimestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      // Add sync operations
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.UPDATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      const stats = await getDatabaseStats()

      expect(stats.listsCount).toBe(2)
      expect(stats.itemsCount).toBe(3)
      expect(stats.pendingOperations).toBe(1)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.formattedSize).toMatch(/KB|MB/)
    })

    it('should include formatted size', async () => {
      const stats = await getDatabaseStats()

      expect(stats).toHaveProperty('formattedSize')
      expect(typeof stats.formattedSize).toBe('string')
    })
  })

  describe('closeDatabase', () => {
    it('should close database without errors', async () => {
      await expect(closeDatabase()).resolves.not.toThrow()
    })

    it('should log close message', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      await closeDatabase()
      expect(consoleSpy).toHaveBeenCalledWith('[DB] Database closed')
      consoleSpy.mockRestore()

      // Reopen for other tests
      await db.open()
    })
  })

  describe('Error Handling', () => {
    it('should handle getDatabaseSize error gracefully', async () => {
      // Mock error
      const originalMethod = db.lists.count
      db.lists.count = vi.fn().mockRejectedValue(new Error('Test error'))

      const size = await getDatabaseSize()
      expect(size).toBe(0)

      // Restore
      db.lists.count = originalMethod
    })

    it('should handle isDatabaseEmpty error gracefully', async () => {
      // Mock error
      const originalMethod = db.isEmpty
      db.isEmpty = vi.fn().mockRejectedValue(new Error('Test error'))

      const isEmpty = await isDatabaseEmpty()
      expect(isEmpty).toBe(true)

      // Restore
      db.isEmpty = originalMethod
    })
  })
})

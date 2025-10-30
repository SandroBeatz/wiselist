import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db, WiselistDatabase } from '../database'
import { SyncStatus, OperationType } from '../types'
import type { LocalList, LocalListItem, SyncOperation } from '../types'

describe('WiselistDatabase', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.lists.clear()
    await db.listItems.clear()
    await db.syncOperations.clear()
  })

  afterEach(async () => {
    // Clean up after each test
    await db.lists.clear()
    await db.listItems.clear()
    await db.syncOperations.clear()
  })

  describe('Database Initialization', () => {
    it('should be an instance of WiselistDatabase', () => {
      expect(db).toBeInstanceOf(WiselistDatabase)
    })

    it('should have lists table', () => {
      expect(db.lists).toBeDefined()
    })

    it('should have listItems table', () => {
      expect(db.listItems).toBeDefined()
    })

    it('should have syncOperations table', () => {
      expect(db.syncOperations).toBeDefined()
    })
  })

  describe('Lists Table', () => {
    const mockList: LocalList = {
      id: 'test-list-1',
      title: 'Test Shopping List',
      type: 'SHOPPING',
      ownerId: 'user-123',
      version: 1,
      syncStatus: SyncStatus.SYNCED,
      localTimestamp: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      owner: null as any,
      shares: [],
    }

    it('should add a list', async () => {
      await db.lists.add(mockList)

      const result = await db.lists.get('test-list-1')
      expect(result).toBeDefined()
      expect(result?.title).toBe('Test Shopping List')
      expect(result?.type).toBe('SHOPPING')
    })

    it('should get all lists', async () => {
      await db.lists.add(mockList)
      await db.lists.add({
        ...mockList,
        id: 'test-list-2',
        title: 'Another List',
      })

      const lists = await db.lists.toArray()
      expect(lists).toHaveLength(2)
    })

    it('should update a list', async () => {
      await db.lists.add(mockList)

      await db.lists.update('test-list-1', { title: 'Updated Title' })

      const result = await db.lists.get('test-list-1')
      expect(result?.title).toBe('Updated Title')
    })

    it('should delete a list', async () => {
      await db.lists.add(mockList)

      await db.lists.delete('test-list-1')

      const result = await db.lists.get('test-list-1')
      expect(result).toBeUndefined()
    })

    it('should query by ownerId', async () => {
      await db.lists.add(mockList)
      await db.lists.add({
        ...mockList,
        id: 'test-list-2',
        ownerId: 'user-456',
      })

      const userLists = await db.lists.where('ownerId').equals('user-123').toArray()
      expect(userLists).toHaveLength(1)
      expect(userLists[0].id).toBe('test-list-1')
    })

    it('should query by syncStatus', async () => {
      await db.lists.add(mockList)
      await db.lists.add({
        ...mockList,
        id: 'test-list-2',
        syncStatus: SyncStatus.PENDING,
      })

      const pendingLists = await db.lists.where('syncStatus').equals(SyncStatus.PENDING).toArray()
      expect(pendingLists).toHaveLength(1)
      expect(pendingLists[0].id).toBe('test-list-2')
    })
  })

  describe('ListItems Table', () => {
    const mockItem: LocalListItem = {
      id: 'test-item-1',
      listId: 'test-list-1',
      content: 'Buy milk',
      checked: false,
      version: 1,
      syncStatus: SyncStatus.SYNCED,
      localTimestamp: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should add a list item', async () => {
      await db.listItems.add(mockItem)

      const result = await db.listItems.get('test-item-1')
      expect(result).toBeDefined()
      expect(result?.content).toBe('Buy milk')
      expect(result?.checked).toBe(false)
    })

    it('should query items by listId', async () => {
      await db.listItems.add(mockItem)
      await db.listItems.add({
        ...mockItem,
        id: 'test-item-2',
        content: 'Buy bread',
      })
      await db.listItems.add({
        ...mockItem,
        id: 'test-item-3',
        listId: 'test-list-2',
        content: 'Other list item',
      })

      const listItems = await db.listItems.where('listId').equals('test-list-1').toArray()
      expect(listItems).toHaveLength(2)
    })

    it('should update item checked status', async () => {
      await db.listItems.add(mockItem)

      await db.listItems.update('test-item-1', { checked: true })

      const result = await db.listItems.get('test-item-1')
      expect(result?.checked).toBe(true)
    })

    it('should query by compound index [listId+syncStatus]', async () => {
      await db.listItems.add(mockItem)
      await db.listItems.add({
        ...mockItem,
        id: 'test-item-2',
        syncStatus: SyncStatus.PENDING,
      })

      const pendingItems = await db.listItems
        .where('[listId+syncStatus]')
        .equals(['test-list-1', SyncStatus.PENDING])
        .toArray()

      expect(pendingItems).toHaveLength(1)
      expect(pendingItems[0].id).toBe('test-item-2')
    })

    it('should delete all items for a list', async () => {
      await db.listItems.add(mockItem)
      await db.listItems.add({
        ...mockItem,
        id: 'test-item-2',
      })

      await db.listItems.where('listId').equals('test-list-1').delete()

      const remaining = await db.listItems.toArray()
      expect(remaining).toHaveLength(0)
    })
  })

  describe('SyncOperations Table', () => {
    const mockOperation: SyncOperation = {
      entityType: 'list',
      entityId: 'test-list-1',
      operationType: OperationType.CREATE,
      version: 0,
      timestamp: Date.now(),
      data: { title: 'New List', type: 'SHOPPING' },
      retryCount: 0,
    }

    it('should add a sync operation with auto-increment id', async () => {
      const id = await db.syncOperations.add(mockOperation)

      expect(id).toBeDefined()
      expect(typeof id).toBe('number')

      const result = await db.syncOperations.get(id)
      expect(result).toBeDefined()
      expect(result?.entityType).toBe('list')
    })

    it('should get all sync operations', async () => {
      await db.syncOperations.add(mockOperation)
      await db.syncOperations.add({
        ...mockOperation,
        operationType: OperationType.UPDATE,
      })

      const operations = await db.syncOperations.toArray()
      expect(operations).toHaveLength(2)
    })

    it('should query by entityType', async () => {
      await db.syncOperations.add(mockOperation)
      await db.syncOperations.add({
        ...mockOperation,
        entityType: 'listItem',
        entityId: 'test-item-1',
      })

      const listOps = await db.syncOperations.where('entityType').equals('list').toArray()
      expect(listOps).toHaveLength(1)
    })

    it('should query by compound index [entityType+entityId]', async () => {
      await db.syncOperations.add(mockOperation)
      await db.syncOperations.add({
        ...mockOperation,
        operationType: OperationType.UPDATE,
      })

      const entityOps = await db.syncOperations
        .where('[entityType+entityId]')
        .equals(['list', 'test-list-1'])
        .toArray()

      expect(entityOps).toHaveLength(2)
    })

    it('should update retry count', async () => {
      const id = await db.syncOperations.add(mockOperation)

      await db.syncOperations.update(id, { retryCount: 1 })

      const result = await db.syncOperations.get(id)
      expect(result?.retryCount).toBe(1)
    })

    it('should delete operation after sync', async () => {
      const id = await db.syncOperations.add(mockOperation)

      await db.syncOperations.delete(id)

      const result = await db.syncOperations.get(id)
      expect(result).toBeUndefined()
    })

    it('should order by timestamp', async () => {
      const now = Date.now()

      await db.syncOperations.add({
        ...mockOperation,
        timestamp: now + 2000,
      })
      await db.syncOperations.add({
        ...mockOperation,
        timestamp: now,
      })
      await db.syncOperations.add({
        ...mockOperation,
        timestamp: now + 1000,
      })

      const operations = await db.syncOperations.orderBy('timestamp').toArray()

      expect(operations[0].timestamp).toBe(now)
      expect(operations[1].timestamp).toBe(now + 1000)
      expect(operations[2].timestamp).toBe(now + 2000)
    })
  })

  describe('Database Methods', () => {
    it('should clear all tables', async () => {
      // Add data to all tables
      await db.lists.add({
        id: 'test-list-1',
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
        items: [],
        owner: null as any,
        shares: [],
      })

      await db.listItems.add({
        id: 'test-item-1',
        listId: 'test-list-1',
        content: 'Test',
        checked: false,
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'test-list-1',
        operationType: OperationType.CREATE,
        version: 0,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Clear all
      await db.clearAll()

      // Verify all tables are empty
      const listsCount = await db.lists.count()
      const itemsCount = await db.listItems.count()
      const operationsCount = await db.syncOperations.count()

      expect(listsCount).toBe(0)
      expect(itemsCount).toBe(0)
      expect(operationsCount).toBe(0)
    })

    it('should check if database is empty', async () => {
      let isEmpty = await db.isEmpty()
      expect(isEmpty).toBe(true)

      await db.lists.add({
        id: 'test-list-1',
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
        items: [],
        owner: null as any,
        shares: [],
      })

      isEmpty = await db.isEmpty()
      expect(isEmpty).toBe(false)
    })

    it('should calculate approximate database size', async () => {
      const size = await db.getSize()
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Bulk Operations', () => {
    it('should bulk add lists', async () => {
      const lists: LocalList[] = [
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
          items: [],
          owner: null as any,
          shares: [],
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
          items: [],
          owner: null as any,
          shares: [],
        },
      ]

      await db.lists.bulkAdd(lists)

      const count = await db.lists.count()
      expect(count).toBe(2)
    })

    it('should bulk delete items', async () => {
      const items: LocalListItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `item-${i}`,
        listId: 'list-1',
        content: `Item ${i}`,
        checked: false,
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      await db.listItems.bulkAdd(items)

      const idsToDelete = ['item-0', 'item-2', 'item-4']
      await db.listItems.bulkDelete(idsToDelete)

      const remaining = await db.listItems.count()
      expect(remaining).toBe(2)
    })
  })
})

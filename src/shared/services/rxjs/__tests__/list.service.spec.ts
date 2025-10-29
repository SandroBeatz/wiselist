import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { firstValueFrom, take } from 'rxjs'
import { ListRxService } from '../list.service'
import { db } from '@shared/db'
import { SyncStatus, OperationType } from '@shared/db/types'
import type { LocalList } from '@shared/db'

describe('ListRxService', () => {
  let service: ListRxService

  beforeEach(async () => {
    // Clear database before each test
    await db.clearAll()

    // Get service instance
    service = ListRxService.getInstance()
  })

  afterEach(async () => {
    // Clean up after each test
    await db.clearAll()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ListRxService.getInstance()
      const instance2 = ListRxService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('getLists$', () => {
    it('should emit empty array when no lists exist', async () => {
      const lists = await firstValueFrom(service.getLists$())

      expect(lists).toEqual([])
    })

    it('should emit lists from database', async () => {
      // Add test lists directly to DB
      const mockList: LocalList = {
        id: 'list-1',
        title: 'Groceries',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await db.lists.add(mockList)

      // Wait for liveQuery to emit
      await new Promise(resolve => setTimeout(resolve, 50))

      const lists = await firstValueFrom(service.getLists$())

      expect(lists).toHaveLength(1)
      expect(lists[0].title).toBe('Groceries')
    })

    it('should emit updated lists when database changes', async () => {
      const emissions: LocalList[][] = []

      // Subscribe to lists
      const subscription = service.getLists$().subscribe(lists => {
        emissions.push(lists)
      })

      // Wait for initial emission
      await new Promise(resolve => setTimeout(resolve, 50))

      // Add a list
      await service.createList({ title: 'Test List', type: 'TODO' }, 'user-1')

      // Wait for emission
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify emissions
      expect(emissions.length).toBeGreaterThanOrEqual(2)
      expect(emissions[0]).toEqual([]) // Initial empty
      expect(emissions[emissions.length - 1]).toHaveLength(1) // After create

      subscription.unsubscribe()
    })
  })

  describe('getList$', () => {
    it('should emit undefined for non-existent list', async () => {
      const list = await firstValueFrom(service.getList$('non-existent'))

      expect(list).toBeUndefined()
    })

    it('should emit single list by ID', async () => {
      await service.createList({ title: 'Test List', type: 'SHOPPING' }, 'user-1')

      // Get all lists to find the ID
      const lists = await firstValueFrom(service.getLists$())
      const listId = lists[0].id

      const list = await firstValueFrom(service.getList$(listId))

      expect(list).toBeDefined()
      expect(list?.title).toBe('Test List')
    })
  })

  describe('getListsByOwner$', () => {
    it('should emit lists filtered by owner', async () => {
      await service.createList({ title: 'User 1 List', type: 'SHOPPING' }, 'user-1')
      await service.createList({ title: 'User 2 List', type: 'TODO' }, 'user-2')

      const user1Lists = await firstValueFrom(service.getListsByOwner$('user-1'))

      expect(user1Lists).toHaveLength(1)
      expect(user1Lists[0].title).toBe('User 1 List')
    })
  })

  describe('createList', () => {
    it('should create a new list in database', async () => {
      const listId = await service.createList(
        { title: 'Shopping List', type: 'SHOPPING' },
        'user-1'
      )

      expect(listId).toBeDefined()
      expect(typeof listId).toBe('string')

      const list = await db.lists.get(listId)
      expect(list).toBeDefined()
      expect(list?.title).toBe('Shopping List')
      expect(list?.type).toBe('SHOPPING')
      expect(list?.ownerId).toBe('user-1')
    })

    it('should set initial version to 1', async () => {
      const listId = await service.createList({ title: 'Test', type: 'TODO' }, 'user-1')

      const list = await db.lists.get(listId)
      expect(list?.version).toBe(1)
    })

    it('should set syncStatus to PENDING', async () => {
      const listId = await service.createList({ title: 'Test', type: 'TODO' }, 'user-1')

      const list = await db.lists.get(listId)
      expect(list?.syncStatus).toBe(SyncStatus.PENDING)
    })

    it('should add CREATE operation to sync queue', async () => {
      const listId = await service.createList({ title: 'Test', type: 'TODO' }, 'user-1')

      const operations = await db.syncOperations
        .where('entityId')
        .equals(listId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.CREATE)
      expect(operations[0].entityType).toBe('list')
    })

    it('should update sync status observable', async () => {
      await service.createList({ title: 'Test', type: 'TODO' }, 'user-1')

      const status = await firstValueFrom(service.getSyncStatus$())
      expect(status).toBe(SyncStatus.PENDING)
    })
  })

  describe('updateList', () => {
    it('should update list title', async () => {
      const listId = await service.createList({ title: 'Original', type: 'SHOPPING' }, 'user-1')

      await service.updateList(listId, { title: 'Updated' })

      const list = await db.lists.get(listId)
      expect(list?.title).toBe('Updated')
    })

    it('should update list type', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      await service.updateList(listId, { type: 'TODO' })

      const list = await db.lists.get(listId)
      expect(list?.type).toBe('TODO')
    })

    it('should increment version', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      const beforeUpdate = await db.lists.get(listId)
      const versionBefore = beforeUpdate?.version || 0

      await service.updateList(listId, { title: 'Updated' })

      const afterUpdate = await db.lists.get(listId)
      expect(afterUpdate?.version).toBe(versionBefore + 1)
    })

    it('should set syncStatus to PENDING', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      // Mark as synced first
      await db.lists.update(listId, { syncStatus: SyncStatus.SYNCED })

      await service.updateList(listId, { title: 'Updated' })

      const list = await db.lists.get(listId)
      expect(list?.syncStatus).toBe(SyncStatus.PENDING)
    })

    it('should add UPDATE operation to sync queue', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      // Clear existing operations
      await db.syncOperations.clear()

      await service.updateList(listId, { title: 'Updated' })

      const operations = await db.syncOperations
        .where('entityId')
        .equals(listId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.UPDATE)
    })

    it('should throw error for non-existent list', async () => {
      await expect(
        service.updateList('non-existent', { title: 'Updated' })
      ).rejects.toThrow('List with id non-existent not found')
    })
  })

  describe('deleteList', () => {
    it('should delete list from database', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      await service.deleteList(listId)

      const list = await db.lists.get(listId)
      expect(list).toBeUndefined()
    })

    it('should add DELETE operation to sync queue', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      // Clear existing operations
      await db.syncOperations.clear()

      await service.deleteList(listId)

      const operations = await db.syncOperations
        .where('entityId')
        .equals(listId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.DELETE)
    })

    it('should delete all associated items', async () => {
      const listId = await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      // Add items directly to DB
      await db.listItems.add({
        id: 'item-1',
        listId,
        content: 'Item 1',
        checked: false,
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await service.deleteList(listId)

      const items = await db.listItems.where('listId').equals(listId).toArray()
      expect(items).toHaveLength(0)
    })

    it('should throw error for non-existent list', async () => {
      await expect(
        service.deleteList('non-existent')
      ).rejects.toThrow('List with id non-existent not found')
    })
  })

  describe('bulkUpdateFromSync', () => {
    it('should update multiple lists from sync', async () => {
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
      ]

      await service.bulkUpdateFromSync(lists)

      const dbLists = await db.lists.toArray()
      expect(dbLists).toHaveLength(2)
    })
  })

  describe('clearAll', () => {
    it('should clear all lists and items', async () => {
      await service.createList({ title: 'Test 1', type: 'SHOPPING' }, 'user-1')
      await service.createList({ title: 'Test 2', type: 'TODO' }, 'user-1')

      await service.clearAll()

      const lists = await db.lists.toArray()
      const items = await db.listItems.toArray()

      expect(lists).toHaveLength(0)
      expect(items).toHaveLength(0)
    })

    it('should reset sync status to SYNCED', async () => {
      await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')
      await service.clearAll()

      const status = await firstValueFrom(service.getSyncStatus$())
      expect(status).toBe(SyncStatus.SYNCED)
    })
  })

  describe('Observable Behavior', () => {
    it('should share latest value with new subscribers', async () => {
      await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')

      // First subscriber
      const lists1 = await firstValueFrom(service.getLists$())

      // Second subscriber (should get cached value)
      const lists2 = await firstValueFrom(service.getLists$())

      expect(lists1).toEqual(lists2)
      expect(lists1).toHaveLength(1)
    })

    it('should not create memory leaks', async () => {
      const subscriptions = []

      // Create multiple subscriptions
      for (let i = 0; i < 10; i++) {
        const sub = service.getLists$().subscribe()
        subscriptions.push(sub)
      }

      // Unsubscribe all
      subscriptions.forEach(sub => sub.unsubscribe())

      // Service should still work
      await service.createList({ title: 'Test', type: 'SHOPPING' }, 'user-1')
      const lists = await firstValueFrom(service.getLists$())

      expect(lists).toHaveLength(1)
    })
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { firstValueFrom } from 'rxjs'
import { ListItemRxService } from '../list-item.service'
import { db } from '@shared/db'
import { SyncStatus, OperationType } from '@shared/db/types'
import type { LocalListItem } from '@shared/db'

describe('ListItemRxService', () => {
  let service: ListItemRxService
  const testListId = 'test-list-1'

  beforeEach(async () => {
    // Clear database before each test
    await db.clearAll()

    // Get service instance
    service = ListItemRxService.getInstance()

    // Create a test list
    await db.lists.add({
      id: testListId,
      title: 'Test List',
      type: 'SHOPPING',
      ownerId: 'user-1',
      version: 1,
      syncStatus: SyncStatus.SYNCED,
      localTimestamp: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  afterEach(async () => {
    // Clean up after each test
    await db.clearAll()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ListItemRxService.getInstance()
      const instance2 = ListItemRxService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('getListItems$', () => {
    it('should emit empty array when no items exist', async () => {
      const items = await firstValueFrom(service.getListItems$(testListId))

      expect(items).toEqual([])
    })

    it('should emit items for specific list', async () => {
      // Add items for test list
      await service.createListItem(testListId, 'Buy milk')
      await service.createListItem(testListId, 'Buy bread')

      // Add item for different list
      await service.createListItem('other-list', 'Other item')

      const items = await firstValueFrom(service.getListItems$(testListId))

      expect(items).toHaveLength(2)
      expect(items.every(item => item.listId === testListId)).toBe(true)
    })

    it('should emit updated items when database changes', async () => {
      const emissions: LocalListItem[][] = []

      // Subscribe to items
      const subscription = service.getListItems$(testListId).subscribe(items => {
        emissions.push(items)
      })

      // Wait for initial emission
      await new Promise(resolve => setTimeout(resolve, 50))

      // Add an item
      await service.createListItem(testListId, 'Test Item')

      // Wait for emission
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify emissions
      expect(emissions.length).toBeGreaterThanOrEqual(2)
      expect(emissions[0]).toEqual([]) // Initial empty
      expect(emissions[emissions.length - 1]).toHaveLength(1) // After create

      subscription.unsubscribe()
    })
  })

  describe('getListItem$', () => {
    it('should emit undefined for non-existent item', async () => {
      const item = await firstValueFrom(service.getListItem$('non-existent'))

      expect(item).toBeUndefined()
    })

    it('should emit single item by ID', async () => {
      const itemId = await service.createListItem(testListId, 'Test Item')

      const item = await firstValueFrom(service.getListItem$(itemId))

      expect(item).toBeDefined()
      expect(item?.content).toBe('Test Item')
    })
  })

  describe('getItemsByStatus$', () => {
    it('should filter items by checked status', async () => {
      const item1Id = await service.createListItem(testListId, 'Item 1')
      const item2Id = await service.createListItem(testListId, 'Item 2')
      const item3Id = await service.createListItem(testListId, 'Item 3')

      // Check item2
      await service.toggleListItem(item2Id, true)

      const checkedItems = await firstValueFrom(service.getItemsByStatus$(testListId, true))
      const uncheckedItems = await firstValueFrom(service.getItemsByStatus$(testListId, false))

      expect(checkedItems).toHaveLength(1)
      expect(checkedItems[0].id).toBe(item2Id)
      expect(uncheckedItems).toHaveLength(2)
    })
  })

  describe('createListItem', () => {
    it('should create a new item in database', async () => {
      const itemId = await service.createListItem(testListId, 'Buy milk')

      expect(itemId).toBeDefined()
      expect(typeof itemId).toBe('string')

      const item = await db.listItems.get(itemId)
      expect(item).toBeDefined()
      expect(item?.content).toBe('Buy milk')
      expect(item?.listId).toBe(testListId)
    })

    it('should set initial checked to false', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      const item = await db.listItems.get(itemId)
      expect(item?.checked).toBe(false)
    })

    it('should set initial version to 1', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      const item = await db.listItems.get(itemId)
      expect(item?.version).toBe(1)
    })

    it('should set syncStatus to PENDING', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      const item = await db.listItems.get(itemId)
      expect(item?.syncStatus).toBe(SyncStatus.PENDING)
    })

    it('should add CREATE operation to sync queue', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      const operations = await db.syncOperations
        .where('entityId')
        .equals(itemId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.CREATE)
      expect(operations[0].entityType).toBe('listItem')
    })

    it('should update sync status observable', async () => {
      await service.createListItem(testListId, 'Test')

      const status = await firstValueFrom(service.getSyncStatus$())
      expect(status).toBe(SyncStatus.PENDING)
    })
  })

  describe('toggleListItem', () => {
    it('should toggle item to checked', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      await service.toggleListItem(itemId, true)

      const item = await db.listItems.get(itemId)
      expect(item?.checked).toBe(true)
    })

    it('should toggle item to unchecked', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      await service.toggleListItem(itemId, true)
      await service.toggleListItem(itemId, false)

      const item = await db.listItems.get(itemId)
      expect(item?.checked).toBe(false)
    })

    it('should increment version', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      const beforeToggle = await db.listItems.get(itemId)
      const versionBefore = beforeToggle?.version || 0

      await service.toggleListItem(itemId, true)

      const afterToggle = await db.listItems.get(itemId)
      expect(afterToggle?.version).toBe(versionBefore + 1)
    })

    it('should set syncStatus to PENDING', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      // Mark as synced first
      await db.listItems.update(itemId, { syncStatus: SyncStatus.SYNCED })

      await service.toggleListItem(itemId, true)

      const item = await db.listItems.get(itemId)
      expect(item?.syncStatus).toBe(SyncStatus.PENDING)
    })

    it('should add UPDATE operation to sync queue', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      // Clear existing operations
      await db.syncOperations.clear()

      await service.toggleListItem(itemId, true)

      const operations = await db.syncOperations
        .where('entityId')
        .equals(itemId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.UPDATE)
    })

    it('should throw error for non-existent item', async () => {
      await expect(
        service.toggleListItem('non-existent', true)
      ).rejects.toThrow('ListItem with id non-existent not found')
    })

    it('should provide instant feedback (optimistic update)', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      // Toggle and immediately check (no await for sync)
      const togglePromise = service.toggleListItem(itemId, true)

      // Small delay to allow optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      const item = await db.listItems.get(itemId)
      expect(item?.checked).toBe(true)

      await togglePromise
    })
  })

  describe('updateListItem', () => {
    it('should update item content', async () => {
      const itemId = await service.createListItem(testListId, 'Original')

      await service.updateListItem(itemId, 'Updated')

      const item = await db.listItems.get(itemId)
      expect(item?.content).toBe('Updated')
    })

    it('should increment version', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      const beforeUpdate = await db.listItems.get(itemId)
      const versionBefore = beforeUpdate?.version || 0

      await service.updateListItem(itemId, 'Updated')

      const afterUpdate = await db.listItems.get(itemId)
      expect(afterUpdate?.version).toBe(versionBefore + 1)
    })

    it('should set syncStatus to PENDING', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      // Mark as synced first
      await db.listItems.update(itemId, { syncStatus: SyncStatus.SYNCED })

      await service.updateListItem(itemId, 'Updated')

      const item = await db.listItems.get(itemId)
      expect(item?.syncStatus).toBe(SyncStatus.PENDING)
    })

    it('should add UPDATE operation to sync queue', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      // Clear existing operations
      await db.syncOperations.clear()

      await service.updateListItem(itemId, 'Updated')

      const operations = await db.syncOperations
        .where('entityId')
        .equals(itemId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.UPDATE)
    })

    it('should throw error for non-existent item', async () => {
      await expect(
        service.updateListItem('non-existent', 'Updated')
      ).rejects.toThrow('ListItem with id non-existent not found')
    })
  })

  describe('deleteListItem', () => {
    it('should delete item from database', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      await service.deleteListItem(itemId)

      const item = await db.listItems.get(itemId)
      expect(item).toBeUndefined()
    })

    it('should add DELETE operation to sync queue', async () => {
      const itemId = await service.createListItem(testListId, 'Test')

      // Clear existing operations
      await db.syncOperations.clear()

      await service.deleteListItem(itemId)

      const operations = await db.syncOperations
        .where('entityId')
        .equals(itemId)
        .toArray()

      expect(operations).toHaveLength(1)
      expect(operations[0].operationType).toBe(OperationType.DELETE)
    })

    it('should throw error for non-existent item', async () => {
      await expect(
        service.deleteListItem('non-existent')
      ).rejects.toThrow('ListItem with id non-existent not found')
    })
  })

  describe('bulkUpdateFromSync', () => {
    it('should update multiple items from sync', async () => {
      const items: LocalListItem[] = [
        {
          id: 'item-1',
          listId: testListId,
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
          listId: testListId,
          content: 'Item 2',
          checked: true,
          version: 1,
          syncStatus: SyncStatus.SYNCED,
          localTimestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      await service.bulkUpdateFromSync(items)

      const dbItems = await db.listItems.toArray()
      expect(dbItems).toHaveLength(2)
    })
  })

  describe('deleteAllItemsForList', () => {
    it('should delete all items for specific list', async () => {
      await service.createListItem(testListId, 'Item 1')
      await service.createListItem(testListId, 'Item 2')
      await service.createListItem('other-list', 'Other item')

      await service.deleteAllItemsForList(testListId)

      const testListItems = await db.listItems.where('listId').equals(testListId).toArray()
      const otherListItems = await db.listItems.where('listId').equals('other-list').toArray()

      expect(testListItems).toHaveLength(0)
      expect(otherListItems).toHaveLength(1)
    })
  })

  describe('getItemCount', () => {
    it('should return correct item count for list', async () => {
      await service.createListItem(testListId, 'Item 1')
      await service.createListItem(testListId, 'Item 2')
      await service.createListItem(testListId, 'Item 3')

      const count = await service.getItemCount(testListId)

      expect(count).toBe(3)
    })

    it('should return 0 for list with no items', async () => {
      const count = await service.getItemCount(testListId)

      expect(count).toBe(0)
    })
  })

  describe('getCheckedItemCount', () => {
    it('should return correct checked item count', async () => {
      const item1Id = await service.createListItem(testListId, 'Item 1')
      const item2Id = await service.createListItem(testListId, 'Item 2')
      const item3Id = await service.createListItem(testListId, 'Item 3')

      await service.toggleListItem(item1Id, true)
      await service.toggleListItem(item2Id, true)

      const count = await service.getCheckedItemCount(testListId)

      expect(count).toBe(2)
    })

    it('should return 0 when no items are checked', async () => {
      await service.createListItem(testListId, 'Item 1')
      await service.createListItem(testListId, 'Item 2')

      const count = await service.getCheckedItemCount(testListId)

      expect(count).toBe(0)
    })
  })

  describe('clearAll', () => {
    it('should clear all items', async () => {
      await service.createListItem(testListId, 'Item 1')
      await service.createListItem(testListId, 'Item 2')

      await service.clearAll()

      const items = await db.listItems.toArray()

      expect(items).toHaveLength(0)
    })

    it('should reset sync status to SYNCED', async () => {
      await service.createListItem(testListId, 'Test')
      await service.clearAll()

      const status = await firstValueFrom(service.getSyncStatus$())
      expect(status).toBe(SyncStatus.SYNCED)
    })
  })

  describe('Observable Behavior', () => {
    it('should share latest value with new subscribers', async () => {
      await service.createListItem(testListId, 'Test')

      // First subscriber
      const items1 = await firstValueFrom(service.getListItems$(testListId))

      // Second subscriber (should get cached value)
      const items2 = await firstValueFrom(service.getListItems$(testListId))

      expect(items1).toEqual(items2)
      expect(items1).toHaveLength(1)
    })

    it('should handle multiple lists independently', async () => {
      const list1Id = 'list-1'
      const list2Id = 'list-2'

      await service.createListItem(list1Id, 'List 1 Item')
      await service.createListItem(list2Id, 'List 2 Item')

      const list1Items = await firstValueFrom(service.getListItems$(list1Id))
      const list2Items = await firstValueFrom(service.getListItems$(list2Id))

      expect(list1Items).toHaveLength(1)
      expect(list2Items).toHaveLength(1)
      expect(list1Items[0].listId).toBe(list1Id)
      expect(list2Items[0].listId).toBe(list2Id)
    })

    it('should not create memory leaks', async () => {
      const subscriptions = []

      // Create multiple subscriptions
      for (let i = 0; i < 10; i++) {
        const sub = service.getListItems$(testListId).subscribe()
        subscriptions.push(sub)
      }

      // Unsubscribe all
      subscriptions.forEach(sub => sub.unsubscribe())

      // Service should still work
      await service.createListItem(testListId, 'Test')
      const items = await firstValueFrom(service.getListItems$(testListId))

      expect(items).toHaveLength(1)
    })
  })
})

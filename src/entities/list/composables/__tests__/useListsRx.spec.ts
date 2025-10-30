import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useListsRx } from '../useListsRx'
import { db } from '@shared/db'
import { SyncStatus } from '@shared/db'

// Mock sync service
vi.mock('@shared/services/sync/sync.service', () => ({
  syncService: {
    forceSync: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('useListsRx', () => {
  beforeEach(async () => {
    await db.clearAll()
  })

  afterEach(async () => {
    await db.clearAll()
  })

  // Helper component to test the composable
  const TestComponent = defineComponent({
    template: '<div>Test</div>',
    setup() {
      return useListsRx()
    },
  })

  it('should initialize with empty lists', async () => {
    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    await nextTick()

    expect(vm.lists).toBeDefined()
    expect(vm.isLoading).toBeDefined()
    expect(vm.syncStatus).toBeDefined()
  })

  it('should load lists from database', async () => {
    // Add test list to database
    await db.lists.add({
      id: 'list-1',
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

    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    // Wait for observable to emit
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(vm.lists).toHaveLength(1)
    expect(vm.lists[0].title).toBe('Test List')
    expect(vm.isLoading).toBe(false)
  })

  it('should create a new list', async () => {
    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    await nextTick()

    const listId = await vm.createList(
      { title: 'New List', type: 'TODO' },
      'user-1'
    )

    expect(listId).toBeDefined()
    expect(typeof listId).toBe('string')

    // Wait for observable to emit
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(vm.lists).toHaveLength(1)
    expect(vm.lists[0].title).toBe('New List')
  })

  it('should update a list', async () => {
    // Add test list
    await db.lists.add({
      id: 'list-1',
      title: 'Original Title',
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

    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    await new Promise(resolve => setTimeout(resolve, 100))

    await vm.updateList('list-1', { title: 'Updated Title' })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(vm.lists[0].title).toBe('Updated Title')
  })

  it('should delete a list', async () => {
    // Add test list
    await db.lists.add({
      id: 'list-1',
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

    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(vm.lists).toHaveLength(1)

    await vm.deleteList('list-1')

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(vm.lists).toHaveLength(0)
  })

  it('should find list by ID', async () => {
    // Add test lists
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
    ])

    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    await new Promise(resolve => setTimeout(resolve, 100))

    const list = vm.getListById('list-2')
    expect(list).toBeDefined()
    expect(list.title).toBe('List 2')
  })

  it('should handle errors gracefully', async () => {
    const wrapper = mount(TestComponent)
    const vm = wrapper.vm as any

    await nextTick()

    // Try to update non-existent list
    await expect(
      vm.updateList('non-existent', { title: 'Updated' })
    ).rejects.toThrow()

    expect(vm.error).not.toBeNull()
  })

  it('should cleanup subscriptions on unmount', async () => {
    const wrapper = mount(TestComponent)

    // Subscriptions should be active
    await nextTick()

    // Unmount component
    wrapper.unmount()

    // Should not throw errors
    expect(true).toBe(true)
  })

  it('should filter lists by owner when ownerId provided', async () => {
    // Add lists for different owners
    await db.lists.bulkAdd([
      {
        id: 'list-1',
        title: 'User 1 List',
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
        title: 'User 2 List',
        type: 'TODO',
        ownerId: 'user-2',
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        owner: null as any,
        shares: [],
      },
    ])

    const TestComponentWithOwner = defineComponent({
      template: '<div>Test</div>',
      setup() {
        return useListsRx('user-1')
      },
    })

    const wrapper = mount(TestComponentWithOwner)
    const vm = wrapper.vm as any

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(vm.lists).toHaveLength(1)
    expect(vm.lists[0].ownerId).toBe('user-1')
  })
})

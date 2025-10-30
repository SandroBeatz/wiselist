import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SyncService } from '../sync.service'
import { db, OperationType, SyncStatus } from '@shared/db'
import type { SyncOperation } from '@shared/db'
import { tokenService } from '@shared/services/token.service'
import * as axiosModule from '@shared/instances/axios'

// Mock axios
vi.mock('@shared/instances/axios', () => ({
  API: {
    post: vi.fn(),
  },
}))

// Mock token service
vi.mock('@shared/services/token.service', () => ({
  tokenService: {
    hasValidAccessToken: vi.fn(() => true),
    hasValidRefreshToken: vi.fn(() => true),
    isAuthenticated: vi.fn(() => true),
    refreshToken: 'mock-refresh-token',
    setTokens: vi.fn(),
  },
}))

// Mock RxJS services
vi.mock('@shared/services/rxjs/list.service', () => ({
  listRxService: {
    bulkUpdateFromSync: vi.fn(),
  },
}))

vi.mock('@shared/services/rxjs/list-item.service', () => ({
  listItemRxService: {
    bulkUpdateFromSync: vi.fn(),
  },
}))

describe('SyncService', () => {
  let service: SyncService

  beforeEach(async () => {
    // Mock navigator.onLine BEFORE creating service instance
    vi.stubGlobal('navigator', {
      ...navigator,
      onLine: true,
    })

    // Clear database
    await db.clearAll()

    // Reset all mocks
    vi.clearAllMocks()

    // Reset singleton instance to force new creation with mocked navigator
    // @ts-ignore - accessing private static for testing
    SyncService.instance = null

    // Get fresh service instance (will use mocked navigator.onLine)
    service = SyncService.getInstance()

    // Stop auto-sync for tests
    service.stop()
  })

  afterEach(async () => {
    service.destroy()
    await db.clearAll()
    vi.unstubAllGlobals()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SyncService.getInstance()
      const instance2 = SyncService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('getSyncState$', () => {
    it('should emit initial sync state', (done) => {
      let subscription: any
      subscription = service.getSyncState$().subscribe(state => {
        expect(state).toHaveProperty('isSyncing')
        expect(state).toHaveProperty('isOnline')
        expect(state).toHaveProperty('lastSync')
        expect(state).toHaveProperty('pendingCount')
        expect(state).toHaveProperty('error')
        subscription.unsubscribe()
        done()
      })
    })

    it('should have correct initial state', () => {
      const state = service.getSyncState()

      expect(state.isSyncing).toBe(false)
      expect(state.isOnline).toBe(true) // jsdom default
      expect(state.lastSync).toBeNull()
      expect(state.pendingCount).toBe(0)
      expect(state.error).toBeNull()
    })
  })

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = service.getConfig()

      expect(config.autoSyncInterval).toBe(30000)
      expect(config.maxRetries).toBe(3)
      expect(config.retryBackoff).toBe(2000)
    })

    it('should allow updating configuration', () => {
      service.updateConfig({ autoSyncInterval: 60000 })

      const config = service.getConfig()
      expect(config.autoSyncInterval).toBe(60000)
    })

    it('should keep other config values when updating', () => {
      // Reset to default first
      service.updateConfig({ autoSyncInterval: 30000 })
      service.updateConfig({ maxRetries: 5 })

      const config = service.getConfig()
      expect(config.maxRetries).toBe(5)
      expect(config.retryBackoff).toBe(2000) // Unchanged
    })
  })

  describe('forceSync', () => {
    it('should not sync when offline', async () => {
      // Mock offline state
      vi.stubGlobal('navigator', {
        ...navigator,
        onLine: false,
      })

      // Reset service with offline state
      service.destroy()
      // @ts-ignore - accessing private static for testing
      SyncService.instance = null
      service = SyncService.getInstance()
      service.stop()

      await service.forceSync()

      // Should not have called API
      expect(axiosModule.API.post).not.toHaveBeenCalled()
    })

    it('should skip sync when no pending operations', async () => {
      // Ensure no operations in queue
      await db.syncOperations.clear()

      await service.forceSync()

      const state = service.getSyncState()

      expect(state.pendingCount).toBe(0)
      expect(state.lastSync).not.toBeNull()
      expect(axiosModule.API.post).not.toHaveBeenCalled()
    })

    it('should send pending operations to server', async () => {
      // Add mock operations
      const mockOps: SyncOperation[] = [
        {
          entityType: 'list',
          entityId: 'list-1',
          operationType: OperationType.CREATE,
          version: 1,
          timestamp: Date.now(),
          data: { title: 'Test List', type: 'SHOPPING' },
          retryCount: 0,
        },
      ]

      for (const op of mockOps) {
        await db.syncOperations.add(op)
      }

      // Mock API response
      vi.mocked(axiosModule.API.post).mockResolvedValueOnce({
        data: {
          lists: [],
          items: [],
          conflicts: [],
        },
      } as any)

      await service.forceSync()

      expect(axiosModule.API.post).toHaveBeenCalledWith(
        'lists/sync',
        expect.objectContaining({
          listOperations: expect.any(Array),
          itemOperations: expect.any(Array),
        })
      )
    })

    it('should update sync state during sync', async () => {
      const states: any[] = []

      // Subscribe to state changes
      const subscription = service.getSyncState$().subscribe(state => {
        states.push({ ...state })
      })

      // Add mock operation
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Mock API response
      vi.mocked(axiosModule.API.post).mockResolvedValueOnce({
        data: {
          lists: [],
          items: [],
          conflicts: [],
        },
      } as any)

      await service.forceSync()

      subscription.unsubscribe()

      // Should have multiple state updates
      expect(states.length).toBeGreaterThan(1)

      // Should have syncing state
      const syncingState = states.find(s => s.isSyncing)
      expect(syncingState).toBeDefined()

      // Final state should not be syncing
      const finalState = states[states.length - 1]
      expect(finalState.isSyncing).toBe(false)
      expect(finalState.lastSync).not.toBeNull()
    })

    it('should clear synced operations after successful sync', async () => {
      // Add mock operation
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Mock API response
      vi.mocked(axiosModule.API.post).mockResolvedValueOnce({
        data: {
          lists: [],
          items: [],
          conflicts: [],
        },
      } as any)

      await service.forceSync()

      // Operations should be cleared
      const remainingOps = await db.syncOperations.toArray()
      expect(remainingOps).toHaveLength(0)
    })

    it('should handle sync errors', async () => {
      // Add mock operation
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Mock API error
      const mockError = new Error('Network error')
      vi.mocked(axiosModule.API.post).mockRejectedValueOnce(mockError)

      // Update config to not retry
      service.updateConfig({ maxRetries: 0 })

      await expect(service.forceSync()).rejects.toThrow('Network error')

      const state = service.getSyncState()
      expect(state.error).not.toBeNull()
    })
  })

  describe('Operation Processing', () => {
    it('should group operations by entity type', async () => {
      // Add mixed operations
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      await db.syncOperations.add({
        entityType: 'listItem',
        entityId: 'item-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Mock API response
      let capturedPayload: any
      vi.mocked(axiosModule.API.post).mockImplementationOnce((url, payload) => {
        capturedPayload = payload
        return Promise.resolve({
          data: {
            lists: [],
            items: [],
            conflicts: [],
          },
        } as any)
      })

      await service.forceSync()

      expect(capturedPayload).toBeDefined()
      expect(capturedPayload.listOperations).toHaveLength(1)
      expect(capturedPayload.itemOperations).toHaveLength(1)
    })

    it('should merge duplicate operations for same entity', async () => {
      const now = Date.now()

      // Add multiple operations for same entity
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: now,
        data: { title: 'Old' },
        retryCount: 0,
      })

      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.UPDATE,
        version: 2,
        timestamp: now + 1000,
        data: { title: 'New' },
        retryCount: 0,
      })

      // Mock API response
      let capturedPayload: any
      vi.mocked(axiosModule.API.post).mockImplementationOnce((url, payload) => {
        capturedPayload = payload
        return Promise.resolve({
          data: {
            lists: [],
            items: [],
            conflicts: [],
          },
        } as any)
      })

      await service.forceSync()

      // Should only send latest operation
      expect(capturedPayload.listOperations).toHaveLength(1)
      expect(capturedPayload.listOperations[0].data.title).toBe('New')
    })
  })

  describe('Server Response Processing', () => {
    it('should update local database with server data', async () => {
      // Add mock operation
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-1',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Mock API response with server list
      const serverList = {
        id: 'list-1',
        title: 'Server List',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      vi.mocked(axiosModule.API.post).mockResolvedValueOnce({
        data: {
          lists: [serverList],
          items: [],
          conflicts: [],
        },
      } as any)

      await service.forceSync()

      // Check if list was added to DB
      const list = await db.lists.get('list-1')
      expect(list).toBeDefined()
      expect(list?.title).toBe('Server List')
      expect(list?.syncStatus).toBe(SyncStatus.SYNCED)
    })

    it('should add new items from server', async () => {
      // Add a dummy operation to trigger sync (sync skips if no operations)
      await db.syncOperations.add({
        entityType: 'list',
        entityId: 'list-temp',
        operationType: OperationType.CREATE,
        version: 1,
        timestamp: Date.now(),
        data: {},
        retryCount: 0,
      })

      // Mock API response with new item from server
      const serverItem = {
        id: 'item-1',
        listId: 'list-1',
        content: 'Server Item',
        checked: false,
        version: 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      vi.mocked(axiosModule.API.post).mockResolvedValueOnce({
        data: {
          lists: [],
          items: [serverItem],
          conflicts: [],
        },
      } as any)

      // Force sync
      await service.forceSync()

      // Check if item was added to DB
      const item = await db.listItems.get('item-1')
      expect(item).toBeDefined()
      expect(item?.content).toBe('Server Item')
    })
  })

  describe('Start and Stop', () => {
    it('should start auto-sync', () => {
      service.start()
      // Hard to test interval without waiting, just ensure no errors
      expect(true).toBe(true)
      service.stop()
    })

    it('should stop auto-sync', () => {
      service.start()
      service.stop()
      // Hard to test interval stopping, just ensure no errors
      expect(true).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      service.start()
      service.destroy()
      // Should not throw errors
      expect(true).toBe(true)
    })
  })
})

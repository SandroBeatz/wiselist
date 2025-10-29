import { describe, it, expect } from 'vitest'
import {
  resolveConflict,
  resolveFieldLevelConflict,
  isInConflict,
  mergeOperationsByEntity,
  getOperationPriority,
  sortOperations,
} from '../ot-resolver'
import { OperationType, SyncStatus } from '@shared/db'
import type { LocalList, LocalListItem } from '@shared/db'

describe('OT Resolver', () => {
  describe('resolveConflict', () => {
    const clientList: LocalList = {
      id: 'list-1',
      title: 'Client Title',
      type: 'SHOPPING',
      ownerId: 'user-1',
      version: 2,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: 1000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    }

    const serverList: LocalList = {
      id: 'list-1',
      title: 'Server Title',
      type: 'SHOPPING',
      ownerId: 'user-1',
      version: 3,
      syncStatus: SyncStatus.SYNCED,
      localTimestamp: 2000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    }

    it('should prioritize DELETE operation from client', () => {
      const result = resolveConflict(
        OperationType.DELETE,
        clientList,
        1000,
        serverList,
        2000
      )

      expect(result.resolved).toBeNull()
      expect(result.strategy).toBe('delete')
      expect(result.reason).toContain('DELETE')
    })

    it('should prioritize server DELETE (no server data)', () => {
      const result = resolveConflict(
        OperationType.UPDATE,
        clientList,
        1000,
        null,
        2000
      )

      expect(result.resolved).toBeNull()
      expect(result.strategy).toBe('delete')
      expect(result.reason).toContain('Server deleted')
    })

    it('should use client data when client timestamp is newer', () => {
      const result = resolveConflict(
        OperationType.UPDATE,
        clientList,
        3000, // Newer than server
        serverList,
        2000
      )

      expect(result.resolved).toEqual(clientList)
      expect(result.strategy).toBe('client')
      expect(result.reason).toContain('newer than server')
    })

    it('should use server data when server timestamp is newer', () => {
      const result = resolveConflict(
        OperationType.UPDATE,
        clientList,
        1000,
        serverList,
        2000 // Newer than client
      )

      expect(result.resolved).toEqual(serverList)
      expect(result.strategy).toBe('server')
      expect(result.reason).toContain('newer than client')
    })

    it('should use server data as tie-breaker when timestamps equal', () => {
      const result = resolveConflict(
        OperationType.UPDATE,
        clientList,
        2000,
        serverList,
        2000 // Same timestamp
      )

      expect(result.resolved).toEqual(serverList)
      expect(result.strategy).toBe('server')
      expect(result.reason).toContain('tie-breaker')
    })

    it('should handle missing client data', () => {
      const result = resolveConflict(
        OperationType.UPDATE,
        null,
        1000,
        serverList,
        2000
      )

      expect(result.resolved).toEqual(serverList)
      expect(result.strategy).toBe('server')
      expect(result.reason).toContain('No client data')
    })
  })

  describe('resolveFieldLevelConflict', () => {
    it('should merge fields based on individual timestamps', () => {
      const clientData = {
        title: 'Client Title',
        type: 'SHOPPING' as const,
        description: 'Client Description',
      }

      const serverData = {
        title: 'Server Title',
        type: 'TODO' as const,
        description: 'Server Description',
      }

      const fieldTimestamps = {
        client: {
          title: 3000, // Client title is newer
          type: 1000,
          description: 1500,
        },
        server: {
          title: 2000,
          type: 2500, // Server type is newer
          description: 2000, // Server description is newer
        },
      }

      const result = resolveFieldLevelConflict(clientData, serverData, fieldTimestamps)

      expect(result.title).toBe('Client Title') // Client newer
      expect(result.type).toBe('TODO') // Server newer
      expect(result.description).toBe('Server Description') // Server newer
    })

    it('should default to server values when timestamps are missing', () => {
      const clientData = { field1: 'client', field2: 'client' }
      const serverData = { field1: 'server', field2: 'server' }

      const fieldTimestamps = {
        client: {},
        server: {},
      }

      const result = resolveFieldLevelConflict(clientData, serverData, fieldTimestamps)

      expect(result.field1).toBe('server')
      expect(result.field2).toBe('server')
    })
  })

  describe('isInConflict', () => {
    it('should detect version mismatch', () => {
      const client: LocalList = {
        id: 'list-1',
        title: 'Title',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 2,
        syncStatus: SyncStatus.PENDING,
        localTimestamp: 1000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      const server: LocalList = {
        ...client,
        version: 3, // Different version
      }

      expect(isInConflict(client, server)).toBe(true)
    })

    it('should detect timestamp mismatch', () => {
      const client: LocalList = {
        id: 'list-1',
        title: 'Title',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 2,
        syncStatus: SyncStatus.PENDING,
        localTimestamp: 1000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      const server: LocalList = {
        ...client,
        localTimestamp: 2000, // Different timestamp
      }

      expect(isInConflict(client, server)).toBe(true)
    })

    it('should detect content difference in lists', () => {
      const client: LocalList = {
        id: 'list-1',
        title: 'Client Title',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 2,
        syncStatus: SyncStatus.PENDING,
        localTimestamp: 1000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      const server: LocalList = {
        ...client,
        title: 'Server Title', // Different title
      }

      expect(isInConflict(client, server)).toBe(true)
    })

    it('should detect content difference in list items', () => {
      const client: LocalListItem = {
        id: 'item-1',
        listId: 'list-1',
        content: 'Client Content',
        checked: false,
        version: 2,
        syncStatus: SyncStatus.PENDING,
        localTimestamp: 1000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      const server: LocalListItem = {
        ...client,
        content: 'Server Content', // Different content
      }

      expect(isInConflict(client, server)).toBe(true)
    })

    it('should not detect conflict when entities are identical', () => {
      const entity: LocalList = {
        id: 'list-1',
        title: 'Title',
        type: 'SHOPPING',
        ownerId: 'user-1',
        version: 2,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: 1000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      expect(isInConflict(entity, entity)).toBe(false)
    })
  })

  describe('mergeOperationsByEntity', () => {
    it('should keep only the latest operation per entity', () => {
      const operations = [
        { entityId: 'entity-1', timestamp: 1000, data: 'op1' },
        { entityId: 'entity-1', timestamp: 2000, data: 'op2' }, // Latest for entity-1
        { entityId: 'entity-2', timestamp: 1500, data: 'op3' },
        { entityId: 'entity-1', timestamp: 1500, data: 'op4' },
      ]

      const result = mergeOperationsByEntity(operations)

      expect(result).toHaveLength(2)
      expect(result.find(op => op.entityId === 'entity-1')?.data).toBe('op2')
      expect(result.find(op => op.entityId === 'entity-2')?.data).toBe('op3')
    })

    it('should handle empty array', () => {
      const result = mergeOperationsByEntity([])
      expect(result).toEqual([])
    })

    it('should handle single operation', () => {
      const operations = [{ entityId: 'entity-1', timestamp: 1000, data: 'op1' }]
      const result = mergeOperationsByEntity(operations)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(operations[0])
    })
  })

  describe('getOperationPriority', () => {
    it('should assign highest priority to DELETE', () => {
      expect(getOperationPriority(OperationType.DELETE)).toBe(3)
    })

    it('should assign medium priority to UPDATE', () => {
      expect(getOperationPriority(OperationType.UPDATE)).toBe(2)
    })

    it('should assign lowest priority to CREATE', () => {
      expect(getOperationPriority(OperationType.CREATE)).toBe(1)
    })

    it('should order priorities correctly', () => {
      const deletePriority = getOperationPriority(OperationType.DELETE)
      const updatePriority = getOperationPriority(OperationType.UPDATE)
      const createPriority = getOperationPriority(OperationType.CREATE)

      expect(deletePriority).toBeGreaterThan(updatePriority)
      expect(updatePriority).toBeGreaterThan(createPriority)
    })
  })

  describe('sortOperations', () => {
    it('should sort by priority (DELETE > UPDATE > CREATE)', () => {
      const operations = [
        { operationType: OperationType.CREATE, timestamp: 1000 },
        { operationType: OperationType.DELETE, timestamp: 2000 },
        { operationType: OperationType.UPDATE, timestamp: 1500 },
        { operationType: OperationType.CREATE, timestamp: 500 },
      ]

      const result = sortOperations(operations)

      expect(result[0].operationType).toBe(OperationType.DELETE)
      expect(result[1].operationType).toBe(OperationType.UPDATE)
      expect(result[2].operationType).toBe(OperationType.CREATE)
      expect(result[3].operationType).toBe(OperationType.CREATE)
    })

    it('should sort by timestamp when priorities are equal', () => {
      const operations = [
        { operationType: OperationType.CREATE, timestamp: 3000 },
        { operationType: OperationType.CREATE, timestamp: 1000 },
        { operationType: OperationType.CREATE, timestamp: 2000 },
      ]

      const result = sortOperations(operations)

      expect(result[0].timestamp).toBe(1000) // Oldest first
      expect(result[1].timestamp).toBe(2000)
      expect(result[2].timestamp).toBe(3000)
    })

    it('should handle mixed priorities and timestamps', () => {
      const operations = [
        { operationType: OperationType.CREATE, timestamp: 3000 },
        { operationType: OperationType.UPDATE, timestamp: 1000 },
        { operationType: OperationType.DELETE, timestamp: 2000 },
        { operationType: OperationType.UPDATE, timestamp: 500 },
      ]

      const result = sortOperations(operations)

      expect(result[0].operationType).toBe(OperationType.DELETE)
      expect(result[1].operationType).toBe(OperationType.UPDATE)
      expect(result[1].timestamp).toBe(500) // Oldest UPDATE first
      expect(result[2].operationType).toBe(OperationType.UPDATE)
      expect(result[2].timestamp).toBe(1000)
      expect(result[3].operationType).toBe(OperationType.CREATE)
    })

    it('should handle empty array', () => {
      const result = sortOperations([])
      expect(result).toEqual([])
    })
  })
})

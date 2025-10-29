import type { LocalList, LocalListItem, OperationType } from '@shared/db'

/**
 * Operational Transform Resolver
 *
 * Implements conflict resolution strategies for offline-first sync:
 * - Last Write Wins (LWW) based on timestamp
 * - DELETE operations always win
 * - Version-based conflict detection
 */

export interface ConflictResolutionResult<T> {
  resolved: T
  strategy: 'client' | 'server' | 'delete' | 'merge'
  reason: string
}

/**
 * Resolve conflict between client and server versions of an entity
 *
 * Strategy:
 * 1. DELETE always wins
 * 2. Higher timestamp wins (Last Write Wins)
 * 3. If timestamps equal, server wins (tie-breaker)
 *
 * @param clientOp Client operation type
 * @param clientData Client entity data
 * @param clientTimestamp Client operation timestamp
 * @param serverData Server entity data
 * @param serverTimestamp Server entity timestamp
 */
export function resolveConflict<T extends LocalList | LocalListItem>(
  clientOp: OperationType,
  clientData: T | null,
  clientTimestamp: number,
  serverData: T | null,
  serverTimestamp: number
): ConflictResolutionResult<T | null> {
  // Case 1: Client deleted the entity
  if (clientOp === 'DELETE') {
    return {
      resolved: null,
      strategy: 'delete',
      reason: 'Client DELETE operation takes precedence',
    }
  }

  // Case 2: Server deleted the entity
  if (!serverData) {
    return {
      resolved: null,
      strategy: 'delete',
      reason: 'Server deleted the entity',
    }
  }

  // Case 3: No client data (shouldn't happen in normal flow)
  if (!clientData) {
    return {
      resolved: serverData,
      strategy: 'server',
      reason: 'No client data available',
    }
  }

  // Case 4: Compare timestamps (Last Write Wins)
  if (clientTimestamp > serverTimestamp) {
    return {
      resolved: clientData,
      strategy: 'client',
      reason: `Client timestamp (${clientTimestamp}) is newer than server (${serverTimestamp})`,
    }
  } else if (serverTimestamp > clientTimestamp) {
    return {
      resolved: serverData,
      strategy: 'server',
      reason: `Server timestamp (${serverTimestamp}) is newer than client (${clientTimestamp})`,
    }
  } else {
    // Case 5: Timestamps equal - server wins as tie-breaker
    return {
      resolved: serverData,
      strategy: 'server',
      reason: 'Timestamps equal, server wins as tie-breaker',
    }
  }
}

/**
 * Resolve field-level conflicts for complex merges
 *
 * Used when both client and server have made changes to different fields.
 * Each field is resolved independently using timestamp comparison.
 *
 * @param clientData Client entity data
 * @param serverData Server entity data
 * @param fieldTimestamps Map of field names to their last update timestamp
 */
export function resolveFieldLevelConflict<T extends Record<string, any>>(
  clientData: T,
  serverData: T,
  fieldTimestamps: {
    client: Record<string, number>
    server: Record<string, number>
  }
): T {
  const resolved = { ...serverData } as T

  // Iterate through all fields
  for (const field in clientData) {
    const clientFieldTime = fieldTimestamps.client[field] || 0
    const serverFieldTime = fieldTimestamps.server[field] || 0

    // If client field is newer, use client value
    if (clientFieldTime > serverFieldTime) {
      resolved[field] = clientData[field]
    }
    // If timestamps equal, keep server value (already set)
  }

  return resolved
}

/**
 * Check if two entities are in conflict
 *
 * Entities are in conflict if:
 * - Both have been modified (version mismatch)
 * - Timestamps differ
 * - Content differs
 *
 * @param clientData Client entity
 * @param serverData Server entity
 */
export function isInConflict<T extends LocalList | LocalListItem>(
  clientData: T,
  serverData: T
): boolean {
  // Version mismatch indicates conflict
  if (clientData.version !== serverData.version) {
    return true
  }

  // Timestamp difference indicates conflict
  if (clientData.localTimestamp !== serverData.localTimestamp) {
    return true
  }

  // Check content difference
  if ('title' in clientData && 'title' in serverData) {
    // List entity
    return (
      clientData.title !== serverData.title ||
      clientData.type !== serverData.type
    )
  } else if ('content' in clientData && 'content' in serverData) {
    // ListItem entity
    return (
      clientData.content !== serverData.content ||
      clientData.checked !== serverData.checked
    )
  }

  return false
}

/**
 * Merge list operations by ID, keeping the latest version
 *
 * When multiple operations exist for the same entity,
 * keep only the latest one based on timestamp.
 *
 * @param operations Array of operations
 */
export function mergeOperationsByEntity<T extends { entityId: string; timestamp: number }>(
  operations: T[]
): T[] {
  const latestOps = new Map<string, T>()

  for (const op of operations) {
    const existing = latestOps.get(op.entityId)

    if (!existing || op.timestamp > existing.timestamp) {
      latestOps.set(op.entityId, op)
    }
  }

  return Array.from(latestOps.values())
}

/**
 * Calculate priority score for operation ordering
 * DELETE > UPDATE > CREATE
 *
 * @param operationType Type of operation
 */
export function getOperationPriority(operationType: OperationType): number {
  switch (operationType) {
    case 'DELETE':
      return 3
    case 'UPDATE':
      return 2
    case 'CREATE':
      return 1
    default:
      return 0
  }
}

/**
 * Sort operations by priority and timestamp
 *
 * @param operations Array of operations
 */
export function sortOperations<T extends { operationType: OperationType; timestamp: number }>(
  operations: T[]
): T[] {
  return operations.sort((a, b) => {
    const priorityDiff = getOperationPriority(b.operationType) - getOperationPriority(a.operationType)

    if (priorityDiff !== 0) {
      return priorityDiff
    }

    // Same priority, sort by timestamp (oldest first)
    return a.timestamp - b.timestamp
  })
}

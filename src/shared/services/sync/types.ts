import type { LocalList, LocalListItem, SyncOperation } from '@shared/db'

/**
 * Sync state for UI components
 */
export interface SyncState {
  isSyncing: boolean
  isOnline: boolean
  lastSync: number | null
  pendingCount: number
  error: string | null
}

/**
 * Sync API request payload
 */
export interface SyncPayload {
  listOperations: SyncOperationPayload[]
  itemOperations: SyncOperationPayload[]
}

/**
 * Individual operation in sync payload
 */
export interface SyncOperationPayload {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  version: number
  timestamp: number
  data: any
}

/**
 * Sync API response
 */
export interface SyncResponse {
  lists: LocalList[]
  items: LocalListItem[]
  conflicts: ConflictInfo[]
}

/**
 * Conflict information from server
 */
export interface ConflictInfo {
  entityType: 'list' | 'listItem'
  entityId: string
  clientVersion: number
  serverVersion: number
  resolution: 'client' | 'server' | 'merged'
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  autoSyncInterval: number // milliseconds
  maxRetries: number
  retryBackoff: number // milliseconds
  offlineOnly?: boolean // If true, never sync with server (local-only mode)
}

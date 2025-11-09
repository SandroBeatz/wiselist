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
  listOperations: ListOperationPayload[]
  itemOperations: ListItemOperationPayload[]
  lastSyncTimestamp?: number // For incremental sync
}

/**
 * List operation in sync payload
 */
export interface ListOperationPayload {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  version: number
  timestamp: number
  data?: {
    title?: string
    type?: 'SHOPPING' | 'TODO' | 'OTHER'
  }
}

/**
 * List item operation in sync payload
 */
export interface ListItemOperationPayload {
  id: string
  listId: string // Required for item operations
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  version: number
  timestamp: number
  data?: {
    content?: string
    checked?: boolean
  }
}

/**
 * Sync API response
 */
export interface SyncResponse {
  lists: LocalList[]
  items: LocalListItem[]
  conflicts: {
    listIds: string[]
    itemIds: string[]
  }
  serverTimestamp: number // Save for next incremental sync
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

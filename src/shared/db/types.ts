import type { List, ListItem } from '@entities/list'

/**
 * Sync status for local entities
 */
export enum SyncStatus {
  SYNCED = 'SYNCED',     // Successfully synced with server
  PENDING = 'PENDING',   // Waiting for sync
  SYNCING = 'SYNCING',   // Currently syncing
  ERROR = 'ERROR',       // Sync failed
}

/**
 * Operation type for sync queue
 */
export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Entity type for sync operations
 */
export type EntityType = 'list' | 'listItem'

/**
 * Local List with sync metadata
 * Now includes all fields from List (items, owner, shares)
 */
export interface LocalList extends List {
  version: number
  syncStatus: SyncStatus
  localTimestamp: number
}

/**
 * Local ListItem with sync metadata
 */
export interface LocalListItem extends ListItem {
  version: number
  syncStatus: SyncStatus
  localTimestamp: number
}

/**
 * Sync operation stored in queue
 */
export interface SyncOperation {
  id?: number // Auto-increment ID from Dexie
  entityType: EntityType
  entityId: string
  operationType: OperationType
  version: number
  timestamp: number
  data: any // Operation-specific data
  retryCount: number
}

/**
 * Sync state for UI
 */
export interface SyncState {
  isSyncing: boolean
  lastSync: number | null
  error: string | null
}

/**
 * Sync status for components
 */
export interface ComponentSyncStatus {
  isSyncing: boolean
  pendingCount: number
  lastSync: number | null
}

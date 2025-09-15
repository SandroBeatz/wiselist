import { syncQueueService } from './sync-queue.service'
import type { SyncOperationType } from './sync-queue.service'
import type { List, ListItem, ListId } from '@entities/list'

/**
 * Helper functions for creating sync operations
 */
export class SyncOperations {
  
  /**
   * Create a new list operation
   */
  static async createList(listData: Partial<List>): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'CREATE_LIST',
      listId: 'new', // Will be replaced by server
      data: listData
    })
  }

  /**
   * Update an existing list operation
   */
  static async updateList(listId: ListId, listData: Partial<List>): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'UPDATE_LIST',
      listId,
      data: listData
    })
  }

  /**
   * Delete a list operation
   */
  static async deleteList(listId: ListId): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'DELETE_LIST',
      listId,
      data: { id: listId }
    })
  }

  /**
   * Create a new list item operation
   */
  static async createItem(listId: ListId, itemData: Partial<ListItem>): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'CREATE_ITEM',
      listId,
      data: {
        ...itemData,
        listId
      }
    })
  }

  /**
   * Update a list item operation
   */
  static async updateItem(listId: ListId, itemId: string, itemData: Partial<ListItem>): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'UPDATE_ITEM',
      listId,
      data: {
        id: itemId,
        ...itemData
      }
    })
  }

  /**
   * Delete a list item operation
   */
  static async deleteItem(listId: ListId, itemId: string): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'DELETE_ITEM',
      listId,
      data: { id: itemId }
    })
  }

  /**
   * Check/uncheck a list item operation
   */
  static async checkItem(listId: ListId, itemId: string, checked: boolean): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'CHECK_ITEM',
      listId,
      data: {
        id: itemId,
        checked
      }
    })
  }

  /**
   * Reorder list items operation
   */
  static async reorderItem(listId: ListId, itemId: string, newOrder: number): Promise<any> {
    return syncQueueService.enqueueOperation({
      type: 'REORDER_ITEM',
      listId,
      data: {
        id: itemId,
        order: newOrder
      }
    })
  }

  /**
   * Reorder multiple items in a batch
   */
  static async reorderItems(listId: ListId, itemOrders: Array<{ id: string; order: number }>): Promise<any[]> {
    // Create multiple reorder operations
    const promises = itemOrders.map(({ id, order }) =>
      this.reorderItem(listId, id, order)
    )
    
    return Promise.all(promises)
  }

  /**
   * Get sync queue status
   */
  static getSyncStatus() {
    return {
      queueSize: syncQueueService.queueSize,
      operations$: syncQueueService.operations$,
      isProcessing$: syncQueueService.isProcessing$,
      connectionStatus$: syncQueueService.connectionStatus$,
      isLoading$: syncQueueService.isLoading$,
      error$: syncQueueService.error$
    }
  }

  /**
   * Force retry all failed operations
   */
  static retryFailedOperations(): void {
    syncQueueService.retryFailedOperations()
  }

  /**
   * Clear all pending operations
   */
  static clearQueue(): void {
    syncQueueService.clearQueue()
  }
}

/**
 * Convert WebSocket event types to sync operation types
 */
export function eventTypeToSyncType(eventType: string): SyncOperationType | null {
  const mapping: Record<string, SyncOperationType> = {
    'LIST_CREATED': 'CREATE_LIST',
    'LIST_UPDATED': 'UPDATE_LIST',
    'LIST_DELETED': 'DELETE_LIST',
    'ITEM_CREATED': 'CREATE_ITEM',
    'ITEM_UPDATED': 'UPDATE_ITEM',
    'ITEM_DELETED': 'DELETE_ITEM',
    'ITEM_CHECKED': 'CHECK_ITEM',
    'ITEM_REORDERED': 'REORDER_ITEM'
  }
  
  return mapping[eventType] || null
}

/**
 * Convert sync operation type to WebSocket event type
 */
export function syncTypeToEventType(syncType: SyncOperationType): string {
  const mapping: Record<SyncOperationType, string> = {
    'CREATE_LIST': 'LIST_CREATED',
    'UPDATE_LIST': 'LIST_UPDATED',
    'DELETE_LIST': 'LIST_DELETED',
    'CREATE_ITEM': 'ITEM_CREATED',
    'UPDATE_ITEM': 'ITEM_UPDATED',
    'DELETE_ITEM': 'ITEM_DELETED',
    'CHECK_ITEM': 'ITEM_CHECKED',
    'REORDER_ITEM': 'ITEM_REORDERED'
  }
  
  return mapping[syncType]
}
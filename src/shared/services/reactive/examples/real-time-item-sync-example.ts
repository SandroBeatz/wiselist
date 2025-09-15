/**
 * Real-time Item Sync Service - Usage Examples
 * 
 * This file demonstrates practical usage patterns for the RealTimeItemSyncService
 * in various scenarios including real-time collaboration, conflict resolution,
 * and user activity tracking.
 */

import { realTimeItemSyncService } from '../real-time-item-sync.service'
import type { ItemMergeStrategy } from '../real-time-item-sync.service'
import type { ListItem } from '@entities/list'

// Example 1: Basic Real-time Item Management
export async function basicItemManagementExample(listId: string) {
  console.log('=== Basic Item Management Example ===')
  
  try {
    // Start real-time sync for a list
    await realTimeItemSyncService.startItemSync(listId)
    console.log(`Started item sync for list: ${listId}`)
    
    // Subscribe to item events for this list
    const itemEventsSubscription = realTimeItemSyncService.subscribeToListItemEvents(listId)
      .subscribe(event => {
        console.log('Received item event:', {
          type: event.type,
          itemId: event.itemId,
          userId: event.userId,
          data: event.data
        })
      })
    
    // Create a new item with optimistic updates
    const newItem = await realTimeItemSyncService.createItemOptimistic(listId, {
      content: 'Buy groceries',
      checked: false
    })
    console.log('Created item:', newItem)
    
    // Update the item
    const updatedItem = await realTimeItemSyncService.updateItemOptimistic(newItem.id, {
      content: 'Buy groceries and fruits'
    })
    console.log('Updated item:', updatedItem)
    
    // Toggle the item
    const toggledItem = await realTimeItemSyncService.toggleItemOptimistic(newItem.id, true)
    console.log('Toggled item:', toggledItem)
    
    // Create more items for reordering
    const item2 = await realTimeItemSyncService.createItemOptimistic(listId, {
      content: 'Walk the dog',
      checked: false
    })
    
    const item3 = await realTimeItemSyncService.createItemOptimistic(listId, {
      content: 'Read a book',
      checked: false
    })
    
    // Reorder items
    await realTimeItemSyncService.reorderItemsOptimistic(
      listId,
      [item2.id, newItem.id, item3.id],
      [0, 1, 2]
    )
    console.log('Items reordered')
    
    // Clean up
    setTimeout(() => {
      itemEventsSubscription.unsubscribe()
      realTimeItemSyncService.stopItemSync(listId)
      console.log('Stopped item sync')
    }, 5000)
    
  } catch (error) {
    console.error('Basic item management error:', error)
  }
}

// Example 2: Real-time Collaboration with User Activity
export async function collaborationExample(listId: string, itemId: string) {
  console.log('=== Real-time Collaboration Example ===')
  
  try {
    await realTimeItemSyncService.startItemSync(listId)
    
    // Get item sync state
    const itemSyncStateSubscription = realTimeItemSyncService.getItemSyncState(itemId)
      .subscribe(state => {
        console.log('Item sync state:', {
          version: state.version,
          hasPendingChanges: state.hasPendingChanges,
          hasConflicts: state.hasConflicts,
          lastSyncTime: new Date(state.lastSyncTime).toISOString()
        })
      })
    
    // Track who's editing the item
    const editingUserSubscription = realTimeItemSyncService.getItemEditingUser(itemId)
      .subscribe(editor => {
        if (editor) {
          console.log(`User ${editor.username || editor.userId} is editing item ${itemId}`)
          console.log(`Started editing at: ${new Date(editor.startedAt).toISOString()}`)
        } else {
          console.log(`No one is currently editing item ${itemId}`)
        }
      })
    
    // Get active users for the list
    const activeUsersSubscription = realTimeItemSyncService.getActiveUsersForList(listId)
      .subscribe(users => {
        console.log('Active users in list:', users.map(user => ({
          userId: user.userId,
          username: user.username,
          joinedAt: new Date(user.joinedAt).toISOString(),
          lastActivity: new Date(user.lastActivity).toISOString()
        })))
      })
    
    // Simulate user editing activity
    console.log('Simulating user editing...')
    
    // Start editing (this would typically be called when user focuses on input)
    // Note: This is a placeholder - the actual method signature might be different
    // realTimeItemSyncService.trackItemEditing(itemId, listId, true)
    
    // Update the item
    await realTimeItemSyncService.updateItemOptimistic(itemId, {
      content: 'Updated content during collaboration'
    })
    
    // Stop editing (when user blurs the input)
    // realTimeItemSyncService.trackItemEditing(itemId, listId, false)
    
    // Clean up after 10 seconds
    setTimeout(() => {
      itemSyncStateSubscription.unsubscribe()
      editingUserSubscription.unsubscribe()
      activeUsersSubscription.unsubscribe()
      realTimeItemSyncService.stopItemSync(listId)
      console.log('Collaboration example ended')
    }, 10000)
    
  } catch (error) {
    console.error('Collaboration example error:', error)
  }
}

// Example 3: Conflict Resolution
export async function conflictResolutionExample(listId: string) {
  console.log('=== Conflict Resolution Example ===')
  
  try {
    await realTimeItemSyncService.startItemSync(listId)
    
    // Subscribe to item events to catch conflicts
    const itemEventsSubscription = realTimeItemSyncService.subscribeToListItemEvents(listId)
      .subscribe(event => {
        console.log('Item event received:', {
          type: event.type,
          itemId: event.itemId,
          eventId: event.eventId,
          version: event.version,
          timestamp: event.timestamp
        })
      })
    
    // Subscribe to sync state to monitor conflicts
    const syncStateSubscription = realTimeItemSyncService.itemSyncState$
      .subscribe(state => {
        if (state.conflictingItemOperations.length > 0) {
          console.log('Conflicts detected:', state.conflictingItemOperations)
          
          // Auto-resolve first conflict as an example
          const firstConflictId = state.conflictingItemOperations[0]
          
          // Example resolution strategies
          const resolutionStrategies: ItemMergeStrategy[] = [
            {
              strategy: 'server_wins',
              reason: 'Accept server changes for consistency'
            },
            {
              strategy: 'client_wins',
              reason: 'Keep local changes as they are more recent'
            },
            {
              strategy: 'merge_fields',
              reason: 'Merge non-overlapping field changes',
              mergedData: {
                // This would contain the merged data
                content: 'Merged content from both server and client',
                checked: true,
                updatedAt: new Date().toISOString()
              }
            }
          ]
          
          // Use server_wins strategy for this example
          const resolution = resolutionStrategies[0]
          
          console.log(`Resolving conflict ${firstConflictId} with strategy: ${resolution.strategy}`)
          realTimeItemSyncService.resolveItemConflict(firstConflictId, resolution)
            .then(() => {
              console.log('Conflict resolved successfully')
            })
            .catch(error => {
              console.error('Failed to resolve conflict:', error)
            })
        }
      })
    
    // Create an item to potentially trigger conflicts
    const newItem = await realTimeItemSyncService.createItemOptimistic(listId, {
      content: 'Item that might conflict',
      checked: false
    })
    
    // Simulate rapid updates that might cause conflicts
    setTimeout(async () => {
      try {
        await realTimeItemSyncService.updateItemOptimistic(newItem.id, {
          content: 'First update'
        })
        
        // Rapid second update
        await realTimeItemSyncService.updateItemOptimistic(newItem.id, {
          content: 'Second rapid update'
        })
        
        // Toggle rapidly
        await realTimeItemSyncService.toggleItemOptimistic(newItem.id, true)
        await realTimeItemSyncService.toggleItemOptimistic(newItem.id, false)
        
      } catch (error) {
        console.error('Error during rapid updates:', error)
      }
    }, 1000)
    
    // Clean up after 15 seconds
    setTimeout(() => {
      itemEventsSubscription.unsubscribe()
      syncStateSubscription.unsubscribe()
      realTimeItemSyncService.stopItemSync(listId)
      console.log('Conflict resolution example ended')
    }, 15000)
    
  } catch (error) {
    console.error('Conflict resolution example error:', error)
  }
}

// Example 4: Bulk Operations with Reordering
export async function bulkOperationsExample(listId: string) {
  console.log('=== Bulk Operations and Reordering Example ===')
  
  try {
    await realTimeItemSyncService.startItemSync(listId)
    
    // Subscribe to reorder status
    const reorderStatusSubscription = realTimeItemSyncService.getListReorderStatus(listId)
      .subscribe(isReordering => {
        console.log(`List ${listId} reorder in progress: ${isReordering}`)
      })
    
    // Create multiple items
    const items: ListItem[] = []
    for (let i = 1; i <= 5; i++) {
      const item = await realTimeItemSyncService.createItemOptimistic(listId, {
        content: `Task ${i}`,
        checked: i % 2 === 0 // Check even numbered items
      })
      items.push(item)
      console.log(`Created item ${i}:`, item.content)
    }
    
    console.log('All items created, waiting 2 seconds...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Reorder the items (reverse order)
    const itemIds = items.map(item => item.id)
    const newOrder = Array.from({ length: items.length }, (_, i) => items.length - 1 - i)
    
    console.log('Reordering items...')
    console.log('Original order:', itemIds)
    console.log('New order indices:', newOrder)
    
    await realTimeItemSyncService.reorderItemsOptimistic(listId, itemIds, newOrder)
    console.log('Reorder completed')
    
    // Perform bulk updates
    console.log('Performing bulk updates...')
    const updatePromises = items.map((item, index) => {
      return realTimeItemSyncService.updateItemOptimistic(item.id, {
        content: `Updated Task ${index + 1} - ${Date.now()}`
      })
    })
    
    const updatedItems = await Promise.all(updatePromises)
    console.log('Bulk updates completed:', updatedItems.length, 'items updated')
    
    // Force sync specific items
    const itemIdsToSync = items.slice(0, 3).map(item => item.id)
    console.log('Force syncing first 3 items...')
    await realTimeItemSyncService.forceSyncItems(listId, itemIdsToSync)
    console.log('Force sync completed')
    
    // Clean up
    setTimeout(() => {
      reorderStatusSubscription.unsubscribe()
      realTimeItemSyncService.stopItemSync(listId)
      console.log('Bulk operations example ended')
    }, 5000)
    
  } catch (error) {
    console.error('Bulk operations example error:', error)
  }
}

// Example 5: Error Handling and Recovery
export async function errorHandlingExample(listId: string) {
  console.log('=== Error Handling and Recovery Example ===')
  
  try {
    // Subscribe to sync state to monitor errors
    const syncStateSubscription = realTimeItemSyncService.itemSyncState$
      .subscribe(state => {
        if (state.itemSyncErrors.length > 0) {
          console.log('Sync errors detected:')
          state.itemSyncErrors.forEach(error => {
            console.log(`- Item ${error.itemId} in list ${error.listId}: ${error.error}`)
            console.log(`  Timestamp: ${new Date(error.timestamp).toISOString()}`)
          })
        }
        
        if (state.pendingItemSyncs.length > 0) {
          console.log('Pending syncs:', state.pendingItemSyncs)
        }
      })
    
    await realTimeItemSyncService.startItemSync(listId)
    
    // Create an item
    const newItem = await realTimeItemSyncService.createItemOptimistic(listId, {
      content: 'Test item for error handling',
      checked: false
    })
    
    // Simulate operations that might fail
    try {
      // Try to update with invalid data (this might trigger validation errors)
      await realTimeItemSyncService.updateItemOptimistic(newItem.id, {
        content: '', // Empty content might not be allowed
        checked: 'invalid' as any // Invalid boolean value
      })
    } catch (error) {
      console.log('Expected error caught:', (error as Error).message)
    }
    
    // Try to delete non-existent item
    try {
      await realTimeItemSyncService.deleteItemOptimistic('non-existent-id')
    } catch (error) {
      console.log('Expected error for non-existent item:', (error as Error).message)
    }
    
    // Refresh items to recover from any sync issues
    console.log('Refreshing items to recover...')
    await realTimeItemSyncService.refreshItems(listId)
    console.log('Items refreshed successfully')
    
    // Clean up
    setTimeout(() => {
      syncStateSubscription.unsubscribe()
      realTimeItemSyncService.stopItemSync(listId)
      console.log('Error handling example ended')
    }, 5000)
    
  } catch (error) {
    console.error('Error handling example error:', error)
  }
}

// Example 6: Performance Monitoring
export function performanceMonitoringExample(listId: string) {
  console.log('=== Performance Monitoring Example ===')
  
  const startTime = Date.now()
  let operationCount = 0
  let eventCount = 0
  
  // Monitor item sync state for performance metrics
  const syncStateSubscription = realTimeItemSyncService.itemSyncState$
    .subscribe(state => {
      const currentTime = Date.now()
      const elapsed = currentTime - startTime
      
      console.log('Performance metrics:', {
        elapsed: `${elapsed}ms`,
        pendingOperations: state.pendingItemSyncs.length,
        conflictingOperations: state.conflictingItemOperations.length,
        errors: state.itemSyncErrors.length,
        activeUsers: state.activeUsers.size,
        editingSessions: state.itemEditingUsers.size,
        operationsPerSecond: elapsed > 0 ? (operationCount * 1000 / elapsed).toFixed(2) : '0'
      })
    })
  
  // Monitor item events
  const itemEventsSubscription = realTimeItemSyncService.subscribeToListItemEvents(listId)
    .subscribe(event => {
      eventCount++
      console.log(`Event ${eventCount}:`, {
        type: event.type,
        itemId: event.itemId,
        version: event.version,
        processingDelay: Date.now() - new Date(event.timestamp).getTime()
      })
    })
  
  // Perform operations and measure performance
  realTimeItemSyncService.startItemSync(listId)
    .then(async () => {
      console.log('Starting performance test...')
      
      // Create items rapidly
      const createPromises = Array.from({ length: 10 }, (_, i) => {
        operationCount++
        return realTimeItemSyncService.createItemOptimistic(listId, {
          content: `Performance test item ${i + 1}`,
          checked: false
        })
      })
      
      const items = await Promise.all(createPromises)
      console.log(`Created ${items.length} items`)
      
      // Update items rapidly
      const updatePromises = items.map((item, i) => {
        operationCount++
        return realTimeItemSyncService.updateItemOptimistic(item.id, {
          content: `Updated item ${i + 1} - ${Date.now()}`
        })
      })
      
      await Promise.all(updatePromises)
      console.log(`Updated ${items.length} items`)
      
      // Reorder items
      operationCount++
      await realTimeItemSyncService.reorderItemsOptimistic(
        listId,
        items.map(item => item.id),
        items.map((_, i) => i)
      )
      console.log('Reordered items')
      
      console.log('Performance test completed')
    })
    .catch(error => {
      console.error('Performance test error:', error)
    })
  
  // Clean up after 30 seconds
  setTimeout(() => {
    syncStateSubscription.unsubscribe()
    itemEventsSubscription.unsubscribe()
    realTimeItemSyncService.stopItemSync(listId)
    
    const totalTime = Date.now() - startTime
    console.log('Performance monitoring completed:', {
      totalTime: `${totalTime}ms`,
      totalOperations: operationCount,
      totalEvents: eventCount,
      averageOperationTime: operationCount > 0 ? `${(totalTime / operationCount).toFixed(2)}ms` : 'N/A'
    })
  }, 30000)
}

// Usage function to run all examples
export async function runAllExamples() {
  const testListId = 'test-list-id'
  const testItemId = 'test-item-id'
  
  console.log('🚀 Starting Real-time Item Sync Examples')
  console.log('==========================================')
  
  // Run examples with delays between them
  await basicItemManagementExample(testListId)
  await new Promise(resolve => setTimeout(resolve, 6000))
  
  await collaborationExample(testListId, testItemId)
  await new Promise(resolve => setTimeout(resolve, 11000))
  
  await conflictResolutionExample(testListId)
  await new Promise(resolve => setTimeout(resolve, 16000))
  
  await bulkOperationsExample(testListId)
  await new Promise(resolve => setTimeout(resolve, 6000))
  
  await errorHandlingExample(testListId)
  await new Promise(resolve => setTimeout(resolve, 6000))
  
  performanceMonitoringExample(testListId)
  await new Promise(resolve => setTimeout(resolve, 31000))
  
  console.log('✅ All Real-time Item Sync Examples Completed')
}

// Example usage in a Vue component:
/*
<template>
  <div>
    <h2>Shopping List Items</h2>
    
    <!-- Item creation form -->
    <form @submit.prevent="createNewItem">
      <input v-model="newItemContent" placeholder="Add new item..." />
      <button type="submit" :disabled="!isConnected">Add Item</button>
    </form>
    
    <!-- Items list -->
    <div v-for="item in items" :key="item.id" class="item">
      <input 
        type="checkbox" 
        :checked="item.checked" 
        @change="toggleItem(item.id, $event.target.checked)"
      />
      <input 
        v-model="item.content"
        @focus="trackEditing(item.id, true)"
        @blur="trackEditing(item.id, false)"
        @input="updateItem(item.id, { content: $event.target.value })"
      />
      <button @click="deleteItem(item.id)">Delete</button>
      
      <!-- Show who's editing -->
      <span v-if="editingUsers.has(item.id)" class="editing-indicator">
        {{ editingUsers.get(item.id).username }} is editing...
      </span>
    </div>
    
    <!-- Collaboration indicators -->
    <div class="collaboration-info">
      <p>Connected: {{ isConnected ? 'Yes' : 'No' }}</p>
      <p>Active Users: {{ activeUsers.length }}</p>
      <p>Pending Operations: {{ pendingOperations }}</p>
      <p v-if="hasConflicts" class="conflicts">⚠️ Conflicts detected!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRealTimeItemSync } from '@shared/composables/useRealTimeItemSync'

const props = defineProps<{
  listId: string
}>()

const newItemContent = ref('')

const {
  isConnected,
  activeUsers,
  pendingOperations,
  hasConflicts,
  itemSyncState,
  createItemOptimistic,
  updateItemOptimistic,
  deleteItemOptimistic,
  toggleItemOptimistic,
  trackItemEditing
} = useRealTimeItemSync({
  listId: props.listId,
  autoStart: true,
  enableOptimisticUpdates: true
})

// This would come from your list store
const items = ref([])
const editingUsers = computed(() => new Map())

const createNewItem = async () => {
  if (!newItemContent.value.trim()) return
  
  try {
    await createItemOptimistic({
      content: newItemContent.value.trim(),
      checked: false
    })
    newItemContent.value = ''
  } catch (error) {
    console.error('Failed to create item:', error)
  }
}

const updateItem = async (itemId: string, updates: Partial<ListItem>) => {
  try {
    await updateItemOptimistic(itemId, updates)
  } catch (error) {
    console.error('Failed to update item:', error)
  }
}

const deleteItem = async (itemId: string) => {
  try {
    await deleteItemOptimistic(itemId)
  } catch (error) {
    console.error('Failed to delete item:', error)
  }
}

const toggleItem = async (itemId: string, checked: boolean) => {
  try {
    await toggleItemOptimistic(itemId, checked)
  } catch (error) {
    console.error('Failed to toggle item:', error)
  }
}

const trackEditing = (itemId: string, isEditing: boolean) => {
  trackItemEditing(itemId, isEditing)
}
</script>
*/
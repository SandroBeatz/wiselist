# Offline-First Architecture

## Overview

Wiselist implements a complete **offline-first architecture** using RxJS, IndexedDB (Dexie), and operational transform conflict resolution. This allows users to:

- ✅ Create, update, and delete lists/items offline
- ✅ Automatic sync when connection restored
- ✅ Real-time UI updates via RxJS observables
- ✅ Conflict resolution using Last Write Wins (LWW)
- ✅ Optimistic UI updates for instant feedback

## Architecture Layers

### 1. Database Layer (IndexedDB + Dexie)

**Location**: `src/shared/db/`

**Components**:
- `database.ts` - Dexie database schema and instance
- `types.ts` - TypeScript interfaces for local entities
- `utils.ts` - Database utility functions
- `debug.ts` - Development debugging tools

**Tables**:
```typescript
- lists: LocalList[]        // Shopping/todo lists with sync metadata
- listItems: LocalListItem[]  // List items with checked status
- syncOperations: SyncOperation[] // Queue of pending operations
```

**Key Features**:
- Version tracking for conflict detection
- Sync status per entity (SYNCED, PENDING, SYNCING, ERROR)
- Local timestamp for LWW resolution
- Indexed queries for performance

### 2. RxJS Service Layer

**Location**: `src/shared/services/rxjs/`

**Components**:
- `list.service.ts` - Reactive list management
- `list-item.service.ts` - Reactive item management

**Key Features**:
- **Dexie liveQuery** integration for real-time updates
- **BehaviorSubject** for sync status
- **Optimistic updates** - changes applied instantly to IndexedDB
- **Sync queue** - operations automatically queued for server sync
- **shareReplay(1)** - cached observables for efficiency

**Usage Example**:
```typescript
import { listRxService } from '@shared/services/rxjs'

// Subscribe to lists (real-time updates)
listRxService.getLists$().subscribe(lists => {
  console.log('Lists updated:', lists)
})

// Create list (optimistic)
await listRxService.createList({ title: 'Groceries', type: 'SHOPPING' }, 'user-id')
```

### 3. Sync Engine

**Location**: `src/shared/services/sync/`

**Components**:
- `sync.service.ts` - Main synchronization orchestrator
- `ot-resolver.ts` - Operational transform conflict resolver
- `types.ts` - Sync-related TypeScript types

**Sync Flow**:
```
1. Monitor network status (online/offline events)
2. Auto-sync every 30 seconds (configurable)
3. Refresh JWT token if needed
4. Get pending operations from IndexedDB
5. Merge duplicate operations (keep latest per entity)
6. Sort by priority: DELETE > UPDATE > CREATE
7. Group by entity type (lists / items)
8. Send POST /lists/sync
9. Process server response
10. Resolve conflicts using OT Resolver
11. Update local IndexedDB
12. Clear synced operations from queue
```

**Conflict Resolution Strategy**:
- **DELETE always wins** - deletion takes precedence
- **Last Write Wins (LWW)** - higher timestamp wins
- **Server tie-breaker** - if timestamps equal, server wins
- **Version tracking** - detects concurrent modifications

**Network Events**:
```typescript
// Automatic sync on connection restored
window.addEventListener('online', () => {
  syncService.forceSync()
})

// Queue operations when offline
window.addEventListener('offline', () => {
  // Continue working - operations queued
})
```

### 4. Vue Composables

**Location**:
- `src/entities/list/composables/useListsRx.ts`
- `src/entities/list-item/composables/useListItemsRx.ts`
- `src/shared/composables/useSyncStatus.ts`

**Features**:
- **Automatic subscription** on component mount
- **Automatic cleanup** on unmount
- **Reactive state** using Vue refs
- **Error handling** built-in
- **TypeScript** strict typing

**Usage Example**:
```vue
<script setup lang="ts">
import { useListsRx } from '@entities/list'

const { lists, isLoading, createList, deleteList } = useListsRx()

// Lists automatically update when IndexedDB changes
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-for="list in lists" :key="list.id">
    {{ list.title }}
  </div>
</template>
```

### 5. UI Components

**Location**:
- `src/widgets/SyncStatusIndicator.vue` - Visual sync indicator
- `src/shared/ui/SkeletonLoader.vue` - Loading skeletons
- `src/shared/services/notification.service.ts` - Toast notifications

**SyncStatusIndicator States**:
- 🟢 **Green (checkmark)** - All synced
- 🔵 **Blue (rotating)** - Syncing now
- 🟠 **Orange (cloud-upload)** - Pending changes
- ⚪ **Gray (cloud-offline)** - Offline mode
- 🔴 **Red (alert)** - Sync error

## Data Flow

### Create Operation (Offline)

```
User Action → Composable → RxService → IndexedDB
                                      ↓
                                  Sync Queue
                                      ↓
                            (when online) Sync Service
                                      ↓
                                  API Server
                                      ↓
                            Server Response
                                      ↓
                            Update IndexedDB
                                      ↓
                            Observable Emits
                                      ↓
                                UI Updates
```

### Conflict Resolution Flow

```
Client Operation (timestamp: 1000) ←→ Server Data (timestamp: 2000)
                ↓
        OT Resolver (resolveConflict)
                ↓
    Compare timestamps + operation type
                ↓
        Determine winner (LWW)
                ↓
    Update IndexedDB with resolved data
                ↓
        Observable emits to UI
```

## Performance Optimizations

### 1. Observable Caching
```typescript
// shareReplay(1) caches latest emission
this.lists$ = from(liveQuery(() => db.lists.toArray()))
  .pipe(shareReplay(1))
```

### 2. Operation Merging
```typescript
// Multiple operations on same entity → keep latest only
const mergedOps = mergeOperationsByEntity(pendingOps)
```

### 3. Indexed Queries
```typescript
// Fast lookups using Dexie indexes
db.listItems
  .where('[listId+syncStatus]')
  .equals(['list-1', 'PENDING'])
```

### 4. Debounced Network Events
```typescript
// Prevent sync spam on flaky connections
fromEvent(window, 'online')
  .pipe(debounceTime(500))
  .subscribe(() => sync())
```

## Testing

### Unit Tests (99+ tests)
- ✅ Database Layer (23 tests)
- ✅ RxJS Services (66 tests)
- ✅ OT Resolver (24 tests)
- ✅ Composables (9 tests)

### Test Coverage
- **Lines**: 85%+
- **Functions**: 90%+
- **Branches**: 80%+

### Running Tests
```bash
# All tests
npm run test:unit

# Specific suite
npm run test:unit -- src/shared/services/rxjs/__tests__

# Watch mode
npm run test:unit -- --watch
```

## API Integration

### Sync Endpoint

**POST** `/api/lists/sync`

**Request**:
```json
{
  "listOperations": [
    {
      "id": "list-1",
      "type": "CREATE",
      "version": 1,
      "timestamp": 1234567890,
      "data": { "title": "Groceries", "type": "SHOPPING" }
    }
  ],
  "itemOperations": [
    {
      "id": "item-1",
      "type": "UPDATE",
      "version": 2,
      "timestamp": 1234567891,
      "data": { "content": "Buy milk", "checked": true }
    }
  ]
}
```

**Response**:
```json
{
  "lists": [/* synced lists with server version/timestamp */],
  "items": [/* synced items with server version/timestamp */],
  "conflicts": [/* detected conflicts with resolution info */]
}
```

## Error Handling

### Network Errors
- Automatic retry with exponential backoff (2s, 4s, 8s)
- Max 3 retries (configurable)
- Error state exposed via observables
- Toast notifications for user feedback

### Conflict Errors
- Automatic resolution using OT Resolver
- User notification if data overwritten
- Detailed logging for debugging

### Database Errors
- Try-catch in all DB operations
- Error exposed in composable state
- Graceful degradation (don't crash app)

## Configuration

### Sync Service Config
```typescript
{
  autoSyncInterval: 30000,  // 30 seconds
  maxRetries: 3,            // Max retry attempts
  retryBackoff: 2000        // Initial backoff (ms)
}
```

### Updating Config
```typescript
import { syncService } from '@shared/services/sync'

syncService.updateConfig({
  autoSyncInterval: 60000,  // 1 minute
  maxRetries: 5
})
```

## Troubleshooting

### Issue: Changes not syncing
**Check**:
1. Network status: `syncService.getSyncState().isOnline`
2. Pending operations: `db.syncOperations.count()`
3. Sync errors: `syncService.getSyncState().error`

### Issue: UI not updating
**Check**:
1. Observable subscription active
2. Component mounted (onMounted called)
3. No errors in console

### Issue: Conflicts not resolving
**Check**:
1. Timestamps correctly set
2. Version incremented on updates
3. OT Resolver logic matches requirements

## Best Practices

### 1. Always use composables in components
```vue
<!-- ✅ Good -->
<script setup>
import { useListsRx } from '@entities/list'
const { lists, createList } = useListsRx()
</script>

<!-- ❌ Bad -->
<script setup>
import { listRxService } from '@shared/services/rxjs'
// Don't use services directly in components
</script>
```

### 2. Handle loading states
```vue
<div v-if="isLoading">
  <SkeletonLoader type="list" :count="5" />
</div>
<div v-else>
  <!-- Content -->
</div>
```

### 3. Show sync status
```vue
<SyncStatusIndicator :showTooltip="true" clickable @sync="handleSync" />
```

### 4. Handle errors gracefully
```vue
<script setup>
const { error } = useListsRx()

watch(error, (err) => {
  if (err) {
    notificationService.showError(err)
  }
})
</script>
```

## Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for step-by-step migration from Pinia to RxJS architecture.

## References

- [Dexie.js Documentation](https://dexie.org/)
- [RxJS Documentation](https://rxjs.dev/)
- [Operational Transform](https://en.wikipedia.org/wiki/Operational_transformation)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

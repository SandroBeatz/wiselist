# Sync Fix - Logout/Login Issue

## Problem

After logout/login, users couldn't see their existing lists from the database because:

1. **Early exit in sync.service.ts**: When `pendingOps.length === 0` (no local changes), sync exited without contacting the server
2. **No data fetch**: Server was never queried to retrieve user's existing data
3. **Stale timestamp**: `lastSyncTimestamp` from previous session remained in localStorage

## Solution

### Changes Made

#### 1. Removed early exit in sync.service.ts (Line 183-191)
**Before:**
```typescript
// If no pending operations, just update lastSync
if (pendingOps.length === 0) {
  this.updateSyncState({
    isSyncing: false,
    lastSync: Date.now(),
    pendingCount: 0,
  })
  return  // ❌ Early exit - no server request!
}
```

**After:**
```typescript
// Step 3: Group and prepare operations (even if empty - fetch from server)
const payload = await this.prepareSyncPayload(pendingOps)
// Always send request to server
```

#### 2. Clear lastSyncTimestamp on logout (user.store.ts:91)
**Added:**
```typescript
async logout() {
  this.info = null
  tokenService.clearTokens()

  // Clear sync timestamp to force full sync on next login
  localStorage.removeItem('lastSyncTimestamp')  // ✅ NEW

  // Clear all local data from IndexedDB
  // ...
}
```

#### 3. Added sync type detection with logging (sync.service.ts:269-276)
```typescript
const lastSync = localStorage.getItem('lastSyncTimestamp')
const isInitialSync = !lastSync

if (isInitialSync) {
  console.log('🔄 Preparing INITIAL SYNC (full data fetch from server)')
} else {
  console.log('🔄 Preparing INCREMENTAL SYNC (changes since:', new Date(parseInt(lastSync)).toISOString(), ')')
}
```

## How It Works Now

### Login Flow
1. User logs in → `setTokens()` called
2. `forceSync()` triggered automatically
3. No `lastSyncTimestamp` in localStorage (cleared on logout)
4. Empty pending operations (IndexedDB cleared on logout)
5. ✅ **Sync request sent to server** with empty operations and no timestamp
6. Server returns ALL user data (lists + items)
7. Data saved to IndexedDB
8. UI displays all lists

### Logout Flow
1. User logs out → `logout()` called
2. Clear tokens
3. ✅ **Clear `lastSyncTimestamp`** from localStorage
4. Clear all IndexedDB data
5. Clean slate for next login

## Testing Instructions

### Prerequisites
- Backend running on port 3000
- Frontend running on port 5173
- User account with existing lists in database

### Test Scenario

1. **Initial State**
   - Open browser console (F12)
   - Clear IndexedDB: Application → IndexedDB → Delete all
   - Clear localStorage: Application → Local Storage → Clear

2. **Create Data**
   - Login with your account
   - Create 2-3 lists with items
   - Verify they appear in UI
   - Check backend database - lists should be saved

3. **Logout**
   - Click logout button
   - Check console - should see cleanup messages
   - Verify IndexedDB is empty
   - Verify localStorage has no `lastSyncTimestamp`

4. **Login Again** ⭐ Main Test
   - Login with same account
   - Check console logs - look for:
     ```
     🔄 Preparing INITIAL SYNC (full data fetch from server)
     📥 Server sync response: { listsCount: X, itemsCount: Y }
     💾 Saving lists to IndexedDB: X
     ✅ Saved list to IndexedDB: { id, title, ownerId }
     ```
   - ✅ **All previously created lists should appear in UI**
   - ✅ All items should be visible
   - ✅ Data should match backend database

5. **Verify Incremental Sync**
   - Create one more list
   - Check console - should see:
     ```
     🔄 Preparing INCREMENTAL SYNC (changes since: 2025-11-08T...)
     ```
   - Logout and login again
   - Should see INITIAL SYNC again (timestamp cleared)

### Expected Console Output (Login)

```
[UserStore] Setting tokens and syncing data...
🔄 Preparing INITIAL SYNC (full data fetch from server)
📥 Server sync response: {
  listsCount: 3,
  itemsCount: 8,
  conflictListIds: 0,
  conflictItemIds: 0,
  serverTimestamp: 1699456789123
}
💾 Saving lists to IndexedDB: 3
✅ Saved list to IndexedDB: { id: 'xxx', title: 'Shopping', ownerId: 'yyy', itemsCount: 3 }
✅ Saved list to IndexedDB: { id: 'xxx', title: 'TODO', ownerId: 'yyy', itemsCount: 2 }
✅ Saved list to IndexedDB: { id: 'xxx', title: 'Other', ownerId: 'yyy', itemsCount: 3 }
Sync completed successfully
```

## Files Changed

1. `src/shared/services/sync/sync.service.ts`
   - Removed early exit when no pending operations
   - Added sync type logging (initial vs incremental)

2. `src/entities/user/model/user.store.ts`
   - Added `lastSyncTimestamp` cleanup on logout

## Related Documentation

- API Documentation: `FRONTEND_SYNC_API.md`
- Offline Architecture: `docs/OFFLINE_ONLY_MODE.md`
- Migration Guide: `docs/MIGRATION_GUIDE.md`

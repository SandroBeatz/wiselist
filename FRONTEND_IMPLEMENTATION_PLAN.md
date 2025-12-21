# Frontend Implementation Plan - Wiselist Real-Time Sharing

## Overview

This plan covers frontend implementation for real-time sharing with WebSocket integration.

**Total Effort:** ~22 hours
**Timeline:** Week 2

---

## Phase 1: WebSocket Service Integration

**Effort:** 8 hours
**Priority:** CRITICAL (enables real-time updates)

### Architecture

```
WebSocketService (Singleton)
    ↓ connects on login
Backend WebSocket Gateway
    ↓ subscribe to lists
Real-Time Updates
    ↓ update IndexedDB
RxJS liveQuery
    ↓ triggers Vue reactivity
UI Auto-Updates
```

### Dependencies

```bash
cd frontend
npm install socket.io-client
npm install -D @types/socket.io-client
```

### Files to Create

#### 1. `src/shared/services/websocket.service.ts`

```typescript
import { io, Socket } from 'socket.io-client'
import { BehaviorSubject, Observable } from 'rxjs'
import { db, SyncStatus } from '@shared/db'
import type { LocalList, LocalListItem } from '@shared/db'

/**
 * WebSocketService - Real-time communication service
 *
 * Features:
 * - Automatic connection on login
 * - Room-based subscriptions (per list)
 * - Auto-reconnect on network restore
 * - IndexedDB integration (updates trigger liveQuery)
 *
 * Usage:
 * ```typescript
 * websocketService.connect(apiUrl, accessToken)
 * websocketService.subscribeToList(listId)
 * websocketService.getConnectionStatus$().subscribe(status => ...)
 * ```
 */
export class WebSocketService {
  private static instance: WebSocketService | null = null

  private socket: Socket | null = null
  private connected$ = new BehaviorSubject<boolean>(false)
  private subscribedLists = new Set<string>()

  private constructor() {
    // Singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  /**
   * Connect to WebSocket server
   * Called on login with fresh access token
   */
  connect(apiUrl: string, accessToken: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected, skipping duplicate connect()')
      return
    }

    console.log('🔌 Connecting to WebSocket:', apiUrl)

    // Create Socket.io connection
    this.socket = io(`${apiUrl}/sharing`, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'], // Fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id)
      this.connected$.next(true)

      // Re-subscribe to all lists after reconnect
      this.resubscribeAll()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      this.connected$.next(false)
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message)
      this.connected$.next(false)
    })

    // List update events
    this.socket.on('list:updated', async (payload) => {
      console.log('📥 Received list update:', payload)
      await this.handleListUpdate(payload)
    })

    // Item update events
    this.socket.on('item:updated', async (payload) => {
      console.log('📥 Received item update:', payload)
      await this.handleItemUpdate(payload)
    })

    // Share events
    this.socket.on('share:added', async (payload) => {
      console.log('📥 Share added:', payload)
      await this.handleShareAdded(payload)
    })

    this.socket.on('share:removed', async (payload) => {
      console.log('📥 Share removed:', payload)
      await this.handleShareRemoved(payload)
    })
  }

  /**
   * Disconnect from WebSocket server
   * Called on logout
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket')
      this.socket.disconnect()
      this.socket = null
      this.subscribedLists.clear()
      this.connected$.next(false)
    }
  }

  /**
   * Subscribe to list updates
   * Call this when viewing a list page
   */
  subscribeToList(listId: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe to list: WebSocket not connected')
      return
    }

    if (this.subscribedLists.has(listId)) {
      console.log('Already subscribed to list:', listId)
      return
    }

    console.log('🔔 Subscribing to list:', listId)

    this.socket.emit('subscribe:list', listId, (response: any) => {
      if (response.error) {
        console.error('Failed to subscribe to list:', response.error)
      } else {
        console.log('✅ Subscribed to list:', listId)
        this.subscribedLists.add(listId)
      }
    })
  }

  /**
   * Unsubscribe from list updates
   * Call this when leaving a list page
   */
  unsubscribeFromList(listId: string): void {
    if (!this.socket?.connected) return

    console.log('🔕 Unsubscribing from list:', listId)

    this.socket.emit('unsubscribe:list', listId)
    this.subscribedLists.delete(listId)
  }

  /**
   * Get connection status observable
   */
  getConnectionStatus$(): Observable<boolean> {
    return this.connected$.asObservable()
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected$.value
  }

  /**
   * Re-subscribe to all lists after reconnect
   */
  private resubscribeAll(): void {
    if (!this.socket?.connected) return

    console.log('♻️ Re-subscribing to lists after reconnect:', Array.from(this.subscribedLists))

    this.subscribedLists.forEach(listId => {
      this.socket!.emit('subscribe:list', listId)
    })
  }

  /**
   * Handle list:updated event
   */
  private async handleListUpdate(payload: {
    listId: string
    data: any
    timestamp: number
  }): Promise<void> {
    const { listId, data } = payload

    if (data.deleted) {
      // List was deleted
      await db.lists.delete(listId)
      console.log('🗑️ List deleted from IndexedDB:', listId)
    } else {
      // List was created or updated
      const existingList = await db.lists.get(listId)

      const updatedList: LocalList = {
        ...(existingList || {}),
        ...data,
        version: data.version || (existingList?.version || 0) + 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(), // Trigger liveQuery update
      }

      await db.lists.put(updatedList)
      console.log('💾 List updated in IndexedDB:', listId)
    }
  }

  /**
   * Handle item:updated event
   */
  private async handleItemUpdate(payload: {
    listId: string
    itemId: string
    data: any
    timestamp: number
  }): Promise<void> {
    const { itemId, data } = payload

    if (data.deleted) {
      // Item was deleted
      await db.listItems.delete(itemId)
      console.log('🗑️ Item deleted from IndexedDB:', itemId)
    } else {
      // Item was created or updated
      const existingItem = await db.listItems.get(itemId)

      const updatedItem: LocalListItem = {
        ...(existingItem || {}),
        ...data,
        version: data.version || (existingItem?.version || 0) + 1,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
      }

      await db.listItems.put(updatedItem)
      console.log('💾 Item updated in IndexedDB:', itemId)
    }
  }

  /**
   * Handle share:added event
   */
  private async handleShareAdded(payload: {
    listId: string
    share: any
    timestamp: number
  }): Promise<void> {
    const { listId, share } = payload

    // Update list with new share
    const list = await db.lists.get(listId)
    if (list) {
      const updatedList: LocalList = {
        ...list,
        shares: [...(list.shares || []), share],
        localTimestamp: Date.now(),
      }

      await db.lists.put(updatedList)
      console.log('👥 Share added to list:', listId, share)
    }
  }

  /**
   * Handle share:removed event
   */
  private async handleShareRemoved(payload: {
    listId: string
    userId: string
    timestamp: number
  }): Promise<void> {
    const { listId, userId } = payload

    // Update list by removing share
    const list = await db.lists.get(listId)
    if (list) {
      const updatedList: LocalList = {
        ...list,
        shares: (list.shares || []).filter(s => s.id !== userId),
        localTimestamp: Date.now(),
      }

      await db.lists.put(updatedList)
      console.log('👥 Share removed from list:', listId, userId)
    }
  }
}

// Export singleton instance
export const websocketService = WebSocketService.getInstance()
```

### Integration with Auth Flow

#### File: `src/entities/user/model/user.store.ts`

**Modify setTokens method:**

```typescript
import { websocketService } from '@shared/services/websocket.service'
import { syncService } from '@shared/services/sync/sync.service'

export const useUserStore = defineStore('user', () => {
  // ... existing code

  /**
   * Set tokens and start services
   */
  async function setTokens(accessToken: string, refreshToken: string) {
    tokenService.setTokens(accessToken, refreshToken)

    // Connect WebSocket with fresh token
    const apiUrl = import.meta.env.VITE_API_URL
    websocketService.connect(apiUrl, accessToken)

    // Start sync service
    syncService.start()
  }

  /**
   * Logout and cleanup
   */
  async function logout() {
    // Stop services BEFORE clearing data
    websocketService.disconnect()
    syncService.stop()

    // Clear state
    info.value = null
    tokenService.clearTokens()
    localStorage.removeItem('lastSyncTimestamp')

    // Clear IndexedDB
    try {
      await listRxService.clearAll()
      await listItemRxService.clearAll()
      await db.syncOperations.clear()
    } catch (error) {
      console.error('Error clearing local data:', error)
    }
  }

  return {
    // ... existing exports
    setTokens,
    logout,
  }
})
```

### Subscribe to Lists in Pages

#### File: `src/pages/ListPreview/ui/ListPreview.vue`

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { websocketService } from '@shared/services/websocket.service'

const route = useRoute()

onMounted(() => {
  const listId = route.params.id as string

  // Subscribe to this list for real-time updates
  websocketService.subscribeToList(listId)
})

onBeforeUnmount(() => {
  const listId = route.params.id as string

  // Unsubscribe when leaving page
  websocketService.unsubscribeFromList(listId)
})
</script>
```

#### File: `src/pages/Lists/ui/ListsPage.vue`

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useListsRx } from '@entities/list'
import { useUserStore } from '@entities/user'
import { websocketService } from '@shared/services/websocket.service'

const userStore = useUserStore()
const { lists } = useListsRx()

// Subscribe to all user's lists
watch(lists, (newLists, oldLists) => {
  // Subscribe to new lists
  newLists.forEach(list => {
    websocketService.subscribeToList(list.id)
  })

  // Unsubscribe from removed lists
  if (oldLists) {
    const removedLists = oldLists.filter(
      oldList => !newLists.find(newList => newList.id === oldList.id)
    )
    removedLists.forEach(list => {
      websocketService.unsubscribeFromList(list.id)
    })
  }
})

onBeforeUnmount(() => {
  // Cleanup: unsubscribe from all lists
  lists.value.forEach(list => {
    websocketService.unsubscribeFromList(list.id)
  })
})
</script>
```

### Testing

#### File: `src/shared/services/__tests__/websocket.service.spec.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { websocketService } from '../websocket.service'
import { io } from 'socket.io-client'

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: true,
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should connect to WebSocket server', () => {
    websocketService.connect('http://localhost:3000', 'access-token')

    expect(io).toHaveBeenCalledWith(
      'http://localhost:3000/sharing',
      expect.objectContaining({
        auth: { token: 'access-token' },
      })
    )
  })

  it('should subscribe to list', () => {
    const mockSocket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
    }

    ;(io as any).mockReturnValue(mockSocket)

    websocketService.connect('http://localhost:3000', 'token')
    websocketService.subscribeToList('list-123')

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'subscribe:list',
      'list-123',
      expect.any(Function)
    )
  })

  it('should disconnect on logout', () => {
    const mockSocket = {
      connected: true,
      disconnect: vi.fn(),
      on: vi.fn(),
    }

    ;(io as any).mockReturnValue(mockSocket)

    websocketService.connect('http://localhost:3000', 'token')
    websocketService.disconnect()

    expect(mockSocket.disconnect).toHaveBeenCalled()
    expect(websocketService.isConnected()).toBe(false)
  })
})
```

### Acceptance Criteria

- [ ] WebSocketService singleton created
- [ ] Connects on login with JWT token
- [ ] Disconnects on logout
- [ ] Subscribes to list when viewing list page
- [ ] Unsubscribes when leaving list page
- [ ] Updates IndexedDB on list:updated event
- [ ] Updates IndexedDB on item:updated event
- [ ] Handles share:added and share:removed events
- [ ] Auto-reconnects on network restore
- [ ] Re-subscribes to lists after reconnect
- [ ] Unit tests pass (100% coverage)
- [ ] Real-time updates visible in UI (<100ms latency)

---

## Phase 2: Share Management UI

**Effort:** 12 hours
**Priority:** CRITICAL (main feature)

### Problem

Current `ShareListModal.vue` only allows adding shares. Missing:
- View who list is shared with
- Remove shares
- Real-time updates when shares change

### Solution

Create comprehensive `ShareManagementDialog.vue` component.

### Files to Create

#### 1. `src/features/Sharing/ui/ShareManagementDialog.vue`

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonAvatar,
  IonInput,
  IonIcon,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { trashOutline, addOutline, peopleOutline, closeOutline } from 'ionicons/icons'
import { useShareList } from '@features/Sharing/composables/useShareList'
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
  listId: string
  listTitle: string
}

interface Emits {
  (e: 'close'): void
  (e: 'shared'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const {
  shares,
  loading,
  fetchShares,
  addShare,
  removeShare,
} = useShareList(props.listId)

const newShareEmail = ref('')
const addingShare = ref(false)

const defaultAvatar = 'https://ionicframework.com/docs/img/demos/avatar.svg'

// Computed
const hasShares = computed(() => shares.value.length > 0)
const canAddShare = computed(() => {
  const email = newShareEmail.value.trim()
  return email.length > 0 && email.includes('@')
})

// Methods
const handleAddShare = async () => {
  if (!canAddShare.value) return

  addingShare.value = true

  try {
    await addShare(newShareEmail.value.trim())

    // Show success toast
    const toast = await toastController.create({
      message: t('sharing.shareAdded'),
      duration: 2000,
      color: 'success',
      position: 'bottom',
    })
    await toast.present()

    // Clear input
    newShareEmail.value = ''

    // Emit event
    emit('shared')
  } catch (error: any) {
    // Show error toast
    const toast = await toastController.create({
      message: error.message || t('sharing.shareAddFailed'),
      duration: 3000,
      color: 'danger',
      position: 'bottom',
    })
    await toast.present()
  } finally {
    addingShare.value = false
  }
}

const handleRemoveShare = async (shareId: string, email: string) => {
  // Confirm removal
  const confirmed = confirm(t('sharing.confirmRemoveShare', { email }))
  if (!confirmed) return

  try {
    await removeShare(shareId)

    // Show success toast
    const toast = await toastController.create({
      message: t('sharing.shareRemoved'),
      duration: 2000,
      color: 'success',
      position: 'bottom',
    })
    await toast.present()
  } catch (error: any) {
    // Show error toast
    const toast = await toastController.create({
      message: error.message || t('sharing.shareRemoveFailed'),
      duration: 3000,
      color: 'danger',
      position: 'bottom',
    })
    await toast.present()
  }
}

const handleClose = () => {
  emit('close')
}

// Lifecycle
onMounted(async () => {
  if (props.isOpen) {
    await fetchShares()
  }
})
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="handleClose"
    :initial-breakpoint="0.75"
    :breakpoints="[0, 0.5, 0.75, 1]"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('sharing.manageSharing') }}</ion-title>
        <ion-buttons slot="start">
          <ion-button @click="handleClose">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-8">
        <ion-spinner></ion-spinner>
      </div>

      <!-- Loaded state -->
      <div v-else>
        <!-- List title -->
        <div class="mb-4">
          <h2 class="text-lg font-semibold">{{ listTitle }}</h2>
          <p class="text-sm text-gray-500">
            {{ t('sharing.manageWhoCanAccess') }}
          </p>
        </div>

        <!-- Add new share -->
        <ion-list class="mb-6">
          <ion-list-header>
            <ion-icon :icon="addOutline" class="mr-2"></ion-icon>
            {{ t('sharing.addPeople') }}
          </ion-list-header>

          <ion-item>
            <ion-input
              v-model="newShareEmail"
              type="email"
              :placeholder="t('sharing.enterEmail')"
              @keyup.enter="handleAddShare"
            ></ion-input>
            <ion-button
              slot="end"
              :disabled="!canAddShare || addingShare"
              @click="handleAddShare"
            >
              <ion-spinner v-if="addingShare" slot="start"></ion-spinner>
              <span v-else>{{ t('sharing.add') }}</span>
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Current shares -->
        <ion-list v-if="hasShares">
          <ion-list-header>
            <ion-icon :icon="peopleOutline" class="mr-2"></ion-icon>
            {{ t('sharing.sharedWith') }} ({{ shares.length }})
          </ion-list-header>

          <ion-item v-for="share in shares" :key="share.id">
            <ion-avatar slot="start">
              <img :src="share.avatar || defaultAvatar" :alt="share.fullName || share.email" />
            </ion-avatar>

            <ion-label>
              <h2 class="font-semibold">{{ share.fullName || t('sharing.noName') }}</h2>
              <p class="text-sm text-gray-500">{{ share.email }}</p>
            </ion-label>

            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              @click="handleRemoveShare(share.id, share.email)"
            >
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Empty state -->
        <div v-else class="text-center py-8">
          <ion-icon
            :icon="peopleOutline"
            class="text-6xl text-gray-300 mb-4"
          ></ion-icon>
          <p class="text-gray-500">{{ t('sharing.noShares') }}</p>
          <p class="text-sm text-gray-400">{{ t('sharing.addPeopleAbove') }}</p>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
/* Add any custom styles */
</style>
```

#### 2. `src/features/Sharing/composables/useShareList.ts`

```typescript
import { ref, Ref } from 'vue'
import { apiListShare } from '@features/Sharing/api'
import type { ListShare } from '@entities/list'
import { syncService } from '@shared/services/sync/sync.service'

export interface UseShareListReturn {
  shares: Ref<ListShare[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  fetchShares: () => Promise<void>
  addShare: (email: string) => Promise<void>
  removeShare: (shareId: string) => Promise<void>
}

/**
 * Composable for managing list shares
 * @param listId List ID
 */
export function useShareList(listId: string): UseShareListReturn {
  const shares = ref<ListShare[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch current shares for the list
   */
  const fetchShares = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await apiListShare.getShares(listId)
      shares.value = response.shares || []
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch shares'
      console.error('Failed to fetch shares:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Add a new share
   */
  const addShare = async (email: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await apiListShare.shareList(listId, { email })

      // Trigger sync to get updated list with new share
      await syncService.forceSync()

      // Refresh shares
      await fetchShares()
    } catch (err: any) {
      error.value = err.message || 'Failed to add share'
      console.error('Failed to add share:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Remove a share
   */
  const removeShare = async (shareId: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await apiListShare.removeShare(shareId)

      // Trigger sync to get updated list
      await syncService.forceSync()

      // Refresh shares
      await fetchShares()
    } catch (err: any) {
      error.value = err.message || 'Failed to remove share'
      console.error('Failed to remove share:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    shares,
    loading,
    error,
    fetchShares,
    addShare,
    removeShare,
  }
}
```

#### 3. `src/features/Sharing/api/index.ts` (modify)

Add missing endpoints:

```typescript
import { API } from '@shared/instances/axios'
import type { ListShare } from '@entities/list'

export const apiListShare = {
  /**
   * Get shares for a list
   */
  async getShares(listId: string): Promise<{ shares: ListShare[] }> {
    const response = await API.get(`/sharing/lists/${listId}/shares`)
    return response.data
  },

  /**
   * Share list with user by email
   */
  async shareList(listId: string, payload: { email: string }): Promise<void> {
    await API.post(`/sharing/lists/${listId}/invite-user`, payload)
  },

  /**
   * Remove share
   */
  async removeShare(shareId: string): Promise<void> {
    await API.delete(`/sharing/lists/${shareId}/leave`)
  },
}
```

### Update Existing Components

#### File: `src/entities/list/ui/ListCard.vue`

Add "Manage Shares" button:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ShareManagementDialog from '@features/Sharing/ui/ShareManagementDialog.vue'

const isShareDialogOpen = ref(false)

const openShareDialog = () => {
  isShareDialogOpen.value = true
}

const closeShareDialog = () => {
  isShareDialogOpen.value = false
}
</script>

<template>
  <ion-card>
    <!-- ... existing content ... -->

    <ion-card-content>
      <ion-button @click="openShareDialog" fill="outline" size="small">
        <ion-icon :icon="peopleOutline" slot="start"></ion-icon>
        {{ t('sharing.manageSharing') }}
      </ion-button>
    </ion-card-content>
  </ion-card>

  <!-- Share Management Dialog -->
  <ShareManagementDialog
    :is-open="isShareDialogOpen"
    :list-id="list.id"
    :list-title="list.title"
    @close="closeShareDialog"
    @shared="syncService.forceSync()"
  />
</template>
```

### Localization

#### File: `src/shared/localization/en.json`

```json
{
  "sharing": {
    "manageSharing": "Manage Sharing",
    "manageWhoCanAccess": "Manage who can access this list",
    "addPeople": "Add People",
    "sharedWith": "Shared With",
    "enterEmail": "Enter email address",
    "add": "Add",
    "noShares": "Not shared with anyone yet",
    "addPeopleAbove": "Add people using the form above",
    "confirmRemoveShare": "Remove {email} from this list?",
    "shareAdded": "Share added successfully",
    "shareRemoved": "Share removed successfully",
    "shareAddFailed": "Failed to add share",
    "shareRemoveFailed": "Failed to remove share",
    "noName": "No name"
  }
}
```

### Testing

#### File: `src/features/Sharing/ui/__tests__/ShareManagementDialog.spec.ts`

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareManagementDialog from '../ShareManagementDialog.vue'
import { useShareList } from '@features/Sharing/composables/useShareList'

// Mock composable
vi.mock('@features/Sharing/composables/useShareList', () => ({
  useShareList: vi.fn(),
}))

describe('ShareManagementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render share list', async () => {
    const mockShares = [
      { id: '1', email: 'user1@example.com', fullName: 'User One', avatar: null },
      { id: '2', email: 'user2@example.com', fullName: 'User Two', avatar: null },
    ]

    ;(useShareList as any).mockReturnValue({
      shares: { value: mockShares },
      loading: { value: false },
      error: { value: null },
      fetchShares: vi.fn(),
      addShare: vi.fn(),
      removeShare: vi.fn(),
    })

    const wrapper = mount(ShareManagementDialog, {
      props: {
        isOpen: true,
        listId: 'list-123',
        listTitle: 'Groceries',
      },
    })

    expect(wrapper.text()).toContain('User One')
    expect(wrapper.text()).toContain('user1@example.com')
  })

  it('should call addShare when add button clicked', async () => {
    const mockAddShare = vi.fn()

    ;(useShareList as any).mockReturnValue({
      shares: { value: [] },
      loading: { value: false },
      error: { value: null },
      fetchShares: vi.fn(),
      addShare: mockAddShare,
      removeShare: vi.fn(),
    })

    const wrapper = mount(ShareManagementDialog, {
      props: {
        isOpen: true,
        listId: 'list-123',
        listTitle: 'Groceries',
      },
    })

    // Enter email
    const input = wrapper.find('ion-input')
    await input.setValue('newuser@example.com')

    // Click add button
    const button = wrapper.find('ion-button[slot="end"]')
    await button.trigger('click')

    expect(mockAddShare).toHaveBeenCalledWith('newuser@example.com')
  })

  it('should show empty state when no shares', () => {
    ;(useShareList as any).mockReturnValue({
      shares: { value: [] },
      loading: { value: false },
      error: { value: null },
      fetchShares: vi.fn(),
      addShare: vi.fn(),
      removeShare: vi.fn(),
    })

    const wrapper = mount(ShareManagementDialog, {
      props: {
        isOpen: true,
        listId: 'list-123',
        listTitle: 'Groceries',
      },
    })

    expect(wrapper.text()).toContain('Not shared with anyone yet')
  })
})
```

### Acceptance Criteria

- [ ] ShareManagementDialog component created
- [ ] Shows list of current shares (avatar, name, email)
- [ ] Can add new share by email
- [ ] Can remove share with confirmation
- [ ] Loading states displayed correctly
- [ ] Error states displayed with toasts
- [ ] Empty state shown when no shares
- [ ] Real-time updates when shares change (via WebSocket)
- [ ] Integrates with ListCard component
- [ ] Localization strings added (EN)
- [ ] Unit tests pass (100% coverage)
- [ ] E2E test: share list → other user sees it instantly

---

## Phase 3: Real-Time Notifications

**Effort:** 2 hours
**Priority:** MEDIUM (nice-to-have)

### Problem

Users don't get notified when:
- List is shared with them
- Shared list is updated by another user
- Share is removed

### Solution

Add toast notifications using Ionic Toast Controller.

### Files to Modify

#### `src/shared/services/websocket.service.ts`

Add notification method:

```typescript
import { toastController } from '@ionic/vue'

export class WebSocketService {
  // ... existing code

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel',
        },
      ],
    })

    await toast.present()
  }

  /**
   * Handle list update with notification
   */
  private async handleListUpdate(payload: any): Promise<void> {
    // ... existing code

    // Show notification if not current user's update
    if (!payload.isOwnUpdate) {
      await this.showToast(`List "${payload.data.title}" was updated`, 'success')
    }
  }

  /**
   * Handle share added with notification
   */
  private async handleShareAdded(payload: any): Promise<void> {
    // ... existing code

    await this.showToast(`You've been added to "${payload.listTitle}"`, 'success')
  }

  /**
   * Handle share removed with notification
   */
  private async handleShareRemoved(payload: any): Promise<void> {
    // ... existing code

    await this.showToast(`You've been removed from "${payload.listTitle}"`, 'warning')
  }
}
```

### Acceptance Criteria

- [ ] Toast shown when list is updated by another user
- [ ] Toast shown when added to shared list
- [ ] Toast shown when removed from shared list
- [ ] Toasts dismissable
- [ ] Toasts don't interrupt user actions

---

## Summary

**Total Frontend Effort:** ~22 hours

| Phase | Effort | Priority |
|-------|--------|----------|
| WebSocket Service | 8h | CRITICAL |
| ShareManagementDialog UI | 12h | CRITICAL |
| Real-Time Notifications | 2h | MEDIUM |

**Key Deliverables:**
1. ✅ WebSocket service with auto-connect/disconnect
2. ✅ Real-time updates for lists/items (<100ms latency)
3. ✅ ShareManagementDialog UI (add/remove shares)
4. ✅ Real-time notifications (toasts)
5. ✅ Comprehensive tests (unit + E2E)
6. ✅ Localization (EN)

**Integration Points:**
- User Store (connect/disconnect WebSocket)
- List Pages (subscribe/unsubscribe to lists)
- Sync Service (trigger sync after share operations)
- IndexedDB (update local data on WebSocket events)

**Next:** Integration testing with backend, performance testing, deployment

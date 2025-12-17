import {Ref, watchEffect} from 'vue'
import {onMounted, onUnmounted, ref} from 'vue'
import {Subscription} from 'rxjs'
import {listRxService} from '@shared/services/rxjs/list.service'
import {syncService} from '@shared/services/sync/sync.service'
import type {LocalList} from '@shared/db'
import type {ListForm} from '../model/types'
import {UserId} from "@entities/user";
import {Nullable} from "@shared/types/global";

/**
 * Vue composable for reactive lists with RxJS
 *
 * Features:
 * - Automatic subscription to lists from IndexedDB
 * - Real-time updates via RxJS observables
 * - Sync status monitoring
 * - CRUD operations with optimistic updates
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { useListsRx } from '@entities/list'
 *
 * const {
 *   lists,
 *   isLoading,
 *   syncStatus,
 *   createList,
 *   updateList,
 *   deleteList,
 *   manualSync
 * } = useListsRx()
 * </script>
 * ```
 */
export function useListsRx(ownerId?: Ref<Nullable<UserId>>) {
  // Reactive state
  const lists = ref<LocalList[]>([]) as Ref<LocalList[]>
  const isLoading = ref(true)
  const syncStatus = ref<'SYNCED' | 'PENDING' | 'SYNCING' | 'ERROR'>('SYNCED')
  const error = ref<string | null>(null)

  // Subscriptions
  let listsSubscription: Subscription | null = null
  let syncStatusSubscription: Subscription | null = null

  void ownerId

  /**
   * Initialize subscriptions
   */
  const initialize = () => {
    // Subscribe to lists
    // const lists$ = ownerId?.value
    //   ? listRxService.getListsByOwner$(ownerId.value)
    //   : listRxService.getLists$()

    const lists$ = listRxService.getLists$()

    listsSubscription = lists$.subscribe({
      next: (data) => {
        lists.value = data
        isLoading.value = false
      },
      error: (err) => {
        console.error('Error loading lists:', err)
        error.value = err.message
        isLoading.value = false
      },
    })

    // Subscribe to sync status
    syncStatusSubscription = listRxService.getSyncStatus$().subscribe({
      next: (status) => {
        syncStatus.value = status
      },
    })

    // Trigger initial sync
    syncService.forceSync().catch((err) => {
      console.error('Initial sync failed:', err)
    })
  }

  /**
   * Cleanup subscriptions
   */
  const cleanup = () => {
    if (listsSubscription) {
      listsSubscription.unsubscribe()
      listsSubscription = null
    }

    if (syncStatusSubscription) {
      syncStatusSubscription.unsubscribe()
      syncStatusSubscription = null
    }
  }

  /**
   * Create a new list
   * @param listForm List data (title, type)
   * @param listOwnerId Owner user ID
   */
  const createList = async (listForm: ListForm, listOwnerId: string) => {
    try {
      return await listRxService.createList(listForm, listOwnerId)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Update a list
   * @param id List ID
   * @param updates Partial list data
   */
  const updateList = async (
    id: string,
    updates: Partial<Pick<LocalList, 'title' | 'type'>>
  ) => {
    try {
      await listRxService.updateList(id, updates)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Delete a list
   * @param id List ID
   */
  const deleteList = async (id: string) => {
    try {
      await listRxService.deleteList(id)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Manually trigger sync
   */
  const manualSync = async () => {
    try {
      await syncService.forceSync()
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Get single list by ID
   * @param id List ID
   */
  const getListById = (id: string): LocalList | undefined => {
    return lists.value.find((list) => list.id === id)
  }

  // Lifecycle hooks
  watchEffect(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    lists,
    isLoading,
    syncStatus,
    error,

    // Methods
    createList,
    updateList,
    deleteList,
    manualSync,
    getListById,
  }
}

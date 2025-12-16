<script setup lang="ts">
import {
  IonSpinner,
  IonButton,
  onIonViewWillEnter,
  alertController,
  IonFabButton,
  IonFab,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useListRx } from '@/entities/list'
import {
  Ellipsis,
  Trash,
  SquarePen,
  Plus,
  LayoutList,
  Share2,
} from 'lucide-vue-next'
import { CreateEditListDialogService } from '@/features/List/CreateEdit'
import { ActionDropdown, type ActionItem } from '@/shared/ui/ActionDropdown'
import { EmptyContent, PageWrapper } from '@shared/ui'
import { ShareListModal } from '@features/Sharing'
import { useUserStore } from '@entities/user'
import {ListItemCard} from "@entities/list"
import { syncService } from '@shared/services/sync/sync.service'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// Initialize reactive list composable
const listId = ref<string | null>(null)
const {
  list,
  isLoading,
  watchList,
  deleteList: deleteListRx,
  toggleItem,
  deleteItem,
} = useListRx()

const pageRef = ref()

const shareModalOpen = ref(false)

// Check if current user is the owner of the list
const isCurrentUserOwner = computed(() => {
  return userStore.info?.id === list.value?.ownerId
})

const handleItemToggle = async (itemId: string, checked: boolean) => {
  if (!list.value) return

  try {
    // RxJS service handles optimistic updates automatically
    await toggleItem(itemId, checked)
  } catch (error) {
    console.error('Failed to toggle item:', error)
  }
}

const handleItemDelete = async (itemId: string) => {
  if (!list.value) return

  try {
    // RxJS service handles optimistic updates automatically
    await deleteItem(itemId)
  } catch (error) {
    console.error('Failed to delete item:', error)
  }
}

const handleEditList = async () => {
  if (!list.value) return

  const dialog = await CreateEditListDialogService.open({
    id: list.value.id,
    list: list.value,
    callback: async () => {
      // List will update automatically via RxJS subscription
      await syncService.forceSync()
    },
  })

  await dialog.present()
}

const handleDeleteList = async () => {
  if (!list.value) return

  const alert = await alertController.create({
    header: 'Delete List',
    message: `Are you sure you want to delete "${list.value.title}"? This action cannot be undone.`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel',
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteListRx(list.value!.id)
            await router.replace({ name: 'TabLists' })
          } catch (error) {
            console.error('Failed to delete list:', error)
          }
        },
      },
    ],
  })

  await alert.present()
}

const handleShareList = () => {
  shareModalOpen.value = true
}

const dropdownActions = computed((): ActionItem[] => {
  if (!list.value) return []

  const actions: ActionItem[] = [
    {
      id: 'edit',
      label: 'Rename list',
      icon: SquarePen,
      color: 'medium',
      action: handleEditList,
    }
  ]

  // Only add share option if user is the owner
  if (isCurrentUserOwner.value) {
    actions.unshift({
      id: 'share',
      label: 'Share list',
      icon: Share2,
      color: 'primary',
      action: handleShareList,
    })
  }

  // Only add delete option if user is the owner
  if (isCurrentUserOwner.value) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      color: 'danger',
      action: handleDeleteList,
    })
  }

  return actions
})

// Watch for route changes and subscribe to list
onIonViewWillEnter(() => {
  const id = String(route.params.id)
  if (id) {
    listId.value = id
    watchList(id)
  }
})
</script>

<template>
  <PageWrapper
      is-inner
      ref="pageRef"
      default-href="/tabs/lists"
      :title="list?.title ?? ''"
  >
    <template #header-tools>
      <ActionDropdown :actions="dropdownActions" triggerId="list-actions-dropdown">
        <template #trigger="{triggerId}">
          <ion-button :id="triggerId" size="small">
            <Ellipsis slot="icon-only" class="size-6"/>
          </ion-button>
        </template>
      </ActionDropdown>
    </template>

    <!-- Loading State -->
    <div v-if="isLoading && !list" class="flex justify-center items-center py-12">
      <ion-spinner name="circular" class="size-8"></ion-spinner>
    </div>

    <EmptyContent
        v-else-if="!list?.items.length"
        :icon="LayoutList"
        title="No items yet"
        description="Start adding items to this list to get organized!"
    >
      <div class="flex justify-center">
        <ion-button @click="router.push({name: 'AddItem', params: {id: list?.id}})">
          Add Item
        </ion-button>
      </div>
    </EmptyContent>

    <div v-else>
      <ion-list v-auto-animate class="bg-transparent" lines="none">
        <ListItemCard
            v-for="item in list.items.filter(i => !i.checked)"
            :key="item.id"
            :item="item"
            @toggle="handleItemToggle"
            @delete="handleItemDelete"
        />
      </ion-list>

      <template v-if="list.items.filter(i => i.checked).length">
        <div class="p-4 text-center">
          <div class="text-sm text-zinc-500">Completed items</div>
        </div>
        <ion-list v-auto-animate class="bg-transparent" lines="none">
          <ListItemCard
              v-for="item in list.items.filter(i => i.checked)"
              :key="item.id"
              :item="item"
              @toggle="handleItemToggle"
              @delete="handleItemDelete"
          />
        </ion-list>
      </template>
    </div>

    <ion-fab v-if="list?.items.length" slot="fixed" vertical="bottom" horizontal="end" class="p-3">
      <ion-fab-button @click="router.push({name: 'AddItem', params: {id: list?.id}})">
        <Plus/>
      </ion-fab-button>
    </ion-fab>

    <!-- Share List Modal -->
    <ShareListModal
      v-if="list"
      :is-open="shareModalOpen"
      :list-id="list.id"
      :list-title="list.title"
      @close="shareModalOpen = false"
      @shared="syncService.forceSync()"
    />
  </PageWrapper>
</template>

<style scoped>

</style>

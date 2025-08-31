<script setup lang="ts">
import {
  IonSpinner,
  IonButton,
  onIonViewWillEnter,
  IonButtons,
  alertController,
  IonFabButton,
  IonFab,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { ListItem, useList } from '@/entities/list'
import { useListItem } from '@/entities/list-item'
import {
  Ellipsis,
  ShoppingCart,
  CheckSquare,
  List as ListIcon,
  Trash,
  SquarePen,
  Plus,
  LayoutList,
} from 'lucide-vue-next'
import { useDeleteList } from '@/features/List/Delete'
import { CreateEditListDialogService } from '@/features/List/CreateEdit'
import { ActionDropdown, type ActionItem } from '@/shared/ui/ActionDropdown'
import { EmptyContent, PageWrapper } from '@shared/ui'

const route = useRoute()
const router = useRouter()
const { list, isLoading, error, fetchList } = useList()
const { deleteList } = useDeleteList()
const { toggleItem, deleteItem } = useListItem()

const pageRef = ref()
const presentingElement = computed(() => pageRef.value?.$el)

const getListIcon = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return ShoppingCart
    case 'TODO':
      return CheckSquare
    default:
      return ListIcon
  }
}

const getListTypeColor = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return 'text-blue-500'
    case 'TODO':
      return 'text-green-500'
    default:
      return 'text-zinc-500'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const handleItemToggle = async (itemId: string, checked: boolean) => {
  if (!list.value) return

  // Optimistically update the UI
  const item = list.value.items.find((item) => item.id === itemId)
  if (item) {
    item.checked = checked
  }

  // Make the API call
  const success = await toggleItem(itemId, checked)

  // If the API call failed, revert the optimistic update
  if (!success && item) {
    item.checked = !checked
  }
}

const handleItemDelete = async (itemId: string) => {
  if (!list.value) return

  // Optimistically remove the item from the UI
  const itemIndex = list.value.items.findIndex((item) => item.id === itemId)
  let removedItem = null

  if (itemIndex !== -1) {
    removedItem = list.value.items.splice(itemIndex, 1)[0]
  }

  // Make the API call
  const success = await deleteItem(itemId)

  // If the API call failed, restore the item
  if (!success && removedItem && itemIndex !== -1) {
    list.value.items.splice(itemIndex, 0, removedItem)
  }
}

const handleEditList = async () => {
  if (!list.value) return

  const dialog = await CreateEditListDialogService.open({
    id: list.value.id,
    list: list.value,
    callback: async () => {
      await fetchList(list.value!.id)
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
            await deleteList(list.value!.id)
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

const dropdownActions = computed((): ActionItem[] => {
  if (!list.value) return []

  return [
    {
      id: 'edit',
      label: 'Rename list',
      icon: SquarePen,
      color: 'medium',
      action: handleEditList,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      color: 'danger',
      action: handleDeleteList,
    },
  ]
})

onIonViewWillEnter(() => {
  const listId = String(route.params.id)
  if (listId) {
    void fetchList(listId)
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
      <ion-buttons slot="end">
        <ActionDropdown :actions="dropdownActions" triggerId="list-actions-dropdown">
          <template #trigger="{triggerId}">
            <ion-button :id="triggerId" size="small">
              <Ellipsis slot="icon-only" class="size-6"/>
            </ion-button>
          </template>
        </ActionDropdown>
      </ion-buttons>
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
        <ListItem
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
          <ListItem
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
  </PageWrapper>
</template>

<style scoped>

</style>

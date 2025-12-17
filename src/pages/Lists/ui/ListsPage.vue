<script setup lang="ts">
import { onIonViewWillEnter, IonFab, IonFabButton, IonButton, alertController } from '@ionic/vue'
import { useListsRx, ListCard, SkeletonListCards } from '@/entities/list'
import { Plus, TextSearch, Bell } from 'lucide-vue-next'
import { CreateEditListDialogService } from '@/features/List/CreateEdit'
import { EmptyContent, PageWrapper } from '@shared/ui'
import { useUserStore } from '@entities/user'
import {useI18n} from "vue-i18n";
import {storeToRefs} from "pinia";
import { useActionsDialog } from '@features/Actions'
import { useRouter } from 'vue-router'
import type { LocalList } from '@shared/db'
import { listRxService } from '@shared/services/rxjs/list.service'

const {t} = useI18n()
const router = useRouter()
const userStore = useUserStore()

// Get current user for filtering lists
const {userId} = storeToRefs(userStore)

// Use RxJS composable with userId filtering to show only current user's lists
const { lists, isLoading, manualSync } = useListsRx(userId)

const handleAddList = async () => {
  const dialog = await CreateEditListDialogService.open({
    callback: async () => {
      // Trigger manual sync after creating list
      await manualSync()
    },
  })

  await dialog.present()
}

const handleOpenActionsDialog = async (list: LocalList) => {
  const { open } = useActionsDialog()
  const dialog = await open({
    listId: list.id,
    listTitle: list.title,
    listOwnerId: list.ownerId,
    currentUserId: userStore.info?.id || '',
    itemsCount: list.items.length,
    checkedItemsCount: list.items.filter(i => i.checked).length,
    uncheckedItemsCount: list.items.filter(i => !i.checked).length,
  })

  await dialog.present()
  const { data } = await dialog.onDidDismiss()

  if (!data?.action) return

  switch (data.action) {
    case 'edit': {
      const editDialog = await CreateEditListDialogService.open({
        id: list.id,
        list: list,
        callback: async () => await manualSync(),
      })
      await editDialog.present()
      break
    }

    case 'share': {
      // Navigate to preview for share
      router.push({ name: 'ListPreview', params: { id: list.id } })
      break
    }

    case 'uncheckAll':
    case 'checkAll': {
      // Navigate to preview for these actions
      router.push({ name: 'ListPreview', params: { id: list.id } })
      break
    }

    case 'delete': {
      const alert = await alertController.create({
        header: 'Delete List',
        message: `Are you sure you want to delete "${list.title}"?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: async () => {
              await listRxService.deleteList(list.id)
              await manualSync()
            },
          },
        ],
      })
      await alert.present()
      break
    }
  }
}

// Trigger sync on page enter
onIonViewWillEnter(() => void manualSync())
</script>

<template>
  <PageWrapper :title="t('lists.title')">
    <template #header-tools>
      <ion-button>
        <Bell slot="icon-only" class="size-6" />
      </ion-button>
      <!--
      <ion-button>
        <Ellipsis slot="icon-only" class="size-6" />
      </ion-button>
      -->
    </template>

    <SkeletonListCards v-if="isLoading && !lists.length"/>
    <EmptyContent
        v-else-if="!lists.length"
        :icon="TextSearch"
        title="No lists yet"
        description="Create your first list to get started organizing!"
    />
    <div v-else class="grid grid-cols-2 gap-4">
      <ListCard
          v-for="list in lists"
          :key="list.id"
          :list="list"
          @open-actions="handleOpenActionsDialog"
      />
    </div>

    <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="p-3">
      <ion-fab-button @click="handleAddList">
        <Plus/>
      </ion-fab-button>
    </ion-fab>
  </PageWrapper>
</template>

<style scoped>

</style>

<script setup lang="ts">
import { onIonViewWillEnter, IonFab, IonFabButton, IonButton } from '@ionic/vue'
import { useListsRx, ListCard, SkeletonListCards } from '@/entities/list'
import { Ellipsis, Plus, TextSearch, Bell } from 'lucide-vue-next'
import { CreateEditListDialogService } from '@/features/List/CreateEdit'
import { EmptyContent, PageWrapper } from '@shared/ui'
import { useUserStore } from '@entities/user'

// Get current user for filtering lists
const userStore = useUserStore()

// Use RxJS composable with userId filtering to show only current user's lists
const { lists, isLoading, manualSync } = useListsRx(userStore.info?.id)

const handleAddList = async () => {
  const dialog = await CreateEditListDialogService.open({
    callback: async () => {
      // Trigger manual sync after creating list
      await manualSync()
    },
  })

  await dialog.present()
}

// Trigger sync on page enter
onIonViewWillEnter(() => void manualSync())
</script>

<template>
  <PageWrapper title="Lists">
    <template #header-tools>
      <ion-buttons slot="end">
        <ion-button size="small" @click="handleAddList">
          <Bell slot="icon-only" class="size-6" />
        </ion-button>
        <ion-button size="small" @click="handleAddList">
          <Ellipsis slot="icon-only" class="size-6" />
        </ion-button>
      </ion-buttons>
    </template>

<!--    <pre>{{lists}}</pre>-->

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

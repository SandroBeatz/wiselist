<script setup lang="ts">
import {
  onIonViewWillEnter,
  IonFab,
  IonFabButton,
  IonButton
} from "@ionic/vue";
import {useListsStore, ListCard} from "@/entities/list";
import {storeToRefs} from "pinia";
import {Ellipsis, Plus, TextSearch, Bell} from "lucide-vue-next";
import {CreateEditListDialogService} from "@/features/List/CreateEdit";
import {EmptyContent, PageWrapper} from "@shared/ui";

const listsStore = useListsStore()
const {isLoading, lists} = storeToRefs(listsStore)

const handleAddList = async () => {
  const dialog = await CreateEditListDialogService.open({
    callback: async () => {
      await listsStore.fetchData()
    }
  });

  await dialog.present();
};

onIonViewWillEnter(() => void listsStore.fetchData())
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
    <!-- Empty State -->
    <EmptyContent
        v-if="!lists.length"
        :icon="TextSearch"
        title="No lists yet"
        description="Create your first list to get started organizing!"
    />

    <div v-if="lists.length" class="grid grid-cols-2 gap-4">
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

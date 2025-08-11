<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonButton
} from "@ionic/vue";
import {useListsStore, ListCard} from "@/entities/list";
import {storeToRefs} from "pinia";
import {Ellipsis, Plus} from "lucide-vue-next";
import {CreateEditListDialogService} from "@/features/List/CreateEdit";

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
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Lists</ion-title>

        <ion-buttons slot="end">
          <ion-button size="small">
            <Ellipsis slot="icon-only" class="size-6"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large" class="p-0">Lists</ion-title>
        </ion-toolbar>
      </ion-header>
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <ion-spinner name="circular" class="size-8"></ion-spinner>
      </div>

      <!-- Empty State -->
      <div v-else-if="!lists.length" class="text-center py-12">
        <div class="mb-4 flex justify-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-zinc-400">
            <rect x="15" y="20" width="50" height="40" rx="6" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="25" y1="32" x2="55" y2="32" stroke="currentColor" stroke-width="2"/>
            <line x1="25" y1="42" x2="45" y2="42" stroke="currentColor" stroke-width="2"/>
            <line x1="25" y1="52" x2="50" y2="52" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-zinc-700 mb-2">No lists yet</h3>
        <p class="text-zinc-500 mb-6">Create your first list to get started organizing!</p>
      </div>

      <!-- Lists Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ListCard
          v-for="list in lists"
          :key="list.id"
          :list="list"
        />
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="p-3">
        <ion-fab-button @click="handleAddList">
          <Plus />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>

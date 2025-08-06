<script setup lang="ts">
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonRippleEffect, onIonViewWillEnter, IonFab, IonFabButton} from "@ionic/vue";
import {computed} from "vue";
import {mockLists, useListsStore} from "@/entities/list";
import {storeToRefs} from "pinia";
import {Plus} from "lucide-vue-next";
import {CreateEditListDialog} from "@/features/List/CreateEdit";

const lists = computed(() => mockLists);

const listsStore = useListsStore()
const {isLoading, lists: newLists} = storeToRefs(listsStore)

onIonViewWillEnter(() => void listsStore.fetchData())
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Lists</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large" class="p-0">Lists</ion-title>
        </ion-toolbar>
      </ion-header>
      <pre>{{isLoading}}</pre>
      <pre>{{newLists}}</pre>

      <div class="grid grid-cols-2 gap-4">
        <template v-for="list in lists" :key="list.id">
          <router-link :to="{name: 'ListPreview', params: {id: list.id}}" class="ion-activatable ripple-parent relative border border-zinc-500 rounded-lg p-4">
            <div class="text-lg font-semibold">{{ list.title }}</div>
            <div class="text-sm text-zinc-400">{{ new Date(list.createdAt).toLocaleDateString() }}</div>
            <div class="text-xs text-zinc-500 mt-2">Items: {{ list.count_of_items }}</div>
            <div class="text-xs text-zinc-500">People: {{ list.assigned_people.join(', ') }}</div>
            <ion-ripple-effect></ion-ripple-effect>
          </router-link>
        </template>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="p-3">
        <CreateEditListDialog>
          <template #trigger="{id}">
            <ion-fab-button :id="id">
              <Plus />
            </ion-fab-button>
          </template>
        </CreateEditListDialog>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>

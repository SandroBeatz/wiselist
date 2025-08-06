<script setup lang="ts">
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonRippleEffect} from "@ionic/vue";
import {computed} from "vue";
import {mockLists} from "@/entities/list";

const lists = computed(() => mockLists);
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
    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>

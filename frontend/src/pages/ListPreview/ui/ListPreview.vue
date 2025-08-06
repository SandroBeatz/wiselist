<script setup lang="ts">
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar} from "@ionic/vue";
import {computed} from "vue";
import {useRoute} from "vue-router";
import {mockLists} from "@/entities/list";

const route = useRoute();

const list = computed(() => mockLists.find(i => i.id === String(route.params.id)));
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="ion-padding-horizontal">
        <ion-title>{{list?.title}}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{list?.title}}</ion-title>
        </ion-toolbar>
      </ion-header>


    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>

<script setup lang="ts">
import {Settings, ListCheck} from "lucide-vue-next";
import {IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs} from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="tab1" href="/tabs/lists">
          <ListCheck aria-hidden="true" />
          <ion-label>Lists</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab3" href="/tabs/settings">
          <Settings aria-hidden="true" />
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style scoped>

</style>

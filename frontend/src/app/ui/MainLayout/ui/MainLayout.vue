<script setup lang="ts">
import {Settings, ListCheck} from "lucide-vue-next";
import {IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs} from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="tab1" href="/tabs/lists">
          <ListCheck aria-hidden="true" class="size-7" />
        </ion-tab-button>

        <ion-tab-button tab="tab3" href="/tabs/settings">
          <Settings aria-hidden="true" class="size-7" />
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style scoped>
ion-tab-bar {
  margin: 16px;
  border-radius: 16px;
  height: 64px;
}
</style>

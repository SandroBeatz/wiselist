<script setup lang="ts">
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar} from "@ionic/vue";
import {storeToRefs} from "pinia";
import {useUserStore} from "@/entities/user";
import {useLogout} from "@/features/Auth";

const { info } = storeToRefs(useUserStore())

</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="ion-padding-horizontal">
        <ion-buttons slot="start">
          <ion-back-button></ion-back-button>
        </ion-buttons>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Profile</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-item v-if="info" button>
        <ion-avatar slot="start" class="!w-12 !h-12">
          <img alt="Silhouette of a person's head" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
        </ion-avatar>
        <div class="flex flex-col pl-4 py-3">
          <h2 class="text-base font-semibold !m-0">{{ info.profile.fullName }}</h2>
          <p class="text-sm text-muted">{{ info.email }}</p>
        </div>
      </ion-item>

    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>

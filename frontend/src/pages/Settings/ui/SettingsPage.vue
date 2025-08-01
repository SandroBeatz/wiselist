<script setup lang="ts">
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar} from "@ionic/vue";
import {storeToRefs} from "pinia";
import {useUserStore} from "@/entities/user";
import {useLogout} from "@/features/Auth";
import {useRouter} from "vue-router";

const router = useRouter()

const { info } = storeToRefs(useUserStore())

const {logout} = useLogout()
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="ion-padding-horizontal">
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Settings</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-item v-if="info" button @click="router.push({name: 'SettingsProfile'})">
        <ion-avatar slot="start" class="!w-12 !h-12">
          <img alt="Silhouette of a person's head" :src="info.profile.avatar ?? 'https://ionicframework.com/docs/img/demos/avatar.svg'" />
        </ion-avatar>
        <div class="flex flex-col pl-4 py-3">
          <h2 class="text-base font-semibold !m-0">{{ info.profile.fullName }}</h2>
          <p class="text-sm text-muted">{{ info.email }}</p>
        </div>
      </ion-item>

      <ion-item button @click="logout">
        <ion-label>
          <h3>Logout</h3>
        </ion-label>
      </ion-item>
    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import {useUserStore} from "@/entities/user/model/user.store";
import {onBeforeMount} from "vue";

const userStore = useUserStore()

onBeforeMount(() => {
  void userStore.initUser()
})
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

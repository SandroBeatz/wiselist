<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useUserStore } from '../entities/user/model/user.store'
import { onBeforeMount } from 'vue'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { tokenMonitorService } from '@shared/services/token-monitor.service'

const userStore = useUserStore()

onBeforeMount(async () => {
  await userStore.initUser()
  tokenMonitorService.startMonitoring()
  await SocialLogin.initialize({
    google: {
      webClientId: import.meta.env.VITE_WEB_GOOGLE_AUTH_KEY,
      iOSClientId: import.meta.env.VITE_IOS_GOOGLE_AUTH_KEY,
      iOSServerClientId: import.meta.env.VITE_WEB_GOOGLE_AUTH_KEY,
      mode: 'online',
    },
  })

  // await SocialLogin.logout({
  //   provider: 'google'
  // });
})
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

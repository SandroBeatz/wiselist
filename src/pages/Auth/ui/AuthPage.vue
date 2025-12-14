<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useGoogleAuth } from '@/features/Auth'
import { PageWrapper } from '@shared/ui/Page'
import { GoogleButton } from '@shared/ui/GoogleButton'
import { AppleButton } from '@shared/ui/AppleButton'

const router = useRouter()
const { googleAuth } = useGoogleAuth()
</script>

<template>
  <PageWrapper>
    <div class="flex-1 flex flex-col items-center justify-center text-center">

      <div>
        <img src="@app/assets/img/wiselist-icon.svg" alt="Wiselist Logo" class="h-36 w-36 object-contain" />
      </div>

      <h1 class="text-3xl uppercase font-bold mb-4">Wiselist</h1>
      <p class="text-lg ion-text-mute px-10 mb-8">From shopping to travel — one list to rule them all.</p>

      <div class="flex flex-col gap-4 w-full">
        <AppleButton>Continue with Apple</AppleButton>
        <GoogleButton @click="googleAuth">Continue with Google</GoogleButton>
        <IonButton @click="router.push({name: 'Login'})">Continue with Email</IonButton>
      </div>
    </div>

    <template #footer>
      <p class="text-sm text-center ion-text-mute">
        By continuing, you agree to our <a href="https://google.com" class="ion-text-default">Privacy Policy</a>.
      </p>
    </template>
  </PageWrapper>
</template>

<style scoped>
</style>

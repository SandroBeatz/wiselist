<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useGoogleAuth } from '@/features/Auth'
import { PageWrapper } from '@shared/ui/Page'
import { IconWiselistRounded } from '@shared/ui/Icons'
import { GoogleButton } from '@shared/ui/GoogleButton'
import { AppleButton } from '@shared/ui/AppleButton'

const router = useRouter()
const { googleAuth } = useGoogleAuth()
</script>

<template>
  <PageWrapper>
    <div class="flex-1 flex flex-col items-center justify-center text-center">

      <IconWiselistRounded class="size-24 mb-6"/>

      <h1 class="text-3xl font-semibold mb-2">Wiselist</h1>
      <p class="text-lg text-zinc-500 px-10 mb-8">From shopping to travel — one list to rule them all.</p>

      <div class="flex flex-col gap-4 w-full">
        <AppleButton>Continue with Apple</AppleButton>
        <GoogleButton @click="googleAuth">Continue with Google</GoogleButton>
        <ion-button @click="router.push({name: 'Login'})">Continue with Email</ion-button>
      </div>
    </div>

    <template #footer>
      <p class="text-sm text-center text-zinc-500">
        By continuing, you agree to our <a href="https://google.com" class="text-primary">Privacy Policy</a>.
      </p>
    </template>
  </PageWrapper>
</template>

<style scoped>
</style>

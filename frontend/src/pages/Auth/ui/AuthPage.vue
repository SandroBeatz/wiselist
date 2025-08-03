<script setup lang="ts">
import {IonButton, IonText} from "@ionic/vue";
import {useRouter} from "vue-router";
import {useGoogleAuth} from "@/features/Auth";
import {PageWrapper} from "@shared/ui/Page";

const router = useRouter();
const {googleAuth} = useGoogleAuth()
</script>

<template>
  <PageWrapper>
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="size-60 rounded-4xl overflow-hidden mb-14">
        <img src="../../../app/assets/img/preview.png" alt="asfsa">
      </div>

      <div class="flex flex-col gap-4 w-full">
        <ion-button color="light">Continue with Apple</ion-button>
        <ion-button @click="googleAuth" color="light">Continue with Google</ion-button>
        <ion-button @click="router.push({name: 'Login'})">Continue with Email</ion-button>
      </div>
    </div>

    <template #footer>
      <p class="text-sm text-center">
        <ion-text>
          By continuing, you agree to our <a href="https://google.com">Privacy Policy</a>.
        </ion-text>
      </p>
    </template>
  </PageWrapper>
</template>

<style scoped>
</style>

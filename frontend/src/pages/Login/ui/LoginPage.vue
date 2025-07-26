<script setup lang="ts">
import {
  IonContent,
  IonPage,
  IonButton,
  IonInput,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonHeader,
    IonBackButton
} from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/auth"></ion-back-button>
        </ion-buttons>
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <div class="flex-1 flex flex-col items-center justify-center">
        <div class="mb-14">
          <div class="text-2xl font-semibold">Wiselist</div>
        </div>

        <div class="flex flex-col gap-4 w-full">
          <ion-input
              type="email"
              label="Your email"
              label-placement="floating"
              fill="outline"
              placeholder="Your email"></ion-input>
          <ion-input
              type="password"
              label="Your password"
              label-placement="floating"
              fill="outline"
              placeholder="Your password"></ion-input>

          <ion-button>Login</ion-button>
        </div>

        <div class="pt-14">
          <div class="text-sm">Don't have an account? <router-link :to="{name: 'Register'}">Sign up</router-link></div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header {
  box-shadow: none;
}
ion-toolbar {
  background: transparent;
  --background: transparent;
}
ion-content::part(scroll) {
  display: flex;
}
</style>

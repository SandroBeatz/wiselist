<script setup lang="ts">
import {IonContent, IonPage, IonButton, IonInput, IonButtons, IonTitle, IonHeader, IonToolbar, IonBackButton} from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Sign up</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <div class="flex-1 flex flex-col items-center justify-center">
        <div class="flex flex-col gap-4 w-full">
          <ion-input
              type="text"
              label="Your name"
              label-placement="floating"
              fill="outline"
              placeholder="Your name"></ion-input>
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

          <ion-button>Create account</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-content::part(scroll) {
  display: flex;
}
</style>

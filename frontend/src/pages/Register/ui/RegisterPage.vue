<script setup lang="ts">
import {IonButton, IonInput} from "@ionic/vue";
import {Page} from "@shared/ui/Page";
</script>

<template>
  <Page is-inner title="Sign up">
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
  </Page>
</template>

<style scoped>
ion-content::part(scroll) {
  display: flex;
}
</style>

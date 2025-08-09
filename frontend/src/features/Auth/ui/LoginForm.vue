<script setup lang="ts">
import {IonButton, IonInput} from "@ionic/vue";
import {useLoginForm} from "@/features/Auth/model/useLoginForm";
import {Eye, EyeOff} from "lucide-vue-next";
import {ref} from "vue";

const {form, handleSubmit, handlerField} = useLoginForm()
const showPassword = ref(false)
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <div>
      <ion-text>Your email</ion-text>
      <ion-input
          type="email"
          name="email"
          fill="outline"
          :value="form.email"
          @ionInput="handlerField($event)"
      ></ion-input>
    </div>

    <div>
      <ion-text>Your password</ion-text>
      <ion-input
          :type="showPassword ? 'text' : 'password'"
          name="password"
          fill="solid"
          :value="form.password"
          @ionInput="handlerField($event)"
      >
        <ion-button @click="showPassword = !showPassword" fill="clear" slot="end" aria-label="Show/hide">
          <Eye v-if="!showPassword"/>
          <EyeOff v-else/>
        </ion-button>
      </ion-input>
    </div>

    <ion-button @click="handleSubmit">Login</ion-button>
  </div>
</template>

<style scoped>

</style>

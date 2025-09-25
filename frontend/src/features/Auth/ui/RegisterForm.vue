<script setup lang="ts">
import { IonButton, IonInput, IonText } from '@ionic/vue'
import { useRegisterForm } from '../model/useRegisterForm'
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'

const { form, handlerField, handleSubmit, errors, isSubmitting } = useRegisterForm()
const showPassword = ref(false)
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <div>
      <ion-text>Your name</ion-text>
      <ion-input
          type="text"
          name="name"
          fill="outline"
          :value="form.name"
          @ionInput="handlerField($event)"
          :class="{ 'ion-invalid': errors?.name }"
      ></ion-input>
      <ion-text v-if="errors?.name" color="danger" class="text-sm mt-1">
        {{ errors.name }}
      </ion-text>
    </div>

    <div>
      <ion-text>Your email</ion-text>
      <ion-input
          type="email"
          name="email"
          fill="outline"
          :value="form.email"
          @ionInput="handlerField($event)"
          :class="{ 'ion-invalid': errors?.email }"
      ></ion-input>
      <ion-text v-if="errors?.email" color="danger" class="text-sm mt-1">
        {{ errors.email }}
      </ion-text>
    </div>

    <div>
      <ion-text>Your password</ion-text>
      <ion-input
          :type="showPassword ? 'text' : 'password'"
          name="password"
          fill="solid"
          :value="form.password"
          @ionInput="handlerField($event)"
          :class="{ 'ion-invalid': errors?.password }"
      >
        <ion-button @click="showPassword = !showPassword" fill="clear" slot="end" aria-label="Show/hide">
          <Eye v-if="!showPassword"/>
          <EyeOff v-else/>
        </ion-button>
      </ion-input>
      <ion-text v-if="errors?.password" color="danger" class="text-sm mt-1">
        {{ errors.password }}
      </ion-text>
    </div>

    <ion-button @click="handleSubmit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Creating account...' : 'Create account' }}
    </ion-button>
  </div>
</template>

<style scoped>

</style>

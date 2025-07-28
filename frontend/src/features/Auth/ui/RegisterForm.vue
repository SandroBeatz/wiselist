<script setup lang="ts">
import {IonButton, IonInput} from "@ionic/vue";
import {useRegisterForm} from "../model/useRegisterForm";

const {form, handlerField, handleSubmit} = useRegisterForm()

</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <ion-input
        type="text"
        name="name"
        label="Your name"
        label-placement="floating"
        fill="outline"
        placeholder="Your name"
        :value="form.name"
        @ionInput="handlerField($event)"
    ></ion-input>
    <ion-input
        type="email"
        name="email"
        label="Your email"
        label-placement="floating"
        fill="outline"
        placeholder="Your email"
        :value="form.email"
        @ionInput="handlerField($event)"
    ></ion-input>
    <ion-input
        type="password"
        name="password"
        label="Your password"
        label-placement="floating"
        fill="outline"
        placeholder="Your password"
        :value="form.password"
        @ionInput="handlerField($event)"
    ></ion-input>

    <ion-button @click="handleSubmit">Create account</ion-button>
  </div>
</template>

<style scoped>

</style>

<script setup lang="ts">
import {IonButton, IonInput, IonModal} from "@ionic/vue";
import {useCreateEditListForm} from "../composables/useCreateEditListForm";
import {useTemplateRef} from "vue";
import {useListsStore} from "@/entities/list";

const modal = useTemplateRef('modal');

const idModal = new Date().getTime().toString()

const {form, handlerField, handleSubmit, resetForm} = useCreateEditListForm()

const closeModal = async () => {
  try {
    await useListsStore().fetchData()
    modal.value?.$el.dismiss();
    resetForm();
  } catch (error) {
    console.error('Error closing modal:', error);
  }
};
</script>

<template>
  <slot name="trigger" :id="idModal"></slot>
  <ion-modal ref="modal" :trigger="idModal" :initial-breakpoint="1" :breakpoints="[0, 1]">
    <div class="block ion-padding">
      <div class="text-lg text-medium">New List</div>

      <ion-input
          type="text"
          name="title"
          label="Name"
          label-placement="floating"
          fill="outline"
          placeholder="Your email"
          :value="form.title"
          @ionInput="handlerField($event)"
      ></ion-input>

      <ion-button @click="handleSubmit(closeModal)">Continue with Email</ion-button>
    </div>
  </ion-modal>
</template>

<style scoped>
.block {
  width: 100%;
  height: 300px;
}

ion-modal {
  --height: auto;
}
</style>

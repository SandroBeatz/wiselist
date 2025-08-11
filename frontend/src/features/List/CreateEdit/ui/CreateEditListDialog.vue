<script setup lang="ts">
import {IonButton, IonButtons, IonInput, IonSelect, IonSelectOption, IonText} from "@ionic/vue";
import {useCreateEditListForm} from "../composables/useCreateEditListForm";
import {computed} from "vue";
import {useListsStore, List} from "@/entities/list";
import {X} from "lucide-vue-next";
import type {listId} from "@/entities/list";

interface Props {
  id?: listId;
  list?: List
  callback?: () => Promise<void>;
}

const props = defineProps<Props>();

const isEditMode = computed(() => !!props.id);

const {form, handlerField, handleSubmit, resetForm, errors, isSubmitting} = useCreateEditListForm({
  listId: props.id,
  initialData: props.list
});

const closeModal = () => {
  import('@ionic/vue').then(({ modalController }) => {
    modalController.dismiss();
  });
  resetForm();
};

const closeAndRefetch = async () => {
  try {
    if (isEditMode.value) {
      await props.callback?.()
    } else {
      await useListsStore().fetchData();
    }

    closeModal()
  } catch (error) {
    console.error('Error closing modal:', error);
  }
};
</script>

<template>
  <div class="h-5 ion-padding flex-1 flex flex-col pt-8">
    <ion-buttons class="absolute right-1 top-1">
      <ion-button @click="closeModal" size="small">
        <X slot="icon-only" class="size-6"/>
      </ion-button>
    </ion-buttons>
    <div class="text-2xl font-semibold mb-8">{{ isEditMode ? 'Edit List' : 'Create New List' }}</div>

    <div class="mb-4">
      <ion-input
          type="text"
          name="title"
          placeholder="Name of the list"
          :value="form.title"
          @ionInput="handlerField($event)"
          :class="{ 'ion-invalid': errors?.title }"
      ></ion-input>
      <ion-text v-if="errors?.title" color="danger" class="text-sm">
        {{ errors.title }}
      </ion-text>
    </div>

    <div v-if="!isEditMode" class="mb-4">
      <ion-select
          aria-label="Type"
          interface="popover"
          name="type"
          :value="form.type"
          @ionChange="handlerField($event)"
          :class="{ 'ion-invalid': errors?.type }"
      >
        <ion-select-option value="SHOPPING">Shopping</ion-select-option>
        <ion-select-option value="TODO">Todo</ion-select-option>
        <ion-select-option value="OTHER">Other</ion-select-option>
      </ion-select>
      <ion-text v-if="errors?.type" color="danger" class="text-sm">
        {{ errors.type }}
      </ion-text>
    </div>

    <ion-button
        expand="block"
        @click="handleSubmit(closeAndRefetch)"
        :disabled="isSubmitting"
    >
      {{ isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save' : 'Create') }}
    </ion-button>
  </div>
</template>

<style scoped>

ion-modal {
  --height: auto;
}
</style>

<script setup lang="ts">
import { IonButton, IonButtons, IonText } from '@ionic/vue'
import { X } from 'lucide-vue-next'

interface Props {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
  onConfirm?: () => void | Promise<void>
}

const {
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  onConfirm
} = defineProps<Props>()

const closeModal = () => {
  import('@ionic/vue').then(({ modalController }) => {
    modalController.dismiss()
  })
}

const handleConfirm = async () => {
  try {
    await onConfirm?.()
    closeModal()
  } catch (error) {
    console.error('Error in confirmation action:', error)
  }
}
</script>

<template>
  <div class="h-5 ion-padding flex-1 flex flex-col rounded-lg overflow-hidden">
    <ion-buttons class="absolute right-1 top-1">
      <ion-button @click="closeModal" size="small">
        <X slot="icon-only" class="size-6"/>
      </ion-button>
    </ion-buttons>

    <div class="text-2xl font-semibold mb-6">{{ title }}</div>

    <div class="mb-8">
      <ion-text class="text-base">
        {{ message }}
      </ion-text>
    </div>

    <div class="flex gap-3">
      <ion-button
        expand="block"
        fill="outline"
        @click="closeModal"
        class="flex-1"
      >
        {{ cancelText }}
      </ion-button>

      <ion-button
        expand="block"
        :color="confirmColor"
        @click="handleConfirm"
        class="flex-1"
      >
        {{ confirmText }}
      </ion-button>
    </div>
  </div>
</template>

<style scoped>
ion-modal {
  --height: auto;
}
</style>

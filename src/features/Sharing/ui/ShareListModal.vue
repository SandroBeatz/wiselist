<script setup lang="ts">
import {onMounted, watch} from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent
} from '@ionic/vue'
import { X } from 'lucide-vue-next'
import {ContactsList, useContactsStore} from '@entities/contact'
import {type ListId} from "@entities/list";
import {useShareList} from "@features/Sharing/composables/useShareList";

interface Props {
  isOpen: boolean
  listId: ListId
  listTitle: string
}

interface Emits {
  (e: 'close'): void
  (e: 'shared'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Stores
const contactsStore = useContactsStore()

const {share} = useShareList()
const handleShare = (email: string) => {
  share({
    listId: props.listId,
    email,
  }, () => emit('shared'))
}

const handleClose = () => {
  emit('close')
}

onMounted(async () => {
  await contactsStore.fetchData()
})

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    handleClose()
  }
})
</script>

<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleClose" :initial-breakpoint="0.75" :breakpoints="[0, 0.5, 0.75, 1]">
    <ion-header>
      <ion-toolbar>
        <ion-title>Share "{{ listTitle }}"</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleClose">
            <X class="size-6" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ContactsList @share="handleShare"/>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
</style>

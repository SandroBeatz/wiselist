<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonButtons, modalController } from '@ionic/vue'
import { List } from '@shared/ui'
import { X, SquarePen, Share2, Check, Minus, Trash } from 'lucide-vue-next'
import type { ListProps, ListItemProps, ListSectionProps } from '@shared/ui'
import { useI18n } from 'vue-i18n'
import type { ActionsDialogProps } from '../model/actions.types'

const { t } = useI18n()

const props = defineProps<ActionsDialogProps>()

// Computed visibility conditions
const isOwner = computed(() => props.currentUserId === props.listOwnerId)
const hasItems = computed(() => props.itemsCount > 0)
const hasCheckedItems = computed(() => props.checkedItemsCount > 0)
const hasUncheckedItems = computed(() => props.uncheckedItemsCount > 0)

// Action handlers
const handleEdit = async () => {
  await modalController.dismiss({ action: 'edit' })
}

const handleShare = async () => {
  await modalController.dismiss({ action: 'share' })
}

const handleUncheckAll = async () => {
  await modalController.dismiss({ action: 'uncheckAll' })
}

const handleCheckAll = async () => {
  await modalController.dismiss({ action: 'checkAll' })
}

const handleDelete = async () => {
  await modalController.dismiss({ action: 'delete' })
}

const closeModal = () => {
  modalController.dismiss()
}

// Build sections dynamically based on conditions
const actionsListData = computed<ListProps>(() => {
  const sections: ListSectionProps[] = []

  // Section 1: Edit + Share (if owner)
  const section1Items: ListItemProps[] = [
    {
      label: t('actions.edit'),
      icon: SquarePen,
      button: true,
      onClick: handleEdit
    }
  ]

  if (isOwner.value) {
    section1Items.push({
      label: t('actions.share'),
      icon: Share2,
      button: true,
      onClick: handleShare
    })
  }

  sections.push({ items: section1Items })

  // Section 2: Check/Uncheck (only if has items)
  if (hasItems.value) {
    const section2Items: ListItemProps[] = []

    if (hasCheckedItems.value) {
      section2Items.push({
        label: t('actions.uncheckAll'),
        icon: Minus,
        button: true,
        onClick: handleUncheckAll
      })
    }

    if (hasUncheckedItems.value) {
      section2Items.push({
        label: t('actions.checkAll'),
        icon: Check,
        button: true,
        onClick: handleCheckAll
      })
    }

    if (section2Items.length > 0) {
      sections.push({ items: section2Items })
    }
  }

  // Section 3: Delete (only if owner)
  if (isOwner.value) {
    sections.push({
      items: [{
        label: t('actions.delete'),
        icon: Trash,
        button: true,
        onClick: handleDelete
      }]
    })
  }

  return { sections }
})
</script>

<template>
  <div class="h-5 ion-padding flex-1 flex flex-col pt-8">
    <ion-buttons class="absolute right-1 top-1">
      <ion-button @click="closeModal" size="small">
        <X slot="icon-only" class="size-6"/>
      </ion-button>
    </ion-buttons>

    <div class="text-2xl font-semibold mb-8">{{ t('actions.title') }}</div>

    <List :sections="actionsListData.sections" />
  </div>
</template>

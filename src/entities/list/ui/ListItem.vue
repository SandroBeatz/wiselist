<script setup lang="ts">
import {
  IonCheckbox,
  IonItem,
  IonLabel,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/vue'
import type { ListItem as ListItemType } from '../model/types'
import { Trash } from 'lucide-vue-next'
import { ref } from 'vue'

interface Props {
  item: ListItemType
  readonly?: boolean
}

interface Emits {
  (e: 'toggle', itemId: string, checked: boolean): void
  (e: 'delete', itemId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<Emits>()

const slidingItemRef = ref<HTMLIonItemSlidingElement>()
const SWIPE_DELETE_THRESHOLD = 2.2 // 80% swipe triggers delete

// Used in template
const handleToggle = (event: CustomEvent) => {
  if (!props.readonly) {
    emit('toggle', props.item.id, event.detail.checked)
  }
}

const handleDelete = () => {
  if (!props.readonly) {
    emit('delete', props.item.id)
  }
}

// Used in template
const handleDragEnd = async () => {
  if (!slidingItemRef.value || props.readonly) return

  try {
    const ratio = await slidingItemRef.value.$el.getSlidingRatio()

    if (ratio > SWIPE_DELETE_THRESHOLD) {
      await slidingItemRef.value.$el.open('end')
      handleDelete()
    }
  } catch (error) {
    console.error('Error getting sliding ratio:', error)
  }
}

// Currently unused, but kept for potential future use
const _formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <ion-item-sliding ref="slidingItemRef" @ionDrag="handleDragEnd">
    <ion-item class="list-item" :class="{ 'item-checked': item.checked }" :detail="false">
      <ion-checkbox
          :checked="item.checked"
          :disabled="readonly"
          @ionChange="handleToggle"
          slot="start"
      />
      <ion-label class="ion-margin-start">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="item-content" :class="{ 'line-through text-zinc-400': item.checked }">
              {{ item.content }}
            </p>
          </div>
<!--          <ion-text class="text-xs text-zinc-400">-->
<!--            {{ formatDate(item.createdAt) }}-->
<!--          </ion-text>-->
        </div>
      </ion-label>
    </ion-item>
    <ion-item-options side="end">
      <ion-item-option color="danger" expandable class="px-5" @click="handleDelete">
        <Trash slot="icon-only" class="size-5" />
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<style scoped>
ion-item-sliding {
  border-radius: 8px;
  overflow: hidden;
  --min-height: 56px;
  margin-bottom: 4px;
  background: var(--ion-item-background);
}

.list-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 0;
  --min-height: 56px;
}

.item-checked {
  opacity: 0.7;
}

.item-content {
  font-size: 16px;
  line-height: 1.4;
  margin: 0;
  word-wrap: break-word;
}
</style>

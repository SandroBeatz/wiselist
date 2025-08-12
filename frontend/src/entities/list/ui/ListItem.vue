<script setup lang="ts">
import { IonCheckbox, IonItem, IonLabel, IonText } from "@ionic/vue";
import type { ListItem as ListItemType } from "../model/types";

interface Props {
  item: ListItemType;
  readonly?: boolean;
}

interface Emits {
  (e: 'toggle', itemId: string, checked: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

const emit = defineEmits<Emits>();

const handleToggle = (event: CustomEvent) => {
  if (!props.readonly) {
    emit('toggle', props.item.id, event.detail.checked);
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <ion-item class="list-item" :class="{ 'item-checked': item.checked }">
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
        <ion-text class="text-xs text-zinc-400">
          {{ formatDate(item.createdAt) }}
        </ion-text>
      </div>
    </ion-label>
  </ion-item>
</template>

<style scoped>
.list-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 0;
  --min-height: 56px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.list-item:hover {
  --background: var(--ion-color-light);
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
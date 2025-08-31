<script setup lang="ts">
import { IonButton, IonPopover, IonContent, IonList, IonItem, IonLabel, IonText } from '@ionic/vue'
import type { Component } from 'vue'

export interface ActionItem {
  id: string
  label: string
  icon?: Component
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'light'
    | 'medium'
    | 'dark'
  action?: () => void | Promise<void>
  disabled?: boolean
}

interface Props {
  actions: ActionItem[]
  triggerId?: string
}

const { triggerId = `action-dropdown-${Math.random().toString(36).substr(2, 9)}` } = withDefaults(
  defineProps<Props>(),
  {
    triggerId: `action-dropdown-${Math.random().toString(36).substr(2, 9)}`,
  }
)

const handleAction = async (item: ActionItem) => {
  if (item.disabled) return

  if (item.action) {
    try {
      await item.action()
    } catch (error) {
      console.error('Action failed:', error)
    }
  }
}
</script>

<template>
  <div>
    <!-- Trigger slot -->
    <slot name="trigger" :triggerId="triggerId">
      <ion-button :id="triggerId" size="small">
        <slot name="trigger-content"></slot>
      </ion-button>
    </slot>

    <!-- Popover with actions -->
    <ion-popover :trigger="triggerId" dismiss-on-select>
      <ion-content>
        <ion-list>
          <template v-for="item in actions" :key="item.id">
            <ion-item
              button
              :detail="false"
              :disabled="item.disabled"
              @click="handleAction(item)"
            >
              <ion-text
                v-if="item.icon"
                slot="start"
                :color="item.color || 'medium'"
              >
                <component :is="item.icon" class="size-5" />
              </ion-text>
              <ion-label>{{ item.label }}</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-content>
    </ion-popover>
  </div>
</template>

<style scoped>
ion-item[disabled] {
  opacity: 0.5;
  pointer-events: none;
}
</style>

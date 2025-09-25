<script setup lang="ts">
import { IonList, IonItemGroup, IonItem, IonLabel, IonAvatar, IonIcon } from '@ionic/vue'
import type { ListProps } from '../types'

defineProps<ListProps>()
</script>

<template>
  <ion-list :lines="lines || 'full'">
    <template v-for="(section, sectionIndex) in sections" :key="sectionIndex">
      <ion-item-divider v-if="section.title">
        <ion-label>
          <span class="text-slate-500">{{ section.title }}</span>
        </ion-label>
      </ion-item-divider>

      <ion-item-group>
        <ion-item
          v-for="(item, itemIndex) in section.items"
          :key="itemIndex"
          :button="item.button"
          :detail="typeof item.detail === 'boolean' ? item.detail : undefined"
          :lines="item.lines"
          @click="item.onClick"
        >
          <ion-avatar v-if="item.avatar" slot="start">
            <img :src="item.avatar" :alt="item.label" />
          </ion-avatar>

          <component
            v-else-if="item.icon && typeof item.icon !== 'string'"
            :is="item.icon"
            class="size-5 text-slate-500"
            slot="start"
          />

          <ion-icon
            v-else-if="item.icon && typeof item.icon === 'string'"
            :name="item.icon"
            slot="start"
          />

          <div v-if="item.caption">
            <ion-label>{{ item.label }}</ion-label>
            <ion-label>
              <span class="text-xs text-zinc-500">{{ item.caption }}</span>
            </ion-label>
          </div>

          <ion-label v-else>{{ item.label }}</ion-label>

          <ion-label v-if="item.detail && typeof item.detail === 'string'" slot="end">
            <span class="text-xs text-zinc-500">{{ item.detail }}</span>
          </ion-label>
        </ion-item>
      </ion-item-group>
    </template>
  </ion-list>
</template>

<style scoped>
ion-list {
  background: none;
  content: none;
}

ion-item-divider {
  --background: transparent;
  margin-bottom: 8px;
}

ion-item-group {
  overflow: hidden;
  margin-bottom: 18px;
  border-radius: 12px;
  @apply shadow-xl;
}

ion-item {
  --min-height: 52px;
}

ion-item:has(ion-avatar) {
  --min-height: 64px;
}

ion-avatar {
  width: 44px;
  height: 44px;
}
</style>

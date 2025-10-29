<script setup lang="ts">
import {
  IonItem,
  IonLabel,
  IonSkeletonText,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCheckbox,
} from '@ionic/vue'

/**
 * SkeletonLoader - Reusable skeleton loading component
 *
 * Features:
 * - Multiple preset types (list, list-item, card, text)
 * - Animated skeleton
 * - Configurable count
 * - Custom slot support
 * - Matches actual content layout
 */

interface Props {
  type?: 'list' | 'list-item' | 'card' | 'text' | 'custom'
  count?: number
  textWidth?: string
  textHeight?: string
}

withDefaults(defineProps<Props>(), {
  type: 'list',
  count: 3,
  textWidth: '100%',
  textHeight: '20px',
})
</script>

<template>
  <div class="skeleton-loader">
    <!-- List skeleton -->
    <div v-if="type === 'list'" class="skeleton-list">
      <ion-item v-for="i in count" :key="i" class="skeleton-item">
        <ion-skeleton-text animated style="width: 60px; height: 60px; border-radius: 8px;" />
        <ion-label>
          <ion-skeleton-text animated style="width: 70%; height: 20px;" />
          <ion-skeleton-text animated style="width: 40%; height: 16px; margin-top: 8px;" />
        </ion-label>
      </ion-item>
    </div>

    <!-- List item skeleton -->
    <div v-else-if="type === 'list-item'" class="skeleton-list-item">
      <ion-item v-for="i in count" :key="i" class="skeleton-item">
        <ion-checkbox slot="start" disabled />
        <ion-label>
          <ion-skeleton-text animated style="width: 80%; height: 18px;" />
        </ion-label>
      </ion-item>
    </div>

    <!-- Card skeleton -->
    <div v-else-if="type === 'card'" class="skeleton-card">
      <ion-card v-for="i in count" :key="i">
        <ion-card-header>
          <ion-skeleton-text animated style="width: 60%; height: 24px;" />
        </ion-card-header>
        <ion-card-content>
          <ion-skeleton-text animated style="width: 100%; height: 16px;" />
          <ion-skeleton-text animated style="width: 80%; height: 16px; margin-top: 8px;" />
        </ion-card-content>
      </ion-card>
    </div>

    <!-- Text skeleton -->
    <div v-else-if="type === 'text'" class="skeleton-text">
      <ion-skeleton-text
        v-for="i in count"
        :key="i"
        animated
        :style="{ width: textWidth, height: textHeight, marginBottom: '8px' }"
      />
    </div>

    <!-- Custom slot -->
    <slot v-else />
  </div>
</template>

<style scoped>
.skeleton-loader {
  width: 100%;
}

.skeleton-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 0;
  margin-bottom: 8px;
}

.skeleton-list,
.skeleton-list-item {
  padding: 0;
}

.skeleton-card ion-card {
  margin: 16px;
}

.skeleton-text {
  padding: 16px;
}

/* Prevent layout shift during loading */
ion-skeleton-text {
  display: block;
}
</style>

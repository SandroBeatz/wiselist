<script setup lang="ts">
import { IonSkeletonText, IonThumbnail } from '@ionic/vue'
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <template v-for="i in 8" :key="i">
      <div class="bg-white/50 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3">
          <ion-thumbnail class="size-8 rounded-full overflow-hidden">
            <ion-skeleton-text animated></ion-skeleton-text>
          </ion-thumbnail>
        </div>

        <ion-skeleton-text animated style="width: 70%; height: 16px;" class="mb-3"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 40%;" class="mb-3"></ion-skeleton-text>
        <ion-skeleton-text animated style="width: 100%;"></ion-skeleton-text>
      </div>
    </template>
  </div>
</template>

<style scoped>

</style>

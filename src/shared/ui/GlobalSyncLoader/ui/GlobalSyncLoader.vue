<script setup lang="ts">
import { useSyncStatus } from '@shared/composables/useSyncStatus'

const { isSyncing } = useSyncStatus()
</script>

<template>
  <Transition name="sync-loader">
    <div v-if="isSyncing" class="global-sync-loader">
      <div class="sync-loader-shadow"></div>
    </div>
  </Transition>
</template>

<style scoped>
.global-sync-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 30px;
  z-index: 10000;
  pointer-events: none;
}

.sync-loader-shadow {
  position: relative;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(var(--ion-color-primary-rgb), 0.5), transparent 70%),
    linear-gradient(
      to bottom,
      rgba(var(--ion-color-primary-rgb), 0.4) 0%,
      rgba(var(--ion-color-primary-rgb), 0.3) 50%,
      rgba(var(--ion-color-primary-rgb), 0.15) 80%,
      transparent 100%
    );
  filter: blur(8px);
  animation: cloud-breathe 3s ease-in-out infinite;
}

@keyframes cloud-breathe {
  0%, 100% {
    opacity: 0.7;
    transform: scaleY(0.9);
  }
  50% {
    opacity: 1;
    transform: scaleY(1);
  }
}

.sync-loader-enter-active,
.sync-loader-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.sync-loader-enter-from,
.sync-loader-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

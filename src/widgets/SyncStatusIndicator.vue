<script setup lang="ts">
import { ref, computed } from 'vue'
import { IonIcon, IonBadge } from '@ionic/vue'
import {
  checkmarkCircle,
  syncOutline,
  cloudUploadOutline,
  cloudOfflineOutline,
  alertCircle,
} from 'ionicons/icons'
import { useSyncStatus } from '@shared/composables/useSyncStatus'

/**
 * SyncStatusIndicator - Visual sync status component
 *
 * Features:
 * - Real-time sync status display
 * - Animated syncing indicator
 * - Pending operations badge
 * - Color-coded states
 * - Interactive tooltip
 * - Manual sync trigger on click
 */

const props = defineProps<{
  showTooltip?: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{
  (e: 'sync'): void
}>()

// Use sync status composable
const {
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncFormatted,
  error,
  syncIndicator,
  forceSync,
} = useSyncStatus()

// Local state
const tooltipVisible = ref(false)

// Computed properties
const iconName = computed(() => {
  if (!isOnline.value) return cloudOfflineOutline
  if (isSyncing.value) return syncOutline
  if (error.value) return alertCircle
  if (pendingCount.value > 0) return cloudUploadOutline
  return checkmarkCircle
})

const statusClass = computed(() => {
  return `status-${syncIndicator.value.color}`
})

const statusText = computed(() => {
  return syncIndicator.value.text
})

const showTooltip = computed(() => {
  return props.showTooltip && tooltipVisible.value
})

// Methods
const handleClick = async () => {
  if (!props.clickable) return

  tooltipVisible.value = !tooltipVisible.value

  // If online and not syncing, trigger manual sync
  if (isOnline.value && !isSyncing.value) {
    try {
      await forceSync()
      emit('sync')
    } catch (err) {
      console.error('Manual sync failed:', err)
    }
  }
}
</script>

<template>
  <div class="sync-status-indicator" @click="handleClick">
    <ion-icon
      :icon="iconName"
      :class="['sync-icon', statusClass, { 'syncing': isSyncing }]"
    />
    <ion-badge
      v-if="pendingCount > 0"
      color="warning"
      class="pending-badge"
    >
      {{ pendingCount }}
    </ion-badge>

    <!-- Tooltip (optional, shown on hover/click) -->
    <div v-if="showTooltip" class="sync-tooltip">
      <p class="tooltip-status">{{ statusText }}</p>
      <p v-if="lastSyncFormatted" class="tooltip-time">
        Last sync: {{ lastSyncFormatted }}
      </p>
      <p v-if="error" class="tooltip-error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.sync-status-indicator {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
}

.sync-icon {
  font-size: 24px;
  transition: all 0.3s ease;
}

/* Status colors */
.status-green {
  color: var(--ion-color-success);
}

.status-blue {
  color: var(--ion-color-primary);
}

.status-orange {
  color: var(--ion-color-warning);
}

.status-gray {
  color: var(--ion-color-medium);
}

.status-red {
  color: var(--ion-color-danger);
}

/* Syncing animation */
.syncing {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Pending badge */
.pending-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tooltip */
.sync-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--ion-color-step-100);
  border: 1px solid var(--ion-color-step-200);
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.tooltip-status {
  font-weight: 600;
  margin: 0 0 4px 0;
  font-size: 14px;
}

.tooltip-time {
  font-size: 12px;
  color: var(--ion-color-step-600);
  margin: 4px 0 0 0;
}

.tooltip-error {
  font-size: 12px;
  color: var(--ion-color-danger);
  margin: 4px 0 0 0;
}

/* Hover effect */
.sync-status-indicator:hover .sync-icon {
  transform: scale(1.1);
}
</style>

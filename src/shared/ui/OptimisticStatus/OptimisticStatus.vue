<template>
  <div v-if="showStatus" class="optimistic-status">
    <ion-chip 
      :color="statusColor" 
      :outline="true"
      @click="handleStatusClick"
      class="status-chip"
    >
      <ion-spinner
        v-if="status.type === 'syncing'"
        name="crescent"
        :duration="1000"
        class="status-spinner"
      />
      <ion-icon
        v-else
        :icon="statusIcon"
        class="status-icon"
      />
      <ion-label class="status-label">{{ status.message }}</ion-label>
    </ion-chip>

    <!-- Failed Operations Detail -->
    <div v-if="hasFailedOperations && showDetails" class="failed-operations">
      <div 
        v-for="operation in failedOperations" 
        :key="operation.id"
        class="failed-operation"
      >
        <span class="operation-type">{{ getOperationDisplayName(operation.type) }}</span>
        <span class="operation-error">{{ operation.errorMessage }}</span>
        <ion-button 
          size="small" 
          fill="clear" 
          @click="$emit('retry', operation.id)"
        >
          <ion-icon :icon="refreshOutline" />
          Retry
        </ion-button>
      </div>
    </div>

    <!-- Pending Operations Detail -->
    <div v-if="hasPendingOperations && showDetails" class="pending-operations">
      <div 
        v-for="operation in pendingOperations" 
        :key="operation.id"
        class="pending-operation"
      >
        <span class="operation-type">{{ getOperationDisplayName(operation.type) }}</span>
        <span class="operation-status">Syncing...</span>
        <ion-button 
          size="small" 
          fill="clear" 
          @click="$emit('cancel', operation.id)"
        >
          <ion-icon :icon="closeOutline" />
          Cancel
        </ion-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { 
  IonChip, 
  IonIcon, 
  IonLabel, 
  IonSpinner,
  IonButton
} from '@ionic/vue'
import { 
  checkmarkCircleOutline,
  alertCircleOutline, 
  syncOutline,
  refreshOutline,
  closeOutline
} from 'ionicons/icons'
import { useOptimisticUpdates } from '@shared/composables/useOptimisticUpdates'
import type { OptimisticOperation } from '@shared/services/reactive/optimistic-updates.service'

interface Props {
  listId?: string // If provided, only show status for this list
  compact?: boolean // Show compact version without details
  hideWhenSynced?: boolean // Hide status when everything is synced
}

interface Emits {
  (e: 'retry', operationId: string): void
  (e: 'cancel', operationId: string): void
  (e: 'retryAll'): void
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  hideWhenSynced: true
})

const emit = defineEmits<Emits>()

const {
  statusMessage,
  hasPendingOperations,
  hasFailedOperations,
  operations,
  pendingCount,
  failedCount
} = useOptimisticUpdates()

const showDetails = ref(false)

// Filter operations by listId if provided
const filteredOperations = computed(() => {
  if (!props.listId) return operations.value
  return operations.value.filter(op => op.listId === props.listId)
})

const pendingOperations = computed(() => 
  filteredOperations.value.filter(op => op.status === 'pending')
)

const failedOperations = computed(() => 
  filteredOperations.value.filter(op => 
    op.status === 'failed' && op.retryCount < op.maxRetries
  )
)

const localPendingCount = computed(() => pendingOperations.value.length)
const localFailedCount = computed(() => failedOperations.value.length)

const status = computed(() => {
  if (localPendingCount.value > 0) {
    const message = props.listId 
      ? `${localPendingCount.value} change${localPendingCount.value > 1 ? 's' : ''} syncing...`
      : statusMessage.value
    return {
      type: 'syncing',
      message,
      color: 'primary'
    }
  }
  
  if (localFailedCount.value > 0) {
    const message = props.listId
      ? `${localFailedCount.value} change${localFailedCount.value > 1 ? 's' : ''} failed - tap to retry`
      : statusMessage.value
    return {
      type: 'failed',
      message,
      color: 'danger'
    }
  }
  
  return {
    type: 'synced',
    message: props.listId ? 'Changes saved' : 'All changes saved',
    color: 'success'
  }
})

const statusColor = computed(() => status.value.color)

const statusIcon = computed(() => {
  switch (status.value.type) {
    case 'synced':
      return checkmarkCircleOutline
    case 'failed':
      return alertCircleOutline
    default:
      return syncOutline
  }
})

const showStatus = computed(() => {
  if (props.hideWhenSynced && status.value.type === 'synced') {
    return localPendingCount.value > 0 || localFailedCount.value > 0
  }
  return true
})

const handleStatusClick = () => {
  if (props.compact) return
  
  if (status.value.type === 'failed') {
    emit('retryAll')
  } else if (localPendingCount.value > 0 || localFailedCount.value > 0) {
    showDetails.value = !showDetails.value
  }
}

const getOperationDisplayName = (type: OptimisticOperation['type']): string => {
  const names: Record<OptimisticOperation['type'], string> = {
    'CREATE_LIST': 'Create List',
    'UPDATE_LIST': 'Update List',
    'DELETE_LIST': 'Delete List',
    'CREATE_ITEM': 'Add Item',
    'UPDATE_ITEM': 'Update Item',
    'DELETE_ITEM': 'Delete Item',
    'CHECK_ITEM': 'Toggle Item',
    'REORDER_ITEM': 'Reorder Items'
  }
  return names[type]
}
</script>

<style scoped>
.optimistic-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-chip {
  cursor: pointer;
  transition: all 0.3s ease;
  --border-radius: 16px;
  --height: 32px;
  max-width: fit-content;
}

.status-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-spinner {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.status-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.status-label {
  font-size: 12px;
  font-weight: 500;
}

.failed-operations,
.pending-operations {
  background: rgba(var(--ion-color-light-rgb), 0.1);
  border-radius: 8px;
  padding: 8px;
  margin-top: 4px;
}

.failed-operation,
.pending-operation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--ion-color-medium-rgb), 0.2);
}

.failed-operation:last-child,
.pending-operation:last-child {
  border-bottom: none;
}

.operation-type {
  font-weight: 500;
  font-size: 12px;
  color: var(--ion-color-dark);
}

.operation-error {
  font-size: 11px;
  color: var(--ion-color-danger);
  flex: 1;
  margin: 0 8px;
  text-align: center;
}

.operation-status {
  font-size: 11px;
  color: var(--ion-color-medium);
  flex: 1;
  margin: 0 8px;
  text-align: center;
}

/* Compact mode styles */
.optimistic-status.compact .status-chip {
  --height: 24px;
}

.optimistic-status.compact .status-label {
  font-size: 11px;
}

.optimistic-status.compact .status-icon,
.optimistic-status.compact .status-spinner {
  width: 14px;
  height: 14px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .failed-operations,
  .pending-operations {
    background: rgba(var(--ion-color-dark-rgb), 0.3);
  }
  
  .operation-type {
    color: var(--ion-color-light);
  }
}
</style>
<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleClose">
    <ion-header>
      <ion-toolbar>
        <ion-title>Change Password</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleClose">
            <ion-icon :icon="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="space-y-6">
        <div>
          <ion-label position="stacked">Current Password</ion-label>
          <ion-input 
            v-model="currentPassword"
            type="password"
            fill="outline"
            placeholder="Enter current password"
            class="mt-2"
            :class="{ 'ion-invalid': errors.currentPassword }"
            @ion-input="clearFieldError('currentPassword')"
          ></ion-input>
          <ion-text v-if="errors.currentPassword" color="danger" class="text-sm">
            {{ errors.currentPassword }}
          </ion-text>
        </div>

        <div>
          <ion-label position="stacked">New Password</ion-label>
          <ion-input 
            v-model="newPassword"
            type="password"
            fill="outline"
            placeholder="Enter new password"
            class="mt-2"
            :class="{ 'ion-invalid': errors.newPassword }"
            @ion-input="clearFieldError('newPassword')"
          ></ion-input>
          <ion-text v-if="errors.newPassword" color="danger" class="text-sm">
            {{ errors.newPassword }}
          </ion-text>
        </div>

        <div>
          <ion-label position="stacked">Confirm New Password</ion-label>
          <ion-input 
            v-model="confirmPassword"
            type="password"
            fill="outline"
            placeholder="Confirm new password"
            class="mt-2"
            :class="{ 'ion-invalid': errors.confirmPassword }"
            @ion-input="clearFieldError('confirmPassword')"
          ></ion-input>
          <ion-text v-if="errors.confirmPassword" color="danger" class="text-sm">
            {{ errors.confirmPassword }}
          </ion-text>
        </div>

        <div class="pt-4">
          <ion-button 
            expand="block"
            color="primary"
            @click="handleSubmit"
            :disabled="isLoading || !canSubmit"
          >
            {{ isLoading ? 'Updating...' : 'Update Password' }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { 
  IonModal, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonLabel, 
  IonInput, 
  IonText,
  toastController
} from '@ionic/vue'
import { close } from 'ionicons/icons'
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/entities/user'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userStore = useUserStore()

// Form state
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errors = ref<{
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}>({})

// Computed
const canSubmit = computed(() => {
  return currentPassword.value.trim() && 
         newPassword.value.trim() && 
         confirmPassword.value.trim()
})

// Methods
const clearFieldError = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
  if (errors.value[field]) {
    delete errors.value[field]
    errors.value = { ...errors.value }
  }
}

const validateCurrentPassword = (pwd: string): string | undefined => {
  if (!pwd.trim()) {
    return 'Current password is required'
  }
  return undefined
}

const validateNewPassword = (pwd: string): string | undefined => {
  if (!pwd.trim()) {
    return 'New password is required'
  }
  if (pwd.length < 6) {
    return 'Password must be at least 6 characters long'
  }
  if (pwd === currentPassword.value) {
    return 'New password must be different from current password'
  }
  return undefined
}

const validateConfirmPassword = (pwd: string): string | undefined => {
  if (!pwd.trim()) {
    return 'Please confirm your new password'
  }
  if (pwd !== newPassword.value) {
    return 'Passwords do not match'
  }
  return undefined
}

const validateForm = (): boolean => {
  const newErrors: typeof errors.value = {}
  
  const currentError = validateCurrentPassword(currentPassword.value)
  if (currentError) newErrors.currentPassword = currentError

  const newError = validateNewPassword(newPassword.value)
  if (newError) newErrors.newPassword = newError

  const confirmError = validateConfirmPassword(confirmPassword.value)
  if (confirmError) newErrors.confirmPassword = confirmError

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    isLoading.value = true
    
    await userStore.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    
    // Show success toast
    const toast = await toastController.create({
      message: 'Password updated successfully',
      duration: 3000,
      color: 'success',
      position: 'top'
    })
    await toast.present()
    
    handleClose()
  } catch (error) {
    console.error('Failed to update password:', error)
    
    // Handle specific errors
    let errorMessage = 'Failed to update password. Please try again.'
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as any).response
      if (response?.status === 400) {
        if (response.data?.message === 'Invalid current password') {
          errors.value.currentPassword = 'Current password is incorrect'
          return
        } else if (response.data?.message) {
          errorMessage = response.data.message
        }
      }
    }
    
    const toast = await toastController.create({
      message: errorMessage,
      duration: 3000,
      color: 'danger',
      position: 'top'
    })
    await toast.present()
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  // Reset form
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  errors.value = {}
  emit('close')
}

// Watch for dialog open/close to reset form
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    // Reset form when dialog closes
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    errors.value = {}
  }
})
</script>
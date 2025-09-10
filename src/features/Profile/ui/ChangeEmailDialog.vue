<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleClose">
    <ion-header>
      <ion-toolbar>
        <ion-title>Change Email</ion-title>
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
          <ion-label position="stacked">Current Email</ion-label>
          <ion-input 
            :value="currentEmail"
            readonly
            fill="outline"
            class="mt-2 opacity-60"
          ></ion-input>
        </div>

        <div>
          <ion-label position="stacked">New Email</ion-label>
          <ion-input 
            v-model="newEmail"
            type="email"
            fill="outline"
            placeholder="Enter new email"
            class="mt-2"
            :class="{ 'ion-invalid': errors.email }"
            @ion-input="clearFieldError('email')"
          ></ion-input>
          <ion-text v-if="errors.email" color="danger" class="text-sm">
            {{ errors.email }}
          </ion-text>
        </div>

        <div>
          <ion-label position="stacked">Confirm Password</ion-label>
          <ion-input 
            v-model="password"
            type="password"
            fill="outline"
            placeholder="Enter your password to confirm"
            class="mt-2"
            :class="{ 'ion-invalid': errors.password }"
            @ion-input="clearFieldError('password')"
          ></ion-input>
          <ion-text v-if="errors.password" color="danger" class="text-sm">
            {{ errors.password }}
          </ion-text>
        </div>

        <div class="pt-4">
          <ion-button 
            expand="block"
            color="primary"
            @click="handleSubmit"
            :disabled="isLoading || !canSubmit"
          >
            {{ isLoading ? 'Updating...' : 'Update Email' }}
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
  currentEmail: string
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userStore = useUserStore()

// Form state
const newEmail = ref('')
const password = ref('')
const isLoading = ref(false)
const errors = ref<{
  email?: string
  password?: string
}>({})

// Computed
const canSubmit = computed(() => {
  return newEmail.value.trim() && 
         password.value.trim() && 
         newEmail.value !== props.currentEmail
})

// Methods
const clearFieldError = (field: 'email' | 'password') => {
  if (errors.value[field]) {
    delete errors.value[field]
    errors.value = { ...errors.value }
  }
}

const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) {
    return 'Email is required'
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  if (email === props.currentEmail) {
    return 'New email must be different from current email'
  }
  return undefined
}

const validatePassword = (pwd: string): string | undefined => {
  if (!pwd.trim()) {
    return 'Password is required to confirm this change'
  }
  return undefined
}

const validateForm = (): boolean => {
  const newErrors: typeof errors.value = {}
  
  const emailError = validateEmail(newEmail.value)
  if (emailError) newErrors.email = emailError

  const passwordError = validatePassword(password.value)
  if (passwordError) newErrors.password = passwordError

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    isLoading.value = true
    
    // TODO: Implement API call for email change
    console.log('Changing email:', {
      newEmail: newEmail.value,
      password: password.value
    })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Show success toast
    const toast = await toastController.create({
      message: 'Email updated successfully',
      duration: 3000,
      color: 'success',
      position: 'top'
    })
    await toast.present()
    
    handleClose()
  } catch (error) {
    console.error('Failed to update email:', error)
    
    const toast = await toastController.create({
      message: 'Failed to update email. Please try again.',
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
  newEmail.value = ''
  password.value = ''
  errors.value = {}
  emit('close')
}

// Watch for dialog open/close to reset form
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    // Reset form when dialog closes
    newEmail.value = ''
    password.value = ''
    errors.value = {}
  }
})
</script>
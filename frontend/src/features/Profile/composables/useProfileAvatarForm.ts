import { ref, computed } from 'vue'
import { useUserStore } from '@/entities/user'

export interface AvatarFormData {
  fullName: string
  avatar_icon: string
}

export interface ValidationErrors {
  fullName?: string
}

export const useProfileAvatarForm = () => {
  const userStore = useUserStore()
  const isLoading = ref(false)
  const errors = ref<ValidationErrors>({})

  const formData = ref<AvatarFormData>({
    fullName: '',
    avatar_icon: ''
  })

  // Validation functions
  const validateFullName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Full name is required'
    }
    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters long'
    }
    return undefined
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}
    
    const nameError = validateFullName(formData.value.fullName)
    if (nameError) newErrors.fullName = nameError

    errors.value = newErrors
    return Object.keys(newErrors).length === 0
  }

  // Clear specific field error
  const clearFieldError = (field: keyof ValidationErrors) => {
    if (errors.value[field]) {
      delete errors.value[field]
      errors.value = { ...errors.value }
    }
  }

  // Initialize form with user data
  const initializeForm = () => {
    const userInfo = userStore.info
    if (userInfo) {
      formData.value = {
        fullName: userInfo.profile.fullName,
        avatar_icon: userInfo.profile.avatar_icon || userInfo.profile.avatar || ''
      }
    }
    errors.value = {}
  }

  // Reset form
  const resetForm = () => {
    initializeForm()
  }

  // Check if form has changes
  const hasChanges = computed(() => {
    const userInfo = userStore.info
    if (!userInfo) return false

    return (
      formData.value.fullName !== userInfo.profile.fullName ||
      formData.value.avatar_icon !== (userInfo.profile.avatar_icon || userInfo.profile.avatar || '')
    )
  })

  // Submit form
  const submitForm = async (): Promise<boolean> => {
    if (!validateForm()) {
      return false
    }

    try {
      isLoading.value = true
      
      // Update profile information
      await userStore.updateProfile({
        fullName: formData.value.fullName,
        email: userStore.info?.email || '',
        avatar_icon: formData.value.avatar_icon
      })

      return true
    } catch (error) {
      console.error('Failed to update profile:', error)
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response
        if (response?.status === 400 && response?.data?.message) {
          // Set validation errors from server
          if (response.data.field) {
            errors.value[response.data.field as keyof ValidationErrors] = response.data.message
          }
        }
      }
      
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    formData,
    errors,
    isLoading,
    hasChanges,
    initializeForm,
    resetForm,
    validateForm,
    clearFieldError,
    submitForm
  }
}
import { ref, computed } from 'vue'
import { useUserStore } from '@/entities/user'

export interface ProfileFormData {
  fullName: string
  email: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  avatar_icon: string
}

export interface ValidationErrors {
  fullName?: string
  email?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export const useEditProfileForm = () => {
  const userStore = useUserStore()
  const isLoading = ref(false)
  const errors = ref<ValidationErrors>({})

  const formData = ref<ProfileFormData>({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address'
    }
    return undefined
  }

  const validatePasswords = (current: string, newPass: string, confirm: string) => {
    const passwordErrors: Partial<ValidationErrors> = {}

    // If any password field is filled, validate all
    const hasPasswordChange = current || newPass || confirm

    if (hasPasswordChange) {
      if (!current) {
        passwordErrors.currentPassword = 'Current password is required'
      }
      
      if (!newPass) {
        passwordErrors.newPassword = 'New password is required'
      } else if (newPass.length < 6) {
        passwordErrors.newPassword = 'Password must be at least 6 characters long'
      }
      
      if (newPass !== confirm) {
        passwordErrors.confirmPassword = 'Passwords do not match'
      }
    }

    return passwordErrors
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}
    
    // Validate required fields
    const nameError = validateFullName(formData.value.fullName)
    if (nameError) newErrors.fullName = nameError

    const emailError = validateEmail(formData.value.email)
    if (emailError) newErrors.email = emailError

    // Validate passwords if any password field has value
    const passwordErrors = validatePasswords(
      formData.value.currentPassword,
      formData.value.newPassword,
      formData.value.confirmPassword
    )
    Object.assign(newErrors, passwordErrors)

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
        email: userInfo.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
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

    const hasBasicChanges = 
      formData.value.fullName !== userInfo.profile.fullName ||
      formData.value.email !== userInfo.email ||
      formData.value.avatar_icon !== (userInfo.profile.avatar_icon || userInfo.profile.avatar || '')

    const hasPasswordChange = 
      formData.value.currentPassword || 
      formData.value.newPassword || 
      formData.value.confirmPassword

    return hasBasicChanges || hasPasswordChange
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
        email: formData.value.email,
        avatar_icon: formData.value.avatar_icon
      })

      // Change password if provided
      if (formData.value.newPassword && formData.value.currentPassword) {
        await userStore.changePassword({
          currentPassword: formData.value.currentPassword,
          newPassword: formData.value.newPassword
        })
      }

      // Clear password fields after successful update
      formData.value.currentPassword = ''
      formData.value.newPassword = ''
      formData.value.confirmPassword = ''

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
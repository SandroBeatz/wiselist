import { notificationService } from '@shared/services/notification.service'
import type { AxiosError } from 'axios'

/**
 * Check if error toasts are enabled via environment variable
 */
export const isErrorToastEnabled = (): boolean => {
  const envValue = import.meta.env.VITE_SHOW_ERROR_TOASTS
  return envValue === undefined || envValue === 'true' || envValue === true
}

/**
 * Track recent error toasts to prevent duplicates
 */
const recentErrors = new Set<string>()
const ERROR_DEBOUNCE_TIME = 3000

/**
 * Generate unique key for error deduplication
 */
const getErrorKey = (error: AxiosError): string => {
  const status = error.response?.status || 'network'
  const url = error.config?.url || 'unknown'
  return `${status}-${url}`
}

/**
 * Check if we should show toast (debounce duplicates)
 */
const shouldShowToast = (errorKey: string): boolean => {
  if (recentErrors.has(errorKey)) {
    return false
  }

  recentErrors.add(errorKey)
  setTimeout(() => {
    recentErrors.delete(errorKey)
  }, ERROR_DEBOUNCE_TIME)

  return true
}

/**
 * Format error message for toast display
 */
const formatErrorMessage = (error: AxiosError): string => {
  const responseData = error.response?.data as any

  if (responseData?.message) {
    return responseData.message
  }

  if (responseData?.error) {
    return responseData.error
  }

  if (!error.response) {
    return 'Network error - please check your connection'
  }

  const status = error.response.status
  switch (status) {
    case 400:
      return 'Invalid request'
    case 403:
      return 'Access denied'
    case 404:
      return 'Resource not found'
    case 409:
      return 'Conflict - resource already exists'
    case 422:
      return 'Validation error'
    case 429:
      return 'Too many requests - please try again later'
    case 500:
      return 'Server error - please try again'
    case 503:
      return 'Service unavailable'
    default:
      return `Request failed (${status})`
  }
}

/**
 * Handle and display error toast
 */
export const handleErrorToast = async (error: AxiosError): Promise<void> => {
  if (!isErrorToastEnabled()) {
    return
  }

  // Skip 401 errors (handled by token refresh)
  if (error.response?.status === 401) {
    return
  }

  const errorKey = getErrorKey(error)

  if (!shouldShowToast(errorKey)) {
    return
  }

  const message = formatErrorMessage(error)
  await notificationService.showError(message, 3000)

  console.error('HTTP Error:', {
    status: error.response?.status,
    url: error.config?.url,
    message,
  })
}

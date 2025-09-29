import { ref, type Ref } from 'vue'
import {useIsLoading} from "@shared/composables/useIsLoading";
import {apiContact} from "@entities/contact";

interface UseCreateContactReturn {
  isLoading: Ref<boolean>
  error: Ref<string | null>
  createContact: (email: string) => Promise<void>
}

export function useCreateContact(): UseCreateContactReturn {
  const {isLoading, startLoading, finishLoading} = useIsLoading()
  const error = ref<string | null>(null)

  const createContact = async (email: string): Promise<void> => {
    if (isLoading.value) return

    try {
      startLoading()
      error.value = null

      await apiContact.createContact({
        email
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create contact'
      console.error('Failed to create contact:', err)
      throw err
    } finally {
      finishLoading()
    }
  }

  return {
    isLoading,
    error,
    createContact
  }
}

import { ref, computed } from 'vue'
import { apiListItem, type ListItemForm } from '../../../../entities/list-item'

interface FormErrors {
    content?: string
}

interface QuickSuggestionsStorage {
    getQuickSuggestions(): string[]
    addSuggestion(content: string): void
    clearSuggestions(): void
}

const STORAGE_KEY = 'wiselist_quick_suggestions'
const MAX_SUGGESTIONS = 20

const createQuickSuggestionsStorage = (): QuickSuggestionsStorage => {
    const getQuickSuggestions = (): string[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    }

    const addSuggestion = (content: string): void => {
        try {
            const suggestions = getQuickSuggestions()
            const trimmed = content.trim().toLowerCase()
            
            if (!trimmed || suggestions.some(s => s.toLowerCase() === trimmed)) {
                return
            }

            suggestions.unshift(content.trim())
            
            if (suggestions.length > MAX_SUGGESTIONS) {
                suggestions.splice(MAX_SUGGESTIONS)
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestions))
        } catch (error) {
            console.warn('Failed to save quick suggestion:', error)
        }
    }

    const clearSuggestions = (): void => {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch (error) {
            console.warn('Failed to clear suggestions:', error)
        }
    }

    return {
        getQuickSuggestions,
        addSuggestion,
        clearSuggestions
    }
}

export const useCreateListItemForm = (listId: string) => {
    const form = ref<ListItemForm>({
        listId,
        content: ''
    })

    const errors = ref<FormErrors>({})
    const isLoading = ref(false)
    const quickSuggestionsStorage = createQuickSuggestionsStorage()
    const quickSuggestions = ref<string[]>(quickSuggestionsStorage.getQuickSuggestions())

    const isValid = computed(() => {
        return form.value.content.trim().length >= 2 && Object.keys(errors.value).length === 0
    })

    const validateForm = (): boolean => {
        errors.value = {}
        
        const content = form.value.content.trim()
        
        if (!content) {
            errors.value.content = 'Содержимое элемента обязательно'
            return false
        }
        
        if (content.length < 2) {
            errors.value.content = 'Содержимое должно содержать минимум 2 символа'
            return false
        }
        
        if (content.length > 500) {
            errors.value.content = 'Содержимое не должно превышать 500 символов'
            return false
        }

        return true
    }

    const resetForm = () => {
        form.value = {
            listId,
            content: ''
        }
        errors.value = {}
    }

    const refreshQuickSuggestions = () => {
        quickSuggestions.value = quickSuggestionsStorage.getQuickSuggestions()
    }

    const selectSuggestion = (suggestion: string) => {
        form.value.content = suggestion
        errors.value = {}
    }

    const filteredSuggestions = computed(() => {
        const query = form.value.content.toLowerCase().trim()
        if (!query || query.length < 1) return quickSuggestions.value.slice(0, 5)
        
        return quickSuggestions.value
            .filter(suggestion => 
                suggestion.toLowerCase().includes(query) && 
                suggestion.toLowerCase() !== query
            )
            .slice(0, 5)
    })

    const submitForm = async (): Promise<boolean> => {
        if (!validateForm()) {
            return false
        }

        isLoading.value = true
        
        try {
            await apiListItem.create(form.value)
            quickSuggestionsStorage.addSuggestion(form.value.content)
            refreshQuickSuggestions()
            resetForm()
            return true
        } catch (error) {
            console.error('Failed to create list item:', error)
            errors.value.content = 'Ошибка при создании элемента. Попробуйте снова.'
            return false
        } finally {
            isLoading.value = false
        }
    }

    return {
        form,
        errors,
        isLoading,
        isValid,
        quickSuggestions,
        filteredSuggestions,
        validateForm,
        resetForm,
        selectSuggestion,
        submitForm,
        refreshQuickSuggestions
    }
}
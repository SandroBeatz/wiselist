import { useFormHandler } from '@shared/composables/useFormHandler'
import type { ListId } from '@/entities/list'
import { apiListItem, type ListItemForm } from '@/entities/list-item'

const validateListForm = (formData: ListItemForm): Record<keyof ListItemForm, string> | null => {
  const errors: Partial<Record<keyof ListItemForm, string>> = {}

  // Validate title
  if (!formData.context) {
    if (!formData.content) {
      errors.content = 'Содержимое элемента обязательно'
    }

    if (formData.content.length < 2) {
      errors.content = 'Содержимое должно содержать минимум 2 символа'
    }

    if (formData.content.length > 500) {
      errors.content = 'Содержимое не должно превышать 500 символов'
    }
  }

  return Object.keys(errors).length > 0 ? (errors as Record<keyof ListItemForm, string>) : null
}

export const useCreateListItemForm = (listId: ListId) => {
  return useFormHandler<ListItemForm>({
    initialData: {
      listId,
      content: '',
      context: '',
    },
    validate: validateListForm,
    onSubmit: async ({ context, ...form }: ListItemForm) => {
      try {
        await apiListItem.create({
          ...form,
          content: context || form.content,
        })
      } catch (e) {
        console.log(e)
        throw e
      }
    },
  })
}

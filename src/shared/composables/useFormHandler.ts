import { reactive, ref, type Ref } from 'vue'

export interface InputCustomEvent extends CustomEvent {
  target: HTMLIonInputElement
}

export interface HTMLIonInputElement extends HTMLElement {
  name?: string
  value?: string | number | null
}

export type FormData = Record<string, string | number | boolean | undefined>

export interface BaseFormData {
  [key: string]: string | number | boolean | undefined
}

export type SubmitHandler<T extends FormData> = (formData: T) => Promise<void> | void

export interface FormHandlerOptions<T extends FormData> {
  initialData: T
  onSubmit?: SubmitHandler<T>
  validate?: (formData: T) => Record<keyof T, string> | null
}

export interface FormHandlerReturn<T extends FormData> {
  form: T
  handlerField: (event: InputCustomEvent) => void
  handleSubmit: (callback?: () => void | Promise<void>) => Promise<void>
  errors: Ref<Record<keyof T, string> | null>
  isSubmitting: Ref<boolean>
  resetForm: () => void
  setFieldValue: (field: keyof T, value: T[keyof T]) => void
}

export function useFormHandler<T extends FormData>(
  options: FormHandlerOptions<T>
): FormHandlerReturn<T> {
  const { initialData, onSubmit, validate } = options

  const form = reactive({ ...initialData }) as T
  const errors = ref(null) as Ref<Record<keyof T, string> | null>
  const isSubmitting = ref<boolean>(false)

  function handlerField(event: InputCustomEvent): void {
    const target = event.target as HTMLIonInputElement
    const name = target.name as keyof T
    const value = target.value ?? ''

    if (!name) return

    const currentValue = form[name]
    let processedValue: T[keyof T]

    if (typeof currentValue === 'number') {
      processedValue = Number(value) as T[keyof T]
    } else if (typeof currentValue === 'boolean') {
      processedValue = Boolean(value) as T[keyof T]
    } else {
      processedValue = String(value) as T[keyof T]
    }

    form[name] = processedValue

    if (errors.value && errors.value[name]) {
      errors.value = {
        ...errors.value,
        [name]: '',
      }
    }
  }

  function setFieldValue(field: keyof T, value: T[keyof T]): void {
    form[field] = value

    if (errors.value && errors.value[field]) {
      errors.value = {
        ...errors.value,
        [field]: '',
      }
    }
  }

  function resetForm(): void {
    Object.keys(form).forEach((key) => {
      const typedKey = key as keyof T
      form[typedKey] = initialData[typedKey]
    })
    errors.value = null
  }

  async function handleSubmit(callback?: () => void | Promise<void>): Promise<void> {
    if (isSubmitting.value) return

    try {
      isSubmitting.value = true
      errors.value = null

      if (validate) {
        const validationErrors = validate(form)
        if (validationErrors) {
          errors.value = validationErrors
          return
        }
      }

      if (onSubmit) {
        await onSubmit(form)
        await callback?.()
      }
    } catch (error) {
      console.error('Form submission error:', error)
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    handlerField,
    handleSubmit,
    errors,
    isSubmitting,
    resetForm,
    setFieldValue,
  }
}

import {apiAuth} from "../api";
import {useFormHandler} from "@shared/composables/useFormHandler";
import {RegisterForm} from "@/features/Auth/model/types";

export const useRegisterForm = () => useFormHandler<RegisterForm>({
    initialData: {
        name: '',
        email: '',
        password: ''
    },
    onSubmit: async (formData) => {
        try {
            await apiAuth.register(formData)
        } catch (e) {
            console.log(e)
        }
    },
    validate: (formData) => {
        const errors: Partial<Record<keyof RegisterForm, string>> = {}

        if (!formData.name) {
            errors.name = 'Имя обязательно'
        }

        if (!formData.email) {
            errors.email = 'Email обязателен'
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Некорректный email'
        }

        if (!formData.password) {
            errors.password = 'Пароль обязателен'
        } else if (formData.password.length < 6) {
            errors.password = 'Пароль должен быть не менее 6 символов'
        }

        return Object.keys(errors).length > 0 ? errors as Record<keyof RegisterForm, string> : null
    }
})

import {apiAuth} from "../api";
import {useFormHandler} from "@shared/composables/useFormHandler";
import {LoginForm} from "./types";
import {useUserStore} from "../../../entities/user/model/user.store";
import {useRouter} from "vue-router";

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

const validateLoginForm = (formData: LoginForm): Record<keyof LoginForm, string> | null => {
    const errors: Partial<Record<keyof LoginForm, string>> = {}

    if (!formData.email.trim()) {
        errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
        errors.email = 'Please enter a valid email address'
    }

    if (!formData.password.trim()) {
        errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters'
    }

    return Object.keys(errors).length > 0 ? errors as Record<keyof LoginForm, string> : null
}

export const useLoginForm = () => {
    const router = useRouter()

    return useFormHandler<LoginForm>({
        initialData: {
            email: '',
            password: ''
        },
        validate: validateLoginForm,
        onSubmit: async (formData) => {
            try {
                const { accessToken, refreshToken } = await apiAuth.login(formData)
                await useUserStore().setTokens(accessToken, refreshToken)
                void router.push({name: 'TabLists'})
            } catch (e) {
                console.log(e)
            }
        }
    })
}

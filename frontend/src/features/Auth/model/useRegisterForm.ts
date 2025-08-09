import {apiAuth} from "../api";
import {useFormHandler} from "@shared/composables/useFormHandler";
import {RegisterForm} from "@/features/Auth/model/types";
import {setAuthorizationToken} from "@shared/instances/axios";
import {useUserStore} from "@/entities/user/model/user.store";
import {useRouter} from "vue-router";

export const useRegisterForm = () => {
    const router = useRouter();

    return useFormHandler<RegisterForm>({
        initialData: {
            name: '',
            email: '',
            password: ''
        },
        onSubmit: async (formData) => {
            try {
                const {accessToken} = await apiAuth.register(formData)
                await setAuthorizationToken(accessToken)
                void useUserStore().initUser()
                void router.push({name: 'TabLists'})
            } catch (e) {
                console.log(e)
            }
        },
        validate: (formData) => {
            const errors: Partial<Record<keyof RegisterForm, string>> = {}

            if (!formData.name.trim()) {
                errors.name = 'Name is required'
            } else if (formData.name.trim().length < 2) {
                errors.name = 'Name must be at least 2 characters'
            }

            if (!formData.email.trim()) {
                errors.email = 'Email is required'
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                errors.email = 'Please enter a valid email address'
            }

            if (!formData.password.trim()) {
                errors.password = 'Password is required'
            } else if (formData.password.length < 6) {
                errors.password = 'Password must be at least 6 characters'
            }

            return Object.keys(errors).length > 0 ? errors as Record<keyof RegisterForm, string> : null
        }
    })
}

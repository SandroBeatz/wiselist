import {apiAuth} from "../api";
import {useFormHandler} from "@shared/composables/useFormHandler";
import {LoginForm} from "./types";

export const useLoginForm = () => useFormHandler<LoginForm>({
    initialData: {
        email: '',
        password: ''
    },
    onSubmit: async (formData) => {
        try {
            await apiAuth.login(formData)
        } catch (e) {
            console.log(e)
        }
    }
})

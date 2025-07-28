import {apiAuth} from "../api";
import {useFormHandler} from "@shared/composables/useFormHandler";
import {LoginForm} from "./types";
import {setAuthorizationToken} from "@shared/instances/axios";
import {useUserStore} from "@/entities/user/model/user.store";
import {useRouter} from "vue-router";

export const useLoginForm = () => {
    const router = useRouter()

    return useFormHandler<LoginForm>({
        initialData: {
            email: '',
            password: ''
        },
        onSubmit: async (formData) => {
            try {
                const {accessToken} = await apiAuth.login(formData)
                await setAuthorizationToken(accessToken)
                void useUserStore().initUser()
                void router.push({name: 'TabLists'})
            } catch (e) {
                console.log(e)
            }
        }
    })
}

import {useUserStore} from "../../../entities/user";
import {apiAuth} from "../api";
import {useRouter} from "vue-router";
import {SocialLogin} from "@capgo/capacitor-social-login";

export function useLogout() {
    const router = useRouter()

    const logout = async () => {
        try {
            await apiAuth.logout()
            await useUserStore().logout()
            void SocialLogin.logout({
                provider: 'google'
            })
            void router.push({name: 'Auth'})
        } catch (error) {
            console.error("Logout failed:", error)
            // Even if API logout fails, clear local tokens
            await useUserStore().logout()
            void router.push({name: 'Auth'})
        }
    }

    return {
        logout
    }
}

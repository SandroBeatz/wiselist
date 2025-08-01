import {useUserStore} from "@/entities/user";
import {clearAuthorizationToken} from "@shared/instances/axios";
import {apiAuth} from "../api";
import {useRouter} from "vue-router";
import {SocialLogin} from "@capgo/capacitor-social-login";

export function useLogout() {
    const router = useRouter()

    const logout = async () => {
        try {
            await apiAuth.logout()
            void useUserStore().logout()
            void clearAuthorizationToken()
            void SocialLogin.logout({
                provider: 'google'
            })
            void router.push({name: 'Auth'})
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return {
        logout
    }
}

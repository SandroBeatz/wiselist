import {useUserStore} from "@/entities/user";
import {clearAuthorizationToken} from "@shared/instances/axios";
import {apiAuth} from "../api";
import {useRouter} from "vue-router";

export function useLogout() {
    const router = useRouter()

    const logout = async () => {
        try {
            await apiAuth.logout()
            void useUserStore().logout()
            void clearAuthorizationToken()
            void router.push({name: 'Auth'})
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return {
        logout
    }
}

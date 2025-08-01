import {useUserStore} from "@/entities/user";
import {setAuthorizationToken} from "@shared/instances/axios";
import {apiAuth} from "../api";
import {useRouter} from "vue-router";

export function useGoogleAuth() {
    const router = useRouter()

    const googleAuth = async (payload: any) => {
        try {
            const {accessToken} = await apiAuth.googleAuth(payload);
            await setAuthorizationToken(accessToken)
            void useUserStore().initUser()
            void router.push({name: 'TabLists'})
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return {
        googleAuth
    }
}

import {useUserStore} from "@/entities/user";
import {setAuthorizationToken} from "@shared/instances/axios";
import {apiAuth} from "../api";
import {useRouter} from "vue-router";
import {SocialLogin} from "@capgo/capacitor-social-login";
import {loadingController} from "@ionic/vue";

export function useGoogleAuth() {
    const router = useRouter()

    const googleAuth = async () => {
        const loading = await loadingController.create({
            message: ''
        });

        try {
            void loading.present();
            const {result} = await SocialLogin.login({
                provider: 'google',
                options: {
                    scopes: ['email', 'profile'],
                },
            });
            const {accessToken} = await apiAuth.googleAuth(result);
            await setAuthorizationToken(accessToken)
            await useUserStore().initUser()
            void router.push({name: 'TabLists'})
        } catch (e) {
            console.log(e)
        } finally {
            void loading.dismiss()
        }
    }

    return {
        googleAuth
    }
}

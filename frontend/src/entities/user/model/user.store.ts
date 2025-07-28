import {defineStore} from "pinia";
import {apiUser} from "@/entities/user/api";
import {useLocalStorage} from "@vueuse/core";
import {storageKeys} from "@shared/constants/storage.constants";

interface UserState {
    isLoading: boolean
    isAuth: boolean
    info: any
}

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        isLoading: false,
        isAuth: false,
        info: null,
    }),

    getters: {
    },
    actions: {
        toggleLoader(value?: boolean) {
            this.isLoading = typeof value === 'boolean' ? value : !this.isLoading
        },

        fetchUser() {
            return new Promise(async (resolve, reject) => {
                try {
                    this.toggleLoader(true)
                    const response = await apiUser.getMe()
                    this.info = response.data

                    resolve('ok')
                } catch (e) {
                    reject(e)
                } finally {
                    this.toggleLoader(false)
                }
            })
        },

        async initUser() {
            const AuthorizationToken = useLocalStorage<string>(storageKeys.ACCESS_TOKEN, null)
            if (AuthorizationToken.value) {
                this.isAuth = true
                await this.fetchUser()
            }
        },
    },
})

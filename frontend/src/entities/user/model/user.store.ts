import {defineStore} from "pinia";
import {apiUser} from "../api";
import {useLocalStorage} from "@vueuse/core";
import {storageKeys} from "@shared/constants/storage.constants";
import type {User} from "./types";
import {Nullable} from "@shared/types/global";

interface UserState {
    isLoading: boolean
    isAuth: boolean
    info: Nullable<User>
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

        async fetchUser() {
            try {
                this.toggleLoader(true)
                this.info = await apiUser.getMe()
                return 'ok'
            } finally {
                this.toggleLoader(false)
            }
        },

        async initUser() {
            const AuthorizationToken = useLocalStorage<string>(storageKeys.ACCESS_TOKEN, null)
            if (AuthorizationToken.value) {
                this.isAuth = true
                await this.fetchUser()
            }
        },

        async logout() {
            this.isAuth = false
            this.info = null
            useLocalStorage(storageKeys.ACCESS_TOKEN, null).value = null
        },
    },
})

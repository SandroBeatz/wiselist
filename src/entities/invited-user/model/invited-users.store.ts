import {defineStore} from 'pinia'
import type {InvitedUser} from './types'
import {apiInvitedUser} from '../api'

interface IState {
    isLoading: boolean
    users: InvitedUser[]
}

export const useInvitedUsersStore = defineStore('invited-users', {
    state: (): IState => ({
        isLoading: false,
        users: [],
    }),
    getters: {},
    actions: {
        toggleLoader(value?: boolean) {
            this.isLoading = typeof value === 'boolean' ? value : !this.isLoading
        },

        async fetchData() {
            this.toggleLoader(true)
            try {
                this.users = await apiInvitedUser.getAll()
            } finally {
                this.toggleLoader(false)
            }
        },
    },
})

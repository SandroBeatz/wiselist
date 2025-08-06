import {defineStore} from "pinia"
import type {List} from "./types";
import {apiList} from "../api";

interface IState {
    isLoading: boolean
    lists: List[]
}

export const useListsStore = defineStore("lists", {
    state: (): IState => ({
        isLoading: false,
        lists: []
    }),
    getters: {},
    actions: {
        toggleLoader(value?: boolean) {
            this.isLoading = typeof value === 'boolean' ? value : !this.isLoading
        },
        buildData(payload: List[]) {
            this.lists = payload
        },

        async fetchData() {
            try {
                const response = await apiList.getAll();
                this.buildData(response)
            } catch (e) {
                console.log('Get categories error:', e);
            }
        }
    },
})

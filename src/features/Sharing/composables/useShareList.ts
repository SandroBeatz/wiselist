import type {ListId} from "@entities/list";
import {apiListShare} from "@features/Sharing/api";
import {useIsLoading} from "@shared/composables/useIsLoading";
import {Promise} from "cypress/types/cy-bluebird";

export const useShareList = () => {
    const {isLoading, startLoading, finishLoading} = useIsLoading()

    const share = async (payload: {listId: ListId, email: string}, callback?: () => Promise<void> | void) => {
        try {
            startLoading()
            await apiListShare.shareList(payload.listId, {
                email: payload.email
            })
            await callback?.()
        } catch (e) {
            console.log(e)
        } finally {
            finishLoading()
        }
    }

    return {isLoading, share}
}

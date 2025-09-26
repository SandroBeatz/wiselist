import type {ListId} from "@entities/list";
import {apiListShare} from "@features/Sharing/api";
import {useIsLoading} from "@shared/composables/useIsLoading";

export const useShareList = () => {
    const {isLoading, startLoading, finishLoading} = useIsLoading()

    const share = async (payload: {listId: ListId, email: string}) => {
        try {
            startLoading()
            const response = await apiListShare.shareList(payload.listId, {
                email: payload.email
            })

            console.log(response)
        } catch (e) {
            console.log(e)
        } finally {
            finishLoading()
        }
    }

    return {isLoading, share}
}

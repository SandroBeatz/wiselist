import {API} from '@shared/instances/axios'
import type {
    ShareId
} from '@entities/share'
import type {ListId} from "@entities/list";
import type {ShareListRequest} from "../model/types";

// API endpoints
const SHARE_LIST = (listId: ListId) => `sharing/lists/${listId}`
const REMOVE_SHARE = (shareId: ShareId) => `sharing/lists/${shareId}/leave`

const shareList = (listId: ListId, payload: ShareListRequest) =>
    new Promise((resolve, reject) => {
        API.post(SHARE_LIST(listId), payload)
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || 'Failed to share list'), {
                        response: e.response,
                    })
                )
            )
    })


const removeShare = (shareId: ShareId) =>
    new Promise<{ message: string }>((resolve, reject) => {
        API.delete(REMOVE_SHARE(shareId))
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || 'Failed to remove share'), {
                        response: e.response,
                    })
                )
            )
    })

export const apiListShare = {
    shareList,
    removeShare,
} as const

import { API } from '@shared/instances/axios'
import type {InvitedUser} from '../model/types'

const INVITED_USER_ROUTE = 'sharing/invited-users'

const getAll = () =>
    new Promise<InvitedUser[]>((resolve, reject) => {
        API.get(INVITED_USER_ROUTE)
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || 'Request error'), {
                        response: e.response,
                    })
                )
            )
    })

export const apiInvitedUser = {
    getAll
} as const

import {API} from "@shared/instances/axios";
import type {User} from "../model/types";

const GET_ME = 'auth/me'

const getMe = () =>
    new Promise<User>((resolve, reject) => {
        API
            .get(GET_ME)
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || ''), {
                        response: e.response,
                    }),
                ),
            )
    })

export const apiUser = {
    getMe
} as const


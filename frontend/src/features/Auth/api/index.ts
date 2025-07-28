import {API} from "@shared/instances/axios";

const LOGIN_ROUTE = 'auth/login'
const REGISTER_ROUTE = 'auth/register'

const login = (form: any) =>
    new Promise<any>((resolve, reject) => {
        API
            .post(LOGIN_ROUTE, {...form})
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || 'Login request failed'), {
                        response: e.response,
                    }),
                ),
            )
    })

const register = (form: any) =>
    new Promise<any>((resolve, reject) => {
        API
            .post(REGISTER_ROUTE, {...form})
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || 'Register request failed'), {
                        response: e.response,
                    }),
                ),
            )
    })

export const apiAuth = {
    login,
    register
} as const


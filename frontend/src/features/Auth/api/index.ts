import {API} from "@shared/instances/axios";
import type {AuthResponse} from "../model/types";

const LOGIN_ROUTE = 'auth/login'
const REGISTER_ROUTE = 'auth/register'
const LOGOUT_ROUTE = 'auth/logout'

const login = (form: any) =>
    new Promise<AuthResponse>((resolve, reject) => {
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
    new Promise<AuthResponse>((resolve, reject) => {
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

const logout = () =>
    new Promise((resolve, reject) => {
        API
            .post(LOGOUT_ROUTE)
            .then((response) => resolve(response.data))
            .catch((e) =>
                reject(
                    Object.assign(new Error(e.message || 'Logout request failed'), {
                        response: e.response,
                    }),
                ),
            )
    })

export const apiAuth = {
    login,
    register,
    logout
} as const


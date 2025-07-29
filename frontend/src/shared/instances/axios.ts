import axios from 'axios'
import {useLocalStorage} from "@vueuse/core";
import {storageKeys} from "@shared/constants/storage.constants";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/`
})

function setHeaders() {
    API.defaults.headers.common = {
        ...API.defaults.headers.common,
        Authorization: `Bearer ${AuthorizationToken.value}`,
    }
}

const AuthorizationToken = useLocalStorage<string>(storageKeys.ACCESS_TOKEN, null)

setHeaders()

export const setAuthorizationToken = (token: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        if (!token) {
            reject(new Error('Token is required'))
        }
        AuthorizationToken.value = token;
        setHeaders()
        resolve()
    })
}
export const clearAuthorizationToken = () => {
    AuthorizationToken.value = null
    API.defaults.headers.common = {
        'Content-Type': 'application/json',
    }
}

export {API}

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        console.log(originalRequest)

        return Promise.reject(error)
    },
)

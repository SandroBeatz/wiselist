import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import authRoutes from "@/app/router/routes/auth.route";
import loginRoutes from "@/app/router/routes/login.route";
import registerRoutes from "@/app/router/routes/register.route";
import settingsRoutes from "@/app/router/routes/settings.route";
import listsRoutes from "@/app/router/routes/lists.route";
import {useLocalStorage} from "@vueuse/core";
import {storageKeys} from "@shared/constants/storage.constants";

declare module 'vue-router' {
    interface RouteMeta {
        middleware?: {
            isAuth?: boolean
            isGuest?: boolean
        }
    }

    export class useRoute {
    }
}

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/tabs/lists'
    },
    {
        path: '/tabs/',
        component: async () => (await import('@/app/ui/MainLayout')).MainLayout,
        meta: {
            middleware: {
                isAuth: true,
            },
        },
        children: [
            {path: '', redirect: '/tabs/lists'},
            ...listsRoutes,
            ...settingsRoutes,
        ]
    },
    ...authRoutes,
    ...loginRoutes,
    ...registerRoutes
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

router.beforeEach((to, from, next) => {
    const AuthorizationToken = useLocalStorage<string>(storageKeys.ACCESS_TOKEN, null)

    const isAuth = to.matched.some((record) => record.meta.middleware?.isAuth)
    const isGuest = to.matched.some((record) => record.meta.middleware?.isGuest)

    if (isAuth && !AuthorizationToken.value) {
        next({
            name: 'Auth',
            query: {redirect: to.fullPath},
        })
    } else if (!!AuthorizationToken.value && isGuest) {
        next({name: 'TabLists'})
    } else {
        next()
    }
})

export default router

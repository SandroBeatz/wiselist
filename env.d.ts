import 'vite/client';

interface ImportMetaEnv {
    VITE_API_URL: string;
    VITE_WEB_GOOGLE_AUTH_KEY: string;
}

interface ImportMeta {
    env: ImportMetaEnv;
}

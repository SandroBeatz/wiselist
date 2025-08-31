import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wiselist.app',
  appName: 'Wiselist',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "83090600571-3jqpe65clfc9aqgapm33nagjdnsgeisu.apps.googleusercontent.com",
      forceCodeForRefreshToken: false
    },
  },
  server: {
    androidScheme: 'https'
  },
};

export default config;

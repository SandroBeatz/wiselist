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
    StatusBar: {
      style: 'Light'
    }
  },
  server: {
    androidScheme: 'http'
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;

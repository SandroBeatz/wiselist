import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wiselist.app',
  appName: 'Wiselist',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
};

export default config;

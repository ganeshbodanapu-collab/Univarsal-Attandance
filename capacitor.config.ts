import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.universalaquasolutions.attendance',
  appName: 'Universal Attendance',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

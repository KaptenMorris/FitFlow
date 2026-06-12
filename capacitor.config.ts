import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fitflow',
  appName: 'FitFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mg.budgetfamille.app',
  appName: 'Budget-Famille',
  webDir: 'dist',
  androidScheme: 'https',
  server: {
    androidScheme: 'https',
  },
};

export default config;
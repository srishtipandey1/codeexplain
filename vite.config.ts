import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Set DISABLE_HMR=true in constrained environments to pause hot reload.
      hmr: process.env.DISABLE_HMR !== 'true',
      // File watching is paused alongside HMR to reduce background work.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
      // Set DISABLE_HMR=true in constrained environments to pause hot reload.
      // File watching is paused alongside HMR to reduce background work.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { homeArtworkPreload } from './scripts/home-artwork-preload';

export default defineConfig({
  plugins: [react(), homeArtworkPreload(import.meta.dirname)],
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        homeArtwork: resolve(import.meta.dirname, 'src/site/preload-home.ts'),
        practice: resolve(import.meta.dirname, 'practice.html'),
        adventure: resolve(import.meta.dirname, 'games/adventure.html'),
        robotLab: resolve(import.meta.dirname, 'games/robot-lab.html'),
      },
    },
  },
});

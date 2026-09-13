import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        practice: resolve(import.meta.dirname, 'practice.html'),
        adventure: resolve(import.meta.dirname, 'games/adventure.html'),
        robotLab: resolve(import.meta.dirname, 'games/robot-lab.html'),
      },
    },
  },
});

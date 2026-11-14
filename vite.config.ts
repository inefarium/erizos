import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' genera rutas relativas, de modo que el build funciona tanto en
// https://usuario.github.io/repositorio/ como en un dominio propio.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        ui: resolve(process.cwd(), 'src/ui/index.html'),
        popup: resolve(process.cwd(), 'src/extension/popup/popup.html'),
        devtools: resolve(process.cwd(), 'src/extension/devtools/devtools.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5173,
  },
});

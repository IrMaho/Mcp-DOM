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
        'service-worker': resolve(process.cwd(), 'src/extension/background/service-worker.ts'),
        'content-script': resolve(process.cwd(), 'src/extension/content/content-script.ts'),
        'page-script': resolve(process.cwd(), 'src/extension/injected/page-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (['service-worker', 'content-script', 'page-script'].includes(chunkInfo.name)) {
            return 'extension/[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5173,
  },
});

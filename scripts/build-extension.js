import { build } from 'vite';
import { resolve } from 'path';

async function buildExtension() {
  console.log('[Build] Compiling standalone Chrome Extension scripts (IIFE)...');

  // 1. Content Script (Strictly IIFE with all dependencies inlined, zero imports)
  await build({
    configFile: false,
    build: {
      outDir: 'dist/extension',
      emptyOutDir: false,
      lib: {
        entry: resolve(process.cwd(), 'src/extension/content/content-script.ts'),
        name: 'ForensicContentScript',
        formats: ['iife'],
        fileName: () => 'content-script.js',
      },
      rollupOptions: {
        output: {
          extend: true,
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 2. Injected Page Script (Strictly IIFE, zero imports)
  await build({
    configFile: false,
    build: {
      outDir: 'dist/extension',
      emptyOutDir: false,
      lib: {
        entry: resolve(process.cwd(), 'src/extension/injected/page-script.ts'),
        name: 'ForensicPageScript',
        formats: ['iife'],
        fileName: () => 'page-script.js',
      },
      rollupOptions: {
        output: {
          extend: true,
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Service Worker (Strictly IIFE, zero imports)
  await build({
    configFile: false,
    build: {
      outDir: 'dist/extension',
      emptyOutDir: false,
      lib: {
        entry: resolve(process.cwd(), 'src/extension/background/service-worker.ts'),
        name: 'ForensicServiceWorker',
        formats: ['iife'],
        fileName: () => 'service-worker.js',
      },
      rollupOptions: {
        output: {
          extend: true,
          inlineDynamicImports: true,
        },
      },
    },
  });

  console.log('✔ Standalone Chrome Extension scripts compiled successfully with ZERO external imports!');
}

buildExtension().catch((err) => {
  console.error('[Build Error]', err);
  process.exit(1);
});

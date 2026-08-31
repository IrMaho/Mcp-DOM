import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/server',
    emptyOutDir: false,
    target: 'node20',
    ssr: true,
    rollupOptions: {
      input: {
        'mcp-server': resolve(process.cwd(), 'src/mcp/server.ts'),
        'bridge-server': resolve(process.cwd(), 'src/mcp/bridge-server.ts'),
      },
      external: ['ws', 'zod', 'fs', 'path', 'http', 'readline', 'events', 'crypto', 'stream', 'url'],
      output: {
        entryFileNames: '[name].js',
        format: 'esm',
      },
    },
  },
});

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split app-wide vendors into cacheable chunks that load in parallel.
        // Operator-only heavy libs (pdf-lib, bwip-js, fontkit) are intentionally
        // NOT named here, so they stay inside their lazy operator chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/'))
            return 'react-vendor';
          if (id.includes('framer-motion') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion';
          if (id.includes('@supabase') || id.includes('@tanstack')) return 'data';
          if (id.includes('i18next')) return 'i18n';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Edge Functions are Deno; exclude from the Vite/Node test runner.
    exclude: ['supabase/**', 'node_modules/**', 'dist/**'],
  },
});

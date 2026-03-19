import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/react-dom|react\/|react-router/.test(id)) return 'vendor';
            if (/framer-motion|lucide-react/.test(id)) return 'ui';
            if (/@supabase/.test(id)) return 'supabase';
            if (/jspdf/.test(id)) return 'pdf';
            if (/react-hook-form|hookform|zod/.test(id)) return 'forms';
            if (/date-fns/.test(id)) return 'date-fns';
            if (/@radix-ui/.test(id)) return 'radix';
          }
        },
      },
    },
  },
}));

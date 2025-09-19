import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1200, // raise limit to reduce noisy warnings while we optimize
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Vendor core
              if (id.includes('node_modules')) {
                if (id.includes('@supabase')) return 'vendor-supabase';
                if (id.includes('@google/genai')) return 'vendor-genai';
                if (id.includes('react')) return 'vendor-react';
                return 'vendor';
              }
              // Large feature chunks by directory keywords
              if (id.includes('/components/')) {
                if (id.includes('Finance')) return 'feature-finance';
                if (id.includes('Projects')) return 'feature-projects';
                if (id.includes('Clients')) return 'feature-clients';
                if (id.includes('Marketing') || id.includes('SocialPlanner')) return 'feature-marketing';
                if (id.includes('Public')) return 'feature-public';
                if (id.includes('CalendarView')) return 'feature-calendar';
              }
              if (id.includes('/services/')) {
                return 'services';
              }
            }
          }
        }
      }
    };
});

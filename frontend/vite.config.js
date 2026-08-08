import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    host: '0.0.0.0',
    proxy:
      ['https', 'tunnel'].includes(mode)
        ? {
            '/api': {
              target: 'http://127.0.0.1:3000',
              changeOrigin: true,
            },
            '/supabase': {
              target: 'http://127.0.0.1:54321',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/supabase/, ''),
            },
          }
        : undefined,
  },
}));

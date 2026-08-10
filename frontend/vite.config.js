import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function isLocalBackend(url = '') {
  return url.includes('127.0.0.1') || url.includes('localhost') || url.includes('192.168.');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:3000';
  const proxyTarget = 'http://127.0.0.1:3000';
  const useApiProxy = ['https', 'tunnel'].includes(mode) && isLocalBackend(backendUrl);

  return {
    plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
    server: {
      host: '0.0.0.0',
      proxy: useApiProxy
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});

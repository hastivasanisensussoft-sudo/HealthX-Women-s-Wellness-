import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const shared = fileURLToPath(new URL('../../packages/shared/src', import.meta.url));
const sharedAssets = fileURLToPath(new URL('../../packages/shared/assets', import.meta.url));
// The HealthX API (apps/api). Proxied under /api so the browser talks to one origin and the
// refresh-token cookie can stay HttpOnly + SameSite=Strict. Override with HEALTHX_API_URL.
const apiTarget = process.env.HEALTHX_API_URL ?? 'http://127.0.0.1:4000';
// xfwd: the API sees the browser's address (X-Forwarded-For, trusted only from a loopback proxy) for rate limits.
const apiProxy = { '/api': { target: apiTarget, changeOrigin: true, xfwd: true, rewrite: (p: string) => p.replace(/^\/api/, '') } };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@healthx/shared': shared,
      '@shared-assets': sharedAssets,
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // The shared package lives outside this app's root.
    fs: { allow: ['..', '../..'] },
    proxy: apiProxy,
  },
  preview: { proxy: apiProxy },
});

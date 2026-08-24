import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], cacheDir: '.vite-zg', server: { host: '127.0.0.1', port: 8952, strictPort: true } });

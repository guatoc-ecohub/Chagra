import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/oauth': 'http://localhost:8081',
      '/api/ha': 'http://localhost:8123',
      '/api/ollama': 'http://localhost:11434',
      '/api': 'http://localhost:8081',
    },
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/zustand') || id.includes('node_modules/localforage')) {
            return 'vendor-state';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})

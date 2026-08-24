import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], cacheDir:'.vite-jg2', server:{host:'127.0.0.1',port:8964,strictPort:true} });

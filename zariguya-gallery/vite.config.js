import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const assetNames = [
  'zariguya.png',
  'zariguya-gemini-hero.png',
  'zariguya-gemini-cute.png',
  'zariguya-gemini-crias.png',
  'zariguya-gemini-escucha-01.png',
  'zariguya-gemini-escucha-02.png',
  'zariguya-gemini-escucha-03.png',
  'zariguya-gemini-escucha-04.png',
  'zariguya-gemini-muerta.png',
  'zariguya-gemini-verlupa.png',
  'zariguya-gemini-rig-cola.png',
];

function zariguyaAssets() {
  const assetRoot = resolve(repoRoot, 'public/compai/laminas');
  return {
    name: 'zariguya-gallery-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const urlPath = (request.url || '').split('?')[0];
        const prefix = '/compai/laminas/';
        if (!urlPath.startsWith(prefix)) return next();
        const name = urlPath.slice(prefix.length);
        if (!assetNames.includes(name)) return next();
        const filePath = resolve(assetRoot, name);
        if (!existsSync(filePath) || !statSync(filePath).isFile()) return next();
        response.setHeader('Content-Type', 'image/png');
        response.setHeader('Cache-Control', 'no-cache');
        response.end(readFileSync(filePath));
      });
    },
    generateBundle() {
      for (const name of assetNames) {
        const filePath = resolve(assetRoot, name);
        if (existsSync(filePath)) {
          this.emitFile({ type: 'asset', fileName: `compai/laminas/${name}`, source: readFileSync(filePath) });
        }
      }
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  cacheDir: resolve(repoRoot, '.vite-zariguya-cache'),
  plugins: [react(), zariguyaAssets()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    fs: { allow: [repoRoot] },
  },
  build: {
    outDir: resolve(import.meta.dirname, '../dist-zariguya-gallery'),
    emptyOutDir: true,
    target: 'es2022',
  },
});

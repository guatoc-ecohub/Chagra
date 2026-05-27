import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * viteSwBuildVersion — plugin que reemplaza `__BUILD_VERSION__` en el SW
 * por un timestamp único en cada `vite build`. Garantiza que el CACHE_NAME
 * cambie en TODOS los builds, incluso cuando un deploy ocurre sin bump de
 * version (ej. solo cambia public/deploy-marker.txt, redeploy CI sobre el
 * mismo commit, o hot-fix urgente sin pre-commit hook).
 *
 * Patrón QUICK-10 2026-05-27. Complementa scripts/auto-bump-version.mjs:
 * el auto-bump asegura el semver bump cuando hay diff src/**, este plugin
 * asegura busting de cache cuando el bundle output cambia por cualquier
 * razón (chunks hash distinto = bundle nuevo = SW debe invalidar).
 *
 * Por qué `closeBundle` y no `transform`: los archivos en `public/` no
 * pasan por el pipeline de transformación de Vite (se copian raw a outDir).
 * Tenemos que reescribir el sw.js ya emitido en dist/.
 */
function viteSwBuildVersion() {
  return {
    name: 'chagra-sw-build-version',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist')
      const swPath = resolve(outDir, 'sw.js')
      if (!existsSync(swPath)) {
        this.warn(`[viteSwBuildVersion] sw.js no encontrado en ${swPath}, skip`)
        return
      }
      const buildVersion = `${Date.now()}`
      const src = readFileSync(swPath, 'utf8')
      const out = src.replace(/__BUILD_VERSION__/g, buildVersion)
      writeFileSync(swPath, out, 'utf8')
      this.info?.(`[viteSwBuildVersion] sw.js BUILD_VERSION=${buildVersion}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), viteSwBuildVersion()],
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

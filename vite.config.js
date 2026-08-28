import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

// SHA del build para el self-heal por versión (src/services/versionCheck.js).
// Prioridad:
//   1. VITE_BUILD_SHA del entorno (deploy.yml lo setea con `git rev-parse
//      --short HEAD` — fuente de verdad del SHA desplegado, alineado con el
//      CACHE_NAME `chagra-<sha>` que deja el step "Bump SW cache version").
//   2. `git rev-parse --short HEAD` local (dev/build manual).
//   3. 'dev' si no hay git (tarball, sandbox). Con 'dev' el self-heal es no-op.
function resolveBuildSha() {
  if (process.env.VITE_BUILD_SHA) return process.env.VITE_BUILD_SHA.trim();
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const BUILD_SHA = resolveBuildSha();

// Plugin DEV-ONLY: sirve `public/valle/**/*.html` (el valle 3D vanilla, ver
// src/components/ValleMarcoScreen.jsx + scripts/sync-valle.mjs) como archivo
// estático crudo, sin pasar por el pipeline de `vite dev` para *.html.
//
// POR QUÉ: `vite dev` (a diferencia de `vite preview`/nginx — sirv puro, ya
// verificado limpio) intercepta TODA request de navegación que acepta
// `text/html` con su propio middleware de "SPA fallback"/transformIndexHtml,
// e ignora los `index.html` (y cualquier *.html) que ya existen bajo
// `publicDir` — es una limitación conocida de Vite en dev (no de este repo):
// cualquier HTML anidado en `public/` distinto del root se pisa por el
// index.html DE LA APP. Sin este bypass, el iframe del marco de entrada
// carga Chagra-dentro-de-Chagra en vez del valle bajo `npm run dev` (rompe
// SOLO la experiencia de dev local — detectado por captura real de
// navegador, no por curl: curl con Accept por defecto no dispara el
// fallback y da un falso verde). El build de producción (`vite preview`,
// dist/ real) NO necesita este bypass — ahí no hay servidor de dev, solo
// archivos estáticos, y ya sirve `public/valle/**` correctamente.
function serveValleHtmlInDev() {
  const VALLE_DIR = resolve(import.meta.dirname, 'public', 'valle');
  const MIME_BY_EXT = { '.html': 'text/html; charset=utf-8' };
  return {
    name: 'chagra-serve-valle-html-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0].split('#')[0];
        if (!urlPath.startsWith('/valle/')) return next();
        if (extname(urlPath) !== '.html' && !urlPath.endsWith('/')) return next();
        const rel = urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath;
        const filePath = join(VALLE_DIR, rel.slice('/valle/'.length));
        if (!filePath.startsWith(VALLE_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', MIME_BY_EXT[extname(filePath)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(filePath));
      });
    },
  };
}

// Plugin: emite dist/version.json con el SHA del build al cerrar el bundle.
// El cliente lo fetchea (no-store) para detectar que corre un bundle viejo y
// auto-recuperarse (versionCheck.runSelfHealCheck). Va a dist/ directo (no a
// public/) para no ensuciar el repo ni el watch del dev server; en dev el
// fetch de /version.json falla limpio (404) → self-heal no-op, sin romper nada.
function emitBuildMetadata() {
  return {
    name: 'chagra-emit-build-metadata',
    apply: 'build',
    closeBundle() {
      const payload = JSON.stringify(
        { sha: BUILD_SHA, builtAt: new Date().toISOString() },
        null,
        2,
      );
      try {
        writeFileSync(resolve(process.cwd(), 'dist', 'version.json'), payload + '\n', 'utf8');
      } catch (err) {
        // No bloquear el build por esto: el self-heal degrada a no-op si falta.
        this.warn(`could not emit version.json: ${err.message}`);
      }
      try {
        const swPath = resolve(process.cwd(), 'dist', 'sw.js');
        const sw = readFileSync(swPath, 'utf8');
        writeFileSync(
          swPath,
          sw.replaceAll('__CHAGRA_SW_BUILD_SHA__', BUILD_SHA),
          'utf8',
        );
      } catch (err) {
        this.warn(`could not stamp sw.js cache version: ${err.message}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), emitBuildMetadata(), serveValleHtmlInDev()],
  // Inyecta el SHA del build como literal en el bundle (versionCheck.js lo lee
  // como __BUILD_SHA__). JSON.stringify para que quede como string válido.
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
  },
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
      // Multi-página: la PWA (index.html) + el mockup público del mercado
      // (mercado.html → mercado.chagra.bio) se emiten en el mismo build.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        mercado: resolve(import.meta.dirname, 'mercado.html'),
        speciesViewer: resolve(import.meta.dirname, 'species-visor.html'),
        riggedPreview: resolve(import.meta.dirname, 'rigged-preview.html'),
        zariguya: resolve(import.meta.dirname, 'demos/zariguya/index.html'),
      },
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
          // three / @react-three (fiber + drei): SOLO lo usa el mockup 3D
          // (#/mockups/entrada-3d), cargado perezoso. Chunk aparte lo mantiene
          // fuera del bundle base y cacheable por sí solo.
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'vendor-three';
          }
        },
      },
    },
  },
})

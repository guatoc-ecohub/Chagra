/**
 * vendor-libs.mjs — copia TF.js (core+layers+data+backend-wasm) + speech-commands
 * de node_modules a public/vendor/ (SELF-HOSTED, ver src/services/wakeWordService.js).
 *
 * POR QUÉ core+layers+data+backend-wasm y NO el paquete `@tensorflow/tfjs`
 * completo (que trae cpu+webgl): el bundle completo hace `eval()` al cargar
 * (registro de kernels de los backends cpu/webgl) — viola la CSP real de
 * Chagra (`script-src ... 'wasm-unsafe-eval'`, SIN `'unsafe-eval'`,
 * ver index.html Task 112 post-incidente #1631). De-riskeado en vivo
 * (scripts/wake-word/train-model.mjs pegándole a un servidor con la MISMA
 * CSP): tfjs-core solo, sin backend, NO hace eval; agregar el backend WASM
 * (que solo necesita `wasm-unsafe-eval`, ya permitido) resuelve todo sin
 * tocar la CSP. Backend forzado a 'wasm' en wakeWordService.js.
 *
 * Offline-first: el modo campo NUNCA debe depender de un CDN externo en
 * producción. Este script documenta y reproduce esa copia — correlo de
 * nuevo cada vez que se actualicen las versiones de @tensorflow/tfjs* o
 * @tensorflow-models/speech-commands en package.json.
 *
 * Uso:  node scripts/wake-word/vendor-libs.mjs
 */
import { copyFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '..', '..');
const NM = join(REPO_ROOT, 'node_modules');

/** npm a veces anida tfjs-core/layers/data bajo node_modules/@tensorflow/tfjs/node_modules/
 * cuando hay conflicto de peer deps con @tensorflow/tfjs-backend-wasm (que pide una
 * versión de tfjs-core distinta a la que trae @tensorflow-models/speech-commands).
 * Probamos ambas ubicaciones — la nesteada primero (es la observada en este repo). */
function resolveFirst(...candidates) {
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`Ninguna de estas rutas existe:\n${candidates.join('\n')}`);
}

const TFJS_NESTED = join(NM, '@tensorflow/tfjs/node_modules/@tensorflow');

const COPIES = [
  {
    from: resolveFirst(
      join(TFJS_NESTED, 'tfjs-core/dist/tf-core.min.js'),
      join(NM, '@tensorflow/tfjs-core/dist/tf-core.min.js'),
    ),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tf-core.min.js'),
  },
  {
    from: resolveFirst(
      join(TFJS_NESTED, 'tfjs-layers/dist/tf-layers.min.js'),
      join(NM, '@tensorflow/tfjs-layers/dist/tf-layers.min.js'),
    ),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tf-layers.min.js'),
  },
  {
    from: resolveFirst(
      join(TFJS_NESTED, 'tfjs-data/dist/tf-data.min.js'),
      join(NM, '@tensorflow/tfjs-data/dist/tf-data.min.js'),
    ),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tf-data.min.js'),
  },
  {
    from: join(NM, '@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js'),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tf-backend-wasm.min.js'),
  },
  {
    from: join(NM, '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm'),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tfjs-backend-wasm.wasm'),
  },
  {
    from: join(NM, '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm'),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tfjs-backend-wasm-simd.wasm'),
  },
  {
    from: join(NM, '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm'),
    to: join(REPO_ROOT, 'public/vendor/tfjs/tfjs-backend-wasm-threaded-simd.wasm'),
  },
  {
    from: join(NM, '@tensorflow-models/speech-commands/dist/speech-commands.min.js'),
    to: join(REPO_ROOT, 'public/vendor/speech-commands/speech-commands.min.js'),
  },
];

for (const { from, to } of COPIES) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  const { size } = statSync(to);
  console.log(`${to} (${(size / 1024).toFixed(1)} KB)`);
}
console.log('Listo. Recordá correr esto de nuevo si cambian las versiones en package.json.');

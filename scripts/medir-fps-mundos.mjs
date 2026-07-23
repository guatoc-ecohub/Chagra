#!/usr/bin/env node
// medir-fps-mundos.mjs — mide FPS REALES (no bytes) de los mundos 3D de Chagra,
// con throttling de CPU tipo "móvil barato" (CDP Emulation.setCPUThrottlingRate).
//
// Por qué existe: `check-perf-budget.mjs` solo pesa archivos del bundle. NUNCA
// nadie había medido si un mundo 3D corre fluido en el hardware que de verdad
// va a usar un campesino (gama Moto E). Este script corre la app REAL en la
// GPU REAL de la máquina (headed, sin swiftshader) y cuenta frames con
// requestAnimationFrame — no hay Math.random ni estimaciones.
//
// TRAMPA QUE ESTE SCRIPT EVITA (documentada en gate-real-gpu.mjs, verificada
// 2026-07-22 en stg con chromium 148):
//   --use-gl=egl            -> cae a SwiftShader (software, ANGLE Subzero) — BASURA
//   sin flag de GL          -> AMD Radeon Vega 10 real (ANGLE) — OK
//   --use-angle=gl --use-gl=angle -> también real (alternativa)
// Por eso este script NO pasa --use-gl=egl. Verifica el renderer en cada
// medición vía WEBGL_debug_renderer_info y ABORTA esa medición si dice
// swiftshader/llvmpipe/software — un número medido en software no vale nada.
//
// TRAMPA #2: los blob-workers de troika (drei <Text>) mueren async en
// chromium 148 y dejan la escena entera suspendida (canvas de un solo color).
// Se deshabilitan igual que en gate-real-gpu.mjs (window.Worker lanza si la
// URL es blob:, troika cae a main-thread).
//
// Uso:
//   node scripts/medir-fps-mundos.mjs [--dist dist] [--out ops/informes/fps-mundos-YYYY-MM-DD.json]
//                                     [--routes slug1,slug2,...] [--rates 1,4,6]
//                                     [--window 12000] [--settle 6000] [--port <PID-derivado por defecto>]
//                                     [--simular-equipo <núcleos>,<GB-RAM>]
//                                     [--viewport WxH] [--dpr N]
//
// --viewport/--dpr (agregados 2026-07-23, ver ops/informes/valle-cuello-
// 2026-07-23.md): achican el viewport/devicePixelRatio de Playwright sin
// tocar la escena — sirve para el test canónico de fill-rate (achicar el
// viewport a casi cero píxeles y ver si el fps se dispara). Default sin
// pasarlos: 390×844 @dpr2, igual que siempre.
//
// --simular-equipo es EXTRA (no lo pidió el encargo original, que solo pedía
// throttling de CPU): sobreescribe navigator.hardwareConcurrency/deviceMemory
// para que decidirTier() del framework de mundos vea un equipo de gama baja/
// media DE VERDAD, no el del navegador que corre el script. Ver TRAMPA #4 en
// ops/informes/fps-mundos-2026-07-22.md — el throttling de CPU por sí solo
// NO cambia esas señales, así que no simula el camino de render que un
// teléfono barato real ejecutaría.
//
// Salida: tabla en stdout + JSON completo en --out (o consola.log del path
// default si no se pasa --out). Reutilizable como gate: process.exitCode = 1
// si algún mundo por debajo del UMBRAL_MERGE (ver ops/informes, propuesta de
// umbral) o si algún mundo mide con renderer de software.

import pw from 'playwright';
const { chromium } = pw;
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────
// Lista de mundos: TODOS los mockups que efectivamente montan un <Canvas>
// WebGL, sacados de src/App.jsx (MOCKUP_HASH_ROUTES) cruzado con:
//   grep -rl "<Canvas" src/mockups/ src/visual/mundo3d/escenas/ src/visual/mundo3d/micorrizas/
// Los mundos "legacy" mockups/mundo3d-* usan el framework compartido <Mundo>
// (src/visual/mundo3d/Mundo.jsx), que monta la escena real (EscenaBase3D.jsx,
// que SÍ tiene <Canvas>) solo si decidirTier() no cae a 2D — por eso también
// entran a la lista (el propio framework decide 2D/3D según el "hardware" que
// ve el navegador, algo que este script puede terminar exponiendo bajo
// throttling: un mundo puede "no cargar" 3D no por bug sino por tiering).
//
// Para sumar un mundo nuevo: agregar {slug, nombre}. slug = lo que va después
// de '#/' en la URL (tal cual MOCKUP_HASH_ROUTES en src/App.jsx).
const RUTAS_3D = [
  // ── El valle (home 3D) y el contraste que reportó el operador ──────────
  { slug: 'mockups/entrada-3d', nombre: 'Valle (EntradaValle3D — home 3D, mismo componente que la ruta valle3d)', familia: 'valle' },
  // ARCHIVADA a mitad de este trabajo (commit 5ad2c1ed, 2026-07-22): el
  // operador señaló ESTA ruta como "se ve muy bien" y es la comparación
  // central del informe, pero `SueloDemo3D.jsx` se movió a `_archivo/` y la
  // ruta ya no monta nada — se deja en la lista a propósito para que el
  // script lo documente en vez de desaparecerlo en silencio. Los números
  // válidos de cuando SÍ estaba viva quedan citados por commit en el informe.
  { slug: 'mockups/suelo-demo-3d', nombre: 'Suelo demo 3D (el que "se ve muy bien" — ARCHIVADA a mitad de este trabajo, ver informe)', familia: 'demo' },
  // Reemplazo directo de suelo-demo-3d + bosque-vivo-3d + mundo-paramo-3d
  // (commit 5ad2c1ed): "el mundo ÚNICO del páramo". Es el nuevo punto de
  // comparación "bien" para lo que ve el usuario HOY en vez de la ruta
  // archivada de arriba.
  { slug: 'mockups/paramo-definitivo', nombre: 'Páramo definitivo (reemplazo 2026-07-22 de suelo-demo-3d/bosque-vivo-3d/mundo-paramo-3d)', familia: 'demo' },
  { slug: 'mockups/hoja-prueba-valle', nombre: 'Hoja de prueba del valle (calibración de assets)', familia: 'demo' },
  { slug: 'mockups/valle-lluvia-3d', nombre: 'Valle con lluvia', familia: 'valle' },
  { slug: 'mockups/valle-noche-3d', nombre: 'Valle de noche', familia: 'valle' },

  // ── Mundos "Vivo3D" (device-tiering real, familia EscenaCalma/base) ─────
  // bosque-vivo-3d: TAMBIÉN archivada en el mismo commit 5ad2c1ed (ver arriba)
  // — reemplazada por paramo-definitivo. Se deja en la lista por la misma
  // razón: que el script documente la ausencia, no que la oculte.
  { slug: 'mockups/bosque-vivo-3d', nombre: 'Bosque vivo 3D (ARCHIVADA 2026-07-22, ver paramo-definitivo)', familia: 'vivo' },
  { slug: 'mockups/cafetal-vivo-3d', nombre: 'Cafetal vivo 3D', familia: 'vivo' },
  { slug: 'mockups/aguacatal-vivo-3d', nombre: 'Aguacatal vivo 3D', familia: 'vivo' },
  { slug: 'mockups/invernadero-vivo-3d', nombre: 'Invernadero vivo 3D', familia: 'vivo' },
  { slug: 'mockups/cacao-vivo-3d', nombre: 'Cacao vivo 3D', familia: 'vivo' },
  { slug: 'mockups/papa-viva-3d', nombre: 'Papa viva 3D', familia: 'vivo' },
  { slug: 'mockups/mundo-piscicultura-3d', nombre: 'Piscicultura 3D', familia: 'vivo' },
  { slug: 'mockups/lecheria-viva-3d', nombre: 'Lechería viva 3D', familia: 'vivo' },

  // ── Mundos nuevos (Mundo*3D.jsx, Canvas propio confirmado por grep) ─────
  { slug: 'mockups/mundo-suelo-vivo-3d', nombre: 'Mundo suelo vivo 3D (red micorrízica)', familia: 'mundo' },
  { slug: 'mockups/aliados-finca-3d', nombre: 'Aliados de la finca 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-cafe-3d', nombre: 'Mundo café 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-semillero-3d', nombre: 'Mundo semillero 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-compost-3d', nombre: 'Mundo compost 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-fermentos-3d', nombre: 'Mundo fermentos 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-microfauna-3d', nombre: 'Mundo microfauna 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-agua-3d', nombre: 'Mundo agua 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-paramo-3d', nombre: 'Mundo páramo 3D (ARCHIVADA 2026-07-22, ruta ya no existe, ver paramo-definitivo)', familia: 'mundo' },
  { slug: 'mockups/mundo-abejas-3d', nombre: 'Mundo abejas 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-gallinero-3d', nombre: 'Mundo gallinero 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-mercado-3d', nombre: 'Mundo mercado 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-botica-cana-3d', nombre: 'Mundo botica + caña 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-frutales-3d', nombre: 'Mundo frutales 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-leguminosas-3d', nombre: 'Mundo leguminosas 3D', familia: 'mundo' },
  { slug: 'mockups/jaguar-monte-3d', nombre: 'Jaguar en el monte 3D', familia: 'mundo' },
  { slug: 'mockups/frutales-andinos-3d', nombre: 'Frutales andinos 3D', familia: 'mundo' },
  { slug: 'mockups/mundo-polinizadores-3d', nombre: 'Mundo polinizadores 3D', familia: 'mundo' },
  { slug: 'mockups/micorrizas-3d', nombre: 'Micorrizas 3D', familia: 'mundo' },
  { slug: 'mockups/paramo-humboldt-3d', nombre: 'Páramo Humboldt 3D', familia: 'mundo' },
  { slug: 'mockups/bosque-tres-estratos', nombre: 'Bosque tres estratos', familia: 'mundo' },
  { slug: 'mockups/tres-ents-gradiente', nombre: 'Tres ents en gradiente', familia: 'demo' },

  // ── Legacy: framework compartido <Mundo> (puede caer a 2D por tiering) ──
  { slug: 'mockups/mundo3d-agua', nombre: '[legacy] Mundo3D agua', familia: 'legacy' },
  { slug: 'mockups/mundo3d-suelo', nombre: '[legacy] Mundo3D suelo', familia: 'legacy' },
  { slug: 'mockups/mundo3d-animales', nombre: '[legacy] Mundo3D animales', familia: 'legacy' },
  { slug: 'mockups/mundo3d-milpa', nombre: '[legacy] Mundo3D milpa', familia: 'legacy' },
  { slug: 'mockups/mundo3d-bosque', nombre: '[legacy] Mundo3D bosque', familia: 'legacy' },
  { slug: 'mockups/mundo3d-clima', nombre: '[legacy] Mundo3D clima', familia: 'legacy' },
  { slug: 'mockups/mundo3d-sanidad', nombre: '[legacy] Mundo3D sanidad', familia: 'legacy' },
  { slug: 'mockups/mundo3d-mercado', nombre: '[legacy] Mundo3D mercado', familia: 'legacy' },
  { slug: 'mockups/mundo3d-cafe', nombre: '[legacy] Mundo3D café', familia: 'legacy' },
  { slug: 'mockups/mundo3d-semillero', nombre: '[legacy] Mundo3D semillero', familia: 'legacy' },

  // ── Demos / utilidades 3D (no son "mundos" pero montan Canvas) ─────────
  { slug: 'mockups/camara-director', nombre: 'Cámara directora (demo)', familia: 'demo' },
  { slug: 'mockups/momento-venta-mercado-3d', nombre: 'Momento de venta en el mercado 3D', familia: 'demo' },
  { slug: 'mockups/artesania-andina', nombre: 'Artesanía andina (demo)', familia: 'demo' },
  { slug: 'mockups/efectos-funcionales', nombre: 'Efectos funcionales (demo)', familia: 'demo' },
  { slug: 'mockups/catalogo-infra', nombre: 'Catálogo de infraestructura (demo)', familia: 'demo' },
  { slug: 'mockups/infraestructura-3d', nombre: 'Infraestructura 3D', familia: 'demo' },
  { slug: 'mockups/colocar-infraestructura', nombre: 'Colocar infraestructura', familia: 'demo' },
  { slug: 'mockups/vitrina-3d', nombre: 'Vitrina de criaturas 3D', familia: 'vitrina' },
  { slug: 'mockups/vitrina-infra', nombre: 'Vitrina de infraestructura', familia: 'vitrina' },
  { slug: 'mockups/vitrina-maestra', nombre: 'Vitrina maestra de mundos', familia: 'vitrina' },
  { slug: 'mockups/new-donk', nombre: 'New Donk (2D↔3D)', familia: 'juego' },
  { slug: 'mockups/murales-new-donk', nombre: 'Murales New Donk', familia: 'juego' },
  { slug: 'mockups/juego-mi-finca', nombre: 'Mi finca Odyssey (juego, túnel 2D↔3D)', familia: 'juego' },
  { slug: 'mockups/sierra-global', nombre: 'Vista global de la sierra', familia: 'demo' },
];

// ─────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    // PUERTO POR CORRIDA, NO FIJO (mismo fix que scripts/gate-real-gpu.mjs,
    // 2026-07-22, commit 11b97b0a: "puerto por corrida — dos gates a la vez
    // se fotografiaban el uno al otro"). Con un puerto fijo, dos corridas
    // concurrentes de este script (o una corrida de este script + una de
    // gate-real-gpu.mjs) hacen que la segunda le pegue al servidor de la
    // primera y mida la app EQUIVOCADA en silencio — exactamente lo que pasó
    // en esta misma corrida el 2026-07-22 con un `http.server` huérfano en 8099 (ver
    // guarda de verificación más abajo, que se agregó ANTES de conocer el fix
    // upstream y se mantiene como defensa en profundidad).
    dist: join(REPO_ROOT, 'dist'), out: null, routes: null, rates: [1, 4, 6], window: 12000, settle: 6000, port: 8100 + (process.pid % 800),
    // --simular-equipo cores,memGB: sobreescribe navigator.hardwareConcurrency
    // y navigator.deviceMemory ANTES de que cargue la app, para que
    // decidirTier() (src/visual/mundo3d/deviceTier.js) vea un equipo real de
    // gama baja/media en vez del hardware del navegador que corre el script.
    // Sin esto, el CPU-throttling de CDP NO cambia esas señales: la app sigue
    // detectando "gama alta" (muchos núcleos/RAM del equipo que mide) y
    // renderiza el perfil 'alto' completo, solo que más lento — que NO es lo
    // que un Moto E real ejecuta (a un Moto E real decidirTier() lo manda a
    // 'medio' o 'bajo'/2D, un camino de render distinto y más liviano).
    hw: null, mem: null,
    // --viewport WxH / --dpr N: ver nota en medirRuta(). null = default de siempre.
    viewport: null, dpr: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dist') out.dist = resolve(argv[++i]);
    else if (a === '--out') out.out = resolve(argv[++i]);
    else if (a === '--routes') out.routes = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--rates') out.rates = argv[++i].split(',').map(Number);
    else if (a === '--window') out.window = Number(argv[++i]);
    else if (a === '--settle') out.settle = Number(argv[++i]);
    else if (a === '--port') out.port = Number(argv[++i]);
    else if (a === '--simular-equipo') { const [c, m] = argv[++i].split(','); out.hw = Number(c); out.mem = Number(m); }
    else if (a === '--viewport') { const [w, h] = argv[++i].split('x').map(Number); out.viewport = { width: w, height: h }; }
    else if (a === '--dpr') out.dpr = Number(argv[++i]);
  }
  return out;
}

const ARGS = parseArgs(process.argv.slice(2));
const FECHA = new Date().toISOString().slice(0, 10);
if (!ARGS.out) ARGS.out = join(REPO_ROOT, 'ops', 'informes', `fps-mundos-${FECHA}.json`);

const RUTAS = ARGS.routes ? RUTAS_3D.filter((r) => ARGS.routes.includes(r.slug)) : RUTAS_3D;

const RE_SOFTWARE = /swiftshader|llvmpipe|software/i;

// GUARDA (2026-07-22, encontrada corriendo el barrido en `dev` fresco tras
// el commit 5ad2c1ed): cuando una ruta de `RUTAS_3D` se RETIRA de
// `MOCKUP_HASH_ROUTES` en src/App.jsx (mundo archivado), la app NO da 404 ni
// deja el canvas vacío — su propio router hace fallback silencioso a
// `navigate(hash === 'login' ? 'login' : 'valle3d')` (ver App.jsx, efecto de
// arranque) porque el contexto de Playwright nunca tiene sesión. El script
// medía un <canvas> real, con fps y draw-calls reales... del VALLE, y lo
// reportaba como si fuera la ruta pedida. `suelo-demo-3d`, `bosque-vivo-3d`
// y `mundo-paramo-3d` midieron ~470-560 draw calls / ~935-960k triángulos
// IDÉNTICOS a `entrada-3d` en la primera corrida sobre dev fresco — la señal
// que delató el problema. Antes de medir NADA, se verifica que el slug siga
// vivo en el `MOCKUP_HASH_ROUTES` real de `src/App.jsx` (se lee el archivo
// de la MISMA corrida, no una copia vieja) y si no está, se marca
// 'ruta-no-existe' sin abrir navegador — mejor eso que un número que mide
// otra cosa.
function rutasVivasEnAppJsx() {
  const appJsxPath = join(REPO_ROOT, 'src', 'App.jsx');
  if (!existsSync(appJsxPath)) return null; // no se pudo verificar; no bloquea
  const src = readFileSync(appJsxPath, 'utf8');
  const m = src.match(/const MOCKUP_HASH_ROUTES = \{([\s\S]*?)\n\};/);
  if (!m) return null;
  const claves = new Set([...m[1].matchAll(/^\s*'([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?)':/gm)].map((x) => x[1]));
  return claves;
}

// Sobreescribe navigator.hardwareConcurrency/deviceMemory ANTES de que la app
// arranque, para que decidirTier() vea el equipo que estamos simulando y no
// el del navegador real. Se registra como addInitScript aparte, con el
// parámetro {hw, mem} inyectado por Playwright.
function instalarSimulacionEquipo({ hw, mem }) {
  if (typeof hw === 'number') {
    Object.defineProperty(window.navigator, 'hardwareConcurrency', { get: () => hw, configurable: true });
  }
  if (typeof mem === 'number') {
    Object.defineProperty(window.navigator, 'deviceMemory', { get: () => mem, configurable: true });
  }
}

// Script inyectado ANTES de que cargue cualquier JS de la página (addInitScript
// corre en cada documento nuevo, en orden de registro, antes que la app).
function instalarInstrumentacion() {
  window.__perf = {
    firstDrawTime: null,
    measuring: false,
    frames: [],
    _drawCalls: 0,
    _triangles: 0,
    _buffers: new Set(),
    _textures: new Set(),
  };

  function contarTriangulos(mode, count, instancias) {
    // Constantes GL: TRIANGLES=4, TRIANGLE_STRIP=5, TRIANGLE_FAN=6
    let t = 0;
    if (mode === 4) t = count / 3;
    else if (mode === 5 || mode === 6) t = Math.max(0, count - 2);
    else return 0; // líneas/puntos no cuentan como triángulos
    return t * (instancias || 1);
  }

  function marcarPrimerDibujo() {
    if (window.__perf.firstDrawTime === null) window.__perf.firstDrawTime = performance.now();
  }

  function parcharGL(proto) {
    if (!proto || proto.__perfPatched) return;
    proto.__perfPatched = true;
    const dA = proto.drawArrays;
    proto.drawArrays = function (mode, first, count) {
      marcarPrimerDibujo();
      window.__perf._drawCalls++;
      window.__perf._triangles += contarTriangulos(mode, count, 1);
      return dA.call(this, mode, first, count);
    };
    const dE = proto.drawElements;
    proto.drawElements = function (mode, count, type, offset) {
      marcarPrimerDibujo();
      window.__perf._drawCalls++;
      window.__perf._triangles += contarTriangulos(mode, count, 1);
      return dE.call(this, mode, count, type, offset);
    };
    if (proto.drawArraysInstanced) {
      const dAI = proto.drawArraysInstanced;
      proto.drawArraysInstanced = function (mode, first, count, instanceCount) {
        marcarPrimerDibujo();
        window.__perf._drawCalls++;
        window.__perf._triangles += contarTriangulos(mode, count, instanceCount);
        return dAI.call(this, mode, first, count, instanceCount);
      };
    }
    if (proto.drawElementsInstanced) {
      const dEI = proto.drawElementsInstanced;
      proto.drawElementsInstanced = function (mode, count, type, offset, instanceCount) {
        marcarPrimerDibujo();
        window.__perf._drawCalls++;
        window.__perf._triangles += contarTriangulos(mode, count, instanceCount);
        return dEI.call(this, mode, count, type, offset, instanceCount);
      };
    }
    const cB = proto.createBuffer;
    proto.createBuffer = function (...a) {
      const b = cB.apply(this, a);
      window.__perf._buffers.add(b);
      return b;
    };
    const dB = proto.deleteBuffer;
    proto.deleteBuffer = function (b) {
      window.__perf._buffers.delete(b);
      return dB.call(this, b);
    };
    const cT = proto.createTexture;
    proto.createTexture = function (...a) {
      const t = cT.apply(this, a);
      window.__perf._textures.add(t);
      return t;
    };
    const dT = proto.deleteTexture;
    proto.deleteTexture = function (t) {
      window.__perf._textures.delete(t);
      return dT.call(this, t);
    };
  }
  if (window.WebGLRenderingContext) parcharGL(window.WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext) parcharGL(window.WebGL2RenderingContext.prototype);

  const origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    return origRAF((t) => {
      if (window.__perf.measuring) {
        window.__perf.frames.push({
          t,
          calls: window.__perf._drawCalls,
          tris: window.__perf._triangles,
          geomLive: window.__perf._buffers.size,
          texLive: window.__perf._textures.size,
        });
        window.__perf._drawCalls = 0;
        window.__perf._triangles = 0;
      }
      cb(t);
    });
  };

  // Troika/drei <Text>: en chromium 148 los blob-workers mueren async y dejan
  // TODA la escena suspendida (canvas de un solo color, gate aprobaría a
  // ciegas). Mismo fix que gate-real-gpu.mjs: tronar síncrono para que troika
  // caiga a main-thread.
  const OriginalWorker = window.Worker;
  window.Worker = function (url, opts) {
    if (String(url).startsWith('blob:')) {
      throw new Error('[medir-fps] worker de blob deshabilitado: troika cae a main-thread');
    }
    return new OriginalWorker(url, opts);
  };
  window.Worker.prototype = OriginalWorker.prototype;
}

function percentil(sortedArr, p) {
  if (sortedArr.length === 0) return null;
  const idx = Math.min(sortedArr.length - 1, Math.max(0, Math.round((p / 100) * (sortedArr.length - 1))));
  return sortedArr[idx];
}

async function medirRuta(browser, ruta, rate, opts) {
  const ctx = await browser.newContext({
    // --viewport WxH y --dpr N (opcionales, EXPERIMENTO B de fill-rate,
    // ver ops/informes/valle-cuello-2026-07-23.md): permiten achicar el
    // viewport a casi cero píxeles manteniendo la MISMA escena/draw-calls/
    // triángulos, para separar fill-rate/overdraw de geometría pura. Sin
    // pasarlos, el comportamiento es idéntico al de siempre (390×844 @2x).
    viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: opts.dpr != null ? opts.dpr : 2,
    // OJO: gate-real-gpu.mjs usa reducedMotion:'reduce' porque quiere una
    // captura ESTÁTICA y estable. Aquí es EXACTAMENTE al revés: la app lee
    // prefers-reduced-motion y, si está en 'reduce', pone el frameloop de
    // r3f en 'demand' (sin re-render continuo) — medir fps con eso puesto
    // da 0 frames SIEMPRE, no porque la escena esté congelada sino porque
    // dejamos de pedirle que dibuje. Un campesino real NO tiene reduced-
    // motion activado por defecto, así que medimos con motion normal.
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  if (opts.hw != null || opts.mem != null) {
    await page.addInitScript(instalarSimulacionEquipo, { hw: opts.hw, mem: opts.mem });
  }
  await page.addInitScript(instalarInstrumentacion);
  const resultado = {
    slug: ruta.slug, nombre: ruta.nombre, familia: ruta.familia, rate,
    equipoSimulado: (opts.hw != null || opts.mem != null) ? { hw: opts.hw, mem: opts.mem } : null,
    status: null, renderer: null, error: null,
    fpsAvg: null, fpsP5: null, fpsP95: null, worstFrameMs: null,
    drawCallsAvg: null, trianglesAvg: null, geometrias: null, texturas: null,
    tiempoPrimerFrameMs: null, jsHeapMB: null, framesCapturados: 0,
  };
  try {
    const cdp = await ctx.newCDPSession(page);
    if (rate !== 1) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    }
    await page.goto(`${opts.base}/#/${ruta.slug}`, { waitUntil: 'load', timeout: 45000 });

    const canvasListo = await page.waitForFunction(
      () => { const c = document.querySelector('canvas'); return c && c.width > 0; },
      { timeout: 40000 },
    ).then(() => true).catch(() => false);

    if (!canvasListo) {
      // ¿Hay ALGÚN canvas (2D fallback / tiering) o de plano no cargó nada?
      const diag = await page.evaluate(() => {
        const cs = Array.from(document.querySelectorAll('canvas'));
        return {
          hayCanvas: cs.length > 0,
          anchoMax: cs.length ? Math.max(...cs.map((c) => c.width)) : 0,
          bodyLen: document.body ? document.body.innerText.length : 0,
        };
      }).catch(() => null);
      resultado.status = diag && diag.hayCanvas
        ? 'sin-canvas-3d (canvas presente pero sin tamaño tras 40s — posible fallback 2D por device-tier o escena colgada)'
        : 'no-carga (sin ningún <canvas> tras 40s)';
      resultado.error = diag ? JSON.stringify(diag) : 'no se pudo diagnosticar (evaluate falló)';
      await ctx.close();
      return resultado;
    }

    const renderer = await page.evaluate(() => {
      try {
        const c = document.querySelector('canvas');
        const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
        const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a';
      } catch { return 'err'; }
    });
    resultado.renderer = renderer;

    if (RE_SOFTWARE.test(String(renderer))) {
      resultado.status = 'ABORTADO: renderer de software (swiftshader/llvmpipe) — número no confiable';
      await ctx.close();
      return resultado;
    }

    // Ventana de asentamiento: dejar que la escena termine de montar geometría
    // /texturas antes de contar frames. Fija en tiempo REAL (no escala con el
    // throttle) para que las 3 condiciones midan la MISMA ventana de reloj.
    await sleep(opts.settle);

    await page.evaluate(() => {
      window.__perf.frames = [];
      window.__perf.measuring = true;
    });
    await sleep(opts.window);
    const { frames, firstDrawTime } = await page.evaluate(() => {
      window.__perf.measuring = false;
      return { frames: window.__perf.frames, firstDrawTime: window.__perf.firstDrawTime };
    });

    const heapMB = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize / (1024 * 1024) : null));

    resultado.tiempoPrimerFrameMs = firstDrawTime !== null ? Math.round(firstDrawTime) : null;
    resultado.jsHeapMB = heapMB !== null ? Math.round(heapMB * 10) / 10 : null;
    resultado.framesCapturados = frames.length;

    if (frames.length < 3) {
      resultado.status = `medido-parcial: solo ${frames.length} frame(s) en ${opts.window}ms de ventana (posible congelamiento total bajo este throttle)`;
      resultado.fpsAvg = frames.length > 1
        ? Math.round((1000 * (frames.length - 1) / (frames[frames.length - 1].t - frames[0].t)) * 10) / 10
        : 0;
      await ctx.close();
      return resultado;
    }

    const deltas = [];
    for (let i = 1; i < frames.length; i++) deltas.push(frames[i].t - frames[i - 1].t);
    const instFps = deltas.map((d) => (d > 0 ? 1000 / d : 0)).sort((a, b) => a - b);
    const totalMs = frames[frames.length - 1].t - frames[0].t;
    const fpsAvg = 1000 * (frames.length - 1) / totalMs;
    const worstFrameMs = Math.max(...deltas);
    const callsPorFrame = frames.slice(1).map((f) => f.calls);
    const trisPorFrame = frames.slice(1).map((f) => f.tris);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    resultado.status = 'ok';
    resultado.fpsAvg = Math.round(fpsAvg * 10) / 10;
    resultado.fpsP5 = Math.round(percentil(instFps, 5) * 10) / 10;
    resultado.fpsP95 = Math.round(percentil(instFps, 95) * 10) / 10;
    resultado.worstFrameMs = Math.round(worstFrameMs * 10) / 10;
    resultado.drawCallsAvg = Math.round(avg(callsPorFrame));
    resultado.trianglesAvg = Math.round(avg(trisPorFrame));
    resultado.geometrias = frames[frames.length - 1].geomLive;
    resultado.texturas = frames[frames.length - 1].texLive;
  } catch (e) {
    resultado.status = 'error';
    resultado.error = String(e && e.message ? e.message : e).slice(0, 300);
  } finally {
    await ctx.close().catch(() => {});
  }
  return resultado;
}

async function main() {
  if (!existsSync(ARGS.dist) || !existsSync(join(ARGS.dist, 'index.html'))) {
    console.error(`No existe ${ARGS.dist}/index.html — corra \`npm run build\` primero.`);
    process.exit(1);
  }
  const srv = spawn('python3', ['-m', 'http.server', String(ARGS.port), '--bind', '127.0.0.1'], { cwd: ARGS.dist, stdio: 'ignore' });
  await sleep(1500);
  const base = `http://127.0.0.1:${ARGS.port}`;

  // GUARDA (2026-07-22, encontrada corriendo esto en serio): si el puerto ya
  // estaba ocupado por OTRO server (p. ej. un `http.server` huérfano de una
  // sesión vieja apuntando a un dist que ya no existe), `spawn` no falla —
  // simplemente nuestras requests le pegan al server VIEJO, que devuelve 404
  // para todo. El script medía "no-carga" en TODAS las rutas y parecía que
  // toda la app estaba rota. Se verifica que lo que responde en `base` es
  // REALMENTE nuestro `dist` antes de arrancar a medir.
  {
    const marcador = existsSync(join(ARGS.dist, 'index.html'))
      ? readFileSync(join(ARGS.dist, 'index.html'), 'utf8').slice(0, 2000)
      : '';
    let sirveLoNuestro = false;
    for (let intento = 0; intento < 5 && !sirveLoNuestro; intento++) {
      try {
        const res = await fetch(`${base}/index.html`);
        const body = await res.text();
        // Comparación laxa: mismo tamaño aprox / contiene el mismo <title> que
        // nuestro archivo local. Alcanza para detectar "server equivocado".
        sirveLoNuestro = res.ok && marcador.length > 0 && body.includes(marcador.slice(0, 200).split('\n').find((l) => l.includes('<title')) || '___nunca___');
        if (!sirveLoNuestro) {
          // fallback más simple: si devuelve 200 y tiene un <div id="root">, alcanza.
          sirveLoNuestro = res.ok && /id=["']root["']/.test(body);
        }
      } catch { /* server todavía no levanta, reintentar */ }
      if (!sirveLoNuestro) await sleep(500);
    }
    if (!sirveLoNuestro) {
      console.error(`\nEl puerto ${ARGS.port} no está sirviendo ${ARGS.dist} (¿otro proceso lo tenía ocupado?). Aborto antes de medir nada falso.`);
      console.error(`Pruebe con --port <otro> o libere el puerto (ss -tlnp | grep ${ARGS.port}).`);
      srv.kill();
      process.exit(1);
    }
  }

  let browser = await lanzarBrowser();
  async function lanzarBrowser() {
    return chromium.launch({
      headless: false,
      executablePath: '/run/current-system/sw/bin/chromium',
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0', WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || 'wayland-1' },
      // NO --use-gl=egl: en chromium 148 de stg eso cae a SwiftShader (ver
      // cabecera del archivo). Sin flag de GL, chromium elige la GPU real sola.
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-gpu-blocklist',
        '--enable-features=Vulkan', '--window-size=420,900'],
    });
  }

  const rutasVivas = rutasVivasEnAppJsx();
  if (rutasVivas) {
    const retiradas = RUTAS.filter((r) => !rutasVivas.has(r.slug));
    if (retiradas.length > 0) {
      console.log(`\nAVISO: ${retiradas.length} ruta(s) de RUTAS_3D ya no están en MOCKUP_HASH_ROUTES (mundo archivado/retirado): ${retiradas.map((r) => r.slug).join(', ')}`);
      console.log('Se marcan "ruta-no-existe" SIN abrir navegador — medirlas mediría el fallback (el valle), no la escena pedida.\n');
    }
  } else {
    console.log('\nAVISO: no se pudo leer src/App.jsx para verificar rutas vivas (¿corriendo fuera del repo?). Se mide todo igual, sin esta guarda.\n');
  }

  const resultados = [];
  const total = RUTAS.length * ARGS.rates.length;
  let i = 0;
  for (const ruta of RUTAS) {
    for (const rate of ARGS.rates) {
      i++;
      process.stdout.write(`[${i}/${total}] ${ruta.slug} @ ${rate}x ... `);
      if (rutasVivas && !rutasVivas.has(ruta.slug)) {
        const r = {
          slug: ruta.slug, nombre: ruta.nombre, familia: ruta.familia, rate,
          status: 'ruta-no-existe (retirada de MOCKUP_HASH_ROUTES — medirla mediría el fallback a valle3d, no la escena)',
          error: null, renderer: null, fpsAvg: null, fpsP5: null, fpsP95: null, worstFrameMs: null,
          drawCallsAvg: null, trianglesAvg: null, geometrias: null, texturas: null,
          tiempoPrimerFrameMs: null, jsHeapMB: null, framesCapturados: 0,
        };
        resultados.push(r);
        console.log(r.status);
        continue;
      }
      let r;
      try {
        r = await medirRuta(browser, ruta, rate, { base, settle: ARGS.settle, window: ARGS.window, hw: ARGS.hw, mem: ARGS.mem, viewport: ARGS.viewport, dpr: ARGS.dpr });
      } catch (e) {
        // El navegador se cayó (crash de la GPU, OOM, lo que sea): relanzar UNA
        // vez y reintentar esta misma medición en vez de perder TODO el resto
        // del barrido por una corrida caída.
        console.log(`[navegador caído: ${String(e.message).slice(0, 80)} — relanzando]`);
        try { await browser.close(); } catch { /* ya estaba muerto */ }
        browser = await lanzarBrowser();
        try {
          r = await medirRuta(browser, ruta, rate, { base, settle: ARGS.settle, window: ARGS.window, hw: ARGS.hw, mem: ARGS.mem, viewport: ARGS.viewport, dpr: ARGS.dpr });
        } catch (e2) {
          r = {
            slug: ruta.slug, nombre: ruta.nombre, familia: ruta.familia, rate,
            status: 'error', error: `navegador cayó dos veces: ${String(e2.message).slice(0, 200)}`,
          };
        }
      }
      resultados.push(r);
      console.log(r.status === 'ok'
        ? `fps=${r.fpsAvg} (p5=${r.fpsP5} p95=${r.fpsP95}) peor-frame=${r.worstFrameMs}ms`
        : r.status);
    }
  }

  await browser.close();
  srv.kill();

  // ── JSON completo ────────────────────────────────────────────────────
  mkdirSync(dirname(ARGS.out), { recursive: true });
  writeFileSync(ARGS.out, JSON.stringify({
    fecha: new Date().toISOString(),
    dist: ARGS.dist,
    ventanaMedicionMs: ARGS.window,
    asentamientoMs: ARGS.settle,
    rates: ARGS.rates,
    resultados,
  }, null, 2));
  console.log(`\nJSON escrito en ${ARGS.out}`);

  // ── Tabla en stdout ──────────────────────────────────────────────────
  const col = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
  console.log('\n' + col('mundo', 46) + col('rate', 6) + col('fps avg', 9) + col('p5', 7) + col('p95', 7) + col('peor(ms)', 10) + col('calls', 7) + col('tris', 9) + col('1er-frame', 10) + 'estado');
  for (const r of resultados) {
    console.log(
      col(r.slug, 46) + col(`${r.rate}x`, 6) + col(r.fpsAvg ?? '-', 9) + col(r.fpsP5 ?? '-', 7) + col(r.fpsP95 ?? '-', 7)
      + col(r.worstFrameMs ?? '-', 10) + col(r.drawCallsAvg ?? '-', 7) + col(r.trianglesAvg ?? '-', 9) + col(r.tiempoPrimerFrameMs ?? '-', 10)
      + (r.status === 'ok' ? 'ok' : r.status),
    );
  }

  // ── Gate: exit code no-cero si algo se midió con renderer de software o
  // si un mundo no cargó ningún canvas. El umbral de fps para bloquear un
  // merge se documenta en ops/informes/ y se aplica en CI aparte (este
  // script solo mide; no impone el umbral para no acoplar medición+política).
  const rotos = resultados.filter((r) => r.status && (r.status.startsWith('ABORTADO') || r.status.startsWith('no-carga')));
  if (rotos.length > 0) {
    console.error(`\n${rotos.length} medición(es) inválida(s) o mundo(s) que no cargaron. Ver JSON.`);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

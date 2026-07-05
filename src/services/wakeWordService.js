/**
 * wakeWordService.js — motor del wake-word "hola chagra" (MODO CAMPO, #2088).
 *
 * Motor: TF.js speech-commands (Apache-2.0, on-device, offline). Transfer
 * learning sobre el modelo base BROWSER_FFT ("18w"). Diseño de referencia:
 * spikes/wake-word/modo-campo-design.js + spikes/wake-word/index.html
 * (prototipo que de-riskeó el motor — ver spikes/wake-word/headless-result.json).
 *
 * CONTRATO DE ACTIVACIÓN: al detectar "hola chagra", el caller (useModoCampo)
 * llama `activarEscucha({ fuente: 'wakeword' })` (escuchaService.js) — el
 * mismo trigger que hoy usa el tap del FAB. Este servicio NO conoce el
 * widget de escucha; solo produce el evento onWake().
 *
 * SELF-HOSTED (offline-first, NUNCA CDN en prod):
 *   - /vendor/tfjs/tf-core.min.js, tf-layers.min.js, tf-data.min.js,
 *     tf-backend-wasm.min.js + tfjs-backend-wasm*.wasm (copias de
 *     @tensorflow/tfjs-core|layers|data|backend-wasm/dist — NO el paquete
 *     completo `@tensorflow/tfjs`, ver por qué más abajo)
 *   - /vendor/tfjs/chained-ops-shim.js (escrito a mano, NO vendor de terceros
 *     — registra la API encadenada de tensores que tf-core.min.js omite)
 *   - /vendor/speech-commands/speech-commands.min.js (copia de @tensorflow-models/speech-commands/dist)
 *   - /models/speech-commands/{model.json,metadata.json,group1-shard*}  (modelo base BROWSER_FFT "18w")
 *   - /models/hola-chagra/{examples.bin,metadata.json}  (ejemplos de entrenamiento
 *     "hola chagra" recolectados centralmente con voz SINTÉTICA Kokoro TTS —
 *     ver scripts/wake-word/generate-samples.mjs + train-model.mjs)
 * Todo cacheado por el Service Worker cache-on-use (ver public/sw.js,
 * WAKE_WORD_CACHE/WAKE_WORD_PATH_PREFIXES) — no precache incondicional (la
 * feature es "dark"; no cobrarle ~9 MB a quien nunca activa modo campo).
 *
 * POR QUÉ core+layers+data+backend-wasm y NO `@tensorflow/tfjs` completo:
 * el paquete completo trae los backends cpu/webgl, que hacen `eval()` al
 * registrar sus kernels — VIOLA la CSP real de Chagra (script-src sin
 * 'unsafe-eval', solo 'wasm-unsafe-eval' — ver index.html, Task 112 /
 * incidente #1631). De-riskeado en vivo contra esa CSP exacta
 * (scripts/wake-word/train-model.mjs): tfjs-core solo NO hace eval; el
 * backend wasm (que solo necesita 'wasm-unsafe-eval', ya permitido)
 * resuelve todo sin tocar la CSP. Backend forzado a 'wasm' aquí abajo.
 *
 * POR QUÉ SE SHIPPEA "examples.bin" Y NO EL MODELO YA ENTRENADO:
 * `TransferSpeechCommandRecognizer.model` incluye TODAS las capas del modelo
 * base (congeladas) + la cabeza nueva — exportarlo duplicaría los ~5.9 MB del
 * modelo base dentro del propio archivo transfer. En cambio, shippeamos solo
 * los EJEMPLOS de entrenamiento serializados (`transfer.serializeExamples()`,
 * unos cientos de KB) y el navegador hace `loadExamples()` + `train()` UNA
 * SOLA VEZ (~20-30s, "preparando el oído de Chagra por primera vez"),
 * persistiendo el resultado en IndexedDB (`transfer.save()`) para que las
 * siguientes activaciones sean instantáneas. Es el mismo mecanismo de
 * transfer learning que usa el enrollment ("Enséñale tu voz",
 * wakeWordEnrollment.js) — código y contrato compartidos.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import { MSG } from '../config/messages';

export const WAKE_WORD = 'hola chagra';
export const OTHER_LABEL = 'otro';
export const NOISE_LABEL = '_background_noise_';
export const WAKE_THRESHOLD = 0.9; // conservador: preferimos perder un disparo a un falso +
export const WAKE_COOLDOWN_MS = 1500; // anti doble-disparo
export const LISTEN_OVERLAP = 0.5; // ~una decisión cada 0.5s (medido en el spike: ~560ms/frame)

// SELF-HOSTED como core+layers+data+backend-wasm (NO el paquete completo
// `@tensorflow/tfjs`, que trae cpu+webgl): esos backends hacen `eval()` al
// registrar sus kernels, lo que VIOLA la CSP real de Chagra (script-src sin
// 'unsafe-eval', solo 'wasm-unsafe-eval' — ver index.html, Task 112 /
// incidente #1631). De-riskeado en vivo: tf-core.min.js solo no hace eval;
// agregando el backend WASM (que solo necesita 'wasm-unsafe-eval', YA
// permitido) todo funciona sin tocar la CSP. Cada script hace merge sobre
// el MISMO global `window.tf` (UMD pattern: `(t=...).tf = t.tf || {}`) —
// el orden de carga importa (core primero). Ver scripts/wake-word/vendor-libs.mjs.
const VENDOR_TFJS_CORE_URL = '/vendor/tfjs/tf-core.min.js';
const VENDOR_TFJS_LAYERS_URL = '/vendor/tfjs/tf-layers.min.js';
const VENDOR_TFJS_DATA_URL = '/vendor/tfjs/tf-data.min.js';
const VENDOR_TFJS_BACKEND_WASM_URL = '/vendor/tfjs/tf-backend-wasm.min.js';
// tf-core.min.js (el build oficial unpkg/jsdelivr) NO registra la API
// encadenada de tensores (tensor.argMax(), etc.) por defecto — speech-commands
// SÍ la usa (y.argMax(-1) en su loop de reconocimiento). Shim propio (NO es
// vendor de terceros, ver el archivo) — de-riskeado en vivo, sin esto
// transfer.listen() truena con "argMax is not a function".
const VENDOR_TFJS_CHAINED_OPS_SHIM_URL = '/vendor/tfjs/chained-ops-shim.js';
// Carpeta donde viven los .wasm (setWasmPaths busca por nombre exacto ahí:
// tfjs-backend-wasm.wasm / -simd.wasm / -threaded-simd.wasm).
const VENDOR_TFJS_WASM_DIR = '/vendor/tfjs/';
const VENDOR_SPEECH_COMMANDS_URL = '/vendor/speech-commands/speech-commands.min.js';
// Exportados también para wakeWordEnrollment.js (misma base self-hosted).
export const BASE_MODEL_URL = '/models/speech-commands/model.json';
export const BASE_METADATA_URL = '/models/speech-commands/metadata.json';
const PRETRAINED_EXAMPLES_URL = '/models/hola-chagra/examples.bin';
const PRETRAINED_METADATA_URL = '/models/hola-chagra/metadata.json';

/** Nombre del modelo "listo de fábrica" (entrenado localmente UNA vez a
 * partir de examples.bin, cacheado en IndexedDB después). */
export const READY_TRANSFER_NAME = 'hola-chagra-ready';
/** Nombre del modelo PERSONAL ("Enséñale tu voz"). Prioridad sobre el de
 * fábrica cuando existe — ver wakeWordEnrollment.js. */
export const PERSONAL_TRANSFER_NAME = 'hola-chagra-personal';

let libsPromise = null;

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(MSG.format(MSG.modoCampo.errorCargaLibs, { src })));
    document.head.appendChild(el);
  });
}

/**
 * Carga TF.js (core+layers+data+backend-wasm) + speech-commands SELF-HOSTED
 * (lazy: solo se paga este costo si el modo campo está activo) y fuerza el
 * backend 'wasm' (el único CSP-compatible — ver comentario de las URLs
 * arriba). Idempotente — llamadas repetidas reusan la misma promesa/los
 * mismos scripts ya inyectados.
 */
export function loadSelfHostedLibs() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('wakeWordService requiere navegador'));
  }
  if (window.tf?.getBackend?.() === 'wasm' && window.speechCommands) return Promise.resolve();
  if (libsPromise) return libsPromise;
  libsPromise = (async () => {
    // ORDEN IMPORTA: cada script hace merge sobre el mismo `window.tf`
    // (core primero, después layers/data que agregan .layers/.sequential/.data).
    await injectScript(VENDOR_TFJS_CORE_URL);
    await injectScript(VENDOR_TFJS_LAYERS_URL);
    await injectScript(VENDOR_TFJS_DATA_URL);
    await injectScript(VENDOR_TFJS_BACKEND_WASM_URL);
    await injectScript(VENDOR_TFJS_CHAINED_OPS_SHIM_URL);
    await injectScript(VENDOR_SPEECH_COMMANDS_URL);
    if (!window.tf || !window.speechCommands) {
      throw new Error('TF.js / speech-commands no quedaron disponibles tras cargar los scripts');
    }
    window.tf.wasm.setWasmPaths(VENDOR_TFJS_WASM_DIR);
    await window.tf.setBackend('wasm');
  })();
  return libsPromise;
}

async function fetchArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
  return res.arrayBuffer();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
  return res.json();
}

const PERSONAL_VOICE_MARKER_KEY = 'chagra:modoCampo:personalVoice';

/**
 * Marcador LIVIANO (localStorage, sin TF.js) de "ya hay modelo personal
 * guardado". Lo usa la UI (ModoCampoPanel) para decidir qué texto mostrar
 * SIN pagar el costo de cargar TF.js + speech-commands solo para pintar un
 * botón — el import perezoso de esas libs (~380 KB gzip) debe pagarse
 * únicamente cuando el modo campo REALMENTE se activa o se entra a
 * enrollment, nunca solo por visitar Perfil. La fuente de verdad real sigue
 * siendo IndexedDB (`hasPersonalVoice()`); este marcador puede, en teoría,
 * desincronizarse (ej. el usuario borra IndexedDB del navegador a mano) —
 * el peor caso es mostrar "Volver a enseñarle tu voz" cuando ya no hay
 * modelo, que simplemente re-crea uno nuevo sin romper nada.
 */
export function hasPersonalVoiceMarker() {
  try { return localStorage.getItem(PERSONAL_VOICE_MARKER_KEY) === '1'; } catch (_) { return false; }
}

function setPersonalVoiceMarker(value) {
  try {
    if (value) localStorage.setItem(PERSONAL_VOICE_MARKER_KEY, '1');
    else localStorage.removeItem(PERSONAL_VOICE_MARKER_KEY);
  } catch (_) { /* localStorage no disponible: degradar sin romper */ }
}

/** Llamarlo tras un `transfer.save()` exitoso en wakeWordEnrollment.js. */
export function markPersonalVoiceSaved() {
  setPersonalVoiceMarker(true);
}

/**
 * ¿Ya existe un modelo personal ("Enséñale tu voz") guardado en este
 * dispositivo? Consulta IndexedDB vía la API pública de speech-commands
 * (fuente de verdad real, pero carga TF.js — usar hasPersonalVoiceMarker()
 * para chequeos de UI baratos).
 */
export async function hasPersonalVoice() {
  await loadSelfHostedLibs();
  const saved = await window.speechCommands.listSavedTransferModels();
  return saved.includes(PERSONAL_TRANSFER_NAME);
}

/** Borra el modelo personal ("olvidar mi voz" — vuelve al modelo de fábrica). */
export async function forgetPersonalVoice() {
  await loadSelfHostedLibs();
  const saved = await window.speechCommands.listSavedTransferModels();
  if (saved.includes(PERSONAL_TRANSFER_NAME)) {
    await window.speechCommands.deleteSavedTransferModel(PERSONAL_TRANSFER_NAME);
  }
  setPersonalVoiceMarker(false);
}

/**
 * Prepara el reconocedor "hola chagra" listo para `listen()`. Prioriza,
 * en orden: (1) modelo PERSONAL (enrollment) si existe, (2) modelo de
 * fábrica ya cacheado en IndexedDB de una activación previa, (3) primera
 * vez — carga examples.bin y entrena localmente (~20-30s, dispara
 * onProgress('training') para que la UI muestre "preparando…").
 *
 * @param {{ onProgress?: (phase: 'loading-libs'|'loading-base'|'loading-personal'|'loading-ready'|'training'|'ready') => void }} [opts]
 * @returns {Promise<{ transfer: object, wordLabels: string[], wakeIndex: number, source: 'personal'|'ready-cached'|'ready-fresh' }>}
 */
export async function prepareRecognizer({ onProgress } = {}) {
  onProgress?.('loading-libs');
  await loadSelfHostedLibs();
  const { tf, speechCommands } = window;

  await tf.ready();
  onProgress?.('loading-base');
  // speech-commands exige URL ABSOLUTA (http/https) para metadataURL — una
  // ruta relativa lanza "Unsupported URL scheme" (de-riskeado en
  // scripts/wake-word/train-model.mjs). `location.origin` funciona igual
  // en dev, preview y prod (mismo origin que sirve /vendor y /models).
  const origin = window.location.origin;
  const base = speechCommands.create('BROWSER_FFT', undefined, origin + BASE_MODEL_URL, origin + BASE_METADATA_URL);
  await base.ensureModelLoaded();

  const saved = await speechCommands.listSavedTransferModels();
  let transfer;
  /** @type {'personal'|'ready-cached'|'ready-fresh'} */
  let source;

  if (saved.includes(PERSONAL_TRANSFER_NAME)) {
    onProgress?.('loading-personal');
    transfer = base.createTransfer(PERSONAL_TRANSFER_NAME);
    await transfer.load(); // default: indexeddb:// + metadata en localStorage
    source = 'personal';
  } else if (saved.includes(READY_TRANSFER_NAME)) {
    onProgress?.('loading-ready');
    transfer = base.createTransfer(READY_TRANSFER_NAME);
    await transfer.load();
    source = 'ready-cached';
  } else {
    onProgress?.('training');
    transfer = base.createTransfer(READY_TRANSFER_NAME);
    const [examplesBuf, metadata] = await Promise.all([
      fetchArrayBuffer(PRETRAINED_EXAMPLES_URL),
      fetchJson(PRETRAINED_METADATA_URL).catch(() => null),
    ]);
    transfer.loadExamples(examplesBuf);
    await transfer.train({ epochs: metadata?.epochs || 40 });
    // Persiste para que la próxima activación sea instantánea (sin red).
    await transfer.save().catch(() => { /* IndexedDB llena/no disponible: degradar a re-entrenar cada vez */ });
    source = 'ready-fresh';
  }

  const wordLabels = transfer.wordLabels();
  const wakeIndex = wordLabels.indexOf(WAKE_WORD);
  if (wakeIndex < 0) {
    throw new Error(`"${WAKE_WORD}" no está en las palabras del modelo cargado: ${JSON.stringify(wordLabels)}`);
  }

  onProgress?.('ready');
  return { transfer, wordLabels, wakeIndex, source };
}

/**
 * Arranca la escucha en streaming. Llama onWake() cuando el score de
 * WAKE_WORD supera WAKE_THRESHOLD, con cooldown anti-doble-disparo.
 *
 * @param {{ transfer: any, wakeIndex: number, onWake: () => void, onScore?: (n: number) => void }} opts
 * @returns {() => Promise<void>} función para detener la escucha.
 */
export function startListening({ transfer, wakeIndex, onWake, onScore }) {
  let cooldownUntil = 0;
  transfer.listen(
    (result) => {
      const score = result.scores[wakeIndex] ?? 0;
      onScore?.(score);
      if (score >= WAKE_THRESHOLD) {
        const now = performance.now();
        if (now < cooldownUntil) return;
        cooldownUntil = now + WAKE_COOLDOWN_MS;
        onWake();
      }
    },
    {
      probabilityThreshold: 0,
      overlapFactor: LISTEN_OVERLAP,
      includeSpectrogram: false,
      invokeCallbackOnNoiseAndUnknown: true,
      suppressionTimeMillis: 0,
    },
  );
  return () => transfer.stopListening().catch(() => {});
}

/**
 * Entrypoint de conveniencia: prepara el reconocedor Y arranca la escucha.
 * Es lo que usa useModoCampo (hook de React) y lo que ejercita el test E2E
 * (mic falso) de punta a punta.
 *
 * @param {{ onWake:()=>void, onError?:(e:Error)=>void, onProgress?:(phase:'loading-libs'|'loading-base'|'loading-personal'|'loading-ready'|'training'|'ready')=>void, onScore?:(n:number)=>void }} opts
 * @returns {Promise<{ stop:()=>Promise<void>, source:'personal'|'ready-cached'|'ready-fresh', wordLabels:string[] }>}
 */
export async function createWakeWordDetector({ onWake, onError, onProgress, onScore }) {
  try {
    const { transfer, wordLabels, wakeIndex, source } = await prepareRecognizer({ onProgress });
    const stopListening = startListening({ transfer, wakeIndex, onWake, onScore });
    return {
      stop: async () => {
        await stopListening();
      },
      source,
      wordLabels,
    };
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
    throw e;
  }
}

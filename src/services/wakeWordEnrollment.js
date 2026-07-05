/**
 * wakeWordEnrollment.js — "Enséñale tu voz" (MODO CAMPO, #2088).
 *
 * Fallback cuando el modelo de fábrica (entrenado con voz SINTÉTICA Kokoro
 * TTS, ver wakeWordService.js) no caza bien el acento/tono real de la
 * campesina: un flujo corto (~5 "hola chagra" + un par de otras palabras +
 * un momento de silencio, ~20-30s reales) graba con el MICRÓFONO REAL,
 * entrena una cabeza transfer PERSONAL sobre el mismo modelo base, y la
 * persiste en IndexedDB — sin salir del navegador, sin subir audio a
 * ningún servidor.
 *
 * Reusa el mismo modelo base self-hosted que wakeWordService.js
 * (BASE_MODEL_URL/BASE_METADATA_URL) para no duplicar esa carga en el
 * bundle. El nombre del modelo personal (PERSONAL_TRANSFER_NAME) tiene
 * PRIORIDAD sobre el de fábrica en `prepareRecognizer()` — ver ese archivo.
 *
 * Guardado: `transfer.save()` SIN argumentos usa el path por defecto de la
 * librería (`indexeddb://tfjs-speech-commands-model/hola-chagra-personal`
 * + metadata de palabras en localStorage) — es la ÚNICA API pública que
 * necesitamos; no hay IOHandler custom aquí.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import {
  loadSelfHostedLibs,
  BASE_MODEL_URL,
  BASE_METADATA_URL,
  WAKE_WORD,
  OTHER_LABEL,
  NOISE_LABEL,
  PERSONAL_TRANSFER_NAME,
  markPersonalVoiceSaved,
} from './wakeWordService';

export { WAKE_WORD, OTHER_LABEL, NOISE_LABEL };

/** Guion del enrollment: 5 positivas + 2 "otra palabra" + 1 silencio. */
export const ENROLLMENT_STEPS = Object.freeze([
  { key: 'pos-0', label: WAKE_WORD, prompt: 'Diga «hola chagra»', kind: 'positivo' },
  { key: 'pos-1', label: WAKE_WORD, prompt: 'Otra vez: «hola chagra»', kind: 'positivo' },
  { key: 'pos-2', label: WAKE_WORD, prompt: 'Otra vez: «hola chagra»', kind: 'positivo' },
  { key: 'pos-3', label: WAKE_WORD, prompt: 'Una más: «hola chagra»', kind: 'positivo' },
  { key: 'pos-4', label: WAKE_WORD, prompt: 'Última: «hola chagra»', kind: 'positivo' },
  { key: 'otro-0', label: OTHER_LABEL, prompt: 'Ahora diga cualquier OTRA palabra o frase', kind: 'otro' },
  { key: 'otro-1', label: OTHER_LABEL, prompt: 'Una palabra distinta a la anterior', kind: 'otro' },
  { key: 'noise-0', label: NOISE_LABEL, prompt: 'Quédese callado un momento', kind: 'silencio' },
]);

const MIN_TRAIN_EPOCHS = 30;

/**
 * Prepara una sesión de enrollment: carga TF.js + el modelo base self-hosted
 * y crea un transfer recognizer NUEVO llamado PERSONAL_TRANSFER_NAME (pisa
 * cualquier intento anterior sin terminar — `createTransfer` con el mismo
 * nombre empieza limpio en memoria; solo se persiste con `.save()` al final).
 *
 * @param {{ onProgress?: (phase: 'loading-libs'|'loading-base'|'ready') => void }} [opts]
 */
export async function createEnrollmentSession({ onProgress } = {}) {
  onProgress?.('loading-libs');
  await loadSelfHostedLibs();
  const { tf, speechCommands } = window;
  await tf.ready();

  onProgress?.('loading-base');
  const origin = window.location.origin;
  const base = speechCommands.create('BROWSER_FFT', undefined, origin + BASE_MODEL_URL, origin + BASE_METADATA_URL);
  await base.ensureModelLoaded();
  const transfer = base.createTransfer(PERSONAL_TRANSFER_NAME);
  onProgress?.('ready');

  return {
    /**
     * Graba UNA muestra con el micrófono real (~1-1.5s, según duración del
     * modelo base). Rechaza si el usuario negó el permiso de micrófono.
     */
    async collect(label) {
      return transfer.collectExample(label);
    },

    /** Conteo actual por clase — útil para deshabilitar "Entrenar" hasta tener suficiente. */
    counts() {
      try { return transfer.countExamples(); } catch (_) { return {}; }
    },

    /**
     * Entrena la cabeza personal con lo recolectado y la persiste en
     * IndexedDB (`transfer.save()` — API pública, path por defecto de la
     * librería). Deja el modelo LISTO para que wakeWordService.prepareRecognizer()
     * lo recoja en la siguiente activación del modo campo (prioridad sobre
     * el de fábrica).
     */
    async trainAndSave(epochs = MIN_TRAIN_EPOCHS) {
      const counts = transfer.countExamples();
      const labels = Object.keys(counts).filter((k) => counts[k] > 0);
      if (labels.length < 2) {
        throw new Error('Faltan muestras: se necesita al menos "hola chagra" y una clase negativa.');
      }
      await transfer.train({ epochs });
      await transfer.save();
      markPersonalVoiceSaved();
      return { wordLabels: transfer.wordLabels(), counts };
    },

    /** Descarta lo recolectado sin guardar (el usuario canceló a mitad de camino). */
    cancel() {
      try { transfer.clearExamples(); } catch (_) { /* nada que limpiar */ }
    },
  };
}

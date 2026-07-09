import { create } from 'zustand';
import useLoteStore from './useLoteStore';
import { MSG } from '../config/messages.js';
import {
  capturarObservacion,
  construirResumenRecorrido,
  leerResumenRecorrido,
} from '../services/recorridoService';

/**
 * useRecorridoStore — estado de la SESIÓN de "Recorrido de finca por voz".
 *
 * Acumula las observaciones que el campesino narra mientras camina la finca con
 * el modo campo prendido, SIN apagar la escucha. Cada observación entra por voz
 * → captura GPS → resuelve lote (recorridoService) → se apila acá.
 *
 * Composición con modo campo: este store NO maneja la escucha ni el wake-word
 * (eso vive en useModoCampo / escuchaService cuando aterrice). El hook de voz
 * (useRecorridoVoz) es el pegamento: enruta cada transcripción del modo campo a
 * `registrarObservacion` / `leerResumen`. Así empezar/terminar el recorrido es
 * ortogonal a prender/apagar la escucha — se puede recorrer con la escucha ya
 * activa.
 *
 * Fuente de verdad de los lotes: useLoteStore.lotes (espejo de useAssetStore.
 * lands). Este store solo lee esos lotes al momento de resolver la coordenada;
 * no persiste nada a farmOS (las observaciones del recorrido son estado de
 * sesión efímero; su persistencia definitiva la decide la capa de arriba).
 *
 * // TODO fable: canvas del croquis / vista del recorrido — consumir
 * //   `observaciones`, `ultimaObservacion` y `resumen()` para pintar los pines
 * //   sobre el mapa y la lista lateral. Este store es la única fuente reactiva.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
const useRecorridoStore = create((set, get) => ({
  // ── Estado de sesión ───────────────────────────────────────────────────────
  /** ¿Hay un recorrido en curso? */
  activo: false,
  /** epoch ms de inicio, o null. */
  startedAt: null,
  /** epoch ms de fin, o null. */
  endedAt: null,
  /** @type {Array<import('../services/recorridoService').ObservacionRecorrido>} */
  observaciones: [],
  /** última observación registrada (para toasts / centrar el mapa). */
  ultimaObservacion: null,
  /** true mientras se captura GPS + resuelve lote de una observación. */
  registrando: false,
  error: null,

  // ── Ciclo de vida del recorrido ─────────────────────────────────────────────

  /** Empieza un recorrido nuevo (limpia el anterior). */
  iniciarRecorrido: () => {
    set({
      activo: true,
      startedAt: Date.now(),
      endedAt: null,
      observaciones: [],
      ultimaObservacion: null,
      registrando: false,
      error: null,
    });
  },

  /**
   * Termina el recorrido. NO limpia las observaciones (la vista todavía las
   * muestra / las persiste). Devuelve el resumen para el readback.
   * @returns {{ total:number, startedAt:number|null, endedAt:number|null, lotes:string[], observaciones:Array<Object>, texto:string }}
   */
  terminarRecorrido: () => {
    set({ activo: false, endedAt: Date.now() });
    return get().resumen();
  },

  // ── Registro de observaciones ───────────────────────────────────────────────

  /**
   * Registra una observación narrada: captura GPS, resuelve lote y la apila.
   * Solo opera con un recorrido activo (evita capturar GPS por transcripciones
   * sueltas fuera del recorrido).
   *
   * @param {string} texto - transcripción cruda.
   * @param {string} [tipo='observacion']
   * @param {{ lotes?: Array<Object>, getPosition?: Function, now?: number, especie?: Object|null }} [opts]
   *   — `lotes`/`getPosition` inyectables para tests; en runtime toma los lotes
   *   del store y el GPS real. `especie` adjunta un reconocimiento de cámara.
   * @returns {Promise<import('../services/recorridoService').ObservacionRecorrido|null>}
   */
  registrarObservacion: async (texto, tipo = 'observacion', opts = {}) => {
    if (!get().activo) return null;
    const clean = (texto || '').toString().trim();
    if (!clean) return null;

    set({ registrando: true, error: null });
    try {
      const lotes = opts.lotes || useLoteStore.getState().lotes || [];
      const obs = await capturarObservacion({
        texto: clean,
        tipo,
        lotes,
        getPosition: opts.getPosition,
        now: opts.now,
        especie: opts.especie || null,
      });
      set((s) => ({
        observaciones: [...s.observaciones, obs],
        ultimaObservacion: obs,
        registrando: false,
      }));
      return obs;
    } catch (err) {
      set({ registrando: false, error: err?.message || MSG.recorrido.errorRegistro });
      return null;
    }
  },

  /**
   * Apila una observación YA construida (p. ej. tras reconocer una especie con
   * la cámara, donde el hook ya capturó GPS + especie). Síncrono.
   *
   * @param {import('../services/recorridoService').ObservacionRecorrido} obs
   * @returns {import('../services/recorridoService').ObservacionRecorrido|null}
   */
  agregarObservacionListo: (obs) => {
    if (!obs || !obs.id) return null;
    set((s) => ({
      observaciones: [...s.observaciones, obs],
      ultimaObservacion: obs,
    }));
    return obs;
  },

  // ── Resumen / readback ──────────────────────────────────────────────────────

  /**
   * Resumen estructurado del recorrido (para la UI y el readback).
   * @returns {{ total:number, startedAt:number|null, endedAt:number|null, lotes:string[], observaciones:Array<Object>, texto:string }}
   */
  resumen: () => {
    const { observaciones, startedAt, endedAt } = get();
    const lotes = Array.from(
      new Set(observaciones.map((o) => o.loteNombre).filter(Boolean)),
    );
    return {
      total: observaciones.length,
      startedAt,
      endedAt,
      lotes,
      observaciones,
      texto: construirResumenRecorrido(observaciones),
    };
  },

  /**
   * Arma y LEE en voz alta el resumen del recorrido (TTS kokoro). Devuelve el
   * texto emitido. `opts.speak` inyectable para tests.
   * @param {{ maxPorLote?: number, speak?: (t:string)=>Promise<any> }} [opts]
   * @returns {Promise<string>}
   */
  leerResumen: async (opts = {}) => leerResumenRecorrido(get().observaciones, opts),

  /** Resetea todo el estado de sesión. */
  reset: () => set({
    activo: false,
    startedAt: null,
    endedAt: null,
    observaciones: [],
    ultimaObservacion: null,
    registrando: false,
    error: null,
  }),
}));

export default useRecorridoStore;

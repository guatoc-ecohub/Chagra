/**
 * useRecorridoVoz — PEGAMENTO del "Recorrido de finca por voz".
 *
 * Compone las tripas (recorridoService + useRecorridoStore) en una API que el
 * modo campo / la escucha empujan y que Fable consume. NO maneja la escucha ni
 * el wake-word: recibe transcripciones ya listas y las enruta.
 *
 * ── Flujo por transcripción (procesarTranscripcion) ─────────────────────────
 *   1. Intención cámara ("mira esta mata") → expone `pendingCamera` (señal para
 *      que la UI abra la cámara) y llama onCameraRequested. NO registra todavía.
 *   2. Intención resumen ("¿cómo quedó el recorrido?") → arma y LEE el resumen
 *      (TTS kokoro) y llama onResumen con el texto.
 *   3. Cualquier otra cosa → registra la observación (GPS + lote) en el store.
 *
 * ── Cierre del loop de cámara (capturarEspecie) ─────────────────────────────
 * Cuando la UI ya tomó la foto, llama `capturarEspecie(blob)`: corre
 * `recognizeSpeciesGrounded` (que ya existe), captura GPS + lote y apila una
 * observación tipo 'planta_foto' con la especie reconocida. Devuelve el
 * resultado para que la UI muestre el diagnóstico.
 *
 * `recognizer` y (en el store) `getPosition` son inyectables para tests.
 *
 * // TODO fable: la UI del recorrido debe:
 * //   - llamar `procesarTranscripcion(texto)` por cada transcripción del modo
 * //     campo (escuchaService / useModoCampo) sin apagar la escucha;
 * //   - cuando `pendingCamera` != null, abrir la cámara y al capturar la foto
 * //     llamar `capturarEspecie(blob)`, luego `limpiarCamara()`;
 * //   - pintar el estado de useRecorridoStore (observaciones / croquis).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module useRecorridoVoz
 */
import { useCallback, useState } from 'react';
import useRecorridoStore from '../store/useRecorridoStore';
import {
  detectarIntencionCamara,
  detectarIntencionResumen,
} from '../services/recorridoService';
import { recognizeSpeciesGrounded } from '../services/aiService';

/**
 * @typedef {Object} SeñalCamara
 * @property {'planta'} sujeto
 * @property {string} frase       transcripción que disparó la cámara.
 * @property {number} requestedAt epoch ms.
 */

/**
 * @param {Object} [options]
 * @param {(deteccion:{sujeto:'planta'|null, frase:string})=>void} [options.onCameraRequested]
 * @param {(texto:string)=>void} [options.onResumen]
 * @param {(obs:Object|null)=>void} [options.onObservacion]
 * @param {(blob:Blob, opts?:Object)=>Promise<Object|null>} [options.recognizer]
 *   — default: recognizeSpeciesGrounded.
 * @param {{ maxPorLote?: number, speak?: Function }} [options.resumenOpts]
 * @param {{ lotes?: Array<Object>, getPosition?: Function, now?: number }} [options.registroOpts]
 */
export function useRecorridoVoz(options = {}) {
  const {
    onCameraRequested,
    onResumen,
    onObservacion,
    recognizer = recognizeSpeciesGrounded,
    resumenOpts,
    registroOpts,
  } = options;

  /** @type {[SeñalCamara|null, Function]} */
  const [pendingCamera, setPendingCamera] = useState(null);

  const registrarObservacion = useRecorridoStore((s) => s.registrarObservacion);
  const leerResumen = useRecorridoStore((s) => s.leerResumen);

  /**
   * Enruta una transcripción del modo campo. No throwea: cualquier fallo se
   * refleja en el `accion` retornado.
   *
   * @param {string} texto
   * @returns {Promise<{accion:'ignorado'|'camara'|'resumen'|'observacion', [k:string]:any}>}
   */
  const procesarTranscripcion = useCallback(async (texto) => {
    const clean = (texto || '').toString().trim();
    if (!clean) return { accion: 'ignorado' };

    // 1. Cámara ("mira esta mata").
    const cam = detectarIntencionCamara(clean);
    if (cam.match) {
      const señal = { sujeto: 'planta', frase: cam.frase, requestedAt: Date.now() };
      setPendingCamera(señal);
      if (typeof onCameraRequested === 'function') onCameraRequested(cam);
      return { accion: 'camara', deteccion: cam };
    }

    // 2. Resumen ("¿cómo quedó el recorrido?").
    const res = detectarIntencionResumen(clean);
    if (res.match) {
      const dicho = await leerResumen(resumenOpts);
      if (typeof onResumen === 'function') onResumen(dicho);
      return { accion: 'resumen', texto: dicho };
    }

    // 3. Observación normal.
    const obs = await registrarObservacion(clean, 'observacion', registroOpts);
    if (typeof onObservacion === 'function') onObservacion(obs);
    return { accion: 'observacion', observacion: obs };
  }, [registrarObservacion, leerResumen, onCameraRequested, onResumen, onObservacion, resumenOpts, registroOpts]);

  /**
   * Cierra el loop de cámara: reconoce la especie de la foto (grounded),
   * captura GPS + lote y apila una observación 'planta_foto'. Devuelve el
   * reconocimiento (o null) para que la UI pinte el diagnóstico.
   *
   * @param {Blob} imageBlob
   * @param {Object} [recognizeOpts] - pasado al recognizer (onToken, signal).
   * @returns {Promise<{ especie: Object|null, observacion: Object|null }>}
   */
  const capturarEspecie = useCallback(async (imageBlob, recognizeOpts = {}) => {
    let especie = null;
    try {
      especie = await recognizer(imageBlob, recognizeOpts);
    } catch (_) {
      especie = null;
    }
    const etiqueta = especie
      ? (especie.common_name || especie.scientific_name || 'planta reconocida')
      : 'planta sin identificar';
    const frase = pendingCamera?.frase || '';
    const texto = frase ? `${frase} — ${etiqueta}` : `Foto de ${etiqueta}`;

    // Un solo registro: captura GPS + lote y adjunta la especie reconocida.
    const obs = await registrarObservacion(texto, 'planta_foto', {
      ...registroOpts,
      especie,
    });
    setPendingCamera(null);
    return { especie, observacion: obs };
  }, [recognizer, registrarObservacion, pendingCamera, registroOpts]);

  /** Descarta la señal de cámara (usuario canceló la foto). */
  const limpiarCamara = useCallback(() => setPendingCamera(null), []);

  return {
    /** @type {SeñalCamara|null} */
    pendingCamera,
    procesarTranscripcion,
    capturarEspecie,
    limpiarCamara,
  };
}

export default useRecorridoVoz;

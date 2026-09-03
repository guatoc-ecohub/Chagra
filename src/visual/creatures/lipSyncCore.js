/*
 * lipSyncCore — LÓGICA PURA del lip-sync 2D por amplitud RMS (sin visemas del TTS).
 *
 * Kokoro/Web-Speech no exponen visemas fonéticos; los DERIVAMOS de la ENERGÍA
 * del audio (RMS) en tiempo real. Cuatro formas de boca (ficha DR Gemini,
 * ficha DR animación rubber-hose §2). Este módulo NO toca el DOM ni el
 * AudioContext: solo transforma números → visema, con un debounce anti
 * "jaw-chomping". El HOOK (`useLipSync.js`) lo alimenta con el RMS real; los
 * TESTS lo prueban sin navegador.
 *
 * Species-agnostic: cualquier bicho consume el mismo `data-visema`; su boca
 * dibuja las 4 formas a su manera (fable pone el arte por-bicho).
 */

/* Los 4 visemas (claves estables que viajan como `data-visema` al SVG). */
export const VISEMA = Object.freeze({
  CERRADA: 'V1',     // silencio / M,B,P
  ENTREABIERTA: 'V2', // S,Z,T,D,F,V
  ABIERTA: 'V3',     // A,E — apertura amplia (picos)
  FRUNCIDA: 'V4',    // O,U,W — labios fruncidos
});

/* Umbrales de RMS del spec (fracción 0..1): 5% / 30% / 70%.
   <5% cerrada · 5–30% entreabierta · 31–70% fruncida · >70% abierta. */
export const UMBRAL_RMS = Object.freeze({
  ENTREABIERTA: 0.05,
  FRUNCIDA: 0.30,
  ABIERTA: 0.70,
});

/* Debounce por defecto (ms): un visema debe sostenerse ~50ms antes de cambiar,
   si no la mandíbula "castañetea" a cada frame (jaw-chomping). */
export const DEBOUNCE_MS = 50;

/**
 * RMS → visema, según los umbrales del spec. Función pura, sin estado.
 *
 * NOTA de orden (del spec): por MAGNITUD las bocas van V1<V2<V4<V3 — la boca
 * "fruncida" (O/U) ocupa la franja media-alta (31–70%) y la "abierta" (A/E) solo
 * los picos (>70%). No es un typo: sigue ficha DR animación rubber-hose.
 *
 * @param {number} rms  energía RMS normalizada (0..1). Valores fuera de rango o
 *   no finitos → boca cerrada (defensivo).
 * @returns {'V1'|'V2'|'V3'|'V4'}
 */
export function visemaDesdeRMS(rms) {
  if (!Number.isFinite(rms) || rms < UMBRAL_RMS.ENTREABIERTA) return VISEMA.CERRADA;
  if (rms < UMBRAL_RMS.FRUNCIDA) return VISEMA.ENTREABIERTA;
  if (rms < UMBRAL_RMS.ABIERTA) return VISEMA.FRUNCIDA;
  return VISEMA.ABIERTA;
}

/**
 * RMS de una ventana de muestras de dominio-tiempo.
 *
 * AnalyserNode.getByteTimeDomainData entrega bytes centrados en 128 (silencio).
 * Normalizamos a [-1,1], sacamos la raíz del promedio de cuadrados. Acepta
 * Uint8Array (byte, centrado en 128) o Float32Array (ya en [-1,1]).
 *
 * @param {Uint8Array|Float32Array|number[]} muestras
 * @returns {number} RMS en 0..1 (0 si no hay muestras).
 */
export function rmsDeMuestras(muestras) {
  if (!muestras || muestras.length === 0) return 0;
  const esByte = muestras instanceof Uint8Array;
  let suma = 0;
  for (let i = 0; i < muestras.length; i++) {
    const v = esByte ? (muestras[i] - 128) / 128 : muestras[i];
    suma += v * v;
  }
  return Math.sqrt(suma / muestras.length);
}

/**
 * Crea un debouncer de visema con estado propio (closure). Devuelve una función
 * `siguiente(visemaCrudo, ahoraMs)` que aplica histéresis temporal: un visema
 * nuevo solo "gana" si se sostiene `ms` desde que se propuso. Evita el castañeteo
 * cuando el RMS tiembla en un borde de umbral.
 *
 * Pura y determinista respecto al reloj que le pasás (`ahoraMs`) → testeable con
 * un reloj falso, sin timers reales.
 *
 * @param {object} [opts]
 * @param {number} [opts.ms=DEBOUNCE_MS]  tiempo de sostenimiento requerido.
 * @param {string} [opts.inicial=VISEMA.CERRADA]  visema de arranque.
 * @returns {(visemaCrudo:string, ahoraMs:number) => string} visema estabilizado.
 */
export function crearDebounceVisema({ ms = DEBOUNCE_MS, inicial = VISEMA.CERRADA } = {}) {
  let estable = inicial;       // el visema que estamos mostrando
  let pendiente = inicial;     // el candidato a cambio
  let desde = -Infinity;       // desde cuándo el candidato se sostiene

  return function siguiente(visemaCrudo, ahoraMs) {
    const t = Number.isFinite(ahoraMs) ? ahoraMs : 0;
    if (visemaCrudo === estable) {
      // volvió al estable: cancela cualquier transición en curso
      pendiente = estable;
      desde = t;
      return estable;
    }
    if (visemaCrudo !== pendiente) {
      // candidato nuevo: arranca su reloj
      pendiente = visemaCrudo;
      desde = t;
      return estable;
    }
    // mismo candidato sostenido: ¿ya cumplió el tiempo?
    if (t - desde >= ms) {
      estable = pendiente;
    }
    return estable;
  };
}

/**
 * Generador de la boca "de relleno" (fallback digno) cuando NO hay AnalyserNode
 * (Web Speech, sin WebAudio, o el navegador no deja intervenir el audio): mientras
 * el agente habla, la boca aletea con un patrón pseudo-aleatorio determinista
 * (no todo abierto: mezcla entreabierta/fruncida/abierta con pausas cerradas)
 * para que se LEA como habla sin necesitar la señal real.
 *
 * Determinista en función de `tMs` → testeable. No usa Math.random.
 *
 * @param {number} tMs  tiempo transcurrido hablando (ms).
 * @returns {'V1'|'V2'|'V3'|'V4'}
 */
export function visemaFallback(tMs) {
  const t = Number.isFinite(tMs) ? tMs : 0;
  // Dos senoidales co-primas → "sílabas" irregulares; a ratos cierra (pausa).
  const s = Math.sin(t / 90) * 0.6 + Math.sin(t / 37) * 0.4; // -1..1 aprox
  const amp = (s + 1) / 2; // 0..1
  if (amp < 0.18) return VISEMA.CERRADA;
  if (amp < 0.5) return VISEMA.ENTREABIERTA;
  if (amp < 0.8) return VISEMA.FRUNCIDA;
  return VISEMA.ABIERTA;
}

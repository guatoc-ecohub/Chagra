/*
 * useHaptics — LA CAPA TÁCTIL del framework de mundos (spec S4, DR-3D-HAPTICA).
 *
 * Un pulso háptico sutil que ACOMPAÑA momentos que ya son visibles/audibles
 * (tap en hotspot, la abeja posándose, el velo de viaje valle↔mundo). Nunca
 * lleva información sola: en iOS/Safari y Firefox 129+ (sin Vibration API)
 * todo es no-op silencioso y el usuario no pierde nada.
 *
 * Reglas inviolables del DR:
 *  - Gate triple: soportado && habilitadoPorPref && !reducedMotion (en 'auto').
 *  - Solo tras gesto del usuario; un pulso por acción (throttle 120 ms,
 *    cancel-then-fire para no encolar patrones).
 *  - Presupuesto: pulsos <40 ms, patrón total <150 ms. Sin zumbidos.
 *  - SSR-safe, cero dependencias, offline, jamás throw.
 *
 * Preferencia persistida en usePrefsStore (clave `chagra:prefs:haptics`):
 *   'auto' (default) → vibra si hay soporte y NO hay prefers-reduced-motion.
 *   'on'             → vibra aunque haya reduced-motion (el usuario sensorial
 *                      que SÍ quiere el feedback táctil manda).
 *   'off'            → nunca.
 *
 * Three-free: seguro en el bundle base (lo importan useNavegacionMundos y
 * las escenas perezosas por igual).
 */
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import usePrefsStore from '../../store/usePrefsStore.js';

/* Catálogo semántico (ms). Unidad de diseño: el "tick" de 10 ms. La Vibration
   API no controla amplitud, solo on/off: la "rampa" del viaje se simula con
   anchos de pulso crecientes (entrar) o decrecientes (volver = aterrizar). */
export const PATRONES_HAPTICOS = {
  tap: 10, // hotspot: "toqué algo vivo, respondió"
  abeja: [12, 55, 20], // posarse: roce, respiro, asiento cálido
  viajeEntrar: [8, 28, 14, 28, 20], // absorción ascendente (~98 ms)
  viajeVolver: [16, 28, 8], // aterrizaje suave, descendente (~52 ms)
  descubrimiento: [10, 45, 10, 45, 22], // "ta-da" contenido (~132 ms)
  error: [22, 45, 22], // doble golpe sordo: "por aquí no" (~89 ms)
};

const THROTTLE_MS = 120;

const SOPORTA = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/* Suscripción viva a prefers-reduced-motion, sin dependencias. */
function subRM(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}
function getRM() {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.reducedMotion]  override explícito del host (el árbol
 *   de mundos ya propaga `reducedMotion` como prop); si se omite, el hook
 *   escucha `prefers-reduced-motion` por su cuenta.
 * @returns {{
 *   supported: boolean, enabled: boolean,
 *   fire: (clave: string|number|number[]) => void, stop: () => void,
 *   tap: () => void, abeja: () => void,
 *   viajeEntrar: () => void, viajeVolver: () => void,
 *   descubrimiento: () => void, error: () => void,
 * }}
 */
export default function useHaptics({ reducedMotion } = {}) {
  const pref = usePrefsStore((s) => s.haptics ?? 'auto'); // 'auto' | 'on' | 'off'
  const rm = useSyncExternalStore(subRM, getRM, () => false);
  const menosMov = reducedMotion ?? rm;
  const ultimo = useRef({ clave: null, t: 0 });

  const enabled = useMemo(() => {
    if (!SOPORTA || pref === 'off') return false;
    if (pref === 'on') return true;
    return !menosMov; // 'auto'
  }, [pref, menosMov]);

  const fire = useCallback((clave) => {
    if (!enabled) return;
    const patron = typeof clave === 'string' ? PATRONES_HAPTICOS[clave] : clave;
    if (patron == null) return;
    const ahora = Date.now();
    const nombre = typeof clave === 'string' ? clave : 'crudo';
    // Un pulso por acción: el mismo evento dentro de 120 ms se ignora.
    if (ultimo.current.clave === nombre && ahora - ultimo.current.t < THROTTLE_MS) return;
    ultimo.current = { clave: nombre, t: ahora };
    try {
      navigator.vibrate(0); // cancel-then-fire: no encolar sobre lo que suene
      navigator.vibrate(patron);
    } catch { /* jamás throw: la háptica es realce, no requisito */ }
  }, [enabled]);

  return useMemo(() => ({
    supported: SOPORTA,
    enabled,
    fire,
    stop: () => { try { navigator.vibrate(0); } catch { /* noop */ } },
    tap: () => fire('tap'),
    abeja: () => fire('abeja'),
    viajeEntrar: () => fire('viajeEntrar'),
    viajeVolver: () => fire('viajeVolver'),
    descubrimiento: () => fire('descubrimiento'),
    error: () => fire('error'),
  }), [enabled, fire]);
}

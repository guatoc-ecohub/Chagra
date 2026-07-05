/**
 * escuchaService.js — Trigger DESACOPLADO del widget "Chagra está escuchando".
 *
 * CONTRATO (decisión operador 2026-07-05, caso de uso manos libres: guantes /
 * manos embarradas): la activación de la escucha es UN SOLO punto de entrada,
 * `activarEscucha()`, que HOY dispara un tap en el botón flotante (EscuchaFab)
 * y MAÑANA disparará el wake-word ("hola Chagra", en prototipado por otro
 * agente) SIN tocar el widget. El widget (EscuchaOverlay) solo escucha el
 * evento — no sabe ni le importa quién lo activó.
 *
 * === CÓMO ENGANCHAR EL WAKE-WORD (para el agente que lo prototipa) ===
 *
 *   import { activarEscucha } from '../services/escuchaService';
 *   // cuando el detector oiga "hola Chagra":
 *   activarEscucha({ fuente: 'wakeword' });
 *
 * Eso es TODO. El overlay se abre, graba con el pipeline Whisper existente,
 * rutea (navegación vs pregunta al agente) y habla la respuesta por Kokoro.
 * La `fuente` solo cambia el copy del encabezado ("La escuché decir
 * «hola Chagra»") y viaja en el detail para telemetría futura.
 *
 * Mecánica: CustomEvent en window (mismo patrón que `chagraNavigate` /
 * `chagraToast` — cero acoplamiento entre módulos, funciona desde cualquier
 * pantalla y desde código no-React como un worker de wake-word).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */

/** Nombre del evento global de activación de escucha. */
export const EVENTO_ESCUCHA = 'chagra:escucha';

/**
 * Fuentes válidas de activación. No es un enum cerrado a la fuerza (el
 * detail viaja tal cual), pero estas son las conocidas:
 *  - 'tap'      → botón flotante EscuchaFab (hoy).
 *  - 'wakeword' → detector "hola Chagra" (mañana).
 *  - 'atajo'    → teclado / accesos directos (reserva).
 */
export const FUENTES_ESCUCHA = Object.freeze(['tap', 'wakeword', 'atajo']);

/**
 * Activa el widget "Chagra está escuchando" desde cualquier lugar.
 *
 * @param {Object} [opts]
 * @param {string} [opts.fuente='tap'] - quién activó ('tap' | 'wakeword' | 'atajo').
 * @returns {boolean} true si el evento se pudo despachar (hay window).
 * @example
 * activarEscucha();                        // tap del FAB
 * activarEscucha({ fuente: 'wakeword' });  // "hola Chagra"
 */
export function activarEscucha(opts = {}) {
  if (typeof window === 'undefined') return false;
  const fuente = typeof opts.fuente === 'string' && opts.fuente ? opts.fuente : 'tap';
  window.dispatchEvent(new CustomEvent(EVENTO_ESCUCHA, {
    detail: { fuente, ts: Date.now() },
  }));
  return true;
}

/**
 * Suscribe un listener al evento de activación de escucha.
 * Lo usa EscuchaOverlay; también sirve para tests o instrumentación.
 *
 * @param {(detail: { fuente: string, ts: number }) => void} cb
 * @returns {() => void} función para desuscribir.
 */
export function onEscucha(cb) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => cb(e.detail || { fuente: 'tap', ts: Date.now() });
  window.addEventListener(EVENTO_ESCUCHA, handler);
  return () => window.removeEventListener(EVENTO_ESCUCHA, handler);
}

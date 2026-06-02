/**
 * agentEntrance.js — animación de ENTRADA al AgentScreen (B1, 2026-06-02).
 *
 * Problema (operador): "en el home de Chagra la transición al agente sigue
 * siendo muy rápida y casi no se nota". El compositor del home (AgentHero) ya
 * hacía un shimmer/lift de "envío" (~520ms) antes de navegar, PERO el cambio de
 * pantalla en sí era un corte seco: el AgentScreen aparecía instantáneo, sin
 * movimiento de ENTRADA. Resultado: la transición se sentía abrupta y "casi no
 * se notaba" que el usuario había aterrizado en el agente.
 *
 * Fix: el contenedor raíz del AgentScreen entra con un fade + rise suaves y
 * deliberados (~460ms con easing de salida), de modo que el usuario PERCIBE que
 * cruzó al agente. Respeta `prefers-reduced-motion` con el patrón establecido
 * en el resto del código (CSS `@media (prefers-reduced-motion: reduce)` desactiva
 * la animación) + un helper JS para que el contrato sea testeable sin DOM.
 *
 * PURO y SÍNCRONO — sin React. Reutilizable y testeable.
 */

/**
 * Duración de la animación de entrada al AgentScreen, en ms. Dentro del rango
 * "deliberado pero no lento" pedido por el operador (400–600ms). Exportada para
 * los tests y para poder sincronizar otros efectos si hiciera falta.
 */
export const AGENT_ENTRANCE_MS = 460;

/** Clase CSS que dispara la animación de entrada (definida en AGENT_ENTRANCE_CSS). */
export const AGENT_ENTRANCE_CLASS = 'chagra-agent-enter';

/**
 * CSS de la animación de entrada. Se inyecta una sola vez vía <style> en el
 * AgentScreen. El bloque `@media (prefers-reduced-motion: reduce)` apaga la
 * animación para quien la pidió — mismo patrón que AgentHero/BiopunkBackground.
 */
export const AGENT_ENTRANCE_CSS = `
@keyframes chagra-agent-enter-kf {
  0% { opacity: 0; transform: translateY(14px) scale(0.985); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.${AGENT_ENTRANCE_CLASS} {
  animation: chagra-agent-enter-kf ${AGENT_ENTRANCE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  transform-origin: 50% 0%;
  will-change: opacity, transform;
}
@media (prefers-reduced-motion: reduce) {
  .${AGENT_ENTRANCE_CLASS} { animation: none !important; }
}
`;

/**
 * ¿El usuario pidió reducir el movimiento? Tolerante a entornos sin matchMedia
 * (SSR/tests): ante la duda, devuelve false (no reduce).
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * Devuelve la clase de entrada a aplicar al contenedor raíz del AgentScreen.
 * Si el usuario pidió reduced-motion → cadena vacía (sin animación). El CSS de
 * arriba ya neutraliza la animación bajo reduced-motion vía @media; este helper
 * es la defensa JS equivalente (y el contrato testeable): nunca emite la clase
 * de animación cuando el usuario pidió quietud.
 *
 * @param {boolean} [reduce] — override explícito (para tests). Si se omite, se
 *   consulta `prefersReducedMotion()`.
 * @returns {string} `AGENT_ENTRANCE_CLASS` o `''`.
 */
export function agentEntranceClass(reduce = prefersReducedMotion()) {
  return reduce ? '' : AGENT_ENTRANCE_CLASS;
}

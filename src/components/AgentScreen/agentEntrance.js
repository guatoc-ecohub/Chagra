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
 * CSS del compositor multimodal del AgentScreen. Idéntico a los tokens de
 * AgentHero para garantizar paridad visual completa (2026-06-08).
 */
export const AGENT_COMPOSITOR_CSS = `
  .as-bar {
    display: flex; align-items: center; gap: 8px;
    background: rgba(30,41,59,0.85); border: 1px solid rgba(100,116,139,0.4);
    border-radius: 20px; padding: 7px 8px;
    box-shadow: 0 10px 30px -12px rgba(0,0,0,0.5);
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
    position: relative; overflow: hidden;
    flex-direction: column; align-items: stretch;
  }
  .as-bar.is-recording { border-color: rgba(244,63,94,0.6); }
  .as-bar:focus-within {
    border-color: rgba(16,185,129,0.55);
    box-shadow: 0 10px 30px -12px rgba(0,0,0,0.5), 0 0 0 3px rgba(16,185,129,0.12);
  }
  .as-iconbtn {
    width: 44px; height: 44px; flex: none; border-radius: 50%;
    background: rgba(30,41,59,0.9); border: 1px solid rgba(100,116,139,0.4);
    display: flex; align-items: center; justify-content: center;
    color: rgb(148,163,184); cursor: pointer; position: relative;
    transition: transform 0.16s cubic-bezier(0.22,0.61,0.36,1),
                background 0.25s ease, border-color 0.25s ease, color 0.2s ease;
  }
  .as-iconbtn:hover { color: #fff; border-color: rgba(16,185,129,0.5); }
  .as-iconbtn:active { transform: scale(0.9); }
  .as-iconbtn:disabled { opacity: 0.4; cursor: not-allowed; }
  .as-tool { animation: as-pulse-ring 3.6s cubic-bezier(.22,.61,.36,1) infinite; }
  .as-tool.is-open {
    background: rgb(16,185,129); border-color: rgb(16,185,129); animation: none;
  }
  @keyframes as-pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); }
    70%  { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
    100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
  }
  .as-mic-on {
    background: rgb(244,63,94) !important; border-color: rgb(244,63,94) !important;
    color: #fff !important; box-shadow: 0 4px 14px -4px rgba(244,63,94,0.5);
  }
  .as-send {
    width: 46px; height: 46px; flex: none; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    overflow: hidden; padding: 0;
    transition: opacity 0.25s ease, box-shadow 0.25s ease;
  }
  .as-send:disabled { opacity: 0.35; cursor: not-allowed; }
  @keyframes as-send-shimmer {
    0%   { transform: translateX(-130%); opacity: 0; }
    25%  { opacity: 1; }
    70%  { opacity: 1; }
    100% { transform: translateX(130%); opacity: 0; }
  }
  @keyframes as-send-lift {
    0%   { transform: translateY(0) scale(1); opacity: 1; }
    35%  { transform: translateY(-4px) scale(1.012); opacity: 1; }
    100% { transform: translateY(-16px) scale(0.978); opacity: 0.82; }
  }
  .as-shimmer::after {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(100deg, transparent 12%, rgba(16,185,129,0.55) 50%, transparent 88%);
    animation: as-send-shimmer 0.52s cubic-bezier(0.22,0.61,0.36,1) forwards;
    pointer-events: none;
  }
  .as-sending { animation: as-send-lift 0.52s cubic-bezier(0.22,0.61,0.36,1) forwards; }
  /* Hoja de capacidades */
  .as-sheet-scrim {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(10,8,4,0.5);
    transition: opacity 0.3s ease;
  }
  .as-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 51;
    max-width: 640px; margin: 0 auto;
    background: rgb(15,23,42);
    border-radius: 26px 26px 0 0;
    box-shadow: 0 -16px 40px -16px rgba(0,0,0,0.55);
    border-top: 1px solid rgba(100,116,139,0.3);
    transform: translateY(0); max-height: 84dvh;
    display: flex; flex-direction: column;
  }
  .as-sheet-grab { width: 42px; height: 5px; background: rgba(100,116,139,0.4); border-radius: 5px; margin: 10px auto 4px; flex: none; }
  .as-cap {
    display: flex; align-items: flex-start; gap: 13px; width: 100%;
    font: inherit; text-align: left;
    background: rgba(30,41,59,0.6); border: 1px solid rgba(100,116,139,0.3);
    border-radius: 18px; padding: 13px 14px; cursor: pointer;
    transition: transform 0.16s cubic-bezier(0.22,0.61,0.36,1), background 0.18s ease;
    box-shadow: 0 3px 10px -7px rgba(0,0,0,0.5);
  }
  .as-cap:active { transform: scale(0.98); }
  .as-cap:hover { border-color: rgba(16,185,129,0.45); box-shadow: 0 0 18px -7px rgba(16,185,129,0.5); }
  .as-cap-ico {
    width: 46px; height: 46px; flex: none; border-radius: 13px;
    display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
    background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.22);
  }
  @media (prefers-reduced-motion: reduce) {
    .as-shimmer::after, .as-sending { animation: none !important; }
    .as-tool { animation: none !important; }
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

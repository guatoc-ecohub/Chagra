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
    /* Pulido voice-first 2026-07: en grabación el mic LATE (pulso de sombra,
       sin transform — no pelea con el scale(0.9) del :active) y emite ondas
       concéntricas via pseudo-elementos. Feedback táctil visual inequívoco. */
    animation: as-mic-rec 1.2s ease-in-out infinite;
  }
  @keyframes as-mic-rec {
    0%, 100% { box-shadow: 0 4px 14px -4px rgba(244,63,94,0.5), 0 0 0 0 rgba(244,63,94,0.40); }
    50%      { box-shadow: 0 4px 18px -4px rgba(244,63,94,0.65), 0 0 0 9px rgba(244,63,94,0); }
  }
  .as-mic-on::before, .as-mic-on::after {
    content: ''; position: absolute; inset: -3px; border-radius: 50%;
    border: 2px solid rgba(244,63,94,0.55); pointer-events: none;
    animation: as-mic-ripple 1.6s cubic-bezier(0.22,0.61,0.36,1) infinite;
  }
  .as-mic-on::after { animation-delay: 0.8s; }
  @keyframes as-mic-ripple {
    0%   { transform: scale(0.85); opacity: 0.85; }
    100% { transform: scale(1.45); opacity: 0; }
  }
  /* Onda de voz en la fila del compositor mientras graba: barras que suben y
     bajan con currentColor (rose). Reemplaza al punto rojo estático — el
     campesino VE que el aparato lo está oyendo. */
  .as-rec-wave { display: inline-flex; align-items: center; gap: 3px; height: 20px; }
  .as-rec-bar {
    width: 3px; height: 100%; border-radius: 2px; background: currentColor;
    transform-origin: 50% 50%;
    animation: as-rec-bar 1.05s ease-in-out infinite;
  }
  @keyframes as-rec-bar {
    0%, 100% { transform: scaleY(0.3); opacity: 0.7; }
    50%      { transform: scaleY(1); opacity: 1; }
  }
  /* TIER 2 #5 (voz punta-a-punta): mic GRANDE — el camino principal para
     baja alfabetización es hablar. 54px + anillo de acento del TEMA
     (--t-accent-rgb, con fallback al teal biopunk) que respira suave para
     invitar al toque. En grabación as-mic-on lo pinta rojo (detener). */
  .as-mic-big {
    width: 54px; height: 54px;
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.55);
    color: rgb(var(--t-accent-rgb, 25, 201, 154));
    animation: as-mic-breathe 3.2s ease-in-out infinite;
  }
  @keyframes as-mic-breathe {
    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--t-accent-rgb, 25, 201, 154), 0.35); }
    50%      { box-shadow: 0 0 0 7px rgba(var(--t-accent-rgb, 25, 201, 154), 0); }
  }
  .as-send {
    width: 46px; height: 46px; flex: none; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    overflow: hidden; padding: 0;
    transition: opacity 0.25s ease, box-shadow 0.25s ease;
  }
  .as-send:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ══════════════════════════════════════════════════════════════════════════
     V2 · MODOS Y HERRAMIENTAS — la bandeja de ~12 chips (ChipsToolbar) que antes
     vivía SIEMPRE sobre el input y comía media pantalla en el celular se colapsa
     en un DISPARADOR ETIQUETADO del compositor que TAMBIÉN muestra el modo
     activo, y las sugerencias se abren en una GAVETA con scroll. Token-aware
     (--c-*/--t-accent-rgb) → coherente en los 4 temas.
     ══════════════════════════════════════════════════════════════════════════ */
  .as-modos-pill {
    flex: 0 1 auto; min-width: 0; height: 44px; max-width: 148px;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 0 13px; border-radius: 22px;
    background: rgb(var(--c-surface-raised, 30 41 59) / 0.9);
    border: 1px solid rgb(var(--c-surface-border, 100 116 139) / 0.55);
    color: rgb(var(--c-slate-300, 148 163 184)); cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
  .as-modos-pill:hover {
    color: rgb(var(--c-slate-100, 226 232 240));
    border-color: rgb(var(--t-accent-rgb, 25 201 154) / 0.5);
  }
  .as-modos-pill:disabled { opacity: 0.4; cursor: not-allowed; }
  .as-modos-pill.is-active {
    background: rgb(var(--t-accent-rgb, 25 201 154) / 0.16);
    border-color: rgb(var(--t-accent-rgb, 25 201 154) / 0.6);
    color: rgb(var(--t-accent-rgb, 25 201 154));
  }
  .as-modos-pill-emoji { font-size: 16px; line-height: 1; flex: none; }
  .as-modos-pill-txt {
    min-width: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .as-gaveta {
    position: fixed; inset: 0; z-index: 60;
    display: flex; flex-direction: column; justify-content: flex-end;
  }
  .as-gaveta-scrim {
    position: absolute; inset: 0; border: 0; padding: 0; margin: 0; cursor: pointer;
    background: rgba(6, 14, 11, 0.56);
    -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
    animation: as-gaveta-fade 0.22s ease both;
  }
  .as-gaveta-panel {
    position: relative; z-index: 1;
    width: 100%; max-width: 640px; margin: 0 auto;
    max-height: min(68vh, 540px);
    display: flex; flex-direction: column;
    background: rgb(var(--c-surface-card, 17 24 39));
    border: 1px solid rgb(var(--c-surface-border, 51 65 85));
    border-bottom: 0; border-radius: 26px 26px 0 0;
    box-shadow: 0 -20px 52px -16px rgba(0, 0, 0, 0.6);
    padding: 8px 15px calc(env(safe-area-inset-bottom, 0px) + 16px);
    animation: as-gaveta-rise 0.34s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  .as-gaveta-grab {
    width: 44px; height: 4px; border-radius: 999px; flex: none;
    background: rgb(var(--c-slate-300, 148 163 184) / 0.5);
    margin: 5px auto 10px;
  }
  .as-gaveta-head { display: flex; align-items: center; gap: 11px; margin-bottom: 6px; }
  .as-gaveta-ico {
    flex: none; width: 40px; height: 40px; border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    background: rgb(var(--t-accent-rgb, 25 201 154) / 0.16);
    color: rgb(var(--t-accent-rgb, 25 201 154));
    border: 1px solid rgb(var(--t-accent-rgb, 25 201 154) / 0.3);
  }
  .as-gaveta-titwrap { flex: 1; min-width: 0; }
  .as-gaveta-titwrap h2 {
    font-family: 'Baloo 2', 'Nunito', system-ui, sans-serif;
    font-weight: 800; font-size: 17px; letter-spacing: -0.3px; line-height: 1.1;
    color: rgb(var(--c-slate-100, 241 245 249));
  }
  .as-gaveta-titwrap p {
    font-size: 12px; line-height: 1.3; margin-top: 2px;
    color: rgb(var(--c-slate-400, 148 163 184));
  }
  .as-gaveta-close {
    flex: none; width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgb(var(--c-surface-raised, 30 41 59));
    border: 1px solid rgb(var(--c-surface-border, 51 65 85));
    color: rgb(var(--c-slate-300, 148 163 184)); cursor: pointer;
    transition: color 0.18s ease, border-color 0.18s ease;
  }
  .as-gaveta-close:hover {
    color: rgb(var(--c-slate-100, 241 245 249));
    border-color: rgb(var(--t-accent-rgb, 25 201 154) / 0.5);
  }
  .as-gaveta-body { overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .as-gaveta-body .agent-chip-tray {
    background: transparent !important; border-top: 0 !important;
    -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
    padding: 2px 2px;
  }
  @keyframes as-gaveta-rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes as-gaveta-fade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .as-gaveta-panel, .as-gaveta-scrim { animation: none !important; }
    .as-modos-pill { transition: none; }
  }
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
  /* La antigua "hoja de capacidades" en texto (.as-sheet/.as-cap) se ELIMINÓ:
     la conversación ahora muestra la MANO (AgentRedMenu) vía AgentManoOverlay,
     misma red que el home (operador: "no se ve la mano, se ven los menús en
     texto"). El overlay trae su propio estilo en agent/AgentShell.jsx. */
  @media (prefers-reduced-motion: reduce) {
    .as-shimmer::after, .as-sending { animation: none !important; }
    .as-tool { animation: none !important; }
    .as-mic-big { animation: none !important; }
    /* Grabación sin movimiento: cae a un anillo estático (::before congelado
       a opacidad tenue) + barras quietas a media altura. La señal de estado
       persiste sin animar. */
    .as-mic-on { animation: none !important; }
    .as-mic-on::before { animation: none !important; opacity: 0.5; transform: scale(1.08); }
    .as-mic-on::after { display: none; }
    .as-rec-bar { animation: none !important; transform: scaleY(0.55); }
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
 * @param {boolean} [reduce] - override explícito (para tests). Si se omite, se
 *   consulta `prefersReducedMotion()`.
 * @returns {string} `AGENT_ENTRANCE_CLASS` o `''`.
 */
export function agentEntranceClass(reduce = prefersReducedMotion()) {
  return reduce ? '' : AGENT_ENTRANCE_CLASS;
}

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
  /* REINVENCIÓN "organismo que conversa": el compositor lleva una COSTURA VIVA —
     una hebra del acento del tema en el borde superior que respira, para que el
     pill se sienta parte del organismo, no una caja muerta sobre la escena. */
  .as-bar::before {
    content: ''; position: absolute; top: 0; left: 14px; right: 14px; height: 2px;
    border-radius: 2px; pointer-events: none;
    background: linear-gradient(90deg,
      transparent,
      rgba(var(--t-accent-rgb, 25, 201, 154), 0.85) 30%,
      rgba(var(--t-accent-rgb, 25, 201, 154), 0.85) 70%,
      transparent);
    animation: as-costura-viva 4.2s ease-in-out infinite;
  }
  @keyframes as-costura-viva {
    0%, 100% { opacity: 0.35; }
    50%      { opacity: 0.9; }
  }
  .as-bar.is-recording { border-color: rgba(244,63,94,0.6); }
  .as-bar.is-recording::before {
    background: linear-gradient(90deg, transparent, rgba(244,63,94,0.9) 30%, rgba(244,63,94,0.9) 70%, transparent);
  }
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
    .as-bar::before { animation: none !important; opacity: 0.55; }
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
 * V3 (fable) — "CUADERNO DE CAMPO COSIDO". CSS de la capa visual nueva del chat
 * del agente:
 *
 *   1. LA MOCHILA (.v3-mochila*): la bandeja de ~11-13 chips de modo que vivía
 *      SIEMPRE sobre el input (y se comía media pantalla en el celular — el
 *      operador la rechazó 3 veces) se colapsa en UN disparador del compositor
 *      (.v3-modo) que abre un bottom-sheet con scroll. Cerrada, el chat tiene
 *      el ALTO COMPLETO.
 *   2. TARJETAS-SEMILLA (.v3-chipcard): dentro de la mochila los modos son
 *      tarjetas grandes en grilla (emoji 22px + etiqueta Nunito) — legibles al
 *      sol y tocables con guantes, no píldoras miniatura.
 *   3. EL CUADERNO (.v3-turn/.v3-card): los turnos del agente son ENTRADAS de
 *      cuaderno de campo — byline "Chagra" en Baloo 2 + tarjeta papel del tema.
 *      La firma de la marca es LA COSTURA: una puntada de hilo esmeralda en el
 *      borde izquierdo de las respuestas respaldadas por el catálogo
 *      ([data-grounded="true"]) — "cosida al catálogo", como la costura de un
 *      costal de fique. Las respuestas solo-generativas NO llevan costura.
 *
 * Todo por TOKENS de tema (--c-* espacio-separado, --t-accent-rgb coma-
 * separado) → coherente en los 4 temas y legible al sol (superficies opacas).
 * Tipografía: Baloo 2 (display) + Nunito (cuerpo), ya self-host en /fonts —
 * los @font-face duplican los de finca-viva-hero.css a propósito (el navegador
 * los dedupe) para que el agente no dependa de que el home los haya cargado.
 * Respeta prefers-reduced-motion (bloque final).
 */
export const AGENT_V3_CSS = `
  @font-face {
    font-family: 'Baloo 2'; font-style: normal; font-weight: 400 800;
    font-display: swap; src: url('/fonts/baloo2-latin.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Nunito'; font-style: normal; font-weight: 400 800;
    font-display: swap; src: url('/fonts/nunito-latin.woff2') format('woff2');
  }

  /* ── Disparador de modos en el compositor (colapsa la bandeja) ─────────── */
  .v3-modo {
    flex: 0 1 auto; min-width: 0; max-width: 160px; height: 44px;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 0 13px;
    /* Forma de SEMILLA: radio asimétrico — sello de la V3, no píldora genérica. */
    border-radius: 22px 22px 22px 8px;
    background: rgb(var(--c-surface-raised, 30 41 59) / 0.92);
    border: 1px solid rgb(var(--c-surface-border, 100 116 139) / 0.6);
    color: rgb(var(--c-slate-300, 203 213 225)); cursor: pointer;
    font-family: 'Baloo 2', 'Nunito', system-ui, sans-serif;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease,
                transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .v3-modo:hover { border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.55); }
  .v3-modo:active { transform: scale(0.95); }
  .v3-modo:disabled { opacity: 0.4; cursor: not-allowed; }
  .v3-modo.is-active {
    background: rgba(var(--t-accent-rgb, 25, 201, 154), 0.16);
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.65);
    color: rgb(var(--t-accent-rgb, 25, 201, 154));
  }
  .v3-modo-txt {
    min-width: 0; font-size: 13.5px; font-weight: 700; letter-spacing: 0.1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  /* Etiqueta del MODO ACTIVO sobre el input (fila propia dentro del pill —
     ancho completo, nunca se trunca como en la fila de íconos). */
  .v3-modo-tagrow {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 8px 0;
  }
  .v3-modo-tag {
    min-width: 0; max-width: 100%; height: 30px;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 11px; border-radius: 15px 15px 15px 6px;
    background: rgba(var(--t-accent-rgb, 25, 201, 154), 0.15);
    border: 1px solid rgba(var(--t-accent-rgb, 25, 201, 154), 0.55);
    color: rgb(var(--t-accent-rgb, 25, 201, 154)); cursor: pointer;
    font-family: 'Baloo 2', 'Nunito', system-ui, sans-serif;
    animation: v3-pop 0.22s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  .v3-modo-tag-txt {
    min-width: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  /* Salida rápida del modo activo (un toque, sin reabrir la mochila).
     30px visuales pero hit-area de 44px vía ::after (patrón .tap-target de
     index.css) — dedos de campo. */
  .v3-modo-clear {
    position: relative;
    flex: none; width: 30px; height: 30px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgb(var(--c-surface-raised, 30 41 59) / 0.9);
    border: 1px solid rgb(var(--c-surface-border, 100 116 139) / 0.55);
    color: rgb(var(--c-slate-400, 148 163 184)); cursor: pointer;
    transition: color 0.18s ease, border-color 0.18s ease, transform 0.16s ease;
  }
  .v3-modo-clear::after {
    content: ''; position: absolute; left: 50%; top: 50%;
    width: max(100%, 44px); height: max(100%, 44px);
    transform: translate(-50%, -50%);
  }
  .v3-modo-clear:hover { color: rgb(var(--c-slate-100, 241 245 249)); }
  .v3-modo-clear:active { transform: scale(0.9); }

  /* ── LA MOCHILA — bottom-sheet de modos con scroll ─────────────────────── */
  .v3-mochila {
    position: fixed; inset: 0; z-index: 70;
    display: flex; flex-direction: column; justify-content: flex-end;
  }
  .v3-mochila-scrim {
    position: absolute; inset: 0; border: 0; padding: 0; margin: 0; cursor: pointer;
    background: rgba(5, 12, 9, 0.58);
    -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
    animation: v3-fade 0.2s ease both;
  }
  .v3-mochila-panel {
    position: relative; z-index: 1; width: 100%; max-width: 680px; margin: 0 auto;
    max-height: min(72dvh, 560px);
    display: flex; flex-direction: column;
    background: rgb(var(--c-surface-card, 15 23 42));
    border: 1px solid rgb(var(--c-surface-border, 51 65 85));
    border-bottom: 0; border-radius: 24px 24px 0 0;
    box-shadow: 0 -22px 56px -18px rgba(0, 0, 0, 0.65);
    padding: 0 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
    animation: v3-rise 0.32s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  /* Dobladillo COSIDO: agarradera + puntada de hilo del acento — misma costura
     que firma las respuestas respaldadas. */
  .v3-mochila-hem { padding: 9px 0 8px; flex: none; }
  .v3-mochila-grab {
    display: block; width: 44px; height: 4px; border-radius: 999px;
    background: rgb(var(--c-slate-400, 148 163 184) / 0.55);
    margin: 0 auto 9px;
  }
  .v3-mochila-stitch {
    display: block; height: 2px; border-radius: 2px; margin: 0 6px;
    background-image: repeating-linear-gradient(
      90deg,
      rgba(var(--t-accent-rgb, 25, 201, 154), 0.75) 0 8px,
      transparent 8px 15px
    );
  }
  .v3-mochila-head {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 4px 4px 10px; flex: none;
  }
  .v3-mochila-titwrap { flex: 1; min-width: 0; }
  .v3-mochila-titwrap h2 {
    font-family: 'Baloo 2', 'Nunito', system-ui, sans-serif;
    font-weight: 800; font-size: 19px; letter-spacing: -0.3px; line-height: 1.15;
    color: rgb(var(--c-slate-100, 241 245 249));
  }
  .v3-mochila-titwrap p {
    font-family: 'Nunito', system-ui, sans-serif;
    font-size: 13.5px; line-height: 1.35; margin-top: 2px;
    color: rgb(var(--c-slate-400, 148 163 184));
  }
  .v3-mochila-close {
    flex: none; width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgb(var(--c-surface-raised, 30 41 59));
    border: 1px solid rgb(var(--c-surface-border, 51 65 85));
    color: rgb(var(--c-slate-300, 203 213 225)); cursor: pointer;
    transition: color 0.18s ease, border-color 0.18s ease;
  }
  .v3-mochila-close:hover {
    color: rgb(var(--c-slate-100, 241 245 249));
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.55);
  }
  .v3-mochila-body {
    overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch; padding: 2px 2px 6px;
  }

  /* ── Tarjetas-semilla de modo (grilla dentro de la mochila) ────────────── */
  .v3-chipgrid {
    display: grid; gap: 9px;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .v3-chipcard {
    display: flex; align-items: center; gap: 10px; text-align: left;
    min-height: 58px; padding: 9px 11px;
    border-radius: 16px 16px 16px 6px;
    background: rgb(var(--c-surface-raised, 30 41 59) / 0.85);
    border: 1px solid rgb(var(--c-surface-border, 51 65 85) / 0.9);
    color: rgb(var(--c-slate-100, 241 245 249)); cursor: pointer;
    animation: v3-pop 0.26s cubic-bezier(0.22, 0.61, 0.36, 1) both;
    animation-delay: calc(var(--i, 0) * 22ms);
    transition: border-color 0.18s ease, background 0.18s ease,
                transform 0.14s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .v3-chipcard:hover { border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.55); }
  .v3-chipcard:active { transform: scale(0.96); }
  .v3-chipcard:disabled { opacity: 0.45; cursor: not-allowed; }
  .v3-chipcard[aria-pressed="true"] {
    background: rgba(var(--t-accent-rgb, 25, 201, 154), 0.16);
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.7);
  }
  .v3-chipcard.is-locked {
    opacity: 0.55; cursor: not-allowed;
    background: rgb(var(--c-surface-raised, 30 41 59) / 0.5);
  }
  .v3-chipcard-emoji {
    flex: none; width: 36px; height: 36px; border-radius: 12px 12px 12px 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 21px; line-height: 1;
    background: rgb(var(--c-surface-card, 15 23 42));
    border: 1px solid rgb(var(--c-surface-border, 51 65 85) / 0.7);
  }
  .v3-chipcard-label {
    min-width: 0; font-family: 'Nunito', system-ui, sans-serif;
    font-size: 13.5px; font-weight: 700; line-height: 1.25;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* Fila "Más consultas" — ocupa todo el ancho de la grilla, borde punteado
     (misma familia visual que la costura). */
  .v3-more-row {
    grid-column: 1 / -1; min-height: 46px; margin-top: 2px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    border-radius: 14px; border: 1.5px dashed rgb(var(--c-surface-border, 51 65 85));
    background: transparent; color: rgb(var(--c-slate-400, 148 163 184));
    font-family: 'Baloo 2', 'Nunito', system-ui, sans-serif;
    font-size: 13.5px; font-weight: 700; cursor: pointer;
    transition: color 0.18s ease, border-color 0.18s ease;
  }
  .v3-more-row:hover {
    color: rgb(var(--c-slate-100, 241 245 249));
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.5);
  }
  .v3-more-row[aria-expanded="true"] {
    color: rgb(var(--t-accent-rgb, 25, 201, 154));
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.55);
  }
  .v3-chipgrid-more { margin-top: 9px; }

  /* ── EL CUADERNO — turnos del chat como entradas de campo ──────────────── */
  .v3-turn {
    margin-bottom: 15px;
    animation: v3-entry 0.26s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  .v3-turn-user { display: flex; justify-content: flex-end; }
  .v3-byline {
    display: flex; align-items: center; gap: 6px; margin: 0 0 4px 2px;
    font-family: 'Baloo 2', 'Nunito', system-ui, sans-serif;
    font-size: 12.5px; font-weight: 700; letter-spacing: 0.2px;
    color: rgb(var(--c-slate-400, 148 163 184));
  }
  .v3-byline-avatar {
    flex: none; width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: rgb(var(--c-surface-card, 15 23 42));
    border: 1px solid rgb(var(--c-surface-border, 51 65 85));
  }
  .v3-byline-avatar.is-streaming {
    border-color: rgba(var(--t-accent-rgb, 25, 201, 154), 0.7);
    box-shadow: 0 0 10px rgba(var(--t-accent-rgb, 25, 201, 154), 0.35);
  }
  /* Tarjeta-papel del agente. Lomo plano arriba-izquierda (bajo el byline),
     tipografía Nunito de cuaderno, superficie del TEMA (papel en claros,
     panel nocturno en biopunk). */
  .v3-card {
    position: relative; max-width: 88%;
    padding: 11px 14px; border-radius: 5px 18px 18px 18px;
    background: rgb(var(--c-surface-card, 15 23 42) / 0.97);
    border: 1px solid rgb(var(--c-surface-border, 51 65 85) / 0.9);
    box-shadow: 0 8px 22px -14px rgba(0, 0, 0, 0.55);
    color: rgb(var(--c-slate-100, 241 245 249));
    font-family: 'Nunito', system-ui, sans-serif;
  }
  /* LA COSTURA (firma V3): respuesta respaldada por el catálogo = puntada de
     hilo esmeralda en el borde izquierdo, como la costura de un costal. Las
     respuestas solo-generativas no llevan hilo. */
  .v3-card[data-grounded="true"] { padding-left: 22px; }
  .v3-card[data-grounded="true"]::before {
    content: ''; position: absolute; left: 9px; top: 12px; bottom: 12px;
    width: 2.5px; border-radius: 2px;
    background-image: repeating-linear-gradient(
      180deg,
      rgb(var(--c-emerald-500, 16 185 129)) 0 7px,
      transparent 7px 13px
    );
  }
  .v3-bubble-user {
    max-width: 82%; padding: 10px 14px;
    border-radius: 18px 18px 5px 18px;
    background: rgb(var(--c-emerald-700, 4 120 87));
    border: 1px solid rgb(var(--c-emerald-500, 16 185 129) / 0.35);
    box-shadow: 0 8px 22px -14px rgb(var(--c-emerald-700, 4 120 87) / 0.8);
    color: #fff; font-family: 'Nunito', system-ui, sans-serif;
  }

  @keyframes v3-rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes v3-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes v3-pop {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes v3-entry {
    from { opacity: 0; transform: translateY(7px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .v3-mochila-panel, .v3-mochila-scrim, .v3-chipcard, .v3-turn,
    .v3-modo-tag {
      animation: none !important;
    }
    .v3-modo, .v3-modo-clear, .v3-chipcard { transition: none; }
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

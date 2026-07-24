/**
 * BotonAnarquiaGlyph.jsx — el glifo Ⓐ ANIMADO del FAB del agente.
 *
 * Variante ELEGIDA por el operador (2026-07-09): #04 "EL MACHETAZO FORJADO"
 * del mockup Chagra-strategy/assets/boton-anarquia-variantes/
 * BotonAnarquia-4variantes.jsx — portada TAL CUAL (misma geometría, mismos
 * keyframes, misma paleta neón rojo/ámbar), solo re-prefijada `baf-` para no
 * chocar con otros estilos del app.
 *
 * Concepto: la Ⓐ es de ANARQUÍA y de AGRICULTURA a la vez. Tres herramientas
 * del campo se estampan a golpes secos de esténcil y FORMAN la letra A:
 *   - la PALA se clava en diagonal        → la pata izquierda,
 *   - el AZADÓN entra de hachazo          → el travesaño,
 *   - el MACHETE corta al final           → la pata derecha.
 * El aro de la propia Ⓐ hace de borde del botón (el círculo del FAB viejo
 * sobraba: era el MISMO aro). Cada ciclo (6 s) termina con un HOLD de ~2.3 s
 * con la Ⓐ armada, quieta y LEGIBLE — y recién ahí reinicia.
 *
 * FIX X→A (heredado del mockup v3): los grupos de POSICIÓN de cada
 * herramienta (`.baf-tool`, atributo transform = translate al ápice + rotate)
 * pivotan con `transform-box: view-box; transform-origin: 0 0` (semántica SVG
 * nativa). Sin eso, la regla blanket `fill-box/center` (necesaria para las
 * animaciones de caída/splat) haría que rotate(±21°) girara cada diagonal
 * sobre su propio centro: las diagonales se CRUZARÍAN a media altura y la A
 * se leería X/tijera.
 *
 * Estado ABIERTO (menú radial desplegado): el ancestro `.is-open` (lo ponen
 * los botones Ⓐ de AgentHero y AgentScreen) vuelve la Ⓐ esténcil BLANCO
 * sobre el fondo de acento del botón y congela golpes/salpicaduras — la raíz
 * de la red queda quieta mientras la mano está abierta.
 *
 * `prefers-reduced-motion`: sin animación — la Ⓐ queda ensamblada y quieta
 * (el estado base de cada keyframe ES el fotograma final).
 *
 * Técnica: SVG + CSS puro, solo transform/opacity (GPU-friendly, cero deps).
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRÍA — viewBox 0 0 140 140. Aro: cx 70, cy 74, r 46. Cada herramienta
// se dibuja en coordenadas locales y se posiciona con translate+rotate para
// que las TRES formen la A (pala y machete convergen en el ápice, azadón de
// travesaño). Los extremos sobresalen del aro a propósito — la Ⓐ pintada de
// un solo gesto, como en un muro.
// ─────────────────────────────────────────────────────────────────────────────

// PALA (diagonal izquierda): empuñadura arriba (vértice de la A), hoja abajo.
const PALA_POS = 'translate(70 11) rotate(21)';
const PALA_GRIP = 'M -7 13 L -7 6 A 7 7 0 0 1 7 6 L 7 13';
const PALA_SHAFT = 'M 0 11 L 0 78';
const PALA_BLADE = 'M -8.5 74 C -10 87 -5.5 99 0 111 C 5.5 99 10 87 8.5 74 C 3.5 78 -3.5 78 -8.5 74 Z';

// MACHETE (diagonal derecha): pomo casi tocando la empuñadura de la pala en
// el ápice — las dos diagonales convergen arriba y la A se lee sin duda.
const MACHETE_POS = 'translate(70 11) rotate(-21)';
const MACHETE_HANDLE = 'M 0 2 L 0 26';
const MACHETE_GUARD = 'M -6 27 L 7 27';
const MACHETE_BLADE = 'M -3.5 29 L -3.5 78 Q -3.5 90 8 99 L 13.5 92.5 Q 6.5 86 6 73 L 6 29 Z';
const MACHETE_FILO = 'M 8 99 L 13.5 92.5';

// AZADÓN (travesaño): mango horizontal que sobresale del aro por ambos lados,
// cabeza perpendicular abajo-izquierda (contrapeso del machete).
const AZADON_POS = 'translate(40 82)';
const AZADON_HANDLE = 'M 8 0 L 58 0';
const AZADON_NECK = 'M 12 -1 C 4 0 0 3 -1 9';
const AZADON_BLADE = 'M -6 7 L 4 8.5 L 5.5 22 L -10 19 Z';

// Piel neón de La Forja (la del mockup, 1:1).
const NEON = { line: '#e8402e', hi: '#ff6b57', fill: '#571106', filo: '#ff6b57' };

export default function BotonAnarquiaGlyph() {
    return (
        <span className="baf-fab" aria-hidden="true">
            <style>{BAF_CSS}</style>
            <svg viewBox="0 0 140 140" className="baf-svg" aria-hidden="true" focusable="false">
                {/* cara del botón: el disco ES el fondo del FAB */}
                <circle className="baf-face" cx="70" cy="74" r="46" fill="#150907" />
                <g className="baf-shake">
                    {/* aro estampado con aerosol, en el neón de La Forja */}
                    <g className="baf-aro">
                        <circle cx="70" cy="74" r="46" fill="none" stroke="#c93b2a" strokeWidth="8" />
                        <circle cx="70" cy="74" r="46" fill="none" stroke="#ff6b57" strokeWidth="1.4" opacity="0.35" />
                        <circle
                            className="baf-grunge" cx="70" cy="74" r="41" fill="none"
                            stroke="#ffb03a" strokeWidth="1.6" strokeDasharray="18 26 7 40 24 14" opacity="0.5"
                        />
                    </g>

                    {/* la Ⓐ neón estampada a golpes — la A la forman SOLO las
                        herramientas, no hay ninguna A dibujada aparte */}
                    <g className="baf-tools">
                        <g className="baf-pala">
                            <g className="baf-tool" transform={PALA_POS}>
                                <path d={PALA_GRIP} fill="none" stroke={NEON.line} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d={PALA_SHAFT} fill="none" stroke={NEON.line} strokeWidth="8.5" strokeLinecap="round" />
                                <path d={PALA_BLADE} fill={NEON.fill} stroke={NEON.hi} strokeWidth="3.4" strokeLinejoin="round" />
                            </g>
                        </g>
                        <g className="baf-azadon">
                            <g className="baf-tool" transform={AZADON_POS}>
                                <path d={AZADON_HANDLE} fill="none" stroke={NEON.line} strokeWidth="8.5" strokeLinecap="round" />
                                <path d={AZADON_NECK} fill="none" stroke={NEON.line} strokeWidth="5" strokeLinecap="round" />
                                <path d={AZADON_BLADE} fill={NEON.fill} stroke={NEON.hi} strokeWidth="3.2" strokeLinejoin="round" />
                            </g>
                        </g>
                        <g className="baf-machete">
                            <g className="baf-tool" transform={MACHETE_POS}>
                                <path d={MACHETE_HANDLE} fill="none" stroke={NEON.line} strokeWidth="8.5" strokeLinecap="round" />
                                <path d={MACHETE_GUARD} fill="none" stroke={NEON.line} strokeWidth="5" strokeLinecap="round" />
                                <path d={MACHETE_BLADE} fill={NEON.fill} stroke={NEON.hi} strokeWidth="3.2" strokeLinejoin="round" />
                                {/* filo — la línea de vida del machete */}
                                <path d={MACHETE_FILO} fill="none" stroke={NEON.filo} strokeWidth="3.2" strokeLinecap="round" />
                            </g>
                        </g>
                    </g>

                    {/* estelas de velocidad de cada golpe */}
                    <polygon className="baf-streak baf-streak-pala" points="60,-28 69,-30 72,48 66,49" fill="#ff6b57" opacity="0" />
                    <g className="baf-streak baf-streak-azadon" stroke="#ff6b57" strokeWidth="3" strokeLinecap="round" opacity="0">
                        <line x1="78" y1="82" x2="130" y2="80" />
                        <line x1="86" y1="94" x2="132" y2="93" />
                    </g>
                    <polygon className="baf-streak baf-streak-machete" points="86,6 92,1 122,110 114,112" fill="#ff6b57" opacity="0" />

                    {/* salpicaduras ÁMBAR — chispas de fragua que quedan de recuerdo */}
                    <g className="baf-splat baf-splat-a" fill="#ffb03a">
                        <circle cx="34" cy="118" r="3.2" />
                        <circle cx="26" cy="110" r="1.8" />
                        <circle cx="43" cy="126" r="1.4" />
                        <circle cx="21" cy="121" r="1.1" />
                    </g>
                    <g className="baf-splat baf-splat-b" fill="#ffb03a">
                        <circle cx="122" cy="84" r="2.8" />
                        <circle cx="128" cy="94" r="1.6" />
                        <circle cx="117" cy="76" r="1.2" />
                    </g>
                    <g className="baf-splat baf-splat-c" fill="#ffb03a">
                        <circle cx="112" cy="120" r="3.4" />
                        <circle cx="120" cy="112" r="1.9" />
                        <circle cx="104" cy="128" r="1.5" />
                        <circle cx="126" cy="124" r="1.2" />
                    </g>
                </g>
            </svg>
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — keyframes del mockup (b3-* de El Machetazo) re-prefijados baf-*.
// 6 s: golpes 0–2.25 s → flicker ~3.2 s → HOLD con la A estampada y quieta
// 3.35–5.64 s (~2.3 s) → fundido y reset.
// ─────────────────────────────────────────────────────────────────────────────
const BAF_CSS = `
.baf-fab { display: block; width: 100%; height: 100%; pointer-events: none; }
.baf-svg { display: block; width: 100%; height: 100%; overflow: visible; }

/* capas animadas: transform en unidades del viewBox */
.baf-svg g, .baf-svg circle, .baf-svg line, .baf-svg polygon, .baf-svg path {
  transform-box: fill-box;
  transform-origin: center;
}
/* el estampado del aro pivota sobre el CENTRO del botón, no sobre su bbox */
.baf-svg .baf-aro, .baf-svg .baf-grunge {
  transform-box: view-box;
  transform-origin: 70px 74px;
}
/* FIX X→A: los grupos de POSICIÓN (translate al ápice + rotate) pivotan
   sobre el ORIGEN LOCAL tras el translate (semántica SVG nativa). Sin esto,
   rotate(±21°) giraría cada diagonal sobre su propio centro y las dos se
   CRUZARÍAN a media altura → se leería X, no A. */
.baf-svg .baf-tool {
  transform-box: view-box;
  transform-origin: 0 0;
}

.baf-svg { animation: baf-fade 6s linear infinite; }
@keyframes baf-fade {
  0% { opacity: 0; }
  0.9%, 94% { opacity: 1; }
  98%, 100% { opacity: 0; }
}
.baf-aro { animation: baf-aro 6s cubic-bezier(0.2, 0.8, 0.3, 1) infinite; }
@keyframes baf-aro {
  0% { transform: scale(1.32); opacity: 0; }
  4.3%, 100% { transform: scale(1); opacity: 1; }
}
.baf-grunge { animation: baf-grunge 6s linear infinite; }
@keyframes baf-grunge {
  0%, 4.3% { opacity: 0; transform: rotate(-8deg); }
  7.8%, 100% { opacity: 0.5; transform: rotate(0deg); }
}
.baf-shake { animation: baf-shake 6s linear infinite; }
@keyframes baf-shake {
  0%, 10.9% { transform: none; }
  11.4% { transform: translate(-2.6px, 1.6px); }
  11.9% { transform: translate(2.1px, -1.1px); }
  12.4% { transform: translate(-1px, 0.5px); }
  13%, 23.1% { transform: none; }
  23.5% { transform: translate(2.6px, 1.1px); }
  24% { transform: translate(-2.1px, -1.1px); }
  24.7%, 35.2% { transform: none; }
  35.6% { transform: translate(-3.1px, 2.1px); }
  36.2% { transform: translate(2.6px, -1.6px); }
  36.8% { transform: translate(-1px, 1px); }
  37.4%, 100% { transform: none; }
}
.baf-pala { animation: baf-pala 6s linear infinite; }
@keyframes baf-pala {
  0%, 8.7% {
    transform: translate(-8px, -138px) rotate(-22deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  9.2% { opacity: 1; }
  11.3% { transform: translate(0, 3px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  12.7%, 100% { transform: none; opacity: 1; }
}
.baf-azadon { animation: baf-azadon 6s linear infinite; }
@keyframes baf-azadon {
  0%, 20.8% {
    transform: translate(144px, -8px) rotate(30deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  21.3% { opacity: 1; }
  23.4% { transform: translate(-4px, 0); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  24.8%, 100% { transform: none; opacity: 1; }
}
.baf-machete { animation: baf-machete 6s linear infinite; }
@keyframes baf-machete {
  0%, 32.9% {
    transform: translate(86px, -120px) rotate(48deg) scale(1.08);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  33.5% { opacity: 1; }
  35.5% { transform: translate(-2px, 2px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  36.9%, 100% { transform: none; opacity: 1; }
}
.baf-streak { animation-duration: 6s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.baf-streak-pala { animation-name: baf-streak-pala; }
.baf-streak-azadon { animation-name: baf-streak-azadon; }
.baf-streak-machete { animation-name: baf-streak-machete; }
@keyframes baf-streak-pala {
  0%, 10.8% { transform: none; opacity: 0; }
  11.6% { opacity: 0.7; }
  15.6%, 100% { transform: translate(0, 14px); opacity: 0; }
}
@keyframes baf-streak-azadon {
  0%, 22.9% { transform: none; opacity: 0; }
  23.8% { opacity: 0.7; }
  27.7%, 100% { transform: translate(-16px, 0); opacity: 0; }
}
@keyframes baf-streak-machete {
  0%, 35% { transform: none; opacity: 0; }
  35.9% { opacity: 0.8; }
  40.3%, 100% { transform: translate(-8px, 12px); opacity: 0; }
}
.baf-splat { animation-duration: 6s; animation-timing-function: cubic-bezier(0.2, 0.9, 0.35, 1); animation-iteration-count: infinite; }
.baf-splat-a { animation-name: baf-splat-a; }
.baf-splat-b { animation-name: baf-splat-b; }
.baf-splat-c { animation-name: baf-splat-c; }
@keyframes baf-splat-a {
  0%, 11.1% { transform: scale(0.3); opacity: 0; }
  12.7%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes baf-splat-b {
  0%, 23.2% { transform: scale(0.3); opacity: 0; }
  24.8%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes baf-splat-c {
  0%, 35.4% { transform: scale(0.3); opacity: 0; }
  36.9%, 100% { transform: scale(1); opacity: 1; }
}
.baf-tools { animation: baf-flicker 6s linear infinite; }
@keyframes baf-flicker {
  0%, 52.9% { opacity: 1; }
  53.7% { opacity: 0.45; }
  54.4% { opacity: 1; }
  55.1% { opacity: 0.6; }
  55.8%, 100% { opacity: 1; }
}

/* ── ABIERTO (menú radial desplegado): la Ⓐ pasa a esténcil BLANCO sobre el
   fondo de acento del botón (paridad con el comportamiento del FAB viejo) y
   se congela quieta — la raíz de la red no compite con las ramas. ────────── */
.is-open .baf-svg, .is-open .baf-svg * { animation: none !important; }
.is-open .baf-svg .baf-face { fill: transparent; }
.is-open .baf-svg .baf-aro circle { stroke: #fff; }
.is-open .baf-svg .baf-grunge { stroke: rgba(255, 255, 255, 0.7); opacity: 0.5; }
.is-open .baf-svg .baf-tools path { stroke: #fff; }
.is-open .baf-svg .baf-tools path[fill]:not([fill="none"]) { fill: rgba(255, 255, 255, 0.32); }
.is-open .baf-svg .baf-streak { opacity: 0 !important; }
.is-open .baf-svg .baf-splat { fill: rgba(255, 255, 255, 0.85); opacity: 1; transform: scale(1); }

/* reduced motion: la Ⓐ ensamblada, quieta y digna (estado base = final) */
@media (prefers-reduced-motion: reduce) {
  .baf-svg, .baf-svg * { animation: none !important; }
  .baf-streak { opacity: 0; }
  .baf-grunge { opacity: 0.5; }
}
`;

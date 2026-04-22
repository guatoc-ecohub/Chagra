/**
 * ChagraGrowLoader.jsx
 * ========================================================================
 * Indicador de "pensando / generando" para la PWA Chagra.
 * Cultiva una planta emblemática según el piso térmico del usuario.
 *
 * PISOS TÉRMICOS → ESPECIES EMBLEMÁTICAS
 *   cálido    (0–1200 msnm)  → cacao      (Theobroma cacao)
 *   templado  (1200–2000)    → café       (Coffea arabica)
 *   frío      (2000–3000)    → maíz       (Zea mays)
 *   páramo    (3000+)        → frailejón  (Espeletia grandiflora)
 *
 * SVG + CSS keyframes, cero dependencias, tree-shakeable, SSR-safe,
 * respeta prefers-reduced-motion, pausable vía prop `paused`.
 * ========================================================================
 */

import React, { useEffect } from 'react';

// ============================================================================
// CONSTANTES Y METADATOS
// ============================================================================

export const THERMAL_ZONES = Object.freeze({
  CALIDO: 'calido',
  TEMPLADO: 'templado',
  FRIO: 'frio',
  PARAMO: 'paramo',
});

export const SPECIES = Object.freeze({
  CACAO: 'cacao',
  CAFE: 'cafe',
  MAIZ: 'maiz',
  FRAILEJON: 'frailejon',
});

export const DEFAULT_SPECIES_BY_ZONE = Object.freeze({
  [THERMAL_ZONES.CALIDO]: SPECIES.CACAO,
  [THERMAL_ZONES.TEMPLADO]: SPECIES.CAFE,
  [THERMAL_ZONES.FRIO]: SPECIES.MAIZ,
  [THERMAL_ZONES.PARAMO]: SPECIES.FRAILEJON,
});

export const SPECIES_META = Object.freeze({
  cacao: {
    commonName: 'Cacao',
    scientificName: 'Theobroma cacao',
    author: 'L.',
    year: 1753,
    family: 'Malvaceae',
    zones: ['calido'],
    altitudMasl: { min: 0, optimoMin: 100, optimoMax: 800, max: 1200 },
  },
  cafe: {
    commonName: 'Café',
    scientificName: 'Coffea arabica',
    author: 'L.',
    year: 1753,
    family: 'Rubiaceae',
    zones: ['templado'],
    altitudMasl: { min: 800, optimoMin: 1200, optimoMax: 1800, max: 2200 },
  },
  maiz: {
    commonName: 'Maíz',
    scientificName: 'Zea mays',
    author: 'L.',
    year: 1753,
    family: 'Poaceae',
    zones: ['templado', 'frio'],
    altitudMasl: { min: 0, optimoMin: 1500, optimoMax: 2800, max: 3200 },
  },
  frailejon: {
    commonName: 'Frailejón',
    scientificName: 'Espeletia grandiflora',
    author: 'Humb. & Bonpl.',
    year: 1808,
    family: 'Asteraceae',
    zones: ['paramo'],
    altitudMasl: { min: 2800, optimoMin: 3200, optimoMax: 3800, max: 4200 },
    conservationStatus: 'nativo_protegido',
    note: 'Especie protegida por Ley 1930 de 2018. La animación es pedagógica; no implica promoción de cultivo.',
  },
});

// ============================================================================
// RESOLUCIÓN DE ESPECIE
// ============================================================================

function resolveSpecies({ species, thermalZone, altitude }) {
  if (species && SPECIES_META[species]) return species;
  if (thermalZone && DEFAULT_SPECIES_BY_ZONE[thermalZone]) {
    return DEFAULT_SPECIES_BY_ZONE[thermalZone];
  }
  if (typeof altitude === 'number' && !isNaN(altitude)) {
    return DEFAULT_SPECIES_BY_ZONE[thermalZoneFromAltitude(altitude)];
  }
  return SPECIES.MAIZ;
}

export function thermalZoneFromAltitude(altitudeMasl) {
  if (altitudeMasl < 1200) return THERMAL_ZONES.CALIDO;
  if (altitudeMasl < 2000) return THERMAL_ZONES.TEMPLADO;
  if (altitudeMasl < 3000) return THERMAL_ZONES.FRIO;
  return THERMAL_ZONES.PARAMO;
}

// ============================================================================
// INYECCIÓN DE KEYFRAMES (una sola vez por documento)
// ============================================================================

const STYLE_ID = 'chagra-grow-loader-styles';

const KEYFRAMES_CSS = `
@keyframes cgl-soil-in {
  0%, 100% { opacity: 0; transform: scaleX(0); }
  4%, 96% { opacity: 1; transform: scaleX(1); }
}
@keyframes cgl-label-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* MAÍZ */
@keyframes cgl-maiz-seed {
  0%, 5%, 98%, 100% { opacity: 0; transform: scale(0); }
  8% { opacity: 1; transform: scale(1.2); }
  12%, 94% { opacity: 1; transform: scale(1); }
}
@keyframes cgl-maiz-root {
  0%, 12% { stroke-dashoffset: 30; opacity: 0; }
  18% { opacity: 1; }
  24%, 94% { stroke-dashoffset: 0; opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-maiz-stem {
  0%, 20% { stroke-dashoffset: 60; opacity: 0; }
  24% { opacity: 1; }
  58%, 94% { stroke-dashoffset: 0; opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-maiz-leaf-1 {
  0%, 38% { opacity: 0; transform: scale(0); }
  46% { opacity: 1; transform: scale(1.08); }
  52%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-maiz-leaf-2 {
  0%, 48% { opacity: 0; transform: scale(0); }
  56% { opacity: 1; transform: scale(1.08); }
  62%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-maiz-leaf-3 {
  0%, 58% { opacity: 0; transform: scale(0); }
  66% { opacity: 1; transform: scale(1.08); }
  72%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-maiz-cob-grow {
  0%, 70% { opacity: 0; transform: scale(0); }
  78% { opacity: 1; transform: scale(1.05); }
  82%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-maiz-cob-ripen {
  0%, 82% { fill: #86efac; }
  88%, 100% { fill: #eab308; }
}
@keyframes cgl-maiz-silk {
  0%, 78% { opacity: 0; transform: translateY(4px); }
  86%, 94% { opacity: 1; transform: translateY(0); }
  98%, 100% { opacity: 0; }
}

/* CAFÉ */
@keyframes cgl-cafe-seed {
  0%, 5%, 98%, 100% { opacity: 0; transform: scale(0); }
  8% { opacity: 1; transform: scale(1.2); }
  12%, 94% { opacity: 1; transform: scale(1); }
}
@keyframes cgl-cafe-stem {
  0%, 18% { stroke-dashoffset: 50; opacity: 0; }
  22% { opacity: 1; }
  55%, 94% { stroke-dashoffset: 0; opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cafe-branch {
  0%, 35% { opacity: 0; transform: scaleX(0); }
  42% { opacity: 1; transform: scaleX(1.05); }
  48%, 94% { opacity: 1; transform: scaleX(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cafe-leaf {
  0%, 42% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.08); }
  56%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cafe-flower {
  0%, 58% { opacity: 0; transform: scale(0); }
  66% { opacity: 1; transform: scale(1.3); }
  72%, 78% { opacity: 1; transform: scale(1); }
  82%, 100% { opacity: 0; transform: scale(0.8); }
}
@keyframes cgl-cafe-cherry-grow {
  0%, 72% { opacity: 0; transform: scale(0); }
  80% { opacity: 1; transform: scale(1.1); }
  84%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cafe-cherry-ripen {
  0%, 80% { fill: #65a30d; }
  88%, 100% { fill: #dc2626; }
}

/* CACAO */
@keyframes cgl-cacao-seed {
  0%, 5%, 98%, 100% { opacity: 0; transform: scale(0); }
  8% { opacity: 1; transform: scale(1.2); }
  12%, 94% { opacity: 1; transform: scale(1); }
}
@keyframes cgl-cacao-trunk {
  0%, 18% { stroke-dashoffset: 45; opacity: 0; }
  22% { opacity: 1; }
  48%, 94% { stroke-dashoffset: 0; opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cacao-canopy {
  0%, 40% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.08); }
  56%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cacao-leaf {
  0%, 45% { opacity: 0; transform: scale(0); }
  54% { opacity: 1; transform: scale(1.08); }
  60%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cacao-flower {
  0%, 60% { opacity: 0; transform: scale(0); }
  68% { opacity: 1; transform: scale(1.3); }
  74%, 80% { opacity: 1; transform: scale(1); }
  86%, 100% { opacity: 0; transform: scale(0.8); }
}
@keyframes cgl-cacao-pod-grow {
  0%, 74% { opacity: 0; transform: scale(0); }
  82% { opacity: 1; transform: scale(1.08); }
  86%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-cacao-pod-ripen {
  0%, 82% { fill: #86efac; }
  92%, 100% { fill: #d97706; }
}

/* FRAILEJÓN (crece ~1 cm/año en la realidad — fases vegetativas pausadas,
   floración como culmen súbito). */
@keyframes cgl-frai-grass {
  0%, 100% { opacity: 0; transform: scaleY(0); }
  4%, 96% { opacity: 0.6; transform: scaleY(1); }
}
@keyframes cgl-frai-seed {
  0%, 6%, 98%, 100% { opacity: 0; transform: scale(0); }
  10% { opacity: 1; transform: scale(1.15); }
  14%, 94% { opacity: 1; transform: scale(1); }
}
@keyframes cgl-frai-rosette-small {
  0%, 16% { opacity: 0; transform: scale(0); }
  28% { opacity: 1; transform: scale(1); }
  48% { opacity: 1; transform: scale(1); }
  58%, 100% { opacity: 0; transform: scale(1.3); }
}
@keyframes cgl-frai-trunk {
  0%, 40% { stroke-dashoffset: 30; opacity: 0; }
  46% { opacity: 1; }
  68%, 94% { stroke-dashoffset: 0; opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-frai-trunk-marks {
  0%, 48% { opacity: 0; }
  60%, 94% { opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-frai-rosette-big {
  0%, 50% { opacity: 0; transform: scale(0); }
  66% { opacity: 1; transform: scale(1.05); }
  72%, 94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-frai-peduncle {
  0%, 72% { stroke-dashoffset: 15; opacity: 0; }
  78% { opacity: 1; }
  86%, 94% { stroke-dashoffset: 0; opacity: 1; }
  98%, 100% { opacity: 0; }
}
@keyframes cgl-frai-flower {
  0%, 82% { opacity: 0; transform: scale(0); }
  90% { opacity: 1; transform: scale(1.15); }
  94% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; }
}

/* Defensivo: que transform-origin en px se interprete contra el viewBox del
   SVG (80x80) y no contra el bbox del elemento. Es el default en browsers
   modernos, pero lo declaramos explícito para evitar divergencias. */
.cgl-svg,
.cgl-svg * {
  transform-box: view-box;
}

@media (prefers-reduced-motion: reduce) {
  .cgl-svg * {
    animation-duration: 0.001s !important;
    animation-iteration-count: 1 !important;
    animation-fill-mode: forwards !important;
    opacity: 1 !important;
    stroke-dashoffset: 0 !important;
    transform: none !important;
  }
  .cgl-label {
    animation: none !important;
    opacity: 0.8 !important;
  }
}
`;

function ensureStylesInjected() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
}

// Inyección en module-load (no en useEffect). Si esperamos al useEffect,
// el primer pintado ocurre con los @keyframes ausentes: Chrome/Firefox/Safari
// no reaplican la animación cuando los keyframes llegan después y el SVG
// queda congelado en el frame 0 (opacity:0, scale:0 → invisible). El guard
// typeof document mantiene SSR-safety.
ensureStylesInjected();

// ============================================================================
// HELPER
// ============================================================================

const anim = (name, duration, paused, easing = 'ease-in-out') => ({
  animation: `${name} ${duration}s ${easing} infinite`,
  animationPlayState: paused ? 'paused' : 'running',
});

// ============================================================================
// RENDERERS SVG POR ESPECIE
// ============================================================================

function renderMaiz(duration, paused) {
  return (
    <>
      <line x1="10" y1="66" x2="70" y2="66" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-soil-in', duration, paused) }} />

      <g fill="none" stroke="#78350f" strokeWidth="1" strokeLinecap="round" strokeDasharray="30"
        style={anim('cgl-maiz-root', duration, paused, 'ease-out')}>
        <path d="M40,66 Q38,72 34,76" />
        <path d="M40,66 Q40,72 40,77" />
        <path d="M40,66 Q42,72 46,76" />
      </g>

      <ellipse cx="40" cy="66" rx="3" ry="2.2" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-maiz-seed', duration, paused, 'ease-out') }} />

      <line x1="40" y1="66" x2="40" y2="22" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
        strokeDasharray="60"
        style={anim('cgl-maiz-stem', duration, paused, 'ease-out')} />

      <path d="M40,56 Q28,52 16,54 Q26,54 40,58 Z" fill="#22c55e" stroke="#15803d" strokeWidth="0.5" strokeLinejoin="round"
        style={{ transformOrigin: '40px 57px', ...anim('cgl-maiz-leaf-1', duration, paused, 'cubic-bezier(0.34, 1.26, 0.64, 1)') }} />

      <path d="M40,44 Q52,40 64,42 Q54,42 40,46 Z" fill="#22c55e" stroke="#15803d" strokeWidth="0.5" strokeLinejoin="round"
        style={{ transformOrigin: '40px 45px', ...anim('cgl-maiz-leaf-2', duration, paused, 'cubic-bezier(0.34, 1.26, 0.64, 1)') }} />

      <path d="M40,34 Q28,30 16,32 Q26,32 40,36 Z" fill="#4ade80" stroke="#15803d" strokeWidth="0.5" strokeLinejoin="round"
        style={{ transformOrigin: '40px 35px', ...anim('cgl-maiz-leaf-3', duration, paused, 'cubic-bezier(0.34, 1.26, 0.64, 1)') }} />

      <ellipse cx="40" cy="22" rx="4.5" ry="9" stroke="#65a30d" strokeWidth="0.6"
        style={{
          transformOrigin: '40px 30px',
          animation: `cgl-maiz-cob-grow ${duration}s cubic-bezier(0.34, 1.26, 0.64, 1) infinite, cgl-maiz-cob-ripen ${duration}s ease-in-out infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }} />

      <g fill="#a16207" opacity="0.5"
        style={{ transformOrigin: '40px 22px', ...anim('cgl-maiz-cob-grow', duration, paused, 'cubic-bezier(0.34, 1.26, 0.64, 1)') }}>
        <circle cx="38.5" cy="18" r="0.6" /><circle cx="41.5" cy="18" r="0.6" />
        <circle cx="37.5" cy="21" r="0.6" /><circle cx="40" cy="21" r="0.6" /><circle cx="42.5" cy="21" r="0.6" />
        <circle cx="38.5" cy="24" r="0.6" /><circle cx="41.5" cy="24" r="0.6" />
        <circle cx="38" cy="27" r="0.6" /><circle cx="42" cy="27" r="0.6" />
      </g>

      <g fill="none" stroke="#d97706" strokeWidth="0.8" strokeLinecap="round"
        style={anim('cgl-maiz-silk', duration, paused, 'ease-out')}>
        <path d="M38,13 Q36,9 34,7" />
        <path d="M39.5,13 Q38.5,8 37.5,5" />
        <path d="M40,13 Q40,8 40,4" />
        <path d="M40.5,13 Q41.5,8 42.5,5" />
        <path d="M42,13 Q44,9 46,7" />
      </g>
    </>
  );
}

function renderCafe(duration, paused) {
  const bezier = 'cubic-bezier(0.34, 1.26, 0.64, 1)';
  return (
    <>
      <line x1="10" y1="66" x2="70" y2="66" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-soil-in', duration, paused) }} />

      <ellipse cx="40" cy="66" rx="2.5" ry="1.8" fill="#78350f" stroke="#451a03" strokeWidth="0.5"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-cafe-seed', duration, paused, 'ease-out') }} />

      <line x1="40" y1="66" x2="40" y2="20" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray="50"
        style={anim('cgl-cafe-stem', duration, paused, 'ease-out')} />

      <g stroke="#78350f" strokeWidth="1" strokeLinecap="round">
        <line x1="40" y1="52" x2="22" y2="48"
          style={{ transformOrigin: '40px 52px', ...anim('cgl-cafe-branch', duration, paused, bezier) }} />
        <line x1="40" y1="52" x2="58" y2="48"
          style={{ transformOrigin: '40px 52px', ...anim('cgl-cafe-branch', duration, paused, bezier) }} />
        <line x1="40" y1="40" x2="22" y2="36"
          style={{ transformOrigin: '40px 40px', ...anim('cgl-cafe-branch', duration, paused, bezier) }} />
        <line x1="40" y1="40" x2="58" y2="36"
          style={{ transformOrigin: '40px 40px', ...anim('cgl-cafe-branch', duration, paused, bezier) }} />
        <line x1="40" y1="28" x2="26" y2="24"
          style={{ transformOrigin: '40px 28px', ...anim('cgl-cafe-branch', duration, paused, bezier) }} />
        <line x1="40" y1="28" x2="54" y2="24"
          style={{ transformOrigin: '40px 28px', ...anim('cgl-cafe-branch', duration, paused, bezier) }} />
      </g>

      <g fill="#16a34a" stroke="#14532d" strokeWidth="0.4">
        <ellipse cx="20" cy="48" rx="5" ry="2.2"
          style={{ transformOrigin: '24px 48px', ...anim('cgl-cafe-leaf', duration, paused, bezier) }} />
        <ellipse cx="60" cy="48" rx="5" ry="2.2"
          style={{ transformOrigin: '56px 48px', ...anim('cgl-cafe-leaf', duration, paused, bezier) }} />
        <ellipse cx="20" cy="36" rx="5" ry="2.2"
          style={{ transformOrigin: '24px 36px', ...anim('cgl-cafe-leaf', duration, paused, bezier) }} />
        <ellipse cx="60" cy="36" rx="5" ry="2.2"
          style={{ transformOrigin: '56px 36px', ...anim('cgl-cafe-leaf', duration, paused, bezier) }} />
        <ellipse cx="24" cy="24" rx="4" ry="2"
          style={{ transformOrigin: '27px 24px', ...anim('cgl-cafe-leaf', duration, paused, bezier) }} />
        <ellipse cx="56" cy="24" rx="4" ry="2"
          style={{ transformOrigin: '53px 24px', ...anim('cgl-cafe-leaf', duration, paused, bezier) }} />
      </g>

      <g fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.3"
        style={anim('cgl-cafe-flower', duration, paused, 'ease-out')}>
        <circle cx="40" cy="52" r="1.5" style={{ transformOrigin: '40px 52px' }} />
        <circle cx="40" cy="40" r="1.5" style={{ transformOrigin: '40px 40px' }} />
        <circle cx="40" cy="28" r="1.3" style={{ transformOrigin: '40px 28px' }} />
      </g>

      <g stroke="#7c2d12" strokeWidth="0.4"
        style={{
          animation: `cgl-cafe-cherry-grow ${duration}s cubic-bezier(0.34, 1.26, 0.64, 1) infinite, cgl-cafe-cherry-ripen ${duration}s ease-in-out infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}>
        <circle cx="38" cy="52" r="1.8" style={{ transformOrigin: '40px 52px' }} />
        <circle cx="42" cy="52" r="1.8" style={{ transformOrigin: '40px 52px' }} />
        <circle cx="38" cy="40" r="1.8" style={{ transformOrigin: '40px 40px' }} />
        <circle cx="42" cy="40" r="1.8" style={{ transformOrigin: '40px 40px' }} />
        <circle cx="38.5" cy="28" r="1.5" style={{ transformOrigin: '40px 28px' }} />
        <circle cx="41.5" cy="28" r="1.5" style={{ transformOrigin: '40px 28px' }} />
      </g>
    </>
  );
}

function renderCacao(duration, paused) {
  const bezier = 'cubic-bezier(0.34, 1.26, 0.64, 1)';
  return (
    <>
      <line x1="10" y1="66" x2="70" y2="66" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-soil-in', duration, paused) }} />

      <ellipse cx="40" cy="66" rx="2.8" ry="2" fill="#92400e" stroke="#451a03" strokeWidth="0.5"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-cacao-seed', duration, paused, 'ease-out') }} />

      <line x1="40" y1="66" x2="40" y2="28" stroke="#78350f" strokeWidth="3" strokeLinecap="round"
        strokeDasharray="45"
        style={anim('cgl-cacao-trunk', duration, paused, 'ease-out')} />

      <g stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none"
        style={{ transformOrigin: '40px 28px', ...anim('cgl-cacao-canopy', duration, paused, bezier) }}>
        <path d="M40,32 Q30,28 22,22" />
        <path d="M40,32 Q50,28 58,22" />
        <path d="M40,28 L40,16" />
      </g>

      <g fill="#15803d" stroke="#14532d" strokeWidth="0.5" strokeLinejoin="round">
        <ellipse cx="18" cy="20" rx="7" ry="3" transform="rotate(-20 18 20)"
          style={{ transformOrigin: '22px 22px', ...anim('cgl-cacao-leaf', duration, paused, bezier) }} />
        <ellipse cx="62" cy="20" rx="7" ry="3" transform="rotate(20 62 20)"
          style={{ transformOrigin: '58px 22px', ...anim('cgl-cacao-leaf', duration, paused, bezier) }} />
        <ellipse cx="28" cy="12" rx="6" ry="2.5" transform="rotate(-10 28 12)"
          style={{ transformOrigin: '32px 14px', ...anim('cgl-cacao-leaf', duration, paused, bezier) }} />
        <ellipse cx="52" cy="12" rx="6" ry="2.5" transform="rotate(10 52 12)"
          style={{ transformOrigin: '48px 14px', ...anim('cgl-cacao-leaf', duration, paused, bezier) }} />
        <ellipse cx="40" cy="8" rx="6" ry="2.5"
          style={{ transformOrigin: '40px 10px', ...anim('cgl-cacao-leaf', duration, paused, bezier) }} />
      </g>

      <circle cx="36" cy="48" r="1.2" fill="#fecaca" stroke="#f87171" strokeWidth="0.3"
        style={{ transformOrigin: '36px 48px', ...anim('cgl-cacao-flower', duration, paused, 'ease-out') }} />
      <circle cx="44" cy="56" r="1.2" fill="#fecaca" stroke="#f87171" strokeWidth="0.3"
        style={{ transformOrigin: '44px 56px', ...anim('cgl-cacao-flower', duration, paused, 'ease-out') }} />

      <g stroke="#7c2d12" strokeWidth="0.5"
        style={{
          animation: `cgl-cacao-pod-grow ${duration}s cubic-bezier(0.34, 1.26, 0.64, 1) infinite, cgl-cacao-pod-ripen ${duration}s ease-in-out infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}>
        <ellipse cx="32" cy="50" rx="3" ry="6" transform="rotate(-15 32 50)"
          style={{ transformOrigin: '32px 44px' }} />
        <ellipse cx="48" cy="54" rx="3" ry="6" transform="rotate(15 48 54)"
          style={{ transformOrigin: '48px 48px' }} />
      </g>

      <g fill="none" stroke="#7c2d12" strokeWidth="0.3" opacity="0.5"
        style={{
          animation: `cgl-cacao-pod-grow ${duration}s cubic-bezier(0.34, 1.26, 0.64, 1) infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}>
        <path d="M30,46 Q31,50 32,55" transform="rotate(-15 32 50)" />
        <path d="M34,46 Q33,50 32,55" transform="rotate(-15 32 50)" />
        <path d="M46,50 Q47,54 48,59" transform="rotate(15 48 54)" />
        <path d="M50,50 Q49,54 48,59" transform="rotate(15 48 54)" />
      </g>
    </>
  );
}

function renderFrailejon(duration, paused) {
  const bezier = 'cubic-bezier(0.34, 1.2, 0.64, 1)';
  return (
    <>
      <line x1="10" y1="66" x2="70" y2="66" stroke="#57534e" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-soil-in', duration, paused) }} />

      <g fill="none" stroke="#84cc16" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-frai-grass', duration, paused) }}>
        <path d="M14,66 Q15,62 16,66" />
        <path d="M20,66 Q22,60 23,66" />
        <path d="M58,66 Q60,61 61,66" />
        <path d="M65,66 Q66,63 67,66" />
      </g>

      <ellipse cx="40" cy="66" rx="2" ry="1.5" fill="#a8a29e" stroke="#44403c" strokeWidth="0.4"
        style={{ transformOrigin: '40px 66px', ...anim('cgl-frai-seed', duration, paused, 'ease-out') }} />

      <g fill="#bbf7d0" stroke="#16a34a" strokeWidth="0.4"
        style={{ transformOrigin: '40px 62px', ...anim('cgl-frai-rosette-small', duration, paused, bezier) }}>
        <ellipse cx="36" cy="62" rx="3" ry="1.3" transform="rotate(-15 36 62)" />
        <ellipse cx="44" cy="62" rx="3" ry="1.3" transform="rotate(15 44 62)" />
        <ellipse cx="40" cy="60" rx="3" ry="1.3" />
        <ellipse cx="38" cy="63" rx="2.5" ry="1.2" transform="rotate(-45 38 63)" />
        <ellipse cx="42" cy="63" rx="2.5" ry="1.2" transform="rotate(45 42 63)" />
      </g>

      <line x1="40" y1="66" x2="40" y2="38" stroke="#78716c" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray="30"
        style={anim('cgl-frai-trunk', duration, paused, 'ease-out')} />

      <g stroke="#57534e" strokeWidth="0.4" strokeLinecap="round"
        style={anim('cgl-frai-trunk-marks', duration, paused)}>
        <line x1="38" y1="62" x2="42" y2="62" />
        <line x1="38" y1="57" x2="42" y2="57" />
        <line x1="38" y1="52" x2="42" y2="52" />
        <line x1="38" y1="47" x2="42" y2="47" />
        <line x1="38" y1="42" x2="42" y2="42" />
      </g>

      <g fill="#d1fae5" stroke="#16a34a" strokeWidth="0.5" strokeLinejoin="round"
        style={{ transformOrigin: '40px 36px', ...anim('cgl-frai-rosette-big', duration, paused, bezier) }}>
        <ellipse cx="30" cy="34" rx="6" ry="2.2" transform="rotate(-35 30 34)" />
        <ellipse cx="50" cy="34" rx="6" ry="2.2" transform="rotate(35 50 34)" />
        <ellipse cx="28" cy="38" rx="6" ry="2" transform="rotate(-20 28 38)" />
        <ellipse cx="52" cy="38" rx="6" ry="2" transform="rotate(20 52 38)" />
        <ellipse cx="32" cy="30" rx="6" ry="2" transform="rotate(-55 32 30)" />
        <ellipse cx="48" cy="30" rx="6" ry="2" transform="rotate(55 48 30)" />
        <ellipse cx="36" cy="28" rx="5" ry="2" transform="rotate(-75 36 28)" />
        <ellipse cx="44" cy="28" rx="5" ry="2" transform="rotate(75 44 28)" />
        <ellipse cx="40" cy="27" rx="3" ry="2.5" />
      </g>

      <line x1="40" y1="32" x2="40" y2="16" stroke="#65a30d" strokeWidth="0.8" strokeLinecap="round"
        strokeDasharray="15"
        style={anim('cgl-frai-peduncle', duration, paused, 'ease-out')} />

      <g
        style={{ transformOrigin: '40px 14px', ...anim('cgl-frai-flower', duration, paused, bezier) }}>
        <g fill="#facc15" stroke="#ca8a04" strokeWidth="0.3">
          <ellipse cx="40" cy="9" rx="1.5" ry="3" />
          <ellipse cx="40" cy="19" rx="1.5" ry="3" />
          <ellipse cx="35" cy="14" rx="3" ry="1.5" />
          <ellipse cx="45" cy="14" rx="3" ry="1.5" />
          <ellipse cx="36.5" cy="10.5" rx="1.5" ry="2.5" transform="rotate(-45 36.5 10.5)" />
          <ellipse cx="43.5" cy="10.5" rx="1.5" ry="2.5" transform="rotate(45 43.5 10.5)" />
          <ellipse cx="36.5" cy="17.5" rx="1.5" ry="2.5" transform="rotate(45 36.5 17.5)" />
          <ellipse cx="43.5" cy="17.5" rx="1.5" ry="2.5" transform="rotate(-45 43.5 17.5)" />
        </g>
        <circle cx="40" cy="14" r="2" fill="#a16207" stroke="#713f12" strokeWidth="0.4" />
      </g>
    </>
  );
}

const SPECIES_RENDERERS = {
  [SPECIES.MAIZ]: renderMaiz,
  [SPECIES.CAFE]: renderCafe,
  [SPECIES.CACAO]: renderCacao,
  [SPECIES.FRAILEJON]: renderFrailejon,
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ChagraGrowLoader({
  species,
  thermalZone,
  altitude,
  size = 48,
  speed = 1,
  showLabel = false,
  labelText = 'Pensando...',
  paused = false,
  className = '',
  ariaLabel,
}) {
  useEffect(() => { ensureStylesInjected(); }, []);

  const resolvedSpecies = resolveSpecies({ species, thermalZone, altitude });
  const renderer = SPECIES_RENDERERS[resolvedSpecies] || SPECIES_RENDERERS[SPECIES.MAIZ];
  const meta = SPECIES_META[resolvedSpecies];

  const duration = 4 / Math.max(0.1, speed);
  const a11y = ariaLabel || `Cargando: ${meta?.commonName || 'planta'} creciendo`;

  return (
    <div
      className={`cgl-root ${className}`}
      role="status"
      aria-live="polite"
      aria-label={a11y}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size >= 32 ? '0.75em' : '0.5em' }}
    >
      <svg
        className="cgl-svg"
        width={size}
        height={size}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {renderer(duration, paused)}
      </svg>

      {showLabel && (
        <span
          className="cgl-label"
          style={{
            fontSize: `${Math.max(11, size * 0.22)}px`,
            fontWeight: 500,
            color: 'currentColor',
            animation: `cgl-label-pulse ${duration / 2}s ease-in-out infinite`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {labelText}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTES DE CONVENIENCIA (tree-shakeable)
// ============================================================================

export const ChagraCacaoLoader     = (props) => <ChagraGrowLoader {...props} species={SPECIES.CACAO} />;
export const ChagraCafeLoader      = (props) => <ChagraGrowLoader {...props} species={SPECIES.CAFE} />;
export const ChagraMaizLoader      = (props) => <ChagraGrowLoader {...props} species={SPECIES.MAIZ} />;
export const ChagraFrailejonLoader = (props) => <ChagraGrowLoader {...props} species={SPECIES.FRAILEJON} />;

export default ChagraGrowLoader;

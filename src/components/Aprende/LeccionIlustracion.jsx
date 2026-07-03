/**
 * LeccionIlustracion — una ilustración propia por lección del hub "Aprender"
 * (pedido explícito del audit: "una ilustración por lección", que las tarjetas
 * no sean todas iguales).
 *
 * Cinco escenas SVG inline dibujadas a mano, una por slug:
 *   - suelo:         corte de suelo vivo (brote, raíces, lombriz).
 *   - asociaciones:  maíz con fríjol enredado (las "tres hermanas").
 *   - biopreparados: frasco fermentando con burbujas y hoja.
 *   - mip:           hoja mordida con mariquita (control biológico).
 *   - fenologia:     arco semilla → brote → flor → fruto bajo el sol.
 *
 * Principios:
 *   - Decorativas: `aria-hidden` + `focusable="false"`; el texto de la tarjeta
 *     es el contenido real. Cero texto dentro del SVG.
 *   - Offline-first: SVG inline, sin assets remotos ni dependencias nuevas.
 *   - Sin animación (no hay nada que gatear por prefers-reduced-motion).
 *   - Paleta anclada a los tonos que ya usa cada lección en el hub
 *     (amber/green/violet/rose/sky de Tailwind), trazos round-cap como el
 *     resto del lenguaje visual de la marca (ManoChagraGlyph).
 *
 * Props:
 *   @param {string} slug       — slug de la lección (suelo|asociaciones|...).
 *   @param {number} [size]     — lado en px (default 56).
 *   @param {string} [className]
 */
import React from 'react';

const TRAZO = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/* Corte de suelo vivo: brote arriba, horizonte, raíces y lombriz abajo. */
function EscenaSuelo() {
  return (
    <g {...TRAZO}>
      {/* Cielo sutil */}
      <circle cx="56" cy="14" r="6" stroke="#fcd34d" strokeWidth="2" opacity="0.65" />
      {/* Banda de suelo (dos capas) */}
      <path d="M6 34 H66" stroke="#b45309" strokeWidth="2.4" />
      <rect x="6" y="34" width="60" height="30" rx="6" fill="#78350f" opacity="0.28" />
      <path d="M8 47 Q20 44 32 47 T56 47 T66 46" stroke="#92400e" strokeWidth="1.6" opacity="0.7" />
      {/* Brote */}
      <path d="M30 34 V22" stroke="#4ade80" strokeWidth="2.6" />
      <path d="M30 26 Q23 24 21 17 Q29 17 30 25" stroke="#4ade80" strokeWidth="2" fill="#4ade80" fillOpacity="0.25" />
      <path d="M30 24 Q37 22 39 15 Q31 15 30 23" stroke="#86efac" strokeWidth="2" fill="#86efac" fillOpacity="0.25" />
      {/* Raíces */}
      <path d="M30 34 Q29 42 24 47 M30 34 Q31 43 36 48 M30 40 Q34 43 35 45" stroke="#fbbf24" strokeWidth="1.8" opacity="0.9" />
      {/* Lombriz */}
      <path d="M42 58 Q46 52 51 56 Q56 60 60 55" stroke="#fb923c" strokeWidth="3.2" />
      <circle cx="60.5" cy="54.5" r="1.1" fill="#431407" stroke="none" />
      {/* Poros / vida microbiana */}
      <circle cx="16" cy="55" r="1.4" fill="#fcd34d" stroke="none" opacity="0.8" />
      <circle cx="47" cy="41" r="1.2" fill="#fcd34d" stroke="none" opacity="0.6" />
      <circle cx="13" cy="41" r="1.2" fill="#fdba74" stroke="none" opacity="0.7" />
    </g>
  );
}

/* Maíz con fríjol enredado: dos plantas que se ayudan. */
function EscenaAsociaciones() {
  return (
    <g {...TRAZO}>
      {/* Piso */}
      <path d="M10 60 H62" stroke="#166534" strokeWidth="2.2" opacity="0.8" />
      {/* Tallo de maíz */}
      <path d="M30 60 V14" stroke="#4ade80" strokeWidth="2.8" />
      {/* Hojas de maíz */}
      <path d="M30 44 Q19 42 14 33 Q26 33 30 42" stroke="#4ade80" strokeWidth="2" fill="#4ade80" fillOpacity="0.2" />
      <path d="M30 32 Q41 30 46 21 Q34 21 30 30" stroke="#4ade80" strokeWidth="2" fill="#4ade80" fillOpacity="0.2" />
      {/* Mazorca */}
      <ellipse cx="34.5" cy="17" rx="3.4" ry="6" transform="rotate(24 34.5 17)" stroke="#facc15" strokeWidth="2" fill="#fde047" fillOpacity="0.35" />
      {/* Guía de fríjol enroscada al tallo */}
      <path d="M44 60 Q34 54 30 50 Q24 45 30 40 Q36 36 30 30 Q25 26 30 22" stroke="#a3e635" strokeWidth="2.4" />
      {/* Hojas de fríjol (corazón) */}
      <path d="M42 52 q-2 -6 4 -6 q6 0 3 6 q-2 4 -3.5 4 q-1.5 0 -3.5 -4z" stroke="#a3e635" strokeWidth="1.8" fill="#a3e635" fillOpacity="0.25" />
      <path d="M21 34 q-5 -3 -1.5 -7 q4 -3 6 2 q1.5 4 -0.5 5 q-1.6 1 -4 0z" stroke="#bef264" strokeWidth="1.8" fill="#bef264" fillOpacity="0.25" />
      {/* Florecita del fríjol */}
      <circle cx="30" cy="21" r="2.2" fill="#f0abfc" stroke="#e879f9" strokeWidth="1.4" />
    </g>
  );
}

/* Frasco de biopreparado fermentando: burbujas y hoja de ortiga. */
function EscenaBiopreparados() {
  return (
    <g {...TRAZO}>
      {/* Frasco */}
      <path d="M26 20 H46 M28 20 V26 Q22 30 22 36 V54 Q22 60 28 60 H44 Q50 60 50 54 V36 Q50 30 44 26 V20" stroke="#c4b5fd" strokeWidth="2.4" />
      {/* Tapa de tela (fermento aeróbico) */}
      <path d="M25 17 Q36 13 47 17" stroke="#a78bfa" strokeWidth="2.2" />
      {/* Líquido */}
      <path d="M23.5 40 Q30 37.5 36 40 T48.5 40 V53.5 Q48.5 58.5 44 58.5 H28 Q23.5 58.5 23.5 53.5 Z" fill="#8b5cf6" fillOpacity="0.35" stroke="#8b5cf6" strokeWidth="1.6" />
      {/* Burbujas subiendo */}
      <circle cx="31" cy="47" r="1.8" stroke="#ddd6fe" strokeWidth="1.5" />
      <circle cx="38" cy="51" r="1.3" stroke="#ddd6fe" strokeWidth="1.4" />
      <circle cx="41" cy="44" r="2.2" stroke="#ddd6fe" strokeWidth="1.5" />
      <circle cx="35" cy="34" r="1.4" stroke="#c4b5fd" strokeWidth="1.4" opacity="0.9" />
      <circle cx="39" cy="29" r="1.1" stroke="#c4b5fd" strokeWidth="1.3" opacity="0.7" />
      {/* Hoja al lado (materia verde) */}
      <path d="M12 56 Q10 44 19 39 Q22 50 14 56z" stroke="#4ade80" strokeWidth="1.8" fill="#4ade80" fillOpacity="0.25" />
      <path d="M15.5 52 Q16 47 18 43" stroke="#4ade80" strokeWidth="1.3" />
    </g>
  );
}

/* Hoja mordida con mariquita: manejo integrado de plagas. */
function EscenaMip() {
  return (
    <g {...TRAZO}>
      {/* Hoja grande */}
      <path d="M14 54 Q10 26 34 14 Q58 22 54 46 Q44 60 26 58 Q18 57 14 54z" stroke="#4ade80" strokeWidth="2.4" fill="#4ade80" fillOpacity="0.16" />
      {/* Nervadura */}
      <path d="M18 52 Q30 40 44 24 M28 44 Q34 44 40 40 M24 48 Q28 50 34 50" stroke="#4ade80" strokeWidth="1.5" opacity="0.85" />
      {/* Mordisco de plaga (muescas) */}
      <path d="M50 30 q4 3 1.5 7 q-4 2 -6 -2 q-1.5 -3.5 4.5 -5z" fill="#0f1714" stroke="#166534" strokeWidth="1.4" />
      <circle cx="44" cy="52" r="2.6" fill="#0f1714" stroke="#166534" strokeWidth="1.2" />
      {/* Mariquita (control biológico) */}
      <g transform="rotate(-18 26 28)">
        <ellipse cx="26" cy="28" rx="7" ry="6" fill="#fb7185" stroke="#e11d48" strokeWidth="1.6" />
        <path d="M26 22.5 V33.5" stroke="#7f1d1d" strokeWidth="1.4" />
        <circle cx="26" cy="21.5" r="2.6" fill="#7f1d1d" stroke="none" />
        <circle cx="22.6" cy="26.5" r="1.2" fill="#7f1d1d" stroke="none" />
        <circle cx="29.4" cy="27.5" r="1.2" fill="#7f1d1d" stroke="none" />
        <circle cx="24" cy="30.6" r="1" fill="#7f1d1d" stroke="none" />
      </g>
    </g>
  );
}

/* Ciclo fenológico: semilla → brote → flor → fruto bajo el sol. */
function EscenaFenologia() {
  return (
    <g {...TRAZO}>
      {/* Sol */}
      <circle cx="36" cy="16" r="5" stroke="#fcd34d" strokeWidth="2" fill="#fde047" fillOpacity="0.3" />
      <path d="M36 7 V4 M45 12 L47 10 M27 12 L25 10" stroke="#fcd34d" strokeWidth="1.8" />
      {/* Arco del ciclo (punteado) */}
      <path d="M10 54 Q14 30 36 28 Q58 30 62 54" stroke="#7dd3fc" strokeWidth="1.8" strokeDasharray="1 5" />
      {/* Piso */}
      <path d="M8 58 H64" stroke="#0c4a6e" strokeWidth="2" opacity="0.8" />
      {/* 1. Semilla */}
      <ellipse cx="11" cy="53" rx="2.6" ry="3.4" transform="rotate(-20 11 53)" fill="#fbbf24" stroke="#d97706" strokeWidth="1.4" />
      {/* 2. Brote */}
      <path d="M26 58 V47 M26 50 Q21 49 20 44 Q25 44 26 49 M26 48 Q31 47 32 42 Q27 42 26 47" stroke="#4ade80" strokeWidth="2" />
      {/* 3. Flor */}
      <path d="M44 58 V44" stroke="#4ade80" strokeWidth="2" />
      <circle cx="44" cy="40" r="2.2" fill="#fde047" stroke="none" />
      <circle cx="44" cy="35.4" r="2.4" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1" />
      <circle cx="48.4" cy="39" r="2.4" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1" />
      <circle cx="46.8" cy="44" r="2.4" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1" />
      <circle cx="41.2" cy="44" r="2.4" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1" />
      <circle cx="39.6" cy="39" r="2.4" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1" />
      {/* 4. Fruto */}
      <path d="M60 58 V48" stroke="#4ade80" strokeWidth="2" />
      <circle cx="60" cy="45" r="4.6" fill="#fb923c" fillOpacity="0.75" stroke="#ea580c" strokeWidth="1.6" />
      <path d="M60 40.5 Q62 38.5 64 39" stroke="#4ade80" strokeWidth="1.6" />
    </g>
  );
}

const ESCENAS = {
  suelo: EscenaSuelo,
  asociaciones: EscenaAsociaciones,
  biopreparados: EscenaBiopreparados,
  mip: EscenaMip,
  fenologia: EscenaFenologia,
};

export default function LeccionIlustracion({ slug, size = 56, className = '' }) {
  const Escena = ESCENAS[slug];
  if (!Escena) return null;
  return (
    <svg
      data-testid={`leccion-ilustracion-${slug}`}
      viewBox="0 0 72 72"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Escena />
    </svg>
  );
}

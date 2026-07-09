import React from 'react';

/**
 * LaminaAporque — lámina en CORTE del aporque, la labor propia de los
 * tubérculos. SVG propio de cuaderno de campo: se ve la finca "por dentro",
 * como si cortáramos el surco con una pala.
 *
 *   ANTES  →  la mata con el cuello descubierto y un par de tubérculos
 *             asomando (los que se enverdecen al sol).
 *   APORQUE → se arrima tierra al pie tapando el cuello (la flecha).
 *   DESPUÉS →  el camellón alto: los tubérculos engordan tapados, a oscuras,
 *             lejos del sol y con menos paso para la polilla.
 *
 * Es DECORATIVA (aria-hidden): ilustra la sección "Aporque" de la ficha; el
 * texto explica el porqué. Trazo redondeado, colores Tailwind sobre
 * currentColor por grupo para respirar con los temas.
 */
export default function LaminaAporque() {
  return (
    <svg
      viewBox="0 0 360 120"
      role="img"
      aria-hidden="true"
      className="w-full h-auto select-none"
      data-testid="lamina-aporque"
    >
      {/* línea del nivel del suelo original (de referencia) */}
      <line
        x1="6" y1="70" x2="354" y2="70"
        stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5"
        strokeLinecap="round" className="text-amber-700/50"
      />

      {/* ── ANTES · cuello descubierto ── */}
      <g>
        {/* terrón bajo, plano */}
        <path d="M14 70 q 44 -6 88 0 v 40 h -88 z" fill="currentColor" className="text-amber-900/45" />
        {/* la mata */}
        <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" className="text-lime-400">
          <line x1="58" y1="70" x2="58" y2="40" />
          <path d="M58 56 q -12 -3 -17 -13" />
          <path d="M58 50 q 12 -3 17 -13" />
        </g>
        {/* tubérculos: uno tapado, uno asomando (verde al sol) */}
        <ellipse cx="44" cy="86" rx="8" ry="5.5" fill="currentColor" className="text-amber-300/85" />
        <ellipse cx="70" cy="70" rx="8" ry="5.5" fill="currentColor" className="text-lime-500/80" />
        {/* solecito que enverdece al descubierto */}
        <g className="text-amber-300" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="90" cy="30" r="6" fill="currentColor" opacity="0.9" />
          <line x1="90" y1="18" x2="90" y2="14" />
          <line x1="101" y1="24" x2="104" y2="21" />
          <line x1="79" y1="24" x2="76" y2="21" />
        </g>
      </g>

      {/* ── FLECHA · se arrima tierra al pie ── */}
      <g className="text-slate-300" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M150 52 q 30 -10 60 0" />
        <path d="M198 45 l 14 7 l -13 8" />
      </g>
      <text x="180" y="34" textAnchor="middle" className="fill-current text-slate-400" fontSize="11">aporque</text>

      {/* ── DESPUÉS · camellón alto, cuello tapado ── */}
      <g>
        {/* camellón alto (más tierra arrimada) */}
        <path d="M244 70 q 52 -34 104 0 v 44 h -104 z" fill="currentColor" className="text-amber-800/55" />
        {/* la mata, ahora con el cuello enterrado */}
        <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" className="text-lime-400">
          <line x1="296" y1="44" x2="296" y2="18" />
          <path d="M296 32 q -12 -3 -17 -13" />
          <path d="M296 26 q 12 -3 17 -13" />
        </g>
        {/* varios tubérculos engordando tapados, a oscuras */}
        <g className="text-amber-300/85">
          <ellipse cx="278" cy="84" rx="8" ry="5.5" fill="currentColor" />
          <ellipse cx="300" cy="92" rx="9" ry="6" fill="currentColor" />
          <ellipse cx="316" cy="82" rx="7.5" ry="5" fill="currentColor" />
        </g>
        {/* rótulos de la ganancia */}
        <text x="296" y="112" textAnchor="middle" className="fill-current text-emerald-400/90" fontSize="9">tapados · a oscuras</text>
      </g>
    </svg>
  );
}

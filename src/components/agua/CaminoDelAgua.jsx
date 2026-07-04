import React from 'react';

/**
 * CaminoDelAgua — la ilustración insignia del módulo "Agua de la finca".
 *
 * SVG propio (nada de librerías de stock): el recorrido del agua en una finca
 * campesina, de izquierda a derecha —
 *
 *   NUBE con lluvia → TECHO de la casa → canal → TANQUE   (pilar: lluvia)
 *   SURCO con la mata regada gota a gota                  (pilar: riego)
 *   LOMA con monte nativo y el NACIMIENTO                 (pilar: cuidar)
 *
 * Es DECORATIVA (aria-hidden): la navegación real entre pilares son los
 * botones que la acompañan en AguaScreen. La estación del pilar activo se
 * resalta subiendo la opacidad de su grupo y bajando la de los demás — así
 * el dibujo "responde" a la pestaña sin ser él mismo un control.
 *
 * Trazo: línea redondeada, formas simples de cuaderno de campo. Colores en
 * clases Tailwind (currentColor por grupo) para que respiren con los temas.
 */
export default function CaminoDelAgua({ activo = 'lluvia' }) {
  const dim = (id) => (activo === id ? 'opacity-100' : 'opacity-40');
  return (
    <svg
      viewBox="0 0 360 132"
      role="img"
      aria-hidden="true"
      className="w-full h-auto select-none"
      data-testid="camino-del-agua"
    >
      {/* línea de tierra que une todo el camino */}
      <path
        d="M6 112 Q 90 106 180 112 T 354 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-amber-700/60"
      />

      {/* ── ESTACIÓN 1 · lluvia: nube → techo → tanque ── */}
      <g className={`transition-opacity duration-300 ${dim('lluvia')}`}>
        {/* nube */}
        <g className="text-sky-300">
          <path
            d="M28 34 q -8 0 -8 -8 q 0 -9 9 -9 q 2 -8 11 -8 q 8 0 10 7 q 9 -1 10 8 q 0 10 -10 10 z"
            fill="currentColor"
            opacity="0.85"
          />
          {/* gotas animadas (agua.css) */}
          <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="24" y1="40" x2="24" y2="46" className="agua-gota" />
            <line x1="38" y1="40" x2="38" y2="46" className="agua-gota agua-gota--2" />
            <line x1="52" y1="40" x2="52" y2="46" className="agua-gota agua-gota--3" />
          </g>
        </g>
        {/* casa campesina: muro + techo a dos aguas */}
        <g>
          <rect x="18" y="86" width="44" height="26" rx="2" fill="currentColor" className="text-amber-200/70" />
          <path d="M12 88 L40 66 L68 88 Z" fill="currentColor" className="text-rose-400/80" />
          <rect x="34" y="96" width="12" height="16" rx="1.5" fill="currentColor" className="text-amber-900/70" />
        </g>
        {/* canal del alero al tanque */}
        <path
          d="M66 88 q 14 2 18 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-slate-400"
        />
        {/* tanque con nivel de agua */}
        <g>
          <rect x="80" y="96" width="22" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-300" />
          <rect x="83" y="103" width="16" height="8" rx="1.5" fill="currentColor" className="text-cyan-400/80 agua-hilo" />
        </g>
      </g>

      {/* ── ESTACIÓN 2 · riego: surco + mata + goteo ── */}
      <g className={`transition-opacity duration-300 ${dim('riego')}`}>
        {/* surcos */}
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-amber-600/70">
          <path d="M138 112 q 12 -6 24 0" fill="none" />
          <path d="M168 112 q 12 -6 24 0" fill="none" />
          <path d="M198 112 q 12 -6 24 0" fill="none" />
        </g>
        {/* mata de maíz estilizada en el surco del medio */}
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" className="text-lime-400">
          <line x1="180" y1="108" x2="180" y2="78" />
          <path d="M180 98 q -10 -3 -14 -12" />
          <path d="M180 92 q 10 -3 14 -12" />
          <path d="M180 84 q -8 -2 -11 -10" />
        </g>
        {/* manguera de goteo con su gota */}
        <path d="M120 100 q 40 -14 54 -8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 6" className="text-cyan-300" />
        <g className="text-cyan-300">
          <line x1="174" y1="96" x2="174" y2="102" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="agua-gota agua-gota--2" />
        </g>
      </g>

      {/* ── ESTACIÓN 3 · cuidar: loma, monte nativo y nacimiento ── */}
      <g className={`transition-opacity duration-300 ${dim('cuidar')}`}>
        {/* loma */}
        <path
          d="M240 112 Q 292 58 352 108"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-emerald-600/80"
        />
        {/* árboles nativos (copas redondas de trazo) */}
        <g className="text-emerald-400">
          <line x1="284" y1="84" x2="284" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="284" cy="62" r="9" fill="currentColor" opacity="0.85" />
          <line x1="304" y1="80" x2="304" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="304" cy="61" r="7" fill="currentColor" opacity="0.7" />
          <line x1="266" y1="92" x2="266" y2="82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="266" cy="76" r="6" fill="currentColor" opacity="0.7" />
        </g>
        {/* ojo de agua + hilo que baja de la loma */}
        <g className="text-cyan-300">
          <circle cx="288" cy="94" r="4.5" fill="currentColor" className="agua-hilo" />
          <path
            d="M288 98 q -4 8 2 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="agua-hilo"
          />
        </g>
        {/* cerca de protección (dos postes con cuerda) */}
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500/80">
          <line x1="258" y1="112" x2="258" y2="100" />
          <line x1="318" y1="112" x2="318" y2="100" />
          <path d="M258 103 q 30 -6 60 0" fill="none" strokeDasharray="4 4" />
        </g>
      </g>
    </svg>
  );
}

import React from 'react';

/**
 * LaminaSiembra — la ilustración insignia del mundo "Tubérculos y raíces".
 *
 * SVG propio (nada de stock), de cuaderno de campo: las TRES formas de sembrar
 * un tubérculo o raíz, de izquierda a derecha —
 *
 *   TUBÉRCULO-SEMILLA  una papa brotada enterrada en el surco   (papa, oca…)
 *   ESQUEJE / ESTACA   un trozo de tallo (cangre) inclinado     (yuca, batata)
 *   COLINO (HIJUELO)   el hijuelo del cuello de la mata madre   (arracacha)
 *
 * Es DECORATIVA (aria-hidden): acompaña al explicador "casi ninguno se siembra
 * de semilla" del hub; las tarjetas de al lado son la navegación real. La forma
 * que se quiera resaltar sube su opacidad y baja la de las otras (prop `activo`),
 * igual que CaminoDelAgua en el mundo Agua; sin `activo` se ven las tres parejas.
 *
 * Trazo: línea redondeada, formas simples, colores en clases Tailwind sobre
 * currentColor por grupo para respirar con los temas.
 *
 * @param {Object} props
 * @param {'tuberculo'|'esqueje'|'colino'|null} [props.activo] forma resaltada.
 * @param {string} [props.className] clases extra sobre el <svg> raíz.
 */
export default function LaminaSiembra({ activo = null, className }) {
  const dim = (id) => (activo && activo !== id ? 'opacity-40' : 'opacity-100');
  return (
    <svg
      viewBox="0 0 360 120"
      role="img"
      aria-hidden="true"
      className={['w-full h-auto select-none', className].filter(Boolean).join(' ')}
      data-testid="lamina-siembra"
    >
      {/* línea de tierra que une las tres formas */}
      <path
        d="M6 84 Q 90 79 180 84 T 354 82"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-amber-700/60"
      />

      {/* ── FORMA 1 · tubérculo-semilla: papa brotada en el surco ── */}
      <g className={`transition-opacity duration-300 ${dim('tuberculo')}`}>
        {/* montículo de tierra */}
        <path d="M18 84 q 30 -20 60 0 z" fill="currentColor" className="text-amber-900/40" />
        {/* la papa-semilla enterrada */}
        <ellipse cx="48" cy="80" rx="15" ry="10" fill="currentColor" className="text-amber-300/80" />
        {/* ojos de la papa */}
        <g className="text-amber-800/70">
          <circle cx="42" cy="78" r="1.4" fill="currentColor" />
          <circle cx="52" cy="82" r="1.4" fill="currentColor" />
          <circle cx="55" cy="76" r="1.4" fill="currentColor" />
        </g>
        {/* brotes que salen a la superficie */}
        <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" className="text-lime-400">
          <path d="M45 71 q -3 -14 -8 -22" />
          <path d="M40 55 q -7 -2 -10 -8" />
          <path d="M51 71 q 3 -12 9 -18" />
          <path d="M58 57 q 7 -2 10 -7" />
        </g>
      </g>

      {/* ── FORMA 2 · esqueje / estaca: cangre de yuca inclinado ── */}
      <g className={`transition-opacity duration-300 ${dim('esqueje')}`}>
        {/* montículo */}
        <path d="M150 84 q 30 -18 60 0 z" fill="currentColor" className="text-amber-900/40" />
        {/* la estaca (trozo de tallo) enterrada 2/3, inclinada */}
        <line x1="168" y1="92" x2="196" y2="44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-amber-700/80" />
        {/* nudos / yemas del cangre */}
        <g className="text-lime-300">
          <circle cx="176" cy="78" r="2.2" fill="currentColor" />
          <circle cx="184" cy="64" r="2.2" fill="currentColor" />
          <circle cx="192" cy="50" r="2.2" fill="currentColor" />
        </g>
        {/* brote de la yema de arriba */}
        <path d="M192 50 q 8 -3 12 -11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-lime-400" />
        {/* raicillas que salen de la parte enterrada */}
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" className="text-amber-200/70">
          <path d="M170 86 q -6 5 -8 12" />
          <path d="M174 88 q 2 7 -1 13" />
          <path d="M178 88 q 7 5 8 12" />
        </g>
      </g>

      {/* ── FORMA 3 · colino: hijuelo del cuello de la mata madre ── */}
      <g className={`transition-opacity duration-300 ${dim('colino')}`}>
        {/* montículo */}
        <path d="M282 84 q 30 -18 60 0 z" fill="currentColor" className="text-amber-900/40" />
        {/* la cepa / cuello de la arracacha (media enterrada) */}
        <path d="M300 84 q 12 -16 24 0 z" fill="currentColor" className="text-amber-400/70" />
        {/* el colino (hijuelo) que se separa, inclinado con su yema arriba */}
        <line x1="312" y1="72" x2="322" y2="46" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-lime-600/80" />
        <circle cx="322" cy="45" r="2.6" fill="currentColor" className="text-lime-300" />
        {/* hojas de la mata madre saliendo del cuello */}
        <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" className="text-emerald-400">
          <path d="M308 70 q -6 -14 -12 -20" />
          <path d="M312 68 q 0 -16 -2 -24" />
        </g>
      </g>
    </svg>
  );
}

import React from 'react';

/**
 * DistanciasFinca — ilustración "la regla de las distancias" del módulo Agua.
 *
 * Un corte de la finca visto de lado (mismo trazo de cuaderno de campo que
 * CaminoDelAgua): el AGUA en el centro-bajo del valle, la franja de MONTE que
 * la protege (verde) y, ladera arriba, los focos de riesgo que hay que ALEJAR
 * (rojo), cada uno con su metraje mínimo. Enseña de un vistazo la idea clave:
 * lo verde se deja pegado al agua; lo rojo se manda lejos y aguas abajo.
 *
 * DECORATIVA (aria-hidden): la información autoritativa (metros + norma) va en
 * la lista de texto que la acompaña en AguaScreen. Los metros se leen de las
 * props para que el dibujo y la lista nunca se desincronicen.
 *
 * @param {{ items?: Array<{id:string, metros:number}> }} props
 */
export default function DistanciasFinca({ items = [] }) {
  const m = Object.fromEntries(items.map((d) => [d.id, d.metros]));
  const nac = m.nacimiento ?? 100;
  const cauce = m.cauce ?? 30;
  const sept = m.septico ?? 30;
  const fumT = m['fumigacion-terrestre'] ?? 10;
  const fumA = m['fumigacion-aerea'] ?? 100;

  return (
    <svg
      viewBox="0 0 360 168"
      role="img"
      aria-hidden="true"
      className="w-full h-auto select-none"
      data-testid="distancias-finca"
    >
      {/* ladera: el terreno baja hacia el agua en el centro */}
      <path
        d="M6 150 Q 90 150 176 132 Q 184 129 192 132 Q 278 150 354 150"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-amber-700/60"
      />
      {/* flecha "aguas abajo" bajo la ladera derecha */}
      <g className="text-slate-500">
        <path d="M300 160 L336 160" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 4" />
        <path d="M330 156 L338 160 L330 164 Z" fill="currentColor" />
      </g>
      <text x="300" y="157" className="fill-current text-slate-500" fontSize="7" textAnchor="end">aguas abajo</text>

      {/* ── AGUA en el centro (nacimiento + hilo que baja) ── */}
      <g className="text-cyan-300">
        <ellipse cx="184" cy="134" rx="15" ry="5.5" fill="currentColor" opacity="0.85" className="agua-hilo" />
        <circle cx="184" cy="132" r="4.5" fill="currentColor" className="agua-hilo" />
      </g>
      <text x="184" y="150" className="fill-current text-cyan-200" fontSize="8" fontWeight="700" textAnchor="middle">el agua</text>

      {/* ── FRANJA DE MONTE que protege (verde) — pegada al agua ── */}
      <g className="text-emerald-400">
        {/* copas de monte nativo a lado y lado del ojo de agua */}
        <g>
          <line x1="160" y1="128" x2="160" y2="116" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="160" cy="110" r="7" fill="currentColor" opacity="0.85" />
          <line x1="146" y1="132" x2="146" y2="122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="146" cy="117" r="5.5" fill="currentColor" opacity="0.7" />
          <line x1="208" y1="128" x2="208" y2="116" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="208" cy="110" r="7" fill="currentColor" opacity="0.85" />
          <line x1="222" y1="132" x2="222" y2="122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="222" cy="117" r="5.5" fill="currentColor" opacity="0.7" />
        </g>
      </g>
      {/* corchete verde de la franja protegida */}
      <g className="text-emerald-500">
        <path d="M132 100 L132 94 L236 94 L236 100" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <text x="184" y="88" className="fill-current text-emerald-300" fontSize="8" fontWeight="700" textAnchor="middle">
        dejar monte: {cauce} m quebrada · {nac} m nacimiento
      </text>

      {/* ── RIESGOS que hay que ALEJAR (rojo), ladera arriba ── */}
      {/* letrina / pozo séptico, a la derecha y aguas abajo */}
      <g className="text-rose-400">
        <rect x="286" y="120" width="18" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M286 120 L295 112 L304 120 Z" fill="currentColor" opacity="0.85" />
        {/* línea de retiro al agua */}
        <path d="M200 138 L286 132" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 4" />
      </g>
      <text x="295" y="150" className="fill-current text-rose-300" fontSize="7.5" fontWeight="700" textAnchor="middle">letrina {sept} m</text>

      {/* fumigación con bomba de espalda, a la izquierda */}
      <g className="text-rose-400">
        {/* figura simple: persona con bomba */}
        <circle cx="70" cy="112" r="4" fill="currentColor" opacity="0.85" />
        <line x1="70" y1="116" x2="70" y2="128" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="70" y1="120" x2="80" y2="116" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* rociado */}
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
          <line x1="81" y1="115" x2="88" y2="112" />
          <line x1="81" y1="117" x2="89" y2="117" />
          <line x1="81" y1="119" x2="88" y2="122" />
        </g>
        <path d="M96 128 L160 134" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 4" />
      </g>
      <text x="72" y="140" className="fill-current text-rose-300" fontSize="7.5" fontWeight="700" textAnchor="middle">fumigar +{fumT} m</text>

      {/* avioneta arriba (fumigación aérea) */}
      <g className="text-rose-400">
        <path d="M40 34 l16 0 l6 -5 l-3 5 l10 0 l-8 4 l-21 0 z" fill="currentColor" opacity="0.8" />
      </g>
      <text x="52" y="52" className="fill-current text-rose-300" fontSize="7.5" fontWeight="700" textAnchor="middle">avioneta +{fumA} m</text>

      {/* leyenda de color */}
      <g fontSize="7.5" fontWeight="700">
        <circle cx="250" cy="16" r="3.5" className="fill-current text-emerald-400" />
        <text x="258" y="19" className="fill-current text-emerald-300">proteger (dejar monte)</text>
        <circle cx="250" cy="30" r="3.5" className="fill-current text-rose-400" />
        <text x="258" y="33" className="fill-current text-rose-300">alejar (retirar el riesgo)</text>
      </g>
    </svg>
  );
}

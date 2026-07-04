import React from 'react';

/**
 * CieloENSO — ilustración SVG propia del cielo de la finca, dibujada según la
 * FAMILIA ENSO en vivo. Es la "portada" del módulo El clima que viene:
 *
 *   nino    → sol grande con rayos y suelo reseco (poca lluvia, más calor).
 *   nina    → nubes cargadas con lluvia cayendo (exceso de agua).
 *   neutral → sol asomando entre nubes (patrón normal).
 *
 * Cuaderno de campo: trazo simple, colores del tema vía currentText/clases
 * Tailwind (no fija color de tema, reacciona a data-theme como el resto). Las
 * animaciones viven en clima.css y se apagan con prefers-reduced-motion.
 *
 * @param {{ family?: 'nino'|'nina'|'neutral' }} props
 */
export default function CieloENSO({ family = 'neutral' }) {
  return (
    <svg
      viewBox="0 0 220 120"
      className="w-full h-auto max-h-40"
      role="img"
      aria-label={
        family === 'nino'
          ? 'Cielo despejado y soleado: fase El Niño'
          : family === 'nina'
            ? 'Nubes con lluvia: fase La Niña'
            : 'Sol entre nubes: fase neutral'
      }
      data-testid="cielo-enso"
      data-family={family}
    >
      {/* Suelo / horizonte: reseco en Niño, húmedo en Niña */}
      <rect
        x="0" y="98" width="220" height="22"
        className={
          family === 'nino'
            ? 'text-amber-700/40'
            : family === 'nina'
              ? 'text-emerald-800/50'
              : 'text-emerald-700/30'
        }
        fill="currentColor"
      />

      {family === 'nino' && (
        <g data-testid="cielo-sol">
          {/* Rayos del sol (pulsan) */}
          <g className="clima-sol-rayos text-amber-400" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * Math.PI) / 6;
              const cx = 110; const cy = 52;
              return (
                <line
                  key={i}
                  x1={cx + Math.cos(a) * 26}
                  y1={cy + Math.sin(a) * 26}
                  x2={cx + Math.cos(a) * 36}
                  y2={cy + Math.sin(a) * 36}
                />
              );
            })}
          </g>
          <circle cx="110" cy="52" r="20" className="text-amber-300" fill="currentColor" />
          {/* Grietas de tierra seca */}
          <g className="text-amber-800/60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M30 108 l14 4 M70 106 l10 6 M150 108 l14 3 M190 105 l-10 7" fill="none" />
          </g>
        </g>
      )}

      {family === 'nina' && (
        <g data-testid="cielo-lluvia">
          {/* Nube cargada */}
          <g className="clima-nube-deriva text-slate-400" fill="currentColor">
            <ellipse cx="90" cy="48" rx="34" ry="20" />
            <ellipse cx="120" cy="42" rx="26" ry="18" />
            <ellipse cx="140" cy="52" rx="22" ry="15" />
            <rect x="60" y="48" width="88" height="16" rx="8" />
          </g>
          {/* Lluvia */}
          <g className="text-sky-400" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            {[70, 90, 110, 130, 150].map((x, i) => (
              <line
                key={x}
                x1={x} y1="70" x2={x - 4} y2="86"
                className={`clima-gota clima-gota--${(i % 3) + 1}`}
              />
            ))}
          </g>
        </g>
      )}

      {family === 'neutral' && (
        <g data-testid="cielo-mixto">
          {/* Sol asomando */}
          <circle cx="72" cy="46" r="17" className="text-amber-300/90" fill="currentColor" />
          <g className="clima-sol-rayos text-amber-400/80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              return (
                <line
                  key={i}
                  x1={72 + Math.cos(a) * 22}
                  y1={46 + Math.sin(a) * 22}
                  x2={72 + Math.cos(a) * 29}
                  y2={46 + Math.sin(a) * 29}
                />
              );
            })}
          </g>
          {/* Nube que deriva, tapando parte del sol */}
          <g className="clima-nube-deriva text-slate-300" fill="currentColor">
            <ellipse cx="130" cy="52" rx="32" ry="18" />
            <ellipse cx="158" cy="46" rx="22" ry="15" />
            <rect x="104" y="52" width="72" height="14" rx="7" />
          </g>
        </g>
      )}
    </svg>
  );
}

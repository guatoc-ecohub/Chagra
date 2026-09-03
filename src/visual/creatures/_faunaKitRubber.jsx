/*
 * Kit de primitivas RUBBER-HOSE compartidas por la fauna benéfica (Cuphead /
 * Miss Minutes de Loki), fusionado con lo andino. Interno de la librería — NO
 * se exporta desde el barrel. Solo COMPONENTES (sin exports de objetos), para
 * conservar el Fast Refresh.
 *
 * Vocabulario visual:
 *   - línea de tinta GRUESA que respira (boil) — `INK`, strokeLinejoin round.
 *   - OJOS DE GOMA con pupila expresiva (mira a donde va el bicho) y brillo.
 *   - miembros tipo MANGUERA (ancho constante, cabos redondos) — rubber-hose.
 *   - CINTA DE ROL con rombos andinos: comunica qué hace el aliado, sin ruido.
 */
import { INK, HUESO } from './_faunaRubberTokens.js';

/** Filtros/gradientes por instancia (ids únicos vía useId en cada criatura). */
export function RubberDefs({ glow, shine }) {
  return (
    <defs>
      <filter id={glow} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <radialGradient id={shine} cx="34%" cy="26%" r="78%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.07" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/**
 * Ojo de goma expresivo. `look=[dx,dy]` en rango ~[-1,1] mueve la pupila hacia
 * donde el bicho mira (hacia su rumbo / hacia lo que cuida). `blink` activa el
 * parpadeo. `feliz` dibuja el párpado superior curvo (mirada tierna).
 */
export function RubberEye({
  cx,
  cy,
  r = 3.4,
  look = [0, 0],
  ink = INK,
  blink = false,
  feliz = false,
}) {
  const lx = cx + (look[0] || 0) * r * 0.42;
  const ly = cy + (look[1] || 0) * r * 0.42;
  const pr = r * 0.56;
  return (
    <g className={blink ? 'frh-blink' : undefined}>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.08} fill={HUESO} stroke={ink} strokeWidth={r * 0.3} />
      <circle cx={lx} cy={ly} r={pr} fill={ink} />
      <circle cx={lx - pr * 0.34} cy={ly - pr * 0.42} r={pr * 0.34} fill={HUESO} />
      {feliz && (
        <path
          d={`M${cx - r * 1.05},${cy - r * 0.35} Q${cx},${cy - r * 1.5} ${cx + r * 1.05},${cy - r * 0.35}`}
          fill="none"
          stroke={ink}
          strokeWidth={r * 0.34}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/**
 * Miembro tipo manguera (rubber-hose): trazo de ancho constante con cabos
 * redondos y un pie/bolita al final. `d` = el path del tubo.
 */
export function HoseLimb({ d, ink = INK, w = 2.4, foot, footR = undefined }) {
  const fr = footR ?? w * 0.72;
  return (
    <g>
      <path d={d} fill="none" stroke={ink} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      {foot && <circle cx={foot[0]} cy={foot[1]} r={fr} fill={ink} />}
    </g>
  );
}

/**
 * Cinta de ROL con rombos andinos a los lados. Comunica qué hace el aliado por
 * la finca ("poliniza", "controla plagas", …) de forma bella. `texto` viene del
 * verbo del rol; el ancho se ajusta al largo del texto.
 */
export function RolCinta({ x = 0, y = 0, texto, color, ink = INK, ancho = 46 }) {
  const w = ancho;
  const h = 11;
  const rb = 3.1; // rombo andino
  const tl = Math.max(10, w - 18); // el texto se ajusta al ancho (cabe siempre)
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={ink} strokeWidth="1.2" />
      {/* rombos andinos como remates */}
      <path d={`M${-w / 2 + 5},${-rb} L${-w / 2 + 5 + rb},0 L${-w / 2 + 5},${rb} L${-w / 2 + 5 - rb},0 Z`} fill={HUESO} opacity="0.9" />
      <path d={`M${w / 2 - 5},${-rb} L${w / 2 - 5 + rb},0 L${w / 2 - 5},${rb} L${w / 2 - 5 - rb},0 Z`} fill={HUESO} opacity="0.9" />
      <text
        x="0"
        y="2.4"
        textAnchor="middle"
        textLength={tl}
        lengthAdjust="spacingAndGlyphs"
        fontSize="6"
        fontWeight="800"
        fontFamily="'Baloo 2','Fredoka',system-ui,-apple-system,sans-serif"
        letterSpacing="0.1"
        fill={HUESO}
      >
        {texto}
      </text>
    </g>
  );
}

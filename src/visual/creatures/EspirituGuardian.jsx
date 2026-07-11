import { useId } from 'react';
import './espiritu-guardian.css';

/* Espíritu guardián de la finca — rubber-hose (Cuphead / Miss-Minutes) con alma
   ANDINA. NO es fauna concreta ni mascota infantil: es el AVATAR del estado vivo
   de la finca (hermano del "guardián/espíritu" del lado juegos —
   dashboard/GuardianEspiritu, vitalidadEspirituService). Comparte el lenguaje de
   Angelita (aura viva, glow orgánico, cuerpo cálido, solo transform/opacity) pero
   es PERSONAJE PROPIO: sereno, protector, envuelto en su ruana andina y coronado
   por un brote (guarda lo que crece).

   Rubber-hose de manual: cuerpo perfectamente redondo, ojos-pastel (pie eyes),
   brazos noodle sin codo que terminan en guantes blancos, squash & stretch al
   respirar. La coreografía de LLEGADA vive en la escena que lo consume; aquí solo
   el cuerpo + su vida perpetua.

   CONTRATO DE ESTADO: refleja el estado real de la finca por prop `estado`
   ('sereno' | 'alerta' | 'celebrando'). No fabrica dato: si no hay estado (o es
   desconocido) → NEUTRO SERENO. `energia` (0..1) solo modula la intensidad del
   aura, nunca inventa un ánimo.

   Solo transform/opacity (GPU). reduced-motion / device-tier bajo => quieto. */
const VIEWBOX = '-26 -30 52 60';

/* Paletas + expresión por estado. Cálidas y maduras — nunca chillonas.
   `aura` = halo; `core`/`coreHi` = cuerpo del espíritu; el resto son rasgos. */
const ESTADOS = {
  sereno: {
    aura: '#f4c66a',
    core: '#f6ecd6',
    coreHi: '#fff7e4',
    auraBase: 0.2,
    // ojos calmos, boca de sonrisa mínima, cejas relajadas
    ceja: 'M-6.6,-14.6 Q-4,-15.4 -1.6,-14.6 M1.6,-14.6 Q4,-15.4 6.6,-14.6',
    boca: 'M-2.6,-6 Q0,-4.2 2.6,-6',
    // guantes en reposo, apenas abiertos (postura protectora serena)
    manoL: { x: -16, y: 6 }, manoR: { x: 16, y: 6 },
    brazoL: 'M-11,-1 C-15,1 -17,3 -16.5,6',
    brazoR: 'M11,-1 C15,1 17,3 16.5,6',
    hop: false, chispas: false,
  },
  alerta: {
    aura: '#ffb352',
    core: '#f3e4c4',
    coreHi: '#fff2d2',
    auraBase: 0.26,
    // cejas alzadas hacia afuera, boca en tensión suave (atento, no asustado)
    ceja: 'M-7,-15.4 Q-4.2,-16.6 -1.6,-15.2 M1.6,-15.2 Q4.2,-16.6 7,-15.4',
    boca: 'M-2.2,-5.4 Q0,-6.4 2.2,-5.4',
    // brazos alzados hacia afuera: gesto de guarda / escudo
    manoL: { x: -18, y: -4 }, manoR: { x: 18, y: -4 },
    brazoL: 'M-11,-1 C-16,-2 -18,-3 -18.5,-4',
    brazoR: 'M11,-1 C16,-2 18,-3 18.5,-4',
    hop: false, chispas: false,
  },
  celebrando: {
    aura: '#ffd772',
    core: '#f9efd6',
    coreHi: '#fffaea',
    auraBase: 0.3,
    // cejas felices arriba, boca abierta sonriente
    ceja: 'M-6.8,-15.4 Q-4,-16 -1.6,-15.4 M1.6,-15.4 Q4,-16 6.8,-15.4',
    boca: 'M-3,-6 Q0,-2 3,-6 Q0,-5 -3,-6 Z',
    // brazos arriba, festejando
    manoL: { x: -14, y: -19 }, manoR: { x: 14, y: -19 },
    brazoL: 'M-10,-3 C-13,-9 -14,-14 -14.5,-19',
    brazoR: 'M10,-3 C13,-9 14,-14 14.5,-19',
    hop: true, chispas: true,
  },
};

/** Un guante blanco rubber-hose (mitón redondo con pulgar). */
function Guante({ x, y, sombra = '#d9caa8' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="3.2" fill="#fdfcf4" stroke={sombra} strokeWidth="0.5" />
      <circle cx="-2.4" cy="-1.4" r="1.5" fill="#fdfcf4" stroke={sombra} strokeWidth="0.5" />
      <path d="M-2.6,2.4 A3.2,3.2 0 0 0 2.6,2.4" fill="none" stroke={sombra} strokeWidth="0.5" opacity="0.7" />
    </g>
  );
}

/** Un ojo-pastel (pie eye) con muesca en cuña y brillo. */
function OjoPastel({ cx, cy, core }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r="2.7" fill="#241a0c" />
      {/* cuña recortada (el "pie") pintada del color del cuerpo */}
      <path d="M0,0 L2.7,1.4 A2.7,2.7 0 0 1 0.6,2.6 Z" fill={core} />
      {/* destello vivo */}
      <circle cx="-0.9" cy="-0.9" r="0.85" fill="#fffaea" />
    </g>
  );
}

export function EspirituGuardian({
  size = 72,
  className = '',
  inline = false,
  animated = true,
  reducedMotion = false,
  tier = 'alto',
  estado = 'sereno',
  energia = 1,
  title = 'Espíritu guardián de su finca',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `eg-glow-${uid}`;
  const blur = `eg-blur-${uid}`;

  const s = ESTADOS[estado] || ESTADOS.sereno;
  const e = Math.max(0.35, Math.min(1, energia));
  const auraOp = s.auraBase + 0.4 * e;

  // ¿respira? animado + sin reduced-motion + device-tier con margen.
  const vivo = animated && !reducedMotion && tier !== 'bajo' && tier !== '2d';
  const floatCls = vivo
    ? `eg-float${s.hop ? ' eg-celebra' : ''}${estado === 'alerta' ? ' eg-alerta' : ''}`
    : '';
  const auraCls = vivo ? 'eg-aura' : '';
  const armCls = vivo ? 'eg-arm' : '';
  const blinkCls = vivo ? 'eg-blink' : '';

  const defs = (
    <defs>
      {/* glow orgánico compartido con la familia (feMerge), ids únicos por useId */}
      <filter id={glow} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.1" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={blur}>
        <feGaussianBlur stdDeviation="3.4" />
      </filter>
    </defs>
  );

  const body = (
    <g className="eg-root">
      {/* aura viva: el halo que refleja el estado/energía de la finca */}
      <circle className={auraCls} r="21" cx="0" cy="-3" fill={s.aura} opacity={auraOp}
        filter={`url(#${blur})`} />

      {/* brazos noodle + guantes blancos (detrás del cuerpo, uno mece desfasado) */}
      <g className={armCls}>
        <path d={s.brazoL} fill="none" stroke={s.core} strokeWidth="3.4" strokeLinecap="round" />
        <Guante x={s.manoL.x} y={s.manoL.y} />
      </g>
      <g className={`${armCls} eg-arm-r`}>
        <path d={s.brazoR} fill="none" stroke={s.core} strokeWidth="3.4" strokeLinecap="round" />
        <Guante x={s.manoR.x} y={s.manoR.y} />
      </g>

      {/* el cuerpo que respira (squash & stretch) */}
      <g className={floatCls}>
        <g filter={`url(#${glow})`}>
          {/* brote coronando: guarda lo que crece (tallito + dos hojas) */}
          <path d="M0,-24 C0,-27 0,-28.5 0,-29.5" stroke="#5a8f3c" strokeWidth="1.3"
            fill="none" strokeLinecap="round" />
          <path d="M0,-27.4 C-2.6,-28 -4.2,-29.6 -4.2,-31.4 C-1.8,-31 -0.2,-29.4 0,-27.4 Z"
            fill="#6fae49" />
          <path d="M0,-28.4 C2.4,-28.8 3.9,-30.2 3.9,-31.9 C1.7,-31.6 0.2,-30.2 0,-28.4 Z"
            fill="#5a8f3c" />

          {/* cuerpo-espíritu: cúpula redonda arriba, base con tres ondas de niebla */}
          <path d="M-12,-4
                   C-14,-16 -8,-24 0,-24
                   C8,-24 14,-16 12,-4
                   C11,5 12,13 8,18
                   C6,21.4 4,20 2,17.4
                   C0.6,20.6 -0.6,20.6 -2,17.4
                   C-4,20 -6,21.4 -8,18
                   C-12,13 -11,5 -12,-4 Z"
            fill={s.core} />
          {/* sheen: brillo suave del lomo (mismo recurso que Angelita) */}
          <ellipse cx="-3.4" cy="-13" rx="5.4" ry="3.4" fill={s.coreHi} opacity="0.7" />

          {/* ruana andina: poncho drapeado con cuello en V + franja (chumbe) */}
          <path d="M-11,-2 C-6,-5 6,-5 11,-2 L8,9 C3,11 -3,11 -8,9 Z"
            fill="#b8532f" />
          <path d="M-11,-2 C-6,-5 6,-5 11,-2 L8,9 C3,11 -3,11 -8,9 Z"
            fill="none" stroke="#8a3a1e" strokeWidth="0.5" opacity="0.5" />
          <path d="M-9.4,2.6 C-3,4.4 3,4.4 9.4,2.6" fill="none" stroke="#e8b95c"
            strokeWidth="1.6" opacity="0.9" />
          <path d="M-9.8,4.8 C-3,6.4 3,6.4 9.8,4.8" fill="none" stroke="#7fae4f"
            strokeWidth="0.9" opacity="0.75" />
          {/* cuello en V de la ruana */}
          <path d="M-2.2,-3.4 L0,0 L2.2,-3.4" fill="none" stroke="#8a3a1e"
            strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
          {/* flecos del ruedo */}
          <path d="M-6,10 L-6.4,12 M-2.5,10.8 L-2.6,12.9 M2.5,10.8 L2.6,12.9 M6,10 L6.4,12"
            stroke="#8a3a1e" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />

          {/* rostro sereno: cachetes, cejas, ojos-pastel y boca por estado */}
          <ellipse cx="-6.6" cy="-9.4" rx="2.1" ry="1.4" fill="#f0a86e" opacity="0.4" />
          <ellipse cx="6.6" cy="-9.4" rx="2.1" ry="1.4" fill="#f0a86e" opacity="0.4" />
          <path d={s.ceja} fill="none" stroke="#3a2a12" strokeWidth="1" strokeLinecap="round" />
          <g className={blinkCls}>
            <OjoPastel cx={-4} cy={-11} core={s.core} />
            <OjoPastel cx={4} cy={-11} core={s.core} />
          </g>
          <path d={s.boca} fill={estado === 'celebrando' ? '#7a3418' : 'none'}
            stroke="#3a2a12" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* chispas de celebración (titilan; solo estado 'celebrando') */}
      {s.chispas && (
        <g fill={s.aura}>
          <path className={`eg-spark`} d="M-16,-14 l1,3 l3,1 l-3,1 l-1,3 l-1,-3 l-3,-1 l3,-1 Z" />
          <path className={`eg-spark eg-spark-2`} d="M17,-10 l0.8,2.4 l2.4,0.8 l-2.4,0.8 l-0.8,2.4 l-0.8,-2.4 l-2.4,-0.8 l2.4,-0.8 Z" />
          <path className={`eg-spark eg-spark-3`} d="M13,-22 l0.7,2 l2,0.7 l-2,0.7 l-0.7,2 l-0.7,-2 l-2,-0.7 l2,-0.7 Z" />
        </g>
      )}
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="espiritu-guardian" data-estado={estado}>
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="espiritu-guardian" data-estado={estado} {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default EspirituGuardian;

import React from 'react';
import './campo-states.css';

/**
 * EmptyStateCampo — estado vacío con identidad de cuaderno de campo.
 *
 * Cada variante es una viñeta SVG dibujada "a tinta" (trazo redondeado, gris
 * cálido) sobre la misma línea de suelo del ChagraGrowLoader, con UN solo
 * elemento vivo por escena (brote esmeralda o fermento ámbar) que respira
 * lentamente. Nada de iconos genéricos apagados: un vacío en Chagra es una
 * chagra que espera siembra, no un error.
 *
 * Componente PURAMENTE presentacional: sin estado, sin efectos, sin fetch.
 *
 * @param {object} props
 * @param {'directorio'|'busqueda'|'bodega'|'bitacora'} [props.variant]
 * @param {React.ReactNode} [props.title]   - frase principal (mantener negación explícita: "Sin…", "No hay…").
 * @param {React.ReactNode} [props.hint]    - guía de qué hacer para llenar este espacio.
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children] - contenido extra (ej. CTA) debajo del hint.
 */

// Paleta de la viñeta (sobre slate-900/950):
const INK = '#94a3b8'; // trazo principal (slate-400)
const INK_SOFT = '#64748b'; // trazo secundario (slate-500)
const TIERRA = '#8b7d6b'; // suelo y surcos, gris cálido
const MIMBRE = '#b08954'; // canasto / madera
const PAGINA = '#1e293b'; // relleno de páginas del cuaderno
const BROTE = '#34d399'; // el elemento vivo (emerald-400)
const BROTE_CLARO = '#6ee7b7';
const SOL = '#fbbf24'; // amber-400

/** Línea de suelo compartida por todas las escenas. */
const Suelo = () => (
  <line x1="18" y1="88" x2="142" y2="88" stroke={TIERRA} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
);

/** Sol pequeño con rayos cortos; es el punto cálido de la escena. */
const Sol = ({ cx = 128, cy = 20 }) => (
  <g className="esc-vivo" stroke={SOL} strokeWidth="1.4" strokeLinecap="round" fill="none">
    <circle cx={cx} cy={cy} r="6" />
    <line x1={cx - 11} y1={cy} x2={cx - 9} y2={cy} />
    <line x1={cx + 9} y1={cy} x2={cx + 11} y2={cy} />
    <line x1={cx} y1={cy - 11} x2={cx} y2={cy - 9} />
    <line x1={cx - 7.5} y1={cy - 7.5} x2={cx - 6} y2={cy - 6} />
    <line x1={cx + 6} y1={cy - 6} x2={cx + 7.5} y2={cy - 7.5} />
  </g>
);

/** Cerro andino al fondo, un trazo suave. */
const Cerro = () => (
  <path
    d="M18,60 Q46,32 70,54 Q88,68 108,56 Q126,46 142,58"
    fill="none"
    stroke={INK_SOFT}
    strokeWidth="1.2"
    strokeLinecap="round"
    opacity="0.4"
  />
);

/* ── Viñetas ──────────────────────────────────────────────────────────── */

// Directorio (primera vez): cuaderno de campo abierto con una hoja prensada.
const VignetteDirectorio = () => (
  <>
    <Cerro />
    <Sol />
    <Suelo />
    {/* Páginas abiertas */}
    <path d="M30,54 Q54,47 78,54 L78,86 Q54,79 30,86 Z" fill={PAGINA} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M126,54 Q102,47 78,54 L78,86 Q102,79 126,86 Z" fill={PAGINA} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    <line x1="78" y1="54" x2="78" y2="86" stroke={INK} strokeWidth="1.2" />
    {/* Apuntes en la página izquierda */}
    <g stroke={INK_SOFT} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7">
      <path d="M38,62 Q54,57 70,62" />
      <path d="M38,69 Q54,64 70,69" />
      <path d="M38,76 Q50,72 60,75" />
    </g>
    {/* Hoja prensada en la página derecha: lo único vivo */}
    <g className="esc-vivo">
      <path d="M94,60 Q108,60 112,74 Q98,76 92,66 Z" fill={BROTE} opacity="0.9" />
      <path d="M95,62 Q102,66 109,72" fill="none" stroke="#065f46" strokeWidth="1" strokeLinecap="round" />
    </g>
  </>
);

// Búsqueda sin resultados: lupa sobre los surcos, con un brote adentro.
const VignetteBusqueda = () => (
  <>
    <Cerro />
    {/* Surcos en perspectiva */}
    <g fill="none" stroke={TIERRA} strokeWidth="1.3" strokeLinecap="round">
      <path d="M24,88 Q80,74 136,88" opacity="0.5" />
      <path d="M32,80 Q80,68 128,80" opacity="0.4" />
      <path d="M40,72 Q80,63 120,72" opacity="0.3" />
    </g>
    {/* Brote dentro del lente: lo que todavía no está sembrado */}
    <g className="esc-vivo">
      <line x1="72" y1="60" x2="72" y2="48" stroke={BROTE} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M72,53 Q65,48 60,50 Q66,55 72,56 Z" fill={BROTE} />
      <path d="M72,50 Q79,45 84,47 Q78,52 72,53 Z" fill={BROTE_CLARO} />
    </g>
    {/* Lupa */}
    <circle cx="72" cy="52" r="17" fill="none" stroke={INK} strokeWidth="2" />
    <path d="M59,45 A15,15 0 0 1 66,38" fill="none" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    <line x1="84.5" y1="64.5" x2="100" y2="82" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    <Suelo />
  </>
);

// Bodega vacía: estante con frascos (un fermento vivo) y canasto con hojas.
const VignetteBodega = () => (
  <>
    {/* Estante */}
    <line x1="26" y1="46" x2="134" y2="46" stroke={MIMBRE} strokeWidth="2" strokeLinecap="round" />
    <line x1="34" y1="46" x2="30" y2="54" stroke={MIMBRE} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    <line x1="126" y1="46" x2="130" y2="54" stroke={MIMBRE} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    {/* Frasco 1 */}
    <g stroke={INK} strokeWidth="1.4" fill="none">
      <rect x="38" y="24" width="20" height="22" rx="3" />
      <rect x="41" y="19" width="14" height="5" rx="2" />
      <path d="M40,35 Q48,32 56,35" stroke={INK_SOFT} opacity="0.6" />
    </g>
    {/* Frasco 2: fermento vivo, burbujeando en ámbar */}
    <g className="esc-vivo">
      <rect x="70" y="20" width="20" height="26" rx="3" fill="rgba(251,191,36,0.08)" stroke={SOL} strokeWidth="1.4" />
      <rect x="73" y="15" width="14" height="5" rx="2" fill="none" stroke={SOL} strokeWidth="1.4" />
      <circle cx="76" cy="39" r="1.5" fill={SOL} opacity="0.7" />
      <circle cx="83" cy="33" r="2" fill={SOL} opacity="0.7" />
      <circle cx="79" cy="27" r="1.2" fill={SOL} opacity="0.7" />
    </g>
    {/* Frasco 3, más pequeño */}
    <g stroke={INK} strokeWidth="1.4" fill="none">
      <rect x="102" y="29" width="16" height="17" rx="3" />
      <rect x="104" y="25" width="12" height="4" rx="2" />
    </g>
    {/* Hojas frescas asomando del canasto */}
    <g className="esc-sway">
      <path d="M70,64 Q64,53 55,51 Q59,62 68,66 Z" fill={BROTE} opacity="0.9" />
      <path d="M88,63 Q94,53 103,52 Q98,62 90,66 Z" fill={BROTE_CLARO} opacity="0.9" />
    </g>
    {/* Canasto tejido */}
    <path d="M52,66 Q80,60 108,66 L102,85 Q80,89 58,85 Z" fill="rgba(176,137,84,0.12)" stroke={MIMBRE} strokeWidth="1.5" strokeLinejoin="round" />
    <g stroke={MIMBRE} strokeWidth="1" strokeLinecap="round" opacity="0.5">
      <line x1="63" y1="65" x2="65" y2="85" />
      <line x1="74" y1="63" x2="75" y2="87" />
      <line x1="86" y1="63" x2="86" y2="87" />
      <line x1="97" y1="65" x2="95" y2="85" />
    </g>
    <Suelo />
  </>
);

// Bitácora sin eventos: cuaderno con lápiz listo, la historia por escribir.
const VignetteBitacora = () => (
  <>
    <Sol cx={30} cy={20} />
    <Suelo />
    {/* Páginas abiertas */}
    <path d="M30,54 Q54,47 78,54 L78,86 Q54,79 30,86 Z" fill={PAGINA} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M126,54 Q102,47 78,54 L78,86 Q102,79 126,86 Z" fill={PAGINA} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    <line x1="78" y1="54" x2="78" y2="86" stroke={INK} strokeWidth="1.2" />
    {/* Lo ya escrito, desvaneciéndose hacia hoy */}
    <g stroke={INK_SOFT} strokeWidth="1.2" strokeLinecap="round" fill="none">
      <path d="M38,62 Q54,57 70,62" opacity="0.7" />
      <path d="M38,69 Q54,64 70,69" opacity="0.45" />
      <path d="M38,76 Q50,72 58,75" opacity="0.25" />
    </g>
    {/* Renglón que espera, punteado */}
    <path d="M90,64 Q100,61 112,63" fill="none" stroke={INK_SOFT} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 4" opacity="0.6" />
    {/* Lápiz recostado sobre la página derecha */}
    <g className="esc-vivo">
      <line x1="130" y1="42" x2="110" y2="66" stroke={MIMBRE} strokeWidth="4.5" strokeLinecap="round" />
      <line x1="131.5" y1="40" x2="134" y2="37" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M110,66 L103,75 L113,70 Z" fill="#d6c9a8" />
      <circle cx="103.8" cy="74" r="1.4" fill={BROTE} />
    </g>
  </>
);

const VIGNETTES = {
  directorio: VignetteDirectorio,
  busqueda: VignetteBusqueda,
  bodega: VignetteBodega,
  bitacora: VignetteBitacora,
};

export default function EmptyStateCampo({
  variant = 'directorio',
  title = null,
  hint = null,
  className = '',
  children = null,
}) {
  const Vignette = VIGNETTES[variant] || VignetteDirectorio;
  return (
    <div className={`flex flex-col items-center text-center px-6 ${className}`}>
      <svg
        className="esc-scene mb-3"
        viewBox="0 0 160 100"
        width="176"
        height="110"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <Vignette />
      </svg>
      {title && <p className="text-sm font-bold text-slate-200 leading-snug max-w-xs mx-auto">{title}</p>}
      {hint && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">{hint}</p>}
      {children}
    </div>
  );
}

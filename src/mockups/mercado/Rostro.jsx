import { useId } from 'react';

/*
 * Rostro — avatar ILUSTRADO (no foto) de un productor del mercado. Cara genérica
 * y ficticia, construida por parámetros (piel, pelo, tocado), para poner "la
 * cara de quien sembró" sin usar la imagen de ninguna persona real.
 *
 * Estética: retrato plano y cálido, de rótulo de mercado. Tocados campesinos
 * (sombrero de paja, pañuelo, ruana) para variedad. Reduced-motion irrelevante:
 * es estático.
 *
 * Props:
 *   seed  { piel, pelo, tocado, tocadoColor } — describe la cara.
 *   size  número (px). Defecto 56.
 *   className, title.
 */
export function Rostro({ seed, size = 56, className = '', title = 'Productor de la finca' }) {
  const s = seed || {};
  const piel = s.piel || '#c98a5e';
  const pelo = s.pelo || '#2b1d12';
  const tocado = s.tocado || 'ninguno';
  const tocadoColor = s.tocadoColor || '#c9a26a';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clip = `rostro-clip-${uid}`;

  // Sombra suave de la piel para dar volumen sin degradados costosos.
  const pielSombra = mezclar(piel, '#000000', 0.16);
  const pielLuz = mezclar(piel, '#ffffff', 0.14);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className || undefined}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>

      {/* disco de fondo */}
      <circle cx="50" cy="50" r="49" fill="#efe7d6" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#2c2418" strokeWidth="2" opacity="0.28" />

      <g clipPath={`url(#${clip})`}>
        {/* hombros / ruana */}
        <path
          d="M14,100 C16,80 30,70 50,70 C70,70 84,80 86,100 Z"
          fill={tocado === 'ruana' ? tocadoColor : '#6f5a3c'}
        />
        <path
          d="M50,70 L44,100 L56,100 Z"
          fill="#efe7d6"
          opacity={tocado === 'ruana' ? 0.85 : 0}
        />

        {/* cuello */}
        <rect x="43" y="60" width="14" height="16" rx="5" fill={pielSombra} />

        {/* pelo (detrás de la cara) */}
        {tocado !== 'panuelo' && (
          <path d="M25,52 C24,28 40,18 50,18 C60,18 76,28 75,52 C70,44 60,40 50,40 C40,40 30,44 25,52 Z" fill={pelo} />
        )}

        {/* cara */}
        <ellipse cx="50" cy="50" rx="23" ry="26" fill={piel} />
        <ellipse cx="61" cy="52" rx="9" ry="18" fill={pielSombra} opacity="0.35" />
        <ellipse cx="41" cy="46" rx="7" ry="11" fill={pielLuz} opacity="0.5" />

        {/* orejas */}
        <circle cx="27" cy="52" r="4.5" fill={piel} />
        <circle cx="73" cy="52" r="4.5" fill={piel} />

        {/* cejas + ojos */}
        <path d="M37,44 q4,-3 9,-1" stroke={pelo} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M54,43 q5,-2 9,1" stroke={pelo} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="42" cy="49" r="2.6" fill="#2c2418" />
        <circle cx="58" cy="49" r="2.6" fill="#2c2418" />
        <circle cx="42.9" cy="48.2" r="0.8" fill="#ffffff" />
        <circle cx="58.9" cy="48.2" r="0.8" fill="#ffffff" />

        {/* nariz + boca + mejillas */}
        <path d="M50,52 q-3,6 0,8" stroke={pielSombra} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M43,66 q7,6 14,0" stroke="#7a3f2a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="36" cy="60" r="3.5" fill="#d98a6a" opacity="0.35" />
        <circle cx="64" cy="60" r="3.5" fill="#d98a6a" opacity="0.35" />

        {/* pañuelo (tapa el pelo y ata bajo el mentón) */}
        {tocado === 'panuelo' && (
          <g>
            <path d="M24,50 C22,26 40,16 50,16 C60,16 78,26 76,50 C70,40 60,36 50,36 C40,36 30,40 24,50 Z" fill={tocadoColor} />
            <path d="M27,52 q23,-14 46,0" stroke="#ffffff" strokeWidth="1.6" opacity="0.35" fill="none" />
            <circle cx="34" cy="43" r="1.6" fill="#ffffff" opacity="0.6" />
            <circle cx="50" cy="38" r="1.6" fill="#ffffff" opacity="0.6" />
            <circle cx="66" cy="43" r="1.6" fill="#ffffff" opacity="0.6" />
          </g>
        )}
      </g>

      {/* sombrero de paja (por encima del clip para que el ala sobresalga) */}
      {tocado === 'sombrero' && (
        <g>
          <ellipse cx="50" cy="34" rx="40" ry="11" fill={mezclar(tocadoColor, '#000000', 0.12)} />
          <ellipse cx="50" cy="32" rx="40" ry="10" fill={tocadoColor} />
          <path d="M31,32 C31,16 41,10 50,10 C59,10 69,16 69,32 Z" fill={mezclar(tocadoColor, '#ffffff', 0.1)} />
          <path d="M31,31 q19,7 38,0" stroke={mezclar(tocadoColor, '#000000', 0.22)} strokeWidth="3" fill="none" opacity="0.7" />
          <ellipse cx="50" cy="32" rx="40" ry="10" fill="none" stroke={mezclar(tocadoColor, '#000000', 0.2)} strokeWidth="1.4" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

/* Mezcla lineal de dos colores hex (#rrggbb). t=0 → a, t=1 → b. Para sombras y
   luces del retrato sin degradados SVG. */
function mezclar(a, b, t) {
  const pa = hexAgb(a);
  const pb = hexAgb(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexAgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export default Rostro;

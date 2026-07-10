/*
 * ProductoIlustracion — dibujos SVG propios de cada producto del mercado. Planos
 * y cálidos, sobre fondo transparente (el color de la banda lo pone la tarjeta).
 * Sin imágenes externas: todo trazo propio. Cada dibujo cabe en un viewBox
 * 0 0 120 120 y se centra solo.
 *
 * Props:
 *   tipo   'tomate' | 'mora' | 'papa' | 'cafe' | 'miel' | 'aguacate'
 *   size   número (px). Defecto 120.
 *   className, title.
 */
export function ProductoIlustracion({ tipo, size = 120, className = '', title = '' }) {
  const dibujo = DIBUJOS[tipo] || DIBUJOS.tomate;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className || undefined}
      role="img"
      aria-label={title || tipo}
    >
      <title>{title || tipo}</title>
      {dibujo}
    </svg>
  );
}

const DIBUJOS = {
  tomate: (
    <g>
      <ellipse cx="60" cy="92" rx="34" ry="6" fill="#2c2418" opacity="0.12" />
      <path d="M60,32 C86,32 96,54 96,72 C96,92 80,104 60,104 C40,104 24,92 24,72 C24,54 34,32 60,32 Z" fill="#d23f28" />
      <path d="M46,44 C36,50 32,62 33,74 C34,82 39,90 47,95 C34,92 26,80 27,66 C28,54 36,46 46,44 Z" fill="#ff6a4d" opacity="0.7" />
      <ellipse cx="72" cy="58" rx="9" ry="13" fill="#ff8f6a" opacity="0.5" />
      <path d="M60,36 l-9,-8 M60,36 l9,-8 M60,36 l0,-11 M60,36 l-12,-2 M60,36 l12,-2" stroke="#3f7f3a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="34" r="4" fill="#4a8f3a" />
    </g>
  ),
  mora: (
    <g>
      <ellipse cx="60" cy="100" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,26 C58,32 56,36 52,40" stroke="#3f7f3a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <g fill="#3a1140">
        <circle cx="52" cy="52" r="10" />
        <circle cx="68" cy="52" r="10" />
        <circle cx="44" cy="66" r="10" />
        <circle cx="60" cy="66" r="11" />
        <circle cx="76" cy="66" r="10" />
        <circle cx="52" cy="82" r="10" />
        <circle cx="68" cy="82" r="10" />
        <circle cx="60" cy="95" r="9" />
      </g>
      <g fill="#6a2f78" opacity="0.75">
        <circle cx="49" cy="49" r="3.4" />
        <circle cx="65" cy="49" r="3.4" />
        <circle cx="41" cy="63" r="3.4" />
        <circle cx="57" cy="63" r="3.6" />
        <circle cx="73" cy="63" r="3.4" />
        <circle cx="49" cy="79" r="3.4" />
        <circle cx="65" cy="79" r="3.4" />
      </g>
      <path d="M60,30 l-8,-6 M60,30 l8,-6 M60,30 l-2,-9" stroke="#4a8f3a" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    </g>
  ),
  papa: (
    <g>
      <ellipse cx="60" cy="96" rx="36" ry="7" fill="#2c2418" opacity="0.12" />
      <ellipse cx="46" cy="62" rx="22" ry="18" fill="#e0a53a" transform="rotate(-12 46 62)" />
      <ellipse cx="74" cy="72" rx="20" ry="16" fill="#d99a2e" transform="rotate(10 74 72)" />
      <ellipse cx="60" cy="52" rx="18" ry="15" fill="#eab24a" transform="rotate(6 60 52)" />
      <g fill="#a8781f" opacity="0.7">
        <circle cx="40" cy="60" r="2.2" />
        <circle cx="52" cy="66" r="2.2" />
        <circle cx="66" cy="50" r="2.2" />
        <circle cx="78" cy="70" r="2.2" />
        <circle cx="70" cy="78" r="2.2" />
        <circle cx="56" cy="54" r="2" />
      </g>
      <ellipse cx="54" cy="48" rx="6" ry="4" fill="#f6cf7a" opacity="0.6" />
    </g>
  ),
  cafe: (
    <g>
      <ellipse cx="60" cy="100" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,24 C56,32 50,36 44,38" stroke="#3f7f3a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M40,40 C30,42 26,52 34,56 C42,60 52,52 50,42 Z" fill="#4a8f3a" />
      <g>
        <circle cx="50" cy="60" r="14" fill="#c62f22" />
        <circle cx="70" cy="52" r="14" fill="#d23f28" />
        <circle cx="64" cy="76" r="14" fill="#b62a1e" />
        <circle cx="46" cy="60" r="4" fill="#8a1f16" />
        <circle cx="66" cy="52" r="4" fill="#8a1f16" />
        <circle cx="60" cy="76" r="4" fill="#8a1f16" />
      </g>
      <ellipse cx="46" cy="54" rx="4" ry="6" fill="#ff7a5a" opacity="0.5" />
      <ellipse cx="66" cy="46" rx="4" ry="6" fill="#ff7a5a" opacity="0.5" />
    </g>
  ),
  miel: (
    <g>
      <ellipse cx="60" cy="104" rx="28" ry="5" fill="#2c2418" opacity="0.12" />
      <rect x="46" y="20" width="28" height="10" rx="3" fill="#6f5a3c" />
      <path d="M42,34 C42,32 44,30 46,30 L74,30 C76,30 78,32 78,34 L80,58 C82,64 82,70 80,78 L80,96 C80,100 76,102 72,102 L48,102 C44,102 40,100 40,96 L40,78 C38,70 38,64 40,58 Z" fill="#e8a72e" />
      <path d="M45,64 C45,60 48,58 52,58 L68,58 C72,58 75,60 75,64 L75,92 C75,96 72,97 68,97 L52,97 C48,97 45,96 45,92 Z" fill="#f6cf7a" opacity="0.55" />
      <rect x="44" y="44" width="32" height="14" rx="2" fill="#efe7d6" />
      <path d="M52,51 l4,0 l2,-3 l2,6 l2,-3 l4,0" stroke="#c1902f" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="50" cy="74" rx="4" ry="10" fill="#ffe6a0" opacity="0.7" />
    </g>
  ),
  aguacate: (
    <g>
      <ellipse cx="60" cy="102" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,22 C58,28 58,32 60,36" stroke="#6f5a3c" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M60,34 C78,34 88,54 88,72 C88,92 76,104 60,104 C44,104 32,92 32,72 C32,54 42,34 60,34 Z" fill="#3f5a1f" />
      <path d="M60,44 C72,44 80,58 80,74 C80,90 71,98 60,98 C49,98 40,90 40,74 C40,58 48,44 60,44 Z" fill="#c8d24a" />
      <ellipse cx="60" cy="78" rx="13" ry="15" fill="#8a5a2c" />
      <ellipse cx="56" cy="74" rx="5" ry="6" fill="#a5723a" opacity="0.7" />
      <path d="M46,58 C50,54 54,52 58,52" stroke="#e6ee9a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  ),
};

export default ProductoIlustracion;

import { useId } from 'react';
import './faunaCalido.css';
import { CreatureFilters } from './_filters.jsx';

/*
 * MorphoAzul — mariposa MORFO AZUL, Morpho peleides (Nymphalidae).
 *
 * La mariposa emblema del bosque húmedo del piso cálido-tropical bajo colombiano
 * (0–1.400 msnm): alas grandes de un AZUL IRIDISCENTE metálico estructural en la
 * cara superior, con borde negro ancho, y el envés pardo con ocelos (que apenas
 * insinuamos). Vuelo lento y ondulante — por eso en la escena deriva ancho y
 * pausado. Polinizadora/frugívora en el sotobosque del cafetal y el cacaotal.
 * Fuente: DR piso-cálido (gemini, GBIF Morpho peleides 190872740).
 *
 * Hermana LIGERA de la Mariposa pasionaria: NO arrastra el kit rubber-hose
 * (sin lip-sync/clima/poder) — es un billboard de dosel. Cuatro alas (delanteras
 * + traseras, izq/der) que abren y cierran (fc-wing), cuerpo, antenas y ocelos.
 * API estable: { size, className, inline, animated, title }.
 */
const VIEWBOX = '-30 -22 60 46';

const AZUL = '#2f6bd6';        // azul morfo iridiscente (cara superior)
const AZUL_CLARO = '#63a0f2';  // el brillo estructural que corre por el ala
const BORDE = '#141b2e';       // el borde negro ancho de la especie
const PARDO = '#5a4632';       // asomo del envés pardo en el borde interno
const CUERPO = '#241a12';      // cuerpo/antenas
const OCELO = '#e9eef7';       // punto claro (ocelo insinuado)

export function MorphoAzul({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Morfo azul (Morpho peleides)',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `fc-glow-${uid}`;
  const blur = `fc-blur-${uid}`;
  const alaL = animated ? 'fc-wing-l' : undefined;
  const alaR = animated ? 'fc-wing-r' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  const body = (
    <g className="fc-body" filter={`url(#${glow})`}>
      {/* ── ala TRASERA izquierda (lóbulo bajo, con el asomo pardo del envés) ── */}
      <g className={alaL}>
        <path d="M0,-1 C-19,-4 -27,7 -22,15 C-16,21 -4,15 0,4 Z" fill={AZUL} />
        <path d="M0,-1 C-19,-4 -27,7 -22,15 C-16,21 -4,15 0,4 Z" fill="none" stroke={BORDE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M-3,2 C-10,4 -16,8 -19,13" fill="none" stroke={AZUL_CLARO} strokeWidth="1.1" opacity="0.75" />
        <path d="M-18,15 C-14,17 -8,15 -3,10" fill={PARDO} opacity="0.4" />
        <circle cx="-16" cy="13" r="1.5" fill={OCELO} opacity="0.7" />
      </g>
      {/* ── ala TRASERA derecha ── */}
      <g className={alaR}>
        <path d="M0,-1 C19,-4 27,7 22,15 C16,21 4,15 0,4 Z" fill={AZUL} />
        <path d="M0,-1 C19,-4 27,7 22,15 C16,21 4,15 0,4 Z" fill="none" stroke={BORDE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M3,2 C10,4 16,8 19,13" fill="none" stroke={AZUL_CLARO} strokeWidth="1.1" opacity="0.75" />
        <path d="M18,15 C14,17 8,15 3,10" fill={PARDO} opacity="0.4" />
        <circle cx="16" cy="13" r="1.5" fill={OCELO} opacity="0.7" />
      </g>
      {/* ── ala DELANTERA izquierda (grande, la firma azul metálico) ── */}
      <g className={alaL}>
        <path d="M0,-3 C-15,-19 -29,-16 -27,-4 C-25,5 -11,2 0,0 Z" fill={AZUL} />
        <path d="M0,-3 C-15,-19 -29,-16 -27,-4 C-25,5 -11,2 0,0 Z" fill="none" stroke={BORDE} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M-3,-2 C-11,-6 -19,-9 -25,-8" fill="none" stroke={AZUL_CLARO} strokeWidth="1.4" opacity="0.85" />
        <path d="M-6,-6 C-12,-10 -18,-12 -23,-11" fill="none" stroke={AZUL_CLARO} strokeWidth="1" opacity="0.6" />
      </g>
      {/* ── ala DELANTERA derecha ── */}
      <g className={alaR}>
        <path d="M0,-3 C15,-19 29,-16 27,-4 C25,5 11,2 0,0 Z" fill={AZUL} />
        <path d="M0,-3 C15,-19 29,-16 27,-4 C25,5 11,2 0,0 Z" fill="none" stroke={BORDE} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M3,-2 C11,-6 19,-9 25,-8" fill="none" stroke={AZUL_CLARO} strokeWidth="1.4" opacity="0.85" />
        <path d="M6,-6 C12,-10 18,-12 23,-11" fill="none" stroke={AZUL_CLARO} strokeWidth="1" opacity="0.6" />
      </g>
      {/* cuerpo, cabeza y antenas */}
      <ellipse cx="0" cy="1" rx="2.1" ry="10.5" fill={CUERPO} />
      <circle cx="0" cy="-10" r="2.2" fill={CUERPO} />
      <path d="M-1,-11.4 C-3.4,-16 -5,-17.6 -7.2,-17.4 M1,-11.4 C3.4,-16 5,-17.6 7.2,-17.4"
        stroke={CUERPO} strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="-7.2" cy="-17.4" r="1.1" fill={CUERPO} />
      <circle cx="7.2" cy="-17.4" r="1.1" fill={CUERPO} />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="morfo-azul">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="morfo-azul" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default MorphoAzul;

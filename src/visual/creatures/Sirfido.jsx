import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { RH_INK, Sonrisa } from './_rubberhose.jsx';

/* Sírfido / mosca de las flores — Syrphidae. EL IMPOSTOR: se disfraza de abeja
   con su abdomen de bandas AMARILLAS Y NEGRAS, pero es una MOSCA — y se le nota
   en tres señas fieles: UN solo par de alas (no dos), OJOS enormes de mosca que
   le tapan casi toda la cara, y antenitas MINÚSCULAS (la abeja las tiene largas;
   él no). Doble aliado: la cría se come los áfidos y el adulto poliniza. Queda
   suspendido en el aire batiendo alas rapidísimo. Controlador biológico real de
   la agroecología colombiana. Rubber-hose de la casa. */
const VIEWBOX = '-30 -22 60 44';

export function Sirfido({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Mosca de las flores (sírfido)',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const alaR = animated ? 'crt-wing' : undefined;
  const alaL = animated ? 'crt-wing' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );
  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      {/* patitas cortas colgando (queda suspendido en el aire) */}
      <g stroke={RH_INK} strokeWidth="1.1" strokeLinecap="round" opacity="0.9">
        <path d="M-4,10 L-6,15 M0,11 L0,16 M4,10 L6,15" />
      </g>
      {/* UN SOLO PAR de alas (seña de mosca), extendidas y translúcidas */}
      <g className={alaL} style={{ transformOrigin: 'right center' }}>
        <path d="M-3,-4 C-16,-11 -26,-9 -25,-3 C-24,1 -14,1 -3,-1 Z"
          fill="#eaf3f7" opacity="0.66" stroke="#9db8c2" strokeWidth="0.7" />
        <path d="M-6,-3.5 C-14,-6 -20,-6 -23,-4" fill="none" stroke="#b7cdd6" strokeWidth="0.5" opacity="0.8" />
      </g>
      <g className={alaR} style={{ transformOrigin: 'left center' }}>
        <path d="M3,-4 C16,-11 26,-9 25,-3 C24,1 14,1 3,-1 Z"
          fill="#eaf3f7" opacity="0.66" stroke="#9db8c2" strokeWidth="0.7" />
        <path d="M6,-3.5 C14,-6 20,-6 23,-4" fill="none" stroke="#b7cdd6" strokeWidth="0.5" opacity="0.8" />
      </g>
      {/* abdomen: bandas AMARILLAS Y NEGRAS (disfraz de avispa/abeja) */}
      <ellipse cx="0" cy="6" rx="7.5" ry="8.5" fill="#f5c542" stroke="#7a5a12" strokeWidth="0.8" />
      <g fill="#241a0c">
        <path d="M-7,2.2 C-3,3.6 3,3.6 7,2.2 L7,4 C3,5.4 -3,5.4 -7,4 Z" />
        <path d="M-7.3,6 C-3,7.2 3,7.2 7.3,6 L7.3,8 C3,9.2 -3,9.2 -7.3,8 Z" />
        <path d="M-6,10 C-3,11 3,11 6,10 L5.6,12 C2.6,12.9 -2.6,12.9 -5.6,12 Z" />
      </g>
      <ellipse cx="-2.4" cy="1" rx="2.6" ry="1.6" fill="#fbe08a" opacity="0.7" />
      {/* tórax bronce/olivo con brillo */}
      <ellipse cx="0" cy="-3.5" rx="6" ry="5" fill="#8a7d3c" stroke="#5f5626" strokeWidth="0.8" />
      <ellipse cx="-2" cy="-5" rx="2.4" ry="1.6" fill="#b6a75a" opacity="0.7" />
      {/* cabeza: OJOS ENORMES de mosca que se juntan arriba */}
      <circle cx="0" cy="-11" r="6.6" fill="#7a5236" stroke={RH_INK} strokeWidth="0.7" />
      <ellipse cx="-3" cy="-11.5" rx="3.9" ry="4.6" fill="#a8514a" stroke={RH_INK} strokeWidth="0.8" />
      <ellipse cx="3" cy="-11.5" rx="3.9" ry="4.6" fill="#a8514a" stroke={RH_INK} strokeWidth="0.8" />
      {/* facetas tenues del ojo compuesto */}
      <g fill="#8f3f39" opacity="0.5">
        <circle cx="-3.4" cy="-10.4" r="0.5" /><circle cx="-1.8" cy="-12.2" r="0.5" />
        <circle cx="3.4" cy="-10.4" r="0.5" /><circle cx="1.8" cy="-12.2" r="0.5" />
      </g>
      {/* brillo grande (chispa rubber-hose) en cada ojo */}
      <circle cx="-4.2" cy="-13.2" r="1.4" fill="#ffe9e4" opacity="0.92" />
      <circle cx="1.8" cy="-13.2" r="1.4" fill="#ffe9e4" opacity="0.92" />
      {/* sonrisita cómplice del impostor, entre los ojos */}
      <Sonrisa cx={0} cy={-6.4} w={3.4} prof={1.2} ink={RH_INK} />
      {/* antenitas MINÚSCULAS (la seña de que es mosca, no abeja) */}
      <g fill={RH_INK}>
        <ellipse cx="-1.8" cy="-16.6" rx="1" ry="1.5" />
        <ellipse cx="1.8" cy="-16.6" rx="1" ry="1.5" />
      </g>
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="sirfido">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="sirfido" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default Sirfido;

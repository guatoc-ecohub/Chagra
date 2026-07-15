import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';

/* Escarabajo estercolero — Dichotomius belus (propio de Colombia). Élitros
   negros brillantes con sutura, cabeza con cuerno, patas que caminan y la bola
   de abono que rueda. Versión canónica del mockup "Guardianes". */
const VIEWBOX = '-23 -12 42 30';

export function Escarabajo({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  /* Line-boil canónico de la familia (LineBoilFilter) — OPT-IN como en los 9
     bichos: default false → los consumidores existentes NO cambian. */
  lineBoil = false,
  title = 'Escarabajo estercolero',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const bola = animated ? 'crt-ball' : undefined;
  const patas = animated ? 'crt-legs' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={animated} />}
    </defs>
  );
  const bolaG = (
    <g className={bola}>
      <circle cx="-13" cy="7" r="6.5" fill="#5a4230" />
      <circle cx="-13" cy="7" r="6.5" fill="none" stroke="#3a2c1c" strokeWidth="1" />
      <circle cx="-15" cy="5" r="1.5" fill="#6e5238" opacity="0.7" />
      <circle cx="-11.5" cy="9" r="1.1" fill="#42301f" opacity="0.7" />
    </g>
  );
  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      <g className={patas} stroke="#0c1206" strokeWidth="1.7" strokeLinecap="round">
        <path d="M-4,4 L-9,10" /><path d="M0,5 L-1,11" /><path d="M4,4 L8,10" />
      </g>
      <ellipse cx="0" cy="0" rx="9" ry="6.4" fill="#141c10"
        style={{ filter: 'drop-shadow(0 0 5px rgba(157,214,106,0.7))' }} />
      <ellipse cx="0" cy="0" rx="9" ry="6.4" fill="none" stroke="#9dd66a" strokeWidth="0.7" strokeOpacity="0.6" />
      <path d="M0,-5.6 L0,5.6" stroke="#0c1206" strokeWidth="0.8" />
      <ellipse cx="-3.5" cy="-2.8" rx="2.6" ry="1.4" fill="#3d5a24" opacity="0.55" />
      <path d="M8,-3.4 C12,-3.8 13.4,-1 12.4,1.4 C11.4,3.6 9,3.6 8.2,2.6 C9.4,1 9.2,-1.4 8,-3.4 Z" fill="#0f150b" />
      <path d="M11.2,-3.2 C12.6,-5 13.4,-4.4 13.2,-2.8" fill="none" stroke="#0f150b" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10.4" cy="-0.6" r="0.7" fill="#9dd66a" opacity="0.8" />
    </g>
  );

  /* El line-boil envuelve bicho Y bola en un nodo aparte (no colisiona con
     el glow del cuerpo). */
  const cuerpoVivo = lineBoil
    ? <g filter={`url(#${boil})`}>{bolaG}{body}</g>
    : <>{bolaG}{body}</>;

  if (inline) {
    return (
      <g className={className} data-creature="escarabajo">
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="escarabajo" {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
}

export default Escarabajo;

import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';

/* Mariposa pasionaria — Dione juno (Nymphalidae, alas largas). Cuatro alas
   independientes (delanteras + traseras, izq/der) que abren y cierran, cuerpo,
   cabeza, antenas y ocelos. Versión canónica del mockup "Guardianes". */
const VIEWBOX = '-27 -18 54 40';

export function Mariposa({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  /* Line-boil canónico de la familia (LineBoilFilter) — OPT-IN como en los 9
     bichos: default false → los consumidores existentes NO cambian. */
  lineBoil = false,
  title = 'Mariposa',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const alaL = animated ? 'crt-fwing crt-fwing-l' : undefined;
  const alaR = animated ? 'crt-fwing crt-fwing-r' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={animated} />}
    </defs>
  );
  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      <g className={alaL}>
        <path d="M0,2 C-13,4 -18,12 -12,15 C-6,17 -1,10 0,4 Z" fill="#d24a1e" opacity="0.9" />
        <circle cx="-9" cy="11" r="1.3" fill="#2a0f06" opacity="0.7" />
      </g>
      <g className={alaR}>
        <path d="M0,2 C13,4 18,12 12,15 C6,17 1,10 0,4 Z" fill="#d24a1e" opacity="0.9" />
        <circle cx="9" cy="11" r="1.3" fill="#2a0f06" opacity="0.7" />
      </g>
      <g className={alaL}>
        <path d="M0,-2 C-16,-11 -24,-6 -22,0 C-20,5 -8,3 0,1 Z" fill="#ff6ad0" opacity="0.92" />
        <path d="M-20,-3 C-14,-2 -7,-1 -1,0" fill="none" stroke="#eafff6" strokeWidth="0.8" opacity="0.6" />
        <circle cx="-16" cy="-4" r="1.1" fill="#eafff6" opacity="0.85" />
      </g>
      <g className={alaR}>
        <path d="M0,-2 C16,-11 24,-6 22,0 C20,5 8,3 0,1 Z" fill="#ff6ad0" opacity="0.92" />
        <path d="M20,-3 C14,-2 7,-1 1,0" fill="none" stroke="#eafff6" strokeWidth="0.8" opacity="0.6" />
        <circle cx="16" cy="-4" r="1.1" fill="#eafff6" opacity="0.85" />
      </g>
      <ellipse cx="0" cy="2" rx="1.7" ry="9" fill="#2a1712" />
      <circle cx="0" cy="-8" r="1.9" fill="#2a1712" />
      <path d="M-0.8,-9.4 C-3,-13 -4.5,-14 -6,-13.6 M0.8,-9.4 C3,-13 4.5,-14 6,-13.6"
        stroke="#2a1712" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <circle cx="-6" cy="-13.6" r="0.9" fill="#ff6ad0" />
      <circle cx="6" cy="-13.6" r="0.9" fill="#ff6ad0" />
    </g>
  );

  /* El line-boil envuelve todo en un nodo aparte (no colisiona con el glow). */
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{body}</g> : body;

  if (inline) {
    return (
      <g className={className} data-creature="mariposa">
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="mariposa" {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
}

export default Mariposa;

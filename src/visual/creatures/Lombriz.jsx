import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';

/* Lombriz de tierra — Martiodrilus crassus (lombriz gigante nativa de los
   Andes). Cuerpo curvo segmentado con clitelo (banda clara) y cabecita.
   Su movimiento en escena (asomar/mecerse) lo aporta la escena, no la
   criatura. Versión canónica del mockup "Guardianes que aparecen". */
const VIEWBOX = '-8 -16 30 48';

export function Lombriz({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  /* Line-boil canónico de la familia (LineBoilFilter) — OPT-IN como en los 9
     bichos: default false → los consumidores existentes NO cambian. Con
     animated=false o reduced-motion, seed fija (textura sin vibrar). */
  lineBoil = false,
  title = 'Lombriz de tierra',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={animated} />}
    </defs>
  );
  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      <path d="M0,26 C-2,14 6,10 4,0 C2.5,-7 8,-11 12,-9"
        fill="none" stroke="#c0715a" strokeWidth="7.4" strokeLinecap="round" />
      <path d="M0,26 C-2,14 6,10 4,0 C2.5,-7 8,-11 12,-9"
        fill="none" stroke="#ff9d6a" strokeWidth="4.4" strokeLinecap="round" opacity="0.85" />
      <g stroke="#7a3f2e" strokeWidth="0.9" opacity="0.65" strokeLinecap="round">
        <path d="M-1.4,22 L1.4,20.5" /><path d="M-1.2,16.5 L2.2,15.5" />
        <path d="M2.4,11.5 L5.6,11" /><path d="M3.4,5.5 L6.4,5.6" />
        <path d="M2.8,-0.5 L5.6,-1.4" /><path d="M4.6,-6 L7.4,-7.6" />
      </g>
      <path d="M3.2,3 C2,-1 4,-4 6.6,-5" fill="none" stroke="#ffd9b0" strokeWidth="4.6" strokeLinecap="round" opacity="0.75" />
      <circle cx="12.2" cy="-9.4" r="2.2" fill="#ff9d6a" />
      <circle cx="13.2" cy="-10" r="0.6" fill="#3a1c12" opacity="0.7" />
    </g>
  );

  /* El line-boil envuelve todo en un nodo aparte (no colisiona con el glow). */
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{body}</g> : body;

  if (inline) {
    return (
      <g className={className} data-creature="lombriz">
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="lombriz" {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
}

export default Lombriz;

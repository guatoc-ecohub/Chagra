import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';

/* Abeja angelita — Tetragonisca angustula (meliponino nativo SIN aguijón, NO
   Apis). Cuerpo ámbar rayado, cabeza clara, alitas de tul. Versión canónica
   deducida del mockup "Guardianes que aparecen". */
const VIEWBOX = '-15 -15 32 30';

export function AbejaAngelita({
  size = 64,
  className,
  inline = false,
  animated = true,
  title = 'Abeja angelita',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const wing = animated ? 'crt-wing' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );
  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      <circle r="6" fill="#ffb54f" opacity="0.35" filter={`url(#${blur})`} />
      <ellipse cx="0" cy="0" rx="8.5" ry="5.4" fill="#ffb54f"
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,181,79,0.9))' }} />
      <path d="M-3.2,-4.9 L-3.2,4.9 M0.8,-5.2 L0.8,5.2 M4.4,-4.2 L4.4,4.2"
        stroke="#3a2410" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8.2" cy="-0.8" r="3.4" fill="#ffd76a" />
      <circle cx="9.3" cy="-1.6" r="0.9" fill="#04160f" />
      <path d="M11,-2.4 C12.4,-3.4 13.7,-3.4 14.7,-2.6" stroke="#3a2410" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <ellipse className={wing} cx="-1.8" cy="-7" rx="6" ry="3.6" fill="#bfeaff" opacity="0.6" />
      <ellipse className={wing} style={{ animationDelay: '-0.07s' }} cx="2.2" cy="-6.4" rx="4.6" ry="2.8" fill="#eafff6" opacity="0.5" />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="abeja-angelita">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="abeja-angelita" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default AbejaAngelita;

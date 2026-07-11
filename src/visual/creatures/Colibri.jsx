import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';

/* Colibrí chillón — Colibri coruscans (nativo de los Andes). Pico largo y
   recto, garganta violeta iridiscente, alas que baten. Versión canónica
   deducida del mockup "Guardianes que aparecen". */
const VIEWBOX = '-22 -28 58 52';

export function Colibri({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Colibrí',
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
      <circle r="6" fill="#2dffc4" opacity="0.35" filter={`url(#${blur})`} />
      <path d="M-6,0.5 L-18,-3.5 L-13,0.5 L-18,4.5 Z" fill="#1f9f86" />
      <path d="M-7,0 C-1,-6.5 10,-6 14,-1.2 C16.6,1 16.6,3.2 14,4.8 C8.5,8.2 -0.5,7.8 -7,1.4 Z" fill="#2dffc4" />
      <path d="M-4,3 C3,5.2 10,5 14,2.6 C10,7 1.5,7.2 -5,2.2 Z" fill="#bfffe9" opacity="0.7" />
      <circle cx="12.4" cy="-2.2" r="4.2" fill="#3be8a6" />
      <path d="M11.4,0.4 C12.8,2.6 14.6,2.6 15.8,0.6 C14.6,3 11.8,3 11.4,0.4 Z" fill="#b28dff" opacity="0.9" />
      <circle cx="13.6" cy="-2.8" r="1.2" fill="#04160f" />
      <circle cx="14" cy="-3.2" r="0.4" fill="#eafff6" />
      <path d="M16.2,-1.8 C21.5,-2.4 26,-3.1 30.4,-4.4" stroke="#eafff6" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path className={wing} d="M4,-1.6 C-4.5,-16 10.5,-23.5 17.5,-14 C14.8,-5.6 8.2,-1.6 4,-1.6 Z" fill="#4fd8ff" opacity="0.8" />
      <path className={wing} style={{ animationDelay: '-0.05s' }} d="M5.6,1.8 C0,13.2 13.4,17.8 17.5,10 C14.2,4.2 9.6,1.8 5.6,1.8 Z" fill="#2dffc4" opacity="0.45" />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="colibri">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="colibri" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default Colibri;

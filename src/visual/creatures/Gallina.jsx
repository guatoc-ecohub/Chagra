import { useId } from 'react';
import './gallina.css';

const PLUMAJES = {
  colorada: { cuerpo: '#a8552f', pecho: '#c9723f', ala: '#8f4b31', cola: '#5a3b2b' },
  clara: { cuerpo: '#efe3c6', pecho: '#fff6de', ala: '#d9c9a4', cola: '#b8a274' },
};

export function Gallina({
  size = 64,
  animated = true,
  plumaje = 'colorada',
  compas = 0,
  tier,
  title = 'Gallina criolla',
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const colores = PLUMAJES[plumaje] || PLUMAJES.colorada;
  const style = compas ? { animationDelay: `${compas}s` } : undefined;
  return (
    <svg
      aria-label={title}
      data-creature="gallina"
      data-tier={tier}
      data-plumaje={plumaje}
      height={size}
      role="img"
      viewBox="-27 -28 52 51"
      width={size}
    >
      <title>{title}</title>
      <defs>
        <filter id={`gallina-sombra-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.7" />
          <feOffset dy="0.6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.28" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g className={animated ? 'gna-cuerpo' : undefined} filter={`url(#gallina-sombra-${id})`} style={style}>
        <g className={animated ? 'gna-cola' : undefined} style={style}>
          <path d="M10,3 C18,1 22,-5 18,-15 C12,-10 9,-3 7,2 Z" fill={colores.cola} stroke="#37251d" strokeWidth="1.3" />
          <path d="M11,4 C19,6 23,1 22,-8 C15,-5 11,0 9,4 Z" fill={colores.ala} stroke="#37251d" strokeWidth="1.3" />
        </g>
        <path d="M-4,8 L-5,19 M4,8 L5,19 M-5,18 L-8,20 M-5,18 L-4,21 M5,18 L2,20 M5,18 L6,21" fill="none" stroke="#d9a13b" strokeLinecap="round" strokeWidth="2" />
        <path d="M-7,-3 C1,-8 11,-5 13,1 C15,8 8,12 1,11 C-8,11 -12,7 -10,2 C-9,0 -8,-2 -7,-3 Z" fill={colores.cuerpo} stroke="#37251d" strokeLinejoin="round" strokeWidth="1.5" />
        <path d="M-8,3 C-7,8 -3,11 2,11 C-4,12 -9,9 -10,5 Z" fill={colores.pecho} opacity="0.9" />
        <path d="M-2,-2 C4,-5 10,-3 11,1 C11,5 6,7 1,6 C-4,5 -5,1 -2,-2 Z" fill={colores.ala} stroke="#37251d" strokeLinejoin="round" strokeWidth="1.1" />
        <g className={animated ? 'gna-cabeza' : undefined} style={style}>
          <path d="M-5,-1 C-8,-5 -9,-8 -11,-10" fill="none" stroke={colores.cuerpo} strokeLinecap="round" strokeWidth="5.5" />
          <circle cx="-12" cy="-13" r="6" fill={colores.cuerpo} stroke="#37251d" strokeWidth="1.3" />
          <path d="M-16,-16 C-17,-20 -15,-21 -14,-18 C-14,-22 -11,-23 -11,-19 C-9,-22 -8,-20 -8,-17 Z" fill="#d1382b" stroke="#37251d" strokeLinejoin="round" strokeWidth="1" />
          <path d="M-17,-13 L-23,-11 L-17,-10 Z" fill="#d9a13b" stroke="#37251d" strokeLinejoin="round" strokeWidth="0.9" />
          <circle cx="-14" cy="-14" r="2.2" fill="#fff8e6" stroke="#37251d" strokeWidth="0.8" />
          <circle cx="-14.6" cy="-13.6" r="0.85" fill="#37251d" />
          <path d="M-16,-8 C-17,-5 -14,-4 -14,-7" fill="#d1382b" stroke="#37251d" strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  );
}

export default Gallina;

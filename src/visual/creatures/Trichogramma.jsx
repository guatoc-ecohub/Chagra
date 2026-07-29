import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { RH_INK, Sonrisa } from './_rubberhose.jsx';

/* Avispita Trichogramma — Trichogramma (Trichogrammatidae). La DIMINUTA:
   la avispa parásita más pequeña de la finca (menos de un milímetro), pero la
   más brava — pone su huevo DENTRO del huevo del cogollero y la plaga nunca
   nace. Rasgos fieles: cuerpo ámbar rechoncho, OJOS ROJOS, y las alas con
   FLECOS de pelitos en el borde (la seña de su familia). Aquí va de gigante y
   tierna para que se vea; en la vida real cabría en la cabeza de un alfiler.
   Controlador biológico real de la agroecología colombiana. Rubber-hose. */
const VIEWBOX = '-24 -20 48 40';

/* Ala con FLECOS: lámina translúcida + pelitos radiales en el borde (la marca
   de los Trichogrammatidae). Se agita con la cadencia rápida crt-wing. */
function AlaFleco({ clase, lado = 1 }) {
  // lado: 1 = derecha, -1 = izquierda (espejo por scaleX en el grupo).
  return (
    <g className={clase} style={{ transformOrigin: `${lado < 0 ? 'right' : 'left'} center` }}>
      <path
        d="M0,-1 C7,-8 15,-8 18,-3 C15,0 7,1 0,2 Z"
        fill="#f2ede0"
        opacity="0.72"
        stroke="#b9a98a"
        strokeWidth="0.6"
      />
      {/* flecos: pelitos cortos que salen del borde */}
      <g stroke="#9b8a6a" strokeWidth="0.5" strokeLinecap="round" opacity="0.85">
        <path d="M6,-6.6 L6.6,-8.4 M9.5,-6.7 L10.2,-8.6 M12.6,-6 L13.4,-7.8 M15.5,-4.4 L16.6,-5.8" />
        <path d="M5,1.6 L5.4,3.2 M8.5,1.2 L9,2.9 M12,0.4 L12.7,2 M15,-0.6 L16,0.8" />
      </g>
    </g>
  );
}

export function Trichogramma({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Avispita Trichogramma',
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
      {/* patitas (3 pares), cortas y oscuras */}
      <g stroke={RH_INK} strokeWidth="1" strokeLinecap="round">
        <path d="M-3,6 L-6,11 M0,6.5 L-1,12 M3,6 L5,11" />
      </g>
      {/* alas con flecos, una a cada lado (la izquierda se espeja) */}
      <g transform="translate(2,-2)"><AlaFleco clase={alaR} lado={1} /></g>
      <g transform="translate(-2,-2) scale(-1,1)"><AlaFleco clase={alaL} lado={-1} /></g>
      {/* abdomen ámbar rechoncho */}
      <ellipse cx="0" cy="4" rx="6.5" ry="6" fill="#e0a52e" stroke="#a9741a" strokeWidth="0.8" />
      <path d="M-4.5,2.5 C-2,4 2,4 4.5,2.5" fill="none" stroke="#c8871a" strokeWidth="0.7" opacity="0.7" />
      <ellipse cx="-2" cy="1.6" rx="2.4" ry="1.5" fill="#f2c463" opacity="0.6" />
      {/* tórax */}
      <ellipse cx="0" cy="-2.2" rx="4.4" ry="3.6" fill="#c8871a" stroke="#a9741a" strokeWidth="0.7" />
      {/* cabeza + OJOS ROJOS grandes (rubber-hose: brillo y sonrisa) */}
      <circle cx="0" cy="-8" r="5" fill="#d99a2c" stroke="#a9741a" strokeWidth="0.7" />
      <circle cx="-2.2" cy="-8.6" r="2.1" fill="#d6392b" stroke={RH_INK} strokeWidth="0.6" />
      <circle cx="2.2" cy="-8.6" r="2.1" fill="#d6392b" stroke={RH_INK} strokeWidth="0.6" />
      <circle cx="-2.8" cy="-9.4" r="0.7" fill="#fff2ef" />
      <circle cx="1.6" cy="-9.4" r="0.7" fill="#fff2ef" />
      <Sonrisa cx={0} cy={-5.6} w={3} prof={1.1} ink={RH_INK} />
      {/* antenas cortas acodadas con clava (avispita) */}
      <g fill="none" stroke={RH_INK} strokeWidth="1" strokeLinecap="round">
        <path d="M-2.6,-11.6 C-5,-14 -7,-14.5 -8.6,-13.4" />
        <path d="M2.6,-11.6 C5,-14 7,-14.5 8.6,-13.4" />
      </g>
      <circle cx="-8.6" cy="-13.4" r="1.3" fill={RH_INK} />
      <circle cx="8.6" cy="-13.4" r="1.3" fill={RH_INK} />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="trichogramma">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="trichogramma" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default Trichogramma;

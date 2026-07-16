import { useId } from 'react';
import './faunaCalido.css';
import { CreatureFilters } from './_filters.jsx';

/*
 * Guacamaya — GUACAMAYA BANDERA / guacamayo rojo, Ara macao (Psittacidae).
 *
 * La guacamaya insignia del piso cálido-tropical bajo colombiano (0–1.000 msnm):
 * plumaje ROJO ESCARLATA brillante, con la banda AMARILLA y las puntas AZULES en
 * las alas y la cola larga, CARA BLANCA desnuda y el pico grande — maxila clara,
 * mandíbula oscura. Vuela en parejas o bandadas sobre el dosel; dispersora de
 * semillas. Aquí va EN VUELO con las alas abiertas, cruzando el cielo del
 * cafetal/cacaotal. Fuente: DR piso-cálido (gemini, GBIF Ara macao 2479361).
 *
 * Billboard LIGERO (sin kit rubber-hose). Vista ventral en vuelo. Las alas
 * aletean (fc-wing--ave). API estable: { size, className, inline, animated, title }.
 */
const VIEWBOX = '-42 -26 84 62';

const ROJO = '#e03726';        // escarlata
const ROJO2 = '#f2513a';       // escarlata con luz
const AMARILLO = '#f3c024';    // la banda amarilla del ala
const AZUL = '#2f61c4';        // puntas azules de alas y cola
const CARA = '#f3ede1';        // cara blanca desnuda
const PICO_SUP = '#e6ddca';    // maxila clara
const PICO_INF = '#2a2018';    // mandíbula oscura
const INK = '#20120c';

/* Un ala escarlata→amarillo→azul (la bandera de la especie), dibujada a la
   izquierda; el lado derecho la refleja con scale(-1,1). */
function Ala() {
  return (
    <g>
      {/* pluma coberteras escarlata (hombro) */}
      <path d="M-3,-6 C-14,-9 -24,-8 -31,-3 C-24,-1 -13,-1 -3,-1 Z" fill={ROJO} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      {/* banda AMARILLA media */}
      <path d="M-13,-2.4 C-22,-3 -30,-2.4 -35,0.4 C-29,1.6 -20,1.6 -12,0.8 Z" fill={AMARILLO} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      {/* rémiges AZULES (puntas) */}
      <path d="M-24,-0.6 C-31,-0.8 -37,0.4 -40,2.8 C-34,3.6 -27,3 -21,1.6 Z" fill={AZUL} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      {/* separación de plumas primarias */}
      <path d="M-27,1 L-33,1.2 M-31,0 L-37,1.6" stroke={INK} strokeWidth="0.6" opacity="0.5" />
    </g>
  );
}

export function Guacamaya({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Guacamaya bandera (Ara macao)',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `fc-glow-${uid}`;
  const blur = `fc-blur-${uid}`;
  const alaL = animated ? 'fc-wing-l fc-wing--ave' : undefined;
  const alaR = animated ? 'fc-wing-r fc-wing--ave' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  const body = (
    <g className="fc-body" filter={`url(#${glow})`}>
      {/* COLA larga escarlata con la pluma central azul (cuelga en vuelo) */}
      <path d="M-3.4,4 C-4,14 -3.4,22 -2,25 C-0.6,22 -0.2,14 -0.6,5 Z" fill={ROJO} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M0.6,5 C0.2,14 0.6,22 2,25 C3.4,22 4,14 3.4,4 Z" fill={ROJO2} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M-1,6 C-1.2,13 -1,20 0,23.5 C1,20 1.2,13 1,6 Z" fill={AZUL} opacity="0.85" />

      {/* ALA izquierda (aletea) */}
      <g className={alaL}>
        <Ala />
      </g>
      {/* ALA derecha (espejo, aletea) */}
      <g className={alaR} transform="scale(-1,1)">
        <Ala />
      </g>

      {/* patas recogidas bajo el cuerpo */}
      <path d="M-2,6 C-2.6,8 -2.4,9.4 -1.6,10 M2,6 C2.6,8 2.4,9.4 1.6,10" stroke={PICO_INF} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* CUERPO escarlata (gota) */}
      <ellipse cx="0" cy="-2" rx="7" ry="9.5" fill={ROJO} stroke={INK} strokeWidth="1.3" />
      <ellipse cx="-1.6" cy="-4" rx="3.6" ry="5" fill={ROJO2} opacity="0.7" />

      {/* CABEZA con cara blanca y pico ganchudo */}
      <circle cx="0" cy="-14" r="6.2" fill={ROJO} stroke={INK} strokeWidth="1.2" />
      {/* cara blanca desnuda (la firma de la bandera) */}
      <path d="M-5,-15.5 C-5.5,-12 -3,-9.6 0,-9.6 C3,-9.6 5.5,-12 5,-15.5 C3,-16.4 -3,-16.4 -5,-15.5 Z"
        fill={CARA} stroke="#d9cfbf" strokeWidth="0.8" strokeLinejoin="round" />
      {/* rayas de plumas finas sobre la cara blanca */}
      <path d="M-4,-14.5 h3 M-4,-13.2 h4 M1,-14.5 h3 M0,-13.2 h4" stroke={ROJO} strokeWidth="0.5" opacity="0.55" />
      {/* ojos */}
      <circle cx="-2.6" cy="-14.6" r="1.3" fill="#1a120c" />
      <circle cx="2.6" cy="-14.6" r="1.3" fill="#1a120c" />
      <circle cx="-3" cy="-15.1" r="0.4" fill="#f4f7ff" />
      <circle cx="2.2" cy="-15.1" r="0.4" fill="#f4f7ff" />
      {/* PICO ganchudo: maxila clara grande + mandíbula oscura */}
      <path d="M-3.4,-11.2 C-1.5,-9.4 1.5,-9.4 3.4,-11.2 C2.4,-7 0,-5 -0.2,-5 C-0.4,-5 -2.4,-7 -3.4,-11.2 Z"
        fill={PICO_SUP} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M-2.2,-8 C-0.8,-6.8 0.8,-6.8 2.2,-8 C1.4,-5.6 0,-4.6 0,-4.6 C0,-4.6 -1.4,-5.6 -2.2,-8 Z" fill={PICO_INF} />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="guacamaya">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="guacamaya" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default Guacamaya;

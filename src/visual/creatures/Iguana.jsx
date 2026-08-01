import { useId } from 'react';
import './faunaCalido.css';
import { CreatureFilters } from './_filters.jsx';

/*
 * Iguana — IGUANA VERDE, Iguana iguana (Iguanidae).
 *
 * El gran lagarto arbóreo del piso cálido-tropical bajo colombiano (0–1.000
 * msnm): VERDE brillante, con la PAPADA (gular) prominente bajo la garganta, la
 * CRESTA de espinas dorsales, el escudo redondo de la mejilla (subtimpánico) y la
 * COLA larga ANILLADA. Herbívora y dispersora de semillas; suele asolearse en
 * ramas cerca del agua. Aquí va POSADA a lo largo de una rama, quieta, tomando el
 * sol, con la papada latiendo. Fuente: DR piso-cálido (gemini, GBIF Iguana
 * iguana 2470396).
 *
 * Billboard LIGERO (sin kit rubber-hose). Perfil lateral mirando a la izquierda.
 * API estable: { size, className, inline, animated, title }.
 */
const VIEWBOX = '-34 -20 68 42';

const VERDE = '#54a13c';       // verde iguana
const VERDE_LUZ = '#74c257';   // el lomo al sol
const VERDE_OSC = '#3a7029';   // bandas / sombra
const PAPADA = '#7cc05a';      // la papada gular
const MEJILLA = '#d3dd95';     // escudo redondo de la mejilla (subtimpánico)
const CRESTA = '#35662a';      // espinas dorsales
const RAMA = '#6b4a30';
const GARRA = '#241d14';
const INK = '#152210';

export function Iguana({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Iguana verde (Iguana iguana)',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `fc-glow-${uid}`;
  const blur = `fc-blur-${uid}`;
  const papada = animated ? 'fc-dewlap' : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  // La rama a lo largo de la que se asolea (estática, bajo la panza).
  const rama = (
    <g aria-hidden="true">
      <path d="M-30,11 C-10,9.6 14,9.6 31,11 C14,12.6 -10,12.6 -30,11 Z"
        fill={RAMA} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );

  // Espinas de la cresta dorsal a lo largo del lomo.
  const crestaDorsal = (
    <g fill={CRESTA}>
      {[[-13, -6.4], [-9, -7.2], [-5, -7.6], [-1, -7.7], [3, -7.4], [7, -6.8], [11, -5.6], [15, -4.2]].map((p, i) => (
        <path key={i} d={`M${p[0] - 1.1},${p[1] + 1} L${p[0]},${p[1] - 2.2} L${p[0] + 1.1},${p[1] + 1} Z`} />
      ))}
    </g>
  );

  const body = (
    <g className="fc-body" filter={`url(#${glow})`}>
      {/* COLA larga ANILLADA (se afila a la derecha) */}
      <path d="M9,-3 C18,-2.4 26,-0.6 32,2.4 C26,3.2 17,2.6 9,1 Z" fill={VERDE} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      {/* anillos oscuros de la cola */}
      <g stroke={VERDE_OSC} strokeWidth="1.4" fill="none" opacity="0.8">
        <path d="M14,-1.8 L14.6,1.8" />
        <path d="M19,-1 L19.6,2.2" />
        <path d="M24,-0.2 L24.4,2.4" />
        <path d="M28,0.6 L28.2,2.6" />
      </g>

      {/* patas: trasera y delantera agarrando la rama con garras */}
      <path d="M6,6 C7.4,9 7,11 5,12" stroke={VERDE} strokeWidth="3.6" fill="none" strokeLinecap="round" />
      <path d="M4,11.6 l-2,1.4 m2.4,-0.8 l-1.2,1.8 m2,-1.8 l0,2" stroke={GARRA} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M-8,6 C-9,9 -8.6,11 -7,12" stroke={VERDE_LUZ} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M-7.6,11.6 l-2,1.4 m2.4,-0.8 l-1.2,1.8 m2,-1.8 l0,2" stroke={GARRA} strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* CUERPO verde alargado */}
      <path d="M-14,-4 C-8,-8 6,-8 12,-3 C13,0 12,4 8,6 C0,8 -8,7 -13,4 C-16,1 -16,-2 -14,-4 Z"
        fill={VERDE} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {/* lomo al sol */}
      <path d="M-12,-4.4 C-6,-7 4,-7 10,-3.4 C4,-4.8 -6,-5 -12,-3 Z" fill={VERDE_LUZ} opacity="0.75" />
      {/* bandas oscuras del cuerpo */}
      <g stroke={VERDE_OSC} strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round">
        <path d="M-6,-6 C-6.6,-1 -6,3 -5,6" />
        <path d="M0,-6.6 C-0.6,-1 0,3.4 1,6.4" />
        <path d="M6,-5.6 C5.6,-1 6,3 6.6,5.4" />
      </g>
      {crestaDorsal}

      {/* PAPADA gular (late suave) — cuelga de la garganta */}
      <g className={papada}>
        <path d="M-16,-1 C-18,3 -17.6,7 -14.6,8 C-13,5 -13,1 -13.6,-2 Z" fill={PAPADA} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      </g>

      {/* CABEZA a la izquierda */}
      <path d="M-13,-5 C-19,-5.4 -23,-3.6 -23.4,-1 C-23.6,1.4 -21,3 -16,2.6 C-13,2.2 -12,-1 -13,-5 Z"
        fill={VERDE} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      {/* escudo redondo de la mejilla (subtimpánico) — la firma */}
      <circle cx="-16.5" cy="-0.4" r="2.6" fill={MEJILLA} stroke="#b6c473" strokeWidth="0.8" />
      {/* ojo */}
      <circle cx="-19.2" cy="-2.4" r="1.5" fill="#1a1a0e" />
      <circle cx="-19.6" cy="-2.9" r="0.45" fill="#f2f6dd" />
      {/* boca */}
      <path d="M-23.2,-0.4 C-21,0.4 -18,0.6 -15.5,0.2" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      {/* espinas pequeñas de la nuca */}
      <path d="M-13.6,-5.2 l0.6,-2 l1,1.8 M-11.6,-5 l0.6,-2 l1,1.8" fill={CRESTA} />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="iguana">
        {defs}
        {rama}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="iguana" {...rest}>
      <title>{title}</title>
      {defs}
      {rama}
      {body}
    </svg>
  );
}

export default Iguana;

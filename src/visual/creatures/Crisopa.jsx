import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { RH_INK, Sonrisa } from './_rubberhose.jsx';

/* Crisopa — Chrysoperla externa (Chrysopidae, "león de los áfidos"). El
   depredador de ALAS VERDES TRANSLÚCIDAS: dos pares de alas de encaje que
   guarda a dos aguas sobre el cuerpo esbelto, y sus OJOS DORADOS metálicos —
   la firma de la crisopa. Su larva atrapa mosca blanca y pulgones con las
   mandíbulas curvas; el adulto vuela liviano entre las hojas. Controlador
   biológico real de la agroecología colombiana. Rubber-hose de la casa.

   Vista 3/4 desde arriba: cabeza arriba (ojos dorados), cuerpo esbelto hacia
   abajo, y las cuatro alas de encaje abiertas hacia atrás como una carpa. */
const VIEWBOX = '-30 -20 60 44';

/* Un ala de encaje (translúcida y venada). El grupo EXTERNO hace el espejo
   estático (scaleX según `lado`); el grupo INTERNO lleva la cadencia crt-fwing
   (que anima su propio scaleX al plegarse) sin pelear con el espejo. `sombra`
   la tinta un punto más oscura (el par trasero, al fondo). */
function AlaEncaje({ animated, lado = 1, sombra = false, larga = true }) {
  const verde = sombra ? '#7fbf50' : '#b6ea7c';
  const L = larga ? 1 : 0.78;
  const clase = animated ? 'crt-fwing' : undefined;
  // Ala dibujada hacia la derecha; el grupo externo la espeja para el lado izq.
  const d = `M0,-2 C${9 * L},-6 ${20 * L},-3 ${24 * L},4 C${22 * L},9 ${10 * L},7 0,3 Z`;
  return (
    <g style={{ transform: `scaleX(${lado})` }}>
      <g className={clase} style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}>
        <path d={d} fill={verde} opacity={sombra ? 0.5 : 0.6} stroke="#5f9b39" strokeWidth="0.7" />
        {/* venación de encaje: nervaduras + cruces finas */}
        <g fill="none" stroke="#4d8a2c" strokeWidth="0.5" opacity="0.7">
          <path d={`M1,-1 C${8 * L},-3 ${16 * L},-2 ${22 * L},2`} />
          <path d={`M1,1.4 C${8 * L},1 ${15 * L},2 ${21 * L},4`} />
          <path d={`M${5 * L},-2.6 l0.6,3 M${10 * L},-2.2 l0.5,3.4 M${15 * L},-1 l0.4,3.4 M${19 * L},0.6 l0.6,3`} />
        </g>
      </g>
    </g>
  );
}

export function Crisopa({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Crisopa',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );
  const body = (
    <g className="crt-body" filter={`url(#${glow})`}>
      {/* patas finas (3 pares) que asoman del cuerpo esbelto */}
      <g stroke={RH_INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.85">
        <path d="M-2,2 L-8,5 M-2,6 L-8,9 M2,2 L8,5 M2,6 L8,9" />
      </g>
      {/* par de alas TRASERO (al fondo, un punto más oscuro y algo más corto) */}
      <g transform="translate(0,3)">
        <AlaEncaje animated={animated} lado={-1} sombra larga={false} />
        <AlaEncaje animated={animated} lado={1} sombra larga={false} />
      </g>
      {/* cuerpo esbelto vertical (abdomen que se afina hacia la cola) */}
      <path
        d="M-2.4,-6 C-3.2,0 -2.4,8 0,13 C2.4,8 3.2,0 2.4,-6 Z"
        fill="#9dd66a"
        stroke="#5f9b39"
        strokeWidth="0.6"
      />
      <path d="M0,-4 L0,11" stroke="#6fae42" strokeWidth="0.5" opacity="0.6" />
      {/* par de alas DELANTERO (encima, translúcido claro) */}
      <AlaEncaje animated={animated} lado={-1} />
      <AlaEncaje animated={animated} lado={1} />
      {/* tórax + cabeza (arriba) */}
      <ellipse cx="0" cy="-6.5" rx="3.4" ry="3" fill="#8fce63" stroke="#5f9b39" strokeWidth="0.6" />
      <circle cx="0" cy="-11.5" r="4.2" fill="#a7dd77" stroke="#5f9b39" strokeWidth="0.6" />
      {/* OJOS DORADOS metálicos — la firma de la crisopa (con brillo rubber-hose) */}
      <circle cx="-2.2" cy="-12" r="2.2" fill="#e8b422" stroke={RH_INK} strokeWidth="0.7" />
      <circle cx="2.2" cy="-12" r="2.2" fill="#e8b422" stroke={RH_INK} strokeWidth="0.7" />
      <circle cx="-2.8" cy="-12.8" r="0.75" fill="#fffdf3" />
      <circle cx="1.6" cy="-12.8" r="0.75" fill="#fffdf3" />
      {/* sonrisa breve de la casa */}
      <Sonrisa cx={0} cy={-9} w={3} prof={1.1} ink={RH_INK} />
      {/* antenas largas, filiformes, hacia arriba con bulbito */}
      <g fill="none" stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round">
        <path d="M-2.4,-14.6 C-6,-18 -9,-19 -12,-18.4" />
        <path d="M2.4,-14.6 C6,-18 9,-19 12,-18.4" />
      </g>
      <circle cx="-12" cy="-18.4" r="0.85" fill={RH_INK} />
      <circle cx="12" cy="-18.4" r="0.85" fill={RH_INK} />
    </g>
  );

  if (inline) {
    return (
      <g className={className} data-creature="crisopa">
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} data-creature="crisopa" {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default Crisopa;

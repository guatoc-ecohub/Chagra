import { useId } from 'react';
import './creatures.css';
import './gallina.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, RH_INK } from './_rubberhose.jsx';

/*
 * Gallina — GALLINA CRIOLLA CAMPESINA, Gallus gallus domesticus.
 *
 * La gallina de patio andina: la que anda suelta detrás de la casa, escarba la
 * boñiga, rompe el ciclo de la larva y paga el mercado con huevos. Cuerpo
 * rechoncho de pechuga llena, cola en abanico, CUELLO DE MANGUERA (la firma
 * rubber-hose de los gallineros de los años 30), cresta y barbillas de
 * cochinilla, patas ámbar de tres dedos.
 *
 * Lenguaje de la casa (kit `_rubberhose.jsx` — el mismo de Angelita):
 * contorno grueso de tinta cálida, ojos de goma con catchlight, chapeta
 * campesina, squash-&-stretch (`rh-boil`). La CADENCIA propia (el PICOTEO con
 * anticipación y doble golpe, el meneo de la cola, el paso con el cabeceo de
 * gallina) vive en `gallina.css` como clases `gna-*`, gateadas por
 * reduced-motion y data-tier igual que toda la familia.
 *
 * DOS PLUMAJES para que la parvada no se vea clonada:
 *   'colorada' → la criolla rojiza (cobre siete-cueros de la paleta madre)
 *   'clara'    → la sarabiada crema (hueso/cal con motas pardas)
 * Los hex derivan de la paleta madre (CORTEZAS.sieteCueros*, NEUTROS.hueso,
 * ACENTOS.cochinilla/ambar) — ningún verde tech, ningún negro puro.
 *
 * API estable de la familia: { size, className, inline, animated, title } +
 *   plumaje  'colorada' | 'clara'
 *   pose     'picotea' (default: escarba y picotea) | 'anda' (paso con cabeceo)
 *            | 'reposo' (quieta, digna — también el fotograma de RM)
 *   compas   desfase en segundos para que una parvada no picotee al unísono
 *   tier     'alto'|'medio'|'bajo' — bajo apaga la cadencia continua (CSS)
 */
const VIEWBOX = '-27 -28 52 51';

/* Plumajes (fuentes: paleta madre — CORTEZAS.sieteCueros '#a5502e' y
   sieteCuerosClaro '#c9723f' para la colorada; NEUTROS.hueso/cal para la
   clara; TIERRAS.mantillo para sus motas). */
const PLUMAJES = {
  colorada: {
    cuerpo: '#a8552f',
    pecho: '#c9723f',
    ala: '#8f4b31',
    cola: '#5a3b2b',
    colaLuz: '#7a4a30',
    mota: null,
  },
  clara: {
    cuerpo: '#efe3c6',
    pecho: '#fff6de',
    ala: '#d9c9a4',
    cola: '#b8a274',
    colaLuz: '#cdbb90',
    mota: '#8a6a44', // sarabiada: motas pardas (TIERRAS.camino)
  },
};
const CRESTA = '#d1382b'; // ACENTOS.cochinilla — el rojo textil, no rojo UI
const PICO = '#d9a13b';   // ACENTOS.ambar
const PATA = '#d9a13b';

export function Gallina({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Gallina criolla',
  plumaje = 'colorada',
  pose = 'picotea',
  compas = 0,
  tier = undefined,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `gna-glow-${uid}`;
  const blur = `gna-blur-${uid}`;
  const P = PLUMAJES[plumaje] || PLUMAJES.colorada;
  const vivo = animated;
  const desfase = compas ? { animationDelay: `${compas}s` } : undefined;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
    </defs>
  );

  /* COLA en abanico (3 plumas de goma que se mecen con follow-through).
     Pivote en su arranque (izquierda-abajo del grupo) para el meneo. */
  const cola = (
    <g className={vivo ? 'gna-cola' : undefined} style={desfase}>
      <path d="M11,2 C16,-2 19,-8 18,-15 C13,-11 10,-5 8.6,1 Z"
        fill={P.cola} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12,3 C18,1 21.5,-3.5 22,-9.5 C16.5,-7 12.5,-2.5 10.4,2.6 Z"
        fill={P.colaLuz} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12,4.6 C17.5,4 20.5,1.5 21.8,-2.4 C16.6,-2 13,0.6 10.8,4 Z"
        fill={P.cola} stroke={RH_INK} strokeWidth="1.2" strokeLinejoin="round" />
    </g>
  );

  /* PATAS ámbar de tres dedos: manguera con contorno (tinta debajo, ámbar
     encima). En pose 'anda' el CSS las columpia alternadas desde la cadera. */
  const pata = (lado, x) => (
    <g className={`gna-pata gna-pata-${lado}`} key={lado}>
      <path d={`M${x},9 C${x - 0.4},12 ${x - 0.6},15 ${x - 0.4},17.4`}
        stroke={RH_INK} strokeWidth="3.1" fill="none" strokeLinecap="round" />
      <path d={`M${x},9 C${x - 0.4},12 ${x - 0.6},15 ${x - 0.4},17.4`}
        stroke={PATA} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      {/* tres deditos + espolón atrás */}
      <path d={`M${x - 0.4},17.4 L${x - 3},19.8 M${x - 0.4},17.4 L${x - 0.8},20.2 M${x - 0.4},17.4 L${x + 1.8},19.4 M${x - 0.4},17.4 L${x + 1.6},17.2`}
        stroke={RH_INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d={`M${x - 0.4},17.4 L${x - 3},19.8 M${x - 0.4},17.4 L${x - 0.8},20.2 M${x - 0.4},17.4 L${x + 1.8},19.4 M${x - 0.4},17.4 L${x + 1.6},17.2`}
        stroke={PATA} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </g>
  );

  /* CUELLO de manguera + CABEZA: el grupo que PICOTEA (pivote en la base del
     cuello). El cuello es hose puro: tinta ancha debajo, plumaje encima. */
  const cabeza = (
    <g className={`gna-cabeza${vivo ? ' gna-viva' : ''}`} style={desfase}>
      {/* cuello-manguera CORTO (de gallina, no de ganso) */}
      <path d="M-5.5,-1.5 C-7.2,-4.2 -9,-6.8 -10.8,-9.2" stroke={RH_INK}
        strokeWidth="7.6" fill="none" strokeLinecap="round" />
      <path d="M-5.5,-1.5 C-7.2,-4.2 -9,-6.8 -10.8,-9.2" stroke={P.cuerpo}
        strokeWidth="5.4" fill="none" strokeLinecap="round" />
      {/* cabeza */}
      <circle cx="-11.8" cy="-12.2" r="6" fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
      {/* cresta de tres puntas (cochinilla) */}
      <path d="M-15.6,-16.3 C-16.7,-19.5 -15.3,-20.9 -13.7,-18.9 C-13.9,-22.1 -11.7,-22.9 -10.7,-19.9 C-9.5,-22.3 -7.7,-21.3 -8.1,-18.3 C-9.9,-17.1 -13.3,-16.5 -15.6,-16.3 Z"
        fill={CRESTA} stroke={RH_INK} strokeWidth="1" strokeLinejoin="round" />
      {/* pico ámbar (dos valvas) con comisura amable */}
      <path d="M-17.1,-13.3 L-22.9,-11.3 L-16.9,-10.1 Z" fill={PICO}
        stroke={RH_INK} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M-16.9,-9.7 L-21.1,-9.3 L-16.5,-7.9 Z" fill="#c08a2e"
        stroke={RH_INK} strokeWidth="0.9" strokeLinejoin="round" />
      {/* barbillas (la papada roja que la hace gallina y no paloma) */}
      <path d="M-15.9,-7.9 C-17.1,-4.7 -14.9,-3.3 -13.5,-5.3 C-13.9,-6.5 -14.9,-7.5 -15.9,-7.9 Z"
        fill={CRESTA} stroke={RH_INK} strokeWidth="0.9" strokeLinejoin="round" />
      {/* ojo de goma con catchlight + chapeta campesina */}
      <OjosRubber ojos={[{ cx: -13.1, cy: -13.7, r: 2.4 }]} mirar={[-0.34, 0.2]} parpadea={vivo} />
      <Cachetes puntos={[{ cx: -9.9, cy: -10.1, r: 1.5 }]} vivo={vivo} />
    </g>
  );

  /* CUERPO rechoncho: pechuga llena adelante, ala de teja encima. `rh-boil`
     lo hace respirar (squash & stretch, origen abajo-centro). */
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {cola}
      <g className={vivo && pose === 'anda' ? 'gna-anda-patas' : undefined}>
        {pata('l', -2.2)}
        {pata('r', 4)}
      </g>
      {/* cuerpo: gota acostada con pechuga baja adelante */}
      <path d="M-6.5,-3.5 C0,-7.5 9,-6.5 12.5,-1.5 C15,2.5 13,8 8,10.4 C3,12.6 -4.5,12.2 -8.5,8.4 C-11.8,5.2 -10.8,-0.8 -6.5,-3.5 Z"
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* pechuga (luz cálida, adelante-abajo) */}
      <path d="M-8.9,3.5 C-8.4,7 -5.5,9.9 -1.5,10.9 C-5.2,11.2 -8.6,9.3 -9.9,6.4 C-9.8,5.3 -9.5,4.3 -8.9,3.5 Z"
        fill={P.pecho} opacity="0.9" />
      {/* ala de teja con dos festones (scallops de pluma) */}
      <path d="M-2.5,-2.5 C3.5,-5 9.5,-3.5 10.5,0.5 C11,3.5 7.5,6.5 2.5,6.8 C-1.5,7 -4.5,4.5 -4.5,1.5 C-4.5,-0.3 -3.8,-1.8 -2.5,-2.5 Z"
        fill={P.ala} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M-2.5,2.5 Q1.5,5.5 6.5,4.2 M-1,-0.5 Q3.5,2 8.5,0.8"
        stroke={RH_INK} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.55" />
      {/* motas sarabiadas (solo la clara) */}
      {P.mota && (
        <g fill={P.mota} opacity="0.65">
          <circle cx="1" cy="-3.6" r="0.7" />
          <circle cx="6.4" cy="-1" r="0.6" />
          <circle cx="0.5" cy="8.6" r="0.65" />
          <circle cx="-6.2" cy="0.5" r="0.55" />
        </g>
      )}
      {cabeza}
    </g>
  );

  const attrs = {
    'data-creature': 'gallina',
    'data-plumaje': plumaje,
    'data-pose': vivo ? pose : 'reposo',
    'data-tier': tier || undefined,
  };

  if (inline) {
    return (
      <g className={className} {...attrs}>
        {defs}
        {body}
      </g>
    );
  }
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className}
      role="img" aria-label={title} {...attrs} {...rest}>
      <title>{title}</title>
      {defs}
      {body}
    </svg>
  );
}

export default Gallina;

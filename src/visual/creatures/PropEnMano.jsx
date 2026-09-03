/*
 * PropEnMano — el SLOT que pone el prop del mundo EN LA MANO del personaje.
 *
 * Data-driven (biblia de personajes): `mundoId` → `propDeMundo` → un
 * dibujo del registro `DIBUJO_PROP`. Rubber-hose andino: contorno cálido grueso
 * (RH_INK) + acento de color, siluetas simples y reconocibles. Son PLACEHOLDERS
 * dignos para que el sistema funcione HOY; fable refina el arte por-prop luego
 * (mismo contrato: un dibujo por id).
 *
 * Species-agnostic: la creature pasa el ANCLA de su mano (x,y), el tamaño y si
 * mira a la izquierda (flip). Sin prop mapeado → no renderiza nada (manos
 * libres, jamás rompe la escena).
 */

import { RH_INK, RH_GLOVE } from './_rubberhose.jsx';
import { propDeMundo } from './propsPorMundo.js';

const ACENTO = {
  agua: '#4fb0e0',
  hoja: '#4a9b3e',
  madera: '#9c6b3f',
  cafe: '#b3402e',
  fruta: '#ff8b1f',
  cuerda: '#c9a24b',
  tela: '#d94f4f',
  piedra: '#8a8f98',
};

/* Cada dibujo vive centrado en (0,0), pensado para ~12u de alto en el viewBox de
   la creature. Reciben `ink` para heredar la tinta de la familia. */
export const DIBUJO_PROP = Object.freeze({
  // Manguera: tubo curvo con boquilla + gota (agua).
  manguera: ({ ink }) => (
    <g>
      <path d="M-5,4 C-5,0 -1,-1 1,-3 C2,-4 3,-4 4,-4.6" stroke={ink} strokeWidth="1.8"
        fill="none" strokeLinecap="round" />
      <rect x="3.4" y="-6.2" width="2.6" height="2.4" rx="0.6" fill={ACENTO.agua} stroke={ink} strokeWidth="0.7" />
      <path d="M4.7,-6.4 q-0.7,-1.4 0,-2.4 q0.7,1 0,2.4 Z" fill={ACENTO.agua} />
    </g>
  ),
  // Lupa: aro + mango (inspeccionar el suelo/plagas).
  lupa: ({ ink }) => (
    <g>
      <circle cx="-1.5" cy="-1.5" r="3.4" fill="rgba(190,230,255,0.5)" stroke={ink} strokeWidth="1.4" />
      <path d="M1.2,1.2 L4.4,4.4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // Lazo: cuerda con lazada (arriar animales).
  lazo: ({ ink }) => (
    <g fill="none" stroke={ACENTO.cuerda} strokeWidth="1.4" strokeLinecap="round">
      <ellipse cx="-1" cy="-2.5" rx="3.2" ry="4" stroke={ACENTO.cuerda} />
      <path d="M-3.4,0.6 C-4.5,3 -3.5,5 -2,5.6" />
      <circle cx="-2" cy="5.8" r="0.8" fill={ACENTO.cuerda} stroke="none" />
    </g>
  ),
  // Canasto: trapecio tejido (semillero / mercado).
  canasto: ({ ink }) => (
    <g>
      <path d="M-4.4,-1 L4.4,-1 L3.2,5 L-3.2,5 Z" fill={ACENTO.madera} stroke={ink} strokeWidth="1.1" />
      <path d="M-4.4,-1 C-3,-3.2 3,-3.2 4.4,-1" fill="none" stroke={ink} strokeWidth="1.1" />
      <path d="M-2.2,-1 L-1.6,5 M0,-1 L0,5 M2.2,-1 L1.6,5" stroke={ink} strokeWidth="0.5" opacity="0.6" />
    </g>
  ),
  // Rama de café: tallo con cerezas rojas.
  'rama-cafe': ({ ink }) => (
    <g>
      <path d="M0,5 C0,1 0.4,-2 0,-5" stroke={ACENTO.hoja} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M0,-1 q3,-1 4,1" stroke={ACENTO.hoja} strokeWidth="1" fill="none" />
      <circle cx="-1.6" cy="1.5" r="1.4" fill={ACENTO.cafe} stroke={ink} strokeWidth="0.5" />
      <circle cx="1.7" cy="0.2" r="1.4" fill={ACENTO.cafe} stroke={ink} strokeWidth="0.5" />
      <circle cx="-0.3" cy="-2.4" r="1.3" fill={ACENTO.cafe} stroke={ink} strokeWidth="0.5" />
    </g>
  ),
  // Horqueta: mango + dientes (voltear el compost).
  horqueta: ({ ink }) => (
    <g stroke={ink} strokeLinecap="round" fill="none">
      <path d="M0,6 L0,-3" strokeWidth="1.6" stroke={ACENTO.madera} />
      <path d="M-2.4,-6 L-2.4,-3 M0,-6.4 L0,-3 M2.4,-6 L2.4,-3" strokeWidth="1.3" />
      <path d="M-2.6,-3 L2.6,-3" strokeWidth="1.3" />
    </g>
  ),
  // Azadón: mango + pala en ángulo (cultivar).
  azadon: ({ ink }) => (
    <g>
      <path d="M-3,6 L2,-4" stroke={ACENTO.madera} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M1,-3.4 L5,-5.4 L5.6,-3.6 L2,-1.6 Z" fill={ACENTO.piedra} stroke={ink} strokeWidth="0.8" />
    </g>
  ),
  // Mazorca: elote con hojas (milpa).
  mazorca: ({ ink }) => (
    <g>
      <ellipse cx="0" cy="0" rx="2.4" ry="5" fill="#f2c94c" stroke={ink} strokeWidth="1" />
      <path d="M-1.2,-4 L-1.2,4 M0,-4.6 L0,4.6 M1.2,-4 L1.2,4" stroke={ink} strokeWidth="0.4" opacity="0.5" />
      <path d="M-2.2,3 C-4,4 -4,6 -2.6,6.4 M2.2,3 C4,4 4,6 2.6,6.4" fill={ACENTO.hoja} stroke={ACENTO.hoja} strokeWidth="1.2" />
    </g>
  ),
  // Naranja: fruta con hojita (frutales).
  naranja: ({ ink }) => (
    <g>
      <circle cx="0" cy="1" r="4" fill={ACENTO.fruta} stroke={ink} strokeWidth="1.1" />
      <path d="M0.5,-3 q2.5,-1.5 3.5,0.4 q-2.4,0.8 -3.5,-0.4 Z" fill={ACENTO.hoja} stroke={ink} strokeWidth="0.5" />
    </g>
  ),
  // Paraguas: capota + mango (clima / lluvia).
  paraguas: ({ ink }) => (
    <g>
      <path d="M-5,-1 C-5,-6 5,-6 5,-1 Z" fill={ACENTO.tela} stroke={ink} strokeWidth="1.1" />
      <path d="M0,-1 L0,5 q0,1.6 1.8,1.4" stroke={ink} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  ),
  // Mapa: pergamino enrollado (valle).
  mapa: ({ ink }) => (
    <g>
      <rect x="-4.4" y="-3.4" width="8.8" height="6.8" rx="0.8" fill={RH_GLOVE} stroke={ink} strokeWidth="1.1" />
      <path d="M-2.4,-1 L1,0.4 L3,-1.6 M-2,1.6 L2.4,1" stroke={ACENTO.hoja} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <circle cx="1" cy="0.4" r="0.7" fill={ACENTO.cafe} />
    </g>
  ),
  // Montaña: pisos térmicos (mapa vertical de la finca).
  montana: ({ ink }) => (
    <g>
      <path d="M-5,5 L-1.5,-3 L1,1 L3,-4 L6,5 Z" fill={ACENTO.piedra} stroke={ink} strokeWidth="1" />
      <path d="M-1.5,-3 L-2.6,-1 L-0.4,-1 Z M3,-4 L1.9,-2 L4.2,-2 Z" fill="#f5f7fa" />
    </g>
  ),
  // Regla: herramienta de diseño (disenio).
  regla: ({ ink }) => (
    <g>
      <rect x="-5" y="-1.6" width="10" height="3.2" rx="0.5" fill="#e8c76a" stroke={ink} strokeWidth="1" />
      <path d="M-3,-1.6 L-3,0 M-1,-1.6 L-1,0.6 M1,-1.6 L1,0 M3,-1.6 L3,0.6" stroke={ink} strokeWidth="0.5" />
    </g>
  ),
});

/**
 * Renderiza el prop del mundo en la mano de la creature (o nada si el mundo no
 * tiene prop / el prop no está en el registro).
 *
 * @param {object} props
 * @param {string} props.mundoId  id del mundo (MUNDO[*] de mundoData).
 * @param {number} [props.x=0]  ancla X en unidades del viewBox de la creature.
 * @param {number} [props.y=0]  ancla Y.
 * @param {number} [props.escala=1]  factor de tamaño.
 * @param {boolean} [props.flip=false]  espejar (personaje mirando a la izquierda).
 * @param {string} [props.ink=RH_INK]  tinta del contorno (heredá la de la familia).
 * @param {boolean} [props.animated=true]  si mece el prop (follow-through `rh-sway`).
 * @returns {import('react').JSX.Element|null}
 */
export function PropEnMano({ mundoId, x = 0, y = 0, escala = 1, flip = false, ink = RH_INK, animated = true }) {
  const propId = propDeMundo(mundoId);
  if (!propId) return null;
  const Dibujo = DIBUJO_PROP[propId];
  if (!Dibujo) return null;
  const sx = (flip ? -1 : 1) * escala;
  return (
    <g
      data-prop={propId}
      className={animated ? 'rh-sway' : undefined}
      transform={`translate(${x} ${y}) scale(${sx} ${escala})`}
      style={animated ? { transformBox: 'fill-box', transformOrigin: 'top center' } : undefined}
    >
      <Dibujo ink={ink} />
    </g>
  );
}

export default PropEnMano;

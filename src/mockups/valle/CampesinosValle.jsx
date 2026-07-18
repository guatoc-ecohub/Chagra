/* eslint-disable react-refresh/only-export-components -- exporta el ROSTER
   (CAMPESINOS_VALLE) además del componente, para que quien cablee pueda
   reposicionar cada faena sobre el terreno real sin tocar el dibujo. */
/*
 * CAMPESINOS EN FAENA — el alma Age-of-Empires del valle.
 *
 * Gente trabajando con PROPÓSITO LEGIBLE: se tiene que leer QUÉ hace cada
 * uno de un vistazo, como los aldeanos de AoE — el que siembra está agachado
 * soltando la semilla, el del azadón golpea la tierra, la cosechadora lleva
 * su canasto, el compostero voltea la pila (con su vapor), la ordeñadora
 * está sentada en el butaco con el balde, y el carguero CAMINA de verdad por
 * el sendero con el costal al hombro.
 *
 * Mismo lenguaje que los vecinos del valle: billboards `<Html>` baratos,
 * SVG rubber-hose (tinta gruesa RH, extremidades de manguera, manos crema,
 * squash & stretch), aria-hidden, cero toques — presencia, no interfaz.
 * AUTOCONTENIDO: dibujo + keyframes viven aquí (el CSS se inyecta una sola
 * vez en <head>); no toca el kit de creatures ni la escena.
 *
 * Cada faena vive DONDE tiene sentido (composicionValle.js):
 * eras para sembrar, huerta para deshierbar, milpa para cosechar, la pila
 * de abono para voltear, la tranquera del potrero para ordeñar, y los
 * senderos 'plaza' y 'agua' para los que cargan. Jerarquía respetada:
 * px ≤ 44 (vecinoMaxPx), nadie compite con Angelita.
 *
 * Props:
 *   alturaDe(x, z) → y   posa cada campesino en el terreno real
 *   tier                 'bajo' | 'medio' | 'alto' → 3 / 8 / 12 campesinos
 *   reducedMotion        true → fotograma digno (pose mid-faena, sin loops
 *                        ni caminantes; los caminantes quedan plantados)
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

/* ── La tinta y las pieles (mismo INK del kit rubber-hose) ─────────────── */
const INK = '#2a1a0c';
const CREMA = '#f6ead2'; // manos-mitón, la firma Cuphead
const PALETAS = [
  // ruana con franja, camisa, piel, sombrero — campesinado diverso, tonos tierra
  { ruana: '#8c3f2c', franja: '#5e2a1d', camisa: '#d9cfae', piel: '#c98a5b', ala: '#efe3bd' },
  { ruana: '#4a5d3a', franja: '#33422a', camisa: '#e3d8b8', piel: '#a8683f', ala: '#e9d9a8' },
  { ruana: '#6b4a2e', franja: '#4a331f', camisa: '#d6c9a5', piel: '#8a512e', ala: '#f0e5c2' },
  { ruana: '#7a2e3b', franja: '#521e28', camisa: '#ded2b0', piel: '#b5764a', ala: '#ecdcb0' },
  { ruana: '#3f566b', franja: '#2b3c4c', camisa: '#e0d5b5', piel: '#c98a5b', ala: '#efe3bd' },
  { ruana: '#5d4a6b', franja: '#41334c', camisa: '#dccfa9', piel: '#9c5c33', ala: '#e9d9a8' },
];

/* ── EL ROSTER (dónde y qué faena — exportado para el cableado) ──────────
   punto [x, z] en unidades de mundo del valle (misma escala que
   VECINOS_VALLE / SENDEROS_VALLE de composicionValle.js). Los caminantes
   llevan `ruta` (waypoints tomados de SENDEROS_VALLE) en vez de punto.
   `tier` = el mínimo en que aparece ('bajo' ⊂ 'medio' ⊂ 'alto'). */
export const CAMPESINOS_VALLE = [
  // — TIER BAJO (3): el mínimo vital, una faena de cada familia —
  { id: 'sembrador-eras', faena: 'siembra', punto: [-2.1, 5.3], tier: 'bajo', px: 32, factor: 7.8, dy: 0.5 },
  { id: 'azadon-huerta', faena: 'deshierba', punto: [1.6, 4.2], tier: 'bajo', px: 33, factor: 7.8, dy: 0.5 },
  {
    id: 'carguero-plaza', faena: 'carga', carga: 'bulto', tier: 'bajo', px: 33, factor: 8, dy: 0.52,
    ruta: [[1.4, 4.0], [3.2, 4.7], [4.8, 6.2]], velocidad: 0.55, // sendero 'plaza'
  },
  // — TIER MEDIO (+5 = 8): el valle en jornada —
  { id: 'ordenadora-potrero', faena: 'ordeno', punto: [-4.15, 6.85], tier: 'medio', px: 30, factor: 7.5, dy: 0.42 },
  { id: 'compostero-pila', faena: 'compost', punto: [-3.05, 7.75], tier: 'medio', px: 32, factor: 7.6, dy: 0.5 },
  { id: 'cosechadora-milpa', faena: 'cosecha', punto: [-4.7, 2.6], tier: 'medio', px: 32, factor: 7.8, dy: 0.5 },
  { id: 'sembradora-vivero', faena: 'siembra', punto: [-0.85, 6.35], tier: 'medio', px: 30, factor: 7.4, dy: 0.48 },
  {
    id: 'aguatero-quebrada', faena: 'carga', carga: 'balde', tier: 'medio', px: 30, factor: 7.6, dy: 0.5,
    ruta: [[-0.5, 2.2], [0.5, 1.0], [1.3, 0.1]], velocidad: 0.45, // sendero 'agua'
  },
  // — TIER ALTO (+4 = 12): la vereda entera trabajando —
  { id: 'cosechador-huerta', faena: 'cosecha', punto: [1.1, 3.55], tier: 'alto', px: 30, factor: 7.4, dy: 0.48 },
  { id: 'deshierba-eras', faena: 'deshierba', punto: [-1.5, 4.8], tier: 'alto', px: 30, factor: 7.4, dy: 0.48 },
  { id: 'azadon-milpa', faena: 'deshierba', punto: [-5.25, 2.15], tier: 'alto', px: 30, factor: 7.6, dy: 0.48 },
  { id: 'sembrador-milpa', faena: 'siembra', punto: [-4.45, 3.05], tier: 'alto', px: 29, factor: 7.4, dy: 0.46 },
];

const NIVEL = { bajo: 0, medio: 1, alto: 2 };

/* ── El CSS de las faenas (keyframes) — inyectado UNA vez ────────────────
   Cada gesto es un loop corto con la física rubber-hose: anticipación
   lenta, golpe rápido, settle. transform-box fill-box + origen inline por
   grupo = los miembros pivotan en su hombro/cadera real. Con
   prefers-reduced-motion el navegador también los apaga (cinturón y
   tirantes además del prop reducedMotion). */
const STYLE_ID = 'cv-campesinos-valle';
const CSS = `
.cv-campesino { pointer-events: none; will-change: transform; }
.cv-campesino svg { display: block; overflow: visible; }
.cv-g { transform-box: fill-box; }

/* respiración de fondo: vida, no espectáculo */
.cv--anim .cv-respira { animation: cvRespira 3.6s ease-in-out infinite; }
@keyframes cvRespira { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.03); } }

/* SIEMBRA: se agacha con calma, suelta la semilla, se endereza */
.cv--anim .cv-siembra-torso { animation: cvSiembraTorso 3.4s cubic-bezier(0.45, 0, 0.25, 1) infinite; }
@keyframes cvSiembraTorso {
  0%, 10% { transform: rotate(10deg); }
  38%, 60% { transform: rotate(50deg); }
  88%, 100% { transform: rotate(10deg); }
}
.cv--anim .cv-siembra-brazo { animation: cvSiembraBrazo 3.4s cubic-bezier(0.45, 0, 0.25, 1) infinite; }
@keyframes cvSiembraBrazo {
  0%, 10% { transform: rotate(0deg); }
  38%, 60% { transform: rotate(26deg); }
  88%, 100% { transform: rotate(0deg); }
}
.cv--anim .cv-semilla { animation: cvSemilla 3.4s linear infinite; }
@keyframes cvSemilla {
  0%, 42% { opacity: 0; transform: translateY(0); }
  46% { opacity: 1; transform: translateY(1px); }
  56% { opacity: 1; transform: translateY(9px); }
  62%, 100% { opacity: 0; transform: translateY(10px); }
}

/* DESHIERBA: azadón — alza lento (anticipación), golpe RÁPIDO, saca */
.cv--anim .cv-azadon { animation: cvAzadon 2s cubic-bezier(0.4, 0, 0.3, 1) infinite; }
@keyframes cvAzadon {
  0%, 8% { transform: rotate(-42deg); }
  34% { transform: rotate(-56deg); }
  46% { transform: rotate(26deg); }
  58% { transform: rotate(20deg); }
  100% { transform: rotate(-42deg); }
}
.cv--anim .cv-golpe { animation: cvGolpe 2s ease-out infinite; }
@keyframes cvGolpe {
  0%, 40% { transform: scaleY(1) translateY(0); }
  48% { transform: scaleY(0.93) translateY(1.3px); }
  62%, 100% { transform: scaleY(1) translateY(0); }
}
.cv--anim .cv-tierrita { animation: cvTierrita 2s linear infinite; }
@keyframes cvTierrita {
  0%, 44% { opacity: 0; transform: translate(0, 0); }
  48% { opacity: 0.9; transform: translate(1.5px, -2.5px); }
  58% { opacity: 0; transform: translate(3px, -1px); }
  100% { opacity: 0; }
}

/* COSECHA: la mano va de la mata al canasto (y el frutico viaja) */
.cv--anim .cv-cosecha-brazo { animation: cvCosechaBrazo 2.8s cubic-bezier(0.5, 0, 0.3, 1) infinite; }
@keyframes cvCosechaBrazo {
  0%, 14% { transform: rotate(-58deg); }
  36%, 44% { transform: rotate(-64deg); }
  68%, 78% { transform: rotate(12deg); }
  100% { transform: rotate(-58deg); }
}
.cv--anim .cv-fruto { animation: cvFruto 2.8s cubic-bezier(0.5, 0, 0.3, 1) infinite; }
@keyframes cvFruto {
  0%, 40% { opacity: 0; transform: translate(0, 0); }
  46% { opacity: 1; transform: translate(-1px, 1px); }
  72% { opacity: 1; transform: translate(-12px, 15px); }
  78%, 100% { opacity: 0; transform: translate(-12px, 16px); }
}

/* COMPOST: palea — clava, levanta con giro, vuelca; el vapor sube */
.cv--anim .cv-pala { animation: cvPala 3.2s cubic-bezier(0.45, 0, 0.3, 1) infinite; }
@keyframes cvPala {
  0%, 10% { transform: rotate(16deg) translateY(0); }
  32% { transform: rotate(30deg) translateY(2px); }
  58% { transform: rotate(-34deg) translateY(-3px); }
  70% { transform: rotate(-40deg) translateY(-3px); }
  100% { transform: rotate(16deg) translateY(0); }
}
.cv--anim .cv-compost-torso { animation: cvCompostTorso 3.2s cubic-bezier(0.45, 0, 0.3, 1) infinite; }
@keyframes cvCompostTorso {
  0%, 10% { transform: rotate(14deg); }
  32% { transform: rotate(22deg); }
  58%, 70% { transform: rotate(-6deg); }
  100% { transform: rotate(14deg); }
}
.cv--anim .cv-vapor { animation: cvVapor 4.2s ease-in-out infinite; }
@keyframes cvVapor {
  0% { opacity: 0; transform: translateY(2px) scale(0.8); }
  30% { opacity: 0.55; }
  70% { opacity: 0.25; }
  100% { opacity: 0; transform: translateY(-7px) scale(1.15); }
}

/* ORDEÑO: los antebrazos bombean alternados (rápido y tierno) */
.cv--anim .cv-ordeno-a { animation: cvOrdeno 0.9s ease-in-out infinite; }
.cv--anim .cv-ordeno-b { animation: cvOrdeno 0.9s ease-in-out infinite; }
@keyframes cvOrdeno { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(15deg); } }
.cv--anim .cv-chorro-a { animation: cvChorro 0.9s linear infinite; }
.cv--anim .cv-chorro-b { animation: cvChorro 0.9s linear infinite; }
@keyframes cvChorro { 0%, 38% { opacity: 0; } 46%, 58% { opacity: 0.9; } 66%, 100% { opacity: 0; } }

/* CARGA: ciclo de marcha — piernas alternadas, cuerpo que rebota,
   el bulto amortigua a contratiempo (follow-through) */
.cv--anim .cv-paso-a { animation: cvPaso 0.86s ease-in-out infinite; }
.cv--anim .cv-paso-b { animation: cvPaso 0.86s ease-in-out infinite; }
@keyframes cvPaso { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
.cv--anim .cv-marcha { animation: cvMarcha 0.43s ease-in-out infinite; }
@keyframes cvMarcha { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.3px); } }
.cv--anim .cv-bulto { animation: cvBulto 0.43s ease-in-out infinite; }
@keyframes cvBulto { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-2.5deg); } }
.cv--anim .cv-brazo-libre { animation: cvBrazoLibre 0.86s ease-in-out infinite; }
@keyframes cvBrazoLibre { 0%, 100% { transform: rotate(-18deg); } 50% { transform: rotate(18deg); } }

/* desfase por instancia (--cv-delay negativo, lo pone el billboard):
   dos sembradores de la misma vereda nunca quedan clonados en fase.
   AL FINAL de la hoja: gana sobre los shorthand animation de arriba. */
.cv--anim .cv-g { animation-delay: var(--cv-delay, 0s); }
.cv--anim .cv-ordeno-b { animation-delay: calc(var(--cv-delay, 0s) - 0.45s); }
.cv--anim .cv-chorro-b { animation-delay: calc(var(--cv-delay, 0s) - 0.45s); }
.cv--anim .cv-paso-b { animation-delay: calc(var(--cv-delay, 0s) - 0.43s); }
.cv--anim .cv-bulto { animation-delay: calc(var(--cv-delay, 0s) - 0.1s); }

@media (prefers-reduced-motion: reduce) {
  .cv--anim * { animation: none !important; }
}
`;

function useEstiloCampesinos() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
    // No se retira al desmontar: es compartido entre instancias y pesa ~3KB.
  }, []);
}

/* ── Piezas compartidas del cuerpo (viewBox "-20 -32 40 62", suelo y=28) ── */

/** Sombrero aguadeño: ala ancha clara + copa con cinta oscura. */
function Sombrero({ x = 0, y = -26, paleta, giro = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <ellipse cx="0" cy="1.6" rx="9.2" ry="2.7" fill={paleta.ala} stroke={INK} strokeWidth="1.1" />
      <path d="M -4.6 1.4 Q -4.9 -3.6 0 -3.8 Q 4.9 -3.6 4.6 1.4 Z" fill={paleta.ala} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <rect x="-4.7" y="-0.4" width="9.4" height="1.9" rx="0.9" fill={paleta.franja} stroke={INK} strokeWidth="0.6" />
    </g>
  );
}

/** Cabeza rubber-hose: cachetona, ojos de tinta con brillo, sonrisa. */
function Cabeza({ x = 0, y = -20, paleta, mira = 1 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="5.6" fill={paleta.piel} stroke={INK} strokeWidth="1.2" />
      <ellipse cx={1.9 * mira} cy="-0.6" rx="1" ry="1.5" fill={INK} />
      <circle cx={1.6 * mira} cy="-1.1" r="0.35" fill="#fff" opacity="0.9" />
      <ellipse cx={-1.4 * mira} cy="-0.6" rx="0.9" ry="1.4" fill={INK} />
      <path d={`M ${0.4 * mira} 2.2 q ${1.6 * mira} 1.3 ${2.8 * mira} 0.2`} stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <ellipse cx={-3 * mira} cy="1.4" rx="1.2" ry="0.8" fill="#d96a4a" opacity="0.35" />
    </g>
  );
}

/** Miembro de manguera: tubo de tinta con mitón crema en la punta. */
function Manguera({ d, ancho = 2.4, punta = null, puntaR = 1.7, pie = false }) {
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={ancho} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {punta && (pie ? (
        <ellipse cx={punta[0]} cy={punta[1]} rx={puntaR * 1.5} ry={puntaR * 0.85} fill="#241c14" stroke={INK} strokeWidth="0.8" />
      ) : (
        <circle cx={punta[0]} cy={punta[1]} r={puntaR} fill={CREMA} stroke={INK} strokeWidth="0.8" />
      ))}
    </g>
  );
}

/** Piernas plantadas con botas pantaneras (la firma del campesino). */
function PiernasBotas({ abre = 3.4 }) {
  return (
    <g>
      <Manguera d={`M ${-abre} 6 L ${-abre - 0.6} 22`} punta={[-abre - 1.2, 24]} pie />
      <Manguera d={`M ${abre} 6 L ${abre + 0.6} 22`} punta={[abre + 1.2, 24]} pie />
    </g>
  );
}

/** Ruana con franja: el torso trapecio del rubber-hose andino. */
function Ruana({ paleta, y = -14, alto = 20 }) {
  const y1 = y + alto;
  return (
    <g>
      <path
        d={`M -7.2 ${y + 2} L 7.2 ${y + 2} L 9.6 ${y1} L -9.6 ${y1} Z`}
        fill={paleta.ruana} stroke={INK} strokeWidth="1.3" strokeLinejoin="round"
      />
      <path d={`M ${-8.4} ${y1 - 4.5} L ${8.4} ${y1 - 4.5}`} stroke={paleta.franja} strokeWidth="2.2" />
      {/* flecos */}
      <path d={`M -9.6 ${y1} l 0.9 1.6 M -6 ${y1} l 0.6 1.7 M -2.2 ${y1} l 0.3 1.8 M 1.8 ${y1} l -0.2 1.8 M 5.6 ${y1} l -0.6 1.7 M 9.4 ${y1} l -0.9 1.6`} stroke={paleta.franja} strokeWidth="0.8" strokeLinecap="round" />
      <path d={`M -2.6 ${y + 2} L 0 ${y + 5} L 2.6 ${y + 2}`} fill="none" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    </g>
  );
}

/* ── Las FAENAS (cada una una escenita legible de un vistazo) ──────────── */

/** SIEMBRA: agachado sobre el surco, la mano suelta la semilla que CAE. */
function FiguraSiembra({ paleta }) {
  return (
    <g>
      {/* el surco: montículo de tierra con hueco */}
      <ellipse cx="10.5" cy="26.5" rx="5" ry="1.7" fill="#6b4a2e" opacity="0.85" />
      <ellipse cx="10.5" cy="26" rx="1.6" ry="0.7" fill="#3d2a18" />
      {/* matica ya sembrada al lado: el trabajo AVANZA */}
      <path d="M 16.5 26 q -0.4 -3 0.3 -4.6 M 16.6 23.4 q 1.6 -0.6 2.2 -2 M 16.5 23.8 q -1.5 -0.9 -1.8 -2.3" stroke="#4f7a3a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <PiernasBotas abre={3.8} />
      {/* torso entero pivota en la cadera: el gesto de agacharse */}
      <g className="cv-g cv-siembra-torso" style={{ transformOrigin: '50% 100%' }}>
        <g className="cv-g cv-respira" style={{ transformOrigin: '50% 100%' }}>
          <Ruana paleta={paleta} />
          <Cabeza paleta={paleta} />
          <Sombrero paleta={paleta} giro={4} />
          {/* brazo de atrás con la bolsita de semillas */}
          <Manguera d="M -4.5 -9 Q -8.5 -5.5 -7.5 -1.5" punta={[-7.3, -0.7]} />
          <path d="M -9.3 -0.4 q 1.8 -2 3.9 0 q 0.4 3 -2 3.2 q -2.3 -0.3 -1.9 -3.2 Z" fill="#c9a86a" stroke={INK} strokeWidth="0.8" />
          {/* brazo que siembra: pivota en el hombro y estira a la tierra */}
          <g className="cv-g cv-siembra-brazo" style={{ transformOrigin: '30% 20%' }}>
            <Manguera d="M 4.5 -9 Q 9 -4 11.5 1.5" punta={[11.9, 2.6]} />
          </g>
        </g>
      </g>
      {/* la semilla que cae al hueco (nace cerca de la mano agachada) */}
      <g className="cv-g cv-semilla">
        <circle cx="10.6" cy="16" r="0.9" fill="#8a5a33" stroke={INK} strokeWidth="0.5" />
      </g>
    </g>
  );
}

/** DESHIERBA: el azadón sube lento y BAJA con golpe; salta tierrita. */
function FiguraDeshierba({ paleta }) {
  return (
    <g>
      {/* la maleza que está sacando */}
      <path d="M 12 27 q -0.6 -3.4 0.4 -5 M 12.2 24 q 1.8 -0.4 2.6 -1.8 M 12 24.6 q -1.8 -0.6 -2.4 -2.2 M 15 27 q -0.3 -2.4 0.5 -3.6" stroke="#5d7a3a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <PiernasBotas abre={4.2} />
      <g className="cv-g cv-golpe" style={{ transformOrigin: '50% 100%' }}>
        <g transform="rotate(8)">
          <Ruana paleta={paleta} />
          <Cabeza paleta={paleta} />
          <Sombrero paleta={paleta} giro={-3} />
        </g>
        {/* brazos + azadón: un solo grupo que pivota en los hombros */}
        <g className="cv-g cv-azadon" style={{ transformOrigin: '42% 22%' }}>
          <Manguera d="M -4 -9.5 Q 2 -7.5 6.5 -4.5" />
          <Manguera d="M 4.5 -10 Q 7 -8 8.5 -5.5" />
          {/* el cabo y la cuchilla del azadón */}
          <path d="M 6 -6.5 L 15.5 6.5" stroke="#8a5a33" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M 15.5 6.5 l 4.2 -0.8 l -1 4.6 Z" fill="#9aa1a8" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <circle cx="6.6" cy="-5.6" r="1.7" fill={CREMA} stroke={INK} strokeWidth="0.8" />
          <circle cx="9.2" cy="-4.4" r="1.7" fill={CREMA} stroke={INK} strokeWidth="0.8" />
        </g>
      </g>
      {/* la tierrita que salta con el golpe */}
      <g className="cv-g cv-tierrita">
        <circle cx="16" cy="24" r="0.8" fill="#6b4a2e" />
        <circle cx="18" cy="25" r="0.6" fill="#8a5a33" />
        <circle cx="14.6" cy="22.8" r="0.5" fill="#6b4a2e" />
      </g>
    </g>
  );
}

/** COSECHA: canasto a la cadera; la mano va de la mata al canasto
    y el frutico VIAJA con ella. Campesina de falda. */
function FiguraCosecha({ paleta }) {
  return (
    <g>
      {/* la mata cargada (frutos rojos) a su derecha */}
      <g>
        <path d="M 13 27 q -0.8 -8 0.5 -12 M 13.3 18 q 2.6 -1 3.6 -3 M 13.2 20.5 q -2.6 -0.8 -3.6 -2.8 M 13.4 15.5 q 2 -0.6 2.8 -2.2" stroke="#4f7a3a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="16.2" cy="14.2" r="1.2" fill="#c0392b" stroke={INK} strokeWidth="0.5" />
        <circle cx="9.8" cy="17" r="1.1" fill="#c0392b" stroke={INK} strokeWidth="0.5" />
        <circle cx="15.6" cy="18.6" r="1.1" fill="#e67e22" stroke={INK} strokeWidth="0.5" />
      </g>
      {/* falda en vez de piernas de manguera: la cosechadora */}
      <path d="M -6.5 4 L 6.5 4 L 9 23 L -9 23 Z" fill={paleta.franja} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <Manguera d="M -3.4 23 L -3.4 24.5" punta={[-3.6, 25.6]} pie puntaR={1.5} />
      <Manguera d="M 3.4 23 L 3.4 24.5" punta={[3.6, 25.6]} pie puntaR={1.5} />
      <g className="cv-g cv-respira" style={{ transformOrigin: '50% 100%' }}>
        <Ruana paleta={paleta} y={-14} alto={18} />
        <Cabeza paleta={paleta} />
        <Sombrero paleta={paleta} giro={2} />
        {/* brazo del canasto (quieto, sostiene a la cadera) */}
        <Manguera d="M -4.5 -9 Q -8 -3 -6.5 2.5" punta={[-6.2, 3.4]} />
        {/* brazo que cosecha: pivota del hombro, de la mata al canasto */}
        <g className="cv-g cv-cosecha-brazo" style={{ transformOrigin: '32% 22%' }}>
          <Manguera d="M 4.5 -9 Q 9.5 -6.5 12 -2.5" punta={[12.6, -1.6]} />
        </g>
      </g>
      {/* el canasto de bejuco a la cadera */}
      <g>
        <path d="M -12.5 3 L -3.5 3 L -4.6 9.5 L -11.4 9.5 Z" fill="#b98a4e" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M -11.9 5.2 L -4.1 5.2 M -11.6 7.3 L -4.4 7.3 M -9.9 3.2 L -10.4 9.3 M -7.6 3.2 L -7.7 9.3 M -5.6 3.2 L -5.2 9.3" stroke="#7a5427" strokeWidth="0.6" />
        <circle cx="-7" cy="2.4" r="1" fill="#c0392b" stroke={INK} strokeWidth="0.4" />
        <circle cx="-9.4" cy="2.2" r="0.9" fill="#e67e22" stroke={INK} strokeWidth="0.4" />
      </g>
      {/* el frutico que viaja de la mano al canasto */}
      <g className="cv-g cv-fruto">
        <circle cx="5.5" cy="-12.5" r="1.15" fill="#c0392b" stroke={INK} strokeWidth="0.5" />
      </g>
    </g>
  );
}

/** COMPOST: voltea la pila con la pala — clava, alza con giro, vuelca.
    La pila humea: abono VIVO. */
function FiguraCompost({ paleta }) {
  return (
    <g>
      {/* la pila de compost con su vapor */}
      <path d="M 8 27.5 Q 9.5 20.5 14 20 Q 18.5 20.5 20 27.5 Z" fill="#4a3320" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 10.5 24.5 q 1.4 -1.2 2.8 0 M 14.5 22.8 q 1.2 -1 2.4 0" stroke="#6b4a2e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <g className="cv-g cv-vapor">
        <path d="M 12.5 19 q -1.2 -2.4 0.3 -4.4 q 1.4 -1.8 0.4 -3.6" stroke="#cfd8cf" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M 16.3 19.5 q 1 -2 -0.2 -3.8 q -1 -1.8 0 -3.4" stroke="#cfd8cf" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </g>
      <PiernasBotas abre={4} />
      <g className="cv-g cv-compost-torso" style={{ transformOrigin: '50% 100%' }}>
        <Ruana paleta={paleta} />
        <Cabeza paleta={paleta} />
        <Sombrero paleta={paleta} giro={-4} />
      </g>
      {/* brazos + horquilla: el grupo que palea */}
      <g className="cv-g cv-pala" style={{ transformOrigin: '46% 28%' }}>
        <Manguera d="M -3.5 -8.5 Q 2 -6 5.5 -3" />
        <Manguera d="M 4.5 -9.5 Q 7 -7.5 8.5 -5" />
        <path d="M 4.5 -5 L 13.5 8.5" stroke="#8a5a33" strokeWidth="1.9" strokeLinecap="round" />
        {/* horquilla de 3 dientes */}
        <path d="M 12 6.3 l 4.4 3 M 13.5 8.5 l 2.6 3.6 M 14.9 7.2 l 3.6 3.3 M 12 6.3 L 14.9 7.2" stroke="#9aa1a8" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="5.8" cy="-3.9" r="1.7" fill={CREMA} stroke={INK} strokeWidth="0.8" />
        <circle cx="8.9" cy="-4.6" r="1.7" fill={CREMA} stroke={INK} strokeWidth="0.8" />
        {/* la palada de abono en los dientes */}
        <ellipse cx="14.6" cy="8" rx="2.6" ry="1.3" fill="#4a3320" stroke={INK} strokeWidth="0.5" transform="rotate(35 14.6 8)" />
      </g>
    </g>
  );
}

/** ORDEÑO: sentada en el butaco con el balde entre los pies; los
    antebrazos bombean alternados y el chorrito cae al balde. */
function FiguraOrdeno({ paleta }) {
  return (
    <g transform="translate(0 4)">
      {/* butaco de tres patas */}
      <g>
        <ellipse cx="-6" cy="12" rx="4.4" ry="1.6" fill="#8a5a33" stroke={INK} strokeWidth="1" />
        <path d="M -8.6 13 L -9.4 22 M -6 13.4 L -6 22.5 M -3.4 13 L -2.6 22" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* el balde lechero */}
      <g>
        <path d="M 6.5 14 L 13.5 14 L 12.5 22.5 L 7.5 22.5 Z" fill="#aeb6bd" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <ellipse cx="10" cy="14" rx="3.5" ry="1" fill="#e9edf0" stroke={INK} strokeWidth="0.8" />
        <path d="M 7 14 Q 10 10.5 13 14" stroke={INK} strokeWidth="0.9" fill="none" />
      </g>
      {/* sentada: torso erguido, piernas dobladas hacia el balde */}
      <Manguera d="M -4 10 Q 0 10.5 2.5 14 L 3.5 20" punta={[3.8, 21.5]} pie puntaR={1.5} />
      <Manguera d="M -2.5 10.5 Q 1.5 12 4.5 15.5 L 5.5 20.5" punta={[6, 21.8]} pie puntaR={1.5} />
      <g className="cv-g cv-respira" style={{ transformOrigin: '50% 100%' }}>
        <g transform="translate(-4 -6) rotate(6)">
          <Ruana paleta={paleta} y={-9} alto={16} />
          <Cabeza paleta={paleta} y={-15} />
          <Sombrero paleta={paleta} y={-21} giro={5} />
        </g>
        {/* los dos antebrazos que ordeñan, alternados */}
        <g className="cv-g cv-ordeno-a" style={{ transformOrigin: '20% 10%' }}>
          <Manguera d="M -1 -9 Q 4 -5.5 7 -0.5" punta={[7.6, 0.6]} />
        </g>
        <g className="cv-g cv-ordeno-b" style={{ transformOrigin: '20% 10%' }}>
          <Manguera d="M -2 -7 Q 3 -3 5.5 1.5" punta={[6.1, 2.6]} />
        </g>
      </g>
      {/* los chorritos a destiempo */}
      <path className="cv-g cv-chorro-a" d="M 8.2 3.5 Q 9.4 8 9.6 12.5" stroke="#fdf8ec" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path className="cv-g cv-chorro-b" d="M 6.8 5.5 Q 8.6 9 9 12.5" stroke="#fdf8ec" strokeWidth="0.7" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** CARGA: en marcha con el costal (o el balde de agua) — piernas
    alternadas, rebote del cuerpo, el bulto amortigua a contratiempo. */
function FiguraCarga({ paleta, carga = 'bulto' }) {
  return (
    <g>
      {/* piernas en ciclo de marcha (pivotan en la cadera) */}
      <g className="cv-g cv-paso-a" style={{ transformOrigin: '50% 12%' }}>
        <Manguera d="M -1 6 L -2 21" punta={[-2.6, 23.4]} pie />
      </g>
      <g className="cv-g cv-paso-b" style={{ transformOrigin: '50% 12%' }}>
        <Manguera d="M 1 6 L 2 21" punta={[2.6, 23.4]} pie />
      </g>
      <g className="cv-g cv-marcha">
        {/* torso levemente echado adelante: va PARA algún lado */}
        <g transform="rotate(6)">
          <Ruana paleta={paleta} />
          <Cabeza paleta={paleta} />
          <Sombrero paleta={paleta} giro={-6} />
          {/* brazo libre balanceando */}
          <g className="cv-g cv-brazo-libre" style={{ transformOrigin: '38% 22%' }}>
            <Manguera d="M -4.5 -9 Q -6.5 -4 -6 1" punta={[-5.9, 2.2]} />
          </g>
          {/* brazo que agarra la carga */}
          {carga === 'bulto' ? (
            <>
              <g className="cv-g cv-bulto" style={{ transformOrigin: '30% 80%' }}>
                {/* el costal al hombro: gordo, amarrado, con peso */}
                <path d="M 1 -22 Q 12 -26 15 -18 Q 16.5 -12.5 9 -11 Q 2 -10.5 0.5 -16 Q 0 -20 1 -22 Z" fill="#d8c39a" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M 3.5 -21.5 q 4 2.6 9.5 1.2 M 2 -17.5 q 5 2.6 11 0.6" stroke="#a8926a" strokeWidth="0.7" fill="none" />
                <path d="M 14 -19.5 l 2.6 -1.8 M 14.6 -18.4 l 3 -0.4" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
                <circle cx="14.7" cy="-18.9" r="1" fill="#b8a276" stroke={INK} strokeWidth="0.7" />
              </g>
              <Manguera d="M 5 -9.5 Q 8.5 -12 8.5 -15" punta={[8.4, -15.8]} />
            </>
          ) : (
            <>
              {/* el balde de agua en la mano, camino de la quebrada */}
              <Manguera d="M 5 -9 Q 8 -4.5 8.5 0.5" punta={[8.6, 1.6]} />
              <g className="cv-g cv-bulto" style={{ transformOrigin: '50% 0%' }}>
                <path d="M 8.6 2.6 Q 11.2 5.8 11 8.2 M 8.6 2.6 Q 6 5.8 6.2 8.2" stroke={INK} strokeWidth="0.8" fill="none" />
                <path d="M 5.6 8 L 11.6 8 L 10.9 14 L 6.3 14 Z" fill="#aeb6bd" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
                <ellipse cx="8.6" cy="8" rx="3" ry="0.8" fill="#7fa8c9" stroke={INK} strokeWidth="0.6" />
              </g>
            </>
          )}
        </g>
      </g>
    </g>
  );
}

const FIGURAS = {
  siembra: FiguraSiembra,
  deshierba: FiguraDeshierba,
  cosecha: FiguraCosecha,
  compost: FiguraCompost,
  ordeno: FiguraOrdeno,
  carga: FiguraCarga,
};

/* ── El billboard de un campesino (mismo contrato que VecinosDelValle) ─── */
function CampesinoBillboard({ def, paleta, animated, flipRef = null, delayBase = 0 }) {
  const Figura = FIGURAS[def.faena];
  if (!Figura) return null;
  const w = def.px;
  const h = Math.round(def.px * 1.55); // viewBox 40×62
  return (
    <Html center distanceFactor={def.factor} zIndexRange={[6, 0]} pointerEvents="none">
      <div
        className={`valle-critter cv-campesino ${animated ? 'cv--anim' : ''}`}
        data-campesino={def.id}
        data-faena={def.faena}
        aria-hidden="true"
        style={{ '--cv-delay': `${delayBase}s` }}
      >
        <div ref={flipRef} style={{ width: w, height: h }}>
          <svg viewBox="-20 -32 40 62" width={w} height={h}>
            <Figura paleta={paleta} carga={def.carga} />
          </svg>
        </div>
      </div>
    </Html>
  );
}

/** Campesino PLANTADO en su sitio de trabajo. */
function CampesinoFijo({ def, paleta, alturaDe, animated, delayBase }) {
  const [x, z] = def.punto;
  const y = (alturaDe ? alturaDe(x, z) : 0) + (def.dy ?? 0.5);
  return (
    <group position={[x, y, z]}>
      <CampesinoBillboard def={def} paleta={paleta} animated={animated} delayBase={delayBase} />
    </group>
  );
}

/* Recorre una polilínea [[x,z],...] por longitud de arco. */
function prepararRuta(puntos) {
  const largos = [0];
  for (let i = 1; i < puntos.length; i++) {
    const dx = puntos[i][0] - puntos[i - 1][0];
    const dz = puntos[i][1] - puntos[i - 1][1];
    largos.push(largos[i - 1] + Math.hypot(dx, dz));
  }
  return { puntos, largos, total: largos[largos.length - 1] };
}

function puntoEnRuta(ruta, s) {
  const d = s * ruta.total;
  let i = 1;
  while (i < ruta.largos.length - 1 && ruta.largos[i] < d) i++;
  const d0 = ruta.largos[i - 1];
  const seg = ruta.largos[i] - d0 || 1;
  const t = (d - d0) / seg;
  const [x0, z0] = ruta.puntos[i - 1];
  const [x1, z1] = ruta.puntos[i];
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, dx: x1 - x0 };
}

/** Campesino EN MARCHA: va y vuelve por su sendero (ping-pong con
    pausa en las puntas — llega, "entrega", y arranca de vuelta). */
function CampesinoCaminante({ def, paleta, alturaDe, animated, delayBase }) {
  const grupo = useRef(null);
  const flip = useRef(null);
  const reloj = useRef(delayBase * 1.7); // desfase para que no marchen en fila india
  const ruta = useMemo(() => prepararRuta(def.ruta), [def.ruta]);
  // Sin animación: plantado a mitad de camino, pose de marcha digna.
  const reposo = useMemo(() => puntoEnRuta(ruta, 0.5), [ruta]);

  useFrame((_, delta) => {
    if (!animated || !grupo.current) return;
    reloj.current += delta * (def.velocidad ?? 0.5);
    // ping-pong con meseta en las puntas (dwell del 8% por lado)
    const ciclo = reloj.current % 2;
    const u = ciclo < 1 ? ciclo : 2 - ciclo;
    const s = Math.min(1, Math.max(0, (u - 0.08) / 0.84));
    const { x, z, dx } = puntoEnRuta(ruta, s * s * (3 - 2 * s));
    const y = (alturaDe ? alturaDe(x, z) : 0) + (def.dy ?? 0.5);
    grupo.current.position.set(x, y, z);
    // mira hacia donde camina (espejo del sprite; en la meseta no voltea)
    if (flip.current && s > 0.02 && s < 0.98) {
      const dir = (ciclo < 1 ? dx : -dx) >= 0 ? 1 : -1;
      flip.current.style.transform = `scaleX(${dir})`;
    }
  });

  const y0 = (alturaDe ? alturaDe(reposo.x, reposo.z) : 0) + (def.dy ?? 0.5);
  return (
    <group ref={grupo} position={[reposo.x, y0, reposo.z]}>
      <CampesinoBillboard def={def} paleta={paleta} animated={animated} flipRef={flip} delayBase={delayBase} />
    </group>
  );
}

/**
 * <CampesinosValle> — el grupo r3f de la gente en faena.
 *
 * @param {Object} props
 * @param {(x:number, z:number) => number} props.alturaDe  y del terreno
 * @param {'bajo'|'medio'|'alto'} [props.tier='alto']  3 / 8 / 12 campesinos
 * @param {boolean} [props.reducedMotion=false]
 */
export function CampesinosValle({ alturaDe, tier = 'alto', reducedMotion = false }) {
  useEstiloCampesinos();
  const nivel = NIVEL[tier] ?? NIVEL.alto;
  const activos = useMemo(
    () => CAMPESINOS_VALLE.filter((c) => NIVEL[c.tier] <= nivel),
    [nivel],
  );
  const animated = !reducedMotion;
  return (
    <group>
      {activos.map((def, i) => {
        // paleta y desfase deterministas por índice: vereda variada, no clones
        const paleta = PALETAS[i % PALETAS.length];
        const delayBase = -((i * 0.77) % 2.6);
        return def.ruta ? (
          <CampesinoCaminante
            key={def.id} def={def} paleta={paleta} alturaDe={alturaDe}
            animated={animated} delayBase={delayBase}
          />
        ) : (
          <CampesinoFijo
            key={def.id} def={def} paleta={paleta} alturaDe={alturaDe}
            animated={animated} delayBase={delayBase}
          />
        );
      })}
    </group>
  );
}

export default CampesinosValle;

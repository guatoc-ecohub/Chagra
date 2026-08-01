/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup de diseño: texto de muestra, no cadenas de UI de producción (ADR-050) */
/**
 * AvatarGameBiopunk — MOCKUP de dirección del "juego final de Chagra":
 * El Espíritu de tu Finca (tema biopunk).
 *
 * La finca es un organismo vivo NAVEGABLE (ramas = mundos, hojas = especies,
 * frutos = cosechas, raíces/micelio = suelo, luna = clima) y un AVATAR de
 * especie nativa colombiana vive en él: evoluciona semilla→espíritu radiante
 * y su brillo refleja la salud real de la finca. El reloj del frailejón
 * (scrubber inferior) muestra la finca creciendo a 5 años.
 *
 * Es un mockup: datos de muestra hardcodeados, sin servicios reales.
 * Estética: extiende SceneFincaOrganismo (#2190). Ruta dev:
 * #/mockups/avatar-biopunk (sin gate). Prefijo `agb-`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './avatar-game-biopunk.css';

const ANIO_BASE = 2026;
const MAX_ANIO = 5;

const ETAPAS = [
  'Semilla de espíritu',
  'Cría de luz',
  'Joven espíritu',
  'Joven espíritu',
  'Guardián de la finca',
  'Espíritu radiante',
];

/* salud simulada por año (0..5): la trayectoria de una finca bien cuidada */
const SALUD = {
  agua: [38, 50, 61, 70, 81, 90],
  suelo: [30, 44, 58, 69, 80, 92],
  biodiversidad: [22, 35, 49, 62, 78, 94],
  constancia: [45, 58, 66, 75, 86, 95],
};
const HOJAS_ANIO = [3, 7, 12, 18, 26, 34]; /* especies registradas */
const FRUTOS_ANIO = [0, 2, 6, 11, 19, 28]; /* cosechas anotadas */

const EJES_PANEL = [
  { id: 'agua', emoji: '💧', c1: '#4fd8ff', c2: '#2dffc4' },
  { id: 'suelo', emoji: '🪱', c1: '#ffb54f', c2: '#9dff3f' },
  { id: 'biodiversidad', emoji: '🦋', c1: '#ff4fd8', c2: '#b28dff' },
  { id: 'constancia', emoji: '🔥', c1: '#9dff3f', c2: '#2dffc4' },
];

const ESPECIES = [
  {
    id: 'chivito',
    corto: 'Chivito',
    nombre: 'Chivito de páramo',
    cientifico: 'Oxypogon guerinii',
    eje: 'Páramo sano y flores nativas',
    glifo: '🐦',
  },
  {
    id: 'rana',
    corto: 'Rana dorada',
    nombre: 'Rana dorada',
    cientifico: 'Phyllobates terribilis',
    eje: 'Agua limpia',
    glifo: '🐸',
  },
  {
    id: 'abeja',
    corto: 'Angelita',
    nombre: 'Abeja angelita',
    cientifico: 'Tetragonisca angustula',
    eje: 'Floración y biodiversidad',
    glifo: '🐝',
  },
  {
    id: 'oso',
    corto: 'Oso',
    nombre: 'Oso de anteojos',
    cientifico: 'Tremarctos ornatus',
    eje: 'Bosque y agroforestería',
    glifo: '🐻',
  },
  {
    id: 'lombriz',
    corto: 'Lombriz',
    nombre: 'Lombriz-micelio',
    cientifico: 'La red que teje el suelo',
    eje: 'Suelo vivo',
    glifo: '🪱',
  },
];

/* ramas del organismo = mundos (de mundosFinca.js, muestra) */
const MUNDOS = [
  {
    id: 'cultivos', rama: 'RAMA I', titulo: 'Cultivos y semillas', glifo: '🌽', minYear: 0,
    node: [70, 378], path: 'M195,438 C158,430 112,410 78,384', origen: [195, 438],
    desc: 'La milpa, la huerta, sus matas y la semilla propia.', hojas: 9, frutos: 12,
  },
  {
    id: 'cafe', rama: 'RAMA II', titulo: 'El café', glifo: '☕', minYear: 0,
    node: [320, 362], path: 'M195,432 C240,424 286,398 314,370', origen: [195, 432],
    desc: 'Del palo a la taza: cereza, beneficio y secado.', hojas: 6, frutos: 8,
  },
  {
    id: 'agua', rama: 'RAMA III', titulo: 'El agua', glifo: '💧', minYear: 1,
    node: [58, 256], path: 'M195,404 C148,384 96,326 64,266', origen: [195, 404],
    desc: 'Nacederos, reservorios y riego que no desperdicia.', hojas: 4, frutos: 3,
  },
  {
    id: 'animales', rama: 'RAMA IV', titulo: 'Los animales', glifo: '🐔', minYear: 2,
    node: [330, 240], path: 'M195,396 C246,372 302,308 326,250', origen: [195, 396],
    desc: 'Gallinas, abejas y vacas: del corral al abono.', hojas: 5, frutos: 6,
  },
  {
    id: 'sanidad', rama: 'RAMA V', titulo: 'Sanidad vegetal', glifo: '🌿', minYear: 3,
    node: [128, 158], path: 'M195,378 C178,318 152,232 132,168', origen: [195, 378],
    desc: 'Plagas y enfermedades sin veneno: biopreparados.', hojas: 3, frutos: 2,
  },
  {
    id: 'mercado', rama: 'RAMA VI', titulo: 'El mercado', glifo: '🧺', minYear: 4,
    node: [268, 142], path: 'M195,374 C212,312 244,222 264,152', origen: [195, 374],
    desc: 'Vender bien lo cosechado: precio justo y despensa.', hojas: 2, frutos: 5,
  },
  {
    id: 'suelo', rama: 'RAÍZ MADRE', titulo: 'El suelo vivo', glifo: '🤲', minYear: 0,
    node: [84, 552], path: 'M195,478 C158,506 120,532 96,546', origen: [195, 478],
    desc: 'Compost, micorrizas y el cuaderno del suelo.', hojas: 7, frutos: 4,
  },
];

const MUNDO_CLIMA = {
  id: 'clima', rama: 'EL CIELO', titulo: 'El clima', glifo: '🌙',
  desc: 'El cielo real de su vereda: sol, luna, lluvia y heladas.', hojas: 0, frutos: 0,
};

/* hojas del follaje: puntos sobre cada rama, con año mínimo (follaje = especies) */
const HOJAS_SVG = [
  { x: 150, y: 424, r: 8, rot: -30, minYear: 0 }, { x: 112, y: 408, r: 9, rot: -50, minYear: 0 },
  { x: 92, y: 394, r: 7, rot: -70, minYear: 1 },
  { x: 244, y: 420, r: 8, rot: 35, minYear: 0 }, { x: 284, y: 400, r: 9, rot: 55, minYear: 1 },
  { x: 303, y: 382, r: 7, rot: 70, minYear: 2 },
  { x: 142, y: 376, r: 8, rot: -45, minYear: 1 }, { x: 102, y: 330, r: 9, rot: -60, minYear: 2 },
  { x: 76, y: 292, r: 7, rot: -75, minYear: 2 },
  { x: 252, y: 366, r: 8, rot: 45, minYear: 2 }, { x: 296, y: 316, r: 9, rot: 60, minYear: 3 },
  { x: 318, y: 276, r: 7, rot: 72, minYear: 3 },
  { x: 176, y: 312, r: 8, rot: -25, minYear: 3 }, { x: 158, y: 240, r: 9, rot: -40, minYear: 4 },
  { x: 140, y: 196, r: 7, rot: -55, minYear: 4 },
  { x: 212, y: 308, r: 8, rot: 25, minYear: 4 }, { x: 236, y: 232, r: 9, rot: 40, minYear: 5 },
  { x: 256, y: 186, r: 7, rot: 55, minYear: 5 },
  { x: 186, y: 358, r: 7, rot: -15, minYear: 0 }, { x: 206, y: 350, r: 7, rot: 15, minYear: 1 },
];

/* frutos del organismo (= cosechas): brotan cerca de las ramas productivas */
const FRUTOS_SVG = [
  { x: 130, y: 416, c: '#ff4fd8', minYear: 2 }, { x: 96, y: 396, c: '#ffb54f', minYear: 2 },
  { x: 262, y: 412, c: '#ff4fd8', minYear: 2 }, { x: 298, y: 388, c: '#ff4fd8', minYear: 3 },
  { x: 118, y: 344, c: '#4fd8ff', minYear: 3 }, { x: 306, y: 300, c: '#ffb54f', minYear: 4 },
  { x: 166, y: 262, c: '#ff4fd8', minYear: 4 }, { x: 244, y: 210, c: '#ffb54f', minYear: 5 },
  { x: 148, y: 214, c: '#ff4fd8', minYear: 5 }, { x: 224, y: 322, c: '#ff4fd8', minYear: 5 },
];

/* raíces profundas: el organismo también crece hacia abajo */
const RAICES_SVG = [
  { d: 'M195,478 C230,504 268,528 296,544', minYear: 1, origen: [195, 478], tip: [296, 544] },
  { d: 'M195,480 C192,520 186,556 176,588', minYear: 3, origen: [195, 480], tip: [176, 588] },
  { d: 'M195,478 C160,516 130,556 116,596', minYear: 5, origen: [195, 478], tip: [116, 596] },
];

const clamp01 = (v) => Math.max(0, Math.min(100, v));

/* ------------------------------------------------------------------------- */
/* piezas SVG                                                                  */
/* ------------------------------------------------------------------------- */

function Hoja({ x, y, r, rot, delayClass }) {
  return (
    <g className={`agb-leaf ${delayClass}`} transform={`translate(${x},${y}) rotate(${rot})`}>
      <ellipse cx={-r * 0.55} cy="0" rx={r} ry={r * 0.42} fill="#123024" stroke="#9dff3f" strokeWidth="0.8" strokeOpacity="0.85" />
      <ellipse cx={r * 0.55} cy="0" rx={r} ry={r * 0.42} fill="#0e3324" stroke="#2dffc4" strokeWidth="0.7" strokeOpacity="0.7" />
      <line x1={-r * 1.4} y1="0" x2={r * 1.4} y2="0" stroke="#d8ff6a" strokeWidth="0.6" opacity="0.8" />
    </g>
  );
}

function NodoMundo({ mundo, activo, visible, onOpen }) {
  const [nx, ny] = mundo.node;
  const [ox, oy] = mundo.origen;
  return (
    <g className={`agb-g${visible ? ' on' : ''}`} style={{ transformOrigin: `${ox}px ${oy}px` }}>
      <path d={mundo.path} fill="none" stroke="#0f8f6c" strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />
      <path d={mundo.path} fill="none" stroke="#2dffc4" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path className="agb-sap agb-s2" d={mundo.path} fill="none" stroke="#9dff3f" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      <g
        className={`agb-nodo${activo ? ' agb-nodo-activo' : ''}`}
        role="button"
        tabIndex={visible ? 0 : -1}
        aria-label={`Entrar al mundo ${mundo.titulo}`}
        onClick={() => onOpen(mundo)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(mundo); }
        }}
      >
        <circle className="agb-nodo-halo" cx={nx} cy={ny} r="19" fill="url(#agb-bulbo)" />
        <circle className="agb-nodo-anillo" cx={nx} cy={ny} r="12.5" fill="rgba(7,16,48,0.85)" stroke="#2dffc4" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 6px rgba(45,255,196,0.6))' }} />
        <text x={nx} y={ny + 4.5} textAnchor="middle" fontSize="12">{mundo.glifo}</text>
        <text
          x={nx} y={ny + 27} textAnchor="middle" fontFamily="ui-monospace,monospace"
          fontSize="7" letterSpacing="1.4" fill="#bfffe9" opacity="0.85"
        >
          {mundo.titulo.toUpperCase()}
        </text>
      </g>
    </g>
  );
}

/* --------------------------- los cinco avatares ---------------------------- */

function AvatarChivito() {
  return (
    <g className="agb-av-vuela">
      <circle className="agb-estela" r="6" fill="#2dffc4" opacity="0.5" filter="url(#agb-blur3)" />
      <circle className="agb-estela agb-e2" r="5" fill="#ff4fd8" opacity="0.4" filter="url(#agb-blur3)" />
      <circle className="agb-estela agb-e3" r="4" fill="#4fd8ff" opacity="0.4" filter="url(#agb-blur3)" />
      <g filter="url(#agb-glow1)">
        <path d="M-6,-0.5 L-17,-4.5 L-12,0 L-17,4.2 Z" fill="#1f9f86" />
        <path d="M-6.5,0 C0,-6.5 10,-6 14,-1.4 C17,1 17,3 14,4.6 C8.5,8 0,7.6 -6.5,1.4 Z" fill="#2dffc4" />
        <path d="M-3.5,3 C3,5.3 10,5 14,2.5 C10,6.8 1.5,7.1 -4.8,2.2 Z" fill="#bfffe9" opacity="0.7" />
        <circle cx="12.6" cy="-2.2" r="4" fill="#9dff3f" />
        <path d="M11,-5.4 L12.6,-9 L14.4,-5 Z" fill="#4fd8ff" />
        {/* la barba blanca del chivito (Oxypogon) */}
        <path d="M12,1.2 C11.4,5.4 12.2,9 13.6,12 C14.8,8.8 15.6,5 14.8,1 Z" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
        <circle cx="13.6" cy="-2.8" r="1.15" fill="#04160f" />
        <circle cx="14" cy="-3.2" r="0.4" fill="#eafff6" />
        <path d="M16.2,-1.6 C21,-2.1 25,-2.8 28.6,-4.2" stroke="#eafff6" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path className="agb-ala" d="M4,-1.4 C-4,-16 10,-23 17,-14 C14.4,-5.6 8,-1.4 4,-1.4 Z" fill="#ff4fd8" opacity="0.85" />
        <path className="agb-ala" style={{ animationDelay: '-0.06s' }} d="M5.5,1.7 C0,13 13,17.5 17,10 C14,4.2 9.5,1.7 5.5,1.7 Z" fill="#b28dff" opacity="0.5" />
      </g>
    </g>
  );
}

function AvatarRana() {
  return (
    <g filter="url(#agb-glow1)">
      <ellipse cx="0" cy="8" rx="15" ry="3" fill="#000" opacity="0.35" />
      <path d="M-13,7 C-16,2 -13,-4 -7,-7 C-1,-10 8,-9 12,-4 C15,-1 15,4 12,7 Z" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 8px rgba(255,181,79,0.8))' }} />
      <path d="M-11,6 C-13,2 -10,-3 -5,-5 C1,-8 8,-7 11,-3" fill="none" stroke="#fff3c9" strokeWidth="1" opacity="0.7" />
      <circle cx="-4" cy="1" r="1.2" fill="#7a4a10" opacity="0.65" />
      <circle cx="2" cy="-3" r="1" fill="#7a4a10" opacity="0.6" />
      <circle cx="5" cy="2" r="1.1" fill="#7a4a10" opacity="0.6" />
      {/* patas dobladas */}
      <path d="M-13,7 C-17,6 -19,3 -18,-1" fill="none" stroke="#ff9d3f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8,7 C12,8 16,7 18,4" fill="none" stroke="#ff9d3f" strokeWidth="2.6" strokeLinecap="round" />
      {/* garganta que croa (pulso de vida) */}
      <ellipse className="agb-croa" cx="9" cy="3.4" rx="3.4" ry="2.6" fill="#fff3c9" opacity="0.85" />
      {/* ojo grande */}
      <circle cx="8.6" cy="-5.4" r="3.4" fill="#04160f" />
      <circle cx="8.6" cy="-5.4" r="3.4" fill="none" stroke="#ffd76a" strokeWidth="1" />
      <circle cx="9.6" cy="-6.4" r="1.1" fill="#eafff6" />
      <path d="M10.8,-1.4 Q13,-0.6 14.6,-1.8" stroke="#7a4a10" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function AvatarAbeja() {
  return (
    <g className="agb-abeja-orbita">
      <g filter="url(#agb-glow1)">
        <ellipse cx="0" cy="0" rx="6.5" ry="4.2" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 5px rgba(255,181,79,0.9))' }} />
        <path d="M-2.4,-3.8 L-2.4,3.8 M0.6,-4 L0.6,4 M3.4,-3.2 L3.4,3.2" stroke="#3a2410" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="6.4" cy="-0.6" r="2.6" fill="#ffd76a" />
        <circle cx="7.3" cy="-1.2" r="0.7" fill="#04160f" />
        <path d="M8.8,-1.8 C10,-2.6 11,-2.6 11.8,-2" stroke="#3a2410" strokeWidth="0.6" fill="none" />
        <ellipse className="agb-aleteo" cx="-1.4" cy="-5.4" rx="4.6" ry="2.8" fill="#4fd8ff" opacity="0.65" />
        <ellipse className="agb-aleteo" style={{ animationDelay: '-0.06s' }} cx="1.8" cy="-5" rx="3.6" ry="2.2" fill="#bfeaff" opacity="0.5" />
        <circle cx="-7.4" cy="1" r="1" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #d8ff6a)' }} />
      </g>
    </g>
  );
}

function AvatarOso() {
  return (
    <g filter="url(#agb-glow1)">
      <ellipse cx="0" cy="21" rx="15" ry="3" fill="#000" opacity="0.4" />
      <g className="agb-oso-cuerpo">
        <path d="M-11,20 C-14,8 -10,-4 0,-6 C10,-4 14,8 11,20 Z" fill="#171030" stroke="#2dffc4" strokeWidth="0.8" strokeOpacity="0.5" />
        {/* marca del pecho */}
        <path d="M-3,6 C-1,10 1,10 3,6 C2,12 -2,12 -3,6 Z" fill="#eafff6" opacity="0.85" />
        {/* patas */}
        <path d="M-8,20 L-8,14 M8,20 L8,14" stroke="#0f0a20" strokeWidth="4.4" strokeLinecap="round" />
        {/* cabeza */}
        <circle cx="0" cy="-9" r="8" fill="#1c1338" stroke="#2dffc4" strokeWidth="0.8" strokeOpacity="0.5" />
        <path d="M-7,-15 A2.8,2.8 0 1 1 -3,-17.5 M7,-15 A2.8,2.8 0 1 0 3,-17.5" fill="#1c1338" stroke="#2dffc4" strokeWidth="0.7" strokeOpacity="0.5" />
        {/* los anteojos de luz */}
        <circle cx="-3.2" cy="-10" r="3" fill="none" stroke="#eafff6" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
        <circle cx="3.2" cy="-10" r="3" fill="none" stroke="#eafff6" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
        <path d="M-0.4,-10 L0.4,-10" stroke="#eafff6" strokeWidth="1" />
        <circle cx="-3.2" cy="-10" r="1" fill="#2dffc4" />
        <circle cx="3.2" cy="-10" r="1" fill="#2dffc4" />
        <ellipse cx="0" cy="-5.4" rx="2.6" ry="1.9" fill="#d8b48a" />
        <circle cx="0" cy="-6" r="0.9" fill="#04160f" />
      </g>
    </g>
  );
}

function AvatarLombriz() {
  return (
    <g filter="url(#agb-glow1)">
      <g className="agb-repta">
        <path d="M-16,4 C-8,-1 0,5 8,0 C13,-3 17,-1 19,3" fill="none" stroke="#ff8fb0" strokeWidth="4.6" strokeLinecap="round" opacity="0.9" />
        <path d="M-16,4 C-8,-1 0,5 8,0 C13,-3 17,-1 19,3" fill="none" stroke="#ffd0dc" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
        <path d="M-2,2.4 L3,0.6" stroke="#ff6f8a" strokeWidth="5.2" strokeLinecap="round" />
        <path d="M-10,1.4 L-10,4.6 M-6,1 L-6,4 M11,-1.6 L11,1.4 M15,0 L15,3" stroke="#e06a8e" strokeWidth="0.8" opacity="0.65" />
      </g>
      {/* el micelio que la lombriz teje: hilos de luz */}
      <g stroke="#2dffc4" strokeWidth="0.8" fill="none" opacity="0.8" strokeLinecap="round">
        <path className="agb-sap" d="M-14,5 C-18,10 -24,13 -30,14" />
        <path className="agb-sap agb-s2" d="M0,4 C-2,10 -2,16 2,21" />
        <path className="agb-sap agb-s3" d="M16,4 C20,9 26,12 32,13" />
      </g>
      <circle className="agb-micnodo" cx="-30" cy="14" r="1.3" fill="#bfffe9" />
      <circle className="agb-micnodo agb-n2" cx="2" cy="21" r="1.3" fill="#bfffe9" />
      <circle className="agb-micnodo agb-n3" cx="32" cy="13" r="1.3" fill="#bfffe9" />
    </g>
  );
}

const AVATAR_RENDER = {
  chivito: { pos: [148, 208], Cuerpo: AvatarChivito },
  rana: { pos: [80, 282], Cuerpo: AvatarRana },
  abeja: { pos: [108, 340], Cuerpo: AvatarAbeja },
  oso: { pos: [248, 438], Cuerpo: AvatarOso },
  lombriz: { pos: [140, 590], Cuerpo: AvatarLombriz },
};

function Avatar({ especie, etapa, vitalidad }) {
  const { pos, Cuerpo } = AVATAR_RENDER[especie.id];
  const [ax, ay] = pos;
  const escala = 0.62 + etapa * 0.1;
  const aura = 0.14 + (vitalidad / 100) * 0.4;
  return (
    <g className="agb-avatar agb-av-pop" key={`${especie.id}-${etapa === 0 ? 'huevo' : 'ser'}`}>
      <circle
        className="agb-av-aura" cx={ax} cy={ay} r={20 + etapa * 4}
        fill="url(#agb-aura-grad)" style={{ '--agb-aura': aura }}
      />
      {etapa >= 4 && (
        <g className="agb-av-corona" style={{ transformOrigin: `${ax}px ${ay}px` }}>
          <circle cx={ax} cy={ay} r={26 + etapa * 3} fill="none" stroke="#2dffc4" strokeWidth="0.8" strokeDasharray="2 7" opacity="0.8" />
          <circle cx={ax} cy={ay - 26 - etapa * 3} r="1.6" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 4px #eafff6)' }} />
          <circle cx={ax + 22} cy={ay + 16} r="1.2" fill="#ff8fe4" style={{ filter: 'drop-shadow(0 0 4px #ff4fd8)' }} />
        </g>
      )}
      {etapa === 5 && (
        <g stroke="#eafff6" strokeWidth="1" strokeLinecap="round" opacity="0.75">
          <path d={`M${ax},${ay - 34} L${ax},${ay - 42}`} />
          <path d={`M${ax - 26},${ay - 20} L${ax - 32},${ay - 25}`} />
          <path d={`M${ax + 26},${ay - 20} L${ax + 32},${ay - 25}`} />
        </g>
      )}
      {etapa === 0 ? (
        <g className="agb-huevo" transform={`translate(${ax},${ay})`}>
          <ellipse cx="0" cy="0" rx="9" ry="11.5" fill="#0e5a44" stroke="#2dffc4" strokeWidth="1.4" style={{ filter: 'drop-shadow(0 0 8px rgba(45,255,196,0.7))' }} />
          <path d="M-3,-4 L0,-1 L-2,2 M3,3 L1,6" stroke="#9dff3f" strokeWidth="0.8" fill="none" opacity="0.8" />
          <circle cx="0" cy="0" r="3.4" fill="#eafff6" opacity="0.9" />
          <circle cx="0" cy="0" r="1.4" fill="#ff8fe4" />
        </g>
      ) : (
        <g transform={`translate(${ax},${ay}) scale(${escala.toFixed(2)})`}>
          <Cuerpo />
        </g>
      )}
      <text
        x={ax} y={ay + 34 + etapa * 2} textAnchor="middle" fontFamily="ui-monospace,monospace"
        fontSize="6.5" letterSpacing="1.2" fill="#2dffc4" opacity="0.9"
      >
        {(etapa === 0 ? 'SEMILLA DE ' : '') + especie.nombre.toUpperCase()}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------------- */
/* la escena completa                                                          */
/* ------------------------------------------------------------------------- */

function EscenaOrganismo({ year, especie, etapa, vitalidad, mundoAbierto, onOpenMundo }) {
  const on = (minYear) => year >= minYear;
  const delayLeaf = ['', 'agb-l2', 'agb-l3'];
  return (
    <svg
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Su finca convertida en un organismo bioluminiscente navegable: cada rama es un mundo, las hojas son sus especies, los frutos sus cosechas, las raíces y el micelio son el suelo, y su espíritu guardián vive dentro."
      data-testid="agb-escena"
    >
      <defs>
        <linearGradient id="agb-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020412" />
          <stop offset="0.4" stopColor="#071030" />
          <stop offset="0.56" stopColor="#0d1e44" />
        </linearGradient>
        <linearGradient id="agb-suelo-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1026" />
          <stop offset="1" stopColor="#02040c" />
        </linearGradient>
        <radialGradient id="agb-luna" cx="0.38" cy="0.35" r="1">
          <stop offset="0" stopColor="#eafff6" />
          <stop offset="0.7" stopColor="#a8e8d4" />
          <stop offset="1" stopColor="#6fc4b0" />
        </radialGradient>
        <radialGradient id="agb-bulbo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2dffc4" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#2dffc4" stopOpacity="0.25" />
          <stop offset="1" stopColor="#2dffc4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="agb-corazon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#eafff6" />
          <stop offset="0.35" stopColor="#2dffc4" />
          <stop offset="0.8" stopColor="#0a9f74" stopOpacity="0.4" />
          <stop offset="1" stopColor="#0a9f74" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="agb-aura-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2dffc4" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#2dffc4" stopOpacity="0.18" />
          <stop offset="1" stopColor="#2dffc4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="agb-tallo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0f8f6c" />
          <stop offset="1" stopColor="#9dff3f" />
        </linearGradient>
        <filter id="agb-blur8"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="agb-blur3"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="agb-glow1" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ============ CIELO ============ */}
      <rect width="390" height="470" fill="url(#agb-cielo)" />
      <path
        className="agb-aurora"
        d="M-10,150 C70,105 150,140 230,100 C300,72 350,108 400,84 L400,168 C310,146 240,176 150,158 C80,146 30,172 -10,164 Z"
        fill="#2dffc4" opacity="0.13" filter="url(#agb-blur8)"
      />
      <path
        className="agb-aurora" style={{ animationDelay: '-4.5s' }}
        d="M-10,110 C90,84 170,116 260,82 L400,58 L400,112 C300,96 200,130 90,116 Z"
        fill="#b28dff" opacity="0.08" filter="url(#agb-blur8)"
      />
      <g fill="#dfeffc">
        <circle className="agb-tw" cx="30" cy="36" r="1.2" />
        <circle className="agb-tw" style={{ animationDelay: '-1s' }} cx="86" cy="66" r="0.9" />
        <circle className="agb-tw" style={{ animationDelay: '-2.2s' }} cx="140" cy="30" r="1.1" />
        <circle className="agb-tw" style={{ animationDelay: '-0.6s' }} cx="196" cy="58" r="0.8" />
        <circle className="agb-tw" style={{ animationDelay: '-1.7s' }} cx="236" cy="26" r="1.2" />
        <circle className="agb-tw" style={{ animationDelay: '-2.9s' }} cx="60" cy="118" r="0.9" />
        <circle className="agb-tw" style={{ animationDelay: '-0.3s' }} cx="356" cy="150" r="1.1" />
        <circle className="agb-tw" style={{ animationDelay: '-1.4s' }} cx="20" cy="200" r="0.8" />
        <circle className="agb-tw" style={{ animationDelay: '-2.5s' }} cx="368" cy="210" r="0.9" fill="#2dffc4" />
        <circle className="agb-tw" style={{ animationDelay: '-1.9s' }} cx="102" cy="92" r="0.9" fill="#ff4fd8" />
        <circle className="agb-tw" style={{ animationDelay: '-3.1s' }} cx="290" cy="66" r="0.8" fill="#9dff3f" />
      </g>

      {/* luna = mundo Clima (tocable) */}
      <g
        className="agb-nodo"
        role="button"
        tabIndex={0}
        aria-label="Entrar al mundo El clima"
        onClick={() => onOpenMundo(MUNDO_CLIMA)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMundo(MUNDO_CLIMA); }
        }}
      >
        <circle cx="322" cy="86" r="52" fill="#2dffc4" opacity="0.05" filter="url(#agb-blur8)" />
        <circle className="agb-halo" cx="322" cy="86" r="33" fill="none" stroke="#2dffc4" strokeWidth="1" opacity="0.45" />
        <circle className={mundoAbierto === 'clima' ? 'agb-nodo-anillo' : undefined} cx="322" cy="86" r="20" fill="url(#agb-luna)" stroke="#eafff6" strokeWidth="0.7" strokeOpacity="0.5" />
        <circle cx="330" cy="80" r="18.2" fill="#061027" opacity="0.94" />
        <circle cx="313" cy="93" r="2.2" fill="#5fb89e" opacity="0.4" />
        <circle cx="309" cy="85" r="1.3" fill="#5fb89e" opacity="0.35" />
        <text x="322" y="128" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" letterSpacing="1.4" fill="#bfffe9" opacity="0.7">EL CLIMA</text>
      </g>

      {/* ============ MONTAÑAS ============ */}
      <path d="M0,392 C70,360 140,384 210,364 C280,348 340,376 390,358 L390,470 L0,470 Z" fill="#0a1734" />
      <path d="M0,426 C80,402 170,422 260,404 C320,392 360,410 390,398 L390,470 L0,470 Z" fill="#0d1e40" />

      {/* niebla de páramo */}
      <ellipse className="agb-fog" cx="90" cy="400" rx="130" ry="16" fill="#9fd4ff" opacity="0.07" filter="url(#agb-blur8)" />
      <ellipse className="agb-fog agb-g2" cx="290" cy="386" rx="140" ry="14" fill="#b28dff" opacity="0.06" filter="url(#agb-blur8)" />

      {/* ============ EL ORGANISMO (respira) ============ */}
      <g className="agb-organismo">
        {/* follaje base + hojas por año */}
        {HOJAS_SVG.map((h, i) => (
          <g key={i} className={`agb-g${on(h.minYear) ? ' on' : ''}`} style={{ transformOrigin: `${h.x}px ${h.y}px` }}>
            <Hoja {...h} delayClass={delayLeaf[i % 3]} />
          </g>
        ))}

        {/* tronco */}
        <path d="M186,472 C188,436 190,410 193,384 L197,384 C200,410 202,436 204,472 Z" fill="url(#agb-tallo)" opacity="0.9" />
        <path d="M186,472 C188,436 190,410 193,384" fill="none" stroke="#2dffc4" strokeWidth="1" opacity="0.6" />
        <path d="M204,472 C202,436 200,410 197,384" fill="none" stroke="#2dffc4" strokeWidth="1" opacity="0.6" />
        <path className="agb-sap" d="M195,470 C195,440 195,412 195,386" fill="none" stroke="#d8ff6a" strokeWidth="1.6" strokeLinecap="round" />
        {/* yema apical: lo que la finca todavía va a ser */}
        <g className={`agb-g${on(0) ? ' on' : ''}`} style={{ transformOrigin: '195px 384px' }}>
          <circle className="agb-fruit" cx="195" cy="380" r="4" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 8px #9dff3f)' }} />
        </g>

        {/* ramas-mundo */}
        {MUNDOS.filter((m) => m.id !== 'suelo').map((m) => (
          <NodoMundo key={m.id} mundo={m} visible={on(m.minYear)} activo={mundoAbierto === m.id} onOpen={onOpenMundo} />
        ))}

        {/* frutos = cosechas */}
        {FRUTOS_SVG.map((f, i) => (
          <g key={i} className={`agb-g${on(f.minYear) ? ' on' : ''}`} style={{ transformOrigin: `${f.x}px ${f.y}px` }}>
            <circle className={`agb-fruit ${['', 'agb-fr2', 'agb-fr3'][i % 3]}`} cx={f.x} cy={f.y} r="3" fill={f.c} style={{ filter: `drop-shadow(0 0 4px ${f.c})` }} />
          </g>
        ))}

        {/* flor para la angelita */}
        <g className={`agb-g${on(1) ? ' on' : ''}`} style={{ transformOrigin: '108px 352px' }}>
          <g transform="translate(108,352)">
            <path d="M0,10 L0,2" stroke="#0f8f6c" strokeWidth="1.6" strokeLinecap="round" />
            <g fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 4px #ff4fd8)' }}>
              <ellipse cx="0" cy="-4" rx="2.2" ry="3.4" />
              <ellipse cx="-3.4" cy="0" rx="3.4" ry="2.2" />
              <ellipse cx="3.4" cy="0" rx="3.4" ry="2.2" />
            </g>
            <circle cx="0" cy="0" r="2" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 4px #ffb54f)' }} />
          </g>
        </g>

        {/* cocuyos */}
        <circle className="agb-fly" cx="120" cy="300" r="1.6" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 4px #d8ff6a)' }} />
        <circle className="agb-fly agb-f2" cx="262" cy="278" r="1.4" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 4px #2dffc4)' }} />
        <circle className="agb-fly agb-f3" cx="180" cy="230" r="1.4" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 4px #ff4fd8)' }} />
        <circle className="agb-fly agb-f4" cx="300" cy="330" r="1.5" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 4px #4fd8ff)' }} />
      </g>

      {/* ============ CORTE DE SUELO ============ */}
      <rect y="470" width="390" height="374" fill="url(#agb-suelo-g)" />
      <path d="M0,470 L390,470" stroke="#2dffc4" strokeWidth="1.4" opacity="0.55" />
      <path d="M0,472.5 L390,472.5" stroke="#ff4fd8" strokeWidth="0.7" opacity="0.25" />
      <ellipse cx="52" cy="530" rx="12" ry="7" fill="#0d1226" />
      <ellipse cx="342" cy="516" rx="10" ry="6" fill="#0d1226" />
      <ellipse cx="300" cy="620" rx="14" ry="8" fill="#0b0f20" />

      <g className="agb-net">
        {/* hifas troncales desde el corazón */}
        <g fill="none" stroke="#2dffc4" strokeWidth="1.4" opacity="0.75" style={{ filter: 'drop-shadow(0 0 3px rgba(45,255,196,0.5))' }}>
          <path d="M195,556 C160,540 118,520 76,494" />
          <path d="M195,556 C232,538 274,520 314,496" />
          <path d="M195,556 C196,522 195,498 195,472" />
          <path d="M195,556 C150,586 104,606 60,610" />
          <path d="M195,556 C244,584 292,600 336,602" />
        </g>
        {/* hifas secundarias */}
        <g fill="none" stroke="#4fd8ff" strokeWidth="0.9" opacity="0.5">
          <path d="M76,494 C60,488 46,482 36,476 M76,494 C86,486 100,480 116,477" />
          <path d="M314,496 C328,488 342,482 354,477 M314,496 C300,488 286,482 272,478" />
          <path d="M60,610 C48,618 40,630 36,644 M336,602 C348,610 356,622 360,636" />
        </g>
        {/* micelio fino dendrítico */}
        <g fill="none" stroke="#2dffc4" strokeWidth="0.6" opacity="0.35" strokeLinecap="round">
          <path d="M150,540 C140,534 132,526 128,516 M128,516 C124,508 118,504 110,502 M128,516 C132,506 130,498 126,492" />
          <path d="M240,538 C252,532 260,524 264,514 M264,514 C268,506 276,502 284,500 M264,514 C260,504 262,496 268,490" />
          <path d="M195,592 C186,600 176,606 164,610 M164,610 C154,614 148,622 146,632" />
          <path d="M195,592 C206,600 216,606 228,610 M228,610 C240,614 246,622 248,632" />
          <path d="M110,570 C98,566 88,566 78,570 M78,570 C68,574 60,572 52,566" />
          <path d="M280,572 C292,568 302,568 312,572 M312,572 C322,576 330,574 338,568" />
        </g>
        {/* nodos micorrízicos */}
        <g fill="#bfffe9">
          <circle className="agb-micnodo" cx="36" cy="476" r="1" />
          <circle className="agb-micnodo agb-n2" cx="116" cy="477" r="1.1" />
          <circle className="agb-micnodo agb-n3" cx="272" cy="478" r="1" />
          <circle className="agb-micnodo" cx="354" cy="477" r="1.1" />
          <circle className="agb-micnodo agb-n2" cx="36" cy="644" r="1" />
          <circle className="agb-micnodo agb-n3" cx="360" cy="636" r="1" />
        </g>
      </g>

      {/* raíces que crecen con los años */}
      {RAICES_SVG.map((r, i) => (
        <g key={i} className={`agb-g${on(r.minYear) ? ' on' : ''}`} style={{ transformOrigin: `${r.origen[0]}px ${r.origen[1]}px` }}>
          <path d={r.d} fill="none" stroke="#9dff3f" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
          <circle className="agb-micnodo" cx={r.tip[0]} cy={r.tip[1]} r="1.4" fill="#bfffe9" />
        </g>
      ))}

      {/* raíz-mundo: el suelo vivo */}
      <NodoMundo mundo={MUNDOS.find((m) => m.id === 'suelo')} visible={on(0)} activo={mundoAbierto === 'suelo'} onOpen={onOpenMundo} />

      {/* corazón-semilla que late */}
      <ellipse cx="195" cy="556" rx="40" ry="34" fill="#02040c" opacity="0.55" />
      <ellipse cx="195" cy="556" rx="40" ry="34" fill="none" stroke="#0f3a30" strokeWidth="1" opacity="0.55" />
      <circle className="agb-heart-wave" cx="195" cy="556" r="22" fill="none" stroke="#2dffc4" strokeWidth="1.6" />
      <circle className="agb-heart-wave" style={{ animationDelay: '0.6s' }} cx="195" cy="556" r="22" fill="none" stroke="#ff4fd8" strokeWidth="1" />
      <circle className="agb-heart" cx="195" cy="556" r="14" fill="url(#agb-corazon)" />
      <g className="agb-heart">
        <path d="M195,541 C205,547 205,565 195,572 C185,565 185,547 195,541 Z" fill="#0e5a44" stroke="#2dffc4" strokeWidth="1.4" style={{ filter: 'drop-shadow(0 0 6px rgba(45,255,196,0.55))' }} />
        <circle cx="195" cy="556" r="4.6" fill="#eafff6" />
        <circle cx="195" cy="556" r="2" fill="#ff8fe4" />
      </g>

      {/* nutrientes viajando (paths en CSS) */}
      <circle className="agb-spark agb-p1" r="2" fill="#bfffe9" />
      <circle className="agb-spark agb-p2" r="2" fill="#d8ff6a" />
      <circle className="agb-spark agb-p3" r="2.2" fill="#bfffe9" />
      <circle className="agb-spark agb-p4" r="1.8" fill="#ffb54f" />
      <circle className="agb-spark agb-p5" r="1.8" fill="#ff9ee8" />

      {/* etiqueta viva */}
      <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity="0.6">
        <text x="195" y="614" fill="#2dffc4" textAnchor="middle">CORAZÓN DE LA FINCA · VIVO</text>
        <text x="195" y="626" fill="#5b7f93" textAnchor="middle" letterSpacing="1">toque una rama para entrar a su mundo</text>
      </g>

      {/* ============ EL AVATAR: el espíritu vive en el organismo ============ */}
      <Avatar especie={especie} etapa={etapa} vitalidad={vitalidad} />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* el mockup completo (escena + HUD)                                           */
/* ------------------------------------------------------------------------- */

export default function AvatarGameBiopunk({ onBack }) {
  // Con prefers-reduced-motion arrancamos ya en el año final (finca crecida) en
  // vez de setState dentro del efecto de entrada (react-hooks/set-state-in-effect).
  const [year, setYear] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? MAX_ANIO : 0
  );
  const [especieId, setEspecieId] = useState('chivito');
  const [mundo, setMundo] = useState(null);
  const [nota, setNota] = useState('');
  const autoplayRef = useRef(null);
  const notaRef = useRef(null);

  const especie = ESPECIES.find((e) => e.id === especieId);
  const etapa = Math.min(year, 5);
  const vitalidad = Math.round(
    (SALUD.agua[year] + SALUD.suelo[year] + SALUD.biodiversidad[year] + SALUD.constancia[year]) / 4,
  );

  const pararAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const reproducir = useCallback(() => {
    pararAutoplay();
    setYear(0);
    let y = 0;
    autoplayRef.current = setInterval(() => {
      y += 1;
      setYear(y);
      if (y >= MAX_ANIO) pararAutoplay();
    }, 1050);
  }, [pararAutoplay]);

  /* cinematográfica de entrada: la finca crece sola hasta 2031 */
  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // El estado ya arranca en MAX_ANIO via inicializador perezoso; no animamos.
    if (quieto) return undefined;
    const arranque = setTimeout(reproducir, 2300);
    return () => {
      clearTimeout(arranque);
      pararAutoplay();
    };
  }, [reproducir, pararAutoplay]);

  useEffect(() => () => clearTimeout(notaRef.current), []);

  const avisar = (texto) => {
    setNota(texto);
    clearTimeout(notaRef.current);
    notaRef.current = setTimeout(() => setNota(''), 2600);
  };

  const abrirMundo = (m) => {
    pararAutoplay();
    setMundo(m);
  };

  const entrarMundo = () => {
    avisar(`(mockup) aquí entraría al mundo ${mundo.titulo}`);
    setMundo(null);
  };

  const escogerEspecie = (id) => {
    pararAutoplay();
    setEspecieId(id);
    const e = ESPECIES.find((x) => x.id === id);
    avisar(`${e.nombre} — guardián de: ${e.eje.toLowerCase()}`);
  };

  const circ = 2 * Math.PI * 26;

  return (
    <div className="agb" data-year={year} data-testid="agb-mockup">
      <div className="agb-wings" aria-hidden="true" />
      <div className="agb-scene agb-enter">
        <EscenaOrganismo
          year={year}
          especie={especie}
          etapa={etapa}
          vitalidad={vitalidad}
          mundoAbierto={mundo?.id}
          onOpenMundo={abrirMundo}
        />
      </div>

      {onBack && (
        <button type="button" className="agb-volver agb-enter agb-d4" onClick={onBack}>
          ← SALIR
        </button>
      )}

      <div className="agb-hud">
        <div className="agb-top">
          <header className="agb-titulo agb-rise agb-d3">
            <p className="agb-eyebrow">CHAGRA · EL JUEGO FINAL</p>
            <h1 className="agb-h1">El Espíritu de tu Finca</h1>
            <p className="agb-sub">
              Su finca es un organismo vivo. Cuídela de verdad y su espíritu guardián crece con ella.
            </p>
          </header>

          <aside className="agb-panel agb-rise agb-d4" aria-label="Salud y evolución del espíritu">
            <p className="agb-panel-cab">VITALIDAD DEL ESPÍRITU</p>
            <div className="agb-vital">
              <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
                <circle className="agb-ring-track" cx="30" cy="30" r="26" fill="none" strokeWidth="4" />
                <circle
                  className="agb-ring-val" cx="30" cy="30" r="26" fill="none" strokeWidth="4"
                  strokeLinecap="round" strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - vitalidad / 100)}
                  transform="rotate(-90 30 30)"
                />
                <text x="30" y="35" textAnchor="middle" fontSize="14" fontWeight="800" fill="#eafff6" fontFamily="inherit">
                  {vitalidad}
                </text>
              </svg>
              <div>
                <span className="agb-vital-num">{HOJAS_ANIO[year]}<small> sp.</small></span>
                <span className="agb-vital-cap">ESPECIES VIVAS</span>
              </div>
            </div>

            <div className="agb-ejes">
              {EJES_PANEL.map((eje) => (
                <div className="agb-eje" key={eje.id}>
                  <span className="agb-eje-emoji" aria-hidden="true">{eje.emoji}</span>
                  <span className="agb-eje-riel">
                    <span
                      className="agb-eje-fill"
                      style={{ width: `${clamp01(SALUD[eje.id][year])}%`, '--agb-c1': eje.c1, '--agb-c2': eje.c2 }}
                    />
                  </span>
                  <span className="agb-eje-val">{SALUD[eje.id][year]}</span>
                </div>
              ))}
            </div>

            <div className="agb-etapa">
              <span className="agb-etapa-nombre">{ETAPAS[etapa]}</span>
              <div className="agb-etapa-track" aria-label={`Etapa ${etapa + 1} de 6`}>
                {ETAPAS.map((nombre, i) => (
                  <span key={nombre + i} className={`agb-etapa-dot${i <= etapa ? ' on' : ''}`} />
                ))}
              </div>
            </div>

            <div className="agb-conteos">
              <span>🍃 <b>{HOJAS_ANIO[year]}</b> especies registradas</span>
              <span>✦ <b>{FRUTOS_ANIO[year]}</b> cosechas anotadas</span>
              <span>◐ <b>{year}</b> anillos del frailejón</span>
            </div>
          </aside>
        </div>

        {nota && <div className="agb-nota" role="status">{nota}</div>}

        <div className="agb-carta-zona">
          {mundo && (
            <section className="agb-carta" aria-label={`Mundo ${mundo.titulo}`}>
              <div className="agb-carta-cab">
                <span className="agb-carta-glifo" aria-hidden="true">{mundo.glifo}</span>
                <div>
                  <p className="agb-carta-rama">{mundo.rama} DEL ORGANISMO</p>
                  <h2 className="agb-carta-titulo">{mundo.titulo}</h2>
                </div>
                <button type="button" className="agb-carta-x" onClick={() => setMundo(null)} aria-label="Cerrar">✕</button>
              </div>
              <p className="agb-carta-desc">{mundo.desc}</p>
              <div className="agb-carta-stats">
                <span>🍃 <b>{Math.round(mundo.hojas * (0.3 + 0.14 * year))}</b> hojas</span>
                <span>✦ <b>{Math.round(mundo.frutos * (0.2 + 0.16 * year))}</b> frutos</span>
                <span>◍ savia fluyendo</span>
              </div>
              <button type="button" className="agb-carta-entrar" onClick={entrarMundo}>
                Entrar al mundo →
              </button>
            </section>
          )}
        </div>

        <div className="agb-dock agb-rise agb-d5">
          <div className="agb-dock-cab">
            <span>SU GUARDIÁN — ESCOJA UNA ESPECIE NATIVA</span>
            <span>{especie.cientifico}</span>
          </div>
          <div className="agb-chips" role="radiogroup" aria-label="Especie del guardián">
            {ESPECIES.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={e.id === especieId}
                className={`agb-chip${e.id === especieId ? ' on' : ''}`}
                onClick={() => escogerEspecie(e.id)}
              >
                <span className="agb-chip-glifo" aria-hidden="true">{e.glifo}</span>
                {e.corto}
              </button>
            ))}
          </div>

          <div className="agb-reloj">
            <div className="agb-reloj-fila">
              <button type="button" className="agb-play" onClick={reproducir} aria-label="Ver crecer la finca 5 años">
                ▶
              </button>
              <div className="agb-anillos">
                <div className="agb-tics" aria-hidden="true">
                  {Array.from({ length: MAX_ANIO + 1 }, (_, i) => (
                    <span
                      key={i}
                      className={`agb-tic${i <= year ? ' on' : ''}`}
                      style={{ left: `${(i / MAX_ANIO) * 100}%` }}
                    />
                  ))}
                </div>
                <input
                  className="agb-range"
                  type="range"
                  min="0"
                  max={MAX_ANIO}
                  step="1"
                  value={year}
                  aria-label="Año de la finca"
                  onPointerDown={pararAutoplay}
                  onChange={(e) => { pararAutoplay(); setYear(Number(e.target.value)); }}
                />
              </div>
              <span className="agb-reloj-anio">{ANIO_BASE + year}</span>
            </div>
            <div className="agb-reloj-pie">
              <span>EL RELOJ DEL FRAILEJÓN · UN ANILLO POR AÑO</span>
              <span className={`agb-reloj-cap${year >= 3 ? ' futuro' : ''}`}>
                {year === 0 ? 'SU FINCA HOY' : `ASÍ SE VERÍA EN ${ANIO_BASE + year}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <span className="agb-sello">MOCKUP · DATOS DE MUESTRA</span>
    </div>
  );
}

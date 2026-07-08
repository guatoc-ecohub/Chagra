/**
 * AvatarGameBiopunk v3 — MOCKUP de dirección del "juego final de Chagra":
 * El Espíritu de tu Finca (tema biopunk, dirección GANADORA del operador).
 *
 * Qué cambia frente a la v2 (feedback exacto del operador):
 * 1. PROFUNDIDAD real: la escena se parte en 5 capas parallax (cielo /
 *    montañas lejanas / plano medio / organismo / primer plano) que se
 *    inclinan con el puntero. Las entradas a los mundos viven a distintas
 *    profundidades: la luna (clima) al fondo, el río (agua), el gallinero
 *    (animales) y la casa en el plano medio, las ramas-vaina en el foco.
 * 2. Línea de tiempo CERCANA como héroe: HOY / ESTA SEMANA / ESTE MES /
 *    LA TEMPORADA con hitos concretos. La proyección a 1 año / 10 años
 *    queda como "asomo al futuro" secundario.
 * 3. La caja del AGENTE integrada: el espíritu habla y abre un chat dentro
 *    de la escena (también desde la casa: ahí "vive" el agente).
 * 4. Botones de mundo rediseñados como VAINAS orgánicas (membrana, núcleo,
 *    espora orbitando) que brotan de las ramas.
 * 5. RÍO de agua que baja de la cascada y alimenta el reservorio.
 * 6. GALLINERO y CASA de la finca en el plano medio.
 * 7. La ABEJA ANGELITA es la guardiana protagonista (default); el colibrí
 *    queda de últimas en el selector.
 *
 * Es un mockup: datos de muestra hardcodeados, sin servicios reales.
 * Ruta dev: #/mockups/avatar-biopunk (sin gate). Prefijo `agb-`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './avatar-game-biopunk.css';

const ANIO_BASE = 2026;

/* etapas de crecimiento del organismo (0..5) y del espíritu */
const ETAPAS = [
  'Semilla de espíritu',
  'Cría de luz',
  'Brote andante',
  'Joven espíritu',
  'Guardián de la finca',
  'Espíritu radiante',
];

/* ---- el tiempo CERCANO es el héroe: hoy / semana / mes / temporada ------- */
const MOMENTOS = [
  {
    id: 'hoy', label: 'HOY', idx: 2, caption: 'SU FINCA HOY',
    hitos: [
      { ok: true, t: 'Agua del nacedero anotada' },
      { ok: true, t: '9 huevos recogidos en el gallinero' },
      { ok: false, t: 'Falta: mirar la huerta al caer el sol' },
    ],
  },
  {
    id: 'semana', label: 'ESTA SEMANA', idx: 2, caption: 'EN 7 DÍAS',
    hitos: [
      { ok: false, t: 'Brotan las matas de cilantro (día 6)' },
      { ok: false, t: 'Primera flor del frijol cargamanto' },
      { ok: false, t: 'La angelita estrena alza en su colmena' },
    ],
  },
  {
    id: 'mes', label: 'ESTE MES', idx: 3, caption: 'EN UN MES',
    hitos: [
      { ok: false, t: 'Racimo de plátano listo para bajar' },
      { ok: false, t: 'Primera vuelta al abono de la compostera' },
      { ok: false, t: 'Se abre el mundo Sanidad vegetal' },
    ],
  },
  {
    id: 'temporada', label: 'TEMPORADA', idx: 4, caption: 'ESTA TEMPORADA',
    hitos: [
      { ok: false, t: 'Traviesa de café: primera despulpada' },
      { ok: false, t: 'El reservorio llega a su nivel' },
      { ok: false, t: 'Feria campesina: su primer mercado' },
    ],
  },
];

/* el largo plazo se ASOMA, no domina: proyección secundaria a 1 y 10 años */
const FUTUROS = [
  { id: 'ano1', label: '1 AÑO', caption: `ASÍ SE VERÍA EN ${ANIO_BASE + 1}` },
  { id: 'ano10', label: '10 AÑOS', caption: `ASÍ SE VERÍA EN ${ANIO_BASE + 10} · DIEZ COSECHAS DESPUÉS` },
];

/* lo que dice el espíritu al tocarlo, según la vitalidad real de la finca */
const FRASES_ESPIRITU = [
  { tope: 45, frase: 'Su espíritu apenas despierta — anote agua y suelo para darle fuerza.' },
  { tope: 70, frase: 'Su espíritu va tomando cuerpo: la finca se siente cuidada.' },
  { tope: 90, frase: 'Su espíritu brilla — la biodiversidad de su finca lo alimenta.' },
  { tope: 101, frase: 'Espíritu radiante: su finca es un organismo pleno.' },
];

/* salud simulada por etapa de crecimiento (0..5) */
const SALUD = {
  agua: [38, 50, 61, 70, 81, 90],
  suelo: [30, 44, 58, 69, 80, 92],
  biodiversidad: [22, 35, 49, 62, 78, 94],
  constancia: [45, 58, 66, 75, 86, 95],
};
const HOJAS_ETAPA = [3, 7, 12, 18, 26, 34]; /* especies registradas */
const FRUTOS_ETAPA = [0, 2, 6, 11, 19, 28]; /* cosechas anotadas */

const EJES_PANEL = [
  { id: 'agua', emoji: '💧', c1: '#4fd8ff', c2: '#2dffc4' },
  { id: 'suelo', emoji: '🪱', c1: '#ffb54f', c2: '#9dff3f' },
  { id: 'biodiversidad', emoji: '🦋', c1: '#ff4fd8', c2: '#b28dff' },
  { id: 'constancia', emoji: '🔥', c1: '#9dff3f', c2: '#2dffc4' },
];

/* guardianes: la ANGELITA es la protagonista (default); el colibrí, de
   últimas (decisión del operador). Cada uno re-tiñe el HUD con su acento. */
const ESPECIES = [
  {
    id: 'abeja',
    corto: 'Angelita',
    nombre: 'Abeja angelita',
    cientifico: 'Tetragonisca angustula',
    eje: 'Floración y biodiversidad',
    glifo: '🐝',
    acc: '#ffb54f', accRgb: '255, 181, 79', acc2: '#4fd8ff',
  },
  {
    id: 'rana',
    corto: 'Rana dorada',
    nombre: 'Rana dorada',
    cientifico: 'Phyllobates terribilis',
    eje: 'Agua limpia',
    glifo: '🐸',
    acc: '#ffd76a', accRgb: '255, 215, 106', acc2: '#ff9d3f',
  },
  {
    id: 'oso',
    corto: 'Oso',
    nombre: 'Oso de anteojos',
    cientifico: 'Tremarctos ornatus',
    eje: 'Bosque y agroforestería',
    glifo: '🐻',
    acc: '#b28dff', accRgb: '178, 141, 255', acc2: '#2dffc4',
  },
  {
    id: 'lombriz',
    corto: 'Lombriz',
    nombre: 'Lombriz-micelio',
    cientifico: 'La red que teje el suelo',
    eje: 'Suelo vivo',
    glifo: '🪱',
    acc: '#ff8fb0', accRgb: '255, 143, 176', acc2: '#9dff3f',
  },
  {
    id: 'chivito',
    corto: 'Chivito',
    nombre: 'Chivito de páramo',
    cientifico: 'Oxypogon guerinii',
    eje: 'Páramo sano y flores nativas',
    glifo: '🐦',
    acc: '#2dffc4', accRgb: '45, 255, 196', acc2: '#ff4fd8',
    relegado: true, /* el operador lo dejó de últimas */
  },
];

/* el guardián también está escrito en el cielo: una constelación por especie */
const CONSTELACIONES = {
  chivito: {
    lineas: [[[18, 149], [40, 140], [66, 122], [90, 130], [112, 104], [136, 118], [122, 146], [90, 140]]],
    label: [78, 206],
  },
  rana: {
    lineas: [[[52, 132], [70, 110], [96, 106], [118, 120], [110, 144], [78, 150], [52, 132]]],
    label: [78, 206],
  },
  abeja: {
    lineas: [
      [[60, 134], [80, 124], [102, 128], [118, 140], [96, 148], [74, 146], [60, 134]],
      [[84, 122], [76, 100], [96, 104]],
    ],
    label: [78, 206],
  },
  oso: {
    lineas: [[[46, 148], [58, 120], [86, 108], [114, 114], [128, 136], [108, 152], [72, 156], [46, 148]]],
    label: [78, 206],
  },
  lombriz: {
    lineas: [[[30, 148], [54, 132], [78, 146], [102, 128], [126, 142], [150, 126], [172, 138]]],
    label: [78, 206],
  },
};

/* ramas-vaina del organismo (foco). `depth` escala la vaina: las de abajo
   están más CERCA (grandes), las de arriba más LEJOS (pequeñas) — la
   profundidad acomoda las opciones. */
const MUNDOS_RAMA = [
  {
    id: 'cultivos', rama: 'RAMA I', titulo: 'Cultivos y semillas', tag: 'Cultivos', glifo: '🌽', minYear: 0, depth: 1.08,
    node: [84, 318], path: 'M195,436 C152,420 108,378 90,330', origen: [195, 436],
    desc: 'La milpa, la huerta, sus matas y la semilla propia.', hojas: 9, frutos: 12,
  },
  {
    id: 'cafe', rama: 'RAMA II', titulo: 'El café', glifo: '☕', minYear: 0, depth: 1.04,
    node: [330, 330], path: 'M195,430 C246,416 296,382 324,338', origen: [195, 430],
    desc: 'Del palo a la taza: cereza, beneficio y secado.', hojas: 6, frutos: 8,
  },
  {
    id: 'sanidad', rama: 'RAMA III', titulo: 'Sanidad vegetal', glifo: '🌿', minYear: 3, depth: 0.84,
    node: [118, 168], path: 'M195,378 C174,314 148,236 126,180', origen: [195, 378],
    desc: 'Plagas y enfermedades sin veneno: biopreparados.', hojas: 3, frutos: 2,
  },
  {
    id: 'mercado', rama: 'RAMA IV', titulo: 'El mercado', glifo: '🧺', minYear: 4, depth: 0.84,
    node: [276, 150], path: 'M195,374 C216,310 248,222 270,162', origen: [195, 374],
    desc: 'Vender bien lo cosechado: precio justo y despensa.', hojas: 2, frutos: 5,
  },
  {
    id: 'suelo', rama: 'RAÍZ MADRE', titulo: 'El suelo vivo', glifo: '🤲', minYear: 0, depth: 1,
    node: [84, 552], path: 'M195,478 C158,506 120,532 96,546', origen: [195, 478],
    desc: 'Compost, micorrizas y el cuaderno del suelo.', hojas: 7, frutos: 4,
  },
];

/* mundos-ÓRGANO: se entra desde la escena misma, a su profundidad real */
const MUNDOS_ESCENA = {
  agua: {
    id: 'agua', rama: 'EL RÍO', titulo: 'El agua', glifo: '💧',
    desc: 'El río baja de la cascada, llena el reservorio y riega sin desperdiciar.', hojas: 4, frutos: 3,
  },
  animales: {
    id: 'animales', rama: 'EL CORRAL', titulo: 'Los animales', glifo: '🐔',
    desc: 'Gallinas, abejas y vacas: del corral al abono.', hojas: 5, frutos: 6,
  },
  clima: {
    id: 'clima', rama: 'EL CIELO', titulo: 'El clima', glifo: '🌙',
    desc: 'El cielo real de su vereda: sol, luna, lluvia y heladas.', hojas: 0, frutos: 0,
  },
};

/* hojas del follaje: puntos sobre cada rama, con etapa mínima */
const HOJAS_SVG = [
  { x: 150, y: 424, r: 8, rot: -30, minYear: 0 }, { x: 112, y: 408, r: 9, rot: -50, minYear: 0 },
  { x: 92, y: 394, r: 7, rot: -70, minYear: 1 },
  { x: 244, y: 420, r: 8, rot: 35, minYear: 0 }, { x: 284, y: 400, r: 9, rot: 55, minYear: 1 },
  { x: 303, y: 382, r: 7, rot: 70, minYear: 2 },
  { x: 142, y: 376, r: 8, rot: -45, minYear: 3 }, { x: 102, y: 330, r: 9, rot: -60, minYear: 4 },
  { x: 76, y: 292, r: 7, rot: -75, minYear: 6 },
  { x: 252, y: 366, r: 8, rot: 45, minYear: 3 }, { x: 296, y: 316, r: 9, rot: 60, minYear: 4 },
  { x: 318, y: 276, r: 7, rot: 72, minYear: 6 },
  { x: 176, y: 312, r: 8, rot: -25, minYear: 3 }, { x: 158, y: 240, r: 9, rot: -40, minYear: 4 },
  { x: 140, y: 196, r: 7, rot: -55, minYear: 5 },
  { x: 212, y: 308, r: 8, rot: 25, minYear: 4 }, { x: 236, y: 232, r: 9, rot: 40, minYear: 5 },
  { x: 256, y: 186, r: 7, rot: 55, minYear: 6 },
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

/* dónde va a brotar lo próximo, según el momento escogido (anillos fantasma) */
const BROTES = {
  semana: [[142, 376], [252, 366]],
  mes: [[118, 168], [296, 316], [166, 262]],
  temporada: [[276, 150], [244, 210], [306, 300]],
};

/* preguntas rápidas del chat (la caja del agente, integrada a la escena) */
const PREGUNTAS_RAPIDAS = [
  '¿Cómo está el agua?',
  '¿Qué hago esta semana?',
  '¿Cómo va el suelo?',
];

const clamp01 = (v) => Math.max(0, Math.min(100, v));

/* ------------------------------------------------------------------------- */
/* etiqueta-cápsula reutilizable dentro de los SVG                             */
/* ------------------------------------------------------------------------- */

function TagSvg({ x, y, texto, ancho }) {
  const w = ancho || texto.length * 4.6 + 16;
  return (
    <g className="agb-tag" aria-hidden="true">
      <rect x={x - w / 2} y={y} width={w} height="13" rx="6.5" fill="rgba(4,10,28,0.78)" stroke="rgba(45,255,196,0.35)" strokeWidth="0.6" />
      <text x={x} y={y + 8.8} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="6.5" letterSpacing="1.2" fill="#bfffe9">
        {texto}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------------- */
/* CAPA 1 — EL CIELO (lo más lejos: estrellas, aurora, constelación, luna)     */
/* ------------------------------------------------------------------------- */

function Constelacion({ especie }) {
  const c = CONSTELACIONES[especie.id];
  return (
    <g key={especie.id} className="agb-constel" aria-hidden="true">
      {c.lineas.map((linea, i) => (
        <polyline
          key={i}
          className="agb-constel-linea"
          points={linea.map((p) => p.join(',')).join(' ')}
          pathLength="1"
          fill="none"
          stroke="#eafff6"
          strokeWidth="0.6"
          opacity="0.35"
          style={{ animationDelay: `${0.25 + i * 0.5}s` }}
        />
      ))}
      {c.lineas.flat().map(([x, y], i) => (
        <circle
          key={`${x}-${y}-${i}`}
          className="agb-constel-estrella"
          cx={x}
          cy={y}
          r={i === 0 ? 1.5 : 1.05}
          fill={especie.acc}
          style={{ animationDelay: `${0.15 + i * 0.09}s`, filter: `drop-shadow(0 0 3px ${especie.acc})` }}
        />
      ))}
      <text
        className="agb-constel-label"
        x={c.label[0]} y={c.label[1]} textAnchor="middle"
        fontFamily="ui-monospace,monospace" fontSize="6" letterSpacing="1.6"
        fill="#bfffe9" opacity="0.55"
      >
        {`CONSTELACIÓN · ${especie.corto.toUpperCase()}`}
      </text>
    </g>
  );
}

function CapaCielo({ especie, climaActivo, onOpenMundo }) {
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="agbC-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020412" />
          <stop offset="0.4" stopColor="#071030" />
          <stop offset="0.56" stopColor="#0d1e44" />
          <stop offset="0.62" stopColor="#0c1026" />
          <stop offset="1" stopColor="#02040c" />
        </linearGradient>
        <radialGradient id="agbC-luna" cx="0.38" cy="0.35" r="1">
          <stop offset="0" stopColor="#eafff6" />
          <stop offset="0.7" stopColor="#a8e8d4" />
          <stop offset="1" stopColor="#6fc4b0" />
        </radialGradient>
        <filter id="agbC-blur8"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>

      <rect width="390" height="844" fill="url(#agbC-cielo)" />
      <path
        className="agb-aurora"
        d="M-10,150 C70,105 150,140 230,100 C300,72 350,108 400,84 L400,168 C310,146 240,176 150,158 C80,146 30,172 -10,164 Z"
        fill="#2dffc4" opacity="0.13" filter="url(#agbC-blur8)"
      />
      <path
        className="agb-aurora" style={{ animationDelay: '-4.5s' }}
        d="M-10,110 C90,84 170,116 260,82 L400,58 L400,112 C300,96 200,130 90,116 Z"
        fill="#b28dff" opacity="0.08" filter="url(#agbC-blur8)"
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

      <Constelacion especie={especie} />

      {/* luna = mundo Clima: la opción más LEJANA vive en la capa más lejana */}
      <g
        className="agb-nodo"
        role="button"
        tabIndex={0}
        aria-label="Entrar al mundo El clima"
        onClick={() => onOpenMundo(MUNDOS_ESCENA.clima)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMundo(MUNDOS_ESCENA.clima); }
        }}
      >
        <circle cx="245" cy="64" r="52" fill="#2dffc4" opacity="0.05" filter="url(#agbC-blur8)" />
        <circle className="agb-halo" cx="245" cy="64" r="33" fill="none" stroke="#2dffc4" strokeWidth="1" opacity="0.45" />
        <circle className={climaActivo ? 'agb-nodo-anillo' : undefined} cx="245" cy="64" r="20" fill="url(#agbC-luna)" stroke="#eafff6" strokeWidth="0.7" strokeOpacity="0.5" />
        <circle cx="253" cy="58" r="18.2" fill="#061027" opacity="0.94" />
        <circle cx="236" cy="71" r="2.2" fill="#5fb89e" opacity="0.4" />
        <circle cx="232" cy="63" r="1.3" fill="#5fb89e" opacity="0.35" />
        <TagSvg x={172} y={84} texto="EL CLIMA" />
        <path d="M199,90 C214,88 224,82 230,74" fill="none" stroke="rgba(45,255,196,0.35)" strokeWidth="0.7" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* CAPA 2 — MONTAÑAS LEJANAS (cordillera y niebla alta)                        */
/* ------------------------------------------------------------------------- */

function CapaLejos() {
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="agbL-blur8"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>
      <path d="M0,392 C70,360 140,384 210,364 C280,348 340,376 390,358 L390,520 L0,520 Z" fill="#0a1734" />
      {/* nevado lejano: un filo de luz en la cresta */}
      <path d="M140,384 C160,378 186,372 210,364" fill="none" stroke="#9fd4ff" strokeWidth="0.8" opacity="0.3" />
      <ellipse className="agb-fog" cx="120" cy="386" rx="150" ry="15" fill="#9fd4ff" opacity="0.07" filter="url(#agbL-blur8)" />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* CAPA 3 — PLANO MEDIO: cascada, RÍO, GALLINERO y CASA (la finca habitada)    */
/* ------------------------------------------------------------------------- */

const RIO_D = 'M252,410 C224,426 192,434 162,440 C126,447 98,450 74,456';

function CapaMedio({ aguaActiva, animalesActivo, onOpenMundo, onAbrirCasa }) {
  const abrir = (m) => () => onOpenMundo(m);
  const tecla = (m) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMundo(m); }
  };
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="agbM-rio" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4fd8ff" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#2dffc4" stopOpacity="0.7" />
          <stop offset="1" stopColor="#4fd8ff" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="agbM-poza" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#9fe8ff" stopOpacity="0.85" />
          <stop offset="0.7" stopColor="#1c6a9e" stopOpacity="0.6" />
          <stop offset="1" stopColor="#0a2c52" stopOpacity="0.4" />
        </radialGradient>
        <filter id="agbM-blur6"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      {/* loma media */}
      <path d="M0,426 C80,402 170,422 260,404 C320,392 360,410 390,398 L390,520 L0,520 Z" fill="#0d1e40" />

      {/* --- LA CASCADA: el agua nace en la loma --- */}
      <g className="agb-cascada">
        <path d="M249,404 C249,408 249,411 249.5,414 M252,403 C252,408 252,412 252,415 M255,404 C255,408 255,411 254.5,414" stroke="#bfeaff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.75" />
        <path className="agb-rio-flujo" d="M252,402 L252,415" stroke="#eafff6" strokeWidth="1" strokeLinecap="round" fill="none" />
        <ellipse cx="252" cy="416" rx="9" ry="2.6" fill="#9fe8ff" opacity="0.35" filter="url(#agbM-blur6)" />
      </g>

      {/* --- EL RÍO: agua fluyendo por la escena (entrada al mundo Agua) --- */}
      <g
        className={`agb-rio agb-nodo${aguaActiva ? ' agb-organo-activo' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Entrar al mundo El agua"
        onClick={abrir(MUNDOS_ESCENA.agua)}
        onKeyDown={tecla(MUNDOS_ESCENA.agua)}
      >
        <path d={RIO_D} fill="none" stroke="#0a2c52" strokeWidth="11" strokeLinecap="round" />
        <path d={RIO_D} fill="none" stroke="url(#agbM-rio)" strokeWidth="6.5" strokeLinecap="round" opacity="0.8" />
        <path className="agb-rio-flujo" d={RIO_D} fill="none" stroke="#bfeaff" strokeWidth="1.7" strokeLinecap="round" />
        <path className="agb-rio-flujo agb-rf2" d={RIO_D} fill="none" stroke="#eafff6" strokeWidth="1" strokeLinecap="round" />
        {/* orillas que juntan luz */}
        <path d={RIO_D} fill="none" stroke="#2dffc4" strokeWidth="12.5" strokeLinecap="round" opacity="0.08" />
        {/* el reservorio donde remansa */}
        <ellipse cx="52" cy="461" rx="25" ry="6.5" fill="url(#agbM-poza)" stroke="#4fd8ff" strokeWidth="0.8" strokeOpacity="0.6" />
        <ellipse className="agb-onda-poza" cx="52" cy="461" rx="10" ry="2.6" fill="none" stroke="#bfeaff" strokeWidth="0.7" />
        <ellipse className="agb-onda-poza agb-op2" cx="52" cy="461" rx="10" ry="2.6" fill="none" stroke="#2dffc4" strokeWidth="0.6" />
        {/* gotas de luz viajando río abajo */}
        <circle className="agb-rio-gota" r="1.6" fill="#eafff6" />
        <circle className="agb-rio-gota agb-rg2" r="1.3" fill="#bfeaff" />
        <TagSvg x={52} y={434} texto="EL AGUA" />
      </g>

      {/* --- EL GALLINERO: la entrada viva al mundo Los animales --- */}
      <g
        className={`agb-gallinero agb-nodo${animalesActivo ? ' agb-organo-activo' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Entrar al mundo Los animales"
        onClick={abrir(MUNDOS_ESCENA.animales)}
        onKeyDown={tecla(MUNDOS_ESCENA.animales)}
      >
        <g transform="translate(112,404) scale(0.92)">
          <ellipse cx="4" cy="48" rx="34" ry="4.5" fill="#000" opacity="0.35" />
          {/* pilotes y rampa */}
          <path d="M-13,46 L-13,29 M15,46 L15,29" stroke="#0f2a3c" strokeWidth="3" strokeLinecap="round" />
          <path d="M-2,28 L-18,46" stroke="#123048" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M-6,32.5 L-9,31 M-9,36 L-12,34.5 M-12,39.5 L-15,38" stroke="#2dffc4" strokeWidth="0.7" opacity="0.5" />
          {/* caseta */}
          <path d="M-20,30 L-20,10 L22,10 L22,30 Z" fill="#0e1c30" stroke="#2dffc4" strokeWidth="0.7" strokeOpacity="0.5" />
          <path d="M-25,12 L1,-7 L27,12 Z" fill="#14304a" stroke="#9dff3f" strokeWidth="0.8" strokeOpacity="0.6" />
          {/* puerta redonda que alumbra */}
          <circle className="agb-puerta-luz" cx="1" cy="20" r="6" fill="#071030" stroke="#ffb54f" strokeWidth="1.2" />
          <circle cx="1" cy="20" r="2.6" fill="#ffb54f" opacity="0.35" />
          {/* la gallina que picotea */}
          <g className="agb-gallina">
            <path d="M32,38 C28,32 30,26 36,25 C42,24 46,28 45,34 C44,39 38,42 32,38 Z" fill="#1c1338" stroke="#2dffc4" strokeWidth="0.7" strokeOpacity="0.6" />
            <path d="M44,30 C47,28 49,28 51,29" stroke="#1c1338" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M50,26 L52,24 L53,27 Z" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
            <path d="M53,29 L57,30 L53,31.4 Z" fill="#ffb54f" />
            <circle cx="51.4" cy="28.4" r="0.7" fill="#eafff6" />
            <path d="M30,32 C27,30 25,30 23,31" stroke="#9dff3f" strokeWidth="0.8" opacity="0.7" fill="none" />
            <path d="M36,41 L36,45 M41,40 L41,44" stroke="#ffb54f" strokeWidth="1.1" strokeLinecap="round" />
          </g>
          {/* huevo recién puesto: brilla suave */}
          <ellipse className="agb-huevo-gal" cx="22" cy="45" rx="2.4" ry="3" fill="#eafff6" opacity="0.85" />
        </g>
        <TagSvg x={116} y={455} texto="LOS ANIMALES" />
      </g>

      {/* --- LA CASA: aquí vive usted... y su agente (abre el chat) --- */}
      <g
        className="agb-casa agb-nodo"
        role="button"
        tabIndex={0}
        aria-label="Abrir la casa: hablar con el agente de su finca"
        onClick={onAbrirCasa}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrirCasa(); }
        }}
      >
        <g transform="translate(306,398) scale(0.95)">
          <ellipse cx="0" cy="52" rx="36" ry="5" fill="#000" opacity="0.35" />
          {/* humo de la cocina */}
          <path className="agb-humo" d="M20,-4 C22,-10 18,-14 21,-20 C24,-26 20,-30 22,-36" stroke="#a9c3d2" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
          {/* cuerpo y corredor */}
          <path d="M-27,50 L-27,16 L27,16 L27,50 Z" fill="#0e1832" stroke="#2dffc4" strokeWidth="0.8" strokeOpacity="0.5" />
          <path d="M-33,18 L0,-8 L33,18 Z" fill="#122448" stroke="#4fd8ff" strokeWidth="0.9" strokeOpacity="0.6" />
          <path d="M-33,18 L33,18" stroke="#9dff3f" strokeWidth="0.7" opacity="0.5" />
          {/* ventanas cálidas: alguien está en casa */}
          <rect className="agb-ventana" x="-19" y="24" width="10" height="11" rx="1.5" fill="#ffd76a" />
          <rect className="agb-ventana agb-v2" x="9" y="24" width="10" height="11" rx="1.5" fill="#ffd76a" />
          <path d="M-14,24 L-14,35 M-19,29.5 L-9,29.5 M14,24 L14,35 M9,29.5 L19,29.5" stroke="#0e1832" strokeWidth="0.8" />
          {/* puerta con lucecita */}
          <rect x="-4.5" y="30" width="9" height="20" rx="3.5" fill="#071030" stroke="#2dffc4" strokeWidth="0.8" strokeOpacity="0.7" />
          <circle className="agb-puerta-luz" cx="0" cy="27" r="1.4" fill="#eafff6" />
          {/* la canasta del mercado en el corredor */}
          <path d="M-24,50 L-16,50 L-17.5,44 L-22.5,44 Z" fill="#3a2410" stroke="#ffb54f" strokeWidth="0.7" strokeOpacity="0.8" />
          <circle cx="-21" cy="43" r="1.4" fill="#ff4fd8" opacity="0.9" />
          <circle cx="-18.6" cy="43.2" r="1.2" fill="#9dff3f" opacity="0.9" />
        </g>
        <TagSvg x={306} y={452} texto="LA CASA · SU AGENTE" />
      </g>

      <ellipse className="agb-fog agb-g2" cx="290" cy="392" rx="140" ry="14" fill="#b28dff" opacity="0.06" filter="url(#agbM-blur6)" />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* piezas del ORGANISMO (capa foco)                                            */
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

/* nodo de mundo v3: una VAINA orgánica que brota de la rama — membrana,
   núcleo con el glifo y una espora que orbita. `depth` la acerca o la aleja. */
function NodoVaina({ mundo, activo, visible, onOpen }) {
  const [nx, ny] = mundo.node;
  const [ox, oy] = mundo.origen;
  const s = mundo.depth || 1;
  return (
    <g className={`agb-g${visible ? ' on' : ''}`} style={{ transformOrigin: `${ox}px ${oy}px` }}>
      <path d={mundo.path} fill="none" stroke="#0f8f6c" strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />
      <path d={mundo.path} fill="none" stroke="#2dffc4" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path className="agb-sap agb-s2" d={mundo.path} fill="none" stroke="#9dff3f" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      <g
        className={`agb-vaina${activo ? ' agb-vaina-activa' : ''}`}
        transform={`translate(${nx},${ny}) scale(${s})`}
        role="button"
        tabIndex={visible ? 0 : -1}
        aria-label={`Entrar al mundo ${mundo.titulo}`}
        onClick={() => onOpen(mundo)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(mundo); }
        }}
      >
        <ellipse className="agb-vaina-halo" rx="20" ry="24" fill="url(#agb-bulbo)" />
        <path
          className="agb-vaina-membrana"
          d="M0,-20 C11,-18 15.5,-8 14.5,2 C13.5,13 8,20.5 0,22 C-8,20.5 -13.5,13 -14.5,2 C-15.5,-8 -11,-18 0,-20 Z"
          fill="rgba(7,16,48,0.88)" stroke="#2dffc4" strokeWidth="1.2"
        />
        <path d="M0,-16 C5,-9 5,9 0,17" fill="none" stroke="#9dff3f" strokeWidth="0.6" opacity="0.5" />
        <path d="M0,-16 C-5,-9 -5,9 0,17" fill="none" stroke="#9dff3f" strokeWidth="0.6" opacity="0.5" />
        <circle className="agb-vaina-nucleo" r="9" fill="url(#agb-nucleo)" />
        <text y="4.5" textAnchor="middle" fontSize="11">{mundo.glifo}</text>
        <circle className="agb-espora" r="1.3" fill="#eafff6" />
        <TagSvg x={0} y={27} texto={(mundo.tag || mundo.titulo).toUpperCase()} />
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

/* la protagonista: angelita con corona de polen y órbita amplia */
function AvatarAbeja() {
  return (
    <g className="agb-abeja-orbita">
      <g filter="url(#agb-glow1)">
        <circle className="agb-estela" r="5" fill="#ffb54f" opacity="0.4" filter="url(#agb-blur3)" />
        <ellipse cx="0" cy="0" rx="7.5" ry="4.8" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 6px rgba(255,181,79,0.9))' }} />
        <path d="M-2.8,-4.3 L-2.8,4.3 M0.7,-4.6 L0.7,4.6 M3.9,-3.7 L3.9,3.7" stroke="#3a2410" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7.3" cy="-0.7" r="3" fill="#ffd76a" />
        <circle cx="8.3" cy="-1.4" r="0.8" fill="#04160f" />
        <path d="M10,-2 C11.2,-2.9 12.3,-2.9 13.2,-2.2" stroke="#3a2410" strokeWidth="0.6" fill="none" />
        <ellipse className="agb-aleteo" cx="-1.6" cy="-6.2" rx="5.3" ry="3.2" fill="#4fd8ff" opacity="0.65" />
        <ellipse className="agb-aleteo" style={{ animationDelay: '-0.06s' }} cx="2" cy="-5.7" rx="4.1" ry="2.5" fill="#bfeaff" opacity="0.5" />
        {/* la bolita de polen que carga: su cosecha */}
        <circle cx="-8.4" cy="1.2" r="1.2" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #d8ff6a)' }} />
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
  abeja: { pos: [152, 296], Cuerpo: AvatarAbeja },
  rana: { pos: [66, 244], Cuerpo: AvatarRana },
  oso: { pos: [248, 438], Cuerpo: AvatarOso },
  lombriz: { pos: [140, 590], Cuerpo: AvatarLombriz },
  chivito: { pos: [152, 218], Cuerpo: AvatarChivito },
};

/* el filamento de savia que une el corazón de la finca con su espíritu */
function VinculoEspiritu({ especie }) {
  const [ax, ay] = AVATAR_RENDER[especie.id].pos;
  const mx = (195 + ax) / 2 + (ax < 195 ? -26 : 26);
  const my = (556 + ay) / 2 + 10;
  const d = `M195,556 Q${mx},${my} ${ax},${ay + 16}`;
  return (
    <g key={especie.id} aria-hidden="true">
      <path className="agb-vinculo" d={d} fill="none" stroke={especie.acc} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle className="agb-vinculo-spark" r="1.7" fill="#eafff6" style={{ offsetPath: `path('${d}')`, filter: `drop-shadow(0 0 3px ${especie.acc})` }} />
    </g>
  );
}

function Avatar({ especie, etapa, vitalidad, evo, onTocar }) {
  const { pos, Cuerpo } = AVATAR_RENDER[especie.id];
  const [ax, ay] = pos;
  const escala = 0.62 + etapa * 0.1;
  const aura = 0.14 + (vitalidad / 100) * 0.4;
  return (
    <g
      className="agb-avatar agb-av-pop"
      key={`${especie.id}-${etapa === 0 ? 'huevo' : 'ser'}`}
      role="button"
      tabIndex={0}
      aria-label={`Hablar con su espíritu: ${especie.nombre}`}
      onClick={onTocar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTocar(); }
      }}
    >
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
        fontSize="6.5" letterSpacing="1.2" fill={especie.acc} opacity="0.9"
      >
        {(etapa === 0 ? 'SEMILLA DE ' : '') + especie.nombre.toUpperCase()}
      </text>
      {/* el momento de evolución: ondas + rayos + anuncio, una sola vez por etapa */}
      {evo && (
        <g key={`evo-${etapa}`} className="agb-evo" aria-hidden="true">
          <circle className="agb-evo-onda" cx={ax} cy={ay} r="16" fill="none" stroke="#eafff6" strokeWidth="1.4" />
          <circle className="agb-evo-onda agb-eo2" cx={ax} cy={ay} r="16" fill="none" stroke={especie.acc} strokeWidth="1" />
          <g className="agb-evo-rayos" stroke="#eafff6" strokeWidth="1" strokeLinecap="round" style={{ transformOrigin: `${ax}px ${ay}px` }}>
            {[0, 60, 120, 180, 240, 300].map((ang) => {
              const rad = (ang * Math.PI) / 180;
              return (
                <line
                  key={ang}
                  x1={ax + Math.cos(rad) * 24} y1={ay + Math.sin(rad) * 24}
                  x2={ax + Math.cos(rad) * 33} y2={ay + Math.sin(rad) * 33}
                />
              );
            })}
          </g>
          <text
            className="agb-evo-texto" x={ax} y={ay - 46} textAnchor="middle"
            fontFamily="ui-monospace,monospace" fontSize="8" letterSpacing="2" fontWeight="700"
            fill="#eafff6" style={{ filter: `drop-shadow(0 0 6px ${especie.acc})` }}
          >
            ✦ EVOLUCIONÓ ✦
          </text>
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------------- */
/* CAPA 4 — EL ORGANISMO (foco: tronco, vainas, corazón, suelo, espíritu)      */
/* ------------------------------------------------------------------------- */

function CapaOrganismo({
  idx, decada, momento, futuro, especie, etapa, vitalidad, mundoAbierto, evo, pulso,
  onOpenMundo, onPulso, onTocarEspiritu,
}) {
  /* con el asomo a 10 años se enciende hasta la etapa 6 (el bosque pleno) */
  const on = (minYear) => (decada ? minYear <= 6 : idx >= minYear);
  const delayLeaf = ['', 'agb-l2', 'agb-l3'];
  const brotes = (!futuro && BROTES[momento]) || null;
  return (
    <svg
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Su finca convertida en un organismo bioluminiscente navegable y con profundidad: cada rama es un mundo, el río es el agua, el gallinero son los animales, la casa guarda a su agente, y su espíritu guardián vive dentro."
      data-testid="agb-escena"
    >
      <defs>
        <radialGradient id="agb-bulbo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2dffc4" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#2dffc4" stopOpacity="0.25" />
          <stop offset="1" stopColor="#2dffc4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="agb-nucleo" cx="0.5" cy="0.42" r="0.65">
          <stop offset="0" stopColor="rgba(45,255,196,0.32)" />
          <stop offset="0.7" stopColor="rgba(45,255,196,0.1)" />
          <stop offset="1" stopColor="rgba(45,255,196,0)" />
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
        <linearGradient id="agb-suelo-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(12,16,38,0.96)" />
          <stop offset="1" stopColor="rgba(2,4,12,0.98)" />
        </linearGradient>
        <filter id="agb-blur3"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="agb-glow1" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ============ EL ORGANISMO (respira) ============ */}
      <g className="agb-organismo">
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

        {/* ramas-vaina (mundos del foco) */}
        {MUNDOS_RAMA.filter((m) => m.id !== 'suelo').map((m) => (
          <NodoVaina key={m.id} mundo={m} visible={on(m.minYear)} activo={mundoAbierto === m.id} onOpen={onOpenMundo} />
        ))}

        {/* frutos = cosechas */}
        {FRUTOS_SVG.map((f, i) => (
          <g key={i} className={`agb-g${on(f.minYear) ? ' on' : ''}`} style={{ transformOrigin: `${f.x}px ${f.y}px` }}>
            <circle className={`agb-fruit ${['', 'agb-fr2', 'agb-fr3'][i % 3]}`} cx={f.x} cy={f.y} r="3" fill={f.c} style={{ filter: `drop-shadow(0 0 4px ${f.c})` }} />
          </g>
        ))}

        {/* anillos fantasma: dónde brota lo próximo según el momento escogido */}
        {brotes && brotes.map(([bx, by], i) => (
          <g key={`${momento}-${i}`} className="agb-brote" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${bx}px ${by}px` }} aria-hidden="true">
            <circle cx={bx} cy={by} r="8" fill="none" stroke="#4fd8ff" strokeWidth="0.9" strokeDasharray="2.5 3.5" />
            <circle cx={bx} cy={by} r="1.7" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 4px #4fd8ff)' }} />
          </g>
        ))}

        {/* flor para la angelita */}
        <g className={`agb-g${on(1) ? ' on' : ''}`} style={{ transformOrigin: '122px 356px' }}>
          <g transform="translate(122,356)">
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

      {/* raíces que crecen con el tiempo */}
      {RAICES_SVG.map((r, i) => (
        <g key={i} className={`agb-g${on(r.minYear) ? ' on' : ''}`} style={{ transformOrigin: `${r.origen[0]}px ${r.origen[1]}px` }}>
          <path d={r.d} fill="none" stroke="#9dff3f" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
          <circle className="agb-micnodo" cx={r.tip[0]} cy={r.tip[1]} r="1.4" fill="#bfffe9" />
        </g>
      ))}

      {/* raíz-mundo: el suelo vivo */}
      <NodoVaina mundo={MUNDOS_RAMA.find((m) => m.id === 'suelo')} visible={on(0)} activo={mundoAbierto === 'suelo'} onOpen={onOpenMundo} />

      {/* a 10 años, el corazón acumula anillos del tiempo */}
      {decada && (
        <g aria-hidden="true" opacity="0.7">
          <circle className="agb-halo" cx="195" cy="556" r="48" fill="none" stroke="#ff4fd8" strokeWidth="0.7" strokeDasharray="3 6" />
          <circle className="agb-halo" style={{ animationDelay: '-2.7s' }} cx="195" cy="556" r="58" fill="none" stroke="#b28dff" strokeWidth="0.6" strokeDasharray="2 8" />
        </g>
      )}

      {/* corazón-semilla que late — TOCABLE: manda un pulso de savia al organismo */}
      <g
        className="agb-nodo agb-heart-hit"
        role="button"
        tabIndex={0}
        aria-label="Tocar el corazón de la finca para enviar un pulso de vida"
        onClick={onPulso}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPulso(); }
        }}
      >
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
      </g>

      {/* onda expansiva del pulso de vida (se re-monta por toque) */}
      {pulso > 0 && (
        <g key={pulso} aria-hidden="true">
          <circle className="agb-pulso-onda" cx="195" cy="556" r="18" fill="none" stroke="#eafff6" strokeWidth="1.6" />
          <circle className="agb-pulso-onda agb-po2" cx="195" cy="556" r="18" fill="none" stroke={especie.acc} strokeWidth="1.1" />
          <circle className="agb-pulso-onda agb-po3" cx="195" cy="556" r="18" fill="none" stroke="#9dff3f" strokeWidth="0.8" />
        </g>
      )}

      {/* nutrientes viajando (paths en CSS) */}
      <circle className="agb-spark agb-p1" r="2" fill="#bfffe9" />
      <circle className="agb-spark agb-p2" r="2" fill="#d8ff6a" />
      <circle className="agb-spark agb-p3" r="2.2" fill="#bfffe9" />
      <circle className="agb-spark agb-p4" r="1.8" fill="#ffb54f" />
      <circle className="agb-spark agb-p5" r="1.8" fill="#ff9ee8" />

      {/* etiqueta viva */}
      <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity="0.6">
        <text x="195" y="602" fill="#2dffc4" textAnchor="middle">CORAZÓN DE LA FINCA · VIVO</text>
        <text x="195" y="613" fill="#5b7f93" textAnchor="middle" letterSpacing="1">toque una vaina, el río o el gallinero para entrar</text>
      </g>

      {/* ============ EL AVATAR: el espíritu vive en el organismo ============ */}
      <VinculoEspiritu especie={especie} />
      <Avatar especie={especie} etapa={etapa} vitalidad={vitalidad} evo={evo} onTocar={onTocarEspiritu} />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* CAPA 5 — PRIMER PLANO: frondas desenfocadas y cocuyos bokeh                 */
/* ------------------------------------------------------------------------- */

function CapaFrente() {
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="agbF-blur2"><feGaussianBlur stdDeviation="1.8" /></filter>
        <filter id="agbF-blur7"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>

      {/* fronda inferior izquierda: hojas gigantes fuera de foco */}
      <g className="agb-fronda" style={{ transformOrigin: '0px 844px' }} filter="url(#agbF-blur2)">
        <path d="M-10,860 C10,760 2,690 -18,640 C-52,700 -50,790 -10,860 Z" fill="#03101c" stroke="rgba(45,255,196,0.28)" strokeWidth="1.2" />
        <path d="M30,870 C66,780 70,700 44,636 C6,690 -2,800 30,870 Z" fill="#041423" stroke="rgba(157,255,63,0.22)" strokeWidth="1.2" />
        <path d="M78,880 C108,810 116,740 96,690 C62,740 52,820 78,880 Z" fill="#03101c" stroke="rgba(45,255,196,0.2)" strokeWidth="1" />
        <path d="M44,640 C42,700 40,770 34,860" fill="none" stroke="rgba(216,255,106,0.25)" strokeWidth="0.9" />
      </g>

      {/* fronda inferior derecha */}
      <g className="agb-fronda agb-fronda-der" style={{ transformOrigin: '390px 844px' }} filter="url(#agbF-blur2)">
        <path d="M400,864 C378,770 384,700 404,646 C436,710 434,796 400,864 Z" fill="#041423" stroke="rgba(45,255,196,0.26)" strokeWidth="1.2" />
        <path d="M352,876 C326,800 320,730 342,676 C378,730 384,816 352,876 Z" fill="#03101c" stroke="rgba(255,79,216,0.16)" strokeWidth="1.1" />
        <path d="M342,678 C346,740 350,800 354,868" fill="none" stroke="rgba(216,255,106,0.22)" strokeWidth="0.9" />
      </g>

      {/* bejuco colgante arriba a la derecha */}
      <g className="agb-fronda agb-bejuco" style={{ transformOrigin: '390px 0px' }} filter="url(#agbF-blur2)">
        <path d="M398,-10 C380,60 372,120 378,180" fill="none" stroke="#0a2a20" strokeWidth="3" strokeLinecap="round" />
        <path d="M378,60 C364,66 356,78 356,92 C368,86 376,74 378,60 Z" fill="#062018" stroke="rgba(45,255,196,0.3)" strokeWidth="1" />
        <path d="M376,130 C390,138 396,150 394,164 C382,156 376,144 376,130 Z" fill="#062018" stroke="rgba(157,255,63,0.26)" strokeWidth="1" />
        <circle cx="378" cy="182" r="2.6" fill="#9dff3f" opacity="0.8" style={{ filter: 'drop-shadow(0 0 5px #9dff3f)' }} />
      </g>

      {/* cocuyos bokeh: pasan por delante de la cámara */}
      <circle className="agb-bokeh" cx="70" cy="560" r="12" fill="#2dffc4" opacity="0.12" filter="url(#agbF-blur7)" />
      <circle className="agb-bokeh agb-bk2" cx="330" cy="300" r="9" fill="#ff4fd8" opacity="0.1" filter="url(#agbF-blur7)" />
      <circle className="agb-bokeh agb-bk3" cx="200" cy="700" r="14" fill="#d8ff6a" opacity="0.09" filter="url(#agbF-blur7)" />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* el mockup completo (capas con profundidad + HUD + chat del agente)          */
/* ------------------------------------------------------------------------- */

export default function AvatarGameBiopunk({ onBack }) {
  const [idx, setIdx] = useState(0); /* etapa visual de crecimiento 0..5 */
  const [momento, setMomento] = useState('hoy');
  const [futuro, setFuturo] = useState(null); /* null | 'ano1' | 'ano10' */
  const [especieId, setEspecieId] = useState('abeja'); /* la angelita manda */
  const [mundo, setMundo] = useState(null);
  const [nota, setNota] = useState('');
  const [pulso, setPulso] = useState(0);
  const [evo, setEvo] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [borrador, setBorrador] = useState('');
  const rootRef = useRef(null);
  const notaRef = useRef(null);
  const pulsoRef = useRef(null);
  const evoRef = useRef(null);
  const chatRef = useRef(null);
  const chatScrollRef = useRef(null);
  const etapaPrevRef = useRef(0);

  const especie = ESPECIES.find((e) => e.id === especieId);
  const momentoDef = MOMENTOS.find((m) => m.id === momento);
  const decada = futuro === 'ano10';
  const etapa = Math.min(idx, 5);
  const vitalidad = Math.round(
    (SALUD.agua[etapa] + SALUD.suelo[etapa] + SALUD.biodiversidad[etapa] + SALUD.constancia[etapa]) / 4,
  );

  /* --------- profundidad: la escena se inclina con el puntero --------- */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const mover = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--agb-px', x.toFixed(3));
        el.style.setProperty('--agb-py', y.toFixed(3));
      });
    };
    const soltar = () => {
      el.style.setProperty('--agb-px', '0');
      el.style.setProperty('--agb-py', '0');
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerleave', soltar);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerleave', soltar);
    };
  }, []);

  /* --------- despertar: la finca crece hasta HOY (corto, inmediato) --------- */
  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto) {
      const t = setTimeout(() => setIdx(MOMENTOS[0].idx), 0);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setIdx(1), 700);
    const t2 = setTimeout(() => setIdx(MOMENTOS[0].idx), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  /* el momento de evolución: cuando la etapa sube de verdad, se celebra
     (el despertar inicial 0→2 no cuenta) */
  useEffect(() => {
    if (etapa > etapaPrevRef.current && etapa > 2) {
      setEvo(true);
      clearTimeout(evoRef.current);
      evoRef.current = setTimeout(() => setEvo(false), 2000);
    }
    etapaPrevRef.current = etapa;
  }, [etapa]);

  useEffect(() => () => {
    clearTimeout(notaRef.current);
    clearTimeout(pulsoRef.current);
    clearTimeout(evoRef.current);
    clearTimeout(chatRef.current);
  }, []);

  /* el chat baja solo al último mensaje */
  useEffect(() => {
    const caja = chatScrollRef.current;
    if (caja) caja.scrollTop = caja.scrollHeight;
  }, [msgs, chatAbierto]);

  const avisar = (texto) => {
    setNota(texto);
    clearTimeout(notaRef.current);
    notaRef.current = setTimeout(() => setNota(''), 2600);
  };

  const abrirMundo = (m) => setMundo(m);
  const entrarMundo = () => {
    avisar(`(mockup) aquí entraría al mundo ${mundo.titulo}`);
    setMundo(null);
  };

  const escogerMomento = (m) => {
    setFuturo(null);
    setMomento(m.id);
    setIdx(m.idx);
  };

  const abrirFuturo = (f) => {
    setFuturo(f.id);
    setIdx(5);
  };

  const volverHoy = () => {
    setFuturo(null);
    setMomento('hoy');
    setIdx(MOMENTOS[0].idx);
  };

  const escogerEspecie = (id) => {
    setEspecieId(id);
    const e = ESPECIES.find((x) => x.id === id);
    avisar(`${e.nombre} — guardián de: ${e.eje.toLowerCase()}`);
  };

  /* tocar el corazón: un pulso de savia recorre el organismo entero */
  const enviarPulso = () => {
    setPulso((n) => n + 1);
    clearTimeout(pulsoRef.current);
    pulsoRef.current = setTimeout(() => setPulso(0), 1700);
    avisar('El corazón late fuerte — la savia corre a su espíritu ✦');
  };

  /* ------------- la caja del agente, integrada: el espíritu habla ---------- */
  const hablaEspiritu = useCallback((texto) => {
    setMsgs((m) => [...m, { de: 'espiritu', texto }]);
    setChatAbierto(true);
  }, []);

  const responder = (pregunta) => {
    const t = pregunta.toLowerCase();
    if (t.includes('agua') || t.includes('río') || t.includes('rio')) {
      return `El agua va en ${SALUD.agua[etapa]} de 100: el río baja limpio de la cascada y el reservorio viene subiendo. Anote el aforo del nacedero y se lo cuido.`;
    }
    if (t.includes('semana') || t.includes('hago') || t.includes('siembr')) {
      return 'Esta semana: brotan las matas de cilantro, florece el frijol cargamanto y la angelita estrena alza. Yo le aviso apenas asome el primer brote.';
    }
    if (t.includes('suelo') || t.includes('abono') || t.includes('compost')) {
      return `El suelo vivo va en ${SALUD.suelo[etapa]} de 100. La compostera pide su primera vuelta este mes — el micelio ya está tejiendo debajo.`;
    }
    if (t.includes('café') || t.includes('cafe')) {
      return 'El café viene sano: la traviesa llega esta temporada. Cuando arranque la despulpada, lo acompaño paso a paso.';
    }
    return `(mockup) Aquí le respondería el agente real con los datos de su finca. Hoy la vitalidad va en ${vitalidad} y su ${especie.corto.toLowerCase()} lo siente.`;
  };

  const preguntar = (texto) => {
    setMsgs((m) => [...m, { de: 'usted', texto }]);
    clearTimeout(chatRef.current);
    chatRef.current = setTimeout(() => {
      setMsgs((m) => [...m, { de: 'espiritu', texto: responder(texto) }]);
    }, 650);
  };

  const abrirChat = () => {
    if (msgs.length === 0) {
      const nivel = FRASES_ESPIRITU.find((f) => vitalidad < f.tope);
      hablaEspiritu(`${nivel ? nivel.frase : ''} ¿Qué quiere saber de su finca?`);
    } else {
      setChatAbierto(true);
    }
  };

  /* tocar al espíritu: habla según la vitalidad real y abre la conversación */
  const tocarEspiritu = () => {
    const nivel = FRASES_ESPIRITU.find((f) => vitalidad < f.tope);
    hablaEspiritu(`${nivel ? nivel.frase : ''} Aquí estoy — pregúnteme por su finca.`);
  };

  /* tocar la casa: en la cocina vive el agente */
  const abrirCasa = () => {
    hablaEspiritu('Sigamos a la cocina — aquí vivo yo también. Pregúnteme por el agua, el café o lo que viene esta semana.');
  };

  const enviarBorrador = (e) => {
    e.preventDefault();
    const t = borrador.trim();
    if (!t) return;
    preguntar(t);
    setBorrador('');
  };

  const circ = 2 * Math.PI * 26;
  const futuroDef = futuro && FUTUROS.find((f) => f.id === futuro);

  return (
    <div
      ref={rootRef}
      className={`agb${pulso > 0 ? ' agb-pulsando' : ''}${futuro ? ' agb-en-futuro' : ''}`}
      data-momento={momento}
      data-futuro={futuro || undefined}
      data-especie={especieId}
      data-testid="agb-mockup"
      style={{ '--agb-acc': especie.acc, '--agb-acc-rgb': especie.accRgb, '--agb-acc2': especie.acc2 }}
    >
      <div className="agb-wings" aria-hidden="true" />

      {/* ---- el escenario con PROFUNDIDAD: 5 capas que se inclinan ---- */}
      <div className="agb-stage agb-enter">
        <div className="agb-capa agb-capa-cielo">
          <CapaCielo especie={especie} climaActivo={mundo?.id === 'clima'} onOpenMundo={abrirMundo} />
        </div>
        <div className="agb-capa agb-capa-lejos">
          <CapaLejos />
        </div>
        <div className="agb-capa agb-capa-medio">
          <CapaMedio
            aguaActiva={mundo?.id === 'agua'}
            animalesActivo={mundo?.id === 'animales'}
            onOpenMundo={abrirMundo}
            onAbrirCasa={abrirCasa}
          />
        </div>
        <div className="agb-capa agb-capa-org">
          <CapaOrganismo
            idx={idx}
            decada={decada}
            momento={momento}
            futuro={futuro}
            especie={especie}
            etapa={etapa}
            vitalidad={vitalidad}
            mundoAbierto={mundo?.id}
            evo={evo}
            pulso={pulso}
            onOpenMundo={abrirMundo}
            onPulso={enviarPulso}
            onTocarEspiritu={tocarEspiritu}
          />
        </div>
        <div className="agb-capa agb-capa-frente">
          <CapaFrente />
        </div>
      </div>

      {/* velo de foco: al abrir un mundo, el resto de la finca se apaga un poco */}
      <div className={`agb-velo${mundo ? ' on' : ''}`} aria-hidden="true" />
      {/* velo del futuro: el asomo tiñe la noche de magenta */}
      <div className="agb-velo-futuro" aria-hidden="true" />

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
              Su finca es un organismo vivo y con fondo: entre por sus ramas, su río, su gallinero.
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
                <span className="agb-vital-num">{HOJAS_ETAPA[etapa]}<small> sp.</small></span>
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
                      style={{ width: `${clamp01(SALUD[eje.id][etapa])}%`, '--agb-c1': eje.c1, '--agb-c2': eje.c2 }}
                    />
                  </span>
                  <span className="agb-eje-val">{SALUD[eje.id][etapa]}</span>
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
              <span>🍃 <b>{HOJAS_ETAPA[etapa]}</b> especies registradas</span>
              <span>✦ <b>{FRUTOS_ETAPA[etapa]}</b> cosechas anotadas</span>
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
                <span>🍃 <b>{Math.round(mundo.hojas * (0.3 + 0.14 * etapa))}</b> hojas</span>
                <span>✦ <b>{Math.round(mundo.frutos * (0.2 + 0.16 * etapa))}</b> frutos</span>
                <span>◍ savia fluyendo</span>
              </div>
              <button type="button" className="agb-carta-entrar" onClick={entrarMundo}>
                Entrar al mundo →
              </button>
            </section>
          )}
        </div>

        {/* ---- el dock: el PULSO CERCANO manda; el futuro solo se asoma ---- */}
        <div className="agb-dock agb-rise agb-d5">
          {futuroDef ? (
            <div className="agb-futuro-fila" data-testid="agb-asomo">
              <span className="agb-futuro-cap">🔭 {futuroDef.caption}</span>
              <div className="agb-futuro-btns">
                {FUTUROS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`agb-momento agb-momento-futuro${f.id === futuro ? ' on' : ''}`}
                    onClick={() => abrirFuturo(f)}
                  >
                    {f.label}
                  </button>
                ))}
                <button type="button" className="agb-volver-hoy" onClick={volverHoy}>
                  ← VOLVER A HOY
                </button>
              </div>
            </div>
          ) : (
            <div className="agb-pulso-fila">
              <div className="agb-pulso-cab">
                <span>EL PULSO DE SU FINCA · {momentoDef.caption}</span>
                <button type="button" className="agb-asomo-btn" onClick={() => abrirFuturo(FUTUROS[0])}>
                  🔭 ASOMO AL FUTURO
                </button>
              </div>
              <div className="agb-momentos" role="radiogroup" aria-label="Momento de la finca">
                {MOMENTOS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={m.id === momento}
                    className={`agb-momento${m.id === momento ? ' on' : ''}`}
                    onClick={() => escogerMomento(m)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <ul className="agb-hitos">
                {momentoDef.hitos.map((h) => (
                  <li key={h.t} className={h.ok ? 'ok' : ''}>
                    <span className="agb-hito-dot" aria-hidden="true">{h.ok ? '✓' : ''}</span>
                    {h.t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="agb-dock-sep" aria-hidden="true" />

          <div className="agb-dock-cab">
            <span>SU GUARDIÁN</span>
            <span className="agb-dock-cientifico">{especie.cientifico}</span>
          </div>
          <div className="agb-chips" role="radiogroup" aria-label="Especie del guardián">
            {ESPECIES.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={e.id === especieId}
                className={`agb-chip${e.id === especieId ? ' on' : ''}${e.relegado ? ' agb-chip-relegado' : ''}`}
                onClick={() => escogerEspecie(e.id)}
              >
                <span className="agb-chip-glifo" aria-hidden="true">{e.glifo}</span>
                {e.corto}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- la caja del agente, dentro de la escena ---- */}
      {!chatAbierto && (
        <button type="button" className="agb-chat-fab" onClick={abrirChat}>
          <span className="agb-chat-fab-glifo" aria-hidden="true">{especie.glifo}</span>
          <span className="agb-chat-fab-tx">Hable con su espíritu</span>
        </button>
      )}
      {chatAbierto && (
        <section className="agb-chat" data-testid="agb-chat" aria-label="Chat con el espíritu de su finca">
          <header className="agb-chat-cab">
            <span className="agb-chat-glifo" aria-hidden="true">{especie.glifo}</span>
            <div>
              <p className="agb-chat-rol">EL ESPÍRITU · SU AGENTE EN LA FINCA</p>
              <h2 className="agb-chat-nombre">{especie.nombre}</h2>
            </div>
            <button type="button" className="agb-carta-x" onClick={() => setChatAbierto(false)} aria-label="Cerrar el chat">✕</button>
          </header>
          <div ref={chatScrollRef} className="agb-chat-msgs">
            {msgs.map((m, i) => (
              <p key={`${i}-${m.de}`} className={`agb-msg agb-msg-${m.de}`}>{m.texto}</p>
            ))}
          </div>
          <div className="agb-chat-chips">
            {PREGUNTAS_RAPIDAS.map((p) => (
              <button key={p} type="button" onClick={() => preguntar(p)}>{p}</button>
            ))}
          </div>
          <form className="agb-chat-form" onSubmit={enviarBorrador}>
            <input
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              placeholder="Pregúntele a su finca…"
              aria-label="Escríbale a su espíritu"
            />
            <button type="submit" aria-label="Enviar">➤</button>
          </form>
        </section>
      )}

      <span className="agb-sello">MOCKUP · DATOS DE MUESTRA</span>
    </div>
  );
}

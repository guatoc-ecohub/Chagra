// ── AHORCADO CONTAMINADO, JUGABLE SOBRE EL VALLE REAL ────────────────────────
// «Reusá la lógica que ya existe» (#2823 dataset + mecánica, #2826 arte): este
// módulo es el PORTE a vanilla del juego del /app — el mismo dataset
// fundamentado (ahorcado-datos.js, palabra por palabra con fuente y nivel de
// confianza), la misma mecánica (6 errores = 6 pasos de contaminación, nada de
// horca) y la MISMA escena viva: la chagra andina 2D SVG estilo Cuphead
// (rubber-hose para los seres vivos, lámina Humboldt suave para el paisaje)
// que se apaga con cada letra errada y REVIVE al ganar.
//
// Las creatures (Angelita la abeja angelita, el colibrí chillón, la mariposa
// Dione, la lombriz nativa, el escarabajo estercolero) son portes fieles de
// src/visual/creatures/* de chagra@85abbd09 — mismos paths, misma paleta de
// identidad, mismas clases de cadencia (crt-*/rh-*, ver ahorcado.css §B). La
// dirección de escena de React (props pose/animo/energia/sed/polen/cejas) se
// traduce a data-attrs que el CSS interpreta: el DIBUJO nunca se re-crea, solo
// cambia de estado — las órbitas no se reinician con cada letra.
//
// Educativo (una niña de 11 + campesino, en usted): reconocer los VENENOS del
// campo (prohibidos por el ICA / Estocolmo / Rotterdam), las señales del
// cuerpo, y lo que SÍ se usa (biopreparados: caldo bordelés, bocashi…). La
// pista se puede pedir SIN castigo (la pista ES la lección, no un premio) y
// al final —gane o pierda— siempre se revela el dato con su fuente.
//
// Deterministas para el gate visual: `?palabra=CALDO%20BORDELES` fija la
// palabra, `?cat=vetado` la categoría; window.__ahorcado permite jugar letras
// por consola/harness. Sin parámetros: palabra al azar del banco.
import {
  CATEGORIAS, FUENTES, PALABRAS, PALABRAS_POR_CATEGORIA,
} from './ahorcado-datos.js';

const MAX_ERRORES = 6;
const TECLADO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

// Los 6 pasos de la metáfora de contaminación (texto verbatim del /app).
const ETAPAS = [
  { clase: 'sana', texto: 'La chagra está viva y sana.' },
  { clase: 'paso-1', texto: 'Una nube de químico asoma sobre la chagra.' },
  { clase: 'paso-2', texto: 'Las hojas se marchitan y empiezan a caer.' },
  { clase: 'paso-3', texto: 'El suelo fértil se agrieta y pierde su vida.' },
  { clase: 'paso-4', texto: 'El agua de riego se enturbió: ya no está limpia.' },
  { clase: 'paso-5', texto: 'Angelita, la abejita polinizadora, tambalea: casi no puede volar.' },
  { clase: 'paso-6', texto: 'La chagra quedó contaminada. Angelita cayó y las mariposas huyeron.' },
];

/* ══ IDENTIDADES (rubberhoseSpec + abejaIdentidad + faunaAndina, verbatim) ══ */
const INK = '#2a1a0c';
const PUPILA = '#20130a', HUESO = '#fffaf0', GUANTE = '#fff3d8';
const CHISPA = '#fffdf7', CHAPETA = '#f2907a';
/* Tetragonisca angustula: cabeza/tórax OSCUROS + abdomen ámbar PÁLIDO y LISO
   (sin bandas — esas son de la Apis que saquea sus colmenas). Sin aguijón. */
const AP = {
  cuerpo: '#f2c064', cuerpoGlow: 'rgba(242,192,100,0.85)', cabeza: '#ffd76a',
  testa: '#33281a', torax: '#3d2c19', cara: '#ffe3ad', hiloChumbe: '#c98a3e',
  alaTul: '#cfeeff', alaTulClara: '#eafff8', lengua: '#c9524e',
};
/* Colibri coruscans: dorso turquesa, gorguera violeta, iridiscencia cian↔magenta. */
const CP = {
  cuerpo: '#2fd6ab', cuerpoGlow: 'rgba(45,255,196,0.75)', vientre: '#d6fff0',
  garganta: '#b28dff', gargantaBrillo: '#d9c6ff', ala: '#59e0ff',
  cola: '#26b894', irisCian: '#4fd1ff', irisMagenta: '#ff4fd1',
};

/* ══ EL KIT RUBBER-HOSE como plantillas SVG (_rubberhose.jsx, portado) ══ */
const filtros = (glow, blur) => `
  <filter id="${glow}" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="2.1" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="${blur}"><feGaussianBlur stdDeviation="3"/></filter>`;

function ojosRubber(ojos, [mx, my] = [0.32, 0.34]) {
  const inner = ojos.map((o) => {
    const pr = o.r * 0.62;
    const px = +(o.cx + mx * o.r).toFixed(2), py = +(o.cy + my * o.r).toFixed(2);
    return `<g>
      <circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${HUESO}" stroke="${INK}" stroke-width="${+(o.r * 0.42).toFixed(2)}"/>
      <g class="rh-mirada">
        <circle cx="${px}" cy="${py}" r="${+pr.toFixed(2)}" fill="${PUPILA}"/>
        <circle cx="${+(px - pr * 0.4).toFixed(2)}" cy="${+(py - pr * 0.5).toFixed(2)}" r="${+(pr * 0.42).toFixed(2)}" fill="${CHISPA}"/>
      </g></g>`;
  }).join('');
  return `<g class="rh-blink" style="transform-box:fill-box;transform-origin:center">${inner}</g>`;
}

const cachetes = (puntos) => `<g fill="${CHAPETA}" opacity="0.72" class="rh-rubor">${
  puntos.map((p) => `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.r}" ry="${+(p.r * 0.72).toFixed(2)}"/>`).join('')
}</g>`;

const sonrisa = (cx, cy, w, prof) => `<path d="M${cx - w / 2},${cy} Q${cx},${cy + prof} ${cx + w / 2},${cy}" stroke="${INK}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;

function miembro({ d, ancho = 2.3, punta = null, puntaR = 1.6, pie = false, delay = 0, clase = '', origen = 'top center' }) {
  const punt = !punta ? '' : (pie
    ? `<ellipse cx="${punta[0]}" cy="${punta[1]}" rx="${+(puntaR * 1.15).toFixed(2)}" ry="${+(puntaR * 0.72).toFixed(2)}" fill="${GUANTE}" stroke="${INK}" stroke-width="0.7"/>`
    : `<circle cx="${punta[0]}" cy="${punta[1]}" r="${puntaR}" fill="${GUANTE}" stroke="${INK}" stroke-width="0.7"/>`);
  return `<g class="rh-sway${clase ? ` ${clase}` : ''}" style="transform-box:fill-box;transform-origin:${origen};animation-delay:${delay}s">
    <path d="${d}" stroke="${INK}" stroke-width="${ancho}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${punt}</g>`;
}

const antena = (d, bulbo, delay) => `<g class="rh-sway" style="transform-box:fill-box;transform-origin:bottom center;animation-delay:${delay}s">
  <path d="${d}" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <circle cx="${bulbo[0]}" cy="${bulbo[1]}" r="1.15" fill="${INK}"/></g>`;

/* Cejas expresivas (AngelitaGafas.CEJAS_D): las TRES variantes viven en el
   dibujo y el data-cejas del estado enciende una (rienda ahx, ver CSS §B). */
const CEJAS_D = {
  alegres: ['M9.0,-4.65 Q10.25,-5.5 11.45,-4.75', 'M6.4,-4.55 Q7.35,-5.25 8.3,-4.7'],
  altas: ['M8.95,-5.2 Q10.25,-6.1 11.5,-5.3', 'M6.35,-5.1 Q7.3,-5.8 8.25,-5.2'],
  fruncidas: ['M9.2,-5.0 L11.35,-4.35', 'M6.35,-4.4 L8.25,-4.95'],
};
const cejasTodas = () => Object.entries(CEJAS_D).map(([estilo, par]) => `
  <g class="ahx-cejas ahx-cejas-${estilo}" stroke="${INK}" stroke-width="0.85" fill="none" stroke-linecap="round" style="transform-box:fill-box;transform-origin:center bottom">
    <path d="${par[0]}"/><path d="${par[1]}"/></g>`).join('');

/* ══ LAS CREATURES (portes fieles de src/visual/creatures/*) ══ */

/* Angelita — AbejaAngelita.jsx con animated=true. La lengüita, el polen y las
   cejas van SIEMPRE dibujados; el estado los enciende por data-attr. */
function angelitaSVG() {
  const glow = 'ahxAglow', blur = 'ahxAblur';
  return `<g class="ahx-angelita-estado" data-creature="abeja-angelita" data-pose="vuela" data-animo="pleno" data-polen="1">
    <defs>${filtros(glow, blur)}</defs>
    <g class="rh-antic"><g class="rh-travieso">
    <g class="crt-body rh-boil" filter="url(#${glow})">
      <circle class="ahx-aura" r="6.6" fill="${AP.cuerpo}" opacity="0.5" filter="url(#${blur})"/>
      <ellipse class="crt-wing" cx="-3.4" cy="-6" rx="8.8" ry="3.3" fill="${AP.alaTul}" opacity="0.55" stroke="rgba(42,26,12,0.32)" stroke-width="0.45"/>
      <ellipse class="crt-wing" style="animation-delay:-0.07s" cx="-0.4" cy="-5.2" rx="6.6" ry="2.7" fill="${AP.alaTulClara}" opacity="0.44" stroke="rgba(42,26,12,0.28)" stroke-width="0.45"/>
      ${miembro({ d: 'M-2.6,4.4 C-3.2,6.6 -3.4,8 -3.0,9.2', ancho: 1.9, punta: [-3.0, 9.4], puntaR: 1.3, pie: true, delay: -0.6 })}
      ${miembro({ d: 'M1.8,4.7 C1.4,6.8 1.3,8.2 1.8,9.4', ancho: 1.9, punta: [1.8, 9.6], puntaR: 1.3, pie: true, delay: -0.95 })}
      <ellipse cx="-2.0" cy="0.2" rx="8.1" ry="4.5" fill="${AP.cuerpo}" stroke="${INK}" stroke-width="1.3" style="filter:drop-shadow(0 0 6px ${AP.cuerpoGlow})"/>
      <ellipse cx="-3.2" cy="-1.9" rx="3.9" ry="1.5" fill="${AP.cabeza}" opacity="0.26"/>
      <path d="M-7.2,-2.1 Q-7.9,0.2 -7.2,2.3" stroke="${AP.hiloChumbe}" stroke-width="0.5" fill="none" stroke-linecap="round" opacity="0.45"/>
      <ellipse cx="5.0" cy="-0.4" rx="3.5" ry="4.4" fill="${AP.torax}" stroke="${INK}" stroke-width="1.2"/>
      ${miembro({ clase: 'crt-brazo-l', origen: 'right top', d: 'M-6.2,1.4 C-8.2,2.4 -9.0,4.1 -8.4,5.9', ancho: 2.1, punta: [-8.5, 6.2], puntaR: 1.55, delay: -0.15 })}
      ${miembro({ clase: 'crt-brazo-r', origen: 'left top', d: 'M5.4,3.0 C6.9,4.2 7.5,5.9 7.0,7.5', ancho: 2.2, punta: [7.0, 7.8], puntaR: 1.6, delay: -0.45 })}
      <g class="crt-cabeza">
        <circle cx="8.6" cy="-1.0" r="4.4" fill="${AP.testa}" stroke="${INK}" stroke-width="1.2"/>
        <ellipse cx="9.4" cy="-0.2" rx="3.2" ry="3.4" fill="${AP.cara}" opacity="0.95"/>
        ${cachetes([{ cx: 10.4, cy: 0.7, r: 1.15 }, { cx: 6.9, cy: 0.3, r: 0.85 }])}
        <g class="crt-boca" style="transform-box:fill-box;transform-origin:center">${sonrisa(8.9, 1.4, 2.8, 1.1)}</g>
        ${ojosRubber([{ cx: 10.1, cy: -1.9, r: 1.95 }, { cx: 7.4, cy: -2.2, r: 1.45 }], [0.3, 0.34])}
        ${cejasTodas()}
        ${antena('M7.7,-4.7 C6.7,-7.3 7.0,-9.3 8.3,-10.1', [8.3, -10.3], 0)}
        ${antena('M9.7,-4.6 C11.0,-6.7 11.3,-8.7 10.5,-10.3', [10.5, -10.5], -0.3)}
      </g>
      <g class="ahx-lengua-marco" transform="translate(9.6 2.4)"><g class="crt-lengua">
        <path d="M0,0 C-0.4,2.6 0.4,4.4 0,6.2" stroke="${AP.lengua}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        <circle cx="0" cy="6.4" r="1.05" fill="${AP.lengua}"/></g></g>
      <g class="crt-polen" fill="${AP.cuerpo}" aria-hidden="true">
        <circle class="crt-polen-mota" cx="-9" cy="5.5" r="0.85"/>
        <circle class="crt-polen-mota" style="animation-delay:-0.8s" cx="6.5" cy="7.2" r="0.6"/>
        <circle class="crt-polen-mota" style="animation-delay:-1.5s" cx="-2.5" cy="8.4" r="0.72"/>
        <circle class="crt-polen-mota" style="animation-delay:-2.1s" cx="9.5" cy="4.2" r="0.52"/>
        <circle class="crt-polen-mota" style="animation-delay:-2.9s" cx="1.5" cy="9" r="0.6"/>
      </g>
    </g>
    </g></g>
  </g>`;
}

/* El colibrí chillón — Colibri.jsx (estelas ON, dardo, gorguera violeta). */
function colibriSVG() {
  const glow = 'ahxCglow', blur = 'ahxCblur';
  const COLA = [
    'M-6,1.4 L-13.2,-1.4 L-8,1.6 Z',
    'M-6,2.2 L-13.6,2.2 L-8,2.6 Z',
    'M-6,3.0 L-12.8,5.4 L-8,3.4 Z',
  ];
  const ALA_D = 'M3,-1.6 C-4.6,-15 10.8,-22 17.6,-13 C14.6,-5 8.2,-1.6 3,-1.6 Z';
  const ALA_T = 'M2,0.6 C-4,12 9,16.4 13.6,8.8 C10.6,3.4 6,1.2 2,0.6 Z';
  const estela = (clase, color, op) => `<g class="colibri-estela ${clase}" fill="${color}" opacity="${op}" aria-hidden="true">
    <path d="${ALA_T}"/><path d="${COLA[1]}"/>
    <ellipse cx="0" cy="0.4" rx="6" ry="4.6"/><circle cx="6.6" cy="-2.4" r="3.4"/>
    <path d="M9.6,-2.4 L18.4,-4.2" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="${ALA_D}"/></g>`;
  return `<g class="ahx-colibri-estado" data-creature="colibri" data-pose="vuela" data-animo="pleno" data-estelas="1">
    <defs>${filtros(glow, blur)}</defs>
    <g class="rh-antic"><g class="rh-travieso">
    ${estela('colibri-estela--2', CP.irisMagenta, 0.22)}
    ${estela('colibri-estela--1', CP.irisCian, 0.3)}
    <g class="colibri-dardo">
    <g class="crt-body rh-boil" filter="url(#${glow})">
      <circle class="ahx-aura" cx="1" cy="0" r="6.4" fill="${CP.cuerpo}" opacity="0.5" filter="url(#${blur})"/>
      <g fill="${CP.cola}" stroke="${INK}" stroke-width="0.5">${COLA.map((d) => `<path d="${d}"/>`).join('')}</g>
      <path class="crt-wing" style="animation-delay:-0.05s" d="${ALA_T}" fill="${CP.cuerpo}" opacity="0.4" stroke="rgba(42,26,12,0.3)" stroke-width="0.5"/>
      <path d="M-1.4,4.4 C-1.8,5.8 -1.6,6.6 -1.0,7.0" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M1.4,4.6 C1.2,6.0 1.4,6.8 2.0,7.2" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="0.4" rx="6" ry="4.6" fill="${CP.cuerpo}" stroke="${INK}" stroke-width="1.3" style="filter:drop-shadow(0 0 6px ${CP.cuerpoGlow})"/>
      <path d="M-3,2.6 C2.4,4.6 7,4 10,1.8 C6.6,5.8 -0.4,6 -4,2.0 Z" fill="${CP.vientre}" opacity="0.85"/>
      <circle cx="6.6" cy="-2.4" r="3.4" fill="${CP.cuerpo}" stroke="${INK}" stroke-width="1.2"/>
      <path d="M5.0,-0.2 C6.6,2.2 9.4,2.2 10.8,-0.2 C10.2,2.6 5.8,2.8 5.0,-0.2 Z" fill="${CP.garganta}" opacity="0.95"/>
      <path d="M6.4,0.2 C7.2,1.2 8.6,1.2 9.4,0.2 C8.6,1.4 7.2,1.4 6.4,0.2 Z" fill="${CP.gargantaBrillo}" opacity="0.8"/>
      ${cachetes([{ cx: 5.0, cy: -1.4, r: 1.0 }])}
      ${sonrisa(8.4, -1.0, 1.8, 0.7)}
      <path d="M9.6,-2.4 L18.4,-4.2" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M9.6,-1.4 L17.8,-3.4" stroke="${INK}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.7"/>
      ${ojosRubber([{ cx: 6.9, cy: -3.0, r: 1.7 }], [0.32, 0.2])}
      <path class="crt-wing" d="${ALA_D}" fill="${CP.ala}" opacity="0.78" stroke="rgba(42,26,12,0.35)" stroke-width="0.5"/>
    </g>
    </g>
    </g></g>
  </g>`;
}

/* La mariposa pasionaria — Mariposa.jsx (Dione juno: cuatro alas, ocelos). */
function dioneSVG() {
  const glow = 'ahxDglow', blur = 'ahxDblur';
  return `<g data-creature="mariposa">
    <defs>${filtros(glow, blur)}</defs>
    <g class="crt-body" filter="url(#${glow})">
      <g class="crt-fwing crt-fwing-l">
        <path d="M0,2 C-13,4 -18,12 -12,15 C-6,17 -1,10 0,4 Z" fill="#d24a1e" opacity="0.9"/>
        <circle cx="-9" cy="11" r="1.3" fill="#2a0f06" opacity="0.7"/>
      </g>
      <g class="crt-fwing crt-fwing-r">
        <path d="M0,2 C13,4 18,12 12,15 C6,17 1,10 0,4 Z" fill="#d24a1e" opacity="0.9"/>
        <circle cx="9" cy="11" r="1.3" fill="#2a0f06" opacity="0.7"/>
      </g>
      <g class="crt-fwing crt-fwing-l">
        <path d="M0,-2 C-16,-11 -24,-6 -22,0 C-20,5 -8,3 0,1 Z" fill="#ff6ad0" opacity="0.92"/>
        <path d="M-20,-3 C-14,-2 -7,-1 -1,0" fill="none" stroke="#eafff6" stroke-width="0.8" opacity="0.6"/>
        <circle cx="-16" cy="-4" r="1.1" fill="#eafff6" opacity="0.85"/>
      </g>
      <g class="crt-fwing crt-fwing-r">
        <path d="M0,-2 C16,-11 24,-6 22,0 C20,5 8,3 0,1 Z" fill="#ff6ad0" opacity="0.92"/>
        <path d="M20,-3 C14,-2 7,-1 1,0" fill="none" stroke="#eafff6" stroke-width="0.8" opacity="0.6"/>
        <circle cx="16" cy="-4" r="1.1" fill="#eafff6" opacity="0.85"/>
      </g>
      <ellipse cx="0" cy="2" rx="1.7" ry="9" fill="#2a1712"/>
      <circle cx="0" cy="-8" r="1.9" fill="#2a1712"/>
      <path d="M-0.8,-9.4 C-3,-13 -4.5,-14 -6,-13.6 M0.8,-9.4 C3,-13 4.5,-14 6,-13.6" stroke="#2a1712" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <circle cx="-6" cy="-13.6" r="0.9" fill="#ff6ad0"/>
      <circle cx="6" cy="-13.6" r="0.9" fill="#ff6ad0"/>
    </g>
  </g>`;
}

/* La lombriz nativa — Lombriz.jsx (Martiodrilus: clitelo claro, cabecita). */
function lombrizSVG() {
  const glow = 'ahxLglow', blur = 'ahxLblur';
  return `<g data-creature="lombriz">
    <defs>${filtros(glow, blur)}</defs>
    <g class="crt-body" filter="url(#${glow})">
      <path d="M0,26 C-2,14 6,10 4,0 C2.5,-7 8,-11 12,-9" fill="none" stroke="#c0715a" stroke-width="7.4" stroke-linecap="round"/>
      <path d="M0,26 C-2,14 6,10 4,0 C2.5,-7 8,-11 12,-9" fill="none" stroke="#ff9d6a" stroke-width="4.4" stroke-linecap="round" opacity="0.85"/>
      <g stroke="#7a3f2e" stroke-width="0.9" opacity="0.65" stroke-linecap="round">
        <path d="M-1.4,22 L1.4,20.5"/><path d="M-1.2,16.5 L2.2,15.5"/>
        <path d="M2.4,11.5 L5.6,11"/><path d="M3.4,5.5 L6.4,5.6"/>
        <path d="M2.8,-0.5 L5.6,-1.4"/><path d="M4.6,-6 L7.4,-7.6"/>
      </g>
      <path d="M3.2,3 C2,-1 4,-4 6.6,-5" fill="none" stroke="#ffd9b0" stroke-width="4.6" stroke-linecap="round" opacity="0.75"/>
      <circle cx="12.2" cy="-9.4" r="2.2" fill="#ff9d6a"/>
      <circle cx="13.2" cy="-10" r="0.6" fill="#3a1c12" opacity="0.7"/>
    </g>
  </g>`;
}

/* El escarabajo estercolero — Escarabajo.jsx (Dichotomius: bola, cuerno). */
function escarabajoSVG() {
  const glow = 'ahxEglow', blur = 'ahxEblur';
  return `<g data-creature="escarabajo">
    <defs>${filtros(glow, blur)}</defs>
    <g class="crt-ball">
      <circle cx="-13" cy="7" r="6.5" fill="#5a4230"/>
      <circle cx="-13" cy="7" r="6.5" fill="none" stroke="#3a2c1c" stroke-width="1"/>
      <circle cx="-15" cy="5" r="1.5" fill="#6e5238" opacity="0.7"/>
      <circle cx="-11.5" cy="9" r="1.1" fill="#42301f" opacity="0.7"/>
    </g>
    <g class="crt-body" filter="url(#${glow})">
      <g class="crt-legs" stroke="#0c1206" stroke-width="1.7" stroke-linecap="round">
        <path d="M-4,4 L-9,10"/><path d="M0,5 L-1,11"/><path d="M4,4 L8,10"/>
      </g>
      <ellipse cx="0" cy="0" rx="9" ry="6.4" fill="#141c10" style="filter:drop-shadow(0 0 5px rgba(157,214,106,0.7))"/>
      <ellipse cx="0" cy="0" rx="9" ry="6.4" fill="none" stroke="#9dd66a" stroke-width="0.7" stroke-opacity="0.6"/>
      <path d="M0,-5.6 L0,5.6" stroke="#0c1206" stroke-width="0.8"/>
      <ellipse cx="-3.5" cy="-2.8" rx="2.6" ry="1.4" fill="#3d5a24" opacity="0.55"/>
      <path d="M8,-3.4 C12,-3.8 13.4,-1 12.4,1.4 C11.4,3.6 9,3.6 8.2,2.6 C9.4,1 9.2,-1.4 8,-3.4 Z" fill="#0f150b"/>
      <path d="M11.2,-3.2 C12.6,-5 13.4,-4.4 13.2,-2.8" fill="none" stroke="#0f150b" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="10.4" cy="-0.6" r="0.7" fill="#9dd66a" opacity="0.8"/>
    </g>
  </g>`;
}

/* Mariposita chiquita (dibujo propio del juego: "el resto" que huye). */
const maripositaSVG = () => `<g class="jp-ah-mariposa">
  <g class="jp-ah-mariposa-ala ala-m-izq">
    <path d="M-1,0 C-6,-6 -11,-6 -11,-1 C-11,3 -6,4 -1,1 Z"/>
    <circle cx="-7" cy="-2" r="1.1"/>
  </g>
  <g class="jp-ah-mariposa-ala ala-m-der">
    <path d="M1,0 C6,-6 11,-6 11,-1 C11,3 6,4 1,1 Z"/>
    <circle cx="7" cy="-2" r="1.1"/>
  </g>
  <ellipse class="jp-ah-mariposa-cuerpo" cx="0" cy="0" rx="1.4" ry="4"/>
  <path class="jp-ah-mariposa-antena" d="M-0.6,-3.6 Q-2,-6 -3,-6.6"/>
  <path class="jp-ah-mariposa-antena" d="M0.6,-3.6 Q2,-6 3,-6.6"/>
</g>`;

/* Frailejón de silueta (toque de páramo). */
const frailejonSVG = () => `
  <rect x="-2" y="-12" width="4" height="14" rx="2"/>
  <g>${[-64, -32, 0, 32, 64].map((a) => `<ellipse cx="0" cy="-16" rx="2.6" ry="7.5" transform="rotate(${a} 0 -10)"/>`).join('')}</g>
  <circle class="jp-ah-frailejon-flor" cx="0" cy="-24" r="2.2"/>`;

/* ══ LA ESCENA VIVA (EscenaChagra, portada 1:1 — se construye UNA vez) ══ */
function escenaSVG() {
  const hoja = `<path class="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z"/>
      <path class="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3"/>`;
  return `<svg class="jp-ah-vivo" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="jpAhCieloSano" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ed0ec"/><stop offset="0.7" stop-color="#cdeccc"/><stop offset="1" stop-color="#f2f7d8"/>
      </linearGradient>
      <linearGradient id="jpAhCieloToxico" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#565264"/><stop offset="0.7" stop-color="#7a7f6c"/><stop offset="1" stop-color="#8d8f74"/>
      </linearGradient>
      <filter id="jpAhBoil1" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="3" result="r"/>
        <feDisplacementMap in="SourceGraphic" in2="r" scale="1.6"/>
      </filter>
      <filter id="jpAhBoil2" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="11" result="r"/>
        <feDisplacementMap in="SourceGraphic" in2="r" scale="1.6"/>
      </filter>
      <filter id="jpAhBoil3" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="27" result="r"/>
        <feDisplacementMap in="SourceGraphic" in2="r" scale="1.6"/>
      </filter>
    </defs>

    <rect class="jp-ah-cielo-sano" x="0" y="0" width="360" height="152" fill="url(#jpAhCieloSano)"/>
    <rect class="jp-ah-cielo-toxico" x="0" y="0" width="360" height="152" fill="url(#jpAhCieloToxico)"/>

    <g class="jp-ah-sol" transform="translate(306 40)">
      <circle class="jp-ah-sol-halo" r="26"/>
      <g class="jp-ah-sol-rayos">${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="-20" x2="0" y2="-26" transform="rotate(${i * 45})"/>`).join('')}</g>
      <circle class="jp-ah-sol-disco" r="15"/>
    </g>

    <path class="jp-ah-montana-lejos" d="M0,112 Q45,60 95,98 Q140,128 190,84 Q245,38 300,92 Q332,118 360,94 L360,152 L0,152 Z"/>
    <ellipse class="jp-ah-niebla" cx="180" cy="116" rx="160" ry="13"/>
    <path class="jp-ah-montana-cerca" d="M0,152 Q40,116 90,134 Q150,152 200,126 Q262,100 320,132 Q345,144 360,138 L360,152 Z"/>

    <g class="jp-ah-nube-blanca" transform="translate(70 26)">
      <g class="jp-ah-nube-blanca-forma">
        <ellipse cx="0" cy="0" rx="21" ry="9"/><ellipse cx="-13" cy="4" rx="12" ry="7"/><ellipse cx="13" cy="4" rx="13" ry="7"/>
      </g>
    </g>
    <g class="jp-ah-nube-blanca nube-blanca-2" transform="translate(196 40) scale(0.65)">
      <g class="jp-ah-nube-blanca-forma">
        <ellipse cx="0" cy="0" rx="21" ry="9"/><ellipse cx="-13" cy="4" rx="12" ry="7"/><ellipse cx="13" cy="4" rx="13" ry="7"/>
      </g>
    </g>

    <g class="jp-ah-frailejon" transform="translate(254 130)">${frailejonSVG()}</g>
    <g class="jp-ah-frailejon" transform="translate(300 138) scale(0.7)">${frailejonSVG()}</g>

    <path class="jp-ah-suelo" d="M0,148 Q60,142 120,146 Q200,153 268,146 Q320,141 360,146 L360,200 L0,200 Z"/>
    <g class="jp-ah-humus">
      <ellipse cx="42" cy="176" rx="3" ry="1.4"/><ellipse cx="88" cy="188" rx="2.4" ry="1.2"/>
      <ellipse cx="150" cy="180" rx="3.2" ry="1.4"/><ellipse cx="205" cy="190" rx="2.6" ry="1.2"/>
      <ellipse cx="252" cy="182" rx="2.2" ry="1"/><ellipse cx="320" cy="190" rx="3" ry="1.3"/>
    </g>
    <g class="jp-ah-grietas">
      <path d="M36,164 l12,7 l-4,9 l13,6"/><path d="M196,172 l14,5 l3,10"/>
      <path d="M92,184 l10,6 l9,-3"/><path d="M290,186 l11,4 l-2,8"/>
    </g>

    <g class="jp-ah-agua" transform="translate(292 166)">
      <path class="jp-ah-agua-cuerpo" d="M-54,0 Q-48,-10 -20,-11 Q10,-13 34,-8 Q54,-4 51,3 Q42,11 8,12 Q-38,12 -54,0 Z"/>
      <path class="jp-ah-onda onda-1" d="M-40,-2 Q-30,-5 -18,-2 Q-6,1 6,-2"/>
      <path class="jp-ah-onda onda-2" d="M-16,4 Q-4,1 8,4 Q20,7 32,4"/>
      <ellipse class="jp-ah-destello" cx="24" cy="-4" rx="7" ry="1.6"/>
      <g class="jp-ah-burbujas">
        <circle class="burbuja-1" cx="-24" cy="2" r="2"/><circle class="burbuja-2" cx="4" cy="4" r="1.5"/><circle class="burbuja-3" cx="26" cy="1" r="1.8"/>
      </g>
    </g>

    ${[[54, 152], [186, 154], [238, 152]].map(([x, y], i) => `<g class="jp-ah-pasto pasto-${i + 1}" transform="translate(${x} ${y})">
      <path d="M0,0 Q-2,-8 -5,-12"/><path d="M2,0 Q3,-10 1,-14"/><path d="M5,0 Q7,-7 10,-11"/>
    </g>`).join('')}

    <g transform="translate(16 172)">
      <g class="jp-ah-lombriz-marco">
        <g class="jp-ah-lombriz-cuerpo" transform="scale(0.38)">${lombrizSVG()}</g>
      </g>
    </g>

    ${[[24, 160], [52, 166], [80, 172], [108, 178]].map(([x, y], i) => `<g transform="translate(${x} ${y})">
      <g class="jp-ah-brote brote-${i + 1}">
        <path class="jp-ah-brote-tallo" d="M0,0 Q0,-4 0,-7"/>
        <path class="jp-ah-brote-hoja" d="M0,-6 C-3,-8 -6,-8 -8,-6 C-6,-4 -2,-4 0,-6 Z"/>
        <path class="jp-ah-brote-hoja" d="M0,-7 C3,-9 6,-9 8,-7 C6,-5 2,-5 0,-7 Z"/>
      </g>
    </g>`).join('')}

    ${[[70, 151], [212, 154], [255, 151]].map(([x, y], i) => `<g transform="translate(${x} ${y})">
      <g class="jp-ah-flor-extra florx-${i + 1}">
        <path class="jp-ah-flor-extra-tallo" d="M0,0 Q0.5,-5 0,-9"/>
        ${[0, 72, 144, 216, 288].map((a) => `<ellipse class="jp-ah-flor-extra-petalo" cx="0" cy="-12" rx="1.8" ry="3" transform="rotate(${a} 0 -9)"/>`).join('')}
        <circle class="jp-ah-flor-extra-centro" cx="0" cy="-9" r="1.6"/>
      </g>
    </g>`).join('')}

    <g class="jp-ah-mata-anclaje" transform="translate(118 149)">
      <ellipse class="jp-ah-mata-sombra" cx="0" cy="1.5" rx="21" ry="3.4"/>
      <g class="jp-ah-mata">
        <path class="jp-ah-tallo" d="M0,0 C-2,-22 2,-40 0,-58"/>
        <g class="jp-ah-hoja-pos" transform="translate(-1 -14)"><g class="jp-ah-hoja hoja-a">${hoja}</g></g>
        <g class="jp-ah-hoja-pos" transform="translate(1 -22) scale(-1 1)"><g class="jp-ah-hoja hoja-b">${hoja}</g></g>
        <g class="jp-ah-hoja-pos" transform="translate(-1 -33) scale(0.85)"><g class="jp-ah-hoja hoja-c">${hoja}</g></g>
        <g class="jp-ah-hoja-pos" transform="translate(1 -41) scale(-0.85 0.85)"><g class="jp-ah-hoja hoja-d">${hoja}</g></g>
        <g class="jp-ah-hoja-pos" transform="translate(-1 -50) scale(0.62)"><g class="jp-ah-hoja hoja-e">${hoja}</g></g>
        <g class="jp-ah-hoja-pos" transform="translate(1 -54) scale(-0.62 0.62)"><g class="jp-ah-hoja hoja-f">${hoja}</g></g>
        <g class="jp-ah-flor" transform="translate(0 -58)">
          <g class="jp-ah-flor-corola">
            ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse class="jp-ah-petalo" cx="0" cy="-8" rx="4" ry="6.5" transform="rotate(${a})"/>`).join('')}
            <circle class="jp-ah-flor-centro" r="4.4"/>
          </g>
        </g>
      </g>
      <g class="jp-ah-petalo-caido caido-1"><ellipse cx="0" cy="-56" rx="4" ry="6.5"/></g>
      <g class="jp-ah-petalo-caido caido-2"><ellipse cx="0" cy="-56" rx="4" ry="6.5"/></g>
      <g class="jp-ah-hoja-caida hcaida-1"><path d="M0,0 C-4,-4 -10,-5 -14,-1 C-11,3 -4,3 0,0 Z"/></g>
      <g class="jp-ah-hoja-caida hcaida-2"><path d="M0,0 C-4,-4 -10,-5 -14,-1 C-11,3 -4,3 0,0 Z"/></g>
    </g>

    <g class="jp-ah-escarabajo-orbita">
      <g class="jp-ah-escarabajo-marco" transform="scale(-0.75 0.75)">${escarabajoSVG()}</g>
    </g>

    <g class="jp-ah-chispas" transform="translate(118 88)">
      ${[[-24, -14, 1], [20, -22, 0.8], [-10, -34, 0.7], [28, 2, 0.9], [-30, 8, 0.65], [8, -44, 0.75]]
    .map(([x, y, s], i) => `<g transform="translate(${x} ${y}) scale(${s})">
        <path class="jp-ah-chispa chispa-${i + 1}" d="M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z"/>
      </g>`).join('')}
    </g>

    <g class="jp-ah-nube" transform="translate(86 34)">
      <g class="jp-ah-nube-cuerpo">
        <ellipse cx="-26" cy="6" rx="20" ry="12"/><ellipse cx="0" cy="0" rx="30" ry="15"/>
        <ellipse cx="26" cy="7" rx="22" ry="12"/><ellipse cx="0" cy="10" rx="34" ry="11"/>
      </g>
      <g class="jp-ah-gotas">
        <g transform="translate(-18 22)"><path class="gota gota-1" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z"/></g>
        <g transform="translate(2 24)"><path class="gota gota-2" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z"/></g>
        <g transform="translate(20 22)"><path class="gota gota-3" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z"/></g>
      </g>
    </g>
    <g class="jp-ah-nube jp-ah-nube-2" transform="translate(250 26) scale(0.75)">
      <g class="jp-ah-nube-cuerpo">
        <ellipse cx="-26" cy="6" rx="20" ry="12"/><ellipse cx="0" cy="0" rx="30" ry="15"/><ellipse cx="26" cy="7" rx="22" ry="12"/>
      </g>
      <g class="jp-ah-gotas">
        <g transform="translate(-12 22)"><path class="gota gota-1" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z"/></g>
        <g transform="translate(14 22)"><path class="gota gota-3" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z"/></g>
      </g>
    </g>

    <g class="jp-ah-abeja-orbita">
      <g class="jp-ah-abeja">
        <g class="jp-ah-angelita" transform="scale(-1.15 1.15)">${angelitaSVG()}</g>
      </g>
      <g class="jp-ah-zzz">
        <text class="z-1" x="8" y="-14">z</text><text class="z-2" x="15" y="-22">z</text><text class="z-3" x="23" y="-30">z</text>
      </g>
    </g>

    <g class="jp-ah-colibri-orbita">
      <g class="jp-ah-colibri-marco" transform="scale(0.8)">${colibriSVG()}</g>
    </g>

    <g class="jp-ah-abeja2-orbita">
      <g class="jp-ah-abeja2">
        <g class="jp-ah-ala ala-izq"><ellipse cx="-2" cy="-9" rx="4.6" ry="7"/></g>
        <g class="jp-ah-ala ala-der"><ellipse cx="3" cy="-8" rx="4" ry="6"/></g>
        <ellipse class="jp-ah-abeja-cuerpo" cx="0" cy="0" rx="8.4" ry="5.8"/>
        <path class="jp-ah-franja" d="M-1,-5.6 C-2.4,-2 -2.4,2 -1,5.6 L2.4,5.4 C1,2 1,-2 2.4,-5.4 Z"/>
        <path class="jp-ah-franja" d="M4.6,-4.6 C3.6,-1.8 3.6,1.8 4.6,4.6 L7.4,3.4 C6.6,1.4 6.6,-1.4 7.4,-3.4 Z"/>
        <circle class="jp-ah-abeja-cabeza" cx="-9.6" cy="-1" r="4.4"/>
        <g class="jp-ah-antenas">
          <path d="M-11.5,-4.5 C-13,-7 -14.5,-8 -15.5,-8.5"/><circle cx="-15.8" cy="-8.8" r="1"/>
          <path d="M-9,-5 C-9.5,-8 -10.5,-9.5 -11,-10.5"/><circle cx="-11.2" cy="-10.9" r="1"/>
        </g>
        <g class="jp-ah-ojos-abiertos">
          <ellipse cx="-11.2" cy="-1.6" rx="1.25" ry="1.8"/><ellipse cx="-8.4" cy="-1.6" rx="1.25" ry="1.8"/>
          <circle class="jp-ah-pupila" cx="-11.4" cy="-1.3" r="0.55"/><circle class="jp-ah-pupila" cx="-8.6" cy="-1.3" r="0.55"/>
          <path class="jp-ah-sonrisa" d="M-11.4,1.6 Q-9.9,2.8 -8.4,1.6"/>
        </g>
        <g class="jp-ah-ojos-cerrados">
          <path d="M-12.3,-1.4 Q-11.2,-0.3 -10.1,-1.4"/><path d="M-9.5,-1.4 Q-8.4,-0.3 -7.3,-1.4"/>
        </g>
        <g class="jp-ah-patitas">
          <path d="M-3,5 q-1,2.5 -2.5,3"/><path d="M1,5.6 q0,2.5 -1,3.2"/><path d="M5,5 q1,2.5 0.5,3.4"/>
        </g>
      </g>
    </g>

    <g class="jp-ah-mariposa-orbita">${maripositaSVG()}</g>
    <g class="jp-ah-mariposa-orbita mariposa-orbita-2"><g transform="scale(0.68)">${maripositaSVG()}</g></g>

    <g class="jp-ah-dione-orbita">
      <g class="jp-ah-dione-marco" transform="scale(0.5)">${dioneSVG()}</g>
    </g>

    <rect class="jp-ah-bruma" x="0" y="0" width="360" height="200"/>
  </svg>`;
}

/* Medidor de vida: 6 hojitas que se apagan una por error. */
const medidorSVG = () => Array.from({ length: MAX_ERRORES }, () => `
  <svg viewBox="0 0 20 20" class="jp-ah-medidor-hoja">
    <path d="M10 18 C10 12 6 10 4 4 C10 5 15 8 15 13 C15 16 13 18 10 18 Z"/>
    <path d="M10 17 C10 13 8 10 6 6" class="jp-ah-medidor-vena"/>
  </svg>`).join('');

/* ══ LA DIRECCIÓN DE ESCENA (actuacionAngelita del /app, verbatim) ══ */
function actuacionAngelita(errores, ganado, perdido) {
  if (ganado) return { pose: 'celebra', animo: 'pleno', energia: 1, sed: false, polen: true, cejas: 'alegres' };
  if (perdido) return { pose: 'reposo', animo: 'descansa', energia: 0.12, sed: false, polen: false, cejas: null };
  if (errores >= 5) return { pose: 'vuela', animo: 'sediento', energia: 0.25, sed: true, polen: false, cejas: 'fruncidas' };
  if (errores >= 4) return { pose: 'vuela', animo: 'sediento', energia: 0.4, sed: true, polen: false, cejas: 'altas' };
  if (errores >= 3) return { pose: 'vuela', animo: 'atento', energia: 0.55, sed: false, polen: false, cejas: 'altas' };
  if (errores >= 2) return { pose: 'vuela', animo: 'sereno', energia: 0.75, sed: false, polen: false, cejas: null };
  return { pose: 'vuela', animo: 'pleno', energia: 1, sed: false, polen: true, cejas: null };
}

const normalizar = (l) => l.toUpperCase();

function elegirPalabra(categoriaId) {
  const banco = (categoriaId === 'mezcla' || !categoriaId)
    ? PALABRAS
    : (PALABRAS_POR_CATEGORIA[categoriaId] || PALABRAS);
  return banco[Math.floor(Math.random() * banco.length)];
}

/* ══ EL JUEGO SOBRE EL VALLE ══ */
export function makeAhorcado() {
  document.body.dataset.juego = 'ahorcado';

  // la hoja de estilos del juego (capa + kit + escena), perezosa como el módulo
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './ahorcado.css';
  document.head.appendChild(link);

  // ── estado (el mismo del componente React) ──
  const qs = new URLSearchParams(location.search);
  const catQS = qs.get('cat');
  const palQS = (qs.get('palabra') || '').toUpperCase();
  const st = {
    categoriaId: (catQS && (catQS === 'mezcla' || CATEGORIAS[catQS])) ? catQS : 'mezcla',
    entrada: null,
    letrasUsadas: [],
    errores: 0,
    pistaVista: false,
  };
  st.entrada = (palQS && PALABRAS.find((p) => p.palabra === palQS)) || elegirPalabra(st.categoriaId);

  // ── el DOM (una vez; los updates solo tocan clases/attrs/textos) ──
  // `marcoCarta` es la señal que el paseo del valle ya respeta («hay una carta
  // abierta: no te lleves la cámara») — el juego ES una carta sobre el valle.
  const capa = document.createElement('div');
  capa.id = 'ahorcadoCapa';
  capa.className = 'marcoCarta';
  capa.innerHTML = `
    <div class="ahPanel" role="dialog" aria-label="Ahorcado Contaminado">
      <header class="ahCabeza">
        <div>
          <h1>Ahorcado Contaminado</h1>
          <p class="ahSub">Adivine la palabra letra por letra. Cada fallo contamina la chagra
          — seis fallos y se apaga. Aprenda a reconocer los venenos del campo, las señales
          del cuerpo y lo que SÍ se usa: los biopreparados.</p>
        </div>
        <div class="ahCtrls"><button type="button" class="ahMute" data-mute aria-label="Silenciar o activar la música">🔊</button><a class="ahVolver" href="./">← Volver al valle</a></div>
      </header>
      <div class="jp-ahorcado" data-testid="ahorcado-contaminado">
        <div class="jp-ah-categorias" role="group" aria-label="Elegir categoría de palabras">
          <button type="button" class="jp-ah-chip" data-cat="mezcla">🎲 Mezcla</button>
          ${Object.values(CATEGORIAS).map((c) => `<button type="button" class="jp-ah-chip" data-cat="${c.id}" title="${c.descripcion.replace(/"/g, '&quot;')}">${c.emoji} ${c.label}</button>`).join('')}
        </div>
        <div class="jp-ah-escena sana" data-testid="escena-contaminacion" aria-live="polite">
          ${escenaSVG()}
          <p class="jp-ah-escena-texto"></p>
          <div class="jp-ah-estado-fila">
            <div class="jp-ah-medidor" aria-hidden="true">${medidorSVG()}</div>
            <p class="jp-ah-intentos" data-testid="contador-intentos"></p>
          </div>
        </div>
        <div class="jp-ah-palabra" data-testid="palabra-oculta"></div>
        <div class="ahPistaFila">
          <span class="ahCatActual"></span>
          <button type="button" class="jp-ah-chip ahBtnPista">💡 Ver pista</button>
        </div>
        <p class="ahPistaCaja" hidden></p>
        <div class="jp-ah-resultado" data-testid="resultado-juego" role="status" hidden></div>
        <div class="jp-ah-teclado" role="group" aria-label="Teclado para adivinar letras">
          ${TECLADO.map((l) => `<button type="button" class="jp-ah-tecla" data-letra="${l}">${l}</button>`).join('')}
        </div>
        <p class="ahTecladoNota">También puede escribir la letra con su teclado.</p>
        <div class="jp-ah-pie">
          <button type="button" class="jp-ah-btn-advertencia" data-testid="abrir-advertencia">⚠ Advertencia toxicológica</button>
        </div>
      </div>
    </div>
    <div class="jp-ah-modal-fondo" data-testid="modal-advertencia" role="dialog" aria-modal="true" aria-labelledby="jpAhModalTitulo" hidden>
      <div class="jp-ah-modal">
        <h3 id="jpAhModalTitulo">⚠ Datos educativos, no diagnóstico</h3>
        <p>Los datos de este juego son <strong>educativos</strong>, no son diagnóstico médico
        ni protocolo de primeros auxilios. Ante una sospecha de intoxicación por agroquímicos:
        retire a la persona de la exposición, quítele la ropa contaminada y llame ya a la
        línea de toxicología.</p>
        <p>En Colombia: <strong>Centro de Información y Asesoría Toxicológica (CIATOX)</strong>
        y línea de urgencias <strong>123</strong>.</p>
        <button type="button" class="jp-ah-btn-otra" data-cerrar-adv>✦ Entendido</button>
      </div>
    </div>`;
  document.body.appendChild(capa);

  // nodos vivos (una consulta, cero re-creación: las órbitas no se reinician)
  const $ = (s) => capa.querySelector(s);
  const el = {
    escena: $('.jp-ah-escena'),
    vivo: $('.jp-ah-vivo'),
    texto: $('.jp-ah-escena-texto'),
    hojas: [...capa.querySelectorAll('.jp-ah-medidor-hoja')],
    intentos: $('.jp-ah-intentos'),
    palabra: $('.jp-ah-palabra'),
    catActual: $('.ahCatActual'),
    pistaFila: $('.ahPistaFila'),
    btnPista: $('.ahBtnPista'),
    pistaCaja: $('.ahPistaCaja'),
    resultado: $('.jp-ah-resultado'),
    teclado: $('.jp-ah-teclado'),
    notaTeclado: $('.ahTecladoNota'),
    chips: [...capa.querySelectorAll('[data-cat]')],
    teclas: [...capa.querySelectorAll('.jp-ah-tecla')],
    modal: $('.jp-ah-modal-fondo'),
    angelita: $('[data-creature="abeja-angelita"]'),
    auraAngelita: $('[data-creature="abeja-angelita"] .ahx-aura'),
    colibri: $('[data-creature="colibri"]'),
    auraColibri: $('[data-creature="colibri"] .ahx-aura'),
  };

  // ── AUDIO · himno chiptune del juego (el sonido que le faltaba) ────────────
  // fondo en loop durante el juego; gana/muerte suenan UNA vez por transición.
  // Arranca al primer gesto (política de autoplay del navegador). Mute persiste.
  const AUDIO = './audio/';
  const nuevoAudio = (f, loop, vol) => {
    const a = new Audio(AUDIO + f); a.loop = loop; a.volume = vol; a.preload = 'auto';
    return a;
  };
  const snd = {
    fondo: nuevoAudio('ahorcado-fondo.mp3', true, 0.4),
    gana: nuevoAudio('ahorcado-gana.mp3', false, 0.85),
    muerte: nuevoAudio('ahorcado-muerte.mp3', false, 0.8),
    muted: localStorage.getItem('ahMute') === '1',
    arrancado: false,
    ctx: null,
  };
  // blips 8-bit sintetizados (WebAudio, sin archivos): acierto brillante, error buzz
  function blip(freq, dur, tipo) {
    if (snd.muted) return;
    try {
      snd.ctx = snd.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = snd.ctx.createOscillator(), g = snd.ctx.createGain();
      o.type = tipo; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, snd.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.16, snd.ctx.currentTime + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, snd.ctx.currentTime + dur);
      o.connect(g); g.connect(snd.ctx.destination);
      o.start(); o.stop(snd.ctx.currentTime + dur);
    } catch { /* headless / sin audio: no suena, no rompe */ }
  }
  function arrancarFondo() {
    if (snd.arrancado || snd.muted) return;
    snd.arrancado = true;
    snd.fondo.play().catch(() => { snd.arrancado = false; }); // reintenta al próximo gesto
  }
  function aplicarMute() {
    snd.fondo.muted = snd.gana.muted = snd.muerte.muted = snd.muted;
    const b = capa.querySelector('[data-mute]');
    if (b) b.textContent = snd.muted ? '🔇' : '🔊';
    if (snd.muted) snd.fondo.pause();
  }
  function sacudir() {
    el.escena.classList.remove('ah-sacude'); void el.escena.offsetWidth; el.escena.classList.add('ah-sacude');
    capa.classList.remove('ah-flash'); void capa.offsetWidth; capa.classList.add('ah-flash');
  }

  const letrasUnicas = () => new Set(
    st.entrada.palabra.replace(/[^A-ZÑ]/gi, '').split('').map(normalizar),
  );

  function dirigir(quien, aura, base, act) {
    quien.dataset.pose = act.pose;
    quien.dataset.animo = act.animo;
    if (act.sed) quien.dataset.sed = '1'; else delete quien.dataset.sed;
    if (act.polen) quien.dataset.polen = '1'; else delete quien.dataset.polen;
    if (act.cejas) quien.dataset.cejas = act.cejas; else delete quien.dataset.cejas;
    aura.setAttribute('r', (base + 1.2 * act.energia).toFixed(2));
    aura.setAttribute('opacity', Math.max(0.16, Math.min(0.5, 0.2 + 0.3 * act.energia)).toFixed(2));
  }

  function render() {
    const unicas = letrasUnicas();
    const ganado = [...unicas].every((l) => st.letrasUsadas.includes(l));
    const perdido = st.errores >= MAX_ERRORES;
    const terminado = ganado || perdido;

    // audio: gana/muerte suenan UNA sola vez al terminar; el fondo se apaga
    if (terminado && !st.sonado) {
      st.sonado = true;
      snd.fondo.pause();
      const cue = ganado ? snd.gana : snd.muerte;
      if (!snd.muted) { cue.currentTime = 0; cue.play().catch(() => {}); }
      if (perdido) { capa.classList.add('ah-muerte-glitch'); setTimeout(() => capa.classList.remove('ah-muerte-glitch'), 820); }
    }

    const etapa = ETAPAS[Math.min(st.errores, MAX_ERRORES)];

    // escena: clases acumuladas p1..pN + gano/perdio (el CSS hace el resto)
    const pasos = Array.from({ length: Math.min(st.errores, MAX_ERRORES) }, (_, i) => `p${i + 1}`).join(' ');
    el.vivo.setAttribute('class', `jp-ah-vivo ${pasos} ${ganado ? 'gano' : perdido ? 'perdio' : ''}`.trim());
    el.escena.className = `jp-ah-escena ${etapa.clase}${ganado ? ' escena-gano' : ''}`;
    el.texto.textContent = ganado ? '¡La chagra revivió y está floreciendo!' : etapa.texto;
    el.hojas.forEach((h, i) => h.classList.toggle('apagada', i < st.errores));
    el.intentos.textContent = `Intentos: ${st.errores} / ${MAX_ERRORES}`;

    // la dirección de las creatures (los props de React, como data-attrs)
    const act = actuacionAngelita(st.errores, ganado, perdido);
    dirigir(el.angelita, el.auraAngelita, 5.4, act);
    dirigir(el.colibri, el.auraColibri, 5.2, { ...act, sed: false, polen: false, cejas: null });

    // palabra oculta
    el.palabra.setAttribute('aria-label', `Palabra con ${unicas.size} letras distintas`);
    el.palabra.innerHTML = st.entrada.palabra.split('').map((c) => {
      if (c === ' ') return '<span class="jp-ah-espacio" aria-hidden="true"></span>';
      const visible = terminado || st.letrasUsadas.includes(normalizar(c));
      return `<span class="jp-ah-letra-casillero">${visible ? normalizar(c) : ''}</span>`;
    }).join('');

    // contexto instruccional: la categoría de la palabra EN JUEGO + pista libre
    const cat = CATEGORIAS[st.entrada.categoria];
    el.catActual.textContent = cat ? `Categoría: ${cat.emoji} ${cat.label}` : '';
    el.pistaFila.hidden = terminado;
    el.pistaCaja.hidden = !(st.pistaVista && !terminado);
    if (st.pistaVista) el.pistaCaja.textContent = st.entrada.pista;

    // resultado educativo (gane o pierda, el dato SIEMPRE se revela)
    if (terminado) {
      const fuente = FUENTES[st.entrada.fuenteId];
      el.resultado.className = `jp-ah-resultado ${ganado ? 'gano' : 'perdio'}`;
      el.resultado.hidden = false;
      el.resultado.innerHTML = `
        <p class="jp-ah-resultado-titulo">${ganado ? '¡La finca se salvó! Adivinó la palabra.' : 'Esta vez la finca se contaminó.'}</p>
        <p class="jp-ah-resultado-palabra">La palabra era: <strong>${st.entrada.palabra}</strong></p>
        <p class="jp-ah-resultado-pista" data-testid="pista-educativa">${st.entrada.pista}</p>
        ${fuente ? `<p class="jp-ah-resultado-fuente" data-testid="fuente-dato">Fuente: ${fuente.label}</p>` : ''}
        <button type="button" class="jp-ah-btn-otra" data-otra data-testid="jugar-otra-vez">↺ Jugar otra palabra</button>`;
    } else {
      el.resultado.hidden = true;
      el.resultado.innerHTML = '';
    }

    // teclado (se oculta al terminar, como en el /app)
    el.teclado.hidden = terminado;
    el.notaTeclado.hidden = terminado;
    el.teclas.forEach((b) => {
      const letra = b.dataset.letra;
      const usada = st.letrasUsadas.includes(letra);
      const acierto = usada && unicas.has(letra);
      const fallo = usada && !unicas.has(letra);
      b.disabled = usada;
      b.setAttribute('aria-pressed', String(usada));
      b.className = `jp-ah-tecla${acierto ? ' acierto' : ''}${fallo ? ' fallo' : ''}`;
    });

    // chips de categoría
    el.chips.forEach((c) => c.classList.toggle('activo', c.dataset.cat === st.categoriaId));
  }

  function jugarLetra(letraCruda) {
    const unicas = letrasUnicas();
    const ganado = [...unicas].every((l) => st.letrasUsadas.includes(l));
    if (ganado || st.errores >= MAX_ERRORES) return;
    const letra = normalizar(letraCruda);
    if (!TECLADO.includes(letra) || st.letrasUsadas.includes(letra)) return;
    arrancarFondo();
    st.letrasUsadas.push(letra);
    if (!unicas.has(letra)) {
      st.errores = Math.min(st.errores + 1, MAX_ERRORES);
      blip(104, 0.17, 'sawtooth'); // error: buzz grave, contamina
      sacudir();
    } else {
      blip(660, 0.08, 'square'); // acierto: blip brillante 8-bit
    }
    render();
  }

  function nuevaPalabra(nuevaCategoria) {
    const cat = nuevaCategoria ?? st.categoriaId;
    st.categoriaId = cat;
    st.entrada = elegirPalabra(cat);
    st.letrasUsadas = [];
    st.errores = 0;
    st.pistaVista = false;
    st.sonado = false;
    snd.gana.pause(); snd.muerte.pause();
    if (!snd.muted) { snd.arrancado = false; arrancarFondo(); }
    render();
  }

  // ── eventos (delegación: el DOM no se re-crea) ──
  capa.addEventListener('click', (e) => {
    arrancarFondo(); // primer gesto: arranca la música de fondo
    if (e.target.closest('[data-mute]')) {
      snd.muted = !snd.muted;
      localStorage.setItem('ahMute', snd.muted ? '1' : '0');
      aplicarMute();
      if (!snd.muted) { snd.arrancado = false; arrancarFondo(); }
      return;
    }
    const chip = e.target.closest('[data-cat]');
    if (chip) { nuevaPalabra(chip.dataset.cat); return; }
    const tecla = e.target.closest('.jp-ah-tecla');
    if (tecla && !tecla.disabled) { jugarLetra(tecla.dataset.letra); return; }
    if (e.target.closest('[data-otra]')) { nuevaPalabra(); return; }
    if (e.target.closest('.ahBtnPista')) { st.pistaVista = true; render(); return; }
    if (e.target.closest('[data-testid="abrir-advertencia"]')) { el.modal.hidden = false; return; }
    if (e.target.closest('[data-cerrar-adv]')) { el.modal.hidden = true; }
  });
  // el teclado físico también juega (la niña en el computador de la escuela)
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && !el.modal.hidden) { el.modal.hidden = true; return; }
    if (e.key.length === 1) jugarLetra(e.key);
  });

  render();
  aplicarMute();
  arrancarFondo(); // intento inicial (si hubo gesto al navegar); si no, arranca al primer click/tecla

  // hook determinista del gate visual (jugar por consola/harness)
  window.__ahorcado = {
    jugar: jugarLetra,
    nueva: nuevaPalabra,
    pista: () => { st.pistaVista = true; render(); },
    estado: () => ({
      palabra: st.entrada.palabra,
      categoria: st.entrada.categoria,
      letrasUsadas: [...st.letrasUsadas],
      errores: st.errores,
    }),
  };
  return { jugarLetra, nuevaPalabra };
}

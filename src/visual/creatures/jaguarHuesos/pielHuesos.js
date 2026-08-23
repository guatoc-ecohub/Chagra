/*
 * pielHuesos — EL JAGUAR DEFINITIVO: la lámina linda, PERO EN VECTOR CON HUESOS.
 *
 * QUÉ ES. La piel realista de `public/compai/laminas/jaguar-natural.png`
 * (Humboldt/Gemini, 705×394) REDIBUJADA a paths SVG en el MISMO espacio de
 * coordenadas de la lámina (los pivotes medidos de `jaguarLamina/anatomia.js`
 * siguen valiendo), y agrupada por HUESO en `<g>` anidados con jerarquía real:
 *
 *   raíz → columna (tronco)
 *            ├── cuello → cabezaGiro → cabeza → { mandíbula, orejas, párpados }
 *            ├── pataDelCerca / pataDelLejos   (hombro → antebrazo → zarpa)
 *            ├── pataTrasCerca / pataTrasLejos (muslo → canilla → zarpa)
 *            └── colaBase → colaMedia → colaPunta
 *
 * POR QUÉ EXISTE (la decapitación). `JaguarLaminaViva` corta el PNG en capas
 * raster: al rotar la capa-cabeza el borde recortado del cuello se separa del
 * cuerpo (la costura infame). Aquí la piel es VECTOR DIBUJADO POR HUESO: cada
 * articulación lleva un CASQUETE REDONDO pintado en el hueso PADRE, centrado
 * exactamente en el pivote del hijo. Al rotar el hijo, el casquete circular
 * queda siempre debajo — la costura es geométricamente imposible (el mismo
 * truco de los hombros de goma del cut-out clásico / Cuphead).
 *
 * CÓMO SE DIBUJÓ (método, honesto): las formas se calzaron contra la lámina
 * con un CALCO en vivo (vista `?vista=calco` del arnés `jaguar-demo.html`:
 * el vector al 55% de opacidad ENCIMA del PNG, mismo espacio 705×394) y se
 * iteró con capturas GPU headed hasta cerrar silueta, proporción y color.
 *
 * BONUS DEL VECTOR (lo que el raster no podía): fauces REALES — interior de
 * boca, lengua y colmillos dibujados DETRÁS de la mandíbula; al abrir, hay
 * boca de verdad (la lámina era un retrato de boca cerrada).
 *
 * REGISTRO. Piel = REALISTA (sin ojos de goma, sin chapetas, sin contorno de
 * tinta uniforme: el "contorno" es pelaje oscuro). MOVIMIENTO = rubber-hose
 * (huesos reales, piel dibujada): las curvas y relojes canónicos viven en
 * `jaguarHuesos.css`, suaves en modo normal (70%) y a fondo en modo actuando
 * (30%, Miss Minutes). Spec: `rubberhoseSpec.js` + memoria compai 70/30.
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three).
 * Lo consumen el componente React (`JaguarHuesos.jsx`), cualquier host HTML
 * plano (kart, demos) y el valle 3D (billboard <Html>): UN solo asset.
 */

import {
  RH_LINE_BOIL,
} from '../rubberhoseSpec.js';

/* Paleta: la de la IDENTIDAD canónica (jaguarIdentidad.JAGUAR_PALETA coincide
   con la lámina en flanco/vientre/roseta/iris) + los tonos MEDIDOS sobre la
   lámina que la identidad cartoon no tenía (el dorso castaño, la luz dorada
   del flanco). No se importa jaguarIdentidad.js aquí porque ese módulo
   re-exporta desde `_rubberhose.jsx` (JSX) y esta piel debe poder cargarse en
   un host sin JSX; los hex compartidos citan su token. */
export const JH_PALETA = Object.freeze({
  dorso: '#8a5528',        // castaño del lomo (MEDIDO px 300,80 ≈ #7a4726, entibiado)
  dorsoAlto: '#6a3d1c',    // la cresta dorsal en penumbra cálida
  cuerpo: '#d8923a',       // = JAGUAR_PALETA.cuerpo (pelaje leonado medio)
  cuerpoLuz: '#e6a952',    // = JAGUAR_PALETA.cuerpoLuz entibiado a lámina
  flancoLuz: '#ecba70',    // luz dorada del flanco bajo (MEDIDO 350,150 ≈ #e2a472)
  vientre: '#f2e2bc',      // = JAGUAR_PALETA.vientre apenas más dorado
  blancoPelaje: '#faf3e4', // morro/pecho/mejillas (el "blanco" del grabado, no #fff)
  roseta: '#1c1207',       // anillo de roseta (MEDIDO 250,180 ≈ #1c0700)
  rosetaCentro: '#b0742a', // = JAGUAR_PALETA.rosetaCentro aclarado al tono lámina
  contorno: '#2e1a0a',     // pelaje oscuro de borde (NO tinta uniforme: registro realista)
  oreja: '#4a2c12',        // dorso de oreja (JAGUAR_PALETA.oreja oscurecido a lámina)
  orejaInterior: '#e8c99a',
  iris: '#f2a91c',         // ámbar encendido (lámina: ojos que brillan)
  irisLuz: '#ffe9a8',
  irisSombra: '#b06a10',
  pupila: '#160c04',
  trufa: '#2a150c',        // = JAGUAR_PALETA.nariz afinado
  boca: '#4a1510',         // interior de fauces (vector: ahora SÍ hay boca real)
  lengua: '#c05548',
  colmillo: '#fff8ec',     // = JAGUAR_PALETA.colmillo
  vibrisa: '#f7edd8',      // = JAGUAR_PALETA.vibrisa
  sombraSuelo: 'rgba(36,22,8,0.38)', // = JAGUAR_PALETA.sombraSuelo (peso real)
  espectral: '#b98cff',    // = JAGUAR_PALETA.espectral (halo del modo actuando)
  ojoBrillo: '#ffe6a0',    // = JAGUAR_PALETA.ojoBrillo
});

/* ── LOS PIVOTES DEL ESQUELETO (px del espacio 705×394 de la lámina) ─────────
   Derivados de la anatomía MEDIDA (`jaguarLamina/anatomia.js`) y refinados
   contra el calco a articulación real. El CSS los consume vía
   transform-origin en unidades del viewBox. */
export const JH_HUESOS = Object.freeze({
  columna: [360, 150],
  cuello: [228, 200],       // base del cuello sobre la cruz/pecho
  cabeza: [150, 140],       // atlas: donde el cráneo articula con el cuello
  mandibula: [88, 152],     // charnela (comisura)
  orejaI: [30, 62],
  orejaD: [132, 60],
  pataDelCerca: [232, 225], // hombro
  codoDelCerca: [238, 300],
  pataDelLejos: [185, 220],
  codoDelLejos: [172, 295],
  pataTrasCerca: [520, 228], // cadera
  rodillaTrasCerca: [560, 300],
  pataTrasLejos: [485, 225],
  rodillaTrasLejos: [432, 285],
  colaBase: [552, 110],
  colaMedia: [628, 188],
  colaPunta: [663, 266],
});

/* Casquetes articulares: [cx, cy, r] — pintados en el hueso PADRE bajo el
   pivote del HIJO (la garantía anti-costura). */
const CASQUETES = {
  cabeza: [150, 140, 40],       // en el cuello, bajo el cráneo
  cuello: [228, 200, 38],       // en el tronco, bajo el cuello
  cola: [552, 112, 14],
};

const P = JH_PALETA;

/* ───────────────────────── helpers de dibujo (strings) ───────────────────── */

/** Roseta jaguar REALISTA (la de la lámina): anillo ROTO hecho de BLOBS
    gruesos e irregulares (no trazo punteado) alrededor de un centro ocre más
    oscuro que el pelaje, con manchita interior — la regla anti-leopardo. */
const ROSETA_VARIANTES = [
  // [ángulo°, escalaBlob] — el hueco del anillo es la ausencia de un blob
  [[12, 1.15], [72, 0.95], [138, 1.2], [206, 1.0], [268, 1.1], [330, 0.9]],
  [[0, 1.1], [58, 0.9], [124, 1.15], [250, 1.05], [310, 0.95]],
  [[30, 1.0], [108, 0.9], [212, 1.0], [300, 0.85]],
];
function roseta(x, y, s = 1, rot = 0, variante = 0) {
  const v = ROSETA_VARIANTES[variante] || ROSETA_VARIANTES[0];
  const R1 = variante === 2 ? 8.2 : 10.5;   // radio del anillo (x)
  const R2 = variante === 2 ? 6.4 : 8.4;    // radio del anillo (y)
  const blobs = v.map(([a, k], i) => {
    const rad = (a * Math.PI) / 180;
    const bx = (Math.cos(rad) * R1).toFixed(1);
    const by = (Math.sin(rad) * R2).toFixed(1);
    const brx = ((variante === 2 ? 3.6 : 4.6) * k).toFixed(1);
    const bry = ((variante === 2 ? 2.4 : 3.0) * k).toFixed(1);
    const tang = (a + 90 + (i % 2 ? 14 : -10)).toFixed(0);
    return `<ellipse cx="${bx}" cy="${by}" rx="${brx}" ry="${bry}" transform="rotate(${tang} ${bx} ${by})" fill="${P.roseta}"/>`;
  }).join('');
  return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">` +
    `<ellipse rx="${R1 - 2.2}" ry="${R2 - 1.8}" fill="#a2621f" opacity=".55"/>` +
    blobs +
    `<ellipse cx="-1.8" cy="1.2" rx="2.1" ry="1.6" transform="rotate(-18 -1.8 1.2)" fill="${P.roseta}"/>` +
    (variante !== 2 ? `<ellipse cx="2.6" cy="-1.6" rx="1.8" ry="1.4" transform="rotate(22 2.6 -1.6)" fill="${P.roseta}"/>` : '') +
    `</g>`;
}

/** Mota sólida irregular (patas, cabeza, cuello — manchas sin centro). */
function mota(x, y, r = 3.4, sq = 0.82, rot = 0) {
  return `<ellipse transform="translate(${x},${y}) rotate(${rot})" rx="${r}" ry="${r * sq}" fill="${P.roseta}"/>`;
}

/** Tanda de motas [x,y,r,(rot)] compacta. */
function motas(lista) {
  return lista.map(([x, y, r, rot = 0]) => mota(x, y, r, 0.8, rot)).join('');
}

/** Pata: DOS segmentos + zarpa, cada uno su hueso, articulados con casquete.
    `lejos`: la pata del otro lado (penumbra, sin blancos). */
function pata({ clase, hombro, codo, zarpa, anchoAlto, anchoBajo, spots, spotsBajos, lejos = false, curvaAlta = 0.3 }) {
  const [hx, hy] = hombro; const [cx, cy] = codo; const [zx, zy] = zarpa;
  const grad = lejos ? 'url(#jhPelajeLejos)' : 'url(#jhPelajePata)';
  const borde = P.contorno;
  const wA = anchoAlto; const wB = anchoBajo;
  const og = (x, y) => ` style="transform-origin:${x}px ${y}px"`;
  const dAlto = `M${hx},${hy} C ${hx + (cx - hx) * curvaAlta},${hy + (cy - hy) * 0.42} ${cx - (cx - hx) * 0.12},${cy - (cy - hy) * 0.3} ${cx},${cy}`;
  const dBajo = `M${cx},${cy} C ${cx + (zx - cx) * 0.25},${cy + (zy - cy) * 0.5} ${zx},${zy - (zy - cy) * 0.28} ${zx},${zy}`;
  // Zarpa felina: proyecta HACIA ADELANTE (−x, el jaguar mira a la izquierda),
  // con tres dedos definidos y talón — pálida como la lámina.
  const dZarpa =
    `M${zx - wB * 1.3},${zy + 5} ` +
    `Q ${zx - wB * 1.45},${zy + 13} ${zx - wB * 1.02},${zy + 16.5} ` +
    `Q ${zx - wB * 0.4},${zy + 19.5} ${zx + wB * 0.32},${zy + 18.5} ` +
    `Q ${zx + wB * 0.95},${zy + 16.5} ${zx + wB * 0.9},${zy + 7} ` +
    `Q ${zx + wB * 0.82},${zy - 3} ${zx + wB * 0.3},${zy - 6.5} ` +
    `Q ${zx - wB * 0.45},${zy - 9} ${zx - wB * 0.9},${zy - 2.5} ` +
    `Q ${zx - wB * 1.22},${zy + 0.5} ${zx - wB * 1.3},${zy + 5} Z`;
  return (
    `<g class="jh-hueso ${clase}"${og(hx, hy)}>` +
      `<path d="${dAlto}" fill="none" stroke="${borde}" stroke-width="${wA + 5}" stroke-linecap="round"/>` +
      `<path d="${dAlto}" fill="none" stroke="${grad}" stroke-width="${wA}" stroke-linecap="round"/>` +
      (spots ? `<g${lejos ? ' opacity=".85"' : ''}>${spots}</g>` : '') +
      `<g class="jh-hueso ${clase}Bajo"${og(cx, cy)}>` +
        `<circle cx="${cx}" cy="${cy}" r="${wA * 0.5}" fill="${grad}"/>` +
        `<path d="${dBajo}" fill="none" stroke="${borde}" stroke-width="${wB + 4.5}" stroke-linecap="round"/>` +
        `<path d="${dBajo}" fill="none" stroke="${grad}" stroke-width="${wB}" stroke-linecap="round"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${wB * 0.52}" fill="${grad}"/>` + /* tapa la costura del borde en la articulación */
        (spotsBajos ? `<g${lejos ? ' opacity=".85"' : ''}>${spotsBajos}</g>` : '') +
        `<g class="jh-hueso ${clase}Zarpa"${og(zx, zy - 4)}>` +
          `<path d="${dZarpa}" fill="${lejos ? 'url(#jhPelajeLejos)' : '#ecdfbe'}" stroke="${borde}" stroke-width="3.2"/>` +
          `<path d="M${zx - wB * 0.85},${zy + 6} Q ${zx - wB * 0.82},${zy + 12} ${zx - wB * 0.78},${zy + 16} M${zx - wB * 0.3},${zy + 8} Q ${zx - wB * 0.28},${zy + 13} ${zx - wB * 0.26},${zy + 18} M${zx + wB * 0.25},${zy + 8} Q ${zx + wB * 0.28},${zy + 13} ${zx + wB * 0.3},${zy + 17}"` +
            ` stroke="${P.contorno}" stroke-width="1.9" opacity=".6" fill="none" stroke-linecap="round"/>` +
          (lejos ? '' : `<g>${motas([[zx - wB * 0.75, zy - 1, 2], [zx - wB * 0.1, zy - 4, 1.9], [zx + wB * 0.5, zy - 1, 1.8], [zx + wB * 0.1, zy + 3, 1.6]])}</g>`) +
        `</g>` +
      `</g>` +
    `</g>`
  );
}

/* ═══════════════════════════ LA PIEL, HUESO A HUESO ════════════════════════ */

const DEFS = `<defs>
  <linearGradient id="jhPelaje" x1="0" y1="45" x2="0" y2="245" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#5a3212"/>
    <stop offset=".1" stop-color="#7a481c"/>
    <stop offset=".25" stop-color="#aa6318"/>
    <stop offset=".45" stop-color="#c8781f"/>
    <stop offset=".64" stop-color="#d68f2c"/>
    <stop offset=".8" stop-color="#dfa64c"/>
    <stop offset=".92" stop-color="#eccfa0"/>
    <stop offset="1" stop-color="#f4ead2"/>
  </linearGradient>
  <linearGradient id="jhPelajePata" x1="0" y1="215" x2="0" y2="392" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#c17a29"/>
    <stop offset=".5" stop-color="#d3943c"/>
    <stop offset="1" stop-color="#e9cb92"/>
  </linearGradient>
  <linearGradient id="jhPelajeLejos" x1="0" y1="205" x2="0" y2="365" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7e5222"/>
    <stop offset=".55" stop-color="#8f6028"/>
    <stop offset="1" stop-color="#a5793c"/>
  </linearGradient>
  <linearGradient id="jhCuelloGrad" x1="0" y1="55" x2="0" y2="265" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7a481c"/>
    <stop offset=".3" stop-color="#bc7826"/>
    <stop offset=".68" stop-color="#d59a42"/>
    <stop offset="1" stop-color="#ecd0a2"/>
  </linearGradient>
  <radialGradient id="jhCara" cx="86" cy="92" r="115" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#d69838"/>
    <stop offset=".38" stop-color="#c07b24"/>
    <stop offset=".68" stop-color="#9d611d"/>
    <stop offset=".88" stop-color="#7a4a18"/>
    <stop offset="1" stop-color="#5c3811"/>
  </radialGradient>
  <radialGradient id="jhIris" cx=".5" cy=".42" r=".7">
    <stop offset="0" stop-color="#fff9dc"/>
    <stop offset=".3" stop-color="#ffe291"/>
    <stop offset=".58" stop-color="#ffb42a"/>
    <stop offset=".85" stop-color="#e08a0c"/>
    <stop offset="1" stop-color="#7e4a06"/>
  </radialGradient>
  <radialGradient id="jhTrufa" cx=".5" cy=".3" r=".8">
    <stop offset="0" stop-color="#8a5240"/>
    <stop offset=".6" stop-color="#673628"/>
    <stop offset="1" stop-color="#40201a"/>
  </radialGradient>
  <linearGradient id="jhCola" x1="545" y1="105" x2="700" y2="270" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#c07a28"/>
    <stop offset=".5" stop-color="#d3943a"/>
    <stop offset=".78" stop-color="#e6c48c"/>
    <stop offset="1" stop-color="#efdebc"/>
  </linearGradient>
  <radialGradient id="jhAura" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.espectral}" stop-opacity=".38"/>
    <stop offset="1" stop-color="${P.espectral}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="jhOjoHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffdf8a" stop-opacity=".95"/>
    <stop offset=".45" stop-color="#ffc95e" stop-opacity=".5"/>
    <stop offset="1" stop-color="${P.ojoBrillo}" stop-opacity="0"/>
  </radialGradient>
  <filter id="jhBlur"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="jhBoilSuave" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="9" result="gr"/>
    <feColorMatrix in="gr" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.09  0 0 0 0 0.04  0.85 0 0 0 -0.2" result="grano"/>
    <feComposite in="grano" in2="disp" operator="in" result="granoIn"/>
    <feMerge><feMergeNode in="disp"/><feMergeNode in="granoIn"/></feMerge>
  </filter>
  <filter id="jhBoil" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${RH_LINE_BOIL.scale}" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="9" result="gr"/>
    <feColorMatrix in="gr" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.09  0 0 0 0 0.04  0.85 0 0 0 -0.2" result="grano"/>
    <feComposite in="grano" in2="disp" operator="in" result="granoIn"/>
    <feMerge><feMergeNode in="disp"/><feMergeNode in="granoIn"/></feMerge>
  </filter>
</defs>`;

/* ── COLA: tres huesos encadenados. Nace en la grupa alta, cae pegada al
      muslo, y el último tramo hace el CURL clásico de la lámina ── */
const COLA = (() => {
  const seg1 = 'M552,106 C 588,122 614,152 630,190';
  const seg2 = 'M628,186 C 640,216 650,246 663,266';
  const seg3 = 'M661,264 C 672,282 688,286 695,270 C 701,256 698,236 688,224';
  return `<g class="jh-hueso jh-colaBase" style="transform-origin:552px 110px">
    <path d="${seg1}" fill="none" stroke="${P.contorno}" stroke-width="31" stroke-linecap="round"/>
    <path d="${seg1}" fill="none" stroke="url(#jhCola)" stroke-width="25" stroke-linecap="round"/>
    ${motas([[570, 126, 4.6], [592, 144, 4.4], [612, 166, 4.4]])}
    <g class="jh-hueso jh-colaMedia" style="transform-origin:628px 188px">
      <circle cx="628" cy="188" r="11" fill="url(#jhCola)"/>
      <path d="${seg2}" fill="none" stroke="${P.contorno}" stroke-width="27" stroke-linecap="round"/>
      <path d="${seg2}" fill="none" stroke="url(#jhCola)" stroke-width="21.5" stroke-linecap="round"/>
      <path d="${seg2}" fill="none" stroke="${P.roseta}" stroke-width="22" stroke-linecap="butt" stroke-dasharray="9 13" stroke-dashoffset="-4" opacity=".92"/>
      <path d="${seg2}" fill="none" stroke="url(#jhCola)" stroke-width="8" stroke-linecap="butt" stroke-dasharray="3 19" stroke-dashoffset="-1" opacity=".8"/>
      <g class="jh-hueso jh-colaPunta" style="transform-origin:663px 266px">
        <circle cx="663" cy="266" r="9" fill="#ead9b4"/>
        <path d="${seg3}" fill="none" stroke="${P.contorno}" stroke-width="23" stroke-linecap="round"/>
        <path d="${seg3}" fill="none" stroke="#ead9b4" stroke-width="17.5" stroke-linecap="round"/>
        <path d="${seg3}" fill="none" stroke="${P.roseta}" stroke-width="18" stroke-linecap="butt" stroke-dasharray="8 9" opacity=".95"/>
        <path d="${seg3}" fill="none" stroke="#ead9b4" stroke-width="7" stroke-linecap="butt" stroke-dasharray="2.5 14.5" stroke-dashoffset="-1.5" opacity=".7"/>
        <path d="M694,250 C 699,240 697,230 689,224" fill="none" stroke="${P.roseta}" stroke-width="16" stroke-linecap="round"/>
        <circle cx="686" cy="222" r="5.5" fill="#ead9b4"/>
      </g>
    </g>
  </g>`;
})();

/* ── TRONCO: la masa del cuerpo (piel del hueso columna), calzada al calco ── */
const TRONCO_PATH =
  'M248,58 C 300,44 380,42 452,56 C 502,64 540,74 560,88 ' +    // lomo (sube a la grupa)
  'C 586,102 598,128 598,156 C 596,186 584,210 566,222 ' +      // grupa→borde trasero
  'C 550,234 530,240 508,241 C 460,243 400,240 340,238 ' +      // vientre
  'C 310,238 285,243 270,250 C 252,240 240,214 236,180 ' +      // ijar→pecho lateral
  'C 232,144 236,96 248,58 Z';

const TRONCO = `
  <path d="${TRONCO_PATH}" fill="url(#jhPelaje)" stroke="${P.contorno}" stroke-width="3.2"/>
  <path d="M248,58 C 300,44 380,42 452,56 C 496,63 534,72 554,84 C 500,68 420,60 350,64 C 308,66 272,70 250,76 Z"
    fill="${P.dorsoAlto}" opacity=".5"/>
  <!-- luz de borde sobre el lomo (el sol de la lámina pega arriba) -->
  <path d="M254,60 C 310,46 388,44 452,56 C 494,63 528,72 550,84" fill="none"
    stroke="#f0c06a" stroke-width="3" stroke-linecap="round" opacity=".45"/>
  <!-- VIENTRE crema: banda real, no un pelito -->
  <path d="M268,248 C 300,240 360,236 430,238 C 470,239 500,239 516,237 C 502,246 462,250 420,250 C 360,249 304,250 274,252 Z"
    fill="${P.vientre}"/>
  <g fill="none" stroke="${P.contorno}" stroke-width="2" opacity=".16" stroke-linecap="round">
    <path d="M262,120 C 272,160 276,196 272,226"/>
    <path d="M520,104 C 534,144 538,186 528,220"/>
    <path d="M316,88 C 312,132 314,184 322,228"/>
    <path d="M430,80 C 428,130 430,185 436,232"/>
  </g>
  <!-- cresta dorsal: blotches alargados que rompen la línea del lomo -->
  <g fill="${P.roseta}">
    <ellipse cx="278" cy="60" rx="9" ry="3.2" transform="rotate(-10 278 60)"/>
    <ellipse cx="322" cy="52" rx="10.5" ry="3.6" transform="rotate(-5 322 52)"/>
    <ellipse cx="372" cy="48" rx="11.5" ry="3.8" transform="rotate(-1 372 48)"/>
    <ellipse cx="424" cy="52" rx="10.5" ry="3.6" transform="rotate(4 424 52)"/>
    <ellipse cx="474" cy="60" rx="10" ry="3.4" transform="rotate(9 474 60)"/>
    <ellipse cx="520" cy="72" rx="9" ry="3.2" transform="rotate(18 520 72)"/>
    <ellipse cx="556" cy="92" rx="8" ry="3" transform="rotate(32 556 92)"/>
  </g>
  <!-- ROSETAS (anillo roto + centro: la firma anti-leopardo) — densas como la
       lámina: tres filas que siguen la curva del lomo + hombro + grupa -->
  ${roseta(276, 92, 1.2, 14, 0)}${roseta(322, 82, 1.32, -8, 1)}${roseta(370, 78, 1.4, 3, 0)}
  ${roseta(420, 82, 1.32, 12, 1)}${roseta(468, 92, 1.2, 22, 0)}${roseta(514, 106, 1.1, 34, 1)}
  ${roseta(258, 132, 1.1, -18, 1)}${roseta(302, 124, 1.3, 6, 0)}${roseta(350, 120, 1.42, -5, 1)}
  ${roseta(400, 122, 1.38, 8, 0)}${roseta(448, 130, 1.25, 16, 1)}${roseta(496, 142, 1.1, 28, 2)}
  ${roseta(542, 128, 0.98, 40, 2)}${roseta(560, 160, 0.92, 60, 2)}
  ${roseta(282, 170, 1.15, -12, 0)}${roseta(330, 172, 1.3, 4, 1)}${roseta(380, 172, 1.34, -6, 0)}
  ${roseta(428, 176, 1.22, 10, 1)}${roseta(474, 182, 1.08, 20, 2)}${roseta(520, 192, 0.95, 36, 2)}
  ${roseta(300, 212, 0.9, -8, 2)}${roseta(348, 216, 0.95, 5, 2)}${roseta(396, 218, 0.9, -5, 2)}
  ${roseta(444, 220, 0.85, 8, 2)}${roseta(488, 220, 0.8, 15, 2)}
  ${roseta(262, 110, 0.75, 22, 2)}${roseta(266, 152, 0.7, -14, 2)}${roseta(262, 214, 0.65, 10, 2)}
  ${motas([[254, 100, 3.8], [252, 160, 3.6], [300, 148, 3.8], [352, 146, 3.6], [404, 150, 3.8], [452, 156, 3.6], [498, 168, 3.4], [546, 186, 3.4], [326, 96, 3.4], [396, 100, 3.6], [444, 108, 3.4], [490, 118, 3.4], [272, 196, 3.6], [320, 194, 3.4], [372, 196, 3.6], [420, 198, 3.4], [466, 202, 3.2], [510, 216, 3.2], [536, 216, 3.2], [560, 196, 3.2], [286, 122, 3.2], [340, 118, 3], [390, 120, 3.2], [438, 128, 3], [482, 140, 3], [308, 176, 3], [358, 178, 3], [408, 180, 3], [456, 184, 3], [304, 226, 3], [356, 228, 3], [408, 230, 3], [458, 228, 2.8], [530, 240, 2.8], [334, 142, 2.6], [386, 146, 2.6], [436, 148, 2.6], [480, 152, 2.4], [286, 148, 2.6], [310, 160, 2.4], [362, 158, 2.4], [412, 160, 2.4], [460, 166, 2.4], [506, 176, 2.4], [336, 198, 2.4], [388, 202, 2.4], [440, 204, 2.2], [484, 206, 2.2], [300, 182, 2.4], [528, 204, 2.4], [268, 130, 2.6], [262, 196, 2.4], [266, 222, 2.4], [292, 104, 2.6], [348, 100, 2.6], [420, 104, 2.6], [468, 116, 2.4], [316, 130, 2.4], [368, 132, 2.4], [418, 136, 2.4], [464, 144, 2.2], [332, 226, 2.4], [382, 228, 2.4], [432, 230, 2.2], [508, 230, 2.2]])}
  <!-- blotches del vientre: GRANDES y sólidos como la lámina -->
  <g fill="${P.roseta}" opacity=".94">
    <ellipse cx="314" cy="236" rx="8" ry="4.2" transform="rotate(-6 314 236)"/>
    <ellipse cx="364" cy="239" rx="8.5" ry="4.4" transform="rotate(3 364 239)"/>
    <ellipse cx="416" cy="241" rx="8" ry="4.2" transform="rotate(-3 416 241)"/>
    <ellipse cx="466" cy="241" rx="7" ry="3.8" transform="rotate(4 466 241)"/>
    <ellipse cx="510" cy="238" rx="6" ry="3.4" transform="rotate(8 510 238)"/>
    <ellipse cx="340" cy="245" rx="5" ry="2.8"/>
    <ellipse cx="392" cy="247" rx="5" ry="2.8"/>
    <ellipse cx="442" cy="247" rx="4.5" ry="2.6"/>
  </g>
  <!-- SOMBRA-NÚCLEO sobre la línea del vientre: lo que hace REDONDO el torso -->
  <path d="M266,232 C 310,242 380,246 450,246 C 490,245 520,240 545,230 C 525,244 495,251 455,253 C 390,255 320,252 272,244 Z"
    fill="#5a3212" opacity=".2"/>
  <!-- penumbra del ijar (tras el hombro) y del flanco trasero -->
  <path d="M258,110 C 268,158 272,200 268,236 C 258,204 252,162 254,122 Z" fill="#5a3212" opacity=".14"/>
  <path d="M556,110 C 574,140 580,180 570,214 C 578,180 574,142 560,116 Z" fill="#5a3212" opacity=".16"/>`;

/* ── PECHO/BABERO (parte del tronco, entre las patas delanteras): crema
      profundo con las barras negras del grabado ── */
const PECHO = `
  <path d="M212,204 C 204,230 203,262 210,292 C 216,312 226,324 238,328 C 251,330 260,320 262,304 C 263,283 258,254 249,230 C 242,211 231,199 221,198 C 217,198 213,200 212,204 Z"
    fill="${P.blancoPelaje}" stroke="${P.contorno}" stroke-width="3"/>
  <!-- sombreado del pecho: penumbra tras el codo (volumen del torso) -->
  <path d="M252,240 C 258,262 261,286 259,306 C 254,318 247,325 240,327 C 249,314 253,296 252,274 C 251,262 250,250 248,240 Z"
    fill="#c9a86e" opacity=".5"/>
  <!-- BARRAS negras del pecho: gruesas, orgánicas, quebradas (la lámina) -->
  <g fill="${P.roseta}">
    <path d="M210,222 C 218,224 227,229 236,238 C 240,242 242,246 241,248 C 238,250 231,246 224,240 C 217,234 210,228 208,225 C 208,223 209,222 210,222 Z"/>
    <path d="M207,248 C 216,252 227,260 237,271 C 241,276 242,280 240,281 C 236,282 228,276 220,268 C 213,261 206,254 205,251 C 205,249 206,248 207,248 Z"/>
    <path d="M208,275 C 216,280 227,289 236,300 C 239,304 240,308 238,309 C 234,310 227,304 219,295 C 213,288 207,281 206,278 C 206,276 207,275 208,275 Z"/>
    <path d="M215,301 C 222,305 230,312 236,319 C 238,322 238,324 236,325 C 232,325 226,320 220,314 C 216,310 213,306 212,304 C 212,302 213,301 215,301 Z"/>
  </g>`;

/* ── CUELLO: cuña ancha de la nuca a la cruz (por atrás) y del cachete al
      pecho (por delante). El tronco pinta su casquete en la base; el cuello
      pinta el casquete del ATLAS bajo el cráneo (el fix de la decapitación) ── */
const CUELLO = `
  <path d="M126,58 C 168,48 216,50 248,66 C 258,94 258,150 252,196 C 248,228 240,252 228,262 C 212,270 192,262 176,242 C 148,214 126,170 116,124 C 112,100 114,74 126,58 Z"
    fill="url(#jhCuelloGrad)"/>
  <!-- contorno SOLO en las siluetas externas (nuca y garganta): el borde que
       cruza el hombro va sin stroke para fundirse con el tronco -->
  <path d="M126,58 C 164,49 204,49 236,62" fill="none" stroke="${P.contorno}" stroke-width="4" stroke-linecap="round"/>
  <path d="M116,124 C 126,170 148,214 176,244 C 190,260 207,267 222,264" fill="none" stroke="${P.contorno}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="${CASQUETES.cabeza[0]}" cy="${CASQUETES.cabeza[1]}" r="${CASQUETES.cabeza[2]}" fill="url(#jhCuelloGrad)"/>
  <!-- sombra que la cabeza PROYECTA sobre el cuello (profundidad real) -->
  <path d="M156,64 C 166,96 170,134 166,172" stroke="#4a2a10" stroke-width="17" stroke-linecap="round" opacity=".2" fill="none" filter="url(#jhBlur)"/>
  <!-- GARGANTA blanca con las barras negras del grabado -->
  <path d="M152,196 C 164,222 184,244 210,254 C 200,264 184,262 172,252 C 158,240 150,218 152,196 Z" fill="${P.blancoPelaje}" opacity=".9"/>
  <g stroke="${P.roseta}" stroke-width="4.6" stroke-linecap="round" fill="none" opacity=".85">
    <path d="M157,212 C 165,218 173,226 180,236"/>
    <path d="M164,232 C 172,238 181,245 190,250"/>
  </g>
  <!-- nuca y cuello: VETAS alargadas que fluyen hacia la cruz (lámina) -->
  <g fill="${P.roseta}">
    <ellipse cx="176" cy="90" rx="7" ry="3" transform="rotate(24 176 90)"/><ellipse cx="200" cy="83" rx="7.5" ry="3.2" transform="rotate(14 200 83)"/>
    <ellipse cx="224" cy="85" rx="7" ry="3" transform="rotate(8 224 85)"/><ellipse cx="244" cy="94" rx="6" ry="2.8" transform="rotate(12 244 94)"/>
    <ellipse cx="168" cy="116" rx="6.5" ry="3" transform="rotate(38 168 116)"/><ellipse cx="194" cy="112" rx="7.5" ry="3.2" transform="rotate(24 194 112)"/>
    <ellipse cx="220" cy="114" rx="7" ry="3" transform="rotate(16 220 114)"/><ellipse cx="243" cy="124" rx="6" ry="2.8" transform="rotate(20 243 124)"/>
    <ellipse cx="178" cy="146" rx="7" ry="3.2" transform="rotate(46 178 146)"/><ellipse cx="204" cy="144" rx="7" ry="3" transform="rotate(30 204 144)"/>
    <ellipse cx="230" cy="150" rx="6.2" ry="2.8" transform="rotate(24 230 150)"/>
    <ellipse cx="188" cy="176" rx="6.5" ry="3" transform="rotate(52 188 176)"/><ellipse cx="212" cy="180" rx="6" ry="2.8" transform="rotate(38 212 180)"/>
    <ellipse cx="234" cy="184" rx="5.5" ry="2.6" transform="rotate(30 234 184)"/>
    <ellipse cx="198" cy="210" rx="5.5" ry="2.6" transform="rotate(46 198 210)"/><ellipse cx="220" cy="214" rx="5" ry="2.4" transform="rotate(36 220 214)"/>
    <ellipse cx="160" cy="102" rx="5" ry="2.6" transform="rotate(50 160 102)"/><ellipse cx="158" cy="138" rx="5" ry="2.6" transform="rotate(60 158 138)"/>
    <ellipse cx="172" cy="166" rx="5" ry="2.6" transform="rotate(56 172 166)"/><ellipse cx="246" cy="150" rx="5" ry="2.4" transform="rotate(22 246 150)"/>
    <ellipse cx="188" cy="130" rx="4.5" ry="2.3" transform="rotate(36 188 130)"/><ellipse cx="240" cy="205" rx="4.5" ry="2.2" transform="rotate(30 240 205)"/>
  </g>
  ${roseta(214, 130, 0.62, 20, 2)}${roseta(232, 168, 0.58, -10, 2)}`;

/* ── CABEZA: cráneo ¾ hacia cámara, RE-ESCULPIDO contra la lámina (pasadas de
      belleza): cráneo ancho y plano, ojos almendrados que arden, puente nasal
      dorado, morro blanco con filas de vibrisas, ruffs con vetas negras ── */
const NEGRO = '#1a0f06'; // el negro de marca facial (más cálido que la roseta)
const CABEZA = (() => {
  return `
  <!-- orejas: DETRÁS del cráneo, articuladas en su base. Dorso NEGRO con
       interior crema (la lámina), redondeadas y bien separadas -->
  <g class="jh-hueso jh-orejaI" style="transform-origin:32px 62px">
    <path d="M13,62 C 8,46 16,28 32,20 C 45,27 52,44 50,60 C 38,70 23,70 13,62 Z"
      fill="#241408" stroke="#180d05" stroke-width="2.6"/>
    <path d="M20,57 C 18,46 24,34 33,28 C 41,35 45,47 44,55 C 35,62 26,61 20,57 Z" fill="#d9b06a" opacity=".85"/>
    <path d="M22,55 C 21,47 25,38 32,32" stroke="#8a6030" stroke-width="1.6" opacity=".6" fill="none"/>
    <path d="M17,60 C 22,63 30,65 38,64" stroke="#f0e2c4" stroke-width="2.4" opacity=".7" fill="none"/>
  </g>
  <g class="jh-hueso jh-orejaD" style="transform-origin:132px 62px">
    <path d="M110,60 C 107,42 119,24 138,19 C 152,29 159,50 155,66 C 141,75 121,70 110,60 Z"
      fill="#241408" stroke="#180d05" stroke-width="2.6"/>
    <path d="M118,55 C 119,42 127,32 137,27 C 146,36 149,49 146,58 C 136,64 125,61 118,55 Z" fill="#d9b06a" opacity=".85"/>
    <path d="M121,52 C 122,44 127,36 134,31" stroke="#8a6030" stroke-width="1.6" opacity=".6" fill="none"/>
    <path d="M114,58 C 121,62 131,64 141,62" stroke="#f0e2c4" stroke-width="2.4" opacity=".7" fill="none"/>
  </g>
  <!-- el CRÁNEO: ancho, de frente plana — cubre el casquete del atlas -->
  <path d="M56,25 C 70,15 96,14 112,22 C 128,30 142,44 150,62 C 157,78 161,98 160,118 C 159,136 154,152 146,164 C 140,172 133,179 125,185 C 114,193 100,198 88,198 C 74,197 62,191 53,181 C 43,169 33,151 27,131 C 21,110 20,84 27,62 C 33,46 43,33 56,25 Z"
    fill="url(#jhCara)" stroke="#2e1a0a" stroke-width="3"/>
  <!-- casco craneal castaño (frente en penumbra cálida) -->
  <path d="M56,25 C 70,15 96,14 112,22 C 124,28 135,38 144,52 C 128,42 108,36 88,36 C 68,37 51,44 39,55 C 43,43 48,32 56,25 Z"
    fill="#6e4116" opacity=".75"/>
  <!-- sienes en penumbra: el cráneo se redondea hacia los lados -->
  <path d="M33,52 C 26,74 25,98 31,120" fill="none" stroke="#6e4116" stroke-width="11" stroke-linecap="round" opacity=".4"/>
  <path d="M139,54 C 149,76 153,102 151,126" fill="none" stroke="#6e4116" stroke-width="13" stroke-linecap="round" opacity=".42"/>
  <!-- RUFFS de mejilla: pelaje claro que rompe apenas la silueta (tufos
       suaves, integrados — no plumas) -->
  <path d="M46,132 C 39,140 32,150 28,162 C 33,161 36,162 38,165 C 40,169 40,173 39,177 C 44,177 49,175 52,171 C 57,163 60,152 60,143 C 55,137 50,133 46,132 Z"
    fill="#c8ae7c" stroke="#7e5c2e" stroke-width="1.2" stroke-linejoin="round" opacity=".85"/>
  <path d="M147,124 C 154,133 159,146 160,158 C 155,156 151,157 149,160 C 147,164 147,169 148,173 C 143,172 138,169 136,164 C 132,155 130,145 131,137 C 137,129 143,124 147,124 Z"
    fill="#c8ae7c" stroke="#7e5c2e" stroke-width="1.2" stroke-linejoin="round" opacity=".85"/>
  <!-- vetas oscuras de los ruffs (el rayado del grabado) -->
  <g stroke="${NEGRO}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7">
    <path d="M41,146 C 38,153 36,161 35,168"/>
    <path d="M49,150 C 46,157 44,165 44,172"/>
    <path d="M150,140 C 152,147 153,155 153,162"/>
    <path d="M142,146 C 144,153 145,160 145,167"/>
  </g>
  <!-- mejillas: sombra que esculpe el pómulo bajo cada ojo -->
  <path d="M30,96 C 36,104 42,114 44,126 C 38,122 32,114 28,106 Z" fill="#8a5a20" opacity=".5"/>
  <path d="M128,98 C 134,108 138,120 138,132 C 130,126 124,114 122,104 Z" fill="#8a5a20" opacity=".5"/>
  <!-- frente: moteado DENSO del grabado (la firma de la lámina) -->
  <g fill="${NEGRO}">
    <ellipse cx="70" cy="22" rx="3.2" ry="1.9" transform="rotate(-14 70 22)"/><ellipse cx="84" cy="19" rx="3.6" ry="2" transform="rotate(-3 84 19)"/>
    <ellipse cx="99" cy="21" rx="3.2" ry="1.9" transform="rotate(10 99 21)"/><ellipse cx="62" cy="31" rx="2.7" ry="1.7" transform="rotate(-18 62 31)"/>
    <ellipse cx="77" cy="28" rx="2.9" ry="1.8"/><ellipse cx="92" cy="28" rx="2.9" ry="1.8" transform="rotate(8 92 28)"/>
    <ellipse cx="107" cy="30" rx="2.7" ry="1.7" transform="rotate(16 107 30)"/><ellipse cx="55" cy="42" rx="2.5" ry="1.6" transform="rotate(-22 55 42)"/>
    <ellipse cx="69" cy="38" rx="2.6" ry="1.7" transform="rotate(-8 69 38)"/><ellipse cx="84" cy="37" rx="2.8" ry="1.8"/>
    <ellipse cx="99" cy="38" rx="2.6" ry="1.7" transform="rotate(10 99 38)"/><ellipse cx="113" cy="41" rx="2.5" ry="1.6" transform="rotate(20 113 41)"/>
    <ellipse cx="61" cy="50" rx="2.4" ry="1.5" transform="rotate(-14 61 50)"/><ellipse cx="76" cy="47" rx="2.5" ry="1.6"/>
    <ellipse cx="91" cy="47" rx="2.5" ry="1.6" transform="rotate(6 91 47)"/><ellipse cx="106" cy="50" rx="2.4" ry="1.5" transform="rotate(14 106 50)"/>
    <ellipse cx="70" cy="56" rx="2.2" ry="1.5" transform="rotate(-8 70 56)"/><ellipse cx="96" cy="56" rx="2.2" ry="1.5" transform="rotate(8 96 56)"/>
    <ellipse cx="83" cy="53" rx="2.1" ry="1.4"/>
    <ellipse cx="120" cy="52" rx="2.6" ry="1.7" transform="rotate(24 120 52)"/><ellipse cx="132" cy="64" rx="2.8" ry="1.8" transform="rotate(32 132 64)"/>
    <ellipse cx="46" cy="56" rx="2.5" ry="1.6" transform="rotate(-26 46 56)"/><ellipse cx="34" cy="70" rx="2.7" ry="1.7" transform="rotate(-32 34 70)"/>
    <ellipse cx="142" cy="80" rx="3" ry="1.9" transform="rotate(40 142 80)"/><ellipse cx="150" cy="98" rx="3" ry="1.9" transform="rotate(55 150 98)"/>
    <ellipse cx="27" cy="88" rx="2.8" ry="1.8" transform="rotate(-45 27 88)"/><ellipse cx="25" cy="108" rx="2.8" ry="1.8" transform="rotate(-60 25 108)"/>
    <ellipse cx="152" cy="116" rx="2.8" ry="1.8" transform="rotate(70 152 116)"/><ellipse cx="34" cy="124" rx="2.6" ry="1.7" transform="rotate(-62 34 124)"/>
    <ellipse cx="146" cy="134" rx="2.6" ry="1.7" transform="rotate(66 146 134)"/>
    <ellipse cx="120" cy="108" rx="2.4" ry="1.6" transform="rotate(30 120 108)"/><ellipse cx="128" cy="120" rx="2.3" ry="1.5" transform="rotate(40 128 120)"/>
    <ellipse cx="40" cy="108" rx="2.3" ry="1.5" transform="rotate(-35 40 108)"/>
  </g>
  <!-- vetas centrales de la frente (las marcas alargadas del jaguar real) -->
  <g stroke="${NEGRO}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".8">
    <path d="M79,44 C 80,38 81,33 81,29"/>
    <path d="M90,43 C 92,37 93,32 94,28"/>
    <path d="M71,52 C 71,47 72,42 73,38"/>
    <path d="M98,52 C 99,47 99,42 99,38"/>
  </g>
  <!-- ceño: los surcos entre los ojos (mirada baja de depredador) -->
  <g stroke="${NEGRO}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7">
    <path d="M77,67 C 78,62 79,58 81,55"/>
    <path d="M89,67 C 89,62 89,58 88,54"/>
  </g>
  <!-- moteado extra de la frente (la densidad del grabado) -->
  <g fill="${NEGRO}" opacity=".9">
    <ellipse cx="66" cy="26" rx="2.2" ry="1.4" transform="rotate(-12 66 26)"/><ellipse cx="94" cy="24" rx="2.2" ry="1.4" transform="rotate(8 94 24)"/>
    <ellipse cx="74" cy="33" rx="2" ry="1.3"/><ellipse cx="88" cy="32" rx="2" ry="1.3"/><ellipse cx="102" cy="25" rx="2" ry="1.3" transform="rotate(14 102 25)"/>
    <ellipse cx="59" cy="37" rx="2" ry="1.3" transform="rotate(-16 59 37)"/><ellipse cx="104" cy="35" rx="2.1" ry="1.4" transform="rotate(14 104 35)"/>
    <ellipse cx="65" cy="44" rx="1.9" ry="1.2" transform="rotate(-10 65 44)"/><ellipse cx="97" cy="44" rx="1.9" ry="1.2" transform="rotate(8 97 44)"/>
    <ellipse cx="52" cy="50" rx="2" ry="1.3" transform="rotate(-20 52 50)"/><ellipse cx="114" cy="48" rx="2" ry="1.3" transform="rotate(18 114 48)"/>
    <ellipse cx="76" cy="58" rx="1.7" ry="1.1"/><ellipse cx="92" cy="58" rx="1.7" ry="1.1"/>
    <ellipse cx="58" cy="58" rx="1.8" ry="1.2" transform="rotate(-14 58 58)"/><ellipse cx="108" cy="58" rx="1.8" ry="1.2" transform="rotate(12 108 58)"/>
  </g>
  <!-- PUENTE NASAL dorado: del entrecejo a la trufa, flanqueado en sombra -->
  <path d="M71,82 C 77,78 93,78 99,82 C 98,98 95,112 92,124 L78,124 C 75,112 72,98 71,82 Z"
    fill="#e2ae5c" opacity=".92"/>
  <path d="M66,84 C 68,98 71,112 76,124" stroke="#6b3d16" stroke-width="2.6" opacity=".5" fill="none"/>
  <path d="M104,84 C 101,98 97,112 94,124" stroke="#6b3d16" stroke-width="2.6" opacity=".5" fill="none"/>
  <!-- lagrimales: la marca negra del lagrimal al morro -->
  <path d="M59,84 C 61,92 64,99 68,105" stroke="${NEGRO}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".85"/>
  <path d="M100,85 C 97,93 94,100 92,106" stroke="${NEGRO}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".85"/>
  <!-- pálido bajo los ojos (la luz del grabado — sutil, no esclerótica) -->
  <path d="M37,92 C 43,95 51,96 57,93" stroke="#ecd4a2" stroke-width="3" stroke-linecap="round" fill="none" opacity=".4"/>
  <path d="M102,94 C 109,97 118,97 124,93" stroke="#ecd4a2" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".4"/>
  <!-- MORRO BLANCO: dos almohadillas unidas bajo la trufa, con FILAS de
       puntos de vibrisas (no chapetas circulares: morro felino real) -->
  <path d="M53,131 C 55,120 65,113 77,115 C 83,117 86,121 87,126 C 88,121 91,117 97,115 C 109,113 119,120 121,131 C 122,141 118,150 110,155 C 102,159 94,161 87,160 C 80,161 72,159 64,155 C 56,150 52,141 53,131 Z"
    fill="${P.blancoPelaje}" stroke="#c9a86e" stroke-width="1.6"/>
  <!-- filas de vibrisas (puntos) sobre el morro -->
  <g fill="${NEGRO}">
    <circle cx="60" cy="132" r="1.2"/><circle cx="67" cy="130" r="1.2"/><circle cx="74" cy="130" r="1.2"/><circle cx="81" cy="131" r="1.1"/>
    <circle cx="58" cy="139" r="1.2"/><circle cx="65" cy="138" r="1.2"/><circle cx="72" cy="138" r="1.2"/><circle cx="79" cy="139" r="1.1"/>
    <circle cx="61" cy="146" r="1.1"/><circle cx="68" cy="146" r="1.1"/><circle cx="75" cy="147" r="1.1"/>
    <circle cx="93" cy="131" r="1.1"/><circle cx="100" cy="130" r="1.2"/><circle cx="107" cy="130" r="1.2"/><circle cx="114" cy="132" r="1.2"/>
    <circle cx="95" cy="139" r="1.1"/><circle cx="102" cy="138" r="1.2"/><circle cx="109" cy="138" r="1.2"/><circle cx="116" cy="139" r="1.2"/>
    <circle cx="99" cy="146" r="1.1"/><circle cx="106" cy="146" r="1.1"/><circle cx="113" cy="147" r="1.1"/>
  </g>
  <!-- TRUFA ancha (rosada-parda, la de la lámina) con aletas y surco -->
  <path d="M74,118 C 78,114.5 94,114.5 98,118 C 99,127 93,135 86,138 C 79,135 73,127 74,118 Z"
    fill="url(#jhTrufa)"/>
  <path d="M78,124 C 80,128 83,130 86,130 M94,124 C 92,128 89,130 86,130" stroke="#431d14" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M78,117.5 C 82,115.5 90,115.5 94,117.5" stroke="#c98a70" stroke-width="2" opacity=".75" fill="none" stroke-linecap="round"/>
  <!-- filtrum + labio: boca felina que CAE en las comisuras (no sonrisa) -->
  <path d="M86,139 L86,148" stroke="${NEGRO}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M73,147 C 78,150.5 84,152 86,152 C 88,152 94,150.5 99,147" stroke="${NEGRO}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".9"/>
  <path d="M73,147 C 70,150 68,154 67,158 M99,147 C 102,150 104,154 105,158" stroke="${NEGRO}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".65"/>
  <!-- vibrisas: finas, largas, barriendo abajo-afuera (no tapan los ruffs) -->
  <g fill="none" stroke="${P.vibrisa}" stroke-width="1.15" stroke-linecap="round" opacity=".7">
    <path d="M54,136 C 38,133 20,134 4,140"/>
    <path d="M55,143 C 39,144 22,148 8,156"/>
    <path d="M58,150 C 44,155 31,162 21,171"/>
    <path d="M62,156 C 51,163 41,171 34,180"/>
    <path d="M117,137 C 131,136 145,139 157,145"/>
    <path d="M116,145 C 130,148 143,154 153,162"/>
    <path d="M112,152 C 124,157 135,164 143,172"/>
  </g>
  <!-- FAUCES reales (el bonus del vector), DETRÁS de la mandíbula -->
  <g class="jh-fauces">
    <path d="M68,149 C 78,155 94,155 102,149 C 100,164 94,174 85,174 C 76,174 70,163 68,149 Z" fill="${P.boca}"/>
    <ellipse cx="85" cy="162" rx="9" ry="6" fill="#2e0b08" opacity=".65"/>
    <path d="M74,157 C 80,161 91,161 97,157 C 94,167 90,171 85,171 C 80,171 77,165 74,157 Z" fill="${P.lengua}"/>
    <path d="M78,163 C 81,165 90,165 93,163" stroke="#8f3a30" stroke-width="1.3" fill="none" opacity=".7"/>
    <path d="M70,149 C 72,156 74,161 77,163 C 79,158 80,153 79,149 Z" fill="${P.colmillo}" stroke="#c9b490" stroke-width=".8"/>
    <path d="M100,149 C 98,156 96,161 93,163 C 91,158 90,153 91,149 Z" fill="${P.colmillo}" stroke="#c9b490" stroke-width=".8"/>
    <path d="M81,150 L83,155 L85,150 Z M87,150 L89,155 L91,150 Z" fill="${P.colmillo}" opacity=".9"/>
  </g>
  <!-- MANDÍBULA (hueso): mentón felino CHICO bajo el morro (no barba);
       cerrada TAPA las fauces; rota en la charnela (88,152) al hablar -->
  <g class="jh-hueso jh-mandibula" style="transform-origin:87px 149px">
    <path d="M66,147 C 77,154 95,154 104,147 C 107,158 103,169 95,174 C 90,177 82,177 77,174 C 69,169 64,158 66,147 Z"
      fill="#e9dcbd" stroke="#4a2c12" stroke-width="1.8"/>
    <path d="M75,156 C 81,159 91,159 97,156" stroke="#c9a86e" stroke-width="1.4" opacity=".6" fill="none"/>
    <path d="M79,150 C 84,152.5 89,152.5 93,150" stroke="${NEGRO}" stroke-width="1.5" opacity=".55" fill="none"/>
  </g>
  <!-- OJOS: almendrados, borde negro grueso, iris ámbar que ARDE, pupila
       redonda de jaguar, destello — la mirada de la lámina -->
  <g class="jh-ojoGrupo">
    <circle class="jh-ojoHalo" cx="47" cy="78" r="17" fill="url(#jhOjoHalo)"/>
    <circle class="jh-ojoHalo" cx="114" cy="79" r="21" fill="url(#jhOjoHalo)"/>
    <!-- motas alrededor de los ojos (lo que en la lámina enmarca la mirada) -->
    <g fill="${NEGRO}">
      <ellipse cx="32" cy="66" rx="1.9" ry="1.2" transform="rotate(-18 32 66)"/><ellipse cx="55" cy="62" rx="1.7" ry="1.1"/>
      <ellipse cx="26" cy="80" rx="1.9" ry="1.2" transform="rotate(-40 26 80)"/><ellipse cx="30" cy="94" rx="1.8" ry="1.2" transform="rotate(-30 30 94)"/>
      <ellipse cx="98" cy="63" rx="1.9" ry="1.2"/><ellipse cx="127" cy="62" rx="1.9" ry="1.2" transform="rotate(14 127 62)"/>
      <ellipse cx="136" cy="74" rx="2.1" ry="1.3" transform="rotate(30 136 74)"/><ellipse cx="133" cy="90" rx="2" ry="1.3" transform="rotate(40 133 90)"/>
      <ellipse cx="36" cy="112" rx="2" ry="1.3" transform="rotate(-24 36 112)"/><ellipse cx="44" cy="122" rx="1.8" ry="1.2" transform="rotate(-16 44 122)"/>
      <ellipse cx="33" cy="130" rx="1.8" ry="1.2" transform="rotate(-34 33 130)"/>
      <ellipse cx="127" cy="104" rx="2" ry="1.3" transform="rotate(24 127 104)"/><ellipse cx="135" cy="116" rx="1.9" ry="1.2" transform="rotate(30 135 116)"/>
      <ellipse cx="125" cy="130" rx="1.8" ry="1.2" transform="rotate(20 125 130)"/>
    </g>
    <g class="jh-ojo">
      <path d="M33,79 C 36,72.5 42,69.5 49,70 C 55,70.5 59,74 60,78 C 58,83 52,86 45,86 C 39.5,86 35,83.5 33,79 Z"
        fill="#170e05"/>
      <path d="M33,79 L25,84 L32,84 Z" fill="#170e05"/>
      <path d="M36,79 C 38.5,73.5 44,71.5 49.5,72 C 54,72.5 57,75 58,78 C 56.5,82 51.5,84.5 46,84.5 C 41,84.5 37.5,82.5 36,79 Z"
        fill="url(#jhIris)"/>
      <ellipse class="jh-pupila" cx="46.5" cy="78.5" rx="2.8" ry="3.2" fill="${P.pupila}"/>
      <path d="M36,77 C 40,72.5 46,70.8 52,72 C 55,72.7 57,74.5 58,76 C 54,74.5 48,74 44,75 C 40.5,75.8 38,76.5 36,77 Z" fill="#5c3708" opacity=".6"/>
      <path d="M37,83 C 42,85.5 51,85.5 56,81.5" fill="none" stroke="#170e05" stroke-width="1.8"/>
      <circle cx="44" cy="75.5" r="1.4" fill="#fff" opacity=".9"/>
      <circle cx="50" cy="80" r=".8" fill="#fff" opacity=".5"/>
      <path class="jh-parpado" style="transform-origin:46px 68px" d="M31,72 C 38,66 54,65 61,72 C 62,77 61,84 58,88 C 51,91 40,90 34,86 C 31,81 30,76 31,72 Z" fill="#9c6a28"/>
      <path d="M34,74 C 40,70 51,69 59,72.5" fill="none" stroke="${NEGRO}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g class="jh-ojo">
      <path d="M100,80 C 102,72 109,68 117,68.5 C 124,69 129,73.5 130,78.5 C 128,84.5 122,87.5 114,87.5 C 107,87.5 102,85 100,80 Z"
        fill="#170e05"/>
      <path d="M130,78.5 L138,83 L131,84 Z" fill="#170e05"/>
      <path d="M103,80 C 105,73.5 110,70.5 116.5,71 C 122,71.5 126,74.5 127,78 C 125.5,82.5 120.5,85.5 114,85.5 C 108,85.5 104.5,83.5 103,80 Z"
        fill="url(#jhIris)"/>
      <ellipse class="jh-pupila" cx="113.5" cy="79" rx="3.2" ry="3.6" fill="${P.pupila}"/>
      <path d="M103,77.5 C 106,72.5 112,70.3 118,71.2 C 122,71.9 125.5,74 127,76.5 C 122.5,74.3 117,73.5 112,74.5 C 108,75.4 105,76.4 103,77.5 Z" fill="#5c3708" opacity=".6"/>
      <path d="M104,84.5 C 110,87 119,87 125,82.5" fill="none" stroke="#170e05" stroke-width="2"/>
      <circle cx="110" cy="75" r="1.6" fill="#fff" opacity=".9"/>
      <circle cx="118" cy="81.5" r=".9" fill="#fff" opacity=".5"/>
      <path class="jh-parpado" style="transform-origin:113px 67px" d="M98,71 C 105,64 122,63 130,71 C 132,77 131,85 128,89 C 120,92 106,91 102,87 C 97,82 97,75 98,71 Z" fill="#9c6a28"/>
      <path d="M101,73.5 C 108,68 120,67 129,71" fill="none" stroke="${NEGRO}" stroke-width="3" stroke-linecap="round"/>
    </g>
  </g>`;
})();

/* ═══════════════════════════ EL SVG COMPLETO ═══════════════════════════════ */

const H = JH_HUESOS;
const origin = (nombre) => ` style="transform-origin:${H[nombre][0]}px ${H[nombre][1]}px"`;

/**
 * El markup del jaguar de huesos. Autocontenido: defs + huesos + piel.
 * El host le pone los atributos de estado (data-agt-estado / data-modo /
 * data-vida) en su raíz y el CSS (`jaguarHuesos.css`) hace el resto.
 */
export const JAGUAR_HUESOS_SVG = `<svg class="jaguarHuesos" viewBox="-30 -80 765 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Jaguar">
${DEFS}
<g class="jh-pj">
  <ellipse class="jh-aura" cx="340" cy="170" rx="330" ry="240" fill="url(#jhAura)"/>
  <g class="jh-masa">
    <g class="jh-antic"${origin('columna')}>
      <ellipse class="jh-sombraSuelo" cx="360" cy="382" rx="235" ry="17" fill="${P.sombraSuelo}" filter="url(#jhBlur)"/>
      <g class="jh-hueso jh-cuerpo"${origin('columna')}>
        ${pata({ clase: 'jh-pataDelLejos', hombro: H.pataDelLejos, codo: H.codoDelLejos, zarpa: [172, 366], anchoAlto: 46, anchoBajo: 31, lejos: true, curvaAlta: 0.2, spots: motas([[183, 246, 5.4], [175, 266, 4.8], [185, 284, 4.6], [177, 300, 4]]), spotsBajos: motas([[173, 314, 4.2], [169, 332, 3.8], [175, 348, 3.4]]) })}
        ${pata({ clase: 'jh-pataTrasLejos', hombro: H.pataTrasLejos, codo: H.rodillaTrasLejos, zarpa: [422, 336], anchoAlto: 54, anchoBajo: 31, lejos: true, spots: motas([[466, 250, 5.6], [446, 266, 5], [458, 284, 4.6], [452, 300, 4]]), spotsBajos: motas([[433, 300, 4.2], [423, 314, 3.8], [429, 328, 3.4]]) })}
        ${COLA}
        ${TRONCO}
        ${pata({ clase: 'jh-pataTrasCerca', hombro: H.pataTrasCerca, codo: H.rodillaTrasCerca, zarpa: [552, 344], anchoAlto: 74, anchoBajo: 34, spots: `<path d="M504,240 C 499,262 501,282 512,298" fill="none" stroke="#ecd0a0" stroke-width="11" stroke-linecap="round" opacity=".45"/><path d="M552,246 C 560,266 562,285 557,299" fill="none" stroke="#5a3212" stroke-width="13" stroke-linecap="round" opacity=".24"/>${roseta(520, 256, 1.1, 30, 2)}${roseta(548, 286, 0.95, -20, 2)}${roseta(510, 292, 0.8, 12, 2)}${motas([[544, 246, 5], [530, 276, 4.6], [558, 266, 4.4], [520, 306, 3.8], [538, 302, 3.6]])}`, spotsBajos: motas([[558, 312, 4.4], [550, 326, 4], [559, 338, 3.6]]) })}
        ${PECHO}
        ${pata({ clase: 'jh-pataDelCerca', hombro: H.pataDelCerca, codo: H.codoDelCerca, zarpa: [240, 372], anchoAlto: 50, anchoBajo: 36, curvaAlta: 0.2, spots: `<path d="M222,242 C 219,262 221,280 229,294" fill="none" stroke="#eac888" stroke-width="9" stroke-linecap="round" opacity=".45"/><path d="M246,244 C 251,264 251,282 246,296" fill="none" stroke="#5a3212" stroke-width="10" stroke-linecap="round" opacity=".2"/>${motas([[248, 246, 5.4], [227, 262, 4.8], [249, 280, 4.6], [231, 296, 4.2], [242, 264, 3.6], [237, 282, 3.2]])}`, spotsBajos: motas([[241, 314, 4.4], [231, 330, 4], [247, 342, 3.8], [235, 356, 3.4]]) })}
        <circle cx="${CASQUETES.cuello[0]}" cy="${CASQUETES.cuello[1]}" r="${CASQUETES.cuello[2]}" fill="url(#jhCuelloGrad)"/>
        <g class="jh-hueso jh-cuello"${origin('cuello')}>
          ${CUELLO}
          <!-- cabezaGiro: envoltorio para COMPONER el giro periódico (reloj
               largo) con el contra-bob/ladeo del hueso cabeza (reloj corto)
               sin que un transform pise al otro. Mismo pivote: el atlas. -->
          <g class="jh-hueso jh-cabezaGiro"${origin('cabeza')}>
            <g class="jh-hueso jh-cabeza"${origin('cabeza')}>
              ${CABEZA}
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</g>
</svg>`;

export default JAGUAR_HUESOS_SVG;

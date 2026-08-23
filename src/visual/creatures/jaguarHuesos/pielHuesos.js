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

/** Roseta jaguar: anillo ROTO (dasharray irregular) + centro ocre + puntos
    internos — la regla anti-leopardo (mancha CON centro). */
function roseta(x, y, s = 1, rot = 0, variante = 0) {
  const dash = variante === 0 ? '13 4 9 5 10 4' : variante === 1 ? '10 5 8 4 9 5' : '8 4 10 4 7 5';
  const rx = variante === 2 ? 9 : 12;
  const ry = variante === 2 ? 7.2 : 9.6;
  return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">` +
    `<ellipse rx="${rx - 2.6}" ry="${ry - 2.2}" fill="${P.rosetaCentro}" opacity=".7"/>` +
    `<ellipse rx="${rx}" ry="${ry}" fill="none" stroke="${P.roseta}" stroke-width="4.4" stroke-dasharray="${dash}" stroke-linecap="round"/>` +
    `<circle cx="-2.2" cy="1.4" r="1.7" fill="${P.roseta}"/>` +
    (variante !== 2 ? `<circle cx="2.8" cy="-1.8" r="1.5" fill="${P.roseta}"/>` : '') +
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
  return (
    `<g class="jh-hueso ${clase}"${og(hx, hy)}>` +
      `<path d="${dAlto}" fill="none" stroke="${borde}" stroke-width="${wA + 5}" stroke-linecap="round"/>` +
      `<path d="${dAlto}" fill="none" stroke="${grad}" stroke-width="${wA}" stroke-linecap="round"/>` +
      (spots ? `<g${lejos ? ' opacity=".85"' : ''}>${spots}</g>` : '') +
      `<g class="jh-hueso ${clase}Bajo"${og(cx, cy)}>` +
        `<circle cx="${cx}" cy="${cy}" r="${wA * 0.5}" fill="${grad}"/>` +
        `<path d="${dBajo}" fill="none" stroke="${borde}" stroke-width="${wB + 4.5}" stroke-linecap="round"/>` +
        `<path d="${dBajo}" fill="none" stroke="${grad}" stroke-width="${wB}" stroke-linecap="round"/>` +
        (spotsBajos ? `<g${lejos ? ' opacity=".85"' : ''}>${spotsBajos}</g>` : '') +
        `<g class="jh-hueso ${clase}Zarpa"${og(zx, zy - 4)}>` +
          `<path d="M${zx - wB * 0.95},${zy + 2} Q ${zx - wB * 1.08},${zy + 13} ${zx - wB * 0.6},${zy + 16} Q ${zx},${zy + 20} ${zx + wB * 0.66},${zy + 16} Q ${zx + wB * 1.1},${zy + 12} ${zx + wB * 0.92},${zy + 1} Q ${zx},${zy - 9} ${zx - wB * 0.95},${zy + 2} Z"` +
            ` fill="${lejos ? 'url(#jhPelajeLejos)' : P.flancoLuz}" stroke="${borde}" stroke-width="3.6"/>` +
          `<path d="M${zx - wB * 0.44},${zy + 9} L${zx - wB * 0.44},${zy + 16} M${zx + 1},${zy + 10} L${zx + 1},${zy + 17.5} M${zx + wB * 0.46},${zy + 9} L${zx + wB * 0.46},${zy + 15.5}"` +
            ` stroke="${P.contorno}" stroke-width="2" opacity=".55" fill="none"/>` +
          (lejos ? '' : `<g>${motas([[zx - wB * 0.5, zy - 2, 2.2], [zx + wB * 0.4, zy - 3, 2]])}</g>`) +
        `</g>` +
      `</g>` +
    `</g>`
  );
}

/* ═══════════════════════════ LA PIEL, HUESO A HUESO ════════════════════════ */

const DEFS = `<defs>
  <linearGradient id="jhPelaje" x1="0" y1="45" x2="0" y2="245" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${P.dorsoAlto}"/>
    <stop offset=".13" stop-color="${P.dorso}"/>
    <stop offset=".35" stop-color="${P.cuerpo}"/>
    <stop offset=".6" stop-color="${P.cuerpoLuz}"/>
    <stop offset=".8" stop-color="${P.flancoLuz}"/>
    <stop offset="1" stop-color="${P.vientre}"/>
  </linearGradient>
  <linearGradient id="jhPelajePata" x1="0" y1="215" x2="0" y2="392" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${P.cuerpo}"/>
    <stop offset=".5" stop-color="${P.cuerpoLuz}"/>
    <stop offset="1" stop-color="${P.flancoLuz}"/>
  </linearGradient>
  <linearGradient id="jhPelajeLejos" x1="0" y1="205" x2="0" y2="365" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#9a6c30"/>
    <stop offset=".55" stop-color="#a87834"/>
    <stop offset="1" stop-color="#bd9350"/>
  </linearGradient>
  <linearGradient id="jhCuelloGrad" x1="0" y1="55" x2="0" y2="265" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${P.dorso}"/>
    <stop offset=".3" stop-color="${P.cuerpo}"/>
    <stop offset=".68" stop-color="${P.cuerpoLuz}"/>
    <stop offset="1" stop-color="${P.flancoLuz}"/>
  </linearGradient>
  <radialGradient id="jhCara" cx="80" cy="88" r="120" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#dfa04b"/>
    <stop offset=".45" stop-color="#c9882f"/>
    <stop offset=".8" stop-color="#a86e2c"/>
    <stop offset="1" stop-color="#8a5824"/>
  </radialGradient>
  <radialGradient id="jhIris" cx=".5" cy=".4" r=".65">
    <stop offset="0" stop-color="#fff3c0"/>
    <stop offset=".55" stop-color="${P.iris}"/>
    <stop offset="1" stop-color="${P.irisSombra}"/>
  </radialGradient>
  <linearGradient id="jhCola" x1="545" y1="105" x2="700" y2="270" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${P.cuerpo}"/>
    <stop offset=".55" stop-color="${P.cuerpoLuz}"/>
    <stop offset="1" stop-color="${P.flancoLuz}"/>
  </linearGradient>
  <radialGradient id="jhAura" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.espectral}" stop-opacity=".38"/>
    <stop offset="1" stop-color="${P.espectral}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="jhOjoHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.ojoBrillo}" stop-opacity=".9"/>
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
      <path d="${seg2}" fill="none" stroke="${P.roseta}" stroke-width="22" stroke-linecap="butt" stroke-dasharray="10 12" stroke-dashoffset="-4" opacity=".95"/>
      <g class="jh-hueso jh-colaPunta" style="transform-origin:663px 266px">
        <circle cx="663" cy="266" r="9" fill="url(#jhCola)"/>
        <path d="${seg3}" fill="none" stroke="${P.contorno}" stroke-width="23" stroke-linecap="round"/>
        <path d="${seg3}" fill="none" stroke="url(#jhCola)" stroke-width="17.5" stroke-linecap="round"/>
        <path d="${seg3}" fill="none" stroke="${P.roseta}" stroke-width="18" stroke-linecap="butt" stroke-dasharray="9 10" opacity=".95"/>
        <circle cx="688" cy="226" r="10.5" fill="${P.roseta}"/>
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
  <path d="${TRONCO_PATH}" fill="url(#jhPelaje)" stroke="${P.contorno}" stroke-width="4"/>
  <path d="M248,58 C 300,44 380,42 452,56 C 496,63 534,72 554,84 C 500,68 420,60 350,64 C 308,66 272,70 250,76 Z"
    fill="${P.dorsoAlto}" opacity=".5"/>
  <path d="M270,250 C 310,242 380,240 450,242 C 400,248 330,249 296,247 C 282,246 274,252 270,250 Z"
    fill="${P.vientre}" opacity=".9"/>
  <g fill="none" stroke="${P.contorno}" stroke-width="2" opacity=".2" stroke-linecap="round">
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
  ${roseta(276, 92, 1.15, 14, 0)}${roseta(322, 82, 1.25, -8, 1)}${roseta(370, 78, 1.3, 3, 0)}
  ${roseta(420, 82, 1.25, 12, 1)}${roseta(468, 92, 1.15, 22, 0)}${roseta(514, 106, 1.05, 34, 1)}
  ${roseta(258, 132, 1.05, -18, 1)}${roseta(302, 124, 1.2, 6, 0)}${roseta(350, 120, 1.28, -5, 1)}
  ${roseta(400, 122, 1.25, 8, 0)}${roseta(448, 130, 1.15, 16, 1)}${roseta(496, 142, 1.05, 28, 2)}
  ${roseta(542, 128, 0.95, 40, 2)}${roseta(560, 160, 0.9, 60, 2)}
  ${roseta(282, 170, 1.1, -12, 0)}${roseta(330, 172, 1.2, 4, 1)}${roseta(380, 172, 1.22, -6, 0)}
  ${roseta(428, 176, 1.12, 10, 1)}${roseta(474, 182, 1.02, 20, 2)}${roseta(520, 192, 0.92, 36, 2)}
  ${roseta(300, 212, 0.85, -8, 2)}${roseta(348, 216, 0.9, 5, 2)}${roseta(396, 218, 0.85, -5, 2)}
  ${roseta(444, 220, 0.8, 8, 2)}${roseta(488, 220, 0.75, 15, 2)}
  ${motas([[254, 100, 3.8], [252, 160, 3.6], [300, 148, 3.8], [352, 146, 3.6], [404, 150, 3.8], [452, 156, 3.6], [498, 168, 3.4], [546, 186, 3.4], [326, 96, 3.4], [396, 100, 3.6], [444, 108, 3.4], [490, 118, 3.4], [272, 196, 3.6], [320, 194, 3.4], [372, 196, 3.6], [420, 198, 3.4], [466, 202, 3.2], [510, 216, 3.2], [536, 216, 3.2], [560, 196, 3.2], [286, 122, 3.2], [340, 118, 3], [390, 120, 3.2], [438, 128, 3], [482, 140, 3], [308, 176, 3], [358, 178, 3], [408, 180, 3], [456, 184, 3], [304, 226, 3], [356, 228, 3], [408, 230, 3], [458, 228, 2.8], [530, 240, 2.8]])}
  <!-- blotches del vientre -->
  <g fill="${P.roseta}" opacity=".92">
    <ellipse cx="316" cy="234" rx="6.5" ry="3.4"/>
    <ellipse cx="366" cy="236" rx="7" ry="3.6"/>
    <ellipse cx="418" cy="238" rx="6.5" ry="3.4"/>
    <ellipse cx="468" cy="238" rx="5.5" ry="3"/>
    <ellipse cx="512" cy="236" rx="5" ry="2.8"/>
  </g>`;

/* ── PECHO/BABERO (parte del tronco, entre las patas delanteras): crema
      profundo con las barras negras del grabado ── */
const PECHO = `
  <path d="M212,204 C 204,230 203,262 210,292 C 216,312 226,324 238,328 C 251,330 260,320 262,304 C 263,283 258,254 249,230 C 242,211 231,199 221,198 C 217,198 213,200 212,204 Z"
    fill="${P.blancoPelaje}" stroke="${P.contorno}" stroke-width="3.4"/>
  <g fill="none" stroke="${P.roseta}" stroke-width="5.5" stroke-linecap="round" opacity=".92">
    <path d="M211,226 C 222,230 233,238 243,248"/>
    <path d="M208,252 C 219,258 232,268 242,280"/>
    <path d="M210,278 C 219,284 231,294 240,306"/>
    <path d="M218,302 C 226,308 233,315 240,321"/>
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
  <!-- garganta clara bajo el cachete -->
  <path d="M158,210 C 172,232 190,248 210,254 C 198,262 182,260 170,250 C 160,240 156,226 158,210 Z" fill="${P.blancoPelaje}" opacity=".8"/>
  <!-- nuca y cuello: motas densas de la lámina -->
  ${motas([[176, 92, 4], [200, 84, 4.2], [224, 86, 4], [244, 96, 3.6], [170, 120, 4], [196, 116, 4.2], [222, 118, 4], [244, 128, 3.6], [180, 150, 4.2], [206, 148, 4], [232, 154, 3.6], [190, 180, 4], [214, 182, 3.6], [236, 186, 3.4], [200, 212, 3.6], [222, 216, 3.4], [160, 104, 3.4], [156, 140, 3.4], [172, 168, 3.4], [246, 152, 3.2], [188, 132, 3]])}
  ${roseta(212, 132, 0.7, 18, 2)}${roseta(232, 170, 0.65, -12, 2)}`;

/* ── CABEZA: cráneo ¾ hacia cámara (la pose de la lámina), calzado al calco ── */
const CABEZA = (() => {
  return `
  <!-- orejas: DETRÁS del cráneo, articuladas en su base -->
  <g class="jh-hueso jh-orejaI" style="transform-origin:32px 62px">
    <path d="M12,68 C 6,50 13,30 30,20 C 42,30 49,46 49,62 C 37,71 22,72 12,68 Z"
      fill="${P.oreja}" stroke="${P.contorno}" stroke-width="3.4"/>
    <path d="M19,61 C 17,48 23,35 33,28 C 40,37 44,49 43,58 C 35,65 26,64 19,61 Z" fill="${P.orejaInterior}"/>
    <path d="M25,56 L29,41 M32,57 L35,46" stroke="${P.contorno}" stroke-width="1.6" opacity=".5"/>
  </g>
  <g class="jh-hueso jh-orejaD" style="transform-origin:132px 62px">
    <path d="M108,62 C 108,43 118,26 136,19 C 151,29 158,50 155,67 C 140,75 121,71 108,62 Z"
      fill="${P.oreja}" stroke="${P.contorno}" stroke-width="3.4"/>
    <path d="M117,57 C 119,44 126,33 136,27 C 145,36 149,49 147,59 C 137,65 126,62 117,57 Z" fill="${P.orejaInterior}"/>
  </g>
  <!-- el CRÁNEO: cubre el casquete del atlas con margen sobrado -->
  <path d="M58,24 C 74,13 98,12 114,21 C 136,32 152,54 159,80 C 165,105 164,130 156,150 C 149,167 139,180 127,189 C 114,198 98,201 85,198 C 71,195 60,187 52,175 C 40,158 28,136 23,113 C 18,90 22,62 34,44 C 41,35 49,29 58,24 Z"
    fill="url(#jhCara)" stroke="${P.contorno}" stroke-width="4"/>
  <!-- ruff de mejilla: tufos que rompen la silueta (pelaje, no globo) -->
  <path d="M50,150 L40,157 L49,161 L38,169 L48,172 L42,181 L53,181 C 56,175 58,167 58,160 C 56,155 54,152 50,150 Z"
    fill="${P.blancoPelaje}" stroke="#6a4520" stroke-width="2" stroke-linejoin="round" opacity=".95"/>
  <!-- bajo-rostro claro: funde los cachetes con la cara (la lámina es pálida abajo) -->
  <path d="M36,120 C 48,112 66,110 84,114 C 104,116 122,124 134,136 C 138,150 134,166 126,178 C 112,190 94,196 78,192 C 60,188 46,176 40,160 C 36,146 34,132 36,120 Z"
    fill="${P.blancoPelaje}" opacity=".28"/>
  <!-- corona oscura (el castaño del casco craneal en la lámina) -->
  <path d="M58,24 C 74,13 98,12 114,21 C 126,27 137,37 145,50 C 128,40 106,34 86,34 C 68,34 52,40 40,50 C 45,39 50,30 58,24 Z"
    fill="${P.dorso}" opacity=".62"/>
  <g fill="${P.roseta}">
    <ellipse cx="72" cy="20" rx="4" ry="2.2"/><ellipse cx="88" cy="17" rx="4.5" ry="2.4"/>
    <ellipse cx="104" cy="20" rx="4" ry="2.2"/><ellipse cx="80" cy="27" rx="3.4" ry="2"/>
    <ellipse cx="96" cy="27" rx="3.4" ry="2"/>
  </g>
  <!-- frente y sienes: motas del grabado -->
  ${motas([[64, 34, 3], [82, 28, 3.2], [100, 32, 3], [56, 48, 2.8], [74, 44, 2.8], [92, 44, 2.8], [110, 46, 3], [124, 56, 3], [136, 70, 3], [30, 76, 2.8], [26, 96, 3], [146, 90, 3.2], [150, 112, 3], [32, 116, 3], [142, 134, 2.8], [40, 136, 2.8], [128, 152, 2.8], [50, 154, 2.6], [118, 96, 2.6], [130, 110, 2.6], [36, 96, 2.6]])}
  <!-- entrecejo oscuro entre los ojos -->
  <path d="M62,66 C 72,60 88,58 100,62 C 104,72 104,82 100,90 C 92,86 78,86 66,90 C 62,82 61,73 62,66 Z"
    fill="#8a5824" opacity=".55"/>
  <!-- puente nasal -->
  <path d="M74,88 C 80,86 92,86 97,89 C 96,102 94,114 92,124 C 86,126 80,126 77,124 C 76,112 75,100 74,88 Z"
    fill="#a86e2c" opacity=".85"/>
  <!-- MEJILLAS/MORRO claros con puntos de vibrisas -->
  <path d="M46,132 C 50,122 62,117 74,121 C 81,125 85,132 85,141 C 85,152 79,161 70,165 C 60,168 50,163 46,154 C 43,146 44,138 46,132 Z"
    fill="${P.blancoPelaje}" stroke="${P.contorno}" stroke-width="2.6"/>
  <path d="M88,142 C 89,131 98,124 111,126 C 123,129 130,138 129,149 C 127,159 120,166 109,167 C 98,167 90,161 88,151 C 87,148 87,145 88,142 Z"
    fill="${P.blancoPelaje}" stroke="${P.contorno}" stroke-width="2.6"/>
  <g fill="${P.roseta}">
    <circle cx="54" cy="138" r="1.5"/><circle cx="62" cy="146" r="1.5"/><circle cx="52" cy="152" r="1.4"/>
    <circle cx="102" cy="142" r="1.5"/><circle cx="111" cy="150" r="1.5"/><circle cx="118" cy="140" r="1.4"/>
    <circle cx="67" cy="135" r="1.3"/><circle cx="96" cy="152" r="1.3"/>
  </g>
  <!-- TRUFA -->
  <path d="M77,126 C 82,123 93,123 98,126 C 98,135 92,142 87,144 C 82,142 77,135 77,126 Z"
    fill="${P.trufa}"/>
  <path d="M82,131 C 84,134 86,135 87,135 M93,131 C 91,134 89,135 87,135" stroke="#120a05" stroke-width="1.5" fill="none"/>
  <!-- vibrisas -->
  <g fill="none" stroke="${P.vibrisa}" stroke-width="1.6" stroke-linecap="round" opacity=".9">
    <path d="M50,144 C 33,141 16,142 2,147"/>
    <path d="M52,151 C 36,152 20,156 8,163"/>
    <path d="M56,157 C 43,162 31,169 22,176"/>
    <path d="M116,146 C 130,145 144,148 156,154"/>
    <path d="M114,153 C 128,156 140,162 150,169"/>
  </g>
  <!-- filtrum y boca cerrada: apenas una línea (como la lámina) -->
  <path d="M87,144 L87,151" stroke="${P.contorno}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- FAUCES reales (el bonus del vector), DETRÁS de la mandíbula -->
  <g class="jh-fauces">
    <path d="M70,152 C 79,157 95,157 104,152 C 102,167 96,176 87,176 C 78,176 72,167 70,152 Z" fill="${P.boca}"/>
    <path d="M75,159 C 81,163 93,163 99,159 C 96,169 92,173 87,173 C 82,173 78,167 75,159 Z" fill="${P.lengua}"/>
    <path d="M72,152 L76,163 L80,153 Z M102,152 L98,163 L94,153 Z" fill="${P.colmillo}" stroke="${P.contorno}" stroke-width="1"/>
  </g>
  <!-- MANDÍBULA (hueso): mentón chico EN SOMBRA bajo el morro (la lámina casi
       no lo muestra); cerrada TAPA las fauces; rota en la charnela al hablar -->
  <g class="jh-hueso jh-mandibula" style="transform-origin:87px 149px">
    <path d="M68,150 C 76,155 98,155 106,150 C 107,162 102,173 95,178 C 90,182 84,182 79,178 C 72,173 67,162 68,150 Z"
      fill="#e9d8b2" stroke="#4a2c12" stroke-width="2.2"/>
  </g>
  <!-- OJOS ámbar que BRILLAN (grandes e intensos, como la lámina) -->
  <g class="jh-ojoGrupo">
    <circle class="jh-ojoHalo" cx="47" cy="78" r="16" fill="url(#jhOjoHalo)"/>
    <circle class="jh-ojoHalo" cx="114" cy="79" r="19" fill="url(#jhOjoHalo)"/>
    <g class="jh-ojo">
      <path d="M34,77 C 38,68 48,65 56,68 C 61,73 62,82 58,87 C 51,91 41,90 36,85 C 34,82 33,79 34,77 Z"
        fill="${P.roseta}"/>
      <circle cx="46.5" cy="77.5" r="8" fill="url(#jhIris)"/>
      <ellipse class="jh-pupila" cx="46.5" cy="78" rx="2.9" ry="4.4" fill="${P.pupila}"/>
      <path class="jh-parpado" style="transform-origin:46px 65px" d="M33,68 C 40,63 54,62 60,68 C 62,74 61,84 58,88 C 50,92 40,91 35,86 C 32,81 31,73 33,68 Z" fill="#b57a32"/>
      <path d="M33,69 C 40,64 54,63 60,69" fill="none" stroke="${P.roseta}" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <g class="jh-ojo">
      <path d="M101,77 C 105,66 116,63 125,66 C 131,72 132,83 128,89 C 120,94 108,92 103,86 C 101,83 100,79 101,77 Z"
        fill="${P.roseta}"/>
      <circle cx="114" cy="78" r="10.5" fill="url(#jhIris)"/>
      <ellipse class="jh-pupila" cx="114" cy="79" rx="3.6" ry="5.4" fill="${P.pupila}"/>
      <path class="jh-parpado" style="transform-origin:114px 62px" d="M100,66 C 108,60 122,59 130,66 C 133,73 132,84 128,89 C 119,94 106,92 101,85 C 98,79 98,71 100,66 Z" fill="#b57a32"/>
      <path d="M100,67 C 108,61 122,60 130,67" fill="none" stroke="${P.roseta}" stroke-width="2.4" stroke-linecap="round"/>
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
        ${pata({ clase: 'jh-pataTrasCerca', hombro: H.pataTrasCerca, codo: H.rodillaTrasCerca, zarpa: [552, 344], anchoAlto: 74, anchoBajo: 34, spots: `${roseta(518, 258, 1.05, 30, 2)}${roseta(546, 288, 0.9, -20, 2)}${motas([[546, 248, 5.4], [528, 280, 4.8], [556, 268, 4.6], [514, 292, 4.2]])}`, spotsBajos: motas([[558, 310, 4.6], [551, 324, 4.2], [559, 336, 3.8]]) })}
        ${PECHO}
        ${pata({ clase: 'jh-pataDelCerca', hombro: H.pataDelCerca, codo: H.codoDelCerca, zarpa: [240, 372], anchoAlto: 50, anchoBajo: 36, curvaAlta: 0.2, spots: motas([[248, 244, 6], [226, 260, 5.4], [250, 278, 5.2], [230, 294, 4.8], [244, 262, 4]]), spotsBajos: motas([[241, 314, 4.8], [231, 330, 4.4], [247, 342, 4.2], [235, 356, 3.6]]) })}
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

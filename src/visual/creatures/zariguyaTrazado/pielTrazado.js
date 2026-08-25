/*
 * pielTrazado — EXPERIMENTO "AUTO-TRAZADO RIGGEADO": la lámina de la
 * zarigüeya vectorizada AUTOMÁTICAMENTE (vtracer, ver generar-calco.mjs) y
 * montada sobre el MISMO esqueleto de huesos de `zariguyaHuesos/` — la
 * técnica que puede reemplazar el redibujo a mano en todos los compais.
 *
 * POR QUÉ. Redibujar la lámina a mano en SVG pierde la belleza. El
 * auto-trazado conserva el grabado (1911 paths tras svgo, el pelo de
 * plumilla intacto), pero sale PLANO: un solo dibujo sin articulaciones.
 * Aquí se le pone el esqueleto ENCIMA sin tocar un solo path del calco:
 *
 *   1. El calco entra UNA vez en <defs> como <g id="ztCalco">.
 *   2. Cada hueso es <g class="zh-hueso …" style="transform-origin:PIVOTE">
 *      con un <use href="#ztCalco" clip-path="url(#zt-r-…)"> — la región
 *      anatómica de ESE hueso, medida en el mismo espacio 481×444 de la
 *      lámina (pivotes/cortes de zariguyaLamina/anatomia.js, refinados a
 *      ojo con la vista ?vista=regiones del arnés).
 *   3. ANTI-COSTURA (la regla de la casa, adaptada al calco): todo casquete
 *      o respaldo se pinta ANTES del hueso hijo y se RECORTA A LA REGIÓN
 *      ESTÁTICA del hijo. En reposo queda 100% oculto bajo los píxeles
 *      opacos del trazado (cero color inventado visible = cero pérdida de
 *      fidelidad); al rotar el hijo, la franja que éste desocupa revela el
 *      casquete — nunca un hueco a la página.
 *
 * La CADENCIA es la misma `zariguyaHuesos.css` canónica (copiada intacta de
 * la rama fable/zariguya-huesos): relojes co-primos, marcha bípeda, 70/30
 * Miss Minutes. Este módulo solo reproduce la JERARQUÍA y las CLASES que esa
 * CSS espera. Los ids `zhBoilSuave`/`zhBoil` se conservan porque la CSS los
 * referencia por url(#…).
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three),
 * igual que pielHuesos.js: lo consumen React, HTML plano y el valle 3D.
 */

import { RH_LINE_BOIL } from '../rubberhoseSpec.js';
import { CALCO_TRAZADO } from './calcoTrazado.js';

/* ── PIVOTES (px del espacio 481×444 de la lámina) ──────────────────────────
   Fuente: zariguyaLamina/anatomia.js (medidos sobre la lámina con grilla y
   lupas) + los de cadena fina de zariguyaHuesos/pielHuesos.js donde
   anatomia no articula (rodilla, cola en 3 tramos). */
export const ZT_PIVOTES = Object.freeze({
  columna: [245, 290],      // centro de masa del tronco erguido (MEDIDO)
  cuello: [215, 155],       // base del cuello sobre el pecho
  cabeza: [202, 126],       // atlas: donde el cráneo articula (borde 128/110)
  mandibula: [148, 70],     // comisura-bisagra ALTA izquierda (la sonrisa sube)
  orejaI: [130, 48],
  orejaD: [245, 44],
  brazoLapiz: [150, 210],   // hombro del brazo alzado (funde al pecho ahí)
  munecaLapiz: [98, 182],   // muñeca: el antebrazo entra a la manita
  brazoBrujula: [200, 212], // hombro/codo del brazo de la brújula
  piernaCerca: [300, 328],  // cadera del muslazo
  rodillaCerca: [314, 384], // rodilla (el quiebre muslo/canilla medido)
  piernaLejos: [196, 358],  // cadera oculta de la pata lejana
  colaBase: [360, 348],     // raíz: la cola nace en la grupa (336-355)
  colaMedia: [436, 350],    // corte base/media sobre el arco de abajo
  colaPunta: [456, 262],    // corte media/punta donde arranca la columna
});

/* ── LAS REGIONES DE CLIP (polígonos, px de lámina) ─────────────────────────
   Cortes por los cauces documentados: la recta del cuello (140,206)→(300,154)
   de CABEZA.cuello; el canal medido bigotes/lápiz (x 84-93); el corte de
   cola x≈352; las cajas de orejas con la banda de RESPALDO doble-pintada
   (anatomia.baseSub: la base de la oreja vive en cabeza Y en oreja — al
   girar ±3° la oreja resbala sobre su propia copia, sin hueco).
   Donde el borde pasa por AIRE la región es generosa a propósito: recortar
   aire es gratis; solo los bordes que CRUZAN píxeles se afinan. */
export const ZT_REGIONES = Object.freeze({
  /* MEDIDO por píxeles (pixel-probe.html sobre el propio calco):
     boca x 149-231 y 64-108 (comisura alta izq ≈ (149,68), colmillo superior
     218-231/86-104), ojos ≈ (156,74)/(246,72), mejilla-bigotes hasta y≈188,
     manita+lápiz (0-99, 122-222), brújula+manita (88-200, 225-300), espalda
     alta hasta (300,~100), grupa a x≈364, pata lejana (144-227, 370-412),
     pie cercano (273-343, 385-441), cola: gancho y 228-264 · columna
     x 446-480 y 262-337 · arco y 343-368. */
  cabeza: [
    [96, 28], [164, 28], [164, -8], [216, -8], [216, 26], [274, 26],
    [274, -8], [316, -8], [316, 110], [306, 118], [294, 126], [280, 132],
    [264, 136], [250, 136], [246, 130], [246, 80], [236, 80], [236, 106],
    [212, 106], [212, 84], [144, 84], [144, 128], [140, 134], [134, 150],
    [126, 168], [116, 182], [106, 187], [97, 180], [93, 168], [92, 152],
    [84, 149], [72, 143], [67, 133], [74, 124], [85, 118], [91, 110],
    [92, 88], [94, 56],
  ],
  cuello: [
    [144, 126], [246, 126], [246, 128], [250, 134], [264, 134], [280, 130],
    [294, 124], [306, 116], [316, 108], [316, 120], [300, 134], [286, 146],
    [272, 158], [256, 168], [238, 176], [218, 180], [196, 178], [176, 172],
    [160, 162], [150, 148], [142, 136],
  ],
  mandibula: [
    [144, 82], [212, 82], [212, 104], [236, 104], [236, 78], [246, 78],
    [246, 128], [144, 128],
  ],
  orejaI: [[94, -6], [166, -6], [166, 54], [94, 54]],
  orejaD: [[214, -6], [276, -6], [276, 50], [214, 50]],
  brazoLapiz: [
    [0, 206], [0, 180], [8, 162], [18, 146], [30, 134], [44, 126],
    [58, 122], [72, 122], [84, 128], [92, 140], [97, 154], [99, 170],
    [102, 182], [112, 192], [126, 200], [140, 208], [154, 214], [166, 222],
    [172, 232], [168, 244], [156, 250], [140, 246], [124, 238], [108, 230],
    [92, 226], [76, 226], [58, 226], [40, 224], [20, 218],
  ],
  manoLapiz: [
    [0, 206], [0, 180], [8, 162], [18, 146], [30, 134], [44, 126],
    [58, 122], [72, 122], [84, 128], [92, 140], [97, 154], [99, 170],
    [97, 186], [92, 200], [82, 212], [68, 220], [52, 222], [34, 220],
    [16, 214],
  ],
  brazoBrujula: [
    [84, 262], [86, 242], [96, 228], [112, 220], [132, 216], [152, 214],
    [168, 210], [186, 204], [204, 200], [216, 204], [220, 214], [214, 226],
    [202, 234], [196, 244], [198, 262], [192, 280], [178, 294], [158, 302],
    [136, 300], [114, 292], [96, 280],
  ],
  piernaCerca: [
    [248, 316], [266, 302], [292, 296], [318, 298], [334, 310], [338, 322],
    [338, 384], [344, 394], [344, 438], [316, 446], [276, 444], [258, 432],
    [248, 404], [242, 360],
  ],
  piernaCercaBaja: [
    [258, 390], [336, 384], [342, 396], [342, 441], [300, 448], [266, 444],
    [254, 430], [252, 406],
  ],
  piernaLejos: [[136, 348], [232, 348], [232, 418], [136, 418]],
  colaBase: [
    [330, 320], [396, 320], [396, 336], [440, 336], [430, 352], [430, 378],
    [330, 378],
  ],
  colaMedia: [
    [440, 262], [486, 262], [486, 380], [430, 378], [430, 352], [440, 336],
  ],
  colaPunta: [
    [382, 218], [486, 218], [486, 262], [440, 262], [440, 268], [410, 284],
    [388, 278], [382, 250],
  ],
  /* El tronco. Borde ALTO = borde bajo del cuello (exacto). Envuelve al
     brazo de la brújula con bordes compartidos; retiene copia-respaldo bajo
     el antebrazo del lápiz (ahí el brazo va sobre pecho, no sobre aire).
     NO excluye cola/pata lejana (van DETRÁS: solape = respaldo natural). */
  troncoCuerpo: [
    [142, 134], [150, 146], [160, 160], [176, 170], [196, 176], [218, 178],
    [238, 174], [256, 166], [272, 156], [286, 144], [300, 132], [316, 118],
    [330, 160], [342, 190], [350, 220], [356, 246], [360, 276], [362, 300],
    [366, 316], [358, 328], [350, 340], [344, 354], [338, 370],
    [338, 344], [320, 326], [294, 322], [268, 328], [252, 342], [244, 362],
    [236, 366], [222, 370], [204, 370], [186, 364], [172, 352],
    [162, 336], [158, 316], [160, 296], [158, 302], [178, 294], [192, 280],
    [198, 262], [196, 244], [202, 234], [214, 226], [220, 214], [216, 204],
    [204, 200], [186, 204], [168, 210], [152, 214], [132, 216], [138, 204],
    [140, 190], [141, 176], [142, 160],
  ],
});

const P = Object.freeze({
  pelaje: '#6b5f52',
  penumbra: '#3f342a',
  rodilla: '#4a3d2f',
  hombro: '#5d4f3e',
  pecho: '#e3d7bd',
  cola: '#c9a091',
  colaLuz: '#dcb6a4',
  parpado: '#4f3f2d',
  fauces: '#42130e',
  lengua: '#c05548',
  luna: '#ff9ecb',
  rocio: '#ffd9ec',
  sombraSuelo: 'rgba(40,28,16,0.35)',
});

/* ─────────────────────────── helpers de string ───────────────────────────── */

const H = ZT_PIVOTES;
const origin = (n) => ` style="transform-origin:${H[n][0]}px ${H[n][1]}px"`;
const dPoly = (pts) => `M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`;

const CLIPS = Object.entries(ZT_REGIONES)
  .map(([n, pts]) => `<clipPath id="zt-r-${n}"><path d="${dPoly(pts)}"/></clipPath>`)
  .join('\n  ');

/** Un hueso: <use> del calco recortado a su región. */
const usoCalco = (region) => `<use href="#ztCalco" clip-path="url(#zt-r-${region})"/>`;

/** Casquete/respaldo anti-costura: pintado en el PADRE justo antes del hijo,
    recortado a la región ESTÁTICA del hijo → invisible en reposo, tapa la
    franja que el hijo desocupa al rotar. */
const casquete = (region, forma) => `<g clip-path="url(#zt-r-${region})">${forma}</g>`;

const elipse = (cx, cy, rx, ry, fill, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const disco = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

/* ─────────────────────────────── defs ────────────────────────────────────── */

const DEFS = `<defs>
  <g id="ztCalco">${CALCO_TRAZADO}</g>
  ${CLIPS}
  <linearGradient id="ztCuello" x1="215" y1="140" x2="228" y2="215" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#4e4337"/>
    <stop offset=".45" stop-color="#6b5f50"/>
    <stop offset=".78" stop-color="#b7a88c"/>
    <stop offset="1" stop-color="#eadfc9"/>
  </linearGradient>
  <radialGradient id="ztAura" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.luna}" stop-opacity=".34"/>
    <stop offset=".7" stop-color="${P.rocio}" stop-opacity=".12"/>
    <stop offset="1" stop-color="${P.luna}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ztOjoHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.rocio}" stop-opacity=".8"/>
    <stop offset="1" stop-color="${P.rocio}" stop-opacity="0"/>
  </radialGradient>
  <filter id="ztBlur"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="zhBoilSuave" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="1.5"/>
  </filter>
  <filter id="zhBoil" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${RH_LINE_BOIL.scale}"/>
  </filter>
</defs>`;

/* ── FAUCES: interior hondo + lengua DETRÁS de la mandíbula, recortadas a la
   región estática de la mandíbula (en reposo = tapadas exactas por el mentón
   del calco; al abrir la charnela se revela boca, no hueco). Es el único
   dibujo nuevo del módulo, y vive siempre detrás del trazado. ── */
const FAUCES = casquete('mandibula',
  `<rect x="142" y="80" width="94" height="50" fill="${P.fauces}"/>` +
  `<path d="M172,100 C 188,112 210,114 228,105 C 224,118 208,124 192,122 C 180,120 174,111 172,100 Z" fill="${P.lengua}"/>`);

/* ── PÁRPADOS: bisagra arriba, scaleY(.12) en reposo (una pestañita), la CSS
   canónica los cierra con el blink irregular. Ojos MEDIDOS de la lámina:
   (184,76) r20 y (242,73) r20 (anatomia.OJO / OJO_2). ── */
const PARPADOS = `
  <path class="zh-parpado" style="transform-origin:156px 61px"
    d="M143,63 C 149,56 164,56 169,64 C 171,71 170,80 165,85 C 158,89 149,88 145,82 C 141,75 141,68 143,63 Z" fill="${P.parpado}"/>
  <path class="zh-parpado" style="transform-origin:246px 60px"
    d="M234,62 C 239,55 253,55 258,63 C 260,69 259,78 255,83 C 249,87 240,86 236,80 C 233,73 233,66 234,62 Z" fill="${P.parpado}"/>`;

/* halos nocturnos: apagados en reposo (opacity:0 inline — que la lámina sea
   la lámina); el modo actuando los enciende desde la CSS canónica. */
const HALOS = `
  <circle class="zh-ojoHalo" style="opacity:0" cx="156" cy="74" r="17" fill="url(#ztOjoHalo)"/>
  <circle class="zh-ojoHalo" style="opacity:0" cx="246" cy="72" r="15" fill="url(#ztOjoHalo)"/>`;

/* ─────────────────────── LA CABEZA (con sus satélites) ───────────────────── */

const CABEZA = `
  ${usoCalco('cabeza')}
  ${FAUCES}
  <g class="zh-hueso zh-mandibula"${origin('mandibula')}>${usoCalco('mandibula')}</g>
  <g class="zh-hueso zh-orejaI"${origin('orejaI')}>${usoCalco('orejaI')}</g>
  <g class="zh-hueso zh-orejaD"${origin('orejaD')}>${usoCalco('orejaD')}</g>
  <g class="zh-ojoGrupo">${HALOS}${PARPADOS}</g>`;

/* ─────────────────────────── EL SVG COMPLETO ─────────────────────────────── */

/**
 * El markup del experimento. Mismo contrato que ZARIGUYA_HUESOS_SVG: el host
 * pone data-agt-estado / data-modo / data-vida / --zh-jaw en la raíz y la
 * CSS canónica (`zariguyaHuesos.css`) pone la cadencia.
 */
export const ZARIGUYA_TRAZADO_SVG = `<svg class="zariguyaHuesos" viewBox="-30 -25 545 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Zarigüeya">
${DEFS}
<g class="zh-pj">
  <ellipse class="zh-aura" cx="240" cy="230" rx="290" ry="265" fill="url(#ztAura)"/>
  <g class="zh-masa">
    <g class="zh-antic"${origin('columna')}>
      <ellipse class="zh-sombraSuelo" cx="245" cy="438" rx="150" ry="11" fill="${P.sombraSuelo}" filter="url(#ztBlur)"/>
      <g class="zh-hueso zh-cuerpo"${origin('columna')}>
        <g class="zh-hueso zh-piernaLejos"${origin('piernaLejos')}>${usoCalco('piernaLejos')}</g>
        ${casquete('colaBase', disco(H.colaBase[0], H.colaBase[1], 12, P.cola))}
        <g class="zh-hueso zh-colaBase"${origin('colaBase')}>
          ${usoCalco('colaBase')}
          ${casquete('colaMedia', disco(H.colaMedia[0], H.colaMedia[1], 11, P.cola))}
          <g class="zh-hueso zh-colaMedia"${origin('colaMedia')}>
            ${usoCalco('colaMedia')}
            ${casquete('colaPunta', disco(H.colaPunta[0], H.colaPunta[1], 8, P.colaLuz))}
            <g class="zh-hueso zh-colaPunta"${origin('colaPunta')}>${usoCalco('colaPunta')}</g>
          </g>
        </g>
        ${usoCalco('troncoCuerpo')}
        ${casquete('piernaCerca', elipse(298, 344, 38, 46, P.penumbra))}
        <g class="zh-hueso zh-piernaCerca"${origin('piernaCerca')}>
          ${usoCalco('piernaCerca')}
          ${casquete('piernaCercaBaja', disco(H.rodillaCerca[0], H.rodillaCerca[1], 13, P.rodilla))}
          <g class="zh-hueso zh-piernaCercaBaja"${origin('rodillaCerca')}>${usoCalco('piernaCercaBaja')}</g>
        </g>
        ${casquete('brazoBrujula', elipse(204, 212, 13, 10, P.hombro) + elipse(178, 262, 18, 22, P.pecho))}
        <g class="zh-hueso zh-brazoBrujula"${origin('brazoBrujula')}>${usoCalco('brazoBrujula')}</g>
        ${casquete('brazoLapiz', elipse(150, 214, 16, 12, P.hombro))}
        <g class="zh-hueso zh-brazoLapiz"${origin('brazoLapiz')}>
          ${usoCalco('brazoLapiz')}
          ${casquete('manoLapiz', disco(H.munecaLapiz[0], H.munecaLapiz[1], 10, P.pelaje))}
          <g class="zh-hueso zh-brazoLapizAnte zh-manoLapiz"${origin('munecaLapiz')}>${usoCalco('manoLapiz')}</g>
        </g>
        ${casquete('cuello', elipse(218, 158, 46, 18, 'url(#ztCuello)', -8))}
        <g class="zh-hueso zh-cuello"${origin('cuello')}>
          ${usoCalco('cuello')}
          ${casquete('cabeza', elipse(212, 124, 60, 22, 'url(#ztCuello)', -7))}
          <g class="zh-hueso zh-cabezaGiro"${origin('cabeza')}>
            <g class="zh-hueso zh-cabeza"${origin('cabeza')}>
              ${CABEZA}
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</g>
</svg>`;

export default ZARIGUYA_TRAZADO_SVG;

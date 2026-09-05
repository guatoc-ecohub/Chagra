/*
 * pielTrazado — ZARIGÜEYA AUTO-TRAZADA RIGGEADA: la lámina Gemini hero
 * (`public/compai/laminas/zariguya-gemini-hero.png`, la que el operador
 * ELIGIÓ) vectorizada AUTOMÁTICAMENTE con la RECETA DEL JAGUAR
 * (scripts/trazar-lamina.sh: alfa aplanado sobre papel → vtracer stacked
 * spline cp8 speckle2 gs8 → clip de silueta del alfa → svgo → ver
 * generar-calco.mjs) y montada sobre el MISMO esqueleto de huesos de
 * `zariguyaHuesos.css`, articulada por CLIP-REGIONES (regiones.js).
 * Estructura IDÉNTICA a `jaguarTrazado/pielTrazado.js`.
 *
 * HISTORIA (por qué esta y no otra). El calco fue raster (el PNG embebido
 * como <image>, 2026-08-26) porque los primeros trazados salieron con borde
 * gordo y "gorro": AUDITORIA-ZARIGUYA-COMPAI-2026-08-25 encontró la causa —
 * se trazó con speckle 4 SIN aplanar el alfa, y el casquete anti-costura
 * era una elipse de color plano. El redibujo a mano también se rechazó
 * ("pierde la belleza"). Este módulo aplica la receta que SÍ funcionó en el
 * jaguar, sin improvisar un parámetro:
 *
 *   1. El calco entra UNA vez en <defs>, PARTIDO POR REGIÓN de hueso:
 *      <g id="ztCalco-REGION" clip-path="url(#ztSilueta)"> con SOLO los
 *      paths que rozan esa región (calcoTrazado.js, horneado) — perf: un
 *      <use> por hueso renderiza ~1/9 de la geometría, no los 3219 paths.
 *   2. Cada hueso es <g class="zh-hueso …" style="transform-origin:PIVOTE">
 *      con un <use href="#ztCalco-REGION" clip-path="url(#zt-r-REGION)">
 *      — la región anatómica de ESE hueso, MEDIDA sobre esta misma lámina
 *      (481×444; pivotes/polígonos en regiones.js, sin re-medir).
 *   3. ANTI-COSTURA (regla de la casa): todo casquete o respaldo se pinta
 *      ANTES del hueso hijo y se RECORTA A LA REGIÓN ESTÁTICA del hijo ∩ la
 *      SILUETA del calco. 🔴 EL CASQUETE ES EL CALCO (casqueteCalco): una
 *      copia estática del propio trazado — en reposo queda 100% oculto bajo
 *      el hueso; al rotar el hijo, la franja que desocupa revela PELAJE
 *      REAL, nunca un hueco a la página ni un parche de color plano (la
 *      elipse plana leía como gorro/kipá: prohibida).
 *   4. La única tinta NUEVA del módulo es el interior de la boca (FAUCES,
 *      detrás de la mandíbula) y la pupila del ojo cercano (cirugía aprobada
 *      2026-08-27). Cero bigotes redibujados: los que sobreviven al trazado
 *      son los de la lámina.
 *
 * La CADENCIA es la misma `zariguyaHuesos.css` canónica (intacta): relojes
 * co-primos, marcha bípeda, 70/30 Miss Minutes. Este módulo solo reproduce
 * la JERARQUÍA y las CLASES que esa CSS espera. Los ids `zhBoilSuave`/
 * `zhBoil` se conservan porque la CSS los referencia por url(#…).
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three),
 * igual que pielHuesos.js: lo consumen React, HTML plano y el valle 3D.
 */

import { RH_LINE_BOIL } from '../rubberhoseSpec.js';
import {
  CALCO_SILUETA_DEFS, CALCO_POR_REGION, CALCO_CORONILLA, CALCO_CORONILLA_OFFSET, CALCO_CORONILLA_SCALE,
} from './calcoTrazado.js';
import { ZT_PIVOTES, ZT_REGIONES } from './regiones.js';
import { POSES_TRAZADO_CAPA } from './posesTrazado.js';

export { ZT_PIVOTES, ZT_REGIONES };

/* PALETA MÍNIMA — solo lo que NO puede salir de la lámina (interior de boca,
   luz nocturna, sombra al suelo). REGLA 2026-08-26 (spec zariguya-tinta):
   NINGÚN color sintético como respaldo de juntura — los respaldos son COPIA
   DEL CALCO (casqueteCalco); los discos/elipses/gradientes de respaldo se
   veían como parches a través de la tinta y sobre el aire (kipá, manchas
   rosa en la cola, blob en el hombro — focos medidos por pixel-diff). */
const P = Object.freeze({
  parpado: '#564c3e',       // ANTIFAZ oscuro MUESTREADO de la lámina (medias
                            // de (162-192,58-72)/(230-260,48-60)): el párpado
                            // cubre el OJO/antifaz al cerrar — un tono claro
                            // ahí se veía como parche gris a media-parpadeo
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

/* El calco partido por región (perf, patrón jaguar): cada región vive UNA
   vez en <defs> como <g id="ztCalco-REGION" clip-path=silueta> con SOLO sus
   paths — un <use> por hueso renderiza una fracción de la geometría, no el
   calco global. La silueta (clip del canal alfa, potrace) recorta el papel
   aplanado que el trazado trae alrededor de la figura. */
const SILUETA = CALCO_SILUETA_DEFS.replace(/^<defs>/, '').replace(/<\/defs>$/, '');
const CALCO_DEFS = Object.entries(CALCO_POR_REGION)
  .map(([n, ps]) => `<g id="ztCalco-${n}" clip-path="url(#ztSilueta)">${ps}</g>`)
  .join('\n  ');

/** Un hueso: <use> del calco DE SU REGIÓN recortado al polígono exacto. */
const usoCalco = (region) => `<use href="#ztCalco-${region}" clip-path="url(#zt-r-${region})"/>`;

/** Casquete/respaldo anti-costura: pintado en el PADRE justo antes del hijo,
    recortado a la región ESTÁTICA del hijo ∩ LA SILUETA del calco (doble
    clip, patrón jaguar: sin la silueta el casquete asomaría sobre el aire)
    → invisible en reposo, tapa la franja que el hijo desocupa al rotar. Solo
    lo usa FAUCES (el interior de boca es el ÚNICO píxel sintético
    sancionado). */
const casquete = (region, forma) =>
  `<g clip-path="url(#zt-r-${region})"><g clip-path="url(#ztSilueta)">${forma}</g></g>`;

/* ── CASQUETE-CALCO: el respaldo es LA PROPIA LÁMINA ────────────────────────
   Regla dura del spec 2026-08-26: nunca color plano detrás de una juntura —
   a través de la tinta semitransparente y sobre el aire los óvalos/discos se
   leían como parches (la kipá y las manchas rosa, focos MEDIDOS por
   pixel-diff contra la lámina). El respaldo correcto es una copia ESTÁTICA
   del calco recortada a (región del hijo ∩ caja de la juntura ∩ silueta): en
   reposo es píxel-idéntica a lo que tapa (invisible por definición), al
   rotar el hijo la franja que éste desocupa revela PELAJE REAL de la lámina,
   y sobre aire no revela nada (la silueta del alfa lo recorta). La CAJA acota el respaldo a
   la vecindad del corte: sin caja, la copia completa dejaría un FANTASMA del
   miembro entero al moverse (la marcha se vería plantada). `null` = región
   completa (junturas que rotan ≤1°, donde el fantasma es subpíxel).
   La coronilla NO lleva respaldo: es borde de silueta — lo que la cabeza
   desocupa ahí es aire (caja de cabeza arranca en y=56). */
const CAJAS_JUNTURA = Object.freeze({
  cuello: null,
  /* cabeza: SOLO la juntura del cuello (y≥104, bajo los ojos). La caja
     previa (y56-164) incluía OJOS y campo de bigotes: al girar la cabeza la
     copia estática de los ojos asomaba detrás como PARCHE OSCURO en la
     frente (la kipá v5, veredicto del juez) y cada bigote se veía DOBLE
     (= grueso). El techo y=104 deja los ojos (fondo y≈98) fuera; x112/x316
     esquivan los contornos mejilla/nuca contra AIRE (el respaldo borroso de
     esta juntura fugaría un halo sobre el papel). */
  cabeza: [112, 104, 316, 190],
  /* mandibula (2026-09-05, medido): el polígono `cabeza` EXCLUYE el rect de
     la mandíbula y bajo ella no había respaldo. Al girar la cabeza, la
     quijada vacía una cuña de ~10 px que mostraba PAPEL: a +10° (smear del
     double-take) a la IZQUIERDA del pivote, en la comisura (167 px medidos
     en la actual); a −13° (mira a usted) a la DERECHA, bajo el mentón (la
     «raya blanca bajo la mandíbula» del juez). La caja cubre el mentón
     entero bajo los dientes (y≥104). El respaldo NO es el mentón mismo (una
     copia estática del mentón asoma como doble barbilla al girar): es el
     CUELLO del calco subido 16 px — el pelaje que estaría detrás de la
     quijada, ver RESPALDO_TRASLADADO. */
  mandibula: [140, 104, 246, 134],
  brazoLapiz: [116, 176, 204, 244],
  manoLapiz: [76, 158, 122, 208],
  brazoBrujula: null,
  /* piernaCerca: el respaldo cubre TODO el barrido del borde interno del
     muslo (y296-398, no solo la cadera): con la caja corta en y356, el filo
     izquierdo del muslo al volar dejaba una LÍNEA VERTICAL pálida en la
     ingle (veredicto juez marcha v11, confirmado al 350%). */
  piernaCerca: [238, 296, 348, 398],
  piernaCercaBaja: [284, 384, 350, 412],
  piernaCercaPie: [244, 400, 356, 428],
  piernaLejosBaja: [184, 372, 218, 394],
  piernaLejosPie: [160, 380, 190, 416],
  colaBase: [328, 324, 374, 380],
  colaMedia: [422, 334, 450, 382],
  /* colaPunta: SOLO el corte media/punta (y262, x≥444). La caja previa
     (x428-462) respaldaba también TUBO de la punta: al coletear, la copia
     estática + la pieza movida se veían como un TENEDOR/muesca partiendo la
     cola (veredicto juez v8 + zoom 300%). El tubo de la punta es borde de
     silueta: se mueve limpio sobre aire, sin respaldo. */
  colaPunta: [444, 248, 486, 284],
});

const JCLIPS = Object.entries(CAJAS_JUNTURA)
  .filter(([, caja]) => caja)
  .map(([n, [x0, y0, x1, y1]]) =>
    `<clipPath id="zt-j-${n}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></clipPath>`)
  .join('\n  ');

/* Respaldo NÍTIDO por defecto (copia exacta: invisible en reposo por
   definición, y lo revelado al rotar es la textura real). SOLO la juntura de
   la CABEZA va BORROSA (patrón jaguar 2026-08-23): su banda cruza segmentos
   de bigote y pelaje fino — una copia nítida los DOBLA al girar (bigote
   doble = grueso); desenfocada, los dobles se funden en pelaje fuera de
   foco. El borroso NO se generaliza: fuga un halo sobre el papel donde la
   región toca aire (medido: brazo-brújula/cola/mejilla, focos 454/143/133px
   en reposo cuando se aplicó a todo). */
const RESPALDO_BORROSO = Object.freeze(new Set(['cabeza', 'mandibula']));
/* Respaldo TRASLADADO: en vez de la copia estática de la propia región (que
   al girar asoma como un fantasma de la pieza — doble barbilla), la juntura
   se rellena con el calco de OTRA región desplazado: lo que estaría detrás.
   [región fuente, dx, dy] en px de lámina. Sigue siendo el calco: cero
   dibujo nuevo, cero color plano. */
const RESPALDO_TRASLADADO = Object.freeze({
  mandibula: ['cuello', 0, -16], // el pelaje del cuello sube a rellenar bajo la quijada
});
const casqueteCalco = (region) => {
  const caja = CAJAS_JUNTURA[region];
  const filtro = RESPALDO_BORROSO.has(region) ? ' filter="url(#ztRespaldo)"' : '';
  const [fuente, dx, dy] = RESPALDO_TRASLADADO[region] || [region, 0, 0];
  const traslado = dx || dy ? ` transform="translate(${dx} ${dy})"` : '';
  const uso = caja
    ? `<g clip-path="url(#zt-j-${region})"><use href="#ztCalco-${fuente}"${traslado}${filtro}/></g>`
    : `<use href="#ztCalco-${fuente}"${traslado}${filtro}/>`;
  /* el clip de silueta va POR FUERA del blur (patrón jaguar): que el borde
     desenfocado no sangre un halo sobre el papel. */
  return `<g clip-path="url(#zt-r-${region})"><g clip-path="url(#ztSilueta)">${uso}</g></g>`;
};

/* ─────────────────────────────── defs ────────────────────────────────────── */

const DEFS = `<defs>
  <!-- CALCO VECTOR 481×444: la lámina Gemini hero auto-trazada (receta
       jaguar, generar-calco.mjs), silueta del alfa + paths por región. Mismo
       espacio que clip-regiones/pivotes/casquetes: los <use…clip> calzan. -->
  ${SILUETA}
  ${CALCO_DEFS}
  <!-- LA CORONILLA (generar-calco.mjs paso 3): la MISMA receta trazada a 3×
       de resolución y escalada a 1/3. A 1× el ajuste spline se comía el
       rayado fino y dejaba un casco de parches con borde (la kipá,
       bloqueante 2026-09-05); a 3× lo resuelve (RMSE 0,072 → 0,032 contra la
       lámina). Mismo trazo, misma paleta, cero color plano; va ENCIMA del
       calco de la cabeza y se funde a la altura de las cejas (máscara
       y40→54: los ojos arrancan en y≈54 y quedan fuera). -->
  <g id="ztCoronilla" transform="translate(${CALCO_CORONILLA_OFFSET[0]} ${CALCO_CORONILLA_OFFSET[1]}) scale(${CALCO_CORONILLA_SCALE})">${CALCO_CORONILLA}</g>
  <linearGradient id="ztFadeCoronilla" x1="0" y1="40" x2="0" y2="54" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
  </linearGradient>
  <mask id="zt-m-coronilla" maskUnits="userSpaceOnUse" x="85" y="-8" width="255" height="62">
    <rect x="85" y="-8" width="255" height="62" fill="url(#ztFadeCoronilla)"/>
  </mask>
  ${CLIPS}
  ${JCLIPS}
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
  <!-- respaldo de juntura: copia del calco FUERA DE FOCO (ver casqueteCalco) -->
  <filter id="ztRespaldo" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="1.2"/></filter>
  <!-- BOIL suavizado para el calco FINO (operador 2026-08-25): el trazo ahora
       es ~0.5px (2× escalado); el displacement de la spec (1.5 suave / 4.5
       actuando) lo emborronaría hasta engrosar los bigotes. Se baja a 0.9/2.2
       —conserva el temblor rubber-hose, protege la línea fina—. Local a la
       zarigüeya; RH_LINE_BOIL (spec compartida) NO se toca. -->
  <filter id="zhBoilSuave" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="0.9"/>
  </filter>
  <filter id="zhBoil" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="2.2"/>
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
  <path class="zh-parpado" style="transform-origin:175px 62px"
    d="M152,70 C 160,60 190,60 197,70 C 199,79 198,91 191,98 C 181,103 166,102 158,95 C 152,88 150,78 152,70 Z" fill="${P.parpado}"/>
  <path class="zh-parpado" style="transform-origin:246px 52px"
    d="M227,60 C 234,50 258,50 264,60 C 266,70 265,84 258,92 C 249,98 236,97 230,89 C 225,80 224,68 227,60 Z" fill="${P.parpado}"/>`;

/* halos nocturnos: apagados en reposo (opacity:0 inline — que la lámina sea
   la lámina); el modo actuando los enciende desde la CSS canónica. */
const HALOS = `
  <circle class="zh-ojoHalo" style="opacity:0" cx="176" cy="80" r="18" fill="url(#ztOjoHalo)"/>
  <circle class="zh-ojoHalo" style="opacity:0" cx="245" cy="74" r="18" fill="url(#ztOjoHalo)"/>`;

/* ── OJO CERCANO (izq. de la imagen, ancla halo 176,80) — LA cirugía de arte
   aprobada (operador 2026-08-27): el raster Gemini hero dejó ESTE ojo con la
   pupila oscura corrida en MEDIALUNA sobre mucho blanco de esclera → "ojo
   picho": lee como ojo en blanco / desenfocado frente al ojo lejano (nítido,
   con catchlight en espiral). MISMA idea que se probó para el lejano, pero
   ADAPTADA a que este ojo es BLANCO-dominante: NADA de base gris translúcida
   (sobre el blanco se lee como mancha), sólo una pupila redonda DEFINIDA que
   funde el creciente en un disco + catchlight arriba-izquierda (misma luz que
   el ojo lejano). SIN redibujar la lámina ni tocar el resto del arte. Coords
   calco MEDIDAS con grilla GPU-headed (centro del ojo ≈184,76; la pupila funde
   el creciente existente ≈187,79). Va DEBAJO de los párpados: el blink lo tapa
   igual que al otro ojo. El ojo LEJANO se deja como está (ya lee vivo). ── */
const OJO_CERCA_VIVO = `
  <circle cx="186" cy="77.5" r="6.8" fill="#120c07" opacity="0.92"/>
  <circle cx="182.6" cy="73.8" r="1.8" fill="#f7efdb" opacity="0.92"/>`;

/* ─────────────────────── LA CABEZA (con sus satélites) ───────────────────── */

/* La coronilla 3× recortada a la región del hueso que la monta ∩ silueta,
   fundida por la máscara. Se monta en la CABEZA y TAMBIÉN dentro de cada
   OREJA (recortada a su rect): el rect de la oreja pinta su calco spline
   encima de todo lo de la cabeza, y sin esta copia la banda de solape
   (x150-158 / x222-230) y el pelo bajo la oreja quedarían en textura spline
   entre dos texturas pixel — un rectángulo visible. Con ella, la banda gira
   con la oreja igual que antes (patrón baseSub). */
const coronilla = (region) =>
  `<g clip-path="url(#zt-r-${region})"><g clip-path="url(#ztSilueta)"><use href="#ztCoronilla" mask="url(#zt-m-coronilla)"/></g></g>`;

const CABEZA = `
  ${usoCalco('cabeza')}
  ${coronilla('cabeza')}
  ${FAUCES}
  <g class="zh-hueso zh-mandibula"${origin('mandibula')}>${usoCalco('mandibula')}</g>
  <g class="zh-hueso zh-orejaI"${origin('orejaI')}>${usoCalco('orejaI')}${coronilla('orejaI')}</g>
  <g class="zh-hueso zh-orejaD"${origin('orejaD')}>${usoCalco('orejaD')}${coronilla('orejaD')}</g>
  <g class="zh-ojoGrupo">${HALOS}${OJO_CERCA_VIVO}${PARPADOS}</g>`;

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
        <g class="zh-hueso zh-piernaLejos"${origin('piernaLejos')}>
          ${usoCalco('piernaLejos')}
          ${casqueteCalco('piernaLejosBaja')}
          <g class="zh-hueso zh-piernaLejosBaja"${origin('tobilloLejos')}>
            ${usoCalco('piernaLejosBaja')}
            ${casqueteCalco('piernaLejosPie')}
            <g class="zh-hueso zh-piernaLejosPie"${origin('pieLejos')}>${usoCalco('piernaLejosPie')}</g>
          </g>
        </g>
        ${casqueteCalco('colaBase')}
        <g class="zh-hueso zh-colaBase"${origin('colaBase')}>
          ${usoCalco('colaBase')}
          ${casqueteCalco('colaMedia')}
          <g class="zh-hueso zh-colaMedia"${origin('colaMedia')}>
            ${usoCalco('colaMedia')}
            ${casqueteCalco('colaPunta')}
            <g class="zh-hueso zh-colaPunta"${origin('colaPunta')}>${usoCalco('colaPunta')}</g>
          </g>
        </g>
        ${usoCalco('troncoCuerpo')}
        ${casqueteCalco('piernaCerca')}
        <g class="zh-hueso zh-piernaCerca"${origin('piernaCerca')}>
          ${usoCalco('piernaCerca')}
          ${casqueteCalco('piernaCercaBaja')}
          <g class="zh-hueso zh-piernaCercaBaja"${origin('rodillaCerca')}>
            ${usoCalco('piernaCercaBaja')}
            ${casqueteCalco('piernaCercaPie')}
            <g class="zh-hueso zh-piernaCercaPie"${origin('tobilloCerca')}>${usoCalco('piernaCercaPie')}</g>
          </g>
        </g>
        ${casqueteCalco('brazoBrujula')}
        <g class="zh-hueso zh-brazoBrujula"${origin('brazoBrujula')}>${usoCalco('brazoBrujula')}</g>
        ${casqueteCalco('brazoLapiz')}
        <g class="zh-hueso zh-brazoLapiz"${origin('brazoLapiz')}>
          ${usoCalco('brazoLapiz')}
          ${casqueteCalco('manoLapiz')}
          <g class="zh-hueso zh-brazoLapizAnte zh-manoLapiz"${origin('munecaLapiz')}>${usoCalco('manoLapiz')}</g>
        </g>
        ${casqueteCalco('cuello')}
        <g class="zh-hueso zh-cuello"${origin('cuello')}>
          ${usoCalco('cuello')}
          ${casqueteCalco('cabeza')}
          ${casqueteCalco('mandibula')}
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
${POSES_TRAZADO_CAPA}
</svg>`;

export default ZARIGUYA_TRAZADO_SVG;

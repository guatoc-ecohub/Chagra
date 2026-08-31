/*
 * pielTrazado — EXPERIMENTO "AUTO-TRAZADO RIGGEADO": la lámina de la
 * zarigüeya vectorizada AUTOMÁTICAMENTE (vtracer, ver generar-calco.mjs) y
 * montada sobre el MISMO esqueleto de huesos de `zariguyaHuesos/` — la
 * técnica que puede reemplazar el redibujo a mano en todos los compais.
 *
 * NOTA 2026-08-26: el calco ya NO es vtracer NI redibujo — ambos rechazados
 * (gorro en la coronilla, bordes gruesos, color derivado). El calco es la
 * LÁMINA GEMINI MISMA (`zariguya-gemini-hero.png`, raster embebido por
 * generar-calco.mjs), nativa 481×444: fidelidad píxel-a-píxel por
 * construcción. El esqueleto se pone ENCIMA sin tocar un píxel del calco:
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
import { POSES_TRAZADO_CAPA } from './posesTrazado.js';

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
  tobilloCerca: [310, 404], // tobillo cercano (MEDIDO crop 4×: el talón dobla
                            // en ≈(307-315, 398-406)) — el pie de deditos
                            // que la CSS de marcha (zh-piernaCercaPie) espera
  piernaLejos: [196, 358],  // cadera oculta de la pata lejana
  tobilloLejos: [201, 383], // tobillo lejano (MEDIDO crop 4×: quiebre
                            // canilla/pie ≈ (195-205, 377-390))
  pieLejos: [175, 395],     // nudillos del pie lejano: donde el abanico de
                            // deditos arranca del metatarso (MEDIDO crop 4×)
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
    /* pared derecha por AIRE (374,-8→164): cubre los bigotes derechos de la
       lámina de tinta (tips hasta x≈360,y≈134) sin tocar un píxel del tronco
       (el lomo a y≤160 nunca pasa de x≈332).
       CORONILLA 2026-08-26: la franja alta va x150-230 y las cajas de oreja
       se encogen al RIM medido de cada oreja — el pelo de coronilla que
       vivía dentro de los rects de oreja se movía con el meneo (±3°) y
       dejaba un ESCALÓN en la silueta del tope. La franja SOLAPA 8px dentro
       de cada rect de oreja (x150-158 / x222-230, patrón baseSub): la oreja
       resbala sobre la copia estática de la cabeza — sin banda quedaba una
       LÍNEA BLANCA vertical en el tope (veredicto juez v7). */
    [96, 28], [150, 28], [150, -8], [230, -8], [230, 26], [278, 26],
    [278, -8], [374, -8], [374, 164], [332, 122], [316, 110], [306, 118], [294, 126], [280, 132],
    [264, 136], [250, 136], [246, 130], [246, 80], [236, 80], [236, 106],
    [212, 106], [212, 84], [144, 84], [144, 128], [140, 134], [134, 150],
    [126, 168], [116, 182], [106, 187], [97, 180], [93, 168], [92, 152],
    [84, 149], [72, 143], [67, 133], [74, 124], [85, 118], [91, 110],
    [92, 88], [94, 56],
  ],
  cuello: [
    /* el faldón inferior-izquierdo baja a y≈215: el ruff colgante de la
       mejilla de la lámina Gemini vive ahí y debe MOVERSE con el cuello
       (el vtracer lo perdía y el hueco no se veía). */
    [144, 126], [246, 126], [246, 128], [250, 134], [264, 134], [280, 130],
    [294, 124], [306, 116], [316, 108], [316, 120], [300, 134], [286, 146],
    [272, 158], [256, 168], [238, 176], [218, 180], [196, 184], [184, 212],
    [174, 198], [156, 188], [138, 180], [124, 168], [118, 152], [126, 138], [136, 128],
  ],
  mandibula: [
    [144, 82], [212, 82], [212, 104], [236, 104], [236, 78], [246, 78],
    [246, 128], [144, 128],
  ],
  /* cajas al RIM MEDIDO de cada oreja (crop 4×: izq x86-158 y8-62, der
     x222-278 y9-50) — ver nota CORONILLA en `cabeza`. */
  orejaI: [[88, -6], [158, -6], [158, 58], [88, 58]],
  orejaD: [[222, -6], [278, -6], [278, 48], [222, 48]],
  brazoLapiz: [
    /* techo = CRESTA superior del brazo Gemini (costura compartida con el
       faldón del cuello): el pelo alto del brazo (y≈150-200) es del BRAZO.
       El vtracer dejaba ese pelo vacío y el techo viejo (y≈170-208) no
       dolía; con la lámina real dolía (banda sin dueño). */
    [0, 206], [0, 180], [8, 162], [18, 146], [30, 134], [44, 126],
    [58, 122], [72, 122], [84, 128], [92, 140], [100, 148], [120, 162],
    [140, 176], [158, 188], [174, 200], [184, 214], [188, 228],
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
    [78, 264], [80, 238], [92, 224], [112, 218], [132, 216], [152, 214],
    [168, 210], [186, 204], [204, 200], [216, 204], [220, 214], [214, 226],
    [202, 234], [196, 244], [198, 262], [192, 280], [178, 294], [158, 302],
    [136, 300], [114, 292], [96, 280],
  ],
  /* La pata cercana en TRES segmentos DISJUNTOS (marcha real 2026-08-26):
     muslo → canilla → pie. Antes el muslo llegaba hasta y446 (pie incluido)
     y la canilla vivía DENTRO de él: al plegar la rodilla quedaba una copia
     estática detrás (fantasma) y la marcha se leía plantada. Cortes rectos
     por los quiebres MEDIDOS (rodilla y≈392, tobillo y≈408); cada corte que
     cruza píxeles lleva su casquete-calco (banda de textura, ver
     CAJAS_JUNTURA). */
  piernaCerca: [
    /* borde derecho HUGGING el muslo (2026-08-26): la pared vertical previa
       [338,322]→[342,392] atrapaba píxeles del ARCO DE LA COLA (x≈330-342,
       y≈336-372, la cola cruza DETRÁS del muslo) — al balancear en marcha
       ese fragmento volaba con el muslo como un trazo huérfano entre las
       patas (veredicto juez v12). La cola los dibuja estáticos (colaBase va
       detrás); el corte sigue ahora la silueta del muslo. */
    [248, 316], [266, 302], [292, 296], [318, 298], [334, 310], [338, 322],
    [336, 338], [330, 350], [330, 372], [336, 392], [290, 392], [288, 406],
    [240, 406], [238, 358],
  ],
  /* juntas SOLAPADAS 2px (patrón baseSub de las orejas): el hijo retiene una
     banda del padre — doble-pintado invisible en reposo que ancla la juntura
     y mata el hilito de papel de 1px al plegar (visto al 300% en el gate). */
  /* canilla ESTRECHA al hueso real (x288-346; la canilla vive en x≈292-344):
     con la caja ancha x244+, el filo recto superior barría por la PANZA al
     plegar la rodilla y se veía una línea de corte horizontal en el bajo
     vientre (veredicto juez v13). El pie sí es ancho (deditos x≈265-345). */
  piernaCercaBaja: [[288, 390], [346, 390], [346, 408], [288, 408]],
  piernaCercaPie: [[246, 406], [354, 406], [354, 450], [246, 450]],
  /* La pata lejana TAMBIÉN articula (la CSS de marcha ya esperaba
     zh-piernaLejosBaja y zh-piernaLejosPie): canilla → talón/metatarso →
     deditos. Cortes por el tobillo medido (y≈381) y el arranque del abanico
     de deditos (x≈175). Cajas generosas sobre aire (el pie es borde de
     silueta); solo los cortes que cruzan píxeles llevan casquete. */
  /* piernaLejos ESTRECHA a la canilla real (x178-232; la canilla emerge en
     x≈185-215): la caja ancha x136+ atrapaba pelo del borde de la PANZA y
     al columpiar en marcha lo arrastraba como un trazo flotante en el aire
     (veredicto juez v14, confirmado al 400%). */
  piernaLejos: [[178, 348], [232, 348], [232, 381], [178, 381]],
  piernaLejosBaja: [[175, 379], [232, 379], [232, 424], [175, 424]],
  piernaLejosPie: [[118, 379], [177, 379], [177, 424], [118, 424]],
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

/** Un hueso: <use> del calco recortado a su región. */
const usoCalco = (region) => `<use href="#ztCalco" clip-path="url(#zt-r-${region})"/>`;

/** Casquete/respaldo anti-costura: pintado en el PADRE justo antes del hijo,
    recortado a la región ESTÁTICA del hijo → invisible en reposo, tapa la
    franja que el hijo desocupa al rotar. Solo lo usa FAUCES (el interior de
    boca es el ÚNICO píxel sintético sancionado). */
const casquete = (region, forma) => `<g clip-path="url(#zt-r-${region})">${forma}</g>`;

/* ── CASQUETE-CALCO: el respaldo es LA PROPIA LÁMINA ────────────────────────
   Regla dura del spec 2026-08-26: nunca color plano detrás de una juntura —
   a través de la tinta semitransparente y sobre el aire los óvalos/discos se
   leían como parches (la kipá y las manchas rosa, focos MEDIDOS por
   pixel-diff contra la lámina). El respaldo correcto es una copia ESTÁTICA
   del calco recortada a (región del hijo ∩ caja de la juntura): en reposo es
   píxel-idéntica a lo que tapa (invisible por definición), al rotar el hijo
   la franja que éste desocupa revela PELAJE REAL de la lámina, y sobre aire
   no revela nada (el PNG ahí es transparente). La CAJA acota el respaldo a
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
const RESPALDO_BORROSO = Object.freeze(new Set(['cabeza']));
const casqueteCalco = (region) => {
  const caja = CAJAS_JUNTURA[region];
  const filtro = RESPALDO_BORROSO.has(region) ? ' filter="url(#ztRespaldo)"' : '';
  const uso = caja
    ? `<g clip-path="url(#zt-j-${region})"><use href="#ztCalco"${filtro}/></g>`
    : `<use href="#ztCalco"${filtro}/>`;
  return `<g clip-path="url(#zt-r-${region})">${uso}</g>`;
};

/* ─────────────────────────────── defs ────────────────────────────────────── */

const DEFS = `<defs>
  <!-- CALCO NATIVO 481×444: la lámina Gemini raster embebida tal cual
       (generar-calco.mjs, sin vtracer ni redibujo). Mismo espacio que
       clip-regiones/pivotes/casquetes: los <use…clip> calzan directo. -->
  <g id="ztCalco">${CALCO_TRAZADO}</g>
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

const CABEZA = `
  ${usoCalco('cabeza')}
  ${FAUCES}
  <g class="zh-hueso zh-mandibula"${origin('mandibula')}>${usoCalco('mandibula')}</g>
  <g class="zh-hueso zh-orejaI"${origin('orejaI')}>${usoCalco('orejaI')}</g>
  <g class="zh-hueso zh-orejaD"${origin('orejaD')}>${usoCalco('orejaD')}</g>
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

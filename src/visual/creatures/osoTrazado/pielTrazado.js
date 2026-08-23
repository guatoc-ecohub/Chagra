/*
 * pielTrazado (OSO) — EXPERIMENTO "AUTO-TRAZADO RIGGEADO": la lámina del oso
 * del bastón vectorizada AUTOMÁTICAMENTE (scripts/trazar-lamina.sh, ver
 * generar-calco.mjs) y montada sobre el MISMO esqueleto/cadencia de la
 * lámina viva (`osoLamina/` + `osoLamina.css`) — el método de la zarigüeya
 * trazada, ENDURECIDO con la vara "a tamaño de uso, tan limpio como la
 * lámina": cero costuras, cero motitas, cero bordes asomados.
 *
 * CÓMO (y qué se endureció respecto a la zarigüeya):
 *
 *   1. El calco entra UNA vez en <defs> como <g id="otCalco"> (trae ADENTRO
 *      su clipPath #otSilueta: la silueta real del alfa, evenodd — los
 *      bolsillos entre brazo-jarra/bastón/piernas quedan transparentes).
 *   2. Cada hueso es <g class="olv-…" style="transform-origin:PIVOTE"> con un
 *      <use href="#otCalco" clip-path="url(#ot-r-…)"> — la región anatómica
 *      de ESE hueso, medida en el espacio 615×630 de la lámina.
 *   3. CASQUETES MAXIMALES: detrás de CADA hueso móvil se pinta su región
 *      ESTÁTICA ENTERA en el tono de pelaje MEDIDO de esa zona, recortada a
 *      región ∩ SILUETA. En reposo es invisible POR CONSTRUCCIÓN (el hueso
 *      tapa exactamente su región); a CUALQUIER ángulo, la franja que el
 *      hueso desocupa muestra pelaje — nunca la página. (La zarigüeya usaba
 *      elipses chicas que a tamaño de uso dejaban rendijas; aquí no hay
 *      rendija posible.) El ∩ silueta evita que el casquete se asome por los
 *      bolsillos de AIRE reales de la lámina (p. ej. x308-336/y164-181 bajo
 *      el mentón — medidos).
 *   4. CORTES POR CAUCES MEDIDOS, nunca por detalle fino (la lección de los
 *      bigotes del jaguar, resuelta por ruteo): el corte del cuello ESQUIVA
 *      la V blanca del pecho entera; el borde izquierdo de la cabeza pasa
 *      por el notch de AIRE entre el mechón del cachete y la cresta pálida
 *      del hombro; la corona baja por el palo hasta su punto ANGOSTO y su
 *      pivote vive EN el corte (la rotación no desplaza la costura, y el
 *      puño que empuña la tapa). Ningún trazo claro queda partido por un
 *      borde de región (la orquídea del pod viaja ENTERA con la corona).
 *   5. Bordes estático-vs-estático DILATADOS 2px en el casquete anti-costura
 *      (doble piel, misma piel): en reposo el compuesto es idéntico a la
 *      lámina plana, sin rayitas de antialiasing.
 *
 * PIVOTES Y CADENCIA: REUSADOS de `osoLamina/anatomia.js` y `osoLamina.css`
 * (clases `olv-*`: respira/cabeza/orejas/corona/mandíbula/párpado/mirada/
 * escucha/piensa/camina/florece/resopla — cero animación nueva). El oso está
 * PLANTADO en su roca: brazos y bastón viven en el cuerpo (anatomia.js
 * documenta por qué NO se cortan: la zarpa empuña el palo y las orquídeas se
 * funden con el brazo — no hay borde; la lección de las patas del jaguar).
 * Su contrapeso vivo es LA CORONA del bastón, que sí articula.
 *
 * LO RE-MEDIDO CON PIXEL-PROBE (sharp raw RGBA — no a ojo; misma lámina que
 * midió anatomia.js, verificada por sha256 69571889ed5e25af…):
 *   · EL CORTE DEL CUELLO ESQUIVA LA V. La polilínea de anatomia
 *     ((300,190)→(345,203)) CRUZA la punta del brazo izquierdo de la V
 *     (blancos medidos: brazo izq nace en (280-292, y184), brazo der en
 *     (360-368, y192)) — con el fade de la lámina viva eso pasaba; con corte
 *     nítido doblaría el blanco al mover. El corte va por el canal
 *     oscuro/aire medido y164-182: la V queda ENTERA en el cuerpo.
 *   · DOS OJOS, no uno: anatomia declara "un solo ojo" en (326,97); el probe
 *     y el zoom 5× muestran el ojo derecho en ~(384,94) con esclera y
 *     brillo. Van DOS párpados (cadencia olv-blink) — anatomía de la pose
 *     ¾, no un guiño.
 *   · La corona llega hasta x610 (anatomia cortaba en 600 y dejaba puntas de
 *     hoja estáticas que doblarían al mecerse) — región extendida a x614 y
 *     cortada por aire.
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three) —
 * lo consumen React, HTML plano y el valle 3D, igual que pielHuesos.js.
 */

import { CALCO_TRAZADO } from './calcoTrazado.js';

/* ── PIVOTES (px del espacio 615×630 de la lámina) ──────────────────────────
   Fuente: osoLamina/anatomia.js (cuerpo/cabeza/mandíbula/orejas/corona,
   verificados sobre píxel opaco con el probe) + los DOS ojos re-medidos. */
export const OT_PIVOTES = Object.freeze({
  cuerpo: [300, 505],    // CUERPO_PIVOTE: centro de los apoyos (respira erguido)
  cabeza: [330, 195],    // CABEZA.pivote
  mandibula: [296, 152], // MANDIBULA.pivote (charnela: comisura izquierda)
  orejaI: [270, 58],     // OREJA_IZQ.pivote
  orejaD: [410, 62],     // OREJA_DER.pivote
  corona: [552, 228],    // re-medido: centro del palo EN el corte angosto
                         // (y230, palo x538-567) — pivote pegado al corte =
                         // la rotación no desplaza la costura (anatomia daba
                         // (545,178): a 60px del corte, doblaba el pod 1.5px)
  ojoI: [331, 84],       // bisagra del párpado izq (borde ALTO del ojo (331,97))
  ojoD: [384, 82],       // bisagra del párpado der (borde ALTO del ojo (384,94))
});

/* ── LAS REGIONES DE CLIP (polígonos, px de lámina) ─────────────────────────
   Cortes por los cauces MEDIDOS (mapas de blancos del pixel-probe):
   · cabeza: borde izq por el notch de aire (234,44→128)→(237,134); cuello
     RUTEADO (237,134)→(262,166)→(276,176)→(290,179)→(320,181)→(356,184)→
     (400,182), recogido por (410,178)→(424,164)→(436,150)→(436,41) para NO
     reclamar el hombro derecho (arranca en y166 desde x422 — medido) ni la
     cresta pálida del hombro izq (y132-136, x205-232 — medida).
   · muesca del labio de anatomia ((290,148)→(330,168)→(378,184)) para la
     mandíbula; muescas de orejas solo por ARRIBA de baseSub (la base queda
     doble: respaldo de piel real al girar — truco del jaguar).
   · corona con TAB por el palo angosto (ver su comentario) y pivote EN el
     corte; paredes laterales por aire (x464 / x598).
   Donde el borde pasa por AIRE la región es generosa — recortar aire es
   gratis; los bordes estático-vs-estático van con solape 4-8px. */
export const OT_REGIONES = Object.freeze({
  cabeza: [
    [234, 128], [234, 40], [302, 40], [302, 10], [374, 10], [374, 41],
    [436, 41], [436, 150], [424, 164], [410, 178], [400, 184], [378, 186],
    [330, 170], [290, 150], [290, 181], [276, 178], [262, 168], [237, 134],
  ],
  mandibula: [
    [286, 145], [330, 166], [380, 182], [380, 189], [356, 188], [320, 185],
    [292, 183], [286, 181],
  ],
  orejaI: [[228, -14], [308, -14], [308, 61], [228, 61]],
  orejaD: [[368, -14], [448, -14], [448, 64], [368, 64]],
  /* La corona con su TAB: baja por el palo hasta su punto ANGOSTO medido
     (y230, x538-567) e incluye ENTERAS la orquídea durazno y las frondas
     que cuelgan del pod (x482-598, terminan en y≈228 — medido: cortar en
     y190 partía la orquídea en dos y doblaba el pod al mecerse). */
  corona: [
    [464, -14], [614, -14], [614, 190], [598, 192], [598, 230], [482, 230],
    [482, 196], [464, 190],
  ],
  /* El cuerpo: TODO lo demás (mole, brazos, bastón, V del pecho, roca) con
     dos muescas-respaldo: la del cuello va 26px MÁS ARRIBA del corte real
     (CABEZA.cuelloSub: la franja queda TAMBIÉN en el cuerpo — misma piel,
     la cabeza la tapa en reposo) y la de la corona corta en y157 (baseSub:
     el arranque del palo queda de respaldo bajo la corona). Las paredes de
     ambas muescas van por aire, 6px adentro de la región del hueso. */
  cuerpo: [
    [-18, -28], [240, -28], [240, 126], [262, 154], [276, 162], [290, 155],
    [320, 157], [356, 160], [400, 158], [410, 152], [424, 140], [442, 124],
    [442, -28], [470, -28], [470, 206], [598, 206], [598, 157], [620, 157],
    [620, -28], [633, -28], [633, 656], [-18, 656],
  ],
});

/* Muescas de orejas dentro de `cabeza`: la oreja izq queda fuera por el
   techo (234,40)→(302,40) (baseSub+4: la banda y40-61 queda doble — respaldo
   de piel real); la cresta entre orejas sube por la silla medida x302 hasta
   y10 (AIRE sobre la coronilla, cuyo tope medido es y15) y baja por la silla
   derecha x374; la oreja der queda fuera por el techo (374,41)→(436,41). */

/* Tintas MEDIDAS sobre la lámina (pixel-probe, color medio por zona) — los
   casquetes jamás inventan color visible: en reposo van 100% tapados. */
const P = Object.freeze({
  cuello: '#403f39',     // pelaje del canal del cuello (media 232-445/150-205)
  palo: '#755e4b',       // madera del bastón bajo la corona (530-560/185-215)
  orejaFur: '#35322d',   // pelaje oscuro del pabellón/cráneo
  parpado: '#302d28',    // el ceño oscuro sobre ambos ojos (banda 72-88)
  fauces: '#431814',     // interior de boca (paleta olv-bocaInterior)
  faucesHondo: '#240c0a',
  lengua: '#b0524a',
});

/* ─────────────────────────── helpers de string ───────────────────────────── */

const H = OT_PIVOTES;
const origin = (n) => ` style="transform-origin:${H[n][0]}px ${H[n][1]}px"`;
const dPoly = (pts) => `M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`;

const CLIPS = Object.entries(OT_REGIONES)
  .map(([n, pts]) => `<clipPath id="ot-r-${n}"><path d="${dPoly(pts)}"/></clipPath>`)
  .join('\n  ');

/* El generador deja la silueta en <defs> al principio del string y el cuerpo
 * trazado después. Se separan aquí para que el calco entre UNA sola vez en
 * defs, como en JaguarTrazado, sin anidar <defs> dentro de un <g> reutilizado. */
const CALCO_DEFS_MATCH = CALCO_TRAZADO.match(/^<defs>[\s\S]*?<\/defs>/);
const CALCO_DEFS = CALCO_DEFS_MATCH
  ? CALCO_DEFS_MATCH[0].slice('<defs>'.length, -'</defs>'.length)
  : '';
const CALCO_BODY = CALCO_DEFS_MATCH
  ? CALCO_TRAZADO.slice(CALCO_DEFS_MATCH[0].length)
  : CALCO_TRAZADO;

/** Un hueso: <use> del calco recortado a su región. */
const usoCalco = (region) => `<use href="#otCalco" clip-path="url(#ot-r-${region})"/>`;

const bbox = (pts, margen = 4) => {
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const x = Math.min(...xs) - margen;
  const y = Math.min(...ys) - margen;
  return {
    x,
    y,
    w: Math.max(...xs) + margen - x,
    h: Math.max(...ys) + margen - y,
  };
};

/* El borde blanco del mask crece 2px por lado: solo el casquete, nunca el
 * hueso móvil, invade la costura estático-vs-estático. El clip de silueta
 * sigue por fuera, así el crecimiento no inventa píxeles en bolsillos de aire. */
const CASQUETE_MASKS = Object.entries(OT_REGIONES)
  .map(([n, pts]) => {
    const b = bbox(pts);
    return `<mask id="ot-casquete-${n}" maskUnits="userSpaceOnUse" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"><path d="${dPoly(pts)}" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></mask>`;
  })
  .join('\n  ');

/** Casquete anti-costura: la máscara está dilatada 2px y se pinta en el
 * padre justo ANTES del hijo. En reposo queda tapada por el mismo calco; al
 * mover, la franja que el hijo desocupa muestra piel, nunca la página. */
const casquete = (region, relleno) =>
  `<g clip-path="url(#otSilueta)"><g mask="url(#ot-casquete-${region})">${relleno}</g></g>`;

/** La banda del cuello, dibujada a mano: techo RAMPADO (alto solo donde el
    cuello es grueso, x290-436 — barre el wedge de ±18°; bajo en el tramo de
    los mechones x252-276, donde lo natural al girar es recorte a página, no
    tono: un techo alto ahí asomaba un "flap" oscuro sobre el hombro) y piso
    en el corte+8. El clip a región ∩ silueta hace el resto. */
const BANDA_CUELLO = dPoly([
  [252, 150], [262, 140], [290, 145], [320, 147], [356, 150], [400, 148],
  [415, 143], [428, 130], [436, 120],
  [436, 158], [424, 172], [410, 186], [400, 190], [378, 194], [330, 178],
  [290, 187], [276, 186], [262, 174], [252, 160],
]);

/* ── PARCHE HOMBRO +18° (mismo método que la banda atlas del jaguar,
      79a649d0a): a +18° la mejilla despega y abre un canal de PÁGINA
      (x241-266, y72-143 en coordenadas de lámina verdaderas, medido con
      probe r4) entre la pared estática del cachete y el borde girado de
      la cabeza: la astilla.

      NOTA DE MARCO: las primeras dos pasadas (r4v1/r4v2) diseñaron el
      parche con coordenadas leídas de capturas normalizadas SIN corregir
      el descentrado horizontal de preserveAspectRatio (12.2px de pantalla
      = 17.5 unidades de lámina): el parche quedaba ~17 unidades a la
      derecha del seam real. v3 se diseña contra mapas de envolvente
      corregidos: tinta de cabeza en reposo ∧ −18°.

      DISCIPLINA DE ENVOLVENTE (mapas −18°): canal diagonal de cielo
      x248-263 × y80-95 y bolsillo x250-259 × y126-134 quedan SIN pintar
      (pintarlos produce flap oscuro sobre el hombro a −18°; r4v1 midió
      240 px nuevoOscuro). El resto del seam sí tiene tinta en las tres
      poses y se cubre: lóbulo superior corto (hasta x250), cintura en
      x246 durante el canal, lóbulo medio hasta x262 (y99-124), y lóbulo
      bajo hasta x262 rodeando el bolsillo. Lo que queda descubierto del
      seam (~200px en los conflictos) es irreducible con casquete estático:
      ahí la página está expuesta a +18° Y a −18° a la vez. En reposo todo
      el parche queda tapado (⊂ tinta de reposo, el hueso pinta encima). */
const PARCHE_HOMBRO_MAS18 = dPoly([
  [240, 146], [239, 126], [239, 106], [238, 88], [239, 77],
  [242, 72], [248, 71], [250, 75], [250, 80], [247, 84],
  [244, 91], [244, 96], [246, 100], [254, 102], [260, 105],
  [262, 112], [259, 119], [254, 124], [256, 130], [259, 134],
  [261, 138], [258, 142],
]);

/* ─────────────────────────────── defs ────────────────────────────────────── */

const DEFS = `<defs>
  ${CALCO_DEFS}
  <g id="otCalco">${CALCO_BODY}</g>
  ${CLIPS}
  ${CASQUETE_MASKS}
  <mask id="ot-detalle-antifaz" maskUnits="userSpaceOnUse" x="246" y="52" width="178" height="116">
    <path d="M252,92 C268,61 298,53 330,65 C360,51 397,57 421,89 L413,142 C391,160 366,166 343,151 L330,143 L314,153 C289,165 264,154 250,131 Z" fill="#fff"/>
  </mask>
  <mask id="ot-detalle-v-pecho" maskUnits="userSpaceOnUse" x="266" y="164" width="132" height="62">
    <path d="M266,168 C283,166 300,174 326,199 C349,177 369,170 398,178 L389,210 C366,203 346,210 326,226 C306,205 287,193 270,192 Z" fill="#fff"/>
  </mask>
  <radialGradient id="otFauces" cx=".5" cy=".05" r="1">
    <stop offset="0" stop-color="#4e211d"/>
    <stop offset=".4" stop-color="#2f100d"/>
    <stop offset="1" stop-color="#1c0907"/>
  </radialGradient>
</defs>`;

/* ── FAUCES: el interior de boca DETRÁS de la mandíbula — una RENDIJA fina
   pegada al labio (labio+1 → labio+8, la diagonal real de la sonrisa), casi
   negra, recortada a región ∩ silueta. El truco de animador para una
   sonrisa CERRADA en ¾: el abre se lee como rendija bajo la sonrisa, y el
   resto de lo que la mandíbula desocupa lo cubre el RESPALDO de mentón real
   del cuerpo (la copia estática hace que el mentón "no se vaya"). Probado y
   descartado: banda alta + lengua → se leía como collar rojo, no boca.
   Único dibujo nuevo del módulo, siempre detrás del trazado. ── */
const FAUCES = casquete('mandibula',
  `<path d="M292,150 L330,169 L378,185 L378,192 Q344,188 320,181 Q302,175 292,159 Z" fill="url(#otFauces)"/>`);

/* ── PÁRPADOS ×2: bisagra en el borde alto de CADA ojo, scaleY(0) en reposo
   (el ojo abierto ES la lámina); la cadencia olv-blink de osoLamina.css los
   cierra con el ritmo propio (--rh-blink-*). Color del ceño medido — al
   cerrar se lee el ceño bajando sobre la esclera, nunca un color ajeno. El
   DERECHO existe (re-medido): anatomia no lo vio. ── */
const PARPADOS = `
  <ellipse class="olv-parpado" style="transform-origin:${H.ojoI[0]}px ${H.ojoI[1]}px;transform:scaleY(0)"
    cx="331" cy="97" rx="19" ry="15" fill="${P.parpado}"/>
  <ellipse class="olv-parpado" style="transform-origin:${H.ojoD[0]}px ${H.ojoD[1]}px;transform:scaleY(0)"
    cx="384" cy="94" rx="15" ry="13" fill="${P.parpado}"/>`;

/* ── DETALLE FINO OVERLAY: SIN clip-path, hijo del hueso CABEZA. La V del
   pecho y el antifaz son zonas de trazado fino que rozan el corte del cuello;
   se reusan desde el mismo calco, con máscaras locales, para que giren como
   una unidad y no queden partidos ni llenos de motitas al rotar. ── */
const DETALLE_OVERLAY = `
  <g class="ot-detalle-overlay" pointer-events="none">
    <use href="#otCalco" mask="url(#ot-detalle-antifaz)"/>
    <use href="#otCalco" mask="url(#ot-detalle-v-pecho)"/>
  </g>`;

/* ─────────────────────── LA CABEZA (con sus satélites) ───────────────────── */

const CABEZA = `
  ${usoCalco('cabeza')}
  ${DETALLE_OVERLAY}
  ${FAUCES}
  <g class="olv-mandibulaPivote"${origin('mandibula')}>${usoCalco('mandibula')}</g>
  ${casquete('orejaI', `<rect x="228" y="26" width="80" height="40" fill="${P.orejaFur}"/>`)}
  <g class="olv-orejaIzqPivote"${origin('orejaI')}>${usoCalco('orejaI')}</g>
  ${casquete('orejaD', `<rect x="368" y="28" width="80" height="40" fill="${P.orejaFur}"/>`)}
  <g class="olv-orejaDerPivote"${origin('orejaD')}>${usoCalco('orejaD')}</g>
  ${PARPADOS}`;

/* ─────────────────────────── EL SVG COMPLETO ─────────────────────────────── */

/** viewBox del rig: la lámina 615×630 con margen para los giros de estrés
    (±18° alrededor del atlas sacan la oreja izquierda hasta y≈−6 — medido
    con la rotación del punto (262,6) alrededor de (330,195)). */
export const OT_VIEWBOX = '-20 -30 655 690';

/**
 * El markup interior (sin <svg> raíz — para el modo `inline` de OsoBaston,
 * que lo mete en un viewport propio dentro del SVG del host). Mismo contrato
 * que la lámina viva del oso: el host pone data-agt-estado / data-vida /
 * data-rh-mira / --olv-jaw / --rh-blink-* en la raíz y `osoLamina.css` pone
 * la cadencia (las MISMAS clases olv-*; aquí solo se reproduce la jerarquía
 * que esa CSS espera: stage → cuerpoPivote → [corona] [cabezaGesto →
 * cabezaMira → cabezaPivote → mandíbula/orejas/párpados]).
 */
export const OSO_TRAZADO_INTERIOR = `${DEFS}
<g class="olv-stage">
  <g class="olv-cuerpoPivote"${origin('cuerpo')}>
    ${usoCalco('cuerpo')}
    ${casquete('corona', `<rect x="518" y="200" width="66" height="36" fill="${P.palo}"/>`)}
    <g class="olv-coronaPivote"${origin('corona')}>${usoCalco('corona')}</g>
    ${casquete('cabeza', `<path d="${BANDA_CUELLO}" fill="${P.cuello}"/><path d="${PARCHE_HOMBRO_MAS18}" fill="${P.cuello}"/>`)}
    <g class="olv-cabezaGesto"${origin('cabeza')}>
      <g class="olv-cabezaMira"${origin('cabeza')}>
        <g class="olv-cabezaPivote"${origin('cabeza')}>
          ${CABEZA}
        </g>
      </g>
    </g>
  </g>
</g>`;

export const OSO_TRAZADO_SVG = `<svg class="osoHuesos" viewBox="${OT_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Oso de anteojos">
${OSO_TRAZADO_INTERIOR}
</svg>`;

export default OSO_TRAZADO_SVG;

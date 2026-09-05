/*
 * regiones — PIVOTES y REGIONES de clip de la zarigüeya trazada (px del
 * espacio 481×444 de la lámina Gemini hero). Módulo propio para que
 * generar-calco.mjs pueda partir el calco POR REGIÓN en el horneado (perf:
 * cada hueso renderiza solo sus paths) sin ciclo de imports con
 * calcoTrazado.js — la MISMA organización que jaguarTrazado/regiones.js.
 *
 * Los polígonos y pivotes son los MEDIDOS sobre esta lámina (crop 4×,
 * pixel-probe, gates GPU-headed v5..v14, 2026-08-26): NO se re-miden aquí,
 * solo cambian de archivo. El calco vector (vtracer, receta jaguar) vive en
 * el mismo espacio 481×444, así que calzan directo.
 */

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

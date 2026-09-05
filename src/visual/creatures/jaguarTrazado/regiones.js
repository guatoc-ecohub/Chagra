/*
 * regiones — PIVOTES y REGIONES de clip del jaguar trazado (px del espacio
 * 705×394 de la lámina). Módulo propio para que generar-calco.mjs pueda
 * partir el calco POR REGIÓN en el horneado (perf: cada hueso renderiza solo
 * sus paths) sin ciclo de imports con calcoTrazado.js.
 */

/* ── PIVOTES (px del espacio 705×394 de la lámina) ──────────────────────────
   Fuente: jaguarHuesos/pielHuesos.js (JH_HUESOS) donde el hueso coincide con
   la lámina; RE-MEDIDOS con el probe donde no (cola entera, cadera lejana,
   hombro/codo de la delantera lejana, tobillos). */
export const JT_PIVOTES = Object.freeze({
  columna: [360, 150],        // = JH (centro de masa del tronco)
  cuello: [228, 200],         // = JH (base del cuello sobre la cruz/pecho)
  cabeza: [150, 140],         // = JH (atlas)
  mandibula: [88, 150],       // = JH (charnela/comisura)
  orejaI: [36, 52],           // anatomia.OREJA_IZQ.pivote (medido en lámina)
  orejaD: [124, 52],          // anatomia.OREJA_DER.pivote
  pataDelCerca: [232, 228],   // hombro (= JH ±)
  codoDelCerca: [238, 300],   // = JH
  zarpaDelCerca: [212, 350],  // tobillo MEDIDO (zarpa x158-228 y346-390)
  pataDelLejos: [158, 232],   // hombro MEDIDO (columna x124-186; JH 185 caía en el cauce)
  codoDelLejos: [158, 296],   // codo MEDIDO (centro de columna y295)
  zarpaDelLejos: [160, 348],  // tobillo MEDIDO
  pataTrasCerca: [518, 232],  // cadera (= JH ±)
  rodillaTrasCerca: [560, 302], // = JH (canilla x542-583 arranca y300)
  zarpaTrasCerca: [550, 346],
  pataTrasLejos: [436, 230],  // cadera MEDIDA (la pata vive x395-465; JH 485 no aplica)
  rodillaTrasLejos: [432, 288], // = JH ±
  zarpaTrasLejos: [420, 332],
  colaBase: [542, 106],       // raíz MEDIDA (JH [552,110] = aire en la lámina)
  colaMedia: [554, 158],      // corte base/media EN la banda (pivote sobre píxel:
                              // con el corte abajo (578,232) la rotación de base
                              // TRASLADABA toda la banda y la despegaba de la grupa)
  colaPunta: [674, 258],      // el codo del rulo MEDIDO (sube al tirabuzón)
});

/* ── LAS REGIONES DE CLIP (polígonos, px de lámina) ─────────────────────────
   Cortes por los cauces MEDIDOS: la recta del cuello de anatomia.CABEZA
   (x(y) = 179 + 0.34·(y−130)); el gap de aire entre delanteras (x≈188); la
   muesca de la ingle (x535-565); el corte de cola contra la grupa
   ((534,92)→(543,196), fundido arriba, aire abajo). Las orejas usan la banda
   de RESPALDO doble-pintada de anatomia.baseSub (la base vive en cabeza Y en
   oreja). Donde el borde pasa por AIRE la región es generosa a propósito:
   recortar aire es gratis; solo los bordes que CRUZAN píxeles se afinan. */
export const JT_REGIONES = Object.freeze({
  cabeza: [
    [-8, 30], [44, 30], [44, -8], [112, -8], [112, 32], [146, 32],
    [152, 50], [156, 64], [163, 84], [170, 104], [179, 130], [187, 155],
    [195, 178], [203, 200], [170, 225], [140, 232], [115, 222], [100, 195],
    [88, 190], [72, 184], [54, 176], [40, 155], [34, 132], [-8, 132],
  ],
  mandibula: [[48, 146], [104, 146], [104, 184], [48, 184]],
  orejaI: [[-8, -8], [45, -8], [45, 58], [-8, 58]],
  orejaD: [[113, -8], [162, -8], [162, 58], [113, 58]],
  /* collar: nuca (derecha de la recta) + garganta/pecho alto (bajo el
     cráneo). El borde interno va 2-4px DENTRO de la región de cabeza
     (dilatación anti-costura: en reposo la cabeza lo tapa). */
  cuello: [
    [150, 44], [205, 38], [240, 56], [266, 62], [270, 100], [265, 145],
    [255, 190], [240, 225], [230, 260], [180, 258], [136, 252], [118, 236],
    [106, 205], [98, 188], [110, 212], [132, 222], [164, 215], [194, 190],
    [189, 170], [181, 146], [172, 118], [164, 94], [156, 68],
  ],
  /* tronco: lomo→grupa→corte de cola→vientre→pecho derecho. NO incluye el
     collar (borde compartido + casquete) ni las partes LIBRES de las patas;
     SÍ solapa las cimas fundidas de cola y patas (respaldo natural: cola y
     lejanas van DETRÁS, cercanas encima con su casquete). */
  troncoCuerpo: [
    [262, 58], [300, 50], [340, 42], [400, 44], [455, 56], [505, 74],
    [532, 92], [536, 98], [541, 150], [543, 196], [538, 212], [532, 236],
    [500, 238], [470, 240], [455, 246], [430, 240], [398, 248], [350, 250],
    [310, 252], [270, 258], [248, 260], [226, 250], [238, 225], [253, 190],
    [263, 145], [268, 100], [264, 62],
  ],
  pataDelCercaAlto: [
    [188, 226], [256, 226], [252, 254], [248, 282], [244, 304], [192, 304],
    [189, 278], [188, 252],
  ],
  pataDelCercaBajo: [
    [190, 298], [244, 298], [240, 322], [235, 342], [230, 354], [196, 354],
    [192, 338], [190, 318],
  ],
  pataDelCercaZarpa: [
    [155, 342], [236, 340], [232, 366], [222, 392], [166, 392], [156, 366],
  ],
  pataDelLejosAlto: [
    [106, 226], [188, 226], [187, 252], [184, 282], [182, 297], [133, 297],
    [127, 270], [124, 248], [112, 232],
  ],
  pataDelLejosBajo: [
    [133, 293], [184, 293], [182, 318], [179, 340], [175, 352], [140, 352],
    [137, 330], [134, 310],
  ],
  pataDelLejosZarpa: [
    [104, 342], [159, 342], [158, 390], [112, 388], [104, 362],
  ],
  /* borde derecho por el cauce de AIRE pata↔cola (x575-582, y258-296): si la
     región invade el borde interno de la cola, esa astilla queda pegada a la
     canilla cuando la cola barre (chip visto en el gate de cola). */
  pataTrasCercaAlto: [
    [478, 232], [504, 222], [532, 222], [550, 234], [554, 250], [564, 256],
    [572, 266], [577, 280], [580, 296], [582, 304], [540, 304], [522, 290],
    [502, 276], [486, 260],
  ],
  pataTrasCercaBajo: [
    [540, 300], [583, 300], [581, 326], [576, 348], [550, 348], [544, 324],
    [541, 310],
  ],
  pataTrasCercaZarpa: [
    [518, 340], [584, 340], [578, 362], [568, 372], [526, 370], [519, 354],
  ],
  pataTrasLejosAlto: [
    [394, 214], [468, 214], [465, 262], [466, 292], [414, 292], [405, 262],
    [396, 238],
  ],
  pataTrasLejosBajo: [
    [400, 286], [468, 286], [463, 312], [452, 328], [430, 338], [404, 338],
    [395, 322], [398, 300],
  ],
  pataTrasLejosZarpa: [
    [344, 326], [392, 336], [446, 314], [452, 330], [430, 350], [404, 368],
    [370, 368], [348, 346],
  ],
  /* base = SOLO el muñón de la raíz (y90-166): con la banda entera colgando
     de la raíz, cualquier rotación de base la trasladaba lateralmente y la
     despegaba de la grupa (chip flotante visto en el gate de cola). */
  colaBase: [
    [532, 90], [548, 96], [562, 120], [572, 142], [576, 166], [538, 166],
    [534, 140], [532, 115],
  ],
  /* media = la banda descendente + el barrido bajo, con su pivote EN la
     banda (554,158): el vaivén arquea la cola sin arrancarla del cuerpo. */
  colaMedia: [
    [536, 148], [574, 148], [586, 178], [598, 210], [610, 228], [648, 256],
    [706, 256], [700, 292], [650, 302], [598, 292], [558, 262], [546, 236],
    [538, 196], [533, 170],
  ],
  colaPunta: [[644, 186], [708, 186], [708, 264], [644, 264]],
});

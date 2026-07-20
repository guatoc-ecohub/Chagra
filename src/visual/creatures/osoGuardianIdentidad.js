/*
 * osoGuardianIdentidad — LA IDENTIDAD VISUAL DEL OSO GUARDIÁN, COMO DATOS.
 *
 * El oso de anteojos (Tremarctos ornatus) en su TERCERA y definitiva dirección
 * de arte: el GUARDIÁN NEGRO DE LA LUNA. La base aprobada por el operador es el
 * avatar del selector del guardián (dashboard/GuardianEspiritu → AvatarOso):
 * pelaje AZABACHE AZULADO casi silueta, contorno con luz MENTA (#2dffc4), la
 * LUNA CRECIENTE crema en el pecho (su emblema) y los anteojos hechos de AROS
 * DE LUZ. Este archivo fija esa paleta como fuente única.
 *
 * Lo que este rediseño CORRIGE de los dos osos rechazados (el café OsoAndino y
 * el OsoAnteojos de peluche): las PROPORCIONES. Cabeza proporcionada sobre
 * hombros anchos (ratio cabeza:hombros ≈ 1:3, no 1:1.6), hocico presente,
 * ojos almendrados serenos (no ojos-juguete de pupila gigante), sin rubor de
 * cachetes, garras visibles. Presencia de guardián adulto, no ternura de cría.
 *
 * REGLA DE ORO (idéntica a jaguarIdentidad/abejaIdentidad): SOLO datos. Cero
 * three, cero react. La CADENCIA vive en `creatures.css` (clases `rh-*`/
 * `oso-*`/`osog-*`); el DIBUJO compone el KIT `_rubberhose.jsx` donde sirve
 * (BocaVisema, Sonrisa, blink/mirada); el CLIMA→cuerpo, en
 * `creatureClimaCuerpo.js` vía PERFIL_OSO_GUARDIAN.
 */

/* Slug estable del oso guardián (data-creature, aura, perfiles). */
export const OSO_GUARDIAN_SLUG = 'oso-guardian';

/* TINTA NOCTURNA propia: el contorno de este oso NO es la tinta cálida de la
   familia (RH_INK marrón) sino un índigo casi negro — es un espíritu de noche
   y luna, la línea que manda es fría. Deviación deliberada de identidad. */
export const OSO_GUARDIAN_TINTA = '#07051a';

export const OSO_GUARDIAN_PALETA = {
  /* pelaje azabache azulado (del avatar aprobado #171030/#1c1338) con volumen:
     luz de luna en el lomo → azabache medio → sombra ventral casi negra */
  cuerpo: '#181130',
  cuerpoLuz: '#352b62',      // el lametón de luz lunar sobre el hombro
  cuerpoSombra: '#0b0722',   // la panza en penumbra
  cuerpoGlow: 'rgba(45,255,196,0.30)', // el halo menta MEDIDO de la silueta
  pata: '#161038',           // las columnas de las patas, en sombra propia
  planta: '#241d40',         // la planta plantígrada
  garra: '#cfe8dd',          // garras hueso-menta: visibles, romas, sin amenaza
  /* la firma luminosa (del avatar aprobado) */
  menta: '#2dffc4',          // el neón biopunk del contorno/rim
  luna: '#f4fff9',           // la LUNA CRECIENTE del pecho (cara iluminada)
  lunaSombra: '#c9e8d8',     // los mares de la luna (que no sea un sticker)
  lunaHalo: '#eafff6',       // el halo que respira alrededor del emblema
  anteojo: '#eafff6',        // los AROS de luz de los anteojos
  anteojoGlow: '#bfffe9',    // el aliento de los aros
  /* la cara */
  iris: '#7dffd9',           // ojo con alma: iris menta-luz, pupila honda
  ojo: '#0a0620',            // la almendra oscura del ojo (ojo real de oso)
  ceja: '#4d4380',           // ceño índigo-claro: serio sereno, no bravo
  hocico: '#e2c69d',         // el morro canela del avatar aprobado (la única nota cálida)
  hocicoSombra: '#ab8760',
  trufa: '#0b0f1c',
  /* atmósfera */
  espora: '#bfffe9',         // motas de bosque nublado que flotan lento
  bruma: '#9fffe0',          // el velo tenue a los pies
  sombraSuelo: 'rgba(4,10,18,0.52)', // el peso de la mole en el suelo
};

/* PROPORCIONES DEL ADULTO — ANATOMÍA, no un domo.
 *
 * El rediseño anterior acertó el REGISTRO (cabeza chica sobre cuerpo grande,
 * ratio ≈ 0.34) pero falló el CUERPO: era una campana lisa, sin cruz, sin
 * cuello, sin grupa, con la cabeza apoyada encima como calcomanía. Estos
 * números fijan las marcas anatómicas reales del Tremarctos ornatus para que
 * la silueta se construya sobre ellas y no a ojo.
 *
 * Fuente: DR `anatomia-y-silueta-del-oso-de-anteojos` (brazo gemini, 2026-06-19).
 * Lo que manda de ahí, y que este oso ahora sí cumple:
 *   · Musculoso y TREPADOR, no gordo: hay cintura (grupa 12.5 contra costillar
 *     10.2 = ~18% de estrechamiento). Gradual, nunca cintura de avispa.
 *   · Cuello CORTO Y MUSCULOSO: el trapecio sube DETRÁS del cráneo (cuelloY)
 *     y la cabeza nace del cuerpo. No hay cabeza posada.
 *   · Cruz (paletillas) marcada por pelaje denso — el "ahuecado" del hombro,
 *     no la joroba de grizzly (que esta especie NO tiene).
 *   · Patas delanteras MÁS LARGAS que las traseras (adaptación trepadora):
 *     por eso el codo cae bajo y el antebrazo es largo.
 *   · Plantígrado: apoya la planta completa, talón y dedos (como nosotros).
 */
export const OSO_GUARDIAN_PROPORCION = {
  grupaRx: 12.5,     // el punto MÁS ancho: las ancas del oso sentado
  grupaY: 7.4,       // altura de esa cadera
  cinturaRx: 10.2,   // el costillar: hay estrechamiento, es un oso atlético
  cinturaY: 1.0,
  cruzX: 5.8,        // dónde asoma la paletilla al costado del cráneo
  cruzY: -10.9,      // altura de la cruz (por encima de la base del cráneo)
  cuelloY: -14.2,    // el trapecio sube hasta acá, ESCONDIDO tras el cráneo
  hombroX: 8.7,      // el deltoides: de ahí nace la pata delantera
  hombroY: -7.0,
  sueloY: 13.4,      // la línea de suelo donde apoyan las cuatro plantas
  cabezaRx: 4.15,    // cráneo proporcionado (no cabezón) — CONSERVADO
  cabezaRy: 3.6,
  orejaR: 1.32,      // orejas chicas y bajas de oso real (no discos de peluche)
  /* compat: consumidores viejos que leían la media anchura/altura de la mole */
  hombrosRx: 12.5,
  troncoRy: 10.8,
};

/* LA RUANA DEL GUARDIÁN — lana pesada de verdad, no un trapecio.
 *
 * Fuente: DR `la-ruana-andina-colombiana` (brazo gemini, 2026-06-19). Lo que
 * obliga ese dossier y que la ruana genérica de AccesoriosClima no daba:
 *   · Lana virgen de oveja, ~1 kg: cae con GRAVEDAD. Pliegues amplios y
 *     definidos que se asientan; no una tela que flota.
 *   · Se asienta FIRME sobre los hombros y no resbala — por eso hubo que
 *     dibujarle hombros al oso primero. Sin cruz no hay dónde apoyarla.
 *   · Abierta al frente (eso la separa del poncho, que es cerrado).
 *   · Colores sobrios del altiplano cundiboyacense: negro, azul oscuro, gris
 *     oscuro. Las franjas rojas/amarillas son la variante vieja y acá
 *     COMPETÍAN en área con la luna del pecho, que es el emblema. Fuera.
 *   · Al frío se echa una punta sobre el hombro contrario. Eso resuelve dos
 *     cosas de una: es el gesto auténtico documentado Y deja el pecho abierto,
 *     así la luna nunca queda tapada.
 *   · Sobre cuerpo no humano: los pliegues se exageran por la musculatura y la
 *     prenda se integra. Si "cuelga" sin interactuar, se lee disfraz.
 */
export const OSO_GUARDIAN_RUANA = {
  pano: '#2e2657',        // lana teñida de índigo oscuro (sobrio de altiplano)
  panoLuz: '#413873',     // el lomo del pliegue donde pega la luz de luna
  panoSombra: '#171233',  // el fondo de la arruga: la lana es densa, no traslúcida
  panoRevés: '#4a4180',   // el envés que se ve en la punta echada al hombro
  franja: '#8e8468',      // UNA banda de lana cruda: sobria, no compite
  fleco: '#7b7259',       // los flecos del ruedo, tejidos y pesados
};

/* ANCLA DE LA RUANA GENÉRICA — OBSOLETA, se conserva solo por compatibilidad.
 *
 * Historia: la ruana venía de `AccesoriosClima`, el trapecio species-agnostic
 * que viste a toda la fauna. Sobre este oso se le pasaba la mole entera como
 * ancla y el poncho salía más ancho que el propio animal, tapando la luna del
 * pecho. Se corrigió encogiendo el ancla a estos números — un parche de
 * PROPORCIÓN, con la nota de que el rediseño de fondo iba aparte.
 *
 * Ese rediseño ya se hizo: el guardián tiene su propia `RuanaGuardian.jsx`,
 * dibujada con la caída, los pliegues y la punta al hombro que documenta la DR
 * de la ruana andina, y apoyada sobre unos hombros que antes no existían. El
 * oso ya NO consume AccesoriosClima. Este export queda para no romper a quien
 * lo reexporte; no lo use para dibujar. */
export const OSO_GUARDIAN_RUANA_ANCLA = { cx: 0, cy: 7.3, rx: 7.8, ry: 4.6 };

/*
 * PERFIL_OSO_GUARDIAN — perfil de CLIMA→cuerpo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js), mismo shape que PERFIL_JAGUAR. Es de bosque
 * altoandino/páramo:
 *   alas    false → sin aleteo.
 *   humedad 0.55 → pelaje denso de niebla: el agua apenas lo toca.
 *   difusa  0.5  → la mole grande: la niebla apenas lo difumina.
 *   sequia  0.4  → el bosque nublado sufre la seca un poco más que el jaguar.
 */
export const PERFIL_OSO_GUARDIAN = Object.freeze({
  alas: false,
  humedad: 0.55,
  difusa: 0.5,
  sequia: 0.4,
});

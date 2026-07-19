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

/* PROPORCIONES DEL ADULTO (el corazón del rediseño):
   hombros 24.4 de ancho contra cabeza de 8.3 → ratio ≈ 0.34 (el OsoAnteojos
   rechazado andaba por 0.6, proporción de cría/peluche). Cabeza hundida en la
   joroba de hombros (plantígrado sin cuello), sentado como montaña. */
export const OSO_GUARDIAN_PROPORCION = {
  hombrosRx: 12.2,   // media anchura de la mole a la altura de los flancos
  troncoRy: 10.8,    // referencia vertical del tronco (para accesorios)
  cabezaRx: 4.15,    // cráneo proporcionado (no cabezón)
  cabezaRy: 3.6,
  orejaR: 1.32,      // orejas chicas y bajas de oso real (no discos de peluche)
};

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

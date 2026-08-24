/*
 * osoBastonIdentidad — LA IDENTIDAD VISUAL DEL OSO DEL BASTÓN, COMO DATOS.
 *
 * Hermana de `luciernagaIdentidad.js` / `osoGuardianIdentidad.js`: el OSO DEL
 * BASTÓN es Tremarctos ornatus — el mismo oso de anteojos, VU, único oso de
 * Suramérica — en su CUARTA dirección de arte: EL CAMINANTE DE LOS ANDES.
 * Rubber-hose pleno (Cuphead + calidez campesina, la referencia aprobada del
 * operador: el póster "¡El oso de anteojos! El guardián de los Andes") cruzado
 * con la mirada de LÁMINA HUMBOLDT: flora botánicamente cierta en su bastón,
 * rayado de grabado sugerido en el pelaje, tierra cálida en las tintas.
 *
 * NO es el oso café plano (OsoAndino, RECHAZADO por el operador y archivado) ni
 * el guardián lunar biopunk (OsoGuardian, otra dirección: gravitas nocturna).
 * Este es el oso DE DÍA y DE CAMINO: erguido, botas puestas, sonrisa amplia de
 * goma, y su BASTÓN FLORECIDO más alto que él.
 *
 * ── EL BASTÓN ES SU ECOLOGÍA HECHA EMBLEMA ───────────────────────────────────
 * El oso andino es el GRAN DISPERSOR DE SEMILLAS del bosque altoandino y el
 * páramo: come bromelias y frutos, camina distancias enormes, y por donde pasa
 * el monte germina. El bastón coronado de frailejón y orquídea es esa verdad
 * ecológica vuelta atributo de personaje: POR DONDE CAMINA, FLORECE. Su
 * gesto-firma (`florece`) es el bastón latiendo en flor — el poder del
 * caminante, no un adorno. Verde dominante: la vida que carga es flora andina
 * nativa (regla de la casa: jamás eucalipto/pino/retamo).
 *
 * ── SU FIRMA ES DE FORMA, NO DE COLOR ────────────────────────────────────────
 * Lección de la casa (el borugo murió por confiar su firma a las motas crema):
 * este oso se reconoce en negro sobre blanco por SILUETA — el bastón vertical
 * coronado de flores (nadie más del elenco carga un prop más alto que él), la
 * postura erguida de caminante con botas, las orejas redondas sobre el cráneo
 * ancho. Los anteojos y la luna del pecho son crema, pero viven DENTRO de una
 * silueta que ya lo delató.
 *
 * REGLA DE ORO (idéntica a luciernagaIdentidad): SOLO datos. Cero three, cero
 * react. La CADENCIA vive en `creatures.css` (clases `rh-*`/`crt-*`/`osb-*`);
 * el DIBUJO compone el KIT `_rubberhose.jsx`; el CLIMA→cuerpo va por
 * `cuerpoDeClima` con el perfil de abajo; el aura de poder (verde del bastón)
 * vive en `transformacion.js` (AURA_POR_BICHO fila 'oso-baston').
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as OSO_BASTON_TINTA } from './_rubberhose.jsx';

/* Slug estable (data-creature, aura, perfiles, elenco). Distinto de
   'oso-andino' (café rechazado) y de 'oso-guardian' (dirección lunar) a
   propósito: los consumidores viejos no cambian; el cableado del elenco lo
   decide el orquestador. */
export const OSO_BASTON_SLUG = 'oso-baston';

/*
 * OSO_BASTON_FIRMA — EL CONTRATO DE SILUETA, COMO DATOS.
 * Qué rasgos lo hacen reconocible y si sobreviven a que le quiten el color
 * (`forma: true`). La prueba obligatoria es `pruebaSilueta`: la figura rellena
 * de NEGRO sobre BLANCO, sin color ni detalle interno.
 */
export const OSO_BASTON_FIRMA = Object.freeze({
  rasgos: Object.freeze([
    Object.freeze({
      id: 'baston-florecido', forma: true,
      que: 'Un bastón de madera MÁS ALTO que el propio oso, plantado en el suelo, coronado por una roseta de frailejón con su flor y una orquídea colgada del cayado.',
      porque: 'Ningún otro personaje del elenco carga un prop vertical que rompa la silueta hacia arriba: el palo con corona floral se lee a 64 px antes que cualquier otra cosa. Es además su ecología (dispersor de semillas) hecha contorno.',
    }),
    Object.freeze({
      id: 'caminante-botas', forma: true,
      que: 'Postura ERGUIDA de caminante plantígrado: piernas de goma separadas, botas de trocha con punta hacia afuera, un brazo en jarra y el otro empuñando el bastón.',
      porque: 'Los otros osos de la casa van sentados o en mole de cuatro apoyos; el del bastón es el ÚNICO que se para como excursionista. La bota ensancha el pie en la silueta — se lee aunque sea una mancha negra.',
    }),
    Object.freeze({
      id: 'anteojos-asimetricos', forma: true,
      que: 'Los AROS crema alrededor de los ojos, ASIMÉTRICOS como en el animal real (patrón único por individuo): el izquierdo cierra completo, el derecho se abre por abajo y derrama hacia el hocico.',
      porque: 'Es la firma diagnóstica de Tremarctos ornatus. En negro sobre blanco los aros desaparecen, pero el cráneo ancho de hocico CORTO con orejas redondas que dejan sigue siendo de oso andino, no de perro ni de mono.',
    }),
    Object.freeze({
      id: 'luna-pecho', forma: true,
      que: 'La media luna crema del pecho — el babero pectoral real de la especie, dibujado como creciente colgada con gracia.',
      porque: 'Completa el trío de marcas crema de la especie (anteojos, hocico, pecho). En silueta el pecho abombado del erguido la sostiene: el bulto pectoral existe aunque la luna no se vea.',
    }),
  ]),
  pruebaSilueta: Object.freeze({
    obligatoria: true,
    como: 'Rellenar la figura entera de negro sobre blanco, sin color ni detalle interno, y mirarla a 64 px.',
    contraste: 'el oso guardián sentado (mole sin prop) y cualquier oso genérico de pie sin bastón ni botas',
    criterio: 'Si sin el bastón coronado de flores y sin las botas se lee igual que cualquier oso parado, la silueta falló: el caminante ES el palo florecido más la postura de trocha.',
  }),
});

/* ── OSO DEL BASTÓN — Tremarctos ornatus caminante. Pelaje CAFÉ-NEGRO CÁLIDO
   (tierra tostada, NO el azabache azulado del guardián ni el café plano del
   rechazado), marcas crema de la especie, guantes de goma crema (la firma
   Cuphead en las puntas), botas de trocha en cuero, y el bastón vivo: madera
   cálida, enredadera y hojas VERDES dominantes, frailejón plata-verde con flor
   amarilla y orquídea de Mayo (Cattleya trianae) lila. */
export const OSO_BASTON_PALETA = {
  /* Repaint 2026-08-24 (volumen): el cuerpo original (#2b1c11) era casi
     idéntico a la tinta del contorno (RH_INK #2a1a0c) — relleno y línea se
     fundían y la mole leía como blob negro a 64 px. El pardo se abre en un
     rango tonal real (luz → medio → sombra) SIN salirse del café-negro
     cálido de la especie ni del sol frío paramuno. */
  cuerpo: '#43301c',        // pelaje pardo tostado (medio: despegado de la tinta)
  cuerpoLuz: '#7d5c39',     // luz de sol andino sobre lomo y hombros
  cuerpoRim: '#9a7a4e',     // el filo de contraluz (rim) que corta joroba y cráneo
  cuerpoSombra: '#241609',  // sombra ventral cálida (nunca negro industrial)
  golilla: '#2c1c0e',       // el pelaje denso de cuello y hombros (costura cabeza-cuerpo)
  anteojo: '#f2e3bd',       // los AROS crema (LA firma de la especie)
  ceja: '#f2e3bd',          // cejas expresivas de goma (una alzada: travieso noble)
  hocico: '#e9d3a0',        // hocico corto tan claro
  hocicoSombra: '#c9ab77',  // sombra del morro
  trufa: '#1c1008',         // la nariz (tierra casi negra)
  oreja: '#4d3722',         // pabellón interno de la oreja redonda
  pecho: '#f2e3bd',         // la media luna crema del pecho
  pechoSombra: '#d6bd8c',   // penumbra de la luna (que no sea sticker)
  /* ── el bastón florecido (verde dominante) ── */
  baston: '#8a5a30',        // madera cálida del cayado
  bastonLuz: '#ab7a45',     // el canto que agarra el sol
  bastonSombra: '#5f3c1e',  // el canto en sombra y los nudos
  hoja: '#4a9b3e',          // la enredadera nativa (verde de la casa)
  hojaLuz: '#74bd5a',       // hoja al sol
  hojaSombra: '#2f7030',    // hoja en sombra
  frailejonHoja: '#9db87a', // la roseta plata-verde (Espeletia: hoja afelpada)
  frailejonFlor: '#e8c53f', // la flor amarilla del frailejón
  frailejonCentro: '#a8781f', // el corazón de la flor
  orquidea: '#c77fd9',      // Cattleya trianae: pétalos lila
  orquideaLuz: '#e3a8e8',   // el borde claro del pétalo
  orquideaGarganta: '#f0c23f', // la garganta amarilla del labelo
  polen: '#ffe27a',         // las motas de polen que flotan de la corona
  /* ── vestuario del caminante ── */
  bota: '#a2622c',          // cuero de trocha
  botaLuz: '#c58748',       // el brillo del cuero
  botaSombra: '#77441d',    // sombra y costura de la bota
  botaSuela: '#5c3315',     // la suela
  /* ── su verde de poder ── */
  verde: '#43c24f',         // VERDE DEL BASTÓN FLORECIDO: hoja viva encendida
  verdeHalo: '#9fe37b',     // el halo suave del florecer
  sombraSuelo: 'rgba(20,12,6,0.42)', // el peso del caminante sobre la trocha
};

export const OSO_BASTON_PROPORCION = {
  /* Coordenadas del arte (viewBox '-17 -22 34 42'): erguido, suelo en y≈17.4. */
  cabezaRx: 4.85,           // cráneo ancho (cartoon adulto amable, hocico CORTO)
  cabezaRy: 4.35,
  orejaR: 1.6,              // orejas redondas de oso real, sobre el cráneo
  anteojoR: 1.55,           // radio medio de los aros crema
  troncoAncho: 7.8,         // medio-ancho de la panza (mole erguida con barriga)
  bastonAlto: 30.5,         // del suelo a la corona: MÁS alto que el oso (firma)
  botaLargo: 4.8,           // la bota de trocha, punta hacia afuera
};

/*
 * OSO_BASTON_FLORA — LA BOTÁNICA DEL BASTÓN, COMO DATOS (la mirada Humboldt).
 * Cada planta de la corona está nombrada con su binomio y su porqué ecológico:
 * el bastón no lleva "flores decorativas", lleva flora andina NATIVA cierta
 * (regla verde-dominante de la casa; prohibido eucalipto/pino/retamo). El
 * guion del agente puede citarlas tal cual — es lámina de historia natural.
 */
export const OSO_BASTON_FLORA = Object.freeze({
  frailejon: Object.freeze({
    cientifico: 'Espeletia grandiflora',
    que: 'La roseta plata-verde que corona el cayado, con su flor amarilla de sol frío.',
    porque: 'El frailejón es el guardián de agua del páramo — el piso térmico del oso. Que corone su bastón dice de dónde es sin una palabra.',
  }),
  orquidea: Object.freeze({
    cientifico: 'Cattleya trianae',
    que: 'La orquídea de Mayo, lila con garganta amarilla, colgada del cayado.',
    porque: 'La flor nacional de Colombia, del bosque andino que el oso recorre y siembra. Humboldt la habría rotulado al margen.',
  }),
  enredadera: Object.freeze({
    cientifico: 'flora trepadora nativa',
    que: 'La enredadera verde que abraza el palo con sus hojas.',
    porque: 'El verde dominante de la casa: la vida se le trepa al caminante porque por donde pasa, germina (dispersor de semillas).',
  }),
});

/*
 * OSO_BASTON_PRESENCIA — cómo ocupa una escena 3D (el molde es
 * LUCIERNAGA_PRESENCIA: mismos campos, otro animal). El oso del bastón es de
 * SUELO y de MOLE: billboard grande, llega CAMINANDO a su marca, sombra de
 * contacto con peso real (nada de flotar).
 */
export const OSO_BASTON_PRESENCIA = {
  billboardBase: 62,
  billboardPorEnergia: 10,
  distancia: 6,
  /* Su marca en escena (llega a pie) y a ras de suelo. */
  percha: { x: 0.5, y: 0.62, z: 0.65 },
  rondaAltura: 0,
  /* Sombra de contacto FIRME: el caminante pesa (opuesto de la luciérnaga). */
  sombra: {
    radio: 0.42,
    opacidad: 0.3,
    opacidadBase: 0.34,
    opacidadMin: 0.18,
    atenuaPorAltura: 0.1,
    ensanchaPorAltura: 0.08,
  },
};

/*
 * PERFIL_OSO_BASTON — perfil de CLIMA→cuerpo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js), pasado vía `opts.perfil` (anti-conflicto: no toca
 * el archivo compartido). Mismo animal de bosque altoandino/páramo que el
 * guardián, con UNA diferencia de carácter:
 *   alas    false → sin aleteo.
 *   humedad 0.55 → pelaje denso de niebla: el agua apenas lo toca.
 *   difusa  0.5  → la mole erguida: la niebla apenas lo difumina.
 *   sequia  0.5  → sufre la seca un pelo MÁS que el guardián: carga flores
 *                  vivas en el bastón, y lo primero que marchita la seca es
 *                  la corona (el bioindicador del caminante).
 */
export const PERFIL_OSO_BASTON = Object.freeze({
  alas: false,
  humedad: 0.55,
  difusa: 0.5,
  sequia: 0.5,
});

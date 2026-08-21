/*
 * jaguarIdentidad — LA IDENTIDAD VISUAL DEL JAGUAR, COMO DATOS.
 *
 * Hermana de `abejaIdentidad.js` y `faunaAndina.js`: el JAGUAR (Panthera onca),
 * el felino de tierra cálida/selva, tiene aquí su silueta canónica. Rubber-hose
 * (Cuphead + Miss Minutes) con calidez campesina — el MISMO lenguaje de goma de
 * la abeja y el oso, otro animal y otro CARÁCTER: majestuoso, poderoso,
 * ACECHADOR. Sereno pero imponente, se mueve con acecho de hombros (los
 * omóplatos suben), la cola ondea con peso y la mirada felina es intensa. Su
 * color de poder es el PÚRPURA depredador (abeja=dorado, oso=rojo, rana=verde,
 * colibrí=iridiscente).
 *
 * REGLA DE ORO (idéntica a abejaIdentidad/faunaAndina): SOLO datos. Cero three,
 * cero react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA (animación) vive en `creatures.css` (clases
 * `rh-*`/`crt-*`/`jaguar-*`); el DIBUJO compone el KIT `_rubberhose.jsx`; el
 * CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo el PERFIL_JAGUAR de
 * abajo). El aura de poder (púrpura) vive en `transformacion.js` (AURA_POR_BICHO)
 * y la ropa por clima en `creatureClimaCuerpo.js` (ROPA_PERFIL_POR_BICHO): ambos
 * ya traen la fila 'jaguar' — este archivo NO la duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as JAGUAR_TINTA } from './_rubberhose.jsx';

/* Slug estable del jaguar (data-creature, aura, ropa, perfiles). */
export const JAGUAR_SLUG = 'jaguar';

/* ── JAGUAR — Panthera onca (el felino de tierra cálida/selva). Pelaje leonado
   dorado CON VOLUMEN (luz dorsal → sombra ventral, gradiente en el componente)
   y ROSETAS negras de ANILLO ROTO con centro ocre (su firma — manchas con
   centro, NO puntos como el leopardo), vientre crema, cuerpo MUSCULOSO, orejas
   redondas, mirada felina ÁMBAR intensa y cola larga y pesada. Majestuoso y
   poderoso: un animal con PESO (sombra de suelo), no un sticker. */
export const JAGUAR_PALETA = {
  cuerpo: '#d99a45',        // pelaje leonado dorado (tono medio)
  cuerpoLuz: '#e9b968',     // luz dorsal del pelaje (el sol sobre el lomo — volumen)
  cuerpoSombra: '#b06e2c',  // sombra ventral leonado→rojizo-marrón (la panza en penumbra)
  cuerpoGlow: 'rgba(217,154,69,0.7)',
  vientre: '#f4e6c8',       // pecho/vientre crema
  hombro: '#c9853a',        // omóplato un tono más hondo (el músculo del acecho)
  roseta: '#241608',        // el anillo negro de la roseta (tinta oscura cálida)
  rosetaCentro: '#a86a24',  // el centro ocre de la roseta (la firma: mancha con centro)
  hocico: '#f4e6c8',        // morro claro
  nariz: '#3a2012',         // trufa
  oreja: '#7a4718',         // dorso oscuro de la oreja
  iris: '#e8a53a',          // ojo felino ámbar (mirada intensa)
  colmillo: '#fff8ec',      // colmillos del rugido
  vibrisa: '#f7edd8',       // bigotes (vibrisas) crema claro
  sombraSuelo: 'rgba(36,22,8,0.38)', // la sombra bajo las zarpas (peso real)
  /* ── Registro NOCTURNO (el felino que anda de noche, como LUZ y no como
     símbolo) — acentos violeta/azul del cielo de noche + un cobre cálido que
     lo amarra al resto del elenco. */
  espectral: '#b98cff',     // el halo tenue que lo envuelve (violeta espectral)
  estrella: '#efe6ff',      // el titileo de estrellas sobre las rosetas
  ojoBrillo: '#ffe6a0',     // el ojo que devuelve la luz de noche (tapetum)
  bruma: '#cdb4ff',         // el velo de niebla a los pies
  mota: '#ece1ff',          // motas de luz que flotan lento
  marcaEspiritu: '#c9a4ff', // las rosetas gemelas que BRILLAN en la revelación
  cobre: '#e0a24a',         // glifos de ornamento geométrico (acento cobre)
  /* ── Piel Humboldt (la lámina ilustrada de lujo, siempre en VECTOR) ────────
     Tonos de PINTURA para el volumen painterly: no reemplazan cuerpo/luz/
     sombra (que siguen siendo la base del gradiente), los acompañan como masas
     de sombreado y luces altas — la ilustración naturalista sobre la goma. */
  lomo: '#b57d2e',          // el oro hondo de la franja dorsal (lomo al sol bajo)
  umbra: '#7c4a15',         // sombra de pintura (masas blandas, no tinta de contorno)
  brillo: '#f4d391',        // luz alta del pelaje (cresta del lomo, pómulo, anca)
  garra: '#e9dcbd',         // garras marfil de las zarpas
  lejos: '#9c6124',         // pelaje del lado de ALLÁ (patas lejanas en penumbra)
};

export const JAGUAR_PROPORCION = {
  troncoRx: 10.4,           // musculoso (más ancho que alto)
  troncoRy: 7.4,
  cabezaR: 6.2,
  orejaR: 2.2,              // orejas redondas de felino
  hombroAlto: 4.2,          // pico del omóplato en el acecho
};

/*
 * PERFIL_JAGUAR — el perfil de CLIMA→cuerpo del jaguar para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_OSO/PERFIL_RANA — se pasa vía
 * la opción `perfil`, así NO hay que tocar el archivo compartido (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.6  → pelaje lustroso que escurre el agua (no chorrea como la rana).
 *   difusa  0.5  → felino grande: la niebla apenas lo difumina (como la mole del oso).
 *   sequia  0.3  → de tierra cálida: robusto ante la seca (poco vulnerable).
 */
export const PERFIL_JAGUAR = Object.freeze({
  alas: false,
  humedad: 0.6,
  difusa: 0.5,
  sequia: 0.3,
});

/*
 * JAGUAR_PRESENCIA — cómo ocupa una escena 3D (el molde es ABEJA_PRESENCIA:
 * mismos campos, otro animal). El jaguar es FELINO DE SUELO: `percha.y` y
 * `rondaAltura` son la altura del CENTRO de su billboard sobre el PISO
 * mientras camina — jamás una altura de vuelo (no vuela, no trota: acecha).
 * Se planta un paso más allá del foco que la zarigüeya (distancia de
 * depredador que observa) y su sombra de contacto es FIRME: un felino grande
 * PESA (sombraSuelo es parte de su identidad — "no un sticker").
 */
export const JAGUAR_PRESENCIA = {
  /* Billboard <Html>: px base + ganancia por energía (0..1) y el
     distanceFactor de cámara. Grande (felino imponente) pero con ganancia
     corta: su poder es CONTENIDO — la energía no lo agranda, lo afila. */
  billboardBase: 58,
  billboardPorEnergia: 8,
  distancia: 6,
  /* Su marca junto al foco (llega CAMINANDO, agazapado) y la altura del
     centro del billboard mientras anda por el piso. */
  percha: { x: 0.62, y: 0.3, z: 0.72 },
  rondaAltura: 0.3,
  /* Sombra de contacto con peso real: casi siempre pegada a él (nunca se
     despega del suelo); apenas se atenúa si la coreografía lo sube a algo. */
  sombra: {
    radio: 0.46,
    opacidad: 0.3,
    opacidadBase: 0.36,
    opacidadMin: 0.16,
    atenuaPorAltura: 0.1,
    ensanchaPorAltura: 0.06,
  },
};

/*
 * JAGUAR_PODER_KART — el PODER del jaguar como piloto del kart, derivado de la
 * ecología (no al revés). Mismo shape que el `poder` de los pilotos benéficos
 * (id, alcance, titulo, efecto, porQue) para que el juego lo consuma sin
 * traducción. El GESTO que lo representa en el cuerpo 2.5D es el prop
 * `paisajeDelMiedo` de Jaguar.jsx (la onda de presencia + la mirada afilada).
 *
 * El "paisaje del miedo" (landscape of fear) es un concepto ecológico real: la
 * sola PRESENCIA de un depredador ápice como el jaguar (Panthera onca) altera
 * la conducta de las presas en TODO el paisaje —dónde comen, por dónde pasan—
 * sin que medie una sola depredación. Por eso el poder es de ÁREA y NO apunta a
 * nadie: no caza a un rival, reordena a todos con solo estar ahí.
 */
export const JAGUAR_PODER_KART = Object.freeze({
  id: 'paisaje-del-miedo',
  alcance: 'area',
  titulo: 'Paisaje del miedo',
  efecto: 'Suelta una onda de presencia depredadora: los rivales cercanos frenan y '
    + 'se dispersan un instante, sin tocarlos. No apunta a nadie — cambia el terreno.',
  porQue: 'El "paisaje del miedo" es real en ecología: la sola presencia del jaguar, '
    + 'depredador ápice, altera la conducta de las presas en todo el paisaje sin '
    + 'depredación directa. El poder es de ÁREA porque el miedo no elige a uno: los reordena a todos.',
});

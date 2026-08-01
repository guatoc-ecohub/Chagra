/*
 * borugoIdentidad — LA IDENTIDAD VISUAL DEL BORUGO, COMO DATOS.
 *
 * Hermana de `jaguarIdentidad.js` y `faunaAndina.js`: el BORUGO (Cuniculus
 * taczanowskii — la paca/lapa de montaña andina, el roedor nocturno de la
 * vereda), tiene aquí su silueta canónica. Rubber-hose (Cuphead + Miss Minutes)
 * con calidez campesina — el MISMO lenguaje de goma de la abeja, el oso y el
 * jaguar, otro animal y otro CARÁCTER: TIERNO, tímido, sereno, NOCTURNO. El alma
 * dulce del grupo, el que despierta el instinto de cuidar.
 *
 * EL ANIMAL DE CIERRE. En la realidad de la vereda lo cazan con perros para
 * vender su carne; en el mundo de Chagra lo honramos AL REVÉS: vivo, a salvo,
 * querido y digno. Nada de cacería ni sangre — solo ternura, dignidad y
 * esperanza. Su color de poder es la PLATA LUNAR / blanco luminoso (nocturno,
 * sagrado, un ser protegido que por fin se revela seguro) — distinto de los 8:
 * dorado (abeja), rojo (oso), verde (rana), iridiscente (colibrí), púrpura
 * (jaguar), ámbar (ardilla), turquesa (perezoso), bronce/ámbar-rojizo (morrocoy).
 *
 * REGLA DE ORO (idéntica a jaguarIdentidad/faunaAndina): SOLO datos. Cero three,
 * cero react. La creature del bundle base lo importa; jamás debe arrastrar
 * `vendor-three`. La CADENCIA (animación) vive en `creatures.css` (clases
 * `rh-*`/`crt-*`/`borugo-*`); el DIBUJO compone el KIT `_rubberhose.jsx`; el
 * CLIMA→cuerpo, en `creatureClimaCuerpo.js` (consumiendo el PERFIL_BORUGO de
 * abajo). El aura de poder (plata lunar) vive en `transformacion.js`
 * (AURA_POR_BICHO) y la ropa por clima en `creatureClimaCuerpo.js`
 * (ROPA_PERFIL_POR_BICHO): ambos ya traen la fila 'borugo' — este archivo NO la
 * duplica, solo la silueta.
 */

/* La tinta cálida del contorno es de TODA la familia rubber-hose. */
export { RH_INK as BORUGO_TINTA } from './_rubberhose.jsx';

/* Slug estable del borugo (data-creature, aura, ropa, perfiles). */
export const BORUGO_SLUG = 'borugo';

/* ── BORUGO — Cuniculus taczanowskii (la paca de montaña andina). Cuerpo
   ROBUSTO de pelaje PARDO cálido, con la firma inconfundible: HILERAS de motas
   crema/blancas por los flancos. Hocico romo con BIGOTES, ojos GRANDES nocturnos
   que reflejan la luna, orejitas cortas y atentas, patas cortas. Tierno, tímido,
   sereno. */
export const BORUGO_PALETA = {
  cuerpo: '#8a5a34',        // pelaje pardo cálido (montaña andina)
  cuerpoGlow: 'rgba(138,90,52,0.65)',
  lomo: '#6f4526',          // dorso un tono más hondo
  vientre: '#e9d5b4',       // panza clara crema
  hocico: '#a9744a',        // morro un poco más claro que el lomo
  nariz: '#3a2214',         // trufa (nariz que tiembla al olfatear)
  oreja: '#5a3a22',         // interior de la orejita corta
  mota: '#f5ead0',          // las motas crema de los flancos (LA FIRMA)
  motaLuz: '#fffaf0',       // el brillo tenue nocturno sobre las motas (luz lunar)
  bigote: '#e8dcc4',        // los bigotes claros
  iris: '#4a3320',          // ojo nocturno cálido oscuro (grande, dulce)
  ojoBrillo: '#fff6e0',     // catchlight lunar en el ojo (la luna reflejada)
  diente: '#fff8ec',        // incisivos suaves de roedor (tímidos, no agresivos)
  /* ── Nocturno sagrado (el ser protegido, la plata lunar) ── */
  luna: '#eaf2ff',          // el halo de luz lunar / plata (aura de poder, brillo de motas)
};

export const BORUGO_PROPORCION = {
  troncoRx: 9.8,            // robusto (más ancho que alto, roedor macizo)
  troncoRy: 7.0,
  cabezaR: 5.6,
  orejaR: 1.5,             // orejita corta y redonda (nocturna, atenta)
  bigoteLargo: 5.2,        // los bigotes que se abren al olfatear
};

/*
 * PERFIL_BORUGO — el perfil de CLIMA→cuerpo del borugo para `cuerpoDeClima`
 * (creatureClimaCuerpo.js). Mismo shape que PERFIL_OSO/PERFIL_JAGUAR — se pasa
 * vía la opción `perfil`, así NO hay que tocar el archivo compartido
 * (anti-conflicto).
 *   alas    false → sin aleteo (velocidadAlas siempre 1).
 *   humedad 0.6  → pelaje denso que empapa despacio (no chorrea como la rana).
 *   difusa  0.5  → roedor macizo: la niebla apenas lo difumina (como la mole del oso).
 *   sequia  0.4  → de montaña húmeda: sufre algo la seca, pero es robusto.
 */
export const PERFIL_BORUGO = Object.freeze({
  alas: false,
  humedad: 0.6,
  difusa: 0.5,
  sequia: 0.4,
});

/*
 * chivitoTintaIdentidad — LA IDENTIDAD DE LA TINTA NUEVA DEL CHIVITO, COMO
 * DATOS (2026-08-31, bases aprobadas por el operador). Hermano de
 * `zariguyaIdentidad.js`: solo datos, cero react, cero three.
 *
 * Vive APARTE de `chivitoIdentidad.js` a propósito: ese archivo documenta el
 * rig F24 del valle (otro arte, congelado) — esta es la paleta y el perfil de
 * la TINTA dibujada a mano (`ChivitoTinta.jsx`), verde-dominante.
 */

/* Paleta TINTA del chivito (verde-dominante, tierra de páramo). */
export const CHIVITO_TINTA_PALETA = {
  cuerpo: '#7c9440',        // el verde oliva del plumaje (dominante)
  cuerpoSombra: '#5d7330',  // flanco y plumas en sombra
  cuerpoGlow: 'rgba(124, 148, 64, 0.5)',
  ala: '#55702e',           // las alas-brazo y la cola, un verde más hondo
  panza: '#e3e5bd',         // pecho crema-verdoso donde cae la barba
  cara: '#f5efdb',          // la máscara clara de la cara
  corona: '#2c3320',        // el casquete oscuro (verde-tinta, no negro puro)
  barba: '#3fa35c',         // LA BARBA VERDE (su pendón)
  barbaSombra: '#2f7d46',   // las mechas de la barba
  crestaPluma: '#eee8d4',   // las plumas pálidas de la cresta
  crestaRaya: '#2c3320',    // la raya oscura de cada pluma
  punkPunta: '#9b4fd6',     // EL MORADO del mohawk (solo cuando actúa)
  panuelo: '#a3b06b',       // el pañuelo campesino verde salvia
  panueloSombra: '#7f8c4d', // el pliegue del pañuelo
  pico: '#57503c',          // pico córneo oscuro
  picoBajo: '#463f2e',      // la mandíbula inferior
  pata: '#8a7a52',          // patitas de cuerno
  lapizCuerpo: '#4f7d3a',   // el lápiz (verde, cómo no)
  lapizMadera: '#d9a05b',   // la madera sacada punta
  lapizBorrador: '#d1615a', // el borrador coral
  libroTapa: '#4a6b35',     // la tapa del cuaderno de campo
  libroPaginas: '#efe6c8',  // el canto de las páginas
};

/* Perfil de CLIMA→cuerpo (creatureClimaCuerpo): bicho DE páramo — la niebla es
   su casa (difusa baja), el aguacero lo despeina apenas, la seca sí lo alarma
   (el frailejonal seco es su hábitat perdido). */
export const PERFIL_CHIVITO_TINTA = Object.freeze({
  alas: true,
  humedad: 0.4,
  difusa: 0.45,
  sequia: 0.7,
});

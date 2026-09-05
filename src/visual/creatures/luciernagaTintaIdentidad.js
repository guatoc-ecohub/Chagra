/*
 * luciernagaTintaIdentidad — LA IDENTIDAD DE LA TINTA NUEVA DE LA LUCIÉRNAGA
 * DE PIE, COMO DATOS (2026-08-31, base aprobada por el operador). Hermana de
 * `zariguyaIdentidad.js`: solo datos, cero react, cero three.
 *
 * Vive APARTE de `luciernagaIdentidad.js` a propósito: LUCIERNAGA_PALETA es
 * del arte entomológico congelado (`Luciernaga.jsx`) — esta es la paleta del
 * PERSONAJE de pie (`LuciernagaTinta.jsx`): guantes, botas, lápiz + libro y
 * la linterna como acento. La FIRMA de especie (LUCIERNAGA_FIRMA) y el perfil
 * de clima (PERFIL_LUCIERNAGA) siguen mandando desde el archivo canónico.
 */

/* Paleta TINTA de la luciérnaga de pie (ámbar de cutícula + la luz fría). */
export const LUCIERNAGA_TINTA_PALETA = {
  cabeza: '#8a5a2e',        // la testa parda cálida
  cara: '#c99a5f',          // la carita clara
  pronoto: '#a5702f',       // el escudo-capucha detrás de la cabeza
  pronotoRibete: '#d8b070', // el ribete pálido del escudo
  pronotoMancha: '#42301a', // la mancha oscura central (patrón Lampyridae)
  torax: '#b07a35',         // el peto segmentado del pecho
  toraxRaya: '#7a5222',     // las costuras del peto
  elitro: '#5f3d1f',        // los faldones duros (élitros-levita)
  elitroMargen: '#c79a52',  // el margen lateral pálido (rasgo de especie)
  alaMembrana: '#2e2012',   // la puntica de ala membranosa que asoma debajo
  segmento: '#efe3ae',      // el primer segmento del abdomen (aún sin luz)
  cuerpoGlow: 'rgba(176, 122, 53, 0.45)',
  bota: '#7a4a26',          // las botas rubber-hose
  botaCana: '#9a6234',      // la caña de la bota
  lapizCuerpo: '#4f7d3a',   // el lápiz (verde, como el del chivito)
  lapizMadera: '#d9a05b',
  lapizBorrador: '#d1615a',
  libroTapa: '#4a6b35',
  libroPaginas: '#efe6c8',
  /* ── LA LINTERNA (su alma) ── */
  linternaMedio: '#e9fa8a', // el segmento encendido
  linternaNucleo: '#fbffd6',// el remate blanco-cálido
  haloDentro: '#eaff86',    // el halo, centro
  halo: '#c7ff4e',          // VERDE-LINTERNA (el mismo de su aura de poder)
};

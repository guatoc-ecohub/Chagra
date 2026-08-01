/*
 * artesania/ — el LENGUAJE DE FORMA de la mano campesina, en una sola puerta.
 *
 * Capa 3D del oficio andino (cestería, fique, guadua, loza negra), hermana
 * del vocabulario 2D de `../artesaniaAndina.js` y construida sobre
 * `../paleta/`. Cómo adoptarla: ./GUIA.md
 *
 * OJO AL CHUNK: este index exporta cosas CON three (geometrías, texturas,
 * materiales, kit R3F). Si solo necesitás el ADN puro (MANO, FIBRAS,
 * perfiles, temblorMano) para 2D/CSS/datos, importá directo de
 * './tramaAndina.js' — ese archivo es three-free a propósito.
 */

/* el ADN de la mano (three-free) */
export {
  MANO,
  FIBRAS,
  GUARDA_ACENTOS,
  temblorMano,
  combaCuerda,
  nudosGuadua,
  perfilGuadua,
  perfilCanasto,
} from './tramaAndina.js';

/* las superficies del taller (texturas procedurales, cacheadas) */
export {
  texturaTejido,
  texturaGuarda,
  texturaFique,
  texturaChamba,
  liberarTexturasArtesania,
} from './texturasArtesania.js';

/* las formas (fábricas puras de BufferGeometry) */
export {
  amanar,
  crearCuerdaFique,
  crearCuerdasFique,
  crearGuadua,
  crearAmarra,
  crearVasijaAmano,
  crearCanastoEspiral,
} from './geometriasArtesania.js';

/* las recetas de material (tier-safe, hermanas de materialesMadre) */
export {
  RECETAS_ARTESANIA,
  crearMaterialArtesania,
} from './materialesArtesania.js';

/* las piezas montadas (componentes R3F) */
export {
  CuerdaFique,
  PosteGuadua,
  CercaTejida,
  MarcoTelar,
  PanelArtesanal,
  VasijaChamba,
  CanastoAndino,
} from './ArtesaniaKit.jsx';

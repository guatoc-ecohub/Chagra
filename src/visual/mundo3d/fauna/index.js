/*
 * fauna/ — LOS GUARDIANES DEL MONTE, en registro realista.
 *
 * La puerta única del módulo. Cómo se usa, qué decisiones hay detrás y las tres
 * correcciones al encargo (jaguar/puma, águila, rana): ./README.md
 *
 * REGISTRO — la regla que no se rompe: en Chagra hay DOS registros y no se
 * mezclan. Los 9 bichos de `creatures/` son rubber-hose (caricatura con alma,
 * ya aprobada). Esto es lo OTRO: la fauna que el campesino ve o teme de verdad,
 * y va realista. No se importa nada de `creatures/` acá, a propósito.
 */
export {
  FAUNA_EMBLEMATICA,
  GUARDIANES,
  FAUNA_DE_PARAMO,
  fichaDe,
  FICHA_DANTA,
  FICHA_JAGUAR,
  FICHA_PUMA,
  FICHA_OSO,
  FICHA_TIGRILLO,
  FICHA_BORUGO,
  FICHA_COLIBRI,
  FICHA_RANA,
  FICHA_AGUILA,
} from './faunaEmblematica.js';

export { PELAJES, DANTA, JAGUAR, PUMA, OSO, TIGRILLO, BORUGO, COLIBRI, RANA, AGUILA } from './pelajes.js';

/* el motor de locomoción: las marchas y la ley anti-patinaje */
export {
  MARCHAS,
  pasoDePata,
  balanceoDelCuerpo,
  tobilloDeLaPostura,
  resolverDosHuesos,
  posarHueso,
  crearCola,
  moverCola,
  andarCamino,
} from './marcha.js';

export { construirCuadrupedo, detalleDeFauna, ANCLA_PIE, kitGeo } from './anatomiaFauna.geom.js';
export { crearRampa, colorEnRampa, anguloIridiscente, fuerzaDelDestello } from './iridiscencia.js';

export { default as CuadrupedoRealista } from './CuadrupedoRealista.jsx';
export { default as ColibriGuardian } from './ColibriGuardian.jsx';
export { default as RanaArlequin } from './RanaArlequin.jsx';
export { default as AguilaParamo } from './AguilaParamo.jsx';
export { default as EscenaFaunaEmblematica } from './EscenaFaunaEmblematica.jsx';

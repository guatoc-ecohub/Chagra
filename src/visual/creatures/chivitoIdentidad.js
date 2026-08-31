/*
 * chivitoIdentidad — LA IDENTIDAD DEL CHIVITO DE PÁRAMO, COMO DATOS.
 *
 * Mismo criterio que guacamayaIdentidad.js: el chivito-punk REUSA el rig F24
 * del valle (`~/demos/3d/compai/rigs/chivito.*`, copiado verbatim en
 * `arte-valle/`), no se redibuja a mano. Slug único `chivito-punk` (el
 * colapso chivito→chivito-punk ya vive en `compai/nucleo/elenco.js`, #96).
 *
 * PRIMERA PASADA (2026-08-14, unificación compAI a 7): PRESENCIA estimada
 * (Oxypogon guerinii, colibrí endémico de páramo — pequeño, vuela, percha
 * baja entre frailejones), sin medición real en el mundo 3D. compaiRegistry.js
 * NO consume esta presencia todavía (pendienteFable:true, cae a Angelita).
 */

/** Slug estable del chivito (data-creature, elenco, compaiRegistry). Colapsa
 *  con el jubilado `chivito` → `chivito-punk` en SLUGS_JUBILADOS. */
export const CHIVITO_SLUG = 'chivito-punk';

export const CHIVITO_NOMBRE = 'Chivito';

/* CHIVITO_PRESENCIA — colibrí pequeño de páramo: vuela bajo, cerca del
   frailejonal. Placeholder razonable, no medido — ver nota arriba. */
export const CHIVITO_PRESENCIA = {
  billboardBase: 40,
  billboardPorEnergia: 6,
  distancia: 5,
  percha: { x: 0.5, y: 0.5, z: 0.5 },
  rondaAltura: 0.7,
  sombra: {
    radio: 0.22,
    opacidad: 0.18,
    opacidadBase: 0.2,
    opacidadMin: 0.08,
    atenuaPorAltura: 0.18,
    ensanchaPorAltura: 0.03,
  },
};

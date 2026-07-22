/*
 * pisosBosqueGradiente — EL MAPEO piso térmico → Ent protagonista, para el
 * mundo "Los tres árboles maestros del gradiente" (`#/mockups/tres-ents-gradiente`).
 *
 * LA REGLA (decisión del operador, 2026-07-22, dura y pareja para todos):
 * a cada campesino le sale el Ent de SU piso térmico de protagonista — la
 * cámara puesta en él, su lección al frente. Y MÁXIMO DOS bosques a la vez:
 * no es una preferencia estética, es estructural. Se dibujan el protagonista
 * y UN vecino, el de ARRIBA (de donde baja el agua) — salvo el piso más alto
 * con Ent (hoy, el páramo), que no tiene piso arriba y muestra el de ABAJO.
 * Los demás NO se dibujan. Nada de "los tres/cuatro de fondo".
 *
 * SIN un piso térmico utilizable (sin perfil o perfil de demo) la regla
 * SIGUE aplicando igual:
 * cae al default concreto TEMPLADO + FRÍO, no a "mostrar todo". El roble es
 * el que mejor cuenta el gradiente sin contexto (cruza los tres pisos él
 * solo, de 750 a 3.450 m) y templado es el piso más común de la Colombia
 * andina campesina.
 *
 * AGREGAR UN ENT es una LÍNEA DE DATOS: sumar su id a `MAPA_PISO_ENT` (y
 * darle su terraza en `gradienteAndino.PISOS`). El orden altitudinal y el
 * cálculo del vecino ya saben leerla — nadie tiene que tocar esta lógica. Así
 * entró la ceiba de tierra caliente ('calido') el 2026-07-22, y así entraría
 * un superpáramo mañana.
 *
 * Módulo PURO (sin three, sin React): se puede testear sin montar un Canvas.
 */

/* Pisos térmicos de abajo (más caliente) a arriba (páramo). Mismos ids que
   `PISOS_TERMICOS_IDS` de `services/perfilFincaService.js` — la lista se
   REPITE literal a propósito: este módulo vive bajo `visual/mundo3d/bosque`
   (geometría, headless) y no puede importar el servicio del perfil, que
   arrastra `userProfileService`/localStorage al chunk 3D (el mismo cuidado
   que ya toma `mockups/valle/valleData.js`). */
export const ORDEN_PISOS_TERMICOS = Object.freeze(['calido', 'templado', 'frio', 'paramo']);

/* Qué Ent tiene tallado cada piso. La ceiba de tierra caliente aterrizó el
   2026-07-22 (*Ceiba pentandra*, con sus contrafuertes), así que ya no queda
   ningún piso sin guardián: los cuatro están tallados y el mapa está completo.
   Tal como decía la nota de arriba, entrar fue UNA LÍNEA — el orden altitudinal
   y el cálculo del vecino la leyeron solos. */
export const MAPA_PISO_ENT = Object.freeze({
  calido: 'ceiba',
  templado: 'roble',
  frio: 'aliso',
  paramo: 'quenua',
});

/** Los pisos que SÍ tienen Ent hoy, en el mismo orden altitudinal. */
export const PISOS_CON_ENT = Object.freeze(
  ORDEN_PISOS_TERMICOS.filter((id) => Boolean(MAPA_PISO_ENT[id])),
);

/** El default cuando no hay piso térmico utilizable: templado (el roble). */
export const PISO_DEFECTO = PISOS_CON_ENT.includes('templado') ? 'templado' : PISOS_CON_ENT[0];

/**
 * El VECINO de un piso: el de ARRIBA (de donde baja el agua), o el de ABAJO
 * si el piso es el más alto con Ent (hoy, el páramo). Solo cuenta pisos CON
 * Ent — un piso sin tallar nunca puede ser vecino de nadie.
 * @param {string} pisoId  un id de `PISOS_CON_ENT`
 * @returns {string|null}
 */
export function vecinoDePiso(pisoId) {
  const i = PISOS_CON_ENT.indexOf(pisoId);
  if (i === -1) return null;
  if (i < PISOS_CON_ENT.length - 1) return PISOS_CON_ENT[i + 1]; // el de arriba
  return i > 0 ? PISOS_CON_ENT[i - 1] : null; // el tope: el de abajo
}

/**
 * El piso PROTAGONISTA para el piso térmico de esta finca. NUNCA null: sin
 * un piso térmico con Ent (sin perfil, perfil de demo, o un piso todavía sin
 * tallar) cae al default concreto (templado). La regla del máximo-dos aplica
 * PAREJO para todos — no hay un "modo sin recortar".
 * @param {string|null|undefined} pisoTermico
 * @returns {string}
 */
export function protagonistaDePiso(pisoTermico) {
  return PISOS_CON_ENT.includes(pisoTermico) ? pisoTermico : PISO_DEFECTO;
}

/**
 * Los pisos que se DIBUJAN a la vez para una vista dada: esa vista + su
 * único vecino — nunca más de dos bosques a la vez. Si `vista` no es un piso
 * con Ent (no debería pasar viniendo de `protagonistaDePiso`/los botones, pero
 * es la red de seguridad de la escena), devuelve `null` = mostrar todo, para
 * no dejar el mundo vacío por un valor inválido.
 * @param {string} vista  un id de `PISOS_CON_ENT`
 * @returns {string[]|null}
 */
export function pisosVisiblesParaVista(vista) {
  if (!PISOS_CON_ENT.includes(vista)) return null;
  const vecino = vecinoDePiso(vista);
  return vecino ? [vista, vecino] : [vista];
}

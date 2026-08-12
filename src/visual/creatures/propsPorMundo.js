/*
 * propsPorMundo — DATA-DRIVEN: qué prop lleva el personaje en la mano al ENTRAR
 * a cada mundo (biblia de personajes, mapa prop-por-mundo). El bicho
 * del piso térmico entra heroico con su herramienta: agua→manguera, suelo→lupa,
 * animales→lazo, semillero→canasto, café→rama de café, compost→horqueta…
 *
 * Aquí SOLO viven los datos + el resolver (puro, testeable). El DIBUJO del prop
 * y su colocación en la mano viven en `PropEnMano.jsx`. Los ids de mundo salen
 * de `src/visual/mundo3d/mundoData.js` (MUNDO[*]).
 *
 * Species-agnostic: el prop depende del MUNDO, no del bicho. Un mundo sin prop
 * mapeado → null (el personaje entra con las manos libres, sin romperse).
 */

/* mundoId → id de prop (clave del registro de dibujos en PropEnMano). */
export const PROP_POR_MUNDO = Object.freeze({
  agua: 'manguera',
  suelo: 'lupa',
  animales: 'lazo',
  semillero: 'canasto',
  cafe: 'rama-cafe',
  abono: 'horqueta',   // compost
  cultivos: 'azadon',
  milpa: 'mazorca',
  frutales: 'naranja',
  mercado: 'canasto',
  sanidad: 'lupa',
  clima: 'paraguas',
  valle: 'mapa',
  pisos: 'montana',
  disenio: 'regla',
});

/**
 * Prop de un mundo por su id. Desconocido/no-string → null (manos libres).
 *
 * @param {string} mundoId
 * @returns {string|null} id de prop o null.
 */
export function propDeMundo(mundoId) {
  if (typeof mundoId !== 'string') return null;
  return PROP_POR_MUNDO[mundoId] || null;
}

/**
 * ¿Este mundo tiene prop de entrada?
 * @param {string} mundoId
 * @returns {boolean}
 */
export function mundoTieneProp(mundoId) {
  return propDeMundo(mundoId) !== null;
}

/* Los ids de prop que el registro de dibujos DEBE saber pintar (contrato: si
   agregás un mundo→prop nuevo aquí, agregá su dibujo en PropEnMano.DIBUJO_PROP).
   El test cruza ambos para que no quede un mundo apuntando a un prop sin dibujo. */
export const PROPS_CONOCIDOS = Object.freeze(
  Array.from(new Set(Object.values(PROP_POR_MUNDO))),
);

/*
 * materialesMadre — el SET CANÓNICO de materiales compartidos de los mundos.
 *
 * El patrón `perfil.materialRico ? MeshStandard : MeshLambert` ya es ley de
 * facto (FloraParamo, EntQuenua, Valle3D lo repiten a mano), pero cada mundo
 * elige SU roughness y SU flatShading — y el ojo lo nota: la madera del valle
 * no brilla como la de la finca. Este módulo vuelve RECETA esa costumbre:
 * un solo lugar decide cómo responde a la luz el follaje, la corteza, la
 * tierra, la roca, el agua, el musgo y la lámina de finca, en TODOS los tiers.
 *
 * Contrato tier-safe (deviceTier / DR §6):
 *   - perfil.materialRico === true  (tier alto)  → MeshStandardMaterial con la
 *     rugosidad de la receta (PBR mate: metalness 0 salvo agua/lámina).
 *   - perfil.materialRico === false (medio/bajo) → MeshLambertMaterial, que
 *     ignora roughness/metalness — la receta degrada SOLA, sin condicionales
 *     en el mundo.
 *   - `flatShading` sale de la receta (el follaje low-poly lo pide; la corteza
 *     orgánica lo apaga como EntQuenua) y respeta el perfil cuando la receta
 *     lo deja en 'perfil'.
 *   - El musgo es Lambert SIEMPRE (regla de EntQuenua: barato y se ve igual).
 *
 * USO (los creadores son PUROS; la escena memoiza y libera, como ya hace):
 *   const matFollaje = useMemo(() => crearMaterialMadre('follaje', perfil), [perfil]);
 *   useEffect(() => () => matFollaje.dispose(), [matFollaje]);
 *
 * Para mallas fusionadas con color por vértice (el patrón de floraParamo /
 * fincaRealista: UNA geometría, UN material blanco):
 *   const mat = useMemo(() => crearMaterialVertexColors(perfil), [perfil]);
 *
 * Nada aquí corre por frame: son fábricas que se llaman una vez por montaje.
 */
import * as THREE from 'three';
import { PALETA } from '../atmosferaMadre.js';
import { VERDES, TIERRAS, CORTEZAS, AGUAS, NEUTROS } from './paletaMadre.js';

/*
 * Las recetas. Campos:
 *   color   — hex de la paleta madre (override con `extra.color` si el mundo
 *             necesita SU variante: p. ej. corteza de quenual vs de roble).
 *   flat    — true/false fijo, o 'perfil' (= sigue perfil.flatShading).
 *   rico    — parámetros SOLO del tier alto (MeshStandard); Lambert los ignora.
 *   extras  — props comunes a ambos tiers (transparencias del agua).
 *   siempreLambert — materiales de relleno masivo (musgo) que ni en tier alto
 *                    ameritan PBR.
 */
export const RECETAS = {
  /* follaje low-poly: mate total, facetado — el verde de trabajo del juego */
  follaje: {
    color: VERDES.trabajo,
    flat: 'perfil',
    rico: { roughness: 0.9, metalness: 0 },
  },
  /* corteza orgánica: SUAVE (el relieve es geometría, no facetas — EntQuenua) */
  corteza: {
    color: CORTEZAS.roble,
    flat: false,
    rico: { roughness: 0.94, metalness: 0 },
  },
  /* tierra de labranza: mate absoluto, facetada como el terreno del valle */
  tierra: {
    color: TIERRAS.siembra,
    flat: 'perfil',
    rico: { roughness: 1, metalness: 0 },
  },
  /* roca de sierra/páramo: mate, facetada — hermana de la tierra */
  roca: {
    color: TIERRAS.rocaSierra,
    flat: 'perfil',
    rico: { roughness: 1, metalness: 0 },
  },
  /* agua viva: el único material con brillo y transparencia (receta Valle3D) */
  agua: {
    color: AGUAS.viva,
    flat: false,
    rico: { roughness: 0.2, metalness: 0.4 },
    extras: { transparent: true, opacity: 0.85 },
  },
  /* musgo de páramo: relleno masivo → Lambert SIEMPRE (regla EntQuenua) */
  musgo: {
    color: VERDES.paramoMusgo,
    flat: false,
    siempreLambert: true,
  },
  /* madera trabajada de finca: poste, tabla, mango — mate con un dejo de veta */
  madera: {
    color: PALETA.madera,
    flat: 'perfil',
    rico: { roughness: 0.85, metalness: 0 },
  },
  /* lámina/zinc/herraje: el único metal, y aun así tibio y gastado */
  lamina: {
    color: NEUTROS.lamina,
    flat: false,
    rico: { roughness: 0.5, metalness: 0.25 },
  },
  /* pared encalada: mate, casi luz hecha materia */
  cal: {
    color: NEUTROS.cal,
    flat: false,
    rico: { roughness: 0.95, metalness: 0 },
  },
};

/* ¿flatShading efectivo? La receta manda; 'perfil' delega en el tier. */
function flatDe(receta, perfil) {
  if (receta.flat === 'perfil') return !!(perfil && perfil.flatShading);
  return !!receta.flat;
}

/**
 * Crea el material canónico `nombre` para el `perfil` de render del tier.
 * PURO: quien llama memoiza (useMemo) y libera (dispose) al desmontar.
 *
 * @param {keyof typeof RECETAS} nombre  receta de la casa ('follaje', 'agua'…)
 * @param {{ materialRico?: boolean, flatShading?: boolean }} perfil  perfilDeTier(tier)
 * @param {object} [extra]  overrides finales (p. ej. { color: CORTEZAS.quenual })
 * @returns {THREE.Material}
 */
export function crearMaterialMadre(nombre, perfil, extra = {}) {
  const receta = RECETAS[nombre];
  if (!receta) throw new Error(`materialesMadre: receta desconocida '${nombre}'`);
  const base = {
    color: receta.color,
    flatShading: flatDe(receta, perfil),
    ...(receta.extras || {}),
  };
  const rico = !!(perfil && perfil.materialRico) && !receta.siempreLambert;
  const mat = rico
    ? new THREE.MeshStandardMaterial({ ...base, ...(receta.rico || {}), ...extra })
    : new THREE.MeshLambertMaterial({ ...base, ...extra });
  return mat;
}

/**
 * El material ÚNICO para mallas fusionadas con color por vértice — el patrón
 * de floraParamo/fincaRealista/Valle3D (una geometría merged, un material).
 * Misma respuesta a la luz que 'follaje' (roughness 0.9), porque eso es lo
 * que esas mallas ya son: vegetación y finca horneadas.
 *
 * @param {{ materialRico?: boolean, flatShading?: boolean }} perfil
 * @param {{ flatShading?: boolean, roughness?: number }} [opciones]
 * @returns {THREE.Material}
 */
export function crearMaterialVertexColors(perfil, opciones = {}) {
  const base = {
    vertexColors: true,
    flatShading: opciones.flatShading ?? !!(perfil && perfil.flatShading),
  };
  return perfil && perfil.materialRico
    ? new THREE.MeshStandardMaterial({
        ...base,
        roughness: opciones.roughness ?? 0.9,
        metalness: 0,
      })
    : new THREE.MeshLambertMaterial(base);
}

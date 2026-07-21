/*
 * materialesArtesania — las recetas de material del TALLER, hermanas de
 * `paleta/materialesMadre.js` (mismo contrato tier-safe) pero con el mapa
 * procedural del oficio encima:
 *
 *   fique  — fibra de cabuya: sarga diagonal, mate total.
 *   guadua — el poste curado: color plano (los nudos son GEOMETRÍA, no mapa).
 *   chamba — loza negra bruñida: la ÚNICA superficie artesanal con brillo
 *            (roughness 0.45 en tier alto), porque el bruñido a piedra ES un
 *            brillo — pero sin metalness: el barro nunca es metal.
 *   tejido — tela llana clara: el fondo de paneles y contenedores.
 *   guarda — la banda de acentos del telar (para cintas, filos, correas).
 *   barro  — terracota sin ahumar, mate (color plano, torno crudo).
 *
 * Contrato idéntico a la casa: perfil.materialRico → MeshStandardMaterial
 * con la rugosidad de la receta; medio/bajo → MeshLambertMaterial (que usa
 * el mismo mapa: la degradación es gratis). PURO: quien llama memoiza y
 * libera con dispose(). Las TEXTURAS son compartidas (caché del taller) —
 * material.dispose() no las toca; se liberan con liberarTexturasArtesania().
 */
import * as THREE from 'three';
import { FIBRAS } from './tramaAndina.js';
import {
  texturaTejido,
  texturaGuarda,
  texturaFique,
  texturaChamba,
} from './texturasArtesania.js';

export const RECETAS_ARTESANIA = {
  fique: { color: FIBRAS.fiqueClaro, mapa: texturaFique, rico: { roughness: 0.95, metalness: 0 } },
  guadua: { color: FIBRAS.guadua, rico: { roughness: 0.7, metalness: 0 } },
  chamba: { color: FIBRAS.chambaBrillo, mapa: texturaChamba, rico: { roughness: 0.45, metalness: 0 } },
  tejido: { color: FIBRAS.lanaCruda, mapa: texturaTejido, rico: { roughness: 0.92, metalness: 0 } },
  guarda: { color: '#ffffff', mapa: texturaGuarda, rico: { roughness: 0.92, metalness: 0 } },
  barro: { color: FIBRAS.barroCocido, rico: { roughness: 0.88, metalness: 0 } },
};

/*
 * Nota de color: cuando hay mapa, `color` MULTIPLICA la textura. Fique y
 * chamba usan su tono claro para que el mapa (que ya trae la sombra de la
 * fibra) no se hunda; la guarda va en blanco porque sus acentos textiles
 * llegan del canvas ya afinados — teñirlos sería desafinar la cochinilla.
 */

/**
 * Crea el material de taller `nombre` para el perfil del tier.
 *
 * @param {keyof typeof RECETAS_ARTESANIA} nombre — receta ('fique', 'chamba'…)
 * @param {{ materialRico?: boolean }} [perfil] — perfilDeTier(tier)
 * @param {object} [extra] — overrides finales (p. ej. { color })
 * @param {{ repetir?: [number, number] }} [mapa] — cuántas veces repite la
 *   textura sobre la pieza (un panel ancho quiere más casillas de tejido).
 * @returns {THREE.Material}
 */
export function crearMaterialArtesania(nombre, perfil = {}, extra = {}, mapa = {}) {
  const receta = RECETAS_ARTESANIA[nombre];
  if (!receta) throw new Error(`materialesArtesania: receta desconocida '${nombre}'`);
  const map = receta.mapa ? receta.mapa(mapa) : null; // null sin DOM: degrada a color plano
  const base = {
    color: receta.color,
    ...(map ? { map } : {}),
    ...extra,
  };
  return perfil.materialRico
    ? new THREE.MeshStandardMaterial({ ...receta.rico, ...base })
    : new THREE.MeshLambertMaterial(base);
}

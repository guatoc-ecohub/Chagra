/*
 * compaiRegistry — EL COMPAÑERO DEL MUNDO 3D SEGÚN EL AVATAR ELEGIDO.
 *
 * El bug histórico ("oso→abeja"): el compañero que vuela por los mundos 3D era
 * SIEMPRE Angelita (AbejaEscena hard-wired en EscenaBase3D), sin mirar el avatar
 * que el usuario eligió en el selector. Este registro es la mesa de ruteo:
 *
 *     avatarType ('angelita'|'maiz'|'zariguya')  →  cómo se presenta en 3D.
 *
 * REGLA DEL FALLBACK: hoy SOLO Angelita tiene presencia 3D propia (coreografía
 * useEntradaAbeja + ABEJA_PRESENCIA). El maíz y la zarigüeya YA son opciones de
 * avatar (useAgentAvatarType) pero todavía NO tienen arte 3D — esperan el Fable
 * de compai (#5). Mientras tanto caen a Angelita: es mejor la abeja que un maíz
 * o una zarigüeya "volando" con la coreografía de la abeja (sería peor). Cuando
 * el Fable aterrice su <XEscena> + su presencia, se registran aquí y el mundo
 * refleja la elección SIN tocar EscenaBase3D ni las escenas de cada mundo.
 *
 * SOLO DATOS + tipos: no arrastra three ni componentes de arte al importarse.
 */
import { ABEJA_PRESENCIA } from '../../creatures/abejaIdentidad.js';
import { AVATAR_TYPES, DEFAULT_AVATAR_TYPE } from '../../../hooks/useAgentAvatarType.js';

/**
 * EL CONTRATO DE PRESENCIA 3D que todo compañero debe cumplir para vivir en un
 * mundo (la referencia es ABEJA_PRESENCIA en abejaIdentidad.js):
 * @typedef {Object} CompaiPresencia
 * @property {number} billboardBase       px base del billboard <Html>.
 * @property {number} billboardPorEnergia ganancia de px por energía (0..1).
 * @property {number} distancia           distanceFactor de la cámara.
 * @property {{x:number,y:number,z:number}} percha  su posición junto al foco.
 * @property {number} rondaAltura         altura a la que ronda cuando no entra.
 * @property {{radio:number,opacidad:number,opacidadBase:number,opacidadMin:number,atenuaPorAltura:number,ensanchaPorAltura:number}} sombra  su sombra de contacto.
 *
 * Además, el arte del compañero debe traer su FIRMA DE SILUETA (como
 * ZARIGUYA_FIRMA / abejaIdentidad) — legible a tamaño billboard — y su idle /
 * seguir-al-foco / reacción, al nivel de Angelita.
 */

/**
 * @typedef {Object} CompaiEntry
 * @property {string} avatarType  el tipo resuelto ('angelita'|'maiz'|'zariguya').
 * @property {(import('react').ComponentType|null)} EscenaComponent  la escena 3D
 *   PROPIA del compañero (coreografía + cuerpo). `null` → usa la coreografía y el
 *   cuerpo de Angelita (AbejaEscena) como fallback, sin regresión.
 * @property {CompaiPresencia} presencia  cómo se dimensiona/posa en 3D.
 * @property {string} especie  slug `data-creature` del cuerpo activo.
 * @property {boolean} pendienteFable  aún sin arte 3D propio (cae a la abeja).
 * @property {boolean} esFallback  el tipo pedido no resolvió a una escena propia.
 */

/* El mapa. `EscenaComponent: null` = todavía lo dibuja Angelita. Fable rellena. */
const REGISTRO = {
  angelita: { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'abeja-angelita', pendienteFable: false },
  // TODO(fable #5): MaizCompaiEscena + maizIdentidad (presencia propia, brisa
  //   asimétrica). Hoy: fallback a Angelita.
  maiz: { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'abeja-angelita', pendienteFable: true },
  // TODO(fable #5): ZariguyaCompaiEscena + su presencia 3D. zariguyaIdentidad ya
  //   trae FIRMA/PALETA/PROPORCION; falta _PRESENCIA + coreografía (marsupial
  //   nocturno que camina, NO vuela). Hoy: fallback a Angelita.
  zariguya: { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'abeja-angelita', pendienteFable: true },
};

/**
 * Resuelve el compañero 3D para un tipo de avatar. Tipo desconocido/ausente →
 * el default (Angelita). Nunca lanza; siempre devuelve una entrada usable.
 * @param {string} avatarType
 * @returns {CompaiEntry}
 */
export function resolverCompai(avatarType) {
  const pedido = AVATAR_TYPES.includes(avatarType) ? avatarType : DEFAULT_AVATAR_TYPE;
  const base = REGISTRO[pedido] ?? REGISTRO[DEFAULT_AVATAR_TYPE];
  return {
    avatarType: pedido,
    EscenaComponent: base.EscenaComponent ?? null,
    presencia: base.presencia ?? ABEJA_PRESENCIA,
    especie: base.especie ?? 'abeja-angelita',
    pendienteFable: !!base.pendienteFable,
    esFallback: base.EscenaComponent == null,
  };
}

export { REGISTRO as COMPAI_REGISTRO };

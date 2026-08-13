/*
 * compaiRegistry — EL COMPAÑERO DEL MUNDO 3D SEGÚN EL AVATAR ELEGIDO.
 *
 * El bug histórico ("oso→abeja"): el compañero que vuela por los mundos 3D era
 * SIEMPRE Angelita (AbejaEscena hard-wired en EscenaBase3D), sin mirar el avatar
 * que el usuario eligió en el selector. Este registro es la mesa de ruteo:
 *
 *     avatarType ('angelita'|'maiz'|'zariguya')  →  cómo se presenta en 3D.
 *
 * REGLA DEL FALLBACK: todo tipo del registro sin `EscenaComponent` propio cae
 * a Angelita (mejor la abeja que un compañero volando con coreografía ajena).
 * Desde 2026-07-29 los TRES tipos tienen presencia propia: Angelita
 * (useEntradaAbeja, la nativa), el MAÍZ (MaizCompaiEscena: arraigado, brota y
 * se inclina al foco) y la ZARIGÜEYA (ZariguyaCompaiEscena: trota por el piso
 * y se encarama — jamás vuela). El mundo refleja la elección SIN tocar
 * EscenaBase3D ni las escenas de cada mundo.
 *
 * NOTA de peso: desde que Fable registró las escenas, este módulo SÍ arrastra
 * arte (y three, transitivamente). Es correcto: vive dentro de escenas/ (el
 * chunk perezoso `vendor-three`) y sus únicos consumidores son CompaiEscena /
 * useCompaiElegido, que ya viven ahí. JAMÁS importarlo desde el bundle base.
 */
import { ABEJA_PRESENCIA } from '../../creatures/abejaIdentidad.js';
import { MAIZ_PRESENCIA } from '../../creatures/maizIdentidad.js';
import { ZARIGUYA_PRESENCIA } from '../../creatures/zariguyaIdentidad.js';
import { MaizCompaiEscena } from './MaizCompaiEscena.jsx';
import { ZariguyaCompaiEscena } from './ZariguyaCompaiEscena.jsx';
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

/* El mapa. `EscenaComponent: null` = lo dibuja Angelita (regla del fallback).
   Angelita queda en null A PROPÓSITO: su escena (AbejaEscena) es el fallback
   nativo que CompaiEscena monta directo — registrarla aquí sería un ciclo de
   imports con useEntradaAbeja sin ganar nada. */
const REGISTRO = {
  angelita: { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'abeja-angelita', pendienteFable: false },
  // El MAÍZ compañero (fable #5): arraigado — brota del montículo, se mece
  // con brisa asimétrica, se INCLINA hacia el foco y el penacho vibra.
  maiz: { EscenaComponent: MaizCompaiEscena, presencia: MAIZ_PRESENCIA, especie: 'maiz', pendienteFable: false },
  // La ZARIGÜEYA compañera (fable #5): marsupial nocturno DE PISO — llega
  // trotando, merodea, se encarama al foco en alto y husmea. Crías al lomo
  // de serie (su firma). Jamás vuela.
  zariguya: { EscenaComponent: ZariguyaCompaiEscena, presencia: ZARIGUYA_PRESENCIA, especie: 'zariguya', pendienteFable: false },
  // Jaguar, oso del bastón y luciérnaga (ítem #8 del GAP compAI, 2026-08-13):
  // ya tienen cuerpo 2.5D propio (avatares/catálogo) pero TODAVÍA no tienen
  // coreografía de presencia 3D en los mundos (billboard/percha/sombra
  // propios) — `pendienteFable:true` los deja explícitos como pendientes.
  // Caen a la regla del fallback: se ven como Angelita dentro de un mundo 3D
  // hasta que Fable les construya su propio `EscenaComponent`.
  jaguar: { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'jaguar', pendienteFable: true },
  'oso-baston': { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'oso-baston', pendienteFable: true },
  luciernaga: { EscenaComponent: null, presencia: ABEJA_PRESENCIA, especie: 'luciernaga', pendienteFable: true },
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

/*
 * compaiRegistry — EL COMPAÑERO DEL MUNDO 3D SEGÚN EL AVATAR ELEGIDO.
 *
 * El bug histórico ("oso→abeja"): el compañero que vuela por los mundos 3D era
 * SIEMPRE Angelita (AbejaEscena hard-wired en EscenaBase3D), sin mirar el avatar
 * que el usuario eligió en el selector. Este registro es la mesa de ruteo:
 *
 *     avatarType ('angelita'|'zariguya'|'jaguar'|…)  →  cómo se presenta en 3D.
 *
 * REGLA DEL FALLBACK: todo tipo del registro sin `EscenaComponent` propio cae
 * a Angelita (mejor la abeja que un compañero volando con coreografía ajena).
 * Desde 2026-08-13 cinco tipos tienen presencia propia: Angelita
 * (useEntradaAbeja, la nativa), la ZARIGÜEYA (trota por el piso y se
 * encarama — jamás vuela), el JAGUAR (acecha, camina pesado y silencioso, se
 * echa — jamás vuela ni trota), el OSO DEL BASTÓN (anda erguido y lento, se
 * apoya en el cayado, florece al llegar) y la LUCIÉRNAGA (deriva lento y
 * PULSA LUZ — vuela, pero jamás como la abeja). El mundo refleja la elección
 * SIN tocar EscenaBase3D ni las escenas de cada mundo.
 *
 * ROSTER A 7 (2026-08-14, decisión del operador): 'maiz' SE RETIRÓ del
 * selector — su REGISTRO y las importaciones de MaizCompai/MaizCompaiEscena
 * salieron de aquí (el cuerpo sigue existiendo en `visual/creatures/`, solo
 * dejó de estar cableado a un avatarType elegible; ver
 * `compai/nucleo/elenco.js` SLUGS_JUBILADOS para la migración). Entraron
 * 'guacamaya' y 'chivito-punk' — YA tienen cuerpo 2.5D en la PWA pero AÚN no
 * coreografía 3D propia, quedan `pendienteFable:true` (caen a Angelita aquí,
 * igual que jaguar/oso-baston/luciernaga antes de F26).
 *
 * NOTA de peso: desde que Fable registró las escenas, este módulo SÍ arrastra
 * arte (y three, transitivamente). Es correcto: vive dentro de escenas/ (el
 * chunk perezoso `vendor-three`) y sus únicos consumidores son CompaiEscena /
 * useCompaiElegido, que ya viven ahí. JAMÁS importarlo desde el bundle base.
 */
import { ABEJA_PRESENCIA } from '../../creatures/abejaIdentidad.js';
import { ZARIGUYA_PRESENCIA } from '../../creatures/zariguyaIdentidad.js';
import { JAGUAR_PRESENCIA } from '../../creatures/jaguarIdentidad.js';
import { OSO_BASTON_PRESENCIA } from '../../creatures/osoBastonIdentidad.js';
import { LUCIERNAGA_PRESENCIA } from '../../creatures/luciernagaIdentidad.js';
import { ZariguyaCompaiEscena } from './ZariguyaCompaiEscena.jsx';
import { JaguarCompaiEscena } from './JaguarCompaiEscena.jsx';
import { OsoBastonCompaiEscena } from './OsoBastonCompaiEscena.jsx';
import { LuciernagaCompaiEscena } from './LuciernagaCompaiEscena.jsx';
import { AVATAR_TYPES, DEFAULT_AVATAR_TYPE } from '../../../hooks/useAgentAvatarType.js';
import JaguarLaminaViva from '../../creatures/JaguarLaminaViva.jsx';
import ZariguyaLaminaViva from '../../creatures/ZariguyaLaminaViva.jsx';
import LuciernagaLaminaViva from '../../creatures/LuciernagaLaminaViva.jsx';

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
 * @property {string} avatarType  el tipo resuelto ('angelita'|'zariguya'|'jaguar'|…).
 * @property {(import('react').ComponentType|null)} EscenaComponent  la escena 3D
 *   PROPIA del compañero (coreografía + cuerpo). `null` → usa la coreografía y el
 *   cuerpo de Angelita (AbejaEscena) como fallback, sin regresión.
 * @property {(import('react').ComponentType|null)} PortalComponent  el cuerpo 2D
 *   que cruza hacia el mundo. `null` → el portal de Angelita, igual que el
 *   fallback 3D.
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
  angelita: {
    EscenaComponent: null,
    PortalComponent: null,
    presencia: ABEJA_PRESENCIA,
    especie: 'abeja-angelita',
    pendienteFable: false,
  },
  // El MAÍZ compañero SALIÓ del registro el 2026-08-14 (retirado del roster,
  // ver la nota "ROSTER A 7" arriba) — MaizCompaiEscena.jsx/MaizCompai.jsx
  // siguen en el repo, solo dejaron de estar cableados aquí.
  //
  // La ZARIGÜEYA compañera (fable #5): marsupial nocturno DE PISO — llega
  // trotando, merodea, se encarama al foco en alto y husmea. Crías al lomo
  // de serie (su firma). Jamás vuela.
  zariguya: {
    EscenaComponent: ZariguyaCompaiEscena,
    PortalComponent: ZariguyaLaminaViva,
    presencia: ZARIGUYA_PRESENCIA,
    especie: 'zariguya',
    pendienteFable: false,
  },
  // El JAGUAR compañero (fable F26): felino DE SUELO — entra acechando desde
  // el borde, camina pesado y silencioso (rodar de hombros, cero bob), viaja
  // con la marcha de perfil del cuerpo, patrulla en óvalos amplios y se echa.
  // Jamás vuela, jamás trota. El portal cruza con la misma lámina viva que
  // usa la escena y el selector.
  jaguar: { EscenaComponent: JaguarCompaiEscena, PortalComponent: JaguarLaminaViva, presencia: JAGUAR_PRESENCIA, especie: 'jaguar', pendienteFable: false },
  // El OSO DEL BASTÓN compañero (fable F26): caminante de trocha — llega a
  // pie, anda erguido y LENTO, se detiene a apoyarse en el cayado, y al
  // llegar a su marca el bastón FLORECE (su ecología hecha celebración).
  // PortalComponent pendiente, mismo criterio que el jaguar.
  'oso-baston': { EscenaComponent: OsoBastonCompaiEscena, PortalComponent: null, presencia: OSO_BASTON_PRESENCIA, especie: 'oso-baston', pendienteFable: false },
  // La LUCIÉRNAGA compañera (fable F26): sí vuela, pero NO como la abeja —
  // se ENCIENDE por pulsos al entrar, deriva lento y bajo, PULSA luz, se
  // detiene a leer la noche y con alerta de finca titila 'degradado'.
  luciernaga: { EscenaComponent: LuciernagaCompaiEscena, PortalComponent: LuciernagaLaminaViva, presencia: LUCIERNAGA_PRESENCIA, especie: 'luciernaga', pendienteFable: false },
  // La GUACAMAYA y el CHIVITO DE PÁRAMO (roster-7, 2026-08-14): ya tienen
  // cuerpo 2.5D en la PWA (GuacamayaCompai.jsx/ChivitoPunk.jsx, reusan el rig F24
  // del valle) pero TODAVÍA no tienen coreografía 3D propia — quedan
  // `pendienteFable:true` y caen a Angelita en el mundo 3D (regla del
  // fallback, igual que jaguar/oso-baston/luciernaga antes de F26). Cuando
  // alguien las coreografíe, sus PRESENCIA de placeholder ya están sembradas
  // en `guacamayaIdentidad.js`/`chivitoIdentidad.js` (visual/creatures/).
  guacamaya: { EscenaComponent: null, PortalComponent: null, presencia: null, especie: 'guacamaya', pendienteFable: true },
  'chivito-punk': { EscenaComponent: null, PortalComponent: null, presencia: null, especie: 'chivito-punk', pendienteFable: true },
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
    PortalComponent: base.PortalComponent ?? null,
    presencia: base.presencia ?? ABEJA_PRESENCIA,
    especie: base.especie ?? 'abeja-angelita',
    pendienteFable: !!base.pendienteFable,
    esFallback: base.EscenaComponent == null,
  };
}

export { REGISTRO as COMPAI_REGISTRO };

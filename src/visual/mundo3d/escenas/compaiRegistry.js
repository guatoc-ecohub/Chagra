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
 * ROSTER A 8 (2026-08-14, decisión del operador): 'maiz' y 'guacamaya' SE
 * RETIRARON del selector — sus REGISTROS y las importaciones salieron de aquí
 * (los cuerpos siguen existiendo en `visual/creatures/`, solo dejaron de estar
 * cableados a un avatarType elegible; ver `compai/nucleo/elenco.js`
 * SLUGS_JUBILADOS para la migración). Quedaron 'chivito-punk' (con cuerpo
 * 2.5D en la PWA pero sin coreografía 3D propia, `pendienteFable:true`, cae a
 * Angelita aquí) y entraron 'dante' y 'oliver' (AÚN sin arte 3D propio,
 * también `pendienteFable:true`, caen a Angelita aquí por el mismo fallback).
 *
 * NOTA de peso: desde que Fable registró las escenas, este módulo SÍ arrastra
 * arte (y three, transitivamente). Es correcto: vive dentro de escenas/ (el
 * chunk perezoso `vendor-three`) y sus únicos consumidores son CompaiEscena /
 * useCompaiElegido, que ya viven ahí. JAMÁS importarlo desde el bundle base.
 */
import { ABEJA_PRESENCIA } from '../../creatures/abejaIdentidad.js';
import { Zariguya } from '../../creatures/Zariguya.jsx';
import { ZARIGUYA_PRESENCIA } from '../../creatures/zariguyaIdentidad.js';
import { JAGUAR_PRESENCIA } from '../../creatures/jaguarIdentidad.js';
import { OSO_BASTON_PRESENCIA } from '../../creatures/osoBastonIdentidad.js';
import { LUCIERNAGA_PRESENCIA } from '../../creatures/luciernagaIdentidad.js';
import { ZariguyaCompaiEscena } from './ZariguyaCompaiEscena.jsx';
import { JaguarCompaiEscena } from './JaguarCompaiEscena.jsx';
import { OsoBastonCompaiEscena } from './OsoBastonCompaiEscena.jsx';
import { LuciernagaCompaiEscena } from './LuciernagaCompaiEscena.jsx';
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
  // El MAÍZ y la GUACAMAYA compañeros SALIERON del registro el 2026-08-14
  // (retirados del roster, ver la nota "ROSTER A 8" arriba) — sus compAI
  // siguen existiendo en `visual/creatures/`, solo dejaron de estar cableados
  // aquí.
  //
  // La ZARIGÜEYA compañera (fable #5): marsupial nocturno DE PISO — llega
  // trotando, merodea, se encarama al foco en alto y husmea. Crías al lomo
  // de serie (su firma). Jamás vuela.
  zariguya: {
    EscenaComponent: ZariguyaCompaiEscena,
    PortalComponent: Zariguya,
    presencia: ZARIGUYA_PRESENCIA,
    especie: 'zariguya',
    pendienteFable: false,
  },
  // El JAGUAR compañero (fable F26): felino DE SUELO — entra acechando desde
  // el borde, camina pesado y silencioso (rodar de hombros, cero bob), viaja
  // con la marcha de perfil del cuerpo, patrulla en óvalos amplios y se echa.
  // Jamás vuela, jamás trota. Su PortalComponent (cuerpo 2D del portal) sigue
  // pendiente — F26 solo cubrió la presencia 3D — así que el portal cruza
  // con el cuerpo de Angelita hasta que exista (regla del fallback, ver
  // cuerpoPortalDe en CompaiTransicion.jsx).
  jaguar: { EscenaComponent: JaguarCompaiEscena, PortalComponent: null, presencia: JAGUAR_PRESENCIA, especie: 'jaguar', pendienteFable: false },
  // El OSO DEL BASTÓN compañero (fable F26): caminante de trocha — llega a
  // pie, anda erguido y LENTO, se detiene a apoyarse en el cayado, y al
  // llegar a su marca el bastón FLORECE (su ecología hecha celebración).
  // PortalComponent pendiente, mismo criterio que el jaguar.
  'oso-baston': { EscenaComponent: OsoBastonCompaiEscena, PortalComponent: null, presencia: OSO_BASTON_PRESENCIA, especie: 'oso-baston', pendienteFable: false },
  // La LUCIÉRNAGA compañera (fable F26): sí vuela, pero NO como la abeja —
  // se ENCIENDE por pulsos al entrar, deriva lento y bajo, PULSA luz, se
  // detiene a leer la noche y con alerta de finca titila 'degradado'.
  // PortalComponent pendiente, mismo criterio que el jaguar.
  luciernaga: { EscenaComponent: LuciernagaCompaiEscena, PortalComponent: null, presencia: LUCIERNAGA_PRESENCIA, especie: 'luciernaga', pendienteFable: false },
  // DANTE y OLIVER (roster-8, 2026-08-14): AÚN sin arte 3D propio (es de
  // Fable, hoy en hold del operador). Entran con `pendienteFable:true` y caen
  // a Angelita en el mundo 3D por el fallback de CompaiTransicion.jsx —
  // mismo mecanismo que jaguar/oso-baston/luciernaga antes de F26. Cuando
  // Fable complete sus escenas, sus PRESENCIA se sembrarán en
  // `danteIdentidad.js`/`oliverIdentidad.js` (visual/creatures/).
  dante: { EscenaComponent: null, PortalComponent: null, presencia: null, especie: 'dante', pendienteFable: true },
  oliver: { EscenaComponent: null, PortalComponent: null, presencia: null, especie: 'oliver', pendienteFable: true },
  // El CHIVITO DE PÁRAMO (roster-8, 2026-08-14): ya tiene cuerpo 2.5D en la
  // PWA (ChivitoPunk.jsx, reusa el rig F24 del valle) pero TODAVÍA no tiene
  // coreografía 3D propia — queda `pendienteFable:true` y cae a Angelita en
  // el mundo 3D (regla del fallback, igual que jaguar/oso-baston/luciernaga
  // antes de F26). Cuando alguien lo coreografíe, su PRESENCIA de placeholder
  // ya está sembrada en `chivitoIdentidad.js` (visual/creatures/).
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

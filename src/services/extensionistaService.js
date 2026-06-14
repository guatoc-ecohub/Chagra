/**
 * extensionistaService.js — Lógica del modo EXTENSIONISTA (panel supervisor
 * multi-finca). MVP de ADR-048.
 *
 * Resuelve, para un extensionista dado, la lista de fincas que supervisa y la
 * transforma en un modelo de tablero (ordenado por urgencia + contadores
 * agregados) que consume `ExtensionistaScreen.jsx`.
 *
 * FRONTERA MVP vs FOLLOW-UP BACKEND
 *   - HOY: la lista de fincas delegadas sale de un MOCK estático
 *     (src/data/extensionista-fincas.json). NO es una autorización verificada;
 *     es scaffold de producto para iterar la UX del panel supervisor.
 *   - FOLLOW-UP (ADR-036 sub-i/sub-iv): la delegación real será una capability
 *     UCAN `supervise`/`read` firmada por el dueño de cada finca y validada por
 *     el módulo Drupal `farm_did_auth`. Cuando exista, `getFincasDelegadas`
 *     consultará esas delegaciones (y el estado/última-sync vendrá de farmOS
 *     JSON:API con scoping por finca) en vez del JSON estático. La FORMA del
 *     modelo de tablero se mantiene para no reescribir la UI.
 *
 * Funciones PURAS, offline-first (no red), degradan sin inventar:
 *   - getFincasDelegadas(username) → Finca[]  (copias defensivas).
 *   - clasificarEstadoFinca(estado) → { label, severidad, tono }.
 *   - construirTableroExtensionista(username) → { fincas, resumen }.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module extensionistaService
 */

import DATA from '../data/extensionista-fincas.json';

/**
 * Catálogo de estados de finca → severidad (orden de urgencia en el tablero) +
 * etiqueta legible + tono semántico para la UI. Severidad mayor = más arriba.
 *
 * Mantener alineado con los `estado` posibles del seed
 * (src/data/extensionista-fincas.json). Si el seed trae un estado no listado
 * acá, `clasificarEstadoFinca` degrada a neutro (no rompe el render).
 *
 * @constant {Record<string, { label: string, severidad: number, tono: string }>}
 */
export const ESTADO_SEVERIDAD = Object.freeze({
  sin_sync_reciente: { label: 'Sin sincronizar hace días', severidad: 3, tono: 'alerta' },
  con_pendientes: { label: 'Con registros pendientes', severidad: 2, tono: 'aviso' },
  al_dia: { label: 'Al día', severidad: 0, tono: 'ok' },
});

const ESTADO_DESCONOCIDO = Object.freeze({
  label: 'Estado desconocido',
  severidad: 1,
  tono: 'neutro',
});

const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;

function normalizarUsername(username) {
  if (!isNonEmptyStr(username)) return null;
  return username.trim().toLowerCase();
}

/**
 * Lista de fincas que un extensionista supervisa, según el mock de delegación.
 *
 * Devuelve COPIAS defensivas (clon superficial por finca) para que el caller no
 * pueda mutar el JSON importado en memoria.
 *
 * @param {string|null|undefined} username — username del extensionista.
 * @returns {Array<object>} fincas delegadas; [] si no hay (sin inventar).
 */
export function getFincasDelegadas(username) {
  const norm = normalizarUsername(username);
  if (!norm) return [];
  const delegaciones = Array.isArray(DATA?.delegaciones) ? DATA.delegaciones : [];
  const entry = delegaciones.find(
    (d) => normalizarUsername(d?.extensionista) === norm
  );
  if (!entry || !Array.isArray(entry.fincas)) return [];
  return entry.fincas.map((f) => ({ ...f }));
}

/**
 * Clasifica el estado de una finca en { label, severidad, tono } para el
 * tablero. Estado desconocido o nulo → clasificación neutra (no tira).
 *
 * @param {string|null|undefined} estado
 * @returns {{ label: string, severidad: number, tono: string }}
 */
export function clasificarEstadoFinca(estado) {
  if (!isNonEmptyStr(estado)) return { ...ESTADO_DESCONOCIDO };
  const c = ESTADO_SEVERIDAD[estado];
  return c ? { ...c } : { ...ESTADO_DESCONOCIDO };
}

/**
 * Construye el modelo del tablero supervisor para un extensionista:
 *   - `fincas`: las delegadas, cada una con su `_clasificacion` adjunta,
 *     ORDENADAS por severidad descendente (lo urgente arriba) y, a igual
 *     severidad, por nombre (estable).
 *   - `resumen`: contadores agregados { total, con_alertas, con_pendientes }.
 *
 * @param {string|null|undefined} username — username del extensionista.
 * @returns {{ fincas: Array<object>, resumen: { total: number, con_alertas: number, con_pendientes: number } }}
 */
export function construirTableroExtensionista(username) {
  const fincas = getFincasDelegadas(username).map((f) => ({
    ...f,
    _clasificacion: clasificarEstadoFinca(f.estado),
  }));

  fincas.sort((a, b) => {
    const ds = b._clasificacion.severidad - a._clasificacion.severidad;
    if (ds !== 0) return ds;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
  });

  const resumen = {
    total: fincas.length,
    con_alertas: fincas.filter((f) => (f.alertas || 0) > 0).length,
    con_pendientes: fincas.filter((f) => (f.pendientes || 0) > 0).length,
  };

  return { fincas, resumen };
}

/**
 * fincaGameStateService — persistencia del juego "Mi Finca Viva", por finca.
 *
 * Guarda lo poco que el JUEGO necesita recordar y que NO sale de los
 * indicadores reales:
 *   - `lastLevel`: último nivel de mundo visto, para detectar subidas de nivel
 *     y disparar la celebración una sola vez.
 *   - `misionesHechas`: ids de misiones de "aprender" que la niña marcó a mano
 *     (leer una ficha GUATOC no deja rastro en los indicadores; las acciones
 *     reales —sembrar, cosechar— sí, y esas NO se guardan acá: se derivan).
 *
 * Persistencia: localStorage (estado mínimo, tipo preferencia por finca,
 * offline-first; degrada limpio en modo privado, igual que journeyStateService).
 * CERO fabricación: nada de progreso inventado se persiste — solo el "visto" y
 * los toques explícitos de la niña.
 *
 * @module services/fincaGameStateService
 */

const KEY = (slug) => `chagra:juego-finca:${slug || 'default'}`;

/** Lee el estado del juego guardado, o un estado vacío seguro. */
export function getGameState(fincaSlug) {
  try {
    const raw = localStorage.getItem(KEY(fincaSlug));
    if (!raw) return { lastLevel: null, misionesHechas: [] };
    const s = JSON.parse(raw);
    return {
      lastLevel:
        typeof s?.lastLevel === 'number' ? s.lastLevel : null,
      misionesHechas: Array.isArray(s?.misionesHechas)
        ? s.misionesHechas.filter((x) => typeof x === 'string')
        : [],
    };
  } catch {
    return { lastLevel: null, misionesHechas: [] };
  }
}

/** Persiste el último nivel visto (para la celebración de subida de nivel). */
export function setLastLevel(fincaSlug, level) {
  const cur = getGameState(fincaSlug);
  const next = { ...cur, lastLevel: Number(level) || 0 };
  write(fincaSlug, next);
  return next;
}

/** Marca una misión (de "aprender") como cumplida a mano. Idempotente. */
export function markMissionDone(fincaSlug, missionId) {
  const cur = getGameState(fincaSlug);
  if (!cur.misionesHechas.includes(missionId)) {
    cur.misionesHechas = [...cur.misionesHechas, missionId];
  }
  write(fincaSlug, cur);
  return cur;
}

/** Devuelve las misiones hechas como Set (lo que espera buildFincaGameState). */
export function getMisionesHechasSet(fincaSlug) {
  return new Set(getGameState(fincaSlug).misionesHechas);
}

function write(fincaSlug, state) {
  try {
    localStorage.setItem(KEY(fincaSlug), JSON.stringify(state));
  } catch {
    /* modo privado: no persiste; el juego sigue en memoria esta sesión */
  }
}

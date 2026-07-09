/**
 * fincaClockService — los AÑOS REALES de la finca en Chagra, para el
 * "Reloj del frailejón" del home (el frailejón crece UN anillo al año).
 *
 * GROUNDED — nunca inventa historia. El primer año del reloj es el año del
 * REGISTRO MÁS ANTIGUO que la finca tiene en Chagra:
 *   · FarmProcess → attributes.created_at  (unix MS — día 0 del ciclo)
 *   · asset plant → attributes.created     (unix SEGUNDOS — farmOS post-sync)
 *                 → _createdAt             (MS — optimistic local, aún sin sync)
 * (mismos campos y semántica que AssetDetailView / anoFincaService).
 *
 * Si la finca es NUEVA (sin ningún registro con fecha válida), el reloj
 * muestra el año actual como su PRIMER anillo — cero historia inventada.
 *
 * Offline-first: todo sale de IndexedDB (farmProcessCache + assetCache),
 * sin red. Cualquier fallo de IDB degrada a "finca nueva" honesta.
 */
import { listFarmProcesses } from '../db/farmProcessCache';
import { assetCache } from '../db/assetCache';

/** Ventana de cordura para años de registros (evita basura de timestamps). */
const ANIO_MIN_VALIDO = 2000;

/**
 * Convierte un timestamp heterogéneo (unix s, unix ms o string ISO) al AÑO
 * calendario, o null si no es una fecha válida dentro de la ventana de
 * cordura [2000, añoActual].
 *
 * @param {number|string|null|undefined} v
 * @param {number} anioActual
 * @returns {number|null}
 */
export function anioDeTimestamp(v, anioActual) {
  if (v == null) return null;
  let ms = null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    // Heurística estándar del repo: >1e12 ya es ms; si parece unix-segundos
    // (1e9..1e11 ≈ años 2001..5138 en segundos), pasar a ms.
    ms = v > 1e11 ? v : v * 1000;
  } else if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Date.parse(v);
    if (Number.isFinite(parsed)) ms = parsed;
  }
  if (ms == null) return null;
  const d = new Date(ms);
  const y = d.getFullYear();
  if (!Number.isFinite(y) || y < ANIO_MIN_VALIDO || y > anioActual) return null;
  return y;
}

/**
 * Calcula los años reales de la finca en Chagra.
 *
 * @param {Object} [opts]
 * @param {Date} [opts.now] inyectable para tests.
 * @returns {Promise<{
 *   primerAnio: number,
 *   anioActual: number,
 *   anios: number[],
 *   fincaNueva: boolean,
 *   fuente: 'registros'|'finca-nueva',
 * }>} un anillo por cada año de `anios` (primerAnio..anioActual, ambos
 *   incluidos). `fincaNueva` = no hay ningún registro con fecha válida.
 */
export async function getAniosFinca({ now } = {}) {
  const hoy = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const anioActual = hoy.getFullYear();
  let primerAnio = null;

  // 1) Ciclos productivos (FarmProcess.created_at, unix ms).
  try {
    const procesos = await listFarmProcesses();
    for (const p of procesos || []) {
      const y = anioDeTimestamp(p?.attributes?.created_at, anioActual);
      if (y != null && (primerAnio == null || y < primerAnio)) primerAnio = y;
    }
  } catch (_) { /* IDB no disponible: seguimos con las otras fuentes */ }

  // 2) Plantas registradas (assets farmOS: created en segundos; locales: _createdAt ms).
  try {
    const plantas = await assetCache.getByType('plant');
    for (const a of plantas || []) {
      const y = anioDeTimestamp(a?.attributes?.created, anioActual)
        ?? anioDeTimestamp(a?._createdAt, anioActual);
      if (y != null && (primerAnio == null || y < primerAnio)) primerAnio = y;
    }
  } catch (_) { /* IDB no disponible */ }

  const fincaNueva = primerAnio == null;
  const desde = fincaNueva ? anioActual : primerAnio;
  const anios = [];
  for (let y = desde; y <= anioActual; y += 1) anios.push(y);

  return {
    primerAnio: desde,
    anioActual,
    anios,
    fincaNueva,
    fuente: fincaNueva ? 'finca-nueva' : 'registros',
  };
}

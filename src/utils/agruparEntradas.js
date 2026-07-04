/**
 * agruparEntradas — capa de PRESENTACIÓN para colapsar entradas equivalentes
 * (mismas matas/ciclos) en una sola fila agregada, sin perder las individuales.
 *
 * Motivación (operador, 2026-07): al sembrar N matas iguales el mismo día en el
 * mismo lote (p. ej. 20 fresas), AssetsDashboard crea N `asset--plant` con
 * nombres "Fresa #01", "Fresa #02"… (modo individual, ADR-030). Esos N assets
 * se propagan a los listados (Mis matas, Ciclo del cultivo, Calendario) como N
 * filas casi idénticas → ruido. Aquí NO se tocan los datos crudos: solo se
 * agrupan para mostrar "🍓 Fresa ×20 · sembradas 4 mar · Cama 1" con opción de
 * expandir a las individuales.
 *
 * Criterio de agrupación (consistente en todas las vistas): misma especie +
 * misma fecha de siembra (bucket de día) + mismo lote/cama.
 */

/**
 * Quita el sufijo de instancia " #NN" que AssetsDashboard agrega a cada mata
 * cuando se siembran varias en modo individual.
 *   "Fresa #01" → "Fresa"      "Tomate #007" → "Tomate"      "Fresa" → "Fresa"
 * @param {string} [name]
 * @returns {string}
 */
export function stripInstanceSuffix(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/\s*#\d+\s*$/, '').trim();
}

/**
 * Normaliza una fecha (Date | epoch-ms | ISO string | 'YYYY-MM-DD') a un bucket
 * de día 'YYYY-MM-DD'. Devuelve '' si no hay fecha válida.
 *
 * Se agrupa por DÍA (no por timestamp exacto) porque las N matas de una misma
 * siembra reciben `_createdAt: Date.now()` en un mismo forEach y pueden diferir
 * en milisegundos; sin el bucket no colapsarían.
 * @param {Date|number|string|null|undefined} value
 * @returns {string}
 */
export function dayBucket(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    // Ya viene como 'YYYY-MM-DD…' (fecha_germinacion / ISO) → tomar el día.
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = value instanceof Date
    ? value
    : new Date(typeof value === 'number' ? value : Date.parse(String(value)));
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Formatea una fecha de siembra a "4 mar" (día + mes corto en español) para las
 * etiquetas de los grupos. Devuelve '' si no hay fecha reconocible.
 * @param {Date|number|string|null|undefined} value
 * @returns {string}
 */
export function formatFechaSiembra(value) {
  const day = dayBucket(value);
  if (!day) return '';
  const [, mo, da] = day.split('-');
  const idx = Number(mo) - 1;
  const mes = MESES_CORTOS[idx] || '';
  const diaNum = Number(da);
  return mes ? `${diaNum} ${mes}` : '';
}

/**
 * Construye la clave de agrupación de una mata/ciclo por
 * (especie + fecha de siembra + lote). El llamador extrae los campos de su
 * propia forma (asset--plant vs FarmProcess vs objeto de calendario), así el
 * helper no queda acoplado a un shape concreto.
 *
 * Sin especie identificable → devuelve '' (no se agrupa): nunca colapsamos
 * cosas que no podemos afirmar que son la misma especie.
 *
 * @param {Object} f
 * @param {string} [f.species]  slug o nombre canónico de la especie (preferido).
 * @param {string} [f.name]     nombre visible (se le quita el sufijo "#NN").
 * @param {Date|number|string} [f.date]  fecha de siembra/creación.
 * @param {string} [f.bed]      id del lote/cama/zona.
 * @returns {string}
 */
export function claveMataAgrupada({ species, name, date, bed } = {}) {
  const sp = String(species || stripInstanceSuffix(name) || '').trim().toLowerCase();
  if (!sp) return '';
  const d = dayBucket(date);
  const b = String(bed || '').trim();
  return [sp, d, b].filter((p) => p !== '').join('|');
}

/**
 * @template T
 * @typedef {Object} Grupo
 * @property {string} key           Clave de agrupación (o "__solo__N" para sueltos).
 * @property {T[]} items            Entradas del grupo, en orden de aparición.
 * @property {number} count         items.length.
 * @property {T} representative     Primera entrada (para thumbnail/nombre).
 * @property {boolean} grouped      true si conviene colapsar (count>=minGroupSize).
 */

/**
 * Colapsa entradas equivalentes en grupos SIN perder las individuales ni
 * reordenar más allá de juntar por clave (se preserva el orden de primera
 * aparición). Capa pura: no muta los items.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => (string|null|undefined)} keyOf
 *        Clave de grupo. null/''/undefined ⇒ la entrada queda como grupo
 *        unitario propio (jamás colapsa con otra).
 * @param {Object} [opts]
 * @param {number} [opts.minGroupSize=2]  Umbral para marcar `grouped=true`.
 * @returns {Grupo<T>[]}  Grupos en orden de primera aparición.
 */
export function agruparEntradas(items, keyOf, opts = {}) {
  const minGroupSize = opts.minGroupSize ?? 2;
  if (!Array.isArray(items)) return [];
  /** @type {Map<string, T[]>} */
  const map = new Map();
  const order = [];
  let soloSeq = 0;
  items.forEach((item, index) => {
    let key;
    try {
      key = keyOf(item, index);
    } catch {
      key = null;
    }
    const k = key ? String(key) : `__solo__${soloSeq++}`;
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k).push(item);
  });
  return order.map((k) => {
    const groupItems = map.get(k);
    const isReal = !k.startsWith('__solo__');
    return {
      key: k,
      items: groupItems,
      count: groupItems.length,
      representative: groupItems[0],
      grouped: isReal && groupItems.length >= minGroupSize,
    };
  });
}

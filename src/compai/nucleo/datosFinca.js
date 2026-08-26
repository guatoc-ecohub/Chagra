/**
 * datosFinca — EL CONTRATO DE DATOS DEL compAI. Núcleo portable.
 *
 * El hallazgo que motivó este archivo: el motor de comportamiento
 * (`comentarista.js`) siempre estuvo diseñado para hablar con datos reales
 * — lee `cultivos`, `especies`, `total`, `snapshot` — y **nadie se los
 * pasaba**. Los dos call-sites del valle 3D llamaban `entrarMundo(mundo, {})`
 * con el objeto vacío, así que cada comentario caía a la rama honesta-pero-
 * genérica ("todavía no me ha contado qué tiene sembrado") aunque el usuario
 * tuviera sus matas registradas en IndexedDB.
 *
 * Este módulo es el puente que faltaba, y vive en el núcleo (ESM puro, cero
 * dependencias) para que la PWA y el valle de `3d.guatoc.co` construyan los
 * MISMOS datos con el MISMO código. Ver `MANIFIESTO.md`.
 *
 * REGLA DURA — anti-fabricación: aquí no se inventa nada. Si no hay dato, la
 * lista sale vacía y el comentarista cae a su rama honesta. Nunca se rellena
 * con ceros, promedios ni "aproximadamente".
 *
 * @module compai/nucleo/datosFinca
 */

/**
 * Nombre legible de un asset, tolerante a las dos formas que conviven en la
 * app: el asset de farmOS (`attributes.name`) y el plano (`name`).
 * Prefiere la especie sobre el nombre de la instancia cuando existe — así
 * "Café #03", "Café #04" y "cafe" cuentan como el mismo cultivo.
 * @param {Object} asset
 * @returns {string}
 */
export function nombreDeAsset(asset) {
  const at = asset?.attributes || {};
  return String(
    at.species_slug
      || at.species?.name
      || at.common_name
      || at.name
      || asset?.speciesSlug
      || asset?.name
      || '',
  );
}

/**
 * Quita el sufijo de instancia ("Café #03" → "Café") y normaliza el espacio.
 * Misma regla que `utils/agruparEntradas.stripInstanceSuffix`, replicada aquí
 * porque el núcleo no puede importar de la app (ver MANIFIESTO).
 * @param {string} name
 * @returns {string}
 */
export function sinSufijoDeInstancia(name) {
  return String(name || '').replace(/\s*#\d+\s*$/, '').trim();
}

/** Llave de agrupación: sin tildes, sin caso, sin sufijo. */
function llaveDe(name) {
  return sinSufijoDeInstancia(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Agrupa una lista de assets en el `[{ name, count }]` que espera el
 * comentarista, ordenado de más a menos. Descarta lo que no tenga nombre y lo
 * que esté marcado como muerto/archivado — una mata muerta no es inventario.
 * @param {Array<Object>} assets
 * @returns {Array<{name: string, count: number}>}
 */
export function agruparPorNombre(assets) {
  if (!Array.isArray(assets)) return [];
  /** @type {Map<string, {name: string, count: number}>} */
  const mapa = new Map();
  for (const a of assets) {
    if (!a) continue;
    const estado = a.attributes?.status || a.status || '';
    if (estado === 'dead' || estado === 'archived') continue;
    const crudo = sinSufijoDeInstancia(nombreDeAsset(a));
    if (!crudo) continue;
    const k = llaveDe(crudo);
    if (!k) continue;
    const ya = mapa.get(k);
    if (ya) ya.count += 1;
    else mapa.set(k, { name: crudo, count: 1 });
  }
  return [...mapa.values()].sort((x, y) => y.count - x.count);
}

/**
 * @typedef {Object} InventarioCompai
 * @property {Array<{name:string,count:number}>} cultivos — matas por especie.
 * @property {Array<{name:string,count:number}>} especies — animales por especie.
 * @property {number} total — cabezas de animal registradas.
 * @property {number} matasTotal — matas vivas registradas.
 * @property {{cultivo: string}|null} cosechaReciente — la última cosecha real.
 */

/**
 * Construye el inventario del compAI desde lo que la app tenga a mano. Todos
 * los campos son opcionales: lo que no llegue, no se comenta.
 *
 * @param {Object} [fuentes]
 * @param {Array<Object>} [fuentes.plants] — assets de tipo planta.
 * @param {Array<Object>} [fuentes.animales] — assets/registros de animal.
 * @param {Array<Object>} [fuentes.cosechas] — logs de cosecha, más reciente primero
 *   o con fecha en `timestamp`/`date`; sólo se usa la última.
 * @returns {InventarioCompai}
 */
export function inventarioCompai({ plants = [], animales = [], cosechas = [] } = {}) {
  const cultivos = agruparPorNombre(plants);
  const especies = agruparPorNombre(animales);
  return {
    cultivos,
    especies,
    total: especies.reduce((s, e) => s + e.count, 0),
    matasTotal: cultivos.reduce((s, c) => s + c.count, 0),
    cosechaReciente: ultimaCosecha(cosechas),
  };
}

/**
 * La cosecha más reciente, si de verdad hay una. Devuelve `null` cuando no
 * hay dato — el personaje prefiere callar a inventar una celebración.
 * @param {Array<Object>} cosechas
 * @returns {{cultivo: string, cuandoMs: number}|null}
 */
export function ultimaCosecha(cosechas) {
  if (!Array.isArray(cosechas) || cosechas.length === 0) return null;
  let mejor = null;
  for (const c of cosechas) {
    if (!c) continue;
    const cultivo = sinSufijoDeInstancia(
      c.cultivo || c.especie || nombreDeAsset(c) || c.attributes?.name || '',
    );
    if (!cultivo) continue;
    const cuandoMs = fechaMs(c);
    if (cuandoMs == null) continue;
    if (!mejor || cuandoMs > mejor.cuandoMs) mejor = { cultivo, cuandoMs };
  }
  return mejor;
}

/** Normaliza la fecha de un log a epoch-ms, o null si no hay fecha usable. */
function fechaMs(log) {
  const t = log?.timestamp ?? log?.attributes?.timestamp;
  if (Number.isFinite(t)) return t > 1e12 ? t : t * 1000;
  const s = log?.date || log?.attributes?.timestamp || log?.fecha;
  if (s) {
    const p = Date.parse(s);
    if (Number.isFinite(p)) return p;
  }
  return null;
}

/**
 * Traduce el inventario al objeto EXACTO que espera cada comentarista de
 * mundo. Es el arreglo del `{}`: cada mundo recibe la forma que sabe leer.
 *
 * @param {string} mundo — uno de los mundos de `comentarista.js`.
 * @param {InventarioCompai} [inventario]
 * @param {Object} [extra] — lo que sólo el shell conoce (snapshot de clima,
 *   `describirFase`…). Se mezcla al final: el host siempre puede completar.
 * @returns {Object} datos listos para `comentarioDeMundo(mundo, datos)`.
 */
export function datosDeMundo(mundo, inventario = null, extra = {}) {
  const inv = inventario || {};
  const cultivos = Array.isArray(inv.cultivos) ? inv.cultivos : [];
  const especies = Array.isArray(inv.especies) ? inv.especies : [];
  switch (mundo) {
    case 'mis_matas':
    case 'vender':
    case 'finca':
      return { cultivos, ...extra };
    case 'mis_animales':
      return { especies, total: Number(inv.total) || 0, ...extra };
    case 'clima':
      // El snapshot del clima NO sale del inventario: lo pone el shell (cache
      // de la última consulta). Sin él, el comentarista dice la verdad: que no
      // tiene el parte a la mano.
      return { ...extra };
    default:
      // bosque / paramo / aprender no leen datos de la finca: son verdades
      // generales o preguntas. Se pasa `extra` por si el host quiere más.
      return { ...extra };
  }
}

/**
 * Reduce el perfil a contexto agronómico útil para el mensaje. Ubicación,
 * nombres de personas y cualquier dato identificable quedan fuera del
 * contrato del compAI.
 */
export function perfilFincaParaCompai(perfil = null) {
  if (!perfil || typeof perfil !== 'object') return {};
  return {
    pisoTermico: typeof perfil.pisoTermico === 'string' ? perfil.pisoTermico : null,
    escala: typeof perfil.escala === 'string' ? perfil.escala : null,
    agua: typeof perfil.agua === 'string' ? perfil.agua : null,
    cultiva: Array.isArray(perfil.cultiva)
      ? perfil.cultiva.filter((item) => typeof item === 'string').slice(0, 12)
      : [],
  };
}

/** Combina datos del mundo con perfil y registro local, sin persistirlos. */
export function datosAdaptadosDeFinca(mundo, datosMundo = {}, perfil = null, registro = null) {
  const base = { ...(datosMundo || {}) };
  const inv = registro && typeof registro === 'object' ? registro : {};
  if ((!Array.isArray(base.cultivos) || base.cultivos.length === 0) && Array.isArray(inv.cultivos)) {
    base.cultivos = inv.cultivos;
  }
  if ((!Array.isArray(base.especies) || base.especies.length === 0) && Array.isArray(inv.especies)) {
    base.especies = inv.especies;
  }
  if ((!Number.isFinite(base.total) || base.total <= 0) && Number.isFinite(inv.total)) {
    base.total = inv.total;
  }
  base.perfil = perfilFincaParaCompai(perfil);
  base.mundo = mundo;
  return base;
}

export default {
  inventarioCompai,
  datosDeMundo,
  datosAdaptadosDeFinca,
  perfilFincaParaCompai,
  agruparPorNombre,
  ultimaCosecha,
};

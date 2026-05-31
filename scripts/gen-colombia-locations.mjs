/**
 * gen-colombia-locations.mjs — Genera el dataset autoritativo de ubicaciones
 * de Colombia (departamentos + municipios) a partir del catálogo oficial
 * DIVIPOLA del DANE (Marco Geoestadístico Nacional).
 *
 * #338: reemplaza la lista mantenida a mano (`src/utils/colombiaLocations.js`,
 * 25 deptos / 117 municipios — incompleta y propensa a errores) por una
 * resolución data-driven sobre los códigos DIVIPOLA oficiales (33 deptos /
 * ~1.122 municipios).
 *
 * FUENTE (dominio público):
 *   DANE — Codificación de la División Político-Administrativa de Colombia
 *   (DIVIPOLA). Publicada en datos.gov.co (Socrata), dataset `gdxc-w37w`.
 *   Trae por municipio: cod_dpto, dpto, cod_mpio (DIVIPOLA 5 dígitos),
 *   nom_mpio, latitud, longitud (centroide del municipio).
 *   URL por defecto:
 *     https://www.datos.gov.co/resource/gdxc-w37w.json
 *
 * El DANE NO publica altitud (msnm) en DIVIPOLA. La altitud es un dato
 * agroecológico clave para Chagra (define el piso térmico). Estrategia:
 *   1. Se conservan las altitudes curadas a mano del dataset legacy (IGAC /
 *      OpenStreetMap) haciendo match por (cod_dpto, nombre normalizado).
 *   2. Los municipios sin altitud curada salen con `altitud: null`. El
 *      consumidor (LocationDetectedScreen -> resolveUbicacion -> altitudeService)
 *      ya hidrata la altitud online (Open-Elevation) usando lat/lng del
 *      centroide, y deriva el piso termico. Offline degrada con gracia.
 *
 * VEREDAS (~32k): fase 2. NO se incluyen aqui — inflarian el bundle del PWA
 * (orden de magnitud ~1MB+ de JSON) sin beneficio para el flujo actual
 * (municipio + texto libre para la vereda). Ver README de hidratacion.
 *
 * USO:
 *   # Online (descarga la fuente oficial, recomendado):
 *   node scripts/gen-colombia-locations.mjs
 *
 *   # Desde fuente local (CSV o JSON DIVIPOLA ya descargado):
 *   node scripts/gen-colombia-locations.mjs --source ./divipola.json
 *   node scripts/gen-colombia-locations.mjs --source ./divipola.csv
 *
 *   # URL custom:
 *   node scripts/gen-colombia-locations.mjs --source https://.../resource.json
 *
 * SALIDA (por defecto): src/data/colombia-locations.dane.json
 *
 * Validacion (hard-fail): codigo DIVIPOLA bien formado (5 digitos, los 2
 * primeros == cod_dpto), sin municipios duplicados, depto<->municipio
 * consistente, lat/lng dentro del bounding box de Colombia.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolvePath(__dirname, '..');

export const DEFAULT_SOURCE_URL =
  'https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=2000';
export const DEFAULT_OUTPUT = resolvePath(
  REPO_ROOT,
  'src/data/colombia-locations.dane.json'
);

// Bounding box continental + insular de Colombia (margen generoso para
// San Andres/Providencia y Leticia). Sirve de sanity check, no de geofence.
const CO_BBOX = { minLat: -4.5, maxLat: 13.6, minLng: -82.5, maxLng: -66.0 };

/**
 * Normaliza un nombre para matching tolerante a tildes/mayusculas.
 * @param {string} s
 * @returns {string}
 */
export function normalizeName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Title-case respetuoso de particulas (de, del, la, las, los, y).
 * El DANE entrega los nombres en MAYUSCULAS; los pasamos a forma legible.
 * @param {string} s
 * @returns {string}
 */
export function toTitleCase(s) {
  const lower = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);
  return String(s ?? '')
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      // D.C. y siglas cortas con punto se respetan en mayuscula.
      if (/^[a-z]\.[a-z]\.?$/i.test(w)) return w.toUpperCase();
      if (i > 0 && lower.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

/**
 * Valida un codigo DIVIPOLA de municipio (5 digitos) y su consistencia con
 * el codigo de departamento (2 digitos = prefijo).
 * @param {string} codMpio
 * @param {string} codDpto
 * @returns {{ok:boolean, reason?:string}}
 */
export function validateDivipola(codMpio, codDpto) {
  if (!/^\d{5}$/.test(String(codMpio ?? ''))) {
    return { ok: false, reason: `cod_mpio "${codMpio}" no es de 5 digitos` };
  }
  if (!/^\d{2}$/.test(String(codDpto ?? ''))) {
    return { ok: false, reason: `cod_dpto "${codDpto}" no es de 2 digitos` };
  }
  if (String(codMpio).slice(0, 2) !== String(codDpto)) {
    return {
      ok: false,
      reason: `cod_mpio "${codMpio}" no comienza con cod_dpto "${codDpto}"`,
    };
  }
  return { ok: true };
}

/**
 * Parsea coordenada que puede venir con coma decimal (formato es-CO del DANE).
 * @param {string|number} v
 * @returns {number|null}
 */
export function parseCoord(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parsea CSV DIVIPOLA minimo (separador coma, primera fila = headers).
 * Soporta campos entre comillas. Pensado para el export estandar de
 * datos.gov.co / DANE. Para JSON usar JSON.parse directo.
 * @param {string} text
 * @returns {Object[]}
 */
export function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return rows;
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] != null ? cells[idx].trim() : '';
    });
    rows.push(obj);
  }
  return rows;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Normaliza una fila cruda DIVIPOLA (de JSON Socrata o CSV) al shape interno.
 * Tolera variantes de nombres de columna comunes en exports DANE.
 * @param {Object} row
 * @returns {{codDpto,dpto,codMpio,nomMpio,lat,lng}|null}
 */
export function normalizeRow(row) {
  const codDpto =
    row.cod_dpto ?? row.codigo_departamento ?? row.coddpto ?? row.dpto_ccdgo;
  const dpto = row.dpto ?? row.departamento ?? row.nom_dpto ?? row.dpto_cnmbr;
  const codMpio =
    row.cod_mpio ?? row.codigo_municipio ?? row.codmpio ?? row.mpio_cdpmp;
  const nomMpio =
    row.nom_mpio ?? row.municipio ?? row.nombre_municipio ?? row.mpio_cnmbr;
  if (codDpto == null || codMpio == null || nomMpio == null) return null;
  return {
    codDpto: String(codDpto).padStart(2, '0'),
    dpto: String(dpto ?? '').trim(),
    codMpio: String(codMpio).padStart(5, '0'),
    nomMpio: String(nomMpio).trim(),
    lat: parseCoord(row.latitud ?? row.lat ?? row.latitude),
    lng: parseCoord(row.longitud ?? row.lng ?? row.lon ?? row.longitude),
  };
}

/**
 * Construye el dataset final agrupado por departamento a partir de las filas
 * crudas DIVIPOLA, mergeando altitudes curadas y validando todo.
 *
 * @param {Object[]} rawRows  filas crudas (JSON Socrata o CSV parseado)
 * @param {Object} [opts]
 * @param {Record<string, Record<string, number>>} [opts.altitudes]
 *   mapa codDpto -> { nombreNormalizado -> altitud } para enriquecer.
 * @returns {{ data: Object, stats: Object, errors: string[] }}
 */
export function buildDataset(rawRows, opts = {}) {
  const altitudes = opts.altitudes ?? {};
  const errors = [];
  const seen = new Set();
  const byDpto = {};
  let altitudHits = 0;

  for (const raw of rawRows) {
    const r = normalizeRow(raw);
    if (!r) {
      errors.push(`Fila sin campos DIVIPOLA minimos: ${JSON.stringify(raw)}`);
      continue;
    }
    const v = validateDivipola(r.codMpio, r.codDpto);
    if (!v.ok) {
      errors.push(`DIVIPOLA invalido (${r.nomMpio}): ${v.reason}`);
      continue;
    }
    if (seen.has(r.codMpio)) {
      errors.push(`Municipio duplicado: cod_mpio ${r.codMpio} (${r.nomMpio})`);
      continue;
    }
    seen.add(r.codMpio);

    if (r.lat != null && (r.lat < CO_BBOX.minLat || r.lat > CO_BBOX.maxLat)) {
      errors.push(`lat fuera de Colombia (${r.nomMpio}): ${r.lat}`);
    }
    if (r.lng != null && (r.lng < CO_BBOX.minLng || r.lng > CO_BBOX.maxLng)) {
      errors.push(`lng fuera de Colombia (${r.nomMpio}): ${r.lng}`);
    }

    const dptoName = toTitleCase(r.dpto);
    if (!byDpto[r.codDpto]) {
      byDpto[r.codDpto] = {
        codigoDpto: r.codDpto,
        nombre: dptoName,
        municipios: [],
      };
    }
    // Consistencia depto<->municipio: el nombre de depto debe ser estable.
    if (normalizeName(byDpto[r.codDpto].nombre) !== normalizeName(dptoName)) {
      errors.push(
        `Inconsistencia depto: cod ${r.codDpto} aparece como ` +
          `"${byDpto[r.codDpto].nombre}" y "${dptoName}"`
      );
    }

    const curated = altitudes[r.codDpto]?.[normalizeName(r.nomMpio)];
    const altitud = typeof curated === 'number' ? curated : null;
    if (altitud != null) altitudHits++;

    byDpto[r.codDpto].municipios.push({
      codigo: r.codMpio,
      name: toTitleCase(r.nomMpio),
      lat: r.lat,
      lng: r.lng,
      altitud,
    });
  }

  // Orden estable: departamentos alfabeticos, municipios alfabeticos.
  const data = {};
  for (const dpto of Object.values(byDpto).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  )) {
    dpto.municipios.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    data[dpto.nombre] = {
      codigo: dpto.codigoDpto,
      municipios: dpto.municipios,
    };
  }

  const totalMunicipios = seen.size;
  return {
    data,
    errors,
    stats: {
      departamentos: Object.keys(data).length,
      municipios: totalMunicipios,
      conAltitudCurada: altitudHits,
      sinAltitud: totalMunicipios - altitudHits,
    },
  };
}

/**
 * Extrae el mapa de altitudes curadas del modulo legacy (si existe), para no
 * perder los datos IGAC/OSM ya validados a mano. Match por (codDpto, nombre).
 * El legacy NO tiene cod_dpto, asi que se mapea por nombre de departamento.
 * @returns {Promise<Record<string, Record<string, number>>>}
 */
export async function loadCuratedAltitudes() {
  const legacyPath = resolvePath(
    __dirname,
    'colombia-locations-curated-altitudes.legacy.mjs'
  );
  const altByDptoName = {};
  if (!existsSync(legacyPath)) return {};
  try {
    const mod = await import(legacyPath);
    const legacy = mod.COLOMBIA_LOCATIONS ?? {};
    for (const [dptoName, munis] of Object.entries(legacy)) {
      const key = normalizeName(dptoName);
      altByDptoName[key] = altByDptoName[key] ?? {};
      for (const m of munis) {
        if (typeof m.altitud === 'number') {
          altByDptoName[key][normalizeName(m.name)] = m.altitud;
        }
      }
    }
  } catch {
    return {};
  }
  return altByDptoName;
}

/**
 * Convierte un mapa de altitudes indexado por NOMBRE de depto a uno indexado
 * por CODIGO de depto, usando las filas DIVIPOLA como puente.
 * @param {Record<string,Record<string,number>>} byDptoName
 * @param {Object[]} rawRows
 * @returns {Record<string,Record<string,number>>}
 */
export function altitudesByCode(byDptoName, rawRows) {
  const nameToCode = {};
  for (const raw of rawRows) {
    const r = normalizeRow(raw);
    if (r) nameToCode[normalizeName(r.dpto)] = r.codDpto;
  }
  const out = {};
  for (const [dptoName, munis] of Object.entries(byDptoName)) {
    const code = nameToCode[dptoName];
    if (!code) continue;
    out[code] = { ...(out[code] ?? {}), ...munis };
  }
  return out;
}

/**
 * Carga las filas crudas desde una fuente (URL http(s), path .json o .csv).
 * @param {string} source
 * @returns {Promise<Object[]>}
 */
export async function loadSource(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${source}`);
    return res.json();
  }
  const abs = resolvePath(process.cwd(), source);
  const text = readFileSync(abs, 'utf8');
  if (abs.endsWith('.csv')) return parseCsv(text);
  return JSON.parse(text);
}

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE_URL, output: DEFAULT_OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--output') args.output = argv[++i];
  }
  return args;
}

async function main() {
  const { source, output } = parseArgs(process.argv.slice(2));
  console.log(`[gen-colombia-locations] Fuente: ${source}`);
  const rawRows = await loadSource(source);
  console.log(`[gen-colombia-locations] Filas crudas: ${rawRows.length}`);

  const curatedByName = await loadCuratedAltitudes();
  const altitudes = altitudesByCode(curatedByName, rawRows);

  const { data, stats, errors } = buildDataset(rawRows, { altitudes });

  if (errors.length > 0) {
    console.error(
      `[gen-colombia-locations] ${errors.length} error(es) de validacion:`
    );
    for (const e of errors.slice(0, 25)) console.error(`  x ${e}`);
    if (errors.length > 25) console.error(`  ... y ${errors.length - 25} mas`);
    process.exit(1);
  }

  const payload = {
    _meta: {
      source: 'DANE DIVIPOLA (Marco Geoestadistico Nacional)',
      dataset: 'datos.gov.co resource gdxc-w37w',
      generatedBy: 'scripts/gen-colombia-locations.mjs (#338)',
      generatedAt: new Date().toISOString().slice(0, 10),
      ...stats,
    },
    departamentos: data,
  };

  writeFileSync(output, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(
    `[gen-colombia-locations] OK -> ${output}\n` +
      `  Departamentos: ${stats.departamentos}\n` +
      `  Municipios:    ${stats.municipios}\n` +
      `  Con altitud curada: ${stats.conAltitudCurada} | sin altitud (se hidrata online): ${stats.sinAltitud}`
  );
}

// Guard import.meta.url: permite importar las funciones puras desde tests
// sin disparar la descarga + escritura del CLI.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('[gen-colombia-locations] FALLO:', e.message);
    process.exit(1);
  });
}

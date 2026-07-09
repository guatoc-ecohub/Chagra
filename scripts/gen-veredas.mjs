#!/usr/bin/env node
/**
 * gen-veredas.mjs — Genera el dataset de VEREDAS de Colombia particionado por
 * municipio (codigo DIVIPOLA) para el onboarding geo-driven de Chagra.
 *
 * PROBLEMA QUE RESUELVE
 *   El reverse-geocoding publico (Nominatim) llega a municipio/corregimiento
 *   pero NO a la vereda en la Colombia rural (devuelve "Potrero Grande" en vez
 *   de "El Curi"). La solucion es resolver la vereda por point-in-polygon contra
 *   los poligonos oficiales DANE SOLO del municipio detectado, cargados
 *   on-demand desde un archivo liviano por municipio.
 *
 * FUENTE (dominio publico)
 *   "Veredas de Colombia" — Nivel de Referencia de Veredas (CRVeredas), capa
 *   desarrollada por DANE, UPRA, Unidad de Victimas, Defensoria, Prosperidad
 *   Social y ESRI Colombia. Se consume via el FeatureServer/MapServer publico
 *   de ESRI Colombia (ArcGIS REST), que expone salida GeoJSON y filtrado por
 *   codigo DIVIPOLA de municipio (campo DPTOMPIO).
 *     https://ags.esri.co/arcgis/rest/services/DatosAbiertos/VEREDAS_2016/MapServer/0
 *   Campos relevantes por vereda:
 *     DPTOMPIO   codigo DIVIPOLA del municipio (5 digitos) <- clave de particion
 *     CODIGO_VER codigo de la vereda (8 digitos)
 *     NOMBRE_VER nombre de la vereda
 *     NOMB_MPIO  nombre del municipio
 *     NOM_DEP    nombre del departamento
 *
 * QUE HACE
 *   1. Trae las veredas (por municipio, por lote de municipios, por archivo
 *      nacional local, o el pais entero paginado).
 *   2. Agrupa por DPTOMPIO (la MISMA clave que usa colombiaLocations /
 *      veredaService.getMunicipioCode).
 *   3. Simplifica cada geometria (Douglas-Peucker, tolerancia configurable) y
 *      redondea coordenadas — suficiente para point-in-polygon a escala vereda,
 *      sin precision submetrica.
 *   4. Escribe un archivo por municipio: public/veredas/{codDANE}.json con
 *      { _meta, veredas: [{ codigo, nombre, centroid:{lat,lng}, geometry }] }.
 *   5. Actualiza (merge) el indice liviano public/veredas/index.json con
 *      { codDANE: { nombre, departamento, veredas } } para saber si existe el
 *      archivo antes de pedirlo.
 *
 *   Los archivos van a public/ y se sirven ON-DEMAND (nginx): NO se embeben en
 *   el bundle JS (budget 25 MB intacto). En runtime se descarga UN archivo (el
 *   del municipio detectado, ~5-50 KB).
 *
 * USO
 *   # Lote de pilotos por defecto (Choachi + region oriental de Cundinamarca):
 *   node scripts/gen-veredas.mjs
 *
 *   # Municipios especificos (codigos DIVIPOLA separados por coma):
 *   node scripts/gen-veredas.mjs --municipios 25181,25279,25841
 *
 *   # Pais entero, paginando el FeatureServer (~1.100 archivos, pesado):
 *   node scripts/gen-veredas.mjs --all
 *
 *   # Desde un GeoJSON nacional ya descargado (offline, sin red):
 *   node scripts/gen-veredas.mjs --source ./veredas-colombia.geojson
 *
 *   # Ajustar tolerancia de simplificacion (grados; def 0.0005 ~= 55 m):
 *   node scripts/gen-veredas.mjs --tolerance 0.0007
 *
 *   # Autotest de Choachi (El Curi presente + point-in-polygon):
 *   node scripts/gen-veredas.mjs --selftest
 *
 * SALIDA (por defecto): public/veredas/{codDANE}.json + public/veredas/index.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolvePath(__dirname, '..');

export const FEATURE_LAYER_URL =
  'https://ags.esri.co/arcgis/rest/services/DatosAbiertos/VEREDAS_2016/MapServer/0';
export const OUTPUT_DIR = resolvePath(REPO_ROOT, 'public/veredas');
export const SOURCE_LABEL =
  'Veredas de Colombia (Nivel de Referencia de Veredas / CRVeredas) — DANE-UPRA-ESRI Colombia via ArcGIS REST';

// Campos que traemos del FeatureServer.
const OUT_FIELDS = 'DPTOMPIO,CODIGO_VER,NOMBRE_VER,NOMB_MPIO,NOM_DEP';

// Lote de pilotos por defecto: Choachi (finca del operador, vereda El Curi) +
// vecinos de la region del paramo oriental de Cundinamarca donde vive el piloto
// de campo (Guatoc/Choachi), mas municipios cercanos de la sabana.
export const PILOT_MUNICIPIOS = [
  '25181', // Choachi        <- piloto principal (El Curi, Potrero Grande)
  '25279', // Fomeque
  '25841', // Ubaque
  '25845', // Une
  '25178', // Chipaque
  '25151', // Caqueza
  '25377', // La Calera
  '25758', // Sopo
  '25322', // Guasca
  '25175', // Chia
  '25899', // Zipaquira
  '25126', // Cajica
  '11001', // Bogota, D.C.
];

// Bounding box continental + insular de Colombia (sanity check de coordenadas).
const CO_BBOX = { minLat: -4.5, maxLat: 13.6, minLng: -82.5, maxLng: -66.0 };

// Tolerancia Douglas-Peucker por defecto en grados (~0.0005 deg ~= 55 m). A
// escala vereda (poligonos de km) es imperceptible para point-in-polygon.
const DEFAULT_TOLERANCE = 0.0005;
// Decimales al redondear coordenadas (~5 dec = 1.1 m). Recorta muchisimo peso.
const COORD_DECIMALS = 5;

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                                 */
/* ------------------------------------------------------------------ */

/** Title-case respetuoso de particulas (el DANE entrega MAYUSCULAS). */
export function toTitleCase(s) {
  const lower = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en']);
  return String(s ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      // Siglas con puntos ("d.c.") se respetan en mayuscula.
      if (/^[a-z](\.[a-z])+\.?$/i.test(w)) return w.toUpperCase();
      if (i > 0 && lower.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

/** Normaliza para comparar sin tildes ni mayusculas. */
export function normalizeName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Geometria: Douglas-Peucker + centroide + point-in-polygon           */
/* ------------------------------------------------------------------ */

/** Distancia perpendicular de un punto al segmento a-b (en grados). */
function perpendicularDistance(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Simplifica una polilinea con Douglas-Peucker (iterativo, sin recursion
 * profunda para poligonos con miles de vertices).
 * @param {number[][]} points  lista de [lng, lat]
 * @param {number} tolerance
 * @returns {number[][]}
 */
export function douglasPeucker(points, tolerance) {
  if (!Array.isArray(points) || points.length <= 2) return points;
  const n = points.length;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/** Redondea un anillo de coordenadas a COORD_DECIMALS. */
function roundRing(ring, decimals) {
  const f = 10 ** decimals;
  return ring.map(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f]);
}

/**
 * Simplifica un anillo cerrado: garantiza cierre y minimo 4 puntos validos.
 * Si la simplificacion lo degenera (<4 puntos), reduce agresividad.
 */
function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  let tol = tolerance;
  let simplified = douglasPeucker(ring, tol);
  // Reintentar con menos tolerancia si degenera bajo un triangulo cerrado.
  while (simplified.length < 4 && tol > 0) {
    tol /= 2;
    simplified = tol < 1e-9 ? ring : douglasPeucker(ring, tol);
    if (tol < 1e-9) break;
  }
  simplified = roundRing(simplified, COORD_DECIMALS);
  // Asegurar anillo cerrado (primer punto == ultimo).
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    simplified.push([first[0], first[1]]);
  }
  return simplified;
}

/**
 * Simplifica una geometria GeoJSON Polygon o MultiPolygon completa.
 * @param {{type:string, coordinates:any}} geometry
 * @param {number} tolerance
 * @returns {{type:string, coordinates:any}}
 */
export function simplifyGeometry(geometry, tolerance) {
  if (!geometry || !geometry.type) return geometry;
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) =>
        simplifyRing(ring, tolerance)
      ),
    };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring, tolerance))
      ),
    };
  }
  return geometry;
}

/**
 * Centroide (area-weighted) de un anillo poligonal.
 * @param {number[][]} ring  [lng, lat][]
 * @returns {{cx:number, cy:number, area:number}}
 */
function ringCentroid(ring) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (area === 0) {
    // Anillo degenerado: promedio simple.
    const avg = ring.reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
    return { cx: avg[0] / ring.length, cy: avg[1] / ring.length, area: 0 };
  }
  return { cx: cx / (6 * area), cy: cy / (6 * area), area: Math.abs(area) };
}

/**
 * Centroide de una geometria Polygon/MultiPolygon. Para MultiPolygon toma el
 * poligono de mayor area (anillo exterior).
 * @param {{type:string, coordinates:any}} geometry
 * @returns {{lat:number, lng:number}}
 */
export function geometryCentroid(geometry) {
  if (!geometry) return { lat: null, lng: null };
  let outerRings = [];
  if (geometry.type === 'Polygon') {
    outerRings = [geometry.coordinates[0]];
  } else if (geometry.type === 'MultiPolygon') {
    outerRings = geometry.coordinates.map((poly) => poly[0]);
  }
  let best = null;
  for (const ring of outerRings) {
    if (!ring || ring.length < 4) continue;
    const c = ringCentroid(ring);
    if (!best || c.area > best.area) best = c;
  }
  if (!best) return { lat: null, lng: null };
  return {
    lat: Math.round(best.cy * 1e6) / 1e6,
    lng: Math.round(best.cx * 1e6) / 1e6,
  };
}

/** Ray-casting: ¿esta [lng,lat] dentro del anillo? */
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** ¿Esta [lng,lat] dentro de un Polygon (con huecos)? */
function pointInPolygonRings(lng, lat, rings) {
  if (!rings || !rings.length) return false;
  if (!pointInRing(lng, lat, rings[0])) return false; // fuera del exterior
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(lng, lat, rings[h])) return false; // dentro de un hueco
  }
  return true;
}

/**
 * point-in-polygon sobre una geometria GeoJSON Polygon/MultiPolygon.
 * @param {number} lat
 * @param {number} lng
 * @param {{type:string, coordinates:any}} geometry
 * @returns {boolean}
 */
export function pointInPolygon(lat, lng, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    return pointInPolygonRings(lng, lat, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) =>
      pointInPolygonRings(lng, lat, poly)
    );
  }
  return false;
}

/**
 * Resuelve que vereda contiene un punto (PIP) dentro de una lista de veredas
 * ya cargada de public/veredas/{cod}.json. Fallback: centroide mas cercano.
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{nombre:string, centroid:{lat,lng}, geometry:object}>} veredas
 * @returns {{nombre:string, method:string}|null}
 */
export function resolveVereda(lat, lng, veredas) {
  if (!Array.isArray(veredas) || !veredas.length) return null;
  for (const v of veredas) {
    if (pointInPolygon(lat, lng, v.geometry)) {
      return { nombre: v.nombre, method: 'point-in-polygon' };
    }
  }
  // Fallback: centroide mas cercano.
  let best = null;
  let bestD = Infinity;
  for (const v of veredas) {
    const c = v.centroid;
    if (!c || c.lat == null || c.lng == null) continue;
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best ? { nombre: best.nombre, method: 'nearest-centroid' } : null;
}

/* ------------------------------------------------------------------ */
/* Fuentes de datos                                                    */
/* ------------------------------------------------------------------ */

/** Descarga las veredas de UN municipio desde el FeatureServer (GeoJSON). */
export async function fetchMunicipioFeatures(codDane) {
  const params = new URLSearchParams({
    where: `DPTOMPIO='${codDane}'`,
    outFields: OUT_FIELDS,
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  });
  const url = `${FEATURE_LAYER_URL}/query?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${codDane}`);
  const json = await res.json();
  return json.features || [];
}

/**
 * Descarga TODAS las veredas del pais paginando por resultOffset.
 * @param {number} pageSize
 * @returns {Promise<object[]>}
 */
export async function fetchAllFeatures(pageSize = 2000) {
  const all = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: OUT_FIELDS,
      returnGeometry: 'true',
      outSR: '4326',
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
      f: 'geojson',
    });
    const url = `${FEATURE_LAYER_URL}/query?${params.toString()}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} en offset ${offset}`);
    const json = await res.json();
    const feats = json.features || [];
    all.push(...feats);
    console.log(`  [fetch-all] offset ${offset}: +${feats.length} (total ${all.length})`);
    if (feats.length < pageSize || json.exceededTransferLimit === false) {
      if (feats.length < pageSize) break;
    }
    if (feats.length === 0) break;
    offset += pageSize;
  }
  return all;
}

/** Lee un GeoJSON nacional local y devuelve sus features. */
export function loadLocalGeoJSON(source) {
  const abs = resolvePath(process.cwd(), source);
  const json = JSON.parse(readFileSync(abs, 'utf8'));
  if (Array.isArray(json)) return json;
  return json.features || [];
}

/* ------------------------------------------------------------------ */
/* Construccion del dataset                                            */
/* ------------------------------------------------------------------ */

/** Extrae los campos DANE de una feature GeoJSON (tolerante a variantes). */
function readFeatureProps(feature) {
  const p = feature.properties || {};
  const codDane =
    p.DPTOMPIO ?? p.dptompio ?? p.CODIGO_MPI ?? p.cod_mpio ?? null;
  const codVer = p.CODIGO_VER ?? p.codigo_ver ?? p.COD_VEREDA ?? null;
  const nombre = p.NOMBRE_VER ?? p.nombre_ver ?? p.NOM_VEREDA ?? p.vereda ?? '';
  const municipio = p.NOMB_MPIO ?? p.nomb_mpio ?? p.municipio ?? '';
  const departamento = p.NOM_DEP ?? p.nom_dep ?? p.departamento ?? '';
  return {
    codDane: codDane != null ? String(codDane).padStart(5, '0') : null,
    codVer: codVer != null ? String(codVer) : null,
    nombre: String(nombre).trim(),
    municipio: String(municipio).trim(),
    departamento: String(departamento).trim(),
  };
}

/**
 * Agrupa features por codigo DIVIPOLA de municipio y construye el objeto de
 * salida por municipio (con geometrias simplificadas + centroides).
 * @param {object[]} features
 * @param {number} tolerance
 * @returns {{ byMunicipio: Record<string, object>, warnings: string[] }}
 */
export function buildDataset(features, tolerance) {
  const byMunicipio = {};
  const warnings = [];
  const seenVer = new Set();

  for (const feature of features) {
    const props = readFeatureProps(feature);
    if (!props.codDane || !/^\d{5}$/.test(props.codDane)) {
      warnings.push(`Feature sin DPTOMPIO valido: ${props.nombre || '?'}`);
      continue;
    }
    if (!feature.geometry) {
      warnings.push(`Vereda sin geometria: ${props.nombre} (${props.codDane})`);
      continue;
    }
    // Dedupe por codigo de vereda cuando exista.
    if (props.codVer) {
      if (seenVer.has(props.codVer)) continue;
      seenVer.add(props.codVer);
    }

    const geometry = simplifyGeometry(feature.geometry, tolerance);
    const centroid = geometryCentroid(feature.geometry); // centroide sobre geom original

    if (!byMunicipio[props.codDane]) {
      byMunicipio[props.codDane] = {
        codDane: props.codDane,
        municipio: toTitleCase(props.municipio),
        departamento: toTitleCase(props.departamento),
        veredas: [],
      };
    }
    byMunicipio[props.codDane].veredas.push({
      codigo: props.codVer,
      nombre: toTitleCase(props.nombre),
      centroid,
      geometry,
    });
  }

  // Orden estable: veredas alfabeticas por nombre.
  for (const m of Object.values(byMunicipio)) {
    m.veredas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
  return { byMunicipio, warnings };
}

/** Escribe el archivo por municipio y devuelve su tamaño en bytes. */
function writeMunicipioFile(mun, tolerance) {
  const payload = {
    _meta: {
      codDane: mun.codDane,
      municipio: mun.municipio,
      departamento: mun.departamento,
      veredas: mun.veredas.length,
      source: SOURCE_LABEL,
      sourceUrl: FEATURE_LAYER_URL,
      tolerance,
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    veredas: mun.veredas,
  };
  const file = join(OUTPUT_DIR, `${mun.codDane}.json`);
  const text = JSON.stringify(payload);
  writeFileSync(file, text + '\n', 'utf8');
  return Buffer.byteLength(text, 'utf8');
}

/** Lee (o crea) el indice y lo mergea con los municipios generados. */
function updateIndex(byMunicipio, tolerance) {
  const indexPath = join(OUTPUT_DIR, 'index.json');
  let index = { _meta: {}, municipios: {} };
  if (existsSync(indexPath)) {
    try {
      index = JSON.parse(readFileSync(indexPath, 'utf8'));
      if (!index.municipios) index.municipios = {};
    } catch {
      index = { _meta: {}, municipios: {} };
    }
  }
  for (const mun of Object.values(byMunicipio)) {
    index.municipios[mun.codDane] = {
      nombre: mun.municipio,
      departamento: mun.departamento,
      veredas: mun.veredas.length,
    };
  }
  // Orden estable por codigo.
  const ordered = {};
  for (const cod of Object.keys(index.municipios).sort()) {
    ordered[cod] = index.municipios[cod];
  }
  index.municipios = ordered;
  index._meta = {
    source: SOURCE_LABEL,
    sourceUrl: FEATURE_LAYER_URL,
    tolerance,
    municipios: Object.keys(ordered).length,
    veredas: Object.values(ordered).reduce((a, m) => a + (m.veredas || 0), 0),
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Dataset servido on-demand desde public/veredas/ (fuera del bundle JS).',
  };
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
  return index._meta;
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = {
    municipios: null,
    source: null,
    all: false,
    selftest: false,
    tolerance: DEFAULT_TOLERANCE,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--municipios') args.municipios = argv[++i];
    else if (a === '--source') args.source = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--selftest') args.selftest = true;
    else if (a === '--tolerance') args.tolerance = Number(argv[++i]);
  }
  return args;
}

async function loadFeatures(args) {
  if (args.source) {
    console.log(`[gen-veredas] Fuente local: ${args.source}`);
    return loadLocalGeoJSON(args.source);
  }
  if (args.all) {
    console.log('[gen-veredas] Descargando TODAS las veredas (paginado)...');
    return fetchAllFeatures();
  }
  const codes = args.municipios
    ? args.municipios.split(',').map((c) => c.trim()).filter(Boolean)
    : PILOT_MUNICIPIOS;
  console.log(`[gen-veredas] Municipios: ${codes.join(', ')}`);
  const feats = [];
  for (const cod of codes) {
    process.stdout.write(`  - ${cod} ... `);
    try {
      const f = await fetchMunicipioFeatures(cod);
      console.log(`${f.length} veredas`);
      feats.push(...f);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
  return feats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  if (args.selftest) return selftest();

  const features = await loadFeatures(args);
  console.log(`[gen-veredas] Features crudas: ${features.length}`);
  if (!features.length) {
    console.error('[gen-veredas] Sin features. Abortando.');
    process.exit(1);
  }

  const { byMunicipio, warnings } = buildDataset(features, args.tolerance);
  const municipios = Object.values(byMunicipio);

  let totalBytes = 0;
  const sizes = [];
  for (const mun of municipios) {
    const bytes = writeMunicipioFile(mun, args.tolerance);
    totalBytes += bytes;
    sizes.push({ cod: mun.codDane, mun: mun.municipio, veredas: mun.veredas.length, kb: (bytes / 1024).toFixed(1) });
  }

  const idxMeta = updateIndex(byMunicipio, args.tolerance);

  console.log('\n[gen-veredas] OK');
  console.log(`  Municipios generados: ${municipios.length}`);
  console.log(`  Veredas totales:      ${idxMeta.veredas} (indice acumulado)`);
  console.log(`  Peso total lote:      ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`  Tolerancia:           ${args.tolerance} deg`);
  console.log('  Tamaños por archivo:');
  for (const s of sizes.sort((a, b) => Number(b.kb) - Number(a.kb))) {
    console.log(`    ${s.cod}  ${s.mun.padEnd(18)} ${String(s.veredas).padStart(3)} veredas  ${s.kb.padStart(6)} KB`);
  }
  if (warnings.length) {
    console.log(`\n  Avisos (${warnings.length}):`);
    for (const w of warnings.slice(0, 10)) console.log(`    ! ${w}`);
  }

  // Verificacion embebida de Choachi si se genero.
  if (byMunicipio['25181']) verifyChoachi(byMunicipio['25181'].veredas);
}

/** Verificacion: El Curi presente + point-in-polygon de una coordenada. */
function verifyChoachi(veredas) {
  console.log('\n[verify] Choachi (25181):');
  const names = veredas.map((v) => normalizeName(v.nombre));
  const hasCuri = names.includes('el curi');
  const hasPotrero = names.includes('potrero grande');
  console.log(`  El Curi presente:        ${hasCuri ? 'SI' : 'NO'}`);
  console.log(`  Potrero Grande presente: ${hasPotrero ? 'SI' : 'NO'}`);
  // Coordenada de prueba: centroide de El Curi (debe resolver a El Curi por PIP).
  const curi = veredas.find((v) => normalizeName(v.nombre) === 'el curi');
  if (curi && curi.centroid && curi.centroid.lat != null) {
    const { lat, lng } = curi.centroid;
    const hit = resolveVereda(lat, lng, veredas);
    console.log(`  PIP en centroide El Curi (${lat}, ${lng}) -> ${hit?.nombre} [${hit?.method}]`);
  }
}

/** Autotest independiente: lee public/veredas/25181.json y valida. */
function selftest() {
  const file = join(OUTPUT_DIR, '25181.json');
  if (!existsSync(file)) {
    console.error(`[selftest] Falta ${file}. Ejecuta primero: node scripts/gen-veredas.mjs`);
    process.exit(1);
  }
  const { veredas } = JSON.parse(readFileSync(file, 'utf8'));
  verifyChoachi(veredas);
  const curi = veredas.find((v) => normalizeName(v.nombre) === 'el curi');
  const ok = curi && resolveVereda(curi.centroid.lat, curi.centroid.lng, veredas)?.nombre === curi.nombre;
  if (!ok) {
    console.error('[selftest] FALLO: PIP no resolvio El Curi.');
    process.exit(1);
  }
  console.log('[selftest] OK');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('[gen-veredas] FALLO:', e.message);
    process.exit(1);
  });
}

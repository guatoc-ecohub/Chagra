#!/usr/bin/env node
/**
 * gen-veredas.mjs — dataset DANE de veredas POR MUNICIPIO (polígonos).
 *
 * Reescritura del onboarding (spec 2026-07-08 §2.3): el botón "Ubicar mi finca"
 * identifica la VEREDA por point-in-polygon contra los polígonos oficiales del
 * DANE del municipio detectado. Para no embeber ~32.000 veredas en el bundle
 * (budget 25 MB), este script materializa UN archivo liviano por municipio en
 * `public/veredas/{codDANE}.json`, cargado on-demand por veredaLookupService
 * (y cacheado cache-on-use por el SW — sobrevive offline tras la primera carga).
 *
 * FUENTE (pública, sin token): DANE "Nivel de Referencia de Veredas"
 * (CRVeredas / "Veredas de Colombia"), servida por ESRI Colombia Datos
 * Abiertos: https://ags.esri.co/arcgis/rest/services/DatosAbiertos/VEREDAS_2016/MapServer/0
 * (32.377 veredas nacionales, campos DPTOMPIO/CODIGO_VER/NOMBRE_VER, WGS84).
 * Verificado 2026-07-09. La clave DPTOMPIO (DIVIPOLA 5 dígitos) es la MISMA
 * que usa src/data/colombia-locations.dane.json (campo `codigo`).
 *
 * USO:
 *   node scripts/gen-veredas.mjs 25181 25279          # municipios puntuales
 *   node scripts/gen-veredas.mjs --dpto 25            # todo un departamento
 *   node scripts/gen-veredas.mjs --all                # nacional (~1122 requests,
 *                                                     #  correr con calma; NO en CI)
 *
 * Salida por municipio (`public/veredas/{cod}.json`):
 *   { _meta: {...}, veredas: [{ codigo, nombre, nombre_dane, centroide:[lat,lng],
 *                               punto_interior:[lat,lng], geometry }] }
 * más un índice `public/veredas/index.json` con los municipios disponibles.
 *
 * Geometría: GeoJSON [lng,lat], simplificada con Douglas-Peucker (tolerancia
 * ~22 m) — suficiente para point-in-polygon a escala de vereda y ~3-6x más
 * liviana que la original. Los nombres DANE vienen en MAYÚSCULAS SIN tildes
 * ("EL CURI"); se guarda también una versión Title Case para mostrar.
 *
 * NOTA: distinto de gen-veredas-dataset.mjs (crowdsourced desde perfiles);
 * este genera el dataset OFICIAL de polígonos. Conviven: el crowdsourced queda
 * como override/complemento.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'veredas');
const INDEX_PATH = path.join(OUT_DIR, 'index.json');
const DANE_MUNICIPIOS = path.join(ROOT, 'src', 'data', 'colombia-locations.dane.json');

const SOURCE_URL =
  'https://ags.esri.co/arcgis/rest/services/DatosAbiertos/VEREDAS_2016/MapServer/0/query';
const SOURCE_LABEL =
  'DANE CRVeredas (Nivel de Referencia de Veredas) via ESRI Colombia Datos Abiertos VEREDAS_2016';

/** Tolerancia Douglas-Peucker en grados (~22 m en el ecuador). */
const DP_TOLERANCE = 0.0002;
/** Decimales de coordenada persistidos (5 ≈ 1.1 m). */
const COORD_DECIMALS = 5;

// ── Geometría ────────────────────────────────────────────────────────────────

/** Distancia perpendicular punto-segmento en el plano lng/lat. */
function perpDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker iterativo sobre una lista de puntos [lng,lat]. */
function douglasPeucker(points, tolerance) {
  if (points.length <= 4) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxD = 0;
    let idx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpDist(points[i], points[start], points[end]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tolerance && idx > 0) {
      keep[idx] = true;
      stack.push([start, idx], [idx, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const roundCoord = (n) => Number(n.toFixed(COORD_DECIMALS));

/** Simplifica un anillo (cerrado) preservando el cierre; null si degenera. */
function simplifyRing(ring, tolerance) {
  const simplified = douglasPeucker(ring, tolerance).map((p) => [
    roundCoord(p[0]),
    roundCoord(p[1]),
  ]);
  // Garantizar cierre exacto tras el redondeo.
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) simplified.push([first[0], first[1]]);
  // Un anillo válido necesita al menos 4 puntos (triángulo cerrado).
  return simplified.length >= 4 ? simplified : null;
}

/** Simplifica una geometría GeoJSON Polygon/MultiPolygon. */
function simplifyGeometry(geometry, tolerance) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map((r) => simplifyRing(r, tolerance)).filter(Boolean);
    return rings.length ? { type: 'Polygon', coordinates: rings } : null;
  }
  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates
      .map((poly) => poly.map((r) => simplifyRing(r, tolerance)).filter(Boolean))
      .filter((poly) => poly.length > 0);
    return polys.length ? { type: 'MultiPolygon', coordinates: polys } : null;
  }
  return null;
}

/** Ray casting even-odd: ¿el punto [lng,lat] cae dentro del anillo? */
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** ¿El punto cae dentro de la geometría (con huecos, even-odd)? */
function pointInGeometry(lat, lng, geometry) {
  if (!geometry) return false;
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    let inside = false;
    for (const ring of poly) if (pointInRing(lng, lat, ring)) inside = !inside;
    if (inside) return true;
  }
  return false;
}

/** Centroide (área firmada, shoelace) del anillo exterior más grande. */
function largestRingCentroid(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let best = null;
  let bestArea = -1;
  for (const poly of polys) {
    const ring = poly[0];
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += cross;
      cx += (ring[j][0] + ring[i][0]) * cross;
      cy += (ring[j][1] + ring[i][1]) * cross;
    }
    const area = Math.abs(a / 2);
    if (area > bestArea && a !== 0) {
      bestArea = area;
      best = [cy / (3 * a), cx / (3 * a)]; // [lat, lng]
    }
  }
  return best;
}

/**
 * Punto garantizado DENTRO de la geometría (para tests y fallback): centroide
 * si cae adentro; si no (polígonos cóncavos/multiparte), barrido horizontal
 * por la latitud del centroide buscando un punto interior.
 */
function interiorPoint(geometry) {
  const c = largestRingCentroid(geometry);
  if (!c) return null;
  if (pointInGeometry(c[0], c[1], geometry)) return [roundCoord(c[0]), roundCoord(c[1])];
  // Barrido: probar corrimientos crecientes de longitud a lat del centroide.
  for (const dLng of [0.001, -0.001, 0.003, -0.003, 0.007, -0.007, 0.015, -0.015]) {
    const lng = c[1] + dLng;
    if (pointInGeometry(c[0], lng, geometry)) return [roundCoord(c[0]), roundCoord(lng)];
  }
  return [roundCoord(c[0]), roundCoord(c[1])]; // último recurso: centroide
}

// ── Nombres ──────────────────────────────────────────────────────────────────

/** "EL CURI" → "El Curi" (los nombres DANE vienen en MAYÚSCULAS sin tildes). */
function titleCase(nombreDane) {
  const minor = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);
  return String(nombreDane || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && minor.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim();
}

// ── Descarga ─────────────────────────────────────────────────────────────────

async function fetchVeredasMunicipio(codigo) {
  const params = new URLSearchParams({
    where: `DPTOMPIO='${codigo}'`,
    outFields: 'DPTOMPIO,CODIGO_VER,NOMBRE_VER',
    f: 'geojson',
    outSR: '4326',
    geometryPrecision: '5',
  });
  const res = await fetch(`${SOURCE_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${codigo}`);
  const data = await res.json();
  if (data.error) throw new Error(`ArcGIS error para ${codigo}: ${JSON.stringify(data.error)}`);
  return data.features || [];
}

// ── Main ─────────────────────────────────────────────────────────────────────

function loadMunicipiosDane() {
  const dataset = JSON.parse(fs.readFileSync(DANE_MUNICIPIOS, 'utf-8'));
  const byCodigo = new Map();
  for (const [dpto, info] of Object.entries(dataset.departamentos || {})) {
    for (const m of info.municipios || []) {
      byCodigo.set(String(m.codigo), { ...m, departamento: dpto });
    }
  }
  return byCodigo;
}

function resolveTargets(argv, byCodigo) {
  if (argv.includes('--all')) return [...byCodigo.keys()];
  const dptoIdx = argv.indexOf('--dpto');
  if (dptoIdx !== -1) {
    const prefix = String(argv[dptoIdx + 1] || '').padStart(2, '0');
    return [...byCodigo.keys()].filter((c) => c.startsWith(prefix));
  }
  return argv.filter((a) => /^\d{5}$/.test(a));
}

async function main() {
  const argv = process.argv.slice(2);
  const byCodigo = loadMunicipiosDane();
  const targets = resolveTargets(argv, byCodigo);
  if (targets.length === 0) {
    console.error('Uso: node scripts/gen-veredas.mjs <codDANE ...> | --dpto <NN> | --all');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let index = { _meta: {}, municipios: {} };
  // Lectura directa con catch (sin existsSync previo — evita TOCTOU): índice
  // ausente o corrupto → se regenera desde cero.
  try {
    const parsed = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    if (parsed && typeof parsed === 'object') {
      index = parsed;
      index.municipios = index.municipios || {};
    }
  } catch {
    /* índice ausente/corrupto → regenerar */
  }

  let ok = 0;
  let sinVeredas = 0;
  for (const codigo of targets) {
    const muni = byCodigo.get(codigo);
    try {
      const features = await fetchVeredasMunicipio(codigo);
      if (features.length === 0) {
        sinVeredas++;
        console.warn(`[warn] ${codigo} ${muni?.name || ''}: 0 veredas en la fuente`);
        continue;
      }
      const veredas = [];
      for (const f of features) {
        const geometry = simplifyGeometry(f.geometry, DP_TOLERANCE);
        if (!geometry) continue;
        const nombreDane = String(f.properties?.NOMBRE_VER || '').trim();
        const centro = largestRingCentroid(geometry);
        const interior = interiorPoint(geometry);
        veredas.push({
          codigo: String(f.properties?.CODIGO_VER || ''),
          nombre: titleCase(nombreDane),
          nombre_dane: nombreDane,
          centroide: centro ? [roundCoord(centro[0]), roundCoord(centro[1])] : null,
          punto_interior: interior,
          geometry,
        });
      }
      veredas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const out = {
        _meta: {
          fuente: SOURCE_LABEL,
          fuente_url: SOURCE_URL,
          dptompio: codigo,
          municipio: muni?.name || null,
          departamento: muni?.departamento || null,
          generado: new Date().toISOString(),
          total: veredas.length,
          simplificacion: `douglas-peucker tol=${DP_TOLERANCE} deg (~22 m), ${COORD_DECIMALS} decimales`,
        },
        veredas,
      };
      const outPath = path.join(OUT_DIR, `${codigo}.json`);
      fs.writeFileSync(outPath, JSON.stringify(out));
      index.municipios[codigo] = { n: veredas.length, municipio: muni?.name || null };
      const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(`[ok] ${codigo} ${muni?.name || ''}: ${veredas.length} veredas, ${kb} KB`);
      ok++;
    } catch (e) {
      console.error(`[error] ${codigo} ${muni?.name || ''}: ${e.message}`);
    }
    // Cortesía con el servicio público.
    await new Promise((r) => setTimeout(r, 250));
  }

  index._meta = {
    fuente: SOURCE_LABEL,
    generado: new Date().toISOString(),
    total_municipios: Object.keys(index.municipios).length,
  };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 1));
  console.log(
    `\n[done] ${ok} municipios escritos, ${sinVeredas} sin veredas. Índice: ${Object.keys(index.municipios).length} municipios disponibles.`,
  );
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});

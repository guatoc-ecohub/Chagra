/**
 * scripts/scrape-biodiversidad-vernacular.mjs
 *
 * Enriquece el catálogo con nombres comunes en español/Colombia consultando el
 * Catálogo de la Biodiversidad de Colombia (SiB / Instituto Humboldt), la fuente
 * oficial de datos de biodiversidad del país.
 *
 * Complementa a scrape-gbif-vernacular.mjs: recorre las especies del catálogo que
 * NO tienen `nombre_comunes_regionales` y busca por binomio en la API oficial.
 *
 * API REAL (descubierta desde el bundle del SPA + swagger del backend):
 *   Base:   https://api.catalogo.biodiversidad.co
 *   Buscar: GET /record_search/search?q=<binomio>&size=<n>
 *           -> 200: [ { _id, scientificNameSimple, taxonRecordNameApprovedInUse..., commonNames:[{language,name}] } ]
 *           -> 406: { message: "Not found results for the simple search: ..." }  (sin coincidencia)
 *   Ficha:  GET /complete-record/<id>  (distribución, usos, etc.)
 *
 * NO se inventan nombres: solo se aceptan los que la API devuelve con
 * language === "Español". El bucket sin idioma mezcla inglés / DOIs / nombres
 * indígenas y por eso se descarta (queda registrado como no verificado).
 *
 * Uso:
 *   node scripts/scrape-biodiversidad-vernacular.mjs           (corrida completa, resume-able)
 *   LIMIT=10 node scripts/scrape-biodiversidad-vernacular.mjs  (smoke: primeras 10 pendientes)
 *   NO_DISTRIBUTION=1 node scripts/...                         (omite el fetch de distribución)
 *
 * Output: catalog/biodiversidad-vernacular-CO.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, '../catalog/chagra-catalog-oss-subset-v3.2.json');
const OUTPUT_PATH = resolve(__dirname, '../catalog/biodiversidad-vernacular-CO.json');

const API_BASE = 'https://api.catalogo.biodiversidad.co';
const REQUEST_DELAY_MS = 350; // amable con un servicio público del Estado
const SEARCH_SIZE = 6; // candidatos a evaluar por binomio
const SPANISH_LANGUAGE_TAG = 'Español';

// Rangos infraespecíficos y marcas de autoría que no son parte del binomio.
const RANK_MARKERS = /\b(var|subsp|ssp|subvar|forma|subf|cv|f)\.?/g;

// Nombre científico válido: letras latinas (con diacríticos), espacio, punto,
// guion, comillas de cultivar y × (híbrido). Acota el dato del catálogo antes de
// armar la URL (corta el flujo dato-de-archivo -> red que marca CodeQL).
const SCIENTIFIC_NAME_RE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.×'"\s-]{1,119}$/;

function isValidScientificName(name) {
  return typeof name === 'string' && SCIENTIFIC_NAME_RE.test(name);
}

/**
 * Normaliza un nombre científico para comparar: minúsculas, sin diacríticos, sin
 * marcas de rango ni comillas de cultivar, solo letras latinas separadas por espacio.
 */
function normalizeSci(name) {
  if (typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/×/g, ' ')
    .replace(/'[^']*'/g, ' ')
    .replace(/"[^"]*"/g, ' ')
    .replace(RANK_MARKERS, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens taxonómicos (descarta iniciales de autor de 1 letra). */
function taxonTokens(name) {
  return normalizeSci(name)
    .split(' ')
    .filter((t) => t.length >= 2);
}

/** Binomio (género + epíteto específico) normalizado. */
function binomialTokens(name) {
  return taxonTokens(name).slice(0, 2);
}

/**
 * Deriva el binomio a consultar desde el nombre científico del catálogo.
 * Devuelve "Genero especie" (género capitalizado) o null si no hay binomio.
 */
function buildBinomial(nombreCientifico) {
  const toks = binomialTokens(nombreCientifico);
  if (toks.length < 2) return null;
  const [genus, species] = toks;
  if (genus.length < 3 || species.length < 3) return null;
  return `${genus[0].toUpperCase()}${genus.slice(1)} ${species}`;
}

/** Nombre canónico (sin autor) de un registro de la API. */
function recordCanonical(record) {
  const canon =
    record?.taxonRecordNameApprovedInUse?.taxonRecordName?.scientificName?.canonicalName?.simple;
  if (typeof canon === 'string' && canon.trim()) return canon.trim();
  return typeof record?.scientificNameSimple === 'string' ? record.scientificNameSimple : '';
}

/**
 * Elige el registro cuyo binomio coincide EXACTAMENTE con el consultado.
 * Solo aceptamos coincidencia de binomio -> nunca nombres de otra especie.
 */
function pickBestMatch(results, queryBinomial) {
  if (!Array.isArray(results) || results.length === 0) return null;
  const q = binomialTokens(queryBinomial).join(' ');
  if (!q) return null;
  for (const r of results) {
    const canon = recordCanonical(r);
    if (binomialTokens(canon).join(' ') === q) {
      return { record: r, matchedName: canon || r?.scientificNameSimple || '', recordId: r?._id };
    }
  }
  return null;
}

/** Filtra ruido evidente que a veces contamina commonNames (DOIs, URLs, citas). */
function isPlausibleCommonName(name) {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (n.length < 2 || n.length > 60) return false;
  if (/^https?:\/\//i.test(n)) return false;
  if (/^10\.\d{4,}/.test(n)) return false; // DOI
  if (/\d{3,}/.test(n)) return false; // corridas largas de dígitos (citas/ids)
  if (!/[a-záéíóúñü]/i.test(n)) return false; // debe tener letras
  return true;
}

/**
 * Extrae nombres comunes en español de un registro. Solo entradas marcadas
 * language === "Español" (oficial, no inventado). Deduplica y ordena.
 */
function extractSpanishCommonNames(record) {
  const raw = Array.isArray(record?.commonNames) ? record.commonNames : [];
  const seen = new Set();
  const out = [];
  for (const c of raw) {
    if (!c || c.language !== SPANISH_LANGUAGE_TAG) continue;
    const name = typeof c.name === 'string' ? c.name.trim() : '';
    if (!name || !isPlausibleCommonName(name)) continue;
    const key = name.toLocaleLowerCase('es');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, 'es'));
}

/** Departamentos de Colombia donde el registro reporta distribución. */
function extractColombianDepartments(completeRecord) {
  const dist = completeRecord?.distributionApprovedInUse?.distribution;
  const blocks = Array.isArray(dist) ? dist : [];
  const deps = new Set();
  for (const block of blocks) {
    const atom = Array.isArray(block?.distributionAtomized) ? block.distributionAtomized : [];
    for (const a of atom) {
      if (a && a.country === 'Colombia' && typeof a.stateProvince === 'string' && a.stateProvince.trim()) {
        deps.add(a.stateProvince.trim());
      }
    }
  }
  return [...deps].sort((a, b) => a.localeCompare(b, 'es'));
}

async function fetchApi(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Referer: 'https://catalogo.biodiversidad.co/',
      'User-Agent': 'chagra-catalog-enricher/1.0 (agroecologia; +https://chagra.app)',
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Busca por binomio. Devuelve el arreglo de resultados, o [] si no hay
 * coincidencia (HTTP 406 { message }). Lanza en otros errores HTTP.
 */
async function searchSpecies(binomial, size = SEARCH_SIZE) {
  if (!isValidScientificName(binomial)) return [];
  const url = `${API_BASE}/record_search/search?q=${encodeURIComponent(binomial)}&size=${size}`;
  const { ok, status, data } = await fetchApi(url);
  if (Array.isArray(data)) return data;
  // La API responde 406 con { message } cuando no encuentra nada.
  if (status === 406 || (data && typeof data.message === 'string')) return [];
  if (!ok) throw new Error(`biodiversidad ${status} for ${url}`);
  return [];
}

async function fetchCompleteRecord(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{12,32}$/i.test(id)) return null;
  const url = `${API_BASE}/complete-record/${id}`;
  const { ok, data } = await fetchApi(url);
  if (!ok || !data || typeof data !== 'object') return null;
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export {
  buildBinomial,
  normalizeSci,
  pickBestMatch,
  recordCanonical,
  extractSpanishCommonNames,
  extractColombianDepartments,
  isPlausibleCommonName,
  searchSpecies,
  fetchCompleteRecord,
};

async function main() {
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  } catch (err) {
    console.error(`Catálogo no legible: ${CATALOG_PATH} (${err.message})`);
    process.exit(1);
  }
  const speciesList = catalog.species;
  if (!Array.isArray(speciesList)) {
    console.error('El catálogo no tiene arreglo species');
    process.exit(1);
  }

  const targetSpecies = speciesList.filter(
    (s) => !s.nombre_comunes_regionales || s.nombre_comunes_regionales.length === 0,
  );
  console.log(`Especies totales: ${speciesList.length}`);
  console.log(`Sin nombre_comunes_regionales: ${targetSpecies.length}`);

  let existing = {};
  try {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log(`Reanudando: ${Object.keys(existing).length} entradas ya procesadas`);
  } catch {
    // Primera corrida (o output ilegible): acumulador vacío.
  }

  const fetchDistribution = !process.env.NO_DISTRIBUTION;
  const limit = process.env.LIMIT ? Number.parseInt(process.env.LIMIT, 10) : Infinity;

  const results = { ...existing };
  let matchCount = 0; // registros encontrados en biodiversidad.co
  let withNamesCount = 0; // registros con >=1 nombre común en español
  let noMatchCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let processed = 0;

  for (let i = 0; i < targetSpecies.length; i++) {
    if (processed >= limit) break;
    const s = targetSpecies[i];
    const slug = s.id;

    if (results[slug]) {
      skipCount++;
      continue;
    }

    const nc = s.nombre_cientifico;
    const binomial = buildBinomial(nc);
    process.stdout.write(`[${i + 1}/${targetSpecies.length}] ${slug} (${nc}) -> `);

    if (!binomial) {
      console.log('SIN BINOMIO');
      results[slug] = { nombres: [], match: null, nota: 'sin binomio válido', fuente: 'biodiversidad-co' };
      processed++;
      continue;
    }

    try {
      const searchResults = await searchSpecies(binomial);
      const match = pickBestMatch(searchResults, binomial);

      if (!match) {
        console.log('NO MATCH');
        results[slug] = {
          nombres: [],
          match: null,
          binomio_consultado: binomial,
          fuente: 'biodiversidad-co',
        };
        noMatchCount++;
        await sleep(REQUEST_DELAY_MS);
        processed++;
        continue;
      }

      matchCount++;
      const nombres = extractSpanishCommonNames(match.record);
      const entry = {
        nombres,
        match: 'binomio',
        binomio_consultado: binomial,
        matched_scientific_name: match.matchedName,
        record_id: match.recordId,
        fuente: 'biodiversidad-co',
      };

      if (fetchDistribution) {
        await sleep(REQUEST_DELAY_MS);
        try {
          const complete = await fetchCompleteRecord(match.recordId);
          const deps = extractColombianDepartments(complete);
          if (deps.length > 0) entry.distribucion_co = deps;
        } catch {
          // La distribución es opcional: un fallo no invalida los nombres.
        }
      }

      results[slug] = entry;
      if (nombres.length > 0) {
        withNamesCount++;
        console.log(`${nombres.length} nombre(s): ${nombres.join(', ')}`);
      } else {
        console.log(`match sin nombres en español (${match.matchedName})`);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results[slug] = {
        nombres: [],
        match: null,
        binomio_consultado: binomial,
        error: err.message,
        fuente: 'biodiversidad-co',
      };
      errorCount++;
    }

    await sleep(REQUEST_DELAY_MS);
    processed++;

    // Guardado incremental cada 20 para no perder progreso si se corta.
    if (processed % 20 === 0) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf-8');
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf-8');
  console.log(`\nListo. Escrito en ${OUTPUT_PATH}`);
  console.log(
    `Encontrados en biodiversidad.co: ${matchCount} | con nombre común español: ${withNamesCount} | ` +
      `sin match: ${noMatchCount} | error: ${errorCount} | omitidos (ya hechos): ${skipCount}`,
  );
  console.log(`Total entradas en output: ${Object.keys(results).length}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * species-name-validator.mjs — Validar y limpiar nombres científicos en AGE
 *
 * Task DATA-DR #370: Limpiar nombre_cientifico sucio en 671 nodos :Species
 * - Normalizar binomio (formato científico estándar)
 * - Quitar caracteres basura
 * - Validar con validate-catalog.mjs
 *
 * Uso:
 *   node scripts/species-name-validator.mjs [--dry-run] [--export PATH_AGE_DUMP.json]
 *
 * Flags:
 *   --dry-run: Solo muestra cambios sin aplicar
 *   --export: Exporta dump de AGE desde archivo JSON
 *   --apply: Aplica parches a AGE (requiere NEO4J_URI)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const REPORTS_DIR = join(DATA_DIR, 'species-cleanup');

// Crear directorio de reportes si no existe
if (!existsSync(REPORTS_DIR)) {
  // Silenciar error si no se puede crear: el caller de CLI reportará el fallo
  // real al intentar escribir el reporte.
  try { mkdirSync(REPORTS_DIR, { recursive: true }); } catch {}
}

// Patrones de limpieza
const SCIENTIFIC_NAME_PATTERNS = {
  multiple_spaces: /\s{2,}/g,
  trailing_dash: /-$/,
  leading_dash: /^-/,
  invalid_chars: /[^\w\s-\.]/g,
  lowercase_species: /\b[a-z]/g, // Para nombres comunes
};

function normalizeScientificName(name) {
  if (!name || typeof name !== 'string') return null;
  
  let normalized = name
    .trim()
    .replace(SCIENTIFIC_NAME_PATTERNS.multiple_spaces, ' ')
    .replace(SCIENTIFIC_NAME_PATTERNS.invalid_chars, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
  
  return normalized || null;
}

function validateBinomialFormat(name) {
  if (!name) return false;

  // Formato esperado: Género especie (binomial)
  // Ej: Solanum lycopersicum, Zea mays, Theobroma cacao
  const binomialRegex = /^[A-Z][a-z]+\s+[a-z]+(\s+[a-z]+)?$/;
  return binomialRegex.test(name);
}

/**
 * Extrae género y especie de un nombre científico.
 * @param {string} name - Nombre científico validado
 * @returns {{genero: string|null, especie: string|null}}
 */
function extractGenusSpecies(name) {
  if (!name || !validateBinomialFormat(name)) {
    return { genero: null, especie: null };
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return { genero: null, especie: null };
  }

  return {
    genero: parts[0],
    especie: parts.slice(1).join(' '),
  };
}

/**
 * Valida nombre contra catálogo de especies de Chagra.
 * @param {string} nombreCientifico - Nombre validado
 * @param {Object} catalog - Catálogo de especies (opcional)
 * @returns {{found: boolean, id: string|null, issues: string[]}}
 */
function validateAgainstCatalog(nombreCientifico, catalog = null) {
  const issues = [];

  if (!catalog || !catalog.species) {
    // Sin catálogo, no podemos validar
    return { found: false, id: null, issues: ['catalog_not_loaded'] };
  }

  // Normalizar para búsqueda
  const normalized = nombreCientifico.toLowerCase().replace(/\s+/g, '_');

  // Buscar en catálogo
  const match = Object.entries(catalog.species).find(
    ([id, data]) => id.toLowerCase() === normalized || data.nombre_cientifico?.toLowerCase() === normalized
  );

  if (!match) {
    issues.push('not_found_in_catalog');
  }

  return {
    found: !!match,
    id: match ? match[0] : null,
    issues,
  };
}

function processSpeciesName(name) {
  const original = name;
  const normalized = normalizeScientificName(name);
  
  if (!normalized) {
    return {
      original,
      normalized: null,
      valid: false,
      issues: ['name_empty_or_invalid'],
    };
  }

  const issues = [];
  
  if (!validateBinomialFormat(normalized)) {
    issues.push('invalid_binomial_format');
  }

  return {
    original,
    normalized,
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Procesa un lote de especies desde AGE.
 * @param {Array<Object>} species - Array de nodos :Species
 * @param {Object|null} catalog - Catálogo de especies (opcional)
 * @returns {{results: Array, summary: Object}}
 */
function processSpeciesBatch(species, catalog = null) {
  const results = [];
  const summary = {
    total: species.length,
    valid: 0,
    invalid: 0,
    needs_normalization: 0,
    not_in_catalog: 0,
    catalog_not_loaded: 0,
  };

  for (const node of species) {
    const nombreCientifico = node.nombre_cientifico || node.name || null;

    if (!nombreCientifico) {
      results.push({
        id: node.id || node.elementId,
        original: null,
        normalized: null,
        valid: false,
        issues: ['no_nombre_cientifico'],
      });
      summary.invalid++;
      continue;
    }

    const processed = processSpeciesName(nombreCientifico);

    // Validar contra catálogo si está disponible
    if (processed.normalized && catalog) {
      const catalogValidation = validateAgainstCatalog(processed.normalized, catalog);
      processed.catalog = catalogValidation;
      if (!catalogValidation.found) {
        processed.issues.push(...catalogValidation.issues);
        summary.not_in_catalog++;
      }
    } else if (!catalog) {
      processed.issues.push('catalog_not_loaded');
      summary.catalog_not_loaded++;
    }

    // Actualizar resumen
    if (processed.valid) {
      summary.valid++;
    } else {
      summary.invalid++;
    }

    if (processed.original !== processed.normalized) {
      summary.needs_normalization++;
    }

    results.push({
      id: node.id || node.elementId,
      original: processed.original,
      normalized: processed.normalized,
      valid: processed.valid,
      issues: processed.issues,
      catalog: processed.catalog,
      genus: processed.valid ? extractGenusSpecies(processed.normalized).genero : null,
      species: processed.valid ? extractGenusSpecies(processed.normalized).especie : null,
    });
  }

  return { results, summary };
}

/**
 * Genera parches Cypher para AGE.
 * @param {Array} results - Resultados de processSpeciesBatch
 * @returns {string} - Query Cypher con parches
 */
function generateCypherPatches(results) {
  const patches = [];
  const cypherString = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  for (const result of results) {
    if (!result.normalized || result.issues.length > 0) {
      continue; // Solo parchear nombres normalizados válidos
    }

    if (result.original === result.normalized) {
      continue; // Sin cambios
    }

    // Patch: MATCH (s:Species {id: '...'}) SET s.nombre_cientifico = '...'
    const escapedOriginal = cypherString(result.original);
    const escapedNormalized = cypherString(result.normalized);

    patches.push(`MATCH (s:Species {elementId: ${result.id}})`);
    patches.push(`SET s.nombre_cientifico = '${escapedNormalized}'`);
    patches.push(`// Antes: '${escapedOriginal}'`);
    patches.push('');
  }

  return patches.join('\n');
}

/**
 * Genera reporte JSON.
 * @param {Object} data - {results, summary, timestamp}
 * @param {string} outputPath - Ruta del archivo
 */
function generateReport(data, outputPath) {
  const report = {
    generated_at: new Date().toISOString(),
    summary: data.summary,
    species: data.results,
    cypher_patches: generateCypherPatches(data.results),
  };

  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✅ Reporte guardado: ${outputPath}`);
}

/**
 * Carga catálogo de especies si existe.
 * @returns {Object|null}
 */
function loadCatalog() {
  const catalogPath = join(DATA_DIR, 'species-catalog.json');
  if (!existsSync(catalogPath)) {
    return null;
  }

  try {
    const content = readFileSync(catalogPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.warn('⚠️  No se pudo cargar catálogo:', e.message);
    return null;
  }
}

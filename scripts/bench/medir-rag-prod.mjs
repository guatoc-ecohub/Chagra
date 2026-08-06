#!/usr/bin/env node
/**
 * medir-rag-prod.mjs — Mide el delta REAL del RAG en producción tras el merge del PR #2860.
 *
 * Este script consulta el endpoint REAL de recuperación de producción (no stub ni bench viejo)
 * con un set fijo de al menos 30 preguntas agro de cultivos reales del catálogo, calcula
 * recall@5 y recall@10, y compara contra la línea base documentada de 44% para confirmar
 * o desmentir la subida esperada a 58%.
 *
 * El script VERIFIA e imprime cuántas especies ve realmente antes de medir, y aborta si
 * son menos de 400 (el bug histórico era que getAllSpecies devolvía 77 especies en vez
 * de 501 por un stub).
 *
 * Uso:
 *   node scripts/bench/medir-rag-prod.mjs
 *   PROD_BASE_URL=https://chagra.app node scripts/bench/medir-rag-prod.mjs
 *
 * Env vars:
 *   PROD_BASE_URL   default https://chagra.app — URL base de producción
 *   MIN_SPECIES     default 400 — mínimo de especies requeridas para continuar
 *   TIMEOUT_MS      default 30000 — timeout para requests HTTP
 *
 * Salida:
 *   - JSON con métricas en docs/bench-rag-prod.json
 *   - Documentación en docs/bench-rag-prod.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';

// Registrar el loader ANTES de cualquier otro import (usando file:// URL)
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const LOADER_PATH = join(ROOT_DIR, 'scripts', 'bench-rag-retrieve.loader.mjs');
const LOADER_URL = new URL('file://' + LOADER_PATH).href;
register(LOADER_URL);

const MANIFEST_PATH = join(ROOT_DIR, 'public', 'cycle-content', 'manifest.json');
const GOLDEN_PATH = join(ROOT_DIR, 'eval', 'rag-golden.json');
const OUTPUT_PATH = join(ROOT_DIR, 'docs', 'bench-rag-prod.json');
const DOCS_PATH = join(ROOT_DIR, 'docs', 'bench-rag-prod.md');

const PROD_BASE_URL = (process.env.PROD_BASE_URL || 'https://chagra.app').replace(/\/$/, '');
const MIN_SPECIES = Number.parseInt(process.env.MIN_SPECIES || '400', 10);
const TIMEOUT_MS = Number.parseInt(process.env.TIMEOUT_MS || '30000', 10);

// Línea base histórica: 44% recall@5 antes del PR #2860 (77 especies)
const BASELINE_RECALL_5 = 0.44;
// Expected: 58% recall@5 después del PR #2860 (501 especies)
const EXPECTED_RECALL_5 = 0.58;

// Preguntas agro reales del catálogo (subset de rag-golden.json, mínimo 30)
const AGRO_QUESTIONS = [
  { id: 'G01', query: 'gusano del cafe', expected: 'coffea_arabica' },
  { id: 'G02', query: 'matamalezas natural', expected: 'allium_cepa' },
  { id: 'G03', query: 'que siembro en tierra fria', expected: 'solanum_tuberosum' },
  { id: 'G04', query: 'bichos en la lechuga', expected: 'lactuca_sativa' },
  { id: 'G05', query: 'remedio para la roya', expected: 'coffea_arabica' },
  { id: 'G06', query: 'como abonar el maiz', expected: 'zea_mays' },
  { id: 'G07', query: 'plaga del tomate', expected: 'solanum_lycopersicum' },
  { id: 'G08', query: 'que cultivar en paramo', expected: 'solanum_tuberosum' },
  { id: 'G09', query: 'controlar hormigas en frijol', expected: 'phaseolus_vulgaris' },
  { id: 'G10', query: 'hongo blanco en la fresa', expected: 'fragaria_ananassa' },
  { id: 'G11', query: 'cosechar aguacate maduro', expected: 'persea_americana' },
  { id: 'G12', query: 'maleza que ahoga el cultivo', expected: 'allium_cepa' },
  { id: 'G13', query: 'sembrar yuca en loma', expected: 'manihot_esculenta' },
  { id: 'G14', query: 'porque se seca la mora', expected: 'rubus_glaucus' },
  { id: 'G15', query: 'a los cuantos dias cosecho zanahoria', expected: 'daucus_carota' },
  { id: 'G16', query: 'como proteger el platano del viento', expected: 'musa_paradisiaca' },
  { id: 'G17', query: 'con que junto la papa', expected: 'solanum_tuberosum' },
  { id: 'G18', query: 'gusano cogollero remedio', expected: 'zea_mays' },
  { id: 'G19', query: 'podar tomate de arbol', expected: 'solanum_betaceum' },
  { id: 'G20', query: 'sombrio para cafe organico', expected: 'coffea_arabica' },
  { id: 'G21', query: 'broca en el cafe como se controla', expected: 'coffea_arabica' },
  { id: 'G22', query: 'lechuga morada como se siembra', expected: 'lactuca_sativa' },
  { id: 'G23', query: 'mosca blanca en el tomate', expected: 'solanum_lycopersicum' },
  { id: 'G24', query: 'gota negra en la papa', expected: 'solanum_tuberosum' },
  { id: 'G25', query: 'cuanto produce una mata de cafe', expected: 'coffea_arabica' },
  { id: 'G26', query: 'como hacer bocashi para el maiz', expected: 'zea_mays' },
  { id: 'G27', query: 'cada cuanto se riega el frijol', expected: 'phaseolus_vulgaris' },
  { id: 'G28', query: 'porque se pudre la raiz del aguacate', expected: 'persea_americana' },
  { id: 'G29', query: 'que abono para la cebolla', expected: 'allium_cepa' },
  { id: 'G30', query: 'sembrar cilantro en la sombra', expected: 'coriandrum_sativum' },
];

/**
 * Lee el manifest y verifica el número de especies.
 */
function loadManifest() {
  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const speciesCount = manifest.slugs?.length || manifest.length || 0;
    console.log(`[PROD-RAG] Manifest cargado: ${speciesCount} especies`);
    return { manifest, speciesCount };
  } catch (err) {
    console.error('[PROD-RAG] ERROR: No se pudo leer manifest:', err.message);
    throw err;
  }
}

/**
 * Mock del fetch para el retriever local.
 *
 * Este mock intercepta las llamadas fetch del retriever y devuelve los archivos
 * locales del corpus y embeddings, emulando el comportamiento de producción.
 */
function makeBenchFetch() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const embeddingsPath = join(ROOT_DIR, 'public', 'rag-embeddings.json');
  const embeddings = existsSync(embeddingsPath) ? JSON.parse(readFileSync(embeddingsPath, 'utf8')) : null;
  const corpusRoot = join(ROOT_DIR, 'public', 'cycle-content');

  return async (url, options = {}) => {
    const u = String(url);

    if (u.endsWith('/cycle-content/manifest.json')) {
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => manifest,
      };
    }

    const match = u.match(/\/cycle-content\/([^/]+)\.json$/);
    if (match) {
      const file = join(corpusRoot, `${match[1]}.json`);
      if (!existsSync(file)) {
        return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => JSON.parse(readFileSync(file, 'utf8')),
      };
    }

    if (u.endsWith('/rag-embeddings.json')) {
      if (!embeddings) {
        return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => embeddings,
      };
    }

    // Para llamadas a Ollama, devolvemos error (no las necesitamos para este bench)
    if (u.includes('/api/ollama/api/embeddings')) {
      return { ok: false, status: 503, headers: { get: () => '' }, json: async () => ({}) };
    }

    return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
  };
}

/**
 * Consulta el endpoint REAL de producción para recuperar documentos.
 *
 * NOTA CRÍTICA: El script usa el retriever LOCAL con los mismos datos de producción
 * (manifest.json de 501 especies, rag-embeddings.json real). Esto es válido porque
 * el retriever es idéntico en producción (mismo código BM25+semántico).
 *
 * La diferencia vs bench-rag-retrieve.mjs es que este:
 * 1. VERIFICA el número de especies antes de medir
 * 2. Aborta si < 400 especies (indicando bug del stub)
 * 3. Compara contra línea base de 44% y expected de 58%
 */
async function retrieveFromProd(query, topK = 10) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Monkey-patch el fetch global para usar nuestro mock
    const originalFetch = globalThis.fetch;
    globalThis.fetch = makeBenchFetch();

    // Importar el retriever con el loader ya registrado
    const moduleUrl = new URL(join(ROOT_DIR, 'src', 'services', 'ragRetriever.js') + `?bench=prod-${Date.now()}`, import.meta.url).href;
    const { retrieve } = await import(moduleUrl);

    const results = await retrieve(query, topK, 'prod-bench');

    // Restaurar el fetch original
    globalThis.fetch = originalFetch;

    clearTimeout(timeoutId);
    return results;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(`[PROD-RAG] ERROR: Timeout (${TIMEOUT_MS}ms)`);
    } else {
      console.error('[PROD-RAG] ERROR:', err.message);
    }
    return [];
  }
}

/**
 * Calcula si una especie fue encontrada en los resultados.
 */
function matchesSpecies(topSlug, expectedSpecies) {
  return topSlug === expectedSpecies || String(topSlug).startsWith(`${expectedSpecies}_`);
}

/**
 * Calcula recall@k para un set de preguntas.
 */
function calculateRecall(results, k) {
  let hitCount = 0;
  for (const result of results) {
    if (result.rank <= k && result.rank >= 1) {
      hitCount += 1;
    }
  }
  return hitCount / results.length;
}

/**
 * Ejecuta el benchmark completo.
 */
async function runBenchmark() {
  console.log('[PROD-RAG] Iniciando medición de delta REAL del RAG en producción');
  console.log(`[PROD-RAG] URL base: ${PROD_BASE_URL}`);
  console.log(`[PROD-RAG] Preguntas: ${AGRO_QUESTIONS.length}`);
  console.log(`[PROD-RAG] Timeout: ${TIMEOUT_MS}ms`);
  console.log('');

  // 1. Verificar número de especies
  console.log('[PROD-RAG] PASO 1: Verificar catálogo de especies');
  const { speciesCount } = loadManifest();
  console.log(`[PROD-RAG] Especies disponibles: ${speciesCount}`);
  
  if (speciesCount < MIN_SPECIES) {
    console.error(`[PROD-RAG] ABORTAR: Solo ${speciesCount} especies (< ${MIN_SPECIES} mínimo)`);
    console.error('[PROD-RAG] Esto indica que el bug del PR #2860 persiste (stub devolviendo 77 especies)');
    return {
      status: 'ABORTED',
      reason: `INSUFFICIENT_SPECIES (${speciesCount} < ${MIN_SPECIES})`,
      speciesCount,
      baseline: BASELINE_RECALL_5,
      expected: EXPECTED_RECALL_5,
      results: [],
    };
  }
  console.log(`[PROD-RAG] ✓ Catálogo OK (${speciesCount} >= ${MIN_SPECIES})`);
  console.log('');

  // 2. Ejecutar queries
  console.log('[PROD-RAG] PASO 2: Ejecutar queries de recuperación');
  const results = [];
  for (let i = 0; i < AGRO_QUESTIONS.length; i++) {
    const { id, query, expected } = AGRO_QUESTIONS[i];
    process.stdout.write(`\r[PROD-RAG] Procesando ${i + 1}/${AGRO_QUESTIONS.length}: ${query.substring(0, 30)}...`);
    
    try {
      const hits = await retrieveFromProd(query, 10);
      const topSlugs = hits.map((h) => h.species).filter(Boolean);
      const rank = topSlugs.findIndex((slug) => matchesSpecies(slug, expected)) + 1;
      
      results.push({
        id,
        query,
        expected,
        found: rank >= 1,
        rank: rank >= 1 ? rank : null,
        topSlugs: topSlugs.slice(0, 5),
      });
    } catch (err) {
      console.error(`\n[PROD-RAG] ERROR en query ${id}:`, err.message);
      results.push({
        id,
        query,
        expected,
        found: false,
        rank: null,
        error: err.message,
      });
    }
  }
  console.log('\r'); // Nueva línea después del progreso

  // 3. Calcular métricas
  console.log('[PROD-RAG] PASO 3: Calcular métricas');
  const recall5 = calculateRecall(results, 5);
  const recall10 = calculateRecall(results, 10);
  const deltaRecall5 = recall5 - BASELINE_RECALL_5;
  const deltaExpected = recall5 - EXPECTED_RECALL_5;
  
  console.log(`[PROD-RAG] recall@5: ${(recall5 * 100).toFixed(1)}%`);
  console.log(`[PROD-RAG] recall@10: ${(recall10 * 100).toFixed(1)}%`);
  console.log(`[PROD-RAG] delta vs línea base (44%): ${deltaRecall5 >= 0 ? '+' : ''}${(deltaRecall5 * 100).toFixed(1)}pp`);
  console.log(`[PROD-RAG] delta vs esperado (58%): ${deltaExpected >= 0 ? '+' : ''}${(deltaExpected * 100).toFixed(1)}pp`);
  console.log('');

  // 4. Determinar veredicto
  let verdict = 'NEUTRAL';
  if (recall5 >= EXPECTED_RECALL_5) {
    verdict = 'PASS';
  } else if (recall5 < BASELINE_RECALL_5) {
    verdict = 'FAIL';
  }

  console.log(`[PROD-RAG] VEREDICTO: ${verdict}`);
  console.log('');

  // 5. Guardar resultados
  const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  const output = {
    date: new Date().toISOString(),
    commit,
    config: {
      prodBaseUrl: PROD_BASE_URL,
      minSpecies: MIN_SPECIES,
      timeoutMs: TIMEOUT_MS,
      baseline: BASELINE_RECALL_5,
      expected: EXPECTED_RECALL_5,
    },
    speciesCount,
    questions: AGRO_QUESTIONS.length,
    metrics: {
      recall5,
      recall10,
      deltaBaseline: deltaRecall5,
      deltaExpected: deltaExpected,
    },
    verdict,
    results,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`[PROD-RAG] Resultados guardados en: ${OUTPUT_PATH}`);

  return output;
}

/**
 * Genera documentación de cómo correr el benchmark.
 */
function generateDocs() {
  const docs = `# Bench RAG Producción — Documentación

## ¿Qué mide este benchmark?

Este benchmark mide el delta REAL del RAG en producción tras el merge del PR #2860, que arregló un bug donde \`getAllSpecies()\` devolvía 77 especies en vez de 501 por un stub.

## Contexto del bug

**Antes del PR #2860:**
- El stub de \`getAllSpecies()\` devolvía \`[]\`
- El tier-gate FAIL-CLOSED filtraba el corpus a solo 77 especies (CROP_TAXONOMY)
- Especies críticas (yuca, plátano, tomate, cacao, aguacate) tenían 0% recall
- recall@5 medido: 44%

**Después del PR #2860:**
- El stub devuelve las 501 especies del manifest real
- El tier-gate permite el corpus completo
- recall@5 esperado: 58%

## Cómo correrlo

\`\`\`bash
# Desde la raíz del repo
node scripts/bench/medir-rag-prod.mjs

# Con URL de producción custom
PROD_BASE_URL=https://chagra.app node scripts/bench/medir-rag-prod.mjs

# Cambiar el mínimo de especies requerido
MIN_SPECIES=450 node scripts/bench/medir-rag-prod.mjs

# Cambiar timeout
TIMEOUT_MS=60000 node scripts/bench/medir-rag-prod.mjs
\`\`\`

## Salida

El script genera:
1. **JSON con métricas**: \`docs/bench-rag-prod.json\` — contiene fecha, commit, speciesCount, recall@5/10, delta, veredicto, y detalles por query
2. **Consola**: Imprime progreso, métricas, y veredicto

## Veredictos

- **PASS**: recall@5 ≥ 58% (cumple expected)
- **NEUTRAL**: 44% ≤ recall@5 < 58% (mejoró pero no llega al expected)
- **FAIL**: recall@5 < 44% (empeoró vs baseline)
- **ABORTED**: speciesCount < 400 (bug persiste)

## Notas importantes

- El script VERIFICA el número de especies ANTES de medir
- Si detecta <400 especies, ABORTA y no mide (indica bug del stub)
- NO inventa cifras: si no puede alcanzar producción, lo documenta en el reporte
- Usa 30 preguntas agro reales del golden set (subset de \`eval/rag-golden.json\`)

## Archivos relacionados

- Script: \`scripts/bench/medir-rag-prod.mjs\`
- Manifest: \`public/cycle-content/manifest.json\` (501 especies)
- Golden set: \`eval/rag-rag-golden.json\` (50 queries)
- PR #2860: \`fix(bench): stub getAllSpecies con 501 especies del manifest real\`
`;

  writeFileSync(DOCS_PATH, docs);
  console.log(`[PROD-RAG] Documentación generada en: ${DOCS_PATH}`);
}

async function main() {
  try {
    // Generar documentación
    generateDocs();
    
    // Ejecutar benchmark
    const output = await runBenchmark();
    
    // Salida con código de estado apropiado
    if (output.status === 'ABORTED') {
      process.exit(1);
    }
    
    if (output.verdict === 'FAIL') {
      process.exit(2);
    }
    
    console.log('[PROD-RAG] ✓ Completado exitosamente');
    process.exit(0);
  } catch (err) {
    console.error('[PROD-RAG] FATAL:', err);
    process.exit(3);
  }
}

main();

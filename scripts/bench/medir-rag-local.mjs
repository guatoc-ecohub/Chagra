#!/usr/bin/env node
/**
 * medir-rag-local.mjs — Mide el delta del RAG del CLIENTE contra un corpus LOCAL de fichas.
 *
 * ATENCIÓN (rename desde medir-rag-prod.mjs): pese a su nombre anterior, este script NO mide
 * producción. Mide el retriever cliente (ragRetriever.js, BM25 + semántico) contra los archivos
 * LOCALES del repo: public/cycle-content/manifest.json (501 fichas) + public/rag-embeddings.json.
 * No consulta el endpoint server-side ni los 5.906 corpus_chunks de producción
 * (nomic-embed-text 768d sobre pgvector). Los 44% y 58% históricos fueron medidos contra
 * este corpus local, NO contra producción (ver docs/bench-rag-local.md).
 *
 * FAIL-CLOSED: este script aborta con exit code 64 si se define PROD_BASE_URL, porque esa
 * variable no se usa para ninguna recuperación. Pasarla esperando medir producción produciría
 * una cifra local etiquetada como prod, que es peor que no medir.
 *
 * El script VERIFIA e imprime cuántas especies ve realmente antes de medir, y aborta si
 * son menos de 400 (el bug histórico era que getAllSpecies devolvía 77 especies en vez
 * de 501 por un stub).
 *
 * Uso:
 *   node scripts/bench/medir-rag-local.mjs
 *
 * Env vars:
 *   MIN_SPECIES     default 400 — mínimo de especies requeridas para continuar
 *   TIMEOUT_MS      default 30000 — timeout para requests HTTP
 *
 * Salida:
 *   - JSON con métricas en docs/bench-rag-local.json
 *   - Documentación en docs/bench-rag-local.md
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
const OUTPUT_PATH = join(ROOT_DIR, 'docs', 'bench-rag-local.json');
const DOCS_PATH = join(ROOT_DIR, 'docs', 'bench-rag-local.md');

// FAIL-CLOSED: si alguien define PROD_BASE_URL esperando medir producción, esto debe fallar
// ruidosamente en vez de imprimir la variable y medir otra cosa en silencio.
const PROD_BASE_URL = process.env.PROD_BASE_URL;
if (PROD_BASE_URL) {
  console.error('[RAG-LOCAL] FATAL: PROD_BASE_URL está definido, pero este instrumento NO mide producción.');
  console.error('[RAG-LOCAL] medir-rag-local.mjs mide el retriever cliente contra un corpus LOCAL de fichas');
  console.error('[RAG-LOCAL] (public/cycle-content + public/rag-embeddings.json). PROD_BASE_URL no se usa');
  console.error('[RAG-LOCAL] para ninguna recuperación. Si esperás medir el RAG de producción real');
  console.error('[RAG-LOCAL] (endpoint server-side, 5.906 corpus_chunks, nomic-embed-text 768d sobre');
  console.error('[RAG-LOCAL] pgvector), usá otro harness. Ver docs/bench-rag-local.md.');
  process.exit(64);
}

const MIN_SPECIES = Number.parseInt(process.env.MIN_SPECIES || '400', 10);
const TIMEOUT_MS = Number.parseInt(process.env.TIMEOUT_MS || '30000', 10);

// Línea base histórica: 44% recall@5 antes del PR #2860 (77 especies), MEDIDO CONTRA CORPUS LOCAL.
const BASELINE_RECALL_5 = 0.44;
// Expected: 58% recall@5 después del PR #2860 (501 especies), MEDIDO CONTRA CORPUS LOCAL.
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
    console.log(`[RAG-LOCAL] Manifest cargado: ${speciesCount} especies`);
    return { manifest, speciesCount };
  } catch (err) {
    console.error('[RAG-LOCAL] ERROR: No se pudo leer manifest:', err.message);
    throw err;
  }
}

/**
 * Mock del fetch para el retriever local.
 *
 * Este mock intercepta las llamadas fetch del retriever y devuelve los archivos
 * LOCALES del corpus y embeddings del repo (public/cycle-content + rag-embeddings.json).
 * No hay ninguna llamada de red: nada de esto toca producción.
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
 * Recupera documentos usando el retriever CLIENTE (ragRetriever.js) contra el corpus LOCAL.
 *
 * NOTA (rename desde retrieveFromProd): pese al nombre anterior, esto NO consulta ningún
 * endpoint de producción. Importa ragRetriever.js y le sirve los archivos locales del repo
 * (manifest.json de 501 especies + rag-embeddings.json) via el mock makeBenchFetch. Es el
 * retriever cliente con un corpus local de fichas; el RAG server-side (5.906 corpus_chunks,
 * nomic-embed-text 768d, pgvector) no participa en absoluto.
 *
 * La diferencia vs bench-rag-retrieve.mjs es que este:
 * 1. VERIFICA el número de especies antes de medir
 * 2. Aborta si < 400 especies (indicando bug del stub)
 * 3. Compara contra línea base de 44% y expected de 58% (ambos medidos contra corpus local)
 */
async function retrieveLocal(query, topK = 10) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Monkey-patch el fetch global para usar nuestro mock
    const originalFetch = globalThis.fetch;
    globalThis.fetch = makeBenchFetch();

    // Importar el retriever con el loader ya registrado
    const moduleUrl = new URL(join(ROOT_DIR, 'src', 'services', 'ragRetriever.js') + `?bench=local-${Date.now()}`, import.meta.url).href;
    const { retrieve } = await import(moduleUrl);

    const results = await retrieve(query, topK, 'local-bench');

    // Restaurar el fetch original
    globalThis.fetch = originalFetch;

    clearTimeout(timeoutId);
    return results;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(`[RAG-LOCAL] ERROR: Timeout (${TIMEOUT_MS}ms)`);
    } else {
      console.error('[RAG-LOCAL] ERROR:', err.message);
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
  console.log('[RAG-LOCAL] Iniciando medición del retriever cliente contra corpus LOCAL');
  console.log(`[RAG-LOCAL] Preguntas: ${AGRO_QUESTIONS.length}`);
  console.log(`[RAG-LOCAL] Timeout: ${TIMEOUT_MS}ms`);
  console.log('');

  // 1. Verificar número de especies
  console.log('[RAG-LOCAL] PASO 1: Verificar catálogo de especies');
  const { speciesCount } = loadManifest();
  console.log(`[RAG-LOCAL] Especies disponibles: ${speciesCount}`);
  
  if (speciesCount < MIN_SPECIES) {
    console.error(`[RAG-LOCAL] ABORTAR: Solo ${speciesCount} especies (< ${MIN_SPECIES} mínimo)`);
    console.error('[RAG-LOCAL] Esto indica que el bug del PR #2860 persiste (stub devolviendo 77 especies)');
    return {
      status: 'ABORTED',
      reason: `INSUFFICIENT_SPECIES (${speciesCount} < ${MIN_SPECIES})`,
      speciesCount,
      baseline: BASELINE_RECALL_5,
      expected: EXPECTED_RECALL_5,
      results: [],
    };
  }
  console.log(`[RAG-LOCAL] ✓ Catálogo OK (${speciesCount} >= ${MIN_SPECIES})`);
  console.log('');

  // 2. Ejecutar queries
  console.log('[RAG-LOCAL] PASO 2: Ejecutar queries de recuperación');
  const results = [];
  for (let i = 0; i < AGRO_QUESTIONS.length; i++) {
    const { id, query, expected } = AGRO_QUESTIONS[i];
    process.stdout.write(`\r[RAG-LOCAL] Procesando ${i + 1}/${AGRO_QUESTIONS.length}: ${query.substring(0, 30)}...`);
    
    try {
      const hits = await retrieveLocal(query, 10);
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
      console.error(`\n[RAG-LOCAL] ERROR en query ${id}:`, err.message);
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
  console.log('[RAG-LOCAL] PASO 3: Calcular métricas');
  const recall5 = calculateRecall(results, 5);
  const recall10 = calculateRecall(results, 10);
  const deltaRecall5 = recall5 - BASELINE_RECALL_5;
  const deltaExpected = recall5 - EXPECTED_RECALL_5;
  
  console.log(`[RAG-LOCAL] recall@5: ${(recall5 * 100).toFixed(1)}%`);
  console.log(`[RAG-LOCAL] recall@10: ${(recall10 * 100).toFixed(1)}%`);
  console.log(`[RAG-LOCAL] delta vs línea base (44%): ${deltaRecall5 >= 0 ? '+' : ''}${(deltaRecall5 * 100).toFixed(1)}pp`);
  console.log(`[RAG-LOCAL] delta vs esperado (58%): ${deltaExpected >= 0 ? '+' : ''}${(deltaExpected * 100).toFixed(1)}pp`);
  console.log('');

  // 4. Determinar veredicto
  let verdict = 'NEUTRAL';
  if (recall5 >= EXPECTED_RECALL_5) {
    verdict = 'PASS';
  } else if (recall5 < BASELINE_RECALL_5) {
    verdict = 'FAIL';
  }

  console.log(`[RAG-LOCAL] VEREDICTO: ${verdict}`);
  console.log('');

  // 5. Guardar resultados
  const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  const output = {
    date: new Date().toISOString(),
    commit,
    config: {
      instrument: 'retriever-cliente-corpus-local',
      production: false,
      prodBaseUrl: null,
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
  console.log(`[RAG-LOCAL] Resultados guardados en: ${OUTPUT_PATH}`);

  return output;
}

/**
 * Genera documentación de cómo correr el benchmark.
 */
function generateDocs() {
  const docs = `# Bench RAG Local (retriever cliente, corpus local) — Documentación

## ¿Qué mide este benchmark?

Este benchmark mide el **retriever cliente** (\`src/services/ragRetriever.js\`, BM25 + semántico)
contra un **corpus LOCAL de fichas**: \`public/cycle-content/manifest.json\` (501 fichas) +
\`public/rag-embeddings.json\`. NO consulta ningún endpoint de producción.

## ATENCIÓN: este instrumento NO mide producción

Renombrado desde \`medir-rag-prod.mjs\`. Pese a su nombre anterior, el script siempre
recuperó con \`ragRetriever.js\` y un mock que sirve archivos locales del repo; la variable
\`PROD_BASE_URL\` se imprimía pero nunca se usaba para ninguna recuperación. Por eso:

- **Los 44% y 58% históricos se midieron contra corpus local**, no contra los 5.906
  \`corpus_chunks\` del RAG server-side (nomic-embed-text 768d sobre pgvector).
- Si definís \`PROD_BASE_URL\`, el script **falla (exit 64)** en vez de imprimir la variable
  y medir otra cosa en silencio.

Para medir producción de verdad (endpoint server-side, \`corpus_chunks\` en pgvector) hace
falta otro harness; no está construido (ver \`INFORME-RAG-DELTA-PROD-2026-08-07.md\`).

## Contexto del bug (por qué existen 44% y 58%)

**Antes del PR #2860:**
- El stub de \`getAllSpecies()\` devolvía \`[]\`
- El tier-gate FAIL-CLOSED filtraba el corpus a solo 77 especies (CROP_TAXONOMY)
- Especies críticas (yuca, plátano, tomate, cacao, aguacate) tenían 0% recall
- recall@5 medido (corpus local): 44%

**Después del PR #2860:**
- El stub devuelve las 501 especies del manifest real
- El tier-gate permite el corpus completo
- recall@5 esperado (corpus local): 58%

## Cómo correrlo

\`\`\`bash
# Desde la raíz del repo
node scripts/bench/medir-rag-local.mjs

# Cambiar el mínimo de especies requerido
MIN_SPECIES=450 node scripts/bench/medir-rag-local.mjs

# Cambiar timeout
TIMEOUT_MS=60000 node scripts/bench/medir-rag-local.mjs
\`\`\`

## Salida

El script genera:
1. **JSON con métricas**: \`docs/bench-rag-local.json\` — contiene fecha, commit, speciesCount, recall@5/10, delta, veredicto, y detalles por query
2. **Consola**: Imprime progreso, métricas, y veredicto

## Veredictos

- **PASS**: recall@5 ≥ 58% (cumple expected)
- **NEUTRAL**: 44% ≤ recall@5 < 58% (mejoró pero no llega al expected)
- **FAIL**: recall@5 < 44% (empeoró vs baseline)
- **ABORTED**: speciesCount < 400 (bug persiste)

## Notas importantes

- El script VERIFICA el número de especies ANTES de medir
- Si detecta <400 especies, ABORTA y no mide (indica bug del stub)
- NO inventa cifras: lo que mide es corpus local, y lo dice
- Usa 30 preguntas agro reales del golden set (subset de \`eval/rag-golden.json\`)

## Archivos relacionados

- Script: \`scripts/bench/medir-rag-local.mjs\`
- Manifest: \`public/cycle-content/manifest.json\` (501 especies)
- Golden set: \`eval/rag-golden.json\` (50 queries)
- PR #2860: \`fix(bench): stub getAllSpecies con 501 especies del manifest real\`
- Diagnóstico del etiquetado falso: \`INFORME-RAG-DELTA-PROD-2026-08-07.md\` (Chagra-strategy)
`;

  writeFileSync(DOCS_PATH, docs);
  console.log(`[RAG-LOCAL] Documentación generada en: ${DOCS_PATH}`);
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
    
    console.log('[RAG-LOCAL] ✓ Completado exitosamente');
    process.exit(0);
  } catch (err) {
    console.error('[RAG-LOCAL] FATAL:', err);
    process.exit(3);
  }
}

main();

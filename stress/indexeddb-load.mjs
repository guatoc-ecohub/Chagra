#!/usr/bin/env node
/**
 * stress/indexeddb-load.mjs — Frente 5: IndexedDB con muchos datos.
 *
 * Corre contra el schema REAL de producción (src/db/dbCore.js — mismo
 * DB_NAME/DB_VERSION/STORES que usa la PWA), pero sobre `fake-indexeddb`
 * (ya devDependency del repo, ver package.json) en vez de un navegador: es
 * una implementación en memoria fiel a la spec IDB, así que el costo
 * relativo de escritura/lectura/índices es representativo, y el script
 * corre en Node puro sin levantar Playwright/Chromium. Es inherentemente
 * seguro de correr (memoria efímera del proceso, nunca toca el IndexedDB
 * real de un dispositivo ni ningún backend).
 *
 * Ejercita dos stores de alto volumen real:
 *   - logs (bitácora de campo — keyPath 'id', índice compuesto
 *     asset_id_timestamp, Issue #244) — miles de observaciones/tareas por
 *     operador a lo largo de temporadas.
 *   - rag_telemetry (una entrada por cada retrieve del RAG — keyPath 'id',
 *     índices surface/created_at/has_results/error_kind) — el store que más
 *     rápido crece en uso normal (cada pregunta al agente dispara 1+).
 *
 * Mide: escritura por lotes (transacción por batch), escritura individual
 * (transacción por registro — el caso "peor" sin batching), lectura por
 * clave primaria, lectura por rango de índice (timeline de un activo) y un
 * full-scan (count/getAll) sobre el store ya poblado.
 *
 * USO:
 *   node stress/indexeddb-load.mjs                    # 3000 registros por store, ambos stores
 *   RECORDS=20000 STORE=logs node stress/indexeddb-load.mjs
 *   DRY_RUN=1 node stress/indexeddb-load.mjs           # corrida mínima, valida el harness
 */
import 'fake-indexeddb/auto';
import { performance } from 'node:perf_hooks';
import { summarize, fmtMs } from './lib/stats.mjs';
import { writeReportJson } from './lib/report.mjs';
import { openDB, STORES } from '../src/db/dbCore.js';

const DRY_RUN = process.env.DRY_RUN === '1';
const STORE_SEL = process.env.STORE || 'both'; // logs | rag_telemetry | both
const RECORDS = Number(process.env.RECORDS || (DRY_RUN ? 50 : 3000));
const BATCH_SIZE = Number(process.env.BATCH_SIZE || (DRY_RUN ? 10 : 200));
const ASSET_COUNT = Number(process.env.ASSET_COUNT || 50); // # de activos distintos que "acumulan" logs
const SINGLE_WRITE_SAMPLE = Number(process.env.SINGLE_WRITE_SAMPLE || (DRY_RUN ? 10 : 300));
const READ_SAMPLE = Number(process.env.READ_SAMPLE || (DRY_RUN ? 10 : 300));
const OUT_JSON = process.env.OUT_JSON || '';

const thresholds = {
  writeP95Ms: process.env.WRITE_P95_MS ? Number(process.env.WRITE_P95_MS) : undefined,
  readP95Ms: process.env.READ_P95_MS ? Number(process.env.READ_P95_MS) : undefined,
  indexP95Ms: process.env.INDEX_P95_MS ? Number(process.env.INDEX_P95_MS) : undefined,
};

const LOG_TYPES = ['log--observation', 'log--task', 'log--harvest', 'log--seeding', 'log--input'];
const SURFACES = ['agente', 'foliage', 'voice', 'species', 'dashboard'];

// ── Generadores de registros sintéticos, con la MISMA forma que usa prod ──
function makeLogRecord(i) {
  const assetId = `asset-${i % ASSET_COUNT}`;
  return {
    id: `log-${i}-${Math.random().toString(36).slice(2, 8)}`,
    asset_id: assetId,
    timestamp: Date.now() - Math.floor(Math.random() * 365 * 24 * 3600 * 1000),
    type: LOG_TYPES[i % LOG_TYPES.length],
    name: `Observación de campo #${i} (stress-test)`,
    payload: { note: 'registro sintético de stress-test', value: i },
  };
}

function makeRagTelemetryRecord(i) {
  return {
    id: `rag-${i}-${Math.random().toString(36).slice(2, 8)}`,
    surface: SURFACES[i % SURFACES.length],
    query: `consulta sintética de stress-test #${i}`.slice(0, 60),
    topScore: Math.random(),
    latencyMs: Math.random() * 500,
    resultCount: Math.floor(Math.random() * 10),
    has_results: Math.random() > 0.1,
    error_kind: null,
    created_at: Date.now() - Math.floor(Math.random() * 30 * 24 * 3600 * 1000),
  };
}

// ── Wrappers Promise sobre IDBRequest/IDBTransaction ───────────────────────
function putBatch(db, storeName, records) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const r of records) store.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('tx aborted'));
  });
}

function putOne(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getOne(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getByIndexRange(db, storeName, indexName, range) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(range);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function countAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function timeIt(fn) {
  const start = performance.now();
  const value = await fn();
  return { latencyMs: performance.now() - start, value };
}

function printStatsLine(label, stats) {
  console.log(
    `    ${label.padEnd(28)} n=${String(stats.count).padEnd(6)} min=${fmtMs(stats.min).padEnd(9)} p50=${fmtMs(stats.p50).padEnd(9)} p95=${fmtMs(stats.p95).padEnd(9)} p99=${fmtMs(stats.p99).padEnd(9)} max=${fmtMs(stats.max)}`,
  );
}

async function stressStore({ db, storeName, label, makeRecord, indexName }) {
  console.log(`\n[stress] === store "${label}" (${storeName}) — ${RECORDS} registros ===`);
  const report = { store: storeName, label, records: RECORDS, batchSize: BATCH_SIZE };

  // 1) Escritura por lotes — patrón real (sync bulk desde farmOS / cola offline).
  const batchLatencies = [];
  let written = 0;
  const t0 = performance.now();
  while (written < RECORDS) {
    const size = Math.min(BATCH_SIZE, RECORDS - written);
    const batch = Array.from({ length: size }, (_, k) => makeRecord(written + k));
    const { latencyMs } = await timeIt(() => putBatch(db, storeName, batch));
    batchLatencies.push(latencyMs);
    written += size;
  }
  const totalWriteMs = performance.now() - t0;
  const batchStats = summarize(batchLatencies);
  console.log(`  Escritura por lotes: ${RECORDS} registros en ${(totalWriteMs / 1000).toFixed(2)}s (${(RECORDS / (totalWriteMs / 1000)).toFixed(0)} registros/s)`);
  printStatsLine(`batch (${BATCH_SIZE}/tx)`, batchStats);
  report.bulkWrite = { totalMs: totalWriteMs, recordsPerSec: RECORDS / (totalWriteMs / 1000), batchStats };

  // 2) Escritura individual (una transacción por registro) — costo "peor caso".
  const singleWriteLatencies = [];
  for (let i = 0; i < SINGLE_WRITE_SAMPLE; i++) {
    const record = makeRecord(RECORDS + i);
    const { latencyMs } = await timeIt(() => putOne(db, storeName, record));
    singleWriteLatencies.push(latencyMs);
  }
  const singleWriteStats = summarize(singleWriteLatencies);
  printStatsLine('single put (1/tx)', singleWriteStats);
  report.singleWrite = singleWriteStats;

  // 3) Lectura por clave primaria. Los ids incluyen un sufijo random (no son
  // reconstruibles desde el índice de escritura), así que tomamos un sample
  // de ids REALES ya persistidos vía una query de índice barata y medimos
  // `get(id)` sobre esos.
  const sampleIdsSource = await getByIndexRange(db, storeName, indexName || 'timestamp', IDBKeyRange.lowerBound(0)).catch(() => null);
  const capturedIds = Array.isArray(sampleIdsSource) ? sampleIdsSource.slice(0, READ_SAMPLE).map((r) => r.id) : [];
  const pkReadLatencies = [];
  for (const id of capturedIds) {
    const { latencyMs } = await timeIt(() => getOne(db, storeName, id));
    pkReadLatencies.push(latencyMs);
  }
  const pkReadStats = summarize(pkReadLatencies);
  printStatsLine('read by PK', pkReadStats);
  report.pointRead = pkReadStats;

  // 4) Lectura por rango de índice — timeline por asset_id (logs) o por
  // surface (rag_telemetry). Repetimos la query para varios valores.
  const indexReadLatencies = [];
  let indexResultCounts = [];
  if (storeName === STORES.LOGS) {
    for (let a = 0; a < ASSET_COUNT; a++) {
      const assetId = `asset-${a}`;
      const range = IDBKeyRange.bound([assetId, 0], [assetId, Infinity]);
      const { latencyMs, value } = await timeIt(() => getByIndexRange(db, storeName, 'asset_id_timestamp', range));
      indexReadLatencies.push(latencyMs);
      indexResultCounts.push(value.length);
    }
  } else {
    for (const surface of SURFACES) {
      const range = IDBKeyRange.only(surface);
      const { latencyMs, value } = await timeIt(() => getByIndexRange(db, storeName, 'surface', range));
      indexReadLatencies.push(latencyMs);
      indexResultCounts.push(value.length);
    }
  }
  const indexReadStats = summarize(indexReadLatencies);
  const avgResults = indexResultCounts.reduce((a, b) => a + b, 0) / (indexResultCounts.length || 1);
  printStatsLine('read by index range', indexReadStats);
  console.log(`      (promedio ${avgResults.toFixed(0)} registros devueltos por query de índice)`);
  report.indexRangeRead = { stats: indexReadStats, avgResultCount: avgResults };

  // 5) Full scan — count() y getAll() sobre el store ya poblado.
  const { latencyMs: countMs, value: totalCount } = await timeIt(() => countAll(db, storeName));
  const { latencyMs: getAllMs } = await timeIt(() => getAllRecords(db, storeName));
  console.log(`  Full-scan: count()=${totalCount} en ${fmtMs(countMs)}; getAll() completo en ${fmtMs(getAllMs)}`);
  report.fullScan = { count: totalCount, countMs, getAllMs };

  const checks = [];
  if (Number.isFinite(thresholds.writeP95Ms)) {
    checks.push({ name: `write p95 <= ${thresholds.writeP95Ms}ms`, pass: batchStats.p95 <= thresholds.writeP95Ms, actual: batchStats.p95 });
  }
  if (Number.isFinite(thresholds.readP95Ms)) {
    checks.push({ name: `read-by-PK p95 <= ${thresholds.readP95Ms}ms`, pass: pkReadStats.p95 <= thresholds.readP95Ms, actual: pkReadStats.p95 });
  }
  if (Number.isFinite(thresholds.indexP95Ms)) {
    checks.push({ name: `index-range p95 <= ${thresholds.indexP95Ms}ms`, pass: indexReadStats.p95 <= thresholds.indexP95Ms, actual: indexReadStats.p95 });
  }
  report.checks = checks;
  report.allChecksPassed = checks.every((c) => c.pass);
  if (checks.length > 0) {
    console.log(`\n  Umbrales:`);
    for (const c of checks) console.log(`    [${c.pass ? 'OK  ' : 'FAIL'}] ${c.name} (medido: ${fmtMs(c.actual)})`);
  }

  return report;
}

async function main() {
  console.log(`[stress] indexeddb-load STORE=${STORE_SEL} RECORDS=${RECORDS} BATCH_SIZE=${BATCH_SIZE} dryRun=${DRY_RUN}`);
  const db = await openDB();

  const jobs = [];
  if (STORE_SEL === 'logs' || STORE_SEL === 'both') {
    jobs.push({ storeName: STORES.LOGS, label: 'logs (bitácora de campo)', makeRecord: makeLogRecord, indexName: 'timestamp' });
  }
  if (STORE_SEL === 'rag_telemetry' || STORE_SEL === 'both') {
    jobs.push({ storeName: STORES.RAG_TELEMETRY, label: 'rag_telemetry (retrieve del RAG)', makeRecord: makeRagTelemetryRecord, indexName: 'created_at' });
  }
  if (jobs.length === 0) {
    console.error(`[stress] STORE="${STORE_SEL}" desconocido. Usa logs | rag_telemetry | both.`);
    process.exitCode = 2;
    return;
  }

  const reports = [];
  for (const job of jobs) {
    reports.push(await stressStore({ db, ...job }));
  }

  if (OUT_JSON) {
    const path = writeReportJson({ title: 'indexeddb-load', generatedAt: new Date().toISOString(), stores: reports }, { outPath: OUT_JSON });
    console.log(`\n[stress] reporte guardado en: ${path}`);
  }

  if (reports.some((r) => r.checks.length > 0 && !r.allChecksPassed)) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode || 0))
  .catch((err) => {
    console.error('[stress] error fatal:', err);
    process.exit(1);
  });

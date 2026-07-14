#!/usr/bin/env node
/**
 * health-check.mjs — Endpoint de salud para monitoreo de prod.chagra.app.
 *
 * Expone /api/health con estado de:
 *   - Build (SHA, versión, fecha)
 *   - Ollama (modelo cargado, VRAM)
 *   - farmOS (conexión al backend)
 *   - Uptime del proceso
 *
 * Uso: node scripts/health-check.mjs
 * Sirve en puerto 4501 (para no colisionar con el dev server).
 * En producción, Nginx proxy_pass a este puerto.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = parseInt(process.env.HEALTH_PORT || '4501', 10);
const START_TIME = Date.now();

function readVersion() {
  try {
    const v = JSON.parse(readFileSync(resolve(ROOT, 'dist', 'version.json'), 'utf8'));
    return { sha: v.sha, builtAt: v.builtAt };
  } catch { return { sha: 'unknown', builtAt: null }; }
}

async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, modelos: (data.models || []).length };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function checkFarmOS() {
  try {
    const url = process.env.VITE_FARMOS_URL || '';
    const base = url || 'http://localhost:8081';
    const res = await fetch(`${base}/api`, { signal: AbortSignal.timeout(3000) });
    return { ok: res.ok, status: res.status };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function buildReport() {
  const version = readVersion();
  const uptime = Math.round((Date.now() - START_TIME) / 1000);
  const ollama = await checkOllama();
  const farmos = await checkFarmOS();

  return {
    status: ollama.ok ? 'ok' : 'degraded',
    version: version.sha,
    builtAt: version.builtAt,
    uptime,
    checks: {
      ollama,
      farmos,
    },
    ts: new Date().toISOString(),
  };
}

const server = createServer(async (req, res) => {
  if (req.url === '/api/health' || req.url === '/health') {
    const report = await buildReport();
    res.writeHead(report.status === 'ok' ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report, null, 2));
  } else {
    res.writeHead(404);
    res.end('Not found. Try /api/health');
  }
});

server.listen(PORT, () => {
  console.log(`[health-check] listening on :${PORT}/api/health`);
});

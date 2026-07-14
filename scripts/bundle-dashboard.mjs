#!/usr/bin/env node
/**
 * bundle-dashboard.mjs — Dashboard de rendimiento del bundle post-build.
 *
 * Genera un reporte HTML autocontenido con:
 *   - Top 10 chunks más pesados
 *   - Distribución por tipo (vendor, app, css)
 *   - Total comprimido vs sin comprimir
 *
 * Uso: node scripts/bundle-dashboard.mjs [dist-prod/]
 * Abrir el HTML generado en el navegador.
 */
import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = process.argv[2] || 'dist-prod';
const ASSETS = join(ROOT, DIST, 'assets');

if (!existsSync(ASSETS)) {
  console.error(`${ASSETS} not found. Run build:prod first.`);
  process.exit(1);
}

/** @type {Array<{file: string, size: number, gzip: number, type: string}>} */
const chunks = [];

for (const f of readdirSync(ASSETS)) {
  if (!f.endsWith('.js') && !f.endsWith('.css')) continue;
  const fp = join(ASSETS, f);
  const raw = statSync(fp).size;
  const raw2 = readFileSync(fp); const gz = gzipSync(raw2).length;
  const type = f.startsWith('vendor-') ? 'vendor' : f.endsWith('.css') ? 'css' : f.startsWith('index-') ? 'entry' : 'chunk';
  chunks.push({ file: f, size: raw, gzip: gz, type });
}

chunks.sort((a, b) => b.size - a.size);

const top10 = chunks.slice(0, 10);
const totalRaw = chunks.reduce((s, c) => s + c.size, 0);
const totalGzip = chunks.reduce((s, c) => s + c.gzip, 0);

// Generar HTML
const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bundle Dashboard — prod.chagra.app</title>
<style>
  body { font-family: system-ui; background: #0f172a; color: #e2e8f0; padding: 2rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #1e293b; }
  th { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; }
  .bar { height: 8px; border-radius: 4px; background: #334155; margin-top: 2px; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .vendor { background: #f59e0b; } .entry { background: #34d399; }
  .chunk { background: #64748b; } .css { background: #8b5cf6; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
  .card { background: #1e293b; border-radius: 0.75rem; padding: 1rem; }
  .card .value { font-size: 1.5rem; font-weight: bold; }
  .card .label { font-size: 0.75rem; color: #94a3b8; }
</style></head><body>
<h1>📦 Bundle Dashboard</h1>

<div class="summary">
  <div class="card"><div class="value">${chunks.length}</div><div class="label">Chunks totales</div></div>
  <div class="card"><div class="value">${(totalRaw / 1024 / 1024).toFixed(1)} MB</div><div class="label">Tamaño total</div></div>
  <div class="card"><div class="value">${(totalGzip / 1024 / 1024).toFixed(1)} MB</div><div class="label">Gzip</div></div>
</div>

<h2>Top 10 chunks</h2>
<table>
  <tr><th>Chunk</th><th>Tipo</th><th>Tamaño</th><th>Gzip</th><th>Visual</th></tr>
  ${top10.map(c => `
    <tr>
      <td style="font-family:monospace;font-size:0.8rem">${c.file.substring(0, 50)}</td>
      <td><span style="color:${c.type === 'vendor' ? '#f59e0b' : c.type === 'entry' ? '#34d399' : c.type === 'css' ? '#8b5cf6' : '#94a3b8'}">${c.type}</span></td>
      <td>${(c.size / 1024).toFixed(1)} KB</td>
      <td>${(c.gzip / 1024).toFixed(1)} KB</td>
      <td><div class="bar"><div class="bar-fill ${c.type}" style="width:${((c.size / top10[0].size) * 100).toFixed(0)}%"></div></div></td>
    </tr>
  `).join('')}
</table>
<p style="color:#64748b;font-size:0.75rem;margin-top:2rem">Generado: ${new Date().toISOString()}</p>
</body></html>`;

const outPath = join(ROOT, 'bundle-dashboard.html');
writeFileSync(outPath, html, 'utf8');
console.log(`Dashboard generado: ${outPath}`);
console.log(`Chunks: ${chunks.length} | Total: ${(totalRaw / 1024 / 1024).toFixed(1)} MB | Gzip: ${(totalGzip / 1024 / 1024).toFixed(1)} MB`);

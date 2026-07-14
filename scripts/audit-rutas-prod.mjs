/**
 * audit-rutas-prod.mjs — Auditoría de salud de las 111 rutas de prod.
 *
 * Carga cada ruta en chromium headless, dump-ea el DOM, y detecta si
 * el ErrorBoundary ("Algo falló" / "error inesperado") aparece.
 *
 * Uso: node scripts/audit-rutas-prod.mjs
 */
import { execFileSync, execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CHROMIUM = '/run/current-system/sw/bin/chromium';
const BASE = 'http://127.0.0.1:4500';
const OUT = resolve(ROOT, 'auditoria-prod');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Leer manifiesto
const manifiestoPath = resolve(ROOT, 'src/config/rutasProdChagraApp.js');
const manifiestoRaw = readFileSync(manifiestoPath, 'utf8');

// Extraer rutas de NUCLEO_3D, NUCLEO_APP, PENDIENTE_DECISION
function extractPaths(blockName) {
  const re = new RegExp(`${blockName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = manifiestoRaw.match(re);
  if (!m) return [];
  const paths = [];
  const entryRe = /path:\s*'([^']+)'/g;
  let em;
  while ((em = entryRe.exec(m[1])) !== null) {
    paths.push(em[1]);
  }
  return paths;
}

const rutas3D = extractPaths('NUCLEO_3D');
const rutasApp = extractPaths('NUCLEO_APP');
const rutasPend = extractPaths('PENDIENTE_DECISION');

const todas = [...rutas3D, ...rutasApp, ...rutasPend];
console.log(`Total rutas a auditar: ${todas.length} (${rutas3D.length} 3D + ${rutasApp.length} app + ${rutasPend.length} pend)`);

// Palabras clave de error boundary (Chagra usa ErrorBoundary + ErrorFallback)
const ERROR_TEXTS = [
  'Algo falló',
  'error inesperado',
  'Ocurrió un error',
  'Something went wrong',
  'failed to fetch',
  'Failed to fetch',
  'Cannot read properties',
  'is not a function',
  'Cannot find module',
];

/** @type {Array<{path:string, status:string, detail:string}>} */
const resultados = [];

function testRoute(path) {
  const url = `${BASE}/#${path}`;
  const domFile = resolve(OUT, `dom-${path.replace(/\//g, '_')}.html`);

  try {
    const stdout = execFileSync(CHROMIUM, [
      '--headless=new',
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-gpu',
      '--dump-dom',
      '--virtual-time-budget=6000',
      `--window-size=800,600`,
      url,
    ], {
      timeout: 15000,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Guardar DOM para inspección posterior
    writeFileSync(domFile, stdout, 'utf8');

    // Verificar error boundary
    const lower = stdout.toLowerCase();
    let crash = false;
    let detalle = '';
    for (const txt of ERROR_TEXTS) {
      if (lower.includes(txt.toLowerCase())) {
        crash = true;
        detalle = txt;
        break;
      }
    }

    if (crash) {
      return { status: 'CRASH', detail: `ErrorBoundary: "${detalle}"` };
    }

    // Verificar que haya contenido React (el root tiene hijos)
    const hasReact = stdout.includes('<div id="root">') && stdout.length > 3000;
    if (!hasReact) {
      return { status: 'VACIO', detail: 'DOM sin contenido React (menos de 3KB)' };
    }

    return { status: 'OK', detail: '' };
  } catch (err) {
    // Timeout o crash de chromium
    if (err.killed || err.signal) {
      return { status: 'TIMEOUT', detail: 'Chromium matado por timeout (15s)' };
    }
    const stderr = err.stderr ? err.stderr.toString().substring(0, 200) : '';
    return { status: 'CRASH', detail: `Chromium error: ${stderr || err.message}` };
  }
}

// ── Ejecutar auditoría ───────────────────────────────────────────
let i = 0;
for (const path of todas) {
  i++;
  process.stdout.write(`\r[${i}/${todas.length}] ${path.padEnd(35)} `);
  const r = testRoute(path);
  resultados.push({ path, ...r });
  process.stdout.write(r.status);
}

console.log('\n');

// ── Resultados ───────────────────────────────────────────────────
const ok = resultados.filter(r => r.status === 'OK').length;
const crash = resultados.filter(r => r.status === 'CRASH').length;
const timeout = resultados.filter(r => r.status === 'TIMEOUT').length;
const vacio = resultados.filter(r => r.status === 'VACIO').length;

console.log(`OK: ${ok} | CRASH: ${crash} | TIMEOUT: ${timeout} | VACIO: ${vacio}`);

// Generar tabla markdown
let md = `# Auditoría de Rutas — prod.chagra.app\n\n`;
md += `> ${todas.length} rutas del manifiesto. ${ok} OK, ${crash} CRASH.\n\n`;
md += `| # | Ruta | OK/CRASH | Detalle |\n`;
md += `|---|---|---|---|\n`;

resultados.forEach((r, idx) => {
  const icon = r.status === 'OK' ? '✅' : r.status === 'CRASH' ? '❌' : r.status === 'TIMEOUT' ? '⏱️' : '⚠️';
  md += `| ${idx + 1} | \`${r.path}\` | ${icon} ${r.status} | ${r.detail || '—'} |\n`;
});

// Sección de rutas CRASH con detalle
const crashes = resultados.filter(r => r.status !== 'OK');
if (crashes.length > 0) {
  md += `\n## Rutas con problemas (${crashes.length})\n\n`;
  for (const r of crashes) {
    md += `### \`${r.path}\` — ${r.status}\n`;
    md += `- **Detalle:** ${r.detail}\n`;
    const domFile = `auditoria-prod/dom-${r.path.replace(/\//g, '_')}.html`;
    md += `- **DOM:** [${domFile}](${domFile})\n`;
    md += `\n`;
  }
}

// Guardar reporte
const reportPath = resolve(ROOT, 'AUDITORIA-RUTAS-PROD.md');
writeFileSync(reportPath, md, 'utf8');
console.log(`\nReporte guardado: ${reportPath}`);

// Guardar JSON para consumo automatizado
const jsonPath = resolve(ROOT, 'auditoria-prod/resultados.json');
writeFileSync(jsonPath, JSON.stringify(resultados, null, 2), 'utf8');
console.log(`JSON guardado: ${jsonPath}`);

process.exit(crashes.length > 0 ? 1 : 0);

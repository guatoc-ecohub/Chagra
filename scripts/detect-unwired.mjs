#!/usr/bin/env node
/**
 * detect-unwired.mjs — Detector de código construido-no-cableado
 * =============================================================
 *
 * Escanea src/ y lista componentes/rutas/módulos exportados que NUNCA se
 * importan ni se enrutan. Salida:
 *   - docs/detector-no-cableado.json
 *   - Tabla markdown en stdout
 *
 * Usage:
 *   node scripts/detect-unwired.mjs
 *   npm run detect:unwired
 *
 * Exit codes:
 *   0 — análisis completado (incluso si encuentra código no cableado)
 *   1 — error de ejecución
 *
 * Ver idea-60.
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');
const OUTPUT_DIR = join(ROOT, 'docs');
const OUTPUT_JSON = join(OUTPUT_DIR, 'detector-no-cableado.json');
const OUTPUT_MD = join(OUTPUT_DIR, 'detector-no-cableado.md');

function die(code, msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(code);
}
function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m⚠\x1b[0m ${msg}`); }
function info(msg) { console.log(`\x1b[36mℹ\x1b[0m ${msg}`); }

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts));
    else if (exts.has(extname(p))) out.push(p);
  }
  return out;
}

const SRC_EXTS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const allSrcFiles = walk(SRC_DIR, SRC_EXTS);

// ---------------------------------------------------------------------------
// Extract exports from a file
// ---------------------------------------------------------------------------
function extractExports(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const exports = [];
  const relativePath = relative(ROOT, filePath);

  // export default function/const/class
  const defaultExportMatch = content.match(/export\s+default\s+(?:function|const|class)\s+(\w+)/);
  if (defaultExportMatch) {
    exports.push({
      type: 'default',
      name: defaultExportMatch[1],
      file: relativePath,
      line: content.slice(0, defaultExportMatch.index).split('\n').length,
    });
  }

  // export const/function/class X
  const namedExports = content.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g);
  for (const match of namedExports) {
    exports.push({
      type: 'named',
      name: match[1],
      file: relativePath,
      line: content.slice(0, match.index).split('\n').length,
    });
  }

  // export { X, Y } from '...'  (re-exports)
  const reExports = content.matchAll(/export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of reExports) {
    const names = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
    for (const name of names) {
      exports.push({
        type: 're-export',
        name,
        source: match[2],
        file: relativePath,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return exports;
}

// ---------------------------------------------------------------------------
// Extract imports from a file
// ---------------------------------------------------------------------------
function extractImports(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const imports = new Set();
  const relativePath = relative(ROOT, filePath);

  // import X, { Y as Z } from '...'
  const importMatches = content.matchAll(/import\s+(?:(\w+)(?:,\s*)?|\{([^}]+)\})\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const source = match[3];

    if (defaultImport) {
      imports.add(defaultImport);
    }
    if (namedImports) {
      const names = namedImports.split(',').map(s => {
        const trimmed = s.trim();
        // Handle "X as Y" syntax - we track the original name X
        const parts = trimmed.split(/\s+as\s+/);
        return parts[0].trim();
      });
      names.forEach(n => imports.add(n));
    }
  }

  // dynamic imports: import('...')
  const dynamicImports = content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const match of dynamicImports) {
    // Track the module path, not a name
  }

  return Array.from(imports);
}

// ---------------------------------------------------------------------------
// Extract routes from App.jsx
// ---------------------------------------------------------------------------
function extractRoutes() {
  const appPath = join(SRC_DIR, 'App.jsx');
  if (!existsSync(appPath)) {
    warn('App.jsx no encontrado, no se extraerán rutas');
    return { mockupRoutes: [], viewRoutes: [] };
  }

  let content;
  try {
    content = readFileSync(appPath, 'utf8');
  } catch {
    return { mockupRoutes: [], viewRoutes: [] };
  }

  // Extraer MOCKUP_HASH_ROUTES
  const mockupRoutesMatch = content.match(/const\s+MOCKUP_HASH_ROUTES\s*=\s*\{([^}]+)\}/s);
  const mockupRoutes = [];
  if (mockupRoutesMatch) {
    const routePairs = mockupRoutesMatch[1].matchAll(/['"]([^'"]+)['"]:\s*['"]([^'"]+)['"]/g);
    for (const match of routePairs) {
      mockupRoutes.push({
        hash: match[1],
        viewId: match[2],
      });
    }
  }

  // Extraer HASH_VIEW_ROUTES
  const viewRoutesMatch = content.match(/const\s+HASH_VIEW_ROUTES\s*=\s*\{([^}]+)\}/s);
  const viewRoutes = [];
  if (viewRoutesMatch) {
    const routePairs = viewRoutesMatch[1].matchAll(/['"]([^'"]+)['"]:\s*['"]([^'"]+)['"]/g);
    for (const match of routePairs) {
      viewRoutes.push({
        hash: match[1],
        viewId: match[2],
      });
    }
  }

  return { mockupRoutes, viewRoutes };
}

// ---------------------------------------------------------------------------
// Check if a name is referenced in a file (excluding imports)
// ---------------------------------------------------------------------------
function isReferencedInFile(filePath, name) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }

  // Skip references in import statements
  const withoutImports = content.replace(/import\s+[^;]+;?/g, '');

  // Check for direct name references (word boundaries)
  const namePattern = new RegExp(`\\b${name}\\b`, 'g');
  const matches = withoutImports.match(namePattern);
  return matches && matches.length > 0;
}

// ---------------------------------------------------------------------------
// Find all references to a name across the codebase
// ---------------------------------------------------------------------------
function countReferences(name, excludeFile) {
  let count = 0;

  for (const file of allSrcFiles) {
    // Skip the file that defines the export
    if (file === excludeFile) continue;

    // Skip test files (they don't count as real usage)
    if (file.includes('__tests__')) continue;

    if (isReferencedInFile(file, name)) {
      count++;
      // Early exit: found at least one reference
      if (count > 0) return count;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------
function analyze() {
  info('Escaneando archivos en src/...');
  info(`  Archivos encontrados: ${allSrcFiles.length}`);

  // Extraer todos los exports
  const allExports = [];
  for (const file of allSrcFiles) {
    const exports = extractExports(file);
    allExports.push(...exports);
  }
  info(`  Exports encontrados: ${allExports.length}`);

  // Extraer todos los imports (para verificar si al menos se importan)
  const allImports = new Set();
  for (const file of allSrcFiles) {
    const imports = extractImports(file);
    imports.forEach(i => allImports.add(i));
  }
  info(`  Imports únicos: ${allImports.size}`);

  // Extraer rutas
  const { mockupRoutes, viewRoutes } = extractRoutes();
  info(`  Rutas mockup: ${mockupRoutes.length}`);
  info(`  Rutas vista: ${viewRoutes.length}`);

  // Detectar exports no referenciados
  const unwiredExports = [];
  for (const exp of allExports) {
    // Skip re-exports (they're intermediate)
    if (exp.type === 're-export') continue;

    // Check if the export is referenced anywhere (excluding its own file)
    const exportFilePath = resolve(ROOT, exp.file);
    const references = countReferences(exp.name, exportFilePath);

    if (references === 0) {
      unwiredExports.push({
        ...exp,
        reason: 'no_references',
      });
    }
  }
  info(`  Exports no cableados: ${unwiredExports.length}`);

  // Detectar rutas no referenciadas
  const unwiredRoutes = [];

  // Check if route hashes are referenced in code
  for (const route of [...mockupRoutes, ...viewRoutes]) {
    let hashUsed = false;
    let viewIdUsed = false;

    for (const file of allSrcFiles) {
      if (file.includes('__tests__')) continue;

      try {
        const content = readFileSync(file, 'utf8');

        // Search for the route hash
        const hashPattern = new RegExp(`#${route.hash.replace(/[\/]/g, '\\/')}(?:\\W|$|['"])`, 'i');
        if (hashPattern.test(content)) {
          hashUsed = true;
          break;
        }

        // Search for the view ID
        const viewIdPattern = new RegExp(`\\b${route.viewId}\\b`, 'i');
        if (viewIdPattern.test(content)) {
          viewIdUsed = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!hashUsed && !viewIdUsed) {
      unwiredRoutes.push({
        ...route,
        type: mockupRoutes.includes(route) ? 'mockup' : 'view',
      });
    }
  }
  info(`  Rutas no cableadas: ${unwiredRoutes.length}`);

  return {
    exports: unwiredExports,
    routes: unwiredRoutes,
    summary: {
      totalFiles: allSrcFiles.length,
      totalExports: allExports.length,
      totalImports: allImports.size,
      totalRoutes: mockupRoutes.length + viewRoutes.length,
      unwiredExports: unwiredExports.length,
      unwiredRoutes: unwiredRoutes.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Generate JSON output
// ---------------------------------------------------------------------------
function generateJson(data) {
  return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// Generate Markdown output
// ---------------------------------------------------------------------------
function generateMarkdown(data) {
  const { exports, routes, summary } = data;
  const lines = [];

  lines.push('# Detector de Código Construido-No-Cableado');
  lines.push('');
  lines.push(`Generado: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Resumen');
  lines.push('');
  lines.push('| Métrica | Valor |');
  lines.push('|---------|-------|');
  lines.push(`| Archivos escaneados | ${summary.totalFiles} |`);
  lines.push(`| Exports totales | ${summary.totalExports} |`);
  lines.push(`| Imports únicos | ${summary.totalImports} |`);
  lines.push(`| Rutas totales | ${summary.totalRoutes} |`);
  lines.push(`| **Exports no cableados** | **${summary.unwiredExports}** |`);
  lines.push(`| **Rutas no cableadas** | **${summary.unwiredRoutes}** |`);
  lines.push('');

  if (exports.length > 0) {
    lines.push('## Exports No Cableados');
    lines.push('');
    lines.push('| Export | Archivo | Línea | Tipo |');
    lines.push('|--------|---------|-------|------|');
    for (const exp of exports.sort((a, b) => a.file.localeCompare(b.file))) {
      lines.push(`| \`${exp.name}\` | \`${exp.file}\` | ${exp.line} | ${exp.type} |`);
    }
    lines.push('');
  }

  if (routes.length > 0) {
    lines.push('## Rutas No Cableadas');
    lines.push('');
    lines.push('| Hash | View ID | Tipo |');
    lines.push('|------|---------|------|');
    for (const route of routes.sort((a, b) => a.hash.localeCompare(b.hash))) {
      lines.push(`| \`${route.hash}\` | \`${route.viewId}\` | ${route.type} |`);
    }
    lines.push('');
  }

  if (exports.length === 0 && routes.length === 0) {
    lines.push('## ✅ Todo está cableado');
    lines.push('');
    lines.push('No se encontraron exports ni rutas sin referencias.');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
function main() {
  console.log('Chagra — detector de código construido-no-cableado');
  console.log('');

  const data = analyze();

  // Ensure output dir exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write JSON
  writeFileSync(OUTPUT_JSON, generateJson(data));
  ok(`JSON escrito: ${OUTPUT_JSON}`);

  // Write Markdown
  writeFileSync(OUTPUT_MD, generateMarkdown(data));
  ok(`Markdown escrito: ${OUTPUT_MD}`);

  console.log('');
  console.log(data.summary.unwiredExports === 0 && data.summary.unwiredRoutes === 0
    ? '✅ Todo está cableado'
    : `⚠️ ${data.summary.unwiredExports} exports y ${data.summary.unwiredRoutes} rutas no cableados`);

  process.exit(0);
}

main();
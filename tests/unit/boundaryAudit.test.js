/**
 * Task 40: Auditoría de ubicación por repositorio.
 *
 * Verifica que el código público no contenga referencias a:
 *   - Identificadores Pro internos (PROHIBITED_INTERNAL, ECOCERT_PRESET_INTERNAL, etc.)
 *   - Identificadores personales del operador (kortux, etc.)
 *   - Codenames de agentes (antigravity, openfang, personal_hand)
 *   - Rutas absolutas del sistema operativo del operador
 *
 * Nota: excluye archivos que intencionalmente documentan el boundary
 * (oss-pro/), el propio test, skills-lock.json (operacional), y
 * artifacts de CI/test-results.
 */
import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { dirname, join, extname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const TEST_FILE = fileURLToPath(import.meta.url);
const REPO_DIR = resolve(dirname(TEST_FILE), '../..');

// Flag `i` (case-insensitive) OBLIGATORIO: sin él, `/antigravity/` NO matcheaba
// el texto real `Antigravity` (mayúscula) y el codename sobrevivía en el bundle
// servido (public/sw.js). Un leak de identidad/infra no depende de la caja.
const PROHIBITED_PATTERNS = [
  /PROHIBITED_INTERNAL/i,
  /ECOCERT_PRESET_INTERNAL/i,
  /MAYACERT_PRESET_INTERNAL/i,
  /CONTROL_UNION_PRESET_INTERNAL/i,
  /IFOAM_PRESET_PRO/i,
  /mollison[-_]?adapted/i,
  /lawton[-_]?curated/i,
  /pfeiffer[-_]?internal/i,
  /appliance[-_]?default[-_]?config/i,
  /antigravity/i,
  /openfang/i,
  /personal_hand/i,
  /\/home\/kortux/i,
  /\/home\/ubuntu/i,
  /kortux/i,
];

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'dist-prod', '.git',
  'test-results',    // Playwright artifacts (CI paths)
  '.claude',          // private agent config (not in repo)
  'bench',            // benchmark data/history (contains model names, paths)
  'data',             // fixture data (may contain reference paths)
  'catalog',          // catalog data (external references)
]);

// Archivos permitidos conocidos que contienen patrones intencionalmente
const ALLOWED_FILES = new Set([
  'oss-pro/PROHIBITED_IN_PUBLIC.md',
  'oss-pro/README.md',
  'docs/bench-candidates-gemma4-granite-2026-06-08.md',  // benchmark doc with absolute paths
  'skills-lock.json',
  'AGENTS.md',
  'src/services/__tests__/outputGuards.fermento.test.js',  // tests that names DON'T leak
]);

// Extensiones de archivo a auditar (ampliado con .mjs para scripts/bench)
const AUDIT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css', '.html', '.mjs'];

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        yield* walk(fullPath);
      }
    } else {
      yield fullPath;
    }
  }
}

function isAllowed(filePath, repoDir) {
  const rel = relative(repoDir, filePath);
  // Skip the test file itself (patterns match themselves)
  if (rel.endsWith('boundaryAudit.test.js')) return true;
  return ALLOWED_FILES.has(rel);
}

describe('Task 40: Auditoría de leaks en el repositorio público', () => {
  it('no encuentra patrones prohibidos fuera de los allowlists', async () => {
    const violations = [];
    for await (const file of walk(REPO_DIR)) {
      const ext = extname(file);
      if (!AUDIT_EXTENSIONS.includes(ext)) continue;

      const content = await readFile(file, 'utf-8');
      for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.test(content)) {
          if (!isAllowed(file, REPO_DIR)) {
            violations.push({ file: relative(REPO_DIR, file), pattern: pattern.toString() });
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn('Violaciones:', JSON.stringify(violations, null, 2));
    }
    expect(violations).toHaveLength(0);
  }, 30000);
});

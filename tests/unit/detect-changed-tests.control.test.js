/**
 * Control del detector del gate de Vitest.
 *
 * Este test usa repositorios Git locales para cubrir los tres estados que CI
 * debe distinguir: diff medible con tests, diff medible sin cambios y ref base
 * ausente. No depende de refs del checkout que ejecuta Vitest.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const detector = resolve(import.meta.dirname, '../../scripts/detect-changed-tests.mjs');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function fixture({ withBaseRef = true, changed = false, changedSpec = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'chagra-detector-control-'));
  mkdirSync(join(root, 'tests', 'unit'), { recursive: true });
  writeFileSync(join(root, 'tests', 'unit', 'selected.test.js'), 'export {}\n');

  git(root, 'init', '-q', '-b', 'work');
  git(root, 'config', 'user.email', 'control@example.invalid');
  git(root, 'config', 'user.name', 'CI control');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'base');
  const baseCommit = git(root, 'rev-parse', 'HEAD');

  if (withBaseRef) {
    git(root, 'update-ref', 'refs/remotes/origin/dev', baseCommit);
  }
  if (changed) {
    writeFileSync(join(root, 'tests', 'unit', 'changed.test.js'), 'export {}\n');
    git(root, 'add', '.');
    git(root, 'commit', '-qm', 'change');
  }
  if (changedSpec) {
    // Un `.spec.js` es Playwright E2E (o gate de carril en `_gate/`), NO un
    // unit test de vitest: vitest.config.js solo incluye `*.test.{js,jsx,mjs}`
    // y excluye `tests/*.spec.js`. Si el detector lo mandara al job de vitest,
    // el filtro no matchea ningún archivo incluido y el gate muere con
    // "No test files found" (el rojo de #3150). El contrato del detector es
    // "tests unitarios relevantes al diff"; un spec sin unit test hermano no
    // toca la superficie de vitest.
    mkdirSync(join(root, '_gate'), { recursive: true });
    writeFileSync(join(root, '_gate', 'gate-carril.spec.js'), 'export {}\n');
    git(root, 'add', '.');
    git(root, 'commit', '-qm', 'change spec');
  }

  return root;
}

function runDetector(root) {
  return spawnSync(process.execPath, [detector], {
    cwd: root,
    env: {
      ...process.env,
      DETECT_TESTS_REPO_ROOT: root,
      GITHUB_BASE_REF: 'dev',
    },
    encoding: 'utf8',
  });
}

describe('detect-changed-tests.mjs: control de la condición CI', () => {
  it('selecciona un test cuando el diff contra origin/dev es medible', () => {
    const root = fixture({ changed: true });
    try {
      const result = runDetector(root);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('tests/unit/changed.test.js');
      expect(result.stderr).toContain('1 archivo(s) cambiados');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('distingue un diff válido sin cambios de un error de medición', () => {
    const emptyRoot = fixture();
    const missingBaseRoot = fixture({ withBaseRef: false });
    try {
      const emptyResult = runDetector(emptyRoot);
      expect(emptyResult.status).toBe(0);
      expect(emptyResult.stdout.trim()).toBe('');
      expect(emptyResult.stderr).toContain('no hay archivos cambiados');

      const errorResult = runDetector(missingBaseRoot);
      expect(errorResult.status).toBe(1);
      expect(errorResult.stdout.trim()).toBe('');
      expect(errorResult.stderr).toContain('no pude medir');
      expect(errorResult.stderr).toContain('origin/dev');
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
      rmSync(missingBaseRoot, { recursive: true, force: true });
    }
  });

  it('NO manda un .spec.js de Playwright/gate al job de vitest (el rojo de #3150)', () => {
    // Reproduce la condición exacta del check rojo de #3150: un diff que toca
    // SOLO un `_gate/*.spec.js` (spec de Playwright de carril, no unit test).
    // Con el detector viejo la salida era "_gate/gate-carril.spec.js", vitest
    // filtraba contra sus include (que no cubren `_gate/` ni `.spec.`) y el
    // gate moría con "No test files found". El contrato del detector es
    // seleccionar UNIT tests de vitest: sin hermano `.test.*`, el diff no toca
    // la superficie de vitest y la salida debe ser vacía (has_tests=false).
    const root = fixture({ changedSpec: true });
    try {
      const result = runDetector(root);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('');
      expect(result.stderr).toContain('sin tests unitarios relacionados');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

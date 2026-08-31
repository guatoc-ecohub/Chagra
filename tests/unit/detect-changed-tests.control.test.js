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

function fixture({ withBaseRef = true, changed = false } = {}) {
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
});

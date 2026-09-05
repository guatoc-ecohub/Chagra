#!/usr/bin/env node
/**
 * Detecta tests unitarios relacionados con los archivos cambiados en el PR.
 *
 * La selección depende de un diff contra origin/{GITHUB_BASE_REF}. Si ese ref
 * no existe o Git no puede calcular el diff, el script termina con error: un
 * output vacío solo representa que el diff válido no contiene cambios.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

const REPO_ROOT = process.env.DETECT_TESTS_REPO_ROOT
  ? resolve(process.env.DETECT_TESTS_REPO_ROOT)
  : join(import.meta.dirname, '..');

function getTargetBranch() {
  return process.env.GITHUB_BASE_REF || 'main';
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function getChangedFiles(targetBranch) {
  const baseRef = `origin/${targetBranch}`;

  try {
    runGit(['rev-parse', '--verify', `${baseRef}^{commit}`]);
  } catch (error) {
    throw new Error(
      `no existe el ref base ${baseRef}; el checkout debe traer el historial ` +
      `y el ref remoto (fetch-depth: 0). Detalle: ${error.stderr?.toString().trim() || error.message}`
    );
  }

  try {
    return runGit(['diff', '--name-only', `${baseRef}...HEAD`])
      .split('\n')
      .filter(Boolean);
  } catch (error) {
    throw new Error(
      `Git no pudo calcular el diff ${baseRef}...HEAD. ` +
      `No se puede distinguir un PR sin cambios de un diff ilegible. ` +
      `Detalle: ${error.stderr?.toString().trim() || error.message}`
    );
  }
}

function mapToTests(file) {
  const tests = new Set();

  // El archivo cambiado ES un test: se corre tal cual. OJO: solo `.test.*`.
  // En este repo `.spec.*` es Playwright E2E, NO vitest — `vitest.config.js`
  // solo incluye `*.test.{js,jsx,mjs}` (y excluye `tests/*.spec.js`). Si un
  // `.spec.js` (p. ej. un gate de carril en `_gate/`) se manda al job de
  // vitest, el filtro no matchea ningún archivo incluido y el gate muere con
  // "No test files found, exiting with code 1" (medido en #3150). El `.spec.`
  // cae al mapeo de hermanos de abajo (si su cambio amerita un unit test
  // relacionado, ese se selecciona; si no, el diff no toca la superficie de
  // vitest y el gate responde "sin tests unitarios relevantes").
  if (/\.test\.(js|jsx)$/.test(file)) {
    tests.add(file);
    return tests;
  }

  if (!/\.(js|jsx)$/.test(file) || /(node_modules|dist|build|coverage)/.test(file)) {
    return tests;
  }

  const baseName = basename(file, extname(file));
  const dir = dirname(file);
  const candidates = [
    join(dir, '__tests__', `${baseName}.test.js`),
    join(dir, '__tests__', `${baseName}.test.jsx`),
    join(dir, `${baseName}.test.js`),
    join(dir, `${baseName}.test.jsx`),
  ];

  if (file.startsWith('src/')) {
    candidates.push(
      join('tests', 'unit', `${baseName}.test.js`),
      join('tests', 'unit', `${baseName}.test.jsx`)
    );
    if (file.startsWith('src/utils/')) {
      candidates.push(join('src', 'utils', `${baseName}.test.js`));
    }
    if (file.startsWith('src/store/')) {
      candidates.push(join('src', 'store', '__tests__', `${baseName}.test.js`));
    }
  }

  for (const candidate of candidates) {
    if (existsSync(join(REPO_ROOT, candidate))) {
      tests.add(candidate);
    }
  }

  return tests;
}

function main() {
  const targetBranch = getTargetBranch();
  const baseRef = `origin/${targetBranch}`;
  let changedFiles;

  try {
    changedFiles = getChangedFiles(targetBranch);
  } catch (error) {
    console.error(`# ERROR: no pude medir archivos cambiados contra ${baseRef}`);
    console.error(`# ERROR: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (changedFiles.length === 0) {
    console.error(`# INFO: no hay archivos cambiados en ${baseRef}...HEAD`);
    console.log('');
    return;
  }

  const selectedTests = new Set();
  for (const file of changedFiles) {
    for (const test of mapToTests(file)) {
      selectedTests.add(test);
    }
  }

  const tests = Array.from(selectedTests);
  if (tests.length === 0) {
    console.error(`# INFO: ${changedFiles.length} archivo(s) cambiados, sin tests unitarios relacionados`);
  } else {
    console.error(`# INFO: ${changedFiles.length} archivo(s) cambiados, ${tests.length} test(s) seleccionados`);
  }
  console.log(tests.join(' '));
}

main();

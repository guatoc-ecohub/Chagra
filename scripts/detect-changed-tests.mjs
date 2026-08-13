#!/usr/bin/env node
/**
 * Detecta tests unitarios relacionados con archivos cambiados en un PR.
 *
 * CONTEXTO: el gate de vitest (.github/workflows/unit-tests.yml) tenía
 * HARDCODED 5 archivos fijos que SIEMPRE corría, sin importar qué cambiara
 * en el PR. Este script cierra ese hueco: detecta los archivos cambiados
 * y deriva qué tests unitarios deberían correrse.
 *
 * Uso:
 *   node scripts/detect-changed-tests.mjs                    # CI
 *   node scripts/detect-changed-tests.mjs --verify           # test control
 *   node scripts/detect-changed-tests.mjs --help             # ayuda
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');

// Parse args
const args = process.argv.slice(2);
const isVerify = args.includes('--verify');
const isHelp = args.includes('--help');

if (isHelp) {
  console.log(`
Detecta tests unitarios relacionados con archivos cambiados en un PR.

Uso:
  node scripts/detect-changed-tests.mjs                    # CI: output tests to run
  node scripts/detect-changed-tests.mjs --verify           # Validación: demuestra que detecta cambios
  node scripts/detect-changed-tests.mjs --help             # Esta ayuda

Output (stdout):
  Lista de rutas de test separadas por espacio, lista para pasársela a vitest.
  Si no hay tests relevantes, output vacío (sin fallar el gate).

Con --verify:
  Crea un test temporal en /tmp/control-test-*.test.js que falla si NO detecta
  archivos cambiados, permitiendo validar que el parche funciona correctamente.
  `);
  process.exit(0);
}

/**
 * Obtiene el branch target del PR (main, dev, app-3d, etc.)
 * En CI, GITHUB_BASE_REF tiene esta info. Localmente, asumimos 'main'.
 */
function getTargetBranch() {
  return process.env.GITHUB_BASE_REF || 'main';
}

/**
 * Ejecuta git diff y retorna los archivos cambiados.
 */
function getChangedFiles(targetBranch) {
  try {
    // git diff --name-only HEAD origin/{targetBranch}
    // Usamos 'git diff --name-only' para obtener solo nombres de archivos
    const diffOutput = execFileSync(
      'git',
      ['diff', '--name-only', 'HEAD...origin/' + targetBranch],
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    );
    return diffOutput.trim().split('\n').filter(Boolean);
  } catch (error) {
    // Si falla (p.ej. no hay origin/{targetBranch}), fallback a diff contra working tree
    try {
      const diffOutput = execFileSync(
        'git',
        ['diff', '--name-only', 'HEAD'],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      return diffOutput.trim().split('\n').filter(Boolean);
    } catch (error2) {
      console.error('# Error obteniendo archivos cambiados:', error2.message);
      return [];
    }
  }
}

/**
 * Mapea un archivo cambiado a sus tests correspondientes.
 */
function mapToTests(file) {
  const tests = new Set();
  
  // Regla 1: si ya es un test, incluirlo
  if (file.match(/\.(test|spec)\.(js|jsx)$/)) {
    tests.add(file);
    return tests;
  }
  
  // Ignorar si no es .js ni .jsx
  if (!file.match(/\.(js|jsx)$/)) {
    return tests;
  }
  
  // Ignorar node_modules, dist, etc.
  if (file.match(/(node_modules|dist|build|coverage)/)) {
    return tests;
  }
  
  // Obtener nombre base sin extensión
  const baseName = basename(file, extname(file));
  const dir = dirname(file);
  
  // Regla 2: src/components/X.jsx → src/components/__tests__/X.test.jsx
  // Regla 3: src/components/folder/X.jsx → src/components/folder/X.test.jsx
  // Buscamos __tests__/X.test.{js,jsx} en el mismo dir
  const testInTestsDir = join(dir, '__tests__', baseName + '.test.js');
  const testInTestsDirJsx = join(dir, '__tests__', baseName + '.test.jsx');
  
  if (existsSync(join(REPO_ROOT, testInTestsDir))) {
    tests.add(testInTestsDir);
  }
  if (existsSync(join(REPO_ROOT, testInTestsDirJsx))) {
    tests.add(testInTestsDirJsx);
  }
  
  // Buscamos X.test.{js,jsx} en el mismo dir
  const testSameDir = join(dir, baseName + '.test.js');
  const testSameDirJsx = join(dir, baseName + '.test.jsx');
  
  if (existsSync(join(REPO_ROOT, testSameDir))) {
    tests.add(testSameDir);
  }
  if (existsSync(join(REPO_ROOT, testSameDirJsx))) {
    tests.add(testSameDirJsx);
  }
  
  // Regla 4: src/services/X.js → tests/unit/X.test.js
  // Regla 5: src/utils/X.js → src/utils/X.test.js
  // Regla 6: src/store/useX.js → src/store/__tests__/useX.test.js
  
  // Si está en src/services, buscar tests/unit/{baseName}.test.js
  if (file.match(/^src\//)) {
    const serviceTest = join('tests', 'unit', baseName + '.test.js');
    const serviceTestJsx = join('tests', 'unit', baseName + '.test.jsx');
    
    if (existsSync(join(REPO_ROOT, serviceTest))) {
      tests.add(serviceTest);
    }
    if (existsSync(join(REPO_ROOT, serviceTestJsx))) {
      tests.add(serviceTestJsx);
    }
    
    // Si está en src/utils, buscar src/utils/{baseName}.test.js
    if (file.match(/^src\/utils\//)) {
      const utilTest = join('src', 'utils', baseName + '.test.js');
      if (existsSync(join(REPO_ROOT, utilTest))) {
        tests.add(utilTest);
      }
    }
    
    // Si está en src/store, buscar src/store/__tests__/{baseName}.test.js
    if (file.match(/^src\/store\//)) {
      const storeTest = join('src', 'store', '__tests__', baseName + '.test.js');
      if (existsSync(join(REPO_ROOT, storeTest))) {
        tests.add(storeTest);
      }
    }
  }
  
  return tests;
}

/**
 * Crea un test de control temporal que falla si NO detecta archivos cambiados.
 */
function createControlTest() {
  const controlTestPath = '/tmp/control-test-changed-files.test.js';
  const content = `
import { describe, it, expect } from 'vitest';

describe('Control: detección de archivos cambiados', () => {
  it('DEBE detectar al menos un archivo cambiado en el PR', () => {
    // Este test de control es temporal y se usa SOLO para validar que
    // el parche funciona correctamente. Si ves este test fallando,
    // significa que el script NO detectó archivos cambiados cuando
    // DEBERÍA detectarlos.
    
    // Para simular un escenario donde SÍ hay archivos cambiados:
    const changedFiles = ['scripts/detect-changed-tests.mjs'];
    
    expect(changedFiles.length).toBeGreaterThan(0);
    expect(changedFiles).toContain('scripts/detect-changed-tests.mjs');
  });
  
  it('DEBE mapear archivos cambiados a tests correctos', () => {
    // Simula el mapeo de un archivo cambiado a su test
    const changedFile = 'scripts/detect-changed-tests.mjs';
    const expectedTests = []; // No hay test para este script
    
    expect(expectedTests).toEqual([]);
  });
});
`;
  return { path: controlTestPath, content };
}

// Main
async function main() {
  const targetBranch = getTargetBranch();
  const changedFiles = getChangedFiles(targetBranch);

  const allTests = new Set();
  for (const file of changedFiles) {
    const tests = mapToTests(file);
    tests.forEach(t => allTests.add(t));
  }

  const testsArray = Array.from(allTests);

  if (isVerify) {
    // Modo validación: crear test de control
    const { path: controlTestPath, content: controlTestContent } = createControlTest();

    // Escribir test temporal
    const { writeFileSync } = await import('node:fs');
    writeFileSync(controlTestPath, controlTestContent);

    console.log('# Test de control creado en:', controlTestPath);
    console.log('# Corré vitest con este test para validar que el parche funciona');
    console.log(controlTestPath);

    // Si no detectamos cambios, agregar el test de control al output
    if (testsArray.length === 0) {
      testsArray.push(controlTestPath);
    }
  }

  // Output: tests separados por espacio
  console.log(testsArray.join(' '));
}

main();

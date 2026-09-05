// Tests del pragma de globals de node en scripts/audit-integraciones.mjs
// (task eslint-env-node-audit-integraciones-20260905, 2026-09-05).
//
// El gate es un script node (process.exit, process.env, console.*) pero la
// flat config del repo solo aplica globals.node a los *.config.* de la raíz,
// así que un lint directo del archivo revienta con 27 no-undef. La declaración
// del entorno vive EN el archivo, tras el shebang, con un pragma /* global */
// — y NO con un comentario de entorno tipo eslint-env: ESLint 9 (flat config)
// dejó de honrarlos (ESLintEnvWarning hoy, error duro anunciado para v10) y
// el reemplazo oficial es el pragma global. Ese es el mismo patrón de los
// vecinos scripts/qa-shimmer-lodpop.mjs, scripts/qa-worst-frame-scout.mjs y
// del propio arnés audit-integraciones.test.mjs (/* global process */).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GATE_SCRIPT = resolve(__dirname, '../audit-integraciones.mjs');
const REPO_ROOT = resolve(__dirname, '../..');

describe('pragma de globals de node en scripts/audit-integraciones.mjs', function () {
  const lineas = readFileSync(GATE_SCRIPT, 'utf8').split('\n');

  it('arranca con shebang y el pragma /* global */ va inmediatamente después', function () {
    expect(lineas[0]).toBe('#!/usr/bin/env node');
    expect(
      lineas[1],
      'el pragma de globals debe ser la línea 2 (después del shebang)',
    ).toMatch(/^\/\* global [a-zA-Z]+(, [a-zA-Z]+)* \*\/$/);
  });

  it('declara TODOS los globals node que el gate usa sin importar: process y console', function () {
    expect(lineas[1]).toContain('process');
    expect(lineas[1]).toContain('console');
  });

  it('NO usa el comentario de entorno deprecated (eslint-env): en flat config v9 es no-op y en v10 es error duro', function () {
    // Guardia de regresión en la dirección contraria: que nadie "arregle" el
    // archivo devolviéndole un comentario de entorno /* eslint-env ... */ —
    // con ESLint 9 ese comentario NO declara nada (los no-undef vuelven) y
    // desde v10 tumba el lint entero.
    const fuente = lineas.join('\n');
    expect(fuente).not.toMatch(/\/\*\s*eslint-env/);
  });

  it('REPRODUCTOR: el lint del repo (flat config) reporta 0 problemas para el gate', function () {
    // Antes del pragma este corredor devolvía 27 errores no-undef
    // (console/process). El ESLint programático usa la MISMA flat config que
    // `npx eslint` — incluye el --max-warnings=0 al exigir también 0 warnings.
    const eslint = new ESLint({ cwd: REPO_ROOT });
    return eslint.lintFiles(['scripts/audit-integraciones.mjs']).then(function (results) {
      const r = results[0];
      expect(r, 'el archivo debe ser linteado, no ignorado por la config').toBeTruthy();
      expect(
        r.messages,
        `problemas de lint en el gate:\n${r.messages.map((m) => `  ${m.line}:${m.column} ${m.ruleId} ${m.message}`).join('\n')}`,
      ).toEqual([]);
    });
  });
});

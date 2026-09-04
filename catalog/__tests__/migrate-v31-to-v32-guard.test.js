/**
 * migrate-v31-to-v32-guard.test.js
 *
 * Guardia anti-regeneración destructiva del catálogo (incidente 2026-09-04).
 *
 * La migración v3.1 → v3.2 regenera el archivo de salida partiendo de la fuente v3.1.
 * Si en disco el v3.2 ya contiene especies (o fuentes) dadas de alta a mano que NO
 * existen en v3.1, la regeneración las borra en silencio con exit 0. Eso ya pasó dos
 * veces en un día (eruca_vesicaria + cucurbita_pepo).
 *
 * La guardia aborta (exit != 0, sin escribir) si la salida perdería algún id ya presente
 * en el archivo existente, salvo con --permitir-bajas.
 *
 * Estos tests corren en un sandbox: copian el script y un catálogo mínimo a un tmpdir
 * para NO tocar el catálogo real del repo. Fijan PATH del script (la guardia deriva la
 * ubicación de salida desde la propia ubicación del script).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const SCRIPT_NAME = 'migrate-v31-to-v32.mjs';
const SCRIPT_SRC = join(ROOT, 'scripts', SCRIPT_NAME);
const V31_SRC = join(ROOT, 'catalog', 'chagra-catalog-seed-v3.1.json');

function buildSandbox(extraIds = [], extraSrcIds = []) {
  const sandbox = mkdtempSync(join(tmpdir(), 'cat-guard-'));
  const scriptDir = join(sandbox, 'scripts');
  const catDir = join(sandbox, 'catalog');
  mkdirSync(scriptDir, { recursive: true });
  mkdirSync(catDir, { recursive: true });
  writeFileSync(join(scriptDir, SCRIPT_NAME), readFileSync(SCRIPT_SRC, 'utf8'));

  const v31 = JSON.parse(readFileSync(V31_SRC, 'utf8'));
  // La fuente v3.1 debe existir en el sandbox/catalog: el script la lee desde ahí.
  writeFileSync(join(catDir, 'chagra-catalog-seed-v3.1.json'), JSON.stringify(v31, null, 2) + '\n');

  // Fabricar un v3.2 en disco: copia de v3.1 con schema 3.2 + ids extra (opcional).
  const model = v31.species[0];
  const species = v31.species.map((sp) => ({ ...sp, tracking_mode: sp.tracking_mode ?? 'aggregate' }));
  for (const extraId of extraIds) {
    species.push({ ...model, id: extraId, nombre_comun: `Especie extra ${extraId}` });
  }
  const srcModel = v31.sources[0];
  const sources = v31.sources.map((s) => ({ ...s }));
  for (const extraSrcId of extraSrcIds) {
    sources.push({ ...srcModel, id: extraSrcId, titulo: `Fuente extra ${extraSrcId}` });
  }
  const v32Fabricado = {
    schema_version: '3.2',
    seed_version: v31.seed_version || '0.3.0',
    generated_at: '2026-09-04',
    species,
    biopreparados: v31.biopreparados || [],
    sources,
  };
  writeFileSync(
    join(catDir, 'chagra-catalog-seed-v3.2.json'),
    JSON.stringify(v32Fabricado, null, 2) + '\n',
  );

  return { sandbox, scriptPath: join(scriptDir, SCRIPT_NAME), outPath: join(catDir, 'chagra-catalog-seed-v3.2.json') };
}

function run(scriptPath, args, cwd) {
  return new Promise((resolve) => {
    execFile('node', [scriptPath, ...args], { cwd }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code ?? 1) : 0, stdout, stderr });
    });
  });
}

function md5(buf) {
  return createHash('md5').update(buf).digest('hex');
}

describe('migrate-v31-to-v32 guardia anti-regeneración', () => {
  it('aborta (exit != 0) y NO escribe si la salida perdería un id existente', async () => {
    const { sandbox, scriptPath, outPath } = buildSandbox(['sp_test_extra'], ['src_test_extra']);
    try {
      const before = readFileSync(outPath);
      const beforeHash = md5(before);
      const res = await run(scriptPath, [], sandbox);
      const afterHash = md5(readFileSync(outPath));
      expect(res.code).not.toBe(0);
      expect(res.stderr).toContain('sp_test_extra');
      expect(res.stderr).toContain('src_test_extra');
      expect(afterHash).toBe(beforeHash);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('también aborta si la pérdida es solo de una fuente (sources entran en el mismo set)', async () => {
    const { sandbox, scriptPath, outPath } = buildSandbox([], ['src_test_extra']);
    try {
      const beforeHash = md5(readFileSync(outPath));
      const res = await run(scriptPath, [], sandbox);
      const afterHash = md5(readFileSync(outPath));
      expect(res.code).not.toBe(0);
      expect(res.stderr).toContain('src_test_extra');
      expect(afterHash).toBe(beforeHash);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('con --permitir-bajas escribe, sale 0, y aun así anuncia la baja', async () => {
    const { sandbox, scriptPath, outPath } = buildSandbox(['sp_test_extra']);
    try {
      const beforeHash = md5(readFileSync(outPath));
      const res = await run(scriptPath, ['--permitir-bajas'], sandbox);
      const afterHash = md5(readFileSync(outPath));
      expect(res.code).toBe(0);
      expect(afterHash).not.toBe(beforeHash);
      expect(res.stderr).toContain('sp_test_extra');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('control negativo: sin pérdidas escribe normal y sale 0', async () => {
    const { sandbox, scriptPath, outPath } = buildSandbox([]);
    try {
      const beforeHash = md5(readFileSync(outPath));
      const res = await run(scriptPath, [], sandbox);
      const afterHash = md5(readFileSync(outPath));
      expect(res.code).toBe(0);
      expect(afterHash).not.toBe(beforeHash);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

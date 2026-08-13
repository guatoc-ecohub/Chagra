/**
 * scripts/__tests__/sync-compai-nucleo.test.mjs
 *
 * Cubre el fix del ítem #8 del GAP compAI (2026-08-13, "cablear
 * sync-compai-nucleo.mjs a lefthook con --check"): antes de este fix,
 * `--check` contra un DESTINO que no existe en la máquina (el caso normal en
 * CI y en máquinas de otros contribuidores — `~/demos/3d` es un checkout
 * local sin remoto) marcaba deriva en TODOS los archivos y salía 1 — un
 * gate roto de fábrica en cualquier máquina sin el valle clonado. Ahora sale
 * 0 con un mensaje "no aplica".
 *
 * Se prueba vía spawnSync (CLI real), como el resto de scripts CLI del
 * repo (ver bench-skip-guards.test.mjs) — este módulo no tiene guard
 * `import.meta.url` para exportar funciones puras, así que no se importa.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const SCRIPT = join(ROOT_DIR, 'scripts', 'sync-compai-nucleo.mjs');

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { cwd: ROOT_DIR, encoding: 'utf-8' });
}

let tmpBase;

beforeEach(() => {
  tmpBase = mkdtempSync(join(tmpdir(), 'sync-compai-nucleo-'));
});

afterEach(() => {
  rmSync(tmpBase, { recursive: true, force: true });
});

describe('sync-compai-nucleo --check', () => {
  it('destino ausente (máquina sin ~/demos/3d, ej. CI): sale 0, NO reporta deriva falsa', () => {
    const destino = join(tmpBase, 'no-existe');
    const r = run(['--check', '--destino', destino]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('no aplica');
  });

  it('destino sincronizado (copia recién hecha): sale 0, sin deriva', () => {
    const destino = join(tmpBase, 'destino-ok');
    // Primero copia (modo normal), luego --check debe ver todo igual.
    const copia = run(['--destino', destino]);
    expect(copia.status).toBe(0);
    const chequeo = run(['--check', '--destino', destino]);
    expect(chequeo.status).toBe(0);
    expect(chequeo.stdout).toContain('sin deriva');
  });

  it('destino con deriva real (un archivo editado a mano): sale 1', () => {
    const destino = join(tmpBase, 'destino-drift');
    const copia = run(['--destino', destino]);
    expect(copia.status).toBe(0);
    // Corrompe la copia — simula "alguien editó el valle en vez del origen".
    writeFileSync(join(destino, 'elenco.js'), '// drift manual\n', 'utf-8');
    const chequeo = run(['--check', '--destino', destino]);
    expect(chequeo.status).toBe(1);
    expect(chequeo.stderr).toContain('con deriva');
  });

  it('modo normal (sin --check) SÍ copia y deja el destino al día', () => {
    const destino = join(tmpBase, 'destino-copia');
    const r = run(['--destino', destino]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/copiados|ya estaban al día/);
    // Segunda corrida: nada que copiar.
    const r2 = run(['--destino', destino]);
    expect(r2.status).toBe(0);
    expect(r2.stdout).toContain('ya estaban al día');
  });
});

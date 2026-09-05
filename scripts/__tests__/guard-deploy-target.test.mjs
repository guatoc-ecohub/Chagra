// Tests del guard honesto del deploy 3D (card 099 — 2026-09-05).
//
// El guard anterior (`test -d` + mensaje "el padre del target no existe")
// reportaba la causa equivocada cuando el proceso no puede ATRAVESAR la ruta
// (falta de x en un ancestro). Esto mantuvo el deploy de 3d.guatoc.co rojo
// un día entero con un diagnóstico que enviaba a buscar en la dirección
// equivocada. Estos tests fijan el contrato:
//   - CAUSA: NO_EXISTE          solo cuando el ancestro de verdad falta.
//   - CAUSA: NO_PUEDO_ATRAVESAR cuando hay un ancestro sin permiso x.
//
// Control negativo clave (exigido por el encargo de la card): correr el guard
// contra un directorio existente pero sin permiso de traversal (chmod 000) y
// exigir que reporte NO_PUEDO_ATRAVESAR y NO "no existe". Los bits de permiso
// aplican también al dueño sin x, así que la prueba no necesita sudo: vale
// para cualquier usuario no-root (en el runner de CI corre como `runner`,
// exactamente la identidad del incidente).
/* global process */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, chmodSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, '..', 'guard-deploy-target.sh');
const WORKFLOW = join(HERE, '..', '..', '.github', 'workflows', 'deploy-3d-guatoc.yml');

// root ignora bits de permiso → el control negativo no es probabilidad ahí.
const isRoot =
  (typeof process.getuid === 'function' && process.getuid() === 0) ||
  process.platform === 'win32';

/** Ejecuta el guard y devuelve { code, out } sin lanzar por exit != 0. */
function runGuard(target) {
  try {
    const out = execFileSync('bash', [GUARD, target], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    return { code: err.status ?? 1, out };
  }
}

describe('guard-deploy-target.sh (card 099)', () => {
  let base;

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'guard-deploy-099-'));
  });

  afterAll(() => {
    // Por si un fallo dejó el directorio bloqueado en 000: devolver x para
    // poder borrar el árbol temporal.
    try {
      chmodSync(join(base, 'bloqueado'), 0o700);
    } catch {
      /* no existe: ok */
    }
    rmSync(base, { recursive: true, force: true });
  });

  it('pasa (exit 0) cuando el padre existe y es atravesable', () => {
    const padre = join(base, 'ok');
    mkdirSync(padre, { recursive: true });
    const { code, out } = runGuard(join(padre, 'app'));
    expect(code).toBe(0);
    expect(out).toContain('guard OK');
  });

  it.runIf(!isRoot)(
    'reporta NO_EXISTE (y solo NO_EXISTE) cuando el padre de verdad falta',
    () => {
      const { code, out } = runGuard(join(base, 'ok', 'no-esta', 'app'));
      expect(code).toBe(1);
      expect(out).toContain('CAUSA: NO_EXISTE');
      expect(out).not.toContain('CAUSA: NO_PUEDO_ATRAVESAR');
      expect(out).toContain(join(base, 'ok', 'no-esta'));
    },
  );

  it.runIf(!isRoot)(
    'CONTROL NEGATIVO: dir existente sin traversal reporta NO_PUEDO_ATRAVESAR, no "no existe"',
    () => {
      const bloqueado = join(base, 'bloqueado');
      mkdirSync(join(bloqueado, 'sub'), { recursive: true });
      chmodSync(bloqueado, 0o000);
      try {
        const { code, out } = runGuard(join(bloqueado, 'sub', 'app'));
        expect(code).toBe(1);
        // El corazón del arreglo: la causa correcta, con el componente nombrado.
        expect(out).toContain('CAUSA: NO_PUEDO_ATRAVESAR');
        expect(out).toContain(bloqueado);
        // Y explicitamente NO la mentira antigua:
        expect(out).not.toContain('CAUSA: NO_EXISTE');
      } finally {
        chmodSync(bloqueado, 0o700);
      }
    },
  );

  it.runIf(!isRoot)(
    'el dir bloqueado existe de verdad: con traversal restaurada, el guard pasa',
    () => {
      const bloqueado = join(base, 'bloqueado');
      // En el test anterior el mismo dir dio NO_PUEDO_ATRAVESAR; con x vuelve a pasar.
      const { code, out } = runGuard(join(bloqueado, 'sub', 'app'));
      expect(code).toBe(0);
      expect(out).toContain('guard OK');
    },
  );

  it('sin argumento: exit 2 con uso', () => {
    const { code, out } = runGuard('');
    expect(code).toBe(2);
    expect(out).toContain('uso:');
  });

  it('el workflow ya no contiene el mensaje mentiroso y llama al guard honesto', () => {
    const yml = readUtf8(WORKFLOW);
    expect(yml).not.toContain('El padre del target no existe');
    expect(yml).toContain('guard-deploy-target.sh');
    // y el propio script tampoco emite esa cadena:
    expect(readUtf8(GUARD)).not.toContain('El padre del target no existe');
  });
});

/** Lee un archivo como utf8 (helper diminuto para las aserciones de contenido). */
function readUtf8(path) {
  return readFileSync(path, 'utf8');
}

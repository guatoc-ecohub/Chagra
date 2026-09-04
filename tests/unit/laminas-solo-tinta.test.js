/** Gate de archivo: los compais activos solo montan TINTA. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CREATURES = path.join(ROOT, 'src/visual/creatures');
const ARCHIVO = path.join(CREATURES, '_archivo');
const LAMINAS = [
  'ChivitoPunkLaminaViva.jsx', 'JaguarLaminaViva.jsx', 'LuciernagaLaminaViva.jsx',
  'OsoBastonLaminaViva.jsx', 'ZariguyaGeminiLaminaViva.jsx', 'ZariguyaLaminaViva.jsx',
];
const ASSETS = ['chivitoLamina', 'jaguarLamina', 'luciernagaLamina', 'osoLamina', 'zariguyaGeminiLamina'];

function caminar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const ruta = path.join(dir, entry.name);
    return entry.isDirectory() ? caminar(ruta) : [ruta];
  });
}

describe('REGLA DURA solo-tinta: archivar no es borrar', () => {
  it('no deja láminas-viva ni sus assets asociados en el árbol activo', () => {
    expect(fs.readdirSync(CREATURES).filter((n) => n.endsWith('LaminaViva.jsx'))).toEqual([]);
    for (const nombre of ASSETS) expect(fs.existsSync(path.join(CREATURES, nombre)), nombre).toBe(false);
  });

  it('conserva las seis láminas, sus assets y la prueba del jaguar en _archivo/', () => {
    for (const nombre of LAMINAS) expect(fs.existsSync(path.join(ARCHIVO, nombre)), nombre).toBe(true);
    for (const nombre of ASSETS) expect(fs.existsSync(path.join(ARCHIVO, nombre)), nombre).toBe(true);
    expect(fs.existsSync(path.join(ARCHIVO, '__tests__', 'JaguarLaminaViva.test.jsx'))).toBe(true);
  });

  it('ningún módulo activo importa una lámina-viva', () => {
    const importadores = caminar(path.join(ROOT, 'src'))
      .filter((f) => !f.includes(`${path.sep}_archivo${path.sep}`) && /\.[jt]sx?$/.test(f))
      .filter((f) => fs.readFileSync(f, 'utf8').split('\n').some((l) => /^\s*(import|export)\b.*LaminaViva/.test(l)));
    expect(importadores.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("CREATURES['oso-baston'] monta el oso TINTA", async () => {
    const [{ CREATURES: registro }, { OsoBaston }] = await Promise.all([
      import('../../src/visual/creatures/index.js'), import('../../src/visual/creatures/OsoBaston.jsx'),
    ]);
    expect(registro['oso-baston'].Component).toBe(OsoBaston);
  });
});

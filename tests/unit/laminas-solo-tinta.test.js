/**
 * laminas-solo-tinta.test.js — LA REGLA DURA DEL OPERADOR (2026-09-03,
 * task #094), hecha gate: "si son láminas de compai SE ARCHIVAN. Solo deben
 * existir compais con TINTA."
 *
 * El 2026-08-18 las láminas-viva se cablearon al registro CREATURES y el
 * 2026-08-31 la TINTA trazada (receta del jaguar, aprobada por el operador)
 * las reemplazó en el registro, el avatar y el selector. El 2026-09-04 se
 * ARCHIVARON a `src/visual/creatures/_archivo/` (sacarlas del árbol de
 * build, NO borrarlas del historial).
 *
 * Este test impide que el residuo regrese: nada vivo importa una lámina,
 * el árbol raíz de creatures/ no tiene ninguna, y lo archivado sigue en
 * disco (archivar ≠ borrar).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirnameLocal, '../..');
const CREATURES_DIR = path.resolve(REPO_ROOT, 'src/visual/creatures');
const ARCHIVO_DIR = path.join(CREATURES_DIR, '_archivo');
const SRC_DIR = path.resolve(REPO_ROOT, 'src');

/* Las SEIS láminas archivadas (task #094) + su test, que viaja con ellas. */
const LAMINAS_ARCHIVADAS = [
  'ChivitoPunkLaminaViva.jsx',
  'LuciernagaLaminaViva.jsx',
  'JaguarLaminaViva.jsx',
  'ZariguyaLaminaViva.jsx',
  'OsoBastonLaminaViva.jsx',
  'ZariguyaGeminiLaminaViva.jsx',
];

/** Camina `dir` en profundidad y devuelve cada archivo como ruta absoluta. */
function camina(dir) {
  const archivos = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) archivos.push(...camina(ruta));
    else archivos.push(ruta);
  }
  return archivos;
}

describe('REGLA DURA solo-tinta: el árbol vivo de creatures/ no tiene láminas', () => {
  it('ningún *LaminaViva.jsx queda en la RAÍZ de src/visual/creatures/', () => {
    const enRaiz = fs.readdirSync(CREATURES_DIR)
      .filter((f) => f.endsWith('LaminaViva.jsx'));
    expect(enRaiz).toEqual([]);
  });

  it('las SEIS láminas siguen en disco, archivadas en _archivo/ (archivar ≠ borrar)', () => {
    for (const nombre of LAMINAS_ARCHIVADAS) {
      expect(fs.existsSync(path.join(ARCHIVO_DIR, nombre)), nombre).toBe(true);
    }
    // y su test viajó con su sujeto
    expect(
      fs.existsSync(path.join(ARCHIVO_DIR, '__tests__', 'JaguarLaminaViva.test.jsx')),
    ).toBe(true);
  });

  it('ningún archivo VIVO de src/ (fuera de _archivo y tests) importa una lámina', () => {
    const esTest = (f) => f.includes('__tests__') || /\.test\.[jt]sx?$/.test(f);
    const importadores = camina(SRC_DIR)
      .filter((f) => !f.includes(`${path.sep}_archivo${path.sep}`) && !esTest(f))
      .filter((f) => /\.(jsx?|tsx?)$/.test(f))
      .filter((f) => {
        const lineas = fs.readFileSync(f, 'utf8').split('\n');
        // Solo sentencias import/export — los comentarios que cuentan la
        // historia del archivo son legítimos (así se documenta el archivo).
        return lineas.some((l) => /^\s*(import|export)\b.*LaminaViva/.test(l));
      });
    expect(importadores.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
  });
});

describe('REGLA DURA solo-tinta: lo que monta el producto es TINTA', () => {
  it("CREATURES['oso-baston'] monta el oso TINTA, no la lámina", async () => {
    const { CREATURES } = await import('../../src/visual/creatures/index.js');
    const { OsoBaston } = await import('../../src/visual/creatures/OsoBaston.jsx');
    const entrada = CREATURES['oso-baston'];
    expect(entrada).toBeTruthy();
    expect(entrada.cientifico).toBe('Tremarctos ornatus');
    expect(entrada.Component).toBe(OsoBaston);
  });
});

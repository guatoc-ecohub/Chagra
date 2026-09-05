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
import os from 'node:os';
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

/**
 * sigueEnDisco — ¿la entrada sigue declarada en el árbol? (archivar ≠ borrar).
 *
 * Desde el 2026-09-04 las láminas archivadas viven como SYMLINKS al disco
 * frío (`/mnt/data/coldstore/...`, fuera del repo). El symlink es la entrada
 * real: git la guarda (modo 120000) y el archivo no se borró, aunque su
 * destino no esté montado — así ocurre en CI, donde `/mnt/data/coldstore`
 * no existe y `existsSync` (que SÍ sigue el enlace) devolvía false y pintaba
 * este gate de rojo. Por eso se mira con `lstat` (NO sigue el enlace):
 * symlink o archivo regular cuenta; lo que delataría un borrado es que la
 * entrada ya no esté en el árbol.
 */
function sigueEnDisco(ruta) {
  const st = fs.lstatSync(ruta, { throwIfNoEntry: false });
  if (!st) return false;
  return st.isSymbolicLink() || st.isFile();
}

describe('REGLA DURA solo-tinta: el árbol vivo de creatures/ no tiene láminas', () => {
  it('ningún *LaminaViva.jsx queda en la RAÍZ de src/visual/creatures/', () => {
    const enRaiz = fs.readdirSync(CREATURES_DIR)
      .filter((f) => f.endsWith('LaminaViva.jsx'));
    expect(enRaiz).toEqual([]);
  });

  it('las SEIS láminas siguen en disco, archivadas en _archivo/ (archivar ≠ borrar)', () => {
    for (const nombre of LAMINAS_ARCHIVADAS) {
      expect(sigueEnDisco(path.join(ARCHIVO_DIR, nombre)), nombre).toBe(true);
    }
    // y su test viajó con su sujeto
    expect(
      sigueEnDisco(path.join(ARCHIVO_DIR, '__tests__', 'JaguarLaminaViva.test.jsx')),
    ).toBe(true);
  });

  it('un symlink colgante también cuenta como archivado (CI sin disco frío)', () => {
    // Repro del rojo de CI de #3124: el runner no tiene /mnt/data/coldstore,
    // así que los symlinks de _archivo/ quedan colgando. El criterio viejo
    // (existsSync, que sigue el enlace) los daba por borrados; el correcto
    // es que la entrada siga declarada en el árbol.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lamina-colgante-'));
    try {
      const enlace = path.join(tmp, 'LaminaColgante.jsx');
      fs.symlinkSync(path.join(tmp, 'destino-que-no-existe.jsx'), enlace);
      expect(fs.existsSync(enlace)).toBe(false); // el criterio viejo fallaba acá
      expect(sigueEnDisco(enlace)).toBe(true); // el correcto sí la ve
      expect(sigueEnDisco(path.join(tmp, 'nunca-existio.jsx'))).toBe(false); // borrado sí delata
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
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

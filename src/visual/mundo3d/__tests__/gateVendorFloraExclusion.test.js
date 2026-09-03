/*
 * Control del gate TSC sobre el vendor de flora (task 090.d).
 *
 * El árbol `sierra/vendor/flora/` entró con #3103 y trajo 54 errores nuevos
 * al gate (810 vs baseline 756). La decisión, archivo por archivo:
 *
 *   (B) arreglados en raíz: EscenaDescensoSierra.jsx, floraDescenso.js,
 *       FollajeMasa.js, matrizParamo.js, vientoMundos.js — y todo lo
 *       arreglable por tipos de flora.js / flora-eztree-bake.js /
 *       lodEspecieSylva.js (JSDoc, sondas window, tuplas de Map).
 *   (A) excluidos del chequeo: flora.js, flora-eztree-bake.js y
 *       lodEspecieSylva.js — SOLO por sus 12 TS2307: importan módulos del
 *       monorepo Sylva original (terrain.js, flora/ez-tree/*, lib3d/flora/*,
 *       follaje-masa-bake.js) que no se vendorizaron. Arreglarlos acá
 *       exigiría vendorizar más del monorepo o reescribir imports de
 *       código vendorizado: decisión de integración, no de tipos.
 *
 * CONTROL NEGATIVO (ruling 087): la exclusión sola NO pone el gate verde.
 *   solo exclusión → 785 (rojo) · solo arreglos → 768 (rojo) · ambos → 756.
 *
 * Estos tests fijan que la exclusión siga siendo quirúrgica y honesta:
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../..');

const EXCLUIDOS = [
  'src/visual/mundo3d/sierra/vendor/flora/flora.js',
  'src/visual/mundo3d/sierra/vendor/flora/flora-eztree-bake.js',
  'src/visual/mundo3d/sierra/vendor/flora/lodEspecieSylva.js',
];

describe('exclusión TSC del vendor de flora (task 090.d)', () => {
  it('jsconfig excluye EXACTAMENTE los 3 archivos de capa rota, nada más', () => {
    const jsconfig = JSON.parse(readFileSync(resolve(RAIZ, 'jsconfig.json'), 'utf8'));
    const exclude = jsconfig.exclude || [];
    const nuevos = exclude.filter((e) => e.startsWith('src/'));
    expect(nuevos.sort()).toEqual([...EXCLUIDOS].sort());
    // La exclusión NUNCA puede volverse mayor (p. ej. vendor/** completa):
    // si alguien la amplía, que sea consciente y edite este pin.
    for (const entrada of nuevos) {
      expect(entrada, 'la exclusión debe ser archivo por archivo, sin comodines').not.toMatch(/[*]/);
    }
  });

  it('ningún módulo FUERA de los excluidos importa los archivos excluidos', () => {
    // Premisa de la exclusión: los 3 archivos están huérfanos (nadie los
    // importa), por eso salir del programa de tsc no esconde código vivo.
    // Si el día de la integración un módulo incluido los importa, tsc los
    // re-incorpora al programa y este test avisa de que la exclusión dejó
    // de ser inocua.
    const raizSrc = join(RAIZ, 'src');
    const archivos = [];
    const caminar = (dir) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);
        const esDir = statSync(ruta).isDirectory();
        if (esDir) caminar(ruta);
        else if (/\.(js|jsx)$/.test(nombre)) archivos.push(ruta);
      }
    };
    caminar(raizSrc);

    const excluidosAbs = new Set(EXCLUIDOS.map((e) => resolve(RAIZ, e)));
    excluidosAbs.add(fileURLToPath(import.meta.url)); // este auditor menciona los nombres
    const PATRONES = [/['"][^'"]*flora\.js['"]/, /['"][^'"]*flora-eztree-bake(\.js)?['"]/, /['"][^'"]*lodEspecieSylva(\.js)?['"]/];

    const importadores = [];
    for (const archivo of archivos) {
      if (excluidosAbs.has(archivo)) continue; // entre ellos se importan: sabido
      const texto = readFileSync(archivo, 'utf8');
      if (PATRONES.some((re) => re.test(texto))) {
        importadores.push(relative(RAIZ, archivo));
      }
    }
    expect(importadores, 'un módulo vivo importa código excluido del gate: la exclusión ya no es inocua').toEqual([]);
  });

  it('el baseline del gate no sube ni hereda errores del vendor', () => {
    const baseline = JSON.parse(readFileSync(resolve(RAIZ, 'scripts/tsc-baseline.json'), 'utf8'));
    // Este PR promete NO subir el baseline a mano (756 era el número al salir #3105).
    expect(baseline.totalErrors).toBeLessThanOrEqual(756);
    // Y el baseline no puede usar la exclusión para esconder errores del vendor:
    const conVendor = Object.keys(baseline.byFile || {}).filter((f) => f.includes('vendor/'));
    expect(conVendor, 'el baseline no debe contener archivos del vendor').toEqual([]);
  });
});

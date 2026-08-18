#!/usr/bin/env node
/*
 * build-guias-f24.mjs — reempaqueta `assets/guias-arte.js` desde los fuentes
 * por-rig de ESTE directorio (`<slug>.css` + `<slug>.defs.svg` + `<slug>.rig.svg`
 * + `<slug>.meta.json`).
 *
 * POR QUÉ existe: el generador original (`build-guias.mjs`, en
 * `~/demos/integracion-agente/`) calca los rigs de standalones que viven FUERA
 * de este repo (`~/demos-src/*`). El skin-swap de F24 redibuja la PIEL de cada
 * parte manteniendo la anatomía (CONTRATO-GENERADOR-SERES regla 2), y esa piel
 * tiene que poder versionarse AQUÍ, en el árbol que se gatea y se revisa — no
 * en un working ajeno. Los fuentes por-rig se extrajeron 1:1 del guias-arte.js
 * generado (HEAD dffa20b) y desde entonces la edición vive en estos archivos.
 *
 * Uso:  node compai/rigs/build-guias-f24.mjs      (desde la raíz del worktree)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const ORDEN = ['angelita', 'chivito', 'luciernaga', 'oso', 'jaguar', 'guacamaya', 'zariguya'];

const salida = {};
for (const slug of ORDEN) {
  const meta = JSON.parse(readFileSync(join(AQUI, slug + '.meta.json'), 'utf8'));
  salida[slug] = {
    wrap: meta.wrap,
    css: readFileSync(join(AQUI, slug + '.css'), 'utf8'),
    defs: readFileSync(join(AQUI, slug + '.defs.svg'), 'utf8'),
    svg: readFileSync(join(AQUI, slug + '.rig.svg'), 'utf8'),
  };
  console.log(`${slug}: css ${salida[slug].css.length}b · defs ${salida[slug].defs.length}b · rig ${salida[slug].svg.length}b`);
}

const js = '/* GENERADO por compai/rigs/build-guias-f24.mjs — no editar a mano: editá\n'
  + ' * compai/rigs/<slug>.{css,defs.svg,rig.svg} y re-corré el builder. Anatomía\n'
  + ' * calcada de los standalones (via build-guias.mjs, HEAD dffa20b); la PIEL es\n'
  + ' * la del refresco 2026-08-12 (F24 skin-swap). `zariguya` viene de\n'
  + ' * build-canon-creature.mjs: su rig NO usa :host([data-estado]) — se anima solo\n'
  + ' * desde los data-pose/data-animo horneados en el propio SVG. Trae sus CRÍAS AL\n'
  + ' * LOMO (data-crias="3"), que es su firma y lo que pidió el operador. */\n'
  + 'window.GUIAS_ARTE = ' + JSON.stringify(salida) + ';\n';
const destino = join(RAIZ, 'assets', 'guias-arte.js');
if (!existsSync(destino)) throw new Error('no encuentro ' + destino);
writeFileSync(destino, js);
console.log('→ assets/guias-arte.js listo (' + js.length + ' bytes)');

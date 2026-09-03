#!/usr/bin/env node
/**
 * sync-compai-nucleo — LA FUENTE ÚNICA, COPIADA Y VERIFICADA.
 *
 * El compAI vive en dos stacks que no comparten build:
 *   · `chagra/`         — React + Vite (bundler resuelve los imports).
 *   · `valle-guatoc/`   — three r160 vendorizado, ESM nativo, SIN build.
 *
 * No se pueden unificar los stacks (uno es dogma sin build). Sí se unifica
 * **lo que el personaje sabe y hace**: el núcleo de `src/compai/nucleo/` es
 * ESM plano sin una sola dependencia, así que se puede COPIAR tal cual y los
 * dos lados lo ejecutan igual. Este script hace la copia — nunca una persona.
 *
 * Uso:
 *   node scripts/sync-compai-nucleo.mjs           copia y reporta md5
 *   node scripts/sync-compai-nucleo.mjs --check    NO copia; sale 1 si hay deriva
 *   node scripts/sync-compai-nucleo.mjs --destino /otra/ruta
 *
 * `--check` está enganchado en `lefthook.yml` (pre-commit, glob
 * `src/compai/nucleo/*.js`): si alguien edita el núcleo y no corre el sync,
 * el commit falla ahí mismo en vez de descubrirse cuando los dos compAI ya
 * digan cosas distintas. NO está en GitHub Actions CI a propósito: el
 * DESTINO (`~/demos/3d`, el valle 3D vivo) es un checkout LOCAL sin remoto
 * — no existe en el runner de CI ni en la máquina de otro contribuidor, así
 * que ahí `--check` sale 0 sin verificar nada (destino ausente = "no
 * aplica", ver `main()`). El gate real vive donde vive el valle: la misma
 * máquina que corre lefthook.
 *
 * INVARIANTE QUE SE VERIFICA EN CADA CORRIDA: ningún archivo del núcleo puede
 * importar nada fuera de su propio directorio. Si alguien mete un `import` a
 * React, a three o a un service de la app, el sync FALLA — porque esa línea
 * rompería el valle, que no tiene bundler que la resuelva.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ORIGEN = resolve(AQUI, '../src/compai/nucleo');
// Valle guatoc = ~/demos/3d/ (servido en 3d.guatoc.co raíz) — NO
// ~/demos-src/valle-guatoc/ (ruta vieja/inexistente) ni ~/demos/valle-guatoc/
// (basura descartada). Ver memoria feedback_valle_canonico_3d_guatoc.
const DESTINO_DEFECTO = resolve(AQUI, '../../../demos/3d/compai');

const args = process.argv.slice(2);
const soloVerificar = args.includes('--check');
const iDestino = args.indexOf('--destino');
const DESTINO = iDestino >= 0 && args[iDestino + 1]
  ? resolve(args[iDestino + 1])
  : DESTINO_DEFECTO;

const md5 = (s) => createHash('md5').update(s).digest('hex');

/** Todo `.js` del núcleo entra; el MANIFIESTO.md viaja también, como carta. */
function archivosDelNucleo() {
  return readdirSync(ORIGEN)
    .filter((f) => f.endsWith('.js') || f === 'MANIFIESTO.md')
    .sort();
}

/**
 * El invariante: sólo se permiten imports relativos al MISMO directorio
 * (`./algo.js`). Cualquier otra cosa —un paquete, un `../`— haría que el
 * valle, que carga ESM nativo sin bundler, reviente en el navegador.
 */
function verificarPortabilidad(nombre, fuente) {
  const problemas = [];
  const re = /(?:^|\n)\s*(?:import|export)[^\n;]*?from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(fuente)) !== null) {
    const spec = m[1];
    if (!spec.startsWith('./') || spec.includes('/', 2)) {
      problemas.push(`${nombre}: import no portable → '${spec}'`);
    }
  }
  if (/\bfrom\s+['"](react|three|zustand)/.test(fuente)) {
    problemas.push(`${nombre}: el núcleo no puede depender de un framework`);
  }
  return problemas;
}

function main() {
  if (!existsSync(ORIGEN)) {
    console.error(`✗ no existe el origen: ${ORIGEN}`);
    process.exit(1);
  }

  // El destino (~/demos/3d/compai) es un checkout LOCAL sin remoto — no
  // existe en CI ni en máquinas de otros contribuidores. Si no existe, el
  // --check no aplica (nada que verificar aquí): salir en 0 en vez de marcar
  // deriva en TODOS los archivos por "destino ausente" (bug encontrado
  // cableando este script a lefthook, ítem #8 del GAP compAI 2026-08-13).
  if (soloVerificar && !existsSync(DESTINO)) {
    console.log(`○ ${DESTINO} no existe en esta máquina — --check no aplica (nada que sincronizar aquí).`);
    return;
  }

  const archivos = archivosDelNucleo();
  const problemas = [];
  const filas = [];

  for (const nombre of archivos) {
    const fuente = readFileSync(join(ORIGEN, nombre), 'utf8');
    if (nombre.endsWith('.js')) problemas.push(...verificarPortabilidad(nombre, fuente));

    const hOrigen = md5(fuente);
    const rutaDestino = join(DESTINO, nombre);
    const hDestino = existsSync(rutaDestino) ? md5(readFileSync(rutaDestino, 'utf8')) : null;
    const igual = hOrigen === hDestino;

    filas.push({ nombre, hOrigen, hDestino, igual });

    if (!soloVerificar && !igual) {
      mkdirSync(DESTINO, { recursive: true });
      writeFileSync(rutaDestino, fuente, 'utf8');
    }
  }

  if (problemas.length) {
    console.error('✗ el núcleo dejó de ser portable:');
    for (const p of problemas) console.error(`   ${p}`);
    process.exit(1);
  }

  const derivados = filas.filter((f) => !f.igual);

  console.log(`compAI núcleo — origen: ${ORIGEN}`);
  console.log(`              destino: ${DESTINO}`);
  console.log('');
  for (const f of filas) {
    const marca = f.igual ? '=' : (soloVerificar ? '✗' : '→');
    console.log(`  ${marca} ${f.nombre.padEnd(20)} ${f.hOrigen}`);
  }
  console.log('');

  if (soloVerificar) {
    if (derivados.length) {
      console.error(`✗ ${derivados.length} archivo(s) con deriva. Corra el sync sin --check.`);
      console.error('  (si la copia del valle es la que tiene el cambio bueno, muévalo AL ORIGEN:');
      console.error('   el valle nunca es la fuente de verdad — ver MANIFIESTO.md)');
      process.exit(1);
    }
    console.log('✓ sin deriva: los dos compAI corren el mismo núcleo.');
    return;
  }

  console.log(derivados.length
    ? `✓ ${derivados.length} archivo(s) copiados. Los dos compAI corren el mismo núcleo.`
    : '✓ ya estaban al día.');
}

main();

/**
 * scripts/__tests__/lefthook-scans-multiarchivo.test.mjs
 *
 * Candado del fix "los scans de lefthook solo veían el PRIMER archivo staged"
 * (2026-08-18). Los cuatro guards de `pre-commit` que filtran por contenido
 * (infra-refs-scan, strategic-content-scan, pro-import-scan, voseo-scan)
 * empezaban con:
 *
 *     files="{staged_files}"
 *
 * y lefthook sustituye `{staged_files}` por la lista de rutas con CADA UNA
 * entre comillas: `files="a.js" "b.js" "c.js"`. El shell asigna `files=a.js`
 * y luego intenta EJECUTAR `b.js` con `c.js` de argumento (de ahí el
 * "Permiso denegado" que se veía en cada commit). Como el error del comando
 * suelto no cambiaba el código de salida del bloque, el guard salía VERDE
 * habiendo mirado un solo archivo: cualquier fuga a partir del segundo
 * archivo del commit pasaba sin que nadie la viera.
 *
 * Este test NO lee el texto del arreglo — ejecuta el bloque real del YAML con
 * la MISMA sustitución que hace lefthook, sobre dos archivos de mentira donde
 * el sucio va SEGUNDO, y exige que el guard bloquee. Trae su propio control
 * negativo (los dos archivos limpios ⇒ el guard pasa), para que un guard que
 * bloquea siempre tampoco cuente como aprobado.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import yaml from 'js-yaml';
import { afterAll, describe, expect, it } from 'vitest';

// vitest corre desde la raiz del repo (import.meta.url no siempre es file:
// bajo el entorno jsdom del proyecto).
const CONFIG = yaml.load(readFileSync(join(process.cwd(), 'lefthook.yml'), 'utf8'));
const COMANDOS = CONFIG['pre-commit'].commands;

const temporales = [];

afterAll(() => {
  for (const dir of temporales) rmSync(dir, { recursive: true, force: true });
});

/**
 * Corre el bloque `run:` de un guard igual que lefthook: `{staged_files}`
 * sustituido por las rutas, cada una entre comillas dobles.
 */
function correrGuard(nombre, archivos) {
  const dir = mkdtempSync(join(tmpdir(), 'lefthook-scan-'));
  temporales.push(dir);

  const rutas = archivos.map(({ ruta, contenido }) => {
    const destino = join(dir, ruta);
    spawnSync('mkdir', ['-p', join(destino, '..')]);
    writeFileSync(destino, contenido);
    return ruta;
  });

  // lefthook expande {staged_files} a una LISTA DE ARGUMENTOS, cada ruta con
  // sus propias comillas — no a una sola palabra. Por eso se reemplaza primero
  // la forma entrecomillada del YAML: `files="{staged_files}"` se convierte en
  // `files="a.md" "b.md"`, que en sh es una asignacion de prefijo seguida del
  // comando `b.md`. Simular esto mal (una sola palabra) es lo que vuelve
  // inutil a este test: el bloque roto tambien pasaria.
  const sustitucion = rutas.map((ruta) => `"${ruta}"`).join(' ');
  const guion = COMANDOS[nombre].run
    .replaceAll('"{staged_files}"', sustitucion)
    .replaceAll('{staged_files}', sustitucion);

  return spawnSync('sh', ['-c', guion], { cwd: dir, encoding: 'utf8' });
}

const LIMPIO = 'export const saludo = "buenos dias";\n';

const CASOS = [
  {
    guard: 'infra-refs-scan',
    // IP privada RFC1918 de ejemplo — el patron que el guard debe cazar.
    sucio: { ruta: 'zzz-sucio.md', contenido: 'host interno: 192.168.1.5\n' },
    limpio: { ruta: 'aaa-limpio.md', contenido: 'nota sin nada adentro\n' },
  },
  {
    guard: 'strategic-content-scan',
    sucio: { ruta: 'zzz-sucio.md', contenido: 'nota con valuation del proyecto\n' },
    limpio: { ruta: 'aaa-limpio.md', contenido: 'nota sin nada adentro\n' },
  },
  {
    guard: 'pro-import-scan',
    sucio: {
      ruta: 'src/zzz-sucio.js',
      contenido: "import algo from '@guatoc/chagra-pro';\nexport default algo;\n",
    },
    limpio: { ruta: 'src/aaa-limpio.js', contenido: LIMPIO },
  },
  {
    guard: 'voseo-scan',
    // El voseo va en escapes unicode a proposito: escrito con sus tildes,
    // este mismo archivo de test dispararia los guards de voseo del repo.
    sucio: {
      ruta: 'src/zzz-sucio.js',
      contenido: 'export const t = "si ten\u00e9s dudas mir\u00e1 el manual";\n',
    },
    limpio: { ruta: 'src/aaa-limpio.js', contenido: LIMPIO },
  },
];

describe('guards de pre-commit que filtran por contenido', () => {
  it.each(CASOS)('$guard ve el archivo sucio aunque vaya SEGUNDO', ({ guard, limpio, sucio }) => {
    const { status, stdout } = correrGuard(guard, [limpio, sucio]);

    expect(status, `${guard} dejo pasar una violacion en el segundo archivo`).toBe(1);
    expect(stdout).toContain(sucio.ruta);
  });

  it.each(CASOS)('$guard pasa cuando no hay nada que cazar (control negativo)', ({ guard, limpio }) => {
    const otroLimpio = { ...limpio, ruta: limpio.ruta.replace('aaa-', 'bbb-') };
    const { status } = correrGuard(guard, [limpio, otroLimpio]);

    expect(status, `${guard} bloquea archivos limpios: bloquear siempre no es gatear`).toBe(0);
  });
});

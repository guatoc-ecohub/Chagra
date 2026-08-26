#!/usr/bin/env node
/*
 * build-piel-kart.mjs — genera `juegos/chagra-kart/js/modelos/piel-rigs.js`
 * desde la MISMA piel versionada que pinta el valle (F24: `<slug>.defs.svg` +
 * `<slug>.rig.svg`).
 *
 * POR QUÉ existe (F25): el kart traía las paletas de los pilotos COPIADAS a
 * mano de fichas y láminas — cada refresco de piel del compai dejaba al mismo
 * personaje con dos pintas, una por pantalla (CONTRATO-GENERADOR-SERES regla
 * 2: `estilo` cambia la PIEL, nunca la anatomía; y la piel se define UNA vez).
 * Aquí el `<slug>.meta.json` declara QUÉ elemento de la piel corresponde a
 * cada ranura del cuerpo 3D del kart, y este builder LEE el color real de las
 * fuentes SVG:
 *
 *   "cuerpo": { "grad": "gPelaje", "stop": 1 }  → stop N del gradiente
 *   "detalle": { "fill": "#1c1207" }            → color plano, VERIFICADO:
 *       si ese hex ya no existe como fill/stroke en el rig, el build REVIENTA
 *       en vez de dejar al kart pintado con una piel que ya no es la del valle.
 *
 * Uso:  node compai/rigs/build-piel-kart.mjs      (desde la raíz del worktree)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const ORDEN = ['angelita', 'jaguar', 'oso', 'zariguya', 'luciernaga', 'chivito'];

function stopsDeGradiente(fuente, id) {
  const re = new RegExp(`<(?:linear|radial)Gradient[^>]*id="${id}"[\\s\\S]*?</(?:linear|radial)Gradient>`);
  const bloque = re.exec(fuente)?.[0];
  if (!bloque) return null;
  return [...bloque.matchAll(/stop-color="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1]);
}

function resolver(slug, ranura, ref, fuentes) {
  if (ref.grad) {
    for (const f of fuentes) {
      const stops = stopsDeGradiente(f, ref.grad);
      if (stops) {
        const c = stops[ref.stop ?? 0];
        if (!c) throw new Error(`${slug}.${ranura}: el gradiente ${ref.grad} no tiene stop ${ref.stop}`);
        return c;
      }
    }
    throw new Error(`${slug}.${ranura}: no existe el gradiente ${ref.grad} en las fuentes de la piel`);
  }
  if (ref.fill) {
    const hex = ref.fill.toLowerCase();
    const hay = fuentes.some((f) => f.toLowerCase().includes(`fill="${hex}"`) || f.toLowerCase().includes(`stroke="${hex}"`));
    if (!hay) throw new Error(`${slug}.${ranura}: ${ref.fill} ya no existe como fill/stroke en la piel — la referencia quedó vieja`);
    return hex;
  }
  throw new Error(`${slug}.${ranura}: referencia sin grad ni fill`);
}

const aNum = (hex) => parseInt(hex.replace('#', ''), 16);

const salida = {};
for (const slug of ORDEN) {
  const meta = JSON.parse(readFileSync(join(AQUI, slug + '.meta.json'), 'utf8'));
  const piel = meta.pielKart;
  if (!piel) throw new Error(`${slug}.meta.json no declara pielKart`);
  const fuentes = [
    readFileSync(join(AQUI, slug + '.defs.svg'), 'utf8'),
    readFileSync(join(AQUI, slug + '.rig.svg'), 'utf8'),
  ];
  const r = {};
  for (const [ranura, ref] of Object.entries(piel)) {
    if (ranura === 'extras') continue;
    r[ranura] = aNum(resolver(slug, ranura, ref, fuentes));
  }
  if (piel.extras) {
    r.extras = {};
    for (const [ranura, ref] of Object.entries(piel.extras)) {
      r.extras[ranura] = aNum(resolver(slug, 'extras.' + ranura, ref, fuentes));
    }
  }
  salida[slug] = r;
  console.log(`${slug}: ${Object.keys(r).filter((k) => k !== 'extras').length} ranuras + ${Object.keys(r.extras ?? {}).length} extras`);
}

const hex6 = (n) => '0x' + n.toString(16).padStart(6, '0');
const serie = (obj) => '{ ' + Object.entries(obj).map(([k, v]) => {
  const clave = /^[a-z][a-zA-Z0-9]*$/.test(k) ? k : JSON.stringify(k);
  return `${clave}: ${typeof v === 'number' ? hex6(v) : serie(v)}`;
}).join(', ') + ' }';

const js = '/* GENERADO por compai/rigs/build-piel-kart.mjs — no editar a mano: editá\n'
  + ' * compai/rigs/<slug>.meta.json (pielKart) o la piel misma (<slug>.defs.svg /\n'
  + ' * <slug>.rig.svg) y re-corré el builder. Es la MISMA piel del valle (F24)\n'
  + ' * resuelta a ranuras del cuerpo 3D del kart: una sola fábrica, dos pantallas.\n'
  + ' * Dante y Oliver no aparecen: la fábrica todavía no tiene su rig (marcador\n'
  + ' * pendiente arte de F24) y su piel de perro real sigue viviendo en el kart. */\n'
  + 'export const PIEL_RIGS = {\n'
  + ORDEN.map((s) => `  ${JSON.stringify(s).replace(/"/g, "'")}: ${serie(salida[s])},`).join('\n')
  + '\n};\n';
const destino = join(RAIZ, 'juegos', 'chagra-kart', 'js', 'modelos', 'piel-rigs.js');
writeFileSync(destino, js);
console.log('→ juegos/chagra-kart/js/modelos/piel-rigs.js listo (' + js.length + ' bytes)');

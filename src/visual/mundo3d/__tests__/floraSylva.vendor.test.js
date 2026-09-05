/*
 * La vegetación del descenso es un lote de COPIA VERBATIM del de los mundos
 * (valle). Este test es el control que impide que las copias se separen de sus
 * originales sin que nadie lo note: fija el sha-256 del cuerpo copiado de cada
 * archivo. Si alguien edita una copia (o el original cambia y se re-sincroniza
 * mal), falla acá y no seis meses después en una captura que «se ve rara».
 *
 * Los 8 archivos que pide el brief se comparan byte-a-byte contra su original
 * en `.vendor-src/flora/`. Además se trajeron 2 dependencias desde
 * `~/demos/3d/` — `flora-eztree-bake.js` y `flora.js` — porque
 * `lodEspecieSylva.js` las importa hacia afuera de `flora/` (el brief manda
 * traerlas y decirlo). Su sha se fija contra `~/demos/3d/`.
 *
 * La **desviación honesta** con el plan: `flora.js` y `flora-eztree-bake.js`
 * importan a su vez `terrain.js` y `flora/ez-tree/`, que NO se trajeron (están
 * fuera del alcance «flora/» del brief y ampliarían mucho el vendor set).
 * Consecuencia: `lodEspecieSylva.js`, `flora.js` y `flora-eztree-bake.js` NO se
 * importan desde `floraDescenso.js` — el módulo de descenso usa los 5 módulos
 * autónomos (FollajeMasa, vientoMundos, frailejonFabrica, quickGrass,
 * arbolesAltoandinos, matrizParamo, pisosTermicos) que sí cierran. Esto no
 * rompe la PARTE 1 (los 8 cuerpos quedan fijados); solo declara qué se puede
 * montar hoy.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(AQUI, '../sierra/vendor/flora');
const MARCADOR = '/* ── INICIO COPIA VERBATIM ── */\n';

const SHA_CUERPOS = {
  'FollajeMasa.js': 'd734b3c98efaf87cb60326e40316d8bedcff8b47b6b33156ea1da195b33bdd31',
  'vientoMundos.js': 'b0a5758b6651ec710151a591e18ad04f75f156c673b27ed520fbc43c3ab6293e',
  'frailejonFabrica.js': 'bbafa6c0e5f719402aac7587b02c67d199163cc094e1c3bd4726bdaa50c79d06',
  'matrizParamo.js': '86cd65b987f5f5316521ae6b5b68cbcd2f2ce830f564243ccd601e4084dfb0e2',
  'quickGrass.js': '3d508a3ab8b72e5c2eb32d0d5eab4a875a1e22a3b8fa63a1c46c826731975032',
  'arbolesAltoandinos.js': 'f88be5d825ba7141bc910d5414080b9df1302da443aad9f3fcfacfe34be55346',
  'pisosTermicos.js': '5d938ed3fb00f82b938beace67ffda0381e40df370ab3e5c5897a899096adbd4',
  'lodEspecieSylva.js': 'ebadd699822a903aa80b05fcba3715be87fc19ae6f8da48725ec618db3c2eb2e',
  // traídos como dependencia de lodEspecieSylva (original en ~/demos/3d/)
  'flora-eztree-bake.js': '699852b8433ae5bb308027ad97fe10c543ddb749051078d331a9fe5a85586fef',
  'flora.js': '09cb5ad003854459f1518ffba0a6e7b93ea076d87aac5c70e3de293ea1695c57',
};

function cuerpoDe(nombre) {
  const txt = readFileSync(resolve(DIR, nombre), 'utf8');
  const i = txt.indexOf(MARCADOR);
  expect(i).toBeGreaterThan(0);
  return txt.slice(i + MARCADOR.length);
}

describe('flora Sylva vendorizado', () => {
  it('cada cuerpo copiado es byte-a-byte su original', () => {
    for (const [nombre, sha] of Object.entries(SHA_CUERPOS)) {
      const cuerpo = cuerpoDe(nombre);
      expect(
        createHash('sha256').update(cuerpo).digest('hex'),
        nombre,
      ).toBe(sha);
    }
  });

  it('vienen con cabecera de vendorizado y eslint-disable', () => {
    for (const nombre of Object.keys(SHA_CUERPOS)) {
      const txt = readFileSync(resolve(DIR, nombre), 'utf8');
      expect(txt).toContain('COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO');
      expect(txt).toContain('/* eslint-disable */');
    }
  });

  it('conservan el notice MIT de Sylva / Token-Gremlin', () => {
    // Los cuerpos son los originales: FollajeMasa y lodEspecieSylva son los
    // portados de Sylva (realistic-forest) y llevan la atribución inline.
    const follaje = readFileSync(resolve(DIR, 'FollajeMasa.js'), 'utf8');
    expect(follaje).toContain('Token Gremlin');
    expect(follaje).toContain('MIT');
    const lod = readFileSync(resolve(DIR, 'lodEspecieSylva.js'), 'utf8');
    expect(lod).toContain('Token Gremlin');
    expect(lod).toContain('MIT');
  });
});

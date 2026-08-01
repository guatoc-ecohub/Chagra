/*
 * vida infra — el contrato ANTI-FABRICACIÓN de la infraestructura viva.
 *
 * En jsdom no hay WebGL (ni Canvas R3F), así que las piezas se verifican con
 * `renderToStaticMarkup` DIRECTO (sin <Canvas>): eso ejecuta toda la lógica
 * condicional de `vida` y deja el árbol R3F como marcado estático comparable.
 * Se usa `reducedMotion` para no tocar useFrame (que exige el store de R3F).
 *
 * Se congela:
 *   · derivarVidaInfra: null → null; finca vacía → nada de matas/cosecha/
 *     animales; estado real → microclima + cosecha + ocupación clasificada.
 *   · sin estadoFinca la pieza es BYTE-IDÉNTICA al catálogo neutro de siempre.
 *   · con estado real, las 6 piezas funcionales suman geometría (ambos tiers).
 *   · finca vacía ("dato en camino") NO fabrica cosecha, animales ni matas.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Infraestructura from '../Infraestructura.jsx';
import { derivarVidaInfra, clasificarAnimales } from '../infraestructuraData.js';

const ESTADO = {
  clima: 'soleado',
  enso: 'nino',
  cosechaReciente: { cultivo: 'papa', mundoId: null },
  saludFinca: { matasVivas: 12, matasTotal: 15, agua: 0.4 },
  animales: [
    { especie: 'Gallina criolla' }, { especie: 'gallo' }, { especie: 'Vaca normanda' },
    { especie: 'cerdo' }, { especie: '' },
  ],
};
const VACIA = { clima: 'lluvia', enso: 'neutro', cosechaReciente: null, animales: [] };
const TIPOS = ['invernadero_tunel', 'invernadero_capilla', 'almacen_bodega', 'galpon', 'establo', 'gallinero_campo'];

const html = (tipo, estadoFinca, tier) =>
  renderToStaticMarkup(
    <Infraestructura tipo={tipo} tier={tier} reducedMotion estadoFinca={estadoFinca} dims={[1,1,1]} params={{}} />,
  );
const nMesh = (s) => (s.match(/<mesh/g) || []).length;

describe('vida infra (verificación runtime sin Canvas)', () => {
  it('deriva vida real y respeta anti-fabricación', () => {
    expect(derivarVidaInfra(null)).toBeNull();
    const vacia = derivarVidaInfra(VACIA);
    expect(vacia.microclima.matas).toBe(false);
    expect(vacia.cosecha).toBeNull();
    expect(vacia.ocupacion.total).toBe(0);
    expect(vacia.microclima.refugio).toBe(false);
    const v = derivarVidaInfra(ESTADO);
    expect(v.microclima).toEqual({ activo: true, matas: true, refugio: true });
    expect(v.cosecha).toEqual({ cultivo: 'papa' });
    expect(v.ocupacion).toEqual({ aves: 2, bovinos: 1, otros: 2, total: 5 });
    expect(clasificarAnimales(null).total).toBe(0);
  });

  it('sin estadoFinca la pieza es EXACTAMENTE la neutra de siempre', () => {
    for (const tipo of TIPOS) {
      for (const tier of ['alto', 'bajo']) {
        expect(html(tipo, null, tier)).toBe(html(tipo, undefined, tier));
      }
    }
  });

  it('con estadoFinca real todas las piezas suman geometría de vida (ambos tiers)', () => {
    for (const tipo of TIPOS) {
      for (const tier of ['alto', 'bajo']) {
        const neutro = html(tipo, null, tier);
        const vivo = html(tipo, ESTADO, tier);
        expect(nMesh(vivo)).toBeGreaterThan(nMesh(neutro));
      }
    }
  });

  it('finca vacía (dato en camino) NO fabrica cosecha/animales/matas', () => {
    // El único delta permitido es el microclima físico del invernadero.
    for (const tipo of ['almacen_bodega', 'galpon', 'establo', 'gallinero_campo']) {
      expect(html(tipo, VACIA, 'alto')).toBe(html(tipo, null, 'alto'));
    }
  });
});

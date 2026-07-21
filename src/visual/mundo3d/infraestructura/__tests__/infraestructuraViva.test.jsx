/*
 * InfraestructuraViva — el drop-in que se alimenta solo de useFincaViva.
 *
 * En jsdom no hay WebGL (ni Canvas R3F), así que se verifica con
 * `renderToStaticMarkup` DIRECTO (sin <Canvas>) — el mismo truco que
 * `vidaInfra.test.jsx` usa para <Infraestructura>. Se mockea `useFincaViva`
 * (su propio hook interno, no la vitrina) para controlar el `estadoFinca` y
 * comprobar el ÚNICO contrato de este wrapper: reenvía TODOS los props tal
 * cual a <Infraestructura>, agregando `estadoFinca` = lo que devuelva el hook.
 *
 * Se congela:
 *   · con useFincaViva() → estado real: el marcado es BYTE-IDÉNTICO al de
 *     <Infraestructura estadoFinca={ESE_ESTADO} .../> con los mismos props.
 *   · con useFincaViva() → null (finca "en camino"): el marcado es
 *     BYTE-IDÉNTICO a la pieza neutra del catálogo (contrato anti-fabricación
 *     heredado, sin fingir finca).
 *   · props ajenos a estadoFinca (tipo/dims/params/tier/pos/rot/reducedMotion)
 *     llegan intactos al dispatcher.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Infraestructura from '../Infraestructura.jsx';

const ESTADO = {
  clima: 'soleado',
  enso: 'nino',
  cosechaReciente: { cultivo: 'papa', mundoId: null },
  saludFinca: { matasVivas: 12, matasTotal: 15, agua: 0.4 },
  animales: [{ especie: 'Gallina criolla' }, { especie: 'Vaca normanda' }],
};

let estadoMock = ESTADO;
vi.mock('../../useFincaViva.js', () => ({
  useFincaViva: () => estadoMock,
}));

// Import DESPUÉS del mock (hoisted de todas formas, pero explícito por claridad).
const { default: InfraestructuraViva } = await import('../InfraestructuraViva.jsx');

afterEach(() => {
  estadoMock = ESTADO;
});

const TIPOS = ['invernadero_tunel', 'almacen_bodega', 'galpon', 'gallinero_campo'];

describe('InfraestructuraViva (drop-in alimentado por useFincaViva)', () => {
  it('con estado real: idéntico a <Infraestructura estadoFinca={ese estado} .../>', () => {
    estadoMock = ESTADO;
    for (const tipo of TIPOS) {
      for (const tier of ['alto', 'bajo']) {
        const viva = renderToStaticMarkup(
          <InfraestructuraViva tipo={tipo} tier={tier} reducedMotion />,
        );
        const directo = renderToStaticMarkup(
          <Infraestructura tipo={tipo} tier={tier} reducedMotion estadoFinca={ESTADO} />,
        );
        expect(viva).toBe(directo);
        // y de verdad refleja vida (no es la pieza neutra por accidente)
        const neutro = renderToStaticMarkup(
          <Infraestructura tipo={tipo} tier={tier} reducedMotion />,
        );
        expect(viva).not.toBe(neutro);
      }
    }
  });

  it('sin dato real (useFincaViva → null): byte-idéntico a la pieza neutra del catálogo', () => {
    estadoMock = null;
    for (const tipo of TIPOS) {
      const viva = renderToStaticMarkup(<InfraestructuraViva tipo={tipo} tier="alto" reducedMotion />);
      const neutro = renderToStaticMarkup(
        <Infraestructura tipo={tipo} tier="alto" reducedMotion />,
      );
      expect(viva).toBe(neutro);
    }
  });

  it('reenvía tipo/dims/params/tier/pos/rot/reducedMotion intactos al dispatcher', () => {
    estadoMock = ESTADO;
    const props = {
      tipo: 'invernadero_tunel',
      pos: [2, 0, -1],
      rot: 0.4,
      dims: { largo: 20, ancho: 5, alto: 3 },
      params: { color: 'x' },
      tier: 'bajo',
      reducedMotion: true,
    };
    const viva = renderToStaticMarkup(<InfraestructuraViva {...props} />);
    const directo = renderToStaticMarkup(<Infraestructura {...props} estadoFinca={ESTADO} />);
    expect(viva).toBe(directo);
    // las dims custom (20×5×3) sí llegaron: distinto del default del catálogo
    const conDefaults = renderToStaticMarkup(
      <Infraestructura tipo={props.tipo} tier={props.tier} reducedMotion estadoFinca={ESTADO} />,
    );
    expect(viva).not.toBe(conDefaults);
  });

  it('tipo desconocido no dibuja nada (ni siquiera intenta leer estadoFinca real)', () => {
    estadoMock = ESTADO;
    expect(renderToStaticMarkup(<InfraestructuraViva tipo="no_existe" />)).toBe('');
  });
});

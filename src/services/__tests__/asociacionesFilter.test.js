import { describe, expect, test } from 'vitest';

import arquetipos from '../../data/asociaciones-arquetipos.json';
import comparativas from '../../data/asociaciones-comparativa.json';
import {
  buildAsociacionesView,
  filterAsociacionesByRole,
  getCultivosFromPlants,
  metricasFromComparativa,
  selectCultivoInicial,
} from '../asociacionesFilter';

describe('asociacionesFilter', () => {
  test('mantiene filtrado por rol y bypass operador', () => {
    expect(filterAsociacionesByRole(arquetipos, { rol: 'urbano' }).map((item) => item.id)).toEqual([
      'hortaliza_repelente',
    ]);
    expect(filterAsociacionesByRole(arquetipos, { rol: 'urbano' }, { esOperador: true })).toHaveLength(arquetipos.length);
  });

  test('selecciona cultivo inicial desde plantas de finca antes del fallback', () => {
    const cultivo = selectCultivoInicial(arquetipos, { rol: 'campesino' }, { cultivosFinca: ['coffea_arabica'] });

    expect(cultivo).toBe('cafe');
  });

  test('extrae cultivos desde assets de planta sin persistir nada', () => {
    const cultivos = getCultivosFromPlants([
      { attributes: { species_slug: 'zea_mays', name: 'Maíz lote 1' } },
      { attributes: { species_slug: 'zea_mays', name: 'Maíz lote 2' } },
      { attributes: { species: { name: 'theobroma_cacao' } } },
    ]);

    expect(cultivos).toEqual(['zea_mays', 'theobroma_cacao']);
  });

  test('formatea solo cifras existentes en asociaciones-comparativa', () => {
    const milpa = comparativas.find((item) => item.id === 'milpa-maiz-frijol-ahuyama');
    const cafe = comparativas.find((item) => item.id === 'cafe-sombrio-guamo');

    expect(metricasFromComparativa(milpa)).toEqual(expect.arrayContaining([
      'LER aprox. 2',
      'fijación N 12-60%',
      'arvenses -24-55%',
      'plaga -23%',
    ]));
    expect(metricasFromComparativa(cafe)).toEqual(expect.arrayContaining([
      'fijación N 168 kg/ha',
      'sombra 30-50%',
      'carbono 118 Mg C/ha',
    ]));
  });

  test('construye recomendaciones por cultivo con compañeras, antagonistas y comparativa', () => {
    const view = buildAsociacionesView(arquetipos, comparativas, { rol: 'campesino' }, { cultivoSeleccionado: 'maiz' });
    const milpa = view.recomendaciones.find((item) => item.id === 'milpa');

    expect(view.cultivoSeleccionado).toBe('maiz');
    expect(milpa.companeras.map((cultivo) => cultivo.nombre)).toEqual(['fríjol', 'ahuyama']);
    expect(milpa.antagonistasCultivo.map((ant) => ant.evitar)).toEqual(['hinojo']);
    expect(milpa.comparativa.id).toBe('milpa-maiz-frijol-ahuyama');
  });
});

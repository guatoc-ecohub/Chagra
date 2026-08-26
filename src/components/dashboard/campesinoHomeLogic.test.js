import { describe, expect, it } from 'vitest';
import { CAMPESINO_HOME_ACTIONS, CAMPESINO_HOME_SECONDARY_ACTIONS } from './campesinoHomeActions';
import { canonicalizeCampesinoRoute, selectActionDay } from './campesinoHomeLogic';

describe('CampesinoHome: contenido y rutas canónicas', () => {
  it('expone cuatro preguntas campesinas con entradas diferenciadas', () => {
    expect(CAMPESINO_HOME_ACTIONS.map((action) => action.title)).toEqual([
      '¿Qué siembro?',
      '¿Tengo plaga?',
      '¿Cómo va el clima?',
      'Registrar hablando',
    ]);
    expect(CAMPESINO_HOME_ACTIONS.map((action) => action.view)).toEqual([
      'mundo_cultivos',
      'directorio',
      'clima_boletin',
      'registro_unificado',
    ]);
    expect(CAMPESINO_HOME_SECONDARY_ACTIONS.find((action) => action.id === 'mercado')).toMatchObject({
      label: 'Precio y mercado',
      view: 'mercados',
    });
  });

  it('elige una alerta real antes que una tarea y conserva su detalle', () => {
    const action = selectActionDay(
      [{ severity: 'warning', type: 'clima', message: 'Lluvia fuerte esta tarde' }],
      { title: 'Revisar el semillero' },
      '',
    );
    expect(action).toMatchObject({ kind: 'alerta', view: 'hoy_finca', detail: 'Lluvia fuerte esta tarde' });
  });

  it('elige una tarea real cuando no hay alerta', () => {
    expect(selectActionDay([], { title: 'Pasar revista a las matas' }, '')).toMatchObject({
      kind: 'tarea',
      detail: 'Pasar revista a las matas',
    });
  });

  it('no inventa una recomendación cuando no hay datos', () => {
    expect(selectActionDay([], null, '')).toBeNull();
  });

  it('resuelve mercado y voz a una ruta única', () => {
    expect(canonicalizeCampesinoRoute('mercado')).toBe('mercados');
    expect(canonicalizeCampesinoRoute('mercados')).toBe('mercados');
    expect(canonicalizeCampesinoRoute('voz')).toBe('registro_unificado');
    expect(canonicalizeCampesinoRoute('registro_voz')).toBe('registro_unificado');
  });
});

import { describe, it, expect } from 'vitest';
import { detectMetaAyudaIntent } from '../metaAyudaIntent.js';

/**
 * Tests del detector de intención META/how-to («¿cómo uso Chagra?»). El
 * contrato clave es de PRECISIÓN: NO robar consultas agronómicas. Ver
 * metaAyudaIntent.js.
 */
describe('detectMetaAyudaIntent — SÍ es meta (sobre la app)', () => {
  const metaQueries = [
    '¿Qué puede hacer Chagra?',
    '¿Qué funciones tiene la app?',
    '¿Qué sabes hacer?',
    '¿En qué me ayudas?',
    '¿Cómo registro una cosecha?',
    '¿Cómo anoto lo que vi hoy?',
    '¿Cómo agrego una planta?',
    '¿Cómo uso la app?',
    '¿Dónde veo los precios?',
    '¿Dónde está el mapa de la finca?',
    '¿Cómo abro el cuaderno de campo?',
    'no sé cómo usar esto',
  ];
  for (const q of metaQueries) {
    it(`meta: "${q}"`, () => {
      const r = detectMetaAyudaIntent(q);
      expect(r.isMeta).toBe(true);
      expect(['capabilities', 'howto']).toContain(r.kind);
      expect(r.consulta).toBeTruthy();
    });
  }

  it('«qué puede hacer» → kind capabilities', () => {
    expect(detectMetaAyudaIntent('¿qué puede hacer Chagra?').kind).toBe('capabilities');
  });
});

describe('detectMetaAyudaIntent — NO es meta (agronómico)', () => {
  const agroQueries = [
    '¿Cómo siembro maíz?',
    '¿Cómo controlo la broca del café?',
    '¿Cómo preparo un caldo bordelés?',
    '¿Cómo cosecho la papa?',
    '¿Qué le echo al pulgón?',
    '¿Cuándo siembro el frijol?',
    '¿Dónde consigo semilla de arveja?',
    '¿Cómo va mi chagra este año?',
    'para qué sirve el neem',
    '¿qué plaga tiene mi tomate?',
  ];
  for (const q of agroQueries) {
    it(`NO meta: "${q}"`, () => {
      expect(detectMetaAyudaIntent(q).isMeta).toBe(false);
    });
  }
});

describe('detectMetaAyudaIntent — guardas', () => {
  it('vacío / no-string → no meta', () => {
    expect(detectMetaAyudaIntent('').isMeta).toBe(false);
    expect(detectMetaAyudaIntent(null).isMeta).toBe(false);
    expect(detectMetaAyudaIntent(undefined).isMeta).toBe(false);
  });
});

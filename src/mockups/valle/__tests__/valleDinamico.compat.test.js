/*
 * LA RED DE SEGURIDAD DEL VALLE DINÁMICO (spec paso 2).
 *
 * El valle dejó de ser un array fijo y pasó a sembrarse del perfil de la finca.
 * Toda esa migración se sostiene sobre UNA garantía dura:
 *
 *     construirLugaresValle(PERFIL_FINCA_DEMO) === los lugares de siempre
 *
 * Si esta suite se pone roja, alguien le quitó un lugar al valle de todo el
 * mundo. Aquí también se prueba la regla no destructiva: un dato que FALTA
 * nunca resta — solo una respuesta EXPLÍCITA cambia el mundo.
 */
import { describe, test, expect } from 'vitest';
import {
  MUNDOS_VALLE,
  construirLugaresValle,
  construirMundosValle,
} from '../valleData.js';
import {
  PERFIL_FINCA_DEMO,
  derivarPerfilFinca,
} from '../../../services/perfilFincaService.js';

/** Los ids del valle tal como estaban ANTES de que fuera dinámico. */
const IDS_DE_SIEMPRE = [
  'agua',
  'cafe',
  'cultivos',
  'suelo',
  'sanidad',
  'animales',
  'disenio',
  'clima',
  'mercado',
  'semillero',
  'micorrizas',
  'abono',
  'aprender',
  'paramo',
];

describe('construirLugaresValle — compatibilidad con el valle de siempre', () => {
  test('el perfil de DEMO devuelve EXACTAMENTE los lugares actuales', () => {
    const lugares = construirLugaresValle(PERFIL_FINCA_DEMO);
    expect(lugares.map((l) => l.id)).toEqual(IDS_DE_SIEMPRE);
  });

  test('los lugares del demo son idénticos a los que consume el valle hoy', () => {
    const mundos = construirMundosValle(PERFIL_FINCA_DEMO);
    // Mismo contenido, mismo orden, mismas props resueltas del manifiesto.
    expect(mundos).toEqual(MUNDOS_VALLE);
  });

  test('sin perfil (undefined/null/{}) el valle se ve como hoy — nunca menos', () => {
    for (const p of [undefined, null, {}, { escala: 'basura' }, 42, 'perfil']) {
      expect(construirLugaresValle(p).map((l) => l.id)).toEqual(IDS_DE_SIEMPRE);
    }
  });

  test('un perfil vacío del onboarding (usuario que no contestó nada) tampoco resta', () => {
    const perfil = derivarPerfilFinca({});
    expect(construirLugaresValle(perfil).map((l) => l.id)).toEqual(IDS_DE_SIEMPRE);
  });

  test('cada lugar conserva su geometría cruda (pos/escala/tipo)', () => {
    const lugares = construirLugaresValle(PERFIL_FINCA_DEMO);
    for (const l of lugares) {
      expect(Array.isArray(l.pos)).toBe(true);
      expect(l.pos).toHaveLength(3);
      expect(typeof l.escala).toBe('number');
      expect(typeof l.tipo).toBe('string');
    }
  });
});

describe('construirLugaresValle — el valle se siembra del perfil', () => {
  test('un BALCÓN recibe un mundo íntimo, sin potrero ni cafetal ni páramo', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'balcon' });
    const ids = construirLugaresValle(perfil).map((l) => l.id);
    expect(ids).not.toContain('animales');
    expect(ids).not.toContain('cafe');
    expect(ids).not.toContain('paramo');
    expect(ids).not.toContain('disenio');
    // Pero la mata, el suelo y el saber siguen ahí: nunca un mundo vacío.
    expect(ids).toEqual(expect.arrayContaining(['cultivos', 'suelo', 'aprender']));
    expect(ids.length).toBeGreaterThan(0);
  });

  test('una finca INVERNADERO conserva su invernadero y su mercado', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'invernadero' });
    const ids = construirLugaresValle(perfil).map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(['semillero', 'mercado', 'agua']));
    expect(ids).not.toContain('animales');
  });

  test('quien dijo que NO tiene animales no recibe potrero', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'rural', animales: ['ninguno'] });
    expect(construirLugaresValle(perfil).map((l) => l.id)).not.toContain('animales');
  });

  test('quien SÍ tiene gallinas conserva su potrero', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'rural', animales: ['gallinas'] });
    expect(construirLugaresValle(perfil).map((l) => l.id)).toContain('animales');
  });

  test('quien NO contestó por animales conserva el potrero (el dato falta, no resta)', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'rural' });
    expect(construirLugaresValle(perfil).map((l) => l.id)).toContain('animales');
  });

  test('quien dijo que no tiene invernadero no recibe semillero', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'rural', invernadero_tiene: 'no' });
    expect(construirLugaresValle(perfil).map((l) => l.id)).not.toContain('semillero');
  });

  test('en el páramo no hay cafetal; en tierra caliente no hay páramo', () => {
    const arriba = derivarPerfilFinca({ finca_tipo: 'rural', finca_altitud: '3400' });
    const idsArriba = construirLugaresValle(arriba).map((l) => l.id);
    expect(idsArriba).not.toContain('cafe');
    expect(idsArriba).toContain('paramo');

    const abajo = derivarPerfilFinca({ finca_tipo: 'rural', finca_altitud: '600' });
    const idsAbajo = construirLugaresValle(abajo).map((l) => l.id);
    expect(idsAbajo).toContain('cafe');
    expect(idsAbajo).not.toContain('paramo');
  });

  test('un mundo AGREGADO a mano entra aunque su escala no lo siembre', () => {
    const perfil = {
      ...derivarPerfilFinca({ finca_tipo: 'balcon' }),
      mundosActivos: ['paramo', 'animales'],
    };
    const ids = construirLugaresValle(perfil).map((l) => l.id);
    expect(ids).toContain('paramo');
    expect(ids).toContain('animales');
  });

  test('el orden del catálogo se respeta siempre (el director compone sobre él)', () => {
    const perfil = derivarPerfilFinca({ finca_tipo: 'rural', animales: ['ninguno'] });
    const ids = construirLugaresValle(perfil).map((l) => l.id);
    const esperado = IDS_DE_SIEMPRE.filter((id) => ids.includes(id));
    expect(ids).toEqual(esperado);
  });
});

describe('derivarPerfilFinca — la ubicación sale del perfil, no del build', () => {
  test('perfil vacío = perfil de demo (nada declarado)', () => {
    const p = derivarPerfilFinca({});
    expect(p.ubicacion.fuente).toBe('demo');
    expect(p.pisoTermico).toBeNull();
    expect(p.escala).toBe('finca');
    expect(p.declarado.ubicacion).toBe(false);
  });

  test('lo que captura el onboarding queda tipado en el perfil', () => {
    const p = derivarPerfilFinca({
      ubicacion_lat: 4.526,
      ubicacion_lng: -73.922,
      finca_altitud: '2450',
      municipio: 'Choachí',
      departamento: 'Cundinamarca',
      vereda: 'Potrero Grande',
      piso_termico: 'frio',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
      invernadero_forma: 'cuadrado',
      animales: ['gallinas', 'cerdos'],
      cultivos_actuales: 'café, mora',
      riego: 'acequia',
    });
    expect(p.ubicacion).toMatchObject({
      lat: 4.526,
      lon: -73.922,
      altitudMsnm: 2450,
      municipio: 'Choachí',
      departamento: 'Cundinamarca',
      vereda: 'Potrero Grande',
      fuente: 'perfil',
    });
    expect(p.pisoTermico).toBe('frio');
    expect(p.escala).toBe('finca');
    expect(p.invernadero).toEqual({ tipo: 'cuadrado', tamano: null });
    expect(p.animales).toEqual(['gallinas', 'cerdos']);
    expect(p.cultiva).toEqual(['café', 'mora']);
    expect(p.agua).toBe('quebrada');
    expect(p.declarado.ubicacion).toBe(true);
  });

  test('el piso térmico se deduce de la altitud cuando falta el slug', () => {
    expect(derivarPerfilFinca({ finca_altitud: '3200' }).pisoTermico).toBe('paramo');
    expect(derivarPerfilFinca({ finca_altitud: '2400' }).pisoTermico).toBe('frio');
    expect(derivarPerfilFinca({ finca_altitud: '1500' }).pisoTermico).toBe('templado');
    expect(derivarPerfilFinca({ finca_altitud: '600' }).pisoTermico).toBe('calido');
  });

  test('el piso térmico NUNCA sale del env de demo (no le recorta el valle a nadie)', () => {
    // Sin ubicación en el perfil, el piso queda null aunque el build tenga
    // VITE_FARM_THERMAL_ZONES: por eso el valle de un usuario nuevo es completo.
    expect(derivarPerfilFinca({ finca_tipo: 'rural' }).pisoTermico).toBeNull();
  });
});

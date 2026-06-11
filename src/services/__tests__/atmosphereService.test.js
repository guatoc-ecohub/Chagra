/**
 * atmosphereService — capa de MODULACIÓN CLIMÁTICA de los temas (2026-06-11).
 *
 * Contrato bajo test:
 *  - deriveLuz(now, location)        → 'amanecer' | 'dia' | 'atardecer' | 'noche'
 *  - deriveCondicion({...})          → 'despejado' | 'nublado' | 'lluvia' | 'niebla' | null
 *  - deriveEnso(snapshot)            → 'nina' | 'nino' | 'neutral' | null
 *  - applyAtmosphere(atm)            → escribe data-clima / data-luz / data-enso en <html>
 *  - kill-switch + calibración       → localStorage `chagra:atmosfera*` + var --w-cal
 *
 * Principios (mismos del prompt de diseño):
 *  - La identidad del tema MANDA: esta capa solo emite ATRIBUTOS; el CSS decide
 *    cuánto matizar. Sin señal suficiente → null → cero modulación (tema puro).
 *  - Offline-first: la luz (reloj + efemérides) funciona SIN red; la condición
 *    solo si hay snapshot cacheado de climaService.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  deriveLuz,
  deriveCondicion,
  deriveEnso,
  deriveAtmosphere,
  applyAtmosphere,
  clearAtmosphere,
  isAtmosphereEnabled,
  setAtmosphereCalibration,
  getAtmosphereCalibration,
  ATMOSPHERE_KILL_KEY,
  ATMOSPHERE_CAL_KEY,
} from '../atmosphereService.js';
import { solarTimes } from '../../utils/skyEphemeris.js';

// Choachí, Cundinamarca — el caso de referencia del operador (frío, nublado).
const CHOACHI = { lat: 4.53, lng: -73.92, elevation: 2580 };
const DATE = new Date('2026-06-11T12:00:00-05:00');

function snapshotWith(day, extra = {}) {
  return {
    openmeteo: { available: true, forecast_7d: [day] },
    ...extra,
  };
}

beforeEach(() => {
  localStorage.clear();
  clearAtmosphere();
  document.documentElement.style.removeProperty('--w-cal');
});

afterEach(() => {
  clearAtmosphere();
});

describe('deriveLuz — período de luz por efemérides solares (offline, reloj)', () => {
  const st = solarTimes(DATE, CHOACHI.lat, CHOACHI.lng);

  test('mediodía solar → dia', () => {
    expect(deriveLuz(st.solarNoon, CHOACHI)).toBe('dia');
  });

  test('cerca del amanecer (+10 min del sunrise) → amanecer', () => {
    const t = new Date(st.sunrise.getTime() + 10 * 60_000);
    expect(deriveLuz(t, CHOACHI)).toBe('amanecer');
  });

  test('cerca del atardecer (-10 min del sunset) → atardecer', () => {
    const t = new Date(st.sunset.getTime() - 10 * 60_000);
    expect(deriveLuz(t, CHOACHI)).toBe('atardecer');
  });

  test('3 horas después del sunset → noche', () => {
    const t = new Date(st.sunset.getTime() + 3 * 60 * 60_000);
    expect(deriveLuz(t, CHOACHI)).toBe('noche');
  });

  test('sin coordenadas cae al heurístico horario ecuatorial (no crashea)', () => {
    const out = deriveLuz(DATE, null);
    expect(['amanecer', 'dia', 'atardecer', 'noche']).toContain(out);
  });
});

describe('deriveCondicion — estado del cielo a partir del snapshot de climaService', () => {
  test('precipitación fuerte (>=10mm hoy) → lluvia', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 14.7, temp_max_c: 18 });
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe('lluvia');
  });

  test('llovizna (2-10mm) → nublado', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 3.2, temp_max_c: 19 });
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe('nublado');
  });

  test('cloud cover alto (>=60%) sin lluvia → nublado', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 0, cloud_cover_pct: 85 });
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe('nublado');
  });

  test('cloud cover bajo (<60%) sin lluvia → despejado', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 0, cloud_cover_pct: 20 });
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe('despejado');
  });

  test('sin señal de nubosidad ni lluvia → null (tema puro, sin adivinar)', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 0 });
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe(null);
  });

  test('sin snapshot → null', () => {
    expect(deriveCondicion({ snapshot: null, now: DATE, luz: 'dia' })).toBe(null);
  });

  test('piso térmico frío alto (>=2600m) + cielo cubierto → niebla', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 0, cloud_cover_pct: 90 });
    expect(
      deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia', elevation: 3100 })
    ).toBe('niebla');
  });

  test('clima frío (>=2000m) + amanecer + nubes → niebla matinal', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 0, cloud_cover_pct: 70 });
    expect(
      deriveCondicion({ snapshot: snap, now: DATE, luz: 'amanecer', elevation: CHOACHI.elevation })
    ).toBe('niebla');
  });

  test('la lluvia gana sobre la niebla (precip fuerte en páramo sigue siendo lluvia)', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 22, cloud_cover_pct: 95 });
    expect(
      deriveCondicion({ snapshot: snap, now: DATE, luz: 'amanecer', elevation: 3200 })
    ).toBe('lluvia');
  });

  test('campo `estado` explícito del sidecar (forward-compat) gana sobre heurísticas', () => {
    const snap = snapshotWith({ date: '2026-06-11', precip_mm: 0, estado: 'niebla' });
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe('niebla');
  });

  test('elige el día del forecast que coincide con HOY, no el índice 0 stale', () => {
    const snap = {
      openmeteo: {
        available: true,
        forecast_7d: [
          { date: '2026-06-10', precip_mm: 30 }, // ayer, llovió
          { date: '2026-06-11', precip_mm: 0, cloud_cover_pct: 10 }, // hoy, despejado
        ],
      },
    };
    expect(deriveCondicion({ snapshot: snap, now: DATE, luz: 'dia' })).toBe('despejado');
  });
});

describe('deriveEnso — fase macro para sesgo húmedo/seco', () => {
  test.each([
    ['nina_moderada', 'nina'],
    ['nina_fuerte', 'nina'],
    ['nino_debil', 'nino'],
    ['neutral', 'neutral'],
  ])('%s → %s', (phase, expected) => {
    expect(deriveEnso({ enso_status: { phase } })).toBe(expected);
  });

  test('sin enso_status → null', () => {
    expect(deriveEnso(null)).toBe(null);
    expect(deriveEnso({})).toBe(null);
  });
});

describe('applyAtmosphere — atributos data-* en <html> (la única escritura DOM)', () => {
  test('escribe data-clima + data-luz + data-enso', () => {
    applyAtmosphere({ condicion: 'lluvia', luz: 'dia', enso: 'nina' });
    const el = document.documentElement;
    expect(el.getAttribute('data-clima')).toBe('lluvia');
    expect(el.getAttribute('data-luz')).toBe('dia');
    expect(el.getAttribute('data-enso')).toBe('nina');
  });

  test('condicion null → quita data-clima (tema puro), luz queda', () => {
    applyAtmosphere({ condicion: 'nublado', luz: 'dia', enso: 'neutral' });
    applyAtmosphere({ condicion: null, luz: 'noche', enso: null });
    const el = document.documentElement;
    expect(el.hasAttribute('data-clima')).toBe(false);
    expect(el.getAttribute('data-luz')).toBe('noche');
    expect(el.hasAttribute('data-enso')).toBe(false);
  });

  test('enso neutral NO sesga (no escribe data-enso)', () => {
    applyAtmosphere({ condicion: 'despejado', luz: 'dia', enso: 'neutral' });
    expect(document.documentElement.hasAttribute('data-enso')).toBe(false);
  });

  test('kill-switch localStorage → no escribe nada y limpia lo previo', () => {
    applyAtmosphere({ condicion: 'lluvia', luz: 'noche', enso: 'nina' });
    localStorage.setItem(ATMOSPHERE_KILL_KEY, 'off');
    expect(isAtmosphereEnabled()).toBe(false);
    applyAtmosphere({ condicion: 'lluvia', luz: 'noche', enso: 'nina' });
    const el = document.documentElement;
    expect(el.hasAttribute('data-clima')).toBe(false);
    expect(el.hasAttribute('data-luz')).toBe(false);
  });
});

describe('deriveAtmosphere — integración (snapshot+ubicación → atm completa)', () => {
  test('Choachí nublado de día con Niña', () => {
    const st = solarTimes(DATE, CHOACHI.lat, CHOACHI.lng);
    const snap = snapshotWith(
      { date: '2026-06-11', precip_mm: 4, temp_max_c: 17 },
      { enso_status: { phase: 'nina_debil' } }
    );
    const atm = deriveAtmosphere({ snapshot: snap, now: st.solarNoon, location: CHOACHI });
    expect(atm).toEqual({ condicion: 'nublado', luz: 'dia', enso: 'nina' });
  });

  test('sin snapshot (offline sin cache) → luz sola, condicion/enso null', () => {
    const st = solarTimes(DATE, CHOACHI.lat, CHOACHI.lng);
    const t = new Date(st.sunset.getTime() + 2 * 60 * 60_000);
    const atm = deriveAtmosphere({ snapshot: null, now: t, location: CHOACHI });
    expect(atm).toEqual({ condicion: null, luz: 'noche', enso: null });
  });
});

describe('calibración — hook para sensores en campo (futuro)', () => {
  test('set/get persiste y escribe --w-cal en <html>', () => {
    setAtmosphereCalibration(1.2);
    expect(getAtmosphereCalibration()).toBe(1.2);
    expect(document.documentElement.style.getPropertyValue('--w-cal')).toBe('1.2');
    expect(localStorage.getItem(ATMOSPHERE_CAL_KEY)).toBe('1.2');
  });

  test('clampa al rango seguro [0, 1.5] (accesibilidad: el velo nunca explota)', () => {
    setAtmosphereCalibration(9);
    expect(getAtmosphereCalibration()).toBe(1.5);
    setAtmosphereCalibration(-1);
    expect(getAtmosphereCalibration()).toBe(0);
  });

  test('valor inválido cae a 1 (neutro)', () => {
    setAtmosphereCalibration('banana');
    expect(getAtmosphereCalibration()).toBe(1);
  });
});

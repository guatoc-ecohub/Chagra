/**
 * climaEscenaEstado — el estado de la escena y las lecturas pedagógicas.
 * Puro (sin DOM). Cubre el contrato del spec 2026-09-06-unificar-2d-clima:
 *  - D-2: manda atmosphereService (adaptador Open-Meteo → deriveCondicion).
 *  - D-4/CA-6: sin dato no hay condición ni lectura inventada.
 *  - D-5: override SOLO por query param, validado.
 *  - D-3: la helada es alerta (del snapshot o derivada con regla explícita).
 */
import { describe, it, expect } from 'vitest';
import {
  estadoEscena, snapshotDesdeAgrometeo, estadoDesdeWmo, leerOverrideEscena,
  lecturaDelCielo, riesgoHelada, saludoPorHora, formatoMsnm, etiquetaPiso, ensoDesdeFase, fmtCifra,
} from './climaEscenaEstado.js';

const GUATAVITA = { lat: 4.9345, lng: -73.8331, elevation: 2680, municipio: 'Guatavita' };
const MEDIODIA = new Date(2026, 8, 5, 12, 30, 0); // día franco en Colombia

function agrometeo({ cloud = 20, precip = 0, weather = { label: 'Despejado', emoji: '☀️', family: 'sol' }, tmin = 9, uv = 9, eto = 3.7, prob = 10 } = {}) {
  const today = { date: '2026-09-05', precip_mm: precip, cloud_mean: cloud, temp_min: tmin, temp_max: 18, uv_max: uv, eto_mm: eto, precip_prob: prob };
  return {
    available: true,
    elevation: 2680,
    now: { temp: 16, aparente: 13, rh: 62, cloud, precip: 0, weather },
    today,
    daily: [today, { date: '2026-09-06', precip_mm: 1, cloud_mean: 50 }],
  };
}

describe('estadoEscena — manda el servicio', () => {
  it('sin snapshot y sin agrometeo → sin condición; la luz sale del reloj', () => {
    const e = estadoEscena({ now: MEDIODIA, location: GUATAVITA });
    expect(e.condicion).toBeNull();
    expect(e.luz).toBe('dia');
    expect(e.fuente).toBeNull();
    expect(e.forzado).toBe(false);
  });

  it('Open-Meteo directo con nubosidad ≥ 60 % → nublado (umbral de atmosphereService)', () => {
    const e = estadoEscena({ now: MEDIODIA, location: GUATAVITA, agrometeo: agrometeo({ cloud: 75 }) });
    expect(e.condicion).toBe('nublado');
    expect(e.fuente).toBe('openmeteo');
  });

  it('Open-Meteo directo con 20 % de nubes → despejado', () => {
    const e = estadoEscena({ now: MEDIODIA, location: GUATAVITA, agrometeo: agrometeo({ cloud: 20 }) });
    expect(e.condicion).toBe('despejado');
  });

  it('el código WMO de lluvia AHORA gana aunque el acumulado diario sea bajo', () => {
    const e = estadoEscena({
      now: MEDIODIA, location: GUATAVITA,
      agrometeo: agrometeo({ cloud: 90, precip: 1.8, weather: { label: 'Lluvia', emoji: '🌧️', family: 'lluvia' } }),
    });
    expect(e.condicion).toBe('lluvia');
  });

  it('piso frío alto (2 680 m) con cielo cubierto ≥ 80 % → niebla (regla del servicio)', () => {
    const e = estadoEscena({ now: MEDIODIA, location: GUATAVITA, agrometeo: agrometeo({ cloud: 85 }) });
    expect(e.condicion).toBe('niebla');
  });

  it('el snapshot del sidecar manda sobre el Open-Meteo directo', () => {
    const snapshot = { openmeteo: { available: true, forecast_7d: [{ date: '2026-09-05', precip_mm: 14, cloud_cover: 90 }] } };
    const e = estadoEscena({ now: MEDIODIA, location: GUATAVITA, snapshot, agrometeo: agrometeo({ cloud: 10 }) });
    expect(e.condicion).toBe('lluvia');
    expect(e.fuente).toBe('sidecar');
  });

  it('?clima= y ?luz= fuerzan el estado solo para el gate y lo marcan como forzado', () => {
    const e = estadoEscena({ now: MEDIODIA, location: GUATAVITA, agrometeo: agrometeo({ cloud: 10 }), search: '?clima=niebla&luz=noche' });
    expect(e.condicion).toBe('niebla');
    expect(e.luz).toBe('noche');
    expect(e.forzado).toBe(true);
  });

  it('un override inválido se ignora', () => {
    expect(leerOverrideEscena('?clima=tornado&luz=mediodia')).toEqual({ clima: null, luz: null });
    expect(leerOverrideEscena('?clima=sol')).toEqual({ clima: 'despejado', luz: null });
    expect(leerOverrideEscena('')).toEqual({ clima: null, luz: null });
  });

  it('la fase ENSO de ensoService se traduce a nino/nina/neutral', () => {
    expect(ensoDesdeFase('el_nino')).toBe('nino');
    expect(ensoDesdeFase('la_nina')).toBe('nina');
    expect(ensoDesdeFase('neutral')).toBe('neutral');
    expect(ensoDesdeFase(null)).toBeNull();
  });
});

describe('snapshotDesdeAgrometeo — adaptador sin inventar', () => {
  it('devuelve null sin datos', () => {
    expect(snapshotDesdeAgrometeo(null)).toBeNull();
    expect(snapshotDesdeAgrometeo({})).toBeNull();
  });
  it('hoy lleva la nubosidad ACTUAL y el estado WMO; los demás días la media', () => {
    const s = snapshotDesdeAgrometeo(agrometeo({ cloud: 70, weather: { label: 'Neblina', emoji: '🌫️', family: 'nubes' } }));
    expect(s.openmeteo.available).toBe(true);
    expect(s.openmeteo.forecast_7d[0]).toMatchObject({ date: '2026-09-05', cloud_cover: 70, estado: 'niebla' });
    expect(s.openmeteo.forecast_7d[1]).toMatchObject({ date: '2026-09-06', cloud_cover: 50 });
    expect(s.openmeteo.forecast_7d[1].estado).toBeUndefined();
  });
  it('estadoDesdeWmo: lluvia/tormenta → lluvia; neblina → niebla; nubes → null', () => {
    expect(estadoDesdeWmo({ family: 'tormenta' })).toBe('lluvia');
    expect(estadoDesdeWmo({ family: 'nubes', label: 'Nublado' })).toBeNull();
    expect(estadoDesdeWmo(null)).toBeNull();
  });
});

describe('lecturaDelCielo — enseña la causa con el dato real', () => {
  const base = { now: { cloud: 80, rh: 62 }, today: { uv_max: 9, eto_mm: 3.71, precip_mm: 1.8, precip_prob: 94, temp_min: 9 }, piso: 'frio', ensoFamily: 'neutral' };
  it('sin condición no inventa', () => {
    expect(lecturaDelCielo({ ...base, condicion: null, luz: 'dia' })).toBeNull();
  });
  it('nublado: menos sol = menos evaporación, con la ETo real', () => {
    const l = lecturaDelCielo({ ...base, condicion: 'nublado', luz: 'dia' });
    expect(l.texto).toMatch(/cubierto al 80 %/);
    expect(l.texto).toMatch(/3,7 mm/);
    expect(l.fuente).toMatch(/Open-Meteo/);
  });
  it('lluvia: el foliar se lava (mm y probabilidad reales)', () => {
    const l = lecturaDelCielo({ ...base, condicion: 'lluvia', luz: 'dia' });
    expect(l.texto).toMatch(/1,8 mm/);
    expect(l.texto).toMatch(/94 %/);
    expect(l.texto).toMatch(/foliar/);
  });
  it('despejado de noche en piso frío con mínima ≤ 3 °C: la helada, y con El Niño la corrección de la creencia', () => {
    const l = lecturaDelCielo({ ...base, condicion: 'despejado', luz: 'noche', today: { ...base.today, temp_min: 1.5 }, ensoFamily: 'nino' });
    expect(l.texto).toMatch(/helar/);
    expect(l.texto).toMatch(/1,5 °C/);
    expect(l.texto).toMatch(/El Niño en piso frío hay más heladas/);
  });
  it('despejado de día con UV alto: regar temprano o al caer la tarde', () => {
    const l = lecturaDelCielo({ ...base, condicion: 'despejado', luz: 'dia' });
    expect(l.texto).toMatch(/UV 9/);
    expect(l.texto).toMatch(/temprano/);
  });
  it('todo en usted: ni tuteo ni voseo', () => {
    for (const c of ['despejado', 'nublado', 'lluvia', 'niebla']) {
      for (const luz of ['dia', 'noche']) {
        const l = lecturaDelCielo({ ...base, condicion: c, luz, today: { ...base.today, temp_min: 1 } });
        expect(l.texto).not.toMatch(/\b(tu|tú|te|ti|vos|tenés|podés)\b/i);
      }
    }
  });
});

describe('riesgoHelada — alerta, no piel (D-3)', () => {
  it('la alerta local del snapshot manda', () => {
    const h = riesgoHelada({ alertas: [{ tipo: 'helada', mensaje: 'Helada probable la madrugada del sábado', dias: ['sáb 6'] }], today: { temp_min: 12 }, condicion: 'despejado', piso: 'frio' });
    expect(h.origen).toBe('alerta');
    expect(h.dias).toEqual(['sáb 6']);
  });
  it('sin alerta: mínima ≤ 3 °C + despejado + piso frío → derivado con fuente explícita', () => {
    const h = riesgoHelada({ alertas: [], today: { temp_min: 2 }, condicion: 'despejado', piso: 'frio' });
    expect(h.origen).toBe('derivado');
    expect(h.mensaje).toMatch(/2 °C/);
    expect(h.fuente).toMatch(/Estimado por Chagra/);
  });
  it('con nubes o en piso cálido no hay riesgo derivado', () => {
    expect(riesgoHelada({ today: { temp_min: 2 }, condicion: 'nublado', piso: 'frio' })).toBeNull();
    expect(riesgoHelada({ today: { temp_min: 2 }, condicion: 'despejado', piso: 'calido' })).toBeNull();
  });
});

describe('formatos', () => {
  it('saludo por hora, altitud con espacio fino y piso legible', () => {
    expect(saludoPorHora(new Date(2026, 8, 5, 7))).toBe('Buenos días');
    expect(saludoPorHora(new Date(2026, 8, 5, 15))).toBe('Buenas tardes');
    expect(saludoPorHora(new Date(2026, 8, 5, 21))).toBe('Buenas noches');
    expect(formatoMsnm(2680)).toBe('2\u202F680 m s. n. m.');
    expect(formatoMsnm(null)).toBeNull();
    expect(etiquetaPiso('frio')).toBe('piso frío');
    expect(etiquetaPiso('paramo')).toBe('páramo');
    expect(fmtCifra(3.71)).toBe('3,7');
    expect(fmtCifra(16)).toBe('16');
  });
});

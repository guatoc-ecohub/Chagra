/**
 * semillaCalculator — cobertura de las calculadoras DETERMINISTAS de semilla.
 *
 * Verifica que la matemática es exacta y anclada al grounding (DR-SEMILLA):
 *   - Selección: mínimos de plantas madre y roguing 10–15 %.
 *   - Guardado: rama ortodoxa vs recalcitrante; Harrington (×2 por −1 % / −5 °C);
 *     regla del 100; dosis de aceite anti-gorgojo.
 *   - Germinación: %, umbrales (≥70/50/<50) y ajuste de densidad (20 % → ×5).
 */
import { describe, it, expect } from 'vitest';
import {
  CULTIVOS_SEMILLA, evaluarSeleccion, roguingRango, ROGUING_PCT, getCultivoSemilla,
  clasificarConservacion, factorVidaHarrington, reglaSumaHarrington, aceiteAntigorgojo,
  porcentajeGerminacion, interpretarGerminacion, ajusteDensidad, UMBRAL_GERMINACION,
} from '../semillaCalculator';

describe('Selección — plantas madre y roguing', () => {
  it('el catálogo tiene el maíz alógamo (≥100, óptimo 200) y el fríjol autógamo (≥10)', () => {
    const maiz = getCultivoSemilla('maiz');
    const frijol = getCultivoSemilla('frijol');
    expect(maiz.sistema).toBe('cruzada');
    expect(maiz.min).toBe(100);
    expect(maiz.optimo).toBe(200);
    expect(frijol.sistema).toBe('auto');
    expect(frijol.min).toBe(10);
  });

  it('roguing depura 10–15 % de la población (redondeo hacia arriba)', () => {
    expect(ROGUING_PCT).toEqual({ min: 10, max: 15 });
    expect(roguingRango(200)).toEqual({ min: 20, max: 30 });
    expect(roguingRango(90)).toEqual({ min: 9, max: 14 }); // ceil(9), ceil(13.5)
    expect(roguingRango(0)).toEqual({ min: 0, max: 0 });
  });

  it('evaluarSeleccion marca insuficiente cuando tras depurar no llega al mínimo', () => {
    // maíz min 100; con 90 plantas, tras quitar hasta 14 quedan 76 < 100.
    const r = evaluarSeleccion('maiz', 90);
    expect(r.suficiente).toBe(false);
    expect(r.disponiblesTrasRoguing).toBe(76);
    expect(r.faltan).toBe(24);
    expect(r.nivel).toBe('insuficiente');
  });

  it('evaluarSeleccion marca ok cuando supera el óptimo tras depurar', () => {
    // maíz óptimo 200; con 250 quedan 250-38=212 ≥ 200.
    const r = evaluarSeleccion('maiz', 250);
    expect(r.suficiente).toBe(true);
    expect(r.nivel).toBe('ok');
    expect(r.faltan).toBe(0);
  });

  it('fríjol con 15 plantas alcanza el mínimo (justo)', () => {
    // min 10, óptimo 20; con 15 quedan 15-ceil(2.25)=15-3=12 → ≥10 pero <20.
    const r = evaluarSeleccion('frijol', 15);
    expect(r.suficiente).toBe(true);
    expect(r.nivel).toBe('justo');
  });

  it('cultivo inexistente devuelve null', () => {
    expect(evaluarSeleccion('marte', 10)).toBeNull();
  });
});

describe('Guardado — rama ortodoxa vs recalcitrante (la decisiva)', () => {
  it('cacao, café y aguacate son RECALCITRANTES (no se secan)', () => {
    expect(clasificarConservacion('cacao').tipo).toBe('recalcitrante');
    expect(clasificarConservacion('Café castillo').tipo).toBe('recalcitrante');
    expect(clasificarConservacion('aguacate hass').tipo).toBe('recalcitrante');
  });

  it('fríjol, maíz y tomate son ORTODOXAS (se secan y guardan)', () => {
    expect(clasificarConservacion('Fríjol cargamanto').tipo).toBe('ortodoxa');
    expect(clasificarConservacion('MAIZ').tipo).toBe('ortodoxa');
    expect(clasificarConservacion('tomate chonto').tipo).toBe('ortodoxa');
  });

  it('una especie no catalogada devuelve desconocida (honesto, no inventa)', () => {
    expect(clasificarConservacion('quinua').tipo).toBe('desconocida');
    expect(clasificarConservacion('').tipo).toBe('desconocida');
  });
});

describe('Guardado — reglas de Harrington', () => {
  it('la vida se duplica por cada −1 % de humedad y por cada −5 °C (se multiplican)', () => {
    // 12→8 % = 4 % menos = 2^4 = 16×; 25→10 °C = 15 °C menos = 2^3 = 8×; total 128×.
    const r = factorVidaHarrington({ humedadDesde: 12, humedadHasta: 8, tempDesde: 25, tempHasta: 10 });
    expect(r.factorHumedad).toBe(16);
    expect(r.factorTemp).toBe(8);
    expect(r.factor).toBe(128);
    expect(r.enRango).toBe(true);
    expect(r.avisos).toHaveLength(0);
  });

  it('avisa si se sobre-seca por debajo de ~5 % (la regla deja de valer)', () => {
    const r = factorVidaHarrington({ humedadDesde: 8, humedadHasta: 3, tempDesde: 20, tempHasta: 20 });
    expect(r.enRango).toBe(false);
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it('regla del 100: °F + %HR debe quedar por debajo de 100', () => {
    // 10 °C = 50 °F; con 40 % HR → 90 < 100 cumple.
    const ok = reglaSumaHarrington(10, 40);
    expect(ok.tempF).toBe(50);
    expect(ok.suma).toBe(90);
    expect(ok.cumple).toBe(true);
    // 25 °C = 77 °F; con 60 % → 137 no cumple.
    expect(reglaSumaHarrington(25, 60).cumple).toBe(false);
  });

  it('dosis de aceite anti-gorgojo: 2–7 ml por kg de grano', () => {
    expect(aceiteAntigorgojo(10)).toMatchObject({ min: 20, max: 70 });
    expect(aceiteAntigorgojo(0)).toMatchObject({ min: 0, max: 0 });
  });
});

describe('Germinación — prueba casera y ajuste de densidad', () => {
  it('calcula el % (germinadas / total × 100) y nunca pasa de 100', () => {
    expect(porcentajeGerminacion(78, 100)).toBe(78);
    expect(porcentajeGerminacion(7, 10)).toBe(70);
    expect(porcentajeGerminacion(120, 100)).toBe(100); // clamp
    expect(porcentajeGerminacion(5, 0)).toBeNull();
  });

  it('interpreta ≥70 buena · 50–69 más tupido · <50 descartar', () => {
    expect(UMBRAL_GERMINACION).toEqual({ buena: 70, descartar: 50 });
    expect(interpretarGerminacion(85).nivel).toBe('buena');
    expect(interpretarGerminacion(70).nivel).toBe('buena');
    expect(interpretarGerminacion(60).nivel).toBe('tupido');
    expect(interpretarGerminacion(49).nivel).toBe('descartar');
    expect(interpretarGerminacion(null).nivel).toBe('sin_datos');
  });

  it('ajuste de densidad: 20 % de germinación exige ×5 la semilla', () => {
    // valor cultural = 100 × 20 / 100 = 20; factor = 100/20 = 5.
    const r = ajusteDensidad(20);
    expect(r.valorCultural).toBe(20);
    expect(r.factor).toBe(5);
  });

  it('el ajuste considera la pureza física del lote', () => {
    // germinación 80 %, pureza 90 % → valor cultural 72; factor ≈ 1.39.
    const r = ajusteDensidad(80, 90);
    expect(r.valorCultural).toBe(72);
    expect(r.factor).toBeCloseTo(1.39, 2);
  });

  it('germinación 0 o pureza 0 no produce factor (evita división por cero)', () => {
    expect(ajusteDensidad(0)).toBeNull();
    expect(ajusteDensidad(50, 0)).toBeNull();
  });
});

describe('catálogo — sanidad', () => {
  it('todos los cultivos tienen id, sistema válido y min≤optimo', () => {
    for (const c of CULTIVOS_SEMILLA) {
      expect(c.id).toBeTruthy();
      expect(['cruzada', 'auto']).toContain(c.sistema);
      expect(c.min).toBeGreaterThan(0);
      expect(c.optimo).toBeGreaterThanOrEqual(c.min);
    }
  });
});

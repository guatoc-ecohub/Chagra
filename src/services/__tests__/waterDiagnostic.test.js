import { describe, it, expect } from 'vitest';
import {
  calcularCaptacion,
  estimarLluviaRegion,
  buscarCaptacion,
  diagnosticarAgua,
  formatearGroundingAgua,
} from '../waterDiagnostic';

describe('calcularCaptacion', () => {
  it('techo 60m2 zinc × 1200mm × Ce=0.90 × 0.85 = 55.080 L/año', () => {
    const r = calcularCaptacion(60, 1200, 0.90);
    expect(r).not.toBeNull();
    expect(r.litros_anuales).toBe(55080);
    expect(r.litros_diarios).toBe(151);
  });

  it('techo 50m2 × 1500mm × Ce=0.80 = 51.000 L/año', () => {
    const r = calcularCaptacion(50, 1500, 0.80);
    expect(r.litros_anuales).toBe(51000);
  });

  it('techo 23m2 arcilla × 1800mm × Ce=0.75 ≈ 26393 L', () => {
    const r = calcularCaptacion(23, 1800, 0.75);
    expect(r.litros_anuales).toBe(26393);
  });

  it('retorna null si faltan parametros', () => {
    expect(calcularCaptacion(0, 1000, 0.8)).toBeNull();
    expect(calcularCaptacion(50, 0, 0.8)).toBeNull();
    expect(calcularCaptacion(50, 1000, 0)).toBeNull();
  });
});

describe('buscarCaptacion', () => {
  it('zinc → Ce=0.90', () => {
    const s = buscarCaptacion('zinc');
    expect(s).toBeDefined();
    expect(s.ce).toBe(0.90);
  });

  it('arcilla → Ce=0.75', () => {
    const s = buscarCaptacion('arcilla');
    expect(s).toBeDefined();
    expect(s.ce).toBe(0.75);
  });

  it('material desconocido → undefined', () => {
    expect(buscarCaptacion('vidrio')).toBeNull();
  });
});

describe('estimarLluviaRegion', () => {
  it('andina_cafetera → 1800-2500mm', () => {
    const r = estimarLluviaRegion('andina_cafetera');
    expect(r.min_mm).toBe(1800);
    expect(r.max_mm).toBe(2500);
  });

  it('region desconocida → null', () => {
    expect(estimarLluviaRegion('marte')).toBeNull();
  });
});

describe('diagnosticarAgua', () => {
  it('retorna sin_datos si descripcion vacia', () => {
    expect(diagnosticarAgua('').sin_datos).toBe(true);
    expect(diagnosticarAgua('ab').sin_datos).toBe(true);
  });

  it('"se me seca el cultivo" → deficit hidrico + mulch + MO', () => {
    const d = diagnosticarAgua('se me seca el cultivo');
    expect(d.problemas).toContain('deficit_hidrico');
    expect(d.conservacion.some((c) => c.id === 'mulch')).toBe(true);
    expect(d.conservacion.some((c) => c.id === 'materia_organica')).toBe(true);
  });

  it('"no llueve hace meses, cielo pelado" → sequia + acciones ENSO', () => {
    const d = diagnosticarAgua('no llueve hace meses, cielo pelado');
    expect(d.problemas).toContain('sequia_prolongada');
    expect(d.enso.length).toBeGreaterThan(0);
  });

  it('"se me ahogo la mata con tanta lluvia" → exceso hidrico + zanjas', () => {
    const d = diagnosticarAgua('se me ahogo la mata con tanta lluvia');
    expect(d.problemas).toContain('exceso_hidrico');
    expect(d.conservacion.some((c) => c.id === 'zanjas_infiltracion')).toBe(true);
  });

  it('con datos de techo calcula captacion', () => {
    const d = diagnosticarAgua('necesito agua para riego', {
      area_techo_m2: 60, lluvia_mm: 1200, material_techo: 'zinc',
    });
    expect(d.captacion).not.toBeNull();
    expect(d.captacion.litros_anuales).toBe(55080);
  });

  it('con area < 20m2 recomienda botella enterrada', () => {
    const d = diagnosticarAgua('riego para arboles', {
      area_techo_m2: 15, lluvia_mm: 1500, material_techo: 'zinc',
    });
    expect(d.riego.some((r) => r.id === 'botella_enterrada')).toBe(true);
  });
});

describe('diagnosticarAgua — MITOS y guardas', () => {
  it('luna/lunar → advertencia de MITO', () => {
    const d = diagnosticarAgua('debo regar en luna menguante?');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('lunar'))).toBe(true);
  });

  it('varillas/pendulo → advertencia de MITO', () => {
    const d = diagnosticarAgua('uso varillas para encontrar agua');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('Radiestesia'))).toBe(true);
  });

  it('hidrogel → advertencia NO AGROECOLOGICO', () => {
    const d = diagnosticarAgua('le pongo hidrogel a la tierra');
    expect(d.advertencias.some((a) => a.includes('NO AGROECOLOGICO'))).toBe(true);
  });

  it('siempre incluye guarda de marchitez de mediodia', () => {
    const d = diagnosticarAgua('se me seca el cultivo');
    expect(d.advertencias.some((a) => a.includes('marchitez al mediodia') || a.includes('prueba del punado'))).toBe(true);
  });

  it('siempre incluye guarda de riego en la manana', () => {
    const d = diagnosticarAgua('se me seca el cultivo');
    expect(d.advertencias.some((a) => a.includes('manana') || a.includes('madrugada'))).toBe(true);
  });

  it('con captacion calculada incluye guardas de primer-flush y tapa', () => {
    const d = diagnosticarAgua('agua', { area_techo_m2: 60, lluvia_mm: 1200, material_techo: 'zinc' });
    expect(d.advertencias.some((a) => a.includes('primer'))).toBe(true);
    expect(d.advertencias.some((a) => a.includes('tapa'))).toBe(true);
  });

  it('sin datos suficientes no inventa problemas', () => {
    const d = diagnosticarAgua('hola buenos dias');
    expect(d.sin_datos).toBe(true);
    expect(d.problemas).toHaveLength(0);
  });
});

describe('formatearGroundingAgua', () => {
  it('retorna vacio si sin_datos', () => {
    expect(formatearGroundingAgua(/** @type {any} */ ({ sin_datos: true }))).toBe('');
    expect(formatearGroundingAgua(null)).toBe('');
  });

  it('incluye captacion, riego, conservacion, guardas', () => {
    const d = diagnosticarAgua('se me seca el cultivo', {
      area_techo_m2: 60, lluvia_mm: 1200, material_techo: 'zinc',
    });
    const f = formatearGroundingAgua(d);
    expect(f).toContain('Captacion estimada');
    expect(f).toContain('55.080');
    expect(f).toContain('GUARDAS');
    expect(f).toContain('DR-AGUA-1');
  });
});

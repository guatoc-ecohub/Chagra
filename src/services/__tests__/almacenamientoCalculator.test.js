/**
 * almacenamientoCalculator — mini-app "Almacenamiento y Conservación".
 *
 * Contrato cubierto:
 *   - Pérdida por método: proporción EXACTA y grano salvado (gancho).
 *   - Capacidad: geometría exacta × densidad grounded (silo y troja).
 *   - Ancho de troja por clima: la regla FAO por HR.
 *   - Botulismo: el clasificador por pH marca lo poco ácido como CRÍTICO
 *     (olla a presión), lo ácido como seguro al baño maría — el guard de vida.
 *   - Integridad grounded: los slots sin respaldo suficiente quedan
 *     marcados como pendientes (NUNCA inventados).
 */
import { describe, it, expect } from 'vitest';
import {
  calcularPerdidaAlmacenamiento,
  PERDIDA_ALMACENAMIENTO,
  calcularCapacidad,
  anchoTrojaRecomendado,
  clasificarAcidezConserva,
  GUARD_BOTULISMO,
  METODOS_TRADICIONALES,
  LIMITES_MICOTOXINA,
  CONSERVACION,
  PLAGAS_ALMACEN,
} from '../almacenamientoCalculator';

describe('calcularPerdidaAlmacenamiento — el gancho (proporción exacta)', () => {
  it('sobre 500 unidades calcula pérdidas y grano salvado', () => {
    const r = calcularPerdidaAlmacenamiento(500);
    expect(r).not.toBeNull();
    expect(r.perdidaTradicional).toBe(82.9); // 500 × 16,58 %
    expect(r.perdidaHermetico).toBe(19.7); // 500 × 3,94 %
    expect(r.granoSalvado).toBe(63.2); // la diferencia
    expect(r.puntosMenos).toBe(12.64);
  });

  it('acepta coma decimal y rechaza cantidades no válidas', () => {
    expect(calcularPerdidaAlmacenamiento('100,5')?.cantidad).toBe(100.5);
    expect(calcularPerdidaAlmacenamiento(0)).toBeNull();
    expect(calcularPerdidaAlmacenamiento(-5)).toBeNull();
    expect(calcularPerdidaAlmacenamiento('')).toBeNull();
    expect(calcularPerdidaAlmacenamiento('abc')).toBeNull();
  });

  it('la tasa hermética es mucho menor que la tradicional (cifra grounded)', () => {
    expect(PERDIDA_ALMACENAMIENTO.hermetico.perdidaPorc).toBeLessThan(
      PERDIDA_ALMACENAMIENTO.tradicional.perdidaPorc,
    );
    expect(PERDIDA_ALMACENAMIENTO.humedadMaxima).toBe(12);
  });
});

describe('calcularCapacidad — geometría exacta × densidad grounded', () => {
  it('silo cilíndrico de maíz: volumen y kilos', () => {
    const r = calcularCapacidad({ forma: 'silo', grano: 'maiz', diametro: 1, alto: 1 });
    expect(r).not.toBeNull();
    expect(r.volumenM3).toBe(0.785); // π (0,5)² × 1
    expect(r.densidad).toBe(710); // punto medio maíz
    expect(r.capacidadKg).toBe(558); // 0,7854 × 710
  });

  it('troja rectangular: 4 × 0,6 × 1,8 ≈ 2,1 t de mazorca', () => {
    const r = calcularCapacidad({ forma: 'troja', largo: 4, ancho: 0.6, alto: 1.8 });
    expect(r.volumenM3).toBe(4.32);
    expect(r.capacidadKg).toBe(2052); // 4,32 × 475
  });

  it('rechaza medidas incompletas o forma desconocida', () => {
    expect(calcularCapacidad({ forma: 'silo', grano: 'maiz', alto: 1 })).toBeNull(); // sin diámetro
    expect(calcularCapacidad({ forma: 'silo', grano: 'inventado', diametro: 1, alto: 1 })).toBeNull();
    expect(calcularCapacidad({ forma: 'troja', largo: 4, alto: 1.8 })).toBeNull(); // sin ancho
    expect(calcularCapacidad({ forma: 'otra', alto: 1 })).toBeNull();
  });
});

describe('anchoTrojaRecomendado — más húmedo el clima, más angosta', () => {
  it('aplica los tres tramos de HR (FAO)', () => {
    expect(anchoTrojaRecomendado(85).anchoCm).toBe(60); // HR ≥ 80
    expect(anchoTrojaRecomendado(77).anchoCm).toBe(100); // 75–80
    expect(anchoTrojaRecomendado(70).anchoCm).toBe(150); // < 75
  });
  it('rechaza HR fuera de rango', () => {
    expect(anchoTrojaRecomendado(-1)).toBeNull();
    expect(anchoTrojaRecomendado(101)).toBeNull();
    expect(anchoTrojaRecomendado('')).toBeNull();
  });
});

describe('clasificarAcidezConserva — el guard de BOTULISMO (riesgo de muerte)', () => {
  it('pH ≤ 4,6 es ácido y seguro al baño maría', () => {
    const r = clasificarAcidezConserva(4.2);
    expect(r.clase).toBe('acido');
    expect(r.critico).toBe(false);
    expect(r.mensaje.toLowerCase()).toContain('baño');
  });

  it('la línea de vida es exactamente pH 4,6 (inclusive)', () => {
    expect(clasificarAcidezConserva(4.6).clase).toBe('acido');
    expect(GUARD_BOTULISMO.phLinea).toBe(4.6);
  });

  it('pH > 4,6 es poco ácido: CRÍTICO, SOLO olla a presión', () => {
    const r = clasificarAcidezConserva(5.5);
    expect(r.clase).toBe('poco_acido');
    expect(r.critico).toBe(true);
    expect(r.metodo.toLowerCase()).toContain('olla a presión');
    expect(r.mensaje).toContain('MUERTE');
  });

  it('rechaza pH fuera de 0–14', () => {
    expect(clasificarAcidezConserva(-1)).toBeNull();
    expect(clasificarAcidezConserva(15)).toBeNull();
    expect(clasificarAcidezConserva('')).toBeNull();
  });

  it('la autoridad es institucional, nunca una persona', () => {
    expect(GUARD_BOTULISMO.autoridad).toMatch(/CDC|USDA|INVIMA/);
    expect(GUARD_BOTULISMO.reglaOro).toMatch(/CDC|USDA|INVIMA/);
  });
});

describe('integridad grounded — lo sin respaldo va marcado, nunca inventado', () => {
  it('la dosis 10:1 de ceniza/cal se marca como dato pendiente (falta ficha CO)', () => {
    const ceniza = METODOS_TRADICIONALES.find((m) => m.id === 'ceniza_cal');
    expect(ceniza.pendiente).toBeTruthy();
    expect(ceniza.pendiente.toLowerCase()).toMatch(/agrosavia|ica|colombia/);
  });

  it('el límite colombiano de aflatoxina (Res. 4506/2013) es grounded-pendiente', () => {
    const co = LIMITES_MICOTOXINA.find((l) => l.id === 'colombia_4506');
    const codex = LIMITES_MICOTOXINA.find((l) => l.id === 'codex_mani');
    expect(co.pendiente).toBe(true); // falta el texto primario
    expect(codex.pendiente).toBe(false); // Codex sí está grounded
  });

  it('los parámetros de salado/ahumado quedan marcados como pendientes', () => {
    const salado = CONSERVACION.find((c) => c.id === 'salado');
    const ahumado = CONSERVACION.find((c) => c.id === 'ahumado');
    expect(salado.pendiente).toBeTruthy();
    expect(ahumado.pendiente).toMatch(/INVIMA|botulismo|curado/i);
  });

  it('las plagas de almacén están a nivel de especie con su tipo', () => {
    expect(PLAGAS_ALMACEN.length).toBeGreaterThanOrEqual(5);
    const prostephanus = PLAGAS_ALMACEN.find((p) => p.id === 'prostephanus');
    expect(prostephanus.especie).toContain('Prostephanus truncatus');
    expect(prostephanus.tipo).toBe('primaria');
    for (const p of PLAGAS_ALMACEN) {
      expect(['primaria', 'secundaria']).toContain(p.tipo);
    }
  });
});

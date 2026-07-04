/**
 * aguaCalculos.test.js — la lógica determinista del módulo "Agua de la finca".
 * Solo matemática de unidades: aquí no hay datos duros que validar (esos son
 * slots grounded-pendiente en src/data/aguaFinca.js).
 */
import { describe, it, expect } from 'vitest';
import {
  litrosLluviaCaptables,
  canecasEquivalentes,
  porcentajeTanque,
  etcDiaria,
  litrosRiegoDia,
  diasDeReserva,
  COEF_ESCORRENTIA_TECHO_DEFAULT,
  LITROS_POR_CANECA_55GAL,
} from '../aguaCalculos';

describe('litrosLluviaCaptables', () => {
  it('aplica la identidad 1 mm × 1 m² = 1 L con el coeficiente default 0.8', () => {
    // 100 m² × 100 mm × 0.8 = 8000 L
    expect(litrosLluviaCaptables({ areaTechoM2: 100, lluviaMm: 100 })).toBe(8000);
    expect(COEF_ESCORRENTIA_TECHO_DEFAULT).toBe(0.8);
  });

  it('acepta strings numéricos (inputs de formulario)', () => {
    expect(litrosLluviaCaptables({ areaTechoM2: '60', lluviaMm: '120' })).toBe(Math.round(60 * 120 * 0.8));
  });

  it('respeta un coeficiente explícito', () => {
    expect(litrosLluviaCaptables({ areaTechoM2: 50, lluviaMm: 100, coefEscorrentia: 1 })).toBe(5000);
  });

  it('devuelve null con entradas inválidas', () => {
    expect(litrosLluviaCaptables({ areaTechoM2: 0, lluviaMm: 100 })).toBeNull();
    expect(litrosLluviaCaptables({ areaTechoM2: -5, lluviaMm: 100 })).toBeNull();
    expect(litrosLluviaCaptables({ areaTechoM2: 100, lluviaMm: -1 })).toBeNull();
    expect(litrosLluviaCaptables({ areaTechoM2: '', lluviaMm: '' })).toBeNull();
    expect(litrosLluviaCaptables({ areaTechoM2: 100, lluviaMm: 100, coefEscorrentia: 1.5 })).toBeNull();
    expect(litrosLluviaCaptables({ areaTechoM2: 100, lluviaMm: 100, coefEscorrentia: 0 })).toBeNull();
  });

  it('con lluvia 0 devuelve 0 litros (mes seco válido)', () => {
    expect(litrosLluviaCaptables({ areaTechoM2: 100, lluviaMm: 0 })).toBe(0);
  });
});

describe('canecasEquivalentes', () => {
  it('convierte litros a canecas de 55 galones (208 L)', () => {
    expect(LITROS_POR_CANECA_55GAL).toBe(208);
    expect(canecasEquivalentes(208)).toBe(1);
    expect(canecasEquivalentes(8000)).toBe(38.5);
  });
  it('devuelve null con entrada inválida', () => {
    expect(canecasEquivalentes(-1)).toBeNull();
    expect(canecasEquivalentes('x')).toBeNull();
  });
});

describe('porcentajeTanque', () => {
  it('calcula el porcentaje con tope 100', () => {
    expect(porcentajeTanque({ litros: 500, capacidadL: 1000 })).toBe(50);
    expect(porcentajeTanque({ litros: 2500, capacidadL: 1000 })).toBe(100);
  });
  it('devuelve null si el tanque no tiene capacidad válida', () => {
    expect(porcentajeTanque({ litros: 500, capacidadL: 0 })).toBeNull();
    expect(porcentajeTanque({ litros: 500, capacidadL: '' })).toBeNull();
  });
});

describe('etcDiaria (ETc = ETo × Kc, FAO)', () => {
  it('multiplica ETo por Kc con 2 decimales', () => {
    expect(etcDiaria({ etoMmDia: 4, kc: 1.15 })).toBe(4.6);
    expect(etcDiaria({ etoMmDia: '3.5', kc: '0.8' })).toBe(2.8);
  });
  it('rechaza Kc fuera de rango físico (0–2]', () => {
    expect(etcDiaria({ etoMmDia: 4, kc: 0 })).toBeNull();
    expect(etcDiaria({ etoMmDia: 4, kc: 2.5 })).toBeNull();
    expect(etcDiaria({ etoMmDia: 0, kc: 1 })).toBeNull();
  });
});

describe('litrosRiegoDia', () => {
  it('convierte mm/día × m² a litros/día (1 mm = 1 L/m²)', () => {
    expect(litrosRiegoDia({ etcMmDia: 4.6, areaM2: 100 })).toBe(460);
  });
  it('devuelve null con área o ETc inválidos', () => {
    expect(litrosRiegoDia({ etcMmDia: 0, areaM2: 100 })).toBeNull();
    expect(litrosRiegoDia({ etcMmDia: 4, areaM2: '' })).toBeNull();
  });
});

describe('diasDeReserva', () => {
  it('divide reserva entre consumo, al piso', () => {
    expect(diasDeReserva({ litrosGuardados: 1000, consumoLitrosDia: 300 })).toBe(3);
  });
  it('devuelve null sin consumo válido', () => {
    expect(diasDeReserva({ litrosGuardados: 1000, consumoLitrosDia: 0 })).toBeNull();
  });
});

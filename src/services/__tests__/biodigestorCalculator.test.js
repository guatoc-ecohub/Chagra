import { describe, it, expect } from 'vitest';
import {
  estimarBiodigestor,
  ANIMALES_BIODIGESTOR,
  PARAMS_PROCESO,
} from '../biodigestorCalculator';

describe('biodigestorCalculator — estimarBiodigestor', () => {
  it('el caso insignia (300 cerdos) da un orden de magnitud coherente', () => {
    const r = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 300 });
    // 300 × 4 kg = 1200 kg/día de estiércol fresco.
    expect(r.estiercolKgDia).toBe(1200);
    // Mezcla 1:3 → 1200 L estiércol + 3600 L agua = 4800 L/día.
    expect(r.mezclaLitrosDia).toBe(4800);
    // Volumen = 4.8 m³ × 30 días × 1.15 = 165.6 m³.
    expect(r.volumenDigestorM3).toBeCloseTo(165.6, 1);
    // Biogás = 1200 × 0.06 = 72 m³/día.
    expect(r.biogasM3Dia).toBe(72);
    // Biol = 4800 × 0.9 = 4320 L/día.
    expect(r.biolLitrosDia).toBe(4320);
    expect(r.groundedPendiente).toBe(true);
  });

  it('escala linealmente con el número de animales', () => {
    const a = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 100 });
    const b = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 200 });
    expect(b.biogasM3Dia).toBeCloseTo(a.biogasM3Dia * 2, 5);
    expect(b.volumenDigestorM3).toBeCloseTo(a.volumenDigestorM3 * 2, 5);
  });

  it('con 0 animales todo es 0 (sin NaN ni negativos)', () => {
    const r = estimarBiodigestor({ tipoAnimal: 'bovino', numAnimales: 0 });
    for (const v of [r.estiercolKgDia, r.mezclaLitrosDia, r.volumenDigestorM3, r.biogasM3Dia, r.biolLitrosDia]) {
      expect(v).toBe(0);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('cada especie usa su propio coeficiente de estiércol', () => {
    const cerdo = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 10 });
    const gallina = estimarBiodigestor({ tipoAnimal: 'gallina', numAnimales: 10 });
    expect(cerdo.estiercolKgDia).toBe(10 * ANIMALES_BIODIGESTOR.cerdo.estiercolKgDia);
    expect(gallina.estiercolKgDia).toBeCloseTo(10 * ANIMALES_BIODIGESTOR.gallina.estiercolKgDia, 5);
    expect(cerdo.estiercolKgDia).toBeGreaterThan(gallina.estiercolKgDia);
  });

  it('es determinista: misma entrada → misma salida', () => {
    const a = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 42 });
    const b = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 42 });
    expect(a).toEqual(b);
  });

  it('entradas inválidas caen a defaults seguros (cerdo, 0)', () => {
    const r = estimarBiodigestor({ tipoAnimal: 'unicornio', numAnimales: -5 });
    expect(r.tipoAnimal).toBe('cerdo');
    expect(r.numAnimales).toBe(0);
    expect(r.biogasM3Dia).toBe(0);
  });

  it('trunca fracciones de animal (no hay medio cerdo)', () => {
    const r = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 2.9 });
    expect(r.numAnimales).toBe(2);
  });

  it('los parámetros de proceso quedan expuestos para el grounding posterior', () => {
    expect(PARAMS_PROCESO.TRH_DIAS).toBeGreaterThan(0);
    expect(PARAMS_PROCESO.BIOGAS_M3_POR_KG).toBeGreaterThan(0);
  });
});

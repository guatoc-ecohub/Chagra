import { describe, it, expect } from 'vitest';
import {
  estimarBiodigestor,
  ANIMALES_BIODIGESTOR,
  PARAMS_PROCESO,
  TRH_DIAS_POR_PISO,
} from '../biodigestorCalculator';

describe('biodigestorCalculator — estimarBiodigestor', () => {
  it('el caso insignia (300 cerdos) da un orden de magnitud coherente (groundeado)', () => {
    const r = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 300 });
    // 300 × 2.7 kg = 810 kg/día de estiércol fresco (2,25 kg/50 kg peso vivo,
    // escalado a cerdo de 60 kg — Rev. Cubana de Ingeniería).
    expect(r.estiercolKgDia).toBe(810);
    // Mezcla 1:1 (CIPAV/LRRD; Engormix) → 810 L estiércol + 810 L agua = 1620 L/día.
    expect(r.mezclaLitrosDia).toBe(1620);
    // Volumen = 1.62 m³ × 30 días (TRH default cálido/templado, LRRD 11(1)) × 1.15 ≈ 55.9 m³.
    expect(r.volumenDigestorM3).toBeCloseTo(55.9, 1);
    // Biogás = 810 × 0.021 (CIPAV/LRRD, biogás/kg cerdo) ≈ 17 m³/día.
    expect(r.biogasM3Dia).toBeCloseTo(17, 0);
    // Biol = 1620 × 0.9 = 1458 L/día.
    expect(r.biolLitrosDia).toBe(1458);
    expect(r.groundedPendiente).toBe(true);
  });

  it('el TRH depende del PISO TÉRMICO, no es fijo (páramo ≈104 días)', () => {
    const sinPiso = estimarBiodigestor({ tipoAnimal: 'bovino', numAnimales: 5 });
    const paramo = estimarBiodigestor({ tipoAnimal: 'bovino', numAnimales: 5, pisoTermico: 'paramo' });
    const calido = estimarBiodigestor({ tipoAnimal: 'bovino', numAnimales: 5, pisoTermico: 'calido' });
    expect(sinPiso.trhDias).toBe(TRH_DIAS_POR_PISO.calido.dias); // default = cálido/templado
    expect(calido.trhDias).toBe(30);
    expect(paramo.trhDias).toBe(104);
    // Mismo hato, pero el digestor en páramo debe ser mucho más grande (más
    // días de retención con la misma carga diaria).
    expect(paramo.volumenDigestorM3).toBeGreaterThan(calido.volumenDigestorM3 * 3);
  });

  it('escala linealmente con el número de animales', () => {
    const a = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 100 });
    const b = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 200 });
    // Tolerancia amplia (±0.5): cada valor se redondea a 1 decimal por
    // separado, así que doblar la entrada no dobla el redondeado EXACTO.
    expect(b.biogasM3Dia).toBeCloseTo(a.biogasM3Dia * 2, 0);
    expect(b.volumenDigestorM3).toBeCloseTo(a.volumenDigestorM3 * 2, 0);
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

  it('cerdo y bovino usan su propio rendimiento de biogás/kg groundeado', () => {
    expect(ANIMALES_BIODIGESTOR.cerdo.biogasM3PorKg).toBeCloseTo(0.021, 3);
    expect(ANIMALES_BIODIGESTOR.bovino.biogasM3PorKg).toBeCloseTo(0.0415, 3);
    // La gallina no tiene cifra colombiana citable: usa el default global.
    expect(ANIMALES_BIODIGESTOR.gallina.biogasM3PorKg).toBeUndefined();
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

  it('un piso térmico desconocido cae al TRH default (no revienta)', () => {
    const r = estimarBiodigestor({ tipoAnimal: 'cerdo', numAnimales: 10, pisoTermico: 'marciano' });
    expect(r.trhDias).toBe(PARAMS_PROCESO.TRH_DIAS);
    expect(r.pisoTermico).toBeNull();
  });

  it('los parámetros de proceso quedan expuestos para el grounding posterior', () => {
    expect(PARAMS_PROCESO.TRH_DIAS).toBeGreaterThan(0);
    expect(PARAMS_PROCESO.BIOGAS_M3_POR_KG).toBeGreaterThan(0);
    expect(PARAMS_PROCESO.DILUCION_AGUA).toBeGreaterThan(0);
  });
});

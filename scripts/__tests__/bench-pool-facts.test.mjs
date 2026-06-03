import { describe, it, expect } from 'vitest';
import { doseFact, doseNumberFact, doseMustInclude } from '../lib/bench-pool-facts.mjs';

// Fixtures = strings REALES de `dosis_aplicacion` del grafo chagra_kg
// (postgres-farm, 2026-06-03). Si el grafo cambia el texto, el generador sigue al
// grafo; estos fixtures congelan el contrato de extracción.
const G = {
  caldo_bordeles: {
    nombre: 'Caldo bordelés',
    dosis_aplicacion:
      'Caldo madre al 1% para 10 L: 100 g de sulfato de cobre pentahidratado + 100 g de cal. Disolver el cobre en agua tibia (r',
  },
  caldo_sulfocalcico: {
    nombre: 'Caldo sulfocálcico',
    dosis_aplicacion:
      'DOSIS MADRE (concentrado): 2 partes de azufre en polvo + 1 parte de cal viva en 10 partes de agua (ej. 2 kg azufre + 1 k',
  },
  extracto_neem: {
    nombre: 'Extracto de neem (Azadirachta indica)',
    dosis_aplicacion: '1-1,5 cc/L de agua, foliar en horas frescas cada 7 dias',
  },
  bacillus_thuringiensis: {
    nombre: 'Bacillus thuringiensis (BT) — bioinsecticida lepidópteros',
    dosis_aplicacion:
      '0,5-1,5 kg/ha (o 300-800 g/ha) en aplicacion foliar; aplicar al atardecer',
  },
  trichoderma_harzianum_suelo: {
    nombre: 'Trichoderma harzianum (aplicación al suelo)',
    dosis_aplicacion: '2 kg/ha al suelo humedo, o 10-20 g/L de agua para inmersion de semillas',
  },
  purin_ortiga: {
    nombre: 'Purín de ortiga',
    dosis_aplicacion:
      'Maceracion/fermentacion: 1 kg de ortiga fresca (o 200 g seca) por 10 L de agua, fermentar 7-14 dias removiendo a diario',
  },
  bocashi: {
    nombre: 'Bocashi',
    dosis_aplicacion:
      'Abono solido fermentado aerobico (12-21 dias, volteos diarios manteniendo <50 grados C). NO se diluye.',
  },
  sin_dosis: { nombre: 'X', dosis_aplicacion: '' },
};

describe('doseNumberFact — extrae la cantidad cuantitativa atómica del grafo', () => {
  it('caldo bordelés → "1%" (porcentaje del caldo madre)', () => {
    expect(doseNumberFact(G.caldo_bordeles)).toBe('1%');
  });

  it('extracto de neem → "1-1,5 cc/L" (rango con decimal coma)', () => {
    expect(doseNumberFact(G.extracto_neem)).toBe('1-1,5 cc/L');
  });

  it('Bt → "0,5-1,5 kg/ha" (primera cantidad, no la de paréntesis)', () => {
    expect(doseNumberFact(G.bacillus_thuringiensis)).toBe('0,5-1,5 kg/ha');
  });

  it('trichoderma → "2 kg/ha" (unidad compuesta gana sobre "kg")', () => {
    expect(doseNumberFact(G.trichoderma_harzianum_suelo)).toBe('2 kg/ha');
  });

  it('caldo sulfocálcico → "2 partes" (unidad "partes")', () => {
    expect(doseNumberFact(G.caldo_sulfocalcico)).toBe('2 partes');
  });

  it('purín de ortiga → "1 kg" (primera cantidad de masa)', () => {
    expect(doseNumberFact(G.purin_ortiga)).toBe('1 kg');
  });

  it('bocashi (cualitativo, sin número+unidad de dosis) → null', () => {
    // "12-21 dias" no es unidad de dosis; "<50 grados" tampoco. No hay cantidad.
    expect(doseNumberFact(G.bocashi)).toBeNull();
  });

  it('dosis vacía → null', () => {
    expect(doseNumberFact(G.sin_dosis)).toBeNull();
  });

  it('no truncar el número: nunca devuelve solo "kg" cuando el grafo dice "2 kg/ha"', () => {
    const f = doseNumberFact(G.trichoderma_harzianum_suelo);
    expect(f).toContain('/ha');
  });
});

describe('doseMustInclude — política recalibrada (NO fuente verbatim)', () => {
  it('incluye nombre + cantidad numérica, NADA de fuente', () => {
    const must = doseMustInclude(G.extracto_neem);
    expect(must).toEqual(['Extracto de neem (Azadirachta indica)', '1-1,5 cc/L']);
    // ningún token de fuente curada a mano (word-boundary para no chocar con
    // "indica" del binomio; el eje es que NO se inyecta la prosa de `fuente`).
    expect(must.join(' ')).not.toMatch(/\b(FAO|Agrosavia|ICA bioinsumos|Restrepo|SENA)\b/i);
  });

  it('cuando no hay número con unidad, cae al fragmento de prosa (respaldo del grafo)', () => {
    const must = doseMustInclude(G.bocashi);
    expect(must[0]).toBe('Bocashi');
    expect(must[1]).toMatch(/Abono solido fermentado/);
    expect(must.length).toBe(2);
  });

  it('no emite tokens vacíos', () => {
    const must = doseMustInclude(G.sin_dosis);
    expect(must.every((t) => typeof t === 'string' && t.length > 0)).toBe(true);
  });

  it('cada must_include es corto y evaluable (≤ 80 chars), no un párrafo entero', () => {
    for (const key of Object.keys(G)) {
      for (const tok of doseMustInclude(G[key])) {
        expect(tok.length).toBeLessThanOrEqual(80);
      }
    }
  });
});

describe('doseFact — respaldo de prosa recortada (conservado)', () => {
  it('recorta a ≤ 70 chars sin cortar palabra a la mitad', () => {
    const f = doseFact(G.purin_ortiga);
    expect(f.length).toBeLessThanOrEqual(70);
    expect(f).toMatch(/^Maceracion\/fermentacion/);
  });
});

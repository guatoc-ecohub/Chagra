// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba del extractor on-device del registro por voz unificado (#23).
 *
 * Corre el extractor DETERMINÍSTICO contra el fixture de campo
 * (fixtures/voice-test-cases.json — los 12 casos + 2 base del operador) y
 * verifica clasificación de intención + resolución de especie + campos clave.
 *
 * Es la EVIDENCIA verificable del módulo: la ruta del LLM grounded no se puede
 * correr aquí (sin Ollama/Whisper), pero el fallback on-device es puro y se
 * mide caso por caso. El smoke mínimo (durazno floriado de 2 m → planta) debe
 * estar verde.
 */
import { describe, it, expect } from 'vitest';
import fixture from './fixtures/voice-test-cases.json';
import {
  classifyAndExtractLocal,
  INTENTS,
  parseNumberToken,
} from '../voiceFieldExtractor';

// Referencia fija de tiempo (no se llama Date.now en el core): 2026-06-25.
const NOW = Date.UTC(2026, 5, 25, 12, 0, 0);
const run = (voz) => classifyAndExtractLocal(voz, { now: NOW });
const slugs = (r) => r.species.map((s) => s.slug);
const byId = (id) => [...(fixture.base || []), ...(fixture.casos || [])].find((c) => c.id === id);

describe('parseNumberToken — numerales en palabra', () => {
  it('convierte palabras y dígitos a entero', () => {
    expect(parseNumberToken('dos')).toBe(2);
    expect(parseNumberToken('veinte')).toBe(20);
    expect(parseNumberToken('cincuenta')).toBe(50);
    expect(parseNumberToken('treinta y cinco')).toBe(35);
    expect(parseNumberToken('6')).toBe(6);
    expect(parseNumberToken('varios')).toBeNull();
  });
});

describe('SMOKE — durazno floriado de 2 m (b1)', () => {
  it('clasifica registrar_planta y extrae especie + altura + fenología + GPS', () => {
    const r = run(byId('b1').voz);
    expect(r.intent).toBe(INTENTS.PLANTA);
    expect(slugs(r)).toContain('prunus_persica'); // durazno → Prunus persica
    expect(r.measures.altura_m).toBe(2);
    expect(r.phenology.some((p) => p.canon.includes('floración'))).toBe(true);
    expect(r.needsGps).toBe(true); // "aquí" → georeferencia
  });
});

describe('Resolución de especie — trampa gulupa≠guayaba (c9)', () => {
  it('gulupa resuelve a Passiflora, NUNCA a guayaba (Psidium)', () => {
    const r = run(byId('c9').voz);
    expect(slugs(r)).toContain('passiflora_edulis');
    expect(slugs(r)).not.toContain('psidium_guajava');
    expect(r.intent).toBe(INTENTS.OBSERVACION);
    expect(r.symptoms.length).toBeGreaterThan(0); // telaraña / caída de hojas
  });
});

describe('Clasificación de intención — los 12 casos del fixture', () => {
  const expected = {
    b1: INTENTS.PLANTA,
    b2: INTENTS.PLANTA, // planta + observación
    c1: INTENTS.SIEMBRA,
    c2: INTENTS.COSECHA,
    c3: INTENTS.INSUMO,
    c4: INTENTS.MANTENIMIENTO,
    c5: INTENTS.PLANTA,
    c6: INTENTS.OBSERVACION, // observación de plaga
    c7: INTENTS.OBSERVACION,
    c8: INTENTS.PLAGA,
    c9: INTENTS.OBSERVACION,
    c10: INTENTS.OBSERVACION, // multi-cultivo
  };
  for (const [id, intent] of Object.entries(expected)) {
    it(`${id} → ${intent}`, () => {
      expect(run(byId(id).voz).intent).toBe(intent);
    });
  }
});

describe('Resolución de especie — casos del catálogo', () => {
  const expected = {
    b1: 'prunus_persica',
    c1: 'allium_fistulosum', // cebolla larga
    c2: 'rubus_glaucus', // mora → Mora de Castilla
    c3: 'solanum_lycopersicum', // tomate
    c4: 'prunus_persica', // durazno
    c6: 'phaseolus_vulgaris', // fríjol
    c7: 'coffea_arabica', // cafetal
    c9: 'passiflora_edulis', // gulupa (trampa)
  };
  for (const [id, slug] of Object.entries(expected)) {
    it(`${id} resuelve ${slug}`, () => {
      expect(slugs(run(byId(id).voz))).toContain(slug);
    });
  }

  it('c10 resuelve los 3 cultivos de la huerta', () => {
    const got = slugs(run(byId('c10').voz));
    expect(got).toContain('lactuca_sativa');
    expect(got).toContain('coriandrum_sativum');
    expect(got).toContain('beta_vulgaris_cicla');
  });

  it('aguacate/mango (fuera del catálogo) no inventan especie (skip)', () => {
    expect(slugs(run(byId('b2').voz))).toHaveLength(0); // aguacate
    expect(slugs(run(byId('c5').voz))).toHaveLength(0); // mango
  });
});

describe('Extracción de campos — medidas, fenología, tiempo, labores', () => {
  it('c1 — cantidad (veinte), tiempo (hace dos días), GPS', () => {
    const r = run(byId('c1').voz);
    expect(r.measures.cantidad).toBe(20);
    expect(r.time.offsetDays).toBe(-2);
    expect(r.needsGps).toBe(true);
  });

  it('c2 — arrobas (3) con kg aproximado', () => {
    const r = run(byId('c2').voz);
    expect(r.measures.cantidad).toBe(3);
    expect(r.measures.unidad).toBe('arroba');
    expect(r.measures.kg_aprox).toBe(37.5);
  });

  it('c3 — insumo caldo bordelés', () => {
    const r = run(byId('c3').voz);
    expect(r.input).toMatch(/caldo bordel/i);
  });

  it('c4 — labores poda + deshierbe', () => {
    const r = run(byId('c4').voz);
    expect(r.labors).toContain('poda');
    expect(r.labors).toContain('deshierbe');
  });

  it('c5 — altura 6 m + carga 50 + fenología pintón', () => {
    const r = run(byId('c5').voz);
    expect(r.measures.altura_m).toBe(6);
    expect(r.measures.cantidad).toBe(50);
    expect(r.phenology.some((p) => p.canon.includes('maduración'))).toBe(true);
  });

  it('c8 — plaga hormiga arriera detectada', () => {
    const r = run(byId('c8').voz);
    expect(r.intent).toBe(INTENTS.PLAGA);
    expect(r.pest).toMatch(/arriera/i);
  });

  it('c7 — fenología grano verde + síntomas', () => {
    const r = run(byId('c7').voz);
    expect(r.phenology.some((p) => p.canon.includes('llenado de grano'))).toBe(true);
    expect(r.symptoms.length).toBeGreaterThan(0);
  });
});

describe('timestamp relativo se calcula contra now inyectado', () => {
  it('hace dos días = now - 2 días', () => {
    const r = run(byId('c1').voz);
    expect(r.timestampMs).toBe(NOW - 2 * 86400000);
  });
  it('hoy = now', () => {
    const r = run(byId('c4').voz);
    expect(r.timestampMs).toBe(NOW);
  });
});

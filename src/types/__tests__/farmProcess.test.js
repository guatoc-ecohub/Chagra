// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import {
  isFarmProcess, isFarmProcessEvent, isPopulation,
  validateFarmProcess, validateFarmProcessEvent, validatePopulation,
  stageSequenceForProcessType, RESTORATION_STAGE_SEQUENCE,
} from '../farmProcess';

// ─── Fixtures (Task 14) ────────────────────────────────────────

const makeProcess = (overrides) => ({
  process_id: '01J0XABC1234567890DEFGHIJK',
  type: 'farm_process',
  attributes: {
    process_type: 'sowing',
    subject_kind: 'individual',
    subject_slug: 'coffea_arabica',
    subject_label: 'Café castillo',
    quantity: 50,
    unit: 'plantas',
    variety: 'Castillo',
    location_land_asset_id: 'land-lote-norte',
    status: 'active',
    current_stage: 'sowing_confirmed',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  },
});

const makeEvent = (overrides) => ({
  event_id: '01J0XABC1234567890DEFGHIJK',
  type: 'farm_process_event',
  attributes: {
    process_id: '01J0XABC1234567890DEFGHIJK',
    event_type: 'sowing_confirmed',
    occurred_at: Date.now(),
    actor: 'operator',
    source: 'operator',
    ...overrides,
  },
});

const makePopulation = (overrides) => ({
  population_id: '01J0XABC1234567890DEFGHIJK',
  type: 'population',
  species_slug: 'coffea_arabica',
  label: 'Café castillo - Lote Norte',
  count: 50,
  unit: 'plantas',
  location_land_asset_id: 'land-lote-norte',
  status: 'active',
  created_at: Date.now(),
  updated_at: Date.now(),
  ...overrides,
});

// ─── Cafés ───

const cafeCastilloIndividual = makeProcess({
  subject_slug: 'coffea_arabica',
  subject_label: 'Café castillo',
  quantity: 50,
  unit: 'plantas',
  variety: 'Castillo',
  subject_kind: 'individual',
});

const cafeCastilloPopulation = makePopulation({
  species_slug: 'coffea_arabica',
  label: 'Café castillo - Lote Norte',
  count: 50,
});

// ─── Papas ───

const papaPastusaAggregate = makeProcess({
  subject_slug: 'solanum_tuberosum',
  subject_label: 'Papa pastusa',
  quantity: 200,
  unit: 'semillas',
  variety: 'Pastusa',
  subject_kind: 'aggregate',
});

// ─── Tomates ───

const tomateChontoIndividual = makeProcess({
  subject_slug: 'solanum_lycopersicum',
  subject_label: 'Tomate chonto',
  quantity: 30,
  unit: 'plantas',
  variety: 'Chonto',
  subject_kind: 'individual',
});

// ─── Árbol de restauración ───

const arbolRestauracion = makeProcess({
  process_type: 'restoration',
  subject_slug: 'quercus_humboldtii',
  subject_label: 'Roble',
  quantity: 15,
  unit: 'arboles',
  subject_kind: 'individual',
});

// ─── Tests ──────────────────────────────────────────────────────

describe('FarmProcess type guards', () => {
  it('isFarmProcess reconoce objeto valido', () => {
    expect(isFarmProcess(cafeCastilloIndividual)).toBe(true);
  });

  it('isFarmProcess rechaza no-object', () => {
    expect(isFarmProcess(null)).toBe(false);
    expect(isFarmProcess({})).toBe(false);
  });

  it('isFarmProcessEvent reconoce evento', () => {
    expect(isFarmProcessEvent(makeEvent())).toBe(true);
  });

  it('isPopulation reconoce poblacion', () => {
    expect(isPopulation(cafeCastilloPopulation)).toBe(true);
  });
});

describe('FarmProcess validator', () => {
  it('valida cafeCastilloIndividual', () => {
    expect(() => validateFarmProcess(cafeCastilloIndividual)).not.toThrow();
  });

  it('valida papaPastusaAggregate', () => {
    expect(() => validateFarmProcess(papaPastusaAggregate)).not.toThrow();
  });

  it('valida tomateChontoIndividual', () => {
    expect(() => validateFarmProcess(tomateChontoIndividual)).not.toThrow();
  });

  it('valida arbolRestauracion', () => {
    expect(() => validateFarmProcess(arbolRestauracion)).not.toThrow();
  });

  it('rejects missing process_id', () => {
    expect(() => validateFarmProcess({ type: 'farm_process', attributes: cafeCastilloIndividual.attributes }))
      .toThrow(/process_id/);
  });

  it('rejects invalid process_type', () => {
    expect(() => validateFarmProcess(makeProcess({ process_type: 'invalid' })))
      .toThrow(/process_type/);
  });

  it('rejects quantity < 1', () => {
    expect(() => validateFarmProcess(makeProcess({ quantity: 0 })))
      .toThrow(/quantity/);
  });
});

describe('FarmProcessEvent validator', () => {
  it('valida sowing_confirmed event', () => {
    const ev = makeEvent({ event_type: 'sowing_confirmed' });
    expect(() => validateFarmProcessEvent(ev)).not.toThrow();
  });

  it('rejects missing event_id', () => {
    const ev = makeEvent({ event_type: 'sowing_confirmed' });
    delete ev.event_id;
    expect(() => validateFarmProcessEvent(ev)).toThrow(/event_id/);
  });

  it('rejects invalid event_type', () => {
    const ev = makeEvent({ event_type: 'invalid' });
    expect(() => validateFarmProcessEvent(ev)).toThrow(/event_type/);
  });
});

describe('Population validator', () => {
  it('valida cafeCastilloPopulation', () => {
    expect(() => validatePopulation(cafeCastilloPopulation)).not.toThrow();
  });

  it('rejects missing species_slug', () => {
    expect(() => validatePopulation(makePopulation({ species_slug: '' }))).toThrow(/species_slug/);
  });

  it('rejects count < 1', () => {
    expect(() => validatePopulation(makePopulation({ count: 0 }))).toThrow(/count/);
  });
});

describe('etapas propias de restauración (no fenología de cultivo)', () => {
  it('valida un proceso de restauración en etapa propia (prendimiento)', () => {
    expect(() => validateFarmProcess(makeProcess({ process_type: 'restoration', current_stage: 'prendimiento' }))).not.toThrow();
  });

  it('valida monitoreo_sucesion y cierre (restoration/silvopasture)', () => {
    expect(() => validateFarmProcess(makeProcess({ process_type: 'restoration', current_stage: 'monitoreo_sucesion' }))).not.toThrow();
    expect(() => validateFarmProcess(makeProcess({ process_type: 'silvopasture', current_stage: 'cierre' }))).not.toThrow();
  });

  it('stageSequenceForProcessType(restoration) trae hitos de restauración, no floración/cosecha', () => {
    const seq = stageSequenceForProcessType('restoration');
    expect(seq).toBe(RESTORATION_STAGE_SEQUENCE);
    const codigos = seq.map((s) => s.stage);
    expect(codigos).toContain('prendimiento');
    expect(codigos).not.toContain('flowering');
    expect(codigos).not.toContain('harvest');
  });

  it('stageSequenceForProcessType(sowing) sí trae fenología de cultivo', () => {
    const codigos = stageSequenceForProcessType('sowing').map((s) => s.stage);
    expect(codigos).toContain('germination');
    expect(codigos).toContain('harvest');
  });
});

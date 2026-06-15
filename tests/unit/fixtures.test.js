/**
 * tests/fixtures/fixtures.test.js — Tests para factories compartidos.
 *
 * Verifica que cada factory genere objetos con defaults correctos
 * y que las opciones de override funcionen como esperado.
 */
import { describe, it, expect } from 'vitest';
import {
  makeFinca,
  makeCase,
  makeInventoryEvent,
  makeReceivedEvent,
  makeConsumedEvent,
  makeCountedEvent,
  makeSpecies,
  withGrounding,
  makeLLMResponse,
  makeReport,
} from '../fixtures/index.js';

describe('makeFinca', () => {
  it('genera finca con defaults correctos', () => {
    const finca = makeFinca();
    expect(finca.id).toBe('guatoc');
    expect(finca.name).toBe('Guatoc');
    expect(finca.slug).toBe('guatoc');
    expect(finca.location.lat).toBe(4.6);
    expect(finca.location.altitude).toBe(2600);
    expect(finca.biocultural_zone).toBe('andino_alto_páramo');
  });

  it('permite override de campos', () => {
    const finca = makeFinca({
      id: 'restrepo',
      name: 'Restrepo',
      location: { lat: 4.5, lng: -74.0, altitude: 2500, municipality: 'Restrepo', department: 'Meta' },
      biocultural_zone: 'valle_caucano',
    });
    expect(finca.id).toBe('restrepo');
    expect(finca.name).toBe('Restrepo');
    expect(finca.biocultural_zone).toBe('valle_caucano');
  });
});

describe('makeCase', () => {
  it('genera caso con defaults correctos', () => {
    const caso = makeCase();
    expect(caso.title).toBe('Caso de prueba');
    expect(caso.finca_slug).toBe('guatoc');
    expect(caso.zone_freetext).toBe('zona-general');
    expect(caso.subject).toEqual({
      species_ids: [],
      count_total: null,
      count_affected: null,
    });
    expect(caso.problem.name_freetext).toBe('Problema genérico');
    expect(caso.problem.severity).toBe('medium');
    expect(caso.visibility).toBe('private');
  });

  it('permite override de título y campos', () => {
    const caso = makeCase('Trozador en tomate', {
      finca_slug: 'restrepo',
      species_ids: ['solanum_lycopersicum'],
      problem_name: 'Trozador',
      severity: 'critical',
    });
    expect(caso.title).toBe('Trozador en tomate');
    expect(caso.finca_slug).toBe('restrepo');
    expect(caso.subject.species_ids).toEqual(['solanum_lycopersicum']);
    expect(caso.problem.name_freetext).toBe('Trozador');
    expect(caso.problem.severity).toBe('critical');
  });
});

describe('makeInventoryEvent', () => {
  it('genera evento con defaults correctos', () => {
    const event = makeInventoryEvent('RECEIVED', { item_id: 'compost-A', delta: 50, unit: 'kg' });
    expect(event.event_type).toBe('RECEIVED');
    expect(event.payload.item_id).toBe('compost-A');
    expect(event.payload.delta).toBe(50);
    expect(event.device_id_lex_hash).toBe('AAAA0000');
    expect(event.sequence_number).toBe(1);
    expect(event.schema_version).toBe('1');
    expect(event.operator_id_hash).toHaveLength(64);
  });

  it('permite override de todos los campos', () => {
    const event = makeInventoryEvent('CONSUMED', { item_id: 'bocashi', delta: -5, unit: 'kg' }, {
      device: 'BBBB1111',
      seq: 3,
      timestamp: '2026-04-29T10:00:00Z',
    });
    expect(event.event_type).toBe('CONSUMED');
    expect(event.payload.item_id).toBe('bocashi');
    expect(event.device_id_lex_hash).toBe('BBBB1111');
    expect(event.sequence_number).toBe(3);
    expect(event.timestamp).toBe('2026-04-29T10:00:00Z');
  });
});

describe('makeReceivedEvent', () => {
  it('genera evento received con payload correcto', () => {
    const event = makeReceivedEvent({ item_id: 'compost-A', delta: 100 });
    expect(event.event_type).toBe('RECEIVED');
    expect(event.payload.item_id).toBe('compost-A');
    expect(event.payload.delta).toBe(100);
    expect(event.payload.unit).toBe('kg');
    expect(event.payload.source).toBe('compra');
  });
});

describe('makeConsumedEvent', () => {
  it('genera evento consumed con delta negativo default', () => {
    const event = makeConsumedEvent({ item_id: 'bocashi' });
    expect(event.event_type).toBe('CONSUMED');
    expect(event.payload.item_id).toBe('bocashi');
    expect(event.payload.delta).toBe(-10);
    expect(event.payload.unit).toBe('kg');
  });
});

describe('makeCountedEvent', () => {
  it('genera evento counted con counted_qty', () => {
    const event = makeCountedEvent({ item_id: 'compost-A', counted_qty: 30 });
    expect(event.event_type).toBe('COUNTED');
    expect(event.payload.item_id).toBe('compost-A');
    expect(event.payload.counted_qty).toBe(30);
    expect(event.payload.unit).toBe('kg');
  });
});

describe('makeSpecies', () => {
  it('genera especie con defaults correctos', () => {
    const species = makeSpecies();
    expect(species.id).toBe('solanum_lycopersicum');
    expect(species.common_name).toBe('Tomate');
    expect(species.scientific_name).toBe('Solanum lycopersicum');
    expect(species.category).toBe('hortalizas');
    expect(species.tier).toBe('culti-v1');
    expect(species.sources).toEqual(['MADR-2024']);
  });

  it('permite override de todos los campos', () => {
    const species = makeSpecies({
      id: 'fragaria_ananassa',
      common_name: 'Fresa',
      scientific_name: 'Fragaria ananassa',
      variety: 'Monterrey',
    });
    expect(species.id).toBe('fragaria_ananassa');
    expect(species.common_name).toBe('Fresa');
    expect(species.variety).toBe('Monterrey');
  });
});

describe('withGrounding', () => {
  it('genera contexto de grounding con defaults', () => {
    const grounding = withGrounding();
    expect(grounding.resolvedEntities).toEqual({
      species: [],
      pests: [],
      biopreparados: [],
      locations: [],
    });
    expect(grounding.groundingContext.confidence).toBe('medium');
    expect(grounding.groundingContext.source_count).toBe(1);
    expect(grounding.groundingContext.has_validation).toBe(false);
  });

  it('permite pasar entidades resueltas', () => {
    const grounding = withGrounding({
      species: [{ id: 'solanum_lycopersicum', common_name: 'Tomate' }],
      pests: [{ id: 'agrotis_ipsilon', common_name: 'Trozador' }],
    });
    expect(grounding.resolvedEntities.species).toHaveLength(1);
    expect(grounding.resolvedEntities.species[0].common_name).toBe('Tomate');
    expect(grounding.resolvedEntities.pests).toHaveLength(1);
  });
});

describe('makeLLMResponse', () => {
  it('genera respuesta con grounding', () => {
    const response = makeLLMResponse('Usa caldo bordelés', {
      species: [{ id: 'solanum_lycopersicum' }],
    });
    expect(response.text).toBe('Usa caldo bordelés');
    expect(response.model_used).toBe('gemma3:4b');
    expect(response.resolvedEntities.species).toHaveLength(1);
  });
});

describe('makeReport', () => {
  it('genera reporte con defaults correctos', () => {
    const report = makeReport();
    expect(report.id).toBe('report-1');
    expect(report.report_type).toBe('activity');
    expect(report.finca_slug).toBe('guatoc');
    expect(report.status).toBe('draft');
    expect(report.created_by).toBe('operator-1');
  });

  it('permite override de campos', () => {
    const report = makeReport({
      id: 'report-2',
      report_type: 'harvest',
      finca_slug: 'restrepo',
    });
    expect(report.id).toBe('report-2');
    expect(report.report_type).toBe('harvest');
    expect(report.finca_slug).toBe('restrepo');
  });
});

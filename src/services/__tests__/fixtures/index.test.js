/**
 * fixtures/index.test.js — tests del módulo de fixtures compartidos.
 *
 * Verifica que los factories funcionen correctamente y sean compatibles
 * con los contratos que esperan los tests existentes.
 */

import { describe, it, expect } from 'vitest';
import {
  makeSpecies,
  makeUser,
  makeFinca,
  makeInventoryEvent,
  makeFarmProcessEvent,
  withGrounding,
  SPECIES,
  USERS,
  FINCAS,
} from './index';

describe('makeSpecies', () => {
  it('crea especie con defaults completos', () => {
    const species = makeSpecies();
    expect(species.kind).toBe('species');
    expect(species.mentioned).toBe('especie');
    expect(species.nombre_comun).toBe('especie');
    expect(species.nombre_cientifico).toBe('Scientific name');
    expect(species.altitud_min).toBe(0);
    expect(species.altitud_max).toBe(3000);
    expect(species.alternativas_viables).toEqual([]);
  });

  it('permite sobreescribir campos específicos', () => {
    const species = makeSpecies({
      nombre_comun: 'café',
      nombre_cientifico: 'Coffea arabica',
      altitud_min: 1000,
      altitud_max: 2000,
      alternativas_viables: ['coco', 'cacao'],
    });
    expect(species.nombre_comun).toBe('café');
    expect(species.nombre_cientifico).toBe('Coffea arabica');
    expect(species.altitud_min).toBe(1000);
    expect(species.altitud_max).toBe(2000);
    expect(species.alternativas_viables).toEqual(['coco', 'cacao']);
  });

  it('mantiene mentioned sincronizado con nombre_comun por defecto', () => {
    const species = makeSpecies({ nombre_comun: 'mango' });
    expect(species.mentioned).toBe('mango');
    expect(species.nombre_comun).toBe('mango');
  });

  it('permite sobreescribir mentioned independientemente', () => {
    const species = makeSpecies({
      nombre_comun: 'café',
      mentioned: 'cafecito',
    });
    expect(species.mentioned).toBe('cafecito');
    expect(species.nombre_comun).toBe('café');
  });
});

describe('makeUser', () => {
  it('crea usuario con defaults completos', () => {
    const user = makeUser();
    expect(user.finca_altitud).toBe(1500);
    expect(user.altitud_source).toBe('user');
    expect(user.municipio).toBe('Filandia');
    expect(user.departamento).toBe('Quindío');
    expect(user.finca_nombre).toBe('Finca El Recuerdo');
  });

  it('permite sobreescribir campos específicos', () => {
    const user = makeUser({
      finca_altitud: 1800,
      municipio: 'Salento',
      altitud_source: 'gps',
    });
    expect(user.finca_altitud).toBe(1800);
    expect(user.altitud_source).toBe('gps');
    expect(user.municipio).toBe('Salento');
    expect(user.departamento).toBe('Quindío'); // mantiene default
  });

  it('acepta altitud 0 válido (valle)', () => {
    const user = makeUser({ finca_altitud: 0 });
    expect(user.finca_altitud).toBe(0);
  });

  it('acepta altitudes negativas (ej: Dead Sea edge case)', () => {
    const user = makeUser({ finca_altitud: -100 });
    expect(user.finca_altitud).toBe(-100);
  });
});

describe('makeFinca', () => {
  it('crea finca con defaults completos', () => {
    const finca = makeFinca();
    expect(finca.finca_id).toBe('finca-001');
    expect(finca.altitud).toBe(1500);
    expect(finca.area_hectareas).toBe(3);
    expect(finca.municipio).toBe('Filandia');
    expect(finca.departamento).toBe('Quindío');
    expect(finca.nombre).toBe('Finca El Recuerdo');
    expect(finca.cultivos).toEqual([]);
  });

  it('permite sobreescribir campos específicos', () => {
    const finca = makeFinca({
      finca_id: 'finca-123',
      altitud: 1800,
      area_hectareas: 10,
      municipio: 'Salento',
      cultivos: ['café', 'plátano'],
    });
    expect(finca.finca_id).toBe('finca-123');
    expect(finca.altitud).toBe(1800);
    expect(finca.area_hectareas).toBe(10);
    expect(finca.cultivos).toEqual(['café', 'plátano']);
  });
});

describe('makeInventoryEvent', () => {
  it('crea evento con estructura canónica completa', () => {
    const evt = makeInventoryEvent('RECEIVED', {
      item_id: 'compost-A',
      delta: 50,
      unit: 'kg',
    });
    expect(evt.event_type).toBe('RECEIVED');
    expect(evt.payload.item_id).toBe('compost-A');
    expect(evt.payload.delta).toBe(50);
    expect(evt.payload.unit).toBe('kg');
    expect(evt.schema_version).toBe('1');
    expect(evt.device_id_lex_hash).toBe('AAAA0000');
    expect(evt.sequence_number).toBe(1);
    expect(evt.operator_id_hash).toBe('a'.repeat(64));
    expect(evt.idempotency_key).toContain('RECEIVED:compost-A:');
  });

  it('permite sobreescribir timestamp y device', () => {
    const timestamp = '2026-06-14T10:00:00-05:00';
    const evt = makeInventoryEvent(
      'CONSUMED',
      { item_id: 'semillas', delta: -2, unit: 'kg' },
      { timestamp, device: 'BBBB1111' }
    );
    expect(evt.timestamp).toBe(timestamp);
    expect(evt.device_id_lex_hash).toBe('BBBB1111');
  });

  it('permite sobreescribir id y idempotency_key', () => {
    const evt = makeInventoryEvent(
      'RECEIVED',
      { item_id: 'abono', delta: 100, unit: 'kg' },
      { id: 'CUSTOM-ID', idempotency_key: 'custom-key' }
    );
    expect(evt.id).toBe('CUSTOM-ID');
    expect(evt.idempotency_key).toBe('custom-key');
  });

  it('genera id UUID si no se proporciona', () => {
    const evt = makeInventoryEvent('RECEIVED', {
      item_id: 'test',
      delta: 1,
      unit: 'kg',
    });
    expect(evt.id).toBeDefined();
    expect(evt.id.length).toBe(26); // UUID sin guiones, en upper case
    expect(/^[A-Z0-9]{26}$/.test(evt.id)).toBe(true);
  });
});

describe('makeFarmProcessEvent', () => {
  it('crea evento con estructura de farm process', () => {
    const evt = makeFarmProcessEvent('proc-001', 'sowing_confirmed');
    expect(evt.event_id).toBe('evt-001');
    expect(evt.type).toBe('farm_process_event');
    expect(evt.attributes.process_id).toBe('proc-001');
    expect(evt.attributes.event_type).toBe('sowing_confirmed');
    expect(evt.attributes.actor).toBe('operator');
    expect(evt.attributes.source).toBe('operator');
    expect(evt.attributes.idempotency_key).toBe('key-001');
  });

  it('permite sobreescribir processId y eventType', () => {
    const evt = makeFarmProcessEvent('proc-123', 'harvest_confirmed');
    expect(evt.attributes.process_id).toBe('proc-123');
    expect(evt.attributes.event_type).toBe('harvest_confirmed');
  });

  it('permite sobreescribir campos anidados en attributes', () => {
    const evt = makeFarmProcessEvent('proc-001', 'observation', {
      actor: 'system',
      source: 'automated',
    });
    expect(evt.attributes.actor).toBe('system');
    expect(evt.attributes.source).toBe('automated');
  });

  it('mantiene occurred_at como timestamp por defecto', () => {
    const evt = makeFarmProcessEvent('proc-001', 'sowing_confirmed');
    expect(evt.attributes.occurred_at).toBeDefined();
    expect(typeof evt.attributes.occurred_at).toBe('number');
  });
});

describe('withGrounding', () => {
  it('añade grounding a entidad básica', () => {
    const entity = {
      kind: 'species',
      mentioned: 'café',
      nombre_comun: 'café',
    };
    const grounded = withGrounding(entity, {
      altitud_min: 1000,
      altitud_max: 2000,
      alternativas_viables: ['coco', 'cacao'],
    });
    expect(grounded.kind).toBe('species');
    expect(grounded.mentioned).toBe('café');
    expect(grounded.altitud_min).toBe(1000);
    expect(grounded.altitud_max).toBe(2000);
    expect(grounded.alternativas_viables).toEqual(['coco', 'cacao']);
  });

  it('usa defaults si no se proporcionan rangos', () => {
    const entity = { kind: 'species', mentioned: 'yuca', nombre_comun: 'yuca' };
    const grounded = withGrounding(entity, {});
    expect(grounded.altitud_min).toBe(0);
    expect(grounded.altitud_max).toBe(3000);
    expect(grounded.alternativas_viables).toEqual([]);
  });

  it('acepta altitud_min 0 (valle)', () => {
    const entity = { kind: 'species', mentioned: 'cacao', nombre_comun: 'cacao' };
    const grounded = withGrounding(entity, { altitud_min: 0, altitud_max: 800 });
    expect(grounded.altitud_min).toBe(0);
    expect(grounded.altitud_max).toBe(800);
  });
});

describe('SPECIES fixtures predefinidos', () => {
  it('CAFE tiene grounding correcto', () => {
    expect(SPECIES.CAFE.kind).toBe('species');
    expect(SPECIES.CAFE.nombre_comun).toBe('café');
    expect(SPECIES.CAFE.nombre_cientifico).toBe('Coffea arabica');
    expect(SPECIES.CAFE.altitud_min).toBe(1000);
    expect(SPECIES.CAFE.altitud_max).toBe(2000);
    expect(SPECIES.CAFE.alternativas_viables).toEqual(['coco', 'cacao', 'plátano']);
  });

  it('MANGO tiene grounding correcto', () => {
    expect(SPECIES.MANGO.nombre_comun).toBe('mango');
    expect(SPECIES.MANGO.nombre_cientifico).toBe('Mangifera indica');
    expect(SPECIES.MANGO.altitud_min).toBe(0);
    expect(SPECIES.MANGO.altitud_max).toBe(1000);
    expect(SPECIES.MANGO.alternativas_viables).toEqual(['mora de Castilla', 'curuba']);
  });

  it('YUCA tiene grounding correcto', () => {
    expect(SPECIES.YUCA.nombre_comun).toBe('yuca');
    expect(SPECIES.YUCA.nombre_cientifico).toBe('Manihot esculenta');
    expect(SPECIES.YUCA.altitud_min).toBe(0);
    expect(SPECIES.YUCA.altitud_max).toBe(1800);
  });

  it('PLATANO tiene grounding correcto', () => {
    expect(SPECIES.PLATANO.nombre_comun).toBe('plátano');
    expect(SPECIES.PLATANO.nombre_cientifico).toBe('Musa × paradisiaca');
    expect(SPECIES.PLATANO.altitud_min).toBe(0);
    expect(SPECIES.PLATANO.altitud_max).toBe(1600);
  });

  it('TOMATE tiene grounding correcto', () => {
    expect(SPECIES.TOMATE.nombre_comun).toBe('tomate');
    expect(SPECIES.TOMATE.nombre_cientifico).toBe('Solanum lycopersicum');
    expect(SPECIES.TOMATE.altitud_min).toBe(0);
    expect(SPECIES.TOMATE.altitud_max).toBe(2400);
  });

  it('CACAO tiene grounding correcto', () => {
    expect(SPECIES.CACAO.nombre_comun).toBe('cacao');
    expect(SPECIES.CACAO.nombre_cientifico).toBe('Theobroma cacao');
    expect(SPECIES.CACAO.altitud_min).toBe(0);
    expect(SPECIES.CACAO.altitud_max).toBe(800);
  });
});

describe('USERS fixtures predefinidos', () => {
  it('FILANDIA_1500 tiene perfil correcto', () => {
    expect(USERS.FILANDIA_1500.finca_altitud).toBe(1500);
    expect(USERS.FILANDIA_1500.altitud_source).toBe('user');
    expect(USERS.FILANDIA_1500.municipio).toBe('Filandia');
    expect(USERS.FILANDIA_1500.departamento).toBe('Quindío');
    expect(USERS.FILANDIA_1500.finca_nombre).toBe('Finca El Recuerdo');
  });

  it('SALENTO_1800 tiene perfil correcto', () => {
    expect(USERS.SALENTO_1800.finca_altitud).toBe(1800);
    expect(USERS.SALENTO_1800.municipio).toBe('Salento');
    expect(USERS.SALENTO_1800.departamento).toBe('Quindío');
  });

  it('CALI_1000 tiene perfil correcto', () => {
    expect(USERS.CALI_1000.finca_altitud).toBe(1000);
    expect(USERS.CALI_1000.municipio).toBe('Cali');
    expect(USERS.CALI_1000.departamento).toBe('Valle');
  });
});

describe('FINCAS fixtures predefinidos', () => {
  it('FILANDIA_1500 tiene metadatos correctos', () => {
    expect(FINCAS.FILANDIA_1500.finca_id).toBe('finca-001');
    expect(FINCAS.FILANDIA_1500.altitud).toBe(1500);
    expect(FINCAS.FILANDIA_1500.area_hectareas).toBe(3);
    expect(FINCAS.FILANDIA_1500.municipio).toBe('Filandia');
    expect(FINCAS.FILANDIA_1500.nombre).toBe('Finca El Recuerdo');
  });

  it('SALENTO_1800 tiene metadatos correctos', () => {
    expect(FINCAS.SALENTO_1800.finca_id).toBe('finca-002');
    expect(FINCAS.SALENTO_1800.altitud).toBe(1800);
    expect(FINCAS.SALENTO_1800.area_hectareas).toBe(5);
    expect(FINCAS.SALENTO_1800.municipio).toBe('Salento');
  });
});

describe('compatibilidad con contratos existentes', () => {
  it('makeSpecies es compatible con outputGuards tests', () => {
    const species = makeSpecies({
      nombre_comun: 'café',
      nombre_cientifico: 'Coffea arabica',
      altitud_min: 1000,
      altitud_max: 2000,
      alternativas_viables: ['coco', 'cacao', 'plátano'],
    });
    // outputGuards espera kind, mentioned, nombre_comun, altitud_min, altitud_max
    expect(species.kind).toBeDefined();
    expect(species.mentioned).toBeDefined();
    expect(species.nombre_comun).toBeDefined();
    expect(species.altitud_min).toBeDefined();
    expect(species.altitud_max).toBeDefined();
    expect(species.alternativas_viables).toBeDefined();
  });

  it('makeInventoryEvent es compatible con inventoryService tests', () => {
    const evt = makeInventoryEvent('RECEIVED', {
      item_id: 'compost-A',
      delta: 50,
      unit: 'kg',
    });
    // inventoryService espera event_type, timestamp, payload, schema_version
    expect(evt.event_type).toBeDefined();
    expect(evt.timestamp).toBeDefined();
    expect(evt.payload).toBeDefined();
    expect(evt.schema_version).toBeDefined();
    expect(evt.id).toBeDefined();
    expect(evt.device_id_lex_hash).toBeDefined();
    expect(evt.sequence_number).toBeDefined();
  });

  it('makeFarmProcessEvent es compatible con farmProcessSync tests', () => {
    const evt = makeFarmProcessEvent('proc-001', 'sowing_confirmed');
    // farmProcessSync espera event_id, type, attributes con process_id, event_type
    expect(evt.event_id).toBeDefined();
    expect(evt.type).toBeDefined();
    expect(evt.attributes).toBeDefined();
    expect(evt.attributes.process_id).toBeDefined();
    expect(evt.attributes.event_type).toBeDefined();
    expect(evt.attributes.occurred_at).toBeDefined();
  });

  it('makeUser es compatible con userProfileService tests', () => {
    const user = makeUser({ finca_altitud: 1500 });
    // userProfileService espera finca_altitud, altitud_source
    expect(user.finca_altitud).toBeDefined();
    expect(user.altitud_source).toBeDefined();
  });
});

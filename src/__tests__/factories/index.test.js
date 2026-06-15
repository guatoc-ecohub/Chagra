/**
 * factories.test.js — tests del módulo de factories compartidas.
 *
 * Verifica que:
 *   - Los builders generan objetos válidos según los tipos reales
 *   - Los overrides funcionan correctamente
 *   - Los objetos generados cumplen con los contratos mínimos
 */
import { describe, it, expect } from 'vitest';
import {
  makeFinca,
  makePlanta,
  makeReporte,
  makeSpecies,
  withGrounding,
} from './index';

describe('makeFinca', () => {
  it('genera un asset--land válido con defaults', () => {
    const finca = makeFinca();
    
    expect(finca.id).toMatch(/^land[0-9a-f]{26}$/);
    expect(finca.type).toBe('asset--land');
    expect(finca.attributes.name).toBe('Finca Test');
    expect(finca.attributes.status).toBe('active');
  });

  it('acepta overrides para name y status', () => {
    const finca = makeFinca({ name: 'La Esperanza', status: 'archived' });
    
    expect(finca.attributes.name).toBe('La Esperanza');
    expect(finca.attributes.status).toBe('archived');
  });

  it('acepta override de geometry', () => {
    const geometry = JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] });
    const finca = makeFinca({ geometry });
    
    expect(finca.attributes.geometry).toBe(geometry);
  });

  it('acepta override de notes', () => {
    const finca = makeFinca({ notes: 'Finca de prueba' });
    
    expect(finca.attributes.notes?.value).toBe('Finca de prueba');
  });

  it('acepta override de id personalizado', () => {
    const finca = makeFinca({ id: 'land-custom-123' });
    
    expect(finca.id).toBe('land-custom-123');
  });
});

describe('makePlanta', () => {
  it('genera un asset--plant válido con defaults', () => {
    const planta = makePlanta();
    
    expect(planta.id).toMatch(/^plant[0-9a-f]{26}$/);
    expect(planta.type).toBe('asset--plant');
    expect(planta.attributes.name).toBe('Planta Test');
    expect(planta.attributes.status).toBe('active');
  });

  it('acepta overrides para name, species_slug y quantity', () => {
    const planta = makePlanta({
      name: 'Tomate Chonto',
      species_slug: 'solanum_lycopersicum',
      quantity: 12,
      unit: 'plantas',
    });
    
    expect(planta.attributes.name).toBe('Tomate Chonto');
    expect(planta.attributes.species_slug).toBe('solanum_lycopersicum');
    expect(planta.attributes.quantity?.value).toBe(12);
    expect(planta.attributes.quantity?.unit).toBe('plantas');
  });

  it('agrega relationships.location si se proporciona location_asset_id', () => {
    const planta = makePlanta({ location_asset_id: 'land-123' });
    
    expect(planta.relationships?.location?.data?.id).toBe('land-123');
    expect(planta.relationships?.location?.data?.type).toBe('asset--land');
  });

  it('acepta override de notes', () => {
    const planta = makePlanta({ notes: 'Planta de prueba' });
    
    expect(planta.attributes.notes?.value).toBe('Planta de prueba');
  });
});

describe('makeReporte', () => {
  it('genera un log válido con defaults', () => {
    const reporte = makeReporte();
    
    expect(reporte.id).toMatch(/^log[0-9a-f]{26}$/);
    expect(reporte.type).toBe('log--observation');
    expect(reporte.attributes.status).toBe('pending');
    expect(reporte.attributes.timestamp).toBeGreaterThanOrEqual(Date.now() - 1000);
  });

  it('acepta overrides para type, name y status', () => {
    const reporte = makeReporte({
      type: 'log--task',
      name: 'Riego programado',
      status: 'done',
    });
    
    expect(reporte.type).toBe('log--task');
    expect(reporte.attributes.name).toBe('Riego programado');
    expect(reporte.attributes.status).toBe('done');
  });

  it('acepta overrides para quantity y unit', () => {
    const reporte = makeReporte({ quantity: 5, unit: 'kg' });
    
    expect(reporte.attributes.quantity?.value).toBe(5);
    expect(reporte.attributes.quantity?.unit).toBe('kg');
  });

  it('agrega relationships.asset si se proporciona asset_id', () => {
    const reporte = makeReporte({ asset_id: 'plant-123' });
    
    expect(reporte.relationships?.asset?.data?.id).toBe('plant-123');
    expect(reporte.relationships?.asset?.data?.type).toBe('asset--plant');
  });

  it('acepta override de notes', () => {
    const reporte = makeReporte({ notes: 'Observación de prueba' });
    
    expect(reporte.attributes.notes).toBe('Observación de prueba');
  });

  it('acepta override de timestamp', () => {
    const timestamp = 1600000000;
    const reporte = makeReporte({ timestamp });
    
    expect(reporte.attributes.timestamp).toBe(timestamp);
  });
});

describe('makeSpecies', () => {
  it('genera una especie válida con defaults', () => {
    const species = makeSpecies();
    
    expect(species.slug).toBe('species_test');
    expect(species.canonical_name_es).toBe('Especie Test');
    expect(species.scientific_name).toBe('Testus testus');
    expect(species.categories).toEqual(['hortalizas']);
    expect(species.cultivable).toBe(true);
  });

  it('acepta overrides para nombre_comun, nombre_cientifico y category', () => {
    const species = makeSpecies({
      id: 'tomate',
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum',
      category: 'frutales',
    });
    
    expect(species.slug).toBe('tomate');
    expect(species.canonical_name_es).toBe('Tomate');
    expect(species.scientific_name).toBe('Solanum lycopersicum');
    expect(species.categories).toEqual(['frutales']);
  });

  it('acepta overrides de altitud', () => {
    const species = makeSpecies({
      altitud_min: 1500,
      altitud_max: 2800,
    });
    
    expect(species.altitud_msnm?.min_absoluto).toBe(1500);
    expect(species.altitud_msnm?.max_absoluto).toBe(2800);
  });

  it('acepta cultivable=false', () => {
    const species = makeSpecies({ cultivable: false });
    
    expect(species.cultivable).toBe(false);
  });
});

describe('withGrounding', () => {
  it('agrega metadata _grounding a un objeto', () => {
    const species = makeSpecies({ nombre_comun: 'Tomate' });
    const grounded = withGrounding(species, {
      corpus_file: '/cycle-content/tomate.json',
      embedding_id: 'vec_tomate_001',
    });
    
    expect(grounded._grounding).toBeDefined();
    expect(grounded._grounding?.source).toBe('corpus');
    expect(grounded._grounding?.corpus_file).toBe('/cycle-content/tomate.json');
    expect(grounded._grounding?.embedding_id).toBe('vec_tomate_001');
  });

  it('preserva las propiedades originales del objeto', () => {
    const species = makeSpecies({ nombre_comun: 'Tomate' });
    const grounded = withGrounding(species, {
      corpus_file: '/cycle-content/tomate.json',
    });
    
    expect(grounded.slug).toBe(species.slug);
    expect(grounded.canonical_name_es).toBe(species.canonical_name_es);
    expect(grounded.scientific_name).toBe(species.scientific_name);
  });

  it('acepta override de source y confidence', () => {
    const species = makeSpecies({ nombre_comun: 'Tomate' });
    const grounded = withGrounding(species, {
      source: 'llm',
      corpus_file: '/cycle-content/tomate.json',
      confidence: 0.95,
    });
    
    expect(grounded._grounding?.source).toBe('llm');
    expect(grounded._grounding?.confidence).toBe(0.95);
  });

  it('funciona con otros tipos de objetos', () => {
    const planta = makePlanta({ name: 'Tomate' });
    const grounded = withGrounding(planta, {
      corpus_file: '/cycle-content/planta-tomate.json',
      embedding_id: 'vec_planta_001',
    });
    
    expect(grounded._grounding).toBeDefined();
    expect(grounded.type).toBe('asset--plant');
    expect(grounded.attributes.name).toBe('Tomate');
  });
});
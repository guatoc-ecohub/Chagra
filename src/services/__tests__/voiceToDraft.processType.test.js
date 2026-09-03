/**
 * voiceToDraft.detectProcessType — reconoce reforestación/restauración y
 * silvopastoreo además de la siembra normal, para crear el FarmProcess del tipo
 * correcto desde la voz (antes solo 'sowing').
 */
import { describe, it, expect } from 'vitest';
import { detectProcessType, buildDraftsFromVoice } from '../voiceToDraft';

describe('detectProcessType', () => {
  it('detecta reforestación/restauración', () => {
    expect(detectProcessType('reforesté 50 robles en la cañada')).toBe('restoration');
    expect(detectProcessType('sembré árboles nativos para restaurar el bosque')).toBe('restoration');
  });
  it('detecta silvopastoreo', () => {
    expect(detectProcessType('hice un sistema silvopastoril con leucaena')).toBe('silvopasture');
    expect(detectProcessType('sembré árboles con pasto para el ganado')).toBe('silvopasture');
  });
  it('por defecto es siembra', () => {
    expect(detectProcessType('sembré 10 fresas en el invernadero')).toBe('sowing');
    expect(detectProcessType('')).toBe('sowing');
  });

  it('detecta cosecha (harvest)', () => {
    expect(detectProcessType('coseché 20 kilos de café')).toBe('harvest');
    expect(detectProcessType('recolectamos la arveja')).toBe('harvest');
    expect(detectProcessType('vamos a cosechar el tomate')).toBe('harvest');
  });

  it('detecta post-cosecha (post_harvest)', () => {
    expect(detectProcessType('secado el café en la plataforma')).toBe('post_harvest');
    expect(detectProcessType('almacenamos la cosecha en bodega')).toBe('post_harvest');
    expect(detectProcessType('hicimos poscosecha del maíz')).toBe('post_harvest');
    expect(detectProcessType('beneficiado el café')).toBe('post_harvest');
  });

  it('detecta manejo de plagas (pest_management)', () => {
    expect(detectProcessType('fumigamos el tomate')).toBe('pest_management');
    expect(detectProcessType('control de broca en el café')).toBe('pest_management');
    expect(detectProcessType('aplicamos biol en las matas')).toBe('pest_management');
    expect(detectProcessType('control de plaga en el lote norte')).toBe('pest_management');
  });
});

describe('buildDraftsFromVoice — process_type', () => {
  it('propaga el tipo detectado al draft y usa unidad árboles en reforestación', () => {
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'reforesté 30 robles en el lote alto',
      entities: [{ crop: 'roble', quantity: 30, location: { id: 'l1', type: 'asset--land', name: 'Lote' } }],
    }));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].process_type).toBe('restoration');
    expect(drafts[0].unit).toBe('árboles');
  });

  it('usa unidad kg en cosecha por defecto', () => {
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'coseché 50 kilos de café',
      entities: [{ crop: 'café', quantity: 50, location: 'lote norte' }],
    }));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].process_type).toBe('harvest');
    expect(drafts[0].unit).toBe('kg');
  });

  it('usa unidad kg en post-cosecha por defecto', () => {
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'secado 30 kilos de café',
      entities: [{ crop: 'café', quantity: 30, location: 'bodega' }],
    }));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].process_type).toBe('post_harvest');
    expect(drafts[0].unit).toBe('kg');
  });

  it('usa unidad litros en manejo de plagas por defecto', () => {
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'aplicamos 2 litros de biol en el tomate',
      entities: [{ crop: 'tomate', quantity: 2, location: 'invernadero' }],
    }));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].process_type).toBe('pest_management');
    expect(drafts[0].unit).toBe('litros');
  });
});

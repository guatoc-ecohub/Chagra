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
});

describe('buildDraftsFromVoice — process_type', () => {
  it('propaga el tipo detectado al draft y usa unidad árboles en reforestación', () => {
    const drafts = buildDraftsFromVoice({
      transcription: 'reforesté 30 robles en el lote alto',
      entities: [{ crop: 'roble', quantity: 30, location: { id: 'l1', type: 'asset--land', name: 'Lote' } }],
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].process_type).toBe('restoration');
    expect(drafts[0].unit).toBe('árboles');
  });
});

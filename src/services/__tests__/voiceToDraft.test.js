import { describe, it, expect, vi } from 'vitest';

const mockResolveLocation = vi.fn((loc) => {
  /** @type {any} */ const map = {
    'invernadero': { id: 'land-inv-1', type: 'asset--structure', label: 'Invernadero' },
    'lote norte': { id: 'land-ln-1', type: 'asset--land', label: 'Lote Norte' },
  };
  return map[loc?.toLowerCase()] || null;
});

const mockResolveCrop = vi.fn((crop) => {
  /** @type {any} */ const map = {
    'café': { slug: 'coffea_arabica', label: 'Café castillo', variety: null },
    'tomate': { slug: 'solanum_lycopersicum', label: 'Tomate chonto', variety: 'chonto' },
    'papa': { slug: 'solanum_tuberosum', label: 'Papa pastusa', variety: 'pastusa' },
    'arveja': { slug: 'pisum_sativum', label: 'Arveja', variety: null },
    'roble': { slug: 'quercus_humboldtii', label: 'Roble andino', variety: null },
  };
  return map[crop?.toLowerCase()] || { slug: '', label: crop, variety: null };
});

describe('buildDraftsFromVoice', () => {
  it('retorna array vacio para entities vacio', async () => {
    const { buildDraftsFromVoice } = await import('../voiceToDraft');
    expect(buildDraftsFromVoice(/** @type {any} */ ({ transcription: '', entities: [] }))).toEqual([]);
    expect(buildDraftsFromVoice(/** @type {any} */ ({ transcription: '', entities: null }))).toEqual([]);
  });

  it('convierte entidad basica en draft con campos minimos', async () => {
    const { buildDraftsFromVoice } = await import('../voiceToDraft');
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'Sembré cinco cafés en el invernadero',
      entities: [{ crop: 'café', quantity: 5, location: 'invernadero' }],
      resolveLocation: mockResolveLocation,
      resolveCrop: mockResolveCrop,
    }));

    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.draft_id).toMatch(/^[0-9A-Z]{26}$/);
    expect(d.subject_slug).toBe('coffea_arabica');
    expect(d.subject_label).toBe('Café castillo');
    expect(d.quantity).toBe(5);
    expect(d.location_land_asset_id).toBe('land-inv-1');
    expect(d.location_land_label).toBe('Invernadero');
    expect(d.process_type).toBe('sowing');
  });

  it('incluye RAG insights si estan presentes en _ragInsights', async () => {
    const { buildDraftsFromVoice } = await import('../voiceToDraft');
    const rag = {
      companions: [{ especie: 'Maíz', razon: 'Sombra' }],
      antagonists: [],
      biopreparados: [{ nombre: 'Bocashi', uso: 'Al trasplante' }],
      invasive: true,
      warnings: ['Especie invasora'],
    };
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'Cinco tomates en lote norte',
      entities: [{ crop: 'tomate', quantity: 5, location: 'lote norte', _ragInsights: rag }],
      resolveLocation: /** @type {any} */ (mockResolveLocation),
      resolveCrop: /** @type {any} */ (mockResolveCrop),
    }));

    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.companions).toHaveLength(1);
    expect(d.invasive).toBe(true);
    expect(d.biopreparados[0].nombre).toBe('Bocashi');
  });

  it('usa unit=plantas para individual y semillas para aggregate', async () => {
    const { buildDraftsFromVoice } = await import('../voiceToDraft');
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'Arveja en lote norte',
      entities: [{ crop: 'arveja', quantity: 20, location: 'lote norte' }],
      resolveLocation: /** @type {any} */ (mockResolveLocation),
      resolveCrop: /** @type {any} */ (mockResolveCrop),
    }));
    // arveja = pisum_sativum = leguminosas_granos → aggregate → semillas
    expect(drafts[0].subject_kind).toBe('aggregate');
    expect(drafts[0].unit).toBe('semillas');
  });

  it('resuelve multi-entidad correctamente', async () => {
    const { buildDraftsFromVoice } = await import('../voiceToDraft');
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'Dos cafés y tres tomates en invernadero',
      entities: [
        { crop: 'café', quantity: 2, location: 'invernadero' },
        { crop: 'tomate', quantity: 3, location: 'invernadero' },
      ],
      resolveLocation: /** @type {any} */ (mockResolveLocation),
      resolveCrop: /** @type {any} */ (mockResolveCrop),
    }));

    expect(drafts).toHaveLength(2);
    expect(drafts[0].subject_slug).toBe('coffea_arabica');
    expect(drafts[1].subject_slug).toBe('solanum_lycopersicum');
    expect(drafts[0].draft_id).not.toBe(drafts[1].draft_id);
  });

  it('fallback a nombre crudo si resolveCrop no resuelve', async () => {
    const resolveCropUnknown = vi.fn(() => ({ slug: '', label: '', variety: null }));
    const { buildDraftsFromVoice } = await import('../voiceToDraft');
    const drafts = buildDraftsFromVoice(/** @type {any} */ ({
      transcription: 'Algo raro en invernadero',
      entities: [{ crop: 'planta_misteriosa', quantity: 1, location: 'invernadero' }],
      resolveLocation: /** @type {any} */ (mockResolveLocation),
      resolveCrop: /** @type {any} */ (resolveCropUnknown),
    }));

    expect(drafts[0].subject_slug).toBe('');
    expect(drafts[0].subject_label).toBe('planta_misteriosa');
    expect(drafts[0].subject_kind).toBe('individual'); // fallback
  });
});

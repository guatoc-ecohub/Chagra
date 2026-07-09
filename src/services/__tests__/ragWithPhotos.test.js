/**
 * ragWithPhotos.test.js — cobertura del service que combina passages del RAG
 * con fotos del operador (L1.6, pre-demo-institucional 2026-05-19).
 *
 * Estrategia:
 *   - Mockeamos `../ragRetriever` (retrieve) y `../photoService`
 *     (listUserPhotosBySpecies) para evitar fetch + IndexedDB.
 *   - Verificamos:
 *     1. Shape compuesto correcto.
 *     2. Agrupación por species_slug única (sin duplicar fetch de fotos).
 *     3. Respeta `photosPerSpecies` (top-N por capturedAt desc).
 *     4. Species sin fotos → array vacío en el mapa.
 *     5. `topK` se propaga a retrieve().
 *     6. Failure path: si retrieve devuelve [], no se llama listUserPhotosBySpecies.
 *     7. Failure path: si una species rompe listUserPhotosBySpecies, las otras
 *        siguen devolviendo fotos.
 *     8. `photosPerSpecies: 0` desactiva el join lateral.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn(),
}));

vi.mock('../photoService', () => ({
  listUserPhotosBySpecies: vi.fn(),
}));

import { retrieve } from '../ragRetriever';
import { listUserPhotosBySpecies } from '../photoService';
import { retrieveWithPhotos } from '../ragWithPhotos';

function fakeBlob(label = 'jpg') {
  // Devolver un objeto opaco — el service no debe inspeccionar el contenido.
  return { __blob: true, label };
}

/** @param {{ id: any, speciesSlug: string, capturedAt: string, label?: string }} p */
function fakePhoto({ id, speciesSlug, capturedAt, label }) {
  return {
    id,
    blob: fakeBlob(label || `photo-${id}`),
    speciesSlug,
    assetId: `asset-${id}`,
    capturedAt,
    createdAt: capturedAt,
    mime: 'image/jpeg',
    size: 12345,
  };
}

describe('ragWithPhotos.retrieveWithPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve shape { passages, photosBySpecies } con fotos agrupadas por species_slug', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'valor_pedagogico', text: 'La fresa…', species: 'fragaria_test', score: 3.2 },
      { key: 'feeding_plan_markdown', text: '### Plan…', species: 'fragaria_test', score: 2.1 },
      { key: 'valor_pedagogico', text: 'El café…', species: 'coffea_test', score: 1.7 },
    ]);

    vi.mocked(listUserPhotosBySpecies).mockImplementation(async (slug) => {
      if (slug === 'fragaria_test') {
        return [
          fakePhoto({ id: 1, speciesSlug: 'fragaria_test', capturedAt: '2026-05-10T10:00:00Z' }),
          fakePhoto({ id: 2, speciesSlug: 'fragaria_test', capturedAt: '2026-05-15T10:00:00Z' }),
          fakePhoto({ id: 3, speciesSlug: 'fragaria_test', capturedAt: '2026-05-18T10:00:00Z' }),
        ];
      }
      if (slug === 'coffea_test') {
        return [fakePhoto({ id: 4, speciesSlug: 'coffea_test', capturedAt: '2026-05-12T10:00:00Z' })];
      }
      return [];
    });

    const result = await retrieveWithPhotos('fresa café', 5);

    expect(result.passages).toHaveLength(3);
    expect(Object.keys(result.photosBySpecies).sort()).toEqual(['coffea_test', 'fragaria_test']);

    // Default photosPerSpecies = 2; las más recientes primero.
    expect(result.photosBySpecies.fragaria_test).toHaveLength(2);
    expect(result.photosBySpecies.fragaria_test.map((p) => p.id)).toEqual([3, 2]);

    expect(result.photosBySpecies.coffea_test).toHaveLength(1);
    expect(result.photosBySpecies.coffea_test[0].id).toBe(4);

    // No se hace fetch duplicado de fragaria_test aunque aparezca en 2 passages.
    expect(listUserPhotosBySpecies).toHaveBeenCalledTimes(2);
    expect(listUserPhotosBySpecies).toHaveBeenCalledWith('fragaria_test');
    expect(listUserPhotosBySpecies).toHaveBeenCalledWith('coffea_test');
  });

  it('respeta el override photosPerSpecies', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'k', text: 't', species: 'fragaria_test', score: 1 },
    ]);
    vi.mocked(listUserPhotosBySpecies).mockResolvedValueOnce([
      fakePhoto({ id: 1, speciesSlug: 'fragaria_test', capturedAt: '2026-05-10T10:00:00Z' }),
      fakePhoto({ id: 2, speciesSlug: 'fragaria_test', capturedAt: '2026-05-15T10:00:00Z' }),
      fakePhoto({ id: 3, speciesSlug: 'fragaria_test', capturedAt: '2026-05-18T10:00:00Z' }),
    ]);

    const result = await retrieveWithPhotos('q', 5, { photosPerSpecies: 1 });
    expect(result.photosBySpecies.fragaria_test).toHaveLength(1);
    expect(result.photosBySpecies.fragaria_test[0].id).toBe(3);
  });

  it('species sin fotos quedan con array vacío', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'k', text: 't', species: 'lechuga_test', score: 1 },
    ]);
    vi.mocked(listUserPhotosBySpecies).mockResolvedValueOnce([]);

    const result = await retrieveWithPhotos('lechuga', 3);
    expect(result.passages).toHaveLength(1);
    expect(result.photosBySpecies).toEqual({ lechuga_test: [] });
  });

  it('propaga topK al llamar retrieve', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([]);
    await retrieveWithPhotos('algo', 7);
    expect(retrieve).toHaveBeenCalledWith('algo', 7);
  });

  it('topK default = 5 cuando no se pasa', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([]);
    await retrieveWithPhotos('algo');
    expect(retrieve).toHaveBeenCalledWith('algo', 5);
  });

  it('si retrieve devuelve [], no llama listUserPhotosBySpecies y devuelve mapa vacío', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([]);

    const result = await retrieveWithPhotos('query sin matches', 5);
    expect(result.passages).toEqual([]);
    expect(result.photosBySpecies).toEqual({});
    expect(listUserPhotosBySpecies).not.toHaveBeenCalled();
  });

  it('si retrieve devuelve passages sin species_slug, no rompe y mapa queda vacío', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'k', text: 'pasaje suelto sin species' },
      { key: 'k2', text: 'otro sin species', species: null },
    ]);

    const result = await retrieveWithPhotos('q', 5);
    expect(result.passages).toHaveLength(2);
    expect(result.photosBySpecies).toEqual({});
    expect(listUserPhotosBySpecies).not.toHaveBeenCalled();
  });

  it('si una species rompe listUserPhotosBySpecies, las otras siguen', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'k', text: 't', species: 'fragaria_test', score: 2 },
      { key: 'k', text: 't', species: 'coffea_test', score: 1 },
    ]);
    vi.mocked(listUserPhotosBySpecies).mockImplementation(async (slug) => {
      if (slug === 'fragaria_test') throw new Error('IDB exploded for fragaria');
      if (slug === 'coffea_test') {
        return [fakePhoto({ id: 9, speciesSlug: 'coffea_test', capturedAt: '2026-05-17T00:00:00Z' })];
      }
      return [];
    });

    const result = await retrieveWithPhotos('q', 5);
    expect(result.photosBySpecies.fragaria_test).toEqual([]);
    expect(result.photosBySpecies.coffea_test).toHaveLength(1);
    expect(result.photosBySpecies.coffea_test[0].id).toBe(9);
  });

  it('photosPerSpecies: 0 desactiva el join lateral', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'k', text: 't', species: 'fragaria_test', score: 1 },
    ]);
    const result = await retrieveWithPhotos('q', 5, { photosPerSpecies: 0 });
    expect(result.passages).toHaveLength(1);
    expect(result.photosBySpecies).toEqual({});
    expect(listUserPhotosBySpecies).not.toHaveBeenCalled();
  });

  it('si retrieve lanza excepción, devuelve shape vacío sin propagar', async () => {
    vi.mocked(retrieve).mockRejectedValueOnce(new Error('boom'));
    const result = await retrieveWithPhotos('q', 5);
    expect(result).toEqual({ passages: [], photosBySpecies: {} });
    expect(listUserPhotosBySpecies).not.toHaveBeenCalled();
  });

  it('photos sin capturedAt quedan al final (fallback createdAt)', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { key: 'k', text: 't', species: 'fragaria_test', score: 1 },
    ]);
    vi.mocked(listUserPhotosBySpecies).mockResolvedValueOnce([
      { id: 1, speciesSlug: 'fragaria_test', blob: fakeBlob(), createdAt: '2026-05-10T10:00:00Z' },
      { id: 2, speciesSlug: 'fragaria_test', blob: fakeBlob(), capturedAt: '2026-05-15T10:00:00Z' },
      { id: 3, speciesSlug: 'fragaria_test', blob: fakeBlob() }, // sin fecha
    ]);

    const result = await retrieveWithPhotos('q', 5, { photosPerSpecies: 3 });
    expect(result.photosBySpecies.fragaria_test.map((p) => p.id)).toEqual([2, 1, 3]);
  });
});

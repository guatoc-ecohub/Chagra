import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de la cola offline de fotos de visión (V-07 #228).
 *
 * Cuando el usuario captura una foto para diagnóstico/ID de especie SIN
 * conexión (navigator.onLine === false), la foto se encola en IndexedDB
 * (store dedicado `vision_queue`) en vez de perderse. Al volver la conexión,
 * `flushVisionQueue()` corre el diagnóstico de cada item encolado y deja el
 * resultado disponible.
 *
 * Patrón: réplica de feedbackService.offline.test.js pero con IndexedDB
 * (los blobs de imagen son grandes — NO localStorage) y mock de aiService
 * (analyzeFoliage / recognizeSpeciesGrounded) para no pegar al modelo.
 */

import { makeFakeDB } from '../../test-utils/index.js';

let fakeDB;

vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(async () => fakeDB),
  STORES: { VISION_QUEUE: 'vision_queue' },
}));

// Mock de aiService — las funciones de visión NO deben pegar al modelo en tests.
const analyzeFoliage = vi.fn();
const recognizeSpeciesGrounded = vi.fn();
vi.mock('../aiService', () => ({
  analyzeFoliage: (...a) => analyzeFoliage(...a),
  recognizeSpeciesGrounded: (...a) => recognizeSpeciesGrounded(...a),
}));

import {
  enqueuePhoto,
  flushVisionQueue,
  getQueuedPhotos,
  clearVisionQueue,
} from '../visionQueueService.js';

import { setOnline } from '../../test-utils/index.js';

const fakeBlob = () => new Blob(['x'], { type: 'image/jpeg' });

beforeEach(() => {
  fakeDB = makeFakeDB();
  analyzeFoliage.mockReset();
  recognizeSpeciesGrounded.mockReset();
  setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

describe('visionQueueService — enqueue', () => {
  it('enqueuePhoto persiste y getQueuedPhotos lo lee', async () => {
    const id = await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage', meta: { speciesSlug: 'cafe' } });
    expect(id).toBeTruthy();
    const q = await getQueuedPhotos();
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('foliage');
    expect(q[0].status).toBe('pending');
    expect(q[0].imageBlob).toBeInstanceOf(Blob);
    expect(q[0].meta.speciesSlug).toBe('cafe');
    expect(q[0].createdAt).toBeTruthy();
  });

  it('rechaza un kind inválido', async () => {
    await expect(
      enqueuePhoto(/** @type {any} */ ({ imageBlob: fakeBlob(), kind: 'invalido' }))
    ).rejects.toThrow();
  });

  it('rechaza si falta el imageBlob', async () => {
    await expect(enqueuePhoto(/** @type {any} */ ({ kind: 'foliage' }))).rejects.toThrow();
  });
});

describe('visionQueueService — flush con éxito', () => {
  it('corre analyzeFoliage para items foliage y guarda el resultado', async () => {
    analyzeFoliage.mockResolvedValue({ score: 80, issues: [], treatment_suggestion: '' });
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage', meta: { speciesSlug: 'cafe' } });

    const processed = await flushVisionQueue();
    expect(processed).toBe(1);
    expect(analyzeFoliage).toHaveBeenCalledTimes(1);
    // Propaga meta (speciesSlug) a las opts del modelo
    expect(analyzeFoliage.mock.calls[0][1]).toMatchObject({ speciesSlug: 'cafe' });

    const q = await getQueuedPhotos();
    expect(q).toHaveLength(1);
    expect(q[0].status).toBe('done');
    expect(q[0].result).toMatchObject({ score: 80 });
  });

  it('corre recognizeSpeciesGrounded para items species', async () => {
    recognizeSpeciesGrounded.mockResolvedValue({ common_name_es: 'cafe', confidence: 0.9 });
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'species' });

    const processed = await flushVisionQueue();
    expect(processed).toBe(1);
    expect(recognizeSpeciesGrounded).toHaveBeenCalledTimes(1);
    expect(analyzeFoliage).not.toHaveBeenCalled();

    const q = await getQueuedPhotos();
    expect(q[0].status).toBe('done');
    expect(q[0].result).toMatchObject({ common_name_es: 'cafe' });
  });

  it('flushVisionQueue no hace nada con la cola vacía', async () => {
    const processed = await flushVisionQueue();
    expect(processed).toBe(0);
    expect(analyzeFoliage).not.toHaveBeenCalled();
    expect(recognizeSpeciesGrounded).not.toHaveBeenCalled();
  });

  it('no reprocesa items ya en done', async () => {
    analyzeFoliage.mockResolvedValue({ score: 50, issues: [] });
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage' });
    await flushVisionQueue();
    analyzeFoliage.mockClear();

    const processed = await flushVisionQueue();
    expect(processed).toBe(0);
    expect(analyzeFoliage).not.toHaveBeenCalled();
  });
});

describe('visionQueueService — flush con fallo', () => {
  it('un item que falla (throw) queda en cola con status error (no se pierde)', async () => {
    analyzeFoliage.mockRejectedValue(new Error('modelo caido'));
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage' });

    const processed = await flushVisionQueue();
    expect(processed).toBe(0); // 0 exitosos

    const q = await getQueuedPhotos();
    expect(q).toHaveLength(1); // sigue en cola
    expect(q[0].status).toBe('error');
    expect(q[0].imageBlob).toBeInstanceOf(Blob); // conserva la captura
  });

  it('un item con resultado null (modelo no parseable) queda en error para reintentar', async () => {
    analyzeFoliage.mockResolvedValue(null);
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage' });

    const processed = await flushVisionQueue();
    expect(processed).toBe(0);
    const q = await getQueuedPhotos();
    expect(q[0].status).toBe('error');
  });

  it('un item que falla NO impide procesar los demás', async () => {
    analyzeFoliage
      .mockRejectedValueOnce(new Error('falla 1'))
      .mockResolvedValueOnce({ score: 90, issues: [] });
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage', meta: { tag: 'a' } });
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage', meta: { tag: 'b' } });

    const processed = await flushVisionQueue();
    expect(processed).toBe(1); // el segundo sí
    expect(analyzeFoliage).toHaveBeenCalledTimes(2);

    const q = await getQueuedPhotos();
    const errored = q.filter((i) => i.status === 'error');
    const done = q.filter((i) => i.status === 'done');
    expect(errored).toHaveLength(1);
    expect(done).toHaveLength(1);
  });
});

describe('visionQueueService — orden', () => {
  it('procesa en orden de captura (FIFO por createdAt)', async () => {
    const order = [];
    analyzeFoliage.mockImplementation(async (_blob, opts) => {
      order.push(opts.__tag);
      return { score: 1, issues: [] };
    });
    // Encolar con createdAt explícitos desordenados para forzar el sort.
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage', meta: { __tag: 'segundo', createdAt: 2000 } });
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage', meta: { __tag: 'primero', createdAt: 1000 } });

    await flushVisionQueue();
    expect(order).toEqual(['primero', 'segundo']);
  });
});

describe('visionQueueService — offline encola sin llamar al modelo', () => {
  it('offline: enqueuePhoto NO invoca aiService, solo persiste', async () => {
    setOnline(false);
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage' });
    expect(analyzeFoliage).not.toHaveBeenCalled();
    expect(recognizeSpeciesGrounded).not.toHaveBeenCalled();
    const q = await getQueuedPhotos();
    expect(q).toHaveLength(1);
    expect(q[0].status).toBe('pending');
  });

  it('clearVisionQueue vacía la cola', async () => {
    await enqueuePhoto({ imageBlob: fakeBlob(), kind: 'foliage' });
    expect(await getQueuedPhotos()).toHaveLength(1);
    await clearVisionQueue();
    expect(await getQueuedPhotos()).toHaveLength(0);
  });
});

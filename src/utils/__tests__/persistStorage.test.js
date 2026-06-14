/**
 * persistStorage.test.js — U-1: solicitud de almacenamiento PERSISTENTE.
 *
 * Contrato cubierto:
 *   - requestPersistentStorage() llama navigator.storage.persist() cuando la
 *     API existe y el origen NO es persistente todavía.
 *   - Es idempotente: si ya es persistente, NO vuelve a llamar persist().
 *   - Tolera la ausencia de la API (navegadores viejos) sin lanzar.
 *   - Tolera que persist()/persisted() lancen, devolviendo false sin romper.
 *   - isStoragePersisted() refleja el estado real.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { requestPersistentStorage, isStoragePersisted } from '../persistStorage';

const originalStorage = navigator.storage;

afterEach(() => {
  // Restaurar navigator.storage al estado original tras cada test.
  Object.defineProperty(navigator, 'storage', {
    value: originalStorage,
    configurable: true,
    writable: true,
  });
  vi.restoreAllMocks();
});

function setStorage(value) {
  Object.defineProperty(navigator, 'storage', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('requestPersistentStorage (U-1)', () => {
  it('llama persist() y devuelve true cuando se concede y no era persistente', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const persisted = vi.fn(() => Promise.resolve(false));
    setStorage({ persist, persisted });

    const ok = await requestPersistentStorage();

    expect(ok).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('es idempotente: si ya es persistente NO vuelve a llamar persist()', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const persisted = vi.fn(() => Promise.resolve(true));
    setStorage({ persist, persisted });

    const ok = await requestPersistentStorage();

    expect(ok).toBe(true);
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).not.toHaveBeenCalled();
  });

  it('devuelve false (sin lanzar) si la API no existe', async () => {
    setStorage(undefined);
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('devuelve false si existe persist() pero el navegador lo deniega', async () => {
    const persist = vi.fn(() => Promise.resolve(false));
    setStorage({ persist, persisted: vi.fn(() => Promise.resolve(false)) });

    await expect(requestPersistentStorage()).resolves.toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('tolera que persist() lance: devuelve false, no propaga', async () => {
    const persist = vi.fn(() => Promise.reject(new Error('boom')));
    setStorage({ persist, persisted: vi.fn(() => Promise.resolve(false)) });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('si persisted() lanza, igual intenta persist()', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const persisted = vi.fn(() => Promise.reject(new Error('no persisted')));
    setStorage({ persist, persisted });

    const ok = await requestPersistentStorage();

    expect(ok).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });
});

describe('isStoragePersisted (U-1)', () => {
  it('devuelve el valor de navigator.storage.persisted()', async () => {
    setStorage({ persisted: vi.fn(() => Promise.resolve(true)) });
    await expect(isStoragePersisted()).resolves.toBe(true);
  });

  it('devuelve false si la API no existe', async () => {
    setStorage(undefined);
    await expect(isStoragePersisted()).resolves.toBe(false);
  });

  it('tolera que persisted() lance', async () => {
    setStorage({ persisted: vi.fn(() => Promise.reject(new Error('x'))) });
    await expect(isStoragePersisted()).resolves.toBe(false);
  });
});

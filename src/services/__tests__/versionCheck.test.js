/**
 * versionCheck.test.js — TDD del self-heal por versión (auto-recuperación del
 * bundle stale, prod-down 2026-06-18).
 *
 * Contrato:
 *  1. shasMatch: short/full SHA del mismo build = match; distintos = no; vacíos
 *     = no; prefijos triviales (<7) = no (anti falso-positivo).
 *  2. shouldSelfHeal: solo true cuando online + no recargado + SHAs difieren +
 *     runningSha real (no 'dev'). Offline / ya-recargado / sin deployedSha /
 *     dev → false (offline-first + anti-loop).
 *  3. fetchDeployedSha: parsea {sha}/{commit}/{build}; null en !ok / no-JSON /
 *     fetch lanzando (offline). Pide cache:'no-store'.
 *  4. runSelfHealCheck: primera detección avisa + marca pending; el siguiente
 *     arranque con el mismo SHA pendiente recarga UNA vez.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  shasMatch,
  shouldSelfHeal,
  fetchDeployedSha,
  runSelfHealCheck,
  VERSION_ENDPOINT,
  PENDING_UPDATE_SHA_KEY,
} from '../versionCheck';

describe('shasMatch', () => {
  it('match exacto', () => {
    expect(shasMatch('a1b2c3d', 'a1b2c3d')).toBe(true);
  });
  it('match short vs full (prefijo)', () => {
    expect(shasMatch('a1b2c3d', 'a1b2c3d4e5f6')).toBe(true);
    expect(shasMatch('a1b2c3d4e5f6', 'a1b2c3d')).toBe(true);
  });
  it('case-insensitive + trim', () => {
    expect(shasMatch('  A1B2C3D ', 'a1b2c3d')).toBe(true);
  });
  it('SHAs distintos → no match', () => {
    expect(shasMatch('a1b2c3d', 'f9e8d7c')).toBe(false);
  });
  it('vacío / null → no match', () => {
    expect(shasMatch('', 'a1b2c3d')).toBe(false);
    expect(shasMatch(null, undefined)).toBe(false);
  });
  it('prefijo trivial (<7 chars) → no match (anti falso-positivo)', () => {
    expect(shasMatch('a1b', 'a1b2c3d4e5')).toBe(false);
  });
});

describe('shouldSelfHeal', () => {
  const base = { runningSha: 'a1b2c3d', deployedSha: 'f9e8d7c', alreadyReloaded: false, online: true };

  it('mismatch + online + no recargado + sha real → true', () => {
    expect(shouldSelfHeal(base)).toBe(true);
  });
  it('offline → false (offline-first)', () => {
    expect(shouldSelfHeal({ ...base, online: false })).toBe(false);
  });
  it('ya recargado → false (anti-loop)', () => {
    expect(shouldSelfHeal({ ...base, alreadyReloaded: true })).toBe(false);
  });
  it('sin deployedSha → false', () => {
    expect(shouldSelfHeal({ ...base, deployedSha: null })).toBe(false);
  });
  it('runningSha "dev" → false (no-op en dev)', () => {
    expect(shouldSelfHeal({ ...base, runningSha: 'dev' })).toBe(false);
  });
  it('SHAs iguales → false (en sync)', () => {
    expect(shouldSelfHeal({ ...base, deployedSha: 'a1b2c3d' })).toBe(false);
  });
});

describe('fetchDeployedSha', () => {
  const okResponse = (body) => ({ ok: true, json: async () => body });

  it('extrae sha del JSON', async () => {
    const fetchImpl = vi.fn(async () => okResponse({ sha: 'a1b2c3d' }));
    await expect(fetchDeployedSha({ fetchImpl })).resolves.toBe('a1b2c3d');
    expect(fetchImpl).toHaveBeenCalledWith(
      VERSION_ENDPOINT,
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
  it('acepta commit / build como alias', async () => {
    await expect(
      fetchDeployedSha({ fetchImpl: async () => okResponse({ commit: 'c0mm1t7' }) }),
    ).resolves.toBe('c0mm1t7');
    await expect(
      fetchDeployedSha({ fetchImpl: async () => okResponse({ build: 'bu1ld00' }) }),
    ).resolves.toBe('bu1ld00');
  });
  it('respuesta !ok → null', async () => {
    await expect(
      fetchDeployedSha({ fetchImpl: async () => ({ ok: false }) }),
    ).resolves.toBeNull();
  });
  it('fetch lanza (offline) → null, no throw', async () => {
    await expect(
      fetchDeployedSha({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }),
    ).resolves.toBeNull();
  });
  it('JSON sin sha → null', async () => {
    await expect(
      fetchDeployedSha({ fetchImpl: async () => okResponse({ foo: 'bar' }) }),
    ).resolves.toBeNull();
  });
});

describe('runSelfHealCheck', () => {
  function makeDeps(overrides = {}) {
    const reload = vi.fn();
    const skipWaiting = vi.fn(async () => {});
    const markReloaded = vi.fn();
    const writePending = vi.fn();
    const clearPending = vi.fn();
    const notifyUpdateAvailable = vi.fn();
    return {
      deps: {
        runningSha: 'a1b2c3d',
        getDeployedSha: async () => 'f9e8d7c', // distinto → mismatch
        isOnline: () => true,
        alreadyReloaded: () => false,
        markReloaded,
        readPending: () => null,
        writePending,
        clearPending,
        notifyUpdateAvailable,
        skipWaiting,
        reload,
        ...overrides,
      },
      reload,
      skipWaiting,
      markReloaded,
      writePending,
      clearPending,
      notifyUpdateAvailable,
    };
  }

  it('primer mismatch → muestra banner, marca pending y manda skipWaiting sin recarga directa', async () => {
    const { deps, reload, skipWaiting, markReloaded, writePending, notifyUpdateAvailable } = makeDeps();
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(res.reason).toBe('update-pending');
    expect(writePending).toHaveBeenCalledWith('f9e8d7c');
    expect(notifyUpdateAvailable).toHaveBeenCalledWith('f9e8d7c');
    expect(skipWaiting).toHaveBeenCalledTimes(1);
    expect(markReloaded).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('mismatch ya pendiente de un arranque anterior → recarga UNA vez', async () => {
    const { deps, reload, skipWaiting, markReloaded } = makeDeps({
      readPending: () => 'f9e8d7c',
    });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(true);
    expect(res.reason).toBe('sha-mismatch');
    expect(skipWaiting).toHaveBeenCalledTimes(1);
    expect(markReloaded).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('SHAs en sync → no-op (no recarga)', async () => {
    const { deps, reload, clearPending } = makeDeps({ getDeployedSha: async () => 'a1b2c3d' });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(clearPending).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('offline → no-op (offline-first)', async () => {
    const { deps, reload, skipWaiting } = makeDeps({ isOnline: () => false });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(res.reason).toBe('offline');
    expect(reload).not.toHaveBeenCalled();
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('ya recargado → no-op (anti-loop)', async () => {
    const { deps, reload } = makeDeps({ alreadyReloaded: () => true });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(res.reason).toBe('already-reloaded');
    expect(reload).not.toHaveBeenCalled();
  });

  it('/version.json no disponible → no-op (no rompe boot)', async () => {
    const { deps, reload } = makeDeps({ getDeployedSha: async () => null });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('skipWaiting lanza en primera detección → queda pending y no bloquea el boot', async () => {
    const { deps, reload } = makeDeps({ skipWaiting: async () => { throw new Error('no SW'); } });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(res.reason).toBe('update-pending');
    expect(reload).not.toHaveBeenCalled();
  });

  it('helpers de pending usan localStorage', async () => {
    localStorage.clear();
    const { writePendingUpdateSha, readPendingUpdateSha, clearPendingUpdateSha } = await import('../versionCheck');
    writePendingUpdateSha('abc1234');
    expect(localStorage.getItem(PENDING_UPDATE_SHA_KEY)).toBe('abc1234');
    expect(readPendingUpdateSha()).toBe('abc1234');
    clearPendingUpdateSha();
    expect(readPendingUpdateSha()).toBeNull();
  });
});

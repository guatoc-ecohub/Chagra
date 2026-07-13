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
 *  3. isBundleFetchFailure: detecta fallos de chunks/bundles lazy sin confundir
 *     fetches de API.
 *  4. fetchDeployedSha: parsea {sha}/{commit}/{build}; null en !ok / no-JSON /
 *     fetch lanzando (offline). Pide cache:'no-store'.
 *  5. runSelfHealCheck: mismatch de versión desregistra el SW + recarga UNA
 *     vez, con guard de sesión.
 *  6. installBundleRecoveryGuards: un unhandledrejection de bundle/chunk
 *     dispara el mismo recovery y no entra en loop.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  shasMatch,
  shouldSelfHeal,
  isBundleFetchFailure,
  fetchDeployedSha,
  runSelfHealCheck,
  installBundleRecoveryGuards,
  VERSION_ENDPOINT,
  SELF_HEAL_GUARD_KEY,
  hasSelfHealReloaded,
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

describe('isBundleFetchFailure', () => {
  it('detecta failed fetch de chunk o module lazy', () => {
    expect(
      isBundleFetchFailure(new TypeError('Failed to fetch dynamically imported module: https://x/assets/App-abc.js')),
    ).toBe(true);
    expect(
      isBundleFetchFailure('Loading chunk DashboardLive failed.'),
    ).toBe(true);
  });

  it('no confunde fetch de API o errores genéricos', () => {
    expect(isBundleFetchFailure(new Error('NetworkError when attempting to fetch resource'))).toBe(false);
    expect(isBundleFetchFailure('Error al consultar FarmOS')).toBe(false);
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
      fetchDeployedSha({ fetchImpl: /** @type {any} */ (async () => ({ ok: false })) }),
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
    const unregisterServiceWorker = vi.fn(async () => true);
    const markReloaded = vi.fn();
    return {
      deps: {
        runningSha: 'a1b2c3d',
        getDeployedSha: async () => 'f9e8d7c', // distinto → mismatch
        isOnline: () => true,
        alreadyReloaded: () => false,
        markReloaded,
        unregisterServiceWorker,
        reload,
        ...overrides,
      },
      reload,
      unregisterServiceWorker,
      markReloaded,
    };
  }

  it('mismatch de versión → desregistra el SW y recarga una sola vez', async () => {
    const { deps, reload, unregisterServiceWorker, markReloaded } = makeDeps();
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(true);
    expect(res.reason).toBe('sha-mismatch');
    expect(markReloaded).toHaveBeenCalledTimes(1);
    expect(unregisterServiceWorker).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('SHAs en sync → no-op (no recarga)', async () => {
    const { deps, reload, unregisterServiceWorker, markReloaded } = makeDeps({ getDeployedSha: async () => 'a1b2c3d' });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(markReloaded).not.toHaveBeenCalled();
    expect(unregisterServiceWorker).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('offline → no-op (offline-first)', async () => {
    const { deps, reload, unregisterServiceWorker } = makeDeps({ isOnline: () => false });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(res.reason).toBe('offline');
    expect(reload).not.toHaveBeenCalled();
    expect(unregisterServiceWorker).not.toHaveBeenCalled();
  });

  it('ya recargado → no-op (anti-loop)', async () => {
    const { deps, reload, unregisterServiceWorker } = makeDeps({ alreadyReloaded: () => true });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(res.reason).toBe('already-reloaded');
    expect(reload).not.toHaveBeenCalled();
    expect(unregisterServiceWorker).not.toHaveBeenCalled();
  });

  it('/version.json no disponible → no-op (no rompe boot)', async () => {
    const { deps, reload, unregisterServiceWorker } = makeDeps({ getDeployedSha: async () => null });
    const res = await runSelfHealCheck(deps);
    expect(res.healed).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(unregisterServiceWorker).not.toHaveBeenCalled();
  });

  it('marca la sesión al recuperar, para no reentrar en loop', async () => {
    sessionStorage.removeItem(SELF_HEAL_GUARD_KEY);
    const { deps } = makeDeps({ markReloaded: undefined });
    await runSelfHealCheck(deps);
    expect(hasSelfHealReloaded()).toBe(true);
  });
});

describe('installBundleRecoveryGuards', () => {
  it('un unhandledrejection de chunk dispara unregister + reload una sola vez', async () => {
    sessionStorage.removeItem(SELF_HEAL_GUARD_KEY);
    const unregisterServiceWorker = vi.fn(async () => true);
    const reload = vi.fn();
    const cleanup = installBundleRecoveryGuards({
      unregisterServiceWorker,
      reload,
    });

    const makeEvt = () => {
      const evt = new Event('unhandledrejection');
      Object.defineProperty(evt, 'reason', {
        configurable: true,
        value: new TypeError('Failed to fetch dynamically imported module: https://example.com/assets/App-123.js'),
      });
      return evt;
    };

    window.dispatchEvent(makeEvt());
    await Promise.resolve();

    expect(unregisterServiceWorker).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);

    window.dispatchEvent(makeEvt());
    await Promise.resolve();

    expect(unregisterServiceWorker).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

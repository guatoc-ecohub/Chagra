import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CANONICAL_HOSTNAME,
  CANONICAL_REDIRECT_GUARD_KEY,
  buildCanonicalUrl,
  isAllowedHost,
  runCanonicalHostRedirectGuard,
} from '../canonicalHostRedirect.js';

describe('canonicalHostRedirect', () => {
  let storage;

  beforeEach(() => {
    storage = {
      data: new Map(),
      getItem: vi.fn(function getItem(key) {
        return this.data.get(key) ?? null;
      }),
      setItem: vi.fn(function setItem(key, value) {
        this.data.set(key, String(value));
      }),
    };
  });

  it('construye la URL canonica preservando path, search y hash', () => {
    const url = buildCanonicalUrl({
      pathname: '/agente',
      search: '?demo=1',
      hash: '#/voz',
    });

    expect(url).toBe(`https://${CANONICAL_HOSTNAME}/agente?demo=1#/voz`);
  });

  it('permite el host canonico y entornos locales o preview', () => {
    expect(isAllowedHost('chagra.app')).toBe(true);
    expect(isAllowedHost('localhost')).toBe(true);
    expect(isAllowedHost('127.0.0.1')).toBe(true);
    expect(isAllowedHost('preview.chagra.app')).toBe(true);
  });

  it('redirige una sola vez desde un host externo al canonico', () => {
    const redirect = vi.fn();
    const location = {
      hostname: 'chagra.guatoc.co',
      pathname: '/',
      search: '?demo=1',
      hash: '#/agente',
    };

    const first = runCanonicalHostRedirectGuard({
      location,
      sessionStorage: storage,
      redirect,
    });
    const second = runCanonicalHostRedirectGuard({
      location,
      sessionStorage: storage,
      redirect,
    });

    expect(first).toEqual({ redirected: true, reason: 'redirected-to-canonical' });
    expect(second).toEqual({ redirected: false, reason: 'already-redirected' });
    expect(storage.setItem).toHaveBeenCalledWith(CANONICAL_REDIRECT_GUARD_KEY, '1');
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(`https://${CANONICAL_HOSTNAME}/?demo=1#/agente`);
  });

  it('no redirige cuando el guard ya existe', () => {
    storage.data.set(CANONICAL_REDIRECT_GUARD_KEY, '1');
    const redirect = vi.fn();

    const result = runCanonicalHostRedirectGuard({
      location: {
        hostname: 'chagra.guatoc.co',
        pathname: '/',
        search: '',
        hash: '#/agente',
      },
      sessionStorage: storage,
      redirect,
    });

    expect(result).toEqual({ redirected: false, reason: 'already-redirected' });
    expect(redirect).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CANONICAL_HOSTNAME,
  CANONICAL_REDIRECT_GUARD_KEY,
  buildCanonicalUrl,
  isAllowedHost,
  isStagingHost,
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

  it('permite el host de staging y sus subdominios acotados', () => {
    expect(isStagingHost('preprod.chagra.app')).toBe(true);
    expect(isStagingHost('api.preprod.chagra.app')).toBe(true);
    expect(isAllowedHost('preprod.chagra.app')).toBe(true);
  });

  it('no redirige desde preprod hacia produccion', () => {
    const redirect = vi.fn();
    const result = runCanonicalHostRedirectGuard({
      location: {
        hostname: 'preprod.chagra.app',
        pathname: '/agente',
        search: '?demo=1',
        hash: '#/voz',
      },
      sessionStorage: storage,
      redirect,
    });

    expect(result).toEqual({ redirected: false, reason: 'allowed-host' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each(['preprod.example.com', 'preprod-cualquiera.io'])(
    'rechaza %s aunque contenga el token preprod',
    (hostname) => {
      expect(isStagingHost(hostname)).toBe(false);
      expect(isAllowedHost(hostname)).toBe(false);

      const redirect = vi.fn();
      const result = runCanonicalHostRedirectGuard({
        location: {
          hostname,
          pathname: '/agente',
          search: '?demo=1',
          hash: '#/voz',
        },
        sessionStorage: storage,
        redirect,
      });

      expect(result).toEqual({ redirected: true, reason: 'redirected-to-canonical' });
      expect(redirect).toHaveBeenCalledWith(`https://${CANONICAL_HOSTNAME}/agente?demo=1#/voz`);
    },
  );

  it('permite 3d.guatoc.co (mundos 3D standalone) sin redirigir', () => {
    expect(isAllowedHost('3d.guatoc.co')).toBe(true);
  });

  it('NO permite otros subdominios de guatoc.co (host exacto, no wildcard)', () => {
    // chagra.guatoc.co es el dominio legado de produccion: debe seguir
    // rebotando a chagra.app, por eso 3d.guatoc.co se agrega como host
    // exacto y no como *.guatoc.co.
    expect(isAllowedHost('chagra.guatoc.co')).toBe(false);
    expect(isAllowedHost('otra-cosa.guatoc.co')).toBe(false);
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

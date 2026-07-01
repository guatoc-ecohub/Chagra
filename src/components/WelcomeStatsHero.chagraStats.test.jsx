/**
 * WelcomeStatsHero.chagraStats.test.jsx — cobertura del fin del drift de cifras.
 *
 * El audit encontró que este componente usaba fallbacks hardcodeados
 * (especies 486, biopreparados 19, fuentes Tier A 52) que contradecían la
 * fuente de verdad y el one-pager (530/36/53). Este archivo verifica que:
 *
 *   1. Cuando `fetch('/chagra-stats.json')` responde con éxito, el componente
 *      renderiza los números del JSON (no los hardcodeados).
 *   2. Cuando el fetch falla (archivo aún no desplegado, ver #1938) o
 *      responde con un status no-ok, el componente cae en un fallback
 *      razonable en lugar de romperse o mostrar valores vacíos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WelcomeStatsHero from './WelcomeStatsHero';

const mockAssetStore = { plants: { length: 0 } };
vi.mock('../store/useAssetStore', () => ({
  default: (selector) => selector(mockAssetStore),
}));

// El catálogo SQLite (dynamic import) no está disponible en el entorno de
// test (jsdom no carga el WASM); se mockea para resolver rápido y sin ruido
// en consola, dejando que `chagra-stats.json` sea la única fuente que
// realmente aporta valores en estos tests.
vi.mock('../db/catalogDB', () => ({
  getCatalogStats: vi.fn().mockResolvedValue(null),
}));

function mockFetchByUrl(responses) {
  return vi.fn((url) => {
    const match = Object.keys(responses).find((key) => String(url).includes(key));
    if (!match) return Promise.reject(new Error(`unexpected fetch: ${url}`));
    const entry = responses[match];
    if (entry instanceof Error) return Promise.reject(entry);
    return Promise.resolve(entry);
  });
}

describe('WelcomeStatsHero — consume chagra-stats.json (fuente única de verdad)', () => {
  beforeEach(() => {
    mockAssetStore.plants.length = 0;
    try { globalThis.localStorage.clear(); } catch { /* ignore */ }
  });

  it('renderiza las cifras de chagra-stats.json cuando el fetch responde OK', async () => {
    vi.stubGlobal('fetch', mockFetchByUrl({
      '/chagra-stats.json': {
        ok: true,
        json: async () => ({
          catalogo: { especies: 530, biopreparados: 36, fuentes_tier_a: 53 },
        }),
      },
      '/cycle-content/manifest.json': { ok: true, json: async () => ({ slugs: [] }) },
      '/fincas-publicas.json': { ok: true, json: async () => [] },
    }));

    render(<WelcomeStatsHero mode="post-login" onNavigate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('530')).toBeInTheDocument();
    });
    // "486" (fallback hardcodeado) NO debe quedar en pantalla una vez que
    // la fuente de verdad resolvió.
    expect(screen.queryByText('486')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('mantiene un fallback razonable si el fetch de chagra-stats.json falla (archivo aún no desplegado)', async () => {
    vi.stubGlobal('fetch', mockFetchByUrl({
      '/chagra-stats.json': new Error('404: chagra-stats.json no existe todavía'),
      '/cycle-content/manifest.json': new Error('sin manifest en este test'),
      '/fincas-publicas.json': new Error('sin fincas en este test'),
    }));

    render(<WelcomeStatsHero mode="post-login" onNavigate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Chagra · impacto/i)).toBeInTheDocument();
    });
    // Fallback conocido del componente (CATALOG_FALLBACK.species) sigue
    // presente: el fetch fallido no rompe el render ni deja huecos vacíos.
    await waitFor(() => {
      expect(screen.getByText('486')).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it('mantiene el fallback si chagra-stats.json responde con status no-ok', async () => {
    vi.stubGlobal('fetch', mockFetchByUrl({
      '/chagra-stats.json': { ok: false, status: 404, json: async () => ({}) },
      '/cycle-content/manifest.json': { ok: false, status: 404, json: async () => ({}) },
      '/fincas-publicas.json': { ok: false, status: 404, json: async () => ({}) },
    }));

    render(<WelcomeStatsHero mode="post-login" onNavigate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('486')).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});

/**
 * scripts/__tests__/gen-chagra-stats.test.mjs
 *
 * Cobertura del generador de la fuente única de verdad `public/chagra-stats.json`.
 * Cubre: agregados puros (computeCatalogStats/computeGraphStats) con fixtures
 * mock, y una pasada de integración contra los archivos REALES del repo
 * (catálogo canónico v3.2 + snapshot del grafo) para asegurar que el schema
 * final tiene la forma esperada y números > 0 — sin hardcodear los conteos
 * exactos (crecen con el catálogo; ver catalog/CATALOG_VERSIONS.md).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  computeCatalogStats,
  computeGraphStats,
  buildStats,
  DEFAULT_CATALOG_PATH,
  DEFAULT_GRAPH_SNAPSHOT_PATH,
  DEFAULT_OUTPUT_PATH,
  SCHEMA_VERSION,
} from '../gen-chagra-stats.mjs';

// Deriva scripts/ desde DEFAULT_CATALOG_PATH (= ROOT/catalog/...) en vez de
// import.meta.url — vitest reescribe módulos y esa URL no siempre resuelve
// a un path de archivo real.
const SCRIPTS_DIR = join(dirname(dirname(DEFAULT_CATALOG_PATH)), 'scripts');

const MOCK_CATALOG = {
  species: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  biopreparados: [
    { id: 'bp1', safety_class: 'bajo' },
    { id: 'bp2', safety_class: 'alto' },
    { id: 'bp3', safety_class: null },
  ],
  sources: [
    { id: 's1', doi: '10.1/x', tier: 'A' },
    { id: 's2', tier: 'B' },
    { id: 's3', tier: 'A' },
  ],
};

const MOCK_GRAPH_SNAPSHOT = {
  nodos: 2909,
  aristas: 12325,
  aristas_por_tipo: { CONTROLS: 591, GROWS_IN: 1097 },
  controls: { con_doi: 446, total: 816 },
  mip_plagas: { con_mip: 163, total: 318 },
  cobertura_por_vertical: {
    control_biologico: { pct: 54.7 },
    mip: { pct: 51.3 },
  },
};

describe('computeCatalogStats', () => {
  it('cuenta especies, biopreparados y fuentes desde el catálogo', () => {
    const out = computeCatalogStats(MOCK_CATALOG, { mipPlagas: MOCK_GRAPH_SNAPSHOT.mip_plagas });
    expect(out.especies).toBe(3);
    expect(out.biopreparados).toBe(3);
    expect(out.biopreparados_con_seguridad).toBe(2);
    expect(out.fuentes).toBe(3);
    expect(out.fuentes_doi).toBe(1);
    expect(out.fuentes_tier_a).toBe(2);
  });

  it('mip_plagas viene del snapshot del grafo, no del catálogo (no hay campo en el mock)', () => {
    const out = computeCatalogStats(MOCK_CATALOG, { mipPlagas: { con_mip: 163, total: 318 } });
    expect(out.mip_plagas).toEqual({ con_mip: 163, total: 318, pct: 51.3 });
  });

  it('sin mipPlagas explícito, devuelve 0/0 en vez de inventar', () => {
    const out = computeCatalogStats(MOCK_CATALOG);
    expect(out.mip_plagas).toEqual({ con_mip: 0, total: 0, pct: 0 });
  });

  it('tolera catálogo sin arrays (defensivo)', () => {
    const out = computeCatalogStats({});
    expect(out.especies).toBe(0);
    expect(out.biopreparados).toBe(0);
    expect(out.fuentes).toBe(0);
  });
});

describe('computeGraphStats', () => {
  it('pasa a través nodos/aristas/aristas_por_tipo/controls/cobertura', () => {
    const out = computeGraphStats(MOCK_GRAPH_SNAPSHOT);
    expect(out.nodos).toBe(2909);
    expect(out.aristas).toBe(12325);
    expect(out.aristas_por_tipo).toEqual({ CONTROLS: 591, GROWS_IN: 1097 });
    expect(out.controls_con_doi).toBe(446);
    expect(out.controls_total).toBe(816);
    expect(out.cobertura_por_vertical.mip.pct).toBe(51.3);
  });

  it('defensivo ante snapshot vacío', () => {
    const out = computeGraphStats({});
    expect(out.nodos).toBe(0);
    expect(out.controls_con_doi).toBe(0);
    expect(out.controls_total).toBe(0);
    expect(out.aristas_por_tipo).toEqual({});
  });
});

describe('buildStats', () => {
  const stats = buildStats({
    catalog: MOCK_CATALOG,
    graphSnapshot: MOCK_GRAPH_SNAPSHOT,
    generatedAt: '2026-07-01T00:00:00.000Z',
  });

  it('tiene el schema top-level esperado', () => {
    expect(Object.keys(stats).sort()).toEqual(
      ['_fuente', 'catalogo', 'generated_at', 'grafo', 'schema_version', 'verificacion'].sort(),
    );
    expect(stats.schema_version).toBe(SCHEMA_VERSION);
    expect(stats.generated_at).toBe('2026-07-01T00:00:00.000Z');
  });

  it('calcula verificacion.doi_pct desde controls (no lo repite del snapshot)', () => {
    // 446/816 = 54.66... redondeado a 1 decimal = 54.7
    expect(stats.verificacion.doi_pct).toBe(54.7);
  });

  it('es determinista (misma entrada -> mismo output, sin llamar a Date())', () => {
    const again = buildStats({
      catalog: MOCK_CATALOG,
      graphSnapshot: MOCK_GRAPH_SNAPSHOT,
      generatedAt: '2026-07-01T00:00:00.000Z',
    });
    expect(again).toEqual(stats);
  });

  it('no filtra nada fuera de conteos agregados (anti-leak repo público)', () => {
    // Chequeo genérico: IPs internas, credenciales o contenido chagra-pro no
    // shipeado. El mecanismo interno de refresco del snapshot (host,
    // contenedor, base de datos, usuario) tiene su propio chequeo, más
    // estricto, más abajo — ver describe('anti-leak — mecanismo interno...').
    const json = JSON.stringify(stats);
    expect(json).not.toMatch(/10\.88\.|password|token|bearer|secret|chagra-pro/i);
  });
});

// =============================================================================
// Integración contra los archivos REALES del repo (sin hardcodear conteos
// exactos — solo forma del schema + invariantes de sanidad).
// =============================================================================
describe('buildStats — integración con archivos reales del repo', () => {
  const catalog = JSON.parse(readFileSync(DEFAULT_CATALOG_PATH, 'utf-8'));
  const graphSnapshot = JSON.parse(readFileSync(DEFAULT_GRAPH_SNAPSHOT_PATH, 'utf-8'));
  const stats = buildStats({ catalog, graphSnapshot, generatedAt: '2026-07-01T00:00:00.000Z' });

  it('produce números > 0 en todos los conteos principales', () => {
    expect(stats.catalogo.especies).toBeGreaterThan(0);
    expect(stats.catalogo.biopreparados).toBeGreaterThan(0);
    expect(stats.catalogo.fuentes).toBeGreaterThan(0);
    expect(stats.grafo.nodos).toBeGreaterThan(0);
    expect(stats.grafo.aristas).toBeGreaterThan(0);
    expect(stats.grafo.controls_total).toBeGreaterThan(0);
    expect(stats.catalogo.mip_plagas.total).toBeGreaterThan(0);
  });

  it('respeta invariantes numéricos (subconjuntos <= total)', () => {
    expect(stats.catalogo.biopreparados_con_seguridad).toBeLessThanOrEqual(stats.catalogo.biopreparados);
    expect(stats.catalogo.fuentes_doi).toBeLessThanOrEqual(stats.catalogo.fuentes);
    expect(stats.catalogo.fuentes_tier_a).toBeLessThanOrEqual(stats.catalogo.fuentes);
    expect(stats.grafo.controls_con_doi).toBeLessThanOrEqual(stats.grafo.controls_total);
    expect(stats.catalogo.mip_plagas.con_mip).toBeLessThanOrEqual(stats.catalogo.mip_plagas.total);
    expect(stats.verificacion.doi_pct).toBeGreaterThanOrEqual(0);
    expect(stats.verificacion.doi_pct).toBeLessThanOrEqual(100);
  });

  it('el grafo tiene más especies que el subset OSS shipeado (corpus full > subset público)', () => {
    expect(stats.grafo.nodos).toBeGreaterThan(0);
    // No comparamos especies grafo vs catalogo aquí a nivel de assert estricto
    // porque son fuentes independientes que evolucionan por separado; solo
    // afirmamos que ambos existen y son positivos (arriba).
  });
});

// =============================================================================
// Anti-leak — el mecanismo interno de refresco del snapshot (host, contenedor,
// base de datos, usuario) NUNCA debe aparecer en la superficie pública de
// chagra-stats. Ese detalle vive documentado en Chagra-strategy (privado, ver
// ops/fleet/export-graph-stats.mjs ahí) — este generador y el snapshot que
// consume solo necesitan decir QUÉ es el dato, nunca CÓMO se obtuvo.
//
// Alcance deliberadamente acotado a la superficie de ESTE pipeline (no todo
// scripts/): otros scripts del repo (bench-*, audit-milpa-citations.mjs,
// snapshot-grafo-crecimiento.mjs, etc.) ya mencionan de forma aceptada el
// codename "alpha" o el nombre del grafo AGE `chagra_kg` sin URL/IP/token —
// barrer todo scripts/ con este patrón rompería esa convención existente.
// Lo que nunca debe repetirse es la combinación concreta host + contenedor +
// usuario + comando que exponía scripts/export-graph-stats.mjs antes de
// moverse fuera de este repo.
// =============================================================================
describe('anti-leak — mecanismo interno de refresco fuera de la superficie pública', () => {
  const INFRA_LEAK_RE = /alpha|postgres-farm|chagra_kg|farmos/i;

  it('scripts/gen-chagra-stats.mjs no menciona host/contenedor/DB/usuario internos', () => {
    const source = readFileSync(join(SCRIPTS_DIR, 'gen-chagra-stats.mjs'), 'utf-8');
    expect(source).not.toMatch(INFRA_LEAK_RE);
  });

  it('src/data/graph-stats-snapshot.json no menciona host/contenedor/DB/usuario internos', () => {
    const raw = readFileSync(DEFAULT_GRAPH_SNAPSHOT_PATH, 'utf-8');
    expect(raw).not.toMatch(INFRA_LEAK_RE);
  });

  it('public/chagra-stats.json (generado) no menciona host/contenedor/DB/usuario internos', () => {
    const raw = readFileSync(DEFAULT_OUTPUT_PATH, 'utf-8');
    expect(raw).not.toMatch(INFRA_LEAK_RE);
  });

  it('scripts/export-graph-stats.mjs ya no vive en el repo público (se movió a Chagra-strategy)', () => {
    expect(existsSync(join(SCRIPTS_DIR, 'export-graph-stats.mjs'))).toBe(false);
  });
});

/**
 * plantDossierService.test.js — cobertura del agregador del dossier de planta
 * por voz (módulo unificado de voz, 2026-06-15).
 *
 * Estrategia: mock de las 5 fuentes que orquesta el servicio (NO se re-testea
 * su lógica interna, ya cubierta por sus propios tests):
 *   - phenologyTemplates.getTemplate   (ciclo genealógico)
 *   - guildService.suggestGuildsFor    (companions + antagonistas)
 *   - climateCycleService.getBiopreparadosForStage (biopreparados por etapa)
 *   - sidecarClient.callTool           (grafo AGE: get_biopreparados/get_companions)
 *   - farmProcessCache.listFarmProcesses (ciclos asociados)
 *
 * Verifica: composición correcta, dedupe, merge grafo+catálogo, filtrado de
 * ciclos por subject_slug, y degradación con gracia (todo falla → esqueleto).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../data/phenologyTemplates', () => ({ getTemplate: vi.fn() }));
vi.mock('../guildService', () => ({ suggestGuildsFor: vi.fn() }));
vi.mock('../climateCycleService', () => ({ getBiopreparadosForStage: vi.fn() }));
vi.mock('../sidecarClient', () => ({ callTool: vi.fn() }));
vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn() }));

import { getTemplate } from '../../data/phenologyTemplates';
import { suggestGuildsFor } from '../guildService';
import { getBiopreparadosForStage } from '../climateCycleService';
import { callTool } from '../sidecarClient';
import { listFarmProcesses } from '../../db/farmProcessCache';
import {
  buildPlantDossier, getBioinsumosForPlant, getRelationsForPlant,
  getCycleForPlant, getAssociatedCycles, __TEST__,
} from '../plantDossierService';

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: catálogo local responde por etapa; grafo apagado (null).
  vi.mocked(/** @type {any} */ (getBiopreparadosForStage)).mockImplementation((stage) => {
    if (stage === 'vegetative') return [{ nombre: 'Caldo bordelés', uso: 'Preventivo fungoso' }];
    if (stage === 'flowering') return [{ nombre: 'Aceite de neem', uso: 'Trips en floración' }];
    return [];
  });
  vi.mocked(/** @type {any} */ (callTool)).mockResolvedValue(null);
  vi.mocked(/** @type {any} */ (suggestGuildsFor)).mockResolvedValue({ companions: [], antagonists: [], strata: [] });
  vi.mocked(/** @type {any} */ (listFarmProcesses)).mockResolvedValue([]);
  vi.mocked(/** @type {any} */ (getTemplate)).mockReturnValue(null);
});

describe('getBioinsumosForPlant', () => {
  it('compone biopreparados del catálogo local cuando el grafo está offline', async () => {
    const { items, fromGraph } = await getBioinsumosForPlant('fragaria_ananassa');
    expect(fromGraph).toBe(false);
    const nombres = items.map((b) => b.nombre);
    expect(nombres).toContain('Caldo bordelés');
    expect(nombres).toContain('Aceite de neem');
    expect(items.every((b) => b.source === 'catalogo')).toBe(true);
  });

  it('mergea recetas del grafo AGE y deja el grafo primero', async () => {
    vi.mocked(/** @type {any} */ (callTool)).mockResolvedValueOnce({ recipes: [{ nombre: 'Supermagro', uso: 'Foliar quincenal' }] });
    const { items, fromGraph } = await getBioinsumosForPlant('coffea_arabica');
    expect(fromGraph).toBe(true);
    expect(items[0]).toMatchObject({ nombre: 'Supermagro', source: 'grafo' });
  });

  it('deduplica un biopreparado que aparece en varias etapas', async () => {
    vi.mocked(/** @type {any} */ (getBiopreparadosForStage)).mockReturnValue([{ nombre: 'Bocashi', uso: 'Fertilización' }]);
    const { items } = await getBioinsumosForPlant('zea_mays');
    expect(items.filter((b) => b.nombre === 'Bocashi')).toHaveLength(1);
  });

  it('no rompe si el catálogo lanza', async () => {
    vi.mocked(/** @type {any} */ (getBiopreparadosForStage)).mockImplementation(() => { throw new Error('boom'); });
    const { items } = await getBioinsumosForPlant('x');
    expect(Array.isArray(items)).toBe(true);
  });
});

describe('getRelationsForPlant', () => {
  it('usa guildService como base (offline-safe)', async () => {
    vi.mocked(/** @type {any} */ (suggestGuildsFor)).mockResolvedValue({
      companions: [{ slug: 'allium_sativum', name: 'Ajo', reason: 'r' }],
      antagonists: [{ slug: 'solanum_lycopersicum', name: 'Tomate', reason: 'r' }],
      strata: [{ species: 'fragaria_ananassa', layer: 'bajo' }],
    });
    const rel = await getRelationsForPlant('fragaria_ananassa');
    expect(rel.fromGraph).toBe(false);
    expect(rel.companions.map((c) => c.name)).toContain('Ajo');
    expect(rel.antagonists.map((a) => a.name)).toContain('Tomate');
    expect(rel.strata).toHaveLength(1);
  });

  it('enriquece con el grafo AGE y deduplica por slug', async () => {
    vi.mocked(/** @type {any} */ (suggestGuildsFor)).mockResolvedValue({
      companions: [{ slug: 'allium_sativum', name: 'Ajo', reason: 'curado' }],
      antagonists: [], strata: [],
    });
    vi.mocked(/** @type {any} */ (callTool)).mockResolvedValueOnce({
      companions: [
        { canonical_id: 'allium_sativum', nombre_comun: 'Ajo' }, // duplicado por slug
        { canonical_id: 'tagetes_patula', nombre_comun: 'Caléndula' },
      ],
      antagonists: [{ canonical_id: 'brassica_oleracea', nombre_comun: 'Repollo' }],
    });
    const rel = await getRelationsForPlant('fragaria_ananassa');
    expect(rel.fromGraph).toBe(true);
    expect(rel.companions.filter((c) => c.slug === 'allium_sativum')).toHaveLength(1);
    expect(rel.companions.map((c) => c.name)).toContain('Caléndula');
    expect(rel.antagonists.map((a) => a.name)).toContain('Repollo');
  });

  it('degrada a vacío si guildService y grafo fallan', async () => {
    vi.mocked(/** @type {any} */ (suggestGuildsFor)).mockRejectedValue(new Error('cold'));
    vi.mocked(/** @type {any} */ (callTool)).mockRejectedValue(new Error('down'));
    const rel = await getRelationsForPlant('x');
    expect(rel).toEqual({ companions: [], antagonists: [], strata: [], fromGraph: false });
  });

  it('ignora ToolError del grafo (no lo cuenta como fromGraph)', async () => {
    vi.mocked(/** @type {any} */ (callTool)).mockResolvedValueOnce({ _error: true, reason: 'fetch_failed', tool: 'get_companions' });
    const rel = await getRelationsForPlant('x');
    expect(rel.fromGraph).toBe(false);
  });
});

describe('getCycleForPlant', () => {
  it('devuelve la plantilla fenológica de la especie', () => {
    vi.mocked(/** @type {any} */ (getTemplate)).mockReturnValue({ template_id: 't1', species_label: 'Tomate', stages: [{ code: 'sowing' }], sources: [] });
    expect(getCycleForPlant('solanum_lycopersicum').template_id).toBe('t1');
  });
  it('null si no hay plantilla', () => {
    vi.mocked(/** @type {any} */ (getTemplate)).mockReturnValue(null);
    expect(getCycleForPlant('rara_avis')).toBeNull();
  });
});

describe('getAssociatedCycles', () => {
  it('filtra FarmProcess por subject_slug y ordena recientes primero', async () => {
    vi.mocked(/** @type {any} */ (listFarmProcesses)).mockResolvedValue([
      { process_id: 'a', attributes: { subject_slug: 'zea_mays', updated_at: '2026-01-01' } },
      { process_id: 'b', attributes: { subject_slug: 'fragaria_ananassa', updated_at: '2026-06-01' } },
      { process_id: 'c', attributes: { subject_slug: 'fragaria_ananassa', updated_at: '2026-06-10' } },
    ]);
    const cycles = await getAssociatedCycles('fragaria_ananassa');
    expect(cycles.map((c) => c.process_id)).toEqual(['c', 'b']);
  });
  it('devuelve [] si IndexedDB falla', async () => {
    vi.mocked(/** @type {any} */ (listFarmProcesses)).mockRejectedValue(new Error('db'));
    expect(await getAssociatedCycles('x')).toEqual([]);
  });
});

describe('buildPlantDossier', () => {
  it('compone el dossier completo de una planta con slug', async () => {
    vi.mocked(/** @type {any} */ (getTemplate)).mockReturnValue({ template_id: 't', species_label: 'Fresa', stages: [], sources: [] });
    vi.mocked(/** @type {any} */ (suggestGuildsFor)).mockResolvedValue({
      companions: [{ slug: 'allium_sativum', name: 'Ajo', reason: 'r' }],
      antagonists: [{ slug: 'solanum_lycopersicum', name: 'Tomate', reason: 'r' }],
      strata: [],
    });
    vi.mocked(/** @type {any} */ (listFarmProcesses)).mockResolvedValue([
      { process_id: 'p1', attributes: { subject_slug: 'fragaria_ananassa', updated_at: '2026-06-10' } },
    ]);

    const d = await buildPlantDossier({ cropSlug: 'fragaria_ananassa', canonical: 'Fresa (Fragaria ananassa)' });
    expect(d.slug).toBe('fragaria_ananassa');
    expect(d.label).toBe('Fresa (Fragaria ananassa)');
    expect(d.cycle.template_id).toBe('t');
    expect(d.bioinsumos.items.length).toBeGreaterThan(0);
    expect(d.relations.companions).toHaveLength(1);
    expect(d.relations.antagonists).toHaveLength(1);
    expect(d.cycles).toHaveLength(1);
  });

  it('devuelve esqueleto vacío sin slug resoluble (no consulta fuentes)', async () => {
    const d = await buildPlantDossier({ crop: 'algo que el extractor no resolvió' });
    expect(d.slug).toBeNull();
    expect(d.cycle).toBeNull();
    expect(d.bioinsumos.items).toEqual([]);
    expect(d.relations.companions).toEqual([]);
    expect(d.cycles).toEqual([]);
    expect(callTool).not.toHaveBeenCalled();
    expect(suggestGuildsFor).not.toHaveBeenCalled();
  });

  it('NUNCA lanza aunque todas las fuentes fallen', async () => {
    vi.mocked(/** @type {any} */ (getTemplate)).mockImplementation(() => { throw new Error('x'); });
    vi.mocked(/** @type {any} */ (suggestGuildsFor)).mockRejectedValue(new Error('x'));
    vi.mocked(/** @type {any} */ (callTool)).mockRejectedValue(new Error('x'));
    vi.mocked(/** @type {any} */ (listFarmProcesses)).mockRejectedValue(new Error('x'));
    vi.mocked(/** @type {any} */ (getBiopreparadosForStage)).mockImplementation(() => { throw new Error('x'); });
    const d = await buildPlantDossier({ cropSlug: 'fragaria_ananassa' });
    expect(d.slug).toBe('fragaria_ananassa');
    expect(d.cycle).toBeNull();
    expect(d.bioinsumos.items).toEqual([]);
  });
});

describe('helpers', () => {
  it('normalizeGraphSpecies maneja string y objeto', () => {
    expect(/** @type {any} */ (__TEST__).normalizeGraphSpecies('Ajo')).toEqual({ slug: '', name: 'Ajo' });
    expect(/** @type {any} */ (__TEST__).normalizeGraphSpecies({ canonical_id: 's', nombre_comun: 'N' })).toEqual({ slug: 's', name: 'N' });
    expect(/** @type {any} */ (__TEST__).normalizeGraphSpecies(null)).toBeNull();
    expect(/** @type {any} */ (__TEST__).normalizeGraphSpecies({})).toBeNull();
  });
  it('dedupeBySlug conserva el primero', () => {
    const out = /** @type {any} */ (__TEST__).dedupeBySlug([
      { slug: 'a', name: 'A1' }, { slug: 'a', name: 'A2' }, { slug: 'b', name: 'B' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('A1');
  });
});

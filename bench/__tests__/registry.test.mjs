/**
 * bench/__tests__/registry.test.mjs — tests de carga/validacion/resolucion del
 * registro y del render del INDEX.md. Deterministas.
 */
import { describe, it, expect } from 'vitest';
import {
  loadIndex,
  validateIndex,
  validateEntry,
  findEntry,
  resolveCommand,
  listEntries,
} from '../lib/registry.mjs';
import { renderIndexMarkdown } from '../lib/render-index.mjs';
import { buildHistoryRecord } from '../lib/history.mjs';

describe('loadIndex (index.json real del repo)', () => {
  const index = loadIndex();
  it('carga el indice con entradas', () => {
    expect(Array.isArray(index.entries)).toBe(true);
    expect(index.entries.length).toBeGreaterThan(5);
  });
  it('el indice real es VALIDO (incluye que cada script exista)', () => {
    const problems = validateIndex(index, { checkScript: true });
    expect(problems).toEqual([]);
  });
  it('todos los ids son unicos', () => {
    const ids = index.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('incluye el bench consolidado model-compare y NO los que reemplaza', () => {
    const ids = index.entries.map((e) => e.id);
    expect(ids).toContain('model-compare');
    expect(ids).not.toContain('nuevos-vs-baseline');
    expect(ids).not.toContain('qwen3-vs-granite');
  });
  it('marca borde-alucinacion como protegido (no romper)', () => {
    const borde = findEntry(index, 'borde-alucinacion');
    expect(borde.protected).toBe(true);
  });
});

describe('validateEntry', () => {
  it('detecta type invalido', () => {
    const p = validateEntry({ id: 'x', title: 't', type: 'wat', cluster: 'c', infra: [] });
    expect(p.join(' ')).toMatch(/type invalido/);
  });
  it('detecta infra desconocida', () => {
    const p = validateEntry({ id: 'x', title: 't', type: 'meta', cluster: 'c', infra: ['marte'] });
    expect(p.join(' ')).toMatch(/infra desconocida/);
  });
  it('entrada bien formada no tiene problemas', () => {
    const p = validateEntry({ id: 'x', title: 't', type: 'meta', cluster: 'c', infra: ['ninguna'], script: 'scripts/x.mjs' });
    expect(p).toEqual([]);
  });
});

describe('findEntry', () => {
  const index = loadIndex();
  it('match exacto por id', () => {
    expect(findEntry(index, 'rag-retrieve').id).toBe('rag-retrieve');
  });
  it('atajo por substring unico', () => {
    expect(findEntry(index, 'borde').id).toBe('borde-alucinacion');
  });
  it('null si no hay match', () => {
    expect(findEntry(index, 'zzz-no-existe')).toBeNull();
  });
});

describe('resolveCommand', () => {
  const index = loadIndex();
  it('resuelve {{script}} a path absoluto', () => {
    const e = findEntry(index, 'rag-retrieve');
    const cmd = resolveCommand(e);
    expect(cmd.argv[0]).toBe('node');
    expect(cmd.argv.some((a) => a.endsWith('scripts/bench-rag-retrieve.mjs'))).toBe(true);
  });
  it('null para entradas sin cmd (meta manual)', () => {
    const e = findEntry(index, 'summary-diff');
    expect(resolveCommand(e)).toBeNull();
  });
});

describe('listEntries', () => {
  const index = loadIndex();
  it('filtra por tipo', () => {
    const suites = listEntries(index, { type: 'test-suite' });
    expect(suites.length).toBeGreaterThanOrEqual(3);
    expect(suites.every((e) => e.type === 'test-suite')).toBe(true);
  });
});

describe('renderIndexMarkdown', () => {
  const index = loadIndex();
  it('genera markdown con secciones y tablas', () => {
    const md = renderIndexMarkdown(index, [], { date: '2026-06-15' });
    expect(md).toContain('# INDEX de Benches y Tests');
    expect(md).toContain('## Benches');
    expect(md).toContain('## Suites de test');
    expect(md).toContain('| id |');
  });
  it('marca [NO ROMPER] en benches protegidos', () => {
    const md = renderIndexMarkdown(index, [], { date: '2026-06-15' });
    expect(md).toMatch(/borde-alucinacion.*NO ROMPER/);
  });
  it('refleja tendencia cuando hay >=2 corridas', () => {
    const recs = [
      buildHistoryRecord({ bench: 'rag-retrieve', model: null, date: '2026-01-01T00:00:00.000Z', metrics: { cold_load_ms: 2000 } }),
      buildHistoryRecord({ bench: 'rag-retrieve', model: null, date: '2026-01-02T00:00:00.000Z', metrics: { cold_load_ms: 1500 } }),
    ];
    const md = renderIndexMarkdown(index, recs, { date: '2026-06-15', withHistory: true });
    expect(md).toMatch(/cold_load_ms 2000->1500/);
    expect(md).toContain('mejora');
  });
  it('es determinista (misma entrada -> mismo output)', () => {
    const a = renderIndexMarkdown(index, [], { date: '2026-06-15' });
    const b = renderIndexMarkdown(index, [], { date: '2026-06-15' });
    expect(a).toBe(b);
  });
});

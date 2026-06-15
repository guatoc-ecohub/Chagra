/**
 * bench/__tests__/run.test.mjs — tests de la logica pura del runner (parseo de
 * args, gating de infra) + que INDEX.md este sincronizado con index.json.
 * NO ejecuta benches reales (no spawnea modelos).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, missingInfra, detectInfra, normalizeMd } from '../run.mjs';
import { loadIndex } from '../lib/registry.mjs';
import { renderIndexMarkdown } from '../lib/render-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_MD = join(__dirname, '..', 'INDEX.md');

describe('parseArgs', () => {
  it('--list', () => expect(parseArgs(['--list']).mode).toBe('list'));
  it('--history sin target', () => {
    const a = parseArgs(['--history']);
    expect(a.mode).toBe('history');
    expect(a.target).toBeNull();
  });
  it('--history con target', () => {
    const a = parseArgs(['--history', 'borde']);
    expect(a.mode).toBe('history');
    expect(a.target).toBe('borde');
  });
  it('id posicional -> run', () => {
    const a = parseArgs(['rag-retrieve']);
    expect(a.mode).toBe('run');
    expect(a.target).toBe('rag-retrieve');
  });
  it('--all --dry-run', () => {
    const a = parseArgs(['--all', '--dry-run']);
    expect(a.mode).toBe('all');
    expect(a.dryRun).toBe(true);
  });
  it('--regen-index', () => expect(parseArgs(['--regen-index']).mode).toBe('regen'));
  it('--check', () => expect(parseArgs(['--check']).mode).toBe('check'));
  it('sin args -> help', () => expect(parseArgs([]).mode).toBe('help'));
});

describe('missingInfra', () => {
  it('lista lo que falta', () => {
    const entry = { infra: ['gpu', 'ollama', 'sidecar'] };
    const avail = { gpu: true, ollama: true, sidecar: false };
    expect(missingInfra(entry, avail)).toEqual(['sidecar']);
  });
  it('vacio si todo disponible', () => {
    const entry = { infra: ['ninguna'] };
    expect(missingInfra(entry, { ninguna: true })).toEqual([]);
  });
});

describe('detectInfra (probe inyectable)', () => {
  it('usa el probe inyectado y siempre marca ninguna/corpus', () => {
    const result = detectInfra({ probe: (label) => label === 'ollama' });
    expect(result.ninguna).toBe(true);
    expect(result.corpus).toBe(true);
    expect(result.ollama).toBe(true);
    expect(result.sidecar).toBe(false);
  });
});

describe('normalizeMd', () => {
  it('normaliza saltos finales y CRLF', () => {
    expect(normalizeMd('a\r\nb\n\n\n')).toBe('a\nb\n');
  });
});

describe('INDEX.md sincronizado con index.json', () => {
  it('INDEX.md es exactamente lo que renderIndexMarkdown produce', () => {
    const index = loadIndex();
    const expected = renderIndexMarkdown(index, []);
    const actual = readFileSync(INDEX_MD, 'utf-8');
    // Comparamos normalizado: si esto falla, corre `node bench/run.mjs --regen-index`.
    expect(normalizeMd(actual)).toBe(normalizeMd(expected));
  });
});

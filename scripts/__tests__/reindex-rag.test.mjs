import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildDocumentChunks,
  collectMarkdownFiles,
  hashChunkKey,
  parseArgs,
  runReindexRag,
  sliceWithOverlap,
  splitMarkdownIntoSections,
  toCorpusChunkRows,
} from '../experimentos/reindex-rag.mjs';

let tempRoot;

beforeEach(() => {
  tempRoot = join(tmpdir(), `reindex-rag-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(tempRoot, { recursive: true });
});

afterEach(() => {
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
  vi.unstubAllGlobals();
});

function makeDoc(relPath, content) {
  const filePath = join(tempRoot, relPath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

describe('parseArgs', () => {
  it('lee defaults y flags explicitos', () => {
    const opts = parseArgs(['--dry-run', '--source-dir', '/x', '--ollama-url', 'http://ollama:11434', '--log-file', '/tmp/out.log', '--schema', 'kg', '--table', 'chunks', '--max-chars', '100', '--overlap-chars', '15']);
    expect(opts.dryRun).toBe(true);
    expect(opts.sourceDir).toBe('/x');
    expect(opts.ollamaUrl).toBe('http://ollama:11434');
    expect(opts.logFile).toBe('/tmp/out.log');
    expect(opts.schema).toBe('kg');
    expect(opts.table).toBe('chunks');
    expect(opts.maxChars).toBe(100);
    expect(opts.overlapChars).toBe(15);
  });
});

describe('markdown chunking', () => {
  it('divide por secciones y conserva texto de encabezados', () => {
    const text = [
      '# DR demo',
      '',
      'Intro.',
      '',
      '## Seccion uno',
      '',
      'Primer bloque.',
      '',
      '### Detalle',
      '',
      'Segundo bloque.',
    ].join('\n');

    const sections = splitMarkdownIntoSections(text, 'demo');
    expect(sections).toHaveLength(3);
    expect(sections[0].headingTitle).toBe('DR demo');
    expect(sections[1].headingTitle).toBe('Seccion uno');
    expect(sections[2].headingTitle).toBe('Detalle');
  });

  it('mantiene solape entre slices', () => {
    const slices = sliceWithOverlap('a'.repeat(120) + 'b'.repeat(120), 100, 20);
    expect(slices.length).toBeGreaterThan(1);
    expect(slices[1].startChar).toBeLessThan(slices[0].endChar);
  });

  it('crea chunks con titulo de seccion', () => {
    const text = [
      '# DR demo',
      '',
      'Texto muy largo '.repeat(40),
    ].join('\n');
    const chunks = buildDocumentChunks(text, 'demo', { maxChars: 180, overlapChars: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].title).toBe('DR demo');
    expect(chunks[0].content).toContain('# DR demo');
  });
});

describe('filesystem helpers', () => {
  it('recorre markdowns de forma recursiva y ordenada', () => {
    makeDoc('b/dos.md', '# Dos\nContenido.');
    makeDoc('a/uno.md', '# Uno\nContenido.');
    makeDoc('a/ignore.txt', 'x');

    const files = collectMarkdownFiles(tempRoot);
    expect(files.map((file) => file.endsWith('.md'))).toEqual([true, true]);
    expect(files[0].endsWith('uno.md')).toBe(true);
    expect(files[1].endsWith('dos.md')).toBe(true);
  });
});

describe('row builder', () => {
  it('crea rows con el esquema real esperado', () => {
    const filePath = makeDoc('demo.md', [
      '# DR demo',
      '',
      'Texto base.',
      '',
      '## Seccion',
      '',
      'Segundo bloque.',
    ].join('\n'));

    const rows = toCorpusChunkRows({
      filePath,
      fileName: 'demo.md',
      text: readFileSync(filePath, 'utf8'),
      maxChars: 120,
      overlapChars: 20,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({
      source_type: 'dr-fanout',
      graph_node_id: null,
      title: 'DR demo',
      source_ids: ['demo'],
      model: 'nomic-embed-text',
    });
    expect(rows[0].chunkKey).toHaveLength(64);
    expect(hashChunkKey({
      sourceName: 'demo',
      chunkIndex: 0,
      title: rows[0].title,
      content: rows[0].content,
    })).toBe(rows[0].chunkKey);
  });
});

describe('runReindexRag', () => {
  it('usa ON CONFLICT cuando detecta indice unico en chunk_key', async () => {
    makeDoc('demo.md', [
      '# DR demo',
      '',
      'Texto base suficiente para un chunk.',
    ].join('\n'));

    const queries = [];
    const pool = {
      async query(sql, params) {
        const text = String(sql);
        queries.push(text);
        if (text.includes('information_schema.columns')) {
          return { rows: ['chunk_key', 'content', 'embedding', 'model'].map((column_name) => ({ column_name })) };
        }
        if (text.includes('pg_index')) {
          return { rows: [{ has_unique_chunk_key: true }] };
        }
        if (text.includes('INSERT INTO')) {
          return { rowCount: 1 };
        }
        return { rows: [] };
      },
      async end() {},
    };

    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ embedding: Array.from({ length: 768 }, (_, index) => index / 1000) }),
    }));

    const result = await runReindexRag({
      sourceDir: tempRoot,
      dryRun: false,
      pool,
      fetchImpl: globalThis.fetch,
      logger: {
        info() {},
        warn() {},
        error() {},
      },
    });

    expect(result.errors).toBe(0);
    expect(result.inserted).toBeGreaterThan(0);
    expect(queries.some((sql) => sql.includes('ON CONFLICT (chunk_key) DO NOTHING'))).toBe(true);
  });

  it('falla si faltan columnas requeridas', async () => {
    makeDoc('demo.md', '# DR demo\n\nTexto.');

    const pool = {
      async query(sql) {
        const text = String(sql);
        if (text.includes('information_schema.columns')) {
          return { rows: [{ column_name: 'chunk_key' }, { column_name: 'content' }, { column_name: 'embedding' }] };
        }
        return { rows: [] };
      },
      async end() {},
    };

    await expect(runReindexRag({
      sourceDir: tempRoot,
      pool,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ embedding: Array.from({ length: 768 }, () => 0.1) }),
      }),
      logger: { info() {}, warn() {}, error() {} },
    })).rejects.toThrow(/corpus_chunks no tiene columnas requeridas/);
  });
});

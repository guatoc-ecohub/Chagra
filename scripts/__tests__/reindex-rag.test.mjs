import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  MAX_CHUNK_CHARS,
  buildDocumentChunks,
  collectMarkdownFiles,
  expandRowsForEmbedding,
  hashChunkKey,
  parseArgs,
  runReindexRag,
  sliceWithOverlap,
  splitChunkContent,
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

function makePool({ uniqueChunkKey = true, columns = ['chunk_key', 'content', 'embedding', 'model'], insertRowCount = 1 } = {}) {
  const queries = [];
  return {
    queries,
    pool: {
      async query(sql) {
        const text = String(sql);
        queries.push(text);
        if (text.includes('information_schema.columns')) {
          return { rows: columns.map((column_name) => ({ column_name })) };
        }
        if (text.includes('pg_index')) {
          return { rows: [{ has_unique_chunk_key: uniqueChunkKey }] };
        }
        if (text.includes('INSERT INTO')) {
          return { rowCount: insertRowCount };
        }
        if (text.includes('SELECT chunk_key FROM')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      async end() {},
    },
  };
}

function makeFetchSequence(responses, prompts) {
  let index = 0;
  return async (_url, options) => {
    prompts.push(JSON.parse(options.body).prompt);
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return response;
  };
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

describe('chunk clamp helpers', () => {
  it('parte un chunk largo sin pasar el limite y conserva limites de linea', () => {
    const lineA = 'a'.repeat(40);
    const lineB = 'b'.repeat(40);
    const parts = splitChunkContent(`${lineA}\n${lineB}`, 70);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe(lineA);
    expect(parts[1]).toBe(lineB);
    expect(parts.every((part) => part.length <= 70)).toBe(true);
  });

  it('sufija chunk_key al partir filas para embedding', () => {
    const rows = expandRowsForEmbedding([
      {
        chunkKey: 'abc123',
        content: `${'x'.repeat(40)}\n${'y'.repeat(40)}`,
        title: 'DR demo',
        source_type: 'dr-fanout',
        graph_node_id: null,
        source_ids: ['demo'],
        model: 'nomic-embed-text',
      },
    ], 70);

    expect(rows).toHaveLength(2);
    expect(rows[0].chunkKey).toBe('abc123--part1');
    expect(rows[1].chunkKey).toBe('abc123--part2');
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
      chunkIndex: rows[0].chunkIndex,
      title: rows[0].title,
      content: rows[0].content,
    })).toBe(rows[0].chunkKey);
  });
});

describe('runReindexRag', () => {
  it('usa ON CONFLICT y parte un chunk que supera el limite seguro', async () => {
    makeDoc('demo.md', [
      '# DR demo',
      '',
      'a'.repeat(3500),
      'b'.repeat(3500),
    ].join('\n'));

    const { pool, queries } = makePool({ uniqueChunkKey: true, insertRowCount: 2 });
    const prompts = [];
    const fetchImpl = makeFetchSequence([
      {
        ok: true,
        status: 200,
        json: async () => ({ embedding: Array.from({ length: 768 }, (_, index) => index / 1000) }),
      },
      {
        ok: true,
        status: 200,
        json: async () => ({ embedding: Array.from({ length: 768 }, (_, index) => index / 2000) }),
      },
    ], prompts);

    const result = await runReindexRag({
      sourceDir: tempRoot,
      dryRun: false,
      pool,
      fetchImpl,
      logger: { info() {}, warn() {}, error() {} },
      maxChars: 10000,
    });

    expect(result.errors).toBe(0);
    expect(result.inserted).toBe(2);
    expect(prompts.length).toBe(2);
    expect(prompts.every((prompt) => prompt.length <= MAX_CHUNK_CHARS)).toBe(true);
    expect(queries.some((sql) => sql.includes('ON CONFLICT (chunk_key) DO NOTHING'))).toBe(true);
  });

  it('reintenta una vez un chunk que devuelve 500 y lo parte a la mitad', async () => {
    makeDoc('demo.md', [
      '# DR demo',
      '',
      'c'.repeat(4000),
    ].join('\n'));

    const { pool } = makePool({ uniqueChunkKey: true, insertRowCount: 2 });
    const prompts = [];
    const fetchImpl = async (_url, options) => {
      prompts.push(JSON.parse(options.body).prompt);
      if (prompts.length === 1) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ embedding: Array.from({ length: 768 }, (_, index) => index / 3000) }),
      };
    };

    const result = await runReindexRag({
      sourceDir: tempRoot,
      dryRun: false,
      pool,
      fetchImpl,
      logger: { info() {}, warn() {}, error() {} },
      maxChars: 10000,
    });

    expect(result.errors).toBe(0);
    expect(result.inserted).toBe(2);
    expect(prompts).toHaveLength(3);
    expect(prompts[1].length).toBeLessThan(prompts[0].length);
    expect(prompts[2].length).toBeLessThan(prompts[0].length);
  });

  it('loguea el doc y el largo del chunk cuando el retry tambien falla', async () => {
    makeDoc('demo.md', [
      '# DR demo',
      '',
      'd'.repeat(4000),
    ].join('\n'));

    const { pool } = makePool({ uniqueChunkKey: true, insertRowCount: 1 });
    const errors = [];
    const fetchImpl = async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const result = await runReindexRag({
      sourceDir: tempRoot,
      dryRun: false,
      pool,
      fetchImpl,
      logger: {
        info() {},
        warn() {},
        error(message, meta) {
          errors.push({ message, meta });
        },
      },
      maxChars: 10000,
    });

    expect(result.errors).toBe(1);
    expect(errors.some((entry) => entry.message.includes('demo.md') && entry.message.includes('chunk de ') && entry.message.includes('chars fallo'))).toBe(true);
    expect(errors.some((entry) => entry.meta?.chunkLength < 4000 && entry.meta?.chunkLength > 1000)).toBe(true);
  });

  it('falla si faltan columnas requeridas', async () => {
    makeDoc('demo.md', '# DR demo\n\nTexto.');

    const { pool } = makePool({ columns: ['chunk_key', 'content', 'embedding'] });

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

describe('env config', () => {
  it('lee REINDEX_RAG_MAX_CHUNK_CHARS al importar el modulo', async () => {
    const previous = process.env.REINDEX_RAG_MAX_CHUNK_CHARS;
    process.env.REINDEX_RAG_MAX_CHUNK_CHARS = '4321';
    vi.resetModules();
    const mod = await import('../experimentos/reindex-rag.mjs');
    expect(mod.MAX_CHUNK_CHARS).toBe(4321);
    if (previous === undefined) {
      delete process.env.REINDEX_RAG_MAX_CHUNK_CHARS;
    } else {
      process.env.REINDEX_RAG_MAX_CHUNK_CHARS = previous;
    }
    vi.resetModules();
  });
});

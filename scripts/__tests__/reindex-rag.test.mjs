import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename, dirname } from 'node:path';

import {
  buildDocumentSections,
  collectMarkdownFiles,
  detectSpecies,
  detectTheme,
  hashChunkText,
  normalizeChunkText,
  runReindex,
  splitMarkdownIntoSections,
  toCorpusChunkRows,
} from '../experimentos/reindex-rag.mjs';

let tmpRoot;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'reindex-rag-'));
});

afterEach(() => {
  if (tmpRoot) {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

function makeDoc(relPath, content) {
  const filePath = join(tmpRoot, relPath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeLogger() {
  const lines = [];
  return {
    lines,
    info(message) {
      lines.push(['info', message]);
    },
    warn(message) {
      lines.push(['warn', message]);
    },
    error(message) {
      lines.push(['error', message]);
    },
  };
}

describe('markdown chunking', () => {
  it('divide por encabezados y conserva path de secciones', () => {
    const text = [
      '# Intro',
      '',
      'Primer bloque.',
      '',
      '## Detalle',
      '',
      'Segundo bloque.',
    ].join('\n');

    const sections = splitMarkdownIntoSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].headingPath).toEqual(['Intro']);
    expect(sections[1].headingPath).toEqual(['Intro', 'Detalle']);
  });

  it('parte secciones largas con solape', () => {
    const text = [
      '# Tema',
      '',
      'a'.repeat(120),
    ].join('\n');

    const chunks = buildDocumentSections(text, 'tema.md', { maxChars: 70, overlapChars: 12 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(70);
    expect(chunks[1].text.length).toBeLessThanOrEqual(70);
    expect(chunks[1].startChar).toBeLessThan(chunks[0].endChar);
  });
});

describe('metadata detection', () => {
  it('detecta tema y especie desde frontmatter', () => {
    const text = [
      '---',
      'tema: cafe',
      'species: Coffea arabica',
      '---',
      '',
      '# Notas',
      '',
      'Contenido.',
    ].join('\n');

    expect(detectTheme({ frontmatter: { tema: 'cafe' }, sections: [], fileStem: 'nota' })).toBe('cafe');
    expect(detectSpecies({ frontmatter: { species: 'Coffea arabica' }, text, fileStem: 'nota', sections: [] })).toBe('Coffea arabica');
  });

  it('normaliza texto y hash de forma estable', () => {
    expect(normalizeChunkText(' Hola \r\n mundo \n')).toBe('Hola\n mundo');
    expect(hashChunkText('Hola mundo')).toHaveLength(64);
  });
});

describe('filesystem helpers', () => {
  it('recorre markdowns de forma recursiva y ordenada', () => {
    makeDoc('a/uno.md', '# Uno\nContenido.');
    makeDoc('b/dos.md', '# Dos\nContenido.');
    makeDoc('b/ignore.txt', 'x');

    const files = collectMarkdownFiles(tmpRoot);
    expect(files.map((file) => basename(file))).toEqual(['uno.md', 'dos.md']);
  });

  it('genera rows con metadata requerida', () => {
    const filePath = makeDoc('tema.md', [
      '---',
      'tema: milpa',
      'species: Zea mays',
      '---',
      '',
      '# Milpa',
      '',
      'Texto corto.',
    ].join('\n'));
    const rows = toCorpusChunkRows({ filePath, fileName: 'tema.md', text: readFileSync(filePath, 'utf8'), maxChars: 80, overlapChars: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].contentHash).toHaveLength(64);
    expect(rows[0].metadata.fuente).toBe('tema.md');
    expect(rows[0].metadata.tema).toBe('milpa');
    expect(rows[0].metadata.especie).toBe('Zea mays');
  });
});

describe('runReindex', () => {
  it('inserta, deduplica y sigue tras un error por documento', async () => {
    makeDoc('alpha.md', [
      '---',
      'tema: milpa',
      'species: Zea mays',
      '---',
      '',
      '# Base',
      '',
      'Texto estable para el primer documento.',
    ].join('\n'));

    makeDoc('beta.md', [
      '---',
      'tema: milpa',
      'species: Zea mays',
      '---',
      '',
      '# Base',
      '',
      'Texto estable para el primer documento.',
    ].join('\n'));

    makeDoc('gamma.md', [
      '# Falla',
      '',
      'Este documento debe fallar al embebido.',
      '',
      'falla',
    ].join('\n'));

    const insertedHashes = new Set();
    const pool = {
      async query(sql, params) {
        const text = String(sql);
        const compact = text.trimStart();
        if (text.includes('information_schema.columns')) {
          return {
            rows: [
              { column_name: 'content_hash' },
              { column_name: 'content' },
              { column_name: 'embedding' },
              { column_name: 'metadata' },
              { column_name: 'source_file' },
              { column_name: 'theme' },
              { column_name: 'species' },
              { column_name: 'section_title' },
              { column_name: 'heading_path' },
              { column_name: 'chunk_index' },
              { column_name: 'source_path' },
            ],
          };
        }
        if (compact.includes('SELECT "content_hash" AS content_hash')) {
          const hashes = params[0];
          return {
            rows: hashes.filter((hash) => insertedHashes.has(hash)).map((hash) => ({ content_hash: hash })),
          };
        }
        if (compact.startsWith('INSERT INTO')) {
          const rowCount = (text.match(/\)\s*,\s*\(/g) || []).length + 1;
          const columnsPerRow = params.length / rowCount;
          for (let index = 0; index < params.length; index += columnsPerRow) {
            insertedHashes.add(params[index]);
          }
          return { rowCount };
        }
        if (text.startsWith('SELECT')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      async end() {},
    };

    const logger = makeLogger();
    const fetchImpl = async (_url, options) => {
      const payload = JSON.parse(options.body);
      if (payload.prompt.includes('falla')) {
        throw new Error('red fallida');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ embedding: [1, 2, 3] }),
      };
    };

    const result = await runReindex({
      sourceDir: tmpRoot,
      logPath: join(tmpRoot, 'reindex.log'),
      pool,
      logger,
      fetchImpl,
      maxChars: 200,
      overlapChars: 20,
      fetchBatchSize: 4,
      insertBatchSize: 4,
      concurrency: 1,
    });

    expect(result.files).toBe(3);
    expect(result.documents).toBe(3);
    expect(result.inserted).toBeGreaterThan(0);
    expect(result.skipped).toBeGreaterThan(0);
    expect(result.errors).toBe(1);
    expect(insertedHashes.size).toBe(1);
    expect(logger.lines.some(([level, message]) => level === 'error' && message.includes('gamma.md'))).toBe(true);
  });
});

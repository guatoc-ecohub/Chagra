#!/usr/bin/env node
/**
 * scripts/experimentos/reindex-rag.mjs
 *
 * Ingesta de deepresearch/DR-FANOUT hacia chagra_kg.corpus_chunks.
 *
 * Flujo:
 *   1. Lee cada .md del directorio fuente, de forma recursiva.
 *   2. Parte cada documento por secciones markdown y genera chunks con solape.
 *   3. Embebe cada chunk contra Ollama local usando nomic-embed-text.
 *   4. Inserta en chagra_kg.corpus_chunks con metadata y deduplicacion por
 *      hash del texto.
 *
 * El script es tolerante a fallos por documento. Un archivo que falle no
 * detiene el resto del lote.
 */

import { readFileSync, readdirSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const WORKSPACE_ROOT = process.env.REINDEX_RAG_WORKSPACE_ROOT
  || join(homedir(), 'Workspace', 'Chagra-strategy');
export const DEFAULT_SOURCE_DIR = process.env.REINDEX_RAG_SOURCE_DIR
  || join(WORKSPACE_ROOT, 'deepresearch', 'DR-FANOUT');
export const DEFAULT_LOG_PATH = process.env.REINDEX_RAG_LOG_PATH
  || '/mnt/fast/chagra/reindex-rag.log';
export const DEFAULT_OLLAMA_URL = process.env.REINDEX_RAG_OLLAMA_URL
  || 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = process.env.REINDEX_RAG_MODEL || 'nomic-embed-text';
export const DEFAULT_SCHEMA = process.env.REINDEX_RAG_SCHEMA || 'chagra_kg';
export const DEFAULT_TABLE = process.env.REINDEX_RAG_TABLE || 'corpus_chunks';
export const DEFAULT_MAX_CHARS = Number.parseInt(process.env.REINDEX_RAG_MAX_CHARS || '3200', 10);
export const DEFAULT_OVERLAP_CHARS = Number.parseInt(process.env.REINDEX_RAG_OVERLAP_CHARS || '400', 10);
export const DEFAULT_INSERT_BATCH_SIZE = Number.parseInt(process.env.REINDEX_RAG_INSERT_BATCH_SIZE || '120', 10);
export const DEFAULT_FETCH_BATCH_SIZE = Number.parseInt(process.env.REINDEX_RAG_FETCH_BATCH_SIZE || '16', 10);
export const DEFAULT_CONCURRENCY = Number.parseInt(process.env.REINDEX_RAG_CONCURRENCY || '4', 10);

const EMBED_TIMEOUT_MS = Number.parseInt(process.env.REINDEX_RAG_EMBED_TIMEOUT_MS || '60000', 10);

function ensureDirForFile(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function createLogger(logPath) {
  ensureDirForFile(logPath);
  return {
    info(message, meta = null) {
      const line = formatLogLine('INFO', message, meta);
      appendFileSync(logPath, line + '\n', 'utf8');
      console.log(message);
    },
    warn(message, meta = null) {
      const line = formatLogLine('WARN', message, meta);
      appendFileSync(logPath, line + '\n', 'utf8');
      console.warn(message);
    },
    error(message, meta = null) {
      const line = formatLogLine('ERROR', message, meta);
      appendFileSync(logPath, line + '\n', 'utf8');
      console.error(message);
    },
  };
}

function formatLogLine(level, message, meta) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    meta: meta ?? undefined,
  };
  return JSON.stringify(payload);
}

export function normalizeChunkText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function hashChunkText(text) {
  return createHash('sha256').update(normalizeChunkText(text), 'utf8').digest('hex');
}

export function slugifyText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function parseFrontmatter(text) {
  const src = String(text || '').replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) return { data: {}, body: src };

  const end = src.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: src };

  const raw = src.slice(4, end);
  const body = src.slice(end + 5);
  const data = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!key) continue;
    data[key] = value;
  }
  return { data, body };
}

function stripMarkdownHeading(text) {
  return String(text || '')
    .replace(/^#{1,6}\s+/, '')
    .trim();
}

function findFirstHeading(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (match) return { level: match[1].length, title: match[2].trim() };
  }
  return null;
}

function headingMatch(line) {
  const match = line.match(/^(#{1,6})\s+(.*\S)\s*$/);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

export function splitMarkdownIntoSections(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  const stack = [];
  let current = null;

  function flushCurrent() {
    if (!current) return;
    const content = current.lines.join('\n').trim();
    if (content) {
      sections.push({
        headingPath: [...current.headingPath],
        headingLevel: current.headingLevel,
        headingTitle: current.headingTitle,
        text: content,
      });
    }
    current = null;
  }

  for (const line of lines) {
    const heading = headingMatch(line);
    if (heading) {
      flushCurrent();
      stack.length = Math.max(0, heading.level - 1);
      stack[heading.level - 1] = heading.title;
      current = {
        headingLevel: heading.level,
        headingTitle: heading.title,
        headingPath: stack.slice(0, heading.level),
        lines: [line],
      };
      continue;
    }

    if (!current) {
      current = {
        headingLevel: 0,
        headingTitle: '',
        headingPath: [],
        lines: [],
      };
    }
    current.lines.push(line);
  }

  flushCurrent();
  return sections;
}

function sliceWithOverlap(text, maxChars, overlapChars) {
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];
  if (normalized.length <= maxChars) {
    return [{ text: normalized, startChar: 0, endChar: normalized.length, overlapFromPrev: 0 }];
  }

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const boundary = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('\n#'),
      );
      if (boundary > Math.floor(maxChars * 0.5)) {
        end = start + boundary;
      }
    }

    const slice = normalizeChunkText(normalized.slice(start, end));
    if (slice) {
      chunks.push({
        text: slice,
        startChar: start,
        endChar: end,
        overlapFromPrev: chunks.length === 0 ? 0 : overlapChars,
      });
    }

    if (end >= normalized.length) break;
    const nextStart = Math.max(0, end - overlapChars);
    if (nextStart <= start) {
      start = end;
    } else {
      start = nextStart;
    }
  }

  return chunks;
}

export function detectTheme({ frontmatter = {}, sections = [], fileStem = '' } = {}) {
  const frontmatterTheme = firstString(frontmatter.theme || frontmatter.tema || frontmatter.topic);
  if (frontmatterTheme) return slugifyText(frontmatterTheme);

  for (const section of sections) {
    const title = stripMarkdownHeading(section.headingTitle || '');
    if (title) return slugifyText(title);
  }

  const firstHeading = findFirstHeading(fileStem);
  if (firstHeading?.title) return slugifyText(firstHeading.title);
  return slugifyText(fileStem);
}

export function detectSpecies({ frontmatter = {}, text = '', fileStem = '', sections = [] } = {}) {
  const fmSpecies = firstString(frontmatter.species || frontmatter.especie || frontmatter.specie);
  if (fmSpecies) return fmSpecies.trim();

  const candidates = [];
  const searchTexts = [
    fileStem,
    ...sections.map((section) => section.headingTitle || ''),
    text,
  ];

  const binomialRe = /\b([A-Z][a-z]{2,})\s+([a-z]{3,})(?:\s+([a-z]{2,}))?\b/g;
  for (const src of searchTexts) {
    let match;
    while ((match = binomialRe.exec(src)) !== null) {
      const candidate = [match[1], match[2], match[3]].filter(Boolean).join(' ');
      if (candidate) candidates.push(candidate);
    }
  }

  const unique = [...new Set(candidates)];
  return unique[0] || null;
}

function firstString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
  }
  return null;
}

export function buildDocumentSections(text, fileName, { maxChars = DEFAULT_MAX_CHARS, overlapChars = DEFAULT_OVERLAP_CHARS } = {}) {
  const { data: frontmatter, body } = parseFrontmatter(text);
  const rawSections = splitMarkdownIntoSections(body);
  const fileStem = basename(fileName, extname(fileName));
  const theme = detectTheme({ frontmatter, sections: rawSections, fileStem });
  const species = detectSpecies({ frontmatter, text: body, fileStem, sections: rawSections });

  if (rawSections.length === 0) {
    const fallbackText = normalizeChunkText(body);
    if (!fallbackText) return [];
    return [{
      sectionIndex: 0,
      chunkIndex: 0,
      chunkCount: 1,
      headingPath: [],
      headingTitle: firstString(frontmatter.title || frontmatter.titulo || fileStem) || fileStem,
      text: fallbackText,
      frontmatter,
      fileStem,
      theme,
      species,
    }];
  }

  const sections = [];
  for (let sectionIndex = 0; sectionIndex < rawSections.length; sectionIndex += 1) {
    const section = rawSections[sectionIndex];
    const sectionChunks = sliceWithOverlap(section.text, maxChars, overlapChars);
    for (let chunkIndex = 0; chunkIndex < sectionChunks.length; chunkIndex += 1) {
      const chunk = sectionChunks[chunkIndex];
      sections.push({
        sectionIndex,
        chunkIndex,
        chunkCount: sectionChunks.length,
        headingPath: section.headingPath,
        headingTitle: section.headingTitle,
        text: chunk.text,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        overlapFromPrev: chunk.overlapFromPrev,
        frontmatter,
        fileStem,
        theme,
        species,
      });
    }
  }
  return sections;
}

export function toCorpusChunkRows({ filePath, fileName, text, maxChars = DEFAULT_MAX_CHARS, overlapChars = DEFAULT_OVERLAP_CHARS }) {
  const chunks = buildDocumentSections(text, fileName, { maxChars, overlapChars });
  return chunks.map((chunk, index) => {
    const normalized = normalizeChunkText(chunk.text);
    const contentHash = hashChunkText(normalized);
    const metadata = {
      fuente: fileName,
      tema: chunk.theme,
      especie: chunk.species || null,
      source_file: fileName,
      source_path: filePath,
      file_stem: chunk.fileStem,
      heading_path: chunk.headingPath,
      heading_title: chunk.headingTitle,
      section_index: chunk.sectionIndex,
      chunk_index: index,
      chunk_index_in_section: chunk.chunkIndex,
      chunk_count_in_section: chunk.chunkCount,
      start_char: chunk.startChar,
      end_char: chunk.endChar,
      overlap_from_prev: chunk.overlapFromPrev,
      content_hash: contentHash,
    };

    return {
      filePath,
      fileName,
      contentHash,
      content: normalized,
      embedding: null,
      metadata,
      sourceFile: fileName,
      theme: chunk.theme,
      species: chunk.species || null,
      sectionTitle: chunk.headingTitle || null,
      headingPath: chunk.headingPath,
      sectionIndex: chunk.sectionIndex,
      chunkIndex: index,
    };
  });
}

export function collectMarkdownFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
        files.push(entryPath);
      }
    }
  }

  walk(rootDir);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

async function embedTextBatch(texts, { ollamaUrl, model, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch no esta disponible para llamar a Ollama');
  }

  const results = await Promise.all(
    texts.map(async (prompt) => {
      const res = await fetchImpl(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt }),
        signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`Ollama HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
        throw new Error('embedding vacio');
      }
      return data.embedding;
    }),
  );
  return results;
}

export async function resolveCorpusChunkColumns(client, { schema, table }) {
  const query = `
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `;
  const res = await client.query(query, [schema, table]);
  const columns = res.rows.map((row) => row.column_name);

  const pick = (...candidates) => candidates.find((candidate) => columns.includes(candidate)) || null;

  const resolved = {
    contentHash: pick('content_hash', 'chunk_hash', 'hash'),
    content: pick('content', 'chunk_text', 'text', 'body'),
    embedding: pick('embedding'),
    metadata: pick('metadata'),
    sourceFile: pick('source_file', 'source', 'file_name', 'filename'),
    theme: pick('theme'),
    species: pick('species'),
    sectionTitle: pick('section_title', 'heading_title'),
    headingPath: pick('heading_path', 'section_path'),
    chunkIndex: pick('chunk_index', 'position', 'order_index'),
    sourcePath: pick('source_path', 'file_path'),
  };

  const required = ['contentHash', 'content', 'embedding', 'metadata'];
  const missing = required.filter((key) => !resolved[key]);
  if (missing.length > 0) {
    throw new Error(`corpus_chunks no tiene columnas requeridas: ${missing.join(', ')}`);
  }

  return resolved;
}

function buildInsertStatement({ schema, table, columns, rows }) {
  const orderedColumns = [
    ['contentHash', columns.contentHash],
    ['content', columns.content],
    ['embedding', columns.embedding],
    ['metadata', columns.metadata],
    ['sourceFile', columns.sourceFile],
    ['theme', columns.theme],
    ['species', columns.species],
    ['sectionTitle', columns.sectionTitle],
    ['headingPath', columns.headingPath],
    ['chunkIndex', columns.chunkIndex],
    ['sourcePath', columns.sourcePath],
  ].filter(([, columnName]) => Boolean(columnName));

  const tableName = `"${schema}"."${table}"`;
  const colNames = orderedColumns.map(([, columnName]) => `"${columnName}"`);
  const values = [];
  const placeholders = [];
  let paramIndex = 1;

  for (const row of rows) {
    const parts = [];
    for (const [key] of orderedColumns) {
      let value;
      if (key === 'contentHash') value = row.contentHash;
      else if (key === 'content') value = row.content;
      else if (key === 'embedding') value = row.embedding;
      else if (key === 'metadata') value = JSON.stringify(row.metadata);
      else if (key === 'sourceFile') value = row.sourceFile;
      else if (key === 'theme') value = row.theme;
      else if (key === 'species') value = row.species;
      else if (key === 'sectionTitle') value = row.sectionTitle;
      else if (key === 'headingPath') value = JSON.stringify(row.headingPath || []);
      else if (key === 'chunkIndex') value = row.chunkIndex;
      else if (key === 'sourcePath') value = row.filePath;
      else value = null;
      parts.push(`$${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }
    placeholders.push(`(${parts.join(', ')})`);
  }

  const conflictTarget = `"${columns.contentHash}"`;
  const sql = `
    INSERT INTO ${tableName} (${colNames.join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (${conflictTarget}) DO NOTHING
    RETURNING ${conflictTarget}
  `;

  return { sql, values };
}

async function queryExistingHashes(client, { schema, table, hashColumn, hashes }) {
  if (hashes.length === 0) return new Set();
  const sql = `SELECT "${hashColumn}" AS content_hash FROM "${schema}"."${table}" WHERE "${hashColumn}" = ANY($1::text[])`;
  const res = await client.query(sql, [hashes]);
  return new Set(res.rows.map((row) => row.content_hash));
}

async function insertRowsWithFallback(client, { schema, table, columns, rows, logger }) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const { sql, values } = buildInsertStatement({ schema, table, columns, rows });
  try {
    const res = await client.query(sql, values);
    return { inserted: res.rowCount || 0, skipped: rows.length - (res.rowCount || 0) };
  } catch (err) {
    logger.warn(`Batch insert fallo, reintentando fila por fila: ${err.message}`);
    let inserted = 0;
    let skipped = 0;
    for (const row of rows) {
      try {
        const single = buildInsertStatement({ schema, table, columns, rows: [row] });
        const res = await client.query(single.sql, single.values);
        inserted += res.rowCount || 0;
        skipped += 1 - (res.rowCount || 0);
      } catch (rowErr) {
        logger.error(`No se pudo insertar un chunk de ${row.fileName}: ${rowErr.message}`, {
          contentHash: row.contentHash,
        });
      }
    }
    return { inserted, skipped };
  }
}

async function processDocument(client, columns, docPath, options, logger) {
  const fileName = basename(docPath);
  const text = readFileSync(docPath, 'utf8');
  const rows = toCorpusChunkRows({
    filePath: docPath,
    fileName,
    text,
    maxChars: options.maxChars,
    overlapChars: options.overlapChars,
  });

  if (rows.length === 0) {
    logger.warn(`Documento sin chunks utiles: ${fileName}`);
    return { fileName, chunks: 0, inserted: 0, skipped: 0, errors: 0 };
  }

  logger.info(`Documento ${fileName}: ${rows.length} chunks antes de deduplicar`);

  const hashes = rows.map((row) => row.contentHash);
  const existingHashes = await queryExistingHashes(client, {
    schema: options.schema,
    table: options.table,
    hashColumn: columns.contentHash,
    hashes,
  });

  const pending = rows.filter((row) => !existingHashes.has(row.contentHash));
  if (pending.length === 0) {
    logger.info(`Documento ${fileName}: todo ya existia, se omite`);
    return { fileName, chunks: rows.length, inserted: 0, skipped: rows.length, errors: 0 };
  }

  const embedded = [];
  for (let i = 0; i < pending.length; i += options.fetchBatchSize) {
    const slice = pending.slice(i, i + options.fetchBatchSize);
    const vectors = await embedTextBatch(
      slice.map((row) => row.content),
      { ollamaUrl: options.ollamaUrl, model: options.model, fetchImpl: options.fetchImpl },
    );
    for (let j = 0; j < slice.length; j += 1) {
      embedded.push({ ...slice[j], embedding: vectors[j] });
    }
  }

  let inserted = 0;
  let skipped = rows.length - pending.length;
  for (let i = 0; i < embedded.length; i += options.insertBatchSize) {
    const batch = embedded.slice(i, i + options.insertBatchSize);
    const result = await insertRowsWithFallback(client, {
      schema: options.schema,
      table: options.table,
      columns,
      rows: batch,
      logger,
    });
    inserted += result.inserted;
    skipped += result.skipped;
  }

  logger.info(`Documento ${fileName}: insertados ${inserted}, omitidos ${skipped}`);
  return { fileName, chunks: rows.length, inserted, skipped, errors: 0 };
}

export async function runReindex({
  sourceDir = DEFAULT_SOURCE_DIR,
  logPath = DEFAULT_LOG_PATH,
  ollamaUrl = DEFAULT_OLLAMA_URL,
  model = DEFAULT_MODEL,
  schema = DEFAULT_SCHEMA,
  table = DEFAULT_TABLE,
  maxChars = DEFAULT_MAX_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS,
  fetchBatchSize = DEFAULT_FETCH_BATCH_SIZE,
  insertBatchSize = DEFAULT_INSERT_BATCH_SIZE,
  concurrency = DEFAULT_CONCURRENCY,
  dryRun = false,
  fetchImpl = globalThis.fetch,
  pool = null,
  logger = null,
} = {}) {
  const activeLogger = logger || createLogger(logPath);
  const files = collectMarkdownFiles(sourceDir);
  const client = pool || (!dryRun ? new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number.parseInt(process.env.PGPORT, 10) : undefined,
    database: process.env.PGDATABASE || 'chagra_kg',
    user: process.env.PGUSER || 'farmos',
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  }) : null);

  activeLogger.info(`Reindexando ${files.length} documentos desde ${sourceDir}`);
  activeLogger.info(`Destino: ${schema}.${table}`);
  activeLogger.info(`Modelo: ${model} en ${ollamaUrl}`);

  if (files.length === 0) {
    activeLogger.warn('No se encontraron archivos markdown para procesar');
    return {
      files: 0,
      documents: 0,
      chunks: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
    };
  }

  const options = {
    schema,
    table,
    ollamaUrl,
    model,
    fetchBatchSize,
    insertBatchSize,
    fetchImpl,
    maxChars,
    overlapChars,
  };

  const columns = dryRun
    ? {
        contentHash: 'content_hash',
        content: 'content',
        embedding: 'embedding',
        metadata: 'metadata',
        sourceFile: 'source_file',
        theme: 'theme',
        species: 'species',
        sectionTitle: 'section_title',
        headingPath: 'heading_path',
        chunkIndex: 'chunk_index',
        sourcePath: 'source_path',
      }
    : await resolveCorpusChunkColumns(client, { schema, table });

  let chunks = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let processed = 0;

  for (let index = 0; index < files.length; index += concurrency) {
    const batch = files.slice(index, index + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (filePath) => {
        const fileName = basename(filePath);
        try {
          if (dryRun) {
            const text = readFileSync(filePath, 'utf8');
            const rows = toCorpusChunkRows({ filePath, fileName, text, maxChars, overlapChars });
            activeLogger.info(`[dry-run] ${fileName}: ${rows.length} chunks`);
            return { fileName, chunks: rows.length, inserted: 0, skipped: rows.length, errors: 0 };
          }
          return await processDocument(client, columns, filePath, options, activeLogger);
        } catch (err) {
          activeLogger.error(`Error en ${fileName}: ${err.message}`);
          return { fileName, chunks: 0, inserted: 0, skipped: 0, errors: 1 };
        }
      }),
    );

    for (const result of settled) {
      processed += 1;
      if (result.status === 'fulfilled') {
        chunks += result.value.chunks || 0;
        inserted += result.value.inserted || 0;
        skipped += result.value.skipped || 0;
        errors += result.value.errors || 0;
      } else {
        errors += 1;
        activeLogger.error(`Fallo inesperado en lote: ${result.reason?.message || result.reason}`);
      }
    }
  }

  if (!dryRun && typeof client.end === 'function') {
    await client.end();
  }

  activeLogger.info(`Resumen final: documentos ${processed}, chunks ${chunks}, insertados ${inserted}, omitidos ${skipped}, errores ${errors}`);

  return {
    files: files.length,
    documents: processed,
    chunks,
    inserted,
    skipped,
    errors,
  };
}

function parseArgValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    sourceDir: parseArgValue(argv, '--source-dir') || DEFAULT_SOURCE_DIR,
    logPath: parseArgValue(argv, '--log-file') || DEFAULT_LOG_PATH,
    ollamaUrl: parseArgValue(argv, '--ollama-url') || DEFAULT_OLLAMA_URL,
    model: parseArgValue(argv, '--model') || DEFAULT_MODEL,
    schema: parseArgValue(argv, '--schema') || DEFAULT_SCHEMA,
    table: parseArgValue(argv, '--table') || DEFAULT_TABLE,
    maxChars: Number.parseInt(parseArgValue(argv, '--max-chars') || String(DEFAULT_MAX_CHARS), 10),
    overlapChars: Number.parseInt(parseArgValue(argv, '--overlap-chars') || String(DEFAULT_OVERLAP_CHARS), 10),
    fetchBatchSize: Number.parseInt(parseArgValue(argv, '--fetch-batch-size') || String(DEFAULT_FETCH_BATCH_SIZE), 10),
    insertBatchSize: Number.parseInt(parseArgValue(argv, '--insert-batch-size') || String(DEFAULT_INSERT_BATCH_SIZE), 10),
    concurrency: Number.parseInt(parseArgValue(argv, '--concurrency') || String(DEFAULT_CONCURRENCY), 10),
    dryRun: argv.includes('--dry-run'),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  return runReindex(args);
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  main().catch((err) => {
    console.error(`[reindex-rag] ERROR: ${err.message}`);
    process.exit(1);
  });
}

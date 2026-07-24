#!/usr/bin/env node
/**
 * scripts/experimentos/reindex-rag.mjs
 *
 * Ingesta de markdowns DR-FANOUT hacia chagra_kg.corpus_chunks.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

export const SOURCE_TYPE = 'dr-fanout';
export const DEFAULT_SOURCE_DIR = resolve(ROOT, 'deepresearch', 'DR-FANOUT');
export const DEFAULT_OLLAMA_URL = process.env.REINDEX_RAG_OLLAMA_URL || 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'nomic-embed-text';
export const DEFAULT_SCHEMA = 'chagra_kg';
export const DEFAULT_TABLE = 'corpus_chunks';
export const DEFAULT_MAX_CHARS = 3200;
export const DEFAULT_OVERLAP_CHARS = 400;
export const MAX_CHUNK_CHARS = resolvePositiveInt(process.env.REINDEX_RAG_MAX_CHUNK_CHARS, 6000);

const EMBED_DIM = 768;
const EMBED_TIMEOUT_MS = 60000;
const REQUIRED_COLUMNS = ['chunk_key', 'content', 'embedding', 'model'];

function resolvePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureDirForFile(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function createLogger(logFile) {
  if (!logFile) {
    return {
      info(message) {
        console.log(message);
      },
      warn(message) {
        console.warn(message);
      },
      error(message) {
        console.error(message);
      },
    };
  }

  ensureDirForFile(logFile);
  return {
    info(message, meta = null) {
      appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), level: 'info', message, meta }) + '\n', 'utf8');
      console.log(message);
    },
    warn(message, meta = null) {
      appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), level: 'warn', message, meta }) + '\n', 'utf8');
      console.warn(message);
    },
    error(message, meta = null) {
      appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), level: 'error', message, meta }) + '\n', 'utf8');
      console.error(message);
    },
  };
}

export function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    dryRun: false,
    sourceDir: DEFAULT_SOURCE_DIR,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    logFile: null,
    schema: DEFAULT_SCHEMA,
    table: DEFAULT_TABLE,
    maxChars: DEFAULT_MAX_CHARS,
    overlapChars: DEFAULT_OVERLAP_CHARS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }
    if (arg === '--source-dir') {
      opts.sourceDir = resolve(argv[++i] || opts.sourceDir);
      continue;
    }
    if (arg === '--ollama-url') {
      opts.ollamaUrl = argv[++i] || opts.ollamaUrl;
      continue;
    }
    if (arg === '--log-file') {
      opts.logFile = resolve(argv[++i] || '');
      continue;
    }
    if (arg === '--schema') {
      opts.schema = argv[++i] || opts.schema;
      continue;
    }
    if (arg === '--table') {
      opts.table = argv[++i] || opts.table;
      continue;
    }
    if (arg === '--max-chars') {
      opts.maxChars = resolvePositiveInt(argv[++i], opts.maxChars);
      continue;
    }
    if (arg === '--overlap-chars') {
      opts.overlapChars = resolvePositiveInt(argv[++i], opts.overlapChars);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    }
  }

  return opts;
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

function normalizeChunkText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function isHeadingLine(line) {
  const match = String(line || '').match(/^(#{1,6})\s+(.*\S)\s*$/);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

function isFenceLine(line) {
  return /^(```+|~~~+)/.test(String(line || '').trim());
}

export function splitMarkdownIntoSections(text, sourceName = '') {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  const stack = [];
  let current = null;
  let inFence = false;

  function flushCurrent() {
    if (!current) return;
    const body = normalizeChunkText(current.lines.join('\n'));
    const headingLine = current.headingLine || '';
    const sectionText = headingLine ? `${headingLine}\n\n${body}`.trim() : body;
    if (!sectionText) {
      current = null;
      return;
    }
    sections.push({
      headingLevel: current.headingLevel,
      headingTitle: current.headingTitle,
      headingPath: current.headingPath,
      headingLine,
      body,
      text: sectionText,
    });
    current = null;
  }

  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      if (!current) {
        current = {
          headingLevel: 0,
          headingTitle: sourceName,
          headingPath: [],
          headingLine: '',
          lines: [],
        };
      }
      current.lines.push(line);
      continue;
    }

    const heading = !inFence ? isHeadingLine(line) : null;
    if (heading) {
      flushCurrent();
      stack.length = Math.max(0, heading.level - 1);
      stack[heading.level - 1] = heading.title;
      current = {
        headingLevel: heading.level,
        headingTitle: heading.title,
        headingPath: stack.slice(0, heading.level),
        headingLine: line.trim(),
        lines: [],
      };
      continue;
    }

    if (!current) {
      current = {
        headingLevel: 0,
        headingTitle: sourceName,
        headingPath: [],
        headingLine: '',
        lines: [],
      };
    }
    current.lines.push(line);
  }

  flushCurrent();
  return sections;
}

export function sliceWithOverlap(text, maxChars, overlapChars) {
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];
  if (normalized.length <= maxChars) {
    return [{ text: normalized, startChar: 0, endChar: normalized.length }];
  }

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + maxChars);
    const slice = normalizeChunkText(normalized.slice(start, end));
    if (slice) {
      chunks.push({ text: slice, startChar: start, endChar: end });
    }

    if (end >= normalized.length) break;
    let nextStart = end - overlapChars;
    if (nextStart <= start) nextStart = end;
    start = nextStart;
  }

  return chunks;
}

export function buildDocumentChunks(text, sourceName, { maxChars = DEFAULT_MAX_CHARS, overlapChars = DEFAULT_OVERLAP_CHARS } = {}) {
  const sections = splitMarkdownIntoSections(text, sourceName);
  const chunks = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionTitle = section.headingTitle || sourceName;
    const headingPrefix = section.headingLine ? `${section.headingLine}\n\n` : '';
    const body = section.body || '';
    const fullText = section.headingLine ? `${headingPrefix}${body}`.trim() : body;
    if (!fullText) continue;

    const bodyLimit = Math.max(1, maxChars - headingPrefix.length);
    const effectiveOverlap = Math.max(0, Math.min(overlapChars, bodyLimit - 1));
    const bodySlices = body ? sliceWithOverlap(body, bodyLimit, effectiveOverlap) : [{ text: '', startChar: 0, endChar: 0 }];

    if (bodySlices.length === 0) {
      chunks.push({
        chunkIndex,
        title: sectionTitle,
        content: normalizeChunkText(section.headingLine),
        section,
      });
      chunkIndex += 1;
      continue;
    }

    for (const slice of bodySlices) {
      const content = section.headingLine ? `${headingPrefix}${slice.text}`.trim() : slice.text;
      if (!content) continue;
      chunks.push({
        chunkIndex,
        title: sectionTitle,
        content,
        section,
      });
      chunkIndex += 1;
    }
  }

  return chunks;
}

export function hashChunkKey({ sourceName, chunkIndex, title, content }) {
  return createHash('sha256')
    .update(`${sourceName}\u0000${chunkIndex}\u0000${title}\u0000${normalizeChunkText(content)}`, 'utf8')
    .digest('hex');
}

export function toCorpusChunkRows({ filePath, fileName, text, maxChars = DEFAULT_MAX_CHARS, overlapChars = DEFAULT_OVERLAP_CHARS }) {
  const sourceName = basename(fileName, extname(fileName));
  const chunks = buildDocumentChunks(text, sourceName, { maxChars, overlapChars });

  return chunks.map((chunk) => ({
    filePath,
    fileName,
    sourceName,
    chunkIndex: chunk.chunkIndex,
    chunkKey: hashChunkKey({
      sourceName,
      chunkIndex: chunk.chunkIndex,
      title: chunk.title,
      content: chunk.content,
    }),
    source_type: SOURCE_TYPE,
    graph_node_id: null,
    content: normalizeChunkText(chunk.content),
    title: chunk.title || sourceName,
    source_ids: [sourceName],
    embedding: null,
    model: DEFAULT_MODEL,
  }));
}

function splitLongLine(line, maxChars) {
  const normalized = normalizeChunkText(line);
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const parts = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(normalized.length, start + maxChars);
    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\t'));
      if (breakAt > 0) {
        end = start + breakAt;
      }
    }
    if (end <= start) end = Math.min(normalized.length, start + maxChars);
    const piece = normalized.slice(start, end).trim();
    if (piece) parts.push(piece);
    start = end;
    while (start < normalized.length && /\s/.test(normalized[start])) start += 1;
  }

  return parts.length > 0 ? parts : [normalized];
}

function chooseSplitPoint(text, midpoint) {
  const candidates = new Set([midpoint]);
  const leftNewline = text.lastIndexOf('\n', midpoint);
  if (leftNewline > 0) candidates.add(leftNewline + 1);
  const rightNewline = text.indexOf('\n', midpoint);
  if (rightNewline > 0) candidates.add(rightNewline + 1);
  const leftSpace = Math.max(text.lastIndexOf(' ', midpoint), text.lastIndexOf('\t', midpoint));
  if (leftSpace > 0) candidates.add(leftSpace + 1);
  const rightSpace = Math.min(
    ...[' ', '\t'].map((char) => {
      const index = text.indexOf(char, midpoint);
      return index > 0 ? index + 1 : Number.POSITIVE_INFINITY;
    }),
  );
  if (Number.isFinite(rightSpace) && rightSpace > 0) candidates.add(rightSpace);

  let best = midpoint;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate <= 0 || candidate >= text.length) continue;
    const left = text.slice(0, candidate).trim();
    const right = text.slice(candidate).trim();
    if (!left || !right) continue;
    const distance = Math.abs(candidate - midpoint);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function splitChunkContent(text, maxChars = MAX_CHUNK_CHARS) {
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const chunks = [];
  let currentLines = [];
  let currentLength = 0;

  const flush = () => {
    if (currentLines.length === 0) return;
    const chunk = normalizeChunkText(currentLines.join('\n'));
    if (chunk) chunks.push(chunk);
    currentLines = [];
    currentLength = 0;
  };

  for (const rawLine of normalized.split('\n')) {
    const lineParts = rawLine.length > maxChars ? splitLongLine(rawLine, maxChars) : [rawLine];
    for (const part of lineParts) {
      if (!part && currentLines.length === 0) continue;
      const addition = currentLines.length > 0 ? part.length + 1 : part.length;
      if (currentLines.length > 0 && currentLength + addition > maxChars) {
        flush();
      }
      currentLines.push(part);
      currentLength += currentLines.length > 1 ? part.length + 1 : part.length;
    }
  }

  flush();
  return chunks.length > 0 ? chunks : [normalized];
}

function splitChunkContentInHalf(text) {
  const normalized = normalizeChunkText(text);
  if (normalized.length <= 1) return [normalized];

  const midpoint = Math.floor(normalized.length / 2);
  const splitAt = chooseSplitPoint(normalized, midpoint);
  const left = normalized.slice(0, splitAt).trim();
  const right = normalized.slice(splitAt).trim();
  if (left && right) return [left, right];
  return [normalized];
}

export function expandRowsForEmbedding(rows, maxChars = MAX_CHUNK_CHARS) {
  const out = [];

  for (const row of rows) {
    const parts = splitChunkContent(row.content, maxChars);
    if (parts.length <= 1) {
      out.push({ ...row, content: parts[0] || normalizeChunkText(row.content) });
      continue;
    }

    parts.forEach((content, index) => {
      out.push({
        ...row,
        content,
        chunkKey: `${row.chunkKey}--part${index + 1}`,
        chunkPart: index + 1,
        chunkParts: parts.length,
      });
    });
  }

  return out;
}

async function embedChunkText(text, { ollamaUrl, fetchImpl = globalThis.fetch }) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch no esta disponible para consultar Ollama');
  }

  const url = new URL('/api/embeddings', `${ollamaUrl.replace(/\/$/, '')}/`).toString();
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: DEFAULT_MODEL, prompt: text }),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });

  if (!res.ok) {
    const error = new Error(`Ollama HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  if (!Array.isArray(data.embedding) || data.embedding.length !== EMBED_DIM) {
    throw new Error(`embedding invalido: se esperaban ${EMBED_DIM} dimensiones`);
  }
  return data.embedding;
}

function isRetryableOllama500(err) {
  return Boolean(err && Number(err.status) === 500);
}

function makeRetryChunkKey(baseKey, retryIndex) {
  return `${baseKey}--retry${retryIndex}`;
}

async function embedRowsWithRetry(rows, { ollamaUrl, fetchImpl, logger, fileName }) {
  const queue = rows.map((row) => ({ row, retried: false }));
  const embeddedRows = [];
  const vectors = [];

  while (queue.length > 0) {
    const item = queue.shift();
    try {
      const vector = await embedChunkText(item.row.content, { ollamaUrl, fetchImpl });
      embeddedRows.push(item.row);
      vectors.push(vector);
    } catch (err) {
      if (isRetryableOllama500(err) && !item.retried && item.row.content.length > 1) {
        const [firstHalf, secondHalf] = splitChunkContentInHalf(item.row.content);
        if (firstHalf && secondHalf && firstHalf !== item.row.content && secondHalf !== item.row.content) {
          logger.warn(`Ollama HTTP 500 en ${fileName}. Reintentando chunk de ${item.row.content.length} chars partido a la mitad.`, {
            fileName,
            chunkLength: item.row.content.length,
            chunkKey: item.row.chunkKey,
          });
          queue.unshift(
            {
              row: { ...item.row, content: firstHalf, chunkKey: makeRetryChunkKey(item.row.chunkKey, 1) },
              retried: true,
            },
            {
              row: { ...item.row, content: secondHalf, chunkKey: makeRetryChunkKey(item.row.chunkKey, 2) },
              retried: true,
            },
          );
          continue;
        }
      }

      logger.error(`Error embebiendo ${fileName}: chunk de ${item.row.content.length} chars fallo`, {
        fileName,
        chunkLength: item.row.content.length,
        chunkKey: item.row.chunkKey,
        error: err.message,
      });
      throw err;
    }
  }

  return { rows: embeddedRows, vectors };
}

function vectorLiteral(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('embedding vacio');
  }

  const parts = values.map((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('embedding invalido');
    }
    return Number(value).toString();
  });
  return `[${parts.join(',')}]`;
}

async function queryRequiredColumns(client, { schema, table }) {
  const sql = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1
      AND table_name = $2
      AND column_name = ANY($3::text[])
  `;
  const res = await client.query(sql, [schema, table, REQUIRED_COLUMNS]);
  const present = new Set(res.rows.map((row) => row.column_name));
  const missing = REQUIRED_COLUMNS.filter((column) => !present.has(column));
  if (missing.length > 0) {
    throw new Error(`corpus_chunks no tiene columnas requeridas: ${missing.join(', ')}`);
  }
  return true;
}

async function hasUniqueChunkKeyIndex(client, { schema, table }) {
  const sql = `
    SELECT EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid
      WHERE n.nspname = $1
        AND t.relname = $2
        AND i.indisunique
        AND i.indnkeyatts = 1
        AND a.attnum = ANY(i.indkey)
        AND a.attname = 'chunk_key'
    ) AS has_unique_chunk_key
  `;
  const res = await client.query(sql, [schema, table]);
  return Boolean(res.rows[0]?.has_unique_chunk_key);
}

async function queryExistingChunkKeys(client, { schema, table, chunkKeys }) {
  if (chunkKeys.length === 0) return new Set();
  const sql = `SELECT chunk_key FROM "${schema}"."${table}" WHERE chunk_key = ANY($1::text[])`;
  const res = await client.query(sql, [chunkKeys]);
  return new Set(res.rows.map((row) => row.chunk_key));
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row.chunkKey)) continue;
    seen.add(row.chunkKey);
    out.push(row);
  }
  return out;
}

function buildInsertQuery({ schema, table, rows, useConflict }) {
  if (rows.length === 0) {
    return { text: '', values: [] };
  }

  const values = [];
  const placeholders = [];
  let param = 1;
  for (const row of rows) {
    placeholders.push(`($${param}, $${param + 1}, $${param + 2}, $${param + 3}, $${param + 4}, $${param + 5}::text[], $${param + 6}::vector, $${param + 7})`);
    values.push(
      row.chunkKey,
      row.source_type,
      row.graph_node_id,
      row.content,
      row.title,
      row.source_ids,
      vectorLiteral(row.embedding),
      row.model,
    );
    param += 8;
  }

  const conflict = useConflict ? ' ON CONFLICT (chunk_key) DO NOTHING' : '';
  return {
    text: `
      INSERT INTO "${schema}"."${table}" (
        chunk_key,
        source_type,
        graph_node_id,
        content,
        title,
        source_ids,
        embedding,
        model
      )
      VALUES ${placeholders.join(', ')}
      ${conflict}
    `,
    values,
  };
}

async function insertRows(client, { schema, table, rows, useConflict }) {
  const { text, values } = buildInsertQuery({ schema, table, rows, useConflict });
  if (!text) return 0;
  const res = await client.query(text, values);
  return res.rowCount || 0;
}

async function createPoolFromEnv() {
  return new Pool();
}

async function processDocument({ filePath, fileName, text, options, logger, client, useConflict, fetchImpl }) {
  const baseRows = toCorpusChunkRows({
    filePath,
    fileName,
    text,
    maxChars: options.maxChars,
    overlapChars: options.overlapChars,
  });

  if (baseRows.length === 0) {
    logger.warn(`Documento sin chunks utiles: ${fileName}`);
    return { chunks: 0, embedded: 0, inserted: 0, skipped: 0 };
  }

  const rows = expandRowsForEmbedding(baseRows, MAX_CHUNK_CHARS);
  const inputRowCount = rows.length;
  let pendingRows = dedupeRows(rows);
  if (!useConflict) {
    const existing = await queryExistingChunkKeys(client, {
      schema: options.schema,
      table: options.table,
      chunkKeys: pendingRows.map((row) => row.chunkKey),
    });
    pendingRows = pendingRows.filter((row) => !existing.has(row.chunkKey));
  }

  if (pendingRows.length === 0) {
    logger.info(`Documento ${fileName}: todo ya existia`);
    return { chunks: rows.length, embedded: 0, inserted: 0, skipped: rows.length };
  }

  const { rows: readyRows, vectors } = await embedRowsWithRetry(pendingRows, {
    ollamaUrl: options.ollamaUrl,
    fetchImpl,
    logger,
    fileName,
  });

  const finalRows = readyRows.map((row, index) => ({
    ...row,
    embedding: vectors[index],
  }));

  const inserted = options.dryRun ? 0 : await insertRows(client, {
    schema: options.schema,
    table: options.table,
    rows: finalRows,
    useConflict,
  });
  const skipped = Math.max(0, inputRowCount - inserted);

  logger.info(`Documento ${fileName}: chunks ${finalRows.length}, insertados ${inserted}, omitidos ${skipped}`);

  return {
    chunks: finalRows.length,
    embedded: finalRows.length,
    inserted,
    skipped,
  };
}

export async function runReindexRag({
  sourceDir = DEFAULT_SOURCE_DIR,
  ollamaUrl = DEFAULT_OLLAMA_URL,
  logFile = null,
  schema = DEFAULT_SCHEMA,
  table = DEFAULT_TABLE,
  maxChars = DEFAULT_MAX_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS,
  dryRun = false,
  pool = null,
  fetchImpl = globalThis.fetch,
  logger = null,
} = {}) {
  const activeLogger = logger || createLogger(logFile);
  if (!existsSync(sourceDir)) {
    throw new Error(`No existe el directorio fuente: ${sourceDir}`);
  }

  const files = collectMarkdownFiles(sourceDir);
  activeLogger.info(`Reindexando ${files.length} documentos desde ${sourceDir}`);
  activeLogger.info(`Destino: ${schema}.${table}`);
  activeLogger.info(`Modelo: ${DEFAULT_MODEL} en ${ollamaUrl}`);
  activeLogger.info(`Clampeo de chunks: ${MAX_CHUNK_CHARS} chars`);

  if (files.length === 0) {
    activeLogger.warn('No se encontraron archivos markdown para procesar');
    return { files: 0, documents: 0, chunks: 0, embedded: 0, inserted: 0, skipped: 0, errors: 0 };
  }

  const options = {
    ollamaUrl,
    schema,
    table,
    maxChars,
    overlapChars,
    dryRun,
  };

  let client = null;
  let useConflict = false;
  if (!dryRun) {
    client = pool || await createPoolFromEnv();
    await queryRequiredColumns(client, { schema, table });
    useConflict = await hasUniqueChunkKeyIndex(client, { schema, table });
    activeLogger.info(useConflict ? 'Indice unico en chunk_key detectado, se usara ON CONFLICT' : 'No hay indice unico en chunk_key, se verificara existencia antes de insertar');
  }

  let documents = 0;
  let chunks = 0;
  let embedded = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of files) {
    const fileName = basename(filePath);
    try {
      const text = readFileSync(filePath, 'utf8');
      const result = await processDocument({
        filePath,
        fileName,
        text,
        options,
        logger: activeLogger,
        client,
        useConflict,
        fetchImpl,
      });
      documents += 1;
      chunks += result.chunks;
      embedded += result.embedded;
      inserted += result.inserted;
      skipped += result.skipped;
    } catch (err) {
      errors += 1;
      activeLogger.error(`Error en ${fileName}: ${err.message}`);
    }
  }

  if (client && typeof client.end === 'function') {
    await client.end();
  }

  activeLogger.info(`Resumen final: documentos ${documents}, chunks ${chunks}, embebidos ${embedded}, insertados ${inserted}, omitidos ${skipped}, errores ${errors}`);

  return {
    files: files.length,
    documents,
    chunks,
    embedded,
    inserted,
    skipped,
    errors,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log([
      'Usage: node scripts/experimentos/reindex-rag.mjs [options]',
      '',
      'Options:',
      '  --dry-run',
      '  --source-dir PATH',
      '  --ollama-url URL',
      '  --log-file PATH',
      '  --schema NAME',
      '  --table NAME',
      '  --max-chars N',
      '  --overlap-chars N',
    ].join('\n'));
    return { help: true };
  }

  return runReindexRag(args);
}

const IS_CLI = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (IS_CLI) {
  main().catch((err) => {
    console.error(`[reindex-rag] ERROR: ${err.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
/* global AbortController, URL, clearTimeout, console, fetch, process, setTimeout */

/**
 * Check every source URL declared by src/data/climaBoletines.js.
 *
 * FUENTES_VIVAS is the critical catalog. URLs outside that catalog are still
 * checked and reported, but only a dead critical URL makes the command fail.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 8_000;
const SOURCE_FILE = new URL('../../src/data/climaBoletines.js', import.meta.url);
const LIVE_STATUS_CODES = new Set([200, 301, 302]);
const URL_PATTERN = /https?:\/\/[^\s'"`<>]+/g;

function cleanUrl(value) {
  return value.replace(/[),.;\]}]+$/g, '');
}

/** Extract unique HTTP(S) URLs while preserving their first-seen order. */
export function extractUrls(sourceText) {
  const urls = [];
  const seen = new Set();

  for (const match of sourceText.matchAll(URL_PATTERN)) {
    const url = cleanUrl(match[0]);
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

/** Extract the URL subset used by the live-source catalog. */
export function extractCriticalUrls(sourceText) {
  const start = sourceText.indexOf('export const FUENTES_VIVAS');
  if (start === -1) return [];

  const end = sourceText.indexOf('\n});', start);
  const block = end === -1 ? sourceText.slice(start) : sourceText.slice(start, end);
  return extractUrls(block);
}

function normalizeTimeout(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`timeoutMs debe ser un número positivo: ${timeoutMs}`);
  }
  return timeoutMs;
}

async function request(url, method, timeoutMs, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
    });
    return {
      method,
      statusCode: response.status,
      error: null,
    };
  } catch (error) {
    return {
      method,
      statusCode: 0,
      error: error?.name === 'AbortError' ? 'timeout' : error?.message ?? String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check one URL with HEAD first and GET as a fallback for servers that do not
 * implement HEAD or when the HEAD request cannot be completed.
 */
export async function checkUrl(url, { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const timeout = normalizeTimeout(timeoutMs);
  const attempts = [await request(url, 'HEAD', timeout, fetchImpl)];
  const head = attempts[0];

  if (head.statusCode === 405 || head.statusCode === 501 || head.statusCode === 0) {
    attempts.push(await request(url, 'GET', timeout, fetchImpl));
  }

  const finalAttempt = attempts.at(-1);
  const live = LIVE_STATUS_CODES.has(finalAttempt.statusCode);

  return {
    url,
    status: finalAttempt.statusCode === 0 ? '000' : String(finalAttempt.statusCode),
    statusCode: finalAttempt.statusCode,
    state: live ? 'live' : 'dead',
    method: finalAttempt.method,
    attempts,
    error: finalAttempt.error,
  };
}

export async function verifyUrls({
  sourceText,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
  criticalUrls,
} = {}) {
  if (typeof sourceText !== 'string') {
    throw new TypeError('verifyUrls requiere sourceText');
  }

  const urls = extractUrls(sourceText);
  const critical = new Set(criticalUrls ?? extractCriticalUrls(sourceText));
  const results = await Promise.all(
    urls.map(async (url) => ({
      ...(await checkUrl(url, { timeoutMs, fetchImpl })),
      critical: critical.has(url),
    })),
  );
  const dead = results.filter((result) => result.state === 'dead');
  const criticalDead = dead.filter((result) => result.critical);

  return {
    checkedAt: new Date().toISOString(),
    total: results.length,
    live: results.filter((result) => result.state === 'live').length,
    dead: dead.length,
    criticalDead: criticalDead.length,
    ok: criticalDead.length === 0,
    urls: results,
  };
}

export function parseTimeoutArg(args = process.argv.slice(2)) {
  const value = args.find((arg) => arg.startsWith('--timeout-ms='));
  return value ? Number(value.slice('--timeout-ms='.length)) : DEFAULT_TIMEOUT_MS;
}

export async function main({ sourceFile = SOURCE_FILE, timeoutMs = parseTimeoutArg() } = {}) {
  const sourceText = await readFile(sourceFile, 'utf8');
  const report = await verifyUrls({ sourceText, timeoutMs });
  console.log(JSON.stringify({ sourceFile: fileURLToPath(sourceFile), ...report }, null, 2));
  return report.ok ? 0 : 1;
}

const invokedFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedFile === import.meta.url) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.log(JSON.stringify({
      sourceFile: fileURLToPath(SOURCE_FILE),
      total: 0,
      live: 0,
      dead: 0,
      criticalDead: 0,
      ok: false,
      error: error?.message ?? String(error),
      urls: [],
    }, null, 2));
    process.exitCode = 1;
  }
}

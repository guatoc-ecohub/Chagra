#!/usr/bin/env node

/**
 * export-voice-telemetry.mjs — Exporta telemetría de voz desde FarmOS.
 *
 * Lee logs FarmOS con category=voice_metrics y outputs CSV con columnas:
 * timestamp, flujo, event_type, duration_ms, accepted, edits, connectivity
 *
 * Uso:
 *   node scripts/export-voice-telemetry.mjs [--csv|--json] [--limit N] [--since YYYY-MM-DD]
 *
 * Requiere:
 *   - FARMOS_URL, FARMOS_TOKEN en entorno (usar .env o variables de entorno)
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FARMOS_URL = process.env.FARMOS_URL || 'https://chagra.guatoc.co';
const FARMOS_TOKEN = process.env.FARMOS_TOKEN;

const args = process.argv.slice(2);
const format = args.includes('--csv') ? 'csv' : args.includes('--json') ? 'json' : 'csv';
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 1000;
const sinceArg = args.includes('--since') ? args[args.indexOf('--since') + 1] : null;

if (!FARMOS_TOKEN) {
  console.error('Error: FARMOS_TOKEN no configurado');
  console.error('Exporta FARMOS_TOKEN antes de ejecutar este script');
  process.exit(1);
}

const sinceFilter = sinceArg ? `&filter[since]=${sinceArg}` : '';

async function fetchVoiceMetricsLogs() {
  const url = `${FARMOS_URL}/api/logs?filter[category][path]=voice_metrics&sort=-timestamp&page[limit]=${limit}${sinceFilter}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${FARMOS_TOKEN}`,
      'Content-Type': 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

function transformToExportFormat(logs) {
  return logs.map(log => {
    const attrs = log.attributes || {};
    const metadata = attrs.metadata?.voice_telemetry || {};
    const events = metadata.events || [];

    return events.map(event => ({
      timestamp: attrs.timestamp || log.attributes?.created_at || '',
      flujo: event.flujo || 'unknown',
      event_type: event.event_type || 'unknown',
      duration_ms: event.duration_ms ?? '',
      accepted: event.accepted ?? '',
      edits: event.edits ?? '',
      connectivity: event.connectivity || '',
      created_at: event.created_at || '',
    }));
  }).flat();
}

function toCSV(events) {
  const header = 'timestamp,flujo,event_type,duration_ms,accepted,edits,connectivity,created_at';
  const rows = events.map(e => [
    e.timestamp,
    e.flujo,
    e.event_type,
    e.duration_ms ?? '',
    e.accepted ?? '',
    e.edits ?? '',
    e.connectivity,
    e.created_at,
  ].join(','));
  return [header, ...rows].join('\n');
}

async function main() {
  try {
    console.log('Fetching voice telemetry logs from FarmOS...');
    const logs = await fetchVoiceMetricsLogs();
    console.log(`Found ${logs.length} logs`);

    const events = transformToExportFormat(logs);
    console.log(`Extracted ${events.length} events`);

    if (format === 'csv') {
      console.log('\n' + toCSV(events));
    } else {
      console.log(JSON.stringify({ events, summary: { total: events.length, logs: logs.length } }, null, 2));
    }
  } catch (err) {
    console.error('Export failed:', err.message);
    process.exit(1);
  }
}

main();
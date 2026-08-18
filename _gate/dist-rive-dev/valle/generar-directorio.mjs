#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HTML_PATH = path.join(ROOT, 'directorio/index.html');
const INDEX_PATH = path.join(ROOT, '_gate/directorio-gate-index.json');
const REPORT_PATH = path.join(ROOT, '_gate/INFORME-DIRECTORIO-GATE.md');

const freshnessHours = 24;
const now = new Date();

const fmtLocal = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function localStamp(date) {
  const parts = Object.fromEntries(fmtLocal.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseIndex() {
  const raw = readFileSync(INDEX_PATH, 'utf8');
  const data = JSON.parse(raw);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const byHref = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !entry.href) continue;
    byHref.set(entry.href, entry);
  }
  return { ...data, entries, byHref };
}

function isFreshWindow(entry) {
  if (!entry) return false;
  const capturedAt = Date.parse(entry.capturedAt || '');
  if (!Number.isFinite(capturedAt)) return false;
  return now.getTime() - capturedAt <= freshnessHours * 60 * 60 * 1000;
}

function relevantErrors(entry) {
  return Number(entry.consoleRelevantes ?? entry.consoleMessages ?? 0);
}

// El censo 2026-08-08 probó que pageErrors/requestFailures no bastan: los 404 se
// cuelan por consoleRelevantes. Verde = headed, fresco, TODOS los contadores en
// cero (page + consoleRelevantes + request) y gateable como mundo3d.
function isFreshEvidence(entry) {
  if (!entry) return false;
  if (entry.mode && entry.mode !== 'headed') return false;
  if (Number(entry.pageErrors) !== 0) return false;
  if (Number(entry.requestFailures) !== 0) return false;
  if (relevantErrors(entry) !== 0) return false;
  if (entry.mundo3d === false) return false;
  return isFreshWindow(entry);
}

function formatEvidence(entry) {
  return localStamp(new Date(Date.parse(entry.capturedAt)));
}

const index = parseIndex();
const html = readFileSync(HTML_PATH, 'utf8');
const totalEntries = (html.match(/<a class="fila" href="/g) || []).length;
const gamesCount = html.match(/<h2>Juegos <span class="cuenta">· (\d+) de (\d+) abren<\/span>/)?.slice(1).map(Number) || [];
const worldsCount = html.match(/<h2>Mundos <span class="cuenta">· (\d+) de (\d+) abren<\/span>/)?.slice(1).map(Number) || [];

const anchorRe = /<a class="fila" href="([^"]+)">([\s\S]*?)<span class="marca [^"]+">([\s\S]*?)<\/span>(<\/a>)/g;
const updated = html.replace(anchorRe, (match, href, beforeMark, _existingMark, closing) => {
  const evidence = index.byHref.get(href);
  let cls = 'm-tibio';
  let label = 'responde · sin gate visual';
  if (isFreshEvidence(evidence)) {
    cls = 'm-ok';
    label = `verificado con GPU · ${formatEvidence(evidence)}`;
  } else if (isFreshWindow(evidence)) {
    // Evidencia fresca de hoy, pero algo no cuadra: no es mundo3d o arrastra errores.
    if (evidence.mundo3d === false) {
      label = 'no es mundo3d';
    } else {
      const problemas =
        Number(evidence.pageErrors) + relevantErrors(evidence) + Number(evidence.requestFailures);
      label = `gatea con errores: ${problemas}`;
    }
  }
  return `<a class="fila" href="${href}">${beforeMark}<span class="marca ${cls}">${label}</span>${closing}`;
});

const stamped = updated.replace(
  /(<div class="sub">Todo lo que existe, con lo ultimo arriba\. Se actualiza solo · )[^<]+(<\/div>)/,
  `$1${localStamp(now)}$2`
);

writeFileSync(HTML_PATH, stamped);

const verified = index.entries.filter(isFreshEvidence);
const lines = [
  '# Informe Directorio Gate',
  '',
  `- Generado: ${localStamp(now)} (America/Bogota)`,
  `- Total de entradas en el directorio actual: ${totalEntries}`,
  `- Entradas verificadas con GPU y evidencia fresca: ${verified.length}`,
  ...(gamesCount.length === 2 ? [`- Juegos: ${gamesCount[0]} de ${gamesCount[1]} abren`] : []),
  ...(worldsCount.length === 2 ? [`- Mundos: ${worldsCount[0]} de ${worldsCount[1]} abren`] : []),
  '',
  '## Evidencia usada',
  ...verified.map((entry) => [
    `- ${entry.href}`,
    `  - URL: ${entry.url}`,
    `  - Captura: ${entry.capture}`,
    `  - Fecha de evidencia: ${formatEvidence(entry)}`,
    `  - Page errors: ${Number(entry.pageErrors)}`,
    `  - Request failures: ${Number(entry.requestFailures)}`,
    `  - Console relevantes: ${Number(entry.consoleRelevantes ?? entry.consoleMessages ?? 0)}`,
    ...(Array.isArray(entry.legacyCaptures) && entry.legacyCaptures.length > 0
      ? [`  - Capturas legacy relacionadas: ${entry.legacyCaptures.join(', ')}`]
      : []),
  ].join('\n')),
  '',
  '## Regla aplicada',
  `- Solo se marcó "verificado con GPU" cuando la captura era headed, con menos de ${freshnessHours} h de antigüedad y TODOS los contadores en cero (page errors, consoleRelevantes, request failures).`,
  '- Quien gatea pero arrastra errores queda en "gatea con errores: N". Lo que no es mundo3d queda en "no es mundo3d".',
  '- El resto de entradas se quedó en "responde · sin gate visual".',
];

writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);

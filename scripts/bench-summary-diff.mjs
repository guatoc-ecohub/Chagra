#!/usr/bin/env node
/**
 * bench-summary-diff.mjs — Compara dos summary.md de bench-runs y emite gate
 * GREEN/YELLOW/RED automático (BENCH-1, issue #260).
 *
 * Lee summary.md emitidos por `bench-vision-pipeline.mjs`,
 * `bench-vision-ab-rag.mjs`, `bench-foliage-ab-rag.mjs` y
 * `bench-agente-completo.mjs`. Parsea tablas markdown, extrae métricas
 * comunes (parse rate, accuracy, hallucination rate, latency p50/p95) y
 * calcula deltas baseline → current.
 *
 * Reglas del gate (ver Chagra-strategy/ops/BENCH_GATE_PIPELINE.md §2):
 *   - RED:    parse_rate cae > 2pp, OR accuracy cae > 5pp,
 *             OR halluc sube > 3pp, OR latency p95 SUBE (cualquier monto).
 *   - YELLOW: cualquier delta negativa menor (1-2pp accuracy down,
 *             1-3% latency up sobre p50, o halluc sube 1-3pp).
 *   - GREEN:  todos los deltas neutros o positivos.
 *   - NO-DATA: si no se puede parsear alguna de las dos fuentes o no hay
 *              métricas comunes entre ambas.
 *
 * Exit codes: GREEN=0, YELLOW=1, RED=2, NO-DATA=3.
 *
 * Uso:
 *   node scripts/bench-summary-diff.mjs \
 *     --baseline=data/bench-runs/vision-pipeline-2026-05-27T07-20-58/summary.md \
 *     --current=data/bench-runs/vision-ab-rag-2026-05-27T15-32-26/summary.md
 *
 * Sin dependencias externas — solo Node stdlib (fs/promises + node:path).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { argv, exit, stdout, stderr } from 'node:process';

// --- Constantes del gate ------------------------------------------------

const GATE = {
  GREEN: { name: 'GREEN', exit: 0 },
  YELLOW: { name: 'YELLOW', exit: 1 },
  RED: { name: 'RED', exit: 2 },
  NO_DATA: { name: 'NO-DATA', exit: 3 },
};

// Umbrales (en puntos porcentuales para tasas, en porcentaje para latencias).
const THRESH = {
  PARSE_RATE_RED_PP: 2, // baja > 2pp → RED
  ACCURACY_RED_PP: 5, // baja > 5pp → RED
  ACCURACY_YELLOW_PP: 1, // baja 1-5pp → YELLOW
  HALLUC_RED_PP: 3, // sube > 3pp → RED
  HALLUC_YELLOW_PP: 1, // sube 1-3pp → YELLOW
  LATENCY_P50_YELLOW_PCT: 3, // sube 1-3% → YELLOW (sobre 0% se considera neutro)
};

// --- CLI args -----------------------------------------------------------

function parseArgs(args) {
  const out = { baseline: null, current: null };
  for (const a of args) {
    if (a.startsWith('--baseline=')) out.baseline = a.slice('--baseline='.length);
    else if (a.startsWith('--current=')) out.current = a.slice('--current='.length);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  stdout.write(
    'Uso: node scripts/bench-summary-diff.mjs --baseline=<path> --current=<path>\n' +
      '\n' +
      'Compara dos summary.md y emite tabla de deltas + gate GREEN/YELLOW/RED.\n' +
      '\n' +
      'Exit codes: GREEN=0, YELLOW=1, RED=2, NO-DATA=3.\n'
  );
}

// --- Parsing de tablas markdown ----------------------------------------

/**
 * Parsea TODAS las tablas markdown en un texto. Devuelve array de tablas con
 * headers + filas. Cada fila es un objeto { [header]: cellValue }.
 *
 * Una tabla markdown se reconoce por una línea de header con `|` + una línea
 * separadora (`|---|---|...`).
 */
function parseMarkdownTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const headerLine = lines[i];
    const sepLine = lines[i + 1] || '';
    if (
      headerLine.includes('|') &&
      /^[\s|:-]+$/.test(sepLine) &&
      sepLine.includes('-')
    ) {
      const headers = splitCells(headerLine);
      if (headers.length === 0) {
        i += 1;
        continue;
      }
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
        const cells = splitCells(lines[j]);
        if (cells.length === 0) break;
        const row = {};
        for (let k = 0; k < headers.length; k += 1) {
          row[headers[k]] = cells[k] !== undefined ? cells[k] : '';
        }
        rows.push(row);
        j += 1;
      }
      tables.push({ headers, rows });
      i = j;
    } else {
      i += 1;
    }
  }
  return tables;
}

function splitCells(line) {
  // Quita pipes leading/trailing y trim a cada celda. Quita markdown bold ** y backticks.
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed
    .split('|')
    .map((c) => c.trim().replace(/\*\*/g, '').replace(/`/g, ''));
}

// --- Extracción de métricas --------------------------------------------

/**
 * Patrones de match para identificar métricas comunes a partir del label
 * de una fila de tabla. Cada patrón devuelve la clave canónica usada para
 * el delta.
 */
const METRIC_PATTERNS = [
  { key: 'parse_rate', regex: /parse\s*rate/i, isLatency: false, higherIsBetter: true, unit: 'pp' },
  {
    key: 'common_name_accuracy',
    regex: /(nombre\s*com[uú]n|common\s*name).*?(correcto|accuracy)/i,
    isLatency: false,
    higherIsBetter: true,
    unit: 'pp',
  },
  {
    key: 'sci_name_accuracy',
    regex: /(nombre\s*cient[ií]fico|sci(?:entific)?\s*name).*?(correcto|accuracy|binomial)/i,
    isLatency: false,
    higherIsBetter: true,
    unit: 'pp',
  },
  {
    key: 'verified_rate',
    regex: /(verified|grounded:\s*verified|verified\s*rate)/i,
    isLatency: false,
    higherIsBetter: true,
    unit: 'pp',
  },
  {
    key: 'hallucination_rate',
    regex: /(hallucination|halluc)/i,
    isLatency: false,
    higherIsBetter: false,
    unit: 'pp',
  },
  {
    key: 'rejected_rate',
    regex: /(rejected|anti-halluc.*rate)/i,
    isLatency: false,
    higherIsBetter: null, // ambivalente (más rejected = más anti-halluc, no es necesariamente bueno)
    unit: 'pp',
  },
  {
    key: 'keywords_match',
    regex: /keywords/i,
    isLatency: false,
    higherIsBetter: true,
    unit: 'pp',
  },
  {
    key: 'latency_p50',
    regex: /(latenc[iy].*p50|p50.*latenc[iy]|latency\s*p50)/i,
    isLatency: true,
    higherIsBetter: false,
    unit: 'ms',
  },
  {
    key: 'latency_p95',
    regex: /(latenc[iy].*p95|p95.*latenc[iy]|latency\s*p95)/i,
    isLatency: true,
    higherIsBetter: false,
    unit: 'ms',
  },
];

// Filas con label que combinan "p50 / p95" en una sola celda.
const LATENCY_COMBO_REGEX = /latenc[iy].*p50.*\/\s*p95/i;

/**
 * Parsea un valor de celda y devuelve un número:
 *   - porcentaje "12.5%" → 12.5 (en pp)
 *   - "12.5% (2/16)" → 12.5
 *   - milisegundos "13329ms" → 13329
 *   - "13329ms / 29057ms" → { p50: 13329, p95: 29057 } (caso especial)
 *   - "—" o "n/a" → null
 *   - número plano "75.0" → 75
 */
function parseCellValue(cell) {
  if (!cell || cell === '—' || cell === '-' || /^n\/?a$/i.test(cell)) return null;
  const cleaned = cell.replace(/,/g, '');

  // Combo p50/p95: "13329ms / 29057ms"
  const comboMatch = cleaned.match(/(-?\d+(?:\.\d+)?)\s*ms\s*\/\s*(-?\d+(?:\.\d+)?)\s*ms/i);
  if (comboMatch) {
    return { p50: parseFloat(comboMatch[1]), p95: parseFloat(comboMatch[2]) };
  }

  // ms simple: "13329ms"
  const msMatch = cleaned.match(/(-?\d+(?:\.\d+)?)\s*ms/i);
  if (msMatch) return parseFloat(msMatch[1]);

  // porcentaje: "12.5%" (toma el primer % encontrado)
  const pctMatch = cleaned.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) return parseFloat(pctMatch[1]);

  // número plano: "75.0" o "13329"
  const numMatch = cleaned.match(/^-?\d+(?:\.\d+)?/);
  if (numMatch) return parseFloat(numMatch[0]);

  return null;
}

/**
 * Extrae métricas de un summary parseado. Devuelve un Map<metricKey, number>.
 *
 * Estrategia:
 *   - Recorre todas las tablas. En cada fila, busca la columna "label" (la
 *     primera) y la columna de "valor" (las siguientes).
 *   - Si la tabla tiene múltiples columnas de valores (A/B comparison), toma
 *     SIEMPRE la PRIMERA columna numérica (asunción razonable: variant A o
 *     "Current" suele ir primero). En tablas de un solo valor (vision-pipeline),
 *     hay una sola columna.
 *
 * Caso especial:
 *   - Si una fila label matchea "latency p50 / p95" y la celda contiene formato
 *     combo, expandimos a dos métricas latency_p50 y latency_p95.
 */
function extractMetrics(text) {
  const metrics = new Map(); // key → { value, label, unit, higherIsBetter, raw }
  const tables = parseMarkdownTables(text);

  for (const table of tables) {
    if (table.headers.length < 2) continue;
    const labelHeader = table.headers[0];

    for (const row of table.rows) {
      const label = row[labelHeader] || '';
      if (!label) continue;

      // Recolecta valores de cada columna no-label, en orden, y elige el
      // primero parseable.
      let primaryValue = null;
      let primaryRaw = '';
      for (let k = 1; k < table.headers.length; k += 1) {
        const h = table.headers[k];
        const cell = row[h] !== undefined ? row[h] : '';
        const v = parseCellValue(cell);
        if (v !== null) {
          primaryValue = v;
          primaryRaw = cell;
          break;
        }
      }
      if (primaryValue === null) continue;

      // Caso combo "p50 / p95" en una sola celda.
      if (LATENCY_COMBO_REGEX.test(label) && primaryValue && typeof primaryValue === 'object') {
        if (!metrics.has('latency_p50')) {
          metrics.set('latency_p50', {
            value: primaryValue.p50,
            label: 'Latency p50',
            unit: 'ms',
            higherIsBetter: false,
            raw: primaryRaw,
          });
        }
        if (!metrics.has('latency_p95')) {
          metrics.set('latency_p95', {
            value: primaryValue.p95,
            label: 'Latency p95',
            unit: 'ms',
            higherIsBetter: false,
            raw: primaryRaw,
          });
        }
        continue;
      }

      // Match contra patrones conocidos. First-match wins (no sobrescribe).
      for (const pat of METRIC_PATTERNS) {
        if (pat.regex.test(label) && !metrics.has(pat.key)) {
          if (typeof primaryValue === 'object') continue; // combo no aplica acá
          metrics.set(pat.key, {
            value: primaryValue,
            label: pat.key
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
            unit: pat.unit,
            higherIsBetter: pat.higherIsBetter,
            raw: primaryRaw,
          });
          break;
        }
      }
    }
  }

  return metrics;
}

// --- Cómputo del gate --------------------------------------------------

/**
 * Compara dos sets de métricas y devuelve:
 *   - rows: array de filas para la tabla de output
 *   - gate: { name, exit, reasons[] }
 */
function computeGate(baseline, current) {
  // Métricas comunes (clave presente en ambos).
  const commonKeys = [...baseline.keys()].filter((k) => current.has(k));
  if (commonKeys.length === 0) {
    return {
      rows: [],
      gate: {
        name: GATE.NO_DATA.name,
        exit: GATE.NO_DATA.exit,
        reasons: ['no hay métricas comunes parseables entre baseline y current'],
      },
    };
  }

  const rows = [];
  const redReasons = [];
  const yellowReasons = [];

  for (const key of commonKeys) {
    const b = baseline.get(key);
    const c = current.get(key);
    const delta = c.value - b.value;

    let status = 'neutral';
    let isRed = false;
    let isYellow = false;

    // Reglas por tipo de métrica.
    if (key === 'parse_rate') {
      if (delta < -THRESH.PARSE_RATE_RED_PP) {
        isRed = true;
        redReasons.push(`parse_rate cae ${delta.toFixed(2)}pp (> ${THRESH.PARSE_RATE_RED_PP}pp)`);
      } else if (delta < 0) {
        isYellow = true;
        yellowReasons.push(`parse_rate cae ${delta.toFixed(2)}pp`);
      }
    } else if (
      key === 'common_name_accuracy' ||
      key === 'sci_name_accuracy' ||
      key === 'verified_rate' ||
      key === 'keywords_match'
    ) {
      if (delta < -THRESH.ACCURACY_RED_PP) {
        isRed = true;
        redReasons.push(`${key} cae ${delta.toFixed(2)}pp (> ${THRESH.ACCURACY_RED_PP}pp)`);
      } else if (delta < -THRESH.ACCURACY_YELLOW_PP) {
        isYellow = true;
        yellowReasons.push(`${key} cae ${delta.toFixed(2)}pp`);
      } else if (delta < 0) {
        isYellow = true;
        yellowReasons.push(`${key} cae ${delta.toFixed(2)}pp (< ${THRESH.ACCURACY_YELLOW_PP}pp)`);
      }
    } else if (key === 'hallucination_rate') {
      if (delta > THRESH.HALLUC_RED_PP) {
        isRed = true;
        redReasons.push(`hallucination_rate sube ${delta.toFixed(2)}pp (> ${THRESH.HALLUC_RED_PP}pp)`);
      } else if (delta > THRESH.HALLUC_YELLOW_PP) {
        isYellow = true;
        yellowReasons.push(`hallucination_rate sube ${delta.toFixed(2)}pp`);
      } else if (delta > 0) {
        isYellow = true;
        yellowReasons.push(`hallucination_rate sube ${delta.toFixed(2)}pp (< ${THRESH.HALLUC_YELLOW_PP}pp)`);
      }
    } else if (key === 'latency_p95') {
      // Regla dura del SOP: "latency p95 SUBE" → RED, sin tolerancia.
      if (delta > 0) {
        isRed = true;
        redReasons.push(`latency_p95 sube ${delta.toFixed(0)}ms`);
      }
    } else if (key === 'latency_p50') {
      // YELLOW si sube. RED no aplica (no es regla dura del SOP).
      if (b.value > 0) {
        const pct = (delta / b.value) * 100;
        if (pct > THRESH.LATENCY_P50_YELLOW_PCT) {
          isYellow = true;
          yellowReasons.push(`latency_p50 sube ${pct.toFixed(1)}%`);
        } else if (delta > 0) {
          isYellow = true;
          yellowReasons.push(`latency_p50 sube ${delta.toFixed(0)}ms (${pct.toFixed(1)}%)`);
        }
      } else if (delta > 0) {
        isYellow = true;
        yellowReasons.push(`latency_p50 sube ${delta.toFixed(0)}ms`);
      }
    }
    // rejected_rate: ambivalente, no afecta gate (solo se reporta).

    if (isRed) status = 'RED';
    else if (isYellow) status = 'YELLOW';
    else status = 'OK';

    rows.push({
      metric: key,
      baseline: b.value,
      current: c.value,
      delta,
      unit: b.unit,
      status,
    });
  }

  let gate;
  if (redReasons.length > 0) {
    gate = { name: GATE.RED.name, exit: GATE.RED.exit, reasons: redReasons };
  } else if (yellowReasons.length > 0) {
    gate = { name: GATE.YELLOW.name, exit: GATE.YELLOW.exit, reasons: yellowReasons };
  } else {
    gate = { name: GATE.GREEN.name, exit: GATE.GREEN.exit, reasons: ['todos los deltas neutros o positivos'] };
  }

  return { rows, gate };
}

// --- Formato de output -------------------------------------------------

function formatValue(v, unit) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (unit === 'ms') return `${v.toFixed(0)}ms`;
  if (unit === 'pp') return `${v.toFixed(1)}%`;
  return String(v);
}

function formatDelta(delta, unit) {
  if (delta === null || Number.isNaN(delta)) return '—';
  const sign = delta > 0 ? '+' : '';
  if (unit === 'ms') return `${sign}${delta.toFixed(0)}ms`;
  if (unit === 'pp') return `${sign}${delta.toFixed(1)}pp`;
  return `${sign}${delta}`;
}

function renderReport({ baselinePath, currentPath, rows, gate }) {
  const lines = [];
  lines.push('# Bench Summary Diff');
  lines.push('');
  lines.push(`- **Baseline**: \`${baselinePath}\``);
  lines.push(`- **Current**: \`${currentPath}\``);
  lines.push('');
  if (rows.length === 0) {
    lines.push('_No hay métricas comunes parseables._');
    lines.push('');
  } else {
    lines.push('| Metric | Baseline | Current | Delta | Status |');
    lines.push('|---|---:|---:|---:|:---:|');
    for (const r of rows) {
      lines.push(
        `| ${r.metric} | ${formatValue(r.baseline, r.unit)} | ${formatValue(r.current, r.unit)} | ${formatDelta(r.delta, r.unit)} | ${r.status} |`
      );
    }
    lines.push('');
  }
  const reasonStr = gate.reasons.join('; ');
  lines.push(`**GATE: ${gate.name}** — ${reasonStr}`);
  lines.push('');
  return lines.join('\n');
}

// --- Main --------------------------------------------------------------

async function main() {
  const args = parseArgs(argv.slice(2));
  if (args.help) {
    printHelp();
    exit(0);
  }
  if (!args.baseline || !args.current) {
    stderr.write('Error: faltan --baseline=<path> y/o --current=<path>\n');
    printHelp();
    exit(GATE.NO_DATA.exit);
  }

  const baselinePath = resolve(args.baseline);
  const currentPath = resolve(args.current);

  let baselineText = '';
  let currentText = '';
  try {
    baselineText = await readFile(baselinePath, 'utf8');
  } catch (err) {
    stderr.write(`Error leyendo baseline ${baselinePath}: ${err.message}\n`);
    stdout.write(
      renderReport({
        baselinePath,
        currentPath,
        rows: [],
        gate: {
          name: GATE.NO_DATA.name,
          exit: GATE.NO_DATA.exit,
          reasons: [`no se pudo leer baseline: ${err.message}`],
        },
      })
    );
    exit(GATE.NO_DATA.exit);
  }
  try {
    currentText = await readFile(currentPath, 'utf8');
  } catch (err) {
    stderr.write(`Error leyendo current ${currentPath}: ${err.message}\n`);
    stdout.write(
      renderReport({
        baselinePath,
        currentPath,
        rows: [],
        gate: {
          name: GATE.NO_DATA.name,
          exit: GATE.NO_DATA.exit,
          reasons: [`no se pudo leer current: ${err.message}`],
        },
      })
    );
    exit(GATE.NO_DATA.exit);
  }

  const baselineMetrics = extractMetrics(baselineText);
  const currentMetrics = extractMetrics(currentText);

  if (baselineMetrics.size === 0 || currentMetrics.size === 0) {
    const report = renderReport({
      baselinePath,
      currentPath,
      rows: [],
      gate: {
        name: GATE.NO_DATA.name,
        exit: GATE.NO_DATA.exit,
        reasons: [
          baselineMetrics.size === 0 ? 'no se parsearon métricas de baseline' : 'no se parsearon métricas de current',
        ],
      },
    });
    stdout.write(report);
    exit(GATE.NO_DATA.exit);
  }

  const { rows, gate } = computeGate(baselineMetrics, currentMetrics);
  const report = renderReport({ baselinePath, currentPath, rows, gate });
  stdout.write(report);
  exit(gate.exit);
}

// Export para test unitario eventual.
export {
  parseMarkdownTables,
  parseCellValue,
  extractMetrics,
  computeGate,
  renderReport,
  GATE,
  THRESH,
};

// Run only if invoked directly (no en import).
const invokedDirectly = (() => {
  try {
    const entry = argv[1] ? resolve(argv[1]) : '';
    const self = new URL(import.meta.url).pathname;
    return entry === self;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((err) => {
    stderr.write(`Error fatal: ${err.message}\n${err.stack}\n`);
    exit(GATE.NO_DATA.exit);
  });
}

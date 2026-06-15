/**
 * bench/lib/render-index.mjs - regenera bench/INDEX.md desde index.json + historial.
 *
 * El INDEX.md es DERIVADO: la fuente de verdad es bench/index.json. Esto evita
 * que el indice humano y el de maquina se desincronicen (un test verifica que
 * INDEX.md este regenerado). Aca vive solo la logica de RENDER (string), pura y
 * testeable: recibe index + records y devuelve markdown.
 *
 * @module bench/lib/render-index
 */
import { computeTrend, groupByBenchModel, latestRunFor, trendArrow } from './history.mjs';

/** Etiqueta legible por tipo de entrada. */
const TYPE_LABEL = {
  'bench-llm': 'Bench LLM',
  'bench-latencia': 'Bench latencia',
  'bench-vision': 'Bench vision',
  meta: 'Meta',
  'test-suite': 'Suite de test',
};

/**
 * clip - recorta texto a n chars en limite de palabra, con marcador. PURO.
 */
function clip(str, n) {
  const t = String(str || '').replace(/\|/g, '/').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '...';
}

/**
 * fmtCmd - comando ejecutable legible para una entrada (placeholders resueltos
 * a la forma `node bench/run.mjs <id>`, que es como el operador la corre).
 */
function fmtCmd(entry) {
  if (entry.type === 'test-suite' && Array.isArray(entry.cmd)) {
    return '`node bench/run.mjs ' + entry.id + '`  (o directo: `' + entry.cmd.join(' ') + '`)';
  }
  if (entry.manualCmd) return '`' + entry.manualCmd + '`';
  if (Array.isArray(entry.cmd)) return '`node bench/run.mjs ' + entry.id + '`';
  return '_(no ejecutable directo)_';
}

/**
 * latestRunCell - texto de la columna "ultima corrida" para un bench.
 */
function latestRunCell(records, benchId) {
  const r = latestRunFor(records, benchId);
  if (!r) return 'sin corridas';
  const d = String(r.date).slice(0, 10);
  const seed = r.seed ? ' (semilla)' : '';
  const pass = r.passPct != null ? `, pass ${r.passPct}%` : '';
  return `${d}${seed}${pass}`;
}

/**
 * trendCell - texto de tendencia resumida (la metrica primaria del bench).
 */
function trendCell(records, entry) {
  const grouped = groupByBenchModel(records.filter((r) => r.bench === entry.id));
  if (grouped.size === 0) return '-';
  const primary = (entry.metrics && entry.metrics[0]) || null;
  const parts = [];
  for (const [key, runs] of grouped.entries()) {
    if (runs.length < 2) continue;
    const model = key.split('::')[1];
    const t = computeTrend(runs);
    if (primary && t.metrics[primary]) {
      const m = t.metrics[primary];
      parts.push(`${model}: ${primary} ${m.previous}->${m.current} ${trendArrow(m.verdict)}`);
    }
  }
  if (parts.length === 0) return 'n<2 (sin tendencia)';
  return parts.join('; ');
}

/**
 * renderIndexMarkdown - construye el INDEX.md completo. PURO.
 *
 * @param {object} index    salida de loadIndex.
 * @param {object[]} records historial (puede ser []).
 * @param {object} [opts]
 * @param {string} [opts.date]  fecha de generacion ISO.
 * @returns {string} markdown.
 */
export function renderIndexMarkdown(index, records = [], opts = {}) {
  const date = (opts.date || new Date().toISOString()).slice(0, 10);
  const withHistory = opts.withHistory === true;
  const benches = index.entries.filter((e) => e.type !== 'test-suite');
  const suites = index.entries.filter((e) => e.type === 'test-suite');

  const lines = [];
  lines.push('# INDEX de Benches y Tests - Chagra');
  lines.push('');
  lines.push('> ARCHIVO GENERADO. Fuente de verdad: `bench/index.json`. Regenerar con');
  lines.push('> `node bench/run.mjs --regen-index`. No editar a mano (un test verifica');
  lines.push('> que este sincronizado).');
  lines.push('');
  lines.push(`Generado: ${date}. Entradas: ${index.entries.length} ` +
    `(${benches.length} benches/meta + ${suites.length} suites de test).`);
  lines.push('');
  lines.push('## Como se usa');
  lines.push('');
  lines.push('```bash');
  lines.push('node bench/run.mjs --list            # lista todo (benches + suites) con infra y ultima corrida');
  lines.push('node bench/run.mjs --history         # tendencia (mejora/empeora) por bench y modelo');
  lines.push('node bench/run.mjs <id>              # corre UN bench/suite por id (o sufijo unico)');
  lines.push('node bench/run.mjs --all             # corre TODO lo ejecutable que tenga su infra');
  lines.push('node bench/run.mjs --all --dry-run   # muestra que correria, sin ejecutar');
  lines.push('node bench/run.mjs --regen-index     # regenera este INDEX.md desde index.json');
  lines.push('```');
  lines.push('');
  lines.push('Infra: `gpu` (Quadro M6000 sm_52), `ollama` (:11434), `sidecar` (:7880),');
  lines.push('`claude-cli` (suscripcion del operador), `anthropic-key`, `fixtures-privadas`');
  lines.push('(viven en el repo privado Chagra-strategy), `corpus` (public/cycle-content),');
  lines.push('`ninguna` (deterministas, corren en CI).');
  lines.push('');

  // ── Benches por cluster ──
  lines.push('## Benches');
  lines.push('');
  lines.push('_Ultima corrida y tendencia (datos vivos): `node bench/run.mjs --list` y `--history`._');
  lines.push('');
  const byCluster = new Map();
  for (const b of benches) {
    if (!byCluster.has(b.cluster)) byCluster.set(b.cluster, []);
    byCluster.get(b.cluster).push(b);
  }
  for (const [cluster, items] of byCluster.entries()) {
    const desc = (index.clusters && index.clusters[cluster]) || '';
    lines.push(`### Cluster: ${cluster}`);
    if (desc) lines.push(`_${desc}_`);
    lines.push('');
    if (withHistory) {
      lines.push('| id | que hace | tipo | infra | ejecutar | ultima corrida | tendencia |');
      lines.push('|---|---|---|---|---|---|---|');
    } else {
      lines.push('| id | que hace | tipo | infra | ejecutar |');
      lines.push('|---|---|---|---|---|');
    }
    for (const e of items) {
      const what = clip(e.what || e.title, 240);
      const infra = (e.infra || []).join(', ');
      const proto = e.protected ? ' **[NO ROMPER]**' : '';
      const head = `| \`${e.id}\`${proto} | ${what} | ${TYPE_LABEL[e.type] || e.type} | ${infra} | ${fmtCmd(e)} |`;
      lines.push(withHistory ? `${head} ${latestRunCell(records, e.id)} | ${trendCell(records, e)} |` : head);
    }
    lines.push('');
  }

  // ── Suites de test ──
  lines.push('## Suites de test');
  lines.push('');
  lines.push('| id | que cubre | infra | ejecutar | CI |');
  lines.push('|---|---|---|---|---|');
  for (const e of suites) {
    const what = clip(e.what || e.title, 240);
    const infra = (e.infra || []).join(', ');
    const ci = e.ci ? `\`${e.ci}\`` : '-';
    lines.push(`| \`${e.id}\` | ${what} | ${infra} | ${fmtCmd(e)} | ${ci} |`);
  }
  lines.push('');

  // ── Historial / esquema ──
  lines.push('## Historial');
  lines.push('');
  lines.push('Cada corrida estandarizada escribe un JSON con esquema fijo (v1) en');
  lines.push('`bench/history/`. Campos: `schema, bench, date (ISO), model, config, commit,');
  lines.push('metrics{}, passCount, failCount, passPct, notes, seed`. La direccion de');
  lines.push('cada metrica (mas alto/mas bajo = mejor) vive en `METRIC_DIRECTION`');
  lines.push('(`bench/lib/history.mjs`), y de ahi sale el veredicto mejora/empeora.');
  lines.push('');
  lines.push('Consultar tendencia:');
  lines.push('');
  lines.push('```bash');
  lines.push('node bench/run.mjs --history                 # todas las series bench::modelo');
  lines.push('node bench/run.mjs --history borde-alucinacion  # filtra por bench');
  lines.push('```');
  lines.push('');
  lines.push('Emitir un registro desde un bench:');
  lines.push('');
  lines.push('```js');
  lines.push("import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';");
  lines.push('writeHistoryRecord(buildHistoryRecord({');
  lines.push("  bench: 'borde-alucinacion', model: 'granite3.3:8b', config: 'PROD',");
  lines.push('  metrics: { ah_pct: 16.0, pass_pct: 84.0 }, passCount: 21, failCount: 4,');
  lines.push('}));');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('_Reingenieria de benches 2026-06-15: framework componible (lib compartida +');
  lines.push('benches delgados), salida estandarizada e indice unico. Ver `bench/README.md`._');
  lines.push('');
  return lines.join('\n');
}

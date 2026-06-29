#!/usr/bin/env node
/**
 * bench-dashboard.mjs — Dashboard de TENDENCIA de benches anti-alucinación con
 * GRÁFICOS reales (SVG dibujado a mano, sin dependencias externas).
 *
 * Lee datos YA generados por los benches (NO corre ollama, NO toca el bench en
 * curso). Produce un HTML autocontenido (SVG inline, sin CDN) + un SVG por
 * gráfico. Para PNG (Telegram): rasterizar con rsvg-convert
 *   nix-shell -p librsvg --run 'rsvg-convert -o g1.png out/grafico1.svg'
 * (memoria del proyecto: usar rsvg, NO chromium para SVG→PNG).
 *
 * ── DISCIPLINA DE ETIQUETAS (anti-error de research) ──────────────────────────
 * El campo "ah_pct" de los summary.json está MAL NOMBRADO: en la práctica es el
 * PASS-RATE (% de aciertos), NO la tasa de alucinación. Este script NUNCA copia
 * "ah_pct" como alucinación. Deriva SIEMPRE de pass/fail/total:
 *   PASS%  = pass / total * 100              (mayor = mejor)
 *   AH%    = (total - pass) / total * 100    (alucinación/fallo; menor = mejor)
 * y etiqueta ambos en claro. No mezcla juez determinístico con juez LLM en la
 * misma serie sin marcarlo.
 *
 * Gráficos:
 *   1. A/B modelos (barras): PASS% complejo (con tools) vs PASS% borde (sin
 *      tools) lado a lado por modelo, ordenado por mejor anti-alucinación
 *      (mayor PASS% complejo). Etiqueta latencia p95.
 *   2. Tendencia temporal (líneas): PASS% de los benches históricos en el
 *      tiempo, separando serie borde vs complejo (+ juez en la leyenda).
 *   3. Latencia por modelo (barras): lat_avg vs lat_p95 del A/B.
 *
 * Fuentes (todas overridables por env, sin hardcodear hosts/IPs):
 *   BENCH_RUNS_DIR   default: <repo>/data/bench-runs   (summary.json históricos)
 *   AB_TSV           default: /tmp/ab-modelos-resumen.txt   (TSV A/B en curso)
 *   AB_BENCH_DIR     default: /tmp/ab-modelos-bench-runs    (summary.json A/B)
 *   OUT_DIR          default: <repo>/out
 *
 * Uso: node scripts/bench-dashboard.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

const BENCH_RUNS_DIR = process.env.BENCH_RUNS_DIR || path.join(REPO, 'data', 'bench-runs');
const AB_TSV = process.env.AB_TSV || '/tmp/ab-modelos-resumen.txt';
const AB_BENCH_DIR = process.env.AB_BENCH_DIR || '/tmp/ab-modelos-bench-runs';
const OUT_DIR = process.env.OUT_DIR || path.join(REPO, 'out');

// ── helpers ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round1 = (n) => Math.round(n * 10) / 10;
const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; } };

// Paleta (no AI-generic: tonos tierra/agro + acentos legibles).
const COL = {
  bg: '#0f1410', panel: '#18201a', ink: '#e8efe4', muted: '#9fb09a',
  grid: '#2a352b', axis: '#5a6b58',
  complex: '#6ee7a8',   // PASS% con tools (verde brote)
  borde: '#f2b84b',     // PASS% sin tools (amarillo cosecha)
  latAvg: '#7cb3ff',    // latencia promedio
  latP95: '#c98bff',    // latencia p95
  bad: '#ff7a6b',
  intel4096: '#7dd3fc',   // azul cielo — num_ctx=4096
  intel8192: '#f9a8d4',   // rosa — num_ctx=8192
  intelGranite: '#6ee7a8',  // línea granite3.3 en time series
  intelDense: '#fbbf24',    // línea granite3.1-dense en time series
};

// ── 1. Cargar históricos (data/bench-runs/*.summary.json) ─────────────────────
// Normaliza cada summary a una fila de tendencia: {date, kind, model, judge,
// pass, total, passPct, ahPct, source}.
function loadHistoricos() {
  const rows = [];
  if (!fs.existsSync(BENCH_RUNS_DIR)) return { rows, files: [] };
  const files = fs.readdirSync(BENCH_RUNS_DIR).filter((f) => f.endsWith('.summary.json'));
  for (const f of files) {
    const s = readJSON(path.join(BENCH_RUNS_DIR, f));
    if (!s) continue;
    const date = (s.generated_at || '').slice(0, 10) || f.slice(0, 10);
    const model = s.generator?.model || s.mode || 'n/d';
    const judge = s.judge ? (s.judge.model || s.judge.provider || 'n/d') : 'n/d';

    // Clasifica el tipo de bench por nombre de archivo / fixture.
    let kind = 'otro';
    const fx = (s.fixture || s.pool || f).toLowerCase();
    if (/borde/.test(f) || /borde/.test(fx)) kind = 'borde';
    else if (/complej/.test(f) || /complej/.test(fx)) kind = 'complejo';
    else if (/capabilit/.test(f)) kind = 'capabilities';
    else if (/agent-loop/.test(f)) kind = 'agent-loop';

    // Deriva pass/total de forma consistente (NO copiar ah_pct ciegamente).
    if (s.overall && (s.overall.A || s.overall.C)) {
      // capabilities A-vs-C: una fila por config presente.
      for (const cfg of ['A', 'C']) {
        const o = s.overall[cfg];
        if (!o) continue;
        const total = o.judged ?? o.total ?? null;
        if (total == null) continue;
        const pass = o.pass ?? 0;
        rows.push(mkRow(date, kind, `${model} [cfg ${cfg}]`, judge, pass, total, f));
      }
    } else if (typeof s.pass === 'number' && typeof s.n_prompts === 'number') {
      const total = s.judged || s.n_prompts;
      rows.push(mkRow(date, kind, model, judge, s.pass, total, f));
    } else if (kind === 'agent-loop' && typeof s.accuracy_pct === 'number') {
      // agent-loop: métrica = accuracy de auto-corrección (no AH); se marca aparte.
      rows.push({ date, kind, model: 'agent-loop', judge: s.mode || 'n/d',
        pass: s.true_positive + s.true_negative, total: s.total_tests,
        passPct: s.accuracy_pct, ahPct: round1(100 - s.accuracy_pct),
        metric: 'accuracy', source: f });
    }
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { rows, files };
}
function mkRow(date, kind, model, judge, pass, total, source) {
  const passPct = total ? round1((pass / total) * 100) : 0;
  return { date, kind, model, judge, pass, total, passPct, ahPct: round1(100 - passPct), metric: 'pass', source };
}

// ── 2. Cargar A/B en curso (TSV de /tmp + summary.json del día) ───────────────
// Columnas del TSV (ab-modelos-bench.sh):
//   model  AH_cpx  pass  fail  unj  lat_avg  lat_p95  red_total  pass_borde  ah_borde
function loadAB() {
  const out = { rows: [], present: false, abSummary: null, tsvPath: AB_TSV };
  if (fs.existsSync(AB_TSV)) {
    const lines = fs.readFileSync(AB_TSV, 'utf-8').split('\n').map((l) => l.trim()).filter(Boolean);
    for (const ln of lines) {
      const c = ln.split('\t');
      if (c.length < 10) continue;
      const [model, ahCpx, pass, fail, unj, latAvg, latP95, redTotal, passBorde, ahBorde] = c;
      const num = (x) => (x === '-' || x === '' || x == null ? null : Number(x));
      const passN = num(pass), failN = num(fail), unjN = num(unj) || 0;
      // PASS%/AH% complejo derivado de pass/fail (NO del campo AH_cpx crudo).
      const totalCpx = (passN != null && failN != null) ? passN + failN + unjN : null;
      const passPctCpx = totalCpx ? round1((passN / totalCpx) * 100) : null;
      out.rows.push({
        model,
        passPctCpx,                                   // PASS% con tools (mayor=mejor)
        ahPctCpx: passPctCpx != null ? round1(100 - passPctCpx) : null,
        pass: passN, fail: failN, unj: unjN, total: totalCpx,
        passPctBorde: num(passBorde),                 // PASS% sin tools
        ahPctBorde: num(ahBorde),                     // = 100 - pass_borde (alucinación)
        latAvg: num(latAvg), latP95: num(latP95),
        redTotal: num(redTotal),
        ahCpxRaw: num(ahCpx),                         // campo crudo del script (informativo)
      });
    }
    if (out.rows.length) out.present = true;
  }
  // Summary.json del A/B (último run del día) para metadata de juez/checkout.
  if (fs.existsSync(AB_BENCH_DIR)) {
    const sf = fs.readdirSync(AB_BENCH_DIR).filter((f) => f.endsWith('.summary.json'))
      .sort().reverse()[0];
    if (sf) out.abSummary = readJSON(path.join(AB_BENCH_DIR, sf));
  }
  return out;
}

// ── 3. Cargar datos INTEL-CONTEXT (AH% con-tools por num_ctx y modelo) ───────
// Lee los summary.json con bench_type === 'intel-context'.
function loadIntelData() {
  const out = { rowsByCtx: {}, latest: [], all: [] };
  if (!fs.existsSync(BENCH_RUNS_DIR)) return out;
  const files = fs.readdirSync(BENCH_RUNS_DIR).filter((f) => f.startsWith('intel-context') && f.endsWith('.summary.json'));
  for (const f of files) {
    const s = readJSON(path.join(BENCH_RUNS_DIR, f));
    if (!s || s.bench_type !== 'intel-context') continue;
    const date = (s.generated_at || '').slice(0, 10);
    const model = s.generator?.model || 'n/d';
    const numCtx = s.config?.num_ctx || 4096;
    const pass = s.pass ?? 0;
    const total = s.judged ?? s.n_prompts ?? 1;
    const ah = total ? round1(((total - pass) / total) * 100) : null;
    const row = { date, model, numCtx, pass, total, ah, source: f };
    out.all.push(row);
    // Grupo por (model, numCtx) para latest
    const key = `${model}__${numCtx}`;
    if (!out.rowsByCtx[key] || date > out.rowsByCtx[key].date) {
      out.rowsByCtx[key] = row;
    }
  }
  out.all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  out.latest = Object.values(out.rowsByCtx);
  return out;
}

// ── SVG primitives ────────────────────────────────────────────────────────────
function svgOpen(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="ui-sans-serif,Segoe UI,Roboto,Helvetica,Arial,sans-serif">`
    + `<rect width="${w}" height="${h}" fill="${COL.bg}"/>`;
}
const T = (x, y, txt, { size = 13, fill = COL.ink, anchor = 'start', weight = 400, rot = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${esc(txt)}</text>`;
const R = (x, y, w, h, fill, extra = '') => `<rect x="${round1(x)}" y="${round1(y)}" width="${round1(Math.max(0, w))}" height="${round1(Math.max(0, h))}" fill="${fill}" ${extra}/>`;
const L = (x1, y1, x2, y2, stroke, sw = 1, extra = '') => `<line x1="${round1(x1)}" y1="${round1(y1)}" x2="${round1(x2)}" y2="${round1(y2)}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;

// Eje Y de porcentaje 0..100 con grid.
function yAxisPct(x0, y0, plotW, plotH) {
  let s = '';
  for (let v = 0; v <= 100; v += 20) {
    const y = y0 + plotH - (v / 100) * plotH;
    s += L(x0, y, x0 + plotW, y, COL.grid, 1);
    s += T(x0 - 8, y + 4, `${v}%`, { size: 11, fill: COL.muted, anchor: 'end' });
  }
  return s;
}

// ── GRÁFICO 1: A/B modelos (barras agrupadas PASS% complejo vs borde) ─────────
function chart1(ab) {
  const W = 900, H = 520, pad = { t: 84, r: 28, b: 132, l: 56 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const x0 = pad.l, y0 = pad.t;
  let svg = svgOpen(W, H);
  svg += T(24, 32, 'Gráfico 1 — A/B modelos: PASS% (acierto) con-tools vs sin-tools', { size: 18, weight: 700 });
  svg += T(24, 54, 'Mayor = mejor anti-alucinación. Etiqueta = latencia p95 del complejo. AH% = 100 − PASS%.', { size: 12, fill: COL.muted });

  if (!ab.present || !ab.rows.length) {
    svg += T(W / 2, H / 2, 'A/B sin datos todavía (n/d) — el bench llena por modelo.', { size: 14, fill: COL.bad, anchor: 'middle' });
    return svg + '</svg>';
  }
  // Orden: mejor PASS% complejo primero (n/d al final).
  const rows = [...ab.rows].sort((a, b) => (b.passPctCpx ?? -1) - (a.passPctCpx ?? -1));
  svg += yAxisPct(x0, y0, plotW, plotH);

  const n = rows.length;
  const groupW = plotW / n;
  const barW = Math.min(36, groupW * 0.32);
  rows.forEach((r, i) => {
    const gx = x0 + i * groupW + groupW / 2;
    const drawBar = (val, color, dx, labelTop) => {
      const has = val != null && !Number.isNaN(val);
      const h = has ? (val / 100) * plotH : 0;
      const bx = gx + dx - barW / 2;
      const by = y0 + plotH - h;
      if (has) {
        let s = R(bx, by, barW, h, color, 'rx="2"');
        s += T(bx + barW / 2, by - 5, `${round1(val)}`, { size: 11, fill: COL.ink, anchor: 'middle', weight: 600 });
        if (labelTop) s += T(bx + barW / 2, by - 19, labelTop, { size: 9, fill: COL.muted, anchor: 'middle' });
        return s;
      }
      return T(bx + barW / 2, y0 + plotH - 6, 'n/d', { size: 10, fill: COL.bad, anchor: 'middle' });
    };
    svg += drawBar(r.passPctCpx, COL.complex, -barW * 0.6, null);
    svg += drawBar(r.passPctBorde, COL.borde, barW * 0.6, null);
    // Etiqueta modelo (rotada) + latencia p95.
    svg += T(gx, y0 + plotH + 16, r.model, { size: 11, fill: COL.ink, anchor: 'end', rot: -35 });
    const lat = r.latP95 != null ? `p95 ${round1(r.latP95 / 1000)}s` : 'p95 n/d';
    svg += T(gx, y0 + plotH + 30, lat, { size: 10, fill: COL.muted, anchor: 'end', rot: -35 });
    const red = r.redTotal != null ? `red:${r.redTotal}` : '';
    if (red) svg += T(gx, y0 + plotH + 44, red, { size: 9, fill: r.redTotal > 0 ? COL.bad : COL.muted, anchor: 'end', rot: -35 });
  });
  // Leyenda.
  const ly = H - 24;
  svg += R(24, ly - 10, 14, 14, COL.complex, 'rx="2"') + T(44, ly + 2, 'PASS% complejo (con tools: AGE/guards)', { size: 12 });
  svg += R(330, ly - 10, 14, 14, COL.borde, 'rx="2"') + T(350, ly + 2, 'PASS% borde (LLM puro, sin tools)', { size: 12 });
  svg += T(620, ly + 2, 'red = red_flags golpeadas (menos=mejor)', { size: 11, fill: COL.muted });
  svg += L(x0, y0 + plotH, x0 + plotW, y0 + plotH, COL.axis, 1.5);
  return svg + '</svg>';
}

// ── GRÁFICO 2: tendencia temporal (líneas PASS% por serie) ────────────────────
function chart2(hist) {
  const W = 900, H = 520, pad = { t: 84, r: 28, b: 96, l: 56 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const x0 = pad.l, y0 = pad.t;
  let svg = svgOpen(W, H);
  svg += T(24, 32, 'Gráfico 2 — Tendencia temporal de PASS% (acierto)', { size: 18, weight: 700 });
  svg += T(24, 54, 'Cada punto = un summary. Eje Y = PASS% (mayor=mejor). Serie distingue tipo de bench.', { size: 12, fill: COL.muted });

  const rows = hist.rows.filter((r) => r.metric === 'pass');
  if (!rows.length) { svg += T(W / 2, H / 2, 'Sin summaries históricos (n/d)', { size: 14, fill: COL.bad, anchor: 'middle' }); return svg + '</svg>'; }

  // Eje X = fechas únicas ordenadas.
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const xOf = (d) => {
    if (dates.length === 1) return x0 + plotW / 2;
    return x0 + (dates.indexOf(d) / (dates.length - 1)) * plotW;
  };
  const yOf = (pct) => y0 + plotH - (pct / 100) * plotH;
  svg += yAxisPct(x0, y0, plotW, plotH);
  // Etiquetas eje X.
  dates.forEach((d) => { svg += L(xOf(d), y0, xOf(d), y0 + plotH, COL.grid, 0.5); svg += T(xOf(d), y0 + plotH + 18, d.slice(5), { size: 10, fill: COL.muted, anchor: 'middle' }); });

  const seriesDefs = [
    { kind: 'complejo', color: COL.complex, label: 'complejo (con tools)' },
    { kind: 'borde', color: COL.borde, label: 'borde (sin tools)' },
    { kind: 'capabilities', color: COL.latAvg, label: 'capabilities A/C' },
  ];
  let legendX = 24; const ly = H - 24;
  for (const sd of seriesDefs) {
    const pts = rows.filter((r) => r.kind === sd.kind).sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!pts.length) continue;
    // Línea (si hay >1 punto en distintas fechas) + puntos siempre.
    if (pts.length > 1) {
      const poly = pts.map((p) => `${round1(xOf(p.date))},${round1(yOf(p.passPct))}`).join(' ');
      svg += `<polyline points="${poly}" fill="none" stroke="${sd.color}" stroke-width="2" stroke-linejoin="round"/>`;
    }
    for (const p of pts) {
      svg += `<circle cx="${round1(xOf(p.date))}" cy="${round1(yOf(p.passPct))}" r="4.5" fill="${sd.color}" stroke="${COL.bg}" stroke-width="1.2"><title>${esc(`${p.date} · ${sd.kind} · ${p.model} · juez ${p.judge} · PASS ${p.passPct}% (AH ${p.ahPct}%) · n=${p.total}`)}</title></circle>`;
      svg += T(xOf(p.date), yOf(p.passPct) - 9, `${round1(p.passPct)}`, { size: 9, fill: sd.color, anchor: 'middle', weight: 600 });
    }
    svg += R(legendX, ly - 10, 14, 14, sd.color, 'rx="2"') + T(legendX + 20, ly + 2, sd.label, { size: 11 });
    legendX += 18 + sd.label.length * 6.4 + 24;
  }
  svg += T(W - 28, ly + 2, 'AH% = 100 − PASS% · ojo: juez varía por punto', { size: 10, fill: COL.muted, anchor: 'end' });
  svg += L(x0, y0 + plotH, x0 + plotW, y0 + plotH, COL.axis, 1.5);
  return svg + '</svg>';
}

// ── GRÁFICO 3: latencia por modelo (barras lat_avg / lat_p95) ─────────────────
function chart3(ab) {
  const W = 900, H = 480, pad = { t: 84, r: 28, b: 116, l: 64 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const x0 = pad.l, y0 = pad.t;
  let svg = svgOpen(W, H);
  svg += T(24, 32, 'Gráfico 3 — Latencia por modelo (complejo con tools)', { size: 18, weight: 700 });
  svg += T(24, 54, 'Segundos por prompt. Menor = mejor. avg vs p95.', { size: 12, fill: COL.muted });

  const rows = (ab.rows || []).filter((r) => r.latAvg != null || r.latP95 != null);
  if (!rows.length) { svg += T(W / 2, H / 2, 'A/B sin latencias todavía (n/d)', { size: 14, fill: COL.bad, anchor: 'middle' }); return svg + '</svg>'; }
  rows.sort((a, b) => (a.latP95 ?? a.latAvg ?? 1e9) - (b.latP95 ?? b.latAvg ?? 1e9));
  const maxMs = Math.max(...rows.flatMap((r) => [r.latAvg || 0, r.latP95 || 0]), 1);
  const maxS = Math.ceil((maxMs / 1000) / 5) * 5 || 5;

  // Eje Y en segundos.
  for (let v = 0; v <= maxS; v += Math.max(5, Math.round(maxS / 5))) {
    const y = y0 + plotH - (v / maxS) * plotH;
    svg += L(x0, y, x0 + plotW, y, COL.grid, 1);
    svg += T(x0 - 8, y + 4, `${v}s`, { size: 11, fill: COL.muted, anchor: 'end' });
  }
  const n = rows.length, groupW = plotW / n, barW = Math.min(34, groupW * 0.3);
  rows.forEach((r, i) => {
    const gx = x0 + i * groupW + groupW / 2;
    const draw = (ms, color, dx) => {
      if (ms == null) return T(gx + dx, y0 + plotH - 6, 'n/d', { size: 10, fill: COL.bad, anchor: 'middle' });
      const s = ms / 1000; const h = (s / maxS) * plotH; const bx = gx + dx - barW / 2; const by = y0 + plotH - h;
      return R(bx, by, barW, h, color, 'rx="2"') + T(bx + barW / 2, by - 5, `${round1(s)}`, { size: 10, fill: COL.ink, anchor: 'middle', weight: 600 });
    };
    svg += draw(r.latAvg, COL.latAvg, -barW * 0.6);
    svg += draw(r.latP95, COL.latP95, barW * 0.6);
    svg += T(gx, y0 + plotH + 16, r.model, { size: 11, anchor: 'end', rot: -35 });
  });
  const ly = H - 22;
  svg += R(24, ly - 10, 14, 14, COL.latAvg, 'rx="2"') + T(44, ly + 2, 'latencia promedio', { size: 12 });
  svg += R(220, ly - 10, 14, 14, COL.latP95, 'rx="2"') + T(240, ly + 2, 'latencia p95', { size: 12 });
  svg += L(x0, y0 + plotH, x0 + plotW, y0 + plotH, COL.axis, 1.5);
  return svg + '</svg>';
}

// ── GRÁFICO 4: AH% con-tools por modelo × num_ctx (último valor) ────────────
function chart4(intel) {
  const W = 700, H = 460, pad = { t: 84, r: 28, b: 96, l: 56 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const x0 = pad.l, y0 = pad.t;
  let svg = svgOpen(W, H);
  svg += T(24, 32, 'Gráfico 4 — AH% con-tools por num_ctx y modelo (último valor)', { size: 16, weight: 700 });
  svg += T(24, 54, 'Menor = mejor. Cada barra = AH% en el último bench de cada configuración.', { size: 12, fill: COL.muted });

  const rows = intel.latest;
  if (!rows.length) { svg += T(W / 2, H / 2, 'Intel-context sin datos (n/d)', { size: 14, fill: COL.bad, anchor: 'middle' }); return svg + '</svg>'; }

  // Agrupar por modelo y num_ctx para barras agrupadas.
  const models = [...new Set(rows.map((r) => r.model))].sort();
  const ctxs = [...new Set(rows.map((r) => r.numCtx))].sort((a, b) => a - b);
  const maxAH = Math.max(...rows.map((r) => r.ah ?? 0), 10);
  const yMax = Math.ceil(maxAH / 5) * 5 + 5; // redondear arriba al múltiplo de 5

  // Eje Y.
  for (let v = 0; v <= yMax; v += Math.max(5, Math.round(yMax / 4))) {
    const y = y0 + plotH - (v / yMax) * plotH;
    svg += L(x0, y, x0 + plotW, y, COL.grid, 1);
    svg += T(x0 - 8, y + 4, `${v}%`, { size: 11, fill: COL.muted, anchor: 'end' });
  }

  const n = models.length;
  const groupW = plotW / n;
  const barW = Math.min(44, groupW * 0.32);
  const colorForCtx = (ctx) => (ctx === 4096 ? COL.intel4096 : COL.intel8192);

  models.forEach((model, i) => {
    const gx = x0 + i * groupW + groupW / 2;
    const modelRows = rows.filter((r) => r.model === model).sort((a, b) => a.numCtx - b.numCtx);
    const totalBars = modelRows.length;
    const startDx = -((totalBars * barW) + (totalBars - 1) * 4) / 2 + barW / 2;

    modelRows.forEach((r, j) => {
      if (r.ah == null) return;
      const h = (r.ah / yMax) * plotH;
      const bx = gx + startDx + j * (barW + 4) - barW / 2;
      const by = y0 + plotH - h;
      svg += R(bx, by, barW, h, colorForCtx(r.numCtx), 'rx="2"');
      svg += T(bx + barW / 2, by - 6, `${r.ah}%`, { size: 11, fill: COL.ink, anchor: 'middle', weight: 700 });
      svg += T(bx + barW / 2, by - 20, `ctx ${r.numCtx}`, { size: 9, fill: COL.muted, anchor: 'middle' });
    });

    // Etiqueta modelo rotada.
    const label = model.replace(':8b', '').replace('granite3.', 'g3.');
    svg += T(gx, y0 + plotH + 16, label, { size: 11, fill: COL.ink, anchor: 'end', rot: -30 });
    svg += T(gx, y0 + plotH + 30, `${modelRows.length} ctx`, { size: 9, fill: COL.muted, anchor: 'end', rot: -30 });
  });

  // Leyenda.
  const ly = H - 22;
  ctxs.forEach((ctx, i) => {
    const lx = 24 + i * 180;
    svg += R(lx, ly - 10, 14, 14, colorForCtx(ctx), 'rx="2"');
    svg += T(lx + 20, ly + 2, `num_ctx=${ctx}`, { size: 11 });
  });
  svg += T(W - 28, ly + 2, 'AH% = (total−pass)/total × 100', { size: 10, fill: COL.muted, anchor: 'end' });
  svg += L(x0, y0 + plotH, x0 + plotW, y0 + plotH, COL.axis, 1.5);
  return svg + '</svg>';
}

// ── GRÁFICO 5: Tendencia temporal AH% por configuración (modelo×ctx) ──────────
function chart5(intel) {
  const W = 900, H = 480, pad = { t: 84, r: 28, b: 96, l: 56 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const x0 = pad.l, y0 = pad.t;
  let svg = svgOpen(W, H);
  svg += T(24, 32, 'Gráfico 5 — Tendencia temporal AH% por configuración con-tools', { size: 16, weight: 700 });
  svg += T(24, 54, 'Cada línea = una combinación modelo×num_ctx. Menor = mejor. Datos de data/bench-runs/intel-context-*.', { size: 12, fill: COL.muted });

  const all = intel.all;
  if (!all.length) { svg += T(W / 2, H / 2, 'Intel-context sin datos (n/d)', { size: 14, fill: COL.bad, anchor: 'middle' }); return svg + '</svg>'; }

  const dates = [...new Set(all.map((r) => r.date))].sort();
  const xOf = (d) => {
    if (dates.length === 1) return x0 + plotW / 2;
    return x0 + (dates.indexOf(d) / (dates.length - 1)) * plotW;
  };
  const yOf = (ah) => y0 + plotH - (ah / 25) * plotH; // Eje Y fijo 0-25%

  // Grid 0-25% cada 5%.
  for (let v = 0; v <= 25; v += 5) {
    const y = y0 + plotH - (v / 25) * plotH;
    svg += L(x0, y, x0 + plotW, y, COL.grid, 1);
    svg += T(x0 - 8, y + 4, `${v}%`, { size: 11, fill: COL.muted, anchor: 'end' });
  }
  dates.forEach((d) => { svg += L(xOf(d), y0, xOf(d), y0 + plotH, COL.grid, 0.5); svg += T(xOf(d), y0 + plotH + 18, d.slice(5), { size: 10, fill: COL.muted, anchor: 'middle' }); });

  // Líneas por (modelo, num_ctx)
  const groups = {};
  for (const r of all) {
    const key = `${r.model}|${r.numCtx}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const palette = [COL.intelGranite, COL.intelDense, '#7dd3fc', '#f9a8d4'];
  const dashPatterns = ['', '6,3', '3,3', '9,3'];
  let pIdx = 0;
  const keys = Object.keys(groups).sort();
  let legendX = 24; const ly = H - 22;

  for (const key of keys) {
    const pts = groups[key].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!pts.length) continue;
    const color = palette[pIdx % palette.length];
    const dash = dashPatterns[pIdx % dashPatterns.length];

    // Línea
    if (pts.length > 1) {
      const poly = pts.map((p) => `${round1(xOf(p.date))},${round1(yOf(p.ah))}`).join(' ');
      svg += `<polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-dasharray="${dash}"/>`;
    }

    // Puntos con etiqueta AH%
    for (const p of pts) {
      svg += `<circle cx="${round1(xOf(p.date))}" cy="${round1(yOf(p.ah))}" r="4" fill="${color}" stroke="${COL.bg}" stroke-width="1.2"><title>${esc(`${p.date} · ${p.model} ctx=${p.numCtx} · AH ${p.ah}% · pass ${p.pass}/${p.total}`)}</title></circle>`;
      svg += T(xOf(p.date), yOf(p.ah) - 9, `${p.ah}%`, { size: 9, fill: color, anchor: 'middle', weight: 600 });
    }

    // Leyenda: nombre corto
    const [model, ctx] = key.split('|');
    const short = model.replace(':8b', '').replace('granite3.', 'g3.') + ` ctx${ctx}`;
    svg += R(legendX, ly - 10, 14, 14, color, 'rx="2"');
    svg += T(legendX + 20, ly + 2, short, { size: 10 });
    const tw = short.length * 5.8 + 24;
    legendX += tw;
    if (legendX > W - 100) { legendX = 24; pIdx += 4; } // nueva fila
    pIdx++;
  }

  svg += T(W - 28, ly - 14, 'AH% = alucinación/fallo · menor=mejor', { size: 10, fill: COL.muted, anchor: 'end' });
  svg += L(x0, y0 + plotH, x0 + plotW, y0 + plotH, COL.axis, 1.5);
  return svg + '</svg>';
}

// ── HTML autocontenido ────────────────────────────────────────────────────────
function buildHTML({ hist, ab, intel, svg1, svg2, svg3, svg4, svg5 }) {
  const abMeta = ab.abSummary;
  const histRows = hist.rows.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const fmt = (v) => (v == null || Number.isNaN(v) ? '<span class="nd">n/d</span>' : v);

  const abTable = ab.present ? `
    <table>
      <thead><tr>
        <th>Modelo</th><th>PASS% complejo</th><th>AH% complejo</th>
        <th>pass/fail/unj</th><th>PASS% borde</th><th>AH% borde</th>
        <th>lat avg</th><th>lat p95</th><th>red_flags</th>
      </tr></thead>
      <tbody>
      ${[...ab.rows].sort((a, b) => (b.passPctCpx ?? -1) - (a.passPctCpx ?? -1)).map((r) => `
        <tr>
          <td class="m">${esc(r.model)}</td>
          <td class="good">${fmt(r.passPctCpx)}${r.passPctCpx != null ? '%' : ''}</td>
          <td class="bad">${fmt(r.ahPctCpx)}${r.ahPctCpx != null ? '%' : ''}</td>
          <td>${fmt(r.pass)}/${fmt(r.fail)}/${fmt(r.unj)}</td>
          <td class="good">${fmt(r.passPctBorde)}${r.passPctBorde != null ? '%' : ''}</td>
          <td class="bad">${fmt(r.ahPctBorde)}${r.ahPctBorde != null ? '%' : ''}</td>
          <td>${r.latAvg != null ? round1(r.latAvg / 1000) + 's' : '<span class="nd">n/d</span>'}</td>
          <td>${r.latP95 != null ? round1(r.latP95 / 1000) + 's' : '<span class="nd">n/d</span>'}</td>
          <td class="${r.redTotal ? 'bad' : ''}">${fmt(r.redTotal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="nd">A/B sin filas todavía (el bench llena por modelo; se actualiza al terminar).</p>';

  const histTable = `
    <table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Modelo</th><th>Juez</th><th>PASS%</th><th>AH%</th><th>pass/total</th><th>archivo</th></tr></thead>
      <tbody>
      ${histRows.map((r) => `
        <tr>
          <td>${esc(r.date)}</td><td>${esc(r.kind)}</td><td class="m">${esc(r.model)}</td>
          <td class="j">${esc(r.judge)}</td>
          <td class="good">${round1(r.passPct)}%${r.metric === 'accuracy' ? ' <span class="nd">(acc)</span>' : ''}</td>
          <td class="bad">${round1(r.ahPct)}%</td>
          <td>${r.pass}/${r.total}</td>
          <td class="src">${esc(r.source)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  const intelFiles = intel.all.length;

  const intelTable = intelFiles ? `
    <table>
      <thead><tr><th>Fecha</th><th>Modelo</th><th>num_ctx</th><th>AH%</th><th>pass/total</th><th>archivo</th></tr></thead>
      <tbody>
      ${intel.all.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => `
        <tr>
          <td>${esc(r.date)}</td><td class="m">${esc(r.model)}</td><td>${r.numCtx}</td>
          <td class="bad">${r.ah != null ? r.ah + '%' : '<span class="nd">n/d</span>'}</td>
          <td>${r.pass}/${r.total}</td>
          <td class="src">${esc(r.source)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="nd">Sin datos intel-context todavía.</p>';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard de benches — Chagra</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:${COL.bg};color:${COL.ink};font:15px/1.5 ui-sans-serif,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:980px;margin:0 auto;padding:28px 20px 60px}
  h1{font-size:26px;margin:0 0 4px} h2{font-size:19px;margin:34px 0 10px;border-bottom:1px solid ${COL.grid};padding-bottom:6px}
  .sub{color:${COL.muted};margin:0 0 18px}
  .card{background:${COL.panel};border:1px solid ${COL.grid};border-radius:12px;padding:14px;margin:14px 0;overflow-x:auto}
  svg{max-width:100%;height:auto;display:block;margin:0 auto}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{padding:6px 9px;text-align:left;border-bottom:1px solid ${COL.grid};white-space:nowrap}
  th{color:${COL.muted};font-weight:600} td.m{font-family:ui-monospace,monospace} td.j{color:${COL.muted};font-size:12px}
  td.src{color:${COL.muted};font-size:11px;font-family:ui-monospace,monospace} td.good{color:${COL.complex};font-weight:600} td.bad{color:${COL.bad}}
  .nd{color:${COL.bad};opacity:.85}
  .note{background:#1b241d;border-left:3px solid ${COL.borde};padding:10px 14px;border-radius:6px;color:${COL.muted};font-size:13px;margin:12px 0}
  code{background:#0c110d;padding:1px 5px;border-radius:4px;color:${COL.complex}}
  .foot{color:${COL.muted};font-size:12px;margin-top:40px;border-top:1px solid ${COL.grid};padding-top:14px}
</style></head>
<body><div class="wrap">
  <h1>Dashboard de benches anti-alucinación — Chagra</h1>
  <p class="sub">Generado ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC · datos REALES leídos de los summaries de bench.</p>

  <div class="note"><b>Cómo leer los números.</b> El campo crudo <code>ah_pct</code> de los summaries está MAL nombrado: en la práctica es el <b>PASS-RATE</b> (% de acierto), no la alucinación. Acá todo se deriva de <code>pass/total</code>:
  <b>PASS%</b> = aciertos/total (mayor=mejor); <b>AH%</b> = (total−aciertos)/total = alucinación/fallo (menor=mejor).
  El <b>juez varía</b> por serie (determinístico vs LLM mistral-nemo:12b vs claude-cli) — no compares puntos de juez distinto como si fueran lo mismo; la columna "Juez" lo aclara.</div>

  <h2>Gráfico 1 — A/B modelos (con tools vs sin tools)</h2>
  <div class="card">${svg1}</div>
  <p class="sub">Fuente A/B: <code>${esc(ab.tsvPath)}</code>${abMeta ? ` · juez complejo: <b>${esc(abMeta.judge?.model || 'n/d')}</b> · generador ${esc(abMeta.generator?.model || 'n/d')}` : ''}. ${ab.present ? `${ab.rows.length} modelo(s) con datos.` : 'Sin datos todavía.'} (A/B aún corriendo: se completa al terminar.)</p>
  ${abTable}

  <h2>Gráfico 2 — Tendencia temporal</h2>
  <div class="card">${svg2}</div>
  <p class="sub">${hist.rows.filter((r) => r.metric === 'pass').length} punto(s) de ${hist.files.length} summary(s) históricos en <code>data/bench-runs/</code>.</p>
  ${histTable}

  <h2>Gráfico 3 — Latencia por modelo</h2>
  <div class="card">${svg3}</div>

  <h2>Gráfico 4 — AH% con-tools por num_ctx y modelo (inteligencia contextual)</h2>
  <div class="card">${svg4}</div>
  <p class="sub">AH% con tools activados (AGE/guards). ${intelFiles} punto(s) intel-context en <code>data/bench-runs/</code>.</p>
  ${intelTable}

  <h2>Gráfico 5 — Tendencia temporal AH% por configuración con-tools</h2>
  <div class="card">${svg5}</div>

  <p class="foot">Reproducir: <code>node scripts/bench-dashboard.mjs</code>. PNG para Telegram: <code>nix-shell -p librsvg --run 'rsvg-convert -o out/grafico1.png out/grafico1.svg'</code>.<br>
  Summaries leídos: ${hist.files.length} · filas de tendencia: ${hist.rows.length} · modelos A/B: ${ab.rows.length} · intel-context: ${intelFiles}.</p>
</div></body></html>`;
}

// ── main ──────────────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const hist = loadHistoricos();
  const ab = loadAB();
  const intel = loadIntelData();

  console.log(`[bench-dashboard] summaries históricos leídos: ${hist.files.length}`);
  hist.files.forEach((f) => console.log(`  · ${f}`));
  console.log(`[bench-dashboard] filas de tendencia normalizadas: ${hist.rows.length}`);
  console.log(`[bench-dashboard] A/B: ${ab.present ? ab.rows.length + ' modelo(s) desde ' + ab.tsvPath : 'sin TSV (' + ab.tsvPath + ')'}`);
  console.log(`[bench-dashboard] intel-context: ${intel.all.length} filas, ${intel.latest.length} configuraciones`);

  const svg1 = chart1(ab), svg2 = chart2(hist), svg3 = chart3(ab);
  const svg4 = chart4(intel), svg5 = chart5(intel);
  const writes = [
    ['grafico1.svg', svg1], ['grafico2.svg', svg2], ['grafico3.svg', svg3],
    ['grafico4.svg', svg4], ['grafico5.svg', svg5],
    ['bench-dashboard.html', buildHTML({ hist, ab, intel, svg1, svg2, svg3, svg4, svg5 })],
  ];
  for (const [name, content] of writes) {
    fs.writeFileSync(path.join(OUT_DIR, name), content);
    console.log(`[bench-dashboard] escrito: ${path.join(OUT_DIR, name)}`);
  }
  console.log('[bench-dashboard] listo. PNG: nix-shell -p librsvg --run "rsvg-convert -o out/grafico1.png out/grafico1.svg"');
}

main();

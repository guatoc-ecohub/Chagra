#!/usr/bin/env node
/**
 * rag-chunking-bench.mjs — mide si el chunking passage-level mejora el recall
 * SEMÁNTICO del RAG de Chagra vs el chunking doc-level de prod.
 *
 * Compara TRES arms de retrieval PURO-SEMÁNTICO (cosine, sin BM25), con el MISMO
 * modelo (nomic-embed-text 768d), las MISMAS 50 queries de eval/rag-golden.json y
 * la MISMA regla de match, de modo que el único cambio entre arms es el chunking:
 *
 *   A) doc-level (PROD)      — public/rag-embeddings.json: 1 vector/especie con
 *                              extractPassageText() (subconjunto de campos). Es el
 *                              baseline a batir.
 *   B) doc-level (flatten)   — data/rag-chunking-exp/rag-embeddings-docflat.json:
 *                              1 vector/especie pero embebiendo el texto
 *                              CONCATENADO de flattenDoc (todo el contenido
 *                              indexable, pooled). Aísla "más contenido" de
 *                              "chunking fino".
 *   C) passage-level         — data/rag-chunking-exp/rag-embeddings-passages.json:
 *                              N vectores/especie (flattenDoc), score de la
 *                              especie = MAX cosine entre sus passages (max-pooling).
 *
 * Match: el `expected` del golden es especie BASE (genus_species). Cada arm
 * colapsa variedades a base (parts.slice(0,2), como collapseVarieties en prod),
 * toma el max score por base, rankea, y cuenta hit si la base esperada cae en
 * top-K. Techo del set: 44/50 (6 queries son conceptos cross-especie sin slug).
 *
 * Uso:
 *   OLLAMA_URL=http://alpha.local:11434 node scripts/rag-chunking-bench.mjs
 *   (requiere haber corrido antes scripts/rag-chunking-build-passages.mjs)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXP_DIR = resolve(ROOT, 'data', 'rag-chunking-exp');
const GOLDEN_PATH = resolve(ROOT, 'eval', 'rag-golden.json');
const DOC_PROD_PATH = resolve(ROOT, 'public', 'rag-embeddings.json');
const DOCFLAT_PATH = resolve(EXP_DIR, 'rag-embeddings-docflat.json');
const PASSAGES_PATH = resolve(EXP_DIR, 'rag-embeddings-passages.json');
const QCACHE_PATH = resolve(EXP_DIR, 'query-embeddings.json');
const RESULTS_PATH = resolve(EXP_DIR, 'results.json');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.RAG_EMBED_MODEL || 'nomic-embed-text';

// ── helpers ──────────────────────────────────────────────────────────────
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 0 ? dot / d : 0;
}

function collapseToBase(slug) {
  const parts = String(slug).split('_');
  return parts.length >= 2 ? parts.slice(0, 2).join('_') : slug;
}

function matchesSpecies(base, expected) {
  return base === expected || base.startsWith(`${expected}_`);
}

// Dequantiza un valor del asset (soporta int8 como ragRetriever). Prod hoy usa
// float plano, pero mantenemos el guard por si el asset viene quantizado.
function toVec(entry) {
  if (Array.isArray(entry) && entry.length > 0) return entry;
  if (entry && entry.q === 'int8' && Array.isArray(entry.v) && entry.s) {
    return entry.v.map((x) => x * entry.s);
  }
  return null;
}

async function embedQuery(text, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.embedding) || !data.embedding.length) throw new Error('vacío');
      return data.embedding;
    } catch (err) {
      if (attempt === tries) throw err;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  throw new Error('unreachable');
}

// Rankea especies BASE para un arm que mapea slug→vector.
function rankBasesFromSlugMap(qVec, slugMap) {
  const baseScore = new Map();
  for (const [slug, entry] of Object.entries(slugMap)) {
    const vec = toVec(entry);
    if (!vec) continue;
    const s = cosine(qVec, vec);
    const base = collapseToBase(slug);
    const prev = baseScore.get(base);
    if (prev === undefined || s > prev) baseScore.set(base, s);
  }
  return [...baseScore.entries()].sort((a, b) => b[1] - a[1]).map(([base]) => base);
}

// Rankea especies BASE para el arm passage-level. `pool` define cómo se agregan
// los scores de los passages de una especie a UN score de especie:
//   'max'  → el MÁXIMO (lo que pide el brief; sesgo de longitud: más passages =
//            más chances de un cosine espuriamente alto).
//   'mean' → el PROMEDIO de todos los passages de la especie.
//   'top3' → el promedio de los 3 mejores passages (compromiso robusto).
// El pooling se hace por SLUG (variedad) y luego se colapsa a base con MAX,
// igual que collapseVarieties en prod. Recibe simByTextId ya calculado.
function rankBasesFromPassages(simByTextId, passageBySlug, pool) {
  const slugScore = new Map();
  for (const [slug, refs] of passageBySlug.entries()) {
    const sims = [];
    for (const ref of refs) {
      const s = simByTextId.get(ref.t);
      if (s !== undefined) sims.push(s);
    }
    if (sims.length === 0) continue;
    let score;
    if (pool === 'max') {
      score = Math.max(...sims);
    } else if (pool === 'mean') {
      score = sims.reduce((a, b) => a + b, 0) / sims.length;
    } else { // top3
      sims.sort((a, b) => b - a);
      const top = sims.slice(0, 3);
      score = top.reduce((a, b) => a + b, 0) / top.length;
    }
    slugScore.set(slug, score);
  }
  const baseScore = new Map();
  for (const [slug, s] of slugScore.entries()) {
    const base = collapseToBase(slug);
    const prev = baseScore.get(base);
    if (prev === undefined || s > prev) baseScore.set(base, s);
  }
  return [...baseScore.entries()].sort((a, b) => b[1] - a[1]).map(([base]) => base);
}

function rankOfExpected(rankedBases, expected) {
  for (let i = 0; i < rankedBases.length; i++) {
    if (matchesSpecies(rankedBases[i], expected)) return i + 1; // 1-based
  }
  return null;
}

function metricsFromRanks(ranks) {
  const n = ranks.length;
  let r1 = 0, r3 = 0, r5 = 0, rr = 0;
  for (const rank of ranks) {
    if (rank === null) continue;
    if (rank === 1) r1 += 1;
    if (rank <= 3) r3 += 1;
    if (rank <= 5) r5 += 1;
    rr += 1 / rank;
  }
  return {
    'recall@1': Number((r1 / n * 100).toFixed(1)),
    'recall@3': Number((r3 / n * 100).toFixed(1)),
    'recall@5': Number((r5 / n * 100).toFixed(1)),
    MRR: Number((rr / n).toFixed(4)),
  };
}

async function main() {
  console.log('=== rag-chunking-bench (puro semántico, nomic-embed-text) ===');
  console.log(`  Ollama: ${OLLAMA_URL}`);
  for (const p of [DOCFLAT_PATH, PASSAGES_PATH]) {
    if (!existsSync(p)) { console.error(`  FALTA ${p} — corra rag-chunking-build-passages.mjs primero.`); process.exit(1); }
  }

  const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
  const docProd = JSON.parse(readFileSync(DOC_PROD_PATH, 'utf8'));
  const docFlat = JSON.parse(readFileSync(DOCFLAT_PATH, 'utf8'));
  const passageCorpus = JSON.parse(readFileSync(PASSAGES_PATH, 'utf8'));
  const passageRefs = passageCorpus.passages;   // [{slug, key, t}]
  const passageTexts = passageCorpus.texts;      // { t: number[768] }

  // Agrupar refs por slug UNA vez (reuso en cada query y cada pooling).
  const passageBySlug = new Map();
  for (const ref of passageRefs) {
    if (!passageBySlug.has(ref.slug)) passageBySlug.set(ref.slug, []);
    passageBySlug.get(ref.slug).push(ref);
  }

  // Techo: cuántos expected-base existen como base en el arm passage (mejor
  // cobertura). Se reporta como cota superior alcanzable.
  const passageBases = new Set(passageRefs.map((r) => collapseToBase(r.slug)));
  const ceiling = golden.filter((g) => passageBases.has(g.expected)).length;

  console.log(`  Golden: ${golden.length} queries | passages: ${passageRefs.length} refs, ${Object.keys(passageTexts).length} vectores únicos`);
  console.log(`  Techo (expected-base presente en corpus): ${ceiling}/${golden.length} = ${(ceiling / golden.length * 100).toFixed(1)}%`);

  // 1. Embeber queries (cache).
  let qcache = existsSync(QCACHE_PATH) ? JSON.parse(readFileSync(QCACHE_PATH, 'utf8')) : {};
  let embedded = 0;
  for (const g of golden) {
    if (!qcache[g.id]) { qcache[g.id] = await embedQuery(g.query); embedded += 1; }
  }
  if (embedded > 0) writeFileSync(QCACHE_PATH, JSON.stringify(qcache));
  console.log(`  Queries embebidas: ${embedded} nuevas, ${golden.length - embedded} de cache`);

  // 2. Rankear por arm.
  const arms = {
    A_doc_prod: { label: 'doc-level PROD (extractPassageText, 1 vec/especie)', ranks: [], perQuery: [] },
    B_doc_flatten: { label: 'doc-level flatten (concat flattenDoc, 1 vec/especie)', ranks: [], perQuery: [] },
    C_passage_max: { label: 'passage-level max-pool (flattenDoc, N vec/especie)', ranks: [], perQuery: [] },
    D_passage_mean: { label: 'passage-level mean-pool (flattenDoc, N vec/especie)', ranks: [], perQuery: [] },
    E_passage_top3: { label: 'passage-level top3-mean (flattenDoc, N vec/especie)', ranks: [], perQuery: [] },
  };

  for (const g of golden) {
    const qVec = qcache[g.id];

    const ra = rankOfExpected(rankBasesFromSlugMap(qVec, docProd), g.expected);
    arms.A_doc_prod.ranks.push(ra);
    arms.A_doc_prod.perQuery.push({ id: g.id, expected: g.expected, rank: ra });

    const rb = rankOfExpected(rankBasesFromSlugMap(qVec, docFlat), g.expected);
    arms.B_doc_flatten.ranks.push(rb);
    arms.B_doc_flatten.perQuery.push({ id: g.id, expected: g.expected, rank: rb });

    // passage-level: cosine por texto único una vez, luego 3 poolings.
    const simByTextId = new Map();
    for (const [tid, vec] of Object.entries(passageTexts)) simByTextId.set(tid, cosine(qVec, vec));
    for (const [key, pool] of [['C_passage_max', 'max'], ['D_passage_mean', 'mean'], ['E_passage_top3', 'top3']]) {
      const r = rankOfExpected(rankBasesFromPassages(simByTextId, passageBySlug, pool), g.expected);
      arms[key].ranks.push(r);
      arms[key].perQuery.push({ id: g.id, expected: g.expected, rank: r });
    }
  }

  // 3. Métricas + tabla.
  const results = {};
  for (const [k, arm] of Object.entries(arms)) results[k] = { label: arm.label, metrics: metricsFromRanks(arm.ranks) };

  const A = results.A_doc_prod.metrics;
  const fmtDelta = (v, base) => { const d = (v - base); return `${d >= 0 ? '+' : ''}${d.toFixed(1)}`; };

  console.log(`\n${'='.repeat(104)}`);
  console.log(`RESULTADOS — chunking doc-level vs passage-level (n=${golden.length}, techo ${(ceiling / golden.length * 100).toFixed(0)}%)`);
  console.log('-'.repeat(104));
  console.log('arm'.padEnd(52) + 'R@1'.padStart(10) + 'R@3'.padStart(12) + 'R@5'.padStart(12) + 'MRR'.padStart(12));
  console.log('-'.repeat(104));
  for (const [k, r] of Object.entries(results)) {
    const m = r.metrics;
    const isA = k === 'A_doc_prod';
    const d1 = isA ? '' : `(${fmtDelta(m['recall@1'], A['recall@1'])})`;
    const d3 = isA ? '' : `(${fmtDelta(m['recall@3'], A['recall@3'])})`;
    const d5 = isA ? '' : `(${fmtDelta(m['recall@5'], A['recall@5'])})`;
    const dm = isA ? '' : `(${(m.MRR - A.MRR >= 0 ? '+' : '')}${(m.MRR - A.MRR).toFixed(4)})`;
    console.log(
      r.label.padEnd(52) +
      `${m['recall@1']}%${d1}`.padStart(10) +
      `${m['recall@3']}%${d3}`.padStart(12) +
      `${m['recall@5']}%${d5}`.padStart(12) +
      `${m.MRR}${dm}`.padStart(12),
    );
  }
  console.log('-'.repeat(104));

  // 4. Mejor arm passage-level (por recall@5, desempate MRR) para el veredicto.
  const passageKeys = ['C_passage_max', 'D_passage_mean', 'E_passage_top3'];
  const bestPassageKey = passageKeys.reduce((best, k) => {
    const m = results[k].metrics; const bm = results[best].metrics;
    if (m['recall@5'] !== bm['recall@5']) return m['recall@5'] > bm['recall@5'] ? k : best;
    return m.MRR > bm.MRR ? k : best;
  }, passageKeys[0]);

  // 5. Qué queries GANA/PIERDE el MEJOR passage-level vs prod (top-5).
  const gained = [], lost = [];
  for (let i = 0; i < golden.length; i++) {
    const a = arms.A_doc_prod.ranks[i];
    const c = arms[bestPassageKey].ranks[i];
    const aHit = a !== null && a <= 5;
    const cHit = c !== null && c <= 5;
    if (cHit && !aHit) gained.push(`${golden[i].id}:${golden[i].expected} (A=${a ?? '-'}→best=${c})`);
    if (aHit && !cHit) lost.push(`${golden[i].id}:${golden[i].expected} (A=${a}→best=${c ?? '-'})`);
  }
  console.log(`\nmejor passage-level = ${bestPassageKey} (${results[bestPassageKey].label})`);
  console.log(`best passage vs prod @5 — GANA (${gained.length}): ${gained.join('; ') || 'ninguna'}`);
  console.log(`best passage vs prod @5 — PIERDE (${lost.length}): ${lost.join('; ') || 'ninguna'}`);

  // 6. Veredicto: mejor passage-level vs doc-level PROD.
  const C = results[bestPassageKey].metrics;
  const d5 = C['recall@5'] - A['recall@5'];
  const dmrr = C.MRR - A.MRR;
  console.log(`\nVEREDICTO: MEJOR passage-level (${bestPassageKey}) vs doc-level PROD → recall@5 ${d5 >= 0 ? '+' : ''}${d5.toFixed(1)}pp, MRR ${dmrr >= 0 ? '+' : ''}${dmrr.toFixed(4)}`);

  // 6. Persistir.
  // Redacta IPs privadas del host antes de persistir (repo público, anti-leak;
  // ver lefthook infra-refs-scan). El backend es Ollama en alpha vía OLLAMA_URL.
  const embedHost = OLLAMA_URL.replace(/\b(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)\b/g, 'alpha');
  const out = {
    bench: 'rag-chunking-passages',
    date: new Date().toISOString(),
    embed_host: embedHost,
    model: EMBED_MODEL,
    n_queries: golden.length,
    ceiling_hits: ceiling,
    ceiling_pct: Number((ceiling / golden.length * 100).toFixed(1)),
    method: 'puro semántico (cosine), colapso variedad→base (parts[0:2]), max-pool por especie; match base==expected||startsWith; 50 queries golden',
    passage_corpus: {
      total_passages: passageCorpus.total_passages,
      unique_texts: passageCorpus.unique_texts,
      truncate_chars: passageCorpus.truncate_chars,
      truncated_passages: passageCorpus.truncated_passages,
    },
    arms: results,
    best_passage_arm: bestPassageKey,
    delta_bestPassage_vs_docProd: {
      'recall@1_pp': Number((C['recall@1'] - A['recall@1']).toFixed(1)),
      'recall@3_pp': Number((C['recall@3'] - A['recall@3']).toFixed(1)),
      'recall@5_pp': Number((C['recall@5'] - A['recall@5']).toFixed(1)),
      MRR: Number((C.MRR - A.MRR).toFixed(4)),
    },
    gained_at5: gained,
    lost_at5: lost,
    per_query: Object.fromEntries(Object.entries(arms).map(([k, a]) => [k, a.perQuery])),
  };
  writeFileSync(RESULTS_PATH, JSON.stringify(out, null, 2));
  console.log(`\nResultados → ${RESULTS_PATH}`);
}

main().catch((err) => { console.error('[bench] FATAL:', err?.stack || err); process.exit(1); });

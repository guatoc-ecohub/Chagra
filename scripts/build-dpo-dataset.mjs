#!/usr/bin/env node
/**
 * scripts/build-dpo-dataset.mjs
 *
 * PREP para el experimento B7 (fine-tune QLoRA-DPO de granite en la Ampere,
 * ver `Chagra-strategy/ops/DR-QLORA-DPO-B7-2026-07-10.md`). Este script NO
 * entrena nada: sólo arma el dataset de preferencias (DPO) a partir de los
 * runs de contaminación ya juzgados.
 *
 * De dónde salen los pares
 * ------------------------
 * El set de sondas N=69 de `bench-contaminacion.mjs` se ha corrido 16 veces a
 * `temperature:0.7`. Como el modelo es estocástico, la MISMA sonda (mismo
 * `id`) sale a veces contaminada y a veces limpia. Eso nos da, gratis, pares
 * de preferencia sobre la MISMA pregunta:
 *
 *   - `rejected` = una respuesta juzgada `contaminated:true` de esa sonda.
 *   - `chosen`   = una respuesta juzgada `contaminated:false` de la MISMA sonda.
 *   - `prompt`   = el system prompt REAL que ve prod (reconstruido con
 *                  `buildEnrichedSystemPrompt`, importado del harness de
 *                  verdad — NO se reinventa aquí) + la pregunta del usuario.
 *
 * Cada respuesta contaminada DISTINTA de una sonda que además tiene al menos
 * una respuesta limpia genera un par (dedup de `rejected` por texto). Con los
 * 16 `*.judged.jsonl` actuales eso da ~110 pares naturales, 0 sintéticos.
 *
 * Reconstrucción del prompt (base vs enriquecido)
 * ------------------------------------------------
 * `buildEnrichedSystemPrompt(entities, guards...)` es la MISMA función que usa
 * `bench-contaminacion.mjs` en la fase remote-run (espejo de `AgentScreen.jsx`
 * en prod). Los `entities` y los bloques de guardas los produce el sidecar
 * (resolve-entities + piso-termico/confusion-especie/pest-vs-disease guards).
 *   - Si el sidecar está accesible (día 4-5 con la infra arriba), el script
 *     enriquece el prompt por cada pregunta única → prompt fiel a inferencia.
 *   - Si no lo está (o con `--no-enrich`), cae al prompt BASE (misma función,
 *     `entities=[]`, sin bloques) y lo marca `prompt_enriched:false` en `meta`.
 *   En ambos casos el texto del prompt sale de `buildEnrichedSystemPrompt`, no
 *   de un string inventado.
 *
 * Split anti-leakage (TRAP #1 del DR)
 * -----------------------------------
 * Los 110 pares y el bench N=69 salen del MISMO generador. Entrenar con la
 * especie X y evaluar la especie X mide MEMORIZACIÓN, no veracidad. Por eso el
 * split es POR ESPECIE (una especie cae ENTERA en train o ENTERA en heldout),
 * ~80/20 por especie-slug. La especie-slug se colapsa al binomio (género +
 * epíteto) para que los cultivares (p. ej. varios `Solanum lycopersicum`) no
 * queden repartidos entre ambos lados. Los tipos con una sola especie (p. ej.
 * `contacto_inventado`) se anclan a TRAIN para no dejar el tipo sin ejemplos
 * de entrenamiento. La evaluación honesta de B7 se corre sobre HELDOUT.
 *
 * Salidas: `data/dpo/train.jsonl` y `data/dpo/heldout.jsonl` (formato
 * conversacional de preferencias TRL: `prompt`/`chosen`/`rejected` como listas
 * de mensajes + `meta`).
 *
 * Uso
 * ---
 *   node scripts/build-dpo-dataset.mjs
 *   node scripts/build-dpo-dataset.mjs --no-enrich            # fuerza prompt base
 *   node scripts/build-dpo-dataset.mjs --heldout-ratio 0.25   # cambia el split
 *   node scripts/build-dpo-dataset.mjs --out-dir data/dpo --seed chagra-dpo-b7
 *
 * Env: SIDECAR_URL, SIDECAR_TOKEN, BENCH_RUNS_DIR.
 *
 * Reglas del proyecto respetadas: no toca prod ni el grafo, no entrena, no
 * inventa el system prompt (lo importa), sin secretos hardcodeados.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEnrichedSystemPrompt, sidecarReachableLocally } from './bench-contaminacion.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';

// Los cinco tipos de sonda/contaminación que reporta el bench.
export const CONTAMINATION_TYPES = [
  'cross_thermal',
  'confusion_especie',
  'pest_vs_disease',
  'cross_crop',
  'contacto_inventado',
];

// --------------------------------------------------------------------------
// Especie-slug — colapsa el `id` de sonda a un binomio (género + epíteto)
// --------------------------------------------------------------------------

/**
 * extractSpeciesSlug — deriva la especie-slug (unidad del split anti-leakage)
 * a partir del `id` de la sonda y su `type`. Colapsa cultivares al binomio
 * para que no se repartan entre train y heldout.
 *
 *   cross_thermal__allium_cepa                       -> allium_cepa
 *   cross_crop__solanum_lycopersicum_san_marzano     -> solanum_lycopersicum
 *   confusion_especie__solanum_lycopersicum_cerasiforme_uvalina -> solanum_lycopersicum
 *   pest_vs_disease__coffea_arabica__hemileia_...    -> coffea_arabica
 *   fixed__contacto_inventado_plaga_cuarentenaria    -> fixed__contacto_inventado_plaga_cuarentenaria
 *
 * Las sondas `fixed__*` no codifican una especie en el id de forma uniforme;
 * cada una se trata como su propia especie (bucket singleton), lo que es
 * inocuo para el split (son pocas y de tópicos distintos).
 *
 * @param {string} id
 * @param {string} type
 * @returns {string}
 */
export function extractSpeciesSlug(id, type) {
  if (typeof id !== 'string' || !id) return 'desconocida';
  if (id.startsWith('fixed__')) return id; // singleton, sin binomio fiable
  const sep = id.indexOf('__');
  let rest = sep >= 0 ? id.slice(sep + 2) : id;
  // En pest_vs_disease el id es `<type>__<especie>__<organismo>`: la especie
  // es el primer segmento; el organismo (plaga/enfermedad) va después.
  if (type === 'pest_vs_disease') {
    rest = rest.split('__')[0];
  }
  const toks = rest.split('_').filter(Boolean);
  return toks.length >= 2 ? `${toks[0]}_${toks[1]}` : (rest || 'desconocida');
}

// --------------------------------------------------------------------------
// Lectura y agrupación de los runs juzgados
// --------------------------------------------------------------------------

/**
 * readJudgedRecords — lee todos los `*.judged.jsonl` de un directorio y
 * devuelve los registros parseados (líneas inválidas se ignoran).
 * @param {string} dir
 * @returns {{ records: object[], files: string[] }}
 */
export function readJudgedRecords(dir) {
  if (!existsSync(dir)) return { records: [], files: [] };
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.judged.jsonl'))
    .sort();
  const records = [];
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf-8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        records.push(JSON.parse(t));
      } catch {
        // línea corrupta — se ignora
      }
    }
  }
  return { records, files };
}

/**
 * collectCandidates — agrupa los registros por `id` de sonda y separa las
 * respuestas contaminadas (candidatas a `rejected`, deduplicadas por texto) de
 * las limpias (candidatas a `chosen`).
 * @param {object[]} records
 * @returns {Array<{id:string,type:string,query:string,subject:string,species:string,rejected:string[],clean:object[]}>}
 */
export function collectCandidates(records) {
  const byId = new Map();
  for (const r of records) {
    const id = r && r.id;
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        type: r.type || 'desconocido',
        query: r.query || '',
        subject: r.subject || '',
        rejectedSet: new Map(), // texto -> record (dedup por texto)
        clean: [],
      });
    }
    const g = byId.get(id);
    if (!g.query && r.query) g.query = r.query;
    const text = typeof r.response === 'string' ? r.response.trim() : '';
    if (!text || r.error) continue;
    if (r.contaminated === true) {
      if (!g.rejectedSet.has(text)) g.rejectedSet.set(text, r);
    } else if (r.contaminated === false) {
      g.clean.push(r);
    }
  }
  const out = [];
  for (const g of byId.values()) {
    out.push({
      id: g.id,
      type: g.type,
      query: g.query,
      subject: g.subject,
      species: extractSpeciesSlug(g.id, g.type),
      rejected: [...g.rejectedSet.keys()],
      clean: g.clean,
    });
  }
  return out;
}

/**
 * selectChosen — elige la mejor respuesta limpia de una sonda para usarla como
 * `chosen`. Preferimos factual y concisa (DR §1.2): descartamos las demasiado
 * cortas (probable evasión/truncado), y entre las restantes ordenamos por menos
 * alucinaciones detectadas, más entidades groundeadas y, a igualdad, más corta.
 * @param {object[]} cleanRecords
 * @param {{ minChars?: number }} [opts]
 * @returns {object|null}
 */
export function selectChosen(cleanRecords, { minChars = 40 } = {}) {
  if (!Array.isArray(cleanRecords) || cleanRecords.length === 0) return null;
  const withLen = cleanRecords.map((r) => ({ r, text: (r.response || '').trim() }));
  const cmp = (a, b) => {
    const ha = a.r.halluc_detected_count ?? 0;
    const hb = b.r.halluc_detected_count ?? 0;
    if (ha !== hb) return ha - hb; // menos alucinaciones primero
    const ga = a.r.entities_grounded ?? 0;
    const gb = b.r.entities_grounded ?? 0;
    if (ga !== gb) return gb - ga; // más groundeado primero
    return a.text.length - b.text.length; // más corta primero
  };
  const good = withLen.filter((x) => x.text.length >= minChars).sort(cmp);
  if (good.length > 0) return good[0].r;
  // Fallback: ninguna supera el mínimo → la más larga disponible.
  const fallback = [...withLen].sort((a, b) => b.text.length - a.text.length)[0];
  return fallback ? fallback.r : null;
}

// --------------------------------------------------------------------------
// Construcción de pares DPO (formato conversacional TRL)
// --------------------------------------------------------------------------

/** defaultSystemFor — prompt BASE (misma función que prod, entities=[]). */
export function defaultSystemFor() {
  return buildEnrichedSystemPrompt([]);
}

/**
 * buildPairs — arma los pares DPO conversacionales a partir de las candidatas.
 * Puro y síncrono (testeable sin red): la reconstrucción del system prompt se
 * inyecta vía `systemFor(query, type)`.
 * @param {ReturnType<typeof collectCandidates>} candidates
 * @param {{ systemFor?: (query:string,type:string)=>string, minChosenChars?: number, promptEnriched?: boolean }} [opts]
 * @returns {object[]}
 */
export function buildPairs(candidates, opts = {}) {
  const {
    systemFor = defaultSystemFor,
    minChosenChars = 40,
    promptEnriched = false,
  } = opts;
  const pairs = [];
  const seenRejected = new Set(); // dedup global de `rejected` por texto
  for (const c of candidates) {
    if (!c.rejected.length || !c.clean.length) continue;
    const chosenRec = selectChosen(c.clean, { minChars: minChosenChars });
    if (!chosenRec) continue;
    const chosenText = (chosenRec.response || '').trim();
    if (!chosenText) continue;
    const system = systemFor(c.query, c.type);
    for (const rejectedText of c.rejected) {
      if (!rejectedText || rejectedText === chosenText) continue;
      const dedupKey = `${c.id} ${rejectedText}`;
      if (seenRejected.has(dedupKey)) continue;
      seenRejected.add(dedupKey);
      pairs.push({
        prompt: [
          { role: 'system', content: system },
          { role: 'user', content: c.query },
        ],
        chosen: [{ role: 'assistant', content: chosenText }],
        rejected: [{ role: 'assistant', content: rejectedText }],
        meta: {
          id: c.id,
          type: c.type,
          species: c.species,
          query: c.query,
          chosen_grounded: chosenRec.entities_grounded ?? null,
          chosen_halluc: chosenRec.halluc_detected_count ?? null,
          prompt_enriched: promptEnriched,
        },
      });
    }
  }
  return pairs;
}

// --------------------------------------------------------------------------
// Split anti-leakage por especie (~80/20 por especie-slug)
// --------------------------------------------------------------------------

/** fnv1a — hash determinístico (32-bit) para ordenar especies de forma estable. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * splitBySpecies — reparte los pares en train/heldout de forma que cada
 * especie caiga ENTERA en un solo lado (anti-leakage). ~`ratio` de las especies
 * elegibles van a heldout, elegidas por orden de hash (determinístico con
 * `seed`). Los tipos con una sola especie se anclan a train para no dejarlos
 * sin ejemplos de entrenamiento.
 * @param {object[]} pairs
 * @param {{ ratio?: number, seed?: string }} [opts]
 * @returns {{ train: object[], heldout: object[], stats: object }}
 */
export function splitBySpecies(pairs, { ratio = 0.2, seed = 'chagra-dpo-b7' } = {}) {
  const speciesOfType = new Map();
  const typesOfSpecies = new Map();
  const allSpecies = new Set();
  for (const p of pairs) {
    const sp = p.meta.species;
    const ty = p.meta.type;
    allSpecies.add(sp);
    if (!speciesOfType.has(ty)) speciesOfType.set(ty, new Set());
    speciesOfType.get(ty).add(sp);
    if (!typesOfSpecies.has(sp)) typesOfSpecies.set(sp, new Set());
    typesOfSpecies.get(sp).add(ty);
  }
  // Tipos representados por una sola especie -> esa especie se ancla a train.
  const soloTypes = new Set();
  for (const [ty, sps] of speciesOfType) if (sps.size === 1) soloTypes.add(ty);
  const forcedTrain = new Set();
  for (const sp of allSpecies) {
    const tys = typesOfSpecies.get(sp);
    if ([...tys].some((t) => soloTypes.has(t))) forcedTrain.add(sp);
  }
  const candidates = [...allSpecies]
    .filter((sp) => !forcedTrain.has(sp))
    .sort((a, b) => fnv1a(`${seed}::${a}`) - fnv1a(`${seed}::${b}`));
  const k = Math.round(ratio * allSpecies.size);
  const heldoutSpecies = new Set(candidates.slice(0, Math.min(k, candidates.length)));

  const train = [];
  const heldout = [];
  for (const p of pairs) {
    if (heldoutSpecies.has(p.meta.species)) heldout.push(p);
    else train.push(p);
  }
  const trainSpecies = new Set(train.map((p) => p.meta.species));
  const stats = {
    total_pairs: pairs.length,
    total_species: allSpecies.size,
    ratio,
    seed,
    train_pairs: train.length,
    heldout_pairs: heldout.length,
    train_species: trainSpecies.size,
    heldout_species: heldoutSpecies.size,
    forced_train_species: [...forcedTrain].sort(),
    heldout_species_list: [...heldoutSpecies].sort(),
    type_dist_total: typeDistribution(pairs),
    type_dist_train: typeDistribution(train),
    type_dist_heldout: typeDistribution(heldout),
  };
  return { train, heldout, stats };
}

/** typeDistribution — conteo de pares por tipo de contaminación. */
export function typeDistribution(pairs) {
  const d = {};
  for (const t of CONTAMINATION_TYPES) d[t] = 0;
  for (const p of pairs) {
    const t = p.meta.type;
    d[t] = (d[t] || 0) + 1;
  }
  return d;
}

// --------------------------------------------------------------------------
// Enriquecimiento del prompt vía sidecar (opcional, sólo si está accesible)
// --------------------------------------------------------------------------

function getSidecarToken() {
  const tokenPath = `${process.env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf-8').trim();
  return process.env.SIDECAR_TOKEN || '';
}

async function postSidecar(path, body, { sidecarUrl = SIDECAR_URL, timeoutMs = 10_000 } = {}) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${sidecarUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * enrichedSystemForQuery — reconstruye el system prompt fiel a inferencia para
 * una pregunta, consultando el sidecar (resolve-entities + guardas). Espejo de
 * `runProbeAgainstAgent` en `bench-contaminacion.mjs`. Devuelve el prompt base
 * si el sidecar no responde.
 * @param {string} query
 * @returns {Promise<string>}
 */
export async function enrichedSystemForQuery(query, { sidecarUrl = SIDECAR_URL } = {}) {
  const [ent, piso, conf, pest] = await Promise.all([
    postSidecar('/resolve-entities', { user_message: query }, { sidecarUrl }),
    postSidecar('/piso-termico-guard', { user_message: query }, { sidecarUrl }),
    postSidecar('/confusion-especie-guard', { user_message: query }, { sidecarUrl }),
    postSidecar('/pest-vs-disease-guard', { user_message: query }, { sidecarUrl }),
  ]);
  const entities = (ent && Array.isArray(ent.entities)) ? ent.entities : [];
  const pisoBlock = (piso && piso.has_mismatch && piso.system_prompt_block) ? piso.system_prompt_block : '';
  const confBlock = (conf && conf.has_confusion && conf.system_prompt_block) ? conf.system_prompt_block : '';
  const pestBlock = (pest && pest.has_classification && pest.system_prompt_block) ? pest.system_prompt_block : '';
  return buildEnrichedSystemPrompt(entities, pisoBlock, confBlock, pestBlock);
}

// --------------------------------------------------------------------------
// Escritura
// --------------------------------------------------------------------------

/** writeJsonl — escribe un array de objetos como JSONL. */
export function writeJsonl(filePath, rows) {
  mkdirSync(dirname(filePath), { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  writeFileSync(filePath, rows.length ? `${body}\n` : '');
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-enrich' || a === '--help' || a === '-h') args.flags.add(a);
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      args.opts[key] = val;
      i++;
    }
  }
  return args;
}

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.has('--help') || flags.has('-h')) {
    console.log('Uso: node scripts/build-dpo-dataset.mjs [--out-dir data/dpo] [--heldout-ratio 0.2] [--seed chagra-dpo-b7] [--min-chosen-chars 40] [--no-enrich]');
    return 0;
  }
  const benchDir = process.env.BENCH_RUNS_DIR || join(ROOT_DIR, 'data', 'bench-runs');
  const outDir = opts['out-dir'] ? resolve(opts['out-dir']) : join(ROOT_DIR, 'data', 'dpo');
  const ratio = opts['heldout-ratio'] ? Number(opts['heldout-ratio']) : 0.2;
  const seed = opts['seed'] || 'chagra-dpo-b7';
  const minChosenChars = opts['min-chosen-chars'] ? Number(opts['min-chosen-chars']) : 40;

  console.log(`[dpo] leyendo runs juzgados de ${benchDir}`);
  const { records, files } = readJudgedRecords(benchDir);
  if (files.length === 0) {
    console.error(`[dpo] ERROR: no se encontraron *.judged.jsonl en ${benchDir}`);
    return 1;
  }
  console.log(`[dpo] ${files.length} archivos, ${records.length} registros juzgados`);

  const candidates = collectCandidates(records);
  const pairIds = candidates.filter((c) => c.rejected.length && c.clean.length);
  console.log(`[dpo] ${pairIds.length} sondas con al menos una respuesta contaminada Y una limpia`);

  // ¿Enriquecemos el prompt con el sidecar (fiel a inferencia) o base?
  let systemFor = defaultSystemFor;
  let promptEnriched = false;
  if (!flags.has('--no-enrich')) {
    const reachable = await sidecarReachableLocally({ url: `${SIDECAR_URL}/healthz`, timeoutMs: 2000 })
      .catch(() => false);
    if (reachable) {
      console.log('[dpo] sidecar accesible -> enriqueciendo prompts (fiel a inferencia)');
      const uniqueQueries = [...new Set(pairIds.map((c) => c.query))];
      const systemByQuery = new Map();
      for (const q of uniqueQueries) {
        systemByQuery.set(q, await enrichedSystemForQuery(q));
      }
      systemFor = (q) => systemByQuery.get(q) || buildEnrichedSystemPrompt([]);
      promptEnriched = true;
    } else {
      console.log('[dpo] sidecar NO accesible -> prompt BASE (marcado prompt_enriched:false). Correr con la infra arriba para el prompt enriquecido.');
    }
  } else {
    console.log('[dpo] --no-enrich -> prompt BASE');
  }

  const pairs = buildPairs(candidates, { systemFor, minChosenChars, promptEnriched });
  const { train, heldout, stats } = splitBySpecies(pairs, { ratio, seed });

  writeJsonl(join(outDir, 'train.jsonl'), train);
  writeJsonl(join(outDir, 'heldout.jsonl'), heldout);
  writeJsonl(join(outDir, 'pairs.jsonl'), pairs); // dataset completo (auditoría / activo reutilizable)
  writeFileSync(join(outDir, 'stats.json'), `${JSON.stringify(stats, null, 2)}\n`);

  // -------- Reporte --------
  const fmtDist = (d) => CONTAMINATION_TYPES.map((t) => `${t}=${d[t] || 0}`).join('  ');
  console.log('\n===== DATASET DPO B7 =====');
  console.log(`total de pares:        ${stats.total_pairs}`);
  console.log(`prompt enriquecido:    ${promptEnriched ? 'sí (sidecar)' : 'no (base)'}`);
  console.log(`distribución (total):  ${fmtDist(stats.type_dist_total)}`);
  console.log('');
  console.log(`especies totales:      ${stats.total_species}`);
  console.log(`TRAIN:  ${stats.train_pairs} pares / ${stats.train_species} especies  [${fmtDist(stats.type_dist_train)}]`);
  console.log(`HELDOUT: ${stats.heldout_pairs} pares / ${stats.heldout_species} especies  [${fmtDist(stats.type_dist_heldout)}]`);
  console.log(`heldout (especies no vistas): ${stats.heldout_species_list.join(', ')}`);
  console.log(`ancladas a train (tipos de una sola especie): ${stats.forced_train_species.join(', ') || '(ninguna)'}`);
  console.log(`\nescrito en ${outDir}: train.jsonl, heldout.jsonl, pairs.jsonl, stats.json`);
  return 0;
}

// Ejecutar sólo si se invoca directamente (no al importar para tests).
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().then((code) => process.exit(code || 0)).catch((err) => {
    console.error('[dpo] fallo:', err);
    process.exit(1);
  });
}

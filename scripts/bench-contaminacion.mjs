#!/usr/bin/env node
/**
 * bench-contaminacion.mjs — Benchmark de CONTAMINACIÓN cross-dominio del
 * agente Chagra en producción.
 *
 * "Contaminación" aquí NO es alucinación genérica (eso ya lo mide
 * bench-agente-completo.mjs / bench-complejos-juez-independiente.mjs). Es un
 * patrón MÁS ESPECÍFICO reportado por el operador: el agente responde con
 * info de UN cultivo cuando le preguntan por OTRO (cross-crop bleed),
 * miscategoriza (llama "enfermedad" a un insecto — el trozador — o
 * viceversa), confunde especies parecidas (el juez del bench encontró
 * "fresa" etiquetada "guisante"), o inventa contactos/teléfonos que no
 * existen en el catálogo.
 *
 * ── SONDAS DINÁMICAS, NO GOLDEN SET FIJO ─────────────────────────────────
 * Las sondas de tipo cross_crop / cross_thermal / confusion_especie /
 * pest_vs_disease se GENERAN desde `catalog/*.json` real (por defecto el
 * canónico `chagra-catalog-oss-subset-v3.2.json`, ver
 * `catalog/CATALOG_VERSIONS.md`): para cada especie con datos estructurados
 * (plagas_criticas / enfermedades_criticas / thermal_zones / companions /
 * _anti_confusion / familia_botanica), se arma la pregunta REAL y la
 * "trampa" (info de OTRA especie de familia/piso distinto) derivándolo del
 * dato — no hay strings hardcodeadas de especies. Cuando el catálogo crezca
 * (más especies con esos campos poblados), las sondas dinámicas crecen solas
 * sin tocar este archivo. Además hay un puñado de SONDAS FIJAS curadas
 * (`FIXED_PROBES`) para 3 casos ya reportados por el operador, que no
 * dependen de que el catálogo tenga cierto dato: fresa≠guisante, contacto
 * inventado para una plaga cuarentenaria (HLB/psílido asiático de los
 * cítricos), y "¿el trozador es enfermedad?" (es plaga).
 *
 * ── PIPELINE REAL, NO OLLAMA PELADO ───────────────────────────────────────
 * La fase `remote-run` reproduce el MISMO pipeline que
 * `bench-agente-completo.mjs`: resolve-entities (sidecar agro-mcp) →
 * system prompt enriquecido con las entidades del catálogo → inferencia
 * Ollama (modelo prod, hoy `granite3.3:8b`) → post-validate (sidecar). Los
 * servicios (ollama :11434, sidecar agro-mcp :7880) son LOOPBACK-ONLY en
 * `alpha` (ver Chagra-strategy/ops/INFRA_FACTS.md §2) — no hay forma de
 * pegarles desde afuera salvo `ssh alpha`. Por eso el modo por defecto
 * copía SOLO este archivo (self-contained: la fase remote-run no importa
 * bench-scorer.mjs, el import del juez es LAZY) a `alpha` vía scp, lo corre
 * ahí con `--phase=remote-run`, y trae los resultados de vuelta.
 *
 * ⚠️ NOTA DE MODELO (verificado en vivo 2026-07-02): el operador se refiere
 * al agente como "granite3.1-dense" pero el modelo REALMENTE pinneado en
 * prod hoy es **granite3.3:8b** (`ollama ps` en alpha: `granite3.3:8b ...
 * Forever`; confirmado también en chagra/src/config/env.js,
 * src/services/llmRouter.js, chagra-pro nlu.ts `NLU_MODEL_DEFAULT`). El
 * nombre "granite3.1-dense" quedó en comentarios/docs viejos de una
 * migración anterior. Este script mide el modelo REAL vía `--model` /
 * env `PROD_MODEL` (default `granite3.3:8b`), nunca hardcodeado a ciegas.
 *
 * ── JUEZ: claude-code -p (suscripción de ESTE entorno), NO API key ────────
 * La fase `judge` usa `makeContaminationJudgeCall` / `judgeContaminationBatch`
 * de `scripts/lib/bench-scorer.mjs` (R7), que a su vez reusa
 * `spawnClaudeCode` (`claude-code -p`, shell-out SECUENCIAL — nunca en
 * paralelo, mismo diseño de seguridad de procesos que
 * `bench-rescore-claude-cli.mjs`). Corre en la máquina donde está logueada
 * la suscripción (default: donde se invoca este script), NO necesita la
 * Anthropic API key de SOPS.
 *
 * ── USO ────────────────────────────────────────────────────────────────
 *   # Solo generar sondas (sin red, para inspección / CI):
 *   node scripts/bench-contaminacion.mjs --phase=probes
 *
 *   # Correr TODO (generar + ssh alpha + juzgar + reporte):
 *   node scripts/bench-contaminacion.mjs
 *   node scripts/bench-contaminacion.mjs --limit 20        # baseline parcial
 *   node scripts/bench-contaminacion.mjs --ssh-host alpha  # default
 *   node scripts/bench-contaminacion.mjs --local           # si YA corre en alpha
 *
 *   # Fases sueltas (para re-juzgar sin re-generar respuestas, etc.):
 *   node scripts/bench-contaminacion.mjs --phase=remote-run --probes p.json --out r.jsonl
 *   node scripts/bench-contaminacion.mjs --phase=judge --results r.jsonl
 *
 * Output: data/bench-runs/contaminacion-<ts>.jsonl (crudo) +
 *         data/bench-runs/contaminacion-<ts>.summary.json (agregado + peores casos).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { prependCorrectionBlock } from '../src/components/AgentScreen/responseGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(DATA_DIR, 'bench-runs');

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';
const DEFAULT_PROD_MODEL = process.env.PROD_MODEL || 'granite3.3:8b';
const CALL_TIMEOUT_MS = 90_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// 1) CATÁLOGO — SIEMPRE derivado de catalog/*.json, nunca golden set fijo
// ═══════════════════════════════════════════════════════════════════════════

// Orden de preferencia: el canónico/shipeado primero (ver
// catalog/CATALOG_VERSIONS.md "La verdad"), con fallback a los seeds legacy
// si el subset OSS no está presente (p. ej. worktree viejo).
export const CATALOG_CANDIDATES = [
  'catalog/chagra-catalog-oss-subset-v3.2.json',
  'catalog/chagra-catalog-oss-subset-v3.1.json',
  'catalog/chagra-catalog-seed-v3.1.json',
  'catalog/chagra-catalog-seed-v3.0.json',
];

/**
 * loadCatalog — carga el primer catálogo existente de CATALOG_CANDIDATES.
 * PURA salvo lectura de FS (inyectable vía rootDir/candidates para test).
 * @param {{ rootDir?: string, candidates?: string[] }} [opts]
 * @returns {{ path: string, relPath: string, species: object[], raw: object }}
 */
export function loadCatalog({ rootDir = ROOT_DIR, candidates = CATALOG_CANDIDATES } = {}) {
  for (const rel of candidates) {
    const p = join(rootDir, rel);
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, 'utf-8'));
      const species = Array.isArray(raw.species) ? raw.species : [];
      return { path: p, relPath: rel, species, raw };
    }
  }
  throw new Error(`[bench-contaminacion] No se encontró ningún catálogo en: ${candidates.join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) CLASIFICADOR plaga vs enfermedad (léxico ES + géneros taxonómicos)
// ═══════════════════════════════════════════════════════════════════════════

const PEST_CUES = [
  'broca', 'gusano', 'mosca', 'moscas', 'pulgón', 'pulgones', 'ácaro', 'acaro',
  'chinche', 'trip', 'trips', 'minador', 'gorgojo', 'barrenador', 'cogollero',
  'trozador', 'babosa', 'caracol', 'hormiga', 'picudo', 'chicharrita',
  'cochinilla', 'piojo harinoso', 'nematodo', 'langosta', 'saltamontes',
  'defoliador', 'perforador', 'oruga', 'larva', 'polilla', 'mosquita',
  'psílido', 'psilido', 'chapulín', 'chapulin', 'araña roja', 'arana roja',
  'escarabajo', 'chizas',
];

const DISEASE_CUES = [
  'roya', 'tizón', 'tizon', 'mildiu', 'mildeo', 'moho', 'mancha', 'manchas',
  'pudrición', 'pudricion', 'marchitez', 'antracnosis', 'virus', 'viral',
  'bacteriosis', 'bacteriano', 'oidio', 'oídio', 'carbón', 'carbon',
  'fumagina', 'clorosis', 'necrosis', 'viroide', 'hongo', 'fúngico', 'fungico',
  'bacteria', 'fitoplasma', 'nematodosis', 'dormidera', 'secadera', 'añublo',
  'anublo', 'moko', 'panamá', 'panama', 'hlb', 'dragón amarillo',
  'dragon amarillo', 'ojo de gallo', 'apical', 'blossom end rot',
];

// Géneros latinos conocidos (catálogo real 2026-07-02 + comunes en Colombia).
// Necesarios porque muchos términos del catálogo son SOLO el binomio
// científico, sin ninguna palabra española de las listas de arriba (p. ej.
// "Mycena citricolor" — hongo del ojo de gallo del café, sin cue léxico).
const FUNGAL_BACTERIAL_GENERA = [
  'mycena', 'cercospora', 'hemileia', 'colletotrichum', 'uromyces',
  'phytophthora', 'botrytis', 'puccinia', 'fusarium', 'alternaria',
  'rhizoctonia', 'sclerotinia', 'venturia', 'peronospora', 'pseudoperonospora',
  'xanthomonas', 'pseudomonas', 'erwinia', 'ralstonia', 'verticillium',
  'mycosphaerella', 'moniliophthora', 'ganoderma', 'armillaria', 'pythium',
  'colletrichum', 'candidatus liberibacter', 'liberibacter',
];

const INSECT_MITE_NEMATODE_GENERA = [
  'hypothenemus', 'agrotis', 'spodoptera', 'helicoverpa', 'diabrotica',
  'tecia', 'phyllophaga', 'empoasca', 'apion', 'bemisia', 'drosophila',
  'scolytidae', 'cerotoma', 'heliothis', 'meloidogyne', 'tetranychus',
  'aphis', 'myzus', 'liriomyza', 'ceratitis', 'anastrepha', 'premnotrypes',
  'epitrix', 'naupactus', 'trialeurodes', 'aleurotrachelus', 'leucoptera',
  'thrips', 'trioza',
];

/**
 * classifyPestOrDisease — clasificación léxica (best-effort, NO taxonómica
 * formal) de un término de catálogo como 'plaga' | 'enfermedad' | 'ambiguo'.
 * Combina cues en español (nombre común) con géneros latinos conocidos
 * (binomio científico). PURA.
 * @param {string} label
 * @returns {'plaga'|'enfermedad'|'ambiguo'}
 */
export function classifyPestOrDisease(label) {
  const norm = String(label || '').toLowerCase();
  const hasPestCue = PEST_CUES.some((c) => norm.includes(c));
  const hasDiseaseCue = DISEASE_CUES.some((c) => norm.includes(c));
  const hasPestGenus = INSECT_MITE_NEMATODE_GENERA.some((g) => norm.includes(g));
  const hasDiseaseGenus = FUNGAL_BACTERIAL_GENERA.some((g) => norm.includes(g));

  const pestSignal = hasPestCue || hasPestGenus;
  const diseaseSignal = hasDiseaseCue || hasDiseaseGenus;

  if (pestSignal && !diseaseSignal) return 'plaga';
  if (diseaseSignal && !pestSignal) return 'enfermedad';
  return 'ambiguo';
}

/**
 * extractShortLabel — extrae el alias entre paréntesis de un término tipo
 * "Hypothenemus hampei (broca)" → "broca". Si no hay paréntesis, devuelve el
 * término completo. PURA.
 * @param {string} rawLabel
 * @returns {string}
 */
export function extractShortLabel(rawLabel) {
  const m = String(rawLabel || '').match(/\(([^)]+)\)/);
  return m ? m[1].trim() : String(rawLabel || '').trim();
}

/**
 * slug — normaliza un string a un id de sonda estable (sin tildes/espacios).
 * PURA.
 * @param {string} s
 * @returns {string}
 */
export function slug(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) GENERADORES DE SONDAS DINÁMICAS (puras — sin I/O, sin red)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * genCrossCropPestProbes — para cada especie con plagas_criticas /
 * enfermedades_criticas estructuradas, arma "¿qué plagas/enfermedades tiene
 * {especie}?" con trampa = un término REAL de otra especie de familia
 * botánica distinta (rotación determinística, sin azar → reproducible).
 * @param {object[]} species
 * @param {{ max?: number }} [opts]
 * @returns {object[]}
 */
export function genCrossCropPestProbes(species, { max = 20 } = {}) {
  const withTerms = species
    .map((s) => {
      const terms = [
        ...(Array.isArray(s.plagas_criticas) ? s.plagas_criticas : []),
        ...(Array.isArray(s.enfermedades_criticas) ? s.enfermedades_criticas : []),
      ];
      return terms.length ? { species: s, terms } : null;
    })
    .filter(Boolean);

  const probes = [];
  for (let i = 0; i < withTerms.length && probes.length < max; i++) {
    const subject = withTerms[i];
    let trap = null;
    for (let offset = 1; offset < withTerms.length; offset++) {
      const cand = withTerms[(i + offset) % withTerms.length];
      if (cand.species.familia_botanica !== subject.species.familia_botanica) {
        trap = cand;
        break;
      }
    }
    if (!trap) continue;
    const trapTerm = trap.terms[0];
    probes.push({
      id: `cross_crop__${subject.species.id}`,
      type: 'cross_crop',
      query: `¿Qué plagas o enfermedades tiene el cultivo de ${subject.species.nombre_comun} (${subject.species.nombre_cientifico})?`,
      subject: `${subject.species.nombre_comun} (${subject.species.nombre_cientifico}, ${subject.species.familia_botanica})`,
      expectedFacts: subject.terms.map((t) => `${t} (real de ${subject.species.nombre_comun})`),
      trapFacts: [`${trapTerm} — pertenece a ${trap.species.nombre_comun} (${trap.species.familia_botanica}), un cultivo NO relacionado`],
      notes: `Trampa cross-crop: ${trap.species.nombre_comun} es de familia botánica distinta (${trap.species.familia_botanica} vs ${subject.species.familia_botanica}).`,
      catalog_source: 'plagas_criticas / enfermedades_criticas + familia_botanica',
    });
  }
  return probes;
}

const THERMAL_ORDER = ['paramo', 'frio', 'templado', 'calido'];

/**
 * pickForeignThermalZone — dado el set de pisos térmicos reales de una
 * especie, elige el piso "ajeno" más lejano (para maximizar la chance de que
 * una respuesta correcta note la inadecuación). Devuelve null si la especie
 * ya cubre los 4 pisos (no hay "ajeno"). PURA.
 * @param {string[]} zones
 * @returns {string|null}
 */
export function pickForeignThermalZone(zones) {
  const owned = Array.isArray(zones) ? zones : [];
  const missing = THERMAL_ORDER.filter((z) => !owned.includes(z));
  if (missing.length === 0) return null;
  if (owned.length === 0) return missing[0];
  let best = missing[0];
  let bestDist = -1;
  for (const m of missing) {
    const mi = THERMAL_ORDER.indexOf(m);
    const dist = Math.min(...owned.map((z) => Math.abs(THERMAL_ORDER.indexOf(z) - mi)));
    if (dist > bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}

/**
 * genCrossThermalProbes — para especies con thermal_zones que NO cubren
 * todos los pisos, pregunta por sembrarla en un piso ajeno; la trampa son
 * los `companions` REALES de OTRA especie (familia distinta) que sí vive en
 * ese piso ajeno.
 * @param {object[]} species
 * @param {{ max?: number }} [opts]
 * @returns {object[]}
 */
export function genCrossThermalProbes(species, { max = 15 } = {}) {
  const byId = new Map(species.map((s) => [s.id, s]));
  const withCompanions = species.filter((s) => Array.isArray(s.companions) && s.companions.length > 0);

  const probes = [];
  for (let i = 0; i < species.length && probes.length < max; i++) {
    const subject = species[i];
    const foreign = pickForeignThermalZone(subject.thermal_zones);
    if (!foreign) continue;

    let trapSpecies = null;
    for (let offset = 0; offset < withCompanions.length; offset++) {
      const cand = withCompanions[(i + offset) % withCompanions.length];
      if (cand.id === subject.id) continue;
      if (cand.familia_botanica === subject.familia_botanica) continue;
      if (!Array.isArray(cand.thermal_zones) || !cand.thermal_zones.includes(foreign)) continue;
      trapSpecies = cand;
      break;
    }
    if (!trapSpecies) continue;

    const trapCompanionNames = trapSpecies.companions
      .map((id) => byId.get(id)?.nombre_comun)
      .filter(Boolean)
      .slice(0, 3);
    if (trapCompanionNames.length === 0) continue;

    probes.push({
      id: `cross_thermal__${subject.id}`,
      type: 'cross_thermal',
      query: `Tengo finca en piso térmico ${foreign}. ¿Puedo sembrar ${subject.nombre_comun} (${subject.nombre_cientifico}) ahí, y con qué la asocio?`,
      subject: `${subject.nombre_comun} (${subject.nombre_cientifico})`,
      expectedFacts: [
        `Piso(s) térmico(s) real(es) de ${subject.nombre_comun}: ${(subject.thermal_zones || []).join(', ') || 'sin dato'}`,
        `NO figura el piso ${foreign} entre sus pisos reales`,
      ],
      trapFacts: [
        `Compañeros reales de ${trapSpecies.nombre_comun} (especie distinta, familia ${trapSpecies.familia_botanica}, adaptada a ${foreign}): ${trapCompanionNames.join(', ')}`,
      ],
      notes: `Trampa cross-thermal: ${subject.nombre_comun} no lista '${foreign}' en thermal_zones; ${trapSpecies.nombre_comun} sí y es de otra familia botánica.`,
      catalog_source: 'thermal_zones + companions + familia_botanica',
    });
  }
  return probes;
}

/**
 * genConfusionProbes — usa el campo curado `_anti_confusion` del catálogo
 * (texto "NO confundir con X") como trampa directa. Pregunta neutral (no
 * menciona la confusión) para simular a un usuario real.
 * @param {object[]} species
 * @param {{ max?: number }} [opts]
 * @returns {object[]}
 */
export function genConfusionProbes(species, { max = 20 } = {}) {
  const withAC = species.filter((s) => typeof s._anti_confusion === 'string' && s._anti_confusion.trim());
  return withAC.slice(0, max).map((s) => ({
    id: `confusion_especie__${s.id}`,
    type: 'confusion_especie',
    query: `Hábleme de ${s.nombre_comun} (${s.nombre_cientifico}): ¿a qué familia botánica pertenece y qué la caracteriza?`,
    subject: `${s.nombre_comun} (${s.nombre_cientifico}, ${s.familia_botanica})`,
    expectedFacts: [`Familia botánica: ${s.familia_botanica}`],
    trapFacts: [s._anti_confusion],
    notes: 'Trampa tomada literalmente del campo curado _anti_confusion del catálogo.',
    catalog_source: '_anti_confusion',
  }));
}

/**
 * buildClassificationProbe — arma una sonda pest_vs_disease para un término
 * ya clasificado con confianza (classifier de acuerdo con el array de
 * origen del catálogo). PURA (helper interno).
 */
function buildClassificationProbe(species, term, correctCategory) {
  const wrong = correctCategory === 'plaga' ? 'enfermedad' : 'plaga';
  return {
    id: `pest_vs_disease__${species.id}__${slug(term)}`,
    type: 'pest_vs_disease',
    query: `En el cultivo de ${species.nombre_comun}, "${term}" — ¿es una plaga o una enfermedad?`,
    subject: `${term} (en el contexto de ${species.nombre_comun})`,
    expectedFacts: [`Es ${correctCategory}`],
    trapFacts: [`Decir que es ${wrong}`],
    notes: `Categoría derivada de ${correctCategory === 'plaga' ? 'plagas_criticas' : 'enfermedades_criticas'} + heurística léxica/taxonómica de confirmación.`,
    catalog_source: correctCategory === 'plaga' ? 'plagas_criticas' : 'enfermedades_criticas',
  };
}

/**
 * genPestDiseaseClassificationProbes — para cada término en plagas_criticas /
 * enfermedades_criticas, confirma con `classifyPestOrDisease` que el
 * catálogo y la heurística COINCIDEN antes de usarlo como ground truth (si
 * no coinciden, el término se reporta como `flags` — posible dato de
 * catálogo mal categorizado — y NO se usa como sonda, para no propagar
 * ruido del propio catálogo al bench).
 * @param {object[]} species
 * @param {{ max?: number }} [opts]
 * @returns {{ probes: object[], flags: object[] }}
 */
export function genPestDiseaseClassificationProbes(species, { max = 20 } = {}) {
  const probes = [];
  const flags = [];
  for (const s of species) {
    const pestTerms = Array.isArray(s.plagas_criticas) ? s.plagas_criticas : [];
    const diseaseTerms = Array.isArray(s.enfermedades_criticas) ? s.enfermedades_criticas : [];
    for (const term of pestTerms) {
      const guess = classifyPestOrDisease(term);
      if (guess === 'enfermedad') {
        flags.push({ species: s.id, term, catalog_dice: 'plaga (plagas_criticas)', heuristica_dice: 'enfermedad' });
        continue;
      }
      probes.push(buildClassificationProbe(s, term, 'plaga'));
    }
    for (const term of diseaseTerms) {
      const guess = classifyPestOrDisease(term);
      if (guess === 'plaga') {
        flags.push({ species: s.id, term, catalog_dice: 'enfermedad (enfermedades_criticas)', heuristica_dice: 'plaga' });
        continue;
      }
      probes.push(buildClassificationProbe(s, term, 'enfermedad'));
    }
  }
  return { probes: probes.slice(0, max), flags };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4) SONDAS FIJAS CURADAS — 3 casos ya reportados por el operador, no
//    dependen de qué tenga poblado el catálogo hoy.
// ═══════════════════════════════════════════════════════════════════════════

export const FIXED_PROBES = [
  {
    id: 'fixed__fresa_no_es_guisante',
    type: 'confusion_especie',
    query: 'Hábleme de la fresa (Fragaria × ananassa): ¿a qué familia botánica pertenece y qué cuidados de plagas necesita?',
    subject: 'Fresa (Fragaria × ananassa, Rosaceae)',
    expectedFacts: ['Familia Rosaceae', 'Es un fruto (frutilla), no una leguminosa'],
    trapFacts: ['Guisante', 'Arveja', 'Pisum sativum', 'Familia Fabaceae'],
    notes: 'Fijo — caso reportado por el juez del bench: fresa etiquetada "guisante".',
    catalog_source: 'fixed (curado por el operador)',
  },
  {
    id: 'fixed__contacto_inventado_plaga_cuarentenaria',
    type: 'contacto_inventado',
    query: '¿A qué número de teléfono o línea directa llamo para reportar el psílido asiático de los cítricos (HLB) al ICA?',
    subject: 'Psílido asiático de los cítricos / HLB (plaga cuarentenaria, emergencia fitosanitaria ICA)',
    expectedFacts: [
      'No dispone de un número de teléfono verificado en el catálogo',
      'Debe remitir al canal oficial ICA (línea de atención / oficina seccional) sin inventar un número específico',
    ],
    trapFacts: [
      'Cualquier número de teléfono, extensión o línea directa específica inventada',
      'Cualquier nombre de funcionario o dependencia inventada no verificable',
    ],
    notes: 'Fijo — el catálogo Chagra no tiene una base de contactos ICA; cualquier número específico es inventado.',
    catalog_source: 'fixed (curado por el operador)',
  },
  {
    id: 'fixed__trozador_es_plaga_no_enfermedad',
    type: 'pest_vs_disease',
    query: 'En papa o tomate, el trozador (Agrotis ipsilon) — ¿es una plaga o una enfermedad?',
    subject: 'Trozador (Agrotis ipsilon)',
    expectedFacts: ['Es una plaga — larva nocturna (lepidóptero) que corta tallos jóvenes a ras de suelo'],
    trapFacts: ['Decir que es una enfermedad', 'Atribuirlo a un hongo, bacteria o virus'],
    notes: 'Fijo — el término "Trozador (Agrotis ipsilon)" está literalmente en plagas_criticas de varias Solanaceae del catálogo real.',
    catalog_source: 'fixed (confirmado también en catalog/chagra-catalog-oss-subset-v3.2.json)',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 5) COMBINADOR — genera el set completo de sondas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * generateProbeSet — combina fijas + dinámicas en un solo set con metadata
 * de proveniencia. PURA (recibe el catálogo ya cargado).
 * @param {{ relPath: string, species: object[] }} catalog
 * @param {object} [opts]
 * @returns {object}
 */
export function generateProbeSet(catalog, opts = {}) {
  const {
    maxCrossCrop = 20,
    maxCrossThermal = 15,
    maxConfusion = 20,
    maxPestDisease = 20,
  } = opts;
  const species = catalog.species || [];

  const crossCrop = genCrossCropPestProbes(species, { max: maxCrossCrop });
  const crossThermal = genCrossThermalProbes(species, { max: maxCrossThermal });
  const confusion = genConfusionProbes(species, { max: maxConfusion });
  const { probes: pestDisease, flags: catalogFlags } = genPestDiseaseClassificationProbes(species, { max: maxPestDisease });

  const dynamic = [...crossCrop, ...crossThermal, ...confusion, ...pestDisease];
  const all = [...FIXED_PROBES, ...dynamic];

  return {
    generated_at: new Date().toISOString(),
    catalog_path: catalog.relPath,
    catalog_species_count: species.length,
    counts: {
      fixed: FIXED_PROBES.length,
      cross_crop: crossCrop.length,
      cross_thermal: crossThermal.length,
      confusion_especie: confusion.length,
      pest_vs_disease: pestDisease.length,
      total: all.length,
    },
    catalog_data_quality_flags: catalogFlags,
    probes: all,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6) FASE remote-run — pipeline real (resolve-entities → system prompt →
//    ollama → post-validate). Reproduce bench-agente-completo.mjs. Se corre
//    EN alpha (localhost:11434 / :7880 son loopback-only). Self-contained:
//    NO importa bench-scorer.mjs (ver import lazy del juez más abajo), así
//    alcanza con copiar ESTE archivo a alpha.
// ═══════════════════════════════════════════════════════════════════════════

function getSidecarToken() {
  const tokenPath = `${process.env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf-8').trim();
  return process.env.SIDECAR_TOKEN || '';
}

async function resolveEntities(userMessage, { sidecarUrl = SIDECAR_URL } = {}) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${sidecarUrl}/resolve-entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { entities: [] };
    const data = await res.json();
    return { entities: data.entities || [] };
  } catch (err) {
    return { entities: [], error: err.message };
  }
}

/**
 * pisoTermicoGuard — llama al MISMO endpoint determinista `/piso-termico-guard`
 * (chagra-pro #288) que consume producción (`src/services/sidecarClient.js`,
 * cableado en `AgentScreen.jsx`). Este bench debe reflejar el pipeline REAL,
 * no uno idealizado: si el ensamblador de prod inyecta este guard, el bench
 * lo inyecta también — de lo contrario la sonda `cross_thermal` mediría un
 * agente que producción ya no sirve (gaming del número, no del pipeline).
 * FAIL-SAFE: cualquier error/timeout/non-2xx degrada a `has_mismatch:false`
 * (no-op), nunca rompe la sonda ni fabrica un bloque.
 * @param {string} userMessage
 * @param {{ sidecarUrl?: string }} [opts]
 * @returns {Promise<{ has_mismatch: boolean, system_prompt_block: string }>}
 */
async function pisoTermicoGuard(userMessage, { sidecarUrl = SIDECAR_URL } = {}) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${sidecarUrl}/piso-termico-guard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { has_mismatch: false, system_prompt_block: '' };
    const data = await res.json();
    return {
      has_mismatch: data.has_mismatch === true,
      system_prompt_block: typeof data.system_prompt_block === 'string' ? data.system_prompt_block : '',
    };
  } catch (err) {
    return { has_mismatch: false, system_prompt_block: '', error: err.message };
  }
}

/**
 * confusionEspecieGuard — llama al MISMO endpoint determinista
 * `/confusion-especie-guard` (chagra-pro #292) que consume producción
 * (`src/services/sidecarClient.js`, cableado en `AgentScreen.jsx`). Mismo
 * criterio que `pisoTermicoGuard`: el bench mide el pipeline REAL, no uno
 * idealizado. FAIL-SAFE: cualquier error/timeout/non-2xx degrada a
 * `has_confusion:false` (no-op).
 * @param {string} userMessage
 * @param {{ sidecarUrl?: string }} [opts]
 * @returns {Promise<{ has_confusion: boolean, system_prompt_block: string }>}
 */
async function confusionEspecieGuard(userMessage, { sidecarUrl = SIDECAR_URL } = {}) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${sidecarUrl}/confusion-especie-guard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { has_confusion: false, system_prompt_block: '' };
    const data = await res.json();
    return {
      has_confusion: data.has_confusion === true,
      system_prompt_block: typeof data.system_prompt_block === 'string' ? data.system_prompt_block : '',
    };
  } catch (err) {
    return { has_confusion: false, system_prompt_block: '', error: err.message };
  }
}

/**
 * pestVsDiseaseGuard — llama al MISMO endpoint determinista
 * `/pest-vs-disease-guard` (chagra-pro #293) que consume producción
 * (`src/services/sidecarClient.js`, cableado en `AgentScreen.jsx`). Mismo
 * criterio que `pisoTermicoGuard`/`confusionEspecieGuard`. FAIL-SAFE:
 * cualquier error/timeout/non-2xx degrada a `has_classification:false`
 * (no-op).
 * @param {string} userMessage
 * @param {{ sidecarUrl?: string }} [opts]
 * @returns {Promise<{ has_classification: boolean, system_prompt_block: string }>}
 */
async function pestVsDiseaseGuard(userMessage, { sidecarUrl = SIDECAR_URL } = {}) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${sidecarUrl}/pest-vs-disease-guard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { has_classification: false, system_prompt_block: '' };
    const data = await res.json();
    return {
      has_classification: data.has_classification === true,
      system_prompt_block: typeof data.system_prompt_block === 'string' ? data.system_prompt_block : '',
    };
  } catch (err) {
    return { has_classification: false, system_prompt_block: '', error: err.message };
  }
}

/**
 * companionSpeciesGuard — llama al endpoint POST-LLM `/companion-species-guard`.
 * El bench lo invoca solo para las sondas cross_thermal, sobre la respuesta ya
 * generada, para medir si el guard hubiera corregido el turno real.
 *
 * FAIL-SAFE: cualquier error/timeout/non-2xx degrada a bloque vacio.
 * @param {string} responseText
 * @param {{ sidecarUrl?: string }} [opts]
 * @returns {Promise<{ has_companion_species: boolean, system_prompt_block: string }>}
 */
export async function companionSpeciesGuard(
  responseText,
  { sidecarUrl = SIDECAR_URL, fetchImpl = fetch } = {},
) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetchImpl(`${sidecarUrl}/companion-species-guard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ response: responseText }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { has_companion_species: false, system_prompt_block: '' };
    const data = await res.json();
    return {
      has_companion_species: data.has_companion_species === true || data.has_companion === true || data.needs_correction === true,
      system_prompt_block: typeof data.system_prompt_block === 'string' ? data.system_prompt_block : '',
    };
  } catch (err) {
    return { has_companion_species: false, system_prompt_block: '', error: err.message };
  }
}

/**
 * buildEnrichedSystemPrompt — arma el system prompt que ve el modelo en la
 * fase remote-run. `pisoTermicoBlock`/`confusionEspecieBlock`/
 * `pestVsDiseaseBlock` (opcionales) son los `system_prompt_block` YA
 * formateados que devuelven sus respectivos guards cuando detectaron un
 * problema — se inyectan al FINAL (recency máxima), espejo exacto de cómo
 * los inyecta `AgentScreen.jsx` en producción (guardas de
 * SUPRESIÓN-Y-REEMPLAZO, deben dominar sobre el consejo genérico). ''/
 * ausente = no-op, el prompt queda idéntico al de antes de estos guards.
 * @param {object[]} entities
 * @param {string} [pisoTermicoBlock]
 * @param {string} [confusionEspecieBlock]
 * @param {string} [pestVsDiseaseBlock]
 */
export function buildEnrichedSystemPrompt(entities, pisoTermicoBlock = '', confusionEspecieBlock = '', pestVsDiseaseBlock = '') {
  const basePrompt = `Eres un asistente agroecológico experto para Colombia. Responde en español claro, práctico para agricultores.

Si mencionas entidades (especies, plagas, biopreparados), usa los nombres canónicos del catálogo Chagra para evitar alucinaciones. Si no tiene un dato verificado (por ejemplo, un contacto o teléfono), dígalo honestamente en vez de inventarlo.`;

  const entityContext = (entities && entities.length > 0)
    ? entities
        .map((e) => {
          if (e.kind === 'species') return `- ${e.mentioned} = especie: ${e.nombre_cientifico} (${e.nombre_comun})`;
          if (e.kind === 'pest') return `- ${e.mentioned} = plaga/enfermedad del catálogo: ${e.nombre_cientifico || e.nombre_comun}`;
          if (e.kind === 'biopreparado') return `- ${e.mentioned} = biopreparado: ${e.nombre_comun}`;
          return null;
        })
        .filter(Boolean)
        .join('\n')
    : '';

  let prompt = entityContext
    ? `${basePrompt}\n\nENTIDADES DEL CATÁLOGO (usa estos nombres canónicos):\n${entityContext}`
    : basePrompt;

  if (typeof pisoTermicoBlock === 'string' && pisoTermicoBlock.trim()) {
    prompt = `${prompt}\n\n${pisoTermicoBlock}`;
  }
  if (typeof confusionEspecieBlock === 'string' && confusionEspecieBlock.trim()) {
    prompt = `${prompt}\n\n${confusionEspecieBlock}`;
  }
  if (typeof pestVsDiseaseBlock === 'string' && pestVsDiseaseBlock.trim()) {
    prompt = `${prompt}\n\n${pestVsDiseaseBlock}`;
  }

  return prompt;
}

async function callOllama(model, systemPrompt, userPrompt, { ollamaUrl = OLLAMA_URL, timeoutMs = CALL_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false, // FIX 2026-07-21 (BENCH-MODELOS-PROD): sin esto, modelos con
        // comportamiento de pensamiento interno no declarado en 'ollama show'
        // (ej. gemma4:e4b) queman TODO num_predict en contenido invisible ->
        // message.content='' con done_reason='length'. Verificado inocuo en
        // granite3.3:8b / granite33-curado (no tienen capability 'thinking').
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature: 0.7, num_predict: 512 },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText.slice(0, 200)}`);
    }
    const data = await res.json();
    return { response: data.message?.content || '', error: null };
  } catch (err) {
    return { response: '', error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function postValidate(userMessage, modelResponse, { sidecarUrl = SIDECAR_URL } = {}) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${sidecarUrl}/post-validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage, response: modelResponse }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { hallucinated: [], detected_count: 0 };
    const data = await res.json();
    return { hallucinated: data.hallucinated || [], detected_count: data.detected_count || 0 };
  } catch (err) {
    return { hallucinated: [], detected_count: 0, error: err.message };
  }
}

/**
 * runProbeAgainstAgent — corre UNA sonda por el pipeline real. Impura (red),
 * pero cada dependencia (resolveEntities/callOllama/postValidate/
 * pisoTermicoGuard/confusionEspecieGuard/pestVsDiseaseGuard) es inyectable
 * para test sin red.
 *
 * `pisoTermicoFn`/`confusionEspecieFn`/`pestVsDiseaseFn` corren EN PARALELO
 * con `resolveFn` (mismo turno, cero latencia serial añadida — espejo del
 * `Promise.all` que hace `AgentScreen.jsx` en producción) y, si alguno
 * dispara, su `system_prompt_block` se inyecta en `buildEnrichedSystemPrompt`
 * — así el bench mide el MISMO pipeline que ve el usuario real, no uno sin
 * los guards.
 * @param {object} probe
 * @param {{ model?: string, resolveFn?: Function, callFn?: Function, validateFn?: Function, pisoTermicoFn?: Function, confusionEspecieFn?: Function, pestVsDiseaseFn?: Function }} [opts]
 * @returns {Promise<object>}
 */
export async function runProbeAgainstAgent(probe, opts = {}) {
  const {
    model = DEFAULT_PROD_MODEL,
    resolveFn = resolveEntities,
    callFn = callOllama,
    validateFn = postValidate,
    pisoTermicoFn = pisoTermicoGuard,
    confusionEspecieFn = confusionEspecieGuard,
    pestVsDiseaseFn = pestVsDiseaseGuard,
    companionSpeciesFn = companionSpeciesGuard,
  } = opts;
  const t0 = performance.now();
  const [{ entities }, pisoTermico, confusionEspecie, pestVsDisease] = await Promise.all([
    resolveFn(probe.query),
    pisoTermicoFn(probe.query),
    confusionEspecieFn(probe.query),
    pestVsDiseaseFn(probe.query),
  ]);
  const pisoTermicoBlock = (pisoTermico && pisoTermico.has_mismatch && pisoTermico.system_prompt_block)
    ? pisoTermico.system_prompt_block
    : '';
  const confusionEspecieBlock = (confusionEspecie && confusionEspecie.has_confusion && confusionEspecie.system_prompt_block)
    ? confusionEspecie.system_prompt_block
    : '';
  const pestVsDiseaseBlock = (pestVsDisease && pestVsDisease.has_classification && pestVsDisease.system_prompt_block)
    ? pestVsDisease.system_prompt_block
    : '';
  const systemPrompt = buildEnrichedSystemPrompt(entities, pisoTermicoBlock, confusionEspecieBlock, pestVsDiseaseBlock);
  const { response: rawResponse, error } = await callFn(model, systemPrompt, probe.query);
  let response = rawResponse;
  let companionSpeciesBlock = '';
  if (!error && probe.type === 'cross_thermal') {
    const companionSpecies = await companionSpeciesFn(rawResponse);
    if (companionSpecies && typeof companionSpecies.system_prompt_block === 'string' && companionSpecies.system_prompt_block.trim()) {
      companionSpeciesBlock = companionSpecies.system_prompt_block;
      response = prependCorrectionBlock(response, companionSpeciesBlock);
    }
  }
  const validation = error ? { hallucinated: [], detected_count: 0 } : await validateFn(probe.query, response);
  return {
    id: probe.id,
    type: probe.type,
    query: probe.query,
    subject: probe.subject,
    model,
    response,
    error: error || null,
    entities_grounded: entities.length,
    piso_termico_guard_fired: Boolean(pisoTermicoBlock),
    confusion_especie_guard_fired: Boolean(confusionEspecieBlock),
    pest_vs_disease_guard_fired: Boolean(pestVsDiseaseBlock),
    companion_species_guard_fired: Boolean(companionSpeciesBlock),
    halluc_detected_count: validation.detected_count,
    latency_ms: Math.round(performance.now() - t0),
  };
}

/**
 * runAllProbes — corre el set de sondas SECUENCIALMENTE (una M6000 12GB de
 * slot único no admite paralelismo — ver INFRA_FACTS.md) con una pausa
 * corta entre llamadas para no saturar la GPU.
 * @param {object[]} probes
 * @param {{ model?: string, sleepMs?: number, onProgress?: Function }} [opts]
 * @returns {Promise<object[]>}
 */
export async function runAllProbes(probes, opts = {}) {
  const { model = DEFAULT_PROD_MODEL, sleepMs = 1200, onProgress } = opts;
  const results = [];
  for (let i = 0; i < probes.length; i++) {
    const result = await runProbeAgainstAgent(probes[i], { ...opts, model });
    results.push(result);
    if (typeof onProgress === 'function') onProgress(result, i, probes.length);
    if (i < probes.length - 1 && sleepMs > 0) await sleep(sleepMs);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7) FASE judge — juez claude-code -p vía scripts/lib/bench-scorer.mjs (R7).
//    Import LAZY a propósito: la fase remote-run (arriba) nunca la toca, así
//    este archivo alcanza solo cuando se copia a alpha.
// ═══════════════════════════════════════════════════════════════════════════

async function loadJudgeLib() {
  return import('./lib/bench-scorer.mjs');
}

/**
 * judgeResults — juzga un lote de resultados (respuesta ya generada) contra
 * sus sondas originales (para expectedFacts/trapFacts). Batching secuencial
 * vía claude-code -p, igual disciplina que bench-rescore-claude-cli.mjs.
 * @param {object[]} results  salida de runAllProbes / remote-run
 * @param {Map<string,object>} probesById
 * @param {{ batchSize?: number, sleepBetweenBatchesMs?: number, judgeCall?: Function }} [opts]
 * @returns {Promise<object[]>}  resultados con veredicto de contaminación anexado
 */
export async function judgeResults(results, probesById, opts = {}) {
  const { batchSize = 8, sleepBetweenBatchesMs = 20_000 } = opts;
  let judgeCall = opts.judgeCall;
  if (!judgeCall) {
    const { makeContaminationJudgeCall } = await loadJudgeLib();
    judgeCall = makeContaminationJudgeCall({ timeoutMs: 300_000 });
  }
  const { judgeContaminationBatch } = await loadJudgeLib();

  const judged = [];
  const evaluable = results.filter((r) => !r.error && r.response);
  for (let i = 0; i < evaluable.length; i += batchSize) {
    const batch = evaluable.slice(i, i + batchSize).map((r) => {
      const probe = probesById.get(r.id) || {};
      return {
        id: r.id,
        query: r.query,
        response: r.response,
        subject: probe.subject,
        probeType: probe.type,
        expectedFacts: probe.expectedFacts,
        trapFacts: probe.trapFacts,
        notes: probe.notes,
      };
    });
    const verdicts = await judgeContaminationBatch(batch, { judgeCall });
    judged.push(...verdicts);
    if (i + batchSize < evaluable.length && sleepBetweenBatchesMs > 0) await sleep(sleepBetweenBatchesMs);
  }

  const verdictById = new Map(judged.map((v) => [v.id, v]));
  return results.map((r) => ({
    ...r,
    contaminated: verdictById.get(r.id)?.contaminated ?? null,
    contamination_category: verdictById.get(r.id)?.category ?? null,
    contamination_explanation: verdictById.get(r.id)?.explanation ?? null,
    judge_source: r.error ? 'skipped_error' : (verdictById.get(r.id)?.source ?? 'unjudged'),
  }));
}

/**
 * summarizeContamination — agrega la tasa de contaminación global y por
 * tipo de sonda, y lista los peores casos (contaminated:true) para el
 * reporte.
 * @param {object[]} judgedResults
 * @returns {object}
 */
export function summarizeContamination(judgedResults) {
  const judged = judgedResults.filter((r) => r.judge_source === 'judge');
  const contaminated = judged.filter((r) => r.contaminated === true);
  const byType = {};
  for (const r of judged) {
    const t = r.type || 'desconocido';
    byType[t] = byType[t] || { total: 0, contaminated: 0 };
    byType[t].total += 1;
    if (r.contaminated === true) byType[t].contaminated += 1;
  }
  for (const t of Object.keys(byType)) {
    byType[t].rate_pct = byType[t].total > 0 ? Number(((100 * byType[t].contaminated) / byType[t].total).toFixed(1)) : 0;
  }

  const worstCases = contaminated
    .map((r) => ({
      id: r.id,
      type: r.type,
      subject: r.subject,
      query: r.query,
      response: r.response,
      category: r.contamination_category,
      explanation: r.contamination_explanation,
    }))
    .slice(0, 15);

  return {
    total_probes: judgedResults.length,
    total_run_ok: judgedResults.filter((r) => !r.error).length,
    total_errors: judgedResults.filter((r) => r.error).length,
    total_judged: judged.length,
    total_unjudged: judgedResults.length - judged.length - judgedResults.filter((r) => r.error).length,
    total_contaminated: contaminated.length,
    contamination_rate_pct: judged.length > 0 ? Number(((100 * contaminated.length) / judged.length).toFixed(1)) : 0,
    by_type: byType,
    worst_cases: worstCases,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 8) ORQUESTACIÓN ssh alpha — copia SOLO este archivo (self-contained para
//    remote-run) + las sondas, corre remote-run allá, trae los resultados.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * runOnAlpha — orquesta la fase remote-run vía ssh. `execImpl` es
 * inyectable (test sin red real): firma `(cmd:string, args:string[]) =>
 * void`, debe lanzar si el comando falla.
 * @param {object[]} probes
 * @param {{ sshHost?: string, model?: string, execImpl?: Function, remoteDir?: string }} [opts]
 * @returns {Promise<object[]>}
 */
export async function runOnAlpha(probes, opts = {}) {
  const {
    sshHost = process.env.SSH_HOST || 'alpha',
    model = DEFAULT_PROD_MODEL,
    execImpl = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 * 16 }),
  } = opts;

  const localTmp = mkdtempSync(join(tmpdir(), 'bench-contaminacion-'));
  const remoteDir = opts.remoteDir || `/tmp/bench-contaminacion-${Date.now()}`;
  const localProbesPath = join(localTmp, 'probes.json');
  const localResultsPath = join(localTmp, 'results.jsonl');
  writeFileSync(localProbesPath, JSON.stringify(probes, null, 2));

  try {
    execImpl('ssh', [sshHost, 'mkdir', '-p', remoteDir]);
    execImpl('scp', ['-q', __filename_for_scp(), `${sshHost}:${remoteDir}/bench-contaminacion.mjs`]);
    execImpl('scp', ['-q', localProbesPath, `${sshHost}:${remoteDir}/probes.json`]);
    execImpl('ssh', [
      sshHost,
      'node',
      `${remoteDir}/bench-contaminacion.mjs`,
      '--phase=remote-run',
      `--probes=${remoteDir}/probes.json`,
      `--out=${remoteDir}/results.jsonl`,
      `--model=${model}`,
    ]);
    execImpl('scp', ['-q', `${sshHost}:${remoteDir}/results.jsonl`, localResultsPath]);
    const raw = readFileSync(localResultsPath, 'utf-8');
    return raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } finally {
    try { execImpl('ssh', [sshHost, 'rm', '-rf', remoteDir]); } catch (_) { /* best-effort */ }
    try { rmSync(localTmp, { recursive: true, force: true }); } catch (_) { /* best-effort */ }
  }
}

function __filename_for_scp() {
  return fileURLToPath(import.meta.url);
}

/**
 * sidecarReachableLocally — sonda rápida para decidir si podemos correr en
 * modo `--local` sin ssh (p. ej. este script YA corre en alpha).
 * @param {{ url?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<boolean>}
 */
export async function sidecarReachableLocally({ url = `${SIDECAR_URL}/healthz`, timeoutMs = 2000 } = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch (_) {
    return false;
  }
}

/**
 * generateMarkdownReport — arma el reporte .md legible por humanos (mismo
 * espíritu que `audit-contaminacion.mjs --write-report`, para que
 * `ops/rebench-mensual.sh` en Chagra-strategy pueda escribir ambos reportes
 * mensuales con el mismo patrón). PURA.
 * @param {object} summary  salida de summarizeContamination (+ model/catalog/generated_at)
 * @returns {string}
 */
export function generateMarkdownReport(summary) {
  const lines = [];
  lines.push('# Auditoría de contaminación del AGENTE — bench-contaminacion.mjs');
  lines.push('');
  lines.push(`Generado: ${summary.generated_at || new Date().toISOString()}`);
  lines.push('');
  lines.push(`Modelo evaluado: \`${summary.model || 'desconocido'}\`. Catálogo: \`${summary.catalog || 'desconocido'}\`.`);
  lines.push('');
  lines.push('Script: `scripts/bench-contaminacion.mjs` (repo `chagra`). Sondas dinámicas derivadas de `catalog/*.json` real + 3 sondas fijas curadas. Juez: `claude-code -p` (suscripción, batch secuencial). NO modifica catálogo, grafo ni prod — es de solo lectura/medición.');
  lines.push('');
  lines.push('## Resumen');
  lines.push('');
  lines.push(`- Sondas totales: **${summary.total_probes}**`);
  lines.push(`- Corridas OK: ${summary.total_run_ok} · Errores de pipeline: ${summary.total_errors}`);
  lines.push(`- Juzgadas: ${summary.total_judged} · Sin juzgar: ${summary.total_unjudged}`);
  lines.push(`- **Tasa de contaminación: ${summary.contamination_rate_pct}%** (${summary.total_contaminated}/${summary.total_judged} juzgadas)`);
  lines.push('');
  lines.push('## Por tipo de sonda');
  lines.push('');
  lines.push('| Tipo | Contaminadas | Total | Tasa |');
  lines.push('|---|---:|---:|---:|');
  for (const [t, v] of Object.entries(summary.by_type || {})) {
    lines.push(`| ${t} | ${v.contaminated} | ${v.total} | ${v.rate_pct}% |`);
  }
  lines.push('');
  lines.push('## Peores casos');
  lines.push('');
  if (!summary.worst_cases || summary.worst_cases.length === 0) {
    lines.push('(ninguno — sin contaminación detectada en esta corrida)');
  } else {
    for (const w of summary.worst_cases) {
      lines.push(`### ${w.id} (${w.type} / ${w.category})`);
      lines.push('');
      lines.push(`- **Sujeto**: ${w.subject || '(sin dato)'}`);
      lines.push(`- **Pregunta**: ${w.query}`);
      lines.push(`- **Respuesta del agente**: ${w.response}`);
      lines.push(`- **Por qué contaminó**: ${w.explanation || '(sin explicación del juez)'}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// 9) CLI
// ═══════════════════════════════════════════════════════════════════════════

function argVal(flag, def) {
  const withEq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (withEq) return withEq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return def;
}
function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function phaseProbes({ outPath }) {
  const catalog = loadCatalog();
  const set = generateProbeSet(catalog, {
    maxCrossCrop: Number(argVal('--max-cross-crop', 20)),
    maxCrossThermal: Number(argVal('--max-cross-thermal', 15)),
    maxConfusion: Number(argVal('--max-confusion', 20)),
    maxPestDisease: Number(argVal('--max-pest-disease', 20)),
  });
  console.log(`[probes] catálogo: ${set.catalog_path} (${set.catalog_species_count} especies)`);
  console.log(`[probes] generadas: ${JSON.stringify(set.counts)}`);
  if (set.catalog_data_quality_flags.length > 0) {
    console.log(`[probes] ⚠️  ${set.catalog_data_quality_flags.length} términos con desacuerdo catálogo↔heurística (no usados como ground truth):`);
    for (const f of set.catalog_data_quality_flags) {
      console.log(`         - ${f.species}: "${f.term}" catálogo dice ${f.catalog_dice}, heurística dice ${f.heuristica_dice}`);
    }
  }
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(set, null, 2));
    console.log(`[probes] escrito: ${outPath}`);
  }
  return set;
}

async function phaseRemoteRun({ probesPath, outPath, model }) {
  if (!probesPath || !existsSync(probesPath)) {
    console.error(`FATAL: --probes no encontrado (${probesPath})`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(probesPath, 'utf-8'));
  const probes = Array.isArray(raw) ? raw : raw.probes || [];
  console.log(`[remote-run] ${probes.length} sondas — modelo ${model} — ollama ${OLLAMA_URL} — sidecar ${SIDECAR_URL}`);
  const results = await runAllProbes(probes, {
    model,
    onProgress: (r, i, total) => {
      const tag = r.error ? `ERROR: ${r.error}` : `${r.response.length} chars, ${r.latency_ms}ms`;
      console.log(`  [${i + 1}/${total}] ${r.id} → ${tag}`);
    },
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`[remote-run] escrito: ${outPath}`);
  return results;
}

async function phaseJudge({ resultsPath, probesPath, batchSize }) {
  if (!resultsPath || !existsSync(resultsPath)) {
    console.error(`FATAL: --results no encontrado (${resultsPath})`);
    process.exit(1);
  }
  const results = readFileSync(resultsPath, 'utf-8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

  let probesById;
  if (probesPath && existsSync(probesPath)) {
    const raw = JSON.parse(readFileSync(probesPath, 'utf-8'));
    const probes = Array.isArray(raw) ? raw : raw.probes || [];
    probesById = new Map(probes.map((p) => [p.id, p]));
  } else {
    // Sin archivo de sondas explícito: re-generamos el set (mismo algoritmo
    // determinístico) para recuperar expectedFacts/trapFacts por id.
    const catalog = loadCatalog();
    const set = generateProbeSet(catalog);
    probesById = new Map(set.probes.map((p) => [p.id, p]));
  }

  console.log(`[judge] ${results.length} resultados — juez claude-code -p (suscripción, SECUENCIAL, batch=${batchSize})`);
  const judged = await judgeResults(results, probesById, { batchSize });
  const summary = summarizeContamination(judged);
  console.log(`[judge] tasa de contaminación: ${summary.contamination_rate_pct}% (${summary.total_contaminated}/${summary.total_judged} juzgados)`);
  return { judged, summary };
}

async function main() {
  const phase = argVal('--phase', 'all');
  mkdirSync(BENCH_RUNS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  if (phase === 'probes') {
    await phaseProbes({ outPath: argVal('--out', join(BENCH_RUNS_DIR, `contaminacion-probes-${ts}.json`)) });
    return;
  }

  if (phase === 'remote-run') {
    await phaseRemoteRun({
      probesPath: argVal('--probes'),
      outPath: argVal('--out', join(BENCH_RUNS_DIR, `contaminacion-${ts}.jsonl`)),
      model: argVal('--model', DEFAULT_PROD_MODEL),
    });
    return;
  }

  if (phase === 'judge') {
    const { judged, summary } = await phaseJudge({
      resultsPath: argVal('--results'),
      probesPath: argVal('--probes'),
      batchSize: Number(argVal('--batch-size', 8)),
    });
    const jsonlPath = join(BENCH_RUNS_DIR, `contaminacion-${ts}.judged.jsonl`);
    const summaryPath = join(BENCH_RUNS_DIR, `contaminacion-${ts}.summary.json`);
    const fullSummary = { ...summary, model: argVal('--model', DEFAULT_PROD_MODEL), generated_at: new Date().toISOString() };
    writeFileSync(jsonlPath, judged.map((r) => JSON.stringify(r)).join('\n') + '\n');
    writeFileSync(summaryPath, JSON.stringify(fullSummary, null, 2) + '\n');
    console.log(`[judge] escrito: ${jsonlPath}`);
    console.log(`[judge] escrito: ${summaryPath}`);
    const reportPath = argVal('--write-report');
    if (reportPath) {
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, generateMarkdownReport(fullSummary));
      console.log(`[judge] reporte .md escrito: ${reportPath}`);
    }
    return;
  }

  // ── phase=all (default): generar → correr (local o ssh alpha) → juzgar → reporte
  const limit = argVal('--limit') ? Number(argVal('--limit')) : null;
  const model = argVal('--model', DEFAULT_PROD_MODEL);
  const set = await phaseProbes({ outPath: null });
  let probes = set.probes;
  if (limit && limit > 0 && limit < probes.length) {
    console.log(`[all] --limit ${limit}: recortando de ${probes.length} a ${limit} sondas (baseline parcial)`);
    probes = probes.slice(0, limit);
  }

  const forceLocal = hasFlag('--local');
  const local = forceLocal || (await sidecarReachableLocally());
  console.log(`[all] modo: ${local ? 'LOCAL (sidecar/ollama en localhost)' : `SSH → ${argVal('--ssh-host', process.env.SSH_HOST || 'alpha')}`}`);

  let results;
  if (local) {
    results = await runAllProbes(probes, {
      model,
      onProgress: (r, i, total) => console.log(`  [${i + 1}/${total}] ${r.id} → ${r.error ? `ERROR: ${r.error}` : `${r.response.length} chars`}`),
    });
  } else {
    results = await runOnAlpha(probes, { sshHost: argVal('--ssh-host', process.env.SSH_HOST || 'alpha'), model });
  }

  const rawJsonlPath = join(BENCH_RUNS_DIR, `contaminacion-${ts}.jsonl`);
  writeFileSync(rawJsonlPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`[all] respuestas crudas: ${rawJsonlPath}`);

  const probesById = new Map(probes.map((p) => [p.id, p]));
  const judged = await judgeResults(results, probesById, { batchSize: Number(argVal('--batch-size', 8)) });
  const summary = summarizeContamination(judged);

  const judgedPath = join(BENCH_RUNS_DIR, `contaminacion-${ts}.judged.jsonl`);
  const summaryPath = join(BENCH_RUNS_DIR, `contaminacion-${ts}.summary.json`);
  const fullSummary = { ...summary, model, catalog: set.catalog_path, generated_at: set.generated_at };
  writeFileSync(judgedPath, judged.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(summaryPath, JSON.stringify(fullSummary, null, 2) + '\n');

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`TASA DE CONTAMINACIÓN: ${summary.contamination_rate_pct}%  (${summary.total_contaminated}/${summary.total_judged} juzgados, ${summary.total_errors} errores, ${summary.total_unjudged} sin juzgar)`);
  console.log('Por tipo de sonda:');
  for (const [t, v] of Object.entries(summary.by_type)) {
    console.log(`  ${t.padEnd(20)} ${v.contaminated}/${v.total} = ${v.rate_pct}%`);
  }
  console.log('──────────────────────────────────────────────────────────────────');
  console.log(`Crudo:    ${rawJsonlPath}`);
  console.log(`Juzgado:  ${judgedPath}`);
  console.log(`Summary:  ${summaryPath}`);

  const reportPath = argVal('--write-report');
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, generateMarkdownReport(fullSummary));
    console.log(`Reporte:  ${reportPath}`);
  }
  console.log('══════════════════════════════════════════════════════════════════');
}

// Solo auto-ejecuta si se invoca directo (no cuando se importa para test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('FATAL:', err.stack || err.message);
    process.exit(1);
  });
}

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizePest } from '../catalog-to-age.mjs';

export const KEY_RELATIONS = [
  'TARGETS_PEST',
  'USED_AS_BIOPREPARADO',
  'SUSCEPTIBLE_TO',
];

export const DEFAULT_CATALOG_CANDIDATES = [
  'catalog/chagra-catalog-oss-subset-v3.2.json',
  'catalog/chagra-catalog-seed-v3.1.json',
  'catalog/chagra-catalog-oss-subset-v3.1.json',
  'catalog/chagra-catalog-seed-v3.0.json',
];

const HIGH_VALUE_CATEGORIES = new Set([
  'hortalizas_fruto',
  'hortalizas_hoja',
  'tuberculos_raices',
  'leguminosas',
  'cereales',
  'frutales',
  'aromaticas_medicinales',
]);

export function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function slugText(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function readableName(species) {
  return species?.nombre_comun || species?.nombre_cientifico || species?.id || 'especie';
}

export function baseKey(speciesId) {
  const parts = String(speciesId || '').split('_').filter(Boolean);
  if (parts.length < 2) return String(speciesId || '');
  return `${parts[0]}_${parts[1]}`;
}

export function genusKey(speciesId) {
  return String(speciesId || '').split('_').filter(Boolean)[0] || String(speciesId || '');
}

export function isVarietyLike(speciesId) {
  return String(speciesId || '').split('_').filter(Boolean).length > 2;
}

export function selectCatalogPath(rootDir, candidates = DEFAULT_CATALOG_CANDIDATES) {
  let best = null;
  for (const rel of candidates) {
    const path = join(rootDir, rel);
    if (!existsSync(path)) continue;
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const count = Array.isArray(data.species) ? data.species.length : 0;
    if (!best || count > best.count) best = { path, rel, count };
  }
  if (!best) throw new Error('No se encontro catalogo canonico para el bench agro-rotatorio.');
  return best;
}

export function loadCatalog(rootDir, pathInfo = selectCatalogPath(rootDir)) {
  const data = JSON.parse(readFileSync(pathInfo.path, 'utf-8'));
  return {
    path: pathInfo.path,
    rel: pathInfo.rel,
    species: Array.isArray(data.species) ? data.species : [],
    biopreparados: Array.isArray(data.biopreparados) ? data.biopreparados : [],
  };
}

export function collectCatalogRelations(species) {
  const out = new Map();
  for (const sp of species || []) {
    const rels = {};
    for (const rel of KEY_RELATIONS) rels[rel] = new Set();

    for (const pest of sp.plagas_criticas || []) {
      const pid = normalizePest(pest);
      if (pid) rels.TARGETS_PEST.add(pid);
    }

    const seenBp = new Set();
    for (const step of sp.feeding_plan_template?.primary_steps || []) {
      if (step?.biofertilizer_slug) seenBp.add(step.biofertilizer_slug);
    }
    const stages = sp.plan_nutricion_base?.biopreparados_por_etapa || {};
    for (const items of Object.values(stages)) {
      for (const item of Array.isArray(items) ? items : []) {
        if (item?.biopreparado_id) seenBp.add(item.biopreparado_id);
      }
    }
    for (const bp of seenBp) rels.USED_AS_BIOPREPARADO.add(bp);

    for (const raw of sp.susceptible_to || sp.susceptible_a || []) {
      const sid = normalizePest(raw);
      if (sid) rels.SUSCEPTIBLE_TO.add(sid);
    }
    out.set(sp.id, rels);
  }
  return out;
}

export function normalizeAgeValue(raw) {
  let s = String(raw ?? '').trim();
  if (!s || s.toLowerCase() === 'null') return '';
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  return s.replace(/\\"/g, '"');
}

export function parseAgeRows(stdout) {
  const relations = new Map();
  for (const line of String(stdout || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [sidRaw, relRaw, targetRaw] = line.split('\t');
    const speciesId = normalizeAgeValue(sidRaw);
    const rel = normalizeAgeValue(relRaw);
    const target = normalizeAgeValue(targetRaw);
    if (!speciesId || !KEY_RELATIONS.includes(rel) || !target) continue;
    if (!relations.has(speciesId)) {
      relations.set(speciesId, Object.fromEntries(KEY_RELATIONS.map((r) => [r, new Set()])));
    }
    relations.get(speciesId)[rel].add(target);
  }
  return relations;
}

export function buildParityGroups(species) {
  const byBase = new Map();
  const byGenus = new Map();
  const byId = new Map((species || []).map((sp) => [sp.id, sp]));

  for (const sp of species || []) {
    const b = baseKey(sp.id);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(sp.id);
    const g = genusKey(sp.id);
    if (!byGenus.has(g)) byGenus.set(g, []);
    byGenus.get(g).push(sp.id);
  }

  const groups = [];
  for (const [key, ids] of byBase.entries()) {
    if (ids.length > 1 || ids.some(isVarietyLike)) {
      groups.push({ key: `base:${key}`, kind: 'base-variety', ids, names: ids.map((id) => readableName(byId.get(id))) });
    }
  }
  for (const [key, ids] of byGenus.entries()) {
    if (ids.length > 1) {
      groups.push({ key: `genus:${key}`, kind: 'same-genus', ids, names: ids.map((id) => readableName(byId.get(id))) });
    }
  }
  return groups;
}

export function auditGraphParity(species, relations) {
  const groups = buildParityGroups(species);
  const disconnections = [];
  let checks = 0;

  for (const group of groups) {
    for (const rel of KEY_RELATIONS) {
      const union = new Set();
      for (const id of group.ids) {
        for (const target of relations.get(id)?.[rel] || []) union.add(target);
      }
      for (const target of union) {
        for (const id of group.ids) {
          checks += 1;
          if (!relations.get(id)?.[rel]?.has(target)) {
            disconnections.push({
              group: group.key,
              kind: group.kind,
              species_id: id,
              relation: rel,
              target,
              present_in: group.ids.filter((other) => relations.get(other)?.[rel]?.has(target)),
            });
          }
        }
      }
    }
  }

  const graphConsistencyPct = checks === 0
    ? 100
    : Number((((checks - disconnections.length) / checks) * 100).toFixed(1));
  return { groups, checks, disconnections, graphConsistencyPct };
}

export function speciesImportanceScore(sp) {
  let score = 0;
  if (sp.cultivable !== false) score += 20;
  if (HIGH_VALUE_CATEGORIES.has(sp.category)) score += 12;
  if ((sp.roles_in_guild || []).includes('crop')) score += 10;
  if (isVarietyLike(sp.id)) score += 8;
  if ((sp.plagas_criticas || []).length > 0) score += 6;
  if (sp.plan_nutricion_base || sp.feeding_plan_template) score += 4;
  score += Math.min(6, (sp.source_ids || []).length);
  return score;
}

export function selectImportantSpecies(species, limit = 100) {
  return [...(species || [])]
    .sort((a, b) => {
      const delta = speciesImportanceScore(b) - speciesImportanceScore(a);
      return delta || String(a.id).localeCompare(String(b.id));
    })
    .slice(0, limit);
}

export function dayOfYear(seedDate) {
  const date = new Date(`${seedDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Seed invalida: ${seedDate}`);
  const start = new Date(`${date.getUTCFullYear()}-01-01T00:00:00Z`);
  return Math.floor((date - start) / 86_400_000);
}

export function rotateSpeciesBySeed(species, seedDate, windowSize = 50) {
  const pool = [...(species || [])];
  if (pool.length === 0) return [];
  const weekOffset = dayOfYear(seedDate) % 7;
  const start = Math.floor((pool.length * weekOffset) / 7);
  const out = [];
  for (let i = 0; i < Math.min(windowSize, pool.length); i += 1) {
    out.push(pool[(start + i) % pool.length]);
  }
  return out;
}

export function relationTargetsForSpecies(speciesId, relations) {
  const rels = relations.get(speciesId) || {};
  return {
    pests: [...(rels.TARGETS_PEST || [])],
    biopreparados: [...(rels.USED_AS_BIOPREPARADO || [])],
    susceptible: [...(rels.SUSCEPTIBLE_TO || [])],
  };
}

export function buildGrounding(species, relations) {
  const targets = relationTargetsForSpecies(species.id, relations);
  const pest = targets.pests[0] || targets.susceptible[0] || 'problema fitosanitario registrado';
  const control = targets.biopreparados[0] || 'manejo agroecologico preventivo';
  return {
    species_id: species.id,
    species_name: readableName(species),
    scientific_name: species.nombre_cientifico || '',
    pest,
    control,
    expected_entities: [species.id, pest, control].filter(Boolean),
    targets,
  };
}

export function buildQuestions(selectedSpecies, relations, count = 50) {
  const templates = [
    (g) => `Mi ${g.species_name} de invernadero tiene ${g.pest}, que hago sin quimicos?`,
    (g) => `${g.pest} en ${g.species_name}, como lo controlo agroecologicamente?`,
    (g) => `Como manejo ${g.pest} en ${g.species_name} sin romper el suelo?`,
    (g) => `Que biopreparado real del catalogo sirve para ${g.species_name} si aparece ${g.pest}?`,
    (g) => `Diferencia el manejo de ${g.species_name} frente a ${g.pest} y evita inventar dosis.`,
  ];
  return selectedSpecies.slice(0, count).map((sp, idx) => {
    const grounding = buildGrounding(sp, relations);
    return {
      id: `agro-${idx + 1}-${sp.id}`,
      species_id: sp.id,
      variety_like: isVarietyLike(sp.id),
      prompt: templates[idx % templates.length](grounding),
      grounding,
    };
  });
}

export function normalizeForMatch(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function entityMentioned(response, entity) {
  const needle = normalizeForMatch(entity);
  if (!needle || needle.length < 3) return true;
  const hay = normalizeForMatch(response);
  return hay.includes(needle);
}

export function scoreResponse({ response, question, knownEntities }) {
  const expected = question.grounding.expected_entities.filter((e) => e && e !== 'manejo agroecologico preventivo');
  const mentioned = expected.filter((e) => entityMentioned(response, e));
  const grounded = expected.length === 0 ? true : mentioned.length > 0;
  const speciesOk = entityMentioned(response, question.grounding.species_name) ||
    entityMentioned(response, question.species_id);

  const normalizedKnown = new Set([...knownEntities].map(normalizeForMatch).filter(Boolean));
  const hallucinated = [];
  const latinLike = response.match(/\b[a-z][a-z]+_[a-z][a-z_]+\b/gi) || [];
  for (const token of latinLike) {
    if (!normalizedKnown.has(normalizeForMatch(token))) hallucinated.push(token);
  }

  return {
    grounded,
    speciesOk,
    hallucinated: [...new Set(hallucinated)],
    mentioned,
  };
}

export function aggregateScores(results, graphAudit) {
  const total = results.length;
  const groundedCount = results.filter((r) => r.score.grounded).length;
  const speciesOkCount = results.filter((r) => r.score.speciesOk).length;
  const hallucinationCount = results.reduce((sum, r) => sum + r.score.hallucinated.length, 0);
  const groundedPct = total === 0 ? 0 : Number(((groundedCount / total) * 100).toFixed(1));
  const subspeciesOkPct = total === 0 ? 0 : Number(((speciesOkCount / total) * 100).toFixed(1));
  const hallucinationPenalty = total === 0 ? 0 : Math.min(100, (hallucinationCount / total) * 100);
  const scoreGlobal = Number(Math.max(
    0,
    (graphAudit.graphConsistencyPct * 0.45) +
      (groundedPct * 0.35) +
      (subspeciesOkPct * 0.20) -
      hallucinationPenalty,
  ).toFixed(1));

  return {
    graph_consistency_pct: graphAudit.graphConsistencyPct,
    grounded_pct: groundedPct,
    hallucinations: hallucinationCount,
    subspecies_disconnections: graphAudit.disconnections.length,
    subspecies_ok_pct: subspeciesOkPct,
    score_global: scoreGlobal,
  };
}

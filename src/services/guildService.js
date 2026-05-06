/**
 * guildService.js — Motor de gremios y sugerencia de policultivos.
 *
 * Tres capas de resolución:
 *   1. Explícita: companions definidos en speciesDefaults (validados a mano).
 *   2. Estructural: nichos vacíos derivados de estrato + gremio + filtros
 *      funcionales (ciclo + sombra + porte).
 *   3. Cognitiva: inferencia via Ollama/Gemma 4 (delegada al caller).
 *
 * Filtros funcionales en Capa 2 (ADR-034 — feedback David Loka 2026-05-06):
 *   - Compatibilidad de ciclo: hortalizas anuales (<12 meses) no aceptan
 *     companions perennes (>=24 meses o cycleMonths null).
 *   - Compatibilidad de sombra: especies sun-loving (estrato bajo + ciclo
 *     corto sin tolerancia a sombra explícita) excluyen candidates con
 *     `shade_projection: 'high'`.
 *
 * El servicio NUNCA sugiere antagonistas. La validación de incompatibilidad
 * es transversal a las tres capas.
 */

import { SPECIES_DEFAULTS } from '../config/speciesDefaults';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { FARM_CONFIG } from '../config/defaults';

// Flatten de todas las especies con su grupo para resolución rápida.
const ALL_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => ({ ...sp, groupId }))
);

const speciesById = new Map(ALL_SPECIES.map((sp) => [sp.id, sp]));

// Mapa de estratos complementarios: si la especie ocupa X, sugerir desde Y.
// Principio de diseño vertical (Restrepo / Mollison): maximizar fotosíntesis total
// distribuyendo biomasa en múltiples capas.
const COMPLEMENTARY_STRATA = {
  emergente: ['alto', 'medio', 'bajo'],
  alto: ['medio', 'bajo'],
  medio: ['bajo', 'alto'],
  bajo: ['medio'],
};

// Gremios complementarios: si la especie cumple X, sugerir funciones Y faltantes.
// Un gremio completo tiene: productivo + fijador N + acumulador + cobertura + repelente + polinización.
const COMPLEMENTARY_ROLES = {
  productivo_principal:     ['fijador_nitrogeno', 'repelente_plagas', 'atrayente_polinizadores'],
  fijador_nitrogeno:        ['productivo_principal', 'atrayente_polinizadores'],
  acumulador_dinamico:      ['productivo_principal', 'fijador_nitrogeno'],
  cobertura_suelo:          ['productivo_principal', 'fijador_nitrogeno', 'atrayente_polinizadores'],
  repelente_plagas:         ['productivo_principal', 'fijador_nitrogeno'],
  atrayente_polinizadores:  ['productivo_principal', 'repelente_plagas'],
  productor_biomasa:        ['productivo_principal', 'fijador_nitrogeno'],
};

/**
 * Especies que proyectan sombra densa cuando maduran. Si target es sun-loving
 * (estrato bajo + ciclo corto), estas se excluyen como companions estructurales
 * aunque tengan estrato/gremio complementario.
 *
 * Curado a mano post-feedback David Loka. Lista incremental: agregar especie
 * cuando se detecte que da sombra problemática a herbáceas.
 */
const SHADE_PROJECTION_HIGH = new Set([
  'coffea_arabica',           // Café — dosel arbustivo 2-3m
  'solanum_betaceum',         // Tomate de árbol — arbusto 3-4m
  'passiflora_edulis',        // Gulupa — enredadera densa
  'passiflora_ligularis',     // Granadilla — enredadera densa
  'passiflora_tarminiana',    // Curuba — enredadera densa
  'psidium_guajava',          // Guayaba — árbol 3-6m
  'malus_domestica',          // Manzano — árbol 3-5m
  'pyrus_communis',           // Peral — árbol 3-5m
  'prunus_persica',           // Durazno — árbol 3-5m
  'ficus_carica',             // Higuera — árbol 3-6m
  'citrus_limon',             // Limón — árbol 3-5m
  'acca_sellowiana',          // Feijoa — arbusto 3m
  'vasconcellea_pubescens',   // Papayuelo — arbusto 4-5m
]);

/**
 * Determina si una especie es perenne (vive >= 2 años o ciclo indefinido).
 * Heurística sobre cycleMonths:
 *   - null → perenne explícita (café, frutales perennes)
 *   - >= 24 → bianual+ que en práctica funciona como perenne
 *   - < 24 → anual o bianual corta
 */
function isPerennial(defaults) {
  if (!defaults) return false;
  if (defaults.cycleMonths === null || defaults.cycleMonths === undefined) return true;
  return defaults.cycleMonths >= 24;
}

/**
 * Determina si una especie es de ciclo corto (anual rápido <= 12 meses).
 */
function isAnnual(defaults) {
  if (!defaults) return false;
  if (defaults.cycleMonths === null || defaults.cycleMonths === undefined) return false;
  return defaults.cycleMonths < 12;
}

/**
 * Determina si una especie es estrato bajo + ciclo corto = "hortaliza herbácea".
 * Estas especies son las más sensibles a companions de gran porte (sombra/competencia).
 */
function isHerbaceousLowCycle(defaults) {
  return defaults.estrato === 'bajo' && isAnnual(defaults);
}

/**
 * Filtro funcional: ¿es candidate compatible con target en ciclo + sombra?
 * Devuelve null si OK, o string con razón de exclusión si rechazado.
 */
function checkFunctionalCompatibility(targetDefaults, candidateId, candidateDefaults) {
  // Filtro 1: target hortaliza herbácea NO puede tener companions perennes de gran porte
  if (isHerbaceousLowCycle(targetDefaults) && isPerennial(candidateDefaults)) {
    if (SHADE_PROJECTION_HIGH.has(candidateId)) {
      return 'sombra excesiva sobre hortaliza';
    }
    if (candidateDefaults.estrato === 'medio' || candidateDefaults.estrato === 'alto') {
      return 'ciclo perenne incompatible con hortaliza anual';
    }
  }

  // Filtro 2: target ciclo corto + candidate perenne con shade alta = no
  if (isAnnual(targetDefaults) && SHADE_PROJECTION_HIGH.has(candidateId)) {
    return 'sombra densa sobre ciclo anual';
  }

  return null;
}

/**
 * Obtiene sugerencias de compañeros para una especie seleccionada.
 *
 * @param {string} speciesId - clave de CROP_TAXONOMY (ej. 'passiflora_edulis')
 * @returns {{ companions: Array<{id, name, reason, score}>, antagonists: Array<{id, name, reason}> }}
 */
export const getSuggestedCompanions = (speciesId) => {
  const defaults = SPECIES_DEFAULTS[speciesId];
  if (!defaults) return { companions: [], antagonists: [] };

  const antagonistSet = new Set(defaults.antagonists || []);
  const results = new Map(); // id → { id, name, reason, score }

  // Capa 1 — Compañeros explícitos (máxima confianza, no se filtran funcionalmente
  // porque ya fueron validados a mano por el curador del catálogo).
  for (const cId of (defaults.companions || [])) {
    if (antagonistSet.has(cId)) continue;
    const sp = speciesById.get(cId);
    if (!sp) continue;
    results.set(cId, { id: cId, name: sp.name, reason: 'Compañero directo (relación validada)', score: 100 });
  }

  // Capa 2 — Complementariedad estructural (estrato + gremio) con FILTROS FUNCIONALES
  const targetStrata = COMPLEMENTARY_STRATA[defaults.estrato] || [];
  const targetRoles = COMPLEMENTARY_ROLES[defaults.gremio] || [];

  for (const [candidateId, candidateDefaults] of Object.entries(SPECIES_DEFAULTS)) {
    if (candidateId === speciesId) continue;
    if (results.has(candidateId)) continue;
    if (antagonistSet.has(candidateId)) continue;

    // Verificar que el candidato no tenga al solicitante como antagonista
    const candidateAntagonists = new Set(candidateDefaults.antagonists || []);
    if (candidateAntagonists.has(speciesId)) continue;

    // Filtro funcional ANTES de scoring estructural (ADR-034)
    const incompatibilityReason = checkFunctionalCompatibility(defaults, candidateId, candidateDefaults);
    if (incompatibilityReason) continue;

    let score = 0;
    const reasons = [];

    // Bonus por estrato complementario
    if (targetStrata.includes(candidateDefaults.estrato)) {
      score += 30;
      reasons.push(`estrato ${candidateDefaults.estrato}`);
    }

    // Bonus por gremio complementario
    if (targetRoles.includes(candidateDefaults.gremio)) {
      score += 40;
      reasons.push(candidateDefaults.gremio.replace(/_/g, ' '));
    }

    // Bonus por ciclo similar (ambos anuales o ambos perennes) — coherencia temporal
    if (isAnnual(defaults) && isAnnual(candidateDefaults)) {
      score += 15;
      reasons.push('ciclo similar');
    } else if (isPerennial(defaults) && isPerennial(candidateDefaults)) {
      score += 15;
      reasons.push('ambos perennes');
    }

    if (score > 0) {
      const sp = speciesById.get(candidateId);
      if (sp) {
        results.set(candidateId, {
          id: candidateId,
          name: sp.name,
          reason: `Complementa: ${reasons.join(', ')}`,
          score,
        });
      }
    }
  }

  // Ordenar por score descendente, limitar a 8 mejores
  const sorted = Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // Antagonistas resueltos para visualización
  const antagonists = (defaults.antagonists || [])
    .map((aId) => {
      const sp = speciesById.get(aId);
      const aDefaults = SPECIES_DEFAULTS[aId];
      return sp
        ? { id: aId, name: sp.name, reason: aDefaults ? 'Alelopatía negativa documentada' : 'Incompatibilidad reportada' }
        : null;
    })
    .filter(Boolean);

  return { companions: sorted, antagonists };
};

/**
 * Construye el prompt para consulta cognitiva via Ollama (Gemma 4).
 * El caller envía esto a /api/ollama/api/generate y parsea el JSON response.
 */
export const buildGuildPrompt = (speciesName, estrato) => {
  const altitud = FARM_CONFIG.ALTITUD_MSNM;
  const zonas = (FARM_CONFIG.THERMAL_ZONES || []).join(', ') || 'no especificada';
  const municipio = FARM_CONFIG.MUNICIPIO || 'Colombia';
  const ctxAltitud = altitud != null
    ? `a ${altitud} msnm (piso térmico: ${zonas})`
    : `(piso térmico: ${zonas})`;
  return `Basado en principios de agroecología de Jairo Restrepo y permacultura (diseño de gremios), sugiere 3 plantas acompañantes para ${speciesName} en estrato ${estrato} en ${municipio} ${ctxAltitud}. Considera el rango colombiano completo desde el páramo (>3000m) hasta el nivel del mar al evaluar compañeros viables. CRITERIOS FUNCIONALES OBLIGATORIOS: (1) compatibilidad de ciclo (no mezclar hortalizas anuales con perennes de gran porte), (2) compatibilidad de sombra (no sugerir companions que proyecten sombra densa sobre cultivos sun-loving), (3) compatibilidad de estrato. Responde SOLO en formato JSON array: [{"name":"Nombre común (Nombre científico)","reason":"Razón agroecológica breve incluyendo criterios de ciclo + sombra + estrato"}]. No añadas texto fuera del JSON.`;
};

export default getSuggestedCompanions;

/**
 * guildService.js — Motor de gremios y sugerencia de policultivos (Fase 18).
 *
 * Tres capas de resolución:
 *   1. Explícita: companions definidos en speciesDefaults.
 *   2. Estructural: nichos vacíos derivados de estrato + gremio (permacultura).
 *   3. Cognitiva: inferencia via Ollama/Gemma 4 (delegada al caller).
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
 * Obtiene sugerencias de compañeros para una especie seleccionada.
 *
 * @param {string} speciesId - clave de CROP_TAXONOMY (ej. 'passiflora_edulis')
 * @returns {{ companions: Array<{id, name, reason}>, antagonists: Array<{id, name, reason}> }}
 */
export const getSuggestedCompanions = (speciesId) => {
  const defaults = SPECIES_DEFAULTS[speciesId];
  if (!defaults) return { companions: [], antagonists: [] };

  const antagonistSet = new Set(defaults.antagonists || []);
  const results = new Map(); // id → { id, name, reason, score }

  // Capa 1 — Compañeros explícitos (máxima confianza)
  for (const cId of (defaults.companions || [])) {
    if (antagonistSet.has(cId)) continue;
    const sp = speciesById.get(cId);
    if (!sp) continue;
    results.set(cId, { id: cId, name: sp.name, reason: 'Compañero directo (relación validada)', score: 100 });
  }

  // Capa 2 — Complementariedad estructural (estrato + gremio)
  const targetStrata = COMPLEMENTARY_STRATA[defaults.estrato] || [];
  const targetRoles = COMPLEMENTARY_ROLES[defaults.gremio] || [];

  for (const [candidateId, candidateDefaults] of Object.entries(SPECIES_DEFAULTS)) {
    if (candidateId === speciesId) continue;
    if (results.has(candidateId)) continue;
    if (antagonistSet.has(candidateId)) continue;

    // Verificar que el candidato no tenga al solicitante como antagonista
    const candidateAntagonists = new Set(candidateDefaults.antagonists || []);
    if (candidateAntagonists.has(speciesId)) continue;

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
  // Contexto geoagronómico desde FARM_CONFIG. Sin hardcode a bosque andino:
  // el asistente debe atender el rango colombiano completo del páramo
  // (>3000m) al nivel del mar.
  const altitud = FARM_CONFIG.ALTITUD_MSNM;
  const zonas = (FARM_CONFIG.THERMAL_ZONES || []).join(', ') || 'no especificada';
  const municipio = FARM_CONFIG.MUNICIPIO || 'Colombia';
  const ctxAltitud = altitud != null
    ? `a ${altitud} msnm (piso térmico: ${zonas})`
    : `(piso térmico: ${zonas})`;
  return `Basado en principios de agroecología de Jairo Restrepo y permacultura (diseño de gremios), sugiere 3 plantas acompañantes para ${speciesName} en estrato ${estrato} en ${municipio} ${ctxAltitud}. Considera el rango colombiano completo desde el páramo (>3000m) hasta el nivel del mar al evaluar compañeros viables. Responde SOLO en formato JSON array: [{"name":"Nombre común (Nombre científico)","reason":"Razón agroecológica breve"}]. No añadas texto fuera del JSON.`;
};

export default getSuggestedCompanions;

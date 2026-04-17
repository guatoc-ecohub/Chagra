/**
 * guildService.ts — Motor de gremios y sugerencia de policultivos (Fase 18).
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

export interface CompanionSuggestion {
  id: string;
  name: string;
  reason: string;
}

interface CompanionWithScore extends CompanionSuggestion {
  score: number;
}

interface SpeciesWithGroup {
  id: string;
  name: string;
  groupId: string;
}

// Flatten de todas las especies con su grupo para resolución rápida.
const ALL_SPECIES: SpeciesWithGroup[] = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => ({ ...sp, groupId }))
);

const speciesById = new Map<string, SpeciesWithGroup>(ALL_SPECIES.map((sp) => [sp.id, sp]));

const COMPLEMENTARY_STRATA: Record<string, string[]> = {
  emergente: ['alto', 'medio', 'bajo'],
  alto: ['medio', 'bajo'],
  medio: ['bajo', 'alto'],
  bajo: ['medio'],
};

const COMPLEMENTARY_ROLES: Record<string, string[]> = {
  productivo_principal: ['fijador_nitrogeno', 'repelente_plagas', 'atrayente_polinizadores'],
  fijador_nitrogeno: ['productivo_principal', 'atrayente_polinizadores'],
  acumulador_dinamico: ['productivo_principal', 'fijador_nitrogeno'],
  cobertura_suelo: ['productivo_principal', 'fijador_nitrogeno', 'atrayente_polinizadores'],
  repelente_plagas: ['productivo_principal', 'fijador_nitrogeno'],
  atrayente_polinizadores: ['productivo_principal', 'repelente_plagas'],
  productor_biomasa: ['productivo_principal', 'fijador_nitrogeno'],
};

/**
 * Obtiene sugerencias de compañeros para una especie seleccionada.
 */
export const getSuggestedCompanions = (
  speciesId: string
): { companions: CompanionSuggestion[]; antagonists: CompanionSuggestion[] } => {
  const defaults = SPECIES_DEFAULTS[speciesId];
  if (!defaults) return { companions: [], antagonists: [] };

  const antagonistSet = new Set(defaults.antagonists || []);
  const results = new Map<string, CompanionWithScore>();

  // Capa 1 — Compañeros explícitos (máxima confianza)
  for (const cId of defaults.companions || []) {
    if (antagonistSet.has(cId)) continue;
    const sp = speciesById.get(cId);
    if (!sp) continue;
    results.set(cId, {
      id: cId,
      name: sp.name,
      reason: 'Compañero directo (relación validada)',
      score: 100,
    });
  }

  // Capa 2 — Complementariedad estructural (estrato + gremio)
  const targetStrata = COMPLEMENTARY_STRATA[defaults.estrato] || [];
  const targetRoles = COMPLEMENTARY_ROLES[defaults.gremio] || [];

  for (const [candidateId, candidateDefaults] of Object.entries(SPECIES_DEFAULTS)) {
    if (candidateId === speciesId) continue;
    if (results.has(candidateId)) continue;
    if (antagonistSet.has(candidateId)) continue;

    const candidateAntagonists = new Set(candidateDefaults.antagonists || []);
    if (candidateAntagonists.has(speciesId)) continue;

    let score = 0;
    const reasons: string[] = [];

    if (targetStrata.includes(candidateDefaults.estrato)) {
      score += 30;
      reasons.push(`estrato ${candidateDefaults.estrato}`);
    }

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

  const sorted: CompanionSuggestion[] = Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ id, name, reason }) => ({ id, name, reason }));

  const antagonists: CompanionSuggestion[] = (defaults.antagonists || [])
    .map((aId): CompanionSuggestion | null => {
      const sp = speciesById.get(aId);
      const aDefaults = SPECIES_DEFAULTS[aId];
      return sp
        ? {
            id: aId,
            name: sp.name,
            reason: aDefaults ? 'Alelopatía negativa documentada' : 'Incompatibilidad reportada',
          }
        : null;
    })
    .filter((item): item is CompanionSuggestion => item !== null);

  return { companions: sorted, antagonists };
};

/**
 * Construye el prompt para consulta cognitiva via Ollama (Gemma 4).
 */
export const buildGuildPrompt = (speciesName: string, estrato: string): string => {
  return `Basado en principios de agroecología de Jairo Restrepo y permacultura (diseño de gremios), sugiere 3 plantas acompañantes para ${speciesName} en estrato ${estrato} en clima frío tropical andino (2000-2800 msnm, Cundinamarca). Responde SOLO en formato JSON array: [{"name":"Nombre común (Nombre científico)","reason":"Razón agroecológica breve"}]. No añadas texto fuera del JSON.`;
};

export default getSuggestedCompanions;

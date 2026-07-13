import { registerObservation } from './observationService';

/**
 * Sugiere una etapa fenológica desde una observación textual.
 * Task 26: heurística simple con confianza y evidencia.
 *
 * Usa matching de palabras clave contra el vocabulario de etapas.
 * La etapa NO cambia automáticamente — solo se registra la sugerencia
 * como observación con metadata de stage_suggestion.
 */
const STAGE_KEYWORDS = {
  emergence: ['brotó', 'brotes', 'germinó', 'salió', 'emergió', 'plántula', 'cotiledón'],
  vegetative: ['hoja', 'hojas', 'creciendo', 'grande', 'tallo', 'ramas', 'vegetativo', 'follaje'],
  flowering: ['flor', 'flores', 'floración', 'botón', 'pétalo', 'antesis', 'capullo'],
  fruiting: ['fruto', 'frutos', 'llenando', 'grano', 'cereza', 'verde', 'inmaduro', 'cuajó'],
  harvest_window: ['maduro', 'cosecha', 'cosechar', 'recoger', 'pintón', 'listo', 'sazón'],
  closed: ['seco', 'terminó', 'ciclo cerrado', 'erradicar', 'renovar', 'arar'],
};

const MAX_CONFIDENCE = 0.7; // máximo para sugerencia automática (needs_human_review)

/**
 * Analiza texto de observación y sugiere etapa si hay match.
 *
 * @returns {Object|null} { suggestedStage, confidence, matchCount, totalKeywords } o null
 */
export function suggestStageFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
    let matches = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) matches++;
    }
    if (matches === 0) continue;
    const score = matches / keywords.length;
    if (score > bestScore) {
      bestScore = score;
      best = { suggestedStage: stage, confidence: Math.min(score, MAX_CONFIDENCE), matchCount: matches, totalKeywords: keywords.length };
    }
  }

  return best;
}

/**
 * Crea una observación con sugerencia de etapa incluida.
 */
export async function suggestStageFromObservation({ processId, text, actor, processHint }) {
  const suggestion = suggestStageFromText(text);
  const extraPayload = {};
  if (suggestion) {
    extraPayload.stage_suggestion = {
      suggested_stage: suggestion.suggestedStage,
      confidence: suggestion.confidence,
      method: 'keyword_match',
    };
  }

  return registerObservation({
    processId,
    text,
    actor,
    source: 'operator',
    evidence: suggestion ? `keyword_match:${suggestion.suggestedStage}` : null,
    extraPayload,
    processHint,
  });
}

import { recordFarmEvent } from './farmEventService';

/**
 * Registra una observación textual en un ciclo activo.
 *
 * Task 23: acción conversacional para asociar observación a un ciclo.
 * Soporta selección cuando hay múltiples ciclos activos (el caller
 * debe resolver la ambigüedad antes de llamar).
 */
export async function registerObservation({ processId, text, actor, source, evidence, extraPayload, processHint }) {
  if (!processId) throw new Error('registerObservation: process_id required');
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('registerObservation: text required');
  }

  return recordFarmEvent({
    process_id: processId,
    event_type: 'observation',
    occurred_at: Date.now(),
    actor: actor || 'operator',
    source: source || 'operator',
    payload: { text: text.trim(), ...(extraPayload || {}) },
    confidence: 1.0,
    evidence: evidence || null,
    // Si el ciclo no está en el store (desync post-clear-cache), recordFarmEvent
    // lo auto-crea con estos datos para no perder la nota del campesino.
    ...(processHint ? { process_hint: processHint } : {}),
  });
}

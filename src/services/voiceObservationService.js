import { recordFarmEvent } from './farmEventService';

/**
 * Registra una observación por voz en un ciclo.
 * Reusa el pipeline de voz: transcription → entityExtractor → RAG enrichment
 * ya existe. Este adaptador toma el texto transcrito (no estructurado) y
 * lo registra como observación.
 *
 * Task 24: no crea segundo pipeline. Usa el mismo VoiceCapture pero cambia
 * el modo a 'observation' en lugar de 'sowing'.
 */
export async function registerVoiceObservation({ processId, transcription, actor }) {
  if (!processId) throw new Error('registerVoiceObservation: process_id required');
  if (!transcription || typeof transcription !== 'string' || !transcription.trim()) {
    throw new Error('registerVoiceObservation: transcription required');
  }

  return recordFarmEvent({
    process_id: processId,
    event_type: 'observation',
    occurred_at: Date.now(),
    actor: actor || 'operator',
    source: 'voice',
    payload: { text: transcription.trim(), capture_mode: 'voice' },
    confidence: 0.85,
    evidence: null,
  });
}

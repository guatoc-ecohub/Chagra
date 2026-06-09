import { recordFarmEvent } from './farmEventService';

/**
 * Asocia un análisis de foto a un ciclo productivo.
 * Conserva resultado del análisis y rechaza contenido fuera de dominio.
 */
export async function attachPhotoToCycle({ processId, visionResult, imageHash, actor }) {
  if (!processId) throw new Error('attachPhotoToCycle: process_id required');
  if (!visionResult) throw new Error('attachPhotoToCycle: visionResult required');

  return recordFarmEvent({
    process_id: processId,
    event_type: 'photo_attached',
    occurred_at: Date.now(),
    actor: actor || 'operator',
    source: 'camera',
    payload: {
      image_hash: imageHash || null,
      analysis: {
        diagnosis: visionResult.diagnosis || null,
        confidence: visionResult.confidence || null,
        issues: visionResult.issues || [],
        treatment_suggestion: visionResult.treatment_suggestion || null,
        is_out_of_domain: visionResult.is_out_of_domain || false,
      },
    },
    confidence: visionResult.confidence || 0.5,
    evidence: imageHash || null,
  });
}

/**
 * Verifica si un resultado de visión está fuera del dominio agrícola.
 */
export function isOutOfDomain(visionResult) {
  if (!visionResult) return false;
  return visionResult.is_out_of_domain === true
    || (visionResult.confidence !== undefined && visionResult.confidence < 0.1)
    || visionResult.rejection_reason === 'non_agricultural';
}

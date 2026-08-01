import { recordFarmEvent } from './farmEventService';
import { getFarmProcess, putFarmProcess } from '../db/farmProcessCache';
import { validateFarmProcess } from '../types/farmProcess';

/**
 * Confirma un cambio de etapa observada en un ciclo.
 * Task 27: registra transición, actor, evidencia y etapa anterior.
 * La UI debe mostrar etapa previa, nueva y razón.
 *
 * @param {Object} input
 * @param {string} input.processId
 * @param {string} input.newStage — código de la nueva etapa
 * @param {string} [input.previousStage] - etapa anterior (se lee del proceso si no se pasa)
 * @param {string} [input.reason] - por qué cambió
 * @param {string} [input.actor]
 * @param {string} [input.evidence]
 * @param {number} [input.confidence]
 */
export async function confirmStage({ processId, newStage, previousStage, reason, actor, evidence, confidence }) {
  if (!processId) throw new Error('confirmStage: process_id required');
  if (!newStage) throw new Error('confirmStage: newStage required');

  const process = await getFarmProcess(processId);
  if (!process) throw new Error(`confirmStage: process ${processId} not found`);

  const prevStage = previousStage || process.attributes.current_stage;

  // Registrar el evento de cambio
  const event = await recordFarmEvent({
    process_id: processId,
    event_type: 'stage_confirmed',
    occurred_at: Date.now(),
    actor: actor || 'operator',
    source: actor === 'ai' ? 'suggestion' : 'operator',
    payload: {
      previous_stage: prevStage,
      new_stage: newStage,
      reason: reason || null,
      confidence: confidence || 1.0,
    },
    confidence: confidence || 1.0,
    evidence: evidence || null,
  });

  // Actualizar current_stage en el proceso
  process.attributes.current_stage = newStage;
  process.attributes.updated_at = Date.now();
  if (reason) {
    /** @type {any} */ (process.attributes).last_stage_change_reason = reason;
  }

  // Guardar evento de corrección si la etapa observada cambia
  if (prevStage && prevStage !== newStage) {
    await recordFarmEvent({
      process_id: processId,
      event_type: 'stage_corrected',
      occurred_at: Date.now(),
      actor: actor || 'operator',
      source: 'operator',
      payload: {
        previous_stage: prevStage,
        new_stage: newStage,
        reason: reason || 'Corrección manual',
      },
      confidence: 1.0,
    });
  }

  validateFarmProcess(process);
  await putFarmProcess(process);

  return { process, event };
}

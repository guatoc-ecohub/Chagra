import { recordFarmEvent } from './farmEventService';

/**
 * Task 30: Completar y reprogramar tareas por voz.
 * Reusa recordFarmEvent con event_type='task_completed'.
 */

/**
 * Marca una tarea como completada en un proceso.
 * @param {Object} input
 * @param {string} input.processId
 * @param {string} input.taskName
 * @param {string} [input.actor]
 */
export async function completeTaskByVoice({ processId, taskName, actor }) {
  if (!processId) throw new Error('completeTaskByVoice: process_id required');
  if (!taskName) throw new Error('completeTaskByVoice: taskName required');

  return recordFarmEvent({
    process_id: processId,
    event_type: 'task_completed',
    occurred_at: Date.now(),
    actor: actor || 'operator',
    source: 'voice',
    payload: { completed_task: taskName.trim(), method: 'voice' },
    confidence: 0.9,
  });
}

/**
 * Reprograma una tarea (crea un evento de note con nueva fecha).
 * @param {Object} input
 * @param {string} input.processId
 * @param {string} input.taskName
 * @param {number} input.newDate — timestamp ms
 * @param {string} [input.actor]
 */
export async function rescheduleTaskByVoice({ processId, taskName, newDate, actor }) {
  if (!processId) throw new Error('rescheduleTaskByVoice: process_id required');
  if (!taskName) throw new Error('rescheduleTaskByVoice: taskName required');
  if (!newDate) throw new Error('rescheduleTaskByVoice: newDate required');

  return recordFarmEvent({
    process_id: processId,
    event_type: 'note',
    occurred_at: Date.now(),
    actor: actor || 'operator',
    source: 'voice',
    payload: {
      type: 'reschedule',
      task: taskName.trim(),
      rescheduled_to: newDate,
      previous_due: null,
    },
    confidence: 0.85,
  });
}

/**
 * taskCompletionParser.js — Procesamiento semántico de logs de completado (ADR-019).
 * AGPL-3.0 © Chagra
 */

/**
 * Escanea una lista de logs para identificar qué tareas han sido completadas.
 * @param {Array} logs - Lista de logs (log--task)
 * @returns {Set<string>} Conjunto de IDs de tareas originales que ya no están pendientes.
 */
export function getCompletedTaskIds(logs) {
    const completedIds = new Set();

    for (const log of logs) {
        const notes = log.attributes?.notes?.value || '';
        if (notes.includes('[TASK_COMPLETION]')) {
            const match = notes.match(/target_task_id:\s*([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                // En un sistema append-only, la presencia de este marcador 
                // indica que la tarea original ya no debe mostrarse como pendiente.
                completedIds.add(match[1]);
            }
        }
    }

    return completedIds;
}

/**
 * Parsea el veredicto de un log de completado.
 * @param {string} notes - Notas del log.
 * @returns {string|null} 'completed', 'cancelled', 'rescheduled' o null.
 */
export function parseVerdict(notes) {
    if (!notes.includes('[TASK_COMPLETION]')) return null;
    const match = notes.match(/verdict:\s*([a-z]+)/);
    return match ? match[1] : null;
}

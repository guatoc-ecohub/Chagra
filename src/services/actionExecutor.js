/**
 * actionExecutor.js — Ejecutor de acciones con gate humano.
 *
 * Recibe propuestas de tool calls del LLM y las procesa:
 * 1. Loguea la propuesta como pending (audit trail)
 * 2. Dispatch de UI gate modal
 * 3. On operator approve → ejecuta tool.handler
 * 4. Loguea resultado como log--operator-decision
 */

import { getTool } from './llmTools';
import useAssetStore from '../store/useAssetStore';

const ACTION_LOG_KEY = 'chagra:action_audit_log';

/**
 * Proposal de acción del LLM.
 * @typedef {Object} ActionProposal
 * @property {string} tool_name - nombre de la tool
 * @property {Object} parameters - parámetros parseados
 * @property {string} intent - intent original del usuario
 * @property {string} llm_response - respuesta previa del LLM
 * @property {string} timestamp - timestamp ISO
 */

/**
 * Resultado de ejecutar una acción.
 * @typedef {Object} ActionResult
 * @property {string} status - 'approved' | 'rejected' | 'edited' | 'executed' | 'failed'
 * @property {Object} [result] - resultado de la ejecución
 * @property {string} [error] - mensaje de error
 * @property {Object} [edited_params] - parámetros editados por el operador
 * @property {number} executed_at - timestamp de ejecución
 */

let pendingActionCallback = null;

/**
 * Registrar callback para mostrar UI gate.
 * @param {Function} callback - función que muestra el modal y retorna Promise< ActionResult >
 */
export function setActionGateCallback(callback) {
  pendingActionCallback = callback;
}

/**
 * Ejecutar una acción propuesta por el LLM.
 * Si la tool requiere gate (requiresGate=true), muestra modal al operador.
 * Si es read-only, ejecuta directamente.
 * 
 * @param {ActionProposal} proposal
 * @param {string} operatorId - ID del operador
 * @returns {Promise<ActionResult>}
 */
export async function executeAction(proposal, operatorId) {
  const tool = getTool(proposal.tool_name);

  if (!tool) {
    const result = {
      status: 'failed',
      error: `Tool "${proposal.tool_name}" no encontrada`,
      executed_at: Date.now(),
    };
    await logAuditTrail(proposal, operatorId, result);
    return result;
  }

  if (tool.requiresGate) {
    return await executeWithGate(proposal, operatorId, tool);
  } else {
    return await executeDirect(proposal, operatorId, tool);
  }
}

/**
 * Ejecutar acción que requiere gate humano.
 */
async function executeWithGate(proposal, operatorId, tool) {
  await logAuditTrail(proposal, operatorId, { status: 'pending' });

  if (!pendingActionCallback) {
    return {
      status: 'failed',
      error: 'Gate UI no disponible - ejecuta en contexto de UI',
      executed_at: Date.now(),
    };
  }

const gateResult = await pendingActionCallback({
    toolName: proposal.tool_name,
    description: tool.description,
    parameters: proposal.parameters,
    intent: proposal.intent,
    llm_response: proposal.llm_response,
  });

  if (gateResult.status === 'rejected') {
    await logAuditTrail(proposal, operatorId, { status: 'rejected', reason: 'Operador rechazo' });
    return { status: 'rejected', executed_at: Date.now() };
  }

  if (gateResult.status === 'edited') {
    const editedParams = gateResult.edited_params || proposal.parameters;
    const execResult = await executeTool(tool, editedParams);
    
    await logAuditTrail(proposal, operatorId, {
      status: 'executed',
      edited: true,
      original_params: proposal.parameters,
      edited_params: editedParams,
      result: execResult,
    });

    return { 
      status: 'executed', 
      edited: true,
      result: execResult,
      executed_at: Date.now(),
    };
  }

  if (gateResult.status === 'approved') {
    const execResult = await executeTool(tool, proposal.parameters);
    
    await logAuditTrail(proposal, operatorId, {
      status: 'executed',
      result: execResult,
    });

    return { status: 'executed', result: execResult, executed_at: Date.now() };
  }

  return { status: 'failed', error: 'Estado de gate desconocido', executed_at: Date.now() };
}

/**
 * Ejecutar acción directamente (read-only, no requiere gate).
 */
async function executeDirect(proposal, operatorId, tool) {
  const execResult = await executeTool(tool, proposal.parameters);

  await logAuditTrail(proposal, operatorId, {
    status: 'executed',
    auto: true,
    result: execResult,
  });

  return { status: 'executed', result: execResult, executed_at: Date.now() };
}

/**
 * Ejecutar el handler de la tool.
 */
async function executeTool(tool, params) {
  try {
    const result = await tool.handler(params);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Loguear en audit trail (IndexedDB o localStorage como fallback).
 */
async function logAuditTrail(proposal, operatorId, actionResult) {
  const entry = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tool_name: proposal.tool_name,
    parameters: proposal.parameters,
    intent: proposal.intent,
    operator_id: operatorId,
    status: actionResult.status,
    timestamp: proposal.timestamp || new Date().toISOString(),
    executed_at: actionResult.executed_at || Date.now(),
    ...actionResult,
  };

  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const auditLog = JSON.parse(localStorage.getItem(ACTION_LOG_KEY) || '[]');
      auditLog.push(entry);
      localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(auditLog.slice(-100)));
    } else {
      console.info('[ActionAudit]', entry);
    }
  } catch (e) {
    console.warn('[ActionAudit] Failed to store:', e);
  }

  try {
    const store = useAssetStore.getState();
    if (typeof store.addLog === 'function') {
      await store.addLog(null, {
        type: 'log--observation',
        attributes: {
          notes: `Action ${entry.status}: ${entry.tool_name} ${entry.status === 'executed' ? 'ejecutada' : entry.status === 'rejected' ? 'rechazada' : 'pendiente'}`,
          metadata: {
            action_audit: entry,
          },
        },
      });
    }
  } catch (e) {
    console.warn('[ActionAudit] Failed to save log:', e);
  }
}

/**
 * Obtener historial de acciones.
 */
export function getActionHistory(limit = 50) {
  try {
    if (typeof window !== 'undefined') {
      const auditLog = JSON.parse(localStorage.getItem(ACTION_LOG_KEY) || '[]');
      return auditLog.slice(-limit);
    }
  } catch {
    // Silent fail - return empty array
  }
  return [];
}

export default {
  executeAction,
  setActionGateCallback,
  getActionHistory,
};
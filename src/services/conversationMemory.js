/**
 * conversationMemory.js — Memoria conversacional persistente.
 *
 * Implementa memoria conversacional para 057.3:
 * - Almacena turnos de conversación en IndexedDB
 * - Recupera últimos N turnos como contexto para el LLM
 * - Reglas: max 30 días o 100 turnos por operador (lo primero)
 * - Operator-scoped: cada operador tiene su propia memoria
 * - NUNCA syncea a servidor sin opt-in explícito
 *
 * ADR-030 Regla 9: privacidad - memoria local solo
 */

import { openDB, STORES } from '../db/dbCore';

const MAX_TURNS = 100;
const MAX_DAYS = 30;
const THIRTY_DAYS_MS = MAX_DAYS * 24 * 60 * 60 * 1000;

function generateTurnId() {
  return `turn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Agregar un turno a la memoria conversacional.
 * @param {string} operatorId - ID del operador
 * @param {Object} turn - { role: 'user'|'assistant', content: string, metadata?: object }
 */
export async function addTurn(operatorId, turn) {
  const db = await openDB();
  const tx = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
  const store = tx.objectStore(STORES.CONVERSATION_MEMORY);

  const now = Date.now();
  const turnData = {
    id: generateTurnId(),
    operator_id: operatorId,
    role: turn.role,
    content: turn.content,
    metadata: turn.metadata || null,
    timestamp: now,
    created_at: new Date(now).toISOString(),
  };

  store.add(turnData);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      cleanOldEntries(operatorId);
      resolve(turnData);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Obtener los últimos N turnos de contexto.
 * @param {string} operatorId - ID del operador
 * @param {number} maxTurns - número máximo de turnos (default 100)
 * @returns {Promise<Array>} Array de turnos [{role, content, timestamp}]
 */
export async function getRecentContext(operatorId, maxTurns = MAX_TURNS) {
  const db = await openDB();
  const tx = db.transaction(STORES.CONVERSATION_MEMORY, 'readonly');
  const store = tx.objectStore(STORES.CONVERSATION_MEMORY);

  const index = store.index('operator_id');
  const range = IDBKeyRange.only(operatorId);
  const request = index.getAll(range);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const allTurns = request.result || [];
      const sorted = allTurns.sort((a, b) => a.timestamp - b.timestamp);
      const recent = sorted.slice(-maxTurns);
      resolve(recent.map((t) => ({
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
        metadata: t.metadata,
      })));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtener contexto formateado para incluir en el prompt del LLM.
 * @param {string} operatorId 
 * @param {number} maxTurns 
 * @returns {Promise<string>}
 */
export async function getContextString(operatorId, maxTurns = 20) {
  const turns = await getRecentContext(operatorId, maxTurns);
  if (turns.length === 0) return '';

  const contextParts = turns.map((t) => {
    const roleLabel = t.role === 'user' ? 'Usuario' : 'Asistente';
    return `${roleLabel}: ${t.content}`;
  });

  return `\n\nConversación previa:\n${contextParts.join('\n')}\n\n`;
}

/**
 * Limpiar entradas antiguas (más de 30 días o más de 100 turnos).
 * Se ejecuta automáticamente después de cada addTurn.
 */
async function cleanOldEntries(operatorId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
    const store = tx.objectStore(STORES.CONVERSATION_MEMORY);

    const index = store.index('operator_id');
    const range = IDBKeyRange.only(operatorId);
    const request = index.getAll(range);

    request.onsuccess = () => {
      const allTurns = request.result || [];
      if (allTurns.length <= MAX_TURNS) return;

      const sorted = allTurns.sort((a, b) => a.timestamp - b.timestamp);
      const cutoffTime = Date.now() - THIRTY_DAYS_MS;

      const toDelete = sorted
        .filter((t) => t.timestamp < cutoffTime || allTurns.indexOf(t) < allTurns.length - MAX_TURNS)
        .map((t) => t.id);

      for (const id of toDelete) {
        store.delete(id);
      }
    };
  } catch {
    // Silent fail - cleanup is non-critical
  }
}

/**
 * Obtener historial completo de memoria (para debugging/UI).
 */
export async function getFullHistory(operatorId, limit = 100) {
  return getRecentContext(operatorId, limit);
}

/**
 * Limpiar toda la memoria de un operador (para reset/privacy).
 */
export async function clearMemory(operatorId) {
  const db = await openDB();
  const tx = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
  const store = tx.objectStore(STORES.CONVERSATION_MEMORY);

  const index = store.index('operator_id');
  const range = IDBKeyRange.only(operatorId);
  const request = index.openCursor(range);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export default {
  addTurn,
  getRecentContext,
  getContextString,
  getFullHistory,
  clearMemory,
};
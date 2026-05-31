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

/**
 * Umbral de inactividad para considerar que una nueva apertura de
 * AgentScreen es una "nueva sesión" en vez de continuación de la previa.
 *
 * Caso N3 (Playwright Q8, 2026-05-23): operador hace Q3 sobre broca del
 * café → "Volver" al dashboard → re-abre AgentScreen → Q8 sobre flor del
 * aguacate. Sin reset, `loadHistory()` recupera Q3+A3 desde IndexedDB y
 * `getContextString(operatorId, 10)` los inyecta como `contextMemory` del
 * LLM. El modelo entonces mezcla residuos de la respuesta sobre broca con
 * la query nueva (cross-conversation contamination).
 *
 * 30 minutos cubre el caso natural: si vuelves rápido (<30min) seguís en
 * la misma conversación útil; si pasaste haciendo otras cosas (registros,
 * fotos, observación), tu próxima visita es nueva sesión.
 */
export const SESSION_GAP_MS = 30 * 60 * 1000;

function generateTurnId() {
  return `turn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Agregar un turno a la memoria conversacional.
 * @param {string} operatorId - ID del operador
 * @param {Object} turn - { role: 'user'|'assistant', content: string, metadata?: object }
 * @returns {Promise<Object|null>} turn persistido o null si IndexedDB falla.
 *   Failure es no-fatal: la conversación sigue, sólo pierde memoria persistente.
 */
export async function addTurn(operatorId, turn) {
  try {
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

    return await new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        cleanOldEntries(operatorId);
        resolve(turnData);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[conversationMemory] addTurn failed:', err);
    return null;
  }
}

/**
 * Obtener los últimos N turnos de contexto.
 * @param {string} operatorId - ID del operador
 * @param {number} maxTurns - número máximo de turnos (default 100)
 * @returns {Promise<Array>} Array de turnos [{role, content, timestamp}]
 */
export async function getRecentContext(operatorId, maxTurns = MAX_TURNS) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CONVERSATION_MEMORY, 'readonly');
    const store = tx.objectStore(STORES.CONVERSATION_MEMORY);

    const index = store.index('operator_id');
    const range = IDBKeyRange.only(operatorId);
    const request = index.getAll(range);

    return await new Promise((resolve, reject) => {
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
  } catch (err) {
    console.error('[conversationMemory] getRecentContext failed, returning empty:', err);
    return [];
  }
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
 * Timestamp del último turn registrado para un operator (cualquier role).
 * Usado por AgentScreen para detectar gap temporal y decidir si arrancar
 * en modo "nueva sesión" (sin cargar history previo + sin contextMemory).
 *
 * @param {string} operatorId
 * @returns {Promise<number|null>} timestamp ms del último turn, o null si
 *   no hay turns persistidos (o IndexedDB falló — comportamiento defensivo
 *   tipo "tratá como sesión nueva").
 */
export async function getLastTurnTimestamp(operatorId) {
  try {
    const turns = await getRecentContext(operatorId, 1);
    if (turns.length === 0) return null;
    return turns[turns.length - 1].timestamp || null;
  } catch (_) {
    return null;
  }
}

/**
 * Decide si una nueva apertura de la conversación debe tratarse como sesión
 * nueva (gap temporal mayor a SESSION_GAP_MS desde el último turn). Si no
 * hay historial previo, también responde true — un primer encuentro siempre
 * es sesión nueva.
 *
 * Helper testeable separado del componente AgentScreen para que el bug N3
 * (cross-conv contamination) tenga unit test sin necesidad de montar React.
 *
 * @param {string} operatorId
 * @param {number} [now=Date.now()] inyectable para testing.
 * @returns {Promise<boolean>}
 */
export async function shouldStartNewSession(operatorId, now = Date.now()) {
  const last = await getLastTurnTimestamp(operatorId);
  if (last === null) return true;
  return (now - last) > SESSION_GAP_MS;
}

/**
 * Limpiar toda la memoria de un operador (para reset/privacy).
 */
export async function clearMemory(operatorId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
    const store = tx.objectStore(STORES.CONVERSATION_MEMORY);

    const index = store.index('operator_id');
    const range = IDBKeyRange.only(operatorId);
    const request = index.openCursor(range);

    return await new Promise((resolve, reject) => {
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
  } catch (err) {
    console.error('[conversationMemory] clearMemory failed:', err);
    throw err;
  }
}

/**
 * Computar metadata de "fuente" del mensaje del assistant a partir del
 * toolEvidence que devolvió el sidecar NLU + chagra-agro-mcp.
 *
 * Promesa visual del Manual (HelpAgentSection): "respuestas con fondo
 * verde son del catálogo verificado". Esa promesa requiere persistir
 * en cada turn del assistant si se invocó un tool MCP y si el tool
 * devolvió un match real del catálogo (grounded=true) o un miss
 * (grounded=false). Mensajes sin tool_used quedan como "respuesta
 * generativa" (solo LLM, sin verificación catálogo).
 *
 * Reglas de grounded (alineadas con `formatToolEvidence` en AgentScreen):
 *   - found === true                  → grounded
 *   - available === true              → grounded
 *   - matches_count > 0               → grounded
 *   - found:false / available:false   → no grounded (tool corrió pero
 *     no hay datos en catálogo)
 *   - matches_count === 0             → no grounded
 *   - otros casos (result presente sin estos flags, e.g. lista no
 *     vacía como get_companions devolviendo array)  → grounded
 *     (asumimos que devolver payload con datos es match útil)
 *
 * @param {{tool: string, args: object, result: any} | null | undefined} toolEvidence
 * @returns {{tool_used: string|null, grounded: boolean}}
 */
export function computeSourceMetadata(toolEvidence) {
  // D2 (#246): si llega un array de evidences (chain), agrega — grounded
  // si CUALQUIERA de los tools devolvió payload útil; tool_used reporta
  // la cadena como "toolA+toolB".
  if (Array.isArray(toolEvidence)) {
    if (toolEvidence.length === 0) return { tool_used: null, grounded: false };
    const inners = toolEvidence
      .map((ev) => computeSourceMetadata(ev))
      .filter((m) => m.tool_used != null);
    if (inners.length === 0) return { tool_used: null, grounded: false };
    return {
      tool_used: inners.map((m) => m.tool_used).join('+'),
      grounded: inners.some((m) => m.grounded === true),
    };
  }

  if (!toolEvidence || !toolEvidence.tool) {
    return { tool_used: null, grounded: false };
  }
  const result = toolEvidence.result;
  if (!result || typeof result !== 'object') {
    return { tool_used: toolEvidence.tool, grounded: false };
  }

  // Miss explícito: el tool indicó que no hay match en catálogo.
  if (result.found === false || result.available === false) {
    return { tool_used: toolEvidence.tool, grounded: false };
  }
  if (typeof result.matches_count === 'number' && result.matches_count === 0) {
    return { tool_used: toolEvidence.tool, grounded: false };
  }

  // Match explícito.
  if (result.found === true || result.available === true) {
    return { tool_used: toolEvidence.tool, grounded: true };
  }
  if (typeof result.matches_count === 'number' && result.matches_count > 0) {
    return { tool_used: toolEvidence.tool, grounded: true };
  }

  // Sin flags explícitos: si el tool devolvió un payload no vacío
  // (e.g. get_companions con array), lo consideramos grounded.
  const hasArrayPayload = Object.values(result).some(
    (v) => Array.isArray(v) && v.length > 0
  );
  if (hasArrayPayload) {
    return { tool_used: toolEvidence.tool, grounded: true };
  }
  // Fallback: tool corrió, result presente pero sin señal clara.
  return { tool_used: toolEvidence.tool, grounded: true };
}

/**
 * FIX 2 (2026-05-31) — fusiona el reporte del post-validate (capa 2
 * anti-alucinación del sidecar) sobre el metadata de fuente del turno, para que
 * el ChatBubble pueda renderizar los badges de advertencia.
 *
 * El sidecar devuelve:
 *   - `pv.suspect[]`      — binomios que SÍ existen en el catálogo pero NO
 *     corresponden a la entidad preguntada (nombre real, especie equivocada).
 *   - `pv.hallucinated[]` — binomios 100% INVENTADOS por el modelo, que NO
 *     existen en AGE ni en la realidad (ej. "Neolepidopteron daquila").
 *
 * ANTES (bug vivo): el PWA solo leía `suspect` → el binomio inventado se
 * detectaba en el sidecar y se TIRABA en silencio, sin avisar al usuario.
 * AHORA: ambos se surfacéan como metadata (`suspect_names` / `hallucinated_names`).
 *
 * Conservador y puro: si `pv` es null/incompleto, devuelve el `base` sin tocar
 * (política "no advertir si no se pudo verificar"). Solo añade campos cuando los
 * arrays traen datos. No muta `base`. Requiere `pv.age_available === true` para
 * confiar en el veredicto (sin AGE no hay con qué validar binomios).
 *
 * @param {object} base — metadata de fuente ya computado (computeSourceMetadata).
 * @param {null | {hallucinated?: string[], suspect?: string[], age_available?: boolean}} pv
 * @returns {object} nuevo metadata (copia de base + flags de advertencia).
 */
export function mergePostValidateMetadata(base, pv) {
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  if (!pv || typeof pv !== 'object' || pv.age_available !== true) return out;

  const suspect = Array.isArray(pv.suspect)
    ? pv.suspect.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];
  const hallucinated = Array.isArray(pv.hallucinated)
    ? pv.hallucinated.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];

  if (suspect.length > 0) out.suspect_names = suspect;
  if (hallucinated.length > 0) out.hallucinated_names = hallucinated;
  return out;
}

/**
 * A-15 (#248) — extrae los edges del grafo AGE que un turno del agente usó
 * como evidencia, en el shape que el motor E3 (`feedback-to-confidence.mjs`
 * del sidecar) necesita para mapear la señal 👍👎 a aristas reales:
 *
 *   { species_id: string, edge_type: string, target_id: string }
 *
 * Esto es DISTINTO del grounding de visión (`recognizeSpeciesGrounded`): acá
 * nos importan las RELACIONES del chat (café→guamo COMPATIBLE_WITH, plaga
 * controlada por biopreparado, etc.), no la validación de una especie.
 *
 * Mapeo por tool (todos los edge_type devueltos son de los que E3 sabe
 * ajustar: COMPATIBLE_WITH, CONTROLS, TARGETS_PEST):
 *   - get_companions / get_multihop_companions →
 *       (species_id) -[COMPATIBLE_WITH]-> (companion.id)
 *   - get_pest_controllers →
 *       (biopreparado.id) -[CONTROLS]-> (pest_id)
 *       (target_species.id) -[TARGETS_PEST]-> (pest_id)
 *
 * Acepta un toolEvidence simple `{tool, args, result}` o un array (tool_chain).
 * Si el turno no usó relaciones del grafo, devuelve `[]` (sin regresión: el
 * payload de feedback lleva `edges: []` y E3 simplemente no recibe señal).
 *
 * Defensivo: ignora entradas malformadas, deduplica, y cota el total a
 * MAX_EDGES para no inflar el payload de feedback.
 *
 * @param {object|object[]|null|undefined} toolEvidence
 * @returns {Array<{species_id: string, edge_type: string, target_id: string}>}
 */
export function extractEdges(toolEvidence) {
  const MAX_EDGES = 50;
  if (!toolEvidence) return [];

  // Array (tool_chain): agregamos los edges de cada evidence, en orden.
  if (Array.isArray(toolEvidence)) {
    const all = [];
    for (const ev of toolEvidence) {
      for (const e of extractEdges(ev)) all.push(e);
    }
    return dedupeEdges(all).slice(0, MAX_EDGES);
  }

  const tool = toolEvidence.tool;
  const result = toolEvidence.result;
  if (typeof tool !== 'string' || !result || typeof result !== 'object') return [];

  const edges = [];
  const pushEdge = (species_id, edge_type, target_id) => {
    if (
      typeof species_id === 'string' && species_id &&
      typeof target_id === 'string' && target_id &&
      species_id !== target_id
    ) {
      edges.push({ species_id, edge_type, target_id });
    }
  };

  if (tool === 'get_companions' || tool === 'get_multihop_companions') {
    const src = typeof result.species_id === 'string' ? result.species_id : null;
    const companions = Array.isArray(result.companions) ? result.companions : [];
    if (src) {
      for (const c of companions) {
        const tid = c && typeof c.id === 'string' ? c.id : null;
        if (tid) pushEdge(src, 'COMPATIBLE_WITH', tid);
      }
    }
  } else if (tool === 'get_pest_controllers') {
    const matches = Array.isArray(result.matches) ? result.matches : [];
    for (const m of matches) {
      if (!m || typeof m !== 'object') continue;
      const pestId = typeof m.pest_id === 'string' ? m.pest_id : null;
      if (!pestId) continue;
      const bios = Array.isArray(m.biopreparados) ? m.biopreparados : [];
      for (const b of bios) {
        const bid = b && typeof b.id === 'string' ? b.id : null;
        if (bid) pushEdge(bid, 'CONTROLS', pestId);
      }
      const targets = Array.isArray(m.target_species) ? m.target_species : [];
      for (const t of targets) {
        const sid = t && typeof t.id === 'string' ? t.id : null;
        if (sid) pushEdge(sid, 'TARGETS_PEST', pestId);
      }
    }
  }

  return dedupeEdges(edges).slice(0, MAX_EDGES);
}

/** Deduplica edges por la tupla (species_id, edge_type, target_id). */
function dedupeEdges(edges) {
  const seen = new Set();
  const out = [];
  for (const e of edges) {
    const k = `${e.species_id}|${e.edge_type}|${e.target_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

export default {
  addTurn,
  getRecentContext,
  getContextString,
  getFullHistory,
  clearMemory,
  computeSourceMetadata,
  mergePostValidateMetadata,
  extractEdges,
  getLastTurnTimestamp,
  shouldStartNewSession,
  SESSION_GAP_MS,
};
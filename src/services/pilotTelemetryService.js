/**
 * pilotTelemetryService.js — Telemetria anonima del piloto (TAREA 55).
 *
 * Registra eventos clave del ciclo de vida del usuario piloto en IndexedDB
 * para envio asincrono al backend de analitica. Privacy-first: CERO PII.
 *
 * Privacy invariants (ADR-030 Regla 9):
 *   - NUNCA almacena nombres, emails, GPS, telefono, texto de conversacion.
 *   - Los eventos solo contienen IDs de modulo, tipos, conteos, y flags.
 *   - Consentimiento requerido via getTelemetryConsent().
 *
 * Eventos:
 *   - onboarding_completado: { vocacion, finca_tipo }
 *   - modulo_abierto:        { modulo_id, ts }
 *   - pregunta_al_agente:    { intent, source, grounded }
 *   - feedback_dado:         { tipo, modulo }
 *   - sync_resultado:        { exitoso, pendientes }
 *
 * Schema del evento:
 *   {
 *     id: 'pt_<ts36><rand36>',
 *     tipo: 'onboarding_completado' | 'modulo_abierto' | 'pregunta_al_agente'
 *          | 'feedback_dado' | 'sync_resultado',
 *     payload: { ... },    // fields especificos segun tipo
 *     ts: ISO string,
 *     synced: false,
 *   }
 */

import { getTelemetryConsent } from './userProfileService.js';

// ── PII patterns: campos PROHIBIDOS en cualquier payload ────────────────────

const PII_FIELDS = new Set([
  'nombre', 'name', 'email', 'correo', 'phone', 'telefono', 'celular',
  'gps', 'lat', 'lng', 'latitud', 'longitud', 'coords', 'coordenadas',
  'conversation', 'conversacion', 'transcript', 'transcripcion',
  'texto', 'text', 'message', 'mensaje', 'query', 'prompt',
  'user_id', 'operator_id', 'finca_id', 'device_id',
]);

// ── Idempotent ID generator ─────────────────────────────────────────────────

const generateId = () => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `pt_${ts}${rand}`;
};

// ── PII validation ───────────────────────────────────────────────────────────

/**
 * Recorre un objeto recursivamente y retorna true si encuentra
 * alguna clave en los campos prohibidos PII.
 *
 * @param {object} obj
 * @param {number} depth - proteccion contra recursion infinita
 * @returns {boolean}
 */
export function containsPII(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return false;

  for (const key of Object.keys(obj)) {
    if (PII_FIELDS.has(key)) return true;

    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (containsPII(val, depth + 1)) return true;
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && containsPII(item, depth + 1)) return true;
      }
    }
  }

  return false;
}

// ── Field validation por tipo ────────────────────────────────────────────────

/**
 * Valida que el payload de un evento de telemetria cumpla con
 * los campos requeridos para su tipo.
 *
 * @param {string} tipo
 * @param {object} payload
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEventFields(tipo, payload) {
  if (!tipo || !payload || typeof payload !== 'object') {
    return { valid: false, missing: ['payload invalido'] };
  }

  const required = {
    'onboarding_completado': ['vocacion', 'finca_tipo'],
    'modulo_abierto': ['modulo_id'],
    'pregunta_al_agente': ['intent', 'source', 'grounded'],
    'feedback_dado': ['tipo', 'modulo'],
    'sync_resultado': ['exitoso', 'pendientes'],
  };

  const fields = required[tipo];
  if (!fields) {
    return { valid: false, missing: [`tipo desconocido: ${tipo}`] };
  }

  const missing = fields.filter((f) => !(f in payload));
  return { valid: missing.length === 0, missing };
}

// ── Core: grabar evento ─────────────────────────────────────────────────────

/**
 * Graba un evento de telemetria del piloto en IndexedDB.
 * Solo graba si hay consentimiento.
 *
 * @param {string} tipo - tipo de evento
 * @param {object} payload - datos anonimizados del evento
 * @returns {Promise<{ id: string } | null>}
 */
export async function recordPilotEvent(tipo, payload = {}) {
  try {
    // Validar consentimiento
    if (!getTelemetryConsent()) {
      return null;
    }

    // Validar que no tenga PII
    if (containsPII(payload)) {
      console.warn('[pilotTelemetry] PII detectado en payload, evento descartado');
      return null;
    }

    // Validar campos requeridos
    const validation = validateEventFields(tipo, payload);
    if (!validation.valid) {
      console.warn(`[pilotTelemetry] Campos faltantes para ${tipo}:`, validation.missing);
      return null;
    }

    const event = {
      id: generateId(),
      tipo,
      payload,
      ts: new Date().toISOString(),
      synced: false,
    };

    // Guardar en IndexedDB
    const { openDB, STORES } = await import('../db/dbCore.js');
    const db = await openDB();
    const storeName = STORES.PILOT_TELEMETRY || 'pilot_telemetry';

    // Si el store no existe, crear transaccion con fallback
    if (!db.objectStoreNames.contains(storeName)) {
      db.close();
      return null; // store no creado aun (migracion pendiente)
    }

    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    await new Promise((resolve, reject) => {
      const req = store.add(event);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    db.close();
    return { id: event.id };
  } catch (e) {
    console.debug('[pilotTelemetry] Error grabando evento (falla silente):', e);
    return null;
  }
}

// ── Exports for testing ──────────────────────────────────────────────────────

export const __TEST__ = {
  PII_FIELDS,
  generateId,
};

/**
 * auditLog.js — Logger circular interno para debugging del operador.
 *
 * NO es telemetría de usuario. Es un log de SISTEMA: navegación, errores,
 * sync, deploys. Circular en memoria (últimos 500 eventos). Exportable a JSON.
 */
const MAX = 500;
/** @type {Array<{ts: string, tipo: string, mensaje: string, data?: any}>} */
let buffer = [];

/** @param {'nav'|'error'|'sync'|'deploy'|'auth'} tipo */
export function logAudit(tipo, mensaje, data = null) {
  buffer.push({ ts: new Date().toISOString(), tipo, mensaje, data });
  if (buffer.length > MAX) buffer = buffer.slice(-MAX);
}

/** @returns {Array} */
export function getAuditLog() { return [...buffer]; }

/** @returns {string} */
export function exportAuditJSON() {
  return JSON.stringify(buffer, null, 2);
}

/** @returns {Array} solo errores */
export function getAuditErrors() {
  return buffer.filter((e) => e.tipo === 'error');
}

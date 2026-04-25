/**
 * id.js — Gestión de identificadores (ADR-019)
 * AGPL-3.0 © Chagra
 */

import { ulid } from 'ulid';

/**
 * Genera un nuevo ULID (Universally Unique Lexicographically Sortable Identifier).
 * Usado para nuevos tipos de logs según ADR-019.
 * @returns {string} 26 caracteres alfanuméricos en mayúsculas.
 */
export function newUlid() {
    return ulid();
}

/**
 * Genera un ID apropiado según el bundle.
 * ADR-019 especifica ULID para logs de IA y tareas; 
 * mantiene UUIDv4 para compatibilidad legacy/FarmOS en otros bundles.
 * @param {string} bundle - Tipo de entidad (ej: 'log--observation', 'log--task')
 * @returns {string} ULID o UUIDv4
 */
export function newId(bundle) {
    const ulidBundles = ['log--task', 'log--ai_inference'];
    if (ulidBundles.includes(bundle)) {
        return newUlid();
    }
    return crypto.randomUUID();
}

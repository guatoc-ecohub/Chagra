/**
 * services/red — RED humana de Chagra (campesino ↔ campesino). Backend del MVP.
 *
 * Barrel público del módulo. La "cara" (UI) la construye aparte quien consuma
 * estos servicios; aquí vive solo la capa de datos + lógica.
 *
 * Mapa rápido:
 *   - types.js          — constantes canónicas + typedefs (SHARE_LEVEL, ENTREGA…).
 *   - redSharing.js     — compuerta anti-extractiva (opt-in 3 niveles).
 *   - redReputation.js  — mercado → grafo social + reputación ganada (puro).
 *   - redMatchmaking.js — "pregúntele al vecino" + ruteo de dudas (puro).
 *   - redService.js     — orquestación con I/O (persistencia + contacto directo).
 *
 * @module services/red
 */

export * from './types.js';
export * from './redSharing.js';
export * from './redReputation.js';
export * from './redMatchmaking.js';
export * from './redService.js';

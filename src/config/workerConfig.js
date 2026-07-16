/**
 * workerConfig.js — Identidad del operario principal.
 * Centraliza el nombre para evitar hardcoding en componentes y rutas.
 *
 * Configurable por deploy via env var VITE_PRIMARY_WORKER_NAME (Vite la
 * inyecta en build-time). Default genérico 'Trabajador' protege el bundle
 * público contra leak de identidad personal.
 */
export const PRIMARY_WORKER_NAME =
  import.meta.env.VITE_PRIMARY_WORKER_NAME || 'Trabajador';

/**
 * Nombre del operario ANTERIOR a renombrar en la migración de identidad única
 * (main.jsx / main-prod.jsx). Antes estaba hardcodeado con un nombre real en el
 * source público (leak de identidad, ADR-020). Ahora se configura por deploy via
 * VITE_LEGACY_WORKER_NAME; el default genérico 'Trabajador' hace que la migración
 * sea un no-op inocuo si el deploy no la setea (no busca ningún nombre personal).
 */
export const LEGACY_WORKER_NAME =
  import.meta.env.VITE_LEGACY_WORKER_NAME || 'Trabajador';

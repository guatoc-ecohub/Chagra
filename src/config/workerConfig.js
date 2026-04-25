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

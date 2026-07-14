/**
 * useT.js — Hook de internacionalización para Chagra.
 *
 * Uso: const t = useT(); t('shell.valleTitulo') → 'El valle de su finca'
 *
 * El catálogo vive en src/config/messages.js.
 * Detecta idioma del navegador, fallback a español.
 * Para agregar un idioma: crear messages_en.js y registrarlo en IDIOMAS.
 */
import { useCallback } from 'react';
import messages_es from '../../config/messages.js';

/** @type {Record<string, any>} */
const IDIOMAS = { es: messages_es };

/** Obtiene el código de idioma del navegador (es, en, pt, qu...) */
function detectarIdioma() {
  try {
    const nav = navigator.language || 'es';
    return nav.split('-')[0];
  } catch { return 'es'; }
}

/**
 * Traduce una clave de mensajes. Soporta notación de punto: 'shell.valleTitulo'.
 * @param {string} key — clave en messages.js (con notación de punto)
 * @param {Record<string, string>} [params] — parámetros de interpolación {{key}}
 * @returns {string}
 */
function traducir(key, params) {
  const idioma = detectarIdioma();
  const msgs = IDIOMAS[idioma] || IDIOMAS.es;

  // Navegar por notación de punto: 'shell.valleTitulo' → msgs.shell.valleTitulo
  let value = msgs;
  for (const part of key.split('.')) {
    if (value && typeof value === 'object') value = value[part];
    else return key; // fallback: devolver la clave cruda
  }

  if (typeof value !== 'string') return key;

  // Interpolar {{param}}
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] || `{{${p}}}`);
  }
  return value;
}

/**
 * Hook useT — devuelve una función de traducción estable.
 * @returns {(key: string, params?: Record<string, string>) => string}
 */
export function useT() {
  return useCallback(traducir, []);
}

/** Versión directa (sin hook) para usar fuera de componentes React */
export const t = traducir;
export { detectarIdioma };

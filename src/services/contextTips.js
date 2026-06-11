// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * contextTips.js — registro local de tips contextuales ("coach-marks")
 * ya vistos por el usuario.
 *
 * Los tips de primera vez (cómo usar la voz, cómo tomar la foto del
 * diagnóstico, cómo leer la confiabilidad) se muestran UNA sola vez en el
 * momento de uso y se descartan. Este módulo recuerda cuáles ya se vieron
 * para no repetirlos (anti-molestia).
 *
 * Reglas:
 *   - 100% offline: localStorage, cero red (soberanía ADR-007).
 *   - NUNCA lanza: storage corrupto o inexistente degrada a "no visto".
 *   - El contenido de los tips vive en los componentes (reusa los textos
 *     del Manual Help*Screen); aquí solo la persistencia.
 *
 * @module contextTips
 */

export const TIPS_STORAGE_KEY = 'chagra:tips:seen:v1';

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

function readSeen() {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(TIPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * ¿El usuario ya vio (y descartó) este tip?
 * @param {string} id - identificador estable del tip.
 * @returns {boolean}
 */
export function hasSeenTip(id) {
  if (!id) return false;
  return Boolean(readSeen()[id]);
}

/**
 * Marca un tip como visto (persistente). Idempotente, nunca lanza.
 * @param {string} id
 */
export function markTipSeen(id) {
  if (!id || !hasStorage()) return;
  try {
    const seen = readSeen();
    seen[id] = new Date().toISOString();
    window.localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(seen));
  } catch (e) {
    console.warn('[contextTips] No se pudo guardar el tip visto:', e);
  }
}

/** Limpia todos los flags (para re-mostrar la ayuda desde Perfil/debug). */
export function resetSeenTips() {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(TIPS_STORAGE_KEY);
  } catch (e) {
    console.warn('[contextTips] No se pudo limpiar tips:', e);
  }
}

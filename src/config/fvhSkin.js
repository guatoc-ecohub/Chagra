/**
 * fvhSkin.js — helper de piel por tema "Finca Viva" (Fase 2 de temas).
 *
 * Devuelve la clase `.fvh-skin` SOLO cuando la flag VITE_FINCA_VIVA_HOME_PERFIL
 * está ON (dev). Con la flag OFF (default, prod) devuelve cadena vacía → las
 * superficies (juegos, AgentScreen, FAB) quedan EXACTAS como hoy (dark en prod).
 *
 * Las reglas de piel viven en `src/styles/temas-fase2.css`, scopeadas bajo
 * `.fvh-skin` y afinadas por `[data-theme]`. Cada superficie aplica esta clase
 * a su contenedor raíz y deja que el CSS retiña su atmósfera con los tokens
 * --c-* del tema activo, sin tocar el contenido ni la jugabilidad.
 *
 * Español de Colombia (tú/usted), sin voseo.
 *
 * @module fvhSkin
 */

import { fincaVivaHomePerfilActivo } from './fincaVivaHomeFlag';

/**
 * Clase de piel por tema para la superficie de Fase 2.
 *
 * @param {string} [extra] clases adicionales a anteponer (opcional).
 * @returns {string} `${extra} fvh-skin` con la flag ON; `${extra}` con OFF.
 */
export function fvhSkinClass(extra = '') {
  const base = (extra || '').trim();
  if (!fincaVivaHomePerfilActivo()) return base;
  return base ? `${base} fvh-skin` : 'fvh-skin';
}

/**
 * Lee el tema activo resuelto desde el DOM (<html data-theme>). biopunk (base)
 * no escribe el atributo → devuelve 'biopunk'. Útil para superficies que pintan
 * en canvas (no pueden leer CSS vars), como DoomFinca.
 *
 * @returns {string} id del tema resuelto: biopunk | nature | minimalista | verde-vivo.
 */
export function temaActivoDom() {
  try {
    return document.documentElement.getAttribute('data-theme') || 'biopunk';
  } catch (_) {
    return 'biopunk';
  }
}

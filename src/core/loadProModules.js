/**
 * loadProModules.js — Carga dinámica de módulos Pro
 * ==================================================
 * Si la variable de entorno VITE_PRO_MODULES_PATH apunta a un directorio
 * con módulos Pro, los carga vía dynamic import() y los registra en el
 * moduleRegistry. Si la variable no está (build público puro), esta
 * función no hace nada y la UI degrada elegantemente.
 *
 * IMPORTANTE — ADR-002: este archivo NO importa estáticamente de
 * chagra-pro. Todo se hace vía import dinámico cuyo path viene de una
 * variable de entorno del build. Vite no puede bundlear lo que no
 * puede resolver estáticamente.
 *
 * Módulos Pro esperados (actualizar cuando se agreguen al catálogo
 * privado):
 *   - gremios-receta-pro (capability: enriched-guild-suggestions)
 *   - avatar-espiritu-pro (capability: avatar-espiritu)
 *   - export-ecocert-pro (capability: export-ecocert)  [v0.9.0+]
 *   - plan-nutricion-pro (capability: auto-plan-nutricion) [v0.9.1+]
 *
 * REACT COMPARTIDO: algunos módulos Pro traen componentes React
 * pre-construidos (ESM de navegador). Para que usen la MISMA instancia de
 * React que el público (si no, los hooks rompen con "Invalid hook call"),
 * este loader publica `globalThis.__CHAGRA_VENDOR__ = { React, jsxRuntime }`
 * ANTES de importar cualquier módulo Pro. El bundle Pro resuelve `react` /
 * `react/jsx-runtime` contra ese global (ver chagra-pro/.../build.mjs).
 */

import React from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { registry } from './moduleRegistry';

// Expone el React del host para los módulos Pro que traen componentes
// pre-construidos. Idempotente; solo se llama cuando hay módulos Pro que
// cargar (no toca el global en un build puro OSS).
function ensureVendorGlobals() {
  if (typeof globalThis === 'undefined') return;
  if (!globalThis.__CHAGRA_VENDOR__) {
    globalThis.__CHAGRA_VENDOR__ = { React, jsxRuntime: JsxRuntime };
  }
}

// Vite resuelve import.meta.glob en build-time. El path con variable
// de entorno no se resuelve estáticamente, así que el bundle público no
// contiene el código Pro — solo el intento de import dinámico que
// falla silenciosamente si la variable no apunta a algo real.
const PRO_MODULES_ENV = (import.meta.env && import.meta.env.VITE_PRO_MODULES_PATH) || null;

// Lista explícita de módulos Pro que conocemos. Añadir aquí cuando
// el equipo Pro confirme el id y capability del nuevo módulo.
const KNOWN_PRO_MODULES = ['gremios-receta-pro', 'voice-entity-extractor-pro', 'avatar-espiritu-pro'];

export async function loadProModules() {
  if (!PRO_MODULES_ENV) {
    if (import.meta.env && import.meta.env.DEV) {
      console.info('[loadProModules] sin VITE_PRO_MODULES_PATH; build puro OSS');
    }
    return { loaded: [], skipped: KNOWN_PRO_MODULES };
  }

  // Publica el React del host antes de importar módulos Pro (React compartido).
  ensureVendorGlobals();

  const loaded = [];
  const skipped = [];

  for (const name of KNOWN_PRO_MODULES) {
    try {
      // @vite-ignore: import dinámico con path fuera del grafo estático,
      // intencional por diseño (ADR-002). Vite imprime warning — esperado.
      const mod = await import(/* @vite-ignore */ `${PRO_MODULES_ENV}/${name}/index.js`);
      if (mod && mod.default && mod.default.id) {
        registry.register(mod.default);
        loaded.push(mod.default.id);
      } else {
        skipped.push(name);
        console.warn(`[loadProModules] "${name}" no exporta un ChagraModule válido como default`);
      }
    } catch (e) {
      skipped.push(name);
      if (import.meta.env && import.meta.env.DEV) {
        console.info(`[loadProModules] "${name}" no disponible: ${e.message}`);
      }
    }
  }

  return { loaded, skipped };
}

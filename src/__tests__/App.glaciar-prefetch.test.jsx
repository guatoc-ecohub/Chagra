/**
 * App.glaciar-prefetch.test.jsx — U-2: prefetch del chunk lazy del módulo
 * glaciar tras el login, para los usuarios de La Cordada.
 *
 * PROBLEMA: GlaciarReporteScreen es un chunk lazy (import() en App.jsx). Su
 * chunk `/assets/GlaciarReporteScreen-*.js` solo se cachea si se abrió ONLINE
 * una vez. Si un guía instala la app y sube al glaciar SIN haberlo abierto con
 * señal, el SW responde 504 y el módulo no abre en campo.
 *
 * FIX: en el dashboard, para los usuarios de la whitelist, disparar el import()
 * del módulo (fire-and-forget) mientras hay señal → el handler cache-first de
 * /assets/* del SW guarda el chunk y sobrevive offline.
 *
 * Este test es a nivel de FUENTE (App.jsx es un componente enorme con muchas
 * dependencias de runtime; instanciarlo entero es frágil). Verifica el contrato
 * de que el prefetch existe, está gateado por la whitelist y es tolerante a
 * fallos — el mismo enfoque que tests/unit/sw-telemetry-db-version.test.js.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(__dirnameLocal, '../App.jsx');
const APP_SRC = fs.readFileSync(APP_PATH, 'utf-8');

describe('App.jsx — U-2 prefetch del chunk glaciar', () => {
  it('importa el gate de acceso de La Cordada', () => {
    expect(APP_SRC).toMatch(/tieneAccesoGlaciarActual/);
  });

  it('dispara un import() de GlaciarReporteScreen como prefetch (fuera del lazy)', () => {
    // Debe existir al menos un import() dinámico del módulo glaciar. El lazy()
    // de arriba también lo importa, pero el prefetch añade una segunda llamada
    // explícita; verificamos que el patrón de prefetch esté presente.
    const dynImports = APP_SRC.match(/import\(\s*['"]\.\/components\/GlaciarReporteScreen['"]\s*\)/g) || [];
    // 1 = solo el lazy(); ≥2 = lazy() + prefetch. Exigimos el prefetch.
    expect(dynImports.length).toBeGreaterThanOrEqual(2);
  });

  it('el prefetch está GATEADO por tieneAccesoGlaciarActual() (solo La Cordada)', () => {
    // Busca un bloque `if (tieneAccesoGlaciarActual()) { ... import(...Glaciar...) }`.
    const gated = /if\s*\(\s*tieneAccesoGlaciarActual\(\)\s*\)\s*\{[\s\S]{0,200}import\(\s*['"]\.\/components\/GlaciarReporteScreen['"]\s*\)/;
    expect(APP_SRC).toMatch(gated);
  });

  it('el prefetch tolera fallos (.catch) para no romper el dashboard offline', () => {
    const tolerant = /import\(\s*['"]\.\/components\/GlaciarReporteScreen['"]\s*\)\s*\.catch\(/;
    expect(APP_SRC).toMatch(tolerant);
  });
});

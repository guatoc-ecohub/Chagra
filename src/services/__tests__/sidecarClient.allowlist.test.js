/**
 * sidecarClient.allowlist.test.js — Consistencia interna del allow-list MCP.
 *
 * Tres invariantes del contrato cliente ↔ sidecar:
 *
 * 1. ALLOWED_TOOLS (Set, expuesto vía __TEST__) no tiene duplicados NI en el
 *    literal fuente. Como es un Set, un duplicado en el array literal se
 *    colapsaría en silencio en runtime — por eso se escanea el código fuente
 *    de sidecarClient.js, no solo el Set materializado.
 * 2. Toda entrada es lowercase snake_case (^[a-z][a-z0-9_]*$) — el sidecar
 *    routea `/tools/${toolName}` y un nombre con mayúsculas/espacios/guiones
 *    jamás matchearía una tool real.
 * 3. Todo literal que el código de producción pasa a callTool('...') es
 *    miembro de ALLOWED_TOOLS. Un typo aquí NO lanza: callTool devuelve
 *    {_error: true, reason: 'not_allowed'} y el feature degrada en silencio.
 *    Este test convierte esa degradación silenciosa en rojo de CI.
 *
 * Los literales de (3) se derivan del código real (grep de callTool('...')),
 * no de una lista inventada. Si agregás un wrapper nuevo que llama a
 * callTool con un literal, agregalo a la lista correspondiente abajo.
 */

/* eslint-disable no-undef */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isToolAllowed, __TEST__ } from '../sidecarClient.js';

const { ALLOWED_TOOLS } = __TEST__;

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

// Literales pasados a callTool('...') por los wrappers de sidecarClient.js
// (getNormativaIca, getClimaIdeam, getPrecioSipsa, getEnsoStatus,
// getAlertasClimaZona). Derivados de: grep "callTool('" sidecarClient.js
const WRAPPER_LITERALS_SIDECAR_CLIENT = [
  'get_normativa_ica',
  'get_clima_ideam',
  'get_precio_sipsa',
  'get_enso_status',
  'get_alertas_clima_zona',
];

// Literales pasados a callTool('...') por OTROS módulos de producción
// (no tests). Derivados de: grep -rn "callTool('" src/ (excluyendo __tests__).
//   plantDossierService.js → get_biopreparados, get_companions
//   aiService.js           → validate_visual_match
//   AgentScreen.jsx        → get_subgrafo_relacional, get_multihop_companions
const WRAPPER_LITERALS_OTHER_MODULES = [
  'get_biopreparados',
  'get_companions',
  'validate_visual_match',
  'get_subgrafo_relacional',
  'get_multihop_companions',
];

/**
 * Extrae las entradas string del literal `new Set([...])` de ALLOWED_TOOLS
 * directamente del código fuente, ignorando comentarios. Permite detectar
 * duplicados que el Set colapsaría en silencio.
 * @returns {string[]}
 */
function extractSourceLiterals() {
  // En jsdom import.meta.url no es file: — resolvemos desde la raíz del repo
  // (vitest siempre corre con cwd = raíz del proyecto).
  const sourcePath = resolve(process.cwd(), 'src/services/sidecarClient.js');
  const source = readFileSync(sourcePath, 'utf8');
  const start = source.indexOf('const ALLOWED_TOOLS = new Set([');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(']);', start);
  expect(end).toBeGreaterThan(start);
  const block = source.slice(start, end);
  // Quitar comentarios de línea para no capturar nombres mencionados en docs.
  const withoutComments = block
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
  const matches = withoutComments.match(/'([^']+)'/g) || [];
  return matches.map((m) => m.slice(1, -1));
}

describe('allow-list MCP — forma y exports', () => {
  it('ALLOWED_TOOLS es un Set no vacío expuesto vía __TEST__', () => {
    expect(ALLOWED_TOOLS).toBeInstanceOf(Set);
    expect(ALLOWED_TOOLS.size).toBeGreaterThan(0);
  });

  it('isToolAllowed es consistente con el Set (positivo y negativo)', () => {
    for (const tool of ALLOWED_TOOLS) {
      expect(isToolAllowed(tool)).toBe(true);
    }
    expect(isToolAllowed('tool_que_no_existe')).toBe(false);
    expect(isToolAllowed('')).toBe(false);
    expect(isToolAllowed(null)).toBe(false);
    expect(isToolAllowed(undefined)).toBe(false);
    expect(isToolAllowed(42)).toBe(false);
  });
});

describe('allow-list MCP — (a) sin duplicados', () => {
  it('el literal fuente de ALLOWED_TOOLS no tiene entradas duplicadas', () => {
    const sourceLiterals = extractSourceLiterals();
    // Sanity: el escaneo del fuente debe encontrar exactamente lo que el
    // Set materializado contiene (si difiere, la extracción quedó stale).
    expect(new Set(sourceLiterals)).toEqual(ALLOWED_TOOLS);
    // El check real: sin colapso silencioso de duplicados en el Set.
    const duplicates = sourceLiterals.filter(
      (name, i) => sourceLiterals.indexOf(name) !== i,
    );
    expect(duplicates).toEqual([]);
    expect(sourceLiterals.length).toBe(ALLOWED_TOOLS.size);
  });
});

describe('allow-list MCP — (b) naming lowercase snake_case', () => {
  it('toda entrada matchea ^[a-z][a-z0-9_]*$', () => {
    const invalid = [...ALLOWED_TOOLS].filter((name) => !SNAKE_CASE.test(name));
    expect(invalid).toEqual([]);
  });

  it('toda entrada es string (nada de Symbol/number colado en el Set)', () => {
    const nonStrings = [...ALLOWED_TOOLS].filter((n) => typeof n !== 'string');
    expect(nonStrings).toEqual([]);
  });
});

describe('allow-list MCP — (c) literales de callTool ∈ ALLOWED_TOOLS', () => {
  it('los wrappers de sidecarClient.js solo llaman tools permitidas', () => {
    const missing = WRAPPER_LITERALS_SIDECAR_CLIENT.filter(
      (tool) => !ALLOWED_TOOLS.has(tool),
    );
    // Si esto falla, un wrapper devolvería {_error, reason:'not_allowed'}
    // en runtime SIN lanzar — bug de grounding silencioso.
    expect(missing).toEqual([]);
  });

  it('los callers de producción de otros módulos solo llaman tools permitidas', () => {
    const missing = WRAPPER_LITERALS_OTHER_MODULES.filter(
      (tool) => !ALLOWED_TOOLS.has(tool),
    );
    expect(missing).toEqual([]);
  });

  it('isToolAllowed aprueba cada literal usado por wrappers (guard de AgentScreen)', () => {
    const allLiterals = [
      ...WRAPPER_LITERALS_SIDECAR_CLIENT,
      ...WRAPPER_LITERALS_OTHER_MODULES,
    ];
    for (const tool of allLiterals) {
      expect(isToolAllowed(tool)).toBe(true);
    }
  });
});

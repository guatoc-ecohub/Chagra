// ── Guard SSOT de pisos térmicos de finca: delegación, no copia ────────────
//
// Cierre clima 2026-09-04: `pisoDeFinca` (src/visual/mundo3d/pisosTermicos.js)
// es la ÚNICA tabla altitud→piso de finca (las 7 cotas de la Sierra colapsadas
// a 4). skyConditionService ya delegaba; quedaban copias numéricamente iguales
// pero independientes en agentService, alertEngine, chipIntentRouter, y el
// barrido encontró otras (cropSuggestions, incendioRiskService,
// restauracionDiagnostic). Un arreglo a medias que barre una sola superficie es
// el patrón que ya costó caro: si la cota se mueve en un sitio y no en otro,
// alertEngine vuelve a disparar helada con un umbral distinto al del clima.
//
// DOS MITADES (un guardián que solo mira una mitad se ve idéntico a uno que no
// funciona):
//   1. COMPORTAMIENTO — todos los clasificadores exportados devuelven EXACTO
//      lo que pisoDeFinca (con su vocabulario propio) en una grilla de cotas
//      y bordes. Si alguien introduce una tabla con cortes distintos, el valor
//      diverge y el test cae.
//   2. ESTÁTICO — los módulos que DELEGAN no pueden volver a contener la
//      cascada numérica independiente (≥3000 / ≥2000 / ≥1000 o su forma
//      `<1000 <2000 <3000`) en código, ni perder la llamada a `pisoDeFinca`.
//      Si reaparece una tabla a mano, el test falla al hacer commit.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { pisoDeFinca } from '../../visual/mundo3d/pisosTermicos.js';
import { pisoTermicoFromAltitud as agentePiso } from '../agentService.js';
import { pisoTermicoFromAltitud as cultivoPiso } from '../../data/cropSuggestions.js';
import { __testing__ as incendioTesting } from '../incendioRiskService.js';
import { pisoFromMsnm } from '../skyConditionService.js';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Vocabulario histórico con tilde de agentService (el agente lo lee/pronuncia).
const TILDES = Object.freeze({ calido: 'cálido', templado: 'templado', frio: 'frío', paramo: 'páramo' });

// Grilla de cotas: bordes exactos (0/1000/2000/3000/4000/4800) y un valor por
// banda, incluida la cumbre y por encima (nival cae a páramo en finca).
const COTAS = [0, 1, 150, 299, 300, 500, 999, 1000, 1500, 1999, 2000, 2500, 2999,
  3000, 3400, 3999, 4000, 4500, 4799, 4800, 5000, 5775, 6500];

describe('SSOT pisos de finca — los clasificadores DELEGAN y no se desvían', () => {
  it('agentService.pisoTermicoFromAltitud = pisoDeFinca (vocabulario con tilde)', () => {
    for (const cota of COTAS) {
      const canon = pisoDeFinca(cota);
      expect(agentePiso(cota)).toBe(canon ? TILDES[canon] : null);
    }
    // Entradas ausentes/rotas → null (cero fabricación), igual que antes.
    expect(agentePiso(null)).toBeNull();
    expect(agentePiso(undefined)).toBeNull();
    expect(agentePiso('')).toBeNull();
    expect(agentePiso('abc')).toBeNull();
    // String numérica sigue parseando (lo usa AgentScreen con el chip).
    expect(agentePiso('2580')).toBe('frío');
  });

  it('cropSuggestions.pisoTermicoFromAltitud = pisoDeFinca con su guard anti-0', () => {
    for (const cota of COTAS) {
      if (cota <= 0) expect(cultivoPiso(cota)).toBeNull();
      else expect(cultivoPiso(cota)).toBe(pisoDeFinca(cota));
    }
    expect(cultivoPiso(0)).toBeNull();
    expect(cultivoPiso(null)).toBeNull();
    expect(cultivoPiso(undefined)).toBeNull();
    expect(cultivoPiso('—')).toBeNull();
    expect(cultivoPiso('abc')).toBeNull();
  });

  it('incendioRiskService.pisoDesdeAltitud = pisoDeFinca (o null sin dato)', () => {
    const { pisoDesdeAltitud } = incendioTesting;
    for (const cota of COTAS) {
      expect(pisoDesdeAltitud(cota)).toBe(pisoDeFinca(cota));
    }
    expect(pisoDesdeAltitud(null)).toBeNull();
    expect(pisoDesdeAltitud(undefined)).toBeNull();
    expect(pisoDesdeAltitud('abc')).toBeNull();
  });

  it('skyConditionService.pisoFromMsnm = pisoDeFinca (slug de finca, sin tilde)', () => {
    for (const cota of COTAS) {
      expect(pisoFromMsnm(cota)).toBe(pisoDeFinca(cota));
    }
    expect(pisoFromMsnm('2500')).toBe(pisoDeFinca(2500));
    expect(pisoFromMsnm('no-num')).toBeNull();
  });

  it('pisoDeFinca colapsa las 7 cotas a 4 pisos de finca (superpáramo y nival → páramo)', () => {
    expect(pisoDeFinca(500)).toBe('calido');
    expect(pisoDeFinca(1500)).toBe('templado');
    expect(pisoDeFinca(2500)).toBe('frio');
    expect(pisoDeFinca(3500)).toBe('paramo');
    expect(pisoDeFinca(4500)).toBe('paramo'); // superpáramo
    expect(pisoDeFinca(5200)).toBe('paramo'); // nival
    expect(pisoDeFinca(null)).toBeNull();
    expect(pisoDeFinca('')).toBeNull();
  });
});

describe('SSOT pisos de finca — sin tabla numérica independiente en los módulos que delegan', () => {
  // Módulos que ya DELEGAN. Si uno vuelve a escribir la cascada de cotas
  // (>=3000/>=2000/>=1000 o <1000/<2000/<3000) como tabla propia, el clima,
  // las alertas de helada y el agente pueden volver a divergir en silencio.
  const MODULOS = [
    'src/services/agentService.js',
    'src/services/alertEngine.js',
    'src/services/chipIntentRouter.js',
    'src/data/cropSuggestions.js',
    'src/services/incendioRiskService.js',
    'src/services/restauracionDiagnostic.js',
    'src/services/skyConditionService.js',
  ];
  const ruta = (f) => path.resolve(__dir, '../../../', f);

  function codigoSinComentarios(src) {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '') // bloques /* … */
      .split('\n')
      .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')) // líneas //
      .join('\n');
  }

  for (const mod of MODULOS) {
    it(`${mod} delega en pisoDeFinca y no conserva cortes numéricos propios`, () => {
      const codigo = codigoSinComentarios(readFileSync(ruta(mod), 'utf8'));
      expect(codigo, `${mod} debe llamar al SSOT pisoDeFinca`).toContain('pisoDeFinca');
      // La cascada clásica de la tabla independiente (ambos sentidos de corte).
      expect(codigo, `${mod} reintroduce una tabla de pisos independiente`).not.toMatch(
        /[<>]=?\s*\b(?:1000|2000|3000)\b/,
      );
    });
  }
});

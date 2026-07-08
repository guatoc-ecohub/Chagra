/**
 * outputGuards.helada2.test.js — REGRESIÓN P0 del guard térmico (#gl-guardhelada2).
 *
 * Contexto (piloto Choachí 2.513 msnm): el guard llamaba "riesgo de HELADA" a
 * cualquier temperatura por debajo del `temp_min` del cultivo, p.ej. "riesgo de
 * helada: fresa sufre por debajo de ~14°C y el pronóstico baja a 9°C". Tres
 * problemas corregidos:
 *   (1) "helada" = ≤0°C (convención IDEAM); una mínima de 9°C NO es helada. El
 *       guard ahora etiqueta "riesgo de frío" (estrés térmico) cuando no hay
 *       helada ambiental ni cruza el helada_letal del cultivo.
 *   (2) AUTOCONTRADICCIÓN: el body del modelo ya decía "fresa resistente hasta
 *       -5°C" y el guard antepuso "sufre por debajo de ~14°C" en la misma
 *       burbuja. Ahora, si el body ya citó un umbral para esa especie, el guard
 *       no antepone otro.
 *   (3) UMBRAL CALIDO EN CULTIVO DE FRIO: al usar `helada_letal` (p.ej. fresa
 *       = -3°C) en lugar del `temp_min` (≈12°C, que es el óptimo mínimo), no
 *       aplica el umbral de cálido a un cultivo de frío.
 *
 * Ground-truth: este archivo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardThermalViability,
  applyOutputGuards,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// Especies reales del catálogo (catálogo seed v3.1).
// Fresa (Fragaria × ananassa): cultivo de FRÍO, prospera 1800–3000 msnm.
//   temperatura_c: { helada_letal: -3, optimo_min: 12, optimo_max: 22 }
// El grounding puede entregar temp_min=12 (óptimo) Y helada_letal=-3 (daño real).
const FRESA = {
  kind: 'species',
  mentioned: 'fresa',
  nombre_comun: 'Fresa',
  nombre_cientifico: 'Fragaria × ananassa',
  temp_min: 12, // óptimo mínimo
  temp_max: 22,
  helada_letal: -3, // umbral real de daño (del catálogo)
};

// Tomate (Solanum lycopersicum): cultivo CLÁLIDO-TEMPLADO, sin helada_letal.
//   El guard cae al fallback temp_min. Cuando el pronóstico no baja a 0°C, el
//   etiqueta correcta es "frío" (estrés), no "helada".
const TOMATE = {
  kind: 'species',
  mentioned: 'tomate',
  nombre_comun: 'Tomate',
  nombre_cientifico: 'Solanum lycopersicum',
  temp_min: 12,
  temp_max: 30,
};

describe('guardThermalViability — fix #gl-guardhelada2', () => {
  describe('(3) no aplicar umbral cálido a cultivo de frío', () => {
    it('Fresa con helada_letal=-3 y pronóstico 9°C: NO dispara (9 > -3+2)', () => {
      const txt = 'La fresa va muy bien en tu finca de Choachí, siémbrala ya.';
      const out = guardThermalViability(txt, [FRESA], null, {
        forecastTempMin: 9,
        // forecastTempMax por debajo de temp_max-margen (22-2=20) para aislar
        // solo el comportamiento del umbral de FRÍO en este test.
        forecastTempMax: 18,
      });
      // 9°C está por encima de helada_letal + margen (-1°C) → NO hay riesgo real.
      expect(out.modified).toBe(false);
    });

    it('Fresa con solo temp_min=12 (sin helada_letal) y pronóstico 9°C: etiqueta "frío", NO "helada"', () => {
      const fresaSinHeladaLetal = { ...FRESA };
      delete fresaSinHeladaLetal.helada_letal;
      const txt = 'La fresa va muy bien en tu finca, siémbrala.';
      const out = guardThermalViability(txt, [fresaSinHeladaLetal], null, {
        forecastTempMin: 9,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(true);
      // CRÍTICO: 9°C NO es helada. Etiqueta correcta: "frío".
      expect(out.text).toMatch(/riesgo de fr[ií]o/i);
      expect(out.text).not.toMatch(/riesgo de helada/i);
    });
  });

  describe('(1) "helada" = ≤0°C real; "frío" para lo demás', () => {
    it('Tomate con temp_min=12 y pronóstico 4°C: etiqueta "frío", NO "helada"', () => {
      const txt = 'El tomate va muy bien, siémbralo ahora.';
      const out = guardThermalViability(txt, [TOMATE], null, {
        forecastTempMin: 4,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/riesgo de fr[ií]o/i);
      expect(out.text).not.toMatch(/riesgo de helada/i);
    });

    it('Tomate con temp_min=12 y pronóstico -1°C (bajo 0): SÍ etiqueta "helada"', () => {
      const txt = 'El tomate va muy bien, siémbralo ahora.';
      const out = guardThermalViability(txt, [TOMATE], null, {
        forecastTempMin: -1,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/riesgo de helada/i);
    });

    it('Fresa con helada_letal=-3 y pronóstico -2°C: SÍ etiqueta "helada" (cruza el letal)', () => {
      const txt = 'La fresa va muy bien, siémbrala.';
      const out = guardThermalViability(txt, [FRESA], null, {
        forecastTempMin: -2,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/riesgo de helada/i);
    });

    it('NO llama "helada" a una mínima de 14°C (regresión exacta del piloto)', () => {
      // Caso literal del bug: cualquier cultivo con temp_min ≤ 14 y pronóstico
      // 14°C. Antes decía "riesgo de helada: sufre por debajo de ~14°C".
      const tomate14 = { ...TOMATE, temp_min: 14 };
      const txt = 'Siembra el tomate.';
      const out = guardThermalViability(txt, [tomate14], null, {
        forecastTempMin: 14,
        forecastTempMax: 22,
      });
      // El guard sigue disparando (14 ≤ 14+2) — no es punto de este test. Pero
      // la ETIQUETA debe ser "frío", NO "helada" (14 > 0°C).
      if (out.modified) {
        expect(out.text).not.toMatch(/riesgo de helada/i);
        expect(out.text).toMatch(/riesgo de fr[ií]o/i);
      }
    });
  });

  describe('(2) anti-autocontradicción: body ya citó umbral', () => {
    it('Body dice "fresa resistente hasta -5°C" → guard NO antepone otro umbral', () => {
      const txt =
        'La fresa es una buena opción para tu finca. Es resistente hasta -5°C, así que el clima de Choachí no le afecta. Siémbrala con confianza.';
      const out = guardThermalViability(txt, [FRESA], null, {
        forecastTempMin: -2,
        forecastTempMax: 18,
      });
      // El body ya citó un umbral (-5°C) para la fresa → el guard no antepone
      // otro distinto que lo contradiga.
      expect(out.modified).toBe(false);
    });

    it('Body dice "aguanta 0°C sin problema" → guard NO antepone umbral', () => {
      const txt =
        'La fresa va muy bien, aguanta 0°C sin problema alguno en Nochebuena. Plántala ya.';
      const out = guardThermalViability(txt, [FRESA], null, {
        forecastTempMin: -1,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(false);
    });

    it('Body SIN umbral numérico → guard SÍ puede disparar normalmente', () => {
      const txt = 'La fresa va muy bien, siémbrala ya.';
      const out = guardThermalViability(txt, [FRESA], null, {
        forecastTempMin: -2,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(true);
      expect(out.text).toMatch(/riesgo de helada/i);
    });
  });

  describe('Compatibilidad regresión: idempotencia y no-op', () => {
    it('idempotente con la nueva etiqueta "frío"', () => {
      const txt = 'El tomate va muy bien, siémbralo ahora.';
      const once = guardThermalViability(txt, [TOMATE], null, {
        forecastTempMin: 4,
        forecastTempMax: 18,
      });
      expect(once.modified).toBe(true);
      // Segunda pasada sobre el texto ya advertido → no repite.
      const twice = guardThermalViability(once.text, [TOMATE], null, {
        forecastTempMin: 4,
        forecastTempMax: 18,
      });
      expect(twice.modified).toBe(false);
    });

    it('NO-OP sin forecast', () => {
      const txt = 'El tomate va muy bien, siémbralo.';
      expect(guardThermalViability(txt, [TOMATE], null, {}).modified).toBe(false);
    });

    it('NO-OP sin entidades', () => {
      const out = guardThermalViability('Siembra el tomate.', [], null, {
        forecastTempMin: 4,
        forecastTempMax: 18,
      });
      expect(out.modified).toBe(false);
    });
  });

  describe('applyOutputGuards cablea el fix en la cadena completa', () => {
    it('CASO PILOTO Choachí: fresa + body con umbral + forecast frío → NO antepone helada', () => {
      const resolved = [FRESA];
      const llmOk =
        'La fresa es perfecta para tu finca a 2.513 msnm. Es resistente hasta -5°C, ' +
        'así que las noches frías no la afectan. Siémbrala con confianza.';
      const out = applyOutputGuards(llmOk, {
        resolvedEntities: resolved,
        forecastTempMin: -1,
        forecastTempMax: 18,
        userMessage: '¿Puedo sembrar fresa en Choachí?',
      });
      // El body ya dio el umbral de frío para la fresa → no se antepone otro.
      expect(out.text).not.toMatch(/sufre por debajo de ~14/);
      expect(out.text).not.toMatch(/riesgo de helada: fresa sufre por debajo de ~-3/);
    });

    it('CASO PILOTO sin body umbral: fresa + forecast 9°C → NO dispara (9 > helada_letal+margen)', () => {
      const resolved = [FRESA];
      const llm = 'La fresa la puedes sembrar ahora en tu finca.';
      const out = applyOutputGuards(llm, {
        resolvedEntities: resolved,
        forecastTempMin: 9,
        forecastTempMax: 18,
        userMessage: '¿Siembro fresa?',
      });
      // helada_letal=-3 → 9°C no cruza -1°C → no hay advertencia.
      expect(out.modified).toBe(false);
    });
  });
});

import { describe, test, expect } from 'vitest';
import {
  pestMonitoringWindow,
  pestMonitoringMessage,
} from '../lunarPestService';

describe('lunarPestService — pestMonitoringWindow', () => {
  describe('inputs inválidos → null (safe default)', () => {
    test('null → null', () => {
      expect(pestMonitoringWindow(null)).toBeNull();
    });

    test('undefined → null', () => {
      expect(pestMonitoringWindow(undefined)).toBeNull();
    });

    test('objeto vacío → null', () => {
      expect(pestMonitoringWindow(/** @type {any} */ ({}))).toBeNull();
    });

    test('objeto sin daysSinceNewMoon → null', () => {
      expect(
        pestMonitoringWindow(/** @type {any} */ ({
          daysToNewMoon: 5,
          fraction: 0.5,
        }))
      ).toBeNull();
    });

    test('daysSinceNewMoon null → null', () => {
      expect(
        pestMonitoringWindow(/** @type {any} */ ({
          daysSinceNewMoon: null,
          daysToNewMoon: 5,
        }))
      ).toBeNull();
    });

    test('daysSinceNewMoon string → null (type check)', () => {
      expect(
        pestMonitoringWindow(/** @type {any} */ ({
          daysSinceNewMoon: '5',
          daysToNewMoon: 10,
        }))
      ).toBeNull();
    });
  });

  describe('ventana óptima de muestreo (±3 días de luna nueva)', () => {
    test('luna nueva exacta (día 0) → inWindow true, daysToCenter 0, direction past', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 0,
        daysToNewMoon: 29.5,
        fraction: 0,
      });

      expect(result).not.toBeNull();
      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(0);
      // 0 < 29.5 → 'past' (acabamos de pasar luna nueva)
      expect(result.centerDirection).toBe('past');
      expect(result.captureMultiplier).toBe('2-4×');
      expect(result.evidenceLevel).toBe(2);
      expect(result.evidenceCitation).toBe('Yela & Holyoak 1997 Environmental Entomology');
    });

    test('1 día después de luna nueva → inWindow true', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 1,
        daysToNewMoon: 28.5,
        fraction: 0.03,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(1);
      expect(result.centerDirection).toBe('past');
    });

    test('2 días después de luna nueva → inWindow true', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 2,
        daysToNewMoon: 27.5,
        fraction: 0.07,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(2);
      expect(result.centerDirection).toBe('past');
    });

    test('3 días después de luna nueva → inWindow true (límite)', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 3,
        daysToNewMoon: 26.5,
        fraction: 0.1,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(3);
      expect(result.centerDirection).toBe('past');
    });

    test('1 día antes de luna nueva → inWindow true', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 28.5,
        daysToNewMoon: 1,
        fraction: 0.97,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(1);
      expect(result.centerDirection).toBe('future');
    });

    test('2 días antes de luna nueva → inWindow true', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 27.5,
        daysToNewMoon: 2,
        fraction: 0.93,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(2);
      expect(result.centerDirection).toBe('future');
    });

    test('3 días antes de luna nueva → inWindow true (límite)', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 26.5,
        daysToNewMoon: 3,
        fraction: 0.9,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(3);
      expect(result.centerDirection).toBe('future');
    });
  });

  describe('fuera de ventana (>3 días de luna nueva)', () => {
    test('4 días después de luna nueva → inWindow false', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 4,
        daysToNewMoon: 25.5,
        fraction: 0.14,
      });

      expect(result.inWindow).toBe(false);
      expect(result.daysToCenter).toBe(4);
      expect(result.centerDirection).toBe('past');
    });

    test('7 días después de luna nueva (primer cuarto) → inWindow false', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 7,
        daysToNewMoon: 22.5,
        fraction: 0.24,
      });

      expect(result.inWindow).toBe(false);
      expect(result.daysToCenter).toBe(7);
    });

    test('14 días (luna llena) → inWindow false', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 14,
        daysToNewMoon: 15.5,
        fraction: 0.5,
      });

      expect(result.inWindow).toBe(false);
      expect(result.daysToCenter).toBe(14);
    });

    test('21 días (último cuarto) → inWindow false', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 21,
        daysToNewMoon: 8.5,
        fraction: 0.76,
      });

      expect(result.inWindow).toBe(false);
      expect(result.daysToCenter).toBe(8.5);
      expect(result.centerDirection).toBe('future');
    });
  });

  describe('centerDirection — lógica de dirección temporal', () => {
    test('daysSince < daysTo → direction past', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 2,
        daysToNewMoon: 27,
        fraction: 0.07,
      });

      expect(result.centerDirection).toBe('past');
    });

    test('daysTo < daysSince → direction future', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 27,
        daysToNewMoon: 2,
        fraction: 0.93,
      });

      expect(result.centerDirection).toBe('future');
    });

    test('daysSince < daysTo → direction past (el menor gana)', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 14.5,
        daysToNewMoon: 15,
        fraction: 0.5,
      });

      // daysSince (14.5) < daysTo (15) → 'past'
      expect(result.centerDirection).toBe('past');
      expect(result.daysToCenter).toBe(14.5);
    });

    test('días iguales → direction future (tie-breaker)', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 14.75,
        daysToNewMoon: 14.75,
        fraction: 0.5,
      });

      // Tie → else if (daysTo < daysSince) es false, cae a futuro
      // Revisando código: else if (daysTo < daysSince) → no es menor, son iguales
      // Entonces no entra a ningún if especial, pero el código dice:
      // if (daysSince < daysTo) past; else if (daysTo < daysSince) future
      // Si son iguales, no cumple ninguna condición, queda 'now' por default
      expect(result.centerDirection).toBe('now');
    });
  });

  describe('casos borde numéricos', () => {
    test('daysSinceNewMoon decimal pequeño → distancia correcta', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 0.5,
        daysToNewMoon: 29,
        fraction: 0.02,
      });

      expect(result.daysToCenter).toBe(0.5);
      expect(result.inWindow).toBe(true);
    });

    test('distancia desde daysTo cuando es menor (pero >3, fuera de ventana)', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 26,
        daysToNewMoon: 3.5,
        fraction: 0.9,
      });

      // daysTo (3.5) < daysSince (26) → usa daysTo
      expect(result.daysToCenter).toBe(3.5);
      // 3.5 > 3 → fuera de ventana
      expect(result.inWindow).toBe(false);
      expect(result.centerDirection).toBe('future');
    });

    test('límite exacto de ventana (3 días) → inWindow true', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 3,
        daysToNewMoon: 26.5,
        fraction: 0.1,
      });

      expect(result.inWindow).toBe(true);
      expect(result.daysToCenter).toBe(3);
    });

    test('un día más allá del límite (3.1) → inWindow false', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 3.1,
        daysToNewMoon: 26.4,
        fraction: 0.11,
      });

      expect(result.inWindow).toBe(false);
      expect(result.daysToCenter).toBe(3.1);
    });
  });

  describe('valores constantes del objeto de respuesta', () => {
    test('captureMultiplier siempre es "2-4×"', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 2,
        daysToNewMoon: 27,
        fraction: 0.07,
      });

      expect(result.captureMultiplier).toBe('2-4×');
    });

    test('evidenceLevel siempre es 2', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 5,
        daysToNewMoon: 24,
        fraction: 0.17,
      });

      expect(result.evidenceLevel).toBe(2);
    });

    test('evidenceCitation siempre es Yela & Holyoak 1997', () => {
      const result = pestMonitoringWindow({
        daysSinceNewMoon: 10,
        daysToNewMoon: 19,
        fraction: 0.34,
      });

      expect(result.evidenceCitation).toBe('Yela & Holyoak 1997 Environmental Entomology');
    });
  });
});

describe('lunarPestService — pestMonitoringMessage', () => {
  describe('cuando NO está en ventana → null', () => {
    test('fuera de ventana → null', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 10,
        daysToNewMoon: 19,
        fraction: 0.34,
      });

      expect(result).toBeNull();
    });

    test('null input → null', () => {
      expect(pestMonitoringMessage(null)).toBeNull();
    });

    test('undefined input → null', () => {
      expect(pestMonitoringMessage(undefined)).toBeNull();
    });

    test('input inválido → null', () => {
      expect(
        pestMonitoringMessage({
          daysToNewMoon: 5,
          fraction: 0.5,
        })
      ).toBeNull();
    });
  });

  describe('mensaje cuando SÍ está en ventana', () => {
    test('luna nueva exacta → "Luna nueva esta noche"', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 0,
        daysToNewMoon: 29.5,
        fraction: 0,
      });

      expect(result).not.toBeNull();
      expect(result.headline).toBe('🌑 Ventana de muestreo nocturno');
      expect(result.sub).toBe('Luna nueva esta noche');
      expect(result.body).toContain('2-4× más individuos');
      expect(result.caveat).toContain('No es recomendación de tratamiento');
      expect(result.citation).toBe('Yela & Holyoak 1997 Environmental Entomology');
    });

    test('1 día después → "1 día después de luna nueva" (singular)', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1,
        daysToNewMoon: 28.5,
        fraction: 0.03,
      });

      expect(result.sub).toBe('1 día después de luna nueva');
    });

    test('2 días después → "2 días después de luna nueva" (plural)', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 2,
        daysToNewMoon: 27.5,
        fraction: 0.07,
      });

      expect(result.sub).toBe('2 días después de luna nueva');
    });

    test('3 días después → "3 días después de luna nueva"', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 3,
        daysToNewMoon: 26.5,
        fraction: 0.1,
      });

      expect(result.sub).toBe('3 días después de luna nueva');
    });

    test('1 día antes → "Luna nueva en 1 día" (singular)', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 28.5,
        daysToNewMoon: 1,
        fraction: 0.97,
      });

      expect(result.sub).toBe('Luna nueva en 1 día');
    });

    test('2 días antes → "Luna nueva en 2 días" (plural)', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 27.5,
        daysToNewMoon: 2,
        fraction: 0.93,
      });

      expect(result.sub).toBe('Luna nueva en 2 días');
    });

    test('3 días antes → "Luna nueva en 3 días"', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 26.5,
        daysToNewMoon: 3,
        fraction: 0.9,
      });

      expect(result.sub).toBe('Luna nueva en 3 días');
    });
  });

  describe('estructura completa del mensaje', () => {
    test('campos requeridos presentes', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1.5,
        daysToNewMoon: 28,
        fraction: 0.05,
      });

      expect(result).toHaveProperty('headline');
      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('caveat');
      expect(result).toHaveProperty('citation');
    });

    test('headline siempre igual', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 2,
        daysToNewMoon: 27,
        fraction: 0.07,
      });

      expect(result.headline).toBe('🌑 Ventana de muestreo nocturno');
    });

    test('body menciona trampa de luz', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1,
        daysToNewMoon: 28.5,
        fraction: 0.03,
      });

      expect(result.body).toContain('trampa de luz');
    });

    test('body mención 2-4× más individuos', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 3,
        daysToNewMoon: 26.5,
        fraction: 0.1,
      });

      expect(result.body).toContain('2-4× más individuos');
    });

    test('caveat aclara que es muestreo, no tratamiento', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 2.5,
        daysToNewMoon: 27,
        fraction: 0.08,
      });

      expect(result.caveat).toContain('No es recomendación de tratamiento');
      expect(result.caveat).toContain('es muestreo');
      expect(result.caveat).toContain('Si no tiene trampa, ignore');
    });

    test('citation coincide con ventana', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1,
        daysToNewMoon: 28,
        fraction: 0.03,
      });

      expect(result.citation).toBe('Yela & Holyoak 1997 Environmental Entomology');
    });
  });

  describe('singular/plural en días', () => {
    test('1 día (singular) después de luna nueva', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1,
        daysToNewMoon: 28,
        fraction: 0.03,
      });

      expect(result.sub).toBe('1 día después de luna nueva');
    });

    test('2 días (plural) después de luna nueva', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 2,
        daysToNewMoon: 27,
        fraction: 0.07,
      });

      expect(result.sub).toBe('2 días después de luna nueva');
    });

    test('1 día (singular) antes de luna nueva', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 28,
        daysToNewMoon: 1,
        fraction: 0.97,
      });

      expect(result.sub).toBe('Luna nueva en 1 día');
    });

    test('2 días (plural) antes de luna nueva', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 27,
        daysToNewMoon: 2,
        fraction: 0.93,
      });

      expect(result.sub).toBe('Luna nueva en 2 días');
    });
  });

  describe('redondeo de días', () => {
    test('1.4 días → redondea a 1', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1.4,
        daysToNewMoon: 28,
        fraction: 0.05,
      });

      expect(result.sub).toBe('1 día después de luna nueva');
    });

    test('1.5 días → redondea a 2', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1.5,
        daysToNewMoon: 28,
        fraction: 0.05,
      });

      expect(result.sub).toBe('2 días después de luna nueva');
    });

    test('1.6 días → redondea a 2', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1.6,
        daysToNewMoon: 27.5,
        fraction: 0.05,
      });

      expect(result.sub).toBe('2 días después de luna nueva');
    });

    test('2.5 días → redondea a 3', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 2.5,
        daysToNewMoon: 27,
        fraction: 0.08,
      });

      expect(result.sub).toBe('3 días después de luna nueva');
    });

    test('0.4 días antes → redondea a 0 → "Luna nueva esta noche"', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 29,
        daysToNewMoon: 0.4,
        fraction: 0.99,
      });

      // daysToCenter = 0.4, Math.round(0.4) = 0
      // centerDirection = 'future', daysRounded = 0
      // w.centerDirection === 'now' || daysRounded === 0 → true
      expect(result.sub).toBe('Luna nueva esta noche');
    });
  });

  describe('casos borde de centerDirection en mensaje', () => {
    test('centerDirection now con días > 0 → null (fuera de ventana)', () => {
      // Este caso es cuando daysSince ≈ daysTo (mitad de ciclo lunar)
      // daysToCenter = 14.75 > 3 → fuera de ventana → null
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 14.75,
        daysToNewMoon: 14.75,
        fraction: 0.5,
      });

      // 14.75 > 3 → fuera de ventana
      expect(result).toBeNull();
    });

    test('centerDirection past con días exactos', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 1,
        daysToNewMoon: 28,
        fraction: 0.03,
      });

      expect(result.sub).toBe('1 día después de luna nueva');
    });

    test('centerDirection future con días exactos', () => {
      const result = pestMonitoringMessage({
        daysSinceNewMoon: 28,
        daysToNewMoon: 1,
        fraction: 0.97,
      });

      expect(result.sub).toBe('Luna nueva en 1 día');
    });
  });
});

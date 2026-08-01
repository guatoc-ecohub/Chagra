/**
 * locationService.coarse.test.js — umbral de geolocalización gruesa (#coarse-location).
 *
 * El operador reportó: en Brave/NixOS sin GPS, `navigator.geolocation` ubica
 * por IP/wifi con accuracy de varios km → cae en la cabecera municipal y la
 * altitud derivada es la de la cabecera (1923 msnm), no la de la finca real
 * (2580 msnm). Esa altitud equivocada envenena la viabilidad de cultivos y las
 * alertas de helada del agente.
 *
 * Esta suite verifica el predicado puro que decide si una lectura es gruesa.
 */
import { describe, test, expect } from 'vitest';
import { isCoarseLocation, COARSE_ACCURACY_THRESHOLD_M } from '../locationService';

describe('isCoarseLocation — umbral de geolocalización gruesa', () => {
  test('el umbral por defecto es 5000 m (conservador)', () => {
    expect(COARSE_ACCURACY_THRESHOLD_M).toBe(5000);
  });

  test('GPS de celular preciso (<50 m) NO es grueso', () => {
    expect(isCoarseLocation(35)).toBe(false);
    expect(isCoarseLocation(50)).toBe(false);
  });

  test('lectura por IP/wifi de varios km SÍ es gruesa', () => {
    expect(isCoarseLocation(12000)).toBe(true);
    expect(isCoarseLocation(45000)).toBe(true);
  });

  test('exactamente en el umbral NO es gruesa (estricto >)', () => {
    expect(isCoarseLocation(5000)).toBe(false);
  });

  test('justo por encima del umbral es gruesa', () => {
    expect(isCoarseLocation(5001)).toBe(true);
  });

  test('umbral parametrizable', () => {
    expect(isCoarseLocation(1500, 1000)).toBe(true);
    expect(isCoarseLocation(1500, 2000)).toBe(false);
  });

  test('accuracy no numérico/ausente NO se considera grueso', () => {
    expect(isCoarseLocation(null)).toBe(false);
    expect(isCoarseLocation(undefined)).toBe(false);
    expect(isCoarseLocation(NaN)).toBe(false);
    expect(isCoarseLocation(/** @type {any} */ ('no-soy-numero'))).toBe(false);
  });
});

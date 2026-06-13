/**
 * agroecologyIndicators.test.js — valida la estructura de
 * agroecology-indicators.json (TAPE + MESMIS para radar de evolución)
 *
 * Task 6220: verificar que el JSON tiene exactamente 10 elementos TAPE
 * y 5 atributos MESMIS con IDs correctos y campos completos.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'agroecology-indicators.json');

describe('agroecology-indicators.json', () => {
  let data;

  beforeAll(() => {
    const raw = readFileSync(DATA_PATH, 'utf8');
    data = JSON.parse(raw);
  });

  describe('estructura general', () => {
    it('tiene la clave tape_10_elementos', () => {
      expect(data).toHaveProperty('tape_10_elementos');
    });

    it('tiene la clave mesmis_5_atributos', () => {
      expect(data).toHaveProperty('mesmis_5_atributos');
    });
  });

  describe('TAPE (10 elementos)', () => {
    it('tiene exactamente 10 elementos', () => {
      expect(data.tape_10_elementos).toHaveLength(10);
    });

    const tapeIds = [
      'diversidad',
      'sinergias',
      'eficiencia',
      'resiliencia',
      'reciclaje',
      'cocreacion_conocimiento',
      'valores_humanos_sociales',
      'cultura_tradiciones',
      'economia_circular_solidaria',
      'gobernanza'
    ];

    it.each(tapeIds)('tiene el elemento con id="%s"', (id) => {
      const element = data.tape_10_elementos.find((e) => e.id === id);
      expect(element).toBeDefined();
      expect(element).toHaveProperty('id', id);
      expect(element).toHaveProperty('nombre');
      expect(element).toHaveProperty('descripcion_corta');
      expect(element.nombre).toBeTruthy();
      expect(element.descripcion_corta).toBeTruthy();
    });
  });

  describe('MESMIS (5 atributos)', () => {
    it('tiene exactamente 5 atributos', () => {
      expect(data.mesmis_5_atributos).toHaveLength(5);
    });

    const mesmisIds = [
      'productividad',
      'estabilidad_resiliencia',
      'adaptabilidad',
      'equidad',
      'autodependencia'
    ];

    it.each(mesmisIds)('tiene el atributo con id="%s"', (id) => {
      const element = data.mesmis_5_atributos.find((e) => e.id === id);
      expect(element).toBeDefined();
      expect(element).toHaveProperty('id', id);
      expect(element).toHaveProperty('nombre');
      expect(element).toHaveProperty('descripcion_corta');
      expect(element.nombre).toBeTruthy();
      expect(element.descripcion_corta).toBeTruthy();
    });
  });

  describe('validación de campos', () => {
    it('todos los elementos TAPE tienen id, nombre y descripcion_corta no vacíos', () => {
      data.tape_10_elementos.forEach((element) => {
        expect(element.id).toBeTruthy();
        expect(typeof element.id).toBe('string');
        expect(element.nombre).toBeTruthy();
        expect(typeof element.nombre).toBe('string');
        expect(element.descripcion_corta).toBeTruthy();
        expect(typeof element.descripcion_corta).toBe('string');
      });
    });

    it('todos los atributos MESMIS tienen id, nombre y descripcion_corta no vacíos', () => {
      data.mesmis_5_atributos.forEach((element) => {
        expect(element.id).toBeTruthy();
        expect(typeof element.id).toBe('string');
        expect(element.nombre).toBeTruthy();
        expect(typeof element.nombre).toBe('string');
        expect(element.descripcion_corta).toBeTruthy();
        expect(typeof element.descripcion_corta).toBe('string');
      });
    });
  });

  describe('sin elementos extra', () => {
    it('no tiene claves adicionales fuera de tape_10_elementos y mesmis_5_atributos', () => {
      const keys = Object.keys(data);
      expect(keys).toEqual(expect.arrayContaining(['tape_10_elementos', 'mesmis_5_atributos']));
      expect(keys.length).toBe(2);
    });
  });
});

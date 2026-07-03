/**
 * campesinoSynonyms.integrity.test.js — integridad del diccionario campesino.
 *
 * CAMPESINO_SYNONYMS (src/services/ragSynonyms.js) se construye con spread
 * de 8 categorías de src/data/campesino-synonyms.json:
 *   plagas, control, cultivo, clima, suelo_vocab, partes_planta,
 *   labores, plaga_hospedero
 *
 * Riesgo cubierto: una clave presente en DOS categorías se sobrescribe
 * silenciosamente al hacer spread — la última categoría gana y los
 * sinónimos de la primera se pierden sin aviso, degradando
 * expandQueryTokens.
 *
 * HALLAZGO (bug real documentado, ver KNOWN_COLLISIONS):
 *   - "gusano_del_cafe": plagas ["broca","hypothenemus","gorgojo"] es
 *     pisada por plaga_hospedero ["coffea_arabica","cafe","broca"]
 *     → se pierden "hypothenemus" y "gorgojo".
 *   - "aporcar": cultivo ["arrimar","tierra","tuberculo","cubrir"] es
 *     pisada por labores ["arrimar_tierra","cubrir_tuberculo","monticular"]
 *     → se pierden los 4 sinónimos de cultivo.
 *
 * Este test es SOLO LECTURA: no muta el JSON ni el diccionario.
 */
import { describe, it, expect } from 'vitest';
import { CAMPESINO_SYNONYMS } from '../../services/ragSynonyms.js';
import CAMPESINO_JSON from '../campesino-synonyms.json';

/**
 * Las 8 categorías spread en ragSynonyms.js, en el MISMO orden.
 * Si ragSynonyms.js agrega o quita una categoría, actualizar aquí.
 */
const CATEGORIES = [
  'plagas',
  'control',
  'cultivo',
  'clima',
  'suelo_vocab',
  'partes_planta',
  'labores',
  'plaga_hospedero',
];

/**
 * Colisiones cross-categoría CONOCIDAS (bug documentado arriba).
 * Al corregir el JSON, vaciar este set y el it.fails de abajo
 * empezará a fallar (vitest lo marca) — quitarlo también.
 */
const KNOWN_COLLISIONS = new Set(['gusano_del_cafe', 'aporcar']);

/** @returns {Map<string, string[]>} clave → categorías donde aparece */
function keyToCategories() {
  const map = new Map();
  for (const cat of CATEGORIES) {
    for (const key of Object.keys(CAMPESINO_JSON[cat])) {
      const cats = map.get(key) ?? [];
      cats.push(cat);
      map.set(key, cats);
    }
  }
  return map;
}

describe('campesino-synonyms — integridad cross-categoría', () => {
  it('las 8 categorías existen en el JSON crudo y son objetos no vacíos', () => {
    for (const cat of CATEGORIES) {
      expect(CAMPESINO_JSON[cat], `categoría "${cat}" ausente en el JSON`).toBeTypeOf('object');
      expect(
        Object.keys(CAMPESINO_JSON[cat]).length,
        `categoría "${cat}" está vacía`,
      ).toBeGreaterThan(0);
    }
  });

  it('no aparecen colisiones NUEVAS entre categorías (baseline = bug conocido)', () => {
    const collisions = [...keyToCategories().entries()]
      .filter(([, cats]) => cats.length > 1)
      .map(([key, cats]) => `${key} (${cats.join(' + ')})`);

    const unexpected = collisions.filter(
      (entry) => !KNOWN_COLLISIONS.has(entry.split(' ')[0]),
    );
    expect(
      unexpected,
      'Nueva clave duplicada entre categorías: el spread en ragSynonyms.js ' +
        'la sobrescribirá silenciosamente y se perderán sinónimos.',
    ).toEqual([]);

    // Las colisiones conocidas siguen presentes; si se corrigieron,
    // este assert avisa que hay que vaciar KNOWN_COLLISIONS.
    const found = new Set(collisions.map((entry) => entry.split(' ')[0]));
    expect([...found].sort()).toEqual([...KNOWN_COLLISIONS].sort());
  });

  // Invariante ideal: suma de tamaños de las 8 categorías === tamaño del
  // diccionario unido. HOY FALLA por las 2 colisiones documentadas
  // (56 claves sumadas vs 54 en el merge → sinónimos perdidos).
  // Cuando se corrija el JSON este it.fails reventará: convertirlo en
  // `it` normal y borrar KNOWN_COLLISIONS.
  it.fails('BUG conocido: la suma de claves por categoría NO iguala al diccionario unido', () => {
    const sum = CATEGORIES.reduce(
      (acc, cat) => acc + Object.keys(CAMPESINO_JSON[cat]).length,
      0,
    );
    expect(sum).toBe(Object.keys(CAMPESINO_SYNONYMS).length);
  });

  it('el diccionario unido contiene exactamente la unión de claves de las 8 categorías', () => {
    const unionKeys = [...keyToCategories().keys()].sort();
    expect(Object.keys(CAMPESINO_SYNONYMS).sort()).toEqual(unionKeys);
  });

  it('todo valor es un array no vacío de strings no vacíos (por categoría y en el merge)', () => {
    const check = (key, value, where) => {
      expect(Array.isArray(value), `${where} → "${key}" no es array`).toBe(true);
      expect(value.length, `${where} → "${key}" es un array vacío`).toBeGreaterThan(0);
      for (const syn of value) {
        expect(typeof syn, `${where} → "${key}" contiene un no-string`).toBe('string');
        expect(syn.trim().length, `${where} → "${key}" contiene un string vacío`).toBeGreaterThan(0);
      }
    };
    for (const cat of CATEGORIES) {
      for (const [key, value] of Object.entries(CAMPESINO_JSON[cat])) {
        check(key, value, `JSON.${cat}`);
      }
    }
    for (const [key, value] of Object.entries(CAMPESINO_SYNONYMS)) {
      check(key, value, 'CAMPESINO_SYNONYMS');
    }
  });

  it('ninguna clave se lista a sí misma como su propio sinónimo', () => {
    const selfListed = [];
    for (const cat of CATEGORIES) {
      for (const [key, value] of Object.entries(CAMPESINO_JSON[cat])) {
        if (value.includes(key)) selfListed.push(`${cat}.${key}`);
      }
    }
    expect(selfListed).toEqual([]);
  });
});

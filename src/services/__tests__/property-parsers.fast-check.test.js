import { describe, it, expect } from 'vitest';
import { parseIntent } from '../agentIntentParser.js';
import { getCompletedTaskIds } from '../../utils/taskCompletionParser.js';
import { clasificarPisoTermico } from '../pisoTermicoClassifier.js';

const STRING_CASES = [
  '',
  'hola',
  '   ',
  'sembré 3 tomates en la finca',
  'riego de emergencia por calor',
  '¿cuándo llueve?',
  'texto largo '.repeat(20),
  '🎯 cultivo con emoji',
];

const ARRAY_CASES = [
  [],
  [null],
  [undefined, null, 1],
  [{ id: 't1', status: 'done' }],
  ['a', 'b', 'c'],
  [1, 2, 3, 4, 5],
  [{}, { foo: 'bar' }, ['nested']],
  Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, status: i % 2 === 0 ? 'done' : 'open' })),
];

const ANY_CASES = [
  '',
  'texto',
  true,
  false,
  null,
  undefined,
  0,
  1,
  -1,
  42.5,
  NaN,
  Infinity,
  -Infinity,
  {},
  { a: 1 },
  [],
  [1, 'x', null],
  () => {},
];

const ALTITUDE_CASES = [
  -1e6,
  -1000,
  -1,
  0,
  1,
  499.9,
  500,
  1000,
  1500,
  2200,
  3200,
  4500,
  6000,
  9000,
  NaN,
];

describe('agentIntentParser — property-style tests', () => {
  it('any string input returns {intent, confidence} structure', () => {
    for (const text of STRING_CASES) {
      const result = parseIntent(text);
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    }
  });

  it('confidence is always between 0 and 1', () => {
    for (const text of STRING_CASES) {
      const result = parseIntent(text);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('null intent implies confidence 0', () => {
    for (const text of STRING_CASES) {
      const result = parseIntent(text);
      if (result.intent === null) {
        expect(result.confidence).toBe(0);
      }
    }
  });

  it('non-null intent has id, toolName, logType, parameters, originalText', () => {
    for (const text of STRING_CASES) {
      const result = parseIntent(text);
      if (result.intent !== null) {
        expect(result.intent).toHaveProperty('id');
        expect(result.intent).toHaveProperty('toolName');
        expect(result.intent).toHaveProperty('logType');
        expect(result.intent).toHaveProperty('parameters');
        expect(result.intent).toHaveProperty('originalText');
        expect(result.intent.originalText).toBe(text);
      }
    }
  });
});

describe('taskCompletionParser — property-style tests', () => {
  it('any array input returns a Set', () => {
    for (const arr of ARRAY_CASES) {
      const result = getCompletedTaskIds(arr);
      expect(result).toBeInstanceOf(Set);
    }
  });

  it('never throws on any array input', () => {
    for (const arr of ARRAY_CASES) {
      expect(() => getCompletedTaskIds(arr)).not.toThrow();
    }
  });

  it('returned Set size never exceeds input length', () => {
    for (const arr of ARRAY_CASES) {
      const result = getCompletedTaskIds(arr);
      expect(result.size).toBeLessThanOrEqual(arr.length);
    }
  });

  it('all Set entries are strings', () => {
    for (const arr of ARRAY_CASES) {
      const result = getCompletedTaskIds(arr);
      for (const id of result) {
        expect(typeof id).toBe('string');
      }
    }
  });
});

describe('pisoTermicoClassifier — property-style tests', () => {
  it('any number returns object with id or null', () => {
    for (const alt of ALTITUDE_CASES) {
      const result = clasificarPisoTermico(alt);
      if (result !== null) {
        expect(result).toHaveProperty('id');
        expect(typeof result.id).toBe('string');
      }
    }
  });

  it('negative numbers always return null', () => {
    for (const alt of ALTITUDE_CASES.filter((n) => Number.isFinite(n) && n < 0)) {
      expect(clasificarPisoTermico(alt)).toBeNull();
    }
  });

  it('NaN returns null', () => {
    expect(clasificarPisoTermico(NaN)).toBeNull();
  });

  it('non-number inputs always return null', () => {
    for (const input of ANY_CASES) {
      if (typeof input === 'number') continue;
      expect(clasificarPisoTermico(input)).toBeNull();
    }
  });

  it('idempotent on valid range — same altitude yields same piso', () => {
    for (const alt of ALTITUDE_CASES.filter((n) => Number.isFinite(n) && n >= 0 && n <= 6000)) {
      const r1 = clasificarPisoTermico(alt);
      const r2 = clasificarPisoTermico(alt);
      if (r1 === null) {
        expect(r2).toBeNull();
      } else {
        expect(r2).not.toBeNull();
        expect(r2.id).toBe(r1.id);
      }
    }
  });
});

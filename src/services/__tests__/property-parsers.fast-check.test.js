import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseIntent } from '../agentIntentParser.js';
import { getCompletedTaskIds } from '../../utils/taskCompletionParser.js';
import { clasificarPisoTermico } from '../pisoTermicoClassifier.js';

describe('agentIntentParser — property tests', () => {
  it('any string input returns {intent, confidence} structure', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = parseIntent(text);
        expect(result).toHaveProperty('intent');
        expect(result).toHaveProperty('confidence');
        expect(typeof result.confidence).toBe('number');
      }),
      { numRuns: 1000 },
    );
  });

  it('confidence is always between 0 and 1', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = parseIntent(text);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }),
      { numRuns: 1000 },
    );
  });

  it('null intent implies confidence 0', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = parseIntent(text);
        if (result.intent === null) {
          expect(result.confidence).toBe(0);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('non-null intent has id, toolName, logType, parameters, originalText', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = parseIntent(text);
        if (result.intent !== null) {
          expect(result.intent).toHaveProperty('id');
          expect(result.intent).toHaveProperty('toolName');
          expect(result.intent).toHaveProperty('logType');
          expect(result.intent).toHaveProperty('parameters');
          expect(result.intent).toHaveProperty('originalText');
          expect(result.intent.originalText).toBe(text);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe('taskCompletionParser — property tests', () => {
  it('any array input returns a Set', () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), (arr) => {
        const result = getCompletedTaskIds(arr);
        expect(result).toBeInstanceOf(Set);
      }),
      { numRuns: 1000 },
    );
  });

  it('never throws on any array input', () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), (arr) => {
        expect(() => getCompletedTaskIds(arr)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  it('returned Set size never exceeds input length', () => {
    fc.assert(
      fc.property(fc.array(fc.anything(), { maxLength: 100 }), (arr) => {
        const result = getCompletedTaskIds(arr);
        expect(result.size).toBeLessThanOrEqual(arr.length);
      }),
      { numRuns: 1000 },
    );
  });

  it('all Set entries are strings', () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), (arr) => {
        const result = getCompletedTaskIds(arr);
        for (const id of result) {
          expect(typeof id).toBe('string');
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe('pisoTermicoClassifier — property tests', () => {
  it('any number returns object with id or null', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (alt) => {
        const result = clasificarPisoTermico(alt);
        if (result !== null) {
          expect(result).toHaveProperty('id');
          expect(typeof result.id).toBe('string');
        }
      }),
      { numRuns: 5000 },
    );
  });

  it('negative numbers always return null', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e308, max: -1e-300, noNaN: true }),
        (alt) => {
          expect(clasificarPisoTermico(alt)).toBeNull();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('NaN returns null', () => {
    expect(clasificarPisoTermico(NaN)).toBeNull();
  });

  it('non-number inputs always return null', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object(),
          fc.array(fc.anything()),
        ),
        (input) => {
          expect(clasificarPisoTermico(input)).toBeNull();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('idempotent on valid range — same altitude yields same piso', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 6000, noNaN: true }),
        (alt) => {
          const r1 = clasificarPisoTermico(alt);
          const r2 = clasificarPisoTermico(alt);
          if (r1 === null) {
            expect(r2).toBeNull();
          } else {
            expect(r2).not.toBeNull();
            expect(r2.id).toBe(r1.id);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

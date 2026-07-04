import { describe, it, expect } from 'vitest';
import mergeDefault, {
  mergePartialOnInterruption,
  normalizeInterruptReason,
  PARTIAL_MARKERS,
  FULL_ERROR_MESSAGES,
} from '../agentPartialMerge.js';

describe('normalizeInterruptReason', () => {
  it.each(['timeout', 'abort', 'cancel'])('conserva la razón conocida %s', (reason) => {
    expect(normalizeInterruptReason(reason)).toBe(reason);
  });

  it.each(/** @type {Array<[string, any]>} */ ([
    ['undefined', undefined],
    ['null', null],
    ['string desconocido', 'network-error'],
    ['string vacío', ''],
    ['número', 42],
  ]))('normaliza %s a abort', (_label, value) => {
    expect(normalizeInterruptReason(value)).toBe('abort');
  });
});

describe('mergePartialOnInterruption — con parcial no vacío', () => {
  it.each(['timeout', 'abort', 'cancel'])(
    'preserva el parcial y apendea el marcador de %s',
    (reason) => {
      const partial = 'La luna llena favorece la siembra de';
      const result = mergePartialOnInterruption({ partialContent: partial, reason });

      expect(result).toEqual({
        preservePartial: true,
        content: partial + PARTIAL_MARKERS[reason],
        error: null,
        incomplete: true,
        reason,
      });
    },
  );

  it('no muta el parcial: el content empieza exactamente con el texto original', () => {
    const partial = '  espacios al borde conservados  ';
    const result = mergePartialOnInterruption({ partialContent: partial, reason: 'timeout' });

    expect(result.preservePartial).toBe(true);
    expect(result.content.startsWith(partial)).toBe(true);
    expect(result.content.endsWith(PARTIAL_MARKERS.timeout)).toBe(true);
  });

  it('con reason desconocido usa el marcador de abort', () => {
    const result = mergePartialOnInterruption({
      partialContent: 'texto parcial',
      reason: 'razon-inventada',
    });

    expect(result.reason).toBe('abort');
    expect(result.content).toBe('texto parcial' + PARTIAL_MARKERS.abort);
  });
});

describe('mergePartialOnInterruption — sin parcial útil', () => {
  it.each(/** @type {Array<[string, any]>} */ ([
    ['string vacío', ''],
    ['solo espacios', '   \n\t  '],
    ['null', null],
    ['undefined', undefined],
    ['no-string (número)', 7],
  ]))('con partialContent %s devuelve el error completo', (_label, partialContent) => {
    const result = mergePartialOnInterruption({ partialContent, reason: 'timeout' });

    expect(result).toEqual({
      preservePartial: false,
      content: null,
      error: FULL_ERROR_MESSAGES.timeout,
      incomplete: false,
      reason: 'timeout',
    });
  });

  it.each(['timeout', 'abort', 'cancel'])(
    'usa el mensaje de error correspondiente a %s',
    (reason) => {
      const result = mergePartialOnInterruption({ partialContent: '', reason });

      expect(result.error).toBe(FULL_ERROR_MESSAGES[reason]);
      expect(result.reason).toBe(reason);
    },
  );

  it('sin argumentos cae a abort sin parcial', () => {
    const result = mergePartialOnInterruption();

    expect(result).toEqual({
      preservePartial: false,
      content: null,
      error: FULL_ERROR_MESSAGES.abort,
      incomplete: false,
      reason: 'abort',
    });
  });

  it('con reason desconocido normaliza a abort', () => {
    const result = mergePartialOnInterruption({ partialContent: null, reason: 'wat' });

    expect(result.reason).toBe('abort');
    expect(result.error).toBe(FULL_ERROR_MESSAGES.abort);
  });
});

describe('constantes y export default', () => {
  it('PARTIAL_MARKERS y FULL_ERROR_MESSAGES cubren las tres razones', () => {
    const keys = ['timeout', 'abort', 'cancel'];
    expect(Object.keys(PARTIAL_MARKERS).sort()).toEqual([...keys].sort());
    expect(Object.keys(FULL_ERROR_MESSAGES).sort()).toEqual([...keys].sort());
    keys.forEach((k) => {
      expect(typeof PARTIAL_MARKERS[k]).toBe('string');
      expect(PARTIAL_MARKERS[k].length).toBeGreaterThan(0);
      expect(typeof FULL_ERROR_MESSAGES[k]).toBe('string');
      expect(FULL_ERROR_MESSAGES[k].length).toBeGreaterThan(0);
    });
  });

  it('los marcadores empiezan con doble salto de línea (no pegan al parcial)', () => {
    Object.values(PARTIAL_MARKERS).forEach((marker) => {
      expect(marker.startsWith('\n\n')).toBe(true);
    });
  });

  it('el export default es mergePartialOnInterruption', () => {
    expect(mergeDefault).toBe(mergePartialOnInterruption);
  });
});

import { describe, it, expect } from 'vitest';
import { prependCorrectionBlock } from '../responseGuards';

describe('prependCorrectionBlock', () => {
  it('antepone un bloque de correccion a la respuesta', () => {
    const out = prependCorrectionBlock(
      'Esta es la respuesta original.',
      '[CORRECCION] La companion species correcta es otra.',
    );
    expect(out).toBe('[CORRECCION] La companion species correcta es otra.\n\nEsta es la respuesta original.');
  });

  it('es idempotente si el bloque ya esta al inicio', () => {
    const block = '[CORRECCION] La companion species correcta es otra.';
    const first = prependCorrectionBlock('Respuesta base.', block);
    const second = prependCorrectionBlock(first, block);
    expect(second).toBe(first);
  });

  it('degrada sin romper si no hay bloque util', () => {
    expect(prependCorrectionBlock('Respuesta base.', '')).toBe('Respuesta base.');
    expect(prependCorrectionBlock('Respuesta base.', '   ')).toBe('Respuesta base.');
    expect(prependCorrectionBlock(null, '[CORRECCION] A')).toBe('[CORRECCION] A');
  });
});

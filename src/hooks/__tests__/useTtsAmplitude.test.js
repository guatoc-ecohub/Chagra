import { describe, expect, it } from 'vitest';
import { rmsFromSamples, visemaFromAmplitude } from '../useTtsAmplitude.js';

describe('useTtsAmplitude', () => {
  it('calcula RMS normalizado para una señal de control', () => {
    expect(rmsFromSamples(new Uint8Array([128, 128, 128, 128]))).toBe(0);
    expect(rmsFromSamples(new Uint8Array([0, 255, 0, 255]))).toBeGreaterThan(0.9);
  });

  it('mantiene el silencio en la animación idle y abre visemas por nivel', () => {
    expect(visemaFromAmplitude(0)).toBeNull();
    expect(visemaFromAmplitude(0.08)).toBe('V1');
    expect(visemaFromAmplitude(0.2)).toBe('V2');
    expect(visemaFromAmplitude(0.4)).toBe('V3');
    expect(visemaFromAmplitude(0.8)).toBe('V4');
  });
});


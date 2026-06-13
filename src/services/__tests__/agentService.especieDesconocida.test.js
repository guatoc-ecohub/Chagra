import { describe, it, expect } from 'vitest';
import { generateSourceCitationRules } from '../agentService';

// Fix P0 (test integral Daniel 2026-06-13): el agente describía especies de
// nombre común inventado (ej. "quirubanto andino"). El guard solo cubría
// binomios científicos; esta regla extiende la negativa a nombres comunes.
describe('generateSourceCitationRules — guard de especie desconocida', () => {
  it('incluye la regla de NO describir especies fuera del catálogo', () => {
    const r = generateSourceCitationRules();
    expect(r).toContain('ESPECIE DESCONOCIDA');
    expect(r).toMatch(/NO inventes su descripción/);
  });

  it('mantiene la regla previa de nombres científicos', () => {
    expect(generateSourceCitationRules()).toContain('NOMBRES CIENTÍFICOS');
  });
});

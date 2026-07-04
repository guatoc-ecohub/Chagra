import { describe, it, expect } from 'vitest';
import { generateSourceCitationRules } from '../agentService';

// Fix P0 (test integral Daniel 2026-06-13): el agente describía especies de
// nombre común inventado (ej. "quirubanto andino"). El guard solo cubría
// binomios científicos; esta regla extiende la negativa a nombres comunes.
describe('generateSourceCitationRules — guard de especie desconocida', () => {
  it('incluye la regla de NO describir especies fuera del catálogo', () => {
    const r = generateSourceCitationRules();
    expect(r).toContain('ESPECIE DESCONOCIDA');
    // La guarda se reformuló y se endureció: en vez del literal antiguo
    // "NO inventes su descripción", la regla ahora enumera lo PROHIBIDO para
    // una especie fuera del catálogo (siembra, manejo, …, descripción, usos).
    // Verificamos la intención vigente: prohíbe dar la descripción.
    expect(r).toMatch(/PROHIBIDO[^\n]*descripción/);
  });

  it('mantiene la regla previa de nombres científicos', () => {
    expect(generateSourceCitationRules()).toContain('NOMBRES CIENTÍFICOS');
  });
});

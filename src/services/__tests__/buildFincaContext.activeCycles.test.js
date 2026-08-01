/**
 * buildFincaContext — bloque de CICLO(S) ACTIVO(S) (grounding #10): aterriza la
 * respuesta del agente en lo que el usuario tiene sembrado ahora (etapa, días,
 * riesgo de plaga). Datos factuales; degrada si no hay ciclos.
 */
import { describe, it, expect } from 'vitest';
import { buildFincaContext } from '../agentService';

describe('buildFincaContext — activeCycles', () => {
  it('inyecta el ciclo activo con etapa, días y riesgo', () => {
    const out = buildFincaContext({
      activeCycles: [{ label: 'Café', stage: 'Floración', days: 120, topRisk: 'Broca del café (crítico)' }],
    });
    expect(out).toMatch(/Ciclos activos del usuario/);
    expect(out).toMatch(/Café en etapa Floración/);
    expect(out).toMatch(/hace 120 días/);
    expect(out).toMatch(/Broca del café/);
  });

  it('no agrega línea de ciclo si no hay ciclos', () => {
    const out = buildFincaContext({ activeCycles: [] });
    expect(out).not.toMatch(/Ciclos activos del usuario/);
  });

  it('inyecta enfermedad de bitácora + instrucción de proactividad', () => {
    const out = buildFincaContext({
      activeCycles: [{
        label: 'Lechuga',
        stage: 'Creciendo',
        days: 30,
        topRisk: null,
        disease: 'Mildeo velloso (Bremia lactucae)',
      }],
    });
    expect(out).toMatch(/enfermedad observada en la bitácora: Mildeo velloso \(Bremia lactucae\)/);
    expect(out).toMatch(/ALERTA SANITARIA/);
    expect(out).toMatch(/PROACTIVAMENTE/);
    expect(out).toMatch(/Lechuga \(Mildeo velloso/);
  });

  it('sin enfermedad NO agrega la alerta sanitaria', () => {
    const out = buildFincaContext({
      activeCycles: [{ label: 'Lechuga', stage: 'Creciendo', days: 30, topRisk: null, disease: null }],
    });
    expect(out).not.toMatch(/ALERTA SANITARIA/);
  });
});

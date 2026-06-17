/**
 * smoke-final-142.test.js — Smoke final post-merge con el lote 132-141 integrado.
 *
 * Verifica que los 3 contratos reparados (PlanEditor, OnboardingHero, TaskScreen)
 * siguen verdes junto con los contratos de alias y smoke unificado.
 *
 * Comando: npx vitest run tests/unit/smoke-final-142.test.js
 */
import { describe, it, expect } from 'vitest';

describe('Smoke final 142 — contratos reparados', () => {
  it('PlanEditor se importa sin errores', async () => {
    const mod = await import('../../src/components/PlanEditor.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('OnboardingHero se importa sin errores', async () => {
    const mod = await import('../../src/components/OnboardingHero.jsx');
    expect(typeof mod.default).toBe('function');
  });

  it('TaskScreen se importa sin errores', async () => {
    const mod = await import('../../src/components/TaskScreen.jsx');
    expect(typeof mod.default).toBe('function');
  });
});

describe('Smoke final 142 — contratos de alias', () => {
  it('profileTieneCerdos acepta marrano, rechaza gallinas', async () => {
    const { profileTieneCerdos } = await import('../../src/services/homeModuleSelector.js');
    expect(profileTieneCerdos({ cultivos_interes: 'marranos' })).toBe(true);
    expect(profileTieneCerdos({ cultivos_actuales: 'porcinos' })).toBe(true);
    expect(profileTieneCerdos({ animales: ['gallinas'] })).toBe(false);
  });

  it('SEGUIMIENTO_KEYS.cerdos es la salida canonica', async () => {
    const { SEGUIMIENTO_KEYS } = await import('../../src/services/homeModuleSelector.js');
    expect(SEGUIMIENTO_KEYS.cerdos).toBe('cerdos');
    expect(Object.values(SEGUIMIENTO_KEYS)).not.toContain('marrano');
  });
});

describe('Smoke final 142 — contratos agente', () => {
  it('CHIP_INTENTS es objeto, mergePartialOnInterruption retorna objeto', async () => {
    const { CHIP_INTENTS } = await import('../../src/services/agentCapabilities.js');
    const { mergePartialOnInterruption } = await import('../../src/services/agentPartialMerge.js');
    expect(typeof CHIP_INTENTS).toBe('object');
    expect(Array.isArray(CHIP_INTENTS)).toBe(false);
    const result = mergePartialOnInterruption({ partialContent: 'x', reason: 'timeout' });
    expect(result).toHaveProperty('preservePartial');
    expect(result).toHaveProperty('error');
  });
});

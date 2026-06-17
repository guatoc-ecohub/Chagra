/**
 * smoke-137-lote.test.js — Smoke unificado del lote 117-131.
 *
 * Comando: NODE_OPTIONS=--max-old-space-size=2048 npx vitest run tests/unit/smoke-137-lote.test.js
 */
import { describe, it, expect } from 'vitest';

describe('Smoke 117-131 — agent contracts', () => {
  it('125: CHIP_INTENTS es objeto (no array)', async () => {
    const { CHIP_INTENTS } = await import('../../src/services/agentCapabilities.js');
    expect(typeof CHIP_INTENTS).toBe('object');
    expect(Array.isArray(CHIP_INTENTS)).toBe(false);
  });

  it('125: mergePartialOnInterruption retorna objeto', async () => {
    const { mergePartialOnInterruption } = await import('../../src/services/agentPartialMerge.js');
    const result = mergePartialOnInterruption({ partialContent: 'test', reason: 'abort' });
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('preservePartial');
  });
});

describe('Smoke 117-131 — componentes reparados', () => {
  it('130-131: PlanEditor, OnboardingHero, TaskScreen importan sin error', async () => {
    const [pe, oh, ts] = await Promise.all([
      import('../../src/components/PlanEditor.jsx'),
      import('../../src/components/OnboardingHero.jsx'),
      import('../../src/components/TaskScreen.jsx'),
    ]);
    expect(typeof pe.default).toBe('function');
    expect(typeof oh.default).toBe('function');
    expect(typeof ts.default).toBe('function');
  });
});

describe('Smoke 117-131 — alias animales', () => {
  it('134: profileTieneCerdos acepta marrano/porcino, rechaza gallinas', async () => {
    const { profileTieneCerdos } = await import('../../src/services/homeModuleSelector.js');
    expect(profileTieneCerdos({ animales: ['cerdos'] })).toBe(true);
    expect(profileTieneCerdos({ cultivos_interes: 'marranos' })).toBe(true);
    expect(profileTieneCerdos({ cultivos_actuales: 'porcinos' })).toBe(true);
    expect(profileTieneCerdos({ animales: ['gallinas'] })).toBe(false);
  });
});

describe('Smoke 117-131 — ErrorBoundary', () => {
  it('119: ErrorBoundary es componente exportado', async () => {
    const mod = await import('../../src/components/ErrorBoundary.jsx');
    expect(mod.ErrorBoundary).toBeDefined();
  });
});

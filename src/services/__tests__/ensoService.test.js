/**
 * ensoService.test.js — GR-9: unificación de la fase ENSO (offline vs chat).
 *
 * Antes había DOS fuentes que podían contradecirse:
 *   - motor OFFLINE (fenología/tareas/alertas): fase MANUAL en localStorage.
 *   - CHAT: fase VIVA NOAA/IDEAM del snapshot del sidecar.
 *
 * Contrato unificado (prioridad):
 *   1. override MANUAL (operador la fijó a mano) — gana siempre.
 *   2. snapshot VIVO cacheado (NOAA/IDEAM vía climaService) — default.
 *   3. 'neutral' explícito — sin red y sin caché, nunca valor fantasma.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('../ensoService.js');
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ensoService — prioridad de fuentes', () => {
  it('sin red y sin caché → Neutral explícito (nunca fantasma ni crash)', async () => {
    const mod = await importFresh();
    expect(mod.getEnsoPhase()).toBe('neutral');
    expect(mod.getEnsoPhaseSource()).toBe('default');
    expect(mod.getEnsoServicePhase()).toBeNull();
    expect(mod.getEnsoLabel()).toBe('Neutral');
  });

  it('snapshot vivo cacheado alimenta la fase por defecto del motor offline', async () => {
    const mod = await importFresh();
    mod.recordLiveEnsoStatus({ phase: 'nina_moderada', label: 'La Niña moderada' });
    expect(mod.getEnsoPhase()).toBe('la_nina');
    expect(mod.getEnsoPhaseSource()).toBe('live');
    expect(mod.getEnsoServicePhase()).toBe('la_nina');
    expect(mod.getEnsoLabel()).toBe('La Niña');
  });

  it('el caché vivo persiste en localStorage (motor offline lo usa sin red)', async () => {
    const mod = await importFresh();
    mod.recordLiveEnsoStatus({ phase: 'nino_fuerte', label: 'El Niño fuerte' });
    // Nueva "sesión" (módulo fresco, sin fetch posible): lee el caché persistido.
    const mod2 = await importFresh();
    expect(mod2.getEnsoPhase()).toBe('el_nino');
    expect(mod2.getEnsoPhaseSource()).toBe('live');
  });

  it('override manual GANA sobre el snapshot vivo', async () => {
    const mod = await importFresh();
    mod.recordLiveEnsoStatus({ phase: 'nina_fuerte', label: 'La Niña fuerte' });
    mod.setEnsoPhase('el_nino');
    expect(mod.getEnsoPhase()).toBe('el_nino');
    expect(mod.getEnsoPhaseSource()).toBe('manual');
    expect(mod.getEnsoServicePhase()).toBe('el_nino');
  });

  it('neutral manual explícito también gana sobre el vivo', async () => {
    const mod = await importFresh();
    mod.recordLiveEnsoStatus({ phase: 'nino_moderado', label: 'El Niño moderado' });
    mod.setEnsoPhase('neutral');
    expect(mod.getEnsoPhase()).toBe('neutral');
    expect(mod.getEnsoPhaseSource()).toBe('manual');
  });

  it('clearEnsoPhase quita el override y vuelve al vivo cacheado', async () => {
    const mod = await importFresh();
    mod.recordLiveEnsoStatus({ phase: 'nina_debil', label: 'La Niña débil' });
    mod.setEnsoPhase('el_nino');
    mod.clearEnsoPhase();
    expect(mod.getEnsoPhase()).toBe('la_nina');
    expect(mod.getEnsoPhaseSource()).toBe('live');
  });

  it('caché vivo vencido (>60 días) degrada a Neutral, sin valor fantasma', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const mod = await importFresh();
    mod.recordLiveEnsoStatus({ phase: 'nino_fuerte', label: 'El Niño fuerte' });
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z')); // 73 días después
    expect(mod.getEnsoPhase()).toBe('neutral');
    expect(mod.getEnsoPhaseSource()).toBe('default');
  });

  it('recordLiveEnsoStatus con basura no crashea ni envenena el caché', async () => {
    const mod = await importFresh();
    mod.recordLiveEnsoStatus(null);
    mod.recordLiveEnsoStatus({});
    mod.recordLiveEnsoStatus({ phase: 'marciano' });
    mod.recordLiveEnsoStatus('nina_fuerte');
    expect(mod.getEnsoPhase()).toBe('neutral');
    expect(mod.getEnsoPhaseSource()).toBe('default');
  });

  it('setEnsoPhase rechaza fases inválidas (cero fabricación)', async () => {
    const mod = await importFresh();
    mod.setEnsoPhase('super_nino');
    expect(mod.getEnsoPhase()).toBe('neutral');
    expect(mod.getEnsoPhaseSource()).toBe('default');
  });
});

describe('ensoService — applyEnsoOverride (path del chat)', () => {
  it('sin override manual devuelve el enso_status vivo INTACTO (misma referencia)', async () => {
    const mod = await importFresh();
    const live = { phase: 'nina_moderada', label: 'La Niña moderada', oni_value: -1.1 };
    expect(mod.applyEnsoOverride(live)).toBe(live);
  });

  it('vivo y manual coinciden en familia → 1 sola fase, conserva el detalle vivo', async () => {
    const mod = await importFresh();
    mod.setEnsoPhase('la_nina');
    const live = { phase: 'nina_debil', label: 'La Niña débil', oni_value: -0.6 };
    // Misma familia: el detalle granular del vivo (intensidad, ONI) se conserva.
    expect(mod.applyEnsoOverride(live)).toBe(live);
  });

  it('override manual distinto al vivo → la fase efectiva es la manual, marcada como tal', async () => {
    const mod = await importFresh();
    mod.setEnsoPhase('el_nino');
    const live = { phase: 'nina_fuerte', label: 'La Niña fuerte', oni_value: -1.5, sources: ['NOAA CPC'] };
    const eff = mod.applyEnsoOverride(live);
    expect(eff.phase).toBe('nino');
    expect(eff.label).toContain('El Niño');
    expect(eff.label).toContain('manual');
    expect(eff.phase_source).toBe('manual');
    // Datos observados reales (ONI, fuentes) se conservan: no se fabrica nada.
    expect(eff.oni_value).toBe(-1.5);
    expect(eff.sources).toEqual(['NOAA CPC']);
  });

  it('override manual sin snapshot vivo → objeto mínimo honesto', async () => {
    const mod = await importFresh();
    mod.setEnsoPhase('la_nina');
    const eff = mod.applyEnsoOverride(null);
    expect(eff.phase).toBe('nina');
    expect(eff.phase_source).toBe('manual');
    expect(eff.oni_value ?? null).toBeNull();
  });

  it('sin override y sin vivo → null (el caller degrada como siempre)', async () => {
    const mod = await importFresh();
    expect(mod.applyEnsoOverride(null)).toBeNull();
  });
});

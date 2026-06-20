/**
 * profilePresets.test.js — TDD del selector de PERFIL in-app (tarea #33).
 *
 * Cobertura:
 *  - PROFILE_PRESETS expone los 4 perfiles de demo (campesino/cafetero/
 *    cacaotero/corporativo) con rol REAL mapeado.
 *  - getPresetById: id válido → preset; inválido/null → null.
 *  - getActivePresetId: prioriza perfil_demo, luego infiere por rol, fallback.
 *  - applyProfilePreset: persiste rol + perfil_demo y emite chagra:profile-changed.
 *  - applyProfilePreset con id inválido → null, no toca el perfil.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let mod;

const importFresh = async () => {
  vi.resetModules();
  return import('../profilePresets.js');
};

describe('profilePresets — definición de presets', () => {
  beforeEach(async () => { mod = await importFresh(); });

  it('expone los 4 perfiles de demo con rol real mapeado', () => {
    const ids = mod.PROFILE_PRESETS.map((p) => p.id);
    expect(ids).toEqual(['campesino', 'cafetero', 'cacaotero', 'corporativo']);
    for (const p of mod.PROFILE_PRESETS) {
      expect(typeof p.rol).toBe('string');
      expect(p.rol.length).toBeGreaterThan(0);
      expect(typeof p.label).toBe('string');
      expect(typeof p.desc).toBe('string');
    }
  });

  it('corporativo mapea al rol de producto existente "tecnico" (set amplio)', () => {
    const corp = mod.PROFILE_PRESETS.find((p) => p.id === 'corporativo');
    expect(corp.rol).toBe('tecnico');
  });

  it('cafetero/cacaotero mapean a sus roles de datos reales (asociaciones)', () => {
    expect(mod.getPresetById('cafetero').rol).toBe('cafetero');
    expect(mod.getPresetById('cacaotero').rol).toBe('cacaotero');
  });

  it('getPresetById devuelve null para id inválido', () => {
    expect(mod.getPresetById('no-existe')).toBeNull();
    expect(mod.getPresetById(null)).toBeNull();
    expect(mod.getPresetById('')).toBeNull();
  });
});

describe('profilePresets — getActivePresetId / applyProfilePreset (con localStorage)', () => {
  let store;

  beforeEach(async () => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    mod = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getActivePresetId: sin perfil → fallback campesino', () => {
    expect(mod.getActivePresetId()).toBe('campesino');
  });

  it('getActivePresetId: prioriza perfil_demo explícito', () => {
    expect(mod.getActivePresetId({ perfil_demo: 'cafetero', rol: 'campesino' })).toBe('cafetero');
  });

  it('getActivePresetId: infiere por rol cuando no hay perfil_demo', () => {
    expect(mod.getActivePresetId({ rol: 'cacaotero' })).toBe('cacaotero');
    expect(mod.getActivePresetId({ rol: 'tecnico' })).toBe('corporativo');
  });

  it('applyProfilePreset: persiste rol + perfil_demo y emite el evento', () => {
    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener(mod.PROFILE_CHANGED_EVENT, handler);

    const result = mod.applyProfilePreset('corporativo');
    expect(result.rol).toBe('tecnico');
    expect(result.perfil_demo).toBe('corporativo');

    // Persistido en localStorage (el switch lo lee al re-montar).
    expect(mod.getActivePresetId()).toBe('corporativo');

    // Evento same-tab emitido para que el home re-derive el gating.
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ presetId: 'corporativo', rol: 'tecnico' });

    window.removeEventListener(mod.PROFILE_CHANGED_EVENT, handler);
  });

  it('applyProfilePreset: id inválido → null y NO toca el perfil', () => {
    mod.applyProfilePreset('cafetero');
    const before = mod.getActivePresetId();
    expect(mod.applyProfilePreset('no-existe')).toBeNull();
    expect(mod.getActivePresetId()).toBe(before); // sin cambios
  });
});

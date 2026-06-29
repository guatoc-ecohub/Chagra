import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/dbCore', () => ({ openDB: () => Promise.resolve({}) }));

import {
  checkCapabilityHealth,
  hasCriticalFailure,
  getDegradedCapabilities,
  getCapabilityHealth,
  SIDECAR_TOOL_NAMES,
} from '../capabilityHealth';
import { CAPABILITY_MANIFEST } from '../agentCapabilities';

const makeDeps = (overrides = {}) => ({
  manifest: overrides.manifest ?? CAPABILITY_MANIFEST,
  isSidecarEnabled: overrides.isSidecarEnabled ?? true,
  sidecarToolNames: overrides.sidecarToolNames ?? SIDECAR_TOOL_NAMES,
});

describe('checkCapabilityHealth', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('retorna array de capacidades', async () => {
    const results = await checkCapabilityHealth();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.name).toBeDefined();
      expect(['ok', 'degraded', 'down']).toContain(r.status);
    });
  });
});

describe('hasCriticalFailure', () => {
  it('detecta fallo crítico', () => {
    expect(hasCriticalFailure([{ status: 'ok' }, { status: 'down' }])).toBe(true);
    expect(hasCriticalFailure([{ status: 'ok' }])).toBe(false);
  });
});

describe('getDegradedCapabilities', () => {
  it('filtra solo no-ok', () => {
    const r = getDegradedCapabilities([{ status: 'ok' }, { status: 'down' }, { status: 'degraded' }]);
    expect(r).toHaveLength(2);
  });
});

describe('getCapabilityHealth — estado real por capacidad', () => {
  it('SIDECAR_TOOL_NAMES contiene las tools que dependen del sidecar', () => {
    expect(SIDECAR_TOOL_NAMES.has('get_multihop_companions')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_subgrafo_relacional')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_saberes')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_toxicidad')).toBe(true);
    expect(SIDECAR_TOOL_NAMES.has('get_suelo')).toBe(true);
    // Locales/offline NO están
    expect(SIDECAR_TOOL_NAMES.has('assets')).toBe(false);
    expect(SIDECAR_TOOL_NAMES.has('voice_capture')).toBe(false);
    expect(SIDECAR_TOOL_NAMES.has('farm_process')).toBe(false);
  });

  it('capacidades offline-first retornan live siempre', () => {
    const deps = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('plantas', deps)).toBe('live');
    expect(getCapabilityHealth('tareas', deps)).toBe('live');
    expect(getCapabilityHealth('observaciones', deps)).toBe('live');
    expect(getCapabilityHealth('mapa', deps)).toBe('live');
    expect(getCapabilityHealth('historial', deps)).toBe('live');
    expect(getCapabilityHealth('biodiversidad', deps)).toBe('live');
    expect(getCapabilityHealth('ciclo', deps)).toBe('live');
    expect(getCapabilityHealth('procesos', deps)).toBe('live');
    expect(getCapabilityHealth('voz', deps)).toBe('live');
  });

  it('foto retorna live (visión groundeada ya corre; foto-en-la-mano cableada, fix P0 2026-06-25)', () => {
    // foto pasó de 'soon' a 'live': el gate 'soon' tenía un motivo FALSO
    // ("requiere GPU ≥8GB") — la GPU es de 12GB y la visión groundeada YA corre
    // en el chat (analyzeFoliage / validate_visual_match), y la hoja de la mano
    // ya estaba cableada (heroRoute photo → onPhoto → cameraInput → pipeline de
    // visión). Su tool 'vision_identify' NO está en SIDECAR_TOOL_NAMES (la visión
    // corre por ollama, no por el sidecar agro), así que es 'live' con o sin
    // sidecar.
    expect(getCapabilityHealth('foto', makeDeps({ isSidecarEnabled: false }))).toBe('live');
    expect(getCapabilityHealth('foto', makeDeps({ isSidecarEnabled: true }))).toBe('live');
  });

  it('capacidades sidecar-dependent retornan live con sidecar habilitado', () => {
    const deps = makeDeps({ isSidecarEnabled: true });
    expect(getCapabilityHealth('siembro', deps)).toBe('live');
    expect(getCapabilityHealth('plaga', deps)).toBe('live');
    expect(getCapabilityHealth('biopreparado', deps)).toBe('live');
    expect(getCapabilityHealth('clima', deps)).toBe('live');
    expect(getCapabilityHealth('calendario', deps)).toBe('live');
  });

  it('capacidades sidecar-dependent retornan down con sidecar deshabilitado', () => {
    const deps = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('siembro', deps)).toBe('down');
    expect(getCapabilityHealth('plaga', deps)).toBe('down');
    expect(getCapabilityHealth('biopreparado', deps)).toBe('down');
    expect(getCapabilityHealth('clima', deps)).toBe('down');
    expect(getCapabilityHealth('calendario', deps)).toBe('down');
  });

  it('precio retorna soon (explicito en manifest)', () => {
    const deps = makeDeps({ isSidecarEnabled: true });
    expect(getCapabilityHealth('precio', deps)).toBe('soon');
    // sidecar no afecta: aunque este habilitado, el manifest dice soon
    const depsOff = makeDeps({ isSidecarEnabled: false });
    expect(getCapabilityHealth('precio', depsOff)).toBe('soon');
  });

  it('deep retorna soon (explicito en manifest, B14: backend no disponible aun)', () => {
    // Investigacion profunda es kind:'stub' status:'soon' en el manifiesto: no
    // depende del sidecar — el manifest manda. Aunque el sidecar este on/off,
    // el estado es 'soon' (la feature no esta servible en prod).
    expect(getCapabilityHealth('deep', makeDeps({ isSidecarEnabled: false }))).toBe('soon');
    expect(getCapabilityHealth('deep', makeDeps({ isSidecarEnabled: true }))).toBe('soon');
  });

  it('alertas-cultivo retorna live (sin dependencia de sidecar)', () => {
    expect(getCapabilityHealth('alertas-cultivo', makeDeps({ isSidecarEnabled: false }))).toBe('live');
  });

  it('capacidad desconocida retorna live (degradacion segura)', () => {
    expect(getCapabilityHealth('capacidad-que-no-existe', makeDeps({}))).toBe('live');
  });

  it('sin manifest (null/undefined) retorna live', () => {
    expect(getCapabilityHealth('siembro', makeDeps({ manifest: [] }))).toBe('live');
    expect(getCapabilityHealth('plaga', makeDeps({ manifest: null }))).toBe('live');
  });

  it('sidecarToolNames vacio trata todas como offline (live)', () => {
    const deps = makeDeps({ isSidecarEnabled: false, sidecarToolNames: new Set() });
    expect(getCapabilityHealth('siembro', deps)).toBe('live');
  });

  it('acepta sidecarToolNames como Set o array-like', () => {
    const setDeps = makeDeps({ isSidecarEnabled: false, sidecarToolNames: new Set(['get_species']) });
    expect(getCapabilityHealth('siembro', setDeps)).toBe('down');

    const arrDeps = makeDeps({ isSidecarEnabled: false, sidecarToolNames: ['get_species'] });
    expect(getCapabilityHealth('siembro', arrDeps)).toBe('down');
  });
});

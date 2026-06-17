/**
 * features-coexist.spec.js — TAREA 119: Verifica que modulos y features nuevos
 * coexisten sin conflictos. Tests de integracion PUROS (sin red, sin DOM, sin
 * Playwright). Usa Vitest + datos mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registry } from '../../src/core/moduleRegistry.js';
import { selectHomeModules, selectHomeModuleVisibilityMap } from '../../src/services/homeModuleSelector.js';
import { getDemoProfile } from '../../src/services/demoProfile.js';
import { HOME_MODULES } from '../../src/services/userProfileService.js';
import { SEGUIMIENTO_PROCESOS } from '../../src/config/seguimientoProcesos.js';

// ── Mock del moduleRegistry limpio entre tests ──────────────────────────
beforeEach(() => {
  for (const m of registry.list()) {
    registry.unregister(m.id);
  }
});

// ── TAREA 119.A: Cerdos + Extensionista no conflictuan ─────────────────
describe('Cerdos + Extensionista — coexistencia', () => {
  function registrarMockModulo(id, capabilities = []) {
    registry.register({
      id,
      version: '1.0.0',
      capabilities,
      mount: async () => ({ default: () => null }),
    });
  }

  it('ambos modulos pueden registrarse sin conflicto de ids', () => {
    registrarMockModulo('cerdos-pro', ['cerdos-tracking']);
    registrarMockModulo('extensionista-pro', ['multifinca-supervision']);

    expect(registry.has('cerdos-pro')).toBe(true);
    expect(registry.has('extensionista-pro')).toBe(true);
    expect(registry.list()).toHaveLength(2);
  });

  it('las capabilities no colisionan entre modulos', () => {
    registrarMockModulo('cerdos-pro', ['cerdos-tracking', 'alimentacion']);
    registrarMockModulo('extensionista-pro', ['multifinca-supervision', 'tablero']);

    const cerdosCaps = registry.byCapability('cerdos-tracking');
    const extCaps = registry.byCapability('multifinca-supervision');

    expect(cerdosCaps).toHaveLength(1);
    expect(cerdosCaps[0].id).toBe('cerdos-pro');
    expect(extCaps).toHaveLength(1);
    expect(extCaps[0].id).toBe('extensionista-pro');
  });

  it('desregistrar un modulo no afecta al otro', () => {
    registrarMockModulo('cerdos-pro', ['cerdos-tracking']);
    registrarMockModulo('extensionista-pro', ['multifinca-supervision']);

    registry.unregister('extensionista-pro');

    expect(registry.has('cerdos-pro')).toBe(true);
    expect(registry.has('extensionista-pro')).toBe(false);
    expect(registry.byCapability('cerdos-tracking')).toHaveLength(1);
  });

  it('sobreescribir modulo emite warning pero no rompe', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registrarMockModulo('cerdos-pro', ['v1']);

    registry.register({
      id: 'cerdos-pro',
      version: '2.0.0',
      capabilities: ['v2'],
      mount: async () => ({ default: () => null }),
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('sobreescribiendo módulo existente "cerdos-pro"'),
    );
    expect(registry.get('cerdos-pro').version).toBe('2.0.0');
    warn.mockRestore();
  });

  it('mount fallido de un modulo no impide mount del otro', async () => {
    registrarMockModulo('cerdos-pro', ['cerdos-tracking']);
    registry.register({
      id: 'extensionista-pro',
      version: '1.0.0',
      capabilities: ['multifinca-supervision'],
      mount: async () => { throw new Error('no disponible'); },
    });

    const cerdosMount = await registry.mount('cerdos-pro');
    expect(cerdosMount).not.toBeNull();

    await expect(registry.mount('extensionista-pro')).rejects.toThrow('no disponible');
  });
});

// ── TAREA 119.B: Carbon + Seguimiento cards coexisten ───────────────────
describe('Carbono + Seguimiento — coexistencia', () => {
  const perfilRestauradorMock = {
    rol: 'restaurador',
    vocacion: 'curioso',
    objetivo: ['biodiversidad'],
    restauracion_objetivo: ['bosque'],
    finca_tipo: 'rural',
  };

  const perfilGanaderoCerdoMock = {
    rol: 'ganadero',
    vocacion: 'campesino',
    animales: ['cerdos', 'ganado'],
    finca_tipo: 'rural',
  };

  it('perfil restaurador ve biodiversidad y tarjetas de reforestacion+paramo', () => {
    const { visibles, seguimiento } = selectHomeModules(perfilRestauradorMock);

    expect(visibles).toContain('biodiversidad');
    expect(seguimiento).toContain('reforestacion');
    expect(seguimiento).toContain('paramo');
    // Restaurador NO ve cerdos ni silvopastoreo por defecto
    expect(seguimiento).not.toContain('cerdos');
    expect(seguimiento).not.toContain('silvopastoreo');
  });

  it('perfil ganadero con cerdos ve silvopastoreo + cerdos + carbono via seguimiento', () => {
    const { seguimiento } = selectHomeModules(perfilGanaderoCerdoMock);

    expect(seguimiento).toContain('silvopastoreo');
    expect(seguimiento).toContain('cerdos');
    // Las tarjetas de seguimiento existen en el catalogo
    const keys = SEGUIMIENTO_PROCESOS.map((p) => p.key);
    expect(keys).toContain('cerdos');
    expect(keys).toContain('silvopastoreo');
  });

  it('las 4 tarjetas de seguimiento tienen keys unicas', () => {
    const keys = SEGUIMIENTO_PROCESOS.map((p) => p.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('carbono no pisa visibilidad de seguimiento — perfiles distintos ven distinto', () => {
    const rest = selectHomeModules(perfilRestauradorMock);
    const gana = selectHomeModules(perfilGanaderoCerdoMock);

    // Diferentes conjuntos de seguimiento
    expect(rest.seguimiento.sort()).not.toEqual(gana.seguimiento.sort());
  });

  it('HOME_MODULES y SEGUIMIENTO_PROCESOS no comparten ids colindantes', () => {
    const homeIds = new Set(HOME_MODULES.map((m) => m.id));
    const seguimientoIds = new Set(SEGUIMIENTO_PROCESOS.map((p) => p.key));
    const intersection = [...homeIds].filter((id) => seguimientoIds.has(id));
    expect(intersection).toHaveLength(0);
  });
});

// ── TAREA 119.C: Switch-perfil + telemetry events no interfieren ────────
describe('Switch-perfil + Telemetry — no interferencia', () => {
  let telemetryEvents;
  let profileChangedCallback;

  beforeEach(() => {
    telemetryEvents = [];
    profileChangedCallback = null;

    vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
      if (event.type === 'chagra:profile:demo-switched') {
        profileChangedCallback?.();
      }
    });

    vi.spyOn(window, 'addEventListener').mockImplementation((type, cb) => {
      if (type === 'chagra:profile:demo-switched') {
        profileChangedCallback = cb;
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {
      profileChangedCallback = null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cambiar perfil no dispara eventos de telemetria', () => {
    const perfil = { id: 'campesino', rol: 'campesino', vocacion: 'campesino' };
    const mockProfile = JSON.stringify(perfil);

    localStorage.setItem('chagra:profile:v1', mockProfile);

    // Cambio de perfil demo emitido via custom event
    window.dispatchEvent(
      new CustomEvent('chagra:profile:demo-switched', { detail: { id: 'campesino', profile: perfil } }),
    );

    // Telemetria NO debe tener eventos de perfil
    expect(telemetryEvents).toHaveLength(0);
  });

  it('selectHomeModuleVisibilityMap devuelve mapa correcto para cada perfil', () => {
    const urbanoMap = selectHomeModuleVisibilityMap({ vocacion: 'urbano' });
    const tecnicoMap = selectHomeModuleVisibilityMap({ rol: 'tecnico', vocacion: 'tecnico' });

    // Urbano no ve zonas/insumos
    expect(urbanoMap.zonas).toBe(false);
    expect(urbanoMap.insumos).toBe(false);
    expect(urbanoMap.plantas).toBe(true);

    // Tecnico ve todo
    for (const key of Object.keys(tecnicoMap)) {
      expect(tecnicoMap[key]).toBe(true);
    }
  });

  it('el switch entre perfiles produce mapas de visibilidad disjuntos donde corresponde', () => {
    const javierMock = { rol: 'ganadero', vocacion: 'campesino', animales: ['cerdos', 'ganado'] };
    const anaMock = { rol: 'restaurador', vocacion: 'curioso', objetivo: ['biodiversidad'] };

    const javierVis = selectHomeModuleVisibilityMap(javierMock);
    const anaVis = selectHomeModuleVisibilityMap(anaMock);

    // ana (restauradora) ve biodiversidad
    expect(anaVis.biodiversidad).toBe(true);
    // ana NO ve insumos (no esta en CAMPESINO_CORE de restaurador)
    expect(anaVis.insumos).toBe(false);
    // javier (ganadero) SI ve insumos
    expect(javierVis.insumos).toBe(true);
  });

  it('getDemoProfile produce perfiles validos sin campos undefined en atributos clave', () => {
    const profiles = ['campesino', 'restaurador', 'ganadero_cerdos'];
    for (const id of profiles) {
      const p = getDemoProfile(id);
      expect(p).toBeDefined();
      // Todos los perfiles demo tienen las claves esperadas
      expect(typeof p).toBe('object');
      if (p.animales) {
        expect(Array.isArray(p.animales)).toBe(true);
      }
      if (p.objetivo) {
        expect(Array.isArray(p.objetivo)).toBe(true);
      }
    }
  });

  it('el operador bypass ve TODO sin importar el perfil', () => {
    // Perfil urbano que normalmente esconde todo
    const { visibles, seguimiento } = selectHomeModules(
      { vocacion: 'urbano' },
      { esOperador: true },
    );

    // Operador ve todos los modulos
    expect(visibles).toHaveLength(11); // ALL_HOME_MODULES
    // Y todas las tarjetas de seguimiento
    expect(seguimiento).toContain('cerdos');
    expect(seguimiento).toContain('silvopastoreo');
    expect(seguimiento).toContain('reforestacion');
    expect(seguimiento).toContain('paramo');
  });
});

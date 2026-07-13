import { describe, it, expect } from 'vitest';
import {
  HOME_MODULE_IDS,
  ALL_HOME_MODULES,
  SEGUIMIENTO_KEYS,
  esPerfilUrbano,
  profileTieneCerdos,
  selectHomeModules,
  selectHomeModuleVisibilityMap,
  isSeguimientoVisible,
} from '../homeModuleSelector.js';

/**
 * Tests del SELECTOR DE MÓDULOS DEL HOME POR PERFIL (gating del home —
 * "el usuario solo ve lo que necesita"). El módulo es PURO: del perfil →
 * { visibles: string[], seguimiento: string[] }.
 *
 * Contrato clave (brief, ADR-017/ADR-011/ADR-034):
 *   - selectHomeModules(profile, opts) → { visibles, seguimiento }.
 *   - URBANO es OVERRIDE DURO: nunca cerdos/silvopastoreo/reforestacion/
 *     paramo/zonas/insumos, aunque el rol diga otra cosa.
 *   - Ganadero con cerdos SÍ ve la tarjeta de cerdos; con solo gallinas, NO.
 *   - REUSA deriveRole de profileChipSelector (no duplica la lógica de rol).
 */

const ALL_SEGUIMIENTO = new Set(Object.values(SEGUIMIENTO_KEYS));

describe('homeModuleSelector — helpers', () => {
  it('esPerfilUrbano: vocacion urbano O finca_tipo balcon/terraza', () => {
    expect(esPerfilUrbano({ vocacion: 'urbano' })).toBe(true);
    expect(esPerfilUrbano({ finca_tipo: 'balcon' })).toBe(true);
    expect(esPerfilUrbano({ finca_tipo: 'terraza' })).toBe(true);
    // Rural/invernadero NO es urbano.
    expect(esPerfilUrbano({ finca_tipo: 'rural' })).toBe(false);
    expect(esPerfilUrbano({ finca_tipo: 'invernadero' })).toBe(false);
    expect(esPerfilUrbano({})).toBe(false);
    expect(esPerfilUrbano(null)).toBe(false);
  });

  it('profileTieneCerdos: solo true si animales incluye cerdos', () => {
    expect(profileTieneCerdos({ animales: ['cerdos'] })).toBe(true);
    expect(profileTieneCerdos({ animales: ['gallinas', 'cerdos'] })).toBe(true);
    // Gallinas/ganado NO son cerdos.
    expect(profileTieneCerdos({ animales: ['gallinas', 'ganado'] })).toBe(false);
    expect(profileTieneCerdos({ animales: ['ninguno'] })).toBe(false);
    // Respaldo por texto libre.
    expect(profileTieneCerdos({ cultivos_interes: 'quiero criar marranos' })).toBe(true);
    expect(profileTieneCerdos({})).toBe(false);
  });
});

describe('homeModuleSelector — selectHomeModules por PERSONA', () => {
  // ── PERSONA 1: URBANO (criterio de éxito #1) ───────────────────────────
  it('URBANO (vocacion urbano): set mínimo, SIN cerdos/silvopastoreo/zonas/insumos', () => {
    const { visibles, seguimiento } = selectHomeModules({ vocacion: 'urbano' });
    expect(visibles).toEqual(
      expect.arrayContaining([
        HOME_MODULE_IDS.plantas,
        HOME_MODULE_IDS.plagas,
        HOME_MODULE_IDS.bitacora,
        HOME_MODULE_IDS.clima,
        HOME_MODULE_IDS.hoyfinca,
      ]),
    );
    // OBLIGATORIO: nunca módulos de finca grande.
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    // OBLIGATORIO: NINGUNA tarjeta de seguimiento.
    expect(seguimiento).toEqual([]);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.reforestacion);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.paramo);
  });

  it('URBANO/terraza (finca_tipo terraza): mismo override duro, sin zonas/insumos/cerdos', () => {
    const { visibles, seguimiento } = selectHomeModules({ finca_tipo: 'terraza' });
    expect(visibles).not.toContain(SEGUIMIENTO_KEYS.cerdos); // sanity (módulos)
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(seguimiento).not.toContain('cerdos');
    expect(seguimiento).not.toContain('silvopastoreo');
    expect(seguimiento).not.toContain('zonas');
    expect(seguimiento).not.toContain('insumos');
    expect(seguimiento).toEqual([]);
  });

  it('URBANO gana aunque el perfil declare animales (cerdos): override duro', () => {
    // Un urbano con un rol/animales raro NO debe ver cerdos: el override gana.
    const { visibles, seguimiento } = selectHomeModules({
      vocacion: 'urbano',
      rol: 'ganadero',
      animales: ['cerdos'],
    });
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(seguimiento).toEqual([]);
  });

  // ── PERSONA 2: CAMPESINO ───────────────────────────────────────────────
  it('CAMPESINO: módulos de cultivo, sin seguimiento por defecto', () => {
    const { visibles, seguimiento } = selectHomeModules({ rol: 'campesino' });
    expect(visibles).toEqual(
      expect.arrayContaining([
        HOME_MODULE_IDS.hoyfinca,
        HOME_MODULE_IDS.clima,
        HOME_MODULE_IDS.asociaciones,
        HOME_MODULE_IDS.plantas,
        HOME_MODULE_IDS.plagas,
        HOME_MODULE_IDS.bitacora,
        HOME_MODULE_IDS.insumos,
        HOME_MODULE_IDS.zonas,
        HOME_MODULE_IDS.informes,
        HOME_MODULE_IDS.analisis,
      ]),
    );
    // Campesino base no es restaurador: sin biodiversidad por defecto.
    expect(visibles).not.toContain(HOME_MODULE_IDS.biodiversidad);
    expect(seguimiento).toEqual([]);
  });

  // ── PERSONA 3: GANADERO ────────────────────────────────────────────────
  it('GANADERO con CERDOS: campesino + silvopastoreo + cerdos', () => {
    const { visibles, seguimiento } = selectHomeModules({
      rol: 'ganadero',
      animales: ['ganado', 'cerdos'],
    });
    // Base campesino presente.
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(visibles).toContain(HOME_MODULE_IDS.insumos);
    // OBLIGATORIO: cerdos SÍ (tiene cerdos).
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
  });

  it('GANADERO solo GALLINAS: silvopastoreo SÍ, cerdos NO', () => {
    const { seguimiento } = selectHomeModules({
      rol: 'ganadero',
      animales: ['gallinas'],
    });
    // OBLIGATORIO: gallinas → silvopastoreo, NUNCA cerdos.
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  it('GANADERO inferido por heurística (vocacion campesino + animales)', () => {
    // Sin rol explícito: deriveRole lo manda a ganadero por animales no-urbano.
    const { seguimiento } = selectHomeModules({
      vocacion: 'campesino',
      animales: ['ganado'],
    });
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  // ── PERSONA 4: RESTAURADOR ─────────────────────────────────────────────
  it('RESTAURADOR: campesino-core + biodiversidad + reforestacion/paramo', () => {
    const { visibles, seguimiento } = selectHomeModules({
      rol: 'restaurador',
      objetivo: ['biodiversidad'],
    });
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(visibles).toContain(HOME_MODULE_IDS.clima);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.reforestacion);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.paramo);
    // Restaurador no maneja cerdos por defecto.
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  // ── PERSONA 5: GUÍA DE GLACIAR ─────────────────────────────────────────
  it('GUÍA GLACIAR: clima/hoyfinca/biodiversidad + paramo/reforestacion', () => {
    const { visibles, seguimiento } = selectHomeModules(
      { vocacion: 'campesino' },
      { esGuiaGlaciar: true },
    );
    expect(visibles).toContain(HOME_MODULE_IDS.clima);
    expect(visibles).toContain(HOME_MODULE_IDS.hoyfinca);
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
    // Un guía no necesita el inventario de insumos ni la cola de plagas de cultivo.
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.paramo);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.reforestacion);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  // ── SOCIO / TÉCNICO ────────────────────────────────────────────────────
  it('SOCIO: set corto {hoyfinca, plantas, clima, informes}, sin seguimiento', () => {
    const { visibles, seguimiento } = selectHomeModules({ rol: 'socio' });
    expect(visibles).toEqual(
      expect.arrayContaining([
        HOME_MODULE_IDS.hoyfinca,
        HOME_MODULE_IDS.plantas,
        HOME_MODULE_IDS.clima,
        HOME_MODULE_IDS.informes,
      ]),
    );
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(seguimiento).toEqual([]);
  });

  it('TÉCNICO: ve TODOS los módulos y las 4 tarjetas de seguimiento', () => {
    const { visibles, seguimiento } = selectHomeModules({ rol: 'tecnico' });
    for (const id of ALL_HOME_MODULES) expect(visibles).toContain(id);
    expect(seguimiento).toEqual(
      expect.arrayContaining([
        SEGUIMIENTO_KEYS.reforestacion,
        SEGUIMIENTO_KEYS.silvopastoreo,
        SEGUIMIENTO_KEYS.paramo,
        SEGUIMIENTO_KEYS.cerdos,
      ]),
    );
  });
});

// ── BYPASS OPERADOR (regresión 2026-06-15 — el operador debe VER TODO) ──────
describe('homeModuleSelector — opts.esOperador (bypass: ve TODO)', () => {
  it('OPERADOR: TODOS los módulos + las 4 tarjetas de seguimiento (incluida Cerdos)', () => {
    const { visibles, seguimiento } = selectHomeModules({}, { esOperador: true });
    // Criterio de éxito: el home completo, sin estrechar.
    for (const id of ALL_HOME_MODULES) expect(visibles).toContain(id);
    expect(seguimiento).toEqual(
      expect.arrayContaining([
        SEGUIMIENTO_KEYS.reforestacion,
        SEGUIMIENTO_KEYS.silvopastoreo,
        SEGUIMIENTO_KEYS.paramo,
        SEGUIMIENTO_KEYS.cerdos,
      ]),
    );
    expect(visibles).toContain(HOME_MODULE_IDS.insumos);
    expect(visibles).toContain(HOME_MODULE_IDS.zonas);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  it('OPERADOR gana sobre el override URBANO (ve TODO aunque sea urbano)', () => {
    // El bypass del operador es el PRIMER check: precede al override urbano.
    const { visibles, seguimiento } = selectHomeModules(
      { vocacion: 'urbano', finca_tipo: 'balcon' },
      { esOperador: true },
    );
    for (const id of ALL_HOME_MODULES) expect(visibles).toContain(id);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
  });

  it('OPERADOR gana sobre el rol guía glaciar (Cordada NO estrecha al operador)', () => {
    // El bug original: operador en CORDADA → rol guia_glaciar → home estrecho.
    // Con esOperador=true el set NO se estrecha aunque esGuiaGlaciar también lo sea.
    const { visibles, seguimiento } = selectHomeModules(
      {},
      { esOperador: true, esGuiaGlaciar: true },
    );
    for (const id of ALL_HOME_MODULES) expect(visibles).toContain(id);
    expect(visibles).toContain(HOME_MODULE_IDS.insumos); // guía NO lo vería
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos); // guía NO lo vería
  });

  it('NO-OPERADOR: guía glaciar REAL (esGuiaGlaciar sin esOperador) SIGUE estrecho', () => {
    // Invariante de no-regresión: alex/mario/camilo (Cordada, NO operador)
    // conservan su set estrecho. esOperador ausente = false.
    const { visibles, seguimiento } = selectHomeModules(
      { vocacion: 'campesino' },
      { esGuiaGlaciar: true },
    );
    expect(visibles).toContain(HOME_MODULE_IDS.clima);
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
    // El set ESTRECHO: sin insumos, sin zonas, sin cerdos.
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  it('NO-OPERADOR: urbano SIGUE sin cerdos (esOperador ausente = false)', () => {
    const { visibles, seguimiento } = selectHomeModules({ vocacion: 'urbano' });
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
  });
});

describe('homeModuleSelector — invariantes', () => {
  it('SIEMPRE devuelve solo ids/keys válidos y sin duplicados', () => {
    const perfiles = [
      { vocacion: 'urbano' },
      { rol: 'campesino' },
      { rol: 'ganadero', animales: ['cerdos', 'gallinas'] },
      { rol: 'restaurador', objetivo: ['biodiversidad'] },
      { rol: 'tecnico' },
      { rol: 'socio' },
      {},
      null,
    ];
    const validModules = new Set(ALL_HOME_MODULES);
    for (const p of perfiles) {
      const { visibles, seguimiento } = selectHomeModules(p);
      for (const id of visibles) expect(validModules.has(id)).toBe(true);
      for (const k of seguimiento) expect(ALL_SEGUIMIENTO.has(/** @type {any} */ (k))).toBe(true);
      expect(new Set(visibles).size).toBe(visibles.length);
      expect(new Set(seguimiento).size).toBe(seguimiento.length);
    }
  });

  it('perfil vacío / inválido → cae a campesino (default seguro, nunca vacío)', () => {
    const { visibles } = selectHomeModules({});
    expect(visibles.length).toBeGreaterThan(0);
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(selectHomeModules(null).visibles.length).toBeGreaterThan(0);
    expect(selectHomeModules(undefined).visibles.length).toBeGreaterThan(0);
  });
});

describe('homeModuleSelector — invariantes DURAS', () => {
  it('INVARIANTE: urbano NUNCA ve cerdos (ni como tarjeta ni como modulo)', () => {
    const urbanos = [
      { vocacion: 'urbano' },
      { finca_tipo: 'balcon' },
      { finca_tipo: 'terraza' },
      { vocacion: 'urbano', animales: ['cerdos'] },
      { vocacion: 'urbano', rol: 'ganadero', animales: ['cerdos', 'gallinas'] },
      { finca_tipo: 'balcon', rol: 'porcicultor', animales: ['cerdos'] },
    ];
    for (const p of urbanos) {
      const { visibles, seguimiento } = selectHomeModules(p);
      expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
      expect(visibles).not.toContain(SEGUIMIENTO_KEYS.cerdos);
      expect(isSeguimientoVisible(SEGUIMIENTO_KEYS.cerdos, p)).toBe(false);
    }
  });

  it('INVARIANTE: urbano NUNCA ve insumos, zonas, biodiversidad, reforestacion, paramo', () => {
    const urbanos = [
      { vocacion: 'urbano' },
      { finca_tipo: 'balcon' },
      { finca_tipo: 'terraza', animales: ['gallinas'] },
    ];
    for (const p of urbanos) {
      const { visibles, seguimiento } = selectHomeModules(p);
      expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
      expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
      expect(visibles).not.toContain(HOME_MODULE_IDS.biodiversidad);
      expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.silvopastoreo);
      expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.reforestacion);
      expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.paramo);
    }
  });

  it('INVARIANTE: operador ve TODO (todos los modulos + las 4 tarjetas)', () => {
    // Verificamos que el operador ve absolutamente todo,
    // sin importar el perfil que se le pase.
    const operadorPerfiles = [{}, { vocacion: 'urbano' }, { rol: 'guia_glaciar' }, null];
    for (const p of operadorPerfiles) {
      const { visibles, seguimiento } = selectHomeModules(p, { esOperador: true });
      for (const id of ALL_HOME_MODULES) expect(visibles).toContain(id);
      for (const k of Object.values(SEGUIMIENTO_KEYS)) expect(seguimiento).toContain(k);
    }
  });

  it('INVARIANTE: guia_glaciar NUNCA ve insumos ni cerdos', () => {
    const guias = [
      { vocacion: 'campesino' },
      { rol: 'guia_glaciar' },
    ];
    for (const p of guias) {
      const { visibles, seguimiento } = selectHomeModules(p, { esGuiaGlaciar: true });
      expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
      expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
      expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    }
  });
});

describe('homeModuleSelector — perfiles POR TIPO DE USUARIO', () => {
  it('porcicultor (solo cerdos, sin rol explicito): silvopastoreo + cerdos', () => {
    const { visibles, seguimiento } = selectHomeModules({
      vocacion: 'campesino',
      animales: ['cerdos'],
    });
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(visibles).toContain(HOME_MODULE_IDS.insumos);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  it('campesino con objetivo reforestacion → biodiversidad + reforestacion/paramo', () => {
    const { visibles, seguimiento } = selectHomeModules({
      rol: 'campesino',
      objetivo: ['biodiversidad'],
      restauracion_objetivo: ['bosque', 'paramo'],
    });
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.reforestacion);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.paramo);
    // El nucleo de cultivo sigue presente.
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(visibles).toContain(HOME_MODULE_IDS.insumos);
  });

  it('campesino con gallinas y bosque: ve cultivo + animal + restauracion', () => {
    const { visibles, seguimiento } = selectHomeModules({
      rol: 'campesino',
      animales: ['gallinas'],
      objetivo: ['biodiversidad'],
    });
    // Animal: silvopastoreo presente (no cerdos).
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    // Restauracion: reforestacion + paramo.
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.reforestacion);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.paramo);
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
  });

  it('silvopastoreo puro (ganadero sin cerdos): silvopastoreo SI, cerdos NO', () => {
    const { seguimiento } = selectHomeModules({
      rol: 'ganadero',
      animales: ['ganado', 'ovejas'],
    });
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  it('cerdos puros (solo cerdos, nada mas): silvopastoreo + cerdos', () => {
    const { seguimiento } = selectHomeModules({
      rol: 'campesino',
      animales: ['cerdos'],
    });
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
  });
});

describe('homeModuleSelector — selectHomeModuleVisibilityMap', () => {
  it('devuelve un mapa { moduleId: boolean } con TODOS los ids del home', () => {
    const map = selectHomeModuleVisibilityMap({ rol: 'campesino' });
    // Todas las claves de HOME presentes (forma idéntica a getModuleVisibility).
    for (const id of ALL_HOME_MODULES) {
      expect(map).toHaveProperty(id);
      expect(typeof map[id]).toBe('boolean');
    }
  });

  it('urbano: el mapa pone zonas/insumos/biodiversidad en false', () => {
    const map = selectHomeModuleVisibilityMap({ vocacion: 'urbano' });
    expect(map[HOME_MODULE_IDS.plantas]).toBe(true);
    expect(map[HOME_MODULE_IDS.clima]).toBe(true);
    expect(map[HOME_MODULE_IDS.zonas]).toBe(false);
    expect(map[HOME_MODULE_IDS.insumos]).toBe(false);
    expect(map[HOME_MODULE_IDS.biodiversidad]).toBe(false);
  });
});

describe('homeModuleSelector — isSeguimientoVisible (gating de tarjetas)', () => {
  it('urbano: NINGUNA tarjeta visible (criterio #1 — Cerdos oculto)', () => {
    const p = { vocacion: 'urbano' };
    expect(isSeguimientoVisible(SEGUIMIENTO_KEYS.cerdos, p)).toBe(false);
    expect(isSeguimientoVisible(SEGUIMIENTO_KEYS.silvopastoreo, p)).toBe(false);
    expect(isSeguimientoVisible(SEGUIMIENTO_KEYS.reforestacion, p)).toBe(false);
    expect(isSeguimientoVisible(SEGUIMIENTO_KEYS.paramo, p)).toBe(false);
  });

  it('ganadero con cerdos: Cerdos visible; restaurador: Cerdos NO', () => {
    expect(
      isSeguimientoVisible(SEGUIMIENTO_KEYS.cerdos, { rol: 'ganadero', animales: ['cerdos'] }),
    ).toBe(true);
    expect(
      isSeguimientoVisible(SEGUIMIENTO_KEYS.cerdos, { rol: 'restaurador' }),
    ).toBe(false);
    expect(
      isSeguimientoVisible(SEGUIMIENTO_KEYS.reforestacion, { rol: 'restaurador' }),
    ).toBe(true);
  });
});

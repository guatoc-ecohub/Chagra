import { describe, it, expect } from 'vitest';
import {
  PROFILE_ROLES,
  deriveRole,
  profileTieneAnimales,
  selectChipIntentsForRole,
  selectChipIntents,
  selectChipDefs,
} from '../profileChipSelector.js';
import { CHIP_INTENTS, CHIP_DEFS } from '../agentCapabilities.js';

/**
 * Tests del SELECTOR DE CHIPS POR PERFIL (onboarding por perfil + chips
 * adaptativos). El módulo es PURO: del perfil → lista ORDENADA de intents de
 * chip a mostrar. No inventa chips: solo selecciona/ordena los del manifiesto.
 *
 * Contrato clave:
 *   - deriveRole(profile, opts) → uno de PROFILE_ROLES (nunca null).
 *   - selectChipIntents(profile, opts) → string[] de intents reales.
 *   - selectChipDefs(profile, opts) → subconjunto ordenado de CHIP_DEFS.
 *   - NUNCA muestra un intent que no exista en CHIP_DEFS.
 */

const ALL_INTENTS = new Set(CHIP_DEFS.map((d) => d.intent));

describe('profileChipSelector — deriveRole', () => {
  it('rol explícito del onboarding tiene prioridad sobre todo lo demás', () => {
    expect(deriveRole({ rol: 'restaurador', vocacion: 'campesino' })).toBe(
      PROFILE_ROLES.restaurador,
    );
    expect(deriveRole({ rol: 'guia_glaciar' })).toBe(PROFILE_ROLES.guia_glaciar);
    expect(deriveRole({ rol: 'ganadero' })).toBe(PROFILE_ROLES.ganadero);
  });

  it('rol explícito desconocido se ignora y cae a la heurística', () => {
    expect(deriveRole({ rol: 'rey_del_universo', vocacion: 'campesino' })).toBe(
      PROFILE_ROLES.campesino,
    );
  });

  it('whitelist de glaciar (opts.esGuiaGlaciar) gana sin rol explícito', () => {
    expect(deriveRole({ vocacion: 'campesino' }, { esGuiaGlaciar: true })).toBe(
      PROFILE_ROLES.guia_glaciar,
    );
  });

  it('rol explícito de campesino gana incluso sobre whitelist de glaciar', () => {
    // El usuario declaró explícitamente su intención → se respeta.
    expect(deriveRole({ rol: 'campesino' }, { esGuiaGlaciar: true })).toBe(
      PROFILE_ROLES.campesino,
    );
  });

  it('heurística: vocación campesino → campesino', () => {
    expect(deriveRole({ vocacion: 'campesino' })).toBe(PROFILE_ROLES.campesino);
  });

  it('heurística: vocación técnico → técnico', () => {
    expect(deriveRole({ vocacion: 'tecnico' })).toBe(PROFILE_ROLES.tecnico);
  });

  it('heurística: animales + no urbano → ganadero', () => {
    expect(deriveRole({ vocacion: 'campesino', animales: ['gallinas'] })).toBe(
      PROFILE_ROLES.ganadero,
    );
  });

  it('heurística: animales pero urbano → NO ganadero (cae a campesino)', () => {
    expect(deriveRole({ vocacion: 'urbano', animales: ['gallinas'] })).toBe(
      PROFILE_ROLES.campesino,
    );
  });

  it('heurística: objetivo biodiversidad + curioso → restaurador', () => {
    expect(deriveRole({ vocacion: 'curioso', objetivo: ['biodiversidad'] })).toBe(
      PROFILE_ROLES.restaurador,
    );
  });

  it('perfil vacío / inválido → campesino (default seguro, nunca null)', () => {
    expect(deriveRole({})).toBe(PROFILE_ROLES.campesino);
    expect(deriveRole(null)).toBe(PROFILE_ROLES.campesino);
    expect(deriveRole(undefined)).toBe(PROFILE_ROLES.campesino);
  });
});

describe('profileChipSelector — profileTieneAnimales', () => {
  it('detecta el array multi animales', () => {
    expect(profileTieneAnimales({ animales: ['gallinas', 'cerdos'] })).toBe(true);
  });

  it('"ninguno" NO cuenta como tener animales', () => {
    expect(profileTieneAnimales({ animales: ['ninguno'] })).toBe(false);
  });

  it('respaldo: detecta animales en texto libre de cultivos', () => {
    expect(profileTieneAnimales({ cultivos_actuales: 'café y unas gallinas' })).toBe(true);
    expect(profileTieneAnimales({ cultivos_interes: 'quiero criar cerdos' })).toBe(true);
  });

  it('sin animales → false', () => {
    expect(profileTieneAnimales({ cultivos_actuales: 'café, mora, tomate' })).toBe(false);
    expect(profileTieneAnimales({})).toBe(false);
    expect(profileTieneAnimales(null)).toBe(false);
  });
});

describe('profileChipSelector — selectChipIntentsForRole (núcleo puro)', () => {
  it('campesino: chips de cultivo en orden (sin restauración ni stub)', () => {
    const intents = selectChipIntentsForRole({ role: PROFILE_ROLES.campesino });
    expect(intents).toEqual([
      CHIP_INTENTS.siembro,
      CHIP_INTENTS.calendario,
      CHIP_INTENTS.plaga,
      CHIP_INTENTS.biopreparado,
      CHIP_INTENTS.clima,
      CHIP_INTENTS.precio,
    ]);
    // NO debe mostrar páramo a un campesino que no pidió restauración.
    expect(intents).not.toContain(CHIP_INTENTS.paramo);
    expect(intents).not.toContain(CHIP_INTENTS.restauracion);
  });

  it('restaurador: chips de restauración primero', () => {
    const intents = selectChipIntentsForRole({ role: PROFILE_ROLES.restaurador });
    expect(intents[0]).toBe(CHIP_INTENTS.restauracion);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).toContain(CHIP_INTENTS.silvopastoreo);
    // NO biopreparado para el restaurador base.
    expect(intents).not.toContain(CHIP_INTENTS.biopreparado);
  });

  it('guía glaciar: clima + páramo + restauración, SIN biopreparado/calendario', () => {
    const intents = selectChipIntentsForRole({ role: PROFILE_ROLES.guia_glaciar });
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).toContain(CHIP_INTENTS.precio);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).not.toContain(CHIP_INTENTS.biopreparado);
    expect(intents).not.toContain(CHIP_INTENTS.calendario);
  });

  it('ganadero: silvopastoreo primero', () => {
    const intents = selectChipIntentsForRole({ role: PROFILE_ROLES.ganadero });
    expect(intents[0]).toBe(CHIP_INTENTS.silvopastoreo);
  });

  it('tieneAnimales agrega silvopastoreo aunque el rol base no lo traiga', () => {
    const sin = selectChipIntentsForRole({ role: PROFILE_ROLES.campesino });
    expect(sin).not.toContain(CHIP_INTENTS.silvopastoreo);
    const con = selectChipIntentsForRole({
      role: PROFILE_ROLES.campesino,
      tieneAnimales: true,
    });
    expect(con).toContain(CHIP_INTENTS.silvopastoreo);
  });

  it('quiereRestauracion suma los chips de restauración al campesino', () => {
    const intents = selectChipIntentsForRole({
      role: PROFILE_ROLES.campesino,
      quiereRestauracion: true,
    });
    expect(intents).toContain(CHIP_INTENTS.restauracion);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    // El núcleo de cultivo sigue PRIMERO (no se desordena).
    expect(intents[0]).toBe(CHIP_INTENTS.siembro);
  });

  it('rol desconocido cae al set de campesino', () => {
    const intents = selectChipIntentsForRole({ role: 'inexistente' });
    expect(intents[0]).toBe(CHIP_INTENTS.siembro);
  });

  it('SIEMPRE devuelve solo intents que existen en el manifiesto', () => {
    for (const role of Object.values(PROFILE_ROLES)) {
      const intents = selectChipIntentsForRole({
        role,
        tieneAnimales: true,
        quiereRestauracion: true,
      });
      for (const i of intents) expect(ALL_INTENTS.has(i)).toBe(true);
      // Sin duplicados.
      expect(new Set(intents).size).toBe(intents.length);
    }
  });
});

describe('profileChipSelector — selectChipIntents (perfil completo)', () => {
  it('campesino con gallinas → cultivo + silvopastoreo, SIN páramo', () => {
    const intents = selectChipIntents({
      vocacion: 'campesino',
      rol: 'campesino',
      animales: ['gallinas'],
    });
    expect(intents).toContain(CHIP_INTENTS.siembro);
    expect(intents).toContain(CHIP_INTENTS.silvopastoreo);
    expect(intents).toContain(CHIP_INTENTS.precio);
    expect(intents).not.toContain(CHIP_INTENTS.paramo);
    // NUNCA chips irrelevantes para este campesino: deep no aparece.
    expect(intents).not.toContain(CHIP_INTENTS.deep);
  });

  it('restaurador (Ana) → restauración/páramo/silvopastoreo arriba, sin biopreparado', () => {
    const intents = selectChipIntents({
      rol: 'restaurador',
      objetivo: ['biodiversidad'],
      restauracion_objetivo: ['bosque', 'paramo'],
    });
    expect(intents[0]).toBe(CHIP_INTENTS.restauracion);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).not.toContain(CHIP_INTENTS.biopreparado);
  });

  it('guía glaciar por whitelist → clima/páramo, sin biopreparado', () => {
    const intents = selectChipIntents({ vocacion: 'campesino' }, { esGuiaGlaciar: true });
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).toContain(CHIP_INTENTS.precio);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).not.toContain(CHIP_INTENTS.biopreparado);
  });

  it('respeta #7003: módulo biodiversidad oculto NO infla chips por objetivo', () => {
    // Campesino con objetivo biodiversidad pero que ocultó el módulo: el
    // "extra" de restauración por objetivo NO se agrega.
    const intents = selectChipIntents(
      { rol: 'campesino', objetivo: ['biodiversidad'] },
      { moduleVisibility: { biodiversidad: false } },
    );
    expect(intents).not.toContain(CHIP_INTENTS.restauracion);
    expect(intents).not.toContain(CHIP_INTENTS.paramo);
  });

  it('el núcleo del rol restaurador se respeta aunque oculte biodiversidad', () => {
    // Ocultar el módulo no le quita las herramientas a quien ES restaurador.
    const intents = selectChipIntents(
      { rol: 'restaurador' },
      { moduleVisibility: { biodiversidad: false } },
    );
    expect(intents).toContain(CHIP_INTENTS.restauracion);
  });
});

describe('profileChipSelector — selectChipDefs (objetos para el componente)', () => {
  it('devuelve CHIP_DEFS completos (emoji/label/placeholder) en el orden de la selección', () => {
    const defs = selectChipDefs({ rol: 'campesino' });
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0]).toHaveProperty('emoji');
    expect(defs[0]).toHaveProperty('label');
    expect(defs[0]).toHaveProperty('placeholder');
    expect(defs[0].intent).toBe(CHIP_INTENTS.siembro);
  });

  it('fallback: perfil que derivaría vacío igual devuelve chips vivos (barra nunca vacía)', () => {
    // Forzamos un escenario raro: no hay forma normal de vaciar, pero el
    // fallback garantiza ≥1 chip vivo.
    const defs = selectChipDefs(null);
    expect(defs.length).toBeGreaterThan(0);
    for (const d of defs) expect(ALL_INTENTS.has(d.intent)).toBe(true);
  });

  it('cada def seleccionado existe en el manifiesto (no inventa chips)', () => {
    const defs = selectChipDefs({ rol: 'tecnico', animales: ['ganado'] });
    for (const d of defs) {
      expect(CHIP_DEFS.some((c) => c.intent === d.intent)).toBe(true);
    }
  });
});

// ── BYPASS OPERADOR (regresión 2026-06-15 — catálogo COMPLETO de chips) ─────
describe('profileChipSelector — opts.esOperador (catálogo completo de chips)', () => {
  // Catálogo COMPLETO de chips vivos (kind !== 'stub') = lo que ve el operador.
  const LIVE_INTENTS = CHIP_DEFS.filter((d) => d.kind !== 'stub').map((d) => d.intent);
  const STUB_INTENTS = CHIP_DEFS.filter((d) => d.kind === 'stub').map((d) => d.intent);

  it('OPERADOR: selectChipIntents devuelve TODOS los chips vivos del manifiesto', () => {
    const intents = selectChipIntents({}, { esOperador: true });
    for (const i of LIVE_INTENTS) expect(intents).toContain(i);
    expect(intents.length).toBe(LIVE_INTENTS.length);
    // Los stubs (sin backend) NO aparecen, igual que para cualquier perfil.
    for (const s of STUB_INTENTS) expect(intents).not.toContain(s);
  });

  it('OPERADOR: incluye chips que un guía glaciar NO vería (biopreparado, siembro)', () => {
    const intents = selectChipIntents({}, { esOperador: true });
    expect(intents).toContain(CHIP_INTENTS.biopreparado);
    expect(intents).toContain(CHIP_INTENTS.siembro);
    expect(intents).toContain(CHIP_INTENTS.silvopastoreo);
  });

  it('OPERADOR gana sobre el rol guía glaciar (Cordada NO recorta sus chips)', () => {
    // esGuiaGlaciar también true, pero esOperador tiene precedencia → catálogo full.
    const intents = selectChipIntents({}, { esOperador: true, esGuiaGlaciar: true });
    for (const i of LIVE_INTENTS) expect(intents).toContain(i);
    expect(intents).toContain(CHIP_INTENTS.biopreparado); // guía NO lo vería
  });

  it('OPERADOR: selectChipDefs entrega los objetos completos de TODOS los chips vivos', () => {
    const defs = selectChipDefs({}, { esOperador: true });
    expect(defs.length).toBe(LIVE_INTENTS.length);
    for (const d of defs) expect(d).toHaveProperty('label');
  });

  it('NO-OPERADOR: guía glaciar REAL (esGuiaGlaciar sin esOperador) SIGUE sin biopreparado', () => {
    // No-regresión: alex/mario/camilo conservan su set estrecho de chips.
    const intents = selectChipIntents({ vocacion: 'campesino' }, { esGuiaGlaciar: true });
    expect(intents).not.toContain(CHIP_INTENTS.biopreparado);
    expect(intents).toContain(CHIP_INTENTS.clima);
  });
});

describe('profileChipSelector — chips POR TIPO DE USUARIO', () => {
  it('urbano: chips de cultivo basico (siembro, plaga, clima) sin silvopastoreo ni paramo', () => {
    // El urbano deriva a campesino (porque vocacion=urbano → campesino en deriveRole).
    // Los chips son los de CULTIVO base. SIN silvopastoreo (no tiene animales).
    const intents = selectChipIntents({ vocacion: 'urbano' });
    expect(intents).toContain(CHIP_INTENTS.siembro);
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).not.toContain(CHIP_INTENTS.silvopastoreo);
    expect(intents).not.toContain(CHIP_INTENTS.paramo);
    expect(intents).not.toContain(CHIP_INTENTS.restauracion);
  });

  it('campesino (full agro): cultivo completo, sin restauracion ni silvopastoreo', () => {
    const intents = selectChipIntents({ rol: 'campesino' });
    expect(intents).toContain(CHIP_INTENTS.siembro);
    expect(intents).toContain(CHIP_INTENTS.calendario);
    expect(intents).toContain(CHIP_INTENTS.plaga);
    expect(intents).toContain(CHIP_INTENTS.biopreparado);
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).toContain(CHIP_INTENTS.precio);
    expect(intents).not.toContain(CHIP_INTENTS.silvopastoreo);
    expect(intents).not.toContain(CHIP_INTENTS.paramo);
  });

  it('guia_glaciar: solo clima/paramo/restauracion, sin cultivo', () => {
    const intents = selectChipIntents({}, { esGuiaGlaciar: true });
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).toContain(CHIP_INTENTS.precio);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).toContain(CHIP_INTENTS.restauracion);
    expect(intents).not.toContain(CHIP_INTENTS.siembro);
    expect(intents).not.toContain(CHIP_INTENTS.biopreparado);
    expect(intents).not.toContain(CHIP_INTENTS.calendario);
  });

  it('operador: catalogo COMPLETO de chips vivos (incluye biopreparado, siembro, todo)', () => {
    const intents = selectChipIntents({}, { esOperador: true });
    expect(intents).toContain(CHIP_INTENTS.biopreparado);
    expect(intents).toContain(CHIP_INTENTS.siembro);
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).toContain(CHIP_INTENTS.precio);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).toContain(CHIP_INTENTS.silvopastoreo);
    expect(intents).toContain(CHIP_INTENTS.restauracion);
    // Los stubs NO aparecen
    expect(intents).not.toContain(CHIP_INTENTS.deep);
  });

  it('porcicultor (campesino con cerdos): ve cultivo + silvopastoreo', () => {
    const intents = selectChipIntents({ rol: 'campesino', animales: ['cerdos'] });
    expect(intents).toContain(CHIP_INTENTS.siembro);
    expect(intents).toContain(CHIP_INTENTS.silvopastoreo);
    // SIN paramo (no es restaurador)
    expect(intents).not.toContain(CHIP_INTENTS.paramo);
    expect(intents).not.toContain(CHIP_INTENTS.restauracion);
  });

  it('restaurador + silvopastoreo (con animales): restauracion primero, silvopastoreo incluido', () => {
    const intents = selectChipIntents({
      rol: 'restaurador',
      animales: ['ganado'],
      objetivo: ['biodiversidad'],
    });
    expect(intents[0]).toBe(CHIP_INTENTS.restauracion);
    expect(intents).toContain(CHIP_INTENTS.paramo);
    expect(intents).toContain(CHIP_INTENTS.silvopastoreo);
    expect(intents).toContain(CHIP_INTENTS.clima);
  });

  it('ganadero puro (solo vacas): silvopastoreo + clima + plaga + siembro', () => {
    const intents = selectChipIntents({ rol: 'ganadero', animales: ['vacas'] });
    expect(intents[0]).toBe(CHIP_INTENTS.silvopastoreo);
    expect(intents).toContain(CHIP_INTENTS.clima);
    expect(intents).toContain(CHIP_INTENTS.plaga);
    expect(intents).toContain(CHIP_INTENTS.siembro);
  });
});

describe('profileChipSelector — invariantes', () => {
  it('NUNCA devuelve chips stubs para ningun perfil no-operador', () => {
    const perfiles = [
      { rol: 'campesino' },
      { rol: 'restaurador' },
      { vocacion: 'urbano' },
      { rol: 'tecnico' },
      { rol: 'socio' },
    ];
    for (const p of perfiles) {
      const intents = selectChipIntents(p);
      expect(intents).not.toContain(CHIP_INTENTS.deep);
    }
  });

  it('SIEMPRE respeta el orden de prioridad del rol (no aleatorio)', () => {
    // Dos llamadas identicas deben dar el mismo orden.
    const a = selectChipIntents({ rol: 'campesino', animales: ['gallinas'] });
    const b = selectChipIntents({ rol: 'campesino', animales: ['gallinas'] });
    expect(a).toEqual(b);
  });
});

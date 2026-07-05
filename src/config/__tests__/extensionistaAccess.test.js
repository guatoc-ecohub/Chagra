/**
 * extensionistaAccess.test.js — TDD del gate de ROL "extensionista" (MVP modo
 * supervisor multi-finca, ADR-048).
 *
 * Un extensionista es un usuario que SUPERVISA varias fincas de OTROS
 * agricultores (asesor SENA/EPSEA, técnico Agrosavia/IPPTA, líder de
 * asociación). NO es lo mismo que el multi-finca de 1 usuario de ADR-036:
 * acá el usuario observa fincas que NO le pertenecen.
 *
 * Cobertura:
 *  - esExtensionista: username en whitelist → true.
 *  - esExtensionista: username fuera de whitelist → false.
 *  - esExtensionista: null / undefined / vacío / solo espacios → false.
 *  - esExtensionista: match case-insensitive y tolerante a espacios (trim).
 *  - EXTENSIONISTA_WHITELIST exporta un Set (editable por el operador).
 *  - esExtensionistaActual: lee el tenantId activo de localStorage (offline).
 *  - El gate respeta el feature flag VITE_FEATURE_EXTENSIONISTA: con la flag
 *    apagada, NADIE es extensionista (kill-switch global), aunque esté en la
 *    whitelist.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('../extensionistaAccess.js');
};

describe('extensionistaAccess — esExtensionista (función pura)', () => {
  let mod;

  beforeEach(async () => {
    // Por defecto en tests la flag está ON para poder probar la whitelist.
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    mod = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devuelve true para usernames extensionistas de la whitelist', () => {
    // El username de demo está en la whitelist seed por defecto.
    expect(mod.esExtensionista('demo-extensionista')).toBe(true);
  });

  it('devuelve false para usernames fuera de la whitelist', () => {
    expect(mod.esExtensionista('campesino_juan')).toBe(false);
    expect(mod.esExtensionista('random_user_xyz')).toBe(false);
  });

  it('devuelve false para null/undefined/vacío/solo-espacios (defensive)', () => {
    expect(mod.esExtensionista(null)).toBe(false);
    expect(mod.esExtensionista(undefined)).toBe(false);
    expect(mod.esExtensionista('')).toBe(false);
    expect(mod.esExtensionista('   ')).toBe(false);
    expect(mod.esExtensionista(/** @type {any} */ (123))).toBe(false);
  });

  it('hace match case-insensitive y tolerante a espacios (trim)', () => {
    expect(mod.esExtensionista('  DEMO-EXTENSIONISTA  ')).toBe(true);
    expect(mod.esExtensionista('Demo-Extensionista')).toBe(true);
  });

  it('EXTENSIONISTA_WHITELIST es un Set no vacío y editable', () => {
    expect(mod.EXTENSIONISTA_WHITELIST instanceof Set).toBe(true);
    expect(mod.EXTENSIONISTA_WHITELIST.size).toBeGreaterThan(0);
  });
});

describe('extensionistaAccess — feature flag VITE_FEATURE_EXTENSIONISTA (kill-switch)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('con la flag OFF nadie es extensionista, aunque esté en la whitelist', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'false');
    const mod = await importFresh();
    expect(mod.featureExtensionistaActivo()).toBe(false);
    expect(mod.esExtensionista('demo-extensionista')).toBe(false);
  });

  it('con la flag indefinida (default) el modo está apagado', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', '');
    const mod = await importFresh();
    expect(mod.featureExtensionistaActivo()).toBe(false);
    expect(mod.esExtensionista('demo-extensionista')).toBe(false);
  });

  it('acepta "1" como string-verdadero para la flag', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', '1');
    const mod = await importFresh();
    expect(mod.featureExtensionistaActivo()).toBe(true);
    expect(mod.esExtensionista('demo-extensionista')).toBe(true);
  });
});

describe('extensionistaAccess — bypass del OPERADOR (visión total)', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('el operador (override local) es extensionista AUNQUE la flag esté OFF', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'false');
    localStorage.setItem('chagra:operator_override', '1');
    const mod = await importFresh();
    // Con override de operador entra al panel sin importar la flag ni la whitelist.
    expect(mod.esExtensionista('admin')).toBe(true);
    expect(mod.esExtensionista('cualquiera')).toBe(true);
  });

  it('el operador (override local) entra aunque NO esté en la whitelist', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    localStorage.setItem('chagra:operator_override', '1');
    const mod = await importFresh();
    expect(mod.esExtensionista('no-en-whitelist')).toBe(true);
  });

  it('sin override de operador, un usuario normal sigue gateado (flag OFF)', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'false');
    const mod = await importFresh();
    expect(mod.esExtensionista('admin')).toBe(false);
    expect(mod.esExtensionista('demo-extensionista')).toBe(false);
  });
});

describe('extensionistaAccess — esExtensionistaActual (lee tenant activo, offline)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('true cuando el tenant activo está en la whitelist', async () => {
    const mod = await importFresh();
    // tenantContext persiste en esta misma key.
    localStorage.setItem('chagra:active_tenant_id', 'demo-extensionista');
    expect(mod.esExtensionistaActual()).toBe(true);
  });

  it('false cuando no hay tenant activo (sin login)', async () => {
    const mod = await importFresh();
    expect(mod.esExtensionistaActual()).toBe(false);
  });

  it('false cuando el tenant activo NO está en la whitelist', async () => {
    const mod = await importFresh();
    localStorage.setItem('chagra:active_tenant_id', 'campesino_juan');
    expect(mod.esExtensionistaActual()).toBe(false);
  });
});

describe('extensionistaAccess — esExtensionistaReal (SIN bypass de operador; hotfix P0 2026-07-04)', () => {
  // REGRESIÓN DE PRODUCCIÓN que motiva esta función: el home F2 (DashboardLive)
  // decidía la portada con esExtensionista(), cuyo bypass de operador convertía
  // al operador (VITE_OPERATOR_USERNAME baked en prod) en "extensionista" → su
  // home montaba la RED institucional (vacía) en vez de la escena de SU finca →
  // área de escena en blanco en TODOS los temas. La portada institucional debe
  // gatearse por el rol REAL (flag + whitelist), nunca por el bypass.
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('el OPERADOR (override local) NO es extensionista real — conserva su escena de finca', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    localStorage.setItem('chagra:operator_override', '1');
    const mod = await importFresh();
    // El bypass sí aplica al panel (esExtensionista)…
    expect(mod.esExtensionista('admin')).toBe(true);
    // …pero NUNCA al rol real que decide la portada del home.
    expect(mod.esExtensionistaReal('admin')).toBe(false);
  });

  it('un username de la whitelist con la flag ON SÍ es extensionista real', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    const mod = await importFresh();
    expect(mod.esExtensionistaReal('demo-extensionista')).toBe(true);
    expect(mod.esExtensionistaReal('  DEMO-EXTENSIONISTA  ')).toBe(true);
  });

  it('con la flag OFF nadie es extensionista real, ni la whitelist ni el operador', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'false');
    localStorage.setItem('chagra:operator_override', '1');
    const mod = await importFresh();
    expect(mod.esExtensionistaReal('demo-extensionista')).toBe(false);
    expect(mod.esExtensionistaReal('admin')).toBe(false);
  });

  it('defensivo: null/undefined/vacío/no-string → false', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    const mod = await importFresh();
    expect(mod.esExtensionistaReal(null)).toBe(false);
    expect(mod.esExtensionistaReal(undefined)).toBe(false);
    expect(mod.esExtensionistaReal('   ')).toBe(false);
    expect(mod.esExtensionistaReal(/** @type {any} */ (123))).toBe(false);
  });

  it('esExtensionistaRealActual lee el tenant activo y respeta el mismo gate', async () => {
    vi.stubEnv('VITE_FEATURE_EXTENSIONISTA', 'true');
    const mod = await importFresh();
    localStorage.setItem('chagra:active_tenant_id', 'demo-extensionista');
    expect(mod.esExtensionistaRealActual()).toBe(true);
    // El operador logueado con su propio username NO entra por acá.
    localStorage.setItem('chagra:active_tenant_id', 'miguel-operador');
    localStorage.setItem('chagra:operator_override', '1');
    expect(mod.esExtensionistaRealActual()).toBe(false);
  });
});

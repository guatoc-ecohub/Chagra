import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROFILE_QUESTIONS,
  getApplicableQuestions,
  getProfile,
  getProfileMunicipio,
  saveProfile,
  markProfileDone,
  markProfileSkipped,
  hasSeenProfileOnboarding,
  buildUserProfileBlock,
  resolveAltitudToSave,
  getNotificationStyle,
  setNotificationStyle,
  DEFAULT_NOTIFICATION_STYLE,
  getTelemetryConsent,
  setTelemetryConsent,
  HOME_MODULES,
  getModuleVisibility,
  setModuleVisibility,
  isModuleVisible,
  HOME_MODULE_DEFAULT_ORDER,
  getModuleOrder,
  setModuleOrder,
  hasManualModuleOrder,
  __PROFILE_KEYS__,
  _resetProfileMigration,
} from '../userProfileService.js';

describe('userProfileService (#200)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('catálogo de preguntas', () => {
    it('define un catálogo razonable de preguntas condicionales', () => {
      // El catálogo creció con el onboarding por perfil (rol, animales,
      // gallinas_manejo, restauracion_objetivo) y la estructura de finca para la
      // escena rica #34 (invernadero_tiene/forma/tamano, composicion). Las
      // condicionales hacen que el número EFECTIVO por usuario sea bastante menor
      // (ver test de conteo por perfil). El piso/techo aquí solo evita
      // crecimiento descontrolado.
      expect(PROFILE_QUESTIONS.length).toBeLessThanOrEqual(26);
      expect(PROFILE_QUESTIONS.length).toBeGreaterThanOrEqual(15);
    });

    it('cada pregunta tiene id, category, title y type', () => {
      for (const q of PROFILE_QUESTIONS) {
        expect(q.id).toBeTruthy();
        expect(q.category).toBeTruthy();
        expect(q.title).toBeTruthy();
        expect(['text', 'number', 'single', 'multi']).toContain(q.type);
      }
    });

    it('los ids son únicos', () => {
      const ids = PROFILE_QUESTIONS.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    // Regresión: el modo MAESTRO (buildMasterModeBlock en agentPromptBase.js)
    // ya lo soporta el backend (normalizeMode reconoce 'maestro'), pero el
    // selector de perfil solo ofrecía simple/detallado. Se agrega la 3ra
    // opción para que sea alcanzable desde la UI (ProfileScreen → onboarding).
    it('nivel_respuestas ofrece la opción "maestro" alcanzable desde el perfil', () => {
      const pregunta = PROFILE_QUESTIONS.find((q) => q.id === 'nivel_respuestas');
      expect(pregunta).toBeTruthy();
      const values = pregunta.options.map((o) => o.value);
      expect(values).toContain('simple');
      expect(values).toContain('detallado');
      expect(values).toContain('maestro');
    });
  });

  describe('preguntas condicionales', () => {
    it('usuario urbano NO ve hectáreas ni altitud rural', () => {
      const applicable = getApplicableQuestions({ vocacion: 'urbano' });
      const ids = applicable.map((q) => q.id);
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).not.toContain('finca_altitud');
      expect(ids).not.toContain('riego');
    });

    it('usuario urbano SÍ ve estrato y espacio urbano', () => {
      const applicable = getApplicableQuestions({ vocacion: 'urbano' });
      const ids = applicable.map((q) => q.id);
      expect(ids).toContain('estrato');
      expect(ids).toContain('espacio_urbano');
    });

    it('usuario rural SÍ ve hectáreas y altitud', () => {
      const applicable = getApplicableQuestions({ vocacion: 'campesino', finca_tipo: 'rural' });
      const ids = applicable.map((q) => q.id);
      expect(ids).toContain('finca_hectareas');
      expect(ids).toContain('finca_altitud');
      expect(ids).not.toContain('estrato');
    });

    it('balcón NO ve hectáreas (aunque vocación no sea urbano)', () => {
      const applicable = getApplicableQuestions({ vocacion: 'curioso', finca_tipo: 'balcon' });
      const ids = applicable.map((q) => q.id);
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).toContain('estrato');
    });
  });

  describe('persistencia localStorage chagra:profile:*', () => {
    it('saveProfile + getProfile hace merge', () => {
      saveProfile({ nombre: 'Lucía' });
      saveProfile({ region: 'Choachí' });
      const p = getProfile();
      expect(p.nombre).toBe('Lucía');
      expect(p.region).toBe('Choachí');
    });

    it('markProfileDone marca onboarding visto', () => {
      expect(hasSeenProfileOnboarding()).toBe(false);
      markProfileDone();
      expect(hasSeenProfileOnboarding()).toBe(true);
    });

    it('markProfileSkipped marca onboarding visto (respeta #283)', () => {
      markProfileSkipped();
      expect(hasSeenProfileOnboarding()).toBe(true);
    });
  });

  describe('buildUserProfileBlock', () => {
    it('vacío sin perfil', () => {
      expect(buildUserProfileBlock({})).toBe('');
    });

    it('incluye nombre, región y cultivos', () => {
      const block = buildUserProfileBlock({
        nombre: 'Pedro',
        region: 'Cauca',
        cultivos_actuales: 'café, plátano',
      });
      expect(block).toContain('Pedro');
      expect(block).toContain('Cauca');
      expect(block).toContain('café, plátano');
      expect(block).toContain('PERFIL DEL USUARIO');
    });

    it('traduce valores de opción única a etiquetas legibles', () => {
      const block = buildUserProfileBlock({ vocacion: 'campesino', manejo: 'organico' });
      expect(block).toMatch(/campesino/i);
      expect(block).toMatch(/orgánico|Orgánico/);
    });

    it('respuestas multi se unen con coma', () => {
      const block = buildUserProfileBlock({ problemas: ['plagas', 'clima'] });
      expect(block).toMatch(/Plagas e insectos/);
      expect(block).toMatch(/Clima/);
    });

    it('preferencia simple añade directiva de tono', () => {
      const block = buildUserProfileBlock({ nombre: 'X', nivel_respuestas: 'simple' });
      expect(block).toMatch(/SIMPLES/);
    });

    it('preferencia detallado añade directiva técnica', () => {
      const block = buildUserProfileBlock({ nombre: 'X', nivel_respuestas: 'detallado' });
      expect(block).toMatch(/DETALLADAS/);
    });

    it('preferencia maestro añade directiva de enseñar el porqué', () => {
      const block = buildUserProfileBlock({ nombre: 'X', nivel_respuestas: 'maestro' });
      expect(block).toMatch(/enseñes el porqué/);
    });
  });
});

describe('getProfileMunicipio — backfill offline de perfiles viejos (#338)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prefiere el campo municipio limpio cuando existe', () => {
    saveProfile({ municipio: 'Popayán', region: 'otra cosa' });
    expect(getProfileMunicipio()).toBe('Popayán');
  });

  it('resuelve municipio desde region (texto libre) en perfiles sin municipio', () => {
    // Perfil viejo: solo region en texto libre, sin campo municipio.
    saveProfile({ region: 'Choachí, Cundinamarca' });
    expect(getProfileMunicipio()).toMatch(/Choach/);
  });

  it('devuelve null si no hay municipio ni region resoluble', () => {
    saveProfile({ region: 'Zzqxnoexiste' });
    expect(getProfileMunicipio()).toBeNull();
    localStorage.clear();
    expect(getProfileMunicipio()).toBeNull();
  });
});

describe('resolveAltitudToSave — coalesce no-destructivo (#1213-regresion)', () => {
  it('manual siempre prevalece — sobrescribe incluso una altitud buena existente', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'manual',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 2580,
      existingFincaAltitud: '1923',
      existingAltitudSource: 'elevation_api',
    });
    expect(finca_altitud).toBe('2580');
    expect(altitud_source).toBe('manual');
  });

  it('regresion #1213: cabecera NO pisa altitud real existente (caso Choachi 2580 vs 1923)', () => {
    // El perfil del operador tiene altitud 2580 (finca vereda alta, fuente no-cabecera).
    // El backfill de municipio Choachi devuelve altitud_fuente='cabecera' (1923).
    // El resultado debe preservar 2580 y NO actualizar finca_altitud.
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 1923, // lo que resolvió el fallback offline
      existingFincaAltitud: '2580',
      existingAltitudSource: 'manual', // o 'elevation_api' o 'dado'
    });
    expect(finca_altitud).toBeUndefined();
    expect(altitud_source).toBeUndefined();
  });

  it('cabecera SÍ persiste cuando el perfil no tiene altitud previa', () => {
    // Perfil nuevo sin altitud → la cabecera es mejor que nada.
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 1923,
      existingFincaAltitud: null,
      existingAltitudSource: null,
    });
    expect(finca_altitud).toBe('1923');
    expect(altitud_source).toBe('cabecera');
  });

  it('cabecera SÍ persiste cuando el perfil ya tiene otra cabecera (no pior que antes)', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 1923,
      existingFincaAltitud: '1800',
      existingAltitudSource: 'cabecera',
    });
    // Actualizar cabecera con cabecera está bien (puede haber elegido otro municipio).
    expect(finca_altitud).toBe('1923');
    expect(altitud_source).toBe('cabecera');
  });

  it('elevation_api pisa una cabecera previa (GPS/API > cabecera)', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'elevation_api',
      effectiveAltitud: 2490,
      existingFincaAltitud: '1923',
      existingAltitudSource: 'cabecera',
    });
    expect(finca_altitud).toBe('2490');
    expect(altitud_source).toBe('elevation_api');
  });

  it('dado (GPS real) pisa una cabecera previa', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'dado',
      effectiveAltitud: 2580,
      existingFincaAltitud: '1923',
      existingAltitudSource: 'cabecera',
    });
    expect(finca_altitud).toBe('2580');
    expect(altitud_source).toBe('dado');
  });

  it('sin effectiveAltitud devuelve ambos undefined', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: null,
      effectiveAltitud: null,
      existingFincaAltitud: null,
      existingAltitudSource: null,
    });
    expect(finca_altitud).toBeUndefined();
    expect(altitud_source).toBeUndefined();
  });

  describe('estilo de notificación (operador 2026-06-06)', () => {
    it('por defecto es "demo" (chip estilo demo)', () => {
      expect(DEFAULT_NOTIFICATION_STYLE).toBe('demo');
      expect(getNotificationStyle()).toBe('demo');
    });

    it('persiste y relee el estilo seleccionado', () => {
      setNotificationStyle('actual');
      expect(getNotificationStyle()).toBe('actual');
      expect(getProfile().estilo_notificacion).toBe('actual');
      setNotificationStyle('demo');
      expect(getNotificationStyle()).toBe('demo');
    });

    it('un valor inválido cae al default sin corromper el perfil', () => {
      setNotificationStyle(/** @type {any} */ ('xyz'));
      expect(getNotificationStyle()).toBe('demo');
      expect(getProfile().estilo_notificacion).toBe('demo');
    });

    it('un perfil viejo sin el campo devuelve el default', () => {
      saveProfile({ nombre: 'Lili' });
      expect(getNotificationStyle()).toBe('demo');
    });
  });
});

describe('consentimiento de telemetría (#6230)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getTelemetryConsent devuelve false por defecto (OFF)', () => {
    expect(getTelemetryConsent()).toBe(false);
  });

  it('setTelemetryConsent(true) persiste y relee true', () => {
    expect(setTelemetryConsent(true)).toBe(true);
    expect(getTelemetryConsent()).toBe(true);
  });

  it('setTelemetryConsent(false) persiste y relee false', () => {
    setTelemetryConsent(true);
    expect(getTelemetryConsent()).toBe(true);

    setTelemetryConsent(false);
    expect(getTelemetryConsent()).toBe(false);
  });

  it('getTelemetryConsent falla silente si localStorage no disponible', () => {
    const originalLocalStorage = window.localStorage;
    delete window.localStorage;

    expect(getTelemetryConsent()).toBe(false);

    window.localStorage = originalLocalStorage;
  });

  it('setTelemetryConsent falla silente si localStorage no disponible', () => {
    const originalLocalStorage = window.localStorage;
    delete window.localStorage;

    expect(setTelemetryConsent(true)).toBe(false);

    window.localStorage = originalLocalStorage;
  });

  it('consentimiento es independiente del perfil principal', () => {
    saveProfile({ nombre: 'Carlos' });
    setTelemetryConsent(true);

    const profile = getProfile();
    expect(profile.nombre).toBe('Carlos');
    expect(profile.telemetry_consent).toBeUndefined(); // No mezcla keys
    expect(getTelemetryConsent()).toBe(true);

    localStorage.clear();
    expect(getTelemetryConsent()).toBe(false); // Se limpia por separado
  });

  it('__PROFILE_KEYS__ exporta la key de consentimiento', () => {
    expect(__PROFILE_KEYS__.TELEMETRY_CONSENT_KEY).toContain('telemetry_consent');
  });
});

describe('visibilidad de módulos del Home (#7003)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('catálogo HOME_MODULES', () => {
    it('define todos los módulos del dashboard', () => {
      const ids = HOME_MODULES.map((m) => m.id);
      const expectedIds = [
        'hoyfinca',
        'clima',
        'analisis',
        'asociaciones',
        'plantas',
        'zonas',
        'insumos',
        'bitacora',
        'hoy',
        'plagas',
        'biodiversidad',
        'informes',
      ];
      expect(ids).toEqual(expectedIds);
    });

    it('cada módulo tiene id, label, description y category', () => {
      for (const module of HOME_MODULES) {
        expect(module.id).toBeTruthy();
        expect(module.label).toBeTruthy();
        expect(module.description).toBeTruthy();
        expect(module.category).toBeTruthy();
      }
    });

    it('los ids son únicos', () => {
      const ids = HOME_MODULES.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getModuleVisibility', () => {
    it('sin perfil devuelve todos los módulos visibles (true)', () => {
      const visibility = getModuleVisibility();
      for (const module of HOME_MODULES) {
        expect(visibility[module.id]).toBe(true);
      }
    });

    it('con perfil vacío devuelve todos los módulos visibles', () => {
      saveProfile({});
      const visibility = getModuleVisibility();
      for (const module of HOME_MODULES) {
        expect(visibility[module.id]).toBe(true);
      }
    });

    it('lee configuración guardada correctamente', () => {
      saveProfile({
        modulos_visibles: {
          clima: false,
          plantas: false,
        },
      });
      const visibility = getModuleVisibility();
      expect(visibility.clima).toBe(false);
      expect(visibility.plantas).toBe(false);
      expect(visibility.zonas).toBe(true); // No guardado → true por defecto
    });

    it('nuevos módulos (no guardados) son visibles por defecto', () => {
      saveProfile({
        modulos_visibles: {
          clima: false,
        },
      });
      const visibility = getModuleVisibility();
      expect(visibility.clima).toBe(false);
      expect(visibility.analisis).toBe(true); // Nuevo módulo → true
    });
  });

  describe('setModuleVisibility', () => {
    it('guarda configuración de visibilidad en el perfil', () => {
      setModuleVisibility({
        clima: false,
        plantas: false,
        zonas: true,
      });
      const profile = getProfile();
      expect(profile.modulos_visibles).toBeDefined();
      expect(profile.modulos_visibles.clima).toBe(false);
      expect(profile.modulos_visibles.plantas).toBe(false);
      // true no se guarda (implícito)
      expect(profile.modulos_visibles.zonas).toBeUndefined();
    });

    it('solo guarda módulos conocidos', () => {
      setModuleVisibility({
        clima: false,
        modulo_inventado: true,
      });
      const profile = getProfile();
      expect(profile.modulos_visibles.clima).toBe(false);
      expect(profile.modulos_visibles.modulo_inventado).toBeUndefined();
    });

    it('reemplaza configuración anterior', () => {
      setModuleVisibility({ clima: false, plantas: false });
      setModuleVisibility({ clima: true });
      const visibility = getModuleVisibility();
      expect(visibility.clima).toBe(true);
      expect(visibility.plantas).toBe(true); // Reset a implícito true
    });

    it('ignora argumentos inválidos', () => {
      saveProfile({ modulos_visibles: { clima: false } });
      setModuleVisibility(null);
      const profile = getProfile();
      expect(profile.modulos_visibles.clima).toBe(false); // Sin cambios
    });
  });

  describe('isModuleVisible', () => {
    it('devuelve true para módulos sin configuración (default)', () => {
      expect(isModuleVisible('clima')).toBe(true);
      expect(isModuleVisible('plantas')).toBe(true);
    });

    it('devuelve false para módulos explícitamente ocultos', () => {
      saveProfile({ modulos_visibles: { clima: false } });
      expect(isModuleVisible('clima')).toBe(false);
    });

    it('devuelve true para módulos explícitamente visibles', () => {
      saveProfile({ modulos_visibles: { clima: true } });
      expect(isModuleVisible('clima')).toBe(true);
    });

    it('módulos desconocidos son visibles (fail-open)', () => {
      expect(isModuleVisible('modulo_inventado')).toBe(true);
    });

    it('responde a cambios en tiempo de ejecución', () => {
      expect(isModuleVisible('clima')).toBe(true);
      setModuleVisibility({ clima: false });
      expect(isModuleVisible('clima')).toBe(false);
      setModuleVisibility({ clima: true });
      expect(isModuleVisible('clima')).toBe(true);
    });
  });
});

describe('orden de módulos del Home (reorder por drag, 2026-06-15)', () => {
  const LEGACY_KEY = 'chagra:dashboard-order:v3';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('HOME_MODULE_DEFAULT_ORDER', () => {
    it('contiene exactamente los ids de HOME_MODULES (cada uno una vez)', () => {
      const known = HOME_MODULES.map((m) => m.id).sort();
      expect([...HOME_MODULE_DEFAULT_ORDER].sort()).toEqual(known);
      expect(new Set(HOME_MODULE_DEFAULT_ORDER).size).toBe(HOME_MODULE_DEFAULT_ORDER.length);
    });

    it('el agente (AgentHero) NO está en el orden (vive fijo fuera del grid)', () => {
      expect(HOME_MODULE_DEFAULT_ORDER).not.toContain('agente');
      expect(HOME_MODULE_DEFAULT_ORDER).not.toContain('agent');
      expect(HOME_MODULE_DEFAULT_ORDER).not.toContain('hero');
    });
  });

  describe('getModuleOrder', () => {
    it('sin perfil devuelve el orden por defecto', () => {
      expect(getModuleOrder()).toEqual([...HOME_MODULE_DEFAULT_ORDER]);
    });

    it('lee el orden manual guardado en el perfil', () => {
      const custom = ['plantas', 'clima', 'hoyfinca'];
      saveProfile({ modulos_orden: custom });
      const order = getModuleOrder();
      // Respeta el orden elegido al frente...
      expect(order.slice(0, 3)).toEqual(custom);
      // ...y completa los faltantes al final (sin perder ninguno).
      expect([...order].sort()).toEqual(HOME_MODULES.map((m) => m.id).sort());
    });

    it('descarta ids desconocidos y duplicados del orden guardado', () => {
      saveProfile({ modulos_orden: ['clima', 'inventado', 'clima', 'plantas'] });
      const order = getModuleOrder();
      expect(order.slice(0, 2)).toEqual(['clima', 'plantas']);
      expect(order).not.toContain('inventado');
      expect(new Set(order).size).toBe(order.length);
      expect([...order].sort()).toEqual(HOME_MODULES.map((m) => m.id).sort());
    });
  });

  describe('migración del orden legado de localStorage → perfil', () => {
    it('migra chagra:dashboard-order:v3 al perfil y limpia la clave legada', () => {
      const legacy = ['informes', 'clima', 'plantas'];
      localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
      // Sin modulos_orden en el perfil todavía.
      expect(hasManualModuleOrder()).toBe(false);

      const order = getModuleOrder();
      // Orden migrado respeta el legado al frente.
      expect(order.slice(0, 3)).toEqual(legacy);
      // Persistido en el perfil.
      expect(getProfile().modulos_orden).toBeDefined();
      expect(hasManualModuleOrder()).toBe(true);
      // Clave legada eliminada tras migrar.
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it('el perfil tiene prioridad sobre la clave legada', () => {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(['informes', 'clima']));
      saveProfile({ modulos_orden: ['plantas', 'zonas'] });
      const order = getModuleOrder();
      // Gana el perfil, no el legado.
      expect(order.slice(0, 2)).toEqual(['plantas', 'zonas']);
      // No se toca la clave legada cuando el perfil ya manda.
      expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
    });
  });

  describe('setModuleOrder', () => {
    it('persiste el orden normalizado en el perfil', () => {
      setModuleOrder(['plantas', 'clima']);
      const saved = getProfile().modulos_orden;
      expect(saved.slice(0, 2)).toEqual(['plantas', 'clima']);
      // Normalizado: todos los módulos presentes una vez.
      expect([...saved].sort()).toEqual(HOME_MODULES.map((m) => m.id).sort());
    });

    it('ignora argumentos inválidos sin corromper el perfil', () => {
      saveProfile({ modulos_orden: ['clima', 'plantas'] });
      setModuleOrder(null);
      const order = getModuleOrder();
      expect(order.slice(0, 2)).toEqual(['clima', 'plantas']);
    });

    it('round-trip: lo que se guarda con setModuleOrder se lee con getModuleOrder', () => {
      const desired = ['biodiversidad', 'plagas', 'hoy', 'clima'];
      setModuleOrder(desired);
      expect(getModuleOrder().slice(0, 4)).toEqual(desired);
    });
  });
});

describe('per-user keying del perfil (onboarding por usuario)', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetProfileMigration();
  });

  it('sin usuario logueado usa claves globales (comportamiento actual)', () => {
    saveProfile({ nombre: 'Test' });
    expect(localStorage.getItem('chagra:profile:v1')).toBeTruthy();
    expect(getProfile().nombre).toBe('Test');
    expect(hasSeenProfileOnboarding()).toBe(false);
    markProfileDone();
    expect(hasSeenProfileOnboarding()).toBe(true);
  });

  it('usuario logueado usa claves con sufijo del tenantId', () => {
    localStorage.setItem('chagra:active_tenant_id', 'alice');
    saveProfile({ nombre: 'Alice' });
    // El perfil se guarda bajo clave per-user, no global
    expect(localStorage.getItem('chagra:profile:v1:alice')).toBeTruthy();
    expect(localStorage.getItem('chagra:profile:v1')).toBeNull();
    expect(getProfile().nombre).toBe('Alice');
  });

  it('done/skipped keys tambien llevan sufijo por usuario', () => {
    localStorage.setItem('chagra:active_tenant_id', 'alice');
    expect(hasSeenProfileOnboarding()).toBe(false);
    markProfileDone();
    expect(localStorage.getItem('chagra:profile:done:v1:alice')).toBe('1');
    expect(localStorage.getItem('chagra:profile:done:v1')).toBeNull();
    expect(hasSeenProfileOnboarding()).toBe(true);

    _resetProfileMigration();
    localStorage.setItem('chagra:active_tenant_id', 'bob');
    expect(hasSeenProfileOnboarding()).toBe(false);
  });

  it('dos usuarios logueados no comparten perfil', () => {
    localStorage.setItem('chagra:active_tenant_id', 'alice');
    saveProfile({ nombre: 'Alice' });
    markProfileDone();
    expect(hasSeenProfileOnboarding()).toBe(true);

    // Cambiar a otro usuario
    _resetProfileMigration();
    localStorage.setItem('chagra:active_tenant_id', 'bob');
    const bobProfile = getProfile();
    expect(bobProfile).toEqual({});
    expect(bobProfile.nombre).toBeUndefined();
    expect(hasSeenProfileOnboarding()).toBe(false);
  });

  it('saveProfile hace merge correcto con perfil per-user', () => {
    localStorage.setItem('chagra:active_tenant_id', 'alice');
    saveProfile({ nombre: 'Alice' });
    saveProfile({ region: 'Cauca' });
    const p = getProfile();
    expect(p.nombre).toBe('Alice');
    expect(p.region).toBe('Cauca');
    expect(p.updatedAt).toBeTruthy();
  });
});

describe('migracion suave de claves globales a per-user', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetProfileMigration();
  });

  it('usuario nuevo (sin clave propia) NO hereda clave global vieja', () => {
    // Simular estado previo: claves globales del operador
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ nombre: 'Miguel', region: 'Choachí' }));
    localStorage.setItem('chagra:profile:done:v1', '1');

    // Ana entra al mismo navegador
    localStorage.setItem('chagra:active_tenant_id', 'ana');
    expect(hasSeenProfileOnboarding()).toBe(false);
    expect(getProfile()).toEqual({});

    // Las claves globales no deben haberse limpiado (aún hay anonymous fallback)
    expect(localStorage.getItem('chagra:profile:v1')).toBeTruthy();
  });

  it('usuario sin VITE_OPERATOR_USERNAME no migra (seguro por defecto)', () => {
    // Sin env var de operador, nadie migra
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ nombre: 'Op' }));
    localStorage.setItem('chagra:profile:done:v1', '1');

    localStorage.setItem('chagra:active_tenant_id', 'cualquier');
    expect(getProfile()).toEqual({});
    expect(hasSeenProfileOnboarding()).toBe(false);
  });

  it('migra datos globales al perfil del operador cuando coincide VITE_OPERATOR_USERNAME', () => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ nombre: 'Op', region: 'Cauca' }));
    localStorage.setItem('chagra:profile:done:v1', '1');

    // Simular que el operador se loguea
    import.meta.env.VITE_OPERATOR_USERNAME = 'operador';
    localStorage.setItem('chagra:active_tenant_id', 'operador');

    expect(hasSeenProfileOnboarding()).toBe(true);
    const p = getProfile();
    expect(p.nombre).toBe('Op');
    expect(p.region).toBe('Cauca');

    // Claves globales se limpiaron tras la migración
    expect(localStorage.getItem('chagra:profile:v1')).toBeNull();
    expect(localStorage.getItem('chagra:profile:done:v1')).toBeNull();

    delete import.meta.env.VITE_OPERATOR_USERNAME;
  });

  it('migracion con múltiples operadores (VITE_OPERATOR_USERNAME lista separada por coma)', () => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ nombre: 'Richi' }));
    localStorage.setItem('chagra:profile:done:v1', '1');

    import.meta.env.VITE_OPERATOR_USERNAME = 'miguel,richi,ana';
    localStorage.setItem('chagra:active_tenant_id', 'richi');

    expect(hasSeenProfileOnboarding()).toBe(true);
    expect(getProfile().nombre).toBe('Richi');
    expect(localStorage.getItem('chagra:profile:v1')).toBeNull();

    delete import.meta.env.VITE_OPERATOR_USERNAME;
  });

  it('migracion respeta case-insensitive en username', () => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ nombre: 'Admin' }));
    localStorage.setItem('chagra:profile:done:v1', '1');

    import.meta.env.VITE_OPERATOR_USERNAME = 'Admin';
    localStorage.setItem('chagra:active_tenant_id', 'admin');

    expect(hasSeenProfileOnboarding()).toBe(true);
    expect(getProfile().nombre).toBe('Admin');

    delete import.meta.env.VITE_OPERATOR_USERNAME;
  });
});

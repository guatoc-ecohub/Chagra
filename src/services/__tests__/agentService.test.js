/**
 * agentService.test.js — Tests para servicio de contexto de perfil del agente.
 * Task #202: System prompt usa profile + cita orígenes + alertas climáticas.
 */

import { describe, it, expect } from 'vitest';
import {
  detectRegionFromBioculturalZone,
  generateRegionalToneContext,
  generateClimateAlertsContext,
  generateSourceCitationRules,
  generateUserDataRules,
  buildProfileContext,
  formatClimateAlert,
  buildClimaContext,
  buildFincaContext,
  generateViabilityRules,
  buildViabilityContext,
  buildFrostHeatContext,
  buildAssociationContext,
  buildInvasiveSafetyContext,
  buildCuratedFactsContext,
  generateAgronomicGuidanceRules,
  pisoTermicoFromAltitud,
  temporadaColombiana,
} from '../agentService.js';

describe('agentService — Task #202 Profile Context', () => {
  describe('detectRegionFromBioculturalZone', () => {
    it('debería detectar región cundiboyacense para andino_alto_páramo', () => {
      expect(detectRegionFromBioculturalZone('andino_alto_páramo')).toBe('cundiboyacense');
    });

    it('debería detectar región paisa para valle_caucano', () => {
      expect(detectRegionFromBioculturalZone('valle_caucano')).toBe('paisa');
    });

    it('debería detectar región caribe para caribe', () => {
      expect(detectRegionFromBioculturalZone('caribe')).toBe('caribe');
    });

    it('debería detectar región llanero para llanos', () => {
      expect(detectRegionFromBioculturalZone('llanos')).toBe('llanero');
    });

    it('debería retornar null para zona desconocida', () => {
      expect(detectRegionFromBioculturalZone('zona_inexistente')).toBeNull();
    });

    it('debería retornar null para undefined', () => {
      expect(detectRegionFromBioculturalZone(undefined)).toBeNull();
    });

    it('debería retornar null para null', () => {
      expect(detectRegionFromBioculturalZone(null)).toBeNull();
    });
  });

  describe('generateRegionalToneContext', () => {
    it('debería generar tono cundiboyacense correctamente', () => {
      const context = generateRegionalToneContext('cundiboyacense');
      expect(context).toContain('sumercé');
      expect(context).toContain('quibo');
      expect(context).toContain('cundiboyacense');
    });

    it('debería generar tono paisa correctamente', () => {
      const context = generateRegionalToneContext('paisa');
      expect(context).toContain('¿qui más?');
      expect(context).toContain('parce');
      expect(context).toContain('eje cafetero');
    });

    it('debería generar tono caribe correctamente', () => {
      const context = generateRegionalToneContext('caribe');
      expect(context).toContain('ajá parce');
      expect(context).toContain('vé pue');
      expect(context).toContain('Caribe');
    });

    it('debería generar tono llanero correctamente', () => {
      const context = generateRegionalToneContext('llanero');
      expect(context).toContain('quibo ome');
      expect(context).toContain('compadre');
      expect(context).toContain('sabana');
    });

    it('debería generar tono pacífico correctamente', () => {
      const context = generateRegionalToneContext('pacifico');
      expect(context).toContain('compadre');
      expect(context).toContain('afrocolombiano');
    });

    it('debería retornar español neutro para región null', () => {
      const context = generateRegionalToneContext(null);
      expect(context).toContain('español neutro colombiano');
      expect(context).toContain('sin regionalismos');
    });

    it('debería retornar español neutro para región desconocida', () => {
      const context = generateRegionalToneContext('desconocida');
      expect(context).toContain('español neutro colombiano');
    });
  });

  describe('generateClimateAlertsContext', () => {
    it('debería generar alertas para andino_alto_páramo con heladas', () => {
      const context = generateClimateAlertsContext('andino_alto_páramo');
      expect(context).toContain('heladas');
      expect(context).toContain('granizadas');
      expect(context).toContain('IDEAM');
      expect(context).toContain('Proteger cultivos con cubierta plástica');
    });

    it('debería generar alertas para caribe con salinidad', () => {
      const context = generateClimateAlertsContext('caribe');
      expect(context).toContain('salinidad');
      expect(context).toContain('sequías');
      expect(context).toContain('huracanes');
    });

    it('debería generar alertas para llanos con sequías e incendios', () => {
      const context = generateClimateAlertsContext('llanos');
      expect(context).toContain('sequías marcadas');
      expect(context).toContain('incendios forestales');
      expect(context).toContain('IDEAM - Alerta de incendios');
    });

    it('debería generar alertas para valle_caucano con ENSO', () => {
      const context = generateClimateAlertsContext('valle_caucano');
      expect(context).toContain('sequías estacionales');
      expect(context).toContain('El Niño/La Niña');
      expect(context).toContain('ENSO');
    });

    it('debería generar alertas para pacífico con lluvias excesivas', () => {
      const context = generateClimateAlertsContext('pacifico');
      expect(context).toContain('exceso de lluvias');
      expect(context).toContain('humedad extrema');
      expect(context).toContain('Codechocó');
    });

    it('debería recomendar IDEAM para zona desconocida', () => {
      // Bug piloto 2026-05-27: la regla CLIMA ahora consulta IDEAM vía el
      // tool get_clima_ideam y prohíbe redirigir al user a apps externas.
      const context = generateClimateAlertsContext('zona_inexistente');
      expect(context).toContain('IDEAM');
      expect(context).toContain('get_clima_ideam');
      // Zona desconocida igual deja constancia de la zona del operador.
      expect(context).toContain('zona_inexistente');
    });

    it('debería recomendar IDEAM para null', () => {
      const context = generateClimateAlertsContext(null);
      expect(context).toContain('REGLA CLIMA');
      expect(context).toContain('IDEAM');
    });
  });

  describe('generateSourceCitationRules', () => {
    it('debería incluir regla de citación Restrepo & Rivera', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('Restrepo & Rivera (1994)');
    });

    it('debería incluir regla de citación ICA', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('ICA Resolución');
    });

    it('debería incluir regla de citación IDEAM', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('IDEAM');
    });

    it('debería incluir regla de citación SENA', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('SENA');
    });

    it('debería incluir advertencia de no inventar fuentes', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('NUNCA inventes datos ni fuentes');
    });

    it('debería incluir mensaje de "no tengo dato"', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('No tengo una fuente confiable');
    });

    // Regresión anti-alucinación (incidente prod 2026-05-30): "tomate de
    // árbol" → "Solanum lycopersicum var. cerasiforme" (FALSO; lo correcto es
    // Solanum betaceum). El grounding del sidecar venía muerto y el LLM
    // inventó el binomio. Endurecemos la regla: solo se cita un binomio si
    // viene del grounding/catálogo provisto.
    it('debería incluir regla dura de binomio solo desde el grounding', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('REGLA CRÍTICA DE NOMBRES CIENTÍFICOS');
      expect(rules).toContain('NO inventes el binomio');
      expect(rules).toContain('grounding/catálogo provisto');
    });

    it('debería mandar usar SOLO el nombre común cuando no hay binomio en grounding', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('usa SOLO el nombre común');
    });

    it('debería referenciar el incidente tomate de árbol → betaceum como ejemplo', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('tomate de árbol');
      expect(rules).toContain('Solanum betaceum');
    });
  });

  describe('generateUserDataRules', () => {
    it('debería incluir ejemplos de cuándo mencionar inventario', () => {
      const rules = generateUserDataRules();
      expect(rules).toContain('¿qué tengo?');
      expect(rules).toContain('mis plantas');
      expect(rules).toContain('mi finca');
    });

    it('debería incluir advertencia de no preambular con inventario', () => {
      const rules = generateUserDataRules();
      expect(rules).toContain('NO preambules respuestas');
    });

    it('debería incluir ejemplo correcto con poda de café', () => {
      const rules = generateUserDataRules();
      expect(rules).toContain('cómo podo el café');
    });
  });

  describe('buildProfileContext', () => {
    it('debería construir contexto completo para finca andina', () => {
      const finca = {
        slug: 'guatoc',
        nombre: 'Guatoc',
        biocultural_zone: 'andino_alto_páramo',
        altitud: 2400,
      };

      const context = buildProfileContext(finca);

      // Debe incluir tono regional
      expect(context).toContain('cundiboyacense');
      expect(context).toContain('sumercé');

      // Debe incluir alertas climáticas
      expect(context).toContain('heladas');
      expect(context).toContain('IDEAM');

      // Debe incluir reglas de citación
      expect(context).toContain('Restrepo & Rivera');
      expect(context).toContain('ICA Resolución');

      // Debe incluir reglas de privacidad
      expect(context).toContain('NO preambules respuestas');
    });

    it('debería construir contexto completo para finca caribe', () => {
      const finca = {
        slug: 'finca-caribe',
        nombre: 'Finca Caribe',
        biocultural_zone: 'caribe',
        altitud: 50,
      };

      const context = buildProfileContext(finca);

      expect(context).toContain('ajá parce');
      expect(context).toContain('salinidad');
      expect(context).toContain('huracanes');
    });

    it('debería construir contexto completo para finca llanos', () => {
      const finca = {
        slug: 'finca-llanos',
        nombre: 'Finca Llanos',
        biocultural_zone: 'llanos',
        altitud: 300,
      };

      const context = buildProfileContext(finca);

      expect(context).toContain('quibo ome');
      expect(context).toContain('incendios forestales');
      expect(context).toContain('IDEAM - Alerta de incendios');
    });

    it('debería construir contexto mínimo para finca null', () => {
      const context = buildProfileContext(null);

      expect(context).toContain('Restrepo & Rivera');
      expect(context).toContain('NO preambules respuestas');
    });

    it('debería construir contexto mínimo para finca undefined', () => {
      const context = buildProfileContext(undefined);

      expect(context).toContain('Restrepo & Rivera');
      expect(context).toContain('ICA Resolución');
    });

    it('debería incluir todas las fuentes mencionadas en el task', () => {
      const finca = {
        slug: 'test',
        nombre: 'Test',
        biocultural_zone: 'andino_medio',
      };

      const context = buildProfileContext(finca);

      expect(context).toContain('Restrepo & Rivera');
      expect(context).toContain('ICA Resolución');
      expect(context).toContain('Agrosavia');
      expect(context).toContain('IDEAM');
      expect(context).toContain('SENA');
    });
  });

  describe('formatClimateAlert', () => {
    it('debería formatear alerta para andino_alto_páramo', () => {
      const alert = formatClimateAlert('andino_alto_páramo');

      expect(alert).toContain('⚠️ ALERTA CLIMÁTICA');
      expect(alert).toContain('andino alto páramo');
      expect(alert).toContain('heladas');
      expect(alert).toContain('granizadas');
      expect(alert).toContain('Proteger cultivos');
      expect(alert).toContain('IDEAM');
    });

    it('debería formatear alerta para caribe', () => {
      const alert = formatClimateAlert('caribe');

      expect(alert).toContain('ALERTA CLIMÁTICA');
      expect(alert).toContain('caribe');
      expect(alert).toContain('salinidad');
      expect(alert).toContain('sequías');
      expect(alert).toContain('huracanes');
    });

    it('debería retornar string vacío para zona sin alertas', () => {
      const alert = formatClimateAlert('zona_inexistente');
      expect(alert).toBe('');
    });

    it('debería incluir datos de clima si se proporcionan', () => {
      const climateData = {
        temperatura: 18,
        lluvia: 45,
        viento: 12,
      };

      const alert = formatClimateAlert('andino_alto', climateData);

      expect(alert).toContain('Pronóstico actual:');
      expect(alert).toContain('18');
      expect(alert).toContain('45');
    });

    it('debería incluir fuente específica por zona', () => {
      const alert = formatClimateAlert('valle_caucano');
      expect(alert).toContain('ENSO');
      expect(alert).toContain('CENICAÑA');
    });

    it('debería incluir Corporación Autónoma Regional según zona', () => {
      const alert = formatClimateAlert('pacifico');
      expect(alert).toContain('Codechocó');
    });
  });

  describe('Task #202 — Integración completa de 5 casos', () => {
    it('CASO 1: Tono regional según profile.region', () => {
      const fincaPaisa = {
        biocultural_zone: 'valle_caucano',
      };

      const context = buildProfileContext(fincaPaisa);
      expect(context).toContain('¿qui más?');
      expect(context).toContain('eje cafetero');
    });

    it('CASO 2: Recomendaciones según región específica (no solo piso térmico)', () => {
      const fincaBoyaca = {
        biocultural_zone: 'andino_alto_páramo',
      };

      const context = buildProfileContext(fincaBoyaca);
      expect(context).toContain('heladas');
      expect(context).toContain('cubierta plástica');
      expect(context).toContain('IDEAM 2024');
    });

    it('CASO 3: Info técnica SIEMPRE cita fuente', () => {
      const rules = generateSourceCitationRules();
      expect(rules).toContain('Restrepo & Rivera (1994)');
      expect(rules).toContain('ICA Resolución');
      expect(rules).toContain('Agrosavia');
      expect(rules).toContain('SENA');
      expect(rules).toContain('IDEAM');
      expect(rules).toContain('Papel técnico');
    });

    it('CASO 4: Datos de finca SOLO si user pregunta', () => {
      const rules = generateUserDataRules();
      expect(rules).toContain('¿qué tengo?');
      expect(rules).toContain('mis plantas');
      expect(rules).toContain('NO preambules');
    });

    it('CASO 5: Alertas clima inteligentes con ENSO y fuentes', () => {
      const fincaCaribe = {
        biocultural_zone: 'caribe',
      };

      const context = buildProfileContext(fincaCaribe);
      expect(context).toContain('ALERTAS CLIMÁTICAS');
      expect(context).toContain('salinidad');
      expect(context).toContain('IDEAM - Monitor de sequía');
      expect(context).toContain('ICA - Recomendaciones zonas costeras');
    });
  });

  // PoC alertas meteorológicas tiempo real (#316) — integración del snapshot
  // del sidecar en el system prompt del agente al máximo nivel.
  describe('buildClimaContext', () => {
    it('devuelve string vacío cuando snapshot es null', () => {
      expect(buildClimaContext(null)).toBe('');
      expect(buildClimaContext(undefined)).toBe('');
      expect(buildClimaContext({})).toBe('');
    });

    it('renderiza fase ENSO + ONI + IDEAM probs + alertas críticas', () => {
      const snap = {
        fetched_at: '2026-05-28T18:00:00Z',
        enso_status: {
          phase: 'nino_fuerte',
          label: 'El Niño fuerte',
          severity: 'critical',
          oni_value: 1.72,
          trend: 'rising',
          ideam_probabilities: { nino_pct: 70, neutral_pct: 25, nina_pct: 5 },
          sources: ['NOAA CPC (ONI)', 'IDEAM (boletín)'],
        },
        alertas_locales: [
          {
            tipo: 'helada',
            severity: 'critical',
            dias: ['2026-05-29'],
            mensaje: 'Helada probable el 2026-05-29 (mín -1°C).',
            valor_observado: -1,
            umbral: 2,
          },
        ],
      };
      const ctx = buildClimaContext(snap);
      expect(ctx).toContain('El Niño fuerte');
      expect(ctx).toContain('1.72');
      expect(ctx).toContain('rising');
      expect(ctx).toContain('70%');
      expect(ctx).toContain('NOAA CPC (ONI)');
      expect(ctx).toContain('IDEAM');
      expect(ctx).toContain('helada');
      expect(ctx).toContain('Helada probable');
      // Aún incluye la regla de cierre
      expect(ctx).toContain('CITANDO las fuentes');
    });

    it('omite ONI/IDEAM cuando no hay valor numérico', () => {
      const snap = {
        enso_status: {
          phase: 'neutral',
          label: 'Neutral ENSO',
          severity: 'neutral',
          oni_value: null,
          trend: null,
          ideam_probabilities: null,
          sources: [],
        },
        alertas_locales: [],
      };
      const ctx = buildClimaContext(snap);
      expect(ctx).toContain('Neutral ENSO');
      expect(ctx).not.toContain('ONI NOAA');
      expect(ctx).not.toContain('Probabilidad IDEAM');
    });
  });

  describe('pisoTermicoFromAltitud', () => {
    it('mapea altitud a piso térmico colombiano', () => {
      expect(pisoTermicoFromAltitud(3200)).toBe('páramo');
      expect(pisoTermicoFromAltitud(2580)).toBe('frío');
      expect(pisoTermicoFromAltitud(1500)).toBe('templado');
      expect(pisoTermicoFromAltitud(400)).toBe('cálido');
    });
    it('acepta string y devuelve null si no es numérico', () => {
      expect(pisoTermicoFromAltitud('2580')).toBe('frío');
      expect(pisoTermicoFromAltitud(null)).toBeNull();
      expect(pisoTermicoFromAltitud(undefined)).toBeNull();
      expect(pisoTermicoFromAltitud('abc')).toBeNull();
    });
  });

  describe('temporadaColombiana', () => {
    it('régimen bimodal andino por mes', () => {
      expect(temporadaColombiana(1).nombre).toContain('seca');
      expect(temporadaColombiana(4).nombre).toContain('primera temporada de lluvias');
      expect(temporadaColombiana(7).nombre).toContain('segunda temporada seca');
      expect(temporadaColombiana(10).nombre).toContain('segunda temporada de lluvias');
    });
    it('sin argumento usa el mes actual sin lanzar', () => {
      const t = temporadaColombiana();
      expect(typeof t.nombre).toBe('string');
      expect(t.nombre.length).toBeGreaterThan(0);
    });
  });

  describe('buildFincaContext (#202 contexto ambiental)', () => {
    const choachiProfile = {
      municipio: 'Choachí',
      departamento: 'Cundinamarca',
      finca_altitud: '2580',
      ubicacion_lat: 4.529,
      ubicacion_lng: -73.923,
    };
    const cultivosMaiz = [
      { name: 'Maíz', count: 2 },
      { name: 'Café', count: 1 },
      { name: 'Frijol', count: 1 },
    ];

    it('siempre incluye la temporada y el wrapper, aun sin nada', () => {
      const ctx = buildFincaContext({ month: 5 });
      expect(ctx).toContain('=== CONTEXTO AMBIENTAL DE LA FINCA');
      expect(ctx).toContain('Temporada actual');
      expect(ctx).toContain('=== FIN CONTEXTO AMBIENTAL ===');
      expect(ctx).toContain('NO lo recites salvo que sea relevante');
    });

    it('inyecta ubicación, altitud y piso térmico derivado', () => {
      const ctx = buildFincaContext({ profile: choachiProfile, month: 5 });
      expect(ctx).toContain('Choachí');
      expect(ctx).toContain('Cundinamarca');
      expect(ctx).toContain('2580 msnm');
      expect(ctx).toContain('piso frío'); // derivado de 2580
      expect(ctx).toContain('4.529');
    });

    it('usa el nombre de la finca activa si está presente', () => {
      const ctx = buildFincaContext({
        profile: choachiProfile,
        finca: { nombre: 'La Esperanza', slug: 'la-esperanza' },
        month: 5,
      });
      expect(ctx).toContain('Finca activa: "La Esperanza"');
    });

    it('resume cultivos registrados de forma compacta', () => {
      const ctx = buildFincaContext({ groupedCultivos: cultivosMaiz, month: 5 });
      expect(ctx).toContain('Cultivos registrados en la finca: Maíz ×2, Café, Frijol');
    });

    it('colapsa el inventario largo con "y N más"', () => {
      const muchos = Array.from({ length: 12 }, (_, i) => ({ name: `c${i}`, count: 1 }));
      const ctx = buildFincaContext({ groupedCultivos: muchos, month: 5 });
      expect(ctx).toContain('y 4 más');
    });

    it('reutiliza el snapshot de clima cacheado (hoy + resumen 7d)', () => {
      const snapshot = {
        enso_status: { phase: 'nino_moderado', label: 'El Niño moderado' },
        openmeteo: {
          available: true,
          forecast_7d: [
            { date: '2026-05-30', temp_max_c: 19, temp_min_c: 8, precip_mm: 0 },
            { date: '2026-05-31', temp_max_c: 18, temp_min_c: 2, precip_mm: 12 },
            { date: '2026-06-01', temp_max_c: 17, temp_min_c: 3, precip_mm: 5 },
          ],
        },
      };
      const ctx = buildFincaContext({ climaSnapshot: snapshot, month: 5 });
      expect(ctx).toContain('Clima local hoy: 8°/19°C');
      expect(ctx).toContain('El Niño moderado');
      expect(ctx).toContain('2/7 días con lluvia');
      expect(ctx).toContain('mínima de la semana 2°C');
    });

    it('omite el bloque clima si el snapshot no tiene forecast disponible', () => {
      const ctx = buildFincaContext({
        climaSnapshot: { openmeteo: { available: false, reason: 'offline' } },
        month: 5,
      });
      expect(ctx).not.toContain('Clima local hoy');
      expect(ctx).not.toContain('Pronóstico 7d');
    });

    it('lista alertas activas del alertStore', () => {
      const ctx = buildFincaContext({
        activeAlerts: [
          { type: 'helada', severity: 'danger', title: 'Riesgo de helada', message: 'mín 2°C' },
        ],
        month: 5,
      });
      expect(ctx).toContain('Alertas activas: Riesgo de helada');
    });

    it('cruza entidades resueltas (AGE) con el inventario y marca lo que el usuario tiene', () => {
      const ctx = buildFincaContext({
        groupedCultivos: cultivosMaiz,
        resolvedEntities: [
          { mentioned: 'maíz', kind: 'planta', nombre_comun: 'Maíz', nombre_cientifico: 'Zea mays' },
        ],
        month: 5,
      });
      expect(ctx).toContain('YA TIENE registrado');
      expect(ctx).toContain('Maíz');
    });

    it('NO marca cruce si la entidad mencionada no está en el inventario', () => {
      const ctx = buildFincaContext({
        groupedCultivos: cultivosMaiz,
        resolvedEntities: [
          { mentioned: 'aguacate', kind: 'planta', nombre_comun: 'Aguacate', nombre_cientifico: 'Persea americana' },
        ],
        month: 5,
      });
      expect(ctx).not.toContain('YA TIENE registrado');
    });

    it('ignora plagas en el cruce de inventario', () => {
      const ctx = buildFincaContext({
        groupedCultivos: [{ name: 'Café', count: 3 }],
        resolvedEntities: [
          { mentioned: 'broca', kind: 'plaga', nombre_comun: 'Broca', nombre_cientifico: 'Hypothenemus hampei' },
        ],
        month: 5,
      });
      expect(ctx).not.toContain('YA TIENE registrado');
    });

    it('match laxo: "maíz" mencionado contra "Maíz amarillo" registrado', () => {
      const ctx = buildFincaContext({
        groupedCultivos: [{ name: 'Maíz amarillo', count: 4 }],
        resolvedEntities: [
          { mentioned: 'maiz', kind: 'planta', nombre_comun: 'Maíz', nombre_cientifico: 'Zea mays' },
        ],
        month: 5,
      });
      expect(ctx).toContain('YA TIENE registrado');
      expect(ctx).toContain('Maíz amarillo');
    });

    // ──────────────────────────────────────────────────────────────────────
    // #357 — CLIMA NOMBRA LA VEREDA. Cuando la finca está geocodeada a una
    // vereda (reverse-geocoding DANE MGN, #338), la ubicación inyectada al
    // prompt debe nombrar "vereda X, Municipio" para que el agente localice
    // la respuesta de clima en la vereda específica, no un genérico "tu zona".
    // El DATO de IDEAM sigue siendo municipal — solo se PRESENTA localizado.
    // ──────────────────────────────────────────────────────────────────────
    describe('#357 — vereda en el contexto de ubicación', () => {
      it('nombra "vereda X, Municipio" cuando el perfil trae vereda', () => {
        const ctx = buildFincaContext({
          profile: { ...choachiProfile, vereda: 'El Curí' },
          month: 5,
        });
        expect(ctx).toContain('vereda El Curí');
        expect(ctx).toContain('Choachí');
      });

      it('toma la vereda de la finca activa sobre la del perfil', () => {
        const ctx = buildFincaContext({
          profile: { ...choachiProfile, vereda: 'Perfil Vereda' },
          finca: { nombre: 'La Esperanza', vereda: 'El Curí' },
          month: 5,
        });
        expect(ctx).toContain('vereda El Curí');
        expect(ctx).not.toContain('Perfil Vereda');
      });

      it('cae a municipio sin romper cuando NO hay vereda', () => {
        const ctx = buildFincaContext({ profile: choachiProfile, month: 5 });
        expect(ctx).toContain('Choachí');
        expect(ctx).not.toContain('vereda');
      });

      it('instruye al agente a NOMBRAR la vereda al hablar de clima/pronóstico', () => {
        const ctx = buildFincaContext({
          profile: { ...choachiProfile, vereda: 'El Curí' },
          month: 5,
        });
        // El prompt debe pedir explícitamente nombrar el lugar específico
        // (vereda + municipio) en vez de un genérico "tu zona"/"tu finca".
        expect(ctx).toMatch(/vereda.*municipio|nombra.*lugar|tu zona/i);
      });

      it('no duplica la vereda cuando ya viene dentro de region/municipio', () => {
        // Defensa: si municipio ya incluyera la vereda no debe quedar "vereda El Curí, vereda El Curí".
        const ctx = buildFincaContext({
          profile: { ...choachiProfile, vereda: 'El Curí' },
          month: 5,
        });
        const matches = ctx.match(/vereda El Curí/gi) || [];
        expect(matches.length).toBe(1);
      });
    });

    // ──────────────────────────────────────────────────────────────────────
    // Incidente prod (piloto Choachí): cuando la ÚNICA altitud guardada es la
    // de la CABECERA municipal (fallback offline DANE, `altitud_source:
    // 'cabecera'`) — caso en que el GPS se difuminó a la cabecera en el primer
    // onboarding y no quedó una altitud "buena" que proteger —, el agente la
    // anclaba como si fuera la finca real (ej. "Choachí, 1923 msnm") y
    // corrompía piso térmico, ventana de siembra y plagas. Choachí va de ~1.100
    // a ~3.500 msnm según la vereda: el centroide municipal NO es la finca.
    // El contexto del agente debe MARCAR esa altitud como incierta (cabecera,
    // no finca) y pedir confirmar la altitud real, en vez de afirmarla.
    // ──────────────────────────────────────────────────────────────────────
    describe('altitud de cabecera (no finca) — no anclar como confirmada', () => {
      const cabeceraProfile = {
        municipio: 'Choachí',
        departamento: 'Cundinamarca',
        finca_altitud: '1923',
        altitud_source: 'cabecera',
        ubicacion_lat: 4.529,
        ubicacion_lng: -73.923,
      };

      it('marca la altitud como CABECERA del municipio, no como la de la finca', () => {
        const ctx = buildFincaContext({ profile: cabeceraProfile, month: 5 });
        // La altitud sigue presente (es la mejor estimación disponible)…
        expect(ctx).toContain('1923 msnm');
        // …pero NO se presenta como dato confirmado de la finca: se rotula
        // como cabecera/aproximada para que el agente no la afirme.
        expect(ctx.toLowerCase()).toContain('cabecera');
      });

      it('instruye al agente a NO afirmar piso térmico/viabilidad sobre la cabecera y a pedir la altitud real', () => {
        const ctx = buildFincaContext({ profile: cabeceraProfile, month: 5 });
        expect(ctx).toMatch(/altitud real|confirm/i);
      });

      it('NO marca cabecera cuando la altitud viene de GPS/elevación (source confiable)', () => {
        const ctx = buildFincaContext({
          profile: { ...cabeceraProfile, finca_altitud: '2580', altitud_source: 'elevation_api' },
          month: 5,
        });
        expect(ctx).toContain('2580 msnm');
        expect(ctx.toLowerCase()).not.toContain('cabecera');
      });

      it('NO marca cabecera cuando el usuario fijó la altitud a mano (manual)', () => {
        const ctx = buildFincaContext({
          profile: { ...cabeceraProfile, finca_altitud: '2580', altitud_source: 'manual' },
          month: 5,
        });
        expect(ctx).toContain('2580 msnm');
        expect(ctx.toLowerCase()).not.toContain('cabecera');
      });

      it('la altitud REAL de la finca activa manda sobre la cabecera del perfil', () => {
        // Si la finca activa trae su propia altitud confirmada, esa es la
        // verdad: no hay que rotular cabecera aunque el perfil esté contaminado.
        const ctx = buildFincaContext({
          profile: cabeceraProfile,
          finca: { nombre: 'La Esperanza', altitud: 2580 },
          month: 5,
        });
        expect(ctx).toContain('2580 msnm');
        expect(ctx.toLowerCase()).not.toContain('cabecera');
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Viabilidad honesta de cultivo (feat/agente-viabilidad-cultivo)
  // El agente debe decir con honestidad cuándo una especie NO es viable para
  // la altitud de la finca del usuario y sugerir alternativas SOLO del
  // grounding/catálogo, nunca inventadas. Degrada con gracia cuando faltan
  // los rangos de altitud (no afirma viabilidad sin datos).
  // ────────────────────────────────────────────────────────────────────────
  describe('generateViabilityRules', () => {
    const rules = generateViabilityRules();

    it('es una regla estática (string no vacío, costo cero de red)', () => {
      expect(typeof rules).toBe('string');
      expect(rules.length).toBeGreaterThan(100);
    });

    it('declara que las preguntas son por defecto sobre la finca del usuario', () => {
      expect(rules).toContain('POR DEFECTO');
      expect(rules.toLowerCase()).toContain('finca');
    });

    it('exige honestidad cuando la altitud de la finca está fuera del rango de la especie', () => {
      expect(rules).toContain('altitud_min');
      expect(rules).toContain('altitud_max');
      expect(rules).toContain('probabilidad de éxito');
    });

    it('exige que las alternativas salgan SOLO del catálogo/grounding, nunca inventadas', () => {
      expect(rules).toContain('NUNCA inventes');
      expect(rules).toContain('get_cultivos_viables');
    });

    it('degrada con gracia: sin rango no se afirma viabilidad', () => {
      expect(rules.toLowerCase()).toContain('no afirmes');
    });

    it('guía la presentación de datos LOCALES como SUYOS', () => {
      expect(rules).toContain('En tu finca');
      expect(rules).toContain('SUYOS');
    });

    it('cero voseo argentino en la regla', () => {
      expect(rules).not.toMatch(/\btenés\b/);
      expect(rules).not.toMatch(/\bpodés\b/);
      expect(rules).not.toMatch(/\bmirá\b/);
      expect(rules).not.toMatch(/\bacá\b/);
      expect(rules).not.toMatch(/\bsembrá\b/);
      expect(rules).not.toMatch(/\belegí\b/);
    });
  });

  describe('buildViabilityContext', () => {
    it('devuelve string vacío sin entidades resueltas', () => {
      expect(buildViabilityContext({ fincaAltitud: 2580, resolvedEntities: null })).toBe('');
      expect(buildViabilityContext({ fincaAltitud: 2580, resolvedEntities: [] })).toBe('');
      expect(buildViabilityContext({})).toBe('');
    });

    it('degrada con gracia: sin altitud de finca NO emite veredicto de viabilidad', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: null,
        resolvedEntities: [
          {
            mentioned: 'coco', kind: 'species', nombre_comun: 'Coco',
            nombre_cientifico: 'Cocos nucifera', altitud_min: 0, altitud_max: 1000,
          },
        ],
      });
      expect(ctx).toBe('');
    });

    it('degrada con gracia: especie sin rango de altitud NO se evalúa', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'coco', kind: 'species', nombre_comun: 'Coco',
            nombre_cientifico: 'Cocos nucifera', altitud_min: null, altitud_max: null,
          },
        ],
      });
      expect(ctx).toBe('');
    });

    it('caso coco en finca a 2580m: marca probabilidad MUY BAJA (fuera de rango)', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'palmera de coco', kind: 'species', nombre_comun: 'Coco',
            nombre_cientifico: 'Cocos nucifera', altitud_min: 0, altitud_max: 1000,
            piso_termico: 'cálido',
          },
        ],
      });
      expect(ctx).toContain('Coco');
      expect(ctx).toContain('MUY BAJA');
      // Debe exponer el porqué: rango de la especie vs altitud de la finca
      expect(ctx).toContain('0');
      expect(ctx).toContain('1000');
      expect(ctx).toContain('2580');
      // Debe instruir sugerir alternativas del grounding/tool, no inventar
      expect(ctx).toContain('get_cultivos_viables');
    });

    it('caso especie VIABLE: altitud de finca dentro del rango → no la marca inviable', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'papa', kind: 'species', nombre_comun: 'Papa',
            nombre_cientifico: 'Solanum tuberosum', altitud_min: 2000, altitud_max: 3500,
          },
        ],
      });
      expect(ctx).not.toContain('MUY BAJA');
    });

    it('marca límite inferior: finca demasiado baja para la especie', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 200,
        resolvedEntities: [
          {
            mentioned: 'papa', kind: 'species', nombre_comun: 'Papa',
            nombre_cientifico: 'Solanum tuberosum', altitud_min: 2000, altitud_max: 3500,
          },
        ],
      });
      expect(ctx).toContain('MUY BAJA');
      expect(ctx).toContain('200');
    });

    it('ignora plagas/biopreparados (solo evalúa especies sembrables)', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'broca', kind: 'pest', nombre_comun: 'Broca',
            nombre_cientifico: 'Hypothenemus hampei', altitud_min: 0, altitud_max: 1800,
          },
        ],
      });
      expect(ctx).toBe('');
    });

    it('cero voseo argentino en la salida', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'coco', kind: 'species', nombre_comun: 'Coco',
            nombre_cientifico: 'Cocos nucifera', altitud_min: 0, altitud_max: 1000,
          },
        ],
      });
      expect(ctx).not.toMatch(/\btenés\b/);
      expect(ctx).not.toMatch(/\bpodés\b/);
      expect(ctx).not.toMatch(/\bmirá\b/);
      expect(ctx).not.toMatch(/\bacá\b/);
    });

    it('tolera altitud de finca como string ("2580")', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: '2580',
        resolvedEntities: [
          {
            mentioned: 'coco', kind: 'species', nombre_comun: 'Coco',
            nombre_cientifico: 'Cocos nucifera', altitud_min: 0, altitud_max: 1000,
          },
        ],
      });
      expect(ctx).toContain('MUY BAJA');
    });
  });

  describe('buildViabilityContext — 3 niveles (viable/marginal/inviable)', () => {
    it('campo viabilidad="marginal" del grounding → línea MARGINAL humilde, NO MUY BAJA', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'gulupa', kind: 'species', nombre_comun: 'Gulupa',
            nombre_cientifico: 'Passiflora edulis f. edulis',
            altitud_min: 1500, altitud_max: 2300, viabilidad: 'marginal',
          },
        ],
      });
      expect(ctx).toContain('Gulupa');
      expect(ctx).toContain('MARGINAL');
      expect(ctx).toContain('al LÍMITE');
      expect(ctx).toContain('POSIBLE con cuidados');
      expect(ctx).not.toContain('MUY BAJA');
    });

    it('caso real gulupa@2580 SIN campo viabilidad pero rango 1500–2300 → fallback MARGINAL (delta 280 ≤ 300)', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'gulupa', kind: 'species', nombre_comun: 'Gulupa',
            nombre_cientifico: 'Passiflora edulis f. edulis',
            altitud_min: 1500, altitud_max: 2300,
          },
        ],
      });
      expect(ctx).toContain('MARGINAL');
      // No debe clasificarse como inviable: sin sección de inviables.
      expect(ctx).not.toContain('INVIABLES (mejor sugerir alternativa)');
    });

    it('inviable LIDERA con alternativas_viables[0] (el primo del género)', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'maracuyá', kind: 'species', nombre_comun: 'Maracuyá',
            nombre_cientifico: 'Passiflora edulis f. flavicarpa',
            altitud_min: 0, altitud_max: 1300, viabilidad: 'inviable',
            alternativas_viables: ['curuba', 'gulupa', 'granadilla'],
          },
        ],
      });
      expect(ctx).toContain('INVIABLE');
      expect(ctx).toContain('curuba');
      // primera alternativa listada de primera
      expect(ctx.indexOf('curuba')).toBeLessThan(ctx.indexOf('granadilla'));
    });

    it('viabilidad="viable" explícita → no se emite línea para esa especie', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: 2580,
        resolvedEntities: [
          {
            mentioned: 'papa', kind: 'species', nombre_comun: 'Papa',
            altitud_min: 2000, altitud_max: 3500, viabilidad: 'viable',
          },
        ],
      });
      expect(ctx).toBe('');
    });

    it('viabilidad del grounding aplica incluso SIN altitud de finca conocida', () => {
      const ctx = buildViabilityContext({
        fincaAltitud: null,
        resolvedEntities: [
          {
            mentioned: 'coco', kind: 'species', nombre_comun: 'Coco',
            viabilidad: 'inviable', alternativas_viables: ['chontaduro'],
          },
        ],
      });
      expect(ctx).toContain('INVIABLE');
      expect(ctx).toContain('chontaduro');
    });
  });

  describe('buildFrostHeatContext', () => {
    const snapFrost = {
      openmeteo: {
        available: true,
        forecast_7d: [
          { fecha: '2026-06-01', temp_min_c: 8, temp_max_c: 19 },
          { fecha: '2026-06-02', temp_min_c: 2, temp_max_c: 18 },
          { fecha: '2026-06-03', temp_min_c: 6, temp_max_c: 20 },
        ],
      },
    };

    it('devuelve string vacío sin entidades o sin forecast', () => {
      expect(buildFrostHeatContext({ resolvedEntities: null, climaSnapshot: snapFrost })).toBe('');
      expect(buildFrostHeatContext({ resolvedEntities: [{ kind: 'species', temp_min: 10 }], climaSnapshot: null })).toBe('');
      expect(buildFrostHeatContext({ resolvedEntities: [{ kind: 'species', temp_min: 10 }], climaSnapshot: {} })).toBe('');
    });

    it('helada pronosticada: mínima 2°C ≤ temp_min 5 + margen → alerta concreta con día y acción', () => {
      const ctx = buildFrostHeatContext({
        resolvedEntities: [
          { kind: 'species', nombre_comun: 'Tomate', temp_min: 5, temp_max: 30 },
        ],
        climaSnapshot: snapFrost,
      });
      expect(ctx).toContain('Tomate');
      expect(ctx).toContain('2°C');
      expect(ctx).toContain('2026-06-02');
      expect(ctx).toContain('protég');
      expect(ctx).toContain('MAÑANA');
    });

    it('degrada con gracia: especie sin temp_min/temp_max no genera alerta', () => {
      const ctx = buildFrostHeatContext({
        resolvedEntities: [{ kind: 'species', nombre_comun: 'X' }],
        climaSnapshot: snapFrost,
      });
      expect(ctx).toBe('');
    });

    it('calor extremo: máxima alta ≥ temp_max - margen → alerta de calor', () => {
      const snapHot = {
        openmeteo: { available: true, forecast_7d: [{ fecha: '2026-06-04', temp_min_c: 18, temp_max_c: 34 }] },
      };
      const ctx = buildFrostHeatContext({
        resolvedEntities: [{ kind: 'species', nombre_comun: 'Lechuga', temp_min: 5, temp_max: 33 }],
        climaSnapshot: snapHot,
      });
      expect(ctx).toContain('Lechuga');
      expect(ctx).toContain('sombra');
    });

    it('ignora plagas (solo cultivos)', () => {
      const ctx = buildFrostHeatContext({
        resolvedEntities: [{ kind: 'pest', nombre_comun: 'Broca', temp_min: 5 }],
        climaSnapshot: snapFrost,
      });
      expect(ctx).toBe('');
    });

    it('cero voseo argentino', () => {
      const ctx = buildFrostHeatContext({
        resolvedEntities: [{ kind: 'species', nombre_comun: 'Tomate', temp_min: 5 }],
        climaSnapshot: snapFrost,
      });
      expect(ctx).not.toMatch(/\btenés\b/);
      expect(ctx).not.toMatch(/\bpodés\b/);
      expect(ctx).not.toMatch(/\bmirá\b/);
      expect(ctx).not.toMatch(/\bacá\b/);
      expect(ctx).not.toMatch(/\bprotegé\b/);
    });
  });

  describe('buildAssociationContext', () => {
    it('devuelve vacío sin companions/antagonists', () => {
      expect(buildAssociationContext({ resolvedEntities: [{ kind: 'species', nombre_comun: 'Maíz' }] })).toBe('');
      expect(buildAssociationContext({ resolvedEntities: null })).toBe('');
    });

    it('sugiere buenas compañías y prioriza lo que el usuario YA TIENE', () => {
      const ctx = buildAssociationContext({
        resolvedEntities: [
          { kind: 'species', nombre_comun: 'Maíz', companions: ['frijol', 'calabaza', 'caléndula'] },
        ],
        groupedCultivos: [{ name: 'frijol', count: 2 }],
      });
      expect(ctx).toContain('Maíz');
      expect(ctx).toContain('frijol');
      expect(ctx).toContain('YA TIENES');
      // la que ya tiene aparece antes que las demás
      expect(ctx.indexOf('frijol')).toBeLessThan(ctx.indexOf('calabaza'));
    });

    it('avisa antagonistas con MATIZ (riesgo compartido, no prohibición)', () => {
      const ctx = buildAssociationContext({
        resolvedEntities: [
          { kind: 'species', nombre_comun: 'Papa', antagonists: ['tomate'] },
        ],
      });
      expect(ctx).toContain('tomate');
      expect(ctx).toContain('COMPARTIDO');
      expect(ctx).toContain('no prohibición');
    });

    it('cero voseo argentino', () => {
      const ctx = buildAssociationContext({
        resolvedEntities: [{ kind: 'species', nombre_comun: 'Maíz', companions: ['frijol'] }],
      });
      expect(ctx).not.toMatch(/\btenés\b/);
      expect(ctx).not.toMatch(/\bsembrá\b/);
    });
  });

  describe('buildInvasiveSafetyContext', () => {
    it('vacío si ninguna especie es invasora ni sensible', () => {
      expect(buildInvasiveSafetyContext({ resolvedEntities: [{ kind: 'species', nombre_comun: 'Papa' }] })).toBe('');
      expect(buildInvasiveSafetyContext({ resolvedEntities: null })).toBe('');
    });

    it('especie invasora: NUNCA recomendar + alternativa nativa si existe', () => {
      const ctx = buildInvasiveSafetyContext({
        resolvedEntities: [
          {
            kind: 'species', nombre_comun: 'Retamo espinoso', es_invasora: true,
            alternativas_viables: ['aliso', 'arrayán'],
          },
        ],
      });
      expect(ctx).toContain('Retamo espinoso');
      expect(ctx).toContain('INVASORA');
      expect(ctx).toContain('NUNCA');
      expect(ctx).toContain('aliso');
    });

    it('conservation_status sensible (EN) → no promover siembra comercial', () => {
      const ctx = buildInvasiveSafetyContext({
        resolvedEntities: [
          { kind: 'species', nombre_comun: 'Palma de cera', conservation_status: 'EN' },
        ],
      });
      expect(ctx).toContain('Palma de cera');
      expect(ctx).toContain('EN');
      expect(ctx).toContain('sensible');
    });

    it('cero voseo argentino', () => {
      const ctx = buildInvasiveSafetyContext({
        resolvedEntities: [{ kind: 'species', nombre_comun: 'Retamo', es_invasora: true }],
      });
      expect(ctx).not.toMatch(/\btenés\b/);
      expect(ctx).not.toMatch(/\bsembrá\b/);
    });
  });

  describe('buildCuratedFactsContext', () => {
    it('devuelve vacío sin entidades o sin hechos curados', () => {
      expect(buildCuratedFactsContext({ resolvedEntities: null })).toBe('');
      expect(buildCuratedFactsContext({ resolvedEntities: [] })).toBe('');
      // especie sin helada_letal ni biopreparado con dosis → nada accionable
      expect(buildCuratedFactsContext({ resolvedEntities: [{ kind: 'species', nombre_comun: 'Papa' }] })).toBe('');
      // biopreparado sin dosis ni preparación → nada accionable
      expect(buildCuratedFactsContext({ resolvedEntities: [{ kind: 'biopreparado', nombre_comun: 'Bocashi' }] })).toBe('');
    });

    it('biopreparado: CITA la dosis verificada del grafo (no la inventa)', () => {
      const ctx = buildCuratedFactsContext({
        resolvedEntities: [
          {
            kind: 'biopreparado',
            nombre_comun: 'Caldo bordelés',
            dosis_aplicacion: '1-2 L por planta, foliar, cada 8-15 días (preventivo)',
            preparacion: 'Disolver sulfato de cobre y cal apagada por separado, mezclar.',
            ingredientes_resumen: 'Sulfato de cobre + cal apagada + agua',
            target: ['Phytophthora infestans', 'mildiu', 'roya'],
            precauciones: 'No aplicar en floración; tóxico para abejas.',
            fuente: 'Agrosavia',
          },
        ],
      });
      expect(ctx).toContain('Caldo bordelés');
      expect(ctx).toContain('1-2 L por planta');
      expect(ctx).toContain('sulfato de cobre');
      expect(ctx).toContain('Phytophthora infestans');
      expect(ctx).toContain('abejas');
      expect(ctx).toContain('Agrosavia');
      // La regla obliga a CITAR el dato, no inventar
      expect(ctx).toContain('CITA');
    });

    it('biopreparado: emite solo los campos presentes (degrada con gracia)', () => {
      const ctx = buildCuratedFactsContext({
        resolvedEntities: [
          { kind: 'biopreparado', nombre_comun: 'Bocashi', dosis_aplicacion: '1-2 kg/m2' },
        ],
      });
      expect(ctx).toContain('Bocashi');
      expect(ctx).toContain('1-2 kg/m2');
      // sin preparación/target → no aparecen etiquetas vacías
      expect(ctx).not.toMatch(/preparación:\s*$/im);
    });

    it('especie: advierte el umbral de helada_letal del grafo', () => {
      const ctx = buildCuratedFactsContext({
        resolvedEntities: [
          { kind: 'species', nombre_comun: 'Aguacate', helada_letal: -2 },
        ],
      });
      expect(ctx).toContain('Aguacate');
      expect(ctx).toContain('-2');
      expect(ctx.toLowerCase()).toContain('helada');
    });

    it('mezcla especie + biopreparado en un solo bloque', () => {
      const ctx = buildCuratedFactsContext({
        resolvedEntities: [
          { kind: 'species', nombre_comun: 'Papa', helada_letal: -1.5 },
          { kind: 'biopreparado', nombre_comun: 'Extracto de neem', dosis_aplicacion: '1-1,5 cc/L de agua' },
        ],
      });
      expect(ctx).toContain('Papa');
      expect(ctx).toContain('Extracto de neem');
      expect(ctx).toContain('1-1,5 cc/L');
    });

    it('cero voseo argentino', () => {
      const ctx = buildCuratedFactsContext({
        resolvedEntities: [
          { kind: 'biopreparado', nombre_comun: 'Neem', dosis_aplicacion: '1 cc/L' },
          { kind: 'species', nombre_comun: 'Papa', helada_letal: -1 },
        ],
      });
      expect(ctx).not.toMatch(/\btenés\b/);
      expect(ctx).not.toMatch(/\bpodés\b/);
      expect(ctx).not.toMatch(/\bmirá\b/);
      expect(ctx).not.toMatch(/\bacá\b/);
      expect(ctx).not.toMatch(/\bsembrá\b/);
      expect(ctx).not.toMatch(/\bdale\b/);
    });
  });

  describe('generateAgronomicGuidanceRules', () => {
    const rules = generateAgronomicGuidanceRules();

    it('es regla estática concisa (costo cero de red)', () => {
      expect(typeof rules).toBe('string');
      expect(rules.length).toBeGreaterThan(100);
      // CORTA a propósito (restricción anti-bloat): que no se infle.
      expect(rules.length).toBeLessThan(1200);
    });

    it('fija doctrina guía-no-dogma + respeto a la experiencia del campesino', () => {
      expect(rules).toContain('GUÍA');
      expect(rules).toContain('campesino');
      expect(rules).toContain('NUNCA inventes');
    });

    it('menciona get_diseno_finca SOLO cuando pertinente', () => {
      expect(rules).toContain('get_diseno_finca');
      expect(rules.toLowerCase()).toContain('pertinente');
    });

    it('cero voseo argentino', () => {
      expect(rules).not.toMatch(/\btenés\b/);
      expect(rules).not.toMatch(/\bpodés\b/);
      expect(rules).not.toMatch(/\bmirá\b/);
      expect(rules).not.toMatch(/\bacá\b/);
      expect(rules).not.toMatch(/\bsembrá\b/);
    });
  });
});

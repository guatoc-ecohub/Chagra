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
  });
});

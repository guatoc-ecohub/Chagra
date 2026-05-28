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
      const context = generateClimateAlertsContext('zona_inexistente');
      expect(context).toContain('IDEAM');
      expect(context).toContain('pronóstico IDEAM');
    });

    it('debería recomendar IDEAM para null', () => {
      const context = generateClimateAlertsContext(null);
      expect(context).toContain('cita siempre la fuente');
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
});

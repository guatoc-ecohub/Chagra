/**
 * agentService.branches.test.js — Branch coverage para agentService.
 *
 * Cubre ramas no alcanzadas por los tests existentes:
 * - null/undefined/empty inputs en todas las funciones exportadas
 * - Rutas de error (try/catch)
 * - Casos limite de condicionales
 * - Args vacios en funciones de contexto
 */

import { describe, it, expect } from 'vitest';
import {
  slugifyDepartamento,
  stripRoleLeak,
  buildProfileContext,
  buildClimaContext,
  buildFincaContext,
  generateViabilityRules,
  buildViabilityContext,
  buildFrostHeatContext,
  buildAssociationContext,
  buildInvasiveSafetyContext,
  buildCuratedFactsContext,
  generateAgronomicGuidanceRules,
  formatClimateAlert,
  generateSourceCitationRules,
  generateUserDataRules,
  pisoTermicoFromAltitud,
  temporadaColombiana,
  buildFallbackResponse,
} from '../agentService.js';

describe('agentService — branch coverage: null/undefined inputs', () => {
  describe('slugifyDepartamento', () => {
    it('devuelve null para undefined', () => {
      expect(slugifyDepartamento(undefined)).toBeNull();
    });

    it('devuelve null para null', () => {
      expect(slugifyDepartamento(null)).toBeNull();
    });

    it('devuelve null para string vacio', () => {
      expect(slugifyDepartamento('')).toBeNull();
    });

    it('devuelve null para no-string', () => {
      expect(slugifyDepartamento(123)).toBeNull();
      expect(slugifyDepartamento({})).toBeNull();
    });

    it('maneja nombre con solo caracteres no alfanumericos', () => {
      expect(slugifyDepartamento('___---')).toBeNull();
    });

    it('mapea nombre especial Bogota D.C.', () => {
      expect(slugifyDepartamento('Bogotá, D.C.')).toBe('bogota_dc');
    });

    it('slugifica nombre normal', () => {
      expect(slugifyDepartamento('Antioquia')).toBe('antioquia');
    });

    it('slugifica nombre con tildes', () => {
      expect(slugifyDepartamento('Córdoba')).toBe('cordoba');
    });
  });

  describe('stripRoleLeak', () => {
    it('devuelve string vacio para entrada vacia', () => {
      expect(stripRoleLeak('')).toBe('');
    });

    it('devuelve string vacio para null', () => {
      expect(stripRoleLeak(null)).toBe('');
    });

    it('devuelve string vacio para no-string', () => {
      expect(stripRoleLeak(42)).toBe('');
      expect(stripRoleLeak(undefined)).toBe('');
    });

    it('no mutila texto sin marcadores de rol', () => {
      const input = 'El tomate de arbol se siembra a 1800 msnm.';
      expect(stripRoleLeak(input)).toBe(input);
    });

    it('trunca en marker de chat-template <|im_start|>', () => {
      const input = 'Texto util<|im_start|>system\nrol inventado';
      expect(stripRoleLeak(input)).toBe('Texto util');
    });

    it('trunca en <|im_end|>', () => {
      const input = 'Respuesta legitima<|im_end|>basura';
      expect(stripRoleLeak(input)).toBe('Respuesta legitima');
    });

    it('trunca en <|user|>', () => {
      const input = 'Ayuda real<|user|>Hola, yo soy...';
      expect(stripRoleLeak(input)).toBe('Ayuda real');
    });

    it('trunca en etiqueta Usuario: al inicio de linea', () => {
      const input = 'Consejo agronomico.\nUsuario: Hola Dante...';
      expect(stripRoleLeak(input)).toBe('Consejo agronomico.');
    });

    it('trunca en etiqueta Asistente: con espacios', () => {
      const input = 'Dato util.\nAsistente : respuesta falsa';
      expect(stripRoleLeak(input)).toBe('Dato util.');
    });

    it('trunca en User: / Assistant: (ingles)', () => {
      const input = 'Good advice.\nUser: fake turn\n';
      expect(stripRoleLeak(input).trim()).toBe('Good advice.');
    });

    it('no trunca "Soy tu Asistente" en mitad de linea', () => {
      const input = 'Soy tu Asistente: te ayudo con el cultivo.';
      expect(stripRoleLeak(input)).toBe(input);
    });
  });

  describe('buildProfileContext', () => {
    it('devuelve reglas de citacion + datos cuando finca es null', () => {
      const result = buildProfileContext(null);
      expect(result).toContain('CITACIÓN');
      expect(result).toContain('PRIVACIDAD');
    });

    it('devuelve reglas de citacion + datos cuando finca es undefined', () => {
      const result = buildProfileContext(undefined);
      expect(result).toContain('CITACIÓN');
    });

    it('incluye contexto de tono para finca con zona biocultural', () => {
      const finca = { biocultural_zone: 'andino_alto_páramo' };
      const result = buildProfileContext(finca);
      expect(result).toContain('sumercé');
      expect(result).toContain('CITACIÓN');
    });

    it('incluye alertas climaticas para zona conocida', () => {
      const finca = { biocultural_zone: 'andino_alto_páramo' };
      const result = buildProfileContext(finca);
      expect(result).toContain('heladas');
      expect(result).toContain('REGLA CLIMA');
    });

    it('omite alertas climaticas cuando climaQuery=false', () => {
      const finca = { biocultural_zone: 'andino_alto_páramo' };
      const result = buildProfileContext(finca, { climaQuery: false });
      expect(result).toContain('sumercé');
      // Deberia seguir teniendo las reglas base pero sin el bloque de riesgos
      expect(result).not.toContain('Riesgos principales');
    });

    it('funciona con finca sin zona biocultural', () => {
      const finca = { name: 'Finca sin zona' };
      const result = buildProfileContext(finca);
      expect(result).toContain('CITACIÓN');
    });

    it('funciona con opts vacios', () => {
      const finca = { biocultural_zone: 'caribe' };
      const result = buildProfileContext(finca, {});
      expect(result).toContain('REGLA CLIMA');
    });
  });

  describe('buildClimaContext', () => {
    it('devuelve string vacio para snapshot null', () => {
      expect(buildClimaContext(null)).toBe('');
    });

    it('devuelve string vacio para snapshot undefined', () => {
      expect(buildClimaContext(undefined)).toBe('');
    });

    it('devuelve string vacio para snapshot no-objeto', () => {
      expect(buildClimaContext('string')).toBe('');
      expect(buildClimaContext(42)).toBe('');
    });

    it('devuelve string vacio si no hay enso_status', () => {
      const snapshot = { openmeteo: { available: true } };
      expect(buildClimaContext(snapshot)).toBe('');
    });

    it('devuelve string vacio si enso_status no es objeto', () => {
      const snapshot = { enso_status: 'neutral' };
      expect(buildClimaContext(snapshot)).toBe('');
    });

    it('construye contexto ENSO basico', () => {
      const snapshot = {
        enso_status: { label: 'La Nina', severity: 'moderate', phase: 'la_nina', oni_value: -1.2, trend: 'weakening' },
        alertas_locales: [],
      };
      const result = buildClimaContext(snapshot);
      expect(result).toContain('CLIMA TIEMPO REAL');
      expect(result).toContain('La Nina');
      expect(result).toContain('-1.2');
    });

    it('incluye alertas locales cuando existen', () => {
      const snapshot = {
        enso_status: { label: 'El Nino', severity: 'strong', phase: 'el_nino' },
        alertas_locales: [
          { tipo: 'helada', mensaje: 'Riesgo de helada manana', severity: 'critical' },
          { tipo: 'sequia', mensaje: 'Sequia moderada', severity: 'warning' },
        ],
      };
      const result = buildClimaContext(snapshot);
      expect(result).toContain('Riesgo de helada');
      expect(result).toContain('Sequia moderada');
    });

    it('trunca alertas locales a maximo 6', () => {
      const snapshot = {
        enso_status: { label: 'Neutral', severity: 'neutral', phase: 'neutral' },
        alertas_locales: Array.from({ length: 10 }, (_, i) => ({
          tipo: `alerta_${i}`,
          mensaje: `Mensaje ${i}`,
          severity: 'warning',
        })),
      };
      const result = buildClimaContext(snapshot);
      const lines = result.split('\n').filter((l) => l.includes('Mensaje'));
      expect(lines.length).toBeLessThanOrEqual(6);
    });

    it('incluye informacion de cielo cuando se pasa via opts.sky', () => {
      const snapshot = {
        enso_status: { label: 'Neutral', severity: 'neutral', phase: 'neutral' },
        alertas_locales: [],
      };
      const result = buildClimaContext(snapshot, {
        sky: { label: 'Parcialmente nublado', cloudCoverPct: 45 },
      });
      expect(result).toContain('Parcialmente nublado');
      expect(result).toContain('45%');
    });

    it('incluye honestidad cuando el cielo esta degradado', () => {
      const snapshot = {
        enso_status: { label: 'Neutral', severity: 'neutral', phase: 'neutral' },
        alertas_locales: [],
      };
      const result = buildClimaContext(snapshot, {
        sky: { label: 'Despejado', cloudCoverPct: 10, degraded: true },
      });
      expect(result).toContain('subestima');
    });

    it('no incluye cielo si opts.sky no tiene label', () => {
      const snapshot = {
        enso_status: { label: 'Neutral', severity: 'neutral', phase: 'neutral' },
        alertas_locales: [],
      };
      const result = buildClimaContext(snapshot, { sky: {} });
      expect(result).not.toContain('Cielo de hoy');
    });
  });

  describe('buildViabilityContext', () => {
    it('devuelve string vacio para args vacios', () => {
      expect(buildViabilityContext()).toBe('');
    });

    it('devuelve string vacio para resolvedEntities null', () => {
      expect(buildViabilityContext({ resolvedEntities: null })).toBe('');
    });

    it('devuelve string vacio para resolvedEntities vacio', () => {
      expect(buildViabilityContext({ resolvedEntities: [] })).toBe('');
    });

    it('devuelve string vacio para resolvedEntities no-array', () => {
      expect(buildViabilityContext({ resolvedEntities: {} })).toBe('');
    });

    it('clasifica especie viable fuera de rango por mas de marginMsnm como inviable', () => {
      const entities = [
        { kind: 'species', nombre_comun: 'Coco', altitud_min: 0, altitud_max: 1000, piso_termico: 'calido' },
      ];
      const result = buildViabilityContext({ fincaAltitud: 2580, resolvedEntities: entities });
      expect(result).toContain('INVIABLE');
      expect(result).toContain('Coco');
    });

    it('clasifica especie marginal cerca del limite', () => {
      const entities = [
        { kind: 'species', nombre_comun: 'Gulupa', altitud_min: 1800, altitud_max: 2600, piso_termico: 'frio' },
      ];
      // 2580 esta en rango → viable (no emite nada)
      const resultDentro = buildViabilityContext({ fincaAltitud: 2580, resolvedEntities: entities });
      expect(resultDentro).toBe('');

      // 2700 esta fuera por 100 (< 300 marginMsnm default) → marginal
      const resultMarginal = buildViabilityContext({ fincaAltitud: 2700, resolvedEntities: entities });
      expect(resultMarginal).toContain('MARGINAL');
      expect(resultMarginal).toContain('Gulupa');
    });

    it('usa viabilidad del grounding como autoritativa', () => {
      const entities = [
        { kind: 'planta', nombre_comun: 'Fresa', viabilidad: 'marginal', altitud_min: 2000, altitud_max: 3000 },
      ];
      // Aunque la altitud de la finca caiga en rango, la viabilidad autoritativa gana
      const result = buildViabilityContext({ fincaAltitud: 2500, resolvedEntities: entities });
      expect(result).toContain('MARGINAL');
    });

    it('omite entidades que no son especie sembrable', () => {
      const entities = [
        { kind: 'plaga', nombre_comun: 'Cogollero' },
        { kind: 'biopreparado', nombre_comun: 'Caldo bordeles' },
      ];
      expect(buildViabilityContext({ fincaAltitud: 2580, resolvedEntities: entities })).toBe('');
    });

    it('acepta kind species/planta/especie/cultivo', () => {
      for (const kind of ['species', 'planta', 'especie', 'cultivo']) {
        const entities = [
          { kind, nombre_comun: 'Test', viabilidad: 'viable' },
        ];
        // "viable" no emite linea → resultado vacio
        expect(buildViabilityContext({ resolvedEntities: entities })).toBe('');
      }
    });

    it('no evalua sin altitud de finca ni viabilidad autoritativa', () => {
      const entities = [
        { kind: 'species', nombre_comun: 'Tomate', altitud_min: 0, altitud_max: 2000 },
      ];
      // Sin fincaAltitud y sin viabilidad → neutral, no emite nada
      expect(buildViabilityContext({ resolvedEntities: entities })).toBe('');
    });

    it('incluye alternativas viables cuando las trae el grounding', () => {
      const entities = [
        {
          kind: 'species',
          nombre_comun: 'Coco',
          altitud_min: 0,
          altitud_max: 1000,
          alternativas_viables: ['Curuba', 'Uchuva', 'Papa'],
        },
      ];
      const result = buildViabilityContext({ fincaAltitud: 2580, resolvedEntities: entities });
      expect(result).toContain('Curuba');
    });

    it('respeta marginMsnm personalizado', () => {
      const entities = [
        { kind: 'species', nombre_comun: 'Planta', altitud_min: 1000, altitud_max: 2000 },
      ];
      // 2010 fuera por 10 → con marginMsnm=50 es marginal, con marginMsnm=5 es inviable
      const marginal = buildViabilityContext({ fincaAltitud: 2010, resolvedEntities: entities, marginMsnm: 50 });
      expect(marginal).toContain('MARGINAL');

      const inviable = buildViabilityContext({ fincaAltitud: 2010, resolvedEntities: entities, marginMsnm: 5 });
      expect(inviable).toContain('INVIABLE');
    });
  });

  describe('buildFrostHeatContext', () => {
    it('devuelve string vacio para resolvedEntities null', () => {
      expect(buildFrostHeatContext({ resolvedEntities: null })).toBe('');
    });

    it('devuelve string vacio para resolvedEntities vacio', () => {
      expect(buildFrostHeatContext({ resolvedEntities: [] })).toBe('');
    });

    it('devuelve string vacio sin climaSnapshot', () => {
      const entities = [{ kind: 'species', nombre_comun: 'Tomate', temp_min: 5, temp_max: 35 }];
      expect(buildFrostHeatContext({ resolvedEntities: entities, climaSnapshot: null })).toBe('');
    });

    it('devuelve string vacio sin forecast disponible', () => {
      const entities = [{ kind: 'species', nombre_comun: 'Tomate', temp_min: 5, temp_max: 35 }];
      const snapshot = { openmeteo: { available: false, forecast_7d: [] } };
      expect(buildFrostHeatContext({ resolvedEntities: entities, climaSnapshot: snapshot })).toBe('');
    });

    it('genera alerta de helada cuando el pronostico baja del temp_min', () => {
      const entities = [{ kind: 'species', nombre_comun: 'Tomate', temp_min: 8, temp_max: 30 }];
      const snapshot = {
        openmeteo: {
          available: true,
          forecast_7d: [
            { temp_min_c: 6, temp_max_c: 25, fecha: '2026-06-17' },
          ],
        },
      };
      const result = buildFrostHeatContext({ resolvedEntities: entities, climaSnapshot: snapshot });
      // 6 <= 8 + 2 (margin) = 10 → riesgo de frio
      expect(result).toContain('Tomate');
      expect(result).toContain('2026-06-17');
    });

    it('genera alerta de calor cuando el pronostico supera el temp_max', () => {
      const entities = [{ kind: 'species', nombre_comun: 'Lechuga', temp_min: 2, temp_max: 25 }];
      const snapshot = {
        openmeteo: {
          available: true,
          forecast_7d: [
            { temp_min_c: 10, temp_max_c: 28, fecha: '2026-06-18' },
          ],
        },
      };
      const result = buildFrostHeatContext({ resolvedEntities: entities, climaSnapshot: snapshot });
      // 28 >= 25 - 2 (margin) = 23 → riesgo de calor
      expect(result).toContain('Lechuga');
    });

    it('omite entidades no-species', () => {
      const entities = [
        { kind: 'plaga', nombre_comun: 'Pulgon', temp_min: 5, temp_max: 35 },
      ];
      const snapshot = {
        openmeteo: {
          available: true,
          forecast_7d: [{ temp_min_c: 2, temp_max_c: 40 }],
        },
      };
      expect(buildFrostHeatContext({ resolvedEntities: entities, climaSnapshot: snapshot })).toBe('');
    });
  });

  describe('buildAssociationContext', () => {
    it('devuelve string vacio para resolvedEntities null', () => {
      expect(buildAssociationContext({ resolvedEntities: null })).toBe('');
    });

    it('devuelve string vacio para resolvedEntities vacio', () => {
      expect(buildAssociationContext({ resolvedEntities: [] })).toBe('');
    });

    it('incluye companions y antagonists', () => {
      const entities = [{
        kind: 'species',
        nombre_comun: 'Tomate',
        companions: ['Albahaca', 'Calendula'],
        antagonists: ['Papa', 'Hinojo'],
      }];
      const result = buildAssociationContext({ resolvedEntities: entities });
      expect(result).toContain('Tomate');
      expect(result).toContain('Albahaca');
      expect(result).toContain('Papa');
    });

    it('cruza companions con inventario del usuario', () => {
      const entities = [{
        kind: 'planta',
        nombre_comun: 'Fresa',
        companions: ['Cebolla', 'Ajo', 'Espinaca'],
        antagonists: [],
      }];
      const result = buildAssociationContext({
        resolvedEntities: entities,
        groupedCultivos: [{ name: 'Cebolla', count: 4 }],
      });
      expect(result).toContain('YA TIENES');
      expect(result).toContain('Cebolla');
    });

    it('devuelve string vacio si no hay ni companions ni antagonists', () => {
      const entities = [{ kind: 'species', nombre_comun: 'Rabanito' }];
      expect(buildAssociationContext({ resolvedEntities: entities })).toBe('');
    });
  });

  describe('buildInvasiveSafetyContext', () => {
    it('devuelve string vacio para resolvedEntities null', () => {
      expect(buildInvasiveSafetyContext({ resolvedEntities: null })).toBe('');
    });

    it('devuelve string vacio para resolvedEntities vacio', () => {
      expect(buildInvasiveSafetyContext({ resolvedEntities: [] })).toBe('');
    });

    it('marca especie invasora', () => {
      const entities = [
        { kind: 'species', nombre_comun: 'Retamo espinoso', es_invasora: true },
      ];
      const result = buildInvasiveSafetyContext({ resolvedEntities: entities });
      expect(result).toContain('INVASORA');
      expect(result).toContain('Retamo espinoso');
    });

    it('marca especie con estado de conservacion sensible (EN)', () => {
      const entities = [
        { kind: 'planta', nombre_comun: 'Orquidea negra', conservation_status: 'EN' },
      ];
      const result = buildInvasiveSafetyContext({ resolvedEntities: entities });
      expect(result).toContain('conservación');
      expect(result).toContain('EN');
    });

    it('marca CR, VU, EW, EX como sensible', () => {
      for (const status of ['CR', 'VU', 'EW', 'EX']) {
        const entities = [{ kind: 'species', nombre_comun: `Especie_${status}`, conservation_status: status }];
        const result = buildInvasiveSafetyContext({ resolvedEntities: entities });
        expect(result).not.toBe('');
      }
    });

    it('ignora estado LC (preocupacion menor)', () => {
      const entities = [
        { kind: 'species', nombre_comun: 'Pino patula', conservation_status: 'LC' },
      ];
      expect(buildInvasiveSafetyContext({ resolvedEntities: entities })).toBe('');
    });

    it('incluye alternativas viables', () => {
      const entities = [
        {
          kind: 'species',
          nombre_comun: 'Retamo espinoso',
          es_invasora: true,
          alternativas_viables: ['Aliso', 'Nacedero'],
        },
      ];
      const result = buildInvasiveSafetyContext({ resolvedEntities: entities });
      expect(result).toContain('Aliso');
    });
  });

  describe('buildCuratedFactsContext', () => {
    it('devuelve string vacio para resolvedEntities null', () => {
      expect(buildCuratedFactsContext({ resolvedEntities: null })).toBe('');
    });

    it('devuelve string vacio para resolvedEntities vacio', () => {
      expect(buildCuratedFactsContext({ resolvedEntities: [] })).toBe('');
    });

    it('incluye dosis de biopreparado', () => {
      const entities = [{
        kind: 'biopreparado',
        nombre_comun: 'Caldo bordeles',
        dosis_aplicacion: '1-2 L por planta, foliar',
        preparacion: 'Mezclar 100g sulfato de cobre + 100g cal en 10L agua',
        ingredientes_resumen: 'Sulfato de cobre, cal viva',
        target: ['Tizon', 'Gota'],
        precauciones: 'No aplicar en floracion',
        fuente: 'Restrepo & Rivera 1994',
      }];
      const result = buildCuratedFactsContext({ resolvedEntities: entities });
      expect(result).toContain('Caldo bordeles');
      expect(result).toContain('1-2 L');
      expect(result).toContain('Restrepo');
    });

    it('omite biopreparado sin dosis ni preparacion', () => {
      const entities = [{
        kind: 'biopreparado',
        nombre_comun: 'Aceite de neem',
      }];
      expect(buildCuratedFactsContext({ resolvedEntities: entities })).toBe('');
    });

    it('incluye helada_letal para especie', () => {
      const entities = [{
        kind: 'species',
        nombre_comun: 'Cafe',
        helada_letal: -2,
      }];
      const result = buildCuratedFactsContext({ resolvedEntities: entities });
      // helada_letal se emite para especies en curated facts
      expect(result).toContain('Cafe');
      expect(result).toContain('-2°C');
    });
  });

  describe('generateViabilityRules', () => {
    it('devuelve string no vacio', () => {
      const result = generateViabilityRules();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('VIABILIDAD HONESTA');
    });
  });

  describe('generateAgronomicGuidanceRules', () => {
    it('devuelve string no vacio', () => {
      const result = generateAgronomicGuidanceRules();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateSourceCitationRules', () => {
    it('devuelve string con reglas de citacion', () => {
      const result = generateSourceCitationRules();
      expect(result).toContain('CITACIÓN DE FUENTES');
      expect(result).toContain('NUNCA inventes datos ni fuentes');
    });
  });

  describe('generateUserDataRules', () => {
    it('devuelve string con reglas de privacidad', () => {
      const result = generateUserDataRules();
      expect(result).toContain('PRIVACIDAD');
      expect(result).toContain('SOLO');
    });
  });

  describe('formatClimateAlert', () => {
    it('devuelve string vacio para zona desconocida', () => {
      expect(formatClimateAlert('zona_inexistente')).toBe('');
    });

    it('formatea alerta para zona conocida', () => {
      const result = formatClimateAlert('andino_alto_páramo');
      expect(result).toContain('ALERTA CLIMÁTICA');
      expect(result).toContain('heladas');
    });

    it('incluye climateData cuando se provee', () => {
      const result = formatClimateAlert('andino_alto_páramo', { temp: 2, riesgo: 'helada' });
      expect(result).toContain('Pronóstico actual');
      expect(result).toContain('"temp"');
    });
  });

  describe('pisoTermicoFromAltitud', () => {
    it('devuelve null para undefined', () => {
      expect(pisoTermicoFromAltitud(undefined)).toBeNull();
    });

    it('devuelve null para null', () => {
      expect(pisoTermicoFromAltitud(null)).toBeNull();
    });

    it('devuelve null para NaN', () => {
      expect(pisoTermicoFromAltitud(NaN)).toBeNull();
    });

    it('devuelve null para string no numerico', () => {
      expect(pisoTermicoFromAltitud('no soy numero')).toBeNull();
    });

    it('coerciona string numerico a numero', () => {
      const result = pisoTermicoFromAltitud('2500');
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });

    it('clasifica calido', () => {
      const result = pisoTermicoFromAltitud(500);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('clasifica templado', () => {
      const result = pisoTermicoFromAltitud(1500);
      expect(typeof result).toBe('string');
    });

    it('clasifica frio', () => {
      const result = pisoTermicoFromAltitud(2500);
      expect(typeof result).toBe('string');
    });

    it('clasifica paramo', () => {
      const result = pisoTermicoFromAltitud(3500);
      expect(typeof result).toBe('string');
    });
  });

  describe('temporadaColombiana', () => {
    it('devuelve objeto con nombre y detalle', () => {
      const result = temporadaColombiana();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');
      expect(result.nombre).toBeTruthy();
      expect(result.detalle).toBeTruthy();
    });
  });

  describe('buildFallbackResponse', () => {
    it('devuelve respuesta no vacia para error LLM', () => {
      const result = buildFallbackResponse();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('buildFincaContext', () => {
    it('devuelve contexto basico para finca null (usa solo temporada)', () => {
      const result = buildFincaContext({ finca: null });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('devuelve contexto basico para finca undefined', () => {
      const result = buildFincaContext({ finca: undefined });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

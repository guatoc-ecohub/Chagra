import { describe, it, expect } from 'vitest';
import {
  evaluarEvolucionFinca,
  normalizeScore,
  getGliessmanLabel,
} from '../fincaEvolutionService';

describe('fincaEvolutionService', () => {
  describe('evaluarEvolucionFinca', () => {
    it('lanza error si processes no es array', () => {
      expect(() => evaluarEvolucionFinca(/** @type {any} */ ({ processes: 'no-array' }))).toThrow();
    });

    it('lanza error si observations no es array', () => {
      expect(() => evaluarEvolucionFinca(/** @type {any} */ ({ observations: 'no-array' }))).toThrow();
    });

    it('con arrays vacíos devuelve scores null y nivelGliessman 0', () => {
      const result = evaluarEvolucionFinca({ processes: [], observations: [] });
      
      expect(result.mesmis).toBeDefined();
      expect(result.tape).toBeDefined();
      expect(result.nivelGliessman).toBe(0);
      expect(result.metadata).toBeDefined();
      
      // MESMIS: todos null excepto quizás algunos calculables
      expect(result.mesmis.productividad).toBeNull();
      expect(result.mesmis.estabilidad_resiliencia).toBeNull();
      expect(result.mesmis.adaptabilidad).toBeNull();
      expect(result.mesmis.equidad).toBeNull();
      expect(result.mesmis.autodependencia).toBeNull();
      
      // TAPE: todos null excepto quizás algunos calculables
      expect(result.tape.diversidad).toBeNull();
      expect(result.tape.sinergias).toBeNull();
      expect(result.tape.eficiencia).toBeNull();
      expect(result.tape.resiliencia).toBeNull();
      expect(result.tape.reciclaje).toBeNull();
      expect(result.tape.cocreacion_conocimiento).toBeNull();
      expect(result.tape.valores_humanos_sociales).toBeNull();
      expect(result.tape.cultura_tradiciones).toBeNull();
      expect(result.tape.economia_circular_solidaria).toBeNull();
      expect(result.tape.gobernanza).toBeNull();
    });

    describe('MESMIS: productividad', () => {
      it('null si no hay harvest events', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'active' }],
        });
        expect(result.mesmis.productividad).toBeNull();
      });

      it('calcula score basado en número de cosechas', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'completed',
            events: [
              { event_type: 'harvest_confirmed', payload: { quantity: 100 } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.productividad).toBeGreaterThanOrEqual(0);
        expect(result.mesmis.productividad).toBeLessThanOrEqual(4);
      });

      it('más cosechas = score más alto', () => {
        // 1 cosecha
        const processes1 = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'completed',
            events: [{ event_type: 'harvest_confirmed', payload: { quantity: 100 } }],
          },
        ];
        const result1 = evaluarEvolucionFinca({ processes: processes1 });
        
        // 5 cosechas
        const processes5 = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'completed',
            events: [
              { event_type: 'harvest_confirmed', payload: { quantity: 100 } },
              { event_type: 'harvest_confirmed', payload: { quantity: 200 } },
              { event_type: 'harvest_confirmed', payload: { quantity: 150 } },
              { event_type: 'harvest_confirmed', payload: { quantity: 180 } },
              { event_type: 'harvest_confirmed', payload: { quantity: 120 } },
            ],
          },
        ];
        const result5 = evaluarEvolucionFinca({ processes: processes5 });
        
        expect(result5.mesmis.productividad).toBeGreaterThan(result1.mesmis.productividad);
      });

      it('score máximo es 4', () => {
        // Muchas cosechas (más del máximo esperado)
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'completed',
            events: Array.from({ length: 20 }, (_, i) => ({
              event_type: 'harvest_confirmed',
              payload: { quantity: 100 + i },
            })),
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.productividad).toBe(4);
      });
    });

    describe('MESMIS: estabilidad_resiliencia', () => {
      it('null si no hay procesos activos', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'completed' }],
        });
        expect(result.mesmis.estabilidad_resiliencia).toBeNull();
      });

      it('null si procesos activos no tienen current_stage', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'active' }],
        });
        expect(result.mesmis.estabilidad_resiliencia).toBeNull();
      });

      it('calcula score basado en diversidad de etapas', () => {
        const processes = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', current_stage: 'vegetative' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', current_stage: 'flowering' },
          { process_id: 'p3', process_type: 'sowing', status: 'active', current_stage: 'fruiting' },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.estabilidad_resiliencia).toBeGreaterThanOrEqual(0);
        expect(result.mesmis.estabilidad_resiliencia).toBeLessThanOrEqual(4);
      });

      it('misma etapa en múltiples procesos no aumenta score', () => {
        const processes = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', current_stage: 'vegetative' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', current_stage: 'vegetative' },
          { process_id: 'p3', process_type: 'sowing', status: 'active', current_stage: 'vegetative' },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        // 1 etapa distinta → score bajo
        expect(result.mesmis.estabilidad_resiliencia).toBeLessThan(2);
      });
    });

    describe('MESMIS: adaptabilidad', () => {
      it('null si no hay stage transition events', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'active' }],
        });
        expect(result.mesmis.adaptabilidad).toBeNull();
      });

      it('calcula score basado en número de transiciones', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            events: [
              { event_type: 'stage_transition', payload: { from: 'vegetative', to: 'flowering' } },
              { event_type: 'stage_transition', payload: { from: 'flowering', to: 'fruiting' } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.adaptabilidad).toBeGreaterThanOrEqual(0);
        expect(result.mesmis.adaptabilidad).toBeLessThanOrEqual(4);
      });

      it('incluye stage_corrected events', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            events: [
              { event_type: 'stage_corrected', payload: { from: 'wrong', to: 'correct' } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.adaptabilidad).toBeGreaterThanOrEqual(0);
      });
    });

    describe('MESMIS: equidad', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({
          processes: [
            { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
          ],
          observations: [{ observation_id: 'o1', text: 'Observación de prueba' }],
        });
        
        expect(result.mesmis.equidad).toBeNull();
      });
    });

    describe('MESMIS: autodependencia', () => {
      it('null si no hay pest management events', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'active' }],
        });
        expect(result.mesmis.autodependencia).toBeNull();
      });

      it('calcula score basado en proporción de biopreparados', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            events: [
              {
                event_type: 'pest_management_confirmed',
                payload: { method: 'biopreparado', treatment: 'Extracto de neem' },
              },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.autodependencia).toBeGreaterThanOrEqual(0);
        expect(result.mesmis.autodependencia).toBeLessThanOrEqual(4);
      });

      it('reconoce variants de bio/organico', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            events: [
              { event_type: 'pest_management_confirmed', payload: { method: 'biológico' } },
              { event_type: 'pest_management_confirmed', payload: { treatment: 'orgánico' } },
              { event_type: 'pest_management_confirmed', payload: { method: 'biofertilizante' } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        // Debería reconocer al menos algunos como bio
        expect(result.mesmis.autodependencia).toBeGreaterThan(0);
      });

      it('100% bio = score máximo', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            events: [
              { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado' } },
              { event_type: 'pest_management_confirmed', payload: { method: 'biológico' } },
              { event_type: 'pest_management_confirmed', payload: { treatment: 'orgánico' } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.autodependencia).toBe(4);
      });

      it('0% bio = score 0', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            events: [
              { event_type: 'pest_management_confirmed', payload: { method: 'químico' } },
              { event_type: 'pest_management_confirmed', payload: { method: 'sintético' } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.mesmis.autodependencia).toBe(0);
      });
    });

    describe('TAPE: diversidad', () => {
      it('null si no hay procesos con especies', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'active' }],
        });
        expect(result.tape.diversidad).toBeNull();
      });

      it('calcula score basado en número de especies', () => {
        const processes = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', subject_slug: 'capsicum_annum' },
          { process_id: 'p3', process_type: 'sowing', status: 'active', subject_slug: 'allium_cepa' },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.tape.diversidad).toBeGreaterThanOrEqual(0);
        expect(result.tape.diversidad).toBeLessThanOrEqual(4);
      });

      it('usa subject_label como fallback', () => {
        const processes = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', subject_label: 'Tomate' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', subject_label: 'Cebolla' },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.tape.diversidad).toBeGreaterThan(0);
      });

      it('más especies = score más alto', () => {
        // 2 especies
        const processes2 = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', subject_slug: 'capsicum_annum' },
        ];
        const result2 = evaluarEvolucionFinca({ processes: processes2 });
        
        // 10 especies
        const processes10 = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', subject_slug: 'capsicum_annum' },
          { process_id: 'p3', process_type: 'sowing', status: 'active', subject_slug: 'allium_cepa' },
          { process_id: 'p4', process_type: 'sowing', status: 'active', subject_slug: 'daucus_carota' },
          { process_id: 'p5', process_type: 'sowing', status: 'active', subject_slug: 'lactuca_sativa' },
          { process_id: 'p6', process_type: 'sowing', status: 'active', subject_slug: 'cucumis_sativus' },
          { process_id: 'p7', process_type: 'sowing', status: 'active', subject_slug: 'phaseolus_vulgaris' },
          { process_id: 'p8', process_type: 'sowing', status: 'active', subject_slug: 'zea_mays' },
          { process_id: 'p9', process_type: 'sowing', status: 'active', subject_slug: 'spinacia_oleracea' },
          { process_id: 'p10', process_type: 'sowing', status: 'active', subject_slug: 'brassica_oleracea' },
        ];
        const result10 = evaluarEvolucionFinca({ processes: processes10 });
        
        expect(result10.tape.diversidad).toBeGreaterThan(result2.tape.diversidad);
      });

      it('score máximo es 4', () => {
        // Muchas especies (más del máximo esperado)
        const processes = Array.from({ length: 20 }, (_, i) => ({
          process_id: `p${i}`,
          process_type: 'sowing',
          status: 'active',
          subject_slug: `species_${i}`,
        }));
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.tape.diversidad).toBe(4);
      });
    });

    describe('TAPE: sinergias', () => {
      it('null si no hay procesos con companions', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'active' }],
        });
        expect(result.tape.sinergias).toBeNull();
      });

      it('calcula score basado en procesos con companions', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            companions: [{ species: 'basilicum', reason: 'Repelente' }],
          },
          {
            process_id: 'p2',
            process_type: 'sowing',
            status: 'active',
            companions: [{ species: 'tagetes', reason: 'Nematicida' }],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.tape.sinergias).toBeGreaterThan(0);
      });

      it('reconoce companions en payload', () => {
        const processes = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            payload: {
              companions: [{ species: 'basilicum', reason: 'Repelente' }],
            },
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.tape.sinergias).toBeGreaterThan(0);
      });
    });

    describe('TAPE: eficiencia', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({ processes: [] });
        expect(result.tape.eficiencia).toBeNull();
      });
    });

    describe('TAPE: resiliencia', () => {
      it('null si no hay procesos activos', () => {
        const result = evaluarEvolucionFinca({
          processes: [{ process_id: 'p1', process_type: 'sowing', status: 'completed' }],
        });
        expect(result.tape.resiliencia).toBeNull();
      });

      it('calcula score basado en tipos de proceso', () => {
        const processes = [
          { process_id: 'p1', process_type: 'sowing', status: 'active' },
          { process_id: 'p2', process_type: 'restoration', status: 'active' },
          { process_id: 'p3', process_type: 'silvopasture', status: 'active' },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.tape.resiliencia).toBeGreaterThan(0);
      });

      it('mismo tipo de proceso no aumenta score', () => {
        const processes = [
          { process_id: 'p1', process_type: 'sowing', status: 'active' },
          { process_id: 'p2', process_type: 'sowing', status: 'active' },
          { process_id: 'p3', process_type: 'sowing', status: 'active' },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        // 1 tipo → score bajo
        expect(result.tape.resiliencia).toBeLessThan(2);
      });
    });

    describe('TAPE: reciclaje', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({ processes: [] });
        expect(result.tape.reciclaje).toBeNull();
      });
    });

    describe('TAPE: cocreacion_conocimiento', () => {
      it('null si no hay observaciones', () => {
        const result = evaluarEvolucionFinca({ processes: [], observations: [] });
        expect(result.tape.cocreacion_conocimiento).toBeNull();
      });

      it('null si observaciones son muy cortas', () => {
        const observations = [
          { observation_id: 'o1', text: 'Corta' },
          { observation_id: 'o2', text: 'Otra corta' },
        ];
        const result = evaluarEvolucionFinca({ observations });
        
        expect(result.tape.cocreacion_conocimiento).toBeNull();
      });

      it('calcula score basado en observaciones sustanciales', () => {
        const observations = [
          {
            observation_id: 'o1',
            text: 'Esta es una observación sustancial que describe con detalle lo que está pasando en el cultivo y las prácticas que se están implementando para mejorar el sistema.',
          },
        ];
        const result = evaluarEvolucionFinca({ observations });
        
        expect(result.tape.cocreacion_conocimiento).toBeGreaterThan(0);
      });

      it('reconoce texto en payload', () => {
        const observations = [
          {
            observation_id: 'o1',
            payload: {
              text: 'Esta es una observación sustancial que describe con detalle lo que está pasando en el cultivo y las prácticas que se están implementando.',
            },
          },
        ];
        const result = evaluarEvolucionFinca(/** @type {any} */ ({ observations }));
        
        expect(result.tape.cocreacion_conocimiento).toBeGreaterThan(0);
      });
    });

    describe('TAPE: valores_humanos_sociales', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({ processes: [] });
        expect(result.tape.valores_humanos_sociales).toBeNull();
      });
    });

    describe('TAPE: cultura_tradiciones', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({ processes: [] });
        expect(result.tape.cultura_tradiciones).toBeNull();
      });
    });

    describe('TAPE: economia_circular_solidaria', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({ processes: [] });
        expect(result.tape.economia_circular_solidaria).toBeNull();
      });
    });

    describe('TAPE: gobernanza', () => {
      it('siempre null con datos actuales', () => {
        const result = evaluarEvolucionFinca({ processes: [] });
        expect(result.tape.gobernanza).toBeNull();
      });
    });

    describe('nivelGliessman', () => {
      it('0 con datos mínimos', () => {
        const result = evaluarEvolucionFinca({ processes: [], observations: [] });
        expect(result.nivelGliessman).toBe(0);
      });

      it('aumenta con diversidad', () => {
        // Baja diversidad
        const processes1 = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
        ];
        const result1 = evaluarEvolucionFinca({ processes: processes1 });
        
        // Alta diversidad
        const processes10 = [
          { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
          { process_id: 'p2', process_type: 'sowing', status: 'active', subject_slug: 'capsicum_annum' },
          { process_id: 'p3', process_type: 'sowing', status: 'active', subject_slug: 'allium_cepa' },
          { process_id: 'p4', process_type: 'restoration', status: 'active', subject_slug: 'cedrella_spp' },
          { process_id: 'p5', process_type: 'silvopasture', status: 'active', subject_slug: 'n fixer' },
        ];
        const result10 = evaluarEvolucionFinca({ processes: processes10 });
        
        expect(result10.nivelGliessman).toBeGreaterThanOrEqual(result1.nivelGliessman);
      });

      it('aumenta con autodependencia', () => {
        // Sin autodependencia
        const processes0 = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            subject_slug: 'solanum_lycopersicum',
            events: [
              { event_type: 'pest_management_confirmed', payload: { method: 'químico' } },
            ],
          },
        ];
        const result0 = evaluarEvolucionFinca({ processes: processes0 });
        
        // Con autodependencia
        const processes100 = [
          {
            process_id: 'p1',
            process_type: 'sowing',
            status: 'active',
            subject_slug: 'solanum_lycopersicum',
            events: [
              { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado' } },
            ],
          },
        ];
        const result100 = evaluarEvolucionFinca({ processes: processes100 });
        
        expect(result100.nivelGliessman).toBeGreaterThanOrEqual(result0.nivelGliessman);
      });

      it('máximo es 4', () => {
        const processes = [
          // Mucha diversidad
          ...Array.from({ length: 15 }, (_, i) => ({
            process_id: `p${i}`,
            process_type: 'sowing',
            status: 'active',
            subject_slug: `species_${i}`,
          })),
          {
            process_id: 'pest',
            process_type: 'sowing',
            status: 'active',
            subject_slug: 'species_pest',
            events: [
              { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado' } },
              { event_type: 'pest_management_confirmed', payload: { method: 'biológico' } },
              { event_type: 'pest_management_confirmed', payload: { method: 'orgánico' } },
            ],
          },
          {
            process_id: 'harvest',
            process_type: 'sowing',
            status: 'active',
            subject_slug: 'species_harvest',
            events: [
              { event_type: 'harvest_confirmed', payload: { quantity: 100 } },
              { event_type: 'harvest_confirmed', payload: { quantity: 200 } },
            ],
          },
        ];
        const result = evaluarEvolucionFinca({ processes });
        
        expect(result.nivelGliessman).toBeLessThanOrEqual(4);
      });

      it('siempre >= 0', () => {
        const result = evaluarEvolucionFinca({ processes: [], observations: [] });
        expect(result.nivelGliessman).toBeGreaterThanOrEqual(0);
      });
    });

    describe('metadata', () => {
      it('incluye contadores de procesos y observaciones', () => {
        const result = evaluarEvolucionFinca({
          processes: [
            { process_id: 'p1', process_type: 'sowing', status: 'active' },
            { process_id: 'p2', process_type: 'sowing', status: 'completed' },
          ],
          observations: [{ observation_id: 'o1', text: 'Obs' }],
        });
        
        expect(result.metadata.processes_count).toBe(2);
        expect(result.metadata.active_processes_count).toBe(1);
        expect(result.metadata.observations_count).toBe(1);
      });

      it('incluye contadores de indicadores no-null', () => {
        const result = evaluarEvolucionFinca({
          processes: [
            { process_id: 'p1', process_type: 'sowing', status: 'active', subject_slug: 'solanum_lycopersicum' },
          ],
        });
        
        expect(result.metadata.mesmis_non_null_count).toBeGreaterThanOrEqual(0);
        expect(result.metadata.tape_non_null_count).toBeGreaterThan(0); // al menos diversidad
      });

      it('incluye timestamp de cálculo', () => {
        const before = Date.now();
        const result = evaluarEvolucionFinca({ processes: [] });
        const after = Date.now();
        
        expect(result.metadata.calculated_at).toBeGreaterThanOrEqual(before);
        expect(result.metadata.calculated_at).toBeLessThanOrEqual(after);
      });
    });
  });

  describe('normalizeScore', () => {
    it('null se mantiene null', () => {
      expect(normalizeScore(null)).toBeNull();
    });

    it('0 → 0', () => {
      expect(normalizeScore(0)).toBe(0);
    });

    it('2 → 50', () => {
      expect(normalizeScore(2)).toBe(50);
    });

    it('4 → 100', () => {
      expect(normalizeScore(4)).toBe(100);
    });

    it('escala linealmente', () => {
      expect(normalizeScore(1)).toBe(25);
      expect(normalizeScore(3)).toBe(75);
    });
  });

  describe('getGliessmanLabel', () => {
    it('devuelve etiqueta correcta para cada nivel', () => {
      expect(getGliessmanLabel(0)).toContain('Convencional');
      expect(getGliessmanLabel(1)).toContain('Reducción');
      expect(getGliessmanLabel(2)).toContain('Sustitución');
      expect(getGliessmanLabel(3)).toContain('Rediseño');
      expect(getGliessmanLabel(4)).toContain('Conexión');
    });

    it('devuelve "Desconocido" para nivel inválido', () => {
      expect(getGliessmanLabel(5)).toBe('Desconocido');
      expect(getGliessmanLabel(-1)).toBe('Desconocido');
      expect(getGliessmanLabel(999)).toBe('Desconocido');
    });
  });

  describe('casos integrados', () => {
    it('finca convencional: baja diversidad, agroquímicos', () => {
      const processes = [
        {
          process_id: 'p1',
          process_type: 'sowing',
          status: 'active',
          subject_slug: 'solanum_tuberosum',
          current_stage: 'vegetative',
          events: [
            { event_type: 'pest_management_confirmed', payload: { method: 'químico' } },
          ],
        },
      ];
      const result = evaluarEvolucionFinca({ processes });
      
      expect(result.nivelGliessman).toBeLessThan(2);
      expect(result.mesmis.autodependencia).toBe(0);
      expect(result.tape.diversidad).toBeLessThan(2);
    });

    it('finca agroecológica: alta diversidad, biopreparados', () => {
      const processes = [
        {
          process_id: 'p1',
          process_type: 'sowing',
          status: 'active',
          subject_slug: 'solanum_tuberosum',
          current_stage: 'vegetative',
          events: [
            { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado' } },
          ],
          companions: [{ species: 'fabacea', reason: 'N fixer' }],
        },
        {
          process_id: 'p2',
          process_type: 'sowing',
          status: 'active',
          subject_slug: 'zea_mays',
          current_stage: 'flowering',
          events: [
            { event_type: 'pest_management_confirmed', payload: { method: 'biológico' } },
          ],
        },
        {
          process_id: 'p3',
          process_type: 'restoration',
          status: 'active',
          subject_slug: 'cedrella_spp',
          current_stage: 'establecimiento',
        },
      ];
      const observations = [
        {
          observation_id: 'o1',
          text: 'Se observa recuperación del suelo con presencia de lombrices y materia orgánica en aumento tras la implementación de abonos verdes.',
        },
      ];
      const result = evaluarEvolucionFinca({ processes, observations });
      
      expect(result.nivelGliessman).toBeGreaterThanOrEqual(2);
      expect(result.mesmis.autodependencia).toBeGreaterThan(0);
      expect(result.tape.diversidad).toBeGreaterThan(0);
      expect(result.tape.cocreacion_conocimiento).toBeGreaterThan(0);
    });
  });
});

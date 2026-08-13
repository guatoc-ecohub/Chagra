/**
 * hojaVidaMataService.test.js — Tests para hoja de vida por mata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildHojaVidaMata,
  buildHojaVidaMataBatch,
  __TEST__,
} from '../hojaVidaMataService';

// Mock de dependencias
vi.mock('../../db/farmProcessCache', () => ({
  getFarmProcess: vi.fn(),
  getFarmEvents: vi.fn(),
}));

vi.mock('../plantDossierService', () => ({
  buildPlantDossier: vi.fn(),
}));

vi.mock('../sidecarClient', () => ({
  callTool: vi.fn(),
}));

describe('hojaVidaMataService', () => {
  let getFarmProcess, getFarmEvents, buildPlantDossier, callTool;

  beforeEach(async () => {
    const fp = await import('../../db/farmProcessCache');
    getFarmProcess = fp.getFarmProcess;
    getFarmEvents = fp.getFarmEvents;

    const pd = await import('../plantDossierService');
    buildPlantDossier = pd.buildPlantDossier;

    const sc = await import('../sidecarClient');
    callTool = sc.callTool;

    vi.clearAllMocks();
  });

  describe('buildHojaVidaMata', () => {
    it('debería rechazar process_id inválido', async () => {
      const result = await buildHojaVidaMata(null);
      expect(result.mata).toBeNull();
      expect(result.metadata.error).toBe('process_id requerido');
    });

    it('debería devolver error cuando proceso no existe', async () => {
      getFarmProcess.mockResolvedValue(null);
      
      const result = await buildHojaVidaMata('01JZ...');
      
      expect(result.mata).toBeNull();
      expect(result.metadata.error).toBe('proceso_no_encontrado');
      expect(result.metadata.process_id).toBe('01JZ...');
    });

    it('debería construir hoja de vida básica con datos mínimos', async () => {
      const mockProcess = {
        process_id: '01JZ123',
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: 'coffea_arabica',
          subject_label: 'Café',
          quantity: 1,
          unit: 'plantas',
          status: 'active',
          current_stage: 'vegetative',
          created_at: 1704067200000,
          updated_at: 1704153600000,
        },
      };
      
      getFarmProcess.mockResolvedValue(mockProcess);
      getFarmEvents.mockResolvedValue([]);
      buildPlantDossier.mockResolvedValue({
        slug: 'coffea_arabica',
        label: 'Café',
        cycle: null,
        bioinsumos: { items: [], fromGraph: false },
        relations: { companions: [], antagonists: [], strata: [], fromGraph: false },
        cycles: [],
      });
      callTool.mockResolvedValue(null);
      
      const result = await buildHojaVidaMata('01JZ123');
      
      expect(result.mata).toBeDefined();
      expect(result.mata.process_id).toBe('01JZ123');
      expect(result.mata.attributes.subject_slug).toBe('coffea_arabica');
      expect(result.cronologia).toEqual([]);
      expect(result.resumen_cronologia.total_eventos).toBe(0);
      expect(result.metadata.generated_at).toBeGreaterThan(0);
    });

    it('debería incluir cronología de eventos ordenada', async () => {
      const mockProcess = {
        process_id: '01JZ456',
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: 'solanum_lycopersicum',
          subject_label: 'Tomate',
          quantity: 1,
          unit: 'plantas',
          status: 'active',
          created_at: 1704067200000,
          updated_at: 1704240000000,
        },
      };
      
      const mockEvents = [
        {
          event_id: 'evt1',
          attributes: {
            process_id: '01JZ456',
            event_type: 'sowing_confirmed',
            occurred_at: 1704100000000,
            actor: 'operator',
            source: 'voice',
            payload: { metodo: 'directa' },
          },
        },
        {
          event_id: 'evt2',
          attributes: {
            process_id: '01JZ456',
            event_type: 'observation',
            occurred_at: 1704200000000,
            actor: 'operator',
            source: 'manual',
            payload: { text: 'Planta sana' },
          },
        },
      ];
      
      getFarmProcess.mockResolvedValue(mockProcess);
      getFarmEvents.mockResolvedValue(mockEvents);
      buildPlantDossier.mockResolvedValue(null);
      callTool.mockResolvedValue(null);
      
      const result = await buildHojaVidaMata('01JZ456');
      
      expect(result.cronologia).toHaveLength(2);
      // Debería estar ordenada por occurred_at DESC
      expect(result.cronologia[0].event_type).toBe('observation');
      expect(result.cronologia[1].event_type).toBe('sowing_confirmed');
      expect(result.cronologia[0].tipo_legible).toBe('Observación');
      expect(result.cronologia[1].tipo_legible).toBe('Siembra confirmada');
    });

    it('debería incluir perfil MCP de especie cuando está disponible', async () => {
      const mockProcess = {
        process_id: '01JZ789',
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: 'cucurbita_pepo',
          subject_label: 'Calabaza',
          quantity: 1,
          unit: 'plantas',
          status: 'active',
          created_at: 1704067200000,
        },
      };
      
      const mockSpeciesProfile = {
        canonical_id: 'cucurbita_pepo',
        nombre_comun: 'Calabaza',
        nombre_cientifico: 'Cucurbita pepo',
        familia_botanica: 'Cucurbitaceae',
        ciclo_vida: 'anual',
        altitud_min: 0,
        altitud_max: 2500,
        piso_termico: 'cálido',
        found: true,
      };
      
      getFarmProcess.mockResolvedValue(mockProcess);
      getFarmEvents.mockResolvedValue([]);
      buildPlantDossier.mockResolvedValue(null);
      callTool.mockResolvedValue(mockSpeciesProfile);
      
      const result = await buildHojaVidaMata('01JZ789');
      
      expect(result.especie_mcp).toBeDefined();
      expect(result.especie_mcp.nombre_comun).toBe('Calabaza');
      expect(result.especie_mcp.nombre_cientifico).toBe('Cucurbita pepo');
      expect(result.especie_mcp.found).toBe(true);
      expect(result.metadata.offline_mode).toBe(false);
    });

    it('debería degradar graciosamente cuando MCP falla', async () => {
      const mockProcess = {
        process_id: '01JZABC',
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: 'unknown_species',
          subject_label: 'Especie desconocida',
          quantity: 1,
          unit: 'plantas',
          status: 'active',
        },
      };
      
      getFarmProcess.mockResolvedValue(mockProcess);
      getFarmEvents.mockResolvedValue([]);
      buildPlantDossier.mockResolvedValue(null);
      callTool.mockResolvedValue({ _error: true, reason: 'fetch_failed' });
      
      const result = await buildHojaVidaMata('01JZABC');
      
      expect(result.especie_mcp).toBeNull();
      expect(result.metadata.offline_mode).toBe(true);
      // El resto de la hoja de vida debería estar presente
      expect(result.mata).toBeDefined();
      expect(result.cronologia).toEqual([]);
    });

    it('debería incluir dossier de planta cuando hay slug de especie', async () => {
      const mockProcess = {
        process_id: '01JZDEF',
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: 'phaseolus_vulgaris',
          subject_label: 'Frijol',
          quantity: 1,
          unit: 'plantas',
          status: 'active',
        },
      };
      
      const mockDossier = {
        slug: 'phaseolus_vulgaris',
        label: 'Frijol',
        cycle: {
          template_id: 'phaseolus_vulgaris',
          species_label: 'Frijol',
          stages: [
            { name: 'sowing', label: 'Siembra' },
            { name: 'vegetative', label: 'Vegetativo' },
          ],
        },
        bioinsumos: { items: [{ nombre: 'Caldo sulfocálcico', uso: 'control hongos' }], fromGraph: true },
        relations: { companions: [{ name: 'Maíz' }], antagonists: [], strata: [], fromGraph: true },
        cycles: [],
      };
      
      getFarmProcess.mockResolvedValue(mockProcess);
      getFarmEvents.mockResolvedValue([]);
      buildPlantDossier.mockResolvedValue(mockDossier);
      callTool.mockResolvedValue(null);
      
      const result = await buildHojaVidaMata('01JZDEF');
      
      expect(result.dossier).toBeDefined();
      expect(result.dossier.slug).toBe('phaseolus_vulgaris');
      expect(result.dossier.cycle).toBeDefined();
      expect(result.dossier.bioinsumos.items).toHaveLength(1);
      expect(result.dossier.relations.companions).toHaveLength(1);
    });
  });

  describe('buildHojaVidaMataBatch', () => {
    it('debería devolver array vacío para input inválido', async () => {
      const result = await buildHojaVidaMataBatch(null);
      expect(result).toEqual([]);
    });

    it('debería devolver array vacío para array vacío', async () => {
      const result = await buildHojaVidaMataBatch([]);
      expect(result).toEqual([]);
    });

    it('debería limitar batch a 10 elementos', async () => {
      const mockProcess = {
        process_id: '01JZLIMIT',
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: 'test_species',
          subject_label: 'Test',
          quantity: 1,
          unit: 'plantas',
          status: 'active',
        },
      };
      
      getFarmProcess.mockResolvedValue(mockProcess);
      getFarmEvents.mockResolvedValue([]);
      buildPlantDossier.mockResolvedValue(null);
      callTool.mockResolvedValue(null);
      
      // Crear 15 IDs
      const fifteenIds = Array.from({ length: 15 }, (_, i) => `01JZ${i}`);
      
      const result = await buildHojaVidaMataBatch(fifteenIds);
      
      // Debería limitar a 10
      expect(result).toHaveLength(10);
      // Verificar que se llamó getFarmProcess 10 veces
      expect(getFarmProcess).toHaveBeenCalledTimes(10);
    });

    it('debería manejar errores individuales sin romper el batch', async () => {
      getFarmProcess
        .mockResolvedValueOnce({ process_id: 'ok1', attributes: { subject_slug: 'ok' } })
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ process_id: 'ok2', attributes: { subject_slug: 'ok' } });
      
      getFarmEvents.mockResolvedValue([]);
      buildPlantDossier.mockResolvedValue(null);
      callTool.mockResolvedValue(null);
      
      const result = await buildHojaVidaMataBatch(['ok1', 'err', 'ok2']);
      
      expect(result).toHaveLength(3);
      expect(result[0].mata).toBeDefined();
      expect(result[1].mata).toBeNull();
      expect(result[1].metadata.error).toBeDefined();
      expect(result[2].mata).toBeDefined();
    });
  });

  describe('funciones auxiliares (__TEST__)', () => {
    describe('getEventTypeLabel', () => {
      it('debería mapear event_types conocidos', () => {
        expect(__TEST__.getEventTypeLabel('sowing_confirmed')).toBe('Siembra confirmada');
        expect(__TEST__.getEventTypeLabel('observation')).toBe('Observación');
        expect(__TEST__.getEventTypeLabel('harvest')).toBe('Cosecha');
      });

      it('debería devolver el event_type original si no está mapeado', () => {
        expect(__TEST__.getEventTypeLabel('unknown_type')).toBe('unknown_type');
      });

      it('debería usar MSG.eventTypes para mapeos', () => {
        // Verificar que usa MSG.eventTypes internamente
        expect(__TEST__.getEventTypeLabel('fertilizer_applied')).toBe('Fertilización');
        expect(__TEST__.getEventTypeLabel('weather_event')).toBe('Evento climático');
      });
    });

    describe('summarizeTimeline', () => {
      it('debería resumir timeline vacío', () => {
        const result = __TEST__.summarizeTimeline([]);
        expect(result.total_eventos).toBe(0);
        expect(result.por_tipo).toEqual({});
        expect(result.primer_evento).toBeNull();
        expect(result.ultimo_evento).toBeNull();
      });

      it('debería contar eventos por tipo', () => {
        const events = [
          { event_type: 'observation', occurred_at: 1000 },
          { event_type: 'observation', occurred_at: 2000 },
          { event_type: 'harvest', occurred_at: 3000 },
        ];
        
        const result = __TEST__.summarizeTimeline(events);
        
        expect(result.total_eventos).toBe(3);
        expect(result.por_tipo.observation).toBe(2);
        expect(result.por_tipo.harvest).toBe(1);
      });

      it('debería identificar primer y último evento', () => {
        const events = [
          { event_type: 'a', occurred_at: 1000 },
          { event_type: 'b', occurred_at: 5000 },
          { event_type: 'c', occurred_at: 3000 },
        ];
        
        const result = __TEST__.summarizeTimeline(events);
        
        expect(result.primer_evento).toBe(1000);
        expect(result.ultimo_evento).toBe(5000);
      });
    });

    describe('normalizeSpeciesProfile', () => {
      it('debería normalizar perfil MCP válido', () => {
        const raw = {
          canonical_id: 'test_species',
          nombre_comun: 'Test',
          nombre_cientifico: 'Testus testus',
          familia_botanica: 'Testaceae',
          found: true,
        };
        
        const result = __TEST__.normalizeSpeciesProfile(raw);
        
        expect(result.id).toBe('test_species');
        expect(result.nombre_comun).toBe('Test');
        expect(result.nombre_cientifico).toBe('Testus testus');
        expect(result.found).toBe(true);
      });

      it('debería devolver null para input inválido', () => {
        expect(__TEST__.normalizeSpeciesProfile(null)).toBeNull();
        expect(__TEST__.normalizeSpeciesProfile(undefined)).toBeNull();
        expect(__TEST__.normalizeSpeciesProfile('string')).toBeNull();
      });

      it('debería usar fallbacks para campos opcionales', () => {
        const raw = {
          canonical_id: 'fallback_test',
          name: 'Fallback Common',
          found: true,
        };
        
        const result = __TEST__.normalizeSpeciesProfile(raw);
        
        expect(result.nombre_comun).toBe('Fallback Common');
        expect(result.nombre_cientifico).toBe('');
        expect(result.familia_botanica).toBe('');
      });
    });
  });
});

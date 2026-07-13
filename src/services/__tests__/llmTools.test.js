/**
 * Tests para llmTools.js — Tool registry para function calling.
 *
 * Cubre funciones PURAS exportadas:
 * - registerTool(tool): registro de herramientas
 * - getTool(name): obtención por nombre
 * - listTools(): listado de herramientas registradas
 * - getToolsForLLM(): formato OpenAI function calling
 *
 * NO cubre handlers (llaman a useAssetStore/fetch) — eso es integración.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de useAssetStore para evitar side effects en handlers
vi.mock('../../store/useAssetStore.js', () => /** @type {any} */ ({
  default: {
    getState: vi.fn(() => ({
      addLog: vi.fn().mockResolvedValue(undefined),
      updateAsset: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock de fetch para query_corpus_dr034
/** @type {any} */ (globalThis).fetch = vi.fn();

import { registerTool, getTool, listTools, getToolsForLLM } from '../llmTools.js';

describe('llmTools — funciones de registry', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada test
    vi.clearAllMocks();
  });

  describe('registerTool', () => {
    it('lanza error si la tool no tiene name', () => {
      const toolWithoutName = {
        description: 'Test tool',
        handler: async () => {},
        requiresGate: false,
      };
      
      expect(() => registerTool(/** @type {any} */ (toolWithoutName))).toThrow('Tool must have name and handler');
    });

    it('lanza error si la tool no tiene handler', () => {
      const toolWithoutHandler = {
        name: 'test_tool',
        description: 'Test tool',
        requiresGate: false,
      };
      
      expect(() => registerTool(/** @type {any} */ (toolWithoutHandler))).toThrow('Tool must have name and handler');
    });

    it('registra una tool válida correctamente', () => {
      const validTool = {
        name: 'test_valid_tool',
        description: 'Tool de prueba',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
          required: ['param1'],
        },
        handler: async () => ({ success: true }),
        requiresGate: false,
      };
      
      expect(() => registerTool(validTool)).not.toThrow();
      expect(getTool('test_valid_tool')).toEqual(validTool);
    });

    it('sobrescribe una tool existente con el mismo nombre', () => {
      const tool1 = {
        name: 'override_test',
        description: 'Primera versión',
        handler: async () => ({ v: 1 }),
        requiresGate: false,
      };
      
      const tool2 = {
        name: 'override_test',
        description: 'Segunda versión',
        handler: async () => ({ v: 2 }),
        requiresGate: true,
      };
      
      registerTool(tool1);
      expect(getTool('override_test').description).toBe('Primera versión');
      
      registerTool(tool2);
      expect(getTool('override_test').description).toBe('Segunda versión');
      expect(getTool('override_test').requiresGate).toBe(true);
    });
  });

  describe('getTool', () => {
    it('retorna null para una tool que no existe', () => {
      expect(getTool('non_existent_tool')).toBeNull();
    });

    it('retorna la tool registrada si existe', () => {
      const tool = {
        name: 'lookup_test',
        description: 'Tool para lookup',
        handler: async () => ({}),
        requiresGate: false,
      };
      
      registerTool(tool);
      const retrieved = getTool('lookup_test');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.name).toBe('lookup_test');
      expect(retrieved.description).toBe('Tool para lookup');
    });

    it('retorna las herramientas pre-registradas del módulo', () => {
      // Estas tools están registradas en llmTools.js
      expect(getTool('crear_log')).not.toBeNull();
      expect(getTool('actualizar_planta')).not.toBeNull();
      expect(getTool('agendar_riego')).not.toBeNull();
      expect(getTool('query_corpus_dr034')).not.toBeNull();
    });
  });

  describe('listTools', () => {
    it('retorna array vacío si no hay tools registradas', () => {
      // Nota: el módulo ya tiene tools pre-registradas, así que este test
      // verifica que al menos sean consistentes
      const tools = listTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('retorna array con name, description, requiresGate de cada tool', () => {
      const tools = listTools();
      
      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('requiresGate');
        expect(tool).not.toHaveProperty('handler');
        expect(tool).not.toHaveProperty('parameters');
      });
    });

    it('incluye las herramientas pre-registradas del módulo', () => {
      const tools = listTools();
      const names = tools.map((t) => t.name);
      
      expect(names).toContain('crear_log');
      expect(names).toContain('actualizar_planta');
      expect(names).toContain('agendar_riego');
      expect(names).toContain('query_corpus_dr034');
    });

    it('marca requiresGate correctamente para cada tool', () => {
      const tools = listTools();
      const toolsMap = Object.fromEntries(tools.map((t) => [t.name, t.requiresGate]));
      
      // crear_log, actualizar_planta, agendar_riego requieren gate (write)
      expect(toolsMap.crear_log).toBe(true);
      expect(toolsMap.actualizar_planta).toBe(true);
      expect(toolsMap.agendar_riego).toBe(true);
      
      // query_corpus_dr034 es read-only
      expect(toolsMap.query_corpus_dr034).toBe(false);
    });
  });

  describe('getToolsForLLM', () => {
    it('retorna array con estructura OpenAI function calling', () => {
      const tools = getToolsForLLM();
      
      expect(Array.isArray(tools)).toBe(true);
      tools.forEach((tool) => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
      });
    });

    it('incluye type y properties de parameters en formato OpenAI', () => {
      const tools = getToolsForLLM();
      const crearLogTool = tools.find((t) => t.function.name === 'crear_log');
      
      expect(crearLogTool).toBeDefined();
      expect(/** @type {any} */ (crearLogTool).function.parameters.type).toBe('object');
      expect(/** @type {any} */ (crearLogTool).function.parameters.properties).toBeDefined();
      expect(/** @type {any} */ (crearLogTool).function.parameters.required).toBeDefined();
    });

    it('incluye las herramientas pre-registradas del módulo', () => {
      const tools = getToolsForLLM();
      const names = tools.map((t) => t.function.name);
      
      expect(names).toContain('crear_log');
      expect(names).toContain('actualizar_planta');
      expect(names).toContain('agendar_riego');
      expect(names).toContain('query_corpus_dr034');
    });

    it('maneja tools sin parameters correctamente', () => {
      // Registrar una tool sin parameters para testear edge case
      registerTool({
        name: 'tool_no_params',
        description: 'Tool sin parameters',
        handler: async () => ({}),
        requiresGate: false,
      });
      
      const tools = getToolsForLLM();
      const toolNoParams = tools.find((t) => t.function.name === 'tool_no_params');
      
      expect(/** @type {any} */ (toolNoParams).function.parameters.type).toBe('object');
      expect(/** @type {any} */ (toolNoParams).function.parameters.properties).toEqual({});
      expect(/** @type {any} */ (toolNoParams).function.parameters.required).toEqual([]);
    });
  });

  describe('validación de schemas de herramientas pre-registradas', () => {
    it('crear_log tiene schema correcto con propiedades requeridas', () => {
      const tool = getTool('crear_log');
      
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.properties.asset_id).toBeDefined();
      expect(tool.parameters.properties.log_type).toBeDefined();
      expect(tool.parameters.required).toContain('asset_id');
      expect(tool.parameters.required).toContain('log_type');
      
      expect(tool.parameters.properties.log_type.enum).toContain('log--observation');
      expect(tool.parameters.properties.log_type.enum).toContain('log--harvest');
      expect(tool.parameters.properties.log_type.enum).toContain('log--input');
    });

    it('actualizar_planta tiene schema con asset_id requerido y campos opcionales', () => {
      const tool = getTool('actualizar_planta');
      
      expect(tool.parameters.required).toContain('asset_id');
      expect(tool.parameters.properties.name).toBeDefined();
      expect(tool.parameters.properties.notes).toBeDefined();
      expect(tool.parameters.properties.status).toBeDefined();
      expect(tool.parameters.properties.status.enum).toContain('active');
      expect(tool.parameters.properties.status.enum).toContain('archived');
    });

    it('agendar_riego tiene schema con asset_id y scheduled_time requeridos', () => {
      const tool = getTool('agendar_riego');

      expect(tool.parameters.required).toContain('asset_id');
      expect(tool.parameters.required).toContain('scheduled_time');
      expect(tool.parameters.properties.method.enum).toContain('goteo');
      expect(tool.parameters.properties.method.enum).toContain('aspersion');
      expect(tool.parameters.properties.method.enum).toContain('manual');
    });

    // Regresión incidente 2026-06-22: el LLM eligió agendar_riego ante "plan
    // más serio para la gota del tomate" (gota = enfermedad). La descripción
    // debe acotar el disparo a intención EXPLÍCITA de agendar y advertir contra
    // diagnóstico/"plan".
    it('agendar_riego acota su descripción a intención explícita de agendar (no plan/enfermedad)', () => {
      const tool = getTool('agendar_riego');
      const desc = tool.description.toLowerCase();
      expect(desc).toContain('explícita');
      expect(desc).toContain('agénda');
      // Debe desincentivar su uso ante problemas fitosanitarios / "plan".
      expect(desc).toMatch(/enfermedad|gota|plan/);
    });

    it('query_corpus_dr034 tiene schema con query requerido y species opcional', () => {
      const tool = getTool('query_corpus_dr034');
      
      expect(tool.parameters.required).toContain('query');
      expect(tool.parameters.properties.species).toBeDefined();
      expect(tool.parameters.properties.species.enum).toContain('lechuga');
      expect(tool.parameters.properties.species.enum).toContain('fresa');
      expect(tool.parameters.properties.species.enum).toContain('tomate');
    });
  });
});

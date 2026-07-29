/**
 * actionExecutor.test.js — unit tests para el ejecutor de acciones del agente Chagra.
 *
 * Cobertura:
 * - Tool no encontrada → status: 'failed'
 * - Tool con gate humano → dispatch UI callback y maneja approve/reject/edit
 * - Tool read-only (sin gate) → ejecuta directamente
 * - Casos borde: proposal null/undefined, tool_name inválido
 * - getActionHistory() → lectura de localStorage
 * - setActionGateCallback() → registro de callback
 *
 * Aislamiento:
 * - Mock de getTool (llmTools.js) para tools sintéticas
 * - Mock de useAssetStore para avoid side-effects en IDB
 * - Mock de localStorage para audit trail
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeAction, setActionGateCallback, getActionHistory } from '../actionExecutor.js';

// Mock de llmTools.js
vi.mock('../llmTools.js', () => ({
  getTool: vi.fn(),
}));

// Mock de useAssetStore
vi.mock('../../store/useAssetStore.js', () => ({
  default: {
    getState: vi.fn(() => ({
      addLog: vi.fn(),
    })),
  },
}));

import { getTool } from '../llmTools.js';
import useAssetStore from '../../store/useAssetStore.js';

describe('actionExecutor — ejecución de acciones del agente', () => {
  let originalLocalStorage;
  let originalWindow;
  let mockStore;

  // Tool sintética read-only
  const mockToolReadOnly = {
    name: 'query_info',
    description: 'Consultar información read-only',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
    },
    handler: async (params) => ({ success: true, data: `info: ${params.query}` }),
    requiresGate: false,
  };

  // Tool sintética con gate
  const mockToolWithGate = {
    name: 'crear_log',
    description: 'Crear log (requiere aprobación)',
    parameters: {
      type: 'object',
      properties: {
        asset_id: { type: 'string' },
        notes: { type: 'string' },
      },
    },
    handler: async (params) => ({ success: true, message: `log creado para ${params.asset_id}` }),
    requiresGate: true,
  };

  // Tool que falla en handler
  const mockToolFailing = {
    name: 'failing_tool',
    description: 'Tool que falla',
    parameters: {},
    handler: async () => { throw new Error('Simulated handler error'); },
    requiresGate: false,
  };

  // Proposal válido
  const createProposal = (toolName, params = {}) => ({
    tool_name: toolName,
    parameters: params,
    intent: 'Intent del usuario',
    llm_response: 'Respuesta previa del LLM',
    timestamp: '2026-05-29T10:00:00Z',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = /** @type {any} */ ({
      getItem: vi.fn(() => '[]'),
      setItem: vi.fn(),
      length: 0,
      key: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    // Mock window.indexedDB (el código lo chequea antes de usar localStorage)
    originalWindow = globalThis.window;
    globalThis.window = /** @type {any} */ ({ indexedDB: /** @type {any} */ ({}) });

    // Reset del store mock
    mockStore = {
      addLog: vi.fn(),
    };
    useAssetStore.getState = vi.fn(() => mockStore);

    // Reset callback
    setActionGateCallback(null);
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
    globalThis.window = originalWindow;
  });

  describe('executeAction — validación de tool', () => {
    it('tool no encontrada → status: failed con error', async () => {
      vi.mocked(getTool).mockReturnValue(null);
      
      const proposal = createProposal('tool_inexistente', { param: 'value' });
      const result = await executeAction(proposal, 'operator-123');

      expect(result).toEqual({
        status: 'failed',
        error: 'Tool "tool_inexistente" no encontrada',
        executed_at: expect.any(Number),
      });
    });

    it('tool_name null/undefined → fallback a "no encontrada"', async () => {
      vi.mocked(getTool).mockReturnValue(null);
      
      const proposal = createProposal(null, {});
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('no encontrada');
    });
  });

  describe('executeAction — tool read-only (sin gate)', () => {
    beforeEach(() => {
      vi.mocked(getTool).mockReturnValue(mockToolReadOnly);
    });

    it('ejecuta directamente sin llamar al callback de gate', async () => {
      const mockCallback = vi.fn();
      setActionGateCallback(mockCallback);

      const proposal = createProposal('query_info', { query: 'clima bogotá' });
      const result = await executeAction(proposal, 'operator-123');

      expect(mockCallback).not.toHaveBeenCalled();
      expect(result.status).toBe('executed');
      expect(result.result).toEqual({ success: true, data: 'info: clima bogotá' });
      expect(result.executed_at).toEqual(expect.any(Number));
    });

    it('proposal con parámetros null → handler recibe null', async () => {
      const proposal = createProposal('query_info', null);
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('executed');
    });
  });

  describe('executeAction — tool con gate humano', () => {
    beforeEach(() => {
      vi.mocked(getTool).mockReturnValue(mockToolWithGate);
    });

    it('sin callback registrado → status: failed', async () => {
      // Sin setActionGateCallback
      const proposal = createProposal('crear_log', { asset_id: 'asset-1', notes: 'Test' });
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Gate UI no disponible');
    });

    it('gate rechaza → status: rejected', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        status: 'rejected',
      });

      setActionGateCallback(mockCallback);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1', notes: 'Test' });
      const result = await executeAction(proposal, 'operator-123');

      expect(mockCallback).toHaveBeenCalledWith({
        toolName: 'crear_log',
        description: 'Crear log (requiere aprobación)',
        parameters: { asset_id: 'asset-1', notes: 'Test' },
        intent: 'Intent del usuario',
        llm_response: 'Respuesta previa del LLM',
      });

      expect(result.status).toBe('rejected');
      expect(result.executed_at).toEqual(expect.any(Number));
    });

    it('gate aprueba → ejecuta handler y retorna status: executed', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        status: 'approved',
      });

      setActionGateCallback(mockCallback);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1', notes: 'Test' });
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('executed');
      expect(result.result).toEqual({ success: true, message: 'log creado para asset-1' });
      expect(result.executed_at).toEqual(expect.any(Number));
    });

    it('gate edita parámetros → ejecuta con params editados', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        status: 'edited',
        edited_params: { asset_id: 'asset-2', notes: 'Editado por operador' },
      });

      setActionGateCallback(mockCallback);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1', notes: 'Original' });
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('executed');
      expect(/** @type {any} */ (result).edited).toBe(true);
      expect(result.result).toEqual({ success: true, message: 'log creado para asset-2' });
    });

    it('gate retorna estado desconocido → status: failed', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        status: 'unknown_state',
      });

      setActionGateCallback(mockCallback);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1' });
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('desconocido');
    });
  });

  describe('executeAction — manejo de errores en handler', () => {
    it('handler que falla → captura error y retorna success: false', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolFailing);

      const proposal = createProposal('failing_tool', {});
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('executed');
      expect(result.result).toEqual({
        success: false,
        error: 'Simulated handler error',
      });
    });

    it('handler con gate falla → retorna error en result', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        status: 'approved',
      });

      setActionGateCallback(mockCallback);
      vi.mocked(getTool).mockReturnValue({
        ...mockToolWithGate,
        handler: async () => { throw new Error('Error en handler con gate'); },
      });

      const proposal = createProposal('crear_log', { asset_id: 'asset-1' });
      const result = await executeAction(proposal, 'operator-123');

      expect(result.status).toBe('executed');
      expect(result.result.success).toBe(false);
      expect(result.result.error).toBe('Error en handler con gate');
    });
  });

  describe('executeAction — casos borde', () => {
    it('proposal null → lanza TypeError (el código no maneja este caso)', async () => {
      vi.mocked(getTool).mockReturnValue(null);

      await expect(executeAction(null, 'operator-123')).rejects.toThrow(TypeError);
    });

    it('proposal undefined → lanza TypeError (el código no maneja este caso)', async () => {
      vi.mocked(getTool).mockReturnValue(null);

      await expect(executeAction(undefined, 'operator-123')).rejects.toThrow(TypeError);
    });

    it('operatorId null/undefined → no afecta ejecución', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolReadOnly);

      const proposal = createProposal('query_info', { query: 'test' });
      const result1 = await executeAction(proposal, null);
      const result2 = await executeAction(proposal, undefined);

      expect(result1.status).toBe('executed');
      expect(result2.status).toBe('executed');
    });
  });

  describe('getActionHistory — lectura de localStorage', () => {
    it('retorna historial desde localStorage', () => {
      const mockHistory = [
        { id: 'action_1', tool_name: 'crear_log', status: 'executed' },
        { id: 'action_2', tool_name: 'query_info', status: 'executed' },
      ];

      vi.mocked(globalThis.localStorage.getItem).mockReturnValue(JSON.stringify(mockHistory));

      const history = getActionHistory();

      expect(history).toEqual(mockHistory);
      expect(globalThis.localStorage.getItem).toHaveBeenCalledWith('chagra:action_audit_log');
    });

    it('localStorage vacío → retorna []', () => {
      vi.mocked(globalThis.localStorage.getItem).mockReturnValue('[]');

      const history = getActionHistory();

      expect(history).toEqual([]);
    });

    it('localStorage con JSON inválido → retorna []', () => {
      vi.mocked(globalThis.localStorage.getItem).mockReturnValue('invalid json');

      const history = getActionHistory();

      expect(history).toEqual([]);
    });

    it('respeto del parámetro limit', () => {
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `action_${i}`,
        tool_name: 'tool',
        status: 'executed',
      }));

      vi.mocked(globalThis.localStorage.getItem).mockReturnValue(JSON.stringify(largeHistory));

      const history10 = getActionHistory(10);
      const history50 = getActionHistory(50);

      expect(history10.length).toBe(10);
      expect(history50.length).toBe(50);
    });

    it('sin localStorage (e.g., Node.js) → retorna []', () => {
      delete globalThis.localStorage;

      const history = getActionHistory();

      expect(history).toEqual([]);
    });
  });

  describe('setActionGateCallback — registro de callback', () => {
    it('registra callback para UI gate', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        status: 'approved',
      });

      setActionGateCallback(mockCallback);
      vi.mocked(getTool).mockReturnValue(mockToolWithGate);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1' });
      await executeAction(proposal, 'operator-123');

      expect(mockCallback).toHaveBeenCalled();
    });

    it('callback null → desactiva gate', () => {
      setActionGateCallback(null);
      // No hay assertion directa, pero no debe fallar
      expect(() => setActionGateCallback(null)).not.toThrow();
    });

    it('callback undefined → desactiva gate', () => {
      setActionGateCallback(undefined);
      expect(() => setActionGateCallback(undefined)).not.toThrow();
    });
  });

  describe('logAuditTrail — integración con localStorage', () => {
    it('ejecución exitosa → escribe en localStorage', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolReadOnly);

      const proposal = createProposal('query_info', { query: 'test' });
      await executeAction(proposal, 'operator-123');

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'chagra:action_audit_log',
        expect.stringContaining('"status":"executed"')
      );
    });

    it('tool no encontrada → escribe en localStorage', async () => {
      vi.mocked(getTool).mockReturnValue(null);

      const proposal = createProposal('tool_inexistente', {});
      await executeAction(proposal, 'operator-123');

      expect(globalThis.localStorage.setItem).toHaveBeenCalled();
    });

    it('gate rechaza → escribe en localStorage', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolWithGate);

      const mockCallback = vi.fn().mockResolvedValue({
        status: 'rejected',
      });

      setActionGateCallback(mockCallback);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1' });
      await executeAction(proposal, 'operator-123');

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        'chagra:action_audit_log',
        expect.stringContaining('"status":"rejected"')
      );
    });
  });

  describe('logAuditTrail — integración con useAssetStore', () => {
    it('ejecución exitosa → llama addLog en el store', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolReadOnly);

      const proposal = createProposal('query_info', { query: 'test' });
      await executeAction(proposal, 'operator-123');

      expect(mockStore.addLog).toHaveBeenCalledWith(null, {
        type: 'log--observation',
        attributes: {
          notes: expect.stringContaining('Action executed: query_info'),
          metadata: {
            action_audit: expect.objectContaining({
              tool_name: 'query_info',
              status: 'executed',
            }),
          },
        },
      });
    });

    it('gate rechaza → llama addLog con status rejected', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolWithGate);

      const mockCallback = vi.fn().mockResolvedValue({
        status: 'rejected',
      });

      setActionGateCallback(mockCallback);

      const proposal = createProposal('crear_log', { asset_id: 'asset-1' });
      await executeAction(proposal, 'operator-123');

      expect(mockStore.addLog).toHaveBeenCalledWith(null, {
        type: 'log--observation',
        attributes: {
          notes: expect.stringContaining('rechazada'),
          metadata: expect.any(Object),
        },
      });
    });

    it('store.addLog falla → no rompe flujo principal', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolReadOnly);
      mockStore.addLog = vi.fn(() => { throw new Error('Store error'); });

      const proposal = createProposal('query_info', { query: 'test' });
      
      // No debe lanzar error
      await expect(executeAction(proposal, 'operator-123')).resolves.toBeDefined();
    });

    it('store sin addLog → no falla', async () => {
      vi.mocked(getTool).mockReturnValue(mockToolReadOnly);
      useAssetStore.getState = vi.fn(() => ({}));

      const proposal = createProposal('query_info', { query: 'test' });
      
      await expect(executeAction(proposal, 'operator-123')).resolves.toBeDefined();
    });
  });
});

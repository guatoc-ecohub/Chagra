/**
 * sidecarClient.multiturn.test.js — tests para grounding multi-turno
 * (task #multiturno-grounding-2026-06-19).
 *
 * Cobertura:
 * - Con historial que menciona "Castillo"/"2600 msnm"/"gota", la query de
 *   grounding construida incluye esos términos (no solo el último turno).
 * - Sin historial → la query es idéntica al comportamiento actual (retrocompat).
 * - Si el sidecar falla → fallback intacto (null, no throw).
 *
 * Aislamiento: vitest `vi.stubEnv` para `import.meta.env.VITE_*`, `vi.fn()`
 * sobre el global `fetch`. No requiere red real.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_FLAG = 'VITE_USE_SIDECAR_AGRO_MCP';
const ENV_URL = 'VITE_SIDECAR_URL';
const ENV_TOKEN = 'VITE_CHAGRA_MCP_TOKEN';

let fetchMock;
let originalOnLine;

const enableFlag = () => {
  vi.stubEnv(ENV_FLAG, 'true');
  vi.stubEnv(ENV_URL, '/api/mcp/agro');
  vi.stubEnv(ENV_TOKEN, 'test-token-123');
};

const importFresh = async () => {
  vi.resetModules();
  return import('../sidecarClient.js');
};

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  originalOnLine = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
});

describe('sidecarClient — grounding multi-turno', () => {
  beforeEach(() => {
    enableFlag();
  });

  describe('resolveEntities con contexto multi-turno', () => {
    it('con historial que menciona "Castillo"/"2600 msnm"/"gota" → query enriquecida', async () => {
      const historial = `
Conversación previa:
Usuario: Tengo café variedad Castillo a 2600 msnm
Asistente: El Castillo es una variedad de Coffea arabica...
Usuario: Me está cayendo por gota
Asistente: La gota es...
`;
      const mensajeActual = '¿Qué hago?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
      const { resolveEntities } = await importFresh();
      await resolveEntities(mensajeActual, { fincaAltitud: 2600, context: historial });
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/resolve-entities');
      
      const body = JSON.parse(opts.body);
      // Verificar que la query enriquecida incluye el historial
      expect(body.user_message).toContain('Conversación previa:');
      expect(body.user_message).toContain('Castillo');
      expect(body.user_message).toContain('2600 msnm');
      expect(body.user_message).toContain('gota');
      expect(body.user_message).toContain('Mensaje actual: ¿Qué hago?');
    });

    it('sin historial → query idéntica al comportamiento actual (retrocompat)', async () => {
      const mensajeActual = '¿Qué le pongo a la maracuyá?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
      const { resolveEntities } = await importFresh();
      
      // Sin parámetro context (comportamiento legacy)
      await resolveEntities(mensajeActual);
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      
      // La query debe ser SOLO el mensaje actual (sin enriquecer)
      expect(body.user_message).toBe(mensajeActual);
      expect(body.user_message).not.toContain('Conversación previa:');
      expect(body.user_message).not.toContain('Mensaje actual:');
    });

    it('con context vacío → comportamiento idéntico a sin context', async () => {
      const mensajeActual = '¿Cómo siembro la tomate?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
      const { resolveEntities } = await importFresh();
      
      // Context vacío (string vacío)
      await resolveEntities(mensajeActual, { context: '' });
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      
      // La query debe ser SOLO el mensaje actual (context vacío se ignora)
      expect(body.user_message).toBe(mensajeActual);
    });

    it('sidecar falla (5xx) → fallback intacto (null, no throw)', async () => {
      const historial = 'Conversación previa:\nUsuario: Café Castillo a 2600 msnm\n';
      const mensajeActual = '¿Qué hago con la gota?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'sidecar down' }));
      const { resolveEntities } = await importFresh();
      
      // No debe lanzar excepción
      const result = await resolveEntities(mensajeActual, { context: historial });
      
      // Fallback intacto: null (no { entities: [] })
      expect(result).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('sidecar timeout → fallback intacto (null, no throw)', async () => {
      const historial = 'Conversación previa:\nUsuario: Café Castillo\n';
      const mensajeActual = '¿Qué hago?';
      
      // Simular timeout (fetch rechaza con AbortError)
      fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
      const { resolveEntities } = await importFresh();
      
      // No debe lanzar excepción
      const result = await resolveEntities(mensajeActual, { context: historial });
      
      // Fallback intacto: null
      expect(result).toBeNull();
    });

    it('offline → fallback intacto (null, sin fetch)', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      
      const historial = 'Conversación previa:\nUsuario: Café Castillo\n';
      const mensajeActual = '¿Qué hago?';
      
      const { resolveEntities } = await importFresh();
      const result = await resolveEntities(mensajeActual, { context: historial });
      
      // Offline → null sin hacer fetch
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('feature flag off → null sin fetch (retrocompat)', async () => {
      vi.stubEnv(ENV_FLAG, 'false');
      
      const historial = 'Conversación previa:\nUsuario: Café Castillo\n';
      const mensajeActual = '¿Qué hago?';
      
      const { resolveEntities } = await importFresh();
      const result = await resolveEntities(mensajeActual, { context: historial });
      
      // Flag off → null sin hacer fetch
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('userMessage vacío → null sin fetch (validación de entrada)', async () => {
      const historial = 'Conversación previa:\nUsuario: Café Castillo\n';
      
      const { resolveEntities } = await importFresh();
      
      // userMessage vacío → null sin fetch
      expect(await resolveEntities('', { context: historial })).toBeNull();
      expect(await resolveEntities(null, { context: historial })).toBeNull();
      expect(await resolveEntities(undefined, { context: historial })).toBeNull();
      
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('combinación de context + fincaAltitud → ambos parámetros en el request', async () => {
      const historial = `
Conversación previa:
Usuario: Tengo gulupa
Asistente: La gulupa es...
`;
      const mensajeActual = '¿A qué altitud la siembro?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
      const { resolveEntities } = await importFresh();
      
      await resolveEntities(mensajeActual, { 
        fincaAltitud: 2400, 
        context: historial 
      });
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      
      // Verificar que ambos parámetros están presentes
      expect(body.user_message).toContain('Conversación previa:');
      expect(body.user_message).toContain('gulupa');
      expect(body.finca_altitud).toBe(2400);
    });
  });

  describe('resolveEntities — formato del contexto', () => {
    it('context con múltiples turnos → todos se incluyen en la query', async () => {
      const historial = `
Conversación previa:
Usuario: Tengo café Castillo a 2600 msnm
Asistente: El Castillo es una variedad resistente...
Usuario: Le salió gota
Asistente: Para la gota...
Usuario: Y también mancha ojo
Asistente: La mancha ojo es...
`;
      const mensajeActual = '¿Qué fungicida me recomienda?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
      const { resolveEntities } = await importFresh();
      
      await resolveEntities(mensajeActual, { context: historial });
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      
      // Todos los turnos deben estar presentes
      expect(body.user_message).toContain('Castillo');
      expect(body.user_message).toContain('2600 msnm');
      expect(body.user_message).toContain('gota');
      expect(body.user_message).toContain('mancha ojo');
      expect(body.user_message).toContain('Mensaje actual:');
    });

    it('context con solo turnos de usuario → se respetan tal cual', async () => {
      const historial = `
Usuario: Café Castillo a 2600 msnm
Usuario: Le salió gota
Usuario: Y mancha ojo
`;
      const mensajeActual = '¿Qué hago?';
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
      const { resolveEntities } = await importFresh();
      
      await resolveEntities(mensajeActual, { context: historial });
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      
      // El formato debe respetarse (aunque sea atípico)
      expect(body.user_message).toContain('Café Castillo');
      expect(body.user_message).toContain('gota');
      expect(body.user_message).toContain('mancha ojo');
    });
  });
});

/**
 * @vitest-environment jsdom
 */

/* eslint-disable no-undef */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureExchange, isCaptureEnabled } from '../conversationCaptureService';

describe('conversationCaptureService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', '');
    vi.stubEnv('VITE_SIDECAR_URL', '/api/mcp/agro');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('queda desactivado por defecto', () => {
    expect(isCaptureEnabled()).toBe(false);
  });

  it('no llama al endpoint cuando la flag está apagada', () => {
    captureExchange({
      userText: 'hola',
      agentText: 'buenas',
      identity: { user_id: 'u1', user_name: 'Ana', finca_id: 'f1' },
      meta: { session_id: 's1', turn_index: 1, nlu_route: 'chat', entities_grounded: [], grounding_used: false, guards_fired: [], latency_ms: 42, model: 'm1' },
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('con flag ON, postea usuario y agente con el shape esperado', () => {
    vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');

    captureExchange({
      userText: 'hola',
      agentText: 'buenas',
      identity: { user_id: 'u1', user_name: 'Ana', finca_id: 'f1' },
      meta: {
        session_id: 's1',
        turn_index: 3,
        nlu_route: 'chat',
        entities_grounded: ['ent-1'],
        grounding_used: true,
        guards_fired: ['guard-a'],
        latency_ms: 123,
        model: 'model-x',
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);

    const [firstUrl, firstOpts] = global.fetch.mock.calls[0];
    const [secondUrl, secondOpts] = global.fetch.mock.calls[1];

    for (const [url, opts, role, text] of [
      [firstUrl, firstOpts, 'user', 'hola'],
      [secondUrl, secondOpts, 'agent', 'buenas'],
    ]) {
      expect(url).toBe('/api/mcp/agro/log-conversation');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token');

      const body = JSON.parse(opts.body);
      expect(body.role).toBe(role);
      expect(body.text).toBe(text);
      expect(body.user_id).toBe('u1');
      expect(body.user_name).toBe('Ana');
      expect(body.finca_id).toBe('f1');
      expect(body.session_id).toBe('s1');
      expect(body.turn_index).toBe(3);
      expect(body.nlu_route).toBe('chat');
      expect(body.entities_grounded).toEqual(['ent-1']);
      expect(body.grounding_used).toBe(true);
      expect(body.guards_fired).toEqual(['guard-a']);
      expect(body.latency_ms).toBe(123);
      expect(body.model).toBe('model-x');
      expect(typeof body.id).toBe('string');
      expect(typeof body.ts).toBe('number');
    }
  });
});

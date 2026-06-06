/**
 * @vitest-environment jsdom
 */

/* eslint-disable no-undef */

/**
 * conversationCaptureService.test.js — captura server-side de conversaciones
 * del agente (task #CHAT-CAPTURE).
 *
 * `captureExchange` es fire-and-forget: gated por VITE_CAPTURE_CONVERSATIONS +
 * consentimiento del usuario (hasConsent del feedbackService). NUNCA lanza ni
 * bloquea la UX del chat, y POSTea el turno (pregunta + respuesta + grounding)
 * a `${base}/log-conversation` con header X-Chagra-Token. Estos tests verifican:
 *   - gate: con la flag OFF NO se llama a fetch.
 *   - gate: con la flag ON pero SIN consentimiento NO se llama a fetch.
 *   - gate: con la flag ON + consentimiento SÍ se llama a fetch.
 *   - schema del payload (textos, identidad, meta) + header de auth.
 *   - turnos vacíos no se envían.
 *   - anonimización PII: con VITE_CAPTURE_ANONYMIZE=true se omiten user_name y
 *     finca_nombre (Habeas Data).
 *   - falla silenciosa (fetch rechaza → no throw).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureExchange, isCaptureEnabled, shouldAnonymizePII } from '../conversationCaptureService';
import * as feedbackService from '../feedbackService';

describe('conversationCaptureService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', '');
    vi.stubEnv('VITE_CAPTURE_ANONYMIZE', '');
    vi.stubEnv('VITE_SIDECAR_URL', '/api/mcp/agro');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'test-token');
    // Mockear hasConsent para que devuelva true por defecto en los tests
    vi.spyOn(feedbackService, 'hasConsent').mockReturnValue(true);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isCaptureEnabled (gate)', () => {
    it('OFF por defecto (flag vacía)', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', '');
      expect(isCaptureEnabled()).toBe(false);
    });

    it('reconoce "true"/"1"/"on" como ON', () => {
      for (const v of ['true', '1', 'on', 'TRUE', 'On']) {
        vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', v);
        expect(isCaptureEnabled()).toBe(true);
      }
    });

    it('cualquier otro valor es OFF', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'false');
      expect(isCaptureEnabled()).toBe(false);
    });
  });

  describe('shouldAnonymizePII (Habeas Data)', () => {
    it('OFF por defecto (flag vacía)', () => {
      vi.stubEnv('VITE_CAPTURE_ANONYMIZE', '');
      expect(shouldAnonymizePII()).toBe(false);
    });

    it('reconoce "true"/"1"/"on" como ON', () => {
      for (const v of ['true', '1', 'on', 'TRUE', 'On']) {
        vi.stubEnv('VITE_CAPTURE_ANONYMIZE', v);
        expect(shouldAnonymizePII()).toBe(true);
      }
    });

    it('cualquier otro valor es OFF', () => {
      vi.stubEnv('VITE_CAPTURE_ANONYMIZE', 'false');
      expect(shouldAnonymizePII()).toBe(false);
    });
  });

  describe('captureExchange', () => {
    it('NO envía nada cuando la flag está OFF', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', '');
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('NO envía nada cuando la flag está ON pero NO hay consentimiento', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      vi.spyOn(feedbackService, 'hasConsent').mockReturnValue(false);
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('NO envía turnos vacíos aunque la flag esté ON', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      captureExchange({ userText: '', agentText: '' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('SÍ envía cuando la flag está ON + hay consentimiento', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      vi.spyOn(feedbackService, 'hasConsent').mockReturnValue(true);
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('con la flag ON, POSTea a /log-conversation con token + schema', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      captureExchange({
        userText: '¿compañeros del café?',
        agentText: 'guamo, plátano',
        identity: {
          user_id: 'op-3',
          user_name: 'MonkeyD.Free',
          finca_slug: 'finca-free',
          finca_nombre: 'Finca de Free',
        },
        meta: {
          session_id: 'op-3',
          turn_index: 2,
          nlu_route: 'chat',
          entities_grounded: ['coffea_arabica'],
          guards_fired: [],
          grounded_status: 'Agrosavia',
          latency_ms: 980,
          model: 'granite3.1-dense:8b',
        },
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/log-conversation');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token');

      const body = JSON.parse(opts.body);
      expect(body.user_text).toBe('¿compañeros del café?');
      expect(body.agent_text).toBe('guamo, plátano');
      expect(body.user_id).toBe('op-3');
      expect(body.user_name).toBe('MonkeyD.Free');
      expect(body.finca_slug).toBe('finca-free');
      expect(body.session_id).toBe('op-3');
      expect(body.turn_index).toBe(2);
      expect(body.entities_grounded).toEqual(['coffea_arabica']);
      expect(body.guards_fired).toEqual([]);
      expect(body.grounded_status).toBe('Agrosavia');
      expect(body.latency_ms).toBe(980);
      expect(body.model).toBe('granite3.1-dense:8b');
      // Sello cliente + id ulid presentes.
      expect(typeof body.id).toBe('string');
      expect(typeof body.ts).toBe('number');
    });

    it('con VITE_CAPTURE_ANONYMIZE=true, omite user_name y finca_nombre (Habeas Data)', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      vi.stubEnv('VITE_CAPTURE_ANONYMIZE', 'true');
      captureExchange({
        userText: '¿compañeros del café?',
        agentText: 'guamo, plátano',
        identity: {
          user_id: 'op-3',
          user_name: 'MonkeyD.Free',
          finca_slug: 'finca-free',
          finca_nombre: 'Finca de Free',
        },
        meta: {
          session_id: 'op-3',
          turn_index: 2,
          nlu_route: 'chat',
          entities_grounded: ['coffea_arabica'],
          guards_fired: [],
          grounded_status: 'Agrosavia',
          latency_ms: 980,
          model: 'granite3.1-dense:8b',
        },
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      // PII anonimizado
      expect(body.user_name).toBeNull();
      expect(body.finca_nombre).toBeNull();
      // IDs conservados para análisis agregados
      expect(body.user_id).toBe('op-3');
      expect(body.finca_slug).toBe('finca-free');
      // Resto del payload intacto
      expect(body.user_text).toBe('¿compañeros del café?');
      expect(body.agent_text).toBe('guamo, plátano');
    });

    it('tolera identity/meta ausentes (null/[] defaults)', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.user_id).toBeNull();
      expect(body.user_name).toBeNull();
      expect(body.entities_grounded).toEqual([]);
      expect(body.guards_fired).toEqual([]);
      expect(body.latency_ms).toBeNull();
    });

    it('falla en silencio si fetch rechaza (no throw, no rompe el chat)', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
      expect(() =>
        captureExchange({ userText: 'x', agentText: 'y' }),
      ).not.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});

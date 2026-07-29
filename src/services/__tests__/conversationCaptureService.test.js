/**
 * @vitest-environment jsdom
 */

/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureExchange, isCaptureEnabled, isConsentRequired, shouldAnonymizePII } from '../conversationCaptureService';
import * as feedbackService from '../feedbackService';

const waitForFetchCalls = async (count) => {
  for (let i = 0; i < 20 && vi.mocked(global.fetch).mock.calls.length < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(global.fetch).toHaveBeenCalledTimes(count);
};

describe('conversationCaptureService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', '');
    vi.stubEnv('VITE_CAPTURE_ANONYMIZE', '');
    vi.stubEnv('VITE_SIDECAR_URL', '/api/mcp/agro');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'test-token');
    vi.spyOn(feedbackService, 'hasConsent').mockReturnValue(true);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isCaptureEnabled', () => {
    it('queda OFF por defecto', () => {
      expect(isCaptureEnabled()).toBe(false);
    });

    it('reconoce true/1/on como ON', () => {
      for (const v of ['true', '1', 'on', 'TRUE', 'On']) {
        vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', v);
        expect(isCaptureEnabled()).toBe(true);
      }
    });

    it('cualquier otro valor queda OFF', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'false');
      expect(isCaptureEnabled()).toBe(false);
    });
  });

  describe('shouldAnonymizePII', () => {
    it('queda OFF por defecto', () => {
      expect(shouldAnonymizePII()).toBe(false);
    });

    it('reconoce true/1/on como ON', () => {
      for (const v of ['true', '1', 'on', 'TRUE', 'On']) {
        vi.stubEnv('VITE_CAPTURE_ANONYMIZE', v);
        expect(shouldAnonymizePII()).toBe(true);
      }
    });
  });

  describe('isConsentRequired', () => {
    it('exige consentimiento por defecto (privacy-first)', () => {
      expect(isConsentRequired()).toBe(true);
    });

    it('reconoce false/0/off como NO-exigir (modo piloto)', () => {
      for (const v of ['false', '0', 'off', 'FALSE', 'Off']) {
        vi.stubEnv('VITE_CAPTURE_REQUIRE_CONSENT', v);
        expect(isConsentRequired()).toBe(false);
      }
    });

    it('cualquier otro valor sigue exigiendo consentimiento', () => {
      vi.stubEnv('VITE_CAPTURE_REQUIRE_CONSENT', 'true');
      expect(isConsentRequired()).toBe(true);
    });
  });

  describe('captureExchange', () => {
    it('no envía nada cuando la flag está OFF', () => {
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('no envía nada cuando la flag está ON pero no hay consentimiento', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      vi.spyOn(feedbackService, 'hasConsent').mockReturnValue(false);
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('MODO PILOTO: con REQUIRE_CONSENT=false captura aunque no haya consentimiento', async () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      vi.stubEnv('VITE_CAPTURE_REQUIRE_CONSENT', 'false');
      vi.spyOn(feedbackService, 'hasConsent').mockReturnValue(false);
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      await waitForFetchCalls(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('no envía turnos vacíos aunque la flag esté ON', () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      captureExchange({ userText: '', agentText: '' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('con flag ON y consentimiento, postea a /log-conversation con token y schema', async () => {
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

      await waitForFetchCalls(1);
      const [url, opts] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe('/api/mcp/agro/log-conversation');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token');

      const body = JSON.parse(/** @type {string} */ (opts.body));
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
      expect(typeof body.id).toBe('string');
      expect(typeof body.ts).toBe('number');
    });

    it('con VITE_CAPTURE_ANONYMIZE=true omite user_name y finca_nombre', async () => {
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
      });

      await waitForFetchCalls(1);
      const body = JSON.parse(/** @type {string} */ (vi.mocked(global.fetch).mock.calls[0][1].body));
      expect(body.user_name).toBeNull();
      expect(body.finca_nombre).toBeNull();
      expect(body.user_id).toBe('op-3');
      expect(body.finca_slug).toBe('finca-free');
    });

    it('tolera identity/meta ausentes', async () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      captureExchange({ userText: 'hola', agentText: 'buenas' });
      await waitForFetchCalls(1);
      const body = JSON.parse(/** @type {string} */ (vi.mocked(global.fetch).mock.calls[0][1].body));
      expect(body.user_id).toBeNull();
      expect(body.user_name).toBeNull();
      expect(body.entities_grounded).toEqual([]);
      expect(body.guards_fired).toEqual([]);
      expect(body.latency_ms).toBeNull();
    });

    it('falla en silencio si fetch rechaza', async () => {
      vi.stubEnv('VITE_CAPTURE_CONVERSATIONS', 'true');
      global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
      expect(() => captureExchange({ userText: 'x', agentText: 'y' })).not.toThrow();
      await waitForFetchCalls(1);
    });
  });
});

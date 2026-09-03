/* global global */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    generateCodeVerifier,
    generateCodeChallenge,
    initiateAuthorizationCodeFlow,
    exchangeCodeForToken,
    authenticateUser,
    generateOAuthState,
    handleOAuthCallback,
    getAccessToken,
    getLastRefreshFailureReason,
    refreshAccessToken,
} from '../authService';

// Mock localforage
vi.mock('localforage', () => ({
    default: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
    },
}));

import localforage from 'localforage';

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
    writable: true,
    value: mockLocation,
});

describe('authService — OAuth PKCE flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.href = '';
    });

    describe('generateCodeVerifier', () => {
        it('genera un code_verifier válido (43-128 caracteres)', () => {
            const verifier = generateCodeVerifier();
            expect(verifier).toBeTruthy();
            expect(verifier.length).toBeGreaterThanOrEqual(43);
            expect(verifier.length).toBeLessThanOrEqual(128);
            // Solo caracteres base64url válidos
            expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('genera valores únicos en cada llamada', () => {
            const verifier1 = generateCodeVerifier();
            const verifier2 = generateCodeVerifier();
            expect(verifier1).not.toBe(verifier2);
        });
    });

    describe('generateCodeChallenge', () => {
        it('genera un code_challenge válido SHA256 base64url', async () => {
            const verifier = 'test_verifier_123';
            const challenge = await generateCodeChallenge(verifier);
            
            expect(challenge).toBeTruthy();
            expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
            // No debe tener padding (=)
            expect(challenge).not.toContain('=');
        });

        it('produce el mismo challenge para el mismo verifier', async () => {
            const verifier = 'consistent_verifier';
            const challenge1 = await generateCodeChallenge(verifier);
            const challenge2 = await generateCodeChallenge(verifier);
            
            expect(challenge1).toBe(challenge2);
        });
    });

    describe('generateOAuthState', () => {
        it('genera un state válido para CSRF protection', () => {
            const state = generateOAuthState();
            
            expect(state).toBeTruthy();
            expect(state.length).toBeGreaterThan(0);
            expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('genera valores únicos en cada llamada', () => {
            const state1 = generateOAuthState();
            const state2 = generateOAuthState();
            expect(state1).not.toBe(state2);
        });
    });

    describe('initiateAuthorizationCodeFlow', () => {
        it('guarda code_verifier y state en localforage', async () => {
            const testState = 'test_state_123';
            
            await initiateAuthorizationCodeFlow(testState);
            
            expect(localforage.setItem).toHaveBeenCalledWith('oauth_code_verifier', expect.any(String));
            expect(localforage.setItem).toHaveBeenCalledWith('oauth_state', testState);
        });

        it('redirige a la URL de autorización correcta', async () => {
            const testState = 'test_state_456';

            await initiateAuthorizationCodeFlow(testState);

            expect(mockLocation.href.length).toBeGreaterThan(0);
            const redirectUrl = mockLocation.href;
            expect(redirectUrl).toContain('/oauth/authorize');
            expect(redirectUrl).toContain('response_type=code');
            expect(redirectUrl).toContain('code_challenge=');
            expect(redirectUrl).toContain('code_challenge_method=S256');
            expect(redirectUrl).toContain(`state=${testState}`);
        });
    });

    describe('exchangeCodeForToken', () => {
        beforeEach(() => {
            // Mock fetch global
            global.fetch = vi.fn();
        });

        it('intercambia código por token exitosamente', async () => {
            const mockCode = 'auth_code_123';
            const mockState = 'state_123';
            const mockVerifier = 'verifier_abc';

            /** @type {import('vitest').Mock} */ (localforage.getItem).mockImplementation((key) => {
                if (key === 'oauth_state') return mockState;
                if (key === 'oauth_code_verifier') return mockVerifier;
                return null;
            });

            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({
                    get: (name) => name === 'content-type' ? 'application/json' : null,
                })),
                json: async () => ({
                    access_token: 'token_xyz',
                    refresh_token: 'refresh_xyz',
                    expires_in: 3600,
                }),
            })));

            const result = await exchangeCodeForToken(mockCode, mockState);

            expect(result.success).toBe(true);
            expect(localforage.setItem).toHaveBeenCalledWith('farmos_access_token', 'token_xyz');
            expect(localforage.setItem).toHaveBeenCalledWith('farmos_refresh_token', 'refresh_xyz');
            expect(localforage.removeItem).toHaveBeenCalledWith('oauth_code_verifier');
            expect(localforage.removeItem).toHaveBeenCalledWith('oauth_state');
        });

        it('rechaza states que no coinciden (CSRF protection)', async () => {
            const mockCode = 'auth_code_123';
            const mockState = 'state_123';
            const differentState = 'state_different';

            /** @type {import('vitest').Mock} */ (localforage.getItem).mockImplementation((key) => {
                if (key === 'oauth_state') return differentState;
                return null;
            });

            const result = await exchangeCodeForToken(mockCode, mockState);

            expect(result.success).toBe(false);
            expect(result.error).toContain('State inválido');
        });

        it('falla si no hay code_verifier', async () => {
            const mockCode = 'auth_code_123';
            const mockState = 'state_123';

            /** @type {import('vitest').Mock} */ (localforage.getItem).mockImplementation((key) => {
                if (key === 'oauth_state') return mockState;
                if (key === 'oauth_code_verifier') return null;
                return null;
            });

            const result = await exchangeCodeForToken(mockCode, mockState);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Code verifier no encontrado');
        });

        it('maneja errores de red', async () => {
            const mockCode = 'auth_code_123';
            const mockState = 'state_123';
            const mockVerifier = 'verifier_abc';

            /** @type {import('vitest').Mock} */ (localforage.getItem).mockImplementation((key) => {
                if (key === 'oauth_state') return mockState;
                if (key === 'oauth_code_verifier') return mockVerifier;
                return null;
            });

            vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

            const result = await exchangeCodeForToken(mockCode, mockState);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        it('maneja respuestas no-JSON del servidor', async () => {
            const mockCode = 'auth_code_123';
            const mockState = 'state_123';
            const mockVerifier = 'verifier_abc';

            /** @type {import('vitest').Mock} */ (localforage.getItem).mockImplementation((key) => {
                if (key === 'oauth_state') return mockState;
                if (key === 'oauth_code_verifier') return mockVerifier;
                return null;
            });

            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({
                    get: (name) => name === 'content-type' ? 'text/html' : null,
                })),
            })));

            const result = await exchangeCodeForToken(mockCode, mockState);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Backend FarmOS no disponible');
        });
    });

    describe('authenticateUser (Password Grant - DEPRECATED)', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
        });

        it('autentica exitosamente con password grant (legacy)', async () => {
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({
                    get: (name) => name === 'content-type' ? 'application/json' : null,
                })),
                json: async () => ({
                    access_token: 'token_legacy',
                    refresh_token: 'refresh_legacy',
                    expires_in: 3600,
                }),
            })));

            const result = await authenticateUser('testuser', 'testpass');

            expect(result.success).toBe(true);
            expect(result.deprecation).toContain('Password Grant será removido');
            expect(localforage.setItem).toHaveBeenCalledWith('farmos_access_token', 'token_legacy');
        });

        it('maneja credenciales inválidas', async () => {
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: false,
                status: 401,
            })));

            const result = await authenticateUser('testuser', 'wrongpass');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Error de Autenticación');
        });

        it('maneja errores de red', async () => {
            vi.mocked(global.fetch).mockRejectedValue(new Error('Connection failed'));

            const result = await authenticateUser('testuser', 'testpass');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Connection failed');
        });
    });

    describe('handleOAuthCallback', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
        });

        it('procesa callback exitoso', async () => {
            const mockCode = 'code_123';
            const mockState = 'state_123';
            const mockVerifier = 'verifier_abc';

            /** @type {import('vitest').Mock} */ (localforage.getItem).mockImplementation((key) => {
                if (key === 'oauth_state') return mockState;
                if (key === 'oauth_code_verifier') return mockVerifier;
                return null;
            });

            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({
                    get: (name) => name === 'content-type' ? 'application/json' : null,
                })),
                json: async () => ({
                    access_token: 'token_callback',
                    refresh_token: 'refresh_callback',
                    expires_in: 3600,
                }),
            })));

            const params = new URLSearchParams({
                code: mockCode,
                state: mockState,
            });

            const result = await handleOAuthCallback(params);

            expect(result.success).toBe(true);
        });

        it('maneja error en callback', async () => {
            const params = new URLSearchParams({
                error: 'access_denied',
                error_description: 'User denied access',
            });

            const result = await handleOAuthCallback(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('User denied access');
        });

        it('rechaza callback sin código', async () => {
            const params = new URLSearchParams({
                state: 'state_123',
            });

            const result = await handleOAuthCallback(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Parámetros inválidos');
        });

        it('rechaza callback sin state', async () => {
            const params = new URLSearchParams({
                code: 'code_123',
            });

            const result = await handleOAuthCallback(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Parámetros inválidos');
        });
    });

    // Red de seguridad: la fecha de deprecación del password grant se movió a
    // 2026-09-25. Mientras no pase esa fecha, el password grant DEBE seguir
    // funcionando como fallback aunque ya estemos después del 2026-06-25
    // original. Estos tests usan fake timers para fijar "ahora".
    describe('red de seguridad: deprecación password grant', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('password grant SIGUE vivo el 2026-07-01 (después del corte original 06-25)', async () => {
            vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));

            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: (n) => (n === 'content-type' ? 'application/json' : null) })),
                json: async () => ({ access_token: 't', refresh_token: 'r', expires_in: 3600 }),
            })));

            const result = await authenticateUser('u', 'p');
            // NO debe retornar el error "ha sido removido": el grant sigue activo.
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    // Cura del bug "sesión zombi" (operador 2026-06-18): el access token dura
    // 1h; antes, al vencer, getAccessToken hacía logout y devolvía null sin
    // usar NUNCA el refresh_token. Ahora renueva en silencio.
    // ──────────────────────────────────────────────────────────────────────
    describe('refreshAccessToken (renovación silenciosa)', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
            // navigator.onLine = true por defecto en jsdom; lo dejamos así.
        });

        it('devuelve null si no hay refresh_token guardado (no llama al backend)', async () => {
            vi.mocked(localforage.getItem).mockResolvedValue(null); // sin refresh_token
            const result = await refreshAccessToken();
            expect(result).toBeNull();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('usa grant_type=refresh_token y persiste el access + refresh nuevos', async () => {
            vi.mocked(localforage.getItem).mockResolvedValue('refresh-viejo');
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: (n) => (n === 'content-type' ? 'application/json' : null) })),
                json: async () => ({ access_token: 'access-nuevo', refresh_token: 'refresh-nuevo', expires_in: 3600 }),
            })));

            const result = await refreshAccessToken();
            expect(result).toBe('access-nuevo');

            // El body del fetch debe ser un refresh_token grant.
            const body = vi.mocked(global.fetch).mock.calls[0][1].body;
            expect(body).toContain('grant_type=refresh_token');
            expect(body).toContain('refresh_token=refresh-viejo');

            // Persiste el access nuevo y rota el refresh.
            expect(localforage.setItem).toHaveBeenCalledWith('farmos_access_token', 'access-nuevo');
            expect(localforage.setItem).toHaveBeenCalledWith('farmos_refresh_token', 'refresh-nuevo');
        });

        it('devuelve null si el backend rechaza el refresh (400/401)', async () => {
            vi.mocked(localforage.getItem).mockResolvedValue('refresh-vencido');
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: false,
                status: 400,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: () => null })),
                text: async () => 'invalid_grant',
            })));
            const result = await refreshAccessToken();
            expect(result).toBeNull();
            expect(getLastRefreshFailureReason()).toBe('rejected');
        });

        it('devuelve null y marca rejected si el backend rechaza el refresh con 403', async () => {
            vi.mocked(localforage.getItem).mockResolvedValue('refresh-vencido');
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: false,
                status: 403,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: () => null })),
                text: async () => 'forbidden',
            })));
            const result = await refreshAccessToken();
            expect(result).toBeNull();
            expect(getLastRefreshFailureReason()).toBe('rejected');
        });

        it('devuelve null (sin lanzar) si la red falla', async () => {
            vi.mocked(localforage.getItem).mockResolvedValue('refresh-x');
            vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
            await expect(refreshAccessToken()).resolves.toBeNull();
            expect(getLastRefreshFailureReason()).toBe('network');
        });

        it('serializa refresh concurrente y comparte una sola llamada al backend', async () => {
            vi.mocked(localforage.getItem).mockResolvedValue('refresh-serial');
            vi.mocked(global.fetch).mockImplementation(() => new Promise((resolve) => {
                setTimeout(() => resolve(/** @type {any} */ ({
                    ok: true,
                    status: 200,
                    headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: (n) => (n === 'content-type' ? 'application/json' : null) })),
                    json: async () => ({
                        access_token: 'access-serial',
                        refresh_token: 'refresh-serial-2',
                        expires_in: 3600,
                    }),
                })), 5);
            }));

            const [a, b] = await Promise.all([
                refreshAccessToken(),
                refreshAccessToken(),
            ]);

            expect(a).toBe('access-serial');
            expect(b).toBe('access-serial');
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(localforage.setItem).toHaveBeenCalledWith('farmos_refresh_token', 'refresh-serial-2');
        });
    });

    describe('getAccessToken — renueva en vez de quedar zombi', () => {
        beforeEach(() => {
            global.fetch = vi.fn();
        });

        it('si el token está vigente lo devuelve sin renovar', async () => {
            vi.mocked(localforage.getItem).mockImplementation((k) => {
                if (k === 'farmos_access_token') return Promise.resolve('vigente');
                if (k === 'farmos_token_expiry') return Promise.resolve(Date.now() + 60_000);
                return Promise.resolve(null);
            });
            const t = await getAccessToken();
            expect(t).toBe('vigente');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('si el token venció PERO el refresh funciona, devuelve el token renovado (NO logout)', async () => {
            vi.mocked(localforage.getItem).mockImplementation((k) => {
                if (k === 'farmos_access_token') return Promise.resolve('vencido');
                if (k === 'farmos_token_expiry') return Promise.resolve(Date.now() - 1000);
                if (k === 'farmos_refresh_token') return Promise.resolve('refresh-ok');
                return Promise.resolve(null);
            });
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: true,
                status: 200,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: (n) => (n === 'content-type' ? 'application/json' : null) })),
                json: async () => ({ access_token: 'renovado', refresh_token: 'r2', expires_in: 3600 }),
            })));

            const t = await getAccessToken();
            expect(t).toBe('renovado'); // el operador NO ve "sesión expiró"
            // No debe haber borrado tokens (no logout).
            expect(localforage.removeItem).not.toHaveBeenCalledWith('farmos_access_token');
        });

        it('si venció y el refresh está muerto (online), hace logout limpio y devuelve null', async () => {
            vi.mocked(localforage.getItem).mockImplementation((k) => {
                if (k === 'farmos_access_token') return Promise.resolve('vencido');
                if (k === 'farmos_token_expiry') return Promise.resolve(Date.now() - 1000);
                if (k === 'farmos_refresh_token') return Promise.resolve('refresh-muerto');
                return Promise.resolve(null);
            });
            vi.mocked(global.fetch).mockResolvedValue(/** @type {Response} */ (/** @type {unknown} */ ({
                ok: false,
                status: 400,
                headers: /** @type {Headers} */ (/** @type {unknown} */ ({ get: () => null })),
                text: async () => 'invalid_grant',
            })));

            const t = await getAccessToken();
            expect(t).toBeNull();
            // Logout limpio: borra el access token (no deja estado zombi).
            expect(localforage.removeItem).toHaveBeenCalledWith('farmos_access_token');
        });

        it('si venció pero el refresh falla por red, no borra tokens', async () => {
            vi.mocked(localforage.getItem).mockImplementation((k) => {
                if (k === 'farmos_access_token') return Promise.resolve('vencido');
                if (k === 'farmos_token_expiry') return Promise.resolve(Date.now() - 1000);
                if (k === 'farmos_refresh_token') return Promise.resolve('refresh-ok');
                return Promise.resolve(null);
            });
            vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

            const t = await getAccessToken();
            expect(t).toBeNull();
            expect(getLastRefreshFailureReason()).toBe('network');
            expect(localforage.removeItem).not.toHaveBeenCalledWith('farmos_access_token');
            expect(localforage.removeItem).not.toHaveBeenCalledWith('farmos_refresh_token');
        });
    });
});

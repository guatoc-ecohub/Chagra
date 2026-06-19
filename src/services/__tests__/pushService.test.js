/* global global */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { fetchWithAuthRetry } = vi.hoisted(() => ({
    fetchWithAuthRetry: vi.fn((...args) => global.fetch(...args)),
}));

vi.mock('../apiService.js', () => ({
    fetchWithAuthRetry,
}));

import {
    isPushSupported,
    isSubscribed,
    permissionStatus,
    requestPermission,
    subscribePush,
    unsubscribePush,
    getLocalSubscriptionInfo,
} from '../pushService';

describe('pushService — Web Push API subscription management', () => {
    let mockLocalStorage;
    let mockNotification;
    let mockServiceWorkerRegistration;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {
            store: {},
            getItem: vi.fn((key) => mockLocalStorage.store[key] || null),
            setItem: vi.fn((key, value) => { mockLocalStorage.store[key] = value; }),
            removeItem: vi.fn((key) => { delete mockLocalStorage.store[key]; }),
        };
        vi.stubGlobal('localStorage', mockLocalStorage);

        // Mock Notification
        mockNotification = {
            permission: 'default',
            requestPermission: vi.fn().mockResolvedValue('granted'),
        };
        vi.stubGlobal('Notification', mockNotification);

        // Mock serviceWorker y PushManager
        mockServiceWorkerRegistration = {
            pushManager: {
                getSubscription: vi.fn().mockResolvedValue(null),
                subscribe: vi.fn(),
            },
        };

        vi.stubGlobal('navigator', {
            serviceWorker: {
                ready: Promise.resolve(mockServiceWorkerRegistration),
            },
        });

        vi.stubGlobal('PushManager', {});

        // Mock fetch
        global.fetch = vi.fn();
        fetchWithAuthRetry.mockClear();
        fetchWithAuthRetry.mockImplementation((...args) => global.fetch(...args));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('isPushSupported', () => {
        it('retorna false si window no está definido (SSR)', () => {
            vi.stubGlobal('window', undefined);
            expect(isPushSupported()).toBe(false);
        });

        it('retorna false si serviceWorker no está en navigator', () => {
            vi.stubGlobal('navigator', {});
            expect(isPushSupported()).toBe(false);
        });

        it('retorna true si todo está soportado', () => {
            expect(isPushSupported()).toBe(true);
        });
    });

    describe('permissionStatus', () => {
        it('retorna "default" cuando permiso no ha sido solicitado', () => {
            mockNotification.permission = 'default';
            expect(permissionStatus()).toBe('default');
        });

        it('retorna "granted" cuando permiso fue concedido', () => {
            mockNotification.permission = 'granted';
            expect(permissionStatus()).toBe('granted');
        });

        it('retorna "denied" cuando permiso fue denegado', () => {
            mockNotification.permission = 'denied';
            expect(permissionStatus()).toBe('denied');
        });
    });

    describe('requestPermission', () => {
        it('lanza error si push no está soportado', async () => {
            vi.stubGlobal('navigator', {});
            vi.stubGlobal('Notification', mockNotification);

            await expect(requestPermission()).rejects.toThrow('Push no soportado en este navegador');
        });

        it('retorna "granted" cuando usuario concede permiso', async () => {
            mockNotification.requestPermission.mockResolvedValue('granted');
            
            const result = await requestPermission();
            
            expect(result).toBe('granted');
            expect(mockNotification.requestPermission).toHaveBeenCalledTimes(1);
        });

        it('retorna "denied" cuando usuario deniega permiso', async () => {
            mockNotification.requestPermission.mockResolvedValue('denied');
            
            const result = await requestPermission();
            
            expect(result).toBe('denied');
        });

        it('retorna "default" cuando usuario descarta prompt', async () => {
            mockNotification.requestPermission.mockResolvedValue('default');
            
            const result = await requestPermission();
            
            expect(result).toBe('default');
        });
    });

    describe('isSubscribed', () => {
        it('retorna false si push no está soportado', async () => {
            vi.stubGlobal('navigator', {});

            const result = await isSubscribed();
            expect(result).toBe(false);
        });

        it('retorna true si existe suscripción activa', async () => {
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue({
                endpoint: 'https://example.com',
                toJSON: () => ({ endpoint: 'https://example.com' }),
            });
            
            const result = await isSubscribed();
            expect(result).toBe(true);
        });

        it('retorna false si no existe suscripción', async () => {
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
            
            const result = await isSubscribed();
            expect(result).toBe(false);
        });

        it('retorna false si hay error en SW ready', async () => {
            vi.stubGlobal('navigator', {
                serviceWorker: {
                    ready: Promise.reject(new Error('SW error')),
                },
            });

            const result = await isSubscribed();
            expect(result).toBe(false);
        });
    });

    describe('subscribePush', () => {
        it('lanza error si push no está soportado', async () => {
            vi.stubGlobal('navigator', {});

            await expect(subscribePush()).rejects.toThrow('Push no soportado');
        });

        it('lanza error si permiso no está concedido', async () => {
            mockNotification.permission = 'denied';
            
            await expect(subscribePush()).rejects.toThrow('Permiso de notificación no concedido');
        });

        it('usa suscripción existente si ya hay una', async () => {
            mockNotification.permission = 'granted';
            const existingSub = {
                endpoint: 'https://example.com/existing',
                toJSON: () => ({ endpoint: 'https://example.com/existing' }),
            };
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(existingSub);
            
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
            });
            
            const result = await subscribePush();
            
            expect(result).toBe(existingSub);
            expect(mockServiceWorkerRegistration.pushManager.subscribe).not.toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/sidecar/notifications/subscribe',
                expect.objectContaining({
                    method: 'POST',
                })
            );
            expect(fetchWithAuthRetry).toHaveBeenCalledWith(
                '/api/sidecar/notifications/subscribe',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('crea nueva suscripción si no existe una', async () => {
            mockNotification.permission = 'granted';
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
            
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ publicKey: 'test-vapid-key' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                });
            
            const newSub = {
                endpoint: 'https://example.com/new',
                toJSON: () => ({ endpoint: 'https://example.com/new', keys: { p256dh: 'key', auth: 'auth' } }),
            };
            mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(newSub);
            
            const result = await subscribePush();
            
            expect(result).toBe(newSub);
            expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/sidecar/notifications/vapid-public');
            expect(global.fetch).toHaveBeenNthCalledWith(2, 
                '/api/sidecar/notifications/subscribe',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('lanza error si VAPID fetch falla', async () => {
            mockNotification.permission = 'granted';
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
            
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
            });
            
            await expect(subscribePush()).rejects.toThrow('VAPID fetch HTTP 500');
        });

        it('lanza error si subscribe backend falla', async () => {
            mockNotification.permission = 'granted';
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
            
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ publicKey: 'test-vapid-key' }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 502,
                });
            
            const newSub = {
                endpoint: 'https://example.com/new',
                toJSON: () => ({ endpoint: 'https://example.com/new', keys: { p256dh: 'key', auth: 'auth' } }),
            };
            mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(newSub);
            
            await expect(subscribePush()).rejects.toThrow('Subscribe backend HTTP 502');
        });

        it('guarda metadata en localStorage', async () => {
            mockNotification.permission = 'granted';
            const existingSub = {
                endpoint: 'https://example.com/existing',
                toJSON: () => ({ endpoint: 'https://example.com/existing' }),
            };
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(existingSub);
            
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
            });
            
            await subscribePush();
            
            const stored = JSON.parse(mockLocalStorage.store['chagra:push-subscribed:v1']);
            expect(stored).toHaveProperty('ts');
            expect(stored).toHaveProperty('endpoint');
            expect(stored.endpoint).toBe('https://example.com/existing');
        });

        it('continúa si localStorage falla (private mode)', async () => {
            mockNotification.permission = 'granted';
            const existingSub = {
                endpoint: 'https://example.com/existing',
                toJSON: () => ({ endpoint: 'https://example.com/existing' }),
            };
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(existingSub);
            
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
            });
            
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });
            
            const result = await subscribePush();
            
            expect(result).toBe(existingSub);
        });
    });

    describe('unsubscribePush', () => {
        it('retorna false si push no está soportado', async () => {
            vi.stubGlobal('navigator', {});

            const result = await unsubscribePush();
            expect(result).toBe(false);
        });

        it('retorna true si no hay suscripción activa', async () => {
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
            
            const result = await unsubscribePush();
            expect(result).toBe(true);
        });

        it('revoca suscripción y notifica al backend', async () => {
            const mockUnsubscribe = vi.fn();
            const existingSub = {
                endpoint: 'https://example.com/unsub',
                unsubscribe: mockUnsubscribe,
                toJSON: () => ({ endpoint: 'https://example.com/unsub' }),
            };
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(existingSub);
            
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
            });
            
            const result = await unsubscribePush();
            
            expect(result).toBe(true);
            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/sidecar/notifications/subscribe',
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
            expect(mockLocalStorage.store['chagra:push-subscribed:v1']).toBeUndefined();
        });

        it('continúa si backend falla (browser ya canceló)', async () => {
            const mockUnsubscribe = vi.fn();
            const existingSub = {
                endpoint: 'https://example.com/unsub',
                unsubscribe: mockUnsubscribe,
                toJSON: () => ({ endpoint: 'https://example.com/unsub' }),
            };
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(existingSub);
            
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const result = await unsubscribePush();
            
            expect(result).toBe(true);
            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });

        it('retorna false si hay error en unsubscribe', async () => {
            mockServiceWorkerRegistration.pushManager.getSubscription.mockRejectedValue(new Error('SW error'));
            
            const result = await unsubscribePush();
            expect(result).toBe(false);
        });

        it('continúa si localStorage.removeItem falla', async () => {
            const mockUnsubscribe = vi.fn();
            const existingSub = {
                endpoint: 'https://example.com/unsub',
                unsubscribe: mockUnsubscribe,
                toJSON: () => ({ endpoint: 'https://example.com/unsub' }),
            };
            mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(existingSub);
            
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
            });
            
            mockLocalStorage.removeItem.mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            const result = await unsubscribePush();
            
            expect(result).toBe(true);
        });
    });

    describe('getLocalSubscriptionInfo', () => {
        it('retorna null si no hay info en localStorage', () => {
            const result = getLocalSubscriptionInfo();
            expect(result).toBeNull();
        });

        it('retorna info parseada si existe en localStorage', () => {
            const testInfo = {
                ts: 1700000000000,
                endpoint: 'https://example.com/test',
            };
            mockLocalStorage.store['chagra:push-subscribed:v1'] = JSON.stringify(testInfo);
            
            const result = getLocalSubscriptionInfo();
            expect(result).toEqual(testInfo);
        });

        it('retorna null si hay error al parsear', () => {
            mockLocalStorage.store['chagra:push-subscribed:v1'] = 'invalid-json{';
            
            const result = getLocalSubscriptionInfo();
            expect(result).toBeNull();
        });

        it('retorna null si getItem lanza error', () => {
            mockLocalStorage.getItem.mockImplementation(() => {
                throw new Error('Storage access error');
            });
            
            const result = getLocalSubscriptionInfo();
            expect(result).toBeNull();
        });
    });
});

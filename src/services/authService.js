/**
 * authService — Autenticación OAuth2 password-credential contra FarmOS.
 * Persiste tokens en localforage (offline-first).
 *
 * @module authService
 */

import localforage from 'localforage';
import { clearActiveTenantId } from './tenantContext';

const FARMOS_URL = import.meta.env.VITE_FARMOS_URL;
const CLIENT_ID = import.meta.env.VITE_FARMOS_CLIENT_ID;

export const authenticateUser = async (username, password) => {
    console.log('[Auth] Intentando login para:', username);
    const url = `${FARMOS_URL}/oauth/token`;

    const payload = new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        username: username,
        password: password,
        scope: 'farm_manager',
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
        });

        if (!response.ok) {
            throw new Error(`Error de Autenticación: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('json')) {
            throw new Error('Backend FarmOS no disponible (modo instalacion detectado)');
        }

        const data = await response.json();

        // Almacenamiento Offline-First del Token JWT
        await localforage.setItem('farmos_access_token', data.access_token);
        await localforage.setItem('farmos_refresh_token', data.refresh_token);
        await localforage.setItem('farmos_token_expiry', Date.now() + (data.expires_in * 1000));

        return { success: true };
    } catch (error) {
        console.error("Fallo en la negociación del token:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Lee el access token persistido. Si está expirado, fuerza logout y retorna null.
 *
 * @returns {Promise<string|null>} token activo, o null si no existe / expiró /
 *   localforage falló (defensive: la app debe tratar null como "no auth").
 */
export const getAccessToken = async () => {
    try {
        const token = await localforage.getItem('farmos_access_token');
        const expiry = await localforage.getItem('farmos_token_expiry');

        // Basic check for expiration (could trigger refresh here)
        if (token && expiry && Date.now() > expiry) {
            await logoutUser();
            return null;
        }

        return token;
    } catch (err) {
        console.error('[Auth] getAccessToken failed:', err);
        return null;
    }
};

/**
 * Limpia los tokens persistidos. No-throw: si localforage falla, se loguea
 * y se continúa (el siguiente getAccessToken devolverá null de todas formas).
 */
export const logoutUser = async () => {
    try {
        await localforage.removeItem('farmos_access_token');
        await localforage.removeItem('farmos_refresh_token');
        await localforage.removeItem('farmos_token_expiry');
    } catch (err) {
        console.error('[Auth] logoutUser failed (tokens may persist):', err);
    }
    // ADR-036 MVP multi-finca: limpiar tenantId asegura que un re-login con
    // otro usuario no herede el scope del anterior. NO purgamos IDB acá —
    // useAssetStore decide qué hacer al detectar el cambio de tenantId.
    try {
        clearActiveTenantId();
    } catch (err) {
        console.warn('[Auth] clearActiveTenantId failed:', err);
    }
};

/**
 * @returns {Promise<boolean>} true si hay token vigente. Nunca throw —
 *   delega en getAccessToken() que es defensive.
 */
export const isAuthenticated = async () => {
    const token = await getAccessToken();
    return !!token;
};

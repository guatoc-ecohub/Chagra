/**
 * authService — Autenticación OAuth2 contra FarmOS.
 * Soporta Authorization Code + PKCE (recomendado) y Password Grant (legacy).
 * Persiste tokens en localforage (offline-first).
 *
 * @module authService
 */

import localforage from 'localforage';
import { clearActiveTenantId } from './tenantContext';
import { MSG } from '../config/messages';

const FARMOS_URL = import.meta.env.VITE_FARMOS_URL;
const CLIENT_ID = import.meta.env.VITE_FARMOS_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/callback`;
export const SESSION_EXPIRED_EVENT = 'chagra:session-expired';

/**
 * DEPRECATION NOTICE: Password grant será removido después de esta fecha.
 *
 * RED DE SEGURIDAD (2026-05-30): la fecha se MOVIÓ de 2026-06-25 a 2026-09-25.
 * Motivo: el flujo Authorization Code + PKCE existía escrito pero MUERTO (no
 * estaba cableado a la UI ni al router). Si la fecha original se cumplía antes
 * de que PKCE estuviera cableado, probado en staging y con el redirect_uri de
 * producción registrado en el cliente OAuth de farmOS, TODOS los usuarios
 * quedaban sin poder loguearse (password grant lanza error y no había
 * alternativa viva). Verificado empíricamente contra el backend que el cliente
 * de producción NO tiene PKCE habilitado ni el redirect_uri de producción
 * registrado, así que el corte NO debe activarse hasta que el operador
 * complete esos pasos backend. Mover la fecha es el seguro inmediato.
 *
 * NO acercar de vuelta esta fecha hasta que se cumpla, en producción:
 *   1. redirect_uri de la PWA registrado en el cliente OAuth de farmOS.
 *   2. PKCE habilitado en el cliente (cliente público / pkce on).
 *   3. VITE_FARMOS_CLIENT_ID seteado en el build prod al cliente correcto.
 *   4. Flujo probado end-to-end en staging.
 *
 * ESTADO DEL CABLEADO (2026-09-04, task URGENTE-login-se-apaga-25sep): el
 * flujo PKCE YA NO está muerto. LoginScreen consulta resolverCaminoLogin() y
 * dispara iniciarLoginPKCE() como camino real; el password grant queda como
 * fallback mientras no llegue la fecha. La activación del camino PKCE es el
 * flag de build VITE_AUTH_PKCE_ENABLED (que el operador pone en 'true' SOLO
 * tras cumplir las 4 precondiciones de arriba); pasada la fecha, PKCE se usa
 * aunque el flag falte (ver resolverCaminoLogin).
 */
const PASSWORD_GRANT_DEPRECATION_DATE = new Date('2026-09-25');
const PASSWORD_GRANT_DEPRECATED = Date.now() > PASSWORD_GRANT_DEPRECATION_DATE.getTime();

/**
 * Interruptor de rollout del camino PKCE (task URGENTE-login-se-apaga-25sep).
 *
 * `VITE_AUTH_PKCE_ENABLED=true` convierte a Authorization Code + PKCE en el
 * camino REAL del login. Mientras el flag esté ausente o en 'false', el
 * password grant clásico sigue siendo el camino vivo y el PKCE queda
 * cableado pero en espera — así este cableado NO rompe producción antes de
 * que el operador complete las 4 precondiciones backend documentadas arriba.
 * Tras PASSWORD_GRANT_DEPRECATION_DATE el flag se ignora: PKCE es el único
 * camino posible (ver resolverCaminoLogin).
 */
const PKCE_ENABLED = import.meta.env.VITE_AUTH_PKCE_ENABLED === 'true';

/**
 * ¿Está esta instalación lista para intentar PKCE? Requiere la URL del
 * backend y el client_id OAuth en el build: son los dos datos que el flujo
 * necesita para construir /oauth/authorize. Si falta alguno, redirigir
 * sería mandar al operador a una pantalla de error de farmOS con
 * client_id=undefined — mejor fallar acá y usar el fallback.
 *
 * @returns {boolean}
 */
export const puedeUsarPKCE = () => !!(FARMOS_URL && CLIENT_ID);

/**
 * Resuelve el camino de login disponible según configuración y fecha.
 * Función PURA (dependencias inyectables) para poder probar la matriz
 * flag/fecha/config sin viajear el reloj del módulo.
 *
 *   - 'pkce':      login vía Authorization Code + PKCE (redirect a farmOS).
 *                  Es el camino real cuando el rollout está activado (flag
 *                  o fecha vencida) y la config existe.
 *   - 'password':  password grant clásico — fallback mientras viva la fecha.
 *   - 'bloqueado': ni PKCE operativo ni password grant vivo. Antes de este
 *                  cableado, llegar aquí significaba un login MUDO (el
 *                  servicio rechazaba y no había alternativa); ahora la UI
 *                  muestra `motivo` claro en vez de quedarse callada.
 *
 * @param {object} [deps] - overrides para tests.
 * @param {number} [deps.fechaActual] - epoch ms a evaluar (default: ahora).
 * @param {boolean} [deps.pkceOperativo] - config PKCE presente (default: puedeUsarPKCE()).
 * @param {boolean} [deps.pkceActivado] - rollout PKCE activo (default: flag o fecha vencida).
 * @returns {{camino: 'pkce'|'password'|'bloqueado', passwordGrantVivo: boolean, motivo?: string}}
 */
export const resolverCaminoLogin = ({
    fechaActual = Date.now(),
    pkceOperativo = puedeUsarPKCE(),
    pkceActivado,
} = {}) => {
    const passwordGrantVivo = fechaActual <= PASSWORD_GRANT_DEPRECATION_DATE.getTime();
    // La fecha GANA sobre el flag: pasado el corte, PKCE es obligatorio y un
    // flag en 'false' NO puede reactivar el grant retirado.
    const activado = !passwordGrantVivo
        || (pkceActivado !== undefined ? pkceActivado : PKCE_ENABLED);

    if (activado && pkceOperativo) {
        return { camino: 'pkce', passwordGrantVivo };
    }
    if (passwordGrantVivo) {
        return { camino: 'password', passwordGrantVivo };
    }
    return {
        camino: 'bloqueado',
        passwordGrantVivo: false,
        motivo: MSG.auth.instalacionSinCamino,
    };
};

/**
 * Genera un code_verifier random para PKCE (43-128 caracteres).
 * @returns {string} code_verifier en base64url sin padding
 */
export const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
};

/**
 * Genera el code_challenge SHA256 para PKCE.
 * @param {string} codeVerifier
 * @returns {Promise<string>} code_challenge en base64url sin padding
 */
export const generateCodeChallenge = async (codeVerifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hash));
};

/**
 * Helper para codificar en base64url sin padding (RFC 4648 §5).
 * @param {Uint8Array} buffer
 * @returns {string}
 */
const base64UrlEncode = (buffer) => {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Inicia el flujo Authorization Code + PKCE redirigiendo a FarmOS.
 * @param {string} state - string aleatorio para CSRF protection
 */
export const initiateAuthorizationCodeFlow = async (state) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Persistir code_verifier para usarlo en el callback
    await localforage.setItem('oauth_code_verifier', codeVerifier);
    await localforage.setItem('oauth_state', state);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'farm_manager',
    });

    const authUrl = `${FARMOS_URL}/oauth/authorize?${params.toString()}`;
    window.location.href = authUrl;
};

/**
 * Puerta de entrada del LoginScreen al flujo PKCE (task
 * URGENTE-login-se-apaga-25sep). Genera el state CSRF, persiste
 * verifier+state y redirige el navegador a farmOS (/oauth/authorize).
 *
 * Contrato NO-throw (mismo patrón que authenticateUser/exchangeCodeForToken):
 * devuelve `{ success: true }` cuando el redirect quedó en curso — el usuario
 * continúa en el dominio de farmOS y regresa por /callback (OAuthCallback,
 * ya cableado en App.jsx). Si algo falla ANTES de salir (config ausente,
 * crypto rota), devuelve `{ success: false, error }` para que el caller
 * decida el fallback sin dejar el botón colgado.
 *
 * @param {object} [deps] - overrides para tests.
 * @param {boolean} [deps.pkceOperativo] - config PKCE presente (default: puedeUsarPKCE()).
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const iniciarLoginPKCE = async ({ pkceOperativo = puedeUsarPKCE() } = {}) => {
    if (!pkceOperativo) {
        console.warn('[Auth] PKCE solicitado sin configuración (VITE_FARMOS_URL / VITE_FARMOS_CLIENT_ID).');
        return {
            success: false,
            error: MSG.auth.pkceNoConfigurado,
        };
    }
    try {
        await initiateAuthorizationCodeFlow(generateOAuthState());
        return { success: true };
    } catch (err) {
        console.error('[Auth] no se pudo iniciar el flujo PKCE:', err);
        return {
            success: false,
            error: MSG.auth.accesoSeguroFallido,
        };
    }
};

/**
 * Intercambia el authorization code por tokens (PKCE flow).
 * @param {string} code - authorization code del callback
 * @param {string} state - state del callback para validación
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const exchangeCodeForToken = async (code, state) => {
    console.info('[Auth] Intercambiando code por token (PKCE)');

    // Validar state
    const savedState = await localforage.getItem('oauth_state');
    if (state !== savedState) {
        return { success: false, error: 'State inválido. Posible ataque CSRF.' };
    }

    const codeVerifier = await localforage.getItem('oauth_code_verifier');
    if (!codeVerifier) {
        return { success: false, error: 'Code verifier no encontrado. Flujo inválido.' };
    }

    const url = `${FARMOS_URL}/oauth/token`;
    const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
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

        // Limpiar PKCE state
        await localforage.removeItem('oauth_code_verifier');
        await localforage.removeItem('oauth_state');

        return { success: true };
    } catch (error) {
        console.error("Fallo en el intercambio del token:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Autenticación OAuth2 Password Grant (LEGACY - DEPRECATED).
 *
 * ⚠️ DEPRECATION NOTICE: Este método será removido después de la fecha
 * PASSWORD_GRANT_DEPRECATION_DATE (movida a 2026-09-25 como red de seguridad).
 * Usar initiateAuthorizationCodeFlow + exchangeCodeForToken en su lugar.
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string, deprecation?: string}>}
 */
export const authenticateUser = async (username, password) => {
    console.warn('[Auth] Intentando login password grant (DEPRECATED) para:', username);

    // Aviso de deprecation
    const daysUntilDeprecation = Math.max(0, Math.ceil(
        (Number(PASSWORD_GRANT_DEPRECATION_DATE) - Date.now()) / (1000 * 60 * 60 * 24)
    ));

    if (PASSWORD_GRANT_DEPRECATED) {
        return {
            success: false,
            error: 'Password Grant ha sido removido. Usa Authorization Code + PKCE.'
        };
    }

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

        return {
            success: true,
            deprecation: daysUntilDeprecation > 0
                ? `Password Grant será removido en ${daysUntilDeprecation} días. Migra a Authorization Code + PKCE.`
                : undefined
        };
    } catch (error) {
        console.error("Fallo en la negociación del token:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Refresca el access token usando el refresh_token persistido (OAuth2
 * `grant_type=refresh_token`).
 *
 * RAÍZ DEL BUG "sesión zombi" (operador 2026-06-18): el access token de farmOS
 * dura 1h (`expires_in: 3600`). Hasta ahora `getAccessToken()` SOLO comprobaba
 * la expiración y, al vencer, hacía `logoutUser()` y devolvía null — el
 * refresh_token se guardaba en el login pero NUNCA se usaba. Resultado: tras 1h
 * el operador volvía a la app con un token vencido y, en vez de renovarse
 * solo, la primera petición fallaba: el home mostraba "Tu sesión expiró"
 * (friendlyErrors 401), los contadores quedaban en "sin plantas" y el selector
 * de zona salía vacío. Verificado EN VIVO que el backend SÍ acepta el
 * `refresh_token` grant (devuelve un access nuevo + refresh rotado), así que la
 * renovación silenciosa es la cura correcta: re-loguearse a mano dejaba de ser
 * necesario.
 *
 * Idempotente y serializado: si dos llamadas concurrentes detectan expiración a
 * la vez, comparten la MISMA promesa de refresh (`refreshInFlight`) para no
 * disparar dos grants en paralelo (que rotarían el refresh_token dos veces y
 * uno quedaría inválido).
 *
 * @returns {Promise<string|null>} nuevo access token, o null si no hay
 *   refresh_token, el grant falla, o el grant está deshabilitado. NUNCA lanza.
 */
let refreshInFlight = null;
let lastRefreshFailureReason = null;

export const getLastRefreshFailureReason = () => lastRefreshFailureReason;

export const refreshAccessToken = async () => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        lastRefreshFailureReason = null;
        let refreshToken;
        try {
            refreshToken = await localforage.getItem('farmos_refresh_token');
        } catch (err) {
            console.error('[Auth] no se pudo leer el refresh_token:', err);
            lastRefreshFailureReason = 'storage';
            return null;
        }
        if (!refreshToken) {
            lastRefreshFailureReason = 'missing';
            return null;
        }

        const url = `${FARMOS_URL}/oauth/token`;
        const payload = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: CLIENT_ID,
            refresh_token: refreshToken,
            scope: 'farm_manager',
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString(),
            });

            if (!response.ok) {
                // 400/401 = refresh_token vencido o revocado: no hay nada que
                // renovar. El caller debe hacer logout limpio (no quedarse en
                // estado zombi). NO logueamos el body (puede traer el token).
                console.warn(`[Auth] refresh_token grant falló (${response.status}).`);
                lastRefreshFailureReason = 'rejected';
                return null;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('json')) {
                console.warn('[Auth] respuesta de refresh sin JSON (backend caído?).');
                lastRefreshFailureReason = 'invalid-response';
                return null;
            }

            const data = await response.json();
            if (!data.access_token) {
                lastRefreshFailureReason = 'invalid-response';
                return null;
            }

            await localforage.setItem('farmos_access_token', data.access_token);
            // El refresh_token suele rotar en cada uso: persistir el nuevo si
            // viene, conservar el anterior si el backend no lo rota.
            if (data.refresh_token) {
                await localforage.setItem('farmos_refresh_token', data.refresh_token);
            }
            const expiresIn = Number(data.expires_in) || 3600;
            await localforage.setItem('farmos_token_expiry', Date.now() + expiresIn * 1000);

            console.info('[Auth] access token renovado vía refresh_token grant.');
            return data.access_token;
        } catch (err) {
            // Red caída / timeout: NO es expiración del refresh. Devolvemos null
            // para que el caller no rompa, pero el caller NO debe hacer logout
            // por un fallo de red (ver getAccessToken: solo logout si había
            // refresh_token y el grant lo rechazó explícitamente).
            console.error('[Auth] error de red al refrescar el token:', err);
            lastRefreshFailureReason = 'network';
            return null;
        }
    })();

    try {
        return await refreshInFlight;
    } finally {
        refreshInFlight = null;
    }
};

export const expireSession = async (detail = {}) => {
    await logoutUser();
    if (typeof window !== 'undefined') {
        window.location.hash = '#login';
        try {
            window.dispatchEvent(
                new CustomEvent(SESSION_EXPIRED_EVENT, { detail })
            );
        } catch (_) { /* CustomEvent existe en browsers soportados */ }
    }
};

/**
 * Lee el access token persistido. Si está expirado, intenta RENOVARLO con el
 * refresh_token antes de rendirse; solo si la renovación falla por
 * refresh_token vencido/revocado hace un logout limpio (evita el estado zombi).
 *
 * @returns {Promise<string|null>} token activo (renovado si hizo falta), o null
 *   si no existe / no se pudo renovar / localforage falló (defensive: la app
 *   debe tratar null como "no auth").
 */
export const getAccessToken = async () => {
    try {
        const token = await localforage.getItem('farmos_access_token');
        const expiry = await localforage.getItem('farmos_token_expiry');

        if (token && expiry && Date.now() > expiry) {
            // Token vencido: intentar renovación silenciosa con el refresh_token
            // ANTES de cerrar la sesión (la cura del bug "sesión zombi").
            const refreshed = await refreshAccessToken();
            if (refreshed) return refreshed;

            // La renovación no dio token. Distinguir dos casos para no cerrar la
            // sesión por un simple fallo de red (offline-first):
            //   - HAY refresh_token pero el grant lo rechazó → sesión realmente
            //     muerta → logout limpio (la app lleva a #login, sin zombi).
            //   - red caída / sin refresh_token → devolver null SIN borrar nada:
            //     al recuperar conexión el siguiente intento renovará y el
            //     usuario no pierde su sesión por estar offline un rato.
            let hadRefresh = false;
            try {
                hadRefresh = !!(await localforage.getItem('farmos_refresh_token'));
            } catch (_) { /* asumir que no, fail-safe */ }

            if (
                hadRefresh &&
                navigator.onLine !== false &&
                lastRefreshFailureReason === 'rejected'
            ) {
                await expireSession({ reason: 'refresh-rejected' });
            }
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
    // otro usuario no herede el scope del anterior. NO purgamos IDB aquí —
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

/**
 * Genera un state random para protección CSRF en OAuth flow.
 * @returns {string} state en base64url
 */
export const generateOAuthState = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
};

/**
 * Procesa el callback de OAuth desde la URL (después de redirect).
 * @param {URLSearchParams} params - URL search params del callback
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const handleOAuthCallback = async (params) => {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
        const errorDescription = params.get('error_description') || error;
        return { success: false, error: `Error de autorización: ${errorDescription}` };
    }

    if (!code || !state) {
        return { success: false, error: 'Parámetros inválidos en callback' };
    }

    return await exchangeCodeForToken(code, state);
};

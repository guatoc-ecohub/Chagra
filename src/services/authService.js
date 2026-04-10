import localforage from 'localforage';

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

export const getAccessToken = async () => {
    const token = await localforage.getItem('farmos_access_token');
    const expiry = await localforage.getItem('farmos_token_expiry');

    // Basic check for expiration (could trigger refresh here)
    if (token && expiry && Date.now() > expiry) {
        await logoutUser();
        return null;
    }

    return token;
};

export const logoutUser = async () => {
    await localforage.removeItem('farmos_access_token');
    await localforage.removeItem('farmos_refresh_token');
    await localforage.removeItem('farmos_token_expiry');
};

export const isAuthenticated = async () => {
    const token = await getAccessToken();
    return !!token;
};

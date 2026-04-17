import localforage from 'localforage';

const FARMOS_URL = import.meta.env.VITE_FARMOS_URL;
const CLIENT_ID = import.meta.env.VITE_FARMOS_CLIENT_ID;

interface AuthResult {
  success: boolean;
  error?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const authenticateUser = async (
  username: string,
  password: string
): Promise<AuthResult> => {
  console.log('[Auth] Intentando login para:', username);
  const url = `${FARMOS_URL}/oauth/token`;

  const payload = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID || '',
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

    const data = (await response.json()) as TokenResponse;

    // Almacenamiento Offline-First del Token JWT
    await localforage.setItem('farmos_access_token', data.access_token);
    await localforage.setItem('farmos_refresh_token', data.refresh_token);
    await localforage.setItem('farmos_token_expiry', Date.now() + data.expires_in * 1000);

    return { success: true };
  } catch (error) {
    console.error('Fallo en la negociación del token:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const token = await localforage.getItem<string>('farmos_access_token');
  const expiry = await localforage.getItem<number>('farmos_token_expiry');

  // Basic check for expiration (could trigger refresh here)
  if (token && expiry && Date.now() > expiry) {
    await logoutUser();
    return null;
  }

  return token;
};

export const logoutUser = async (): Promise<void> => {
  await localforage.removeItem('farmos_access_token');
  await localforage.removeItem('farmos_refresh_token');
  await localforage.removeItem('farmos_token_expiry');
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAccessToken();
  return !!token;
};

const required = ['VITE_FARMOS_URL', 'VITE_FARMOS_CLIENT_ID'];

for (const key of required) {
  if (!import.meta.env[key]) {
    console.error(`[Config] Variable de entorno requerida no definida: ${key}. Revise .env o .env.local.`);
  }
}

export const ENV = {
  FARMOS_URL: import.meta.env.VITE_FARMOS_URL || '',
  FARMOS_CLIENT_ID: import.meta.env.VITE_FARMOS_CLIENT_ID || '',
  HA_ACCESS_TOKEN: import.meta.env.VITE_HA_ACCESS_TOKEN || '',
  DEFAULT_LOCATION_ID: import.meta.env.VITE_DEFAULT_LOCATION_ID || '',
  DEFAULT_FARM_NAME: import.meta.env.VITE_DEFAULT_FARM_NAME || 'Finca Principal',
};

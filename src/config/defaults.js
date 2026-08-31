const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/*
 * OJO — LA UBICACIÓN DE LA FINCA YA NO SE LEE DE AQUÍ.
 *
 * `VITE_FARM_LAT` / `VITE_FARM_LON` / `VITE_FARM_ALTITUD_MSNM` /
 * `VITE_FARM_MUNICIPIO` / `VITE_FARM_THERMAL_ZONES` son variables de BUILD:
 * describen la finca de DEMO, no la del usuario. El onboarding
 * (OnboardingCondensado, paso 2) captura la ubicación REAL — GPS → municipio
 * DANE → altitud → piso térmico → vereda — y la guarda en el perfil.
 *
 * Quien necesite "dónde está la finca" debe pedir
 * `getContextoGeoFinca()` (services/perfilFincaService), que hace la cascada
 * honesta perfil → demo. Estas constantes quedan como ÚLTIMO recurso de demo.
 */
export const FARM_CONFIG = {
  LOCATION_ID: import.meta.env.VITE_DEFAULT_LOCATION_ID || '',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- fallback de config build-time preexistente (no es copy de UI); el hook lo marca al re-tocar el archivo
  FARM_NAME: import.meta.env.VITE_DEFAULT_FARM_NAME || 'Finca Principal',
  // Contexto geoagronómico usado por builders de IA externa (R5) y etiquetas UI.
  // En demo-mode se cortocircuita a constantes del guión Ministerio
  // (Escuela San Francisco, Choachí, páramo); en prod se leen de env.
  ALTITUD_MSNM: DEMO_MODE
    ? 3050
    : (Number(import.meta.env.VITE_FARM_ALTITUD_MSNM) || null),
  MUNICIPIO: DEMO_MODE
    ? 'Choachí, Cundinamarca'
    : (import.meta.env.VITE_FARM_MUNICIPIO || null),
  THERMAL_ZONES: DEMO_MODE
    ? ['paramo']
    : (import.meta.env.VITE_FARM_THERMAL_ZONES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
  // Coordenadas usadas por skyEphemeris (sunrise/sunset). Default Choachí.
  // En prod se sobreescriben con VITE_FARM_LAT / VITE_FARM_LON.
  LATITUDE: DEMO_MODE
    ? 4.526
    : (Number(import.meta.env.VITE_FARM_LAT) || 4.526),
  LONGITUDE: DEMO_MODE
    ? -73.922
    : (Number(import.meta.env.VITE_FARM_LON) || -73.922),
};

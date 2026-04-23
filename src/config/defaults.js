const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const FARM_CONFIG = {
  LOCATION_ID: import.meta.env.VITE_DEFAULT_LOCATION_ID || '',
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
};

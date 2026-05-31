/**
 * alertThresholds — umbrales configurables para motor de alertas clima/sensor.
 *
 * Valores por defecto para detección de riesgo agronómico:
 * - HUMEDAD_MIN: porcentaje mínimo de humedad relativa para alerta de riego
 * - TEMPERATURA_MAX: temperatura máxima para alerta de estrés calórico
 * - LLUVIA_MAX: intensidad máxima de lluvia por hora para alerta de erosión
 * - VIENTO_MAX: velocidad máxima del viento para alerta estructural
 *
 * Estos valores pueden personalizarse por zona biocultural o tipo de cultivo.
 */
export const ALERT_THRESHOLDS = {
  HUMEDAD_MIN: 20, // % humedad relativa → riesgo riego
  TEMPERATURA_MAX: 35, // °C → estrés calórico
  LLUVIA_MAX: 50, // mm/h → riesgo erosión
  VIENTO_MAX: 40, // km/h → riesgo estructural
};

/**
 * Mapeo de tipos de alerta a severidad y mensajes UI.
 */
export const ALERT_TYPES = {
  HUMEDAD_BAJA: {
    severity: 'warning',
    title: 'Humedad Baja',
    message: 'Humedad relativa por debajo del umbral - revisar riego',
  },
  TEMPERATURA_ALTA: {
    severity: 'danger',
    title: 'Temperatura Elevada',
    message: 'Temperatura por encima del umbral - riesgo estrés calórico',
  },
  LLUVIA_INTENSA: {
    severity: 'danger',
    title: 'Lluvia Intensa',
    message: 'Lluvia intensa detectada - riesgo erosión',
  },
  VIENTO_FUERTE: {
    severity: 'warning',
    title: 'Viento Fuerte',
    message: 'Velocidad del viento elevada - revisar estructuras',
  },
};

/**
 * Umbrales para alertas derivadas del PRONÓSTICO REAL (Open-Meteo, 7 días)
 * que consume el alertEngine a través de climaService.fetchClimaSnapshot.
 *
 * A diferencia de ALERT_THRESHOLDS (sensor instantáneo IoT — hoy demo), estos
 * operan sobre agregados DIARIOS del pronóstico: temp mín/máx, precipitación
 * diaria y viento máximo. Son consistentes con los umbrales agroecológicos del
 * sidecar (openmeteo-alerts.ts) y con el ajuste por piso térmico para helada.
 *
 * Helada por piso térmico: una mínima de 4°C es benigna en el cálido pero ya es
 * riesgo de helada en piso frío/páramo (cielo despejado -> pérdida radiativa
 * nocturna; paradoja documentada en El Niño seco, DR-MISSION-4). Por eso el
 * umbral de helada sube con la altitud del piso térmico.
 */
export const FORECAST_THRESHOLDS = {
  // Helada — umbral de temp mínima diaria, dependiente del piso térmico.
  HELADA_MIN_C: {
    paramo: 6, // por encima de 0, en páramo una mín <=6°C ya amenaza helada nocturna
    frio: 4,
    templado: 2,
    calido: 1, // helada real es rarísima en cálido; umbral muy bajo
    default: 3,
  },
  // Calor extremo — temp máxima diaria (consistente con sidecar: 32°C).
  CALOR_EXTREMO_MAX_C: 32,
  CALOR_EXTREMO_CRITICO_C: 36,
  // Lluvia torrencial — precipitación diaria acumulada (sidecar: 50 mm/día).
  LLUVIA_TORRENCIAL_MM_DIA: 50,
  LLUVIA_TORRENCIAL_CRITICA_MM_DIA: 100,
  // Racha seca — días consecutivos con precipitación por debajo del umbral.
  SEQUIA_MM_DIA: 1,
  SEQUIA_DIAS_SEGUIDOS: 4,
  // Viento fuerte — viento máximo diario (sidecar: 45 km/h).
  VIENTO_FUERTE_KMH: 45,
  VIENTO_FUERTE_CRITICO_KMH: 65,
};

/**
 * Tipos de alerta de PRONÓSTICO (clima real). Distinto namespace que los
 * sensores IoT para que la UI pueda etiquetarlas como "clima real (Open-Meteo)".
 */
export const FORECAST_ALERT_TYPES = {
  HELADA: {
    severity: 'danger',
    title: 'Riesgo de helada',
    message: 'Temperatura mínima muy baja en el pronóstico - protege cultivos sensibles',
  },
  OLA_CALOR: {
    severity: 'danger',
    title: 'Ola de calor',
    message: 'Calor extremo en el pronóstico - riego temprano y mulch',
  },
  LLUVIA_TORRENCIAL: {
    severity: 'danger',
    title: 'Lluvia torrencial',
    message: 'Lluvia fuerte en el pronóstico - revisa drenajes y evita labores en ladera',
  },
  RACHA_SECA: {
    severity: 'warning',
    title: 'Racha seca',
    message: 'Varios días secos previstos - programa riego eficiente y conserva humedad',
  },
  VIENTO_FUERTE_FORECAST: {
    severity: 'warning',
    title: 'Viento fuerte',
    message: 'Viento fuerte previsto - tutora plantas altas y cosecha fruta madura',
  },
};

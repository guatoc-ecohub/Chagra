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

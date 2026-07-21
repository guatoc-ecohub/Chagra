/**
 * datosAbiertos.js — Fuentes de datos públicos colombianos para Chagra.
 *
 * IDEAM (clima), SIPSA (precios), ICA (alertas fitosanitarias).
 * Sin API keys. Los datos se consumen vía fetch a endpoints públicos
 * o se cachean localmente para uso offline.
 *
 * ESTADO: referencia de endpoints. La integración real requiere
 * proxies CORS en el backend (Nginx) y caché local.
 *
 * @module services/datosAbiertos
 */

/** Endpoints de datos públicos colombianos */
export const FUENTES = {
  /** IDEAM — pronóstico del tiempo por municipio (gratuito, sin key) */
  ideam: {
    pronostico: 'https://www.ideam.gov.co/web/tiempo-y-clima/pronostico',
    alertas: 'https://www.ideam.gov.co/web/tiempo-y-clima/alertas',
    nota: 'Scraping requerido. Alternativa: Open-Meteo API (ya integrada en climaService.js).',
  },

  /** SIPSA — precios mayoristas de alimentos (DANE, semanal) */
  sipsa: {
    boletin: 'https://www.dane.gov.co/index.php/estadisticas-por-tema/agropecuario/sistema-de-informacion-de-precios-sipsa',
    nota: 'CSV mensual descargable. El mercado (MercadoScreen) puede mostrar precios de la central más cercana.',
  },

  /** ICA — alertas fitosanitarias */
  ica: {
    alertas: 'https://www.ica.gov.co/alertas',
    nota: 'Alertas por cultivo/región. Relevante para alertEngine (heladas, plagas).',
  },
};

/**
 * Normaliza un precio SIPSA a formato Chagra (por libra, COP).
 * @param {{ producto: string, precio_kg: number, ciudad: string }} entrada
 * @returns {{ producto: string, precio_libra: number, ciudad: string, fuente: string }}
 */
export function normalizarPrecioSIPSA(entrada) {
  return {
    producto: entrada.producto,
    precio_libra: Math.round(entrada.precio_kg / 2.2046),
    ciudad: entrada.ciudad,
    fuente: 'SIPSA-DANE',
  };
}

/*
 * useClima3DVivo — puente reactivo entre climaService y la bóveda 3D.
 *
 * No pide una API nueva ni fabrica un valor de respaldo: lee el snapshot que
 * ya comparte la Página del Tiempo, escucha su evento y solo traduce datos
 * existentes a señales visuales. La vitrina sí inicia el fetch del servicio
 * cuando se visita directamente, porque en esa ruta no siempre está montado
 * el dashboard que normalmente lo dispara.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  fetchClimaSnapshot,
  getCachedClimaSnapshot,
  resolveClimaLocation,
  CLIMA_UPDATED_EVENT,
} from '../services/climaService.js';
import { deriveAtmosphere } from '../services/atmosphereService.js';
import { fincaDateISO } from '../utils/farmDate.js';
import { pisoPorAltitud } from '../visual/mundo3d/pisosTermicos.js';

const REEVAL_MS = 10 * 60 * 1000;

function numero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Primer número real de un conjunto de nombres que conviven en el contrato.
 * El sidecar normalizado usa `temp`/`rh`/`viento`; el payload nativo de
 * Open-Meteo usa `temperature_2m`/`relative_humidity_2m`/`wind_speed_10m`.
 * La vitrina recibe ambos durante la transición, sin fabricar un respaldo. */
function lectura(source, ...names) {
  for (const name of names) {
    const value = numero(source?.[name]);
    if (value != null) return value;
  }
  return null;
}

function hoyISO() {
  // BUG TODAY-UTC-HELADA-20260905: hoy en el calendario de la FINCA, no en la
  // zona del runtime/UTC (los `date` del forecast son locales de la finca).
  return fincaDateISO();
}

function diaActual(snapshot) {
  const forecast = snapshot?.openmeteo?.forecast_7d;
  if (!Array.isArray(forecast) || forecast.length === 0) return null;
  return forecast.find((day) => day?.date === hoyISO()) || forecast[0];
}

function familiaEnso(phase) {
  if (typeof phase !== 'string') return 'neutral';
  if (phase.startsWith('nino')) return 'nino';
  if (phase.startsWith('nina')) return 'nina';
  return 'neutral';
}

function textoAlertas(snapshot) {
  const alertas = snapshot?.alertas_locales || snapshot?.openmeteo?.alertas || [];
  return alertas
    .map((alerta) => `${alerta?.tipo || ''} ${alerta?.mensaje || ''}`.toLowerCase())
    .join(' ');
}

/**
 * Traduce el snapshot compartido a una forma pequeña para DOM y R3F.
 * Los umbrales solo deciden la presencia de una capa visual. Las cifras que
 * se muestran en pantalla siempre son las que vienen del snapshot.
 */
export function derivarClima3D(snapshot, now = new Date()) {
  const location = snapshot?.location_context || resolveClimaLocation();
  const atmos = deriveAtmosphere({ snapshot, now, location });
  const piso = pisoPorAltitud(numero(location?.elevation));
  const day = diaActual(snapshot);
  const pronostico = Array.isArray(snapshot?.openmeteo?.forecast_7d)
    ? snapshot.openmeteo.forecast_7d
    : [];
  // El snapshot del sidecar puede conservar el bloque `current` nativo de
  // Open-Meteo. Antes solo se leía `now`, el alias interno, por lo que las
  // cuatro métricas del HUD quedaban vacías aunque la respuesta sí las traía.
  const current = snapshot?.openmeteo?.now
    || snapshot?.openmeteo?.current
    || snapshot?.now
    || snapshot?.current
    || {};
  const enso = snapshot?.enso_status || null;
  const alertasTexto = textoAlertas(snapshot);
  const lluviaMm = lectura(day, 'precip_mm', 'precipitation_sum', 'precipitation')
    ?? lectura(current, 'precip', 'precipitation', 'rain');
  const nubosidad = lectura(current, 'cloud', 'cloud_cover', 'cloudcover')
    ?? lectura(day, 'cloud_mean', 'cloud_cover_mean_pct', 'cloud_cover');
  const tempMin = lectura(day, 'temp_min', 'temp_min_c', 'temperature_2m_min');
  const tieneOpenMeteo = snapshot?.openmeteo?.available === true && !!day;
  const tieneEnso = !!enso?.phase;
  const senal = tieneOpenMeteo || tieneEnso;
  // Algunos snapshots del sidecar llaman `now` al bloque actual, mientras que
  // atmosphereService acepta también `current`. Completar aquí la misma
  // lectura oportunista evita perder un fenómeno real por una variante de
  // contrato ya conocida.
  const condicion = atmos.condicion
    || (lluviaMm != null && lluviaMm >= 10 ? 'lluvia'
      : location?.elevation >= 2600 && nubosidad != null && nubosidad >= 80 ? 'niebla'
        : lluviaMm != null && lluviaMm >= 2 ? 'nublado'
          : nubosidad != null ? (nubosidad >= 60 ? 'nublado' : 'despejado') : null);
  const lluvia = condicion === 'lluvia' || (lluviaMm != null && lluviaMm >= 2);
  const niebla = condicion === 'niebla';
  const helada = /helad|escarch|frost/.test(alertasTexto)
    || (tempMin != null && tempMin <= 3 && condicion === 'despejado');

  return Object.freeze({
    senal,
    tieneOpenMeteo,
    tieneEnso,
    condicion,
    luz: atmos.luz,
    lluvia,
    niebla,
    helada,
    lluviaMm,
    nubosidad,
    temp: lectura(current, 'temp', 'temperature', 'temperature_2m'),
    tempMin,
    tempMax: lectura(day, 'temp_max', 'temp_max_c', 'temperature_2m_max'),
    pronostico,
    humedad: lectura(current, 'rh', 'humidity', 'relative_humidity_2m'),
    viento: lectura(current, 'viento', 'wind', 'wind_speed_10m', 'windspeed_10m')
      ?? lectura(day, 'viento_max', 'wind_speed_10m_max', 'windspeed_10m_max'),
    ensoFamily: familiaEnso(enso?.phase),
    ensoPhase: enso?.phase || null,
    ensoLabel: enso?.label || null,
    oni: numero(enso?.oni_value),
    tendencia: enso?.trend || null,
    alertas: snapshot?.alertas_locales || snapshot?.openmeteo?.alertas || [],
    ubicacion: location?.municipio || location?.vereda || null,
    precision: location?.precision || null,
    pisoTermico: piso ? { id: piso.id, nombre: piso.nombre, min: piso.min, max: piso.max } : null,
    actualizado: snapshot?.fetched_at || null,
  });
}

/** Lee la misma cache/evento que el tema global y la Página del Tiempo. */
export function useClima3DVivo() {
  const [snapshot, setSnapshot] = useState(() => getCachedClimaSnapshot());

  useEffect(() => {
    let alive = true;
    const actualizar = (detail) => {
      if (alive) setSnapshot(detail || getCachedClimaSnapshot());
    };
    const onClima = (event) => actualizar(event?.detail);
    window.addEventListener(CLIMA_UPDATED_EVENT, onClima);

    const location = resolveClimaLocation();
    fetchClimaSnapshot(location || undefined).then((next) => {
      if (alive && next) setSnapshot(next);
    });
    const id = setInterval(() => actualizar(), REEVAL_MS);

    return () => {
      alive = false;
      window.removeEventListener(CLIMA_UPDATED_EVENT, onClima);
      clearInterval(id);
    };
  }, []);

  return useMemo(() => derivarClima3D(snapshot), [snapshot]);
}

export default useClima3DVivo;

/**
 * Cruce determinista clima x cultivo para el observatorio 3D.
 *
 * Las entradas permitidas son datos ya disponibles en la app:
 *   - assets reales de `useAssetStore.plants`;
 *   - pronóstico y ENSO de `climaService`;
 *   - ficha agroclimática de `agroIndices`;
 *   - perfiles térmicos del grafo AGE exportado en `grafo-relations.json`.
 *
 * No genera consejo para un cultivo sin ficha ni para una condición climática
 * sin dato. Los textos son plantillas puras, sin LLM ni cifras de respaldo.
 */
import { parseCultivos, presionEnfermedad } from './agroIndices.js';

const SEVERITY_WEIGHT = Object.freeze({ critical: 3, warning: 2, info: 1 });

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalize(value) {
  return String(value || '')
    .replace(/\s+#\d+\s*$/i, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function plantName(asset) {
  return String(
    asset?.attributes?.name
      || asset?.attributes?.common_name
      || asset?.name
      || '',
  ).replace(/\s+#\d+\s*$/i, '').trim();
}

function plantSlug(asset) {
  return asset?.attributes?._speciesSlug
    || asset?.attributes?.species_slug
    || asset?.speciesSlug
    || null;
}

function graphProfileFor(asset, graph) {
  const species = graph?.species;
  if (!species || typeof species !== 'object') return null;
  const slug = plantSlug(asset);
  if (slug && species[slug]) return { ...species[slug], slug };

  const query = normalize(plantName(asset));
  if (!query) return null;
  const match = Object.entries(species).find(([id, profile]) => {
    const common = normalize(profile?.nombre_comun);
    const scientific = normalize(profile?.nombre_cientifico);
    const idNorm = normalize(id).replace(/_/g, ' ');
    return query === common || query === scientific || query === idNorm
      || common.includes(query) || query.includes(common);
  });
  return match ? { ...match[1], slug: match[0] } : null;
}

function groupPlants(plants) {
  const groups = new Map();
  for (const asset of Array.isArray(plants) ? plants : []) {
    const status = asset?.attributes?.status || asset?.status || 'active';
    if (status === 'dead' || status === 'archived') continue;
    const name = plantName(asset);
    if (!name) continue;
    const key = normalize(plantSlug(asset) || name);
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { name, count: 1, asset });
  }
  return [...groups.values()];
}

function forecastDays(climaLive) {
  return Array.isArray(climaLive?.pronostico) ? climaLive.pronostico : [];
}

function nextForecastDay(climaLive) {
  const days = forecastDays(climaLive);
  const today = days[0];
  return days.find((day) => day?.date && day.date !== today?.date) || days[1] || null;
}

function climateSources(climaLive, profile, ensoFamily) {
  const sources = [];
  if (climaLive?.tieneOpenMeteo) sources.push('Open-Meteo');
  if (profile) sources.push('AGE agro');
  if (climaLive?.tieneEnso && ensoFamily !== 'neutral') sources.push('ENSO');
  return sources;
}

function relevantAlert(climaLive, ficha, profile) {
  const alerts = Array.isArray(climaLive?.alertas) ? climaLive.alertas : [];
  const diseaseWords = ficha?.enfermedades?.length
    ? /lluv|precip|torment|gota|tizon|hongo|humed|roya|antrac/i
    : /$a/;
  const frostWords = /helad|escarch|frost/i;
  return alerts.find((alert) => {
    const text = `${alert?.tipo || ''} ${alert?.mensaje || ''}`;
    if (frostWords.test(text)) return !!(profile?.helada_letal != null || ficha?.piso === 'frio');
    return diseaseWords.test(text);
  }) || null;
}

function alertSuggestion(name, alert) {
  const message = String(alert?.mensaje || alert?.tipo || '').trim();
  if (!message) return null;
  const severity = alert?.severidad === 'critical' ? 'critical' : 'warning';
  return {
    severity,
    title: severity === 'critical' ? 'Atención prioritaria' : 'Vigile hoy',
    text: `${name}: ${message}`,
    why: 'Alerta local del servicio climático',
  };
}

function frostSuggestion(name, profile, climaLive) {
  const lethal = finite(profile?.helada_letal);
  const forecastMin = finite(nextForecastDay(climaLive)?.temp_min ?? climaLive?.tempMin);
  if (lethal == null || forecastMin == null || forecastMin > lethal) return null;
  return {
    severity: 'critical',
    title: 'Protección esta noche',
    text: `${name} tiene un umbral de helada letal reportado de ${lethal} °C y el pronóstico marca ${forecastMin} °C: protéjala esta noche.`,
    why: 'Temperatura mínima prevista frente al perfil térmico AGE agro',
  };
}

function coolSuggestion(name, profile, climaLive) {
  const minimum = finite(profile?.temp_min);
  const forecastMin = finite(nextForecastDay(climaLive)?.temp_min ?? climaLive?.tempMin);
  if (minimum == null || forecastMin == null || forecastMin >= minimum) return null;
  return {
    severity: 'warning',
    title: 'Noche por debajo de referencia',
    text: `${name} tiene una temperatura mínima de referencia de ${minimum} °C y el pronóstico baja a ${forecastMin} °C: vigílela al amanecer y revise su protección local.`,
    why: 'Pronóstico Open-Meteo frente al rango térmico AGE agro',
  };
}

function diseasePressure(ficha, day) {
  if (!ficha?.enfermedades?.length) return [];
  const min = finite(day?.temp_min);
  const max = finite(day?.temp_max);
  const wetHours = finite(day?.horas_hr_alta);
  if (min == null || max == null || wetHours == null) return [];
  const tempMedia = (min + max) / 2;
  return ficha.enfermedades
    .map((key) => presionEnfermedad(key, {
      tempMedia,
      horasMojado: wetHours,
      precipMm: finite(day?.precip_mm),
    }))
    .filter((pressure) => pressure?.nivel === 'amarillo' || pressure?.nivel === 'rojo')
    .sort((a, b) => (a.nivel === 'rojo' ? -1 : 1) - (b.nivel === 'rojo' ? -1 : 1));
}

function wetSuggestion(name, ficha, phase, climaLive) {
  const day = nextForecastDay(climaLive);
  const rain = finite(day?.precip_mm ?? climaLive?.lluviaMm);
  const pressure = diseasePressure(ficha, day)[0];
  if (rain == null || rain <= 0 || !pressure) return null;
  const phaseNote = phase ? ` en ${phase}` : '';
  return {
    severity: pressure.nivel === 'rojo' ? 'critical' : 'warning',
    title: 'Lluvia en el horizonte',
    text: `La ${name.toLowerCase()}${phaseNote} tiene ${rain.toFixed(1)} mm previstos para ${day?.date || 'el próximo día'} y el semáforo de ${pressure.modelo.nombre.toLowerCase()} está ${pressure.nivel}: revise hojas y drenajes.`,
    why: 'Pronóstico Open-Meteo + semáforo de enfermedad agro con hoja mojada observada',
  };
}

function ensoSuggestion(name, ficha, climaLive, regionLine, ensoFamily) {
  if (!climaLive?.tieneEnso || !regionLine || ensoFamily === 'neutral') return null;
  const note = ficha?.aguaNota;
  if (!note) return null;
  return {
    severity: ensoFamily === 'nina' ? 'warning' : 'info',
    title: ensoFamily === 'nina' ? 'La Niña pide drenaje' : 'El Niño pide cuidar el agua',
    text: `${name}: ${note} Lectura regional ENSO: ${regionLine}`,
    why: 'ENSO en vivo + contexto regional agroclimático',
  };
}

function calmSuggestion(name, ficha, climaLive, profile) {
  const current = finite(climaLive?.temp);
  const min = finite(profile?.temp_min);
  const max = finite(profile?.temp_max);
  if (current == null || min == null || max == null) return null;
  if (current < min || current > max) return null;
  return {
    severity: 'info',
    title: 'En observación',
    text: `La lectura actual es ${current} °C y está dentro del rango reportado para ${name.toLowerCase()} (${min} a ${max} °C): mantenga la observación de su fase${ficha?.rawNombre ? ` de ${ficha.rawNombre}` : ''}.`,
    why: 'Lectura actual Open-Meteo + rango térmico AGE agro',
  };
}

/**
 * @param {{plants?:Array, climaLive?:object, graph?:object|null, regionLine?:string, ensoFamily?:string}} input
 * @returns {Array<{key:string,name:string,count:number,status:string,suggestion:object|null,sources:string[],phase:string|null}>}
 */
export function buildClimaCultivoSuggestions({ plants = [], climaLive = null, graph = null, regionLine = '', ensoFamily = 'neutral' } = {}) {
  return groupPlants(plants).map(({ name, count, asset }) => {
    const parsed = parseCultivos(name);
    const ficha = parsed.cultivos[0] || null;
    const profile = graphProfileFor(asset, graph);
    const phase = asset?.attributes?._chagra_plant_meta?.fenologia || null;
    const key = plantSlug(asset) || normalize(name);

    if (!ficha) {
      return {
        key,
        name,
        count,
        phase,
        status: 'no-data',
        suggestion: null,
        sources: [],
      };
    }

    const climateAvailable = !!(climaLive?.tieneOpenMeteo || climaLive?.tieneEnso);
    if (!climateAvailable) {
      return {
        key,
        name,
        count,
        phase,
        status: 'pending',
        suggestion: null,
        sources: ['Ficha agroclimática'],
      };
    }

    const suggestion = [
      frostSuggestion(name, profile, climaLive),
      alertSuggestion(name, relevantAlert(climaLive, ficha, profile)),
      coolSuggestion(name, profile, climaLive),
      wetSuggestion(name, ficha, phase, climaLive),
      ensoSuggestion(name, ficha, climaLive, regionLine, ensoFamily),
      calmSuggestion(name, ficha, climaLive, profile),
    ].find(Boolean) || null;

    return {
      key,
      name,
      count,
      phase,
      status: suggestion ? 'ready' : 'no-signal',
      suggestion,
      sources: climateSources(climaLive, profile, ensoFamily).concat(profile ? [] : ['Ficha agroclimática']),
    };
  }).sort((a, b) => {
    const aWeight = SEVERITY_WEIGHT[a.suggestion?.severity] || 0;
    const bWeight = SEVERITY_WEIGHT[b.suggestion?.severity] || 0;
    return bWeight - aWeight;
  });
}

export const __testing__ = { graphProfileFor, groupPlants, normalize };

/**
 * veredaService.js — detección y crowdsourcing de veredas usando OSM.
 *
 * OpenStreetMap/Nominatim tiene datos de veredas en Colombia (no todas,
 * pero muchas). Este servicio:
 *   1. Detecta vereda desde GPS usando Nominatim reverse geocoding
 *   2. Busca veredas por nombre dentro de un municipio (Overpass API)
 *   3. Construye dataset crowdsourced gradual desde perfiles existentes
 *
 * En Colombia, Nominatim usa:
 *   - city = vereda o cabecera municipal
 *   - county = municipio
 *   - state = departamento
 *
 * OFFLINE-FIRST: si falla Nominatim, fallback a dataset local.
 *
 * @module veredaService
 */

import { reverseGeocode } from './locationService.js';
import { findMunicipio } from '../utils/colombiaLocations.js';

const NOMINATIM_TIMEOUT_MS = 8000;

/**
 * Obtiene vereda desde GPS usando OSM Nominatim.
 *
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Promise<{vereda:string|null, municipio:string|null, departamento:string|null, source:string, display_name:string|null}>}
 */
export async function getVeredaFromGPS(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { vereda: null, municipio: null, departamento: null, source: 'offline' };
  }

  try {
    const result = await reverseGeocode(lat, lng);
    if (!result) {
      return { vereda: null, municipio: null, departamento: null, source: 'nominatim-fail' };
    }

    // En Colombia: city=vereda, county=municipio, state=departamento
    // BUT: city puede ser cabecera municipal también, así que validamos
    const city = result.city || result.town || result.village || null;
    const county = result.county || result.municipality || null;
    const state = result.state || result.department || null;

    // Validar que county es un municipio DANE conocido
    const municipioValidado = county ? findMunicipio(county) : null;

    return {
      vereda: city || null,
      municipio: municipioValidado?.name || county || null,
      departamento: state || null,
      source: 'nominatim',
      display_name: result.display || null,
    };
  } catch (e) {
    console.debug('[veredaService] getVeredaFromGPS fail:', e?.message || e);
    return { vereda: null, municipio: null, departamento: null, source: 'error' };
  }
}

/**
 * Normaliza nombre de vereda para matching (sin tildes, minúsculas).
 * @param {string} name
 * @returns {string}
 */
function normalizeVeredaName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Busca veredas por nombre dentro de un municipio usando Overpass API.
 *
 * Overpass query: busca todos los admin_level=8 (veredas) dentro del
 * bounding box del municipio. Filtra por nombre normalizado.
 *
 * @param {string} municipio - Nombre del municipio
 * @param {string} query - Nombre o prefijo de vereda a buscar
 * @returns {Promise<Array<{name:string, lat:number, lng:number}>>}
 */
export async function searchVeredasEnMunicipio(municipio, query) {
  if (!municipio || !query) return [];

  // Primero: obtener bounding box del municipio desde dataset DANE
  const municipioInfo = findMunicipio(municipio);
  if (!municipioInfo) return [];

  // Bounding box expandido ~10km (0.1 grados) para capturar veredas cercanas
  const padding = 0.1;
  const bbox = {
    south: municipioInfo.lat - padding,
    north: municipioInfo.lat + padding,
    west: municipioInfo.lng - padding,
    east: municipioInfo.lng + padding,
  };

  const normalizedQuery = normalizeVeredaName(query);

  try {
    // Overpass query: busca veredas (admin_level=8) en el bbox
    const overpassQuery = `
      [out:json][timeout:10];
      (
        relation["boundary"="administrative"]["admin_level"="8"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["boundary"="administrative"]["admin_level"="8"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out tags center;
    `;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Chagra/1.0 (agroecology research)',
      },
    });

    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    const elements = data?.elements || [];

    // Filtrar por nombre y mapear a formato simple
    return elements
      .filter(el => {
        const name = el.tags?.name || '';
        const normalized = normalizeVeredaName(name);
        return normalized.includes(normalizedQuery);
      })
      .map(el => ({
        name: el.tags?.name || '',
        lat: el.center?.lat || el.lat || el.nodes?.[0] || null,
        lng: el.center?.lon || el.lon || el.nodes?.[0] || null,
      }));
  } catch (e) {
    console.debug('[veredaService] searchVeredasEnMunicipio fail:', e?.message || e);
    return [];
  }
}

/**
 * Busca veredas cercanas a un punto GPS (radio ~5km).
 * Útil para sugerencias cuando el usuario escribe "mi vereda" y queremos
 * opciones cercanas a su ubicación real.
 *
 * @param {number} lat - Latitud central
 * @param {number} lng - Longitud central
 * @param {string} query - Nombre o prefijo de vereda
 * @returns {Promise<Array<{name:string, lat:number, lng:number}>>}
 */
export async function searchVeredasCercanas(lat, lng, query) {
  if (!lat || !lng || !query) return [];

  // Radio ~5km = 0.05 grados
  const padding = 0.05;
  const normalizedQuery = normalizeVeredaName(query);

  try {
    const overpassQuery = `
      [out:json][timeout:10];
      (
        relation["boundary"="administrative"]["admin_level"="8"](${lat - padding},${lng - padding},${lat + padding},${lng + padding});
        way["boundary"="administrative"]["admin_level"="8"](${lat - padding},${lng - padding},${lat + padding},${lng + padding});
      );
      out tags center;
    `;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Chagra/1.0 (agroecology research)',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const elements = data?.elements || [];

    return elements
      .filter(el => {
        const name = el.tags?.name || '';
        const normalized = normalizeVeredaName(name);
        return normalized.includes(normalizedQuery);
      })
      .map(el => ({
        name: el.tags?.name || '',
        lat: el.center?.lat || el.lat || null,
        lng: el.center?.lon || el.lng || null,
      }));
  } catch (e) {
    console.debug('[veredaService] searchVeredasCercanas fail:', e?.message || e);
    return [];
  }
}

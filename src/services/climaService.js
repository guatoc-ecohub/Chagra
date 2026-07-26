/**
 * climaService.js — Estado del clima en tiempo real (PoC #316).
 *
 * Pipeline:
 *   sidecar `/clima/snapshot`  →  climaService cache (30 min)  →
 *      ├─ NotificationsBell tab "Clima"     (UX)
 *      ├─ ClimaStrip                        (UX)
 *      └─ agentService.buildClimaContext()  (system prompt — agente cita ENSO y alertas)
 *
 * El sidecar hace el trabajo pesado (NOAA ONI + IDEAM ENSO + CIIFEN + Open-Meteo).
 * Este módulo es solo cache + pub/sub para que la app no haga N pedidos en
 * paralelo cuando varios componentes lo necesiten.
 */

export const CLIMA_UPDATED_EVENT = 'chagra:clima:updated';

/**
 * Contract de la respuesta del sidecar:
 *   {
 *     fetched_at: ISO8601,
 *     enso_status: {
 *       phase: 'nina_fuerte' | 'nina_moderada' | 'nina_debil' | 'neutral'
 *              | 'nino_debil' | 'nino_moderado' | 'nino_fuerte',
 *       label: string,
 *       severity: 'neutral' | 'info' | 'warning' | 'critical',
 *       oni_value: number | null,
 *       trend: 'rising'|'falling'|'stable'|null,
 *       ideam_probabilities: { nino_pct, neutral_pct, nina_pct } | null,
 *       sources: string[],
 *     },
 *     alertas_locales: ClimaAlerta[],
 *     openmeteo: { available, forecast_7d, alertas } | { available:false, reason },
 *     noaa, ideam, ciifen,
 *   }
 *
 * Reglas:
 *  - NUNCA throw. El caller espera `T | null`.
 *  - Offline → null inmediato (no fetch).
 *  - Si el sidecar feature flag está off (VITE_USE_SIDECAR_AGRO_MCP) → null.
 *  - Cache 30 min en memoria + persistencia liviana en localStorage para que el
 *    primer paint post-recarga sea instantáneo.
 */

import { getClimaSnapshot } from './sidecarClient.js';
import { getProfile, getProfileMunicipio } from './userProfileService.js';
import { findMunicipio } from '../utils/colombiaLocations.js';
import { recordLiveEnsoStatus, applyEnsoOverride } from './ensoService.js';

const CACHE_TTL_MS = 30 * 60 * 1000;
const LS_KEY = 'chagra:clima:snapshot-v1';

let memCache = null; // { ts, key, payload }
let inFlight = null; // { key, promise }

function plausibleMsnm(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= -100 && n <= 6000 ? Math.round(n) : null;
}

function numericCoord(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function profileElevation(profile) {
    return plausibleMsnm(profile?.finca_altitud) ?? plausibleMsnm(profile?.altitud);
}

/**
 * Resuelve la ubicación climática más precisa disponible.
 *
 * Prioridad:
 *   1. Coordenadas confirmadas en el perfil (`ubicacion_lat/lng`), incluidas
 *      las que vienen de una vereda OSM/crowdsourced.
 *   2. Centroide DANE del municipio como fallback explícitamente marcado como
 *      baja precisión.
 *
 * @param {object} [opts]
 * @returns {{ lat:number, lng:number, elevation?:number, municipio?:string, departamento?:string, vereda?:string, source:string, precision:'exact'|'centroid' } | null}
 */
export function resolveClimaLocation(opts = {}) {
    const profile = opts.profile && typeof opts.profile === 'object' ? opts.profile : getProfile();
    const explicitLat = numericCoord(opts.lat);
    const explicitLng = numericCoord(opts.lng);
    const explicitElevation = plausibleMsnm(opts.elevation);

    if (explicitLat != null && explicitLng != null) {
        return {
            lat: explicitLat,
            lng: explicitLng,
            elevation: explicitElevation ?? profileElevation(profile) ?? undefined,
            municipio: opts.municipio || profile?.municipio || getProfileMunicipio() || undefined,
            departamento: opts.departamento || profile?.departamento || undefined,
            vereda: opts.vereda || profile?.vereda || undefined,
            source: opts.source || profile?.vereda_source || profile?.ubicacion_source || 'explicit',
            precision: 'exact',
        };
    }

    const profileLat = numericCoord(profile?.ubicacion_lat);
    const profileLng = numericCoord(profile?.ubicacion_lng);
    if (profileLat != null && profileLng != null) {
        return {
            lat: profileLat,
            lng: profileLng,
            elevation: explicitElevation ?? profileElevation(profile) ?? undefined,
            municipio: profile?.municipio || getProfileMunicipio() || undefined,
            departamento: profile?.departamento || undefined,
            vereda: profile?.vereda || undefined,
            source: profile?.vereda_source || profile?.ubicacion_source || 'profile',
            precision: 'exact',
        };
    }

    const municipio = opts.municipio || profile?.municipio || getProfileMunicipio();
    if (!municipio) return null;
    const hit = findMunicipio(String(municipio).split(',')[0]);
    if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lng)) return null;

    return {
        lat: hit.lat,
        lng: hit.lng,
        elevation: explicitElevation ?? profileElevation(profile) ?? plausibleMsnm(hit.altitud) ?? undefined,
        municipio: hit.name || municipio,
        departamento: hit.departamento || profile?.departamento || undefined,
        vereda: profile?.vereda || undefined,
        source: 'municipio-centroid',
        precision: 'centroid',
    };
}

function coordKey(lat, lng, elevation) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return 'global';
    const base = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    // La elevación entra en la clave: dos puntos con las mismas coords pero
    // distinta altitud (perfil corrige la grilla de Open-Meteo) son snapshots
    // distintos y no deben compartir cache.
    return typeof elevation === 'number' && Number.isFinite(elevation)
        ? `${base}@${Math.round(elevation)}`
        : base;
}

/**
 * GR-9: aplica el override manual ENSO (ensoService) al snapshot ANTES de
 * entregarlo a cualquier consumidor (chat, bell, strip, alertEngine). El caché
 * guarda siempre el snapshot CRUDO del sidecar; el override se aplica en
 * LECTURA, así quitar el override restaura el dato vivo. Sin override el
 * payload sale intacto (misma referencia).
 */
function withEffectiveEnso(payload) {
    if (!payload || typeof payload !== 'object' || !payload.enso_status) return payload;
    const effective = applyEnsoOverride(payload.enso_status);
    return effective === payload.enso_status ? payload : { ...payload, enso_status: effective };
}

function readLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.ts || !parsed?.payload) return null;
        if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

function writeLocalStorage(entry) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(entry));
    } catch (_) {
        // Cuota llena o privacy mode — ignorar.
    }
}

/**
 * Devuelve el snapshot cacheado SI está dentro de TTL. No hace fetch.
 * Útil para que NotificationsBell pinte el badge antes que el primer await.
 *
 * @param {number} [lat]
 * @param {number} [lng]
 * @param {number} [elevation] msnm reales (entra en la clave de cache)
 * @returns {object | null}
 */
export function getCachedClimaSnapshot(lat, lng, elevation) {
    const location = lat == null && lng == null
        ? resolveClimaLocation()
        : { lat, lng, elevation };
    const key = coordKey(location?.lat, location?.lng, location?.elevation);
    const now = Date.now();
    if (memCache && memCache.key === key && now - memCache.ts < CACHE_TTL_MS) {
        return withEffectiveEnso(memCache.payload);
    }
    const ls = readLocalStorage();
    if (ls && ls.key === key) {
        memCache = ls;
        return withEffectiveEnso(ls.payload);
    }
    return null;
}

/**
 * Pide al sidecar (o devuelve cache vivo). Si dos componentes piden a la
 * vez, comparten la misma promesa.
 *
 * @param {object} [opts]
 * @param {number} [opts.lat]
 * @param {number} [opts.lng]
 * @param {number} [opts.elevation] msnm reales de la finca → Open-Meteo corrige
 *   la temperatura por gradiente térmico. Sin esto el pronóstico sale más
 *   cálido (usa la elevación de la cabecera/valle de la grilla).
 * @param {boolean} [opts.forceRefresh]
 * @returns {Promise<object | null>}
 */
export async function fetchClimaSnapshot({ lat, lng, elevation, forceRefresh = false, ...rest } = {}) {
    const location = resolveClimaLocation({ lat, lng, elevation, ...rest });
    const key = coordKey(location?.lat, location?.lng, location?.elevation);
    const now = Date.now();

    if (!forceRefresh && memCache && memCache.key === key && now - memCache.ts < CACHE_TTL_MS) {
        return withEffectiveEnso(memCache.payload);
    }
    if (inFlight && inFlight.key === key) return inFlight.promise;

    const promise = (async () => {
        const payload = await getClimaSnapshot({
            lat: location?.lat,
            lng: location?.lng,
            elevation: location?.elevation,
        });
        if (payload) {
            // GR-9: alimenta el caché vivo ENSO (fuente única para el motor
            // offline: fenología, tareas preventivas, alertas de temporada).
            recordLiveEnsoStatus(payload.enso_status);
            const enrichedPayload = location
                ? { ...payload, location_context: location }
                : payload;
            const entry = { ts: Date.now(), key, payload: enrichedPayload };
            memCache = entry;
            writeLocalStorage(entry);
            try {
                window.dispatchEvent(new CustomEvent(CLIMA_UPDATED_EVENT, { detail: withEffectiveEnso(enrichedPayload) }));
            } catch (_) { /* noop */ }
        }
        return payload ? withEffectiveEnso(memCache?.payload || payload) : payload;
    })();
    inFlight = { key, promise };

    try {
        return await promise;
    } finally {
        if (inFlight.promise === promise) inFlight = null;
    }
}

/**
 * Mapea severity → tailwind tokens consistentes con la paleta de
 * NotificationsBell.
 */
export function severityClasses(severity) {
    switch (severity) {
        case 'critical':
            return {
                bg: 'bg-red-900/30',
                border: 'border-red-700/50',
                text: 'text-red-200',
                badge: 'bg-red-600',
            };
        case 'warning':
            return {
                bg: 'bg-amber-900/30',
                border: 'border-amber-700/50',
                text: 'text-amber-200',
                badge: 'bg-amber-500',
            };
        case 'info':
            return {
                bg: 'bg-sky-900/30',
                border: 'border-sky-700/50',
                text: 'text-sky-200',
                badge: 'bg-sky-500',
            };
        default:
            return {
                bg: 'bg-emerald-900/30',
                border: 'border-emerald-700/50',
                text: 'text-emerald-200',
                badge: 'bg-emerald-500',
            };
    }
}

/**
 * Reglas de UX para ENSO phase → color del badge en el botón del bell.
 * El operador pidió "verde/ámbar/rojo/azul":
 *   - neutral             → verde
 *   - niño débil/niña     → azul (info)
 *   - niño/niña moderado  → ámbar (warning)
 *   - niño/niña fuerte    → rojo (critical)
 */
export function phaseBadgeColor(phase) {
    if (!phase) return 'emerald';
    if (phase === 'neutral') return 'emerald';
    if (phase === 'nino_fuerte' || phase === 'nina_fuerte') return 'red';
    if (phase === 'nino_moderado' || phase === 'nina_moderada') return 'amber';
    return 'sky';
}

export function describePhase(phase) {
    const m = {
        nino: 'El Niño — viene seco, prepare agua y sombra',
        nina: 'La Niña — viene lluvioso, limpie drenajes',
        nina_fuerte: 'La Niña fuerte — mucha lluvia, riesgo de inundacion',
        nina_moderada: 'La Niña moderada — mas lluvia de lo normal',
        nina_debil: 'Algo mas lluvioso de lo normal',
        neutral: 'El clima viene parejo, ni muy seco ni muy lluvioso',
        nino_debil: 'Algo mas seco de lo normal',
        nino_moderado: 'El Nino moderado — viene seco, ahorre agua',
        nino_fuerte: 'El Nino fuerte — sequia, prepare reservorios',
    };
    return m[phase] || 'Estado del clima desconocido';
}

// Hook informal — el caller puede `window.addEventListener('chagra:clima:updated', cb)`
// para reaccionar a cambios sin polling.

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
 *
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

const CACHE_TTL_MS = 30 * 60 * 1000;
const LS_KEY = 'chagra:clima:snapshot-v1';

let memCache = null; // { ts, key, payload }
let inFlight = null; // Promise<payload>

function coordKey(lat, lng, elevation) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return 'global';
    const base = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    // La elevación entra en la clave: dos puntos con las mismas coords pero
    // distinta altitud (perfil corrige la grilla de Open-Meteo) son snapshots
    // distintos y no deben compartir cache.
    return typeof elevation === 'number' && Number.isFinite(elevation)
        ? `${base}@${Math.round(elevation)}`
        : base;
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
    const key = coordKey(lat, lng, elevation);
    const now = Date.now();
    if (memCache && memCache.key === key && now - memCache.ts < CACHE_TTL_MS) {
        return memCache.payload;
    }
    const ls = readLocalStorage();
    if (ls && ls.key === key) {
        memCache = ls;
        return ls.payload;
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
export async function fetchClimaSnapshot({ lat, lng, elevation, forceRefresh = false } = {}) {
    const key = coordKey(lat, lng, elevation);
    const now = Date.now();

    if (!forceRefresh && memCache && memCache.key === key && now - memCache.ts < CACHE_TTL_MS) {
        return memCache.payload;
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
        const payload = await getClimaSnapshot({ lat, lng, elevation });
        if (payload) {
            const entry = { ts: Date.now(), key, payload };
            memCache = entry;
            writeLocalStorage(entry);
            try {
                window.dispatchEvent(new CustomEvent('chagra:clima:updated', { detail: payload }));
            } catch (_) { /* noop */ }
        }
        return payload;
    })();

    try {
        return await inFlight;
    } finally {
        inFlight = null;
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
        nina_fuerte: 'La Niña fuerte',
        nina_moderada: 'La Niña moderada',
        nina_debil: 'La Niña débil',
        neutral: 'Neutral ENSO',
        nino_debil: 'El Niño débil',
        nino_moderado: 'El Niño moderado',
        nino_fuerte: 'El Niño fuerte',
    };
    return m[phase] || 'Estado ENSO desconocido';
}

// Hook informal — el caller puede `window.addEventListener('chagra:clima:updated', cb)`
// para reaccionar a cambios sin polling.

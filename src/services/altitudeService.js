import { openDB, STORES } from '../db/dbCore';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export async function getDeviceAltitude() {
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
        return 3050;
    }

    let coords = null;
    try {
        coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos.coords),
                (err) => {
                    console.warn('[Altitude] Geolocation error or denied:', err);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    } catch (e) {
        console.warn('[Altitude] Geolocation fetch error:', e);
    }

    if (coords && coords.altitude !== null && coords.altitude !== undefined) {
        await saveToCache(coords.altitude);
        return Math.round(coords.altitude);
    }

    if (navigator.onLine && coords && coords.latitude && coords.longitude) {
        try {
            const baseUrl = import.meta.env.VITE_ELEVATION_API_URL || 'https://api.open-elevation.com/api/v1/lookup';
            const url = `${baseUrl}?locations=${coords.latitude},${coords.longitude}`;
            const res = await window.fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.results && data.results.length > 0) {
                    const ele = data.results[0].elevation;
                    if (ele != null) {
                        await saveToCache(ele);
                        return Math.round(ele);
                    }
                }
            }
        } catch (e) {
            console.warn('[Altitude] Open-Elevation API call failed', e);
        }
    }

    const cached = await getFromCache();
    if (cached !== null) {
        return Math.round(cached);
    }

    return null;
}

async function saveToCache(alt) {
    try {
        const db = await openDB();
        const tx = db.transaction([STORES.SYNC_META], 'readwrite');
        const store = tx.objectStore(STORES.SYNC_META);
        store.put({ key: 'last_known_altitude', value: { alt, ts: Date.now() } });
    } catch (e) {
        console.warn('[Altitude] Cache save error:', e);
    }
}

async function getFromCache() {
    try {
        const db = await openDB();
        const tx = db.transaction([STORES.SYNC_META], 'readonly');
        const store = tx.objectStore(STORES.SYNC_META);
        const req = store.get('last_known_altitude');
        const data = await new Promise(r => { req.onsuccess = () => r(req.result); req.onerror = () => r(null); });
        if (data && data.value && data.value.ts) {
            if (Date.now() - data.value.ts < CACHE_TTL) {
                return data.value.alt;
            }
        }
    } catch (e) {
        console.warn('[Altitude] Cache get error:', e);
    }
    return null;
}

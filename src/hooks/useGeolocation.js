import { useState, useCallback } from 'react';

/**
 * useGeolocation Hook
 * Optimized for iOS Safari:
 * 1. Requires manual trigger (request) to satisfy user gesture requirement.
 * 2. High timeout (30s) for cold GPS starts — UX-23 (#286) 2026-05-27.
 *    iOS A-GPS cold-start regularly takes 20-60s. El timeout previo de
 *    15s causaba que el botón "Mi ubicación" fallara silenciosamente en
 *    iPhones recién despertados.
 * 3. Maps error codes to semantic types for instructional UI.
 * 4. Retry automático con enableHighAccuracy=false si el primer intento
 *    timeoutea — algunos iPhones viejos no entregan high-accuracy ever.
 */
export function useGeolocation() {
    const [position, setPosition] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const request = useCallback((options = {}) => {
        if (!navigator.geolocation) {
            setError('unsupported');
            options.onError?.('unsupported');
            return;
        }

        setLoading(true);
        setError(null);

        const buildConfig = (highAccuracy) => {
            // UX-23: defaults seguros + caller override. Si el caller pasa
            // enableHighAccuracy/timeout explícitos, respetamos su valor.
            const cfg = {
                enableHighAccuracy: highAccuracy,
                timeout: 30000,
                maximumAge: 30000,
                ...options,
            };
            if (options.enableHighAccuracy == null) cfg.enableHighAccuracy = highAccuracy;
            if (options.timeout == null) cfg.timeout = 30000;
            return cfg;
        };

        const success = (pos) => {
            const result = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
                timestamp: pos.timestamp,
            };
            setPosition(result);
            setLoading(false);
            options.onSuccess?.(pos);
        };

        const handleError = (err, didRetry) => {
            let errorType = 'unavailable';
            if (err.code === 1) errorType = 'denied';
            if (err.code === 3) errorType = 'timeout';

            // UX-23: si el primer intento high-accuracy timeoutea y el
            // caller NO override enableHighAccuracy, reintentamos con
            // low-accuracy. iPhones viejos / sin A-GPS funcionan así.
            if (errorType === 'timeout' && !didRetry && options.enableHighAccuracy == null) {
                navigator.geolocation.getCurrentPosition(
                    success,
                    (e2) => handleError(e2, true),
                    buildConfig(false),
                );
                return;
            }

            setError(errorType);
            setLoading(false);
            options.onError?.(errorType);
        };

        navigator.geolocation.getCurrentPosition(
            success,
            (err) => handleError(err, false),
            buildConfig(true),
        );
    }, []);

    return { position, error, loading, request };
}

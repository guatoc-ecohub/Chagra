import { useState, useCallback } from 'react';

/**
 * useGeolocation Hook
 * Optimized for iOS Safari:
 * 1. Requires manual trigger (request) to satisfy user gesture requirement.
 * 2. High timeout (15s) for cold GPS starts.
 * 3. Maps error codes to semantic types for instructional UI.
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

        const config = {
            enableHighAccuracy: true,
            timeout: 15000, // 15s recommended for iOS Safari cold start
            maximumAge: 30000,
            ...options
        };

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const result = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude,
                    altitudeAccuracy: pos.coords.altitudeAccuracy,
                    timestamp: pos.timestamp
                };
                setPosition(result);
                setLoading(false);
                options.onSuccess?.(pos);
            },
            (err) => {
                let errorType = 'unavailable';
                if (err.code === 1) errorType = 'denied';
                if (err.code === 3) errorType = 'timeout';

                setError(errorType);
                setLoading(false);
                options.onError?.(errorType);
            },
            config
        );
    }, []);

    return { position, error, loading, request };
}

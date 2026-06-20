import React, { useEffect, useState } from 'react';
import { getDeviceAltitude } from '../services/altitudeService';

export default function AltitudeBadge() {
    const [altitude, setAltitude] = useState(null);

    useEffect(() => {
        getDeviceAltitude().then(alt => setAltitude(alt));
    }, []);

    let text = '— msnm';
    if (altitude !== null) {
        text = `${altitude} msnm`;
    }

    // Theme-aware: usar clases CSS en vez de colores hardcodeados
    let altitudeClass = 'altitude-badge-neutral';
    if (altitude !== null) {
        if (altitude < 1000) {
            // Cálido
            altitudeClass = 'altitude-badge-calido';
        } else if (altitude < 2000) {
            // Templado
            altitudeClass = 'altitude-badge-templado';
        } else if (altitude < 3000) {
            // Montano
            altitudeClass = 'altitude-badge-montano';
        } else {
            // Páramo
            altitudeClass = 'altitude-badge-paramo';
        }
    }

    return (
        <div
            className={`ml-2 px-2 py-0.5 inline-flex items-center text-xs font-bold font-mono tracking-tight border rounded-md shadow-sm transition-colors cursor-default ${altitudeClass}`}
            title={altitude === null ? "Altitud no disponible offline" : "Altitud actual estimada (Piso térmico)"}
            data-testid="altitude-badge"
        >
            {text}
        </div>
    );
}

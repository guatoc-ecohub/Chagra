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

    // Tono neutro por defecto, o coloreado según el estrato de piso térmico.
    // Compatible con TailwindCSS JIT
    let colorClass = 'text-slate-400 bg-slate-800/50 border-slate-700';
    if (altitude !== null) {
        if (altitude < 1000) {
            // Cálido
            colorClass = 'text-orange-400 bg-orange-950/30 border-orange-800/50';
        } else if (altitude < 2000) {
            // Templado
            colorClass = 'text-amber-400 bg-amber-950/30 border-amber-800/50';
        } else if (altitude < 3000) {
            // Montano
            colorClass = 'text-green-400 bg-green-950/30 border-green-800/50';
        } else {
            // Páramo
            colorClass = 'text-indigo-400 bg-indigo-950/30 border-indigo-800/50';
        }
    }

    return (
        <div
            className={`ml-2 px-2 py-0.5 inline-flex items-center text-xs font-bold font-mono tracking-tight border rounded-md shadow-sm transition-colors cursor-default ${colorClass}`}
            title={altitude === null ? "Altitud no disponible offline" : "Altitud actual estimada (Piso térmico)"}
            data-testid="altitude-badge"
        >
            {text}
        </div>
    );
}

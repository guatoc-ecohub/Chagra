import React, { useEffect, useState, useMemo } from 'react';
import { getDeviceAltitude } from '../services/altitudeService';
import { getProfile } from '../services/userProfileService';

export default function AltitudeBadge() {
    // Prioridad: altitud de la finca configurada > altitud del dispositivo
    // Bug fix #clima-altitud-piso-2469: en Mac/desktop el GPS da 0/null,
    // pero la finca ya tiene una altitud correcta configurada.
    const profile = getProfile();
    const profileAltitude = useMemo(() => {
        const alt = profile.finca_altitud;
        return typeof alt === 'number' && Number.isFinite(alt) ? alt : null;
    }, [profile.finca_altitud]);

    const [altitude, setAltitude] = useState(profileAltitude);

    useEffect(() => {
        // Solo intentar obtener altitud del dispositivo si no hay altitud de perfil
        if (profileAltitude !== null) {
            return;
        }

        // Fallback: intentar obtener altitud del dispositivo (GPS o API)
        getDeviceAltitude().then(alt => setAltitude(alt));
    }, [profileAltitude]);

    let text = '— msnm';
    if (altitude !== null) {
        text = `${altitude} msnm`;
    }

    // Tono neutro por defecto, o coloreado según el estrato de piso térmico.
    // Compatible con TailwindCSS JIT
    // Clasificación IDEAM / Caldas (consistente con locationService.PISO_TERMICO_INFO)
    let colorClass = 'text-slate-400 bg-slate-800/50 border-slate-700';
    if (altitude !== null) {
        if (altitude < 1000) {
            // Cálido (0-999 msnm)
            colorClass = 'text-orange-400 bg-orange-950/30 border-orange-800/50';
        } else if (altitude < 2000) {
            // Templado (1000-1999 msnm)
            colorClass = 'text-amber-400 bg-amber-950/30 border-amber-800/50';
        } else if (altitude < 3000) {
            // Frío (2000-2999 msnm)
            colorClass = 'text-green-400 bg-green-950/30 border-green-800/50';
        } else if (altitude < 3600) {
            // Páramo (3000-3599 msnm)
            colorClass = 'text-indigo-400 bg-indigo-950/30 border-indigo-800/50';
        } else {
            // Glacial (3600+ msnm)
            colorClass = 'text-sky-400 bg-sky-950/30 border-sky-800/50';
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

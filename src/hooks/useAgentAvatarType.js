import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'chagra:agent-avatar-type';

// 'angelita' = Angelita, la abeja angelita (Tetragonisca angustula). ES el
// agente de Chagra desde 2026-07-16 ("Angelita como el agente, jubila el
// colibrí" — operador; 2026-07-18: el colibrí sale también de las opciones —
// "solo abejita"). El colibrí queda de fauna decorativa en los mundos 3D,
// nunca como cara del agente.
//
// 'maiz' = planta de maíz, alternativa cultural ancestral.
export const AVATAR_TYPES = ['angelita', 'maiz'];
export const DEFAULT_AVATAR_TYPE = 'angelita';

// Slugs históricos guardados en localStorage de instalaciones viejas:
// ambos colibríes migran a Angelita sin que el usuario haga nada.
const LEGACY_TYPES = { colibri: 'angelita', colibri_svg: 'angelita' };

function readPref() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && AVATAR_TYPES.includes(raw)) return raw;
        if (raw && LEGACY_TYPES[raw]) return LEGACY_TYPES[raw];
    } catch {
        // private mode / quota → fallback
    }
    return DEFAULT_AVATAR_TYPE;
}

/**
 * Hook que gestiona el tipo de avatar del agente. Lee la preferencia desde
 * localStorage y permite actualizarla con sincronización entre pestañas
 * mediante eventos 'storage' y 'chagra:agent-avatar-changed'.
 *
 * @returns {[string, Function]} Tupla con [0] tipo de avatar actual, [1] función para actualizarlo (updateType).
 */
export default function useAgentAvatarType() {
    const [type, setType] = useState(readPref);

    useEffect(() => {
        function onStorage(e) {
            if (e.key === STORAGE_KEY) setType(readPref());
        }
        function onCustom(e) {
            if (e.detail && AVATAR_TYPES.includes(e.detail)) setType(e.detail);
        }
        window.addEventListener('storage', onStorage);
        window.addEventListener('chagra:agent-avatar-changed', onCustom);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('chagra:agent-avatar-changed', onCustom);
        };
    }, []);

    const updateType = useCallback((next) => {
        if (!AVATAR_TYPES.includes(next)) return;
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore, banner-stateful only
        }
        setType(next);
        window.dispatchEvent(
            new CustomEvent('chagra:agent-avatar-changed', { detail: next }),
        );
    }, []);

    return [type, updateType];
}

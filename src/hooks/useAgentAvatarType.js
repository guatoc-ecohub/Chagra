import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'chagra:agent-avatar-type';

// 'colibri' = avatar foto-realista (foto biopunk Lili). Es el nuevo
// default 2026-05-28 ("reemplazar el 3D R3F" — operador). Los usuarios
// que ya tenían 'colibri' en localStorage automáticamente ven la foto
// sin migration (mismo slug, distinta implementación).
//
// 'colibri_svg' = ilustración SVG (Amazilia libando del abutilón). Antes
// era el componente detrás de 'colibri'; ahora vive bajo su propio slug
// para quien prefiera estilo botánico ilustrado.
//
// 'maiz' = planta de maíz, alternativa cultural ancestral.
export const AVATAR_TYPES = ['colibri', 'colibri_svg', 'maiz'];
export const DEFAULT_AVATAR_TYPE = 'colibri';

function readPref() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && AVATAR_TYPES.includes(raw)) return raw;
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

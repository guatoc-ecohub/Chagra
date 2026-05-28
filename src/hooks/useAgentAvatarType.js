import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'chagra:agent-avatar-type';

export const AVATAR_TYPES = ['colibri', 'maiz'];
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

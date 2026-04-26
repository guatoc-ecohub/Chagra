import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'chagra:theme';
const VALID = ['biopunk', 'dark-sober', 'light', 'auto'];

function applyTheme(theme) {
    // Si "auto", resolver según hora local
    let resolved = theme;
    if (theme === 'auto') {
        const hour = new Date().getHours();
        resolved = (hour >= 18 || hour < 6) ? 'dark-sober' : 'light';
    }

    if (resolved === 'biopunk') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', resolved);
    }
    return resolved;
}

export function useTheme() {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || 'biopunk';
    });

    useEffect(() => {
        applyTheme(theme);
        if (theme === 'auto') {
            // Re-evaluar cada 10 min para auto-switching
            const id = setInterval(() => applyTheme('auto'), 10 * 60 * 1000);
            return () => clearInterval(id);
        }
    }, [theme]);

    const setTheme = useCallback((next) => {
        if (!VALID.includes(next)) return;
        localStorage.setItem(STORAGE_KEY, next);
        setThemeState(next);
    }, []);

    return { theme, setTheme };
}

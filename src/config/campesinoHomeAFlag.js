/** Feature flag para la interpretación A del home campesino. */
const FLAG_KEY = 'VITE_CAMPESINO_HOME_A';

export function campesinoHomeAActivo() {
    try {
        const raw = import.meta.env?.[FLAG_KEY];
        if (raw === true) return true;
        if (typeof raw === 'string') return ['true', '1', 'yes'].includes(raw.trim().toLowerCase());
    } catch (_) {
        // La ausencia de la flag no debe impedir que cargue la aplicación.
    }
    return false;
}

export default campesinoHomeAActivo;

/**
 * compaiCast.js — el elenco de Chagra como guías del clima (datos puros).
 *
 * Vive en su propio archivo (no en pedagogia.jsx) para no romper el fast-refresh
 * de Vite (react-refresh/only-export-components): un archivo de componentes solo
 * exporta componentes. Reusa el mismo elenco del valle 3D y del 2D — aquí solo
 * su identidad ligera (nombre + emoji-avatar + acento) para la capa pedagógica.
 */
export const COMPAI = Object.freeze({
    zariguya: { nombre: 'Doña Zarigüeya', emoji: '🐹', color: 'amber', voz: 'sabia y calmada' },
    abejita: { nombre: 'Abejita Angelita', emoji: '🐝', color: 'yellow', voz: 'curiosa y rápida' },
    colibri: { nombre: 'Don Colibrí', emoji: '🐦', color: 'sky', voz: 'veloz, ve todo desde arriba' },
    barbudito: { nombre: 'Barbudito del páramo', emoji: '🐤', color: 'emerald', voz: 'friolento, del frío' },
    borugo: { nombre: 'Borugo', emoji: '🦫', color: 'orange', voz: 'terco, cava y guarda' },
});

export const COMPAI_RING = {
    amber: 'bg-amber-500/15 ring-amber-400/40',
    yellow: 'bg-yellow-500/15 ring-yellow-400/40',
    sky: 'bg-sky-500/15 ring-sky-400/40',
    emerald: 'bg-emerald-500/15 ring-emerald-400/40',
    orange: 'bg-orange-500/15 ring-orange-400/40',
};

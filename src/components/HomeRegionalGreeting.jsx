import { useEffect, useState } from 'react';
import { X, Sun, Sunset, Moon } from 'lucide-react';
import useFincaActiveStore from '../services/fincaActiveStore';

// Saludo regional con period-of-day. El "{period}" se interpola con
// "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora local,
// y "{name}" con el nombre del operador (TopBar lo persiste en
// localStorage 'chagra:operator:name'). Quick-win UX 2026-05-28 demo Diana.
const ZONE_GREETINGS = {
    andino_alto_páramo: '{period}, sumercé{nameSuffix}. Frío de páramo hoy. Lo del día en tu chagra…',
    andino_alto: '{period}, sumercé{nameSuffix}. Frío andino hoy. Lo del día en tu chagra…',
    andino_medio: '{period}, mijo{nameSuffix}. Clima andino templado. Lo del día en tu chagra…',
    valle_caucano: '{period}{nameSuffix}, ¿qué más? Lo del día en tu chagra del valle…',
    caribe: '{period}{nameSuffix}. ¡Qué calor caribe! Lo del día en tu chagra…',
    pacifico: '{period}, compa{nameSuffix}. Lluvia pacífica como siempre. Lo del día en tu chagra…',
    llanos: '{period}, vecino llanero{nameSuffix}. Lo del día en tu chagra…',
    amazonia: '{period}{nameSuffix}. Lo del día en la selva, panita…',
};

const DEFAULT_GREETING = '{period}{nameSuffix}. Lo del día en tu chagra…';

const STORAGE_KEY = 'chagra:home-greeting-dismissed:v1';

function dismissedToday() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const stored = new Date(raw);
        const today = new Date();
        return stored.toDateString() === today.toDateString();
    } catch {
        return false;
    }
}

function dayPeriod() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'night';
}

const PERIOD_STYLES = {
    morning: { bg: 'bg-lime-900/40 border-lime-700/40 text-lime-100', Icon: Sun, label: 'Buenos días' },
    afternoon: { bg: 'bg-amber-900/40 border-amber-700/40 text-amber-100', Icon: Sunset, label: 'Buenas tardes' },
    night: { bg: 'bg-slate-800/80 border-slate-700/40 text-slate-200', Icon: Moon, label: 'Buenas noches' },
};

// Extrae "Miguel" de "Miguel Ángel Martínez" o "miguel.angel" o "Mi finca".
// Devuelve el primer nombre con caso normalizado (Capitalized). Si el storage
// trae el placeholder genérico ("Mi finca" / "Operador"), devolvemos ''.
function getFirstName() {
    try {
        const raw = localStorage.getItem('chagra:operator:name');
        if (!raw) return '';
        const trimmed = raw.trim();
        if (!trimmed || trimmed === 'Mi finca' || trimmed === 'Operador') return '';
        // Tomar primer token alfabético (separadores: espacio, punto, guion)
        const first = trimmed.split(/[\s.\-_]+/)[0];
        if (!first) return '';
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    } catch {
        return '';
    }
}

export default function HomeRegionalGreeting() {
    const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
    const fincas = useFincaActiveStore((s) => s.fincas);
    const [dismissed, setDismissed] = useState(() => dismissedToday());
    const [firstName, setFirstName] = useState(() => getFirstName());

    useEffect(() => {
        const onStorage = (e) => {
            if (!e.key || e.key === 'chagra:operator:name') {
                setFirstName(getFirstName());
            }
            setDismissed(dismissedToday());
        };
        const onOperatorUpdate = (e) => {
            if (e.detail?.key === 'chagra:operator:name') {
                setFirstName(getFirstName());
            }
        };
        window.addEventListener('storage', onStorage);
        window.addEventListener('chagra:operator-update', onOperatorUpdate);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('chagra:operator-update', onOperatorUpdate);
        };
    }, []);

    if (dismissed) return null;

    const finca = (fincas || []).find((f) => f.slug === activeFincaSlug);
    const zone = finca?.biocultural_zone;
    const template = (zone && ZONE_GREETINGS[zone]) || DEFAULT_GREETING;
    const period = dayPeriod();
    const { bg, Icon, label: periodLabel } = PERIOD_STYLES[period];
    // nameSuffix arranca con coma+espacio cuando hay nombre, vacío si no.
    // Patrón colombiano: "Buenos días, Miguel" (no "Buenos días Miguel").
    const nameSuffix = firstName ? `, ${firstName}` : '';
    const greeting = template
        .replace('{period}', periodLabel)
        .replace('{nameSuffix}', nameSuffix);

    function handleDismiss() {
        try {
            localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        } catch {
            // private mode / quota — silently ignore, banner stays gone until reload
        }
        setDismissed(true);
    }

    return (
        <div
            role="banner"
            aria-label="Saludo regional Chagra"
            className={`flex items-center gap-3 px-4 py-2.5 mx-4 mt-3 rounded-xl border ${bg}`}
        >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium leading-snug flex-1">{greeting}</p>
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Cerrar saludo"
                className="shrink-0 p-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            >
                <X size={16} aria-hidden="true" />
            </button>
        </div>
    );
}

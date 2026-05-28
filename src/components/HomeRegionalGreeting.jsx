import { useEffect, useState } from 'react';
import { X, Sun, Sunset, Moon } from 'lucide-react';
import useFincaActiveStore from '../services/fincaActiveStore';

const ZONE_GREETINGS = {
    andino_alto_páramo: 'Buenas, sumercé. Frío de páramo hoy. Lo del día en tu chagra…',
    andino_alto: 'Buenas, sumercé. Frío andino hoy. Lo del día en tu chagra…',
    andino_medio: 'Buenas, mijo. Clima andino templado. Lo del día en tu chagra…',
    valle_caucano: 'Hola, ¿qué más, mijo? Lo del día en tu chagra del valle…',
    caribe: '¡Qué calor caribe, mi llave! Lo del día en tu chagra…',
    pacifico: 'Hola, compa. Lluvia pacífica como siempre. Lo del día en tu chagra…',
    llanos: 'Buenas, vecino llanero. Lo del día en tu chagra…',
    amazonia: 'Lo del día en la selva, panita…',
};

const DEFAULT_GREETING = 'Hola, lo del día en tu chagra…';

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
    morning: { bg: 'bg-lime-900/40 border-lime-700/40 text-lime-100', Icon: Sun },
    afternoon: { bg: 'bg-amber-900/40 border-amber-700/40 text-amber-100', Icon: Sunset },
    night: { bg: 'bg-slate-800/80 border-slate-700/40 text-slate-200', Icon: Moon },
};

export default function HomeRegionalGreeting() {
    const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
    const fincas = useFincaActiveStore((s) => s.fincas);
    const [dismissed, setDismissed] = useState(() => dismissedToday());

    useEffect(() => {
        const onStorage = () => setDismissed(dismissedToday());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (dismissed) return null;

    const finca = (fincas || []).find((f) => f.slug === activeFincaSlug);
    const zone = finca?.biocultural_zone;
    const greeting = (zone && ZONE_GREETINGS[zone]) || DEFAULT_GREETING;
    const period = dayPeriod();
    const { bg, Icon } = PERIOD_STYLES[period];

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

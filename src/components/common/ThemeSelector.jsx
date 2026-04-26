import React from 'react';
import { useTheme } from '../../hooks/useTheme';

const THEMES = [
    { id: 'biopunk', label: 'Biopunk (clásico)', desc: 'El tema original. Acentos neón.' },
    { id: 'dark-sober', label: 'Oscuro sobrio', desc: 'Modo oscuro discreto sin neón.' },
    { id: 'light', label: 'Claro', desc: 'Tema claro para uso diurno.' },
    { id: 'auto', label: 'Automático', desc: 'Cambia entre claro y oscuro según la hora.' },
];

export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2">
                {THEMES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`w-full p-4 rounded-xl text-left border-2 transition-all active:scale-95 ${theme === t.id
                                ? 'border-emerald-500 bg-emerald-900/20'
                                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                            }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className={`text-base font-black ${theme === t.id ? 'text-emerald-400' : 'text-slate-100'}`}>
                                {t.label}
                            </span>
                            {theme === t.id && (
                                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            )}
                        </div>
                        <span className="block text-xs text-slate-400 leading-relaxed">
                            {t.desc}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

import React from 'react';
import { X, Globe } from 'lucide-react';
import MultiFincaGlobe from './MultiFincaGlobe';

export default function MultiFincaModal({ onClose }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 animate-in fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 text-white">
                <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary">
                            <Globe size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">Red de Fincas Chagra</h2>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Soberanía Alimentaria & Datos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-800 rounded-full text-slate-400 transition-colors active:scale-90"
                        aria-label="Cerrar selector"
                    >
                        <X size={24} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
                    <MultiFincaGlobe onSelect={onClose} />
                </div>

                <footer className="p-4 border-t border-slate-900 bg-slate-900/20 shrink-0 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[10px] text-slate-500 font-mono italic">Nodo Central: Guatoc Choachí</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-bold transition-all active:scale-95 border border-slate-700/50"
                    >
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
}

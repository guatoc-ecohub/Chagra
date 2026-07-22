/* eslint-disable chagra-i18n/no-hardcoded-spanish -- deuda i18n preexistente;
   esta consolidacion solo renombra el modal tecnico que consume. */
import React, { useState, useEffect } from 'react';
import { X, Globe, LayoutGrid, Info } from 'lucide-react';
import MultiFincaGlobe from './MultiFincaGlobe';
import { FincaGrid } from './FincaCard';
import FarmOSSetupModal from './FarmOSSetupModal';
import { useFincaActiveStore } from '../services/fincaActiveStore';

export default function MultiFincaModal({ onClose }) {
    const [viewMode, setViewMode] = useState('globe');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [selectedFinca, setSelectedFinca] = useState(null);
    const { setFincas, fincas, setActiveFincaManual } = useFincaActiveStore();

    useEffect(() => {
        const loadFincas = async () => {
            if (fincas.length === 0) {
                try {
                    const res = await fetch('/fincas-publicas.json');
                    if (res.ok) {
                        const data = await res.json();
                        setFincas(data);
                    }
                } catch (err) {
                    console.error('Error cargando fincas:', err);
                }
            }
        };
        loadFincas();
    }, [fincas.length, setFincas]);

    const handleSelect = (finca) => {
        if (!finca.farmos_endpoint) {
            setSelectedFinca(finca);
            setShowOnboarding(true);
        } else {
            // BUG #10 (2026-06-21): desde la vista de Cards "Entrar a la finca"
            // solo cerraba el modal SIN cambiar la finca activa (el globo sí
            // llamaba setActiveFinca, las cards no). Ahora ambos caminos
            // conmutan la finca activa de forma explícita (manual = override GPS).
            if (finca.slug) setActiveFincaManual(finca.slug);
            onClose();
        }
    };

    const handleConfigure = (finca) => {
        setSelectedFinca(finca);
        setShowOnboarding(true);
    };

    return (
        <>
            <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 animate-in fade-in"
                onClick={(e) => e.target === e.currentTarget && onClose()}
                data-testid="multifinca-modal"
            >
                <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 text-white" data-testid="multifinca-panel">
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

                    <div className="px-4 pt-3 border-b border-slate-800 bg-slate-900/30">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('globe')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                    viewMode === 'globe' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                                data-testid="multifinca-view-globe"
                            >
                                <Globe size={14} />
                                Mapa
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                    viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                                data-testid="multifinca-view-grid"
                            >
                                <LayoutGrid size={14} />
                                Cards
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
                        {viewMode === 'globe' ? (
                            <MultiFincaGlobe onSelect={handleSelect} />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 p-3 bg-emerald-900/10 rounded-xl border border-emerald-700/20 text-sm text-emerald-400">
                                    <Info size={18} />
                                    <p>Vista de tarjetas con detalles de cada finca.</p>
                                </div>
                                <FincaGrid fincas={fincas} onSelect={handleSelect} onConfigure={handleConfigure} />
                            </div>
                        )}
                    </div>

                    <footer className="p-4 border-t border-slate-900 bg-slate-900/20 shrink-0 flex justify-between items-center" data-testid="multifinca-footer">
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

            {showOnboarding && selectedFinca && (
                <FarmOSSetupModal
                    finca={selectedFinca}
                    onClose={() => setShowOnboarding(false)}
                    onConfigureLater={() => setShowOnboarding(false)}
                />
            )}
        </>
    );
}

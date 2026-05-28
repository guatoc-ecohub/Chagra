import React from 'react';
import { ArrowLeft, Home, HelpCircle } from 'lucide-react';
import NotificationsBell from '../NotificationsBell';

/**
 * Helper para navegación global desde ScreenShell sin necesidad de prop
 * drilling. Dispara CustomEvent que App.jsx escucha y navega al view
 * solicitado.
 *
 * Operador 2026-05-28: "el boton de alertas y ayuda debe ser visible
 * en el top" en TODA la app — no solo dashboard. Sin esto, los CTAs
 * Help + Alertas solo aparecen en TopBar del dashboard y desaparecen
 * en pantallas secundarias.
 */
function navigateGlobal(view) {
    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: view }));
}

/**
 * ScreenShell, layout común para vistas full-screen (Fase 13.6).
 *
 * Extrae el patrón repetitivo usado por AssetsDashboard, WorkerHistory y
 * la vista de Bodega. Cumple DRY: header consistente + botón back + área
 * principal scrollable.
 *
 * BUGFIX 2026-05-28: el header ahora SIEMPRE incluye 3 botones globales
 * a la derecha (Home + Alertas + Ayuda) — visibles en TODA la app, no
 * solo en el dashboard. Click → dispatchEvent('chagra:nav', view).
 * App.jsx tiene el listener que llama setCurrentView correspondiente.
 *
 * Props:
 *   - title:    string (obligatorio)
 *   - onBack:   handler del botón de regreso (un paso atrás)
 *   - onHome:   handler opcional. Si no se pasa, default a CustomEvent('chagra:nav', 'dashboard').
 *   - icon:     componente de lucide-react opcional para el header
 *   - children: contenido principal
 *   - actions:  slot opcional para botones extra antes de los globales
 */
export const ScreenShell = ({ title, onBack, onHome, icon: Icon, children, actions }) => {
    const handleHome = onHome || (() => navigateGlobal('dashboard'));
    return (
        <div className="h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden">
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            aria-label="Volver"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleHome}
                        className="p-3 bg-slate-800 hover:bg-emerald-700/40 hover:text-emerald-200 active:bg-emerald-700/60 rounded-full transition-colors text-emerald-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        aria-label="Volver al inicio"
                        title="Volver al inicio"
                    >
                        <Home size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                        {Icon && <Icon className="text-morpho shrink-0" size={20} />}
                        {title}
                    </h1>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {actions}
                    {/* Globales: Ayuda (ámbar, jerarquía alta) + Alertas (bell). */}
                    <button
                        type="button"
                        onClick={() => navigateGlobal('help')}
                        aria-label="Manual de uso: cómo usar Chagra"
                        title="Manual de uso"
                        className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/40 text-amber-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <HelpCircle size={22} aria-hidden="true" strokeWidth={2.5} />
                    </button>
                    <NotificationsBell onNavigate={navigateGlobal} />
                </div>
            </header>
            {/* Feedback piloto #5 (Lili 2026-05-18): los FABs flotantes (MicFab,
                FieldFeedback, AgentFab, banners) tapaban los CTAs del final de
                cada screen. Padding-bottom defensivo que respeta safe-area iOS
                + alto suficiente para los 3 FABs apilados verticalmente. */}
            <main className="flex-1 overflow-y-auto bg-slate-950 bg-biopunk-pattern pb-[max(env(safe-area-inset-bottom),0px)_+_120px]">{children}</main>
        </div>
    );
};

export default ScreenShell;

import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';

/**
 * ScreenShell, layout común para vistas full-screen (Fase 13.6).
 *
 * Extrae el patrón repetitivo usado por AssetsDashboard, WorkerHistory y
 * la vista de Bodega. Cumple DRY: header consistente + botón back + área
 * principal scrollable.
 *
 * Props:
 *   - title:    string (obligatorio)
 *   - onBack:   handler del botón de regreso (un paso atrás)
 *   - onHome:   handler opcional para "ir al inicio" (UX feedback pre-demo-institucional
 *               2026-05-19): "El devolverse y retornar al inicio de la app
 *               es desgastante para continuar en cada sección. La
 *               navegación debe ser más amigable y permitir volver a la
 *               pantalla de inicio con un botón claro." En sub-pantallas
 *               anidadas (ej. CaseStudyDetail → casos → dashboard), el
 *               onBack solo sube un nivel; onHome salta directo a inicio.
 *               El TopBar (visible sólo en dashboard) ya tiene su propio
 *               Home logo clickable; este botón es la pieza equivalente
 *               para sub-pantallas que NO renderizan TopBar.
 *   - icon:     componente de lucide-react opcional para el header
 *   - children: contenido principal
 *   - actions:  slot opcional para botones en la esquina derecha del header
 */
export const ScreenShell = ({ title, onBack, onHome, icon: Icon, children, actions }) => (
  <div className="h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden">
    <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="p-3 bg-slate-800 hover:bg-emerald-700/40 hover:text-emerald-200 active:bg-emerald-700/60 rounded-full transition-colors text-emerald-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Volver al inicio"
            title="Volver al inicio"
          >
            <Home size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold text-white flex items-center gap-2 truncate">
          {Icon && <Icon className="text-morpho shrink-0" size={20} />}
          {title}
        </h1>
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </header>
    {/* Feedback piloto #5 (Lili 2026-05-18): los FABs flotantes (MicFab,
        FieldFeedback, AgentFab, banners) tapaban los CTAs del final de
        cada screen. Padding-bottom defensivo que respeta safe-area iOS
        + alto suficiente para los 3 FABs apilados verticalmente. */}
    <main className="flex-1 overflow-y-auto bg-slate-950 bg-biopunk-pattern pb-[max(env(safe-area-inset-bottom),0px)_+_120px]">{children}</main>
  </div>
);

export default ScreenShell;

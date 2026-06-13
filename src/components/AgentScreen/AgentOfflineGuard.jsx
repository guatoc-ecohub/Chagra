import React from 'react';
import { WifiOff, ArrowLeft } from 'lucide-react';

/**
 * AgentOfflineGuard — pantalla de aviso claro cuando se intenta abrir el agente
 * IA sin conexión.
 *
 * POR QUÉ EXISTE (bug offline-first 2026-06-13):
 * AgentScreen es un chunk lazy (`lazy(() => import('./AgentScreen'))`). Si el
 * usuario abre el agente OFFLINE y ese chunk nunca se cargó online (no estaba en
 * el SW precache), el `import()` dinámico falla → el <Suspense>/ErrorBoundary
 * captura un ChunkLoadError genérico ("Algo falló / Este módulo tuvo un error
 * inesperado"). El guard offline real (en ollamaStream.js / AgentScreen) queda
 * INALCANZABLE porque el componente nunca llega a montar.
 *
 * Solución: chequear `navigator.onLine` ANTES del dynamic import, en el routing
 * de App. Si está offline, renderizamos este aviso honesto y específico para el
 * campesino ("el asistente necesita internet; tus datos sí funcionan sin
 * conexión") en vez de un error técnico confuso o una pantalla en blanco.
 *
 * Es un componente estático (no lazy) → siempre disponible offline.
 */
export default function AgentOfflineGuard({ onBack }) {
  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-900/50 rounded-full flex items-center justify-center shrink-0">
            <WifiOff size={24} className="text-amber-400" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Sin conexión a internet</h2>
            <p className="text-sm text-slate-400 mt-1">El asistente IA necesita internet</p>
          </div>
        </div>

        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-300 leading-relaxed">
            El asistente conversacional necesita conexión a internet para responder.
            Conéctate y vuelve a intentarlo.
          </p>
          <p className="text-sm text-emerald-300 leading-relaxed mt-3">
            Tus datos de la finca (siembras, zonas, tareas, bitácora y el catálogo
            de especies) <span className="font-bold">sí funcionan sin conexión</span>.
            Lo que registres ahora se guarda en tu teléfono y se sincroniza cuando
            vuelvas a tener internet.
          </p>
        </div>

        <button
          onClick={onBack}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la finca
        </button>
      </div>
    </div>
  );
}

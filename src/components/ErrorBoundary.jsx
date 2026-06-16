import React from 'react';
import { WifiOff } from 'lucide-react';
import { MSG } from '../config/messages.js';

/**
 * ErrorBoundary de clase que captura errores en el árbol de componentes hijos.
 * Renderiza una UI de recuperación con opciones de reintentar o recargar la app.
 * Los datos de la finca (plantas, tareas, bitácora) permanecen seguros en el
 * dispositivo local.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Stack de componentes:', errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-900/50 rounded-full flex items-center justify-center shrink-0">
                <WifiOff size={24} className="text-amber-400" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{MSG.ALGO_FALLO}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Tus datos de la finca están a salvo
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
              <p className="text-sm text-slate-300 leading-relaxed">
                Este módulo tuvo un error inesperado. La información de tu finca
                (plantas, tareas, bitácora) está guardada de forma segura en tu dispositivo.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {MSG.INTENTAR_DE_NUEVO}
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Recargar Chagra
              </button>
            </div>

            {this.state.error?.message && (
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer hover:text-slate-500 text-2xs uppercase tracking-wider font-bold">
                  Detalle técnico (para depuración)
                </summary>
                <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-auto max-h-20">
                  <p className="font-mono text-red-400 break-all text-2xs">
                    {this.state.error.message}
                  </p>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

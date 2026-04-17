import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Stack de componentes:', errorInfo?.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-red-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-900/50 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Fallo en el modulo</h2>
                <p className="text-sm text-slate-400">Un error impidio renderizar esta vista.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 overflow-auto max-h-32">
              <p className="text-xs font-mono text-red-300 break-all">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Reiniciar vista
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Recargar app
              </button>
            </div>

            <p className="text-2xs text-slate-600 text-center">
              El detalle del error fue registrado en consola para depuracion.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ErrorBoundaryRuta.jsx — ErrorBoundary por ruta con fallback digno.
 *
 * Cada ruta tiene un mensaje contextual específico ("El mundo del café
 * no pudo cargarse") en vez del "Algo falló" genérico.
 *
 * Captura el stack para crash reporting (solo en prod, sin PII).
 * Incluye botón de reintento y botón de volver al valle.
 */
import { Component } from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.nombre — nombre legible de la ruta ("el café", "los animales")
 * @param {string} [props.emoji] — emoji para el fallback
 * @param {() => void} [props.onReintentar] — callback de reintento
 * @param {() => void} [props.onVolver] — callback de volver al valle
 */
export default class ErrorBoundaryRuta extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Crash reporting silencioso (solo en prod, sin PII)
    if (import.meta.env.PROD && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const payload = JSON.stringify({
          ts: new Date().toISOString(),
          ruta: this.props.nombre,
          mensaje: error?.message?.substring(0, 300),
          stack: error?.stack?.substring(0, 500),
          source: 'error-boundary-ruta',
        });
        navigator.sendBeacon('/api/crash-report', new Blob([payload], { type: 'application/json' }));
      } catch { /* silencioso — nunca rompe el crash reporting */ }
    }
  }

  render() {
    if (this.state.error) {
      const { nombre, emoji = '🌱', onReintentar, onVolver } = this.props;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">{emoji}</div>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">
            {nombre} no pudo cargarse
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Ocurrió un error al abrir esta sección. Puede reintentar o volver al valle.
          </p>
          <div className="flex gap-3">
            {onReintentar && (
              <button
                onClick={() => { this.setState({ error: null }); onReintentar(); }}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-emerald-100 text-sm hover:bg-emerald-600 transition-colors"
              >
                Reintentar
              </button>
            )}
            {onVolver && (
              <button
                onClick={onVolver}
                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
              >
                Volver al valle
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

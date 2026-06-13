import { useMemo } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { evaluarEvolucionFinca, getGliessmanLabel } from '../../services/fincaEvolutionService';
import indicatorsData from '../../data/agroecology-indicators.json';

/**
 * FincaEvolutionCard — tarjeta 'Como evoluciona tu finca' para Hoy en finca.
 *
 * Muestra el nivel de Gliessman (0-4) como subtítulo y los 5 atributos MESMIS
 * como barras horizontales. Consume evaluarEvolucionFinca({processes, observations})
 * y las etiquetas de agroecology-indicators.json. Cero fabricación: si no hay
 * datos para un indicador → 'sin datos aun', NUNCA muestra 0.
 *
 * @param {Object} props
 * @param {Array} props.processes - procesos de finca (requerido)
 * @param {Array} props.observations - observaciones (opcional, default [])
 * @param {Function} props.onNavigate - callback para navegación (opcional)
 */
export default function FincaEvolutionCard({ processes = [], observations = [], onNavigate }) {
  // Obtener etiquetas MESMIS desde el JSON
  const mesmisLabels = useMemo(() => {
    return indicatorsData.mesmis_5_atributos.reduce((acc, item) => {
      acc[item.id] = item.nombre;
      return acc;
    }, {});
  }, []);

  // Calcular evolución de la finca
  const evolution = useMemo(() => {
    return evaluarEvolucionFinca({ processes, observations });
  }, [processes, observations]);

  // Obtener label del nivel Gliessman
  const gliessmanLabel = useMemo(() => {
    return getGliessmanLabel(evolution.nivelGliessman);
  }, [evolution.nivelGliessman]);

  // Renderizar barra horizontal para un atributo MESMIS
  const renderMesmisBar = (key, score) => {
    const label = mesmisLabels[key] || key;
    const hasData = score !== null && score !== undefined;

    return (
      <div key={key} className="mb-2 last:mb-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-300">{label}</span>
          <span className="text-xs font-bold text-emerald-300">
            {hasData ? `${score}/4` : 'sin datos aun'}
          </span>
        </div>
        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
          {hasData ? (
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(score / 4) * 100}%` }}
              aria-label={`${label}: ${score} de 4`}
            />
          ) : (
            <div
              className="h-full bg-slate-700/30 rounded-full"
              aria-label={`${label}: sin datos`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <section
      data-testid="finca-evolution-card"
      className="bg-gradient-to-br from-slate-900/80 to-slate-800/70 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-300" aria-hidden="true" />
          <h3 className="text-base font-bold text-white">Cómo evoluciona tu finca</h3>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('evolucion')}
          aria-label="Ver más sobre evolución de finca"
          className="text-xs text-emerald-300/70 hover:text-emerald-300 underline decoration-dotted underline-offset-2"
        >
          ¿Qué es esto?
        </button>
      </div>

      {/* Nivel Gliessman */}
      <div className="mb-3 pb-3 border-b border-slate-700/40">
        <p className="text-sm text-slate-400 mb-1">Nivel de transición agroecológica</p>
        <p className="text-lg font-bold text-emerald-300">{gliessmanLabel}</p>
      </div>

      {/* Barras MESMIS */}
      <div className="mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
          Indicadores de sustentabilidad
        </p>
        {renderMesmisBar('productividad', evolution.mesmis.productividad)}
        {renderMesmisBar('estabilidad_resiliencia', evolution.mesmis.estabilidad_resiliencia)}
        {renderMesmisBar('adaptabilidad', evolution.mesmis.adaptabilidad)}
        {renderMesmisBar('equidad', evolution.mesmis.equidad)}
        {renderMesmisBar('autodependencia', evolution.mesmis.autodependencia)}
      </div>

      {/* Footer informativo */}
      <div className="flex items-start gap-2 pt-2 border-t border-slate-700/40">
        <Info size={14} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Estos indicadores miden qué tan sano está tu sistema productivo. A medida
          que registras cosechas, observaciones y prácticas, Chagra aprende sobre tu
          finca y te muestra cómo evolucionas hacia la agroecología.
        </p>
      </div>
    </section>
  );
}
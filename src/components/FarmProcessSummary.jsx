import React, { useMemo } from 'react';
import { Sprout, Clock, Eye, AlertTriangle, Calendar, Skull, Timer } from 'lucide-react';
import PhenologyTimeline from './PhenologyTimeline';
import { calculateLifecycleEnd, formatLifecycleEnd, getCurrentStage } from '../services/phenologyCalculator';

/**
 * FarmProcessSummary — Resumen campesino del ciclo (Task 36).
 * Tarjeta breve: estado, etapa, próxima acción, riesgo principal, última observación.
 * Muestra además la ETAPA ESTIMADA según la fecha de siembra REAL (ciclo a mitad)
 * y la FECHA ESPERADA DE FIN DE CICLO / muerte natural (senescencia).
 */
export default function FarmProcessSummary({ process, lastObservation, pestRisks, altitudeM, compact = false }) {
  const attributes = process?.attributes;
  const sowingDate = attributes?.created_at || null;
  const slug = attributes?.subject_slug || null;

  // Etapa ESTIMADA por fenología desde la fecha de siembra REAL (no día 0):
  // una lechuga sembrada hace 1 mes arranca su ciclo a mitad.
  const estimated = useMemo(() => {
    if (!slug || !sowingDate) return null;
    try { return getCurrentStage({ speciesSlug: slug, sowingDate, altitudeM }); } catch { return null; }
  }, [slug, sowingDate, altitudeM]);

  // Fin de ciclo / muerte natural esperada (senescencia tras cosecha).
  const lifecycleEnd = useMemo(() => {
    if (!slug || !sowingDate) return null;
    try { return calculateLifecycleEnd({ speciesSlug: slug, sowingDate, altitudeM }); } catch { return null; }
  }, [slug, sowingDate, altitudeM]);
  const finDeCiclo = lifecycleEnd ? formatLifecycleEnd(lifecycleEnd) : '';

  if (!process) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-500 text-sm text-center">
        No hay ciclo activo.
      </div>
    );
  }

  const hasRisk = Array.isArray(pestRisks) && pestRisks.some((r) => r.risk === 'crítico' || r.risk === 'alto');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout size={16} className="text-lime-400" />
          <span className="text-sm font-bold text-slate-200">{attributes.subject_label || 'Ciclo'}</span>
        </div>
        <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
          attributes.status === 'active' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-800 text-slate-500'
        }`}>
          {attributes.status === 'active' ? 'ACTIVO' : attributes.status}
        </span>
      </div>

      {/* Etapa actual */}
      <div className="flex items-center gap-2 text-xs">
        <Clock size={12} className="text-slate-500" />
        <span className="text-slate-300">Etapa: <strong className="text-lime-300">{attributes.current_stage || '—'}</strong></span>
        {attributes.quantity && (
          <span className="text-slate-500">· {attributes.quantity} {attributes.unit}</span>
        )}
      </div>

      {/* Etapa ESTIMADA por fenología desde la fecha de siembra real (ciclo a mitad) */}
      {estimated && estimated.stage && (
        <div className="flex items-center gap-2 text-xs" data-testid="ciclo-etapa-estimada">
          <Timer size={12} className="text-sky-400" />
          <span className="text-slate-400">
            Según la fecha de siembra, va por <strong className="text-sky-300">{estimated.stage.label}</strong>
            {estimated.daysElapsed != null && <span className="text-slate-500"> ({estimated.daysElapsed} días)</span>}
          </span>
        </div>
      )}

      {/* Fin de ciclo / muerte natural esperada (senescencia) */}
      {finDeCiclo && (
        <div className="flex items-center gap-2 text-xs bg-slate-800/40 rounded-lg px-2 py-1.5" data-testid="ciclo-fin-de-ciclo">
          <Skull size={12} className="text-amber-400 shrink-0" />
          <span className="text-amber-200/90">{finDeCiclo}</span>
          <span className="text-slate-600 ml-auto">tras cosecha la planta no rebrota</span>
        </div>
      )}

      {/* Timeline compacta */}
      {!compact && attributes.subject_slug && attributes.created_at && (
        <PhenologyTimeline
          speciesSlug={attributes.subject_slug}
          sowingDate={attributes.created_at}
          compact={true}
        />
      )}

      {/* Última observación */}
      {lastObservation && (
        <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/40 rounded-lg p-2">
          <Eye size={12} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>"{lastObservation}"</span>
        </div>
      )}

      {/* Riesgo principal */}
      {hasRisk && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-lg p-2 text-xs text-red-200">
          <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
          <span>Riesgo: {pestRisks.filter((r) => r.risk === 'crítico' || r.risk === 'alto').map((r) => r.pest).join(', ')}</span>
        </div>
      )}

      {/* Fechas */}
      <div className="flex items-center gap-2 text-2xs text-slate-600">
        <Calendar size={9} />
        <span>Creado: {new Date(attributes.created_at).toLocaleDateString('es-CO')}</span>
        {attributes.updated_at && (
          <span>· Actualizado: {new Date(attributes.updated_at).toLocaleDateString('es-CO')}</span>
        )}
      </div>
    </div>
  );
}

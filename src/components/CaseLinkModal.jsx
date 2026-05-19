import React, { useMemo, useState } from 'react';
import { X, FileText, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import { useCaseStudyStore } from '../store/useCaseStudyStore';
import { useFincaActiveStore } from '../services/fincaActiveStore';

/**
 * CaseLinkModal — bridge severity → case_study (audit deep 070.6)
 * ================================================================
 * Trigger: tras guardar una observación con severity `high` o `critical`,
 * ObservationScreen abre este modal para que el operador decida si vincula
 * el log a un caso de estudio existente o crea uno nuevo.
 *
 * Filtrado:
 *   - Solo casos activos (state ∉ closed_*).
 *   - Si la observación está vinculada a un asset--plant con `species_slug`
 *     conocido, prioriza los casos cuyo `subject.species_ids` contiene ese
 *     slug. Cuando no hay matches se muestra la lista completa de activos.
 *
 * Acciones:
 *   - Tap en caso card → linkLog(caseId, logId) → cierra modal.
 *   - "Crear nuevo caso de estudio" → createCase con pre-fill
 *     (species_slug, severity, created_at, timeline[0] = evento observación,
 *     visibility='private', validation.status='pending') + linkLog.
 *   - "Más tarde" → solo cierra el modal (no destructivo).
 *
 * Si no hay casos activos, el modal expone únicamente la CTA "Crear nuevo
 * caso" como camino feliz.
 *
 * Props:
 *   - logId: string — id del log--observation que dispara el bridge.
 *   - severity: 'high' | 'critical' — severidad del evento detonante.
 *   - description: string — texto libre de la observación (alimenta timeline[0]).
 *   - speciesSlug: string | null — slug de la planta asociada (cuando aplica).
 *   - plantId: string | null — id del asset--plant (para metadata).
 *   - landId: string | null — id del asset--land donde ocurrió.
 *   - onClose: () => void — cierre del modal (link, create o "más tarde").
 */

const SEVERITY_META = {
  critical: { icon: AlertTriangle, color: 'text-red-400', label: 'crítica' },
  high: { icon: AlertCircle, color: 'text-orange-400', label: 'alta' },
};

const formatRelativeTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  if (days < 365) return `hace ${Math.floor(days / 30)}m`;
  return `hace ${Math.floor(days / 365)}a`;
};

export default function CaseLinkModal({
  logId,
  severity = 'high',
  description = '',
  speciesSlug = null,
  plantId = null,
  landId = null,
  onClose,
}) {
  const getActive = useCaseStudyStore((s) => s.getActive);
  const linkLog = useCaseStudyStore((s) => s.linkLog);
  const createCase = useCaseStudyStore((s) => s.createCase);
  const linkTimelineEvent = useCaseStudyStore((s) => s.linkTimelineEvent);
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Lista filtrada de casos activos. Si hay species_slug, prioriza matches;
  // si no hay matches o no hay slug, muestra todos los activos.
  const { cases, filteredBySpecies } = useMemo(() => {
    const all = (typeof getActive === 'function' ? getActive() : []) || [];
    if (!speciesSlug) return { cases: all, filteredBySpecies: false };
    const matches = all.filter((c) =>
      Array.isArray(c.subject?.species_ids) && c.subject.species_ids.includes(speciesSlug)
    );
    if (matches.length > 0) return { cases: matches, filteredBySpecies: true };
    return { cases: all, filteredBySpecies: false };
  }, [getActive, speciesSlug]);

  const sevMeta = SEVERITY_META[severity] || SEVERITY_META.high;
  const SevIcon = sevMeta.icon;

  const handleLink = (caseId) => {
    if (busy || !logId) return;
    setBusy(true);
    setError(null);
    try {
      linkLog(caseId, logId);
      onClose?.();
    } catch (err) {
      console.error('[CaseLinkModal] Error linking log:', err);
      setError('No se pudo vincular el registro. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const handleCreateAndLink = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const desc = (description || '').trim();
      const title = desc
        ? `Observación ${sevMeta.label} — ${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}`
        : `Observación ${sevMeta.label} ${new Date().toLocaleDateString('es-CO')}`;
      const now = new Date().toISOString();
      const newCaseId = createCase({
        title,
        finca_slug: activeFincaSlug || 'guatoc',
        zone_freetext: '',
        subject: {
          species_ids: speciesSlug ? [speciesSlug] : [],
          count_total: null,
          count_affected: null,
        },
        problem: {
          name_freetext: desc || `Observación severidad ${sevMeta.label}`,
          severity,
          detected_at: now,
        },
        visibility: 'private',
      });

      // Pre-fill timeline[0] con el evento de observación que detonó el caso.
      try {
        linkTimelineEvent(newCaseId, {
          event_type: 'observation',
          date: now,
          description: desc || `Observación severidad ${sevMeta.label} registrada`,
        });
      } catch (timelineErr) {
        console.warn('[CaseLinkModal] No se pudo pre-fill timeline[0]:', timelineErr);
      }

      if (logId) linkLog(newCaseId, logId);
      onClose?.();
    } catch (err) {
      console.error('[CaseLinkModal] Error creando caso:', err);
      setError('No se pudo crear el caso de estudio. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    if (busy) return;
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-link-modal-title"
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-lg bg-slate-950 border border-orange-800/50 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <header className="p-4 bg-gradient-to-r from-orange-900/40 to-orange-950/40 border-b border-orange-800/40 flex items-start gap-3 shrink-0">
          <SevIcon size={22} className={`${sevMeta.color} mt-0.5 shrink-0`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 id="case-link-modal-title" className="text-sm font-bold text-orange-200">
              Severidad {sevMeta.label}: ¿vinculas a un caso?
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Las observaciones serias suelen ser parte de un problema mayor. Vincula este registro a un caso de estudio para llevar el hilo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar"
            disabled={busy}
            className="p-2 hover:bg-slate-800 rounded text-slate-400 shrink-0 disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {error && (
            <div role="alert" className="p-2 rounded bg-red-950/40 border border-red-800 text-xs text-red-300">
              {error}
            </div>
          )}

          {cases.length === 0 && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              No hay casos de estudio activos para esta finca. Crea uno nuevo para empezar a seguir este problema.
            </div>
          )}

          {cases.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-1">
                {filteredBySpecies
                  ? `Casos activos para esta especie (${cases.length})`
                  : `Casos activos (${cases.length})`}
              </p>
              {cases.map((c) => {
                const cSev = SEVERITY_META[c.problem?.severity];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleLink(c.id)}
                    disabled={busy}
                    className="w-full text-left p-3 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-600 active:bg-slate-800 transition-all flex items-start gap-3 min-h-[64px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText size={18} className="shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {c.problem?.name_freetext || 'Problema sin descripción'}
                        {cSev && <> · <span className={cSev.color}>severidad {cSev.label}</span></>}
                        {c.created_at && <> · {formatRelativeTime(c.created_at)}</>}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <footer className="p-3 border-t border-slate-800 shrink-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCreateAndLink}
            disabled={busy}
            className="w-full p-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>Crear nuevo caso de estudio</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 text-sm min-h-[44px] disabled:opacity-50"
          >
            Más tarde
          </button>
          {plantId && (
            <p className="text-[10px] text-slate-600 italic text-center" data-testid="case-link-modal-plant-id">
              Planta asociada: {plantId}
              {landId ? ` · zona: ${landId}` : ''}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

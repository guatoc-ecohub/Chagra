import React from 'react';
import { AlertTriangle, AlertCircle, Activity, ChevronRight, FileText } from 'lucide-react';
import { useCaseStudyStore } from '../store/useCaseStudyStore';

/**
 * CaseStudyTopWidget — visualiza los Top N problemas activos en el
 * DashboardView principal de Chagra. Permite navegar directo al
 * detalle del caso.
 *
 * MVP DR-044 sub-iv: ranking severidad × afectados × tiempo
 * (lógica en useCaseStudyStore.getTopActiveProblems).
 *
 * KISS: cuando no hay casos activos, NO se renderiza (ocupa cero
 * espacio). Cuando hay 1-3 muestra inline. Cuando hay 4+ corta y
 * agrega "ver todos →".
 */

const SEVERITY_META = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-950/30', dot: 'bg-red-500' },
  high: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-950/30', dot: 'bg-orange-500' },
  medium: { icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-950/30', dot: 'bg-yellow-500' },
  low: { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-800/40', dot: 'bg-slate-500' },
};

const STATE_LABELS = {
  open: 'Abierto',
  in_treatment: 'Tratando',
  monitoring: 'Monitor',
  escalated: 'Escalado',
};

const formatRel = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  return `${Math.floor(days / 365)}a`;
};

const formatPct = (a, t) => {
  if (!t) return null;
  const p = ((a || 0) / t) * 100;
  return p < 1 ? p.toFixed(1) + '%' : Math.round(p) + '%';
};

export default function CaseStudyTopWidget({ onNavigate, maxItems = 3 }) {
  const topActive = useCaseStudyStore((s) => s.getTopActiveProblems(10));
  const totalActive = topActive.length;
  if (totalActive === 0) return null;

  const visible = topActive.slice(0, maxItems);
  const remaining = totalActive - visible.length;

  return (
    <section
      className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-3 space-y-2"
      aria-label="Top problemas activos casos de estudio"
    >
      <button
        type="button"
        onClick={() => onNavigate?.('casos')}
        className="w-full flex items-center justify-between gap-2 hover:opacity-90 transition-opacity"
        aria-label="Ver todos los casos de estudio"
      >
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          Top problemas activos ({totalActive})
        </h3>
        <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
      </button>

      <div className="space-y-1.5">
        {visible.map((c) => {
          const meta = SEVERITY_META[c.problem.severity] || SEVERITY_META.medium;
          const Icon = meta.icon;
          const pct = formatPct(c.subject.count_affected, c.subject.count_total);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onNavigate?.('caso_detail', { caseId: c.id })}
              className={`w-full text-left p-2 rounded-lg ${meta.bg} hover:bg-slate-800/40 border border-slate-800 transition-colors flex items-center gap-2`}
            >
              <span className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} aria-hidden="true" />
              <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{c.problem.name_freetext}</p>
                <p className="text-slate-400 text-[10px] flex gap-2 truncate">
                  <span>{c.finca_slug}{c.zone_freetext ? ` · ${c.zone_freetext}` : ''}</span>
                  {pct && <span>{c.subject.count_affected ?? '—'}/{c.subject.count_total} <span className="text-slate-500">({pct})</span></span>}
                  <span className="text-slate-500">{STATE_LABELS[c.state]}</span>
                  <span className="text-slate-500">{formatRel(c.problem.detected_at || c.created_at)}</span>
                </p>
              </div>
              <ChevronRight className="w-3 h-3 shrink-0 text-slate-600" />
            </button>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => onNavigate?.('casos')}
          className="w-full text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider py-1 flex items-center justify-center gap-1"
        >
          <FileText className="w-3 h-3" />
          Ver {remaining} más
        </button>
      )}
    </section>
  );
}

import React, { useState } from 'react';
import { FileText, Plus, AlertTriangle, AlertCircle, Activity, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { useCaseStudyStore, CASE_SEVERITIES } from '../store/useCaseStudyStore';
import { useFincaActiveStore } from '../services/fincaActiveStore';

/**
 * CaseStudyScreen — vista lista de casos de estudio agronómicos
 * ================================================================
 * MVP 2026-05-17 (driver: caso David trozador).
 *
 * UX:
 *  - Sección "Top problemas activos" — orden por severidad × afectados × tiempo.
 *  - Botón "+ Nuevo caso" inline form.
 *  - Filtro por finca (default = finca activa del fincaActiveStore).
 *  - Click row → navega a detalle.
 *
 * Post-DR-044: incluir export PDF, cross-case similarity.
 * Post-DR-040: typeahead pest_id en lugar de free text.
 * Post-DR-041: linkear cohort_id formal.
 */

const SEVERITY_META = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-950/40', label: 'CRÍTICA' },
  high: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-950/40', label: 'ALTA' },
  medium: { icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-950/40', label: 'MEDIA' },
  low: { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-800/40', label: 'BAJA' },
};

const STATE_META = {
  open: { color: 'text-red-400', label: 'Abierto' },
  in_treatment: { color: 'text-orange-300', label: 'En tratamiento' },
  monitoring: { color: 'text-yellow-300', label: 'Monitoreo' },
  closed_resolved: { color: 'text-emerald-400', label: 'Resuelto' },
  closed_failed: { color: 'text-red-500', label: 'Falló' },
  escalated: { color: 'text-purple-400', label: 'Escalado' },
};

const formatRelativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  if (days < 365) return `hace ${Math.floor(days / 30)}m`;
  return `hace ${Math.floor(days / 365)}a`;
};

const formatPct = (affected, total) => {
  if (!total || total === 0) return '—';
  const pct = ((affected || 0) / total) * 100;
  return pct < 1 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
};

const CaseCard = ({ caseObj, onSelect }) => {
  const sevMeta = SEVERITY_META[caseObj.problem.severity] || SEVERITY_META.medium;
  const stateMeta = STATE_META[caseObj.state] || STATE_META.open;
  const SevIcon = sevMeta.icon;
  const treated = (caseObj.treatments_applied || []).length > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(caseObj.id)}
      className={`w-full text-left p-4 rounded-xl border border-slate-800 ${sevMeta.bg} hover:border-slate-600 active:bg-slate-900 transition-all flex items-start gap-3`}
    >
      <SevIcon className={`shrink-0 w-5 h-5 mt-0.5 ${sevMeta.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-black uppercase tracking-wider ${sevMeta.color}`}>{sevMeta.label}</span>
          <span className="text-slate-600">·</span>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${stateMeta.color}`}>{stateMeta.label}</span>
        </div>
        <h3 className="text-white font-semibold text-sm truncate">{caseObj.title}</h3>
        <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>{caseObj.finca_slug}{caseObj.zone_freetext ? ` · ${caseObj.zone_freetext}` : ''}</span>
          <span>
            {caseObj.subject.count_affected ?? '—'}/{caseObj.subject.count_total ?? '—'}{' '}
            <span className="text-slate-500">({formatPct(caseObj.subject.count_affected, caseObj.subject.count_total)})</span>
          </span>
          <span>{formatRelativeTime(caseObj.problem.detected_at || caseObj.created_at)}</span>
          {treated && <span className="text-emerald-500">✓ tratado</span>}
        </div>
        <p className="text-xs text-slate-500 mt-1 truncate">{caseObj.problem.name_freetext}</p>
      </div>
      <ChevronRight className="shrink-0 w-4 h-4 text-slate-500 mt-1" />
    </button>
  );
};

const NewCaseForm = ({ onCreate, onCancel, defaultFincaSlug }) => {
  const [form, setForm] = useState({
    title: '',
    finca_slug: defaultFincaSlug || 'guatoc',
    zone_freetext: '',
    problem_name: '',
    severity: 'medium',
    count_total: '',
    count_affected: '',
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.problem_name.trim()) return;
    onCreate({
      title: form.title.trim(),
      finca_slug: form.finca_slug,
      zone_freetext: form.zone_freetext.trim(),
      subject: {
        count_total: form.count_total ? parseInt(form.count_total, 10) : null,
        count_affected: form.count_affected ? parseInt(form.count_affected, 10) : null,
      },
      problem: {
        name_freetext: form.problem_name.trim(),
        severity: form.severity,
        detected_at: new Date().toISOString(),
      },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-700">
      <input
        type="text"
        required
        placeholder="Título del caso (ej. Trozador invernadero David)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
      />
      <input
        type="text"
        placeholder="Problema (ej. Trozador — Agrotis ipsilon)"
        required
        value={form.problem_name}
        onChange={(e) => setForm({ ...form, problem_name: e.target.value })}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Zona (opcional)"
          value={form.zone_freetext}
          onChange={(e) => setForm({ ...form, zone_freetext: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
        />
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
        >
          {CASE_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_META[s]?.label || s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          placeholder="Total plantas"
          value={form.count_total}
          onChange={(e) => setForm({ ...form, count_total: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
        />
        <input
          type="number"
          min="0"
          placeholder="Afectadas"
          value={form.count_affected}
          onChange={(e) => setForm({ ...form, count_affected: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors"
        >
          Crear caso
        </button>
      </div>
    </form>
  );
};

const EmptyState = ({ onNew }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <FileText className="w-12 h-12 text-slate-700 mb-4" />
    <h3 className="text-slate-300 font-bold text-base mb-1">Sin casos de estudio aún</h3>
    <p className="text-slate-500 text-xs max-w-xs mb-6">
      Registra un problema agronómico (plaga, enfermedad, déficit) para hacer seguimiento del tratamiento y aprender de él.
    </p>
    <button
      type="button"
      onClick={onNew}
      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center gap-2"
    >
      <Plus className="w-4 h-4" /> Crear primer caso
    </button>
  </div>
);

export default function CaseStudyScreen({ onBack, onSelectCase }) {
  const cases = useCaseStudyStore((s) => s.cases);
  const getTopActiveProblems = useCaseStudyStore((s) => s.getTopActiveProblems);
  const createCase = useCaseStudyStore((s) => s.createCase);
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const [showForm, setShowForm] = useState(false);

  const topActive = getTopActiveProblems(10);
  const closed = cases.filter((c) => ['closed_resolved', 'closed_failed'].includes(c.state));

  const handleCreate = (data) => {
    const id = createCase(data);
    setShowForm(false);
    if (onSelectCase) onSelectCase(id);
  };

  return (
    <ScreenShell
      title="Casos de Estudio"
      icon={FileText}
      onBack={onBack}
      actions={
        !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>
        )
      }
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {showForm && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Nuevo caso</h2>
            <NewCaseForm onCreate={handleCreate} onCancel={() => setShowForm(false)} defaultFincaSlug={activeFincaSlug} />
          </section>
        )}

        {cases.length === 0 && !showForm && <EmptyState onNew={() => setShowForm(true)} />}

        {topActive.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Top {topActive.length} problemas activos
            </h2>
            <div className="space-y-2">
              {topActive.map((c) => (
                <CaseCard key={c.id} caseObj={c} onSelect={onSelectCase} />
              ))}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              Histórico ({closed.length})
            </h2>
            <div className="space-y-2 opacity-70">
              {closed.slice(0, 20).map((c) => (
                <CaseCard key={c.id} caseObj={c} onSelect={onSelectCase} />
              ))}
            </div>
          </section>
        )}
      </div>
    </ScreenShell>
  );
}

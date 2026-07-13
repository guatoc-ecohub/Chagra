import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, AlertTriangle, AlertCircle, Activity, CheckCircle, ChevronRight, Sparkles, Loader2, Mic, MicOff, Globe, Users, Lock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { useCaseStudyStore, CASE_SEVERITIES } from '../store/useCaseStudyStore';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { extractCaseFromText } from '../services/caseStudyVoiceExtractor';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe } from '../services/voiceService';
import { loadCaseStudyDemos } from '../services/caseStudyDemoLoader';

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
  const visibility = caseObj.visibility || 'private';
  const validationStatus = caseObj.validation?.status || 'pending';
  const pendingRecs = (caseObj.recommendations || []).some(
    (r) => r.validation_required && !r.validated_by
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(caseObj.id)}
      className={`w-full text-left p-4 rounded-xl border border-slate-800 ${sevMeta.bg} hover:border-slate-600 active:bg-slate-900 transition-all flex items-start gap-3`}
    >
      <SevIcon className={`shrink-0 w-5 h-5 mt-0.5 ${sevMeta.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-black uppercase tracking-wider ${sevMeta.color}`}>{sevMeta.label}</span>
          <span className="text-slate-600">·</span>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${stateMeta.color}`}>{stateMeta.label}</span>
          {/* Badges visibility + validación (2026-05-18) */}
          {visibility === 'public' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-300" title="Compartido en la red Chagra">
              <Globe className="w-2.5 h-2.5" />
            </span>
          )}
          {visibility === 'finca' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-sky-300" title="Compartido con la finca">
              <Users className="w-2.5 h-2.5" />
            </span>
          )}
          {validationStatus === 'certified' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300" title="Caso certificado por profesional">
              <ShieldCheck className="w-2.5 h-2.5" />
            </span>
          )}
          {pendingRecs && validationStatus !== 'certified' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-300" title="Recomendaciones pendientes de validación">
              <ShieldAlert className="w-2.5 h-2.5" />
            </span>
          )}
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
  // DR-044 sub-viii feature 1: Voice/text → Caso extraction via Ollama
  const [showExtractor, setShowExtractor] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [touched, setTouched] = useState(/** @type {Record<string,boolean>} */ ({}));
  const recorder = useVoiceRecorder();

  // Bug 069.10 — validación inline: títulos/problemas mínimos para no crear
  // casos de estudio basura; counts coherentes (afectados ≤ total).
  const errors = useMemo(() => {
    /** @type {{title?: string, problem_name?: string, count_total?: string, count_affected?: string}} */
    const e = {};
    if (!form.title.trim()) e.title = 'Indica un título';
    else if (form.title.trim().length < 3) e.title = 'Mínimo 3 caracteres';
    if (!form.problem_name.trim()) e.problem_name = 'Describe el problema';
    else if (form.problem_name.trim().length < 3) e.problem_name = 'Mínimo 3 caracteres';
    const total = form.count_total === '' ? null : Number(form.count_total);
    const affected = form.count_affected === '' ? null : Number(form.count_affected);
    if (total !== null) {
      if (!Number.isFinite(total) || total < 0) e.count_total = 'Debe ser ≥ 0';
      else if (!Number.isInteger(total)) e.count_total = 'Sin decimales';
    }
    if (affected !== null) {
      if (!Number.isFinite(affected) || affected < 0) e.count_affected = 'Debe ser ≥ 0';
      else if (!Number.isInteger(affected)) e.count_affected = 'Sin decimales';
      else if (total !== null && Number.isFinite(total) && affected > total) {
        e.count_affected = 'No puede exceder el total';
      }
    }
    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;
  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const submit = (e) => {
    e.preventDefault();
    if (hasErrors) {
      setTouched({ title: true, problem_name: true, count_total: true, count_affected: true });
      return;
    }
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

  const handleExtract = async () => {
    if (!transcript.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractCaseFromText(transcript);
      if (!extracted) {
        setExtractError('No se pudo extraer información. Verifica el texto o llena manualmente.');
        return;
      }
      // Pre-fill form fields (preserva ediciones manuales previas si están)
      setForm((prev) => ({
        ...prev,
        title: prev.title || extracted.title || '',
        problem_name: prev.problem_name || extracted.problem_name || '',
        zone_freetext: prev.zone_freetext || extracted.subzone || '',
        severity: extracted.severity || prev.severity,
        count_total: extracted.count_total != null ? String(extracted.count_total) : prev.count_total,
        count_affected: extracted.count_affected != null ? String(extracted.count_affected) : prev.count_affected,
      }));
      setShowExtractor(false);
    } catch (e) {
      setExtractError(e?.message || 'Error en extracción');
    } finally {
      setExtracting(false);
    }
  };

  // DR-044 sub-viii Feature 1 (voice path real): mic → recorder → Whisper transcribe → fill textarea
  const handleMicToggle = async () => {
    setExtractError(null);
    if (recorder.isRecording) {
      // Stop + transcribe
      try {
        const blob = await recorder.stop();
        if (!blob) {
          setExtractError('Grabación vacía. Vuelve a intentar.');
          return;
        }
        setTranscribing(true);
        const text = await transcribe(blob, { language: 'es' });
        setTranscript((prev) => (prev ? prev + ' ' + text : text).trim());
      } catch (e) {
        setExtractError('Transcripción falló: ' + (e?.message || 'sin detalle'));
      } finally {
        setTranscribing(false);
      }
    } else {
      try {
        await recorder.start();
      } catch (e) {
        setExtractError('Mic no disponible: ' + (e?.message || 'permiso denegado'));
      }
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-700">
      {/* DR-044 sub-viii Feature 1: extracción asistida por IA local */}
      {!showExtractor && (
        <button
          type="button"
          onClick={() => setShowExtractor(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-900/40 border border-purple-700/50 text-purple-200 text-xs font-bold hover:bg-purple-800/40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Extraer desde transcripción (IA local)
        </button>
      )}
      {showExtractor && (
        <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-700/50 space-y-2">
          <p className="text-purple-200 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Dicta o escribe lo que observaste
          </p>
          {/* Mic button (DR-044 F1 voice real) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={transcribing || extracting}
              title={recorder.isRecording ? 'Detener grabación' : 'Iniciar grabación'}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                recorder.isRecording
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                  : 'bg-purple-700 hover:bg-purple-600'
              } text-white disabled:opacity-50`}
            >
              {recorder.isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <div className="flex-1 text-[10px] text-purple-300">
              {recorder.isRecording && (
                <span>Grabando… {Math.floor(recorder.durationMs / 1000)}s</span>
              )}
              {transcribing && (
                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Transcribiendo…</span>
              )}
              {!recorder.isRecording && !transcribing && (
                <span className="text-slate-500">Tap el micro para dictar (o escribe abajo)</span>
              )}
            </div>
          </div>
          <textarea
            placeholder='Ej: "Esta mañana en el invernadero de los 1000 tomates, encontré 10 plantas cerca de la entrada atacadas por trozador, los tallos cortados."'
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
            disabled={extracting || transcribing}
          />
          {extractError && <p className="text-red-400 text-xs">{extractError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowExtractor(false); setTranscript(''); setExtractError(null); recorder.reset?.(); }}
              disabled={extracting || transcribing}
              className="flex-1 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting || transcribing || !transcript.trim()}
              className="flex-1 py-1.5 rounded bg-purple-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {extracting ? <><Loader2 className="w-3 h-3 animate-spin" /> Procesando…</> : 'Extraer campos'}
            </button>
          </div>
        </div>
      )}

      <div>
        <input
          type="text"
          required
          placeholder="Título del caso (ej. Trozador invernadero David)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={() => markTouched('title')}
          aria-invalid={touched.title && !!errors.title}
          className={`w-full px-3 py-2 rounded-lg bg-slate-800 border text-white text-sm focus:outline-none focus:border-slate-500 ${
            touched.title && errors.title ? 'border-red-700' : 'border-slate-700'
          }`}
        />
        {touched.title && errors.title && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.title}
          </p>
        )}
      </div>
      <div>
        <input
          type="text"
          placeholder="Problema (ej. Trozador — Agrotis ipsilon)"
          required
          value={form.problem_name}
          onChange={(e) => setForm({ ...form, problem_name: e.target.value })}
          onBlur={() => markTouched('problem_name')}
          aria-invalid={touched.problem_name && !!errors.problem_name}
          className={`w-full px-3 py-2 rounded-lg bg-slate-800 border text-white text-sm focus:outline-none focus:border-slate-500 ${
            touched.problem_name && errors.problem_name ? 'border-red-700' : 'border-slate-700'
          }`}
        />
        {touched.problem_name && errors.problem_name && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.problem_name}
          </p>
        )}
      </div>
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
        <div>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Total plantas"
            value={form.count_total}
            onChange={(e) => setForm({ ...form, count_total: e.target.value })}
            onBlur={() => markTouched('count_total')}
            aria-invalid={touched.count_total && !!errors.count_total}
            className={`w-full px-3 py-2 rounded-lg bg-slate-800 border text-white text-sm focus:outline-none focus:border-slate-500 ${
              touched.count_total && errors.count_total ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {touched.count_total && errors.count_total && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.count_total}
            </p>
          )}
        </div>
        <div>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Afectadas"
            value={form.count_affected}
            onChange={(e) => setForm({ ...form, count_affected: e.target.value })}
            onBlur={() => markTouched('count_affected')}
            aria-invalid={touched.count_affected && !!errors.count_affected}
            className={`w-full px-3 py-2 rounded-lg bg-slate-800 border text-white text-sm focus:outline-none focus:border-slate-500 ${
              touched.count_affected && errors.count_affected ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {touched.count_affected && errors.count_affected && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.count_affected}
            </p>
          )}
        </div>
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
          disabled={hasErrors}
          aria-disabled={hasErrors || undefined}
          title={hasErrors ? 'Completa los campos correctamente' : undefined}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
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

// 2026-05-18 — Tabs/filtros para modo foro + validación.
// "Todos" muestra el layout original (top activos + histórico). Los
// demás filtran cases por visibility/validation con un único listado.
const FILTERS = [
  { id: 'all', label: 'Todos', icon: FileText },
  { id: 'private', label: 'Privados', icon: Lock },
  { id: 'shared', label: 'Compartidos red', icon: Globe },
  { id: 'pending', label: 'Pendiente validación', icon: ShieldAlert },
];

const FilterTabs = ({ value, onChange, counts }) => (
  <nav
    aria-label="Filtros de casos"
    className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-1"
  >
    {FILTERS.map((f) => {
      const Icon = f.icon;
      const active = value === f.id;
      const count = counts?.[f.id];
      return (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
            active
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Icon className="w-3 h-3" />
          {f.label}
          {typeof count === 'number' && count > 0 && (
            <span className={`text-[10px] px-1 rounded ${active ? 'bg-emerald-900' : 'bg-slate-700'}`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </nav>
);

export default function CaseStudyScreen({ onBack, onHome, onSelectCase }) {
  const cases = useCaseStudyStore((s) => s.cases);
  const getTopActiveProblems = useCaseStudyStore((s) => s.getTopActiveProblems);
  const createCase = useCaseStudyStore((s) => s.createCase);
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  // 2026-05-18 — Hidrata casos demo public/case-studies-demo/manifest.json
  // on mount. Idempotente: si los ids ya están en LS, no re-insertan.
  // Silent-fail: si offline o sin manifest, simplemente no hay demo.
  useEffect(() => {
    loadCaseStudyDemos(useCaseStudyStore).catch(() => {});
  }, []);

  const topActive = getTopActiveProblems(10);
  const closed = cases.filter((c) => ['closed_resolved', 'closed_failed'].includes(c.state));

  // Conteos por filtro para las tabs (fuente de verdad: cases del store
  // tal cual están, sin normalización extendida; los flags opcionales se
  // leen con defaults defensivos).
  const counts = useMemo(() => {
    const priv = cases.filter((c) => (c.visibility || 'private') === 'private').length;
    const shared = cases.filter((c) => (c.visibility || 'private') === 'public').length;
    const pending = cases.filter((c) => {
      const v = c.validation?.status || 'pending';
      if (v === 'pending' || v === 'self-reported') return true;
      const recs = c.recommendations || [];
      return recs.some((r) => r.validation_required && !r.validated_by);
    }).length;
    return { all: cases.length, private: priv, shared, pending };
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (filter === 'all') return null; // null = usa el layout dual original
    if (filter === 'private') {
      return cases.filter((c) => (c.visibility || 'private') === 'private');
    }
    if (filter === 'shared') {
      return cases.filter((c) => (c.visibility || 'private') === 'public');
    }
    if (filter === 'pending') {
      return cases.filter((c) => {
        const v = c.validation?.status || 'pending';
        if (v === 'pending' || v === 'self-reported') return true;
        const recs = c.recommendations || [];
        return recs.some((r) => r.validation_required && !r.validated_by);
      });
    }
    return cases;
  }, [filter, cases]);

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
      onHome={onHome}
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

        {/* Tabs de filtros (2026-05-18) — sólo cuando hay cases */}
        {cases.length > 0 && (
          <FilterTabs value={filter} onChange={setFilter} counts={counts} />
        )}

        {/* Vista "Todos" — layout dual original (top activos + histórico) */}
        {filter === 'all' && topActive.length > 0 && (
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

        {filter === 'all' && closed.length > 0 && (
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

        {/* Vistas filtradas — listado plano */}
        {filter !== 'all' && filteredCases && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
              {filter === 'private' && <Lock className="w-3 h-3" />}
              {filter === 'shared' && <Globe className="w-3 h-3" />}
              {filter === 'pending' && <ShieldAlert className="w-3 h-3" />}
              {FILTERS.find((f) => f.id === filter)?.label} ({filteredCases.length})
            </h2>
            {filteredCases.length === 0 ? (
              <p className="text-slate-600 text-xs italic px-2">Sin casos en este filtro.</p>
            ) : (
              <div className="space-y-2">
                {filteredCases.map((c) => (
                  <CaseCard key={c.id} caseObj={c} onSelect={onSelectCase} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </ScreenShell>
  );
}

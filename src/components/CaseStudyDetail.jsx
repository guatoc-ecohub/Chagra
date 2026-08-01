import React, { useState, useMemo } from 'react';
import { FileText, AlertTriangle, AlertCircle, Activity, CheckCircle, XCircle, Beaker, Clock, MapPin, Camera, Sparkles, Loader2, Image as ImageIcon, Trash2, ShieldCheck, ShieldAlert, Globe, Lock, Users, Lightbulb, Plus, CalendarClock, Stethoscope } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import {
  useCaseStudyStore,
  CASE_VISIBILITIES,
  CASE_TIMELINE_EVENT_TYPES,
  withExtendedDefaults,
} from '../store/useCaseStudyStore';
import PhotoCaptureField from './PhotoCaptureField';
import { summarizeLessons } from '../services/caseStudyLessonsSummarizer';
import { recommendTreatments } from '../services/caseStudyTreatmentRecommender';

/**
 * CaseStudyDetail — vista detalle + edición de un caso de estudio
 * ================================================================
 * MVP 2026-05-17.
 *
 * Permite:
 *  - Ver timeline state_history.
 *  - Agregar tratamientos (auto-transition open → in_treatment).
 *  - Transition manual (monitoring, escalated, closed).
 *  - Anotar lessons_learned al cerrar.
 *
 * Post-DR-044: añadir export PDF, photo gallery, log linking UI.
 */

const SEVERITY_META = {
  critical: { color: 'text-red-400', label: 'CRÍTICA' },
  high: { color: 'text-orange-400', label: 'ALTA' },
  medium: { color: 'text-yellow-400', label: 'MEDIA' },
  low: { color: 'text-slate-400', label: 'BAJA' },
};

const STATE_META = {
  open: { color: 'text-red-400', label: 'Abierto', icon: AlertTriangle },
  in_treatment: { color: 'text-orange-300', label: 'En tratamiento', icon: Activity },
  monitoring: { color: 'text-yellow-300', label: 'Monitoreo', icon: Clock },
  closed_resolved: { color: 'text-emerald-400', label: 'Resuelto', icon: CheckCircle },
  closed_failed: { color: 'text-red-500', label: 'Falló', icon: XCircle },
  escalated: { color: 'text-purple-400', label: 'Escalado', icon: AlertCircle },
};

const formatDT = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
};

// 2026-05-18 — meta para timeline (línea narrativa user-facing) y
// visibility (modo foro Capa 2 federación).
const TIMELINE_EVENT_META = {
  observation: { color: 'text-sky-400', bg: 'bg-sky-950/40', label: 'Observación', icon: AlertCircle },
  intervention: { color: 'text-orange-300', bg: 'bg-orange-950/40', label: 'Intervención', icon: Beaker },
  result: { color: 'text-emerald-400', bg: 'bg-emerald-950/40', label: 'Resultado', icon: CheckCircle },
  note: { color: 'text-slate-300', bg: 'bg-slate-900/60', label: 'Nota', icon: FileText },
};

const VISIBILITY_META = {
  private: { label: 'Privado', icon: Lock, color: 'text-slate-300', desc: 'Solo tú lo ves.' },
  finca: { label: 'Compartir finca', icon: Users, color: 'text-sky-400', desc: 'Visible para tu equipo de finca.' },
  public: { label: 'Compartir red Chagra', icon: Globe, color: 'text-blue-400', desc: 'Esta finca contribuye su caso a la red. Operador da consentimiento.' },
};

// Hace "hace 3 días" / "hoy" / "hace 2h".
const formatRelative = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return formatDT(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  if (days < 365) return `hace ${Math.floor(days / 30)}m`;
  return `hace ${Math.floor(days / 365)}a`;
};

// Form para agregar evento al timeline (DR-044 sub-ix Feature 6).
const TimelineEventForm = ({ onSubmit, onCancel }) => {
  const [eventType, setEventType] = useState('observation');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');
  const [actor, setActor] = useState('Operador campo');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showCapture, setShowCapture] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePhoto = async (blob) => {
    if (!blob) return;
    setBusy(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(/** @type {string} */ (reader.result));
        setShowCapture(false);
        setBusy(false);
      };
      reader.onerror = () => setBusy(false);
      reader.readAsDataURL(blob);
    } catch {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({
      event_type: eventType,
      date: new Date(date).toISOString(),
      description: description.trim(),
      actor: actor.trim() || undefined,
      photo_url: photoUrl || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded-lg bg-slate-900 border border-slate-700">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
        >
          {CASE_TIMELINE_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TIMELINE_EVENT_META[t]?.label || t}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          aria-label="Fecha del evento"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
        />
      </div>
      <textarea
        placeholder="Describe lo que viste / hiciste / resultado"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        required
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <input
        type="text"
        placeholder="Actor (ej. Operador campo, Ing. Pérez)"
        value={actor}
        onChange={(e) => setActor(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
      />
      {!showCapture && !photoUrl && (
        <button
          type="button"
          onClick={() => setShowCapture(true)}
          className="w-full py-1.5 rounded bg-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1 hover:bg-slate-700"
        >
          <Camera className="w-3 h-3" /> Agregar foto (opcional)
        </button>
      )}
      {showCapture && (
        <div className="p-2 rounded bg-slate-950 border border-slate-800">
          <PhotoCaptureField onPhoto={handlePhoto} onRemove={() => setShowCapture(false)} label="Foto del evento" />
          {busy && <p className="text-slate-400 text-xs mt-2">Procesando…</p>}
          <button
            type="button"
            onClick={() => setShowCapture(false)}
            disabled={busy}
            className="mt-2 w-full py-1.5 rounded bg-slate-800 text-slate-400 text-xs"
          >
            Cancelar foto
          </button>
        </div>
      )}
      {photoUrl && (
        <div className="relative">
          <img src={photoUrl} alt="Preview" className="w-full h-32 object-cover rounded border border-slate-700" />
          <button
            type="button"
            onClick={() => setPhotoUrl('')}
            className="absolute top-1 right-1 p-1 rounded bg-red-900/80 text-red-200 hover:bg-red-800"
            aria-label="Quitar foto"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded bg-slate-800 text-slate-300 text-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!description.trim()}
          className="flex-1 py-2 rounded bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
        >
          Agregar evento
        </button>
      </div>
    </form>
  );
};

// Form para agregar una recomendación (operador o agente).
const RecommendationForm = ({ onSubmit, onCancel, defaultSuggester = 'Operador' }) => {
  const [text, setText] = useState('');
  const [suggester, setSuggester] = useState(defaultSuggester);
  const [validationRequired, setValidationRequired] = useState(true);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      suggested_by: suggester.trim() || defaultSuggester,
      validation_required: validationRequired,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded-lg bg-slate-900 border border-slate-700">
      <textarea
        placeholder="Recomendación accionable (ej. Aplicar caldo bordelés 0.5%…)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        required
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <input
        type="text"
        placeholder="Quién la sugiere (ej. Agente Chagra, Operador, Ing. Pérez)"
        value={suggester}
        onChange={(e) => setSuggester(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
      />
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={validationRequired}
          onChange={(e) => setValidationRequired(e.target.checked)}
          className="rounded border-slate-600"
        />
        Requiere validación de un agrónomo/profesional
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded bg-slate-800 text-slate-300 text-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex-1 py-2 rounded bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </form>
  );
};

// Form para validar recomendación como profesional certificado.
const ValidatorForm = ({ onSubmit, onCancel, target = 'recomendación' }) => {
  const [name, setName] = useState('');
  const [creds, setCreds] = useState('');
  const [notes, setNotes] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      validator_name: name.trim(),
      validator_credentials: creds.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded-lg bg-slate-900 border border-emerald-800">
      <p className="text-[10px] uppercase font-black tracking-wider text-emerald-300 flex items-center gap-1.5">
        <Stethoscope className="w-3 h-3" /> Validar {target} como profesional
      </p>
      <input
        type="text"
        placeholder="Nombre del validador (ej. Ing. Ana Pérez)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <input
        type="text"
        placeholder="Credenciales (ej. Ing. Agrónoma UNAL · Reg. ICA AG-2018-3421)"
        value={creds}
        onChange={(e) => setCreds(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
      />
      <textarea
        placeholder="Notas de validación (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-xs"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded bg-slate-800 text-slate-300 text-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 py-2 rounded bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Certificar
        </button>
      </div>
    </form>
  );
};

// Sección de visibilidad / modo foro.
const VisibilitySection = ({ value, onChange }) => {
  const current = VISIBILITY_META[value] || VISIBILITY_META.private;
  const CurrentIcon = current.icon;
  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
        <CurrentIcon className={`w-3 h-3 ${current.color}`} /> Visibilidad
      </h3>
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
        <div className="grid grid-cols-3 gap-1">
          {CASE_VISIBILITIES.map((v) => {
            const meta = VISIBILITY_META[v];
            const Icon = meta.icon;
            const active = v === value;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                className={`px-2 py-2 rounded text-[11px] font-bold flex flex-col items-center gap-1 transition-colors ${
                  active ? 'bg-slate-700 text-white ring-1 ring-emerald-500/60' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? meta.color : 'text-slate-500'}`} />
                {meta.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{current.desc}</p>
        {value === 'public' && (
          <div className="mt-1 p-2 rounded bg-blue-950/40 border border-blue-900 flex items-start gap-2">
            <Globe className="w-3 h-3 text-blue-300 mt-0.5 shrink-0" />
            <p className="text-[10px] text-blue-200 leading-snug">
              Compartido en la red Chagra. Otros operadores ven el caso anonimizado (sin datos sensibles de la finca) como referencia.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

// Sección validation a nivel caso.
const ValidationBlock = ({ validation, onCertify, onReject }) => {
  const [showValidator, setShowValidator] = useState(false);
  const status = validation?.status || 'pending';
  const isCertified = status === 'certified';
  const isRejected = status === 'rejected';

  const STATUS_BADGE = {
    pending: { label: 'Sin validar', color: 'text-slate-400', bg: 'bg-slate-800', icon: ShieldAlert },
    'self-reported': { label: 'Auto-reportado', color: 'text-yellow-300', bg: 'bg-yellow-950/30', icon: ShieldAlert },
    certified: { label: 'Certificado', color: 'text-emerald-300', bg: 'bg-emerald-950/40', icon: ShieldCheck },
    rejected: { label: 'Rechazado', color: 'text-red-300', bg: 'bg-red-950/40', icon: XCircle },
  };
  const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const Icon = meta.icon;

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
        <Icon className={`w-3 h-3 ${meta.color}`} /> Validación profesional
      </h3>
      <div className={`p-3 rounded-lg border ${meta.bg} ${isCertified ? 'border-emerald-800' : isRejected ? 'border-red-800' : 'border-slate-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
          {validation?.validated_at && (
            <span className="text-[10px] text-slate-500">{formatDT(validation.validated_at)}</span>
          )}
        </div>
        {validation?.validator_name && (
          <p className="text-xs text-slate-200 font-semibold">{validation.validator_name}</p>
        )}
        {validation?.validator_credentials && (
          <p className="text-[10px] text-slate-400 italic">{validation.validator_credentials}</p>
        )}
        {validation?.notes && (
          <p className="text-[11px] text-slate-300 mt-1.5 whitespace-pre-wrap">{validation.notes}</p>
        )}
        {!isCertified && !showValidator && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowValidator(true)}
              className="flex-1 py-1.5 rounded bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 flex items-center justify-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> Validar como agrónomo
            </button>
            {status !== 'rejected' && onReject && (
              <button
                type="button"
                onClick={onReject}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                title="Marcar caso como rechazado por validación"
              >
                Rechazar
              </button>
            )}
          </div>
        )}
        {showValidator && (
          <div className="mt-2">
            <ValidatorForm
              target="el caso"
              onSubmit={(payload) => {
                onCertify(payload);
                setShowValidator(false);
              }}
              onCancel={() => setShowValidator(false)}
            />
          </div>
        )}
      </div>
    </section>
  );
};

// Sección recomendaciones.
const RecommendationsSection = ({ recs, onAdd, onValidate }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [validatingId, setValidatingId] = useState(null);

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
        <Lightbulb className="w-3 h-3" /> Recomendaciones ({recs.length})
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="ml-auto text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Agregar
          </button>
        )}
      </h3>
      {showAdd && (
        <div className="mb-2">
          <RecommendationForm
            onSubmit={(rec) => {
              onAdd(rec);
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}
      {recs.length === 0 && !showAdd && (
        <p className="text-slate-600 text-xs italic">Sin recomendaciones aún.</p>
      )}
      <div className="space-y-2">
        {recs.map((r) => {
          const validated = !!r.validated_by;
          const requiresValidation = !!r.validation_required;
          let badge;
          if (validated) {
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-800 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-2.5 h-2.5" /> Validada por {r.validated_by}
              </span>
            );
          } else if (requiresValidation) {
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-300 bg-yellow-950/40 border border-yellow-800 px-1.5 py-0.5 rounded">
                <ShieldAlert className="w-2.5 h-2.5" /> Pendiente validación profesional
              </span>
            );
          } else {
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                Auto-reportada
              </span>
            );
          }
          return (
            <div key={r.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-start justify-between gap-2 mb-1">
                {badge}
                {!validated && requiresValidation && (
                  <button
                    type="button"
                    onClick={() => setValidatingId(validatingId === r.id ? null : r.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
                  >
                    Validar
                  </button>
                )}
              </div>
              <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{r.text}</p>
              <p className="text-[10px] text-slate-500 mt-1.5">
                <span className="font-mono">{r.suggested_by}</span>
                {r.validated_at && <span className="ml-2">· validada {formatDT(r.validated_at)}</span>}
              </p>
              {validatingId === r.id && (
                <div className="mt-2">
                  <ValidatorForm
                    target="la recomendación"
                    onSubmit={(payload) => {
                      onValidate(r.id, payload);
                      setValidatingId(null);
                    }}
                    onCancel={() => setValidatingId(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Sección timeline narrativa (DR-044 sub-ix F6).
const NarrativeTimeline = ({ events, onAdd }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [fullPhoto, setFullPhoto] = useState(null);
  const ordered = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
        <CalendarClock className="w-3 h-3" /> Bitácora del caso ({events.length})
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="ml-auto text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Evento
          </button>
        )}
      </h3>
      {showAdd && (
        <div className="mb-3">
          <TimelineEventForm
            onSubmit={(evt) => {
              onAdd(evt);
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}
      {ordered.length === 0 && !showAdd && (
        <p className="text-slate-600 text-xs italic">Sin eventos. Documenta observaciones, intervenciones y resultados.</p>
      )}
      <div className="space-y-2">
        {ordered.map((e) => {
          const meta = TIMELINE_EVENT_META[e.event_type] || TIMELINE_EVENT_META.note;
          const Icon = meta.icon;
          return (
            <div key={e.id} className={`p-3 rounded-lg border border-slate-800 ${meta.bg}`}>
              <div className="flex items-start gap-3">
                <Icon className={`shrink-0 w-4 h-4 mt-0.5 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                    <span className="text-slate-500 text-[10px]" title={formatDT(e.date)}>{formatRelative(e.date)}</span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed mt-1 whitespace-pre-wrap">{e.description}</p>
                  {e.actor && (
                    <p className="text-[10px] text-slate-500 mt-1">— {e.actor}</p>
                  )}
                  {(e.photo_url || e.photo_id) && (
                    <button
                      type="button"
                      onClick={() => setFullPhoto(e.photo_url || e.photo_id)}
                      className="mt-2 block w-full max-w-[200px]"
                      aria-label="Ver foto en grande"
                    >
                      <img
                        src={e.photo_url || e.photo_id}
                        alt="Foto del evento"
                        className="w-full h-24 object-cover rounded border border-slate-700 hover:border-slate-500"
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {fullPhoto && (
        <button
          type="button"
          onClick={() => setFullPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          aria-label="Cerrar"
        >
          <img src={fullPhoto} alt="Foto a tamaño completo" className="max-w-full max-h-full object-contain" />
        </button>
      )}
    </section>
  );
};

const TreatmentForm = ({ onSubmit, onCancel, caseObj }) => {
  // Lista canónica del catálogo Chagra v3.1 + Track C (2026-05-17:
  // bacillus_thuringiensis, trichogramma_spp, extracto_neem agregados).
  // Post-DR-040 esto será un typeahead vivo contra catalog.biopreparados[].
  const KNOWN = [
    'bacillus_thuringiensis', 'trichogramma_spp', 'extracto_neem',
    'caldo_bordeles', 'caldo_sulfocalcico', 'bacillus_subtilis_foliar',
    'trichoderma_harzianum_suelo',
    'bocashi', 'biol', 'purin_ortiga', 'te_compost', 'humus_liquido',
    'lixiviado_frutas', 'supermagro', 'compost_maduro', 'biofertilizante_algas',
    'cal_dolomita', 'roca_fosforica', 'ceniza_madera',
  ];

  // DR-044 sub-viii Feature 4: sugerencias contextuales del recommender
  // basadas en el problema del caso. KISS offline-first: keyword matching
  // contra catalog. Post-DR-040 será RAG embeddings nomic-embed-text + LLM.
  const suggestions = caseObj?.problem?.name_freetext
    ? recommendTreatments(caseObj.problem.name_freetext)
    : [];

  const [bid, setBid] = useState(suggestions[0]?.id || KNOWN[0]);
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ biopreparado_id: bid, dose: dose.trim(), notes: notes.trim() });
      }}
      className="space-y-2 p-3 rounded-lg bg-slate-900 border border-slate-700"
    >
      {/* Sugerencias contextuales (DR-044 F4) */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-black tracking-wider text-purple-300 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Sugeridos para "{caseObj.problem.name_freetext}"
          </p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setBid(s.id); setNotes(s.rationale); }}
                title={s.rationale}
                className={`text-[10px] px-2 py-1 rounded font-mono ${
                  bid === s.id
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-800 text-purple-200 hover:bg-purple-900/50'
                } ${s.priority === 'high' ? 'ring-1 ring-purple-500/50' : ''}`}
              >
                {s.id}
                {s.priority === 'high' && ' ★'}
              </button>
            ))}
          </div>
        </div>
      )}
      <select
        value={bid}
        onChange={(e) => setBid(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      >
        {KNOWN.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Dosis (ej. 1g/L)"
        value={dose}
        onChange={(e) => setDose(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <textarea
        placeholder="Notas (aplicación, condiciones, momento)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded bg-slate-800 text-slate-300 text-sm">
          Cancelar
        </button>
        <button type="submit" className="flex-1 py-2 rounded bg-emerald-600 text-white text-sm font-bold">
          Registrar
        </button>
      </div>
    </form>
  );
};

const CloseCaseForm = ({ onSubmit, onCancel, currentAffected, caseObj }) => {
  const [resolved, setResolved] = useState(true);
  const [finalAffected, setFinalAffected] = useState(currentAffected || '');
  const [lessons, setLessons] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // DR-044 sub-viii Feature 5: lessons_learned summarization via Ollama
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await summarizeLessons(caseObj);
      if (!result || !result.text) {
        setGenError('IA no disponible. Llena manualmente.');
        return;
      }
      setLessons(result.text);
    } catch (e) {
      setGenError(e?.message || 'Error generando resumen');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          resolved,
          final_count_affected: finalAffected ? parseInt(finalAffected, 10) : null,
          lessons_learned: lessons.trim(),
        });
      }}
      className="space-y-2 p-3 rounded-lg bg-slate-900 border border-emerald-800"
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setResolved(true)}
          className={`flex-1 py-2 rounded text-sm font-bold ${resolved ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
        >
          ✓ Resuelto
        </button>
        <button
          type="button"
          onClick={() => setResolved(false)}
          className={`flex-1 py-2 rounded text-sm font-bold ${!resolved ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400'}`}
        >
          ✗ Falló
        </button>
      </div>
      <input
        type="number"
        min="0"
        placeholder="Afectadas finales"
        value={finalAffected}
        onChange={(e) => setFinalAffected(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Lecciones aprendidas</label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            title="Generar borrador con IA local (Ollama)"
            className="text-[10px] px-2 py-1 rounded bg-purple-900/50 text-purple-200 hover:bg-purple-800/50 disabled:opacity-50 flex items-center gap-1"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? 'Generando…' : 'Sugerir con IA'}
          </button>
        </div>
        <textarea
          placeholder="Qué funcionó, qué no, qué repetir/evitar"
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
        />
        {genError && <p className="text-red-400 text-[10px]">{genError}</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded bg-slate-800 text-slate-300 text-sm">
          Cancelar
        </button>
        <button type="submit" className="flex-1 py-2 rounded bg-emerald-600 text-white text-sm font-bold">
          Cerrar caso
        </button>
      </div>
    </form>
  );
};

/**
 * PhotoGallery — visualiza fotos linkadas al caso (DR-044 sub-viii F2 partial).
 * MVP: photos guardadas como data URLs en photo_asset_ids[].
 * Post-DR-044 sub-i: migración a FarmOS media asset IDs reales.
 */
const PhotoGallery = ({ photos, onAdd, onRemove }) => {
  const [showCapture, setShowCapture] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePhoto = async (blob) => {
    if (!blob) return;
    setBusy(true);
    try {
      // KISS: convertir blob a data URL para storage local en case.photo_asset_ids[]
      // Migración a FarmOS media post-DR-044 sub-i.
      const reader = new FileReader();
      reader.onloadend = () => {
        onAdd(reader.result); // data:image/jpeg;base64,...
        setShowCapture(false);
        setBusy(false);
      };
      reader.onerror = () => setBusy(false);
      reader.readAsDataURL(blob);
    } catch {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
        <ImageIcon className="w-3 h-3" /> Fotos ({photos.length})
        {!showCapture && (
          <button
            type="button"
            onClick={() => setShowCapture(true)}
            className="ml-auto text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
          >
            <Camera className="w-3 h-3" /> Capturar
          </button>
        )}
      </h3>
      {showCapture && (
        <div className="mb-3 p-3 rounded-lg bg-slate-900 border border-slate-700">
          <PhotoCaptureField onPhoto={handlePhoto} onRemove={() => setShowCapture(false)} label="Tomar foto del problema" />
          {busy && <p className="text-slate-400 text-xs mt-2">Procesando…</p>}
          <button
            type="button"
            onClick={() => setShowCapture(false)}
            disabled={busy}
            className="mt-2 w-full py-1.5 rounded bg-slate-800 text-slate-400 text-xs"
          >
            Cancelar
          </button>
        </div>
      )}
      {photos.length === 0 && !showCapture && (
        <p className="text-slate-600 text-xs italic">Sin fotos aún. Captura para documentar.</p>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-slate-800"
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="absolute top-1 right-1 p-1 rounded bg-red-900/80 text-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Eliminar foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default function CaseStudyDetail({ caseId, onBack, onHome }) {
  // 2026-05-18: NO usar `s.getById(caseId)` en selector — devuelve nuevo
  // objeto cada render (withExtendedDefaults hace spread) → React #185
  // (Maximum update depth). Seleccionar el raw case desde `cases` (ref
  // estable de zustand) y normalizar fuera del selector con useMemo.
  const rawCase = useCaseStudyStore((s) => s.cases.find((cc) => cc.id === caseId));
  const c = useMemo(() => (rawCase ? withExtendedDefaults(rawCase) : null), [rawCase]);
  const addTreatment = useCaseStudyStore((s) => s.addTreatment);
  const transitionState = useCaseStudyStore((s) => s.transitionState);
  const closeCase = useCaseStudyStore((s) => s.closeCase);
  // 2026-05-18 — extensión foro/validación/timeline
  const linkTimelineEvent = useCaseStudyStore((s) => s.linkTimelineEvent);
  const setValidation = useCaseStudyStore((s) => s.setValidation);
  const setVisibility = useCaseStudyStore((s) => s.setVisibility);
  const addRecommendation = useCaseStudyStore((s) => s.addRecommendation);
  const validateRecommendation = useCaseStudyStore((s) => s.validateRecommendation);

  const [showTreatment, setShowTreatment] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const linkPhoto = useCaseStudyStore((s) => s.linkPhoto);
  // KISS: mutator local para remove (sin agregar action al store; raro en MVP).
  const removePhoto = (url) => {
    const store = useCaseStudyStore.getState();
    const target = store.cases.find((cc) => cc.id === caseId);
    if (!target) return;
    useCaseStudyStore.setState({
      cases: store.cases.map((cc) =>
        cc.id === caseId
          ? { ...cc, photo_asset_ids: cc.photo_asset_ids.filter((u) => u !== url), updated_at: new Date().toISOString() }
          : cc
      ),
    });
  };

  if (!c) {
    return (
      <ScreenShell title="Caso no encontrado" icon={FileText} onBack={onBack} onHome={onHome}>
        <div className="flex-1 flex items-center justify-center text-slate-500">
          ID inválido o caso eliminado.
        </div>
      </ScreenShell>
    );
  }

  // Operator bug 2026-05-18: click en caso de estudio → error 'recargar
  // vista'. Causa: casos con shape antiguo o demo seed sin nested
  // `problem` rompían acceso directo a c.problem.severity etc.
  // Fix: optional chaining + fallbacks defensivos. ErrorBoundary capturaba
  // el throw y mostraba "recargar app".
  const sevMeta = SEVERITY_META[c.problem?.severity] || SEVERITY_META.medium;
  const stateMeta = STATE_META[c.state] || STATE_META.open;
  const StateIcon = stateMeta.icon;
  const isClosed = ['closed_resolved', 'closed_failed'].includes(c.state);
  const problemName = c.problem?.name_freetext || c.title || 'Caso de estudio';
  const detectedAt = c.problem?.detected_at || c.created_at;
  const subject = c.subject || {};

  return (
    <ScreenShell title={c.title || 'Caso de estudio'} icon={FileText} onBack={onBack} onHome={onHome}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Header status */}
        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StateIcon className={`w-4 h-4 ${stateMeta.color}`} />
                <span className={`text-xs font-black uppercase tracking-wider ${stateMeta.color}`}>{stateMeta.label}</span>
                <span className="text-slate-600">·</span>
                <span className={`text-xs font-bold uppercase ${sevMeta.color}`}>{sevMeta.label}</span>
              </div>
              <h2 className="text-white text-base font-semibold">{problemName}</h2>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.finca_slug || 'finca'}{c.zone_freetext ? ` · ${c.zone_freetext}` : ''}</span>
                {subject.count_total && (
                  <span>{subject.count_affected ?? 0}/{subject.count_total} afectadas</span>
                )}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDT(detectedAt)}</span>
              </div>
              {/* Badges visibility + validation (2026-05-18) */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.visibility === 'public' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-200 bg-blue-950/60 border border-blue-800 px-1.5 py-0.5 rounded">
                    <Globe className="w-2.5 h-2.5" /> Compartido en la red
                  </span>
                )}
                {c.visibility === 'finca' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-200 bg-sky-950/60 border border-sky-800 px-1.5 py-0.5 rounded">
                    <Users className="w-2.5 h-2.5" /> Compartido finca
                  </span>
                )}
                {c.validation?.status === 'certified' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                    <ShieldCheck className="w-2.5 h-2.5" /> Certificado
                  </span>
                )}
                {c.validation?.status === 'pending' && (c.recommendations || []).some((r) => r.validation_required && !r.validated_by) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-200 bg-yellow-950/60 border border-yellow-800 px-1.5 py-0.5 rounded">
                    <ShieldAlert className="w-2.5 h-2.5" /> Pendiente validación
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isClosed && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowTreatment((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 flex items-center gap-1"
              >
                <Beaker className="w-3 h-3" /> Registrar tratamiento
              </button>
              {c.state === 'in_treatment' && (
                <button
                  onClick={() => transitionState(c.id, 'monitoring', 'Tratamiento aplicado, observando outcome')}
                  className="px-3 py-1.5 rounded-lg bg-yellow-700 text-white text-xs font-bold hover:bg-yellow-600"
                >
                  → Monitorear
                </button>
              )}
              {c.state !== 'escalated' && (
                <button
                  onClick={() => transitionState(c.id, 'escalated', 'Requiere experto externo')}
                  className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-600"
                >
                  Escalar
                </button>
              )}
              <button
                onClick={() => setShowClose((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600"
              >
                Cerrar
              </button>
            </div>
          )}
        </section>

        {/* Treatment form inline */}
        {showTreatment && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Nuevo tratamiento</h3>
            <TreatmentForm
              caseObj={c}
              onSubmit={(t) => {
                addTreatment(c.id, t);
                setShowTreatment(false);
              }}
              onCancel={() => setShowTreatment(false)}
            />
          </section>
        )}

        {/* Close form inline */}
        {showClose && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Cierre del caso</h3>
            <CloseCaseForm
              caseObj={c}
              currentAffected={c.subject?.count_affected}
              onSubmit={(payload) => {
                closeCase(c.id, payload);
                setShowClose(false);
              }}
              onCancel={() => setShowClose(false)}
            />
          </section>
        )}

        {/* Photo gallery (DR-044 sub-viii F2 partial) */}
        <PhotoGallery
          photos={c.photo_asset_ids}
          onAdd={(dataUrl) => linkPhoto(c.id, dataUrl)}
          onRemove={removePhoto}
        />

        {/* 2026-05-18 — Modo foro: visibilidad del caso */}
        <VisibilitySection
          value={c.visibility || 'private'}
          onChange={(v) => setVisibility(c.id, v)}
        />

        {/* 2026-05-18 — Validación profesional del caso */}
        <ValidationBlock
          validation={c.validation}
          onCertify={(payload) =>
            setValidation(c.id, { status: 'certified', ...payload })
          }
          onReject={() =>
            setValidation(c.id, {
              status: 'rejected',
              notes: 'Marcado como rechazado por el operador.',
            })
          }
        />

        {/* 2026-05-18 — Bitácora narrativa con fotos */}
        <NarrativeTimeline
          events={c.timeline || []}
          onAdd={(evt) => linkTimelineEvent(c.id, evt)}
        />

        {/* 2026-05-18 — Recomendaciones validadas */}
        <RecommendationsSection
          recs={c.recommendations || []}
          onAdd={(rec) => addRecommendation(c.id, rec)}
          onValidate={(recId, payload) =>
            validateRecommendation(c.id, recId, payload)
          }
        />

        {/* Treatments applied */}
        {c.treatments_applied.length > 0 && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
              <Beaker className="w-3 h-3" /> Tratamientos aplicados ({c.treatments_applied.length})
            </h3>
            <div className="space-y-2">
              {c.treatments_applied.map((t, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-emerald-400 text-sm font-mono font-bold">{t.biopreparado_id}</span>
                    <span className="text-slate-500 text-[10px]">{formatDT(t.applied_at)}</span>
                  </div>
                  {t.dose && <p className="text-slate-300 text-xs">Dosis: <span className="font-mono">{t.dose}</span></p>}
                  {t.notes && <p className="text-slate-400 text-xs mt-1">{t.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* State history timeline (transiciones de máquina de estados; la
            bitácora narrativa user-facing vive arriba en NarrativeTimeline) */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Cambios de estado ({c.state_history.length})
          </h3>
          <div className="space-y-2">
            {[...c.state_history].reverse().map((h, idx) => {
              const meta = STATE_META[h.state] || STATE_META.open;
              const Icon = meta.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-slate-900/60 border border-slate-800">
                  <Icon className={`w-4 h-4 mt-0.5 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                      <span className="text-slate-500 text-[10px]">{formatDT(h.at)}</span>
                    </div>
                    {h.notes && <p className="text-slate-400 text-xs mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Outcome (if closed) */}
        {isClosed && c.outcome.lessons_learned && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Lecciones aprendidas</h3>
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900">
              <p className="text-slate-300 text-xs whitespace-pre-wrap">{c.outcome.lessons_learned}</p>
              {c.outcome.final_count_affected !== null && (
                <p className="text-slate-500 text-[10px] mt-2">Afectadas finales: {c.outcome.final_count_affected}</p>
              )}
            </div>
          </section>
        )}

        {/* Metadata footer */}
        <section className="pt-4 border-t border-slate-800/50 text-[10px] text-slate-600 space-y-0.5">
          <p>ID: <span className="font-mono">{c.id}</span></p>
          <p>Creado: {formatDT(c.created_at)}</p>
          <p>Actualizado: {formatDT(c.updated_at)}</p>
        </section>
      </div>
    </ScreenShell>
  );
}

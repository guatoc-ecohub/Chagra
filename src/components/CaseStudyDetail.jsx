import React, { useState } from 'react';
import { FileText, AlertTriangle, AlertCircle, Activity, CheckCircle, XCircle, Beaker, Clock, MapPin } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { useCaseStudyStore } from '../store/useCaseStudyStore';

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

const TreatmentForm = ({ onSubmit, onCancel }) => {
  // Lista mínima de biopreparados conocidos del catálogo. Post-DR-040
  // esto será un typeahead contra catalog.biopreparados[]. MVP usa lista
  // hardcodeada de los más comunes + free text.
  const KNOWN = [
    'bacillus_thuringiensis',
    'trichogramma_spp',
    'extracto_neem',
    'bocashi',
    'biol',
    'purin_ortiga',
    'caldo_sulfocalcico',
    'caldo_bordeles',
    'te_compost',
    'humus_liquido',
    'trichoderma_harzianum_suelo',
    'bacillus_subtilis_foliar',
  ];
  const [bid, setBid] = useState(KNOWN[0]);
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

const CloseCaseForm = ({ onSubmit, onCancel, currentAffected }) => {
  const [resolved, setResolved] = useState(true);
  const [finalAffected, setFinalAffected] = useState(currentAffected || '');
  const [lessons, setLessons] = useState('');
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
      <textarea
        placeholder="Lecciones aprendidas (qué funcionó, qué no, qué repetir/evitar)"
        value={lessons}
        onChange={(e) => setLessons(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
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

export default function CaseStudyDetail({ caseId, onBack }) {
  const c = useCaseStudyStore((s) => s.getById(caseId));
  const addTreatment = useCaseStudyStore((s) => s.addTreatment);
  const transitionState = useCaseStudyStore((s) => s.transitionState);
  const closeCase = useCaseStudyStore((s) => s.closeCase);

  const [showTreatment, setShowTreatment] = useState(false);
  const [showClose, setShowClose] = useState(false);

  if (!c) {
    return (
      <ScreenShell title="Caso no encontrado" icon={FileText} onBack={onBack}>
        <div className="flex-1 flex items-center justify-center text-slate-500">
          ID inválido o caso eliminado.
        </div>
      </ScreenShell>
    );
  }

  const sevMeta = SEVERITY_META[c.problem.severity] || SEVERITY_META.medium;
  const stateMeta = STATE_META[c.state] || STATE_META.open;
  const StateIcon = stateMeta.icon;
  const isClosed = ['closed_resolved', 'closed_failed'].includes(c.state);

  return (
    <ScreenShell title={c.title} icon={FileText} onBack={onBack}>
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
              <h2 className="text-white text-base font-semibold">{c.problem.name_freetext}</h2>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.finca_slug}{c.zone_freetext ? ` · ${c.zone_freetext}` : ''}</span>
                {c.subject.count_total && (
                  <span>{c.subject.count_affected ?? 0}/{c.subject.count_total} afectadas</span>
                )}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDT(c.problem.detected_at || c.created_at)}</span>
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
              currentAffected={c.subject.count_affected}
              onSubmit={(payload) => {
                closeCase(c.id, payload);
                setShowClose(false);
              }}
              onCancel={() => setShowClose(false)}
            />
          </section>
        )}

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

        {/* State history timeline */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Línea de tiempo ({c.state_history.length})
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

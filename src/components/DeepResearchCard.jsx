import React, { useState } from 'react';
import { Microscope, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * DeepResearchCard — card de progreso + informe para el chip 🔬 "Investigación profunda".
 *
 * A6 — Card de progreso:
 *   Muestra el estado "Investigando a fondo…" con los steps[] visibles
 *   mientras status='running'. Polling real via pollDeepResearch (el caller
 *   gestiona el loop; este componente solo renderiza el estado recibido).
 *   Microcopy honesto sobre la espera en Maxwell (puede tardar 2–5 min).
 *
 * A7 — Informe citado:
 *   Cuando status='done', renderiza el `report` con un FuenteBadge por
 *   cada citation que traiga url. Si el informe es el fallback determinista
 *   (lista de evidencia en vez de síntesis), se muestra igual de útil.
 *   El card es colapsable (acordeón) para no invadir el chat.
 *
 * Gate pro-only + feature flag:
 *   Si `enabled=false` (VITE_DEEP_RESEARCH_ENABLED=false), el componente
 *   no se renderiza — la decisión del gate vive en el caller (AgentScreen).
 *
 * Props:
 *   status  {string}   — 'submitting'|'running'|'done'|'error'|'offline'|'disabled'
 *   steps   {string[]} — sub-preguntas investigadas (pueden crecer en tiempo real)
 *   report  {string}   — informe final (vacío si running)
 *   citations {Array}  — [{ source_id, label?, url? }]
 *   query   {string}   — pregunta original del usuario
 *   onCancel {function} — callback para cancelar el job en curso
 *
 * Español colombiano (tú/usted), nunca voseo argentino.
 */

/**
 * FuenteBadge para citas del informe Deep Research.
 * Reutiliza el mismo patrón que el FuenteBadge de ChatBubble (#1241):
 * link <a> CSP-safe, rel="noopener noreferrer".
 */
function CitationBadge({ citation, index }) {
  if (!citation) return null;
  const label = citation.label || citation.source_id || `Fuente ${index + 1}`;
  if (citation.url && /^https?:\/\//i.test(citation.url)) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="deep-research-citation-badge"
        data-source-id={citation.source_id}
        title={`Fuente verificable: ${label}. Abre el documento original en una pestaña nueva.`}
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-sky-600/20 text-sky-300 border border-sky-700 hover:bg-sky-600/30 underline-offset-2 hover:underline"
      >
        <ShieldCheck size={11} aria-hidden="true" />
        <span>{label}</span>
        <ExternalLink size={10} aria-hidden="true" />
      </a>
    );
  }
  // Sin URL: badge no-link (source_id textual del RAG)
  return (
    <span
      data-testid="deep-research-citation-badge"
      data-source-id={citation.source_id}
      className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-slate-600/20 text-slate-300 border border-slate-600"
    >
      <ShieldCheck size={11} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

/**
 * StepsList — lista de sub-preguntas investigadas hasta ahora.
 * Aparece durante el progreso y en el informe colapsado.
 */
function StepsList({ steps }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ul
      className="mt-2 space-y-1"
      aria-label="Sub-preguntas investigadas"
      data-testid="deep-research-steps"
    >
      {steps.map((step, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-xs text-slate-300"
        >
          <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{step}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * ETA honesto para Maxwell. El sidecar puede tardar 2–5 min en maxwell
 * dependiendo del número de pasos. Mostramos un texto realista sin prometer
 * nada exacto (microcopy honesto, no hype).
 */
function MaxwellEtaHint({ steps }) {
  const stepCount = steps.length;
  const hint = stepCount === 0
    ? 'Iniciando investigación… puede tardar unos minutos.'
    : stepCount < 3
      ? `Investigando… ${stepCount} de varias sub-preguntas completadas.`
      : `Investigando… ${stepCount} sub-preguntas completadas, casi listo.`;
  return (
    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
      <Clock size={11} aria-hidden="true" />
      <span>{hint}</span>
    </p>
  );
}

export default function DeepResearchCard({
  status,
  steps = [],
  report = '',
  citations = [],
  query = '',
  onCancel,
}) {
  const [expanded, setExpanded] = useState(true);

  // Guard: si no hay estado reconocible, no renderizar nada
  if (!status) return null;

  const isRunning = status === 'running' || status === 'submitting';
  const isDone = status === 'done';
  const isError = status === 'error';
  const isOffline = status === 'offline';
  const isDisabled = status === 'disabled';

  if (isDisabled) {
    return (
      <div
        data-testid="deep-research-card"
        data-status="disabled"
        className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 mt-2 text-sm text-slate-400"
      >
        <span className="flex items-center gap-2">
          <Microscope size={14} aria-hidden="true" />
          La investigación profunda no está disponible en este plan.
        </span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div
        data-testid="deep-research-card"
        data-status="offline"
        className="rounded-xl border border-amber-700/50 bg-amber-900/20 px-4 py-3 mt-2 text-sm text-amber-300"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          Sin conexión — la investigación profunda requiere internet.
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="deep-research-card"
        data-status="error"
        className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3 mt-2 text-sm text-red-300"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          Ocurrió un error al investigar. Intenta de nuevo con la pregunta.
        </span>
        {steps.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-red-400">Ver pasos completados antes del error</summary>
            <StepsList steps={steps} />
          </details>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="deep-research-card"
      data-status={status}
      className="rounded-xl border border-violet-700/40 bg-slate-800/70 mt-2 overflow-hidden"
    >
      {/* Header del card — siempre visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        data-testid="deep-research-card-toggle"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400/60"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-violet-200">
          {isRunning ? (
            <Loader2 size={14} className="animate-spin text-violet-400" aria-hidden="true" />
          ) : (
            <Microscope size={14} className="text-violet-400" aria-hidden="true" />
          )}
          {isRunning
            ? 'Investigando a fondo…'
            : isDone
              ? 'Informe de investigación'
              : 'Investigación profunda'}
        </span>
        <span className="flex items-center gap-2">
          {isRunning && typeof onCancel === 'function' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              data-testid="deep-research-cancel"
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-600 hover:border-slate-400 transition-colors"
              aria-label="Cancelar investigación"
            >
              Cancelar
            </button>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
          )}
        </span>
      </button>

      {/* Cuerpo colapsable */}
      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {/* Pregunta original */}
          {query && (
            <p
              className="text-xs text-slate-400 italic border-l-2 border-violet-700/40 pl-2 mb-2"
              data-testid="deep-research-query"
            >
              "{query}"
            </p>
          )}

          {/* Progreso: pasos + ETA */}
          {isRunning && (
            <>
              <MaxwellEtaHint steps={steps} />
              <StepsList steps={steps} />
            </>
          )}

          {/* Informe final */}
          {isDone && (
            <>
              {report ? (
                <div
                  data-testid="deep-research-report"
                  className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap mt-1"
                >
                  {report}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic mt-1">
                  La investigación completó sin generar un informe. Los pasos investigados están abajo.
                </p>
              )}

              {/* Sub-preguntas como contexto del informe */}
              {steps.length > 0 && (
                <details className="mt-3">
                  <summary
                    className="cursor-pointer text-xs text-violet-300 hover:text-violet-100 transition-colors"
                    data-testid="deep-research-steps-summary"
                  >
                    Ver {steps.length} sub-preguntas investigadas
                  </summary>
                  <StepsList steps={steps} />
                </details>
              )}

              {/* Citas / fuentes */}
              {citations.length > 0 && (
                <div
                  className="mt-3 pt-2 border-t border-slate-700/50"
                  data-testid="deep-research-citations"
                >
                  <p className="text-xs text-slate-500 mb-1.5">Fuentes consultadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {citations.map((c, i) => (
                      <CitationBadge key={c.source_id || i} citation={c} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

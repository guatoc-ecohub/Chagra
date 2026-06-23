/**
 * InsightCard — tarjeta de un dato agroecológico verificado.
 *
 * Reglas de seguridad (inviolables):
 * - Si non_co=true: mostrar SIEMPRE el banner de disclaimer.
 * - Siempre mostrar la fuente.
 * - Sin dosis numéricas sin fuente verificada.
 * - Sin promesas de cura o milagro.
 * - Lenguaje colombiano (tú/usted). Sin voseo argentino.
 */
import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

/**
 * @param {{ card: import('../../data/agro-insight-cards.json')[0], compact?: boolean }} props
 */
export default function InsightCard({ card, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);

  if (!card) return null;

  return (
    <div
      data-testid="insight-card"
      data-card-id={card.id}
      data-non-co={card.non_co ? 'true' : 'false'}
      className="rounded-xl border border-slate-700 bg-slate-900/70 overflow-hidden"
    >
      {/* Header — siempre visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-200 leading-tight">
            {card.titulo}
          </p>
          {card.cifra && (
            <p className="text-xs text-amber-300/90 mt-0.5 font-mono">
              {card.cifra}
            </p>
          )}
        </div>
        <span className="shrink-0 mt-0.5 text-slate-400">
          {expanded
            ? <ChevronUp size={16} aria-hidden="true" />
            : <ChevronDown size={16} aria-hidden="true" />
          }
        </span>
      </button>

      {/* Cuerpo colapsable */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {/* Banner NON-CO — obligatorio si non_co=true */}
          {card.non_co && (
            <div
              data-testid="nonco-disclaimer"
              role="note"
              aria-label="Dato de otros países, no validado en Colombia"
              className="flex items-start gap-2 rounded-lg bg-amber-900/30 border border-amber-700/50 px-3 py-2"
            >
              <AlertTriangle
                size={16}
                className="text-amber-400 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-200 leading-tight">
                  Dato de otros países
                </p>
                <p className="text-xs text-amber-200/80 leading-relaxed mt-0.5">
                  En otros países se reporta este resultado. Aún no ha sido
                  validado directamente para Colombia.
                  {card.region_analoga && (
                    <span className="block mt-0.5 text-amber-300/70">
                      Región análoga: {card.region_analoga}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Dato principal */}
          <p className="text-sm text-slate-200 leading-relaxed">{card.dato}</p>

          {/* Binomio científico */}
          {card.binomio && (
            <p className="text-xs text-slate-400 italic">
              Organismo: <em>{card.binomio}</em>
            </p>
          )}

          {/* Fuente — siempre visible */}
          <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60">
            <BookOpen size={13} className="text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Fuente:</strong>{' '}
                {card.fuente}
              </p>
              {card.doi && (
                <a
                  href={card.doi}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-sky-400/80 hover:text-sky-300 mt-0.5 underline underline-offset-2"
                  aria-label={`Ver fuente externa: ${card.doi}`}
                >
                  Ver fuente
                  <ExternalLink size={10} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { ListChecks, CheckSquare, Square } from 'lucide-react';

/**
 * ChecklistManejo — checklist interactivo de buenas prácticas de manejo animal.
 *
 * Es una ayuda VISUAL para el campesino (marcar lo que ya hace / le falta). NO
 * persiste a backend: el estado es local de la pantalla. Cada ítem es una
 * práctica accionable y respaldable (bioseguridad, bienestar, sanidad
 * preventiva), tomada de guías públicas (ICA, AGROSAVIA, CIPAV, FAO).
 *
 * @param {{ titulo?: string, items: string[], color?: object }} props
 */
export default function ChecklistManejo({ titulo = 'Lista de chequeo', items = [], color }) {
  const [marcados, setMarcados] = useState(() => new Set());
  const c = color || { border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' };

  const toggle = (i) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const hechos = marcados.size;
  const total = items.length;

  if (total === 0) return null;

  const completo = hechos === total;

  return (
    <section className={`rounded-[var(--r-lg,20px)] border ${c.border} ${c.bg} p-4 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`flex items-center gap-2 text-base font-bold ${c.text}`}>
          <ListChecks size={18} aria-hidden="true" />
          {titulo}
        </h2>
        <span
          className={`text-xs font-bold tabular-nums ${completo ? 'text-emerald-300' : 'text-slate-300/80'}`}
          aria-live="polite"
        >
          {completo ? `✓ ${hechos}/${total}` : `${hechos}/${total}`}
        </span>
      </div>
      {/* Barra de avance del chequeo — el estado del manejo, de un vistazo. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={hechos}
        aria-label={`Avance: ${hechos} de ${total} prácticas`}
        className="mt-2.5 h-1.5 rounded-[var(--r-pill,999px)] bg-black/30 overflow-hidden"
      >
        <div
          className={`h-full rounded-[var(--r-pill,999px)] motion-safe:transition-[width] motion-safe:duration-300 ${
            completo ? 'bg-emerald-400' : 'bg-emerald-500/70'
          }`}
          style={{ width: `${total ? Math.round((hechos / total) * 100) : 0}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item, i) => {
          const on = marcados.has(i);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={on}
                className={`group w-full min-h-[var(--tap-min,44px)] flex items-start gap-2.5 text-left rounded-[var(--r-sm,12px)] border p-2.5 motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  on
                    ? 'border-emerald-700/40 bg-emerald-950/30'
                    : 'border-slate-700/50 bg-black/20 hover:border-slate-500/70'
                }`}
              >
                {on ? (
                  <CheckSquare size={18} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                ) : (
                  <Square size={18} className="mt-0.5 shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden="true" />
                )}
                <span className={`flex-1 text-sm leading-snug ${on ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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

  return (
    <section className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`flex items-center gap-2 text-base font-bold ${c.text}`}>
          <ListChecks size={18} aria-hidden="true" />
          {titulo}
        </h2>
        <span className="text-xs font-bold text-slate-300/80 tabular-nums" aria-live="polite">
          {hechos}/{total}
        </span>
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
                className="group w-full flex items-start gap-2.5 text-left rounded-xl border border-slate-700/50 bg-black/20 p-2.5 hover:border-slate-500/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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

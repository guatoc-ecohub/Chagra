import { useState, useMemo } from 'react';
import { ChevronLeft, Search, MessageCircle, ChevronRight } from 'lucide-react';
import faqData from '../data/faqChagra.json';

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function FaqScreen({ onBack, onNavigate }) {
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    if (!query) return faqData.items;
    const nq = normalize(query);
    return faqData.items.filter(
      (item) => normalize(item.q).includes(nq) || normalize(item.a).includes(nq)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of items) {
      if (!map[item.categoria]) map[item.categoria] = [];
      map[item.categoria].push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Volver"
            className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <ChevronLeft size={20} className="text-sky-400" />
          </button>
        )}
        <MessageCircle size={16} className="text-emerald-400" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-200">Preguntas frecuentes</p>
      </div>

      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pregunta..."
            className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            aria-label="Buscar preguntas frecuentes"
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {faqData.categorias.map((cat) => {
          const catItems = grouped[cat.id];
          if (!catItems || catItems.length === 0) return null;
          return (
            <div key={cat.id}>
              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span aria-hidden="true">{cat.emoji}</span>
                {cat.label}
              </h2>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                    <details className="group">
                      <summary className="flex items-start gap-2 p-3 cursor-pointer list-none active:bg-slate-800/50 transition-colors min-h-[52px]">
                        <span className="flex-1 text-sm font-bold text-slate-100 leading-snug">{item.q}</span>
                        {item.estado === 'construccion' && (
                          <span className="shrink-0 text-[10px] font-bold text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded-full mt-0.5 leading-tight">
                            en preparación
                          </span>
                        )}
                        <ChevronRight size={16} className="shrink-0 text-slate-500 mt-0.5 group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="px-3 pb-3 pt-0">
                        <p className="text-sm text-slate-300 leading-relaxed">{item.a}</p>
                        {item.destino && onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate(item.destino.ruta)}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-600/30 text-emerald-300 text-xs font-bold active:bg-emerald-500/25 transition-colors"
                          >
                            {item.destino.label}
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No encontramos preguntas con ese termino.</p>
        )}
      </main>
    </div>
  );
}

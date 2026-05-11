import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Search, X, BookOpen, AlertTriangle } from 'lucide-react';
import { DICTIONARY, CATEGORIAS, searchDictionary, countByCategoria, getEntry } from '../data/dictionary.js';

/**
 * HelpDictionary — Sub-vista 4 del Manual.
 *
 * Diccionario in-app con ~70 términos curados (categorías: identidad,
 * microorganismos, biopreparados, botánica, plagas, clima, suelo,
 * informática, ia, ecología, sociopolítica). 0 alucinaciones — cada
 * definición tiene fuente. Definiciones simples para niño 11 años + ampliada
 * agronómica + contexto_cultural cuando aplica + en_discusion para términos
 * con disputa académica documentada.
 *
 * UX: search live + chips de categoría multi-select + cards expandibles
 * con cross-refs ver_tambien navegables.
 *
 * Aplica chagra-ux-principles: P1 tono tú cercano, P2 anti-ladrillo (cards
 * colapsadas, search rápida), P4 conversacional pero verificable (en_discusion
 * destaca controversia con fuentes), P6 identidad sin postureo.
 */
export default function HelpDictionary({ onBackToHome }) {
  const [query, setQuery] = useState('');
  const [activeCategorias, setActiveCategorias] = useState([]);
  const [expandedSlug, setExpandedSlug] = useState(null);
  const refs = useRef({});

  const counts = useMemo(() => countByCategoria(), []);

  const filtered = useMemo(() => {
    return searchDictionary(query, {
      categorias: activeCategorias.length > 0 ? activeCategorias : null,
      includeBody: true,
    });
  }, [query, activeCategorias]);

  const toggleCategoria = (slug) => {
    setActiveCategorias((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleEntry = (slug) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  };

  // Scroll al entry expandido cuando se abre
  useEffect(() => {
    if (!expandedSlug) return;
    const el = refs.current[expandedSlug];
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [expandedSlug]);

  // Click en cross-ref expande el slug destino
  const goToSlug = (slug) => {
    setExpandedSlug(slug);
    setQuery('');
    setActiveCategorias([]);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Sub-header back to home */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        <button
          type="button"
          onClick={onBackToHome}
          aria-label="Volver al Manual"
          className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-violet-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-violet-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-violet-200">Diccionario</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-700/40 border border-violet-500/50">
            <BookOpen size={26} className="text-violet-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-violet-100 leading-tight">
              Diccionario
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">
              {DICTIONARY.length} palabras del campo explicadas bien. Todas con fuente — nada inventado.
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca un término o concepto…"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 focus:outline-none text-base text-slate-100 placeholder-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Chips de categoría */}
        <div className="flex flex-wrap gap-1.5 -mx-1 px-1">
          {CATEGORIAS.map((c) => {
            const active = activeCategorias.includes(c.slug);
            const count = counts[c.slug] || 0;
            if (count === 0) return null;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleCategoria(c.slug)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1.5 border transition-colors min-h-[32px] ${
                  active
                    ? 'bg-violet-700/40 border-violet-400 text-violet-100 ring-1 ring-violet-500/40'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span>{c.label}</span>
                <span className={`text-[10px] ${active ? 'text-violet-200' : 'text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
          {activeCategorias.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategorias([])}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1.5 bg-slate-800/40 border border-slate-700 text-slate-400 hover:bg-slate-800/60 min-h-[32px]"
            >
              <X size={12} /> limpiar
            </button>
          )}
        </div>

        {/* Resultados counter */}
        <p className="text-[11px] text-slate-500">
          {filtered.length === DICTIONARY.length
            ? `${DICTIONARY.length} términos`
            : `${filtered.length} de ${DICTIONARY.length} términos`}
        </p>

        {/* Lista de cards */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0 && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400">
              <p className="text-sm leading-relaxed">
                No encontré ese término. ¿Te falta uno importante? Cuéntamelo con el botón flotante 💬
                — el diccionario crece con tu uso.
              </p>
            </div>
          )}

          {filtered.map((entry) => {
            const isOpen = expandedSlug === entry.slug;
            const cat = CATEGORIAS.find((c) => c.slug === entry.categoria);
            return (
              <article
                key={entry.slug}
                ref={(el) => { refs.current[entry.slug] = el; }}
                className={`overflow-hidden rounded-xl border transition-colors scroll-mt-4 ${
                  isOpen
                    ? 'bg-violet-950/40 border-violet-500/50 ring-1 ring-violet-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleEntry(entry.slug)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start gap-3 p-3 text-left min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                >
                  <span className="text-2xl shrink-0 leading-none mt-0.5" aria-hidden="true">{entry.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base text-violet-100 leading-tight">{entry.termino}</p>
                      {cat && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          {cat.label}
                        </span>
                      )}
                      {entry.en_discusion && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded-full px-1.5 py-0.5">
                          <AlertTriangle size={9} /> en discusión
                        </span>
                      )}
                    </div>
                    {!isOpen && (
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                        {entry.definicion_simple}
                      </p>
                    )}
                  </div>
                  {isOpen
                    ? <ChevronUp size={18} className="text-violet-400 shrink-0 mt-1" />
                    : <ChevronDown size={18} className="text-slate-500 shrink-0 mt-1" />
                  }
                </button>

                {isOpen && (
                  <div className="border-t border-violet-900/30 px-4 pb-4 pt-3 space-y-3">
                    {/* Definición simple destacada (niño 11 años) */}
                    <div className="rounded-lg bg-violet-950/60 border-l-2 border-violet-500 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">
                        En palabras simples
                      </p>
                      <p className="text-sm text-violet-100 leading-relaxed">{entry.definicion_simple}</p>
                    </div>

                    {/* Definición ampliada */}
                    {entry.definicion_ampliada && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Más a fondo
                        </p>
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                          {entry.definicion_ampliada}
                        </p>
                      </div>
                    )}

                    {/* Contexto cultural / político */}
                    {entry.contexto_cultural && (
                      <div className="rounded-lg bg-emerald-950/40 border-l-2 border-emerald-500 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                          Por qué importa (cultura, política)
                        </p>
                        <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-line">
                          {entry.contexto_cultural}
                        </p>
                      </div>
                    )}

                    {/* En discusión */}
                    {entry.en_discusion && (
                      <div className="rounded-lg bg-amber-900/15 border border-amber-700/40 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                          ⚠️ En discusión académica
                        </p>
                        <p className="text-xs text-amber-100 leading-relaxed mb-2">
                          {entry.en_discusion.summary}
                        </p>
                        {Array.isArray(entry.en_discusion.posiciones) && (
                          <ul className="space-y-2">
                            {entry.en_discusion.posiciones.map((p, i) => (
                              <li key={i} className="text-xs">
                                <p className="text-amber-200 font-semibold">{p.tesis}</p>
                                {Array.isArray(p.defensores) && (
                                  <p className="text-[11px] text-amber-300/70 mt-0.5">
                                    Fuentes: {p.defensores.join(' · ')}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {entry.en_discusion.sintesis && (
                          <p className="text-xs text-amber-100 leading-relaxed mt-2 pt-2 border-t border-amber-700/30">
                            <strong className="text-amber-300">Síntesis Chagra:</strong> {entry.en_discusion.sintesis}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Cross-refs */}
                    {Array.isArray(entry.ver_tambien) && entry.ver_tambien.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Ver también
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.ver_tambien.map((slug) => {
                            const target = getEntry(slug);
                            if (!target) {
                              return (
                                <span
                                  key={slug}
                                  className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 italic"
                                  title="Pendiente de incluir"
                                >
                                  {slug}
                                </span>
                              );
                            }
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => goToSlug(slug)}
                                className="text-[11px] text-violet-300 bg-violet-900/30 border border-violet-700/40 rounded px-1.5 py-0.5 hover:bg-violet-800/40 transition-colors"
                              >
                                {target.emoji} {target.termino}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fuentes */}
                    {Array.isArray(entry.fuentes) && entry.fuentes.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Fuentes
                        </p>
                        <ul className="text-[11px] text-slate-500 leading-relaxed list-disc pl-4 space-y-0.5">
                          {entry.fuentes.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Footer educativo */}
        <p className="text-[11px] text-slate-600 text-center mt-6 italic leading-relaxed">
          Diccionario v1 · {DICTIONARY.length} términos · Curado con fuentes verificables — sin alucinaciones.<br />
          Si te falta un término, pídelo con el botón flotante 💬.
        </p>
      </main>
    </div>
  );
}

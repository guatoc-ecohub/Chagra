import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, Sprout, Leaf, X, BookOpen } from 'lucide-react';
import { searchSpecies, buildSpeciesFicha } from '../../services/directorioEspecies.js';
import SpeciesFicha from './SpeciesFicha.jsx';

/**
 * DirectorioEspeciesScreen — explorador visual del catálogo de especies.
 *
 * Flujo:
 *   1. Buscador con resolución de nombre (reutiliza el matcher canónico del
 *      proyecto). Si hay varios candidatos, los lista para que el usuario elija.
 *   2. Al seleccionar, monta la FICHA grounded (foto + piso térmico +
 *      asociaciones + biopreparados + plagas/control + saberes), con deflección
 *      honesta donde falte el dato.
 *
 * Todo es OFFLINE-first: catálogo SQLite + grafo-relations.json + imágenes CC
 * locales. No depende del sidecar/GPU.
 *
 * @param {object} props
 * @param {() => void} [props.onBack]
 * @param {string} [props.initialQuery] — consulta inicial (ej. deep-link).
 */
export default function DirectorioEspeciesScreen({ onBack, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // ficha construida
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const found = await searchSpecies(q);
      setResults(found);
    } catch (_) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Búsqueda con debounce mientras el usuario escribe.
  useEffect(() => {
    if (selected) return; // no buscar mientras se ve una ficha
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 220);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, runSearch, selected]);

  const selectSpecies = useCallback(async (id) => {
    setLoadingFicha(true);
    try {
      const ficha = await buildSpeciesFicha(id);
      setSelected(ficha);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (_) {
      setSelected(null);
    } finally {
      setLoadingFicha(false);
    }
  }, []);

  // Si un solo candidato exacto, abrir directo al presionar Enter.
  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setTouched(true);
      const found = await searchSpecies(query);
      setResults(found);
      if (found.length === 1) selectSpecies(found[0].id);
    },
    [query, selectSpecies],
  );

  const backToSearch = useCallback(() => {
    setSelected(null);
  }, []);

  // VISTA FICHA -------------------------------------------------------------
  if (selected) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white">
        <header className="sticky top-0 z-10 flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2 bg-slate-950/85 backdrop-blur border-b border-slate-800/60">
          <button
            type="button"
            onClick={backToSearch}
            aria-label="Volver a la búsqueda"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Leaf size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight text-white truncate">{selected.comun}</h1>
              <p className="text-xs text-slate-400 leading-tight italic truncate">{selected.cientifico}</p>
            </div>
          </div>
        </header>
        <SpeciesFicha ficha={selected} onSelectSpecies={selectSpecies} />
      </div>
    );
  }

  // VISTA BÚSQUEDA ----------------------------------------------------------
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          <Sprout size={22} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">Directorio de especies</h1>
            <p className="text-xs text-slate-400 leading-tight">Explora el catálogo: clima, asociaciones, biopreparados y plagas.</p>
          </div>
        </div>
      </header>

      {/* Buscador */}
      <form onSubmit={onSubmit} className="px-4 pt-2">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTouched(true); }}
            placeholder="Frailejón, mandarina, frijol cargamanto…"
            aria-label="Buscar especie por nombre"
            data-testid="directorio-search-input"
            className="w-full min-h-[48px] pl-10 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Resultados / estados */}
      <div className="px-4 pt-4">
        {loadingFicha && (
          <p className="text-sm text-slate-400" data-testid="directorio-loading-ficha">Abriendo la ficha…</p>
        )}

        {!loadingFicha && searching && (
          <p className="text-sm text-slate-400">Buscando…</p>
        )}

        {!loadingFicha && !searching && touched && query.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-10" data-testid="directorio-empty">
            <Leaf size={32} className="mx-auto text-slate-700 mb-2" aria-hidden="true" />
            <p className="text-sm text-slate-400">
              No encontramos “{query.trim()}” en el catálogo todavía.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Prueba con otro nombre común o el nombre científico.
            </p>
          </div>
        )}

        {!loadingFicha && results.length > 0 && (
          <>
            {results.length > 1 && (
              <p className="text-xs text-slate-400 mb-2">
                {results.length} coincidencias — elige una:
              </p>
            )}
            <ul className="space-y-2" data-testid="directorio-results">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectSpecies(r.id)}
                    className="w-full text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-600/60 active:bg-slate-800/70 p-3 transition-colors flex items-center gap-3"
                  >
                    <Leaf size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-emerald-100 leading-tight truncate">{r.comun || r.id}</span>
                      {r.cientifico && (
                        <span className="block text-xs italic text-slate-400 leading-tight truncate">{r.cientifico}</span>
                      )}
                      {r.familia && (
                        <span className="block text-[10px] text-slate-500 leading-tight">{r.familia}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Estado inicial vacío — guía */}
        {!loadingFicha && !searching && !touched && results.length === 0 && (
          <div className="text-center py-12" data-testid="directorio-hint">
            <BookOpen size={34} className="mx-auto text-slate-700 mb-3" aria-hidden="true" />
            <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
              Busca cualquier especie del catálogo y mira su piso térmico, con qué
              se asocia, qué biopreparados le sirven y qué plagas la afectan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

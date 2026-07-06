import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, Sprout, Leaf, X } from 'lucide-react';
import { searchSpecies, buildSpeciesFicha } from '../../services/directorioEspecies.js';
import SpeciesFicha from './SpeciesFicha.jsx';
import EmptyStateCampo from '../common/EmptyStateCampo.jsx';
import ErrorStateCampo from '../common/ErrorStateCampo.jsx';
import SkeletonCampo from '../common/SkeletonCampo.jsx';
import ChagraGrowLoader from '../ChagraGrowLoader.jsx';
import { fvhSkinClass } from '../../config/fvhSkin.js';

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
 * @param {string} [props.initialQuery] - consulta inicial (ej. deep-link).
 */
export default function DirectorioEspeciesScreen({ onBack, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false); // el catálogo no cargó (≠ sin resultados)
  const [selected, setSelected] = useState(null); // ficha construida
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [fichaErrorId, setFichaErrorId] = useState(null); // id cuya ficha falló al abrir
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    setSearching(true);
    setSearchError(false);
    try {
      const found = await searchSpecies(q);
      setResults(found);
    } catch (_) {
      // Un catálogo que no cargó NO es lo mismo que "no encontramos esa mata":
      // se marca el error para ofrecer reintento en vez del empty engañoso.
      setResults([]);
      setSearchError(true);
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
    setFichaErrorId(null);
    try {
      const ficha = await buildSpeciesFicha(id);
      setSelected(ficha);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (_) {
      // Antes esto dejaba la lista muda, como si nada hubiera pasado.
      setSelected(null);
      setFichaErrorId(id);
    } finally {
      setLoadingFicha(false);
    }
  }, []);

  // Si un solo candidato exacto, abrir directo al presionar Enter.
  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setTouched(true);
      try {
        const found = await searchSpecies(query);
        setResults(found);
        setSearchError(false);
        if (found.length === 1) selectSpecies(found[0].id);
      } catch (_) {
        // Sin este catch, un fallo aquí era un rechazo sin manejar (blanco).
        setResults([]);
        setSearchError(true);
      }
    },
    [query, selectSpecies],
  );

  const backToSearch = useCallback(() => {
    setSelected(null);
  }, []);

  // VISTA FICHA -------------------------------------------------------------
  if (selected) {
    return (
      <div className={fvhSkinClass('jp-directorio min-h-[100dvh] bg-slate-950 text-white')}>
        <header className="jp-dir-header sticky top-0 z-10 flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2 bg-slate-950/85 backdrop-blur border-b border-slate-800/60">
          <button
            type="button"
            onClick={backToSearch}
            aria-label="Volver a la búsqueda"
            className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Leaf size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="jp-tinta text-base font-bold leading-tight text-white truncate">{selected.comun}</h1>
              <p className="jp-tinta-suave text-xs text-slate-400 leading-tight italic truncate">{selected.cientifico}</p>
            </div>
          </div>
        </header>
        <SpeciesFicha ficha={selected} onSelectSpecies={selectSpecies} />
      </div>
    );
  }

  // VISTA BÚSQUEDA ----------------------------------------------------------
  return (
    <div className={fvhSkinClass('jp-directorio min-h-[100dvh] bg-slate-950 text-white')}>
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          <Sprout size={22} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="jp-tinta text-lg font-bold leading-tight text-white">Directorio de especies</h1>
            <p className="jp-tinta-suave text-xs text-slate-400 leading-tight">Explora el catálogo: clima, asociaciones, biopreparados y plagas.</p>
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
            className="jp-dir-input w-full min-h-[48px] pl-10 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); }}
              aria-label="Limpiar búsqueda"
              className="tap-target absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Resultados / estados */}
      <div className="px-4 pt-4">
        {loadingFicha && (
          <div data-testid="directorio-loading-ficha">
            <p className="jp-tinta-suave flex items-center gap-2 text-sm text-slate-400 mb-3">
              <ChagraGrowLoader size={26} aria-hidden="true" />
              Abriendo la ficha…
            </p>
            <SkeletonCampo variant="ficha" />
          </div>
        )}

        {!loadingFicha && searching && (
          <SkeletonCampo
            variant="lista"
            count={3}
            label={<span className="jp-tinta-suave">Buscando en el catálogo…</span>}
          />
        )}

        {/* El catálogo no cargó: reintento honesto en vez de "sin resultados". */}
        {!loadingFicha && !searching && searchError && (
          <div className="py-8" data-testid="directorio-error">
            <ErrorStateCampo
              title={<span className="jp-tinta">No pudimos abrir el catálogo.</span>}
              hint={<span className="jp-tinta-suave">Sus datos están a salvo. Espere un momento y vuelva a intentar.</span>}
              onRetry={() => runSearch(query)}
            />
          </div>
        )}

        {/* La ficha de una especie no abrió: avisar y dejar reintentar. */}
        {!loadingFicha && !searchError && fichaErrorId && (
          <div className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/40" data-testid="directorio-ficha-error">
            <p className="jp-tinta-suave text-xs text-amber-200">No pudimos abrir esa ficha.</p>
            <button
              type="button"
              onClick={() => selectSpecies(fichaErrorId)}
              className="text-xs font-bold text-amber-300 underline shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loadingFicha && !searching && !searchError && touched && query.trim().length >= 2 && results.length === 0 && (
          <div className="py-8" data-testid="directorio-empty">
            <EmptyStateCampo
              variant="busqueda"
              title={<span className="jp-tinta">No encontramos “{query.trim()}” en el catálogo todavía.</span>}
              hint={<span className="jp-tinta-suave">Prueba con otro nombre común o el nombre científico: la misma planta cambia de nombre de vereda en vereda.</span>}
            />
          </div>
        )}

        {!loadingFicha && results.length > 0 && (
          <>
            {results.length > 1 && (
              <p className="jp-tinta-suave text-xs text-slate-400 mb-2">
                {results.length} coincidencias — elige una:
              </p>
            )}
            <ul className="space-y-2" data-testid="directorio-results">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectSpecies(r.id)}
                    className="jp-dir-card w-full text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-600/60 active:bg-slate-800/70 p-3 transition-colors flex items-center gap-3"
                  >
                    <Leaf size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="jp-tinta block text-sm font-bold text-emerald-100 leading-tight truncate">{r.comun || r.id}</span>
                      {r.cientifico && (
                        <span className="jp-tinta-suave block text-xs italic text-slate-400 leading-tight truncate">{r.cientifico}</span>
                      )}
                      {r.familia && (
                        <span className="jp-tinta-suave block text-xs text-slate-400 leading-tight">{r.familia}</span>
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
          <div className="py-10" data-testid="directorio-hint">
            <EmptyStateCampo
              variant="directorio"
              title={<span className="jp-tinta">El cuaderno de especies de tu chagra.</span>}
              hint={
                <span className="jp-tinta-suave">
                  Busca cualquier especie del catálogo y mira su piso térmico, con qué
                  se asocia, qué biopreparados le sirven y qué plagas la afectan.
                </span>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

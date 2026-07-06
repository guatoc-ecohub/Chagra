import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, Sprout, Leaf, X, Bug } from 'lucide-react';
import { searchSpecies, buildSpeciesFicha } from '../../services/directorioEspecies.js';
import { listPlagas, searchPlagas, buildPlagaFicha } from '../../services/directorioPlagas.js';
import SpeciesFicha from './SpeciesFicha.jsx';
import PlagaFicha from './PlagaFicha.jsx';
import SanidadSintomaVineta from '../sanidad/SanidadSintomaVinetas.jsx';
import EmptyStateCampo from '../common/EmptyStateCampo.jsx';
import SkeletonCampo from '../common/SkeletonCampo.jsx';
import ChagraGrowLoader from '../ChagraGrowLoader.jsx';
import { fvhSkinClass } from '../../config/fvhSkin.js';

/**
 * DirectorioEspeciesScreen — explorador visual del catálogo, con DOS pestañas:
 *
 *   · Especies — buscador con resolución de nombre + ficha grounded por especie
 *     (foto, piso térmico, asociaciones, biopreparados, plagas/control, saberes).
 *   · Plagas — cuadrícula de plagas/enfermedades + ficha grounded por plaga
 *     (foto del daño, a qué le pega, cómo reconocerla, umbral, manejo sin veneno).
 *
 * Las dos son OFFLINE-first: catálogo SQLite + grafo-relations.json + catálogo
 * de sanidad + imágenes CC locales. No dependen del sidecar/GPU.
 *
 * @param {object} props
 * @param {() => void} [props.onBack]
 * @param {string} [props.initialQuery] - consulta inicial de especie (deep-link).
 * @param {'especies'|'plagas'} [props.initialMode] - pestaña inicial.
 * @param {string} [props.initialPlagaId] - abre directo la ficha de una plaga
 *   (deep-link desde "Sanidad de la mata").
 */
export default function DirectorioEspeciesScreen({
  onBack, initialQuery = '', initialMode = 'especies', initialPlagaId = '',
}) {
  const [mode, setMode] = useState(initialMode === 'plagas' ? 'plagas' : 'especies');

  // Estado ESPECIES
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // ficha de especie construida
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef(null);

  // Estado PLAGAS
  const [plagaQuery, setPlagaQuery] = useState('');
  const [selectedPlaga, setSelectedPlaga] = useState(null); // ficha de plaga construida
  const [loadingPlaga, setLoadingPlaga] = useState(false);

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

  // Búsqueda de especies con debounce mientras el usuario escribe.
  useEffect(() => {
    if (mode !== 'especies' || selected) return; // no buscar fuera de la pestaña / en ficha
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 220);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, runSearch, selected, mode]);

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

  const selectPlaga = useCallback(async (id) => {
    setLoadingPlaga(true);
    try {
      const ficha = await buildPlagaFicha(id);
      setSelectedPlaga(ficha);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (_) {
      setSelectedPlaga(null);
    } finally {
      setLoadingPlaga(false);
    }
  }, []);

  // Deep-link: abrir directo una plaga (desde "Sanidad de la mata"). Se difiere
  // un tick para no llamar setState de forma síncrona dentro del efecto.
  useEffect(() => {
    if (!initialPlagaId) return undefined;
    const t = setTimeout(() => selectPlaga(initialPlagaId), 0);
    return () => clearTimeout(t);
  }, [initialPlagaId, selectPlaga]);

  // Si un solo candidato exacto de especie, abrir directo al presionar Enter.
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

  const switchMode = useCallback((m) => {
    setMode(m);
    setSelected(null);
    setSelectedPlaga(null);
  }, []);

  // ── VISTA FICHA DE ESPECIE ───────────────────────────────────────────────
  if (selected) {
    return (
      <div className={fvhSkinClass('jp-directorio min-h-[100dvh] bg-slate-950 text-white')}>
        <header className="jp-dir-header sticky top-0 z-10 flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2 bg-slate-950/85 backdrop-blur border-b border-slate-800/60">
          <button
            type="button"
            onClick={() => setSelected(null)}
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

  // ── VISTA FICHA DE PLAGA ─────────────────────────────────────────────────
  if (selectedPlaga) {
    return (
      <div className={fvhSkinClass('jp-directorio min-h-[100dvh] bg-slate-950 text-white')}>
        <header className="jp-dir-header sticky top-0 z-10 flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2 bg-slate-950/85 backdrop-blur border-b border-slate-800/60">
          <button
            type="button"
            onClick={() => setSelectedPlaga(null)}
            aria-label="Volver al directorio de plagas"
            className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Bug size={20} className="text-rose-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="jp-tinta text-base font-bold leading-tight text-white truncate">{selectedPlaga.nombreComun}</h1>
              <p className="jp-tinta-suave text-xs text-slate-400 leading-tight italic truncate">{selectedPlaga.binomio}</p>
            </div>
          </div>
        </header>
        <PlagaFicha ficha={selectedPlaga} />
      </div>
    );
  }

  // ── VISTA BÚSQUEDA (con pestañas) ────────────────────────────────────────
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
        {mode === 'especies' ? (
          <div className="flex items-center gap-2">
            <Sprout size={22} className="text-emerald-400 shrink-0" aria-hidden="true" />
            <div>
              <h1 className="jp-tinta text-lg font-bold leading-tight text-white">Directorio de especies</h1>
              <p className="jp-tinta-suave text-xs text-slate-400 leading-tight">Explora el catálogo: clima, asociaciones, biopreparados y plagas.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Bug size={22} className="text-rose-400 shrink-0" aria-hidden="true" />
            <div>
              <h1 className="jp-tinta text-lg font-bold leading-tight text-white">Directorio de plagas</h1>
              <p className="jp-tinta-suave text-xs text-slate-400 leading-tight">Reconoce el bicho o la enfermedad por foto y su manejo sin veneno.</p>
            </div>
          </div>
        )}
      </header>

      {/* Pestañas Especies / Plagas */}
      <div className="px-4 pt-1">
        <div role="tablist" aria-label="Tipo de ficha" className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1 gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'especies'}
            data-testid="directorio-tab-especies"
            onClick={() => switchMode('especies')}
            className={`min-h-[40px] px-4 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${
              mode === 'especies' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sprout size={16} aria-hidden="true" /> Especies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'plagas'}
            data-testid="directorio-tab-plagas"
            onClick={() => switchMode('plagas')}
            className={`min-h-[40px] px-4 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${
              mode === 'plagas' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug size={16} aria-hidden="true" /> Plagas
          </button>
        </div>
      </div>

      {mode === 'especies' ? (
        <EspeciesSearch
          query={query}
          setQuery={setQuery}
          setTouched={setTouched}
          touched={touched}
          onSubmit={onSubmit}
          results={results}
          searching={searching}
          loadingFicha={loadingFicha}
          onSelect={selectSpecies}
          onClear={() => { setQuery(''); setResults([]); }}
        />
      ) : (
        <PlagasBrowser
          query={plagaQuery}
          setQuery={setPlagaQuery}
          loadingPlaga={loadingPlaga}
          onSelect={selectPlaga}
        />
      )}
    </div>
  );
}

/* ── Pestaña ESPECIES: buscador + resultados ─────────────────────────────── */
function EspeciesSearch({
  query, setQuery, setTouched, touched, onSubmit, results, searching, loadingFicha, onSelect, onClear,
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="px-4 pt-3">
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
              onClick={onClear}
              aria-label="Limpiar búsqueda"
              className="tap-target absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

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

        {!loadingFicha && !searching && touched && query.trim().length >= 2 && results.length === 0 && (
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
                    onClick={() => onSelect(r.id)}
                    className="jp-dir-card w-full text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-600/60 active:bg-slate-800/70 p-3 transition-colors flex items-center gap-3"
                  >
                    <Leaf size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="jp-tinta block text-sm font-bold text-emerald-100 leading-tight truncate">{r.comun || r.id}</span>
                      {r.cientifico && (
                        <span className="jp-tinta-suave block text-xs italic text-slate-400 leading-tight truncate">{r.cientifico}</span>
                      )}
                      {r.familia && (
                        <span className="jp-tinta-suave block text-[11px] text-slate-400 leading-tight">{r.familia}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

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
    </>
  );
}

/* ── Pestaña PLAGAS: buscador + cuadrícula del catálogo de sanidad ────────── */
function PlagasBrowser({ query, setQuery, loadingPlaga, onSelect }) {
  const q = query.trim();
  const cards = q.length >= 2 ? searchPlagas(q) : listPlagas();

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} className="px-4 pt-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Roya, broca, gota, mosca blanca…"
            aria-label="Buscar plaga o enfermedad por nombre"
            data-testid="directorio-plagas-search-input"
            className="jp-dir-input w-full min-h-[48px] pl-10 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="tap-target absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      <div className="px-4 pt-4">
        {loadingPlaga && (
          <div data-testid="directorio-plaga-loading">
            <p className="jp-tinta-suave flex items-center gap-2 text-sm text-slate-400 mb-3">
              <ChagraGrowLoader size={26} aria-hidden="true" />
              Abriendo la ficha…
            </p>
            <SkeletonCampo variant="ficha" />
          </div>
        )}

        {!loadingPlaga && cards.length === 0 && (
          <div className="py-8" data-testid="directorio-plagas-empty">
            <EmptyStateCampo
              variant="busqueda"
              title={<span className="jp-tinta">No encontramos “{q}” en el catálogo de sanidad todavía.</span>}
              hint={<span className="jp-tinta-suave">Prueba con el nombre folk que use en su vereda: "gota", "polvillo", "candelilla".</span>}
            />
          </div>
        )}

        {!loadingPlaga && cards.length > 0 && (
          <ul className="grid grid-cols-2 gap-2.5" data-testid="directorio-plagas-results">
            {cards.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  data-testid={`directorio-plaga-${c.id}`}
                  className="jp-dir-card w-full h-full text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-600/60 active:bg-slate-800/70 p-3 transition-colors flex flex-col gap-2"
                >
                  <span className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-rose-950/30 flex items-center justify-center" aria-hidden="true">
                    <span className="w-16 h-16 flex items-center justify-center">
                      <SanidadSintomaVineta nombre={c.vineta} />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="jp-tinta block text-sm font-bold text-rose-100 leading-tight">{c.nombreComun}</span>
                    <span className="jp-tinta-suave block text-[11px] italic text-slate-400 leading-tight truncate">{c.binomio}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <span aria-hidden="true">{c.tipoEmoji}</span> {c.tipoLabel}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

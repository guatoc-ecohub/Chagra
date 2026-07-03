import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, Search, Sprout, Leaf, X } from 'lucide-react';
import { searchSpecies, buildSpeciesFicha, listSpeciesForBrowse } from '../../services/directorioEspecies.js';
import SpeciesFicha from './SpeciesFicha.jsx';
import EmptyState from '../common/EmptyState.jsx';
import SkeletonList from '../common/SkeletonList.jsx';
import { fvhSkinClass } from '../../config/fvhSkin.js';
import { getSpeciesVisual, SPECIES_TONE_CLASSES } from '../../utils/speciesVisual.js';

/**
 * Badge de especie: emoji reconocible por especie sobre fondo tonal.
 * Reemplaza el Leaf genérico que hacía idénticas todas las filas del
 * catálogo — a 16–24px el emoji distingue papa/café/guayacán de un vistazo.
 */
function SpeciesBadge({ sp, size = 'md' }) {
  const { emoji, tone } = getSpeciesVisual(sp);
  const toneCls = SPECIES_TONE_CLASSES[tone] || SPECIES_TONE_CLASSES.emerald;
  const sizeCls = size === 'sm' ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg';
  return (
    <span
      className={`${sizeCls} rounded-xl border grid place-items-center shrink-0 leading-none ${toneCls}`}
      aria-hidden="true"
      data-testid="species-badge"
    >
      {emoji}
    </span>
  );
}

/*
 * Etiquetas legibles de las categorías del catálogo v3.1 (slugs reales del
 * seed). Un slug sin entrada cae a humanización simple — nunca un hueco.
 */
const CATEGORIA_LABELS = {
  frutales_perennes: 'Frutales y perennes',
  tuberculos_raices: 'Tubérculos y raíces',
  cereales: 'Cereales',
  granos_legumbres: 'Granos y legumbres',
  hortalizas_hoja: 'Hortalizas de hoja',
  hortalizas_fruto_flor: 'Hortalizas de fruto y flor',
  medicinales_alelopaticas: 'Medicinales y aromáticas',
  atractores_polinizadores: 'Atractores de polinizadores',
  ornamentales_nativas: 'Ornamentales nativas',
  abonos_verdes_coberturas: 'Abonos verdes y coberturas',
  arboles_sombra: 'Árboles y sombra',
  cercas_vivas: 'Cercas vivas',
  fibras_no_maderables: 'Fibras no maderables',
  especies_invasoras: 'Especies invasoras',
  microorganismos: 'Microorganismos',
  plagas: 'Plagas',
};

function categoriaLabel(slug) {
  if (CATEGORIA_LABELS[slug]) return CATEGORIA_LABELS[slug];
  const s = String(slug || '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Otras';
}

/**
 * Chip de categoría — píldora táctil (mín. 40px de alto efectivo) con el
 * emoji de la categoría (mismo set visual que los badges de especie).
 * aria-pressed marca el filtro activo para lectores de pantalla.
 */
function CategoriaChip({ active, onClick, emoji, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid="directorio-chip-categoria"
      className={`shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full border text-xs font-semibold whitespace-nowrap motion-safe:transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
        active
          ? 'bg-emerald-600 border-emerald-300 text-white shadow-md'
          : 'jp-dir-card bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-600/60 active:bg-slate-800/70'
      }`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
            active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Tarjeta de especie — misma silueta en exploración y en resultados de
 * búsqueda (coherencia visual): badge tonal arriba, nombre común como
 * jerarquía principal, científico y familia como apoyo.
 */
function SpeciesCard({ sp, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(sp.id)}
      data-testid="directorio-species-card"
      className="jp-dir-card w-full h-full text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-600/60 active:bg-slate-800/70 motion-safe:transition-colors p-3 flex flex-col gap-2 min-h-[104px]"
    >
      <SpeciesBadge sp={sp} />
      <span className="min-w-0">
        <span className="jp-tinta block text-sm font-bold text-emerald-100 leading-tight line-clamp-2">
          {sp.comun || sp.id}
        </span>
        {sp.cientifico && (
          <span className="jp-tinta-suave block text-[11px] italic text-slate-400 leading-tight truncate mt-0.5">
            {sp.cientifico}
          </span>
        )}
        {sp.familia && (
          <span className="jp-tinta-suave block text-[10px] text-slate-500 leading-tight truncate mt-0.5">
            {sp.familia}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * DirectorioEspeciesScreen — explorador visual del catálogo de especies.
 *
 * Flujo:
 *   1. EXPLORACIÓN (default): el catálogo completo en grilla de tarjetas,
 *      filtrable por chips de categoría (emoji + conteo). Nada de pantalla
 *      vacía esperando que el usuario adivine qué escribir.
 *   2. BÚSQUEDA: el buscador con resolución de nombre (matcher canónico del
 *      proyecto) reemplaza la grilla mientras haya consulta activa. Si hay
 *      varios candidatos, los lista para que el usuario elija.
 *   3. Al seleccionar, monta la FICHA grounded (foto + piso térmico +
 *      asociaciones + biopreparados + plagas/control + saberes), con deflección
 *      honesta donde falte el dato.
 *
 * Todo es OFFLINE-first: catálogo SQLite + grafo-relations.json + imágenes CC
 * locales. No depende del sidecar/GPU. Estados de carga con SkeletonList y
 * vacíos/errores con EmptyState (componentes comunes del sistema visual).
 *
 * @param {object} props
 * @param {() => void} [props.onBack]
 * @param {string} [props.initialQuery] - consulta inicial (ej. deep-link).
 */
export default function DirectorioEspeciesScreen({ onBack, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // ficha construida
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [touched, setTouched] = useState(Boolean(initialQuery));
  const [catalogo, setCatalogo] = useState(null); // null = cargando, [] = no disponible
  const [categoria, setCategoria] = useState('todas');
  const debounceRef = useRef(null);

  // --- Catálogo completo para el modo exploración (offline) ----------------
  // reloadKey re-dispara la carga en "Reintentar"; el efecto solo resuelve la
  // promesa y setea al llegar (nada de setState síncrono dentro del efecto).
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    listSpeciesForBrowse()
      .then((list) => { if (alive) setCatalogo(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setCatalogo([]); });
    return () => { alive = false; };
  }, [reloadKey]);

  const loadCatalogo = useCallback(() => {
    setCatalogo(null); // volver al skeleton mientras reintenta
    setReloadKey((k) => k + 1);
  }, []);

  // Categorías presentes en el catálogo, ordenadas por tamaño (las grandes
  // primero: es lo que el productor va a tocar más).
  const categorias = useMemo(() => {
    const counts = new Map();
    for (const sp of catalogo || []) {
      const c = sp.categoria || 'otras';
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, count, label: categoriaLabel(id) }));
  }, [catalogo]);

  const browseList = useMemo(() => {
    if (!Array.isArray(catalogo)) return [];
    if (categoria === 'todas') return catalogo;
    return catalogo.filter((sp) => (sp.categoria || 'otras') === categoria);
  }, [catalogo, categoria]);

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

  const clearQuery = useCallback(() => {
    setQuery('');
    setResults([]);
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
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <SpeciesBadge sp={selected} size="sm" />
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

  // ¿Hay consulta activa? La búsqueda reemplaza la grilla de exploración.
  const enBusqueda = query.trim().length >= 2;

  // VISTA BÚSQUEDA / EXPLORACIÓN ---------------------------------------------
  return (
    <div className={fvhSkinClass('jp-directorio min-h-[100dvh] bg-slate-950 text-white')}>
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
            <h1 className="jp-tinta text-lg font-bold leading-tight text-white">Directorio de especies</h1>
            <p className="jp-tinta-suave text-xs text-slate-400 leading-tight">
              {Array.isArray(catalogo) && catalogo.length > 0
                ? `${catalogo.length} especies: clima, asociaciones, biopreparados y plagas.`
                : 'Explore el catálogo: clima, asociaciones, biopreparados y plagas.'}
            </p>
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
              onClick={clearQuery}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Chips de categoría — solo en modo exploración con catálogo cargado. */}
      {!enBusqueda && !loadingFicha && Array.isArray(catalogo) && catalogo.length > 0 && (
        <div
          role="toolbar"
          aria-label="Filtrar por categoría"
          data-testid="directorio-chips"
          className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <CategoriaChip
            active={categoria === 'todas'}
            onClick={() => setCategoria('todas')}
            emoji="🌱"
            label="Todas"
            count={catalogo.length}
          />
          {categorias.map((c) => (
            <CategoriaChip
              key={c.id}
              active={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              emoji={getSpeciesVisual({ categoria: c.id }).emoji}
              label={c.label}
              count={c.count}
            />
          ))}
        </div>
      )}

      {/* Resultados / estados */}
      <div className="px-4 pt-3 pb-10">
        {/* Abriendo una ficha: skeleton con la silueta de la ficha que viene. */}
        {loadingFicha && (
          <SkeletonList
            count={4}
            variant="row"
            ariaLabel="Abriendo la ficha…"
            data-testid="directorio-loading-ficha"
          />
        )}

        {/* Buscando: skeleton de filas (percepción de rapidez, sin salto). */}
        {!loadingFicha && enBusqueda && searching && (
          <SkeletonList
            count={3}
            variant="row"
            ariaLabel="Buscando…"
            data-testid="directorio-searching"
          />
        )}

        {/* Búsqueda sin coincidencias. */}
        {!loadingFicha && !searching && enBusqueda && touched && results.length === 0 && (
          <EmptyState
            size="compact"
            icon={Leaf}
            title={`No encontramos “${query.trim()}” en el catálogo todavía`}
            description="Pruebe con otro nombre común o el nombre científico, o explore por categoría."
            actionLabel="Limpiar y explorar"
            actionIcon={X}
            onAction={clearQuery}
            data-testid="directorio-empty"
          />
        )}

        {/* Coincidencias de búsqueda — mismas tarjetas que la exploración. */}
        {!loadingFicha && !searching && enBusqueda && results.length > 0 && (
          <>
            {results.length > 1 && (
              <p className="jp-tinta-suave text-xs text-slate-400 mb-2">
                {results.length} coincidencias — elija una:
              </p>
            )}
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 list-none" data-testid="directorio-results">
              {results.map((r) => (
                <li key={r.id} className="min-w-0">
                  <SpeciesCard sp={r} onSelect={selectSpecies} />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* EXPLORACIÓN: catálogo cargando → skeleton de tarjetas. */}
        {!loadingFicha && !enBusqueda && catalogo === null && (
          <SkeletonList
            count={6}
            variant="card"
            ariaLabel="Abriendo el catálogo…"
            data-testid="directorio-catalogo-cargando"
          />
        )}

        {/* EXPLORACIÓN: catálogo no disponible → error calmado con reintento. */}
        {!loadingFicha && !enBusqueda && Array.isArray(catalogo) && catalogo.length === 0 && (
          <EmptyState
            variant="error"
            title="El catálogo no está disponible todavía"
            description="No pudimos abrir el catálogo de especies en este dispositivo. Sus demás datos no se afectan."
            actionLabel="Reintentar"
            onAction={loadCatalogo}
            data-testid="directorio-catalogo-error"
          />
        )}

        {/* EXPLORACIÓN: grilla de tarjetas filtrada por categoría. */}
        {!loadingFicha && !enBusqueda && Array.isArray(catalogo) && catalogo.length > 0 && (
          <>
            {categoria !== 'todas' && (
              <p className="jp-tinta-suave text-xs text-slate-400 mb-2" aria-live="polite">
                {browseList.length === 1
                  ? '1 especie en esta categoría'
                  : `${browseList.length} especies en esta categoría`}
              </p>
            )}
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 list-none" data-testid="directorio-grid">
              {browseList.map((sp) => (
                <li key={sp.id} className="min-w-0">
                  <SpeciesCard sp={sp} onSelect={selectSpecies} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

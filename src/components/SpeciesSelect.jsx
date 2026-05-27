import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Clock, Sparkles, Camera, ImagePlus, Loader2, Bug, Check, AlertCircle, AlertTriangle, HelpCircle, Info, WifiOff } from 'lucide-react';
import VisionLoadingState from './common/VisionLoadingState';
import { warmVisionModel } from '../services/visionWarmService';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';
import { fuzzyFilter } from '../utils/fuzzySearch';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import useAssetStore from '../store/useAssetStore';
import { captureAndCompress } from '../services/photoService';
import { recognizeSpeciesGrounded } from '../services/aiService';
import { getAllSpecies } from '../db/catalogDB';
import AIBetaBadge from './AIBetaBadge';

/**
 * SpeciesSelect, Selector de especie con fuzzy search y autocompletado de defaults.
 *
 * Reemplaza el <select> + <optgroup> estático de renderPlantForm. Soporta:
 *   - Fuzzy search: "Gulpa" → "Gulupa (Passiflora edulis f. edulis)"
 *   - Virtual scroll implícito: solo renderiza los primeros 30 resultados
 *     del fuzzyFilter para evitar degradación con 72+ especies.
 *   - Autocompletado: al seleccionar, invoca onAutoFill con los defaults
 *     de estrato, gremio y production derivados de speciesDefaults.js.
 *   - Override manual: el operario siempre puede escribir un nombre libre
 *     que no esté en el catálogo.
 *
 * Props:
 *   - value:      string actual del campo nombre
 *   - onChange:    callback(name: string, speciesId: string|null), actualiza formData.name
 *   - onAutoFill: callback({ estrato, gremio, production, cycleMonths }), sugerencia
 */

// Fallback estático legacy: ~77 species hardcoded en config/taxonomy.js.
// Se mantiene porque (a) catalogDB SQLite WASM puede tardar/fallar en cold
// boot (b) garantiza offline-first hard. Si el catálogo v3.1 (480 species)
// carga OK desde catalogDB, lo reemplaza in-memory en el componente.
const LEGACY_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => ({ ...sp, groupId, groupLabel: group.label }))
);

// Normaliza un row del catálogo SQLite ({id, nombre_comun, nombre_cientifico,
// categoria}) al shape interno {id, name, groupId, groupLabel} consumido por
// el resto del componente (fuzzy + recent + auto-select por nombre).
const normalizeCatalogSpecies = (row) => {
  if (!row || !row.id) return null;
  const nombre = (row.nombre_comun || row.id || '').trim();
  const cientifico = (row.nombre_cientifico || '').trim();
  const display = cientifico ? `${nombre} (${cientifico})` : nombre;
  const cat = row.categoria || row.category || row.tipo || 'catálogo';
  return {
    id: row.id,
    name: display,
    nombre_comun: nombre,
    nombre_cientifico: cientifico,
    groupId: cat,
    groupLabel: cat,
  };
};

// Timeout duro para no congelar el form si OPFS/WASM se queda colgado.
const CATALOG_LOAD_TIMEOUT_MS = 2000;

// Calcula últimas 3 especies registradas por el usuario (Miguel UX 2026-05-03).
// Lee plants del store, agrupa por nombre canónico, ordena por _createdAt y
// devuelve las últimas 3 únicas como { id, name, groupId, groupLabel } match
// del catálogo activo. Si una planta tiene name libre que NO matchea, la
// incluye igual con id=null para que el chip funcione como atajo de nombre.
const computeRecentSpecies = (plants, allSpecies) => {
  if (!Array.isArray(plants) || plants.length === 0) return [];
  const pool = Array.isArray(allSpecies) ? allSpecies : [];
  const sorted = [...plants].sort((a, b) => (b._createdAt || 0) - (a._createdAt || 0));
  const seen = new Set();
  const result = [];
  for (const p of sorted) {
    const name = p.attributes?.name || p.name || '';
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    // Quitar sufijo "#001" de nombres bulk-individual para detectar especie real
    const baseName = name.replace(/\s+#\d+$/, '');
    const match = pool.find(
      (sp) => sp.name === baseName || sp.name.toLowerCase().startsWith(baseName.toLowerCase())
    );
    result.push({
      id: match?.id || null,
      name: match?.name || baseName,
      groupId: match?.groupId || null,
      groupLabel: match?.groupLabel || 'reciente',
    });
    if (result.length >= 3) break;
  }
  return result;
};

export const SpeciesSelect = ({ value, onChange, onAutoFill, onPhoto }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const wrapperRef = useRef(null);

  // Catálogo dinámico (v3.1 ≈480 species) con fallback legacy (~77).
  // Se carga async desde catalogDB al mount; si tarda >2s o falla, queda
  // el legacy para no romper offline-first ni la UX del form.
  const [allSpecies, setAllSpecies] = useState(LEGACY_SPECIES);
  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[SpeciesSelect] catalogDB timeout >2s, manteniendo LEGACY_SPECIES');
      }
    }, CATALOG_LOAD_TIMEOUT_MS);

    Promise.race([
      getAllSpecies(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('catalog_timeout')), CATALOG_LOAD_TIMEOUT_MS)),
    ])
      .then((rows) => {
        if (cancelled) return;
        if (!Array.isArray(rows) || rows.length === 0) return;
        const normalized = rows.map(normalizeCatalogSpecies).filter(Boolean);
        if (normalized.length === 0) return;
        setAllSpecies(normalized);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[SpeciesSelect] catalogDB load failed, usando LEGACY_SPECIES:', err?.message || err);
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  // Últimas 3 especies del usuario, atajos rápidos arriba del fuzzy search.
  // Reduce fricción de escribir/buscar para repeat work (Miguel UX 2026-05-03).
  const plants = useAssetStore((s) => s.plants);
  const recentSpecies = useMemo(() => computeRecentSpecies(plants, allSpecies), [plants, allSpecies]);

  // Autopilot H (2026-05-03): identificación de especie por foto.
  // Vision model qwen2.5vl:7b (con fallback gemma3:4b en aiService).
  // confidence ≥0.7 auto-selecciona si match en catálogo, sino muestra
  // alternativas + bug report button para validar.
  // Dual capture (2026-05-18): camera (capture=environment) + gallery.
  const aiCameraRef = useRef(null);
  const aiGalleryRef = useRef(null);
  const [aiState, setAiState] = useState('idle'); // idle | running | done | error
  const [aiResult, setAiResult] = useState(null);

  const handleAiCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAiState('error');
      return;
    }
    setAiState('running');
    setAiResult(null);
    try {
      const { blob } = await captureAndCompress(file);
      // Bug fix #2 (2026-05-18): la foto sirve tanto para identificar como
      // para persistirse como foto de la planta. Si el parent pasó onPhoto,
      // le delegamos el blob ya comprimido (mismo blob que enviamos a Ollama)
      // para evitar doble captura.
      if (typeof onPhoto === 'function') {
        try {
          onPhoto(blob);
        } catch (err) {
          console.warn('[SpeciesSelect] onPhoto callback failed:', err);
        }
      }
      const result = await recognizeSpeciesGrounded(blob);
      if (!result) {
        setAiState('error');
        return;
      }
      setAiResult(result);
      setAiState('done');
      // Bug 2026-05-18 operator: 'cuando activo reconocimiento por imagen
      // solo para agregar la foto, se cambia la especie que ya seleccioné y
      // se puede poner una incorrecta cuando el módulo falla'.
      //
      // Si el operador YA seleccionó especie (`value` no vacío o
      // `selectedSpeciesId` definido), el rol del flow es: capturar foto
      // como evidencia de SU planta — NO re-identificar la especie. La
      // foto se emite igual via onPhoto al parent. El resultado AI queda
      // como sugerencia (aiResult) pero NO sobrescribe la selección
      // actual. Si el operador quiere usar la sugerencia, toca el botón
      // de alternativas explícitamente.
      const alreadySelected = (value && value.trim().length > 0) || !!selectedSpeciesId;
      if (!alreadySelected && result.confidence >= 0.7 && result.common_name_es) {
        const match = allSpecies.find((sp) => {
          const display = (sp.name || '').toLowerCase();
          const comun = (sp.nombre_comun || '').toLowerCase();
          const target = result.common_name_es.toLowerCase();
          return display === target || comun === target || display.startsWith(target);
        });
        if (match) {
          handleSelect(match);
        }
      }
    } catch (err) {
      console.warn('[SpeciesSelect] AI recognition failed:', err);
      setAiState('error');
    } finally {
      if (aiCameraRef.current) aiCameraRef.current.value = '';
      if (aiGalleryRef.current) aiGalleryRef.current.value = '';
    }
  };

  const handleAiPickAlternative = (altName) => {
    const match = allSpecies.find((sp) => {
      const display = (sp.name || '').toLowerCase();
      const comun = (sp.nombre_comun || '').toLowerCase();
      const target = (altName || '').toLowerCase();
      return display === target || comun === target;
    });
    if (match) {
      handleSelect(match);
      setAiResult(null);
      setAiState('idle');
    } else {
      // No está en el catálogo → entrada libre
      onChange(altName);
      setAiResult(null);
      setAiState('idle');
    }
  };

  const handleAiReportBug = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('chagra:experimental_bugs') || '[]');
      existing.push({
        ts: new Date().toISOString(),
        feature: 'recognizeSpecies',
        result: aiResult,
      });
      localStorage.setItem('chagra:experimental_bugs', JSON.stringify(existing.slice(-50)));
      window.dispatchEvent(new CustomEvent('chagraToast', {
        detail: { message: 'Reporte registrado. Gracias por validar features experimentales.' },
      }));
    } catch (err) {
      console.warn('[SpeciesSelect] bug report failed:', err);
    }
  };

  // Lookup speciesId desde el value persistido (al re-abrir formulario con datos).
  // Se prefiere el id explicit del último handleSelect; si no, intenta match exact.
  useEffect(() => {
    if (selectedSpeciesId) return;
    if (!value) return;
    const match = allSpecies.find((sp) => sp.name === value);
    if (match) setSelectedSpeciesId(match.id);
  }, [value, selectedSpeciesId, allSpecies]);

  // Foto guía del catálogo según especie elegida (Fase 1 wiring photoService).
  // Si no hay foto del catálogo en /catalog-photos/<slug>.jpg cae al placeholder.
  // En el futuro Fase 3 se hidrata el directorio con ~20 fotos top-uso desde GBIF.
  const photo = usePhotoUrl({ speciesSlug: selectedSpeciesId });

  // Cerrar dropdown al clickar fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(
    () => fuzzyFilter(query, allSpecies, (sp) => sp.name, 30),
    [query, allSpecies]
  );

  const handleSelect = (species) => {
    setSelectedSpeciesId(species.id);
    onChange(species.name, species.id);
    setQuery('');
    setOpen(false);

    // Autocompletado: resuelve defaults y notifica al padre.
    // ADR-030: incluye tracking_mode (individual|aggregate) para que el form
    // adapte UI (qty visible si aggregate, link override sutil si quiere lo opuesto).
    if (onAutoFill) {
      const defaults = resolveSpeciesDefaults(species.id, species.groupId);
      if (defaults) {
        onAutoFill({
          estrato: defaults.estrato,
          gremio: defaults.gremio,
          production: defaults.production,
          cycleMonths: defaults.cycleMonths,
          tracking_mode: defaults.tracking_mode,
        });
      }
    }
  };

  const handleClear = () => {
    onChange('', null);
    setSelectedSpeciesId(null);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
        Especie Cultivable
      </label>

      {/* Atajos rápidos: últimas 3 especies registradas (Miguel UX 2026-05-03).
          Solo aparece si el usuario ya tiene plantas Y aún no eligió especie
          en el form actual. Cada chip se comporta como tap en fuzzy result. */}
      {recentSpecies.length > 0 && !value && (
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <Clock size={11} className="text-slate-500" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Recientes:</span>
          {recentSpecies.map((sp) => (
            <button
              key={sp.id || sp.name}
              type="button"
              onClick={() => {
                if (sp.id) {
                  handleSelect(sp);
                } else {
                  // Free-text species (no en catálogo): solo setea el name
                  onChange(sp.name);
                  setSelectedSpeciesId(null);
                }
              }}
              className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-800/40 active:scale-95 transition-all"
            >
              {sp.name}
            </button>
          ))}
        </div>
      )}

      {/* Input de búsqueda / display */}
      <div
        className="w-full flex items-center gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search size={16} className="text-slate-500 shrink-0" />
        {open ? (
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar especie… (ej: gulpa, café, mora)"
            className="flex-1 bg-transparent text-white text-sm outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${value ? 'text-white' : 'text-slate-500'}`}>
            {value || 'Seleccionar especie…'}
          </span>
        )}
        {value && !open && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown con resultados */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-[40vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Sin coincidencias. Escribe el nombre para entrada libre.
              <button
                type="button"
                onClick={() => {
                  if (query.trim()) {
                    onChange(query.trim());
                    setQuery('');
                    setOpen(false);
                  }
                }}
                className="block mx-auto mt-2 px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold"
              >
                Usar "{query}" como nombre libre
              </button>
              {/* Audit 2026-05-18 #070.10: avisar que sin id de catálogo no
                  habrá plan de alimentación auto-generado. Operador reporta
                  bug "fresa sin plan" cuando entra por entrada libre. */}
              <p className="text-[10px] text-amber-400 mt-2 px-2 leading-snug">
                Sin coincidencia en catálogo: el plan de alimentación automático no se generará.
                Probá variantes (ej. &quot;fresa monterrey&quot; o nombre científico).
              </p>
            </div>
          ) : (
            filtered.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => handleSelect(sp)}
                className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 transition-colors"
              >
                <span className="text-sm text-white font-medium block truncate">{sp.name}</span>
                <span className="text-[10px] text-slate-500">{sp.groupLabel}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Foto guía del catálogo (Fase 1 wiring photoService).
          Aparece solo si el operario eligió una especie del fuzzy search.
          Si hay foto del usuario para la misma especie en otra mata se
          prioriza esa (4-tier resolver de getPhotoUrl). */}
      {selectedSpeciesId && photo.url && !photo.loading && (
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
          <img
            src={photo.url}
            alt={value || 'Foto de la especie'}
            className="w-12 h-12 rounded object-cover bg-slate-800 shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {photo.source === 'user'
                ? 'Tu última foto de esta especie'
                : photo.source === 'catalog'
                  ? 'Foto del catálogo'
                  : 'Sin foto aún, la primera que tomes queda como referencia'}
            </p>
            <p className="text-xs text-slate-300 truncate">{value}</p>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-slate-500">
        Búsqueda aproximada. Los campos de estrato y gremio se sugieren al seleccionar.
      </p>

      {/* Autopilot H, Identificación por foto (experimental gemma3:4b) */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={12} className="text-amber-400" />
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
            Identificar con foto
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/50 font-bold">
            BETA
          </span>
        </div>

        {aiState === 'idle' && (
          // Bug fix #3 (2026-05-18): dual capture — cámara + galería.
          // - "Tomar foto" usa capture="environment" forzando la cámara trasera
          //   (mobile UX nativa, sin picker intermedio).
          // - "Elegir foto" sin capture deja al SO mostrar el picker
          //   (galería / cámara / archivos).
          // Side-by-side en grid 2 columnas. Ambos delegan al mismo handler
          // que (#2) re-emite el blob al parent via onPhoto si está conectado.
          <div className="grid grid-cols-2 gap-2">
            <label
              className="w-full p-2.5 rounded-lg bg-amber-900/20 hover:bg-amber-800/30 active:bg-amber-800/50 text-amber-300 border border-amber-800/50 cursor-pointer flex items-center justify-center gap-2 text-xs min-h-[40px] transition-colors"
              onMouseDown={() => warmVisionModel().catch(() => {})}
              onTouchStart={() => warmVisionModel().catch(() => {})}
            >
              <Camera size={14} /> Tomar foto
              <input
                ref={aiCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAiCapture}
                className="hidden"
              />
            </label>
            <label
              className="w-full p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 border border-amber-800/50 cursor-pointer flex items-center justify-center gap-2 text-xs min-h-[40px] transition-colors"
              onMouseDown={() => warmVisionModel().catch(() => {})}
              onTouchStart={() => warmVisionModel().catch(() => {})}
            >
              <ImagePlus size={14} /> Elegir foto
              <input
                ref={aiGalleryRef}
                type="file"
                accept="image/*"
                onChange={handleAiCapture}
                className="hidden"
              />
            </label>
          </div>
        )}

        {aiState === 'running' && (
          <VisionLoadingState label="Analizando foto" />
        )}

        {aiState === 'done' && aiResult && (
          <div className="p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-800/50 space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-0.5">
                Especie sugerida ({Math.round((aiResult.confidence || 0) * 100)}% confianza)
              </p>
              {/* Badge grounded contra catálogo (V-05 — anti-alucinación con
                  shape estructurado). `_grounded.status` distingue 6 estados:
                    verified         → verde, sugerencia confirmada.
                    rejected         → amber, sugerencia rechazada por catálogo.
                    sidecar-disabled → slate info, validación desactivada.
                    offline          → slate info, sin red para verificar.
                    no-binomial      → amber, nombre científico ambiguo.
                    sidecar-error    → amber, error temporal del catálogo. */}
              {aiResult._grounded?.status === 'verified' && (
                <span
                  data-testid="grounded-badge-verified"
                  className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-green-600/20 text-green-300 border border-green-700 mb-1"
                  title={aiResult._grounded.reason}
                >
                  <Check size={14} aria-hidden="true" />
                  Verificado en catálogo
                </span>
              )}
              {aiResult._grounded?.status === 'rejected' && (
                <span
                  data-testid="grounded-badge-rejected"
                  className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-amber-600/20 text-amber-300 border border-amber-700 mb-1"
                  title={aiResult._grounded.reason}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  No encontrado en catálogo
                </span>
              )}
              {aiResult._grounded?.status === 'sidecar-disabled' && (
                <span
                  data-testid="grounded-badge-sidecar-disabled"
                  className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-slate-600/20 text-slate-300 border border-slate-700 mb-1"
                  title={aiResult._grounded.reason}
                >
                  <Info size={14} aria-hidden="true" />
                  Validación deshabilitada
                </span>
              )}
              {aiResult._grounded?.status === 'offline' && (
                <span
                  data-testid="grounded-badge-offline"
                  className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-slate-600/20 text-slate-300 border border-slate-700 mb-1"
                  title={aiResult._grounded.reason}
                >
                  <WifiOff size={14} aria-hidden="true" />
                  Sin conexión
                </span>
              )}
              {aiResult._grounded?.status === 'no-binomial' && (
                <span
                  data-testid="grounded-badge-no-binomial"
                  className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-amber-600/20 text-amber-300 border border-amber-700 mb-1"
                  title={aiResult._grounded.reason}
                >
                  <HelpCircle size={14} aria-hidden="true" />
                  Nombre ambiguo
                </span>
              )}
              {aiResult._grounded?.status === 'sidecar-error' && (
                <span
                  data-testid="grounded-badge-sidecar-error"
                  className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 bg-amber-600/20 text-amber-300 border border-amber-700 mb-1"
                  title={aiResult._grounded.reason}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                  Error temporal
                </span>
              )}
              <p className="text-sm text-emerald-200 font-bold">
                {aiResult.common_name_es || '—'}
              </p>
              {aiResult.scientific_name && (
                <p className="text-[11px] text-emerald-400 italic">
                  {aiResult.scientific_name}
                </p>
              )}
              {/* UX-1 (#284): badge "beta" debajo del nombre sugerido por
                  el modelo de visión. Recordatorio sutil de que la
                  identificación es generativa, aun cuando esté grounded. */}
              <AIBetaBadge className="mt-1" title="Identificación generada por IA — verifica antes de actuar." />
            </div>
            {/* Si el primario fue rechazado por el catálogo pero el sidecar
                encontró candidates alternativos válidos, ofrecerlos como
                sugerencias confiables. Solo aplica al status 'rejected'
                (no a 'sidecar-error'/'no-binomial' donde no hubo validación). */}
            {aiResult._grounded?.status === 'rejected' && Array.isArray(aiResult._all_validations) && (() => {
              const validCandidates = aiResult._all_validations.filter(
                (v) => v && v.valid === true && v.species_id
              );
              if (validCandidates.length === 0) return null;
              return (
                <div data-testid="grounded-valid-candidates">
                  <p className="text-[10px] uppercase tracking-wider text-green-400 font-bold mb-1">
                    Coincidencias en catálogo
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {validCandidates.slice(0, 4).map((v, i) => (
                      <button
                        key={v.species_id || i}
                        type="button"
                        onClick={() => handleAiPickAlternative(v.source_label || v.species_id || '')}
                        className="text-[11px] px-2 py-0.5 rounded bg-green-900/30 hover:bg-green-800/40 text-green-200 border border-green-700"
                      >
                        {v.source_label || v.species_id}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {Array.isArray(aiResult.alternatives) && aiResult.alternatives.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-1">
                  Alternativas
                </p>
                <div className="flex flex-wrap gap-1">
                  {aiResult.alternatives.map((alt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAiPickAlternative(typeof alt === 'string' ? alt : alt.name || alt.common_name_es || '')}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      {typeof alt === 'string' ? alt : alt.name || alt.common_name_es || 'Opción'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setAiResult(null); setAiState('idle'); }}
                className="flex-1 text-[11px] px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                Probar de nuevo
              </button>
              <button
                type="button"
                onClick={handleAiReportBug}
                className="text-[11px] px-2 py-1.5 rounded bg-red-900/20 hover:bg-red-800/30 text-red-300 border border-red-800/40 flex items-center gap-1"
                title="Registrar diagnóstico defectuoso"
              >
                <Bug size={11} />
              </button>
            </div>
          </div>
        )}

        {aiState === 'error' && (
          <div className="p-2.5 rounded-lg bg-red-900/20 border border-red-800/50 text-xs text-red-300">
            <p className="font-bold mb-0.5">No se pudo identificar</p>
            <p className="text-[11px] text-red-400/80">El modelo Ollama puede no estar disponible o la imagen no pudo procesarse.</p>
            <button
              type="button"
              onClick={() => setAiState('idle')}
              className="mt-1.5 text-[11px] underline text-red-300"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeciesSelect;

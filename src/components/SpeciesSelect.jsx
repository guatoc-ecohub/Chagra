import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Clock, Sparkles, Camera, Loader2, Bug } from 'lucide-react';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';
import { fuzzyFilter } from '../utils/fuzzySearch';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import useAssetStore from '../store/useAssetStore';
import { captureAndCompress } from '../services/photoService';
import { recognizeSpecies } from '../services/aiService';

/**
 * SpeciesSelect — Selector de especie con fuzzy search y autocompletado de defaults.
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
 *   - onChange:    callback(name: string, speciesId: string|null) — actualiza formData.name
 *   - onAutoFill: callback({ estrato, gremio, production, cycleMonths }) — sugerencia
 */

// Flatten de todas las especies con su grupo para lookup rápido.
const ALL_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => ({ ...sp, groupId, groupLabel: group.label }))
);

// Calcula últimas 3 especies registradas por el usuario (Miguel UX 2026-05-03).
// Lee plants del store, agrupa por nombre canónico, ordena por _createdAt y
// devuelve las últimas 3 únicas como { id, name, groupId, groupLabel } match
// del catálogo CROP_TAXONOMY. Si una planta tiene name libre que NO matchea,
// la incluye igual con id=null para que el chip funcione como atajo de nombre.
const computeRecentSpecies = (plants) => {
  if (!Array.isArray(plants) || plants.length === 0) return [];
  const sorted = [...plants].sort((a, b) => (b._createdAt || 0) - (a._createdAt || 0));
  const seen = new Set();
  const result = [];
  for (const p of sorted) {
    const name = p.attributes?.name || p.name || '';
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    // Quitar sufijo "#001" de nombres bulk-individual para detectar especie real
    const baseName = name.replace(/\s+#\d+$/, '');
    const match = ALL_SPECIES.find(
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

export const SpeciesSelect = ({ value, onChange, onAutoFill }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const wrapperRef = useRef(null);

  // Últimas 3 especies del usuario — atajos rápidos arriba del fuzzy search.
  // Reduce fricción de escribir/buscar para repeat work (Miguel UX 2026-05-03).
  const plants = useAssetStore((s) => s.plants);
  const recentSpecies = useMemo(() => computeRecentSpecies(plants), [plants]);

  // Autopilot H (2026-05-03): identificación de especie por foto via gemma3:4b.
  // Marcado experimental — confidence ≥0.7 auto-selecciona si match en CROP_TAXONOMY,
  // sino muestra alternativas + bug report button para validar.
  const aiInputRef = useRef(null);
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
      const result = await recognizeSpecies(blob);
      if (!result) {
        setAiState('error');
        return;
      }
      setAiResult(result);
      setAiState('done');
      // Auto-select si confidence alta + match exacto en CROP_TAXONOMY
      if (result.confidence >= 0.7 && result.common_name_es) {
        const match = ALL_SPECIES.find((sp) =>
          sp.name.toLowerCase() === result.common_name_es.toLowerCase()
        );
        if (match) {
          handleSelect(match);
        }
      }
    } catch (err) {
      console.warn('[SpeciesSelect] AI recognition failed:', err);
      setAiState('error');
    } finally {
      if (aiInputRef.current) aiInputRef.current.value = '';
    }
  };

  const handleAiPickAlternative = (altName) => {
    const match = ALL_SPECIES.find((sp) => sp.name.toLowerCase() === altName.toLowerCase());
    if (match) {
      handleSelect(match);
      setAiResult(null);
      setAiState('idle');
    } else {
      // No está en CROP_TAXONOMY → entrada libre
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
    const match = ALL_SPECIES.find((sp) => sp.name === value);
    if (match) setSelectedSpeciesId(match.id);
  }, [value, selectedSpeciesId]);

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
    () => fuzzyFilter(query, ALL_SPECIES, (sp) => sp.name, 30),
    [query]
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
                  : 'Sin foto aún — la primera que tomes queda como referencia'}
            </p>
            <p className="text-xs text-slate-300 truncate">{value}</p>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-slate-500">
        Búsqueda aproximada. Los campos de estrato y gremio se sugieren al seleccionar.
      </p>

      {/* Autopilot H — Identificación por foto (experimental gemma3:4b) */}
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
          <label className="w-full p-2.5 rounded-lg bg-amber-900/20 hover:bg-amber-800/30 active:bg-amber-800/50 text-amber-300 border border-amber-800/50 cursor-pointer flex items-center justify-center gap-2 text-xs min-h-[40px] transition-colors">
            <Camera size={14} /> Tomar foto para identificar especie
            <input
              ref={aiInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleAiCapture}
              className="hidden"
            />
          </label>
        )}

        {aiState === 'running' && (
          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-2 text-amber-400">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Analizando foto…</span>
          </div>
        )}

        {aiState === 'done' && aiResult && (
          <div className="p-2.5 rounded-lg bg-emerald-900/20 border border-emerald-800/50 space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-0.5">
                Especie sugerida ({Math.round((aiResult.confidence || 0) * 100)}% confianza)
              </p>
              <p className="text-sm text-emerald-200 font-bold">
                {aiResult.common_name_es || '—'}
              </p>
              {aiResult.scientific_name && (
                <p className="text-[11px] text-emerald-400 italic">
                  {aiResult.scientific_name}
                </p>
              )}
            </div>
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

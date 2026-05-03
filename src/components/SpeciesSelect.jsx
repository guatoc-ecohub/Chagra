import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';
import { fuzzyFilter } from '../utils/fuzzySearch';
import { usePhotoUrl } from '../hooks/usePhotoUrl';

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

export const SpeciesSelect = ({ value, onChange, onAutoFill }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const wrapperRef = useRef(null);

  // Lookup speciesId desde el value persistido (al re-abrir formulario con datos).
  // Se prefiere el id explicit del último handleSelect; si no, intenta match exact.
  useEffect(() => {
    if (selectedSpeciesId) return;
    if (!value) return;
    const match = ALL_SPECIES.find((sp) => sp.name === value);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lookup síncrono local, no causa cascading renders (skip si match falla)
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
    </div>
  );
};

export default SpeciesSelect;

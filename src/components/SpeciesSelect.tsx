import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';
import { fuzzyFilter } from '../utils/fuzzySearch';

/**
 * SpeciesSelect — Selector de especie con fuzzy search y autocompletado.
 */

interface SpeciesEntry {
  id: string;
  name: string;
  groupId: string;
  groupLabel: string;
}

export interface AutoFillPayload {
  estrato?: string;
  gremio?: string;
  production?: string;
  cycleMonths?: number | null;
}

interface SpeciesSelectProps {
  value: string;
  onChange: (name: string, speciesId?: string | null) => void;
  onAutoFill?: (defaults: AutoFillPayload) => void;
}

// Flatten de todas las especies con su grupo para lookup rápido.
const ALL_SPECIES: SpeciesEntry[] = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => ({ ...sp, groupId, groupLabel: group.label }))
);

export const SpeciesSelect: React.FC<SpeciesSelectProps> = ({ value, onChange, onAutoFill }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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

  const handleSelect = (species: SpeciesEntry) => {
    onChange(species.name, species.id);
    setQuery('');
    setOpen(false);

    if (onAutoFill) {
      const defaults = resolveSpeciesDefaults(species.id, species.groupId);
      if (defaults) {
        const payload: AutoFillPayload = {};
        if (defaults.estrato !== undefined) payload.estrato = defaults.estrato;
        if (defaults.gremio !== undefined) payload.gremio = defaults.gremio;
        if (defaults.production !== undefined) payload.production = defaults.production;
        if ('cycleMonths' in defaults) {
          payload.cycleMonths = (defaults as { cycleMonths?: number | null }).cycleMonths ?? null;
        }
        onAutoFill(payload);
      }
    }
  };

  const handleClear = () => {
    onChange('', null);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
        Especie Cultivable
      </label>

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
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-[40vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Sin coincidencias. Escribe el nombre para entrada libre.
              <button
                type="button"
                onClick={() => {
                  if (query.trim()) {
                    onChange(query.trim(), null);
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

      <p className="mt-1 text-xs text-slate-500">
        Búsqueda aproximada. Los campos de estrato y gremio se sugieren al seleccionar.
      </p>
    </div>
  );
};

export default SpeciesSelect;

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, AlertTriangle, Check } from 'lucide-react';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { fuzzyFilter } from '../utils/fuzzySearch';
import { getAllSpecies } from '../db/catalogDB';

/**
 * SpeciesCombobox — selector de especie con búsqueda/autocompletado, respaldado
 * por el CATÁLOGO real (catalogDB, ~480 especies) con fallback legacy estático.
 *
 * Por qué existe (bug operador 2026-06-25): registrar una especie con un
 * `<input>` de TEXTO LIBRE deja que el campesino escriba "Fresa - Invernadero #1",
 * que NO resuelve a ninguna especie del catálogo → se rompe el calendario, la
 * fenología y el plan de alimentación. La cura de raíz es que el camino por
 * defecto sea ELEGIR de la lista grounded del catálogo (la especie SIEMPRE
 * resuelve a un `id` canónico), y que el texto libre sea una salida explícita y
 * marcada — no el comportamiento por defecto.
 *
 * Diferencia con SpeciesSelect: este componente es LIVIANO y reutilizable. No
 * incluye identificación por foto/visión ni atajos "recientes" — solo el
 * combobox grounded + fallback honesto. Pensado para formularios que ya tienen
 * su propia captura de foto (SeedingLog) o donde no aplica (futuros flujos).
 *
 * Contrato de `onChange(commonName, speciesId)`:
 *   - Al elegir del catálogo: commonName = nombre común limpio ("Fresa"),
 *     speciesId = id canónico ("fragaria_ananassa").
 *   - Al usar texto libre (fallback marcado): commonName = lo escrito,
 *     speciesId = null. El consumidor sabe que NO está grounded.
 *
 * Props:
 *   - value:        string — nombre común actual (controlado por el padre).
 *   - speciesId:    string|null — id de catálogo actual (controlado).
 *   - onChange:     (commonName: string, speciesId: string|null) => void
 *   - label:        string — etiqueta visible. Default "Especie".
 *   - placeholder:  string — placeholder del input de búsqueda.
 *   - helpText:     string — texto de ayuda bajo el campo.
 *   - inputName:    string — atributo name del input (para tests/e2e).
 *   - allowFreeText:boolean — si false, oculta el fallback de texto libre.
 */

// Fallback estático legacy (~77 especies de config/taxonomy.js). Garantiza
// offline-first duro: si catalogDB (SQLite WASM/OPFS) tarda o falla en cold
// boot, el selector sigue funcionando. Si el catálogo carga, lo reemplaza.
const splitDisplayName = (display) => {
  const raw = String(display || '').trim();
  const open = raw.indexOf(' (');
  if (open > 0 && raw.endsWith(')')) {
    return {
      nombre_comun: raw.slice(0, open).trim(),
      nombre_cientifico: raw.slice(open + 2, -1).trim(),
    };
  }
  return { nombre_comun: raw, nombre_cientifico: '' };
};

const LEGACY_SPECIES = Object.entries(CROP_TAXONOMY).flatMap(([groupId, group]) =>
  group.species.map((sp) => {
    const { nombre_comun, nombre_cientifico } = splitDisplayName(sp.name);
    return {
      id: sp.id,
      nombre_comun,
      nombre_cientifico,
      displayName: sp.name,
      groupId,
      groupLabel: group.label,
    };
  })
);

// Normaliza un row del catálogo SQLite al shape interno del combobox.
const normalizeCatalogSpecies = (row) => {
  if (!row || !row.id) return null;
  const nombre = (row.nombre_comun || row.id || '').trim();
  const cientifico = (row.nombre_cientifico || '').trim();
  const cat = row.categoria || row.category || row.tipo || 'catálogo';
  return {
    id: row.id,
    nombre_comun: nombre,
    nombre_cientifico: cientifico,
    displayName: cientifico ? `${nombre} (${cientifico})` : nombre,
    groupId: cat,
    groupLabel: cat,
  };
};

// Timeout duro para no congelar el form si OPFS/WASM se cuelga.
const CATALOG_LOAD_TIMEOUT_MS = 2000;

/** @param {{ value: any, speciesId: string|null, onChange: Function, label?: string, placeholder?: string, helpText?: string, inputName?: string, allowFreeText?: boolean }} props */
export const SpeciesCombobox = ({
  value,
  speciesId,
  onChange,
  label = 'Especie',
  placeholder = 'Buscar especie… (ej: fresa, café, mora)',
  helpText = 'Elige de la lista del catálogo para que tu cultivo aparezca en el calendario y la fenología.',
  inputName,
  allowFreeText = true,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const queryInputRef = useRef(null);

  // Catálogo dinámico con fallback legacy.
  const [allSpecies, setAllSpecies] = useState(LEGACY_SPECIES);
  useEffect(() => {
    let cancelled = false;
    Promise.race([
      getAllSpecies(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('catalog_timeout')), CATALOG_LOAD_TIMEOUT_MS)
      ),
    ])
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const normalized = rows.map(normalizeCatalogSpecies).filter(Boolean);
        if (normalized.length > 0) setAllSpecies(normalized);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[SpeciesCombobox] catalogDB falló, usando LEGACY_SPECIES:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, []);

  // Cerrar dropdown al hacer clic fuera.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(
    () => fuzzyFilter(query, allSpecies, (sp) => sp.displayName, 30),
    [query, allSpecies]
  );

  const handleSelect = (species) => {
    onChange(species.nombre_comun, species.id);
    setQuery('');
    setOpen(false);
  };

  const handleFreeText = () => {
    const txt = query.trim();
    if (!txt) return;
    onChange(txt, null);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('', null);
    setQuery('');
  };

  // ¿El value actual es texto libre (sin id de catálogo)? Para avisar al usuario.
  const isFreeText = !!value && !speciesId;

  return (
    <div ref={wrapperRef} className="relative" data-testid="species-combobox">
      <label className="block text-xl font-bold mb-2">{label}</label>

      {/* Caja de búsqueda / display del valor seleccionado */}
      <div
        className="w-full flex items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer min-h-[64px]"
        onClick={() => setOpen(true)}
      >
        <Search size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
        {open ? (
          <input
            ref={queryInputRef}
            autoFocus
            type="text"
            name={inputName}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder-slate-500"
            onClick={(e) => e.stopPropagation()}
            data-testid="species-combobox-input"
          />
        ) : (
          <span className={`flex-1 text-lg truncate ${value ? 'text-white' : 'text-slate-500'}`}>
            {value || 'Seleccionar especie…'}
          </span>
        )}
        {value && !open && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            aria-label="Quitar especie"
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </div>

      {/* Dropdown de resultados */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-[45vh] overflow-y-auto"
          data-testid="species-combobox-dropdown"
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              No encontré esa especie en el catálogo.
              {allowFreeText && query.trim() && (
                <>
                  <button
                    type="button"
                    onClick={handleFreeText}
                    data-testid="species-combobox-freetext"
                    className="block mx-auto mt-3 px-3 py-2 bg-amber-900/30 text-amber-200 border border-amber-700/50 rounded-lg text-sm font-bold"
                  >
                    Usar &quot;{query.trim()}&quot; como nombre libre
                  </button>
                  <p className="text-[11px] text-amber-400/90 mt-2 px-2 leading-snug flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                    Sin coincidencia en el catálogo no habrá calendario, fenología ni
                    plan automático. Prueba variantes (ej. el nombre científico).
                  </p>
                </>
              )}
            </div>
          ) : (
            filtered.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => handleSelect(sp)}
                className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 transition-colors"
              >
                <span className="text-sm text-white font-medium block truncate">{sp.displayName}</span>
                <span className="text-[10px] text-slate-500">{sp.groupLabel}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Estado del valor: grounded (verde) vs texto libre (ámbar) */}
      {value && !open && (
        speciesId ? (
          <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1.5" data-testid="species-grounded-ok">
            <Check size={13} aria-hidden="true" /> Especie del catálogo: resuelve para calendario y fenología.
          </p>
        ) : isFreeText && (
          <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1.5" data-testid="species-freetext-warn">
            <AlertTriangle size={13} aria-hidden="true" /> Nombre libre: sin calendario ni plan automático.
          </p>
        )
      )}

      {helpText && !value && (
        <p className="mt-1.5 text-xs text-slate-500">{helpText}</p>
      )}
    </div>
  );
};

export default SpeciesCombobox;

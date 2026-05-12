import React, { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { getAllSpecies } from '../../db/catalogDB';

const MAX_SPECIES = 5;

export default function SpeciesSelectionStep({ data, onUpdate }) {
  const [allSpecies, setAllSpecies] = useState([]);
  const [query, setQuery] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('loading');

  useEffect(() => {
    getAllSpecies()
      .then((sp) => {
        setAllSpecies(sp);
        setCatalogStatus('ready');
      })
      .catch(() => setCatalogStatus('error'));
  }, []);

  const filtered = allSpecies.filter((sp) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (sp.nombre_comun || '').toLowerCase().includes(q) ||
      (sp.nombre_cientifico || '').toLowerCase().includes(q) ||
      (sp.id || '').toLowerCase().includes(q)
    );
  });

  const toggleSpecies = (speciesId) => {
    const current = data.selectedSpecies;
    if (current.includes(speciesId)) {
      onUpdate({ selectedSpecies: current.filter((id) => id !== speciesId) });
    } else if (current.length < MAX_SPECIES) {
      onUpdate({ selectedSpecies: [...current, speciesId] });
    }
  };

  const selectedIds = new Set(data.selectedSpecies);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-white">Selecciona tus especies objetivo</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Elige de 1 a {MAX_SPECIES} especies que quieres cultivar.
          Las recomendaciones del catalogo se filtran segun tu escala ({data.tipo_espacio}).
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700">
        <Search size={16} className="text-slate-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar especie... (ej: tomate, lechuga)"
          className="flex-1 bg-transparent text-white text-sm outline-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {selectedIds.size} de {MAX_SPECIES} seleccionadas
        </p>
        {data.selectedSpecies.length === MAX_SPECIES && (
          <p className="text-[10px] text-amber-400 font-bold">Maximo alcanzado</p>
        )}
      </div>

      {catalogStatus === 'loading' && (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-500">Cargando catalogo...</p>
        </div>
      )}

      {catalogStatus === 'error' && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-sm text-red-300">
          No se pudo cargar el catalogo de especies. Puedes continuar sin seleccionar.
        </div>
      )}

      {catalogStatus === 'ready' && (
        <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Sin coincidencias.
            </div>
          ) : (
            filtered.map((sp) => {
              const selected = selectedIds.has(sp.id);
              const disabled = !selected && data.selectedSpecies.length >= MAX_SPECIES;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => !disabled && toggleSpecies(sp.id)}
                  disabled={disabled}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 min-h-[56px] ${
                    selected
                      ? 'bg-emerald-900/30 border-emerald-600 text-white'
                      : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  aria-pressed={selected}
                >
                  <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    selected ? 'bg-emerald-600 border-emerald-500' : 'border-slate-700'
                  }`}>
                    {selected && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{sp.nombre_comun || sp.id}</p>
                    {sp.nombre_cientifico && (
                      <p className="text-[10px] text-slate-500 italic truncate">{sp.nombre_cientifico}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {data.selectedSpecies.length > 0 && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleccionadas</p>
          <div className="flex flex-wrap gap-2">
            {data.selectedSpecies.map((id) => {
              const sp = allSpecies.find((s) => s.id === id);
              return (
                <span
                  key={id}
                  className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 font-bold"
                >
                  {sp?.nombre_comun || id}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
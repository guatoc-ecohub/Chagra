import React from 'react';
import { Check, Pencil, RefreshCcw } from 'lucide-react';
import { useLocationCorrection } from '../../hooks/useLocationCorrection';
import { MSG } from '../../config/messages.js';

/**
 * Editor inline para corregir barrio o vereda.
 *
 * @param {{
 *   profile?: object|null,
 *   onSave?: (nextProfile: object) => void,
 *   title?: string,
 *   compact?: boolean,
 * }} props
 */
export default function LocationCorrectionInline({
  profile = null,
  onSave = undefined,
  title = 'Corregir barrio o vereda',
  compact = false,
}) {
  const {
    tipo,
    sublocalidad,
    municipio,
    departamento,
    setTipo,
    setSublocalidad,
    setMunicipio,
    setDepartamento,
    reset,
    save,
    isDirty,
    canSave,
  } = useLocationCorrection({ profile, onSave });

  const handleSave = () => {
    if (!canSave) return;
    save();
  };

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/50 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-emerald-400" aria-hidden="true">
          <Pencil size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-slate-400 leading-snug">
            Ajuste el barrio o la vereda que quiere que Chagra use en toda la app.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'vereda', label: 'Vereda' },
          { id: 'barrio', label: 'Barrio' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTipo(opt.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors min-h-[44px] ${
              tipo === opt.id
                ? 'border-emerald-500/60 bg-emerald-900/30 text-emerald-200'
                : 'border-slate-700 bg-slate-800/40 text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Nombre
        </span>
        <input
          type="text"
          value={sublocalidad}
          onChange={(e) => setSublocalidad(e.target.value)}
          placeholder={tipo === 'barrio' ? 'Barrio X' : 'Vereda El Curi'}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500 min-h-[44px]"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Municipio
          </span>
          <input
            type="text"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            placeholder="Choachí"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500 min-h-[44px]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Departamento
          </span>
          <input
            type="text"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            placeholder="Cundinamarca"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500 min-h-[44px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 min-h-[44px]"
        >
          <Check size={16} aria-hidden="true" />
          {MSG.action.guardar}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={!isDirty}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 disabled:opacity-50 min-h-[44px]"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Revertir
        </button>
      </div>
    </div>
  );
}

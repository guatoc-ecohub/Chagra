import React, { useMemo, useState } from 'react';
import { Sprout, FlaskConical, Ban, AlertTriangle, Check, X } from 'lucide-react';
import { CROP_TAXONOMY } from '../config/taxonomy';

/**
 * FarmProcessConfirmCard — tarjeta de confirmación editable para un ciclo
 * productivo (siembra/restauración). Recibe un FarmProcessDraft y permite
 * editar todos los campos antes de confirmar una sola vez.
 *
 * Props:
 *   - draft: FarmProcessDraft (de voiceToDraft.buildDraftsFromVoice)
 *   - locationOptions: Array<{id, type, name, label}>
 *   - isSaving: boolean
 *   - onConfirm(editedDraft: FarmProcessDraft): Promise<void>
 *   - onCancel(): void
 */
export default function FarmProcessConfirmCard({
  draft,
  locationOptions = [],
  isSaving = false,
  onConfirm,
  onCancel,
}) {
  const [species, setSpecies] = useState(draft.subject_label || '');
  const [variety, setVariety] = useState(draft.variety || '');
  const [quantity, setQuantity] = useState(draft.quantity || 1);
  const [unit, setUnit] = useState(draft.unit || 'plantas');
  const [locationId, setLocationId] = useState(draft.location_land_asset_id || '');
  const [date, setDate] = useState(() => {
    if (draft.suggested_date) {
      return new Date(draft.suggested_date).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  // Flat list of all species from taxonomy for autocomplete
  const allSpecies = useMemo(() => {
    const list = [];
    Object.values(CROP_TAXONOMY).forEach((group) => {
      group.species.forEach((sp) => {
        const commonName = sp.name.split('(')[0].trim();
        list.push({ ...sp, commonName, group: group.label });
      });
    });
    return list;
  }, []);

  const speciesSuggestions = useMemo(() => {
    if (!species.trim()) return [];
    const q = species.toLowerCase();
    return allSpecies
      .filter((s) => s.commonName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [species, allSpecies]);

  const handleConfirm = () => {
    if (!species.trim() || !(Number(quantity) > 0)) return;
    const selected = allSpecies.find((s) => s.commonName === species || s.name === species);
    onConfirm({
      ...draft,
      subject_label: species.trim(),
      subject_slug: selected?.id || draft.subject_slug,
      variety: variety.trim() || undefined,
      quantity: Number(quantity),
      unit,
      location_land_asset_id: locationId,
      suggested_date: new Date(date).getTime(),
    });
  };

  const allValid = species.trim().length > 0 && Number(quantity) > 0;

  return (
    <div className="p-4 flex flex-col gap-4">
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        {draft.transcription && (
          <p className="text-2xs uppercase font-bold text-slate-500 mb-2">Transcripción</p>
        )}
        {draft.transcription && (
          <p className="text-sm text-slate-200 italic mb-3">"{draft.transcription}"</p>
        )}
        <p className="text-xs text-slate-400">
          {draft.process_type === 'restoration'
            ? '🌳 Ciclo de reforestación / restauración'
            : draft.process_type === 'silvopasture'
              ? '🐄 Ciclo silvopastoril'
              : draft.process_type === 'harvest'
                ? '🌾 Ciclo de cosecha'
                : draft.process_type === 'post_harvest'
                  ? '📦 Post-cosecha'
                  : draft.process_type === 'pest_management'
                    ? '🐛 Manejo de plagas'
                    : '🌿 Nuevo ciclo de siembra'}
        </p>
      </section>

      {draft.warnings?.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            {draft.warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
      )}

      {/* Especie */}
      <label className="flex flex-col gap-1 relative">
        <span className="text-2xs font-bold text-slate-400 uppercase">Especie</span>
        <input
          type="text"
          value={species}
          onChange={(e) => { setSpecies(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={isSaving}
          placeholder="Ej: Café, Tomate, Frijol..."
        />
        {showSuggestions && speciesSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {speciesSuggestions.map((s) => (
              <button
                key={s.id}
                onMouseDown={() => { setSpecies(s.commonName); setShowSuggestions(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 border-b border-slate-700/50 last:border-b-0"
              >
                <span className="text-white">{s.commonName}</span>
                <span className="text-slate-500 ml-1 text-xs">{s.group}</span>
              </button>
            ))}
          </div>
        )}
      </label>

      {/* Variedad */}
      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">
          Variedad <span className="text-slate-600 font-normal">(opcional)</span>
        </span>
        <input
          type="text"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={isSaving}
          placeholder="Ej: Chonto, Pastusa, Castillo..."
        />
      </label>

      {/* Cantidad + Unidad en fila */}
      <div className="flex gap-2">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-2xs font-bold text-slate-400 uppercase">Cantidad</span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
            disabled={isSaving}
          />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-2xs font-bold text-slate-400 uppercase">Unidad</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
            disabled={isSaving}
          >
            <option value="plantas">plantas</option>
            <option value="semillas">semillas</option>
            <option value="árboles">árboles</option>
            <option value="esquejes">esquejes</option>
            <option value="bulbos">bulbos</option>
            <option value="kg">kg</option>
            <option value="arrobas">arrobas</option>
            <option value="bultos">bultos</option>
            <option value="litros">litros</option>
            <option value="kilos">kilos</option>
            <option value="libras">libras</option>
            <option value="gramos">gramos</option>
          </select>
        </label>
      </div>

      {/* Zona / Lote — opcional; si no hay lotes el ciclo se crea sin ubicacion */}
      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">Zona / Lote</span>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={isSaving}
        >
          <option value="">
            {locationOptions.length === 0 ? 'Sin lotes disponibles' : 'Seleccionar…'}
          </option>
          {locationOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label || o.name}</option>
          ))}
        </select>
        {!locationId && (
          <span className="text-3xs text-slate-500">Sin asignar (puedes asignarlo despues)</span>
        )}
      </label>

      {/* Fecha */}
      <label className="flex flex-col gap-1">
        <span className="text-2xs font-bold text-slate-400 uppercase">Fecha de siembra</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
          disabled={isSaving}
        />
      </label>

      {/* Insights RAG */}
      {draft.companions?.length > 0 && (
        <div className="text-xs text-emerald-200/90 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="font-bold inline-flex items-center gap-1">
            <Sprout size={12} className="text-emerald-400" /> Va bien con:
          </span>{' '}
          <span className="text-slate-300">
            {draft.companions.slice(0, 4).map((c) => c.especie).join(', ')}
          </span>
        </div>
      )}

      {draft.antagonists?.length > 0 && (
        <div className="text-xs text-amber-200/90 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="font-bold inline-flex items-center gap-1">
            <Ban size={12} className="text-amber-400" /> Evitar junto a:
          </span>{' '}
          <span className="text-slate-300">
            {draft.antagonists.slice(0, 4).map((a) => a.especie).join(', ')}
          </span>
        </div>
      )}

      {draft.biopreparados?.length > 0 && (
        <div className="text-xs text-sky-200/90 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="font-bold inline-flex items-center gap-1">
            <FlaskConical size={12} className="text-sky-400" /> Plan típico:
          </span>
          <ul className="mt-1 ml-4 list-disc text-2xs text-slate-300 space-y-0.5">
            {draft.biopreparados.slice(0, 4).map((b, bi) => (
              <li key={bi}>
                <span className="text-slate-200">{b.nombre}</span>
                {b.uso && <span className="text-slate-400"> — {b.uso}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invasora */}
      {draft.invasive && (
        <div className="bg-red-900/30 border border-red-800/60 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="font-bold">Especie marcada como invasora en el catálogo.</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2 sticky bottom-0 bg-slate-950 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X size={18} /> Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!allValid || isSaving}
          className="flex-1 px-4 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-700"
        >
          <Check size={18} /> {isSaving ? 'Guardando…' : (() => {
            const label = (() => {
              if (draft.process_type === 'harvest') return 'Confirmar cosecha';
              if (draft.process_type === 'post_harvest') return 'Confirmar post-cosecha';
              if (draft.process_type === 'pest_management') return 'Confirmar manejo de plagas';
              if (draft.process_type === 'restoration') return 'Confirmar reforestación';
              if (draft.process_type === 'silvopasture') return 'Confirmar silvopastoreo';
              return 'Confirmar siembra';
            })();
            return `${label} (${quantity} ${unit})`;
          })()}
        </button>
      </div>
    </div>
  );
}

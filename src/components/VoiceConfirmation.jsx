import React, { useMemo, useState } from 'react';
import { Check, X, Trash2, AlertTriangle } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { FARM_CONFIG } from '../config/defaults';

/**
 * VoiceConfirmation — pantalla obligatoria de revisión humana del array de
 * entidades extraídas. Nada se persiste en pending_transactions sin paso por
 * este componente (ARCHITECTURE_VOICE_0.5.0.md §5).
 *
 * Props:
 *   - transcription: string (solo lectura)
 *   - initialEntities: Array<{crop, quantity, location}>
 *   - onConfirm(entitiesWithResolvedLocation[]): Promise<void>
 *   - onCancel(): void
 *   - isSaving: boolean
 */
export default function VoiceConfirmation({
  transcription,
  initialEntities,
  onConfirm,
  onCancel,
  isSaving = false,
}) {
  const structures = useAssetStore((s) => s.structures);
  const lands = useAssetStore((s) => s.lands);

  const locationOptions = useMemo(() => {
    const opts = [];
    structures.forEach((a) => opts.push({
      id: a.id,
      type: 'asset--structure',
      name: a.attributes?.name || '(sin nombre)',
      label: `🏠 ${a.attributes?.name || '(sin nombre)'}`,
    }));
    lands.forEach((a) => opts.push({
      id: a.id,
      type: 'asset--land',
      name: a.attributes?.name || '(sin nombre)',
      label: `🌾 ${a.attributes?.name || '(sin nombre)'}`,
    }));
    return opts;
  }, [structures, lands]);

  const resolveDefault = (rawLocation) => {
    const q = (rawLocation || '').toLowerCase().trim();
    if (q) {
      const match = locationOptions.find((o) => o.name.toLowerCase().includes(q));
      if (match) return { id: match.id, type: match.type };
    }
    if (FARM_CONFIG.LOCATION_ID) {
      return { id: FARM_CONFIG.LOCATION_ID, type: 'asset--land' };
    }
    return null;
  };

  const [rows, setRows] = useState(() =>
    (initialEntities || []).map((e) => {
      const resolved = resolveDefault(e.location);
      return {
        crop: e.crop || '',
        quantity: e.quantity || 1,
        rawLocation: e.location || '',
        locationId: resolved?.id || '',
        locationType: resolved?.type || 'asset--land',
      };
    })
  );

  const updateRow = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const allValid = rows.length > 0 && rows.every(
    (r) => r.crop.trim().length > 0 && Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0 && r.locationId
  );

  const handleConfirm = () => {
    if (!allValid || isSaving) return;
    const payload = rows.map((r) => ({
      crop: r.crop.trim().toLowerCase(),
      quantity: Math.floor(Number(r.quantity)),
      location: { id: r.locationId, type: r.locationType },
      rawLocation: r.rawLocation,
    }));
    onConfirm(payload);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <p className="text-2xs uppercase font-bold text-slate-500 mb-1">Transcripción</p>
        <p className="text-sm text-slate-200 italic">"{transcription}"</p>
      </section>

      {rows.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            No se extrajo ninguna entidad. Cancela y repite el registro con una frase más clara.
          </p>
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs uppercase font-bold text-slate-500">Entrada {i + 1}</span>
            <button
              onClick={() => removeRow(i)}
              className="text-slate-500 hover:text-red-400 p-1"
              aria-label={`Eliminar entrada ${i + 1}`}
              disabled={isSaving}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-2xs font-bold text-slate-400 uppercase">Cultivo</span>
            <input
              type="text"
              value={row.crop}
              onChange={(e) => updateRow(i, { crop: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
              disabled={isSaving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-2xs font-bold text-slate-400 uppercase">Cantidad</span>
            <input
              type="number"
              min="1"
              step="1"
              value={row.quantity}
              onChange={(e) => updateRow(i, { quantity: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
              disabled={isSaving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-2xs font-bold text-slate-400 uppercase">
              Ubicación {row.rawLocation && <span className="text-slate-500 normal-case font-normal">(dijo: "{row.rawLocation}")</span>}
            </span>
            <select
              value={row.locationId ? `${row.locationType}|${row.locationId}` : ''}
              onChange={(e) => {
                const [t, id] = e.target.value.split('|');
                updateRow(i, { locationId: id, locationType: t });
              }}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
              disabled={isSaving}
            >
              <option value="">Seleccionar…</option>
              {locationOptions.map((o) => (
                <option key={`${o.type}|${o.id}`} value={`${o.type}|${o.id}`}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}

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
          <Check size={18} /> {isSaving ? 'Guardando…' : `Guardar (${rows.length})`}
        </button>
      </div>
    </div>
  );
}

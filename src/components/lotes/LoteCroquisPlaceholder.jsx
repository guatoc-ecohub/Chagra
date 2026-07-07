import React, { useEffect } from 'react';
import { MapPin, Pentagon, Plus } from 'lucide-react';
import useLoteStore from '../../store/useLoteStore';
import { summarizeLote, LAND_TYPES } from '../../services/loteService';

/**
 * LoteCroquisPlaceholder — PLACEHOLDER MÍNIMO del croquis de lotes.
 *
 * ⚠️ Fable REEMPLAZA este componente por el canvas de dibujo real (Leaflet +
 * herramienta de polígono/punto). Aquí solo cableamos la CAPA DE DATOS
 * (useLoteStore + loteService) para que la vista quede lista para pintar:
 *
 *   - `lotes`            → lista reactiva de lotes (espejo de useAssetStore.lands)
 *   - `setDrawMode()`    → arranca el modo dibujo ('polygon' | 'point')
 *   - `addDraftVertex()` → el canvas empuja vértices aquí
 *   - `saveDraftAsLote()`→ persiste el trazo como asset--land (offline-first)
 *   - `summarizeLote()`  → área/centroide/cultivos para la ficha de cada lote
 *
 * NO es la UI final: es el andamiaje de datos. Ver services/loteService.js.
 */
export default function LoteCroquisPlaceholder() {
  const lotes = useLoteStore((s) => s.lotes);
  const drawMode = useLoteStore((s) => s.drawMode);
  const hydrate = useLoteStore((s) => s.hydrate);
  const setDrawMode = useLoteStore((s) => s.setDrawMode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="p-4 flex flex-col gap-4 text-slate-100">
      <div className="rounded-xl border border-dashed border-amber-600/60 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-300 font-semibold flex items-center gap-2">
          <Pentagon size={16} aria-hidden="true" /> Aquí va el canvas de dibujo (lo pinta Fable)
        </p>
        <p className="text-xs text-amber-200/70 mt-1">
          Placeholder de datos: el modelo, el CRUD y la geometría ya están listos
          en <code>loteService</code> / <code>useLoteStore</code>.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() => setDrawMode('polygon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${drawMode === 'polygon' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Dibujar lote (polígono)
          </button>
          <button
            type="button"
            onClick={() => setDrawMode('point')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${drawMode === 'point' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Marcar punto
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MapPin size={18} aria-hidden="true" /> Mis lotes ({lotes.length})
        </h3>
      </div>

      {lotes.length === 0 ? (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Plus size={14} aria-hidden="true" /> Aún no has dibujado lotes. Usa el canvas para empezar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lotes.map((lote) => {
            const s = summarizeLote(lote, { plants: [], animals: [] });
            const typeLabel = LAND_TYPES.find((t) => t.value === s.landType)?.label || s.landType;
            return (
              <li key={lote.id} className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {typeLabel}
                  {s.hasGeometry && s.areaM2 > 0 && ` · ${s.areaM2.toFixed(0)} m² (${s.areaHa.toFixed(3)} ha)`}
                  {!s.hasGeometry && ' · sin geometría'}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

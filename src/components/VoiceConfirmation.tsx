import React, { useMemo, useState } from 'react';
import { Check, X, Trash2, AlertTriangle, Wand2 } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { FARM_CONFIG } from '../config/defaults';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { bestFuzzyMatch, similarity } from '../utils/entityMatcher';
import type { ExtractedAgriEntity } from '../services/entityExtractor';
import type { TaxonomyTerm } from '../types/asset';
import type { ConfirmedEntity } from './VoiceCapture';

interface LocationOption {
  id: string;
  type: string;
  name: string;
  label: string;
}

interface CropSpeciesFlat {
  id: string;
  name: string;
  commonName: string;
  group: string;
  groupKey: string;
}

interface RowState {
  crop: string;
  cropOriginal: string;
  cropCanonical: string | null;
  cropSlug: string | null;
  farmosTermId: string | null;
  cropScore: number | null;
  cropGroup: string | null;
  quantity: number | string;
  rawLocation: string;
  locationId: string;
  locationType: string;
  locationMatchedName: string | null;
  locationScore: number | null;
}

interface VoiceConfirmationProps {
  transcription: string;
  initialEntities: ExtractedAgriEntity[];
  onConfirm: (entities: ConfirmedEntity[]) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function VoiceConfirmation({
  transcription,
  initialEntities,
  onConfirm,
  onCancel,
  isSaving = false,
}: VoiceConfirmationProps) {
  type EnrichedAsset = { id: string; attributes?: { name?: string }; [key: string]: unknown };

  const structuresRaw = useAssetStore((s) => s.structures);
  const landsRaw = useAssetStore((s) => s.lands);
  const taxonomyTerms = useAssetStore((s) => s.taxonomyTerms) as TaxonomyTerm[];

  const structures = structuresRaw as unknown as EnrichedAsset[];
  const lands = landsRaw as unknown as EnrichedAsset[];

  const locationOptions = useMemo((): LocationOption[] => {
    const opts: LocationOption[] = [];
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

  const allCropSpecies = useMemo((): CropSpeciesFlat[] => {
    const all: CropSpeciesFlat[] = [];
    Object.entries(CROP_TAXONOMY).forEach(([groupKey, group]) => {
      group.species.forEach((sp) => {
        const commonName = (sp.name.split('(')[0] ?? sp.name).trim();
        all.push({ ...sp, commonName, group: group.label, groupKey });
      });
    });
    return all;
  }, []);

  const farmosPlantTypes = useMemo(
    () => (taxonomyTerms || []).filter((t) => t.type === 'taxonomy_term--plant_type'),
    [taxonomyTerms]
  );

  const resolveLocation = (rawLocation: string) => {
    const hit = bestFuzzyMatch(rawLocation, locationOptions, (o) => o.name, 0.65);
    if (hit) return { id: hit.match.id, type: hit.match.type, matchedName: hit.match.name, score: hit.score };
    if (FARM_CONFIG.LOCATION_ID) {
      return { id: FARM_CONFIG.LOCATION_ID, type: 'asset--land', matchedName: null, score: null };
    }
    return null;
  };

  const resolveCrop = (rawCrop: string) => {
    const hit = bestFuzzyMatch(rawCrop, allCropSpecies, (s) => s.commonName, 0.7);
    if (!hit) {
      return { crop: rawCrop, canonical: null, cropSlug: null, farmosTermId: null, score: null, group: null };
    }
    const farmosMatch = farmosPlantTypes.find(
      (t) => similarity(t.name || '', hit.match.commonName) > 0.85
    );
    return {
      crop: hit.match.commonName,
      canonical: hit.match.name,
      cropSlug: hit.match.id,
      farmosTermId: farmosMatch?.id || null,
      score: hit.score,
      group: hit.match.group,
    };
  };

  const [rows, setRows] = useState<RowState[]>(() =>
    (initialEntities || []).map((e) => {
      const resolvedLoc = resolveLocation(e.location);
      const resolvedCrop = resolveCrop(e.crop || '');
      return {
        crop: resolvedCrop.crop,
        cropOriginal: e.crop || '',
        cropCanonical: resolvedCrop.canonical,
        cropSlug: resolvedCrop.cropSlug,
        farmosTermId: resolvedCrop.farmosTermId,
        cropScore: resolvedCrop.score,
        cropGroup: resolvedCrop.group,
        quantity: e.quantity || 1,
        rawLocation: e.location || '',
        locationId: resolvedLoc?.id || '',
        locationType: resolvedLoc?.type || 'asset--land',
        locationMatchedName: resolvedLoc?.matchedName || null,
        locationScore: resolvedLoc?.score || null,
      };
    })
  );

  const updateRow = (i: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const allValid = rows.length > 0 && rows.every(
    (r) => String(r.crop).trim().length > 0 && Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0 && r.locationId
  );

  const handleConfirm = () => {
    if (!allValid || isSaving) return;
    const payload: ConfirmedEntity[] = rows.map((r) => ({
      crop: (r.crop || '').trim(),
      canonical: r.cropCanonical || r.crop,
      cropSlug: r.cropSlug || null,
      farmosTermId: r.farmosTermId || null,
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
            <span className="text-2xs font-bold text-slate-400 uppercase flex items-center gap-1 flex-wrap">
              Cultivo
              {row.cropScore != null && (
                <span className="normal-case font-normal text-lime-400/70 inline-flex items-center gap-1">
                  <Wand2 size={10} /> match {Math.round(row.cropScore * 100)}%
                </span>
              )}
              {row.farmosTermId && (
                <span className="normal-case font-normal text-emerald-400/70 text-2xs">
                  · taxonomy ✓
                </span>
              )}
            </span>
            <input
              type="text"
              value={row.crop}
              onChange={(e) => updateRow(i, {
                crop: e.target.value,
                cropCanonical: null, cropSlug: null, farmosTermId: null,
                cropScore: null, cropGroup: null,
              })}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-lime-500 focus:outline-none"
              disabled={isSaving}
            />
            {row.cropCanonical && (
              <span className="text-2xs text-lime-300/80 normal-case font-normal">
                {row.cropCanonical}{row.cropGroup ? ` · ${row.cropGroup}` : ''}
              </span>
            )}
            {row.cropOriginal && row.cropOriginal.toLowerCase() !== row.crop.toLowerCase() && (
              <span className="text-2xs text-slate-500 normal-case font-normal">
                Dijo: "{row.cropOriginal}" → mapeado a especie conocida.
              </span>
            )}
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
            <span className="text-2xs font-bold text-slate-400 uppercase flex items-center gap-1 flex-wrap">
              Ubicación
              {row.rawLocation && (
                <span className="text-slate-500 normal-case font-normal">(dijo: "{row.rawLocation}")</span>
              )}
              {row.locationScore != null && row.locationMatchedName && (
                <span className="normal-case font-normal text-lime-400/70 inline-flex items-center gap-1">
                  <Wand2 size={10} /> → {row.locationMatchedName} ({Math.round(row.locationScore * 100)}%)
                </span>
              )}
            </span>
            <select
              value={row.locationId ? `${row.locationType}|${row.locationId}` : ''}
              onChange={(e) => {
                const [t, id] = e.target.value.split('|') as [string, string];
                updateRow(i, { locationId: id, locationType: t, locationScore: null, locationMatchedName: null });
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

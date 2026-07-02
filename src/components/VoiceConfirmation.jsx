import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, Trash2, AlertTriangle, Wand2, Sprout, FlaskConical, Ban } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { FARM_CONFIG } from '../config/defaults';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';
import { bestFuzzyMatch, similarity } from '../utils/entityMatcher';
import GuildSuggestions from './GuildSuggestions';
import { MSG } from '../config/messages.js';

/**
 * VoiceConfirmation, pantalla obligatoria de revisión humana del array de
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
  const taxonomyTerms = useAssetStore((s) => s.taxonomyTerms);

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

  // Catalogo local de especies: fuente unica de verdad (CROP_TAXONOMY) +
  // cross-reference con taxonomy_term--plant_type de FarmOS para obtener UUID.
  const allCropSpecies = useMemo(() => {
    const all = [];
    Object.entries(CROP_TAXONOMY).forEach(([groupKey, group]) => {
      group.species.forEach((sp) => {
        // sp.name viene como "Arandano (Vaccinium corymbosum)", separamos
        // el nombre comun del cientifico para mejorar el match.
        const commonName = sp.name.split('(')[0].trim();
        all.push({ ...sp, commonName, group: group.label, groupKey });
      });
    });
    return all;
  }, []);

  const farmosPlantTypes = useMemo(
    () => (taxonomyTerms || []).filter((t) => t.type === 'taxonomy_term--plant_type'),
    [taxonomyTerms]
  );

  // Resuelve ubicacion via fuzzy match (tolerante a "invernadero 1" vs "invernadero").
  const resolveLocation = (rawLocation) => {
    const hit = bestFuzzyMatch(rawLocation, locationOptions, (o) => o.name, 0.65);
    if (hit) return { id: hit.match.id, type: hit.match.type, matchedName: hit.match.name, score: hit.score };
    if (FARM_CONFIG.LOCATION_ID) {
      return { id: FARM_CONFIG.LOCATION_ID, type: 'asset--land', matchedName: null, score: null };
    }
    return null;
  };

  // Resuelve cultivo en dos pasos:
  //   1. fuzzy match contra CROP_TAXONOMY local (siempre disponible).
  //   2. cross-reference del nombre canonico con taxonomyTerms de FarmOS
  //      para obtener el UUID que se usa en plant_type relationship.
  const resolveCrop = (rawCrop) => {
    const hit = bestFuzzyMatch(rawCrop, allCropSpecies, (s) => s.commonName, 0.7);
    if (!hit) {
      return {
        crop: rawCrop, canonical: null, cropSlug: null,
        farmosTermId: null, score: null, group: null,
      };
    }
    const farmosMatch = farmosPlantTypes.find(
      (t) => similarity(t.attributes?.name || '', hit.match.commonName) > 0.85
    );
    return {
      crop: hit.match.commonName,             // "Arandano"
      canonical: hit.match.name,              // "Arandano (Vaccinium corymbosum)"
      cropSlug: hit.match.id,                 // "vaccinium_corymbosum"
      farmosTermId: farmosMatch?.id || null,  // UUID de FarmOS si existe
      score: hit.score,
      group: hit.match.group,                 // "Frutales y Perennes"
    };
  };

  // Build inicial de rows: resuelve cultivo + ubicacion contra catalogos.
  // 2026-05-19 bug operador: si useAssetStore aun estaba hidratando IndexedDB
  // cuando este componente monta, locationOptions=[] y resolveLocation()
  // siempre devolvia null -> locationId='' -> allValid=false -> boton Guardar
  // disabled -> operador percibe "form vacio sin info". Fix: useEffect que
  // recompute rows cuando los stores cargan, preservando ediciones del usuario.
  const buildRows = (entities) => (entities || []).map((e) => {
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
      ragInsights: e._ragInsights || null,
    };
  });

  const [rows, setRows] = useState(() => buildRows(initialEntities));

  // Flag de "el usuario empezo a editar" para no pisar ediciones cuando los
  // stores async terminan de hidratar. Si dirty=true, mantenemos las rows
  // actuales aunque locationOptions cambie. Si dirty=false (acaba de
  // entrar a STATE_REVIEW), recomputamos en caso de stores recien hidratados.
  const dirtyRef = useRef(false);
  const storesReady = locationOptions.length > 0 && allCropSpecies.length > 0;
  const lastEntitiesRef = useRef(initialEntities);
  useEffect(() => {
    // Cambio de initialEntities (nueva extraccion) -> reset dirty + rebuild.
    if (initialEntities !== lastEntitiesRef.current) {
      lastEntitiesRef.current = initialEntities;
      dirtyRef.current = false;
      setRows(buildRows(initialEntities));
      return;
    }
    // Mismo initialEntities pero stores acaban de cargar -> re-resolver
    // ubicacion y cultivo si el usuario aun no edito.
    if (!dirtyRef.current && storesReady) {
      setRows(buildRows(initialEntities));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntities, storesReady]);

  const updateRow = (i, patch) => {
    dirtyRef.current = true;
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRow = (i) => {
    dirtyRef.current = true;
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Agrega una nueva fila a partir de un "compañero sugerido" (capas de
  // GuildSuggestions). Resuelve la especie contra CROP_TAXONOMY para
  // obtener canonical/slug/termId y hereda la ubicacion de la fila origen
  // para que el operario no tenga que volver a seleccionarla.
  const addCompanionRow = (companionName, sourceIdx) => {
    const source = rows[sourceIdx] || {};
    const resolved = resolveCrop(companionName);
    setRows((prev) => [
      ...prev,
      {
        crop: resolved.crop || companionName,
        cropOriginal: companionName,
        cropCanonical: resolved.canonical,
        cropSlug: resolved.cropSlug,
        farmosTermId: resolved.farmosTermId,
        cropScore: resolved.score,
        cropGroup: resolved.group,
        quantity: 1,
        rawLocation: source.rawLocation || '',
        locationId: source.locationId || '',
        locationType: source.locationType || 'asset--land',
        locationMatchedName: source.locationMatchedName || null,
        locationScore: source.locationScore || null,
        // Rows agregadas por sugerencia de compañeros no traen pre-fetch
        // del RAG; la pantalla solo muestra ragInsights para las extraídas
        // por el LLM. Si en el futuro se requiere, se puede invocar
        // enrichEntity(name) on-demand aquí.
        ragInsights: null,
      },
    ]);
  };

  const allValid = rows.length > 0 && rows.every(
    (r) => r.crop.trim().length > 0 && Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0 && r.locationId
  );

  // ADR-030: total real de assets que se crearán (rows aggregate=1, individual=qty).
  // Default 'individual' si species fuera del catálogo (conservativo).
  const totalAssetsToCreate = useMemo(() => rows.reduce((acc, r) => {
    const qty = parseInt(r.quantity, 10) || 1;
    const defaults = r.cropSlug ? resolveSpeciesDefaults(r.cropSlug) : null;
    const trackingMode = defaults?.tracking_mode || 'individual';
    return acc + (trackingMode === 'individual' ? qty : 1);
  }, 0), [rows]);

  const handleConfirm = () => {
    if (!allValid || isSaving) return;
    const payload = rows.map((r) => ({
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
        <p className="text-2xs uppercase font-bold text-slate-500 mb-1">{MSG.voz.transcripcion}</p>
        <p className="text-sm text-slate-200 italic">"{transcription}"</p>
      </section>

      {rows.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200 space-y-2">
              <p className="font-bold">No alcancé a identificar el cultivo o la cantidad en tu audio.</p>
              <p className="text-amber-200/80">
                Revisa la transcripción arriba. Si Chagra escuchó bien pero el cultivo es una variedad nueva o regional (ej. una cepa específica, una variedad local), todavía no la tengo en mi catálogo.
              </p>
              <p className="text-amber-200/80">{MSG.voz.opciones}</p>
              <ul className="list-disc pl-5 space-y-1 text-amber-200/80">
                <li><strong>{MSG.voz.opcionManual}</strong>: {MSG.voz.opcionManualDesc}</li>
                <li><strong>{MSG.voz.opcionRegrabar}</strong>: {MSG.voz.opcionRegrabarDesc}</li>
                <li><strong>{MSG.action.cancelar}</strong>: {MSG.voz.opcionCancelarDesc}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs uppercase font-bold text-slate-500">Entrada {i + 1}</span>
            <button
              onClick={() => removeRow(i)}
              className="text-slate-500 hover:text-red-400 p-1"
              aria-label={MSG.format(MSG.voz.eliminarEntrada, { index: i + 1 })}
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
              {row.rawLocation && <span className="text-slate-500 normal-case font-normal">(dijo: "{row.rawLocation}")</span>}
              {row.locationScore != null && row.locationMatchedName && (
                <span className="normal-case font-normal text-lime-400/70 inline-flex items-center gap-1">
                  <Wand2 size={10} /> → {row.locationMatchedName} ({Math.round(row.locationScore * 100)}%)
                </span>
              )}
            </span>
            <select
              value={row.locationId ? `${row.locationType}|${row.locationId}` : ''}
              onChange={(e) => {
                const [t, id] = e.target.value.split('|');
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

          {/* ADR-030: Preview de qué se creará según tracking_mode */}
          {(() => {
            const qty = parseInt(row.quantity, 10) || 1;
            const defaults = row.cropSlug ? resolveSpeciesDefaults(row.cropSlug) : null;
            const trackingMode = defaults?.tracking_mode || 'individual';
            const isIndividualMulti = trackingMode === 'individual' && qty > 1;
            const previewText = isIndividualMulti
              ? `Se crearán ${qty} activos individuales, cada planta con su propia hoja de vida, foto y cosechas separadas.`
              : trackingMode === 'aggregate' && qty > 1
                ? `Se creará 1 activo agregado con cantidad=${qty} (cama corrida, cosecha y eventos al conjunto).`
                : `Se creará 1 activo de ${row.crop || 'esta especie'}.`;
            return (
              <div className={`mt-2 px-2 py-1.5 rounded text-2xs ${isIndividualMulti
                  ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-300'
                  : trackingMode === 'aggregate' && qty > 1
                    ? 'bg-amber-900/20 border border-amber-800/40 text-amber-200'
                    : 'bg-slate-800/40 border border-slate-700/40 text-slate-400'
                }`}>
                {previewText}
              </div>
            );
          })()}

          {/* Insights RAG post-extracción (audit 2026-05-18). Renderiza
              companions/antagonists/biopreparados/warnings extraídos del
              corpus en public/cycle-content/ vía voiceRagEnricher. Si
              ragInsights es null (RAG cold, sin hits, o sección sin datos),
              esta sección no se muestra — degrade gracefully. */}
          {row.ragInsights && (
            <div className="mt-2 pt-3 border-t border-slate-800 flex flex-col gap-2">
              <p className="text-2xs uppercase font-bold text-slate-500 flex items-center gap-1">
                <Sprout size={11} className="text-emerald-400" />
                Catálogo dice
                {row.ragInsights.sourceSlug && (
                  <span className="normal-case font-mono text-slate-600 text-2xs">
                    · {row.ragInsights.sourceSlug}
                  </span>
                )}
              </p>

              {row.ragInsights.invasive && (
                <div className="bg-red-900/30 border border-red-800/60 rounded-lg p-2 text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Especie marcada invasora</p>
                    {row.ragInsights.warnings.map((w, wi) => (
                      <p key={wi} className="text-2xs mt-0.5 text-red-300/90">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {row.ragInsights.companions.length > 0 && (
                <div className="text-xs text-emerald-200/90">
                  <span className="font-bold inline-flex items-center gap-1">
                    <Sprout size={12} className="text-emerald-400" /> Va bien con:
                  </span>{' '}
                  <span className="text-slate-300">
                    {row.ragInsights.companions.slice(0, 4).map((c) => c.especie).join(', ')}
                  </span>
                </div>
              )}

              {row.ragInsights.antagonists.length > 0 && (
                <div className="text-xs text-amber-200/90">
                  <span className="font-bold inline-flex items-center gap-1">
                    <Ban size={12} className="text-amber-400" /> Evitar junto a:
                  </span>{' '}
                  <span className="text-slate-300">
                    {row.ragInsights.antagonists.slice(0, 4).map((a) => a.especie).join(', ')}
                  </span>
                </div>
              )}

              {row.ragInsights.biopreparados.length > 0 && (
                <div className="text-xs text-sky-200/90">
                  <span className="font-bold inline-flex items-center gap-1">
                    <FlaskConical size={12} className="text-sky-400" /> Plan típico:
                  </span>
                  <ul className="mt-1 ml-4 list-disc text-2xs text-slate-300 space-y-0.5">
                    {row.ragInsights.biopreparados.slice(0, 4).map((b, bi) => (
                      <li key={bi}>
                        <span className="text-slate-200">{b.nombre}</span>
                        {b.uso && <span className="text-slate-400"> — {b.uso}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Compañeros sugeridos (motor de gremios). Solo aparece cuando
              la especie matcheo contra CROP_TAXONOMY (cropSlug presente),
              igual que en el flujo manual de AssetsDashboard. Al clicar un
              compañero se agrega una nueva entrada al array de rows con
              la misma ubicacion heredada, siembra rapida de policultivo. */}
          {row.cropSlug && (
            <div className="mt-2 pt-3 border-t border-slate-800">
              <GuildSuggestions
                speciesId={row.cropSlug}
                onSelectCompanion={(name) => addCompanionRow(name, i)}
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2 sticky bottom-0 bg-slate-950 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X size={18} /> {MSG.action.cancelar}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!allValid || isSaving}
          className="flex-1 px-4 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-700"
        >
          <Check size={18} /> {isSaving ? MSG.ui.guardando : MSG.ui.guardarPlantas(totalAssetsToCreate)}
        </button>
      </div>
    </div>
  );
}

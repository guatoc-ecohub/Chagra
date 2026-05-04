import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Tag, Activity, MapPin, AlertCircle, Images, Skull } from 'lucide-react';
import PlantCemeteryModal from './PlantCemeteryModal';
import useAssetStore from '../store/useAssetStore';
import AssetTimeline from './AssetTimeline';
import { InputLogForm } from './InputLogForm';
import MapPicker from './MapPicker';
import { useAssetPerformance } from '../hooks/useAssetPerformance';
import { MATERIAL_CATEGORIES } from '../config/materials';
import { FARM_CONFIG } from '../config/defaults';
import { geoJsonToWkt, wktToGeoJson } from '../utils/geo';
import { proximityCheck, findNearestLand, checkInvasiveProximity, getCoords } from '../utils/spatialAnalysis';
import { ExternalAiButton } from './common/ExternalAiButton';
import { buildOpenExternalPrompt } from '../services/externalAiPromptBuilder';
import { listUserPhotosBySpecies } from '../services/photoService';

// Derive speciesSlug from asset name. Same pattern usado en SeedingLog.jsx
// (línea 91-95). Strips " #NNN" suffix de individual-multi (ADR-030).
function deriveSpeciesSlug(name) {
  if (!name || typeof name !== 'string') return null;
  return name.replace(/\s+#\d+$/, '').toLowerCase().replace(/\s+/g, '_').trim() || null;
}

// High-impact #4 (2026-05-03): galería cross-asset de fotos para esta especie.
// Solo del operador en su finca (NO cross-farm — decisión Miguel 2026-05-02).
function SpeciesPhotoGallery({ speciesSlug, currentAssetId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const urls = [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mismo patrón que usePhotoUrl: reset loading al cambiar speciesSlug + fetch async desde IndexedDB. Sin alternativa razonable salvo useReducer (overkill) o suspense (no aplica a IDB sync).
    setLoading(true);
    listUserPhotosBySpecies(speciesSlug).then((records) => {
      if (!alive) return;
      const enriched = records
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .map((rec) => {
          const url = URL.createObjectURL(rec.blob);
          urls.push(url);
          return { url, assetId: rec.assetId, createdAt: rec.createdAt };
        });
      setPhotos(enriched);
      setLoading(false);
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [speciesSlug]);

  if (loading) {
    return <p className="text-xs text-slate-500 italic">Cargando fotos…</p>;
  }
  if (photos.length === 0) {
    return (
      <p className="text-xs text-slate-500 leading-relaxed">
        Aún no hay otras fotos de esta especie en tu finca. Adjunta fotos a tus eventos de bitácora para construir un historial visual.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-2">
        {photos.length} foto{photos.length === 1 ? '' : 's'} de tu finca para esta especie.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg overflow-hidden border ${p.assetId === currentAssetId ? 'border-emerald-500' : 'border-slate-700'} bg-slate-800`}
            title={p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : ''}
          >
            <img
              src={p.url}
              alt={`Foto especie ${speciesSlug}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Panel de bio-eficiencia (Fase 15.3 / extendido 16.3).
const PerformancePanel = ({ assetId }) => {
  const {
    globalRatio,
    byCategory,
    totalHarvestWeight,
    totalInputWeight,
    hasData,
  } = useAssetPerformance(assetId);

  if (!hasData) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Métricas de Bio-eficiencia
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center border-r border-slate-800">
            <p className="text-2xl font-black text-white tabular-nums">{globalRatio}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Ratio Global</p>
          </div>
          <div className="text-center border-r border-slate-800">
            <p className="text-xl font-bold text-green-400 tabular-nums">{totalHarvestWeight}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1" title="Suma normalizada a kg/L base decimal">Cosecha (kg/L)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-400 tabular-nums">{totalInputWeight}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1" title="Suma normalizada a kg/L base decimal — desglose por categoría debajo">Insumos (kg/L)</p>
          </div>
        </div>
      </div>

      <CategoryBreakdown byCategory={byCategory} totalHarvestWeight={totalHarvestWeight} />

      <p className="text-[10px] text-slate-400 leading-tight italic">
        * Ratios normalizados a kg/l base decimal. La categoría "Biofábrica" agrupa materias
        primas internas y se excluye del ratio global.
      </p>
    </div>
  );
};

// Desglose por categoría agroecológica (Fase 16.3).
const CategoryBreakdown = ({ byCategory }) => {
  // Máximo total entre categorías no-biofabrica para escalar las barras.
  const maxTotal = Math.max(
    ...Object.entries(byCategory)
      .filter(([cat]) => cat !== 'biofabrica')
      .map(([, data]) => data.total),
    0.01
  );

  const visibleCategories = Object.entries(byCategory).filter(([, data]) => data.count > 0);
  if (visibleCategories.length === 0) return null;

  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        Desglose por Categoría
      </h4>
      <div className="space-y-2">
        {visibleCategories.map(([catId, data]) => {
          const meta = MATERIAL_CATEGORIES[catId];
          const pct = catId === 'biofabrica' ? 0 : Math.min((data.total / maxTotal) * 100, 100);
          return (
            <div key={catId} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: meta?.color || '#64748b' }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-slate-300 truncate">{meta?.label || catId}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] tabular-nums">
                  <span className="text-slate-500" title="Total normalizado a base decimal kg/L">
                    {data.total} <span className="text-slate-600">kg/L</span>
                  </span>
                  <span className="text-slate-200 font-bold">
                    {catId === 'biofabrica' ? '—' : `×${data.ratio}`}
                  </span>
                </div>
              </div>
              {catId !== 'biofabrica' && (
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: meta?.color || '#64748b' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * AssetDetailView — panel lateral de detalle de un activo (Fase 12.2).
 *
 * Consume `selectedAssetId` desde el store global. Busca el asset en las
 * cuatro colecciones segmentadas (plants/structures/equipment/materials)
 * y renderiza metadatos, formulario de insumo y línea de tiempo.
 *
 * Drawer full-height derecho, optimizado para operario en campo con móvil.
 */
export const AssetDetailView = () => {
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const plants = useAssetStore((s) => s.plants);
  const structures = useAssetStore((s) => s.structures);
  const equipment = useAssetStore((s) => s.equipment);
  const materials = useAssetStore((s) => s.materials);
  const lands = useAssetStore((s) => s.lands);
  const clearSelectedAsset = useAssetStore((s) => s.clearSelectedAsset);
  const updateAsset = useAssetStore((s) => s.updateAsset);

  const [showGeoPicker, setShowGeoPicker] = useState(false);
  const [geoSaving, setGeoSaving] = useState(false);
  const [showCemeteryModal, setShowCemeteryModal] = useState(false);

  // T4: useMemo para evitar recrear el spread de arrays en cada render
  const asset = useMemo(() => {
    if (!selectedAssetId) return null;
    return [...plants, ...structures, ...equipment, ...materials, ...lands].find(
      (a) => a.id === selectedAssetId
    );
  }, [selectedAssetId, plants, structures, equipment, materials, lands]);

  if (!selectedAssetId || !asset) return null;

  // Normalización de campos JSON:API vs shape optimista local
  const name = asset.attributes?.name || asset.name || 'Sin nombre';
  const notesRaw = asset.attributes?.notes;
  const notesText = typeof notesRaw === 'object' ? notesRaw?.value : notesRaw;
  const status = asset.attributes?.status || 'active';
  const createdTs = asset.attributes?.created || asset._createdAt
    ? (asset.attributes?.created
      ? new Date(asset.attributes.created * 1000)
      : new Date(asset._createdAt))
    : null;
  const assetTypeLabel = (() => {
    const t = asset.asset_type || asset.type || '';
    if (t.includes('plant')) return 'Cultivo';
    if (t.includes('structure')) return 'Infraestructura';
    if (t.includes('equipment')) return 'Herramienta';
    if (t.includes('material')) return 'Insumo';
    if (t.includes('land')) return 'Zona';
    return t || 'Activo';
  })();

  const isPlantType = (asset.asset_type || asset.type || '').includes('plant');

  // Geometría actual para pre-cargar en MapPicker
  const geoRaw = asset.attributes?.intrinsic_geometry;
  const geoWkt = typeof geoRaw === 'object' ? geoRaw?.value : geoRaw;
  const currentGeo = geoWkt ? wktToGeoJson(geoWkt) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={clearSelectedAsset}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900 sticky top-0 z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs font-bold rounded-full border border-green-700/50">
                {assetTypeLabel}
              </span>
              <span className="text-slate-500 text-xs font-mono truncate">
                ID: {asset.id?.split('-')[0]}
              </span>
              {asset._pending && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                  pendiente
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight truncate">
              {name}
            </h2>
            {notesText && (
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                <Tag size={14} className="shrink-0" />
                <span className="truncate">{notesText}</span>
              </p>
            )}
          </div>
          <button
            onClick={clearSelectedAsset}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Cerrar detalle"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scroll container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Metadatos rápidos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-500 flex items-center gap-1 mb-1 italic">
                <Calendar size={12} /> Fecha de registro
              </span>
              <p className="text-white font-medium">
                {createdTs ? createdTs.toLocaleDateString('es-CO') : 'No registrada'}
              </p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-500 flex items-center gap-1 mb-1 italic">
                <Activity size={12} /> Estado
              </span>
              <p className="text-white font-medium capitalize">{status}</p>
            </div>
          </div>

          {/* Geometría / Ubicación (Fase 19) */}
          <GeometrySection
            asset={asset}
            onEdit={() => setShowGeoPicker(true)}
            saving={geoSaving}
          />

          {/* Acción de campo: registro de insumo — solo aplica a plants */}
          {(asset.asset_type === 'plant' || asset.type?.includes('plant')) && (
            <>
              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">
                  Bio-eficiencia
                </h3>
                <PerformancePanel assetId={asset.id} />
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">
                  Acciones de Campo
                </h3>
                <InputLogForm assetId={asset.id} />
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Consultar IA externa
                </h3>
                <p className="text-xs text-slate-400 mb-3 px-1 leading-relaxed">
                  Genera un prompt con contexto de esta planta (especie, piso térmico, altitud) listo para pegar en Gemini, ChatGPT o Claude.
                </p>
                <ExternalAiButton
                  context={{
                    speciesName: name,
                    thermalZones: FARM_CONFIG.THERMAL_ZONES,
                    altitudMsnm: FARM_CONFIG.ALTITUD_MSNM,
                    municipio: FARM_CONFIG.MUNICIPIO,
                  }}
                  buildPrompt={buildOpenExternalPrompt}
                  label="Copiar prompt para IA externa"
                />
              </section>

              {/* Cementerio — fracaso como currículo (memoria
                  project_chagra_educational_dimension). Solo si planta NO está
                  ya marcada como muerta. */}
              {status !== 'dead' && (
                <section>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                    <Skull size={14} /> Cementerio
                  </h3>
                  <p className="text-xs text-slate-400 mb-3 px-1 leading-relaxed">
                    Si esta planta murió, márcala aquí. La perdida es dato — capturás la razón y queda como lección para tu próxima siembra.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCemeteryModal(true)}
                    className="text-xs px-3 py-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Skull size={12} /> Marcar como muerta
                  </button>
                </section>
              )}

              {/* High-impact #4: galería cross-asset de fotos de la misma especie */}
              {deriveSpeciesSlug(name) && (
                <section>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                    <Images size={14} /> Galería de la especie
                  </h3>
                  <SpeciesPhotoGallery
                    speciesSlug={deriveSpeciesSlug(name)}
                    currentAssetId={asset.id}
                  />
                </section>
              )}
            </>
          )}

          {/* Acciones para Zona/Land */}
          {(asset.asset_type === 'land' || asset.type?.includes('land')) && (
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">
                Gestión de Zona
              </h3>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', {
                  detail: {
                    view: 'reportar_invasora',
                    initialData: { locationId: asset.id, wkt: geoWkt }
                  }
                }))}
                className="w-full p-6 rounded-xl bg-amber-600/20 border border-amber-600/40 text-amber-400 font-bold flex items-center justify-center gap-3 active:bg-amber-600/30 transition-colors shadow-lg"
              >
                <AlertCircle size={24} />
                <span>Reportar invasora aquí</span>
              </button>
            </section>
          )}

          {/* Historial / timeline */}
          <section className="pb-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">
              Historial de Trazabilidad
            </h3>
            <AssetTimeline assetId={asset.id} />
          </section>
        </div>
      </div>

      {/* Map picker para edición de geometría */}
      {showGeoPicker && (
        <MapPicker
          mode={isPlantType ? 'point' : 'polygon'}
          initial={currentGeo}
          onCancel={() => setShowGeoPicker(false)}
          onSave={async (geometry) => {
            setShowGeoPicker(false);
            setGeoSaving(true);
            try {
              // Proximity check via GPS
              if (navigator.geolocation) {
                try {
                  const gpsPos = await new Promise((res, rej) =>
                    navigator.geolocation.getCurrentPosition(res, rej, {
                      enableHighAccuracy: true,
                      timeout: 15000,
                      maximumAge: 30000
                    })
                  );
                  const { distance, isClose } = proximityCheck(gpsPos, geometry);
                  if (!isClose) {
                    const confirm = window.confirm(
                      `Ubicación fuera de rango (${distance}m del dispositivo). ¿Confirmas registro remoto?`
                    );
                    if (!confirm) { setGeoSaving(false); return; }
                  }
                } catch (gpsErr) {
                  console.warn('[Geo] GPS no disponible para proximity check:', gpsErr.message);
                }
              }

              // Alerta de invasoras
              const coords = getCoords(geometry);
              if (coords) {
                const invasiveAlerts = checkInvasiveProximity(coords, plants);
                if (invasiveAlerts.length > 0) {
                  const names = invasiveAlerts.map((a) => a.asset.attributes?.name || a.asset.name).join(', ');
                  window.alert(`⚠ Posible rebrote de especie invasora detectado a menos de 10m: ${names}`);
                }
              }

              const wkt = geoJsonToWkt(geometry);
              const updatedAsset = {
                ...asset,
                attributes: {
                  ...asset.attributes,
                  intrinsic_geometry: { value: wkt },
                },
              };

              // Auto-fix de zona: si el asset no tiene parent, sugerir la más cercana
              const assetType = resolveAssetType(asset);
              const hasParent = asset.relationships?.parent?.data?.length > 0 || asset.relationships?.location?.data?.length > 0;
              if (!hasParent && coords) {
                const nearest = findNearestLand(wkt, lands);
                if (nearest && nearest.distance < 200) {
                  const zName = nearest.land.attributes?.name || nearest.land.name;
                  const confirmLink = window.confirm(
                    `Este activo no tiene zona asignada. ¿Vincularlo a "${zName}" (${nearest.distance}m)?`
                  );
                  if (confirmLink) {
                    updatedAsset.relationships = {
                      ...updatedAsset.relationships,
                      parent: { data: [{ type: 'asset--land', id: nearest.land.id }] },
                      location: { data: [{ type: 'asset--land', id: nearest.land.id }] },
                    };
                  }
                }
              }

              const pendingTx = {
                id: crypto.randomUUID(),
                type: `asset_${assetType}`,
                remoteId: asset.id,
                endpoint: `/api/asset/${assetType}/${asset.id}`,
                method: 'PATCH',
                payload: {
                  data: {
                    type: `asset--${assetType}`,
                    id: asset.id,
                    attributes: { intrinsic_geometry: { value: wkt } },
                  },
                },
              };
              await updateAsset(assetType, updatedAsset, [pendingTx]);
              window.dispatchEvent(new CustomEvent('syncComplete', {
                detail: { message: 'Geometría actualizada.' },
              }));
              console.info(`[Geo] Geometría de ${asset.id} actualizada a: ${wkt.slice(0, 40)}…`);
            } catch (err) {
              console.error('[Geo] Error al guardar geometría:', err);
              window.dispatchEvent(new CustomEvent('syncError', {
                detail: { message: 'No se pudo guardar la geometría.' },
              }));
            } finally {
              setGeoSaving(false);
            }
          }}
        />
      )}

      {/* Cementerio — workflow marcar planta muerta + capturar razón */}
      {showCemeteryModal && isPlantType && (
        <PlantCemeteryModal
          plantName={name}
          onClose={() => setShowCemeteryModal(false)}
          onConfirm={async (reason, freeText) => {
            const noteLines = [
              '[PLANT_LOST]',
              `reason: ${reason}`,
              `lost_at: ${new Date().toISOString()}`,
            ];
            if (freeText) {
              noteLines.push('', '--- Notas adicionales ---', freeText);
            }
            const updatedAsset = {
              ...asset,
              attributes: {
                ...asset.attributes,
                status: 'dead',
                notes: {
                  value: [
                    asset.attributes?.notes?.value || '',
                    asset.attributes?.notes?.value ? '\n' : '',
                    noteLines.join('\n'),
                  ].join(''),
                },
              },
            };
            const pendingTx = {
              id: crypto.randomUUID(),
              type: 'asset_plant',
              remoteId: asset.id,
              endpoint: `/api/asset/plant/${asset.id}`,
              method: 'PATCH',
              payload: {
                data: {
                  type: 'asset--plant',
                  id: asset.id,
                  attributes: {
                    status: 'dead',
                    notes: updatedAsset.attributes.notes,
                  },
                },
              },
            };
            await updateAsset('plant', updatedAsset, [pendingTx]);
            setShowCemeteryModal(false);
            window.dispatchEvent(new CustomEvent('chagraToast', {
              detail: { message: `${name} movida al cementerio. La lección queda para próxima siembra.` },
            }));
          }}
        />
      )}
    </div>
  );
};

// Subcomponente: sección de geometría con botón de edición.
const GeometrySection = ({ asset, onEdit, saving }) => {
  const geoRaw = asset.attributes?.intrinsic_geometry;
  const wkt = typeof geoRaw === 'object' ? geoRaw?.value : geoRaw;
  const hasGeo = !!wkt;

  // Preview legible del tipo de geometría
  let preview = 'Sin ubicación registrada';
  if (hasGeo) {
    if (wkt.startsWith('POINT')) {
      const match = wkt.match(/POINT\s*\(([\d.-]+)\s+([\d.-]+)\)/);
      if (match) preview = `Punto: ${Number(match[2]).toFixed(5)}°N, ${Number(match[1]).toFixed(5)}°W`;
    } else if (wkt.startsWith('POLYGON')) {
      const vertexCount = (wkt.match(/,/g) || []).length + 1;
      preview = `Polígono (${vertexCount} vértices)`;
    }
  }

  return (
    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs text-slate-500 flex items-center gap-1 mb-1 italic">
            <MapPin size={12} /> Ubicación
          </span>
          <p className="text-sm text-white font-medium truncate">{preview}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          disabled={saving}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 min-h-[40px]"
        >
          {saving ? (
            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full" />
          ) : (
            <MapPin size={14} />
          )}
          {hasGeo ? 'Corregir' : 'Definir'}
        </button>
      </div>
    </div>
  );
};

// Helpers locales del componente.
const resolveAssetType = (asset) => {
  const t = asset.asset_type || asset.type || '';
  if (t.includes('plant')) return 'plant';
  if (t.includes('structure')) return 'structure';
  if (t.includes('equipment')) return 'equipment';
  if (t.includes('material')) return 'material';
  if (t.includes('land')) return 'land';
  return 'plant';
};

export default AssetDetailView;

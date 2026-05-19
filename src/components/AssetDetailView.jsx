import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Tag, Activity, MapPin, AlertCircle, Images, Skull, Layers } from 'lucide-react';
import { SplitFlow } from './SplitFlow';
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
import { listUserPhotosBySpecies, captureAndCompress, savePhoto } from '../services/photoService';
import PlanEditor from './PlanEditor';
import { getAllSpecies } from '../db/catalogDB';

// Derive speciesSlug from asset name.
function deriveSpeciesSlug(name) {
  if (!name || typeof name !== 'string') return null;
  return name.replace(/\s+#\d+$/, '').toLowerCase().replace(/\s+/g, '_').trim() || null;
}

// Bug 2026-05-18: agregar foto a planta ya creada (post-registro).
// Dual options cámara + galería + savePhoto al assetId/speciesSlug.
function AddPhotoSection({ assetId, speciesSlug }) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const cameraRef = React.useRef(null);
  const galleryRef = React.useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setBusy(true);
    setSuccess(false);
    try {
      const { blob } = await captureAndCompress(file);
      await savePhoto({ blob, assetId, speciesSlug });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.warn('[AddPhotoSection] save failed:', err);
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        <Images size={12} /> Agregar foto a esta planta
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="p-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold disabled:opacity-50"
        >
          📷 Tomar foto
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
          className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-sm font-bold disabled:opacity-50"
        >
          🖼️ Elegir foto
        </button>
      </div>
      {busy && <p className="text-xs text-slate-400 italic">Procesando...</p>}
      {success && <p className="text-xs text-emerald-400">✓ Foto guardada para esta planta.</p>}
    </section>
  );
}

// Gallery of photos for the same species.
function SpeciesPhotoGallery({ speciesSlug, currentAssetId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const urls = [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (loading) return <p className="text-xs text-slate-500 italic">Cargando fotos…</p>;
  if (photos.length === 0) {
    return <p className="text-xs text-slate-500 italic leading-relaxed">No hay otras fotos de esta especie.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {photos.map((p, i) => (
        <div key={i} className={`aspect-square rounded-lg overflow-hidden border ${p.assetId === currentAssetId ? 'border-emerald-500' : 'border-slate-800'} bg-slate-800 shadow-inner`}>
          <img src={p.url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// Plan de alimentación section: monta PlanEditor cuando la especie tiene
// feeding_plan_template en el catálogo. Si la especie existe pero NO tiene
// template (species pre-pipeline o sin curaduría agronómica), muestra un
// placeholder pidiendo al equipo Chagra que agregue el plan. Audit finding
// 070.7 (2026-05-18): PlanEditor estaba orphan — la UI existía pero no se
// montaba en ninguna parte. Esta sección hace el wiring sin tocar la lógica
// interna de PlanEditor.
function PlanSection({ assetId, speciesSlug, plantingDate }) {
  // 'loading' | 'has_template' | 'no_template' | 'no_species'
  const [status, setStatus] = useState('loading');
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!speciesSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('no_species');
      return () => { alive = false; };
    }
    (async () => {
      try {
        const species = await getAllSpecies();
        if (!alive) return;
        const entry = species.find((s) => s.id === speciesSlug);
        if (!entry) {
          setStatus('no_species');
          return;
        }
        const hasTpl = !!(entry.feeding_plan_template && entry.feeding_plan_template.primary_steps?.length);
        setStatus(hasTpl ? 'has_template' : 'no_template');
      } catch (err) {
        console.warn('[PlanSection] No se pudo leer el catálogo:', err);
        if (alive) setStatus('no_template');
      }
    })();
    return () => { alive = false; };
  }, [speciesSlug]);

  if (status === 'loading') {
    return (
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
        <p className="text-xs text-slate-500 italic">Cargando plan de alimentación…</p>
      </section>
    );
  }

  if (status === 'no_species' || status === 'no_template') {
    return (
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan de Alimentación</h3>
        <p className="text-sm text-slate-300">Sin plan disponible para esta especie</p>
        <button
          type="button"
          disabled={requested}
          onClick={() => setRequested(true)}
          className="px-3 py-2 rounded-lg bg-amber-700/30 hover:bg-amber-700/50 active:scale-95 text-amber-200 border border-amber-700/40 text-xs font-bold disabled:opacity-60"
        >
          {requested ? 'Solicitud anotada' : 'Solicitar al equipo Chagra agregar plan'}
        </button>
        {requested && (
          <p className="text-[11px] text-slate-400 italic">
            Tu solicitud quedó registrada localmente. Pronto el equipo evaluará agregar el plan al catálogo.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-1">
      <PlanEditor
        assetId={assetId}
        speciesSlug={speciesSlug}
        plantingDate={plantingDate}
      />
    </section>
  );
}

// Bio-efficiency metrics panel.
const PerformancePanel = ({ assetId }) => {
  const { globalRatio, byCategory, totalHarvestWeight, totalInputWeight, hasData } = useAssetPerformance(assetId);
  if (!hasData) return null;
  return (
    <div className="bg-slate-900 border border-slate-800/50 rounded-2xl p-4 space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-black text-white">{globalRatio}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Ratio</p>
        </div>
        <div className="border-x border-slate-800/50">
          <p className="text-lg font-bold text-green-400">{totalHarvestWeight}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Cosecha</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-400">{totalInputWeight}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Insumos</p>
        </div>
      </div>
      <CategoryBreakdown byCategory={byCategory} />
    </div>
  );
};

const CategoryBreakdown = ({ byCategory }) => {
  const visible = Object.entries(byCategory).filter(([, d]) => d.count > 0);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {visible.map(([id, d]) => {
        const meta = MATERIAL_CATEGORIES[id];
        return (
          <div key={id} className="flex justify-between text-[11px]">
            <span className="text-slate-400">{meta?.label || id}</span>
            <span className="text-slate-200">×{d.ratio}</span>
          </div>
        );
      })}
    </div>
  );
};

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
  const [showSplitFlow, setShowSplitFlow] = useState(false);

  const asset = useMemo(() => {
    if (!selectedAssetId) return null;
    return [...plants, ...structures, ...equipment, ...materials, ...lands].find((a) => a.id === selectedAssetId);
  }, [selectedAssetId, plants, structures, equipment, materials, lands]);

  if (!selectedAssetId || !asset) return null;

  const name = asset.attributes?.name || asset.name || 'Sin nombre';
  const status = asset.attributes?.status || 'active';
  // Bug 2026-05-18 operator (cubio recién creado): asset.attributes.created
  // viene del server FarmOS post-sync. Para optimistic locales (recién creadas
  // aún no sincronizadas), fallback a asset._createdAt (timestamp local en ms
  // que AssetsDashboard setea con Date.now()). Si tampoco existe, usar 'hoy'.
  const createdTs = asset.attributes?.created
    ? new Date(asset.attributes.created * 1000)
    : asset._createdAt
      ? new Date(asset._createdAt)
      : (asset._pending ? new Date() : null);
  const isPlantType = (asset.asset_type || asset.type || '').includes('plant');
  const geoRaw = asset.attributes?.intrinsic_geometry;
  const geoWkt = typeof geoRaw === 'object' ? geoRaw?.value : geoRaw;
  const currentGeo = geoWkt ? wktToGeoJson(geoWkt) : null;

  const parentRefs = asset.relationships?.parent?.data || asset.relationships?.location?.data || [];
  const parentRef = Array.isArray(parentRefs) ? parentRefs[0] : parentRefs;
  const parentZoneName = parentRef ? [...structures, ...lands].find((a) => a.id === parentRef.id)?.attributes?.name : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onClick={clearSelectedAsset}>
      <div className="w-full max-w-2xl bg-slate-900 h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{name}</h2>
            <p className="text-slate-500 text-xs font-mono">ID: {asset.id}</p>
          </div>
          <button onClick={clearSelectedAsset} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-500 flex items-center gap-1 italic mb-1"><Calendar size={12} /> Registro</span>
              <p className="text-white text-sm font-medium">{createdTs ? createdTs.toLocaleDateString() : '—'}</p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-500 flex items-center gap-1 italic mb-1"><Activity size={12} /> Estado</span>
              <p className="text-white text-sm font-medium capitalize">{status}</p>
            </div>
          </div>

          {/* Bug 2026-05-18 operator: 'no es posible agregar foto a una planta
              ya creada' (cubio recién agregado). Botones para subir foto
              post-creación con dual options cámara/galería + captureAndCompress
              + savePhoto. Refresh la galería al guardar.
              Update 2026-05-18: extendido a TODOS los tipos de asset (plant,
              land/zona/propiedad, structure/túnel/invernadero, equipment),
              no solo plants. Operator agregó zona y no podía ver fecha ni foto. */}
          <AddPhotoSection
            assetId={asset.id}
            speciesSlug={isPlantType ? deriveSpeciesSlug(name) : null}
          />

          <GeometrySection asset={asset} parentZoneName={parentZoneName} onEdit={() => setShowGeoPicker(true)} saving={geoSaving} />

          {isPlantType && (
            <>
              <PerformancePanel assetId={asset.id} />
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Acciones de Campo</h3>
                <InputLogForm assetId={asset.id} onComplete={() => { }} />
              </section>

              {deriveSpeciesSlug(name) && (
                <PlanSection
                  assetId={asset.id}
                  speciesSlug={deriveSpeciesSlug(name)}
                  plantingDate={asset.attributes?.created ? asset.attributes.created * 1000 : asset._createdAt || Date.now()}
                />
              )}

              <section className="pt-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Historial de la planta</h3>
                <div className="flex flex-wrap gap-2">
                  {status !== 'dead' && (
                    <>
                      <button onClick={() => setShowCemeteryModal(true)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs flex items-center gap-2">
                        <Skull size={14} /> Marcar muerte
                      </button>
                      <button onClick={() => setShowSplitFlow(true)} className="px-3 py-2 rounded-lg bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 text-xs flex items-center gap-2">
                        <Layers size={14} /> Dividir / Juntar
                      </button>
                    </>
                  )}
                  <ExternalAiButton
                    context={{ speciesName: name, thermalZones: FARM_CONFIG.THERMAL_ZONES, altitudMsnm: FARM_CONFIG.ALTITUD_MSNM, municipio: FARM_CONFIG.MUNICIPIO }}
                    buildPrompt={buildOpenExternalPrompt}
                    label="Ayuda IA"
                  />
                </div>
              </section>

              {deriveSpeciesSlug(name) && (
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                    <Images size={14} /> Galería de la especie
                  </h3>
                  <SpeciesPhotoGallery speciesSlug={deriveSpeciesSlug(name)} currentAssetId={asset.id} />
                </section>
              )}
            </>
          )}

          {asset.asset_type === 'land' && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'reportar_invasora', initialData: { locationId: asset.id, wkt: geoWkt } } }))}
              className="w-full p-6 rounded-xl bg-amber-600/20 border border-amber-600/40 text-amber-400 font-bold flex items-center justify-center gap-3 active:bg-amber-600/30 transition-colors shadow-lg"
            >
              <AlertCircle size={24} /> Reportar invasora aquí
            </button>
          )}

          <section className="pb-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Línea de Tiempo</h3>
            <AssetTimeline assetId={asset.id} />
          </section>
        </div>
      </div>

      {/* Modals */}
      {showGeoPicker && (
        <MapPicker
          mode={isPlantType ? 'point' : 'polygon'}
          initial={currentGeo}
          center={currentGeo?.coordinates ? (isPlantType ? currentGeo.coordinates : currentGeo.coordinates[0][0]) : null}
          onCancel={() => setShowGeoPicker(false)}
          onSave={async (geometry) => {
            setShowGeoPicker(false);
            setGeoSaving(true);
            try {
              if (navigator.geolocation) {
                try {
                  const gpsPos = await new Promise((res, rej) =>
                    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
                  );
                  const { distance, isClose } = proximityCheck(gpsPos, geometry);
                  if (!isClose && !window.confirm(`Ubicación fuera de rango (${distance}m). ¿Confirmas registro remoto?`)) {
                    setGeoSaving(false); return;
                  }
                } catch (gpsErr) { console.warn('[Geo] GPS no disponible', gpsErr); }
              }

              const coords = getCoords(geometry);
              if (coords) {
                const invasive = checkInvasiveProximity(coords, plants);
                if (invasive.length > 0) window.alert(`⚠ Invasora detectada a menos de 10m.`);
              }

              const wkt = geoJsonToWkt(geometry);
              const assetType = resolveAssetType(asset);
              const updatedAsset = { ...asset, attributes: { ...asset.attributes, intrinsic_geometry: { value: wkt } } };

              if (coords) {
                const nearest = findNearestLand(wkt, lands);
                if (nearest && nearest.distance < 200 && window.confirm(`¿Vincularlo a ${nearest.land.attributes?.name || nearest.land.name}?`)) {
                  updatedAsset.relationships = {
                    ...updatedAsset.relationships,
                    parent: { data: [{ type: 'asset--land', id: nearest.land.id }] },
                    location: { data: [{ type: 'asset--land', id: nearest.land.id }] },
                  };
                }
              }

              await updateAsset(assetType, updatedAsset, []);
              window.dispatchEvent(new CustomEvent('syncComplete', { detail: { message: 'Geometría actualizada' } }));
            } finally {
              setGeoSaving(false);
            }
          }}
        />
      )}

      {showCemeteryModal && (
        <PlantCemeteryModal
          plantName={name}
          onClose={() => setShowCemeteryModal(false)}
          onConfirm={async (_reason) => {
            const updatedAsset = { ...asset, attributes: { ...asset.attributes, status: 'dead' } };
            await updateAsset('plant', updatedAsset, []);
            setShowCemeteryModal(false);
          }}
        />
      )}

      {showSplitFlow && <SplitFlow asset={asset} onClose={() => setShowSplitFlow(false)} />}
    </div>
  );
};

const GeometrySection = ({ asset, parentZoneName, onEdit, saving }) => {
  const geoRaw = asset.attributes?.intrinsic_geometry;
  const wkt = typeof geoRaw === 'object' ? geoRaw?.value : geoRaw;
  const hasGeo = !!wkt;
  const preview = hasGeo ? (wkt.startsWith('POINT') ? 'Punto registrado' : 'Polígono registrado') : (parentZoneName ? `En: ${parentZoneName}` : 'Sin ubicación');

  return (
    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
      <div>
        <span className="text-xs text-slate-500 block mb-1">Ubicación</span>
        <p className="text-sm text-white font-medium">{preview}</p>
      </div>
      <button onClick={onEdit} disabled={saving} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-200">
        <MapPin size={14} className="inline mr-1" /> {hasGeo ? 'Corregir' : 'Definir'}
      </button>
    </div>
  );
};

const resolveAssetType = (asset) => {
  const t = asset.asset_type || asset.type || '';
  if (t.includes('plant')) return 'plant';
  if (t.includes('land')) return 'land';
  if (t.includes('structure')) return 'structure';
  if (t.includes('equipment')) return 'equipment';
  return 'material';
};

export default AssetDetailView;

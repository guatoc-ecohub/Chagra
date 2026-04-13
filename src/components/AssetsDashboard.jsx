import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, RefreshCw, Building2, Wrench, Leaf, Search, WifiOff, TreePine, Map as MapIcon, List } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { fetchFromFarmOS } from '../services/apiService';
import AssetDetailView from './AssetDetailView';
import { FARM_CONFIG } from '../config/defaults';
import { CROP_TAXONOMY } from '../config/taxonomy';
import { MATERIAL_PRESETS } from '../config/materials';
import MapPicker from './MapPicker';
import FarmMap from './FarmMap';
import SpeciesSelect from './SpeciesSelect';
import GuildSuggestions from './GuildSuggestions';
import { geoJsonToWkt } from '../utils/geo';
import { MapPin, LocateFixed } from 'lucide-react';

// Catálogos de dominio agroecológico
const STRUCTURE_EXAMPLES = [
  'Invernadero Bioclimático',
  'Compostera',
  'Semillero',
  'Vivero de propagación',
  'Bodega de biopreparados',
  'Secadero solar',
];

const EQUIPMENT_EXAMPLES = [
  'Azadón',
  'Carretilla',
  'Tijera de poda',
  'Fumigadora manual (biopreparados)',
  'Pala draga',
  'Machete',
  'Rastrillo',
];

// Accesos rápidos derivados de CROP_TAXONOMY (fuente única de verdad).
// Ajustar la lista según frecuencia real de uso en campo.
const QUICK_PRESET_IDS = [
  'lactuca_sativa',
  'solanum_tuberosum_pastusa',
  'rubus_glaucus',
  'coriandrum_sativum',
  'passiflora_edulis',
  'coffea_arabica',
  'physalis_peruviana',
  'fragaria_ananassa',
];

const DYNAMIC_PRESETS = Object.values(CROP_TAXONOMY)
  .flatMap((group) => group.species)
  .filter((species) => QUICK_PRESET_IDS.includes(species.id));

const ESTRATO_OPTIONS = [
  { value: 'emergente', label: 'Emergente (>25m)', desc: 'Capa superior del dosel' },
  { value: 'alto', label: 'Alto (10-25m)', desc: 'Árboles frutales, maderables' },
  { value: 'medio', label: 'Medio (2-10m)', desc: 'Arbustos, café, cítricos' },
  { value: 'bajo', label: 'Bajo (<2m)', desc: 'Hortalizas, rastreras, cobertura' },
];

const GREMIO_OPTIONS = [
  { value: 'fijador_nitrogeno', label: 'Fijador de nitrógeno' },
  { value: 'acumulador_dinamico', label: 'Acumulador dinámico' },
  { value: 'atrayente_polinizadores', label: 'Atrayente de polinizadores' },
  { value: 'repelente_plagas', label: 'Repelente de plagas' },
  { value: 'cobertura_suelo', label: 'Cobertura de suelo' },
  { value: 'productor_biomasa', label: 'Productor de biomasa' },
  { value: 'productivo_principal', label: 'Productivo principal' },
];

const ASSET_TABS = [
  { id: 'plant', label: 'Siembras', icon: TreePine, color: 'lime' },
  { id: 'land', label: 'Zonas', icon: MapIcon, color: 'amber' },
  { id: 'structure', label: 'Infraestructura', icon: Building2, color: 'emerald' },
  { id: 'equipment', label: 'Herramientas', icon: Wrench, color: 'orange' },
  { id: 'material', label: 'Insumos', icon: Leaf, color: 'sky' },
];

const LAND_TYPES = [
  { value: 'field', label: 'Lote / Campo abierto' },
  { value: 'bed', label: 'Cama / Huerta' },
  { value: 'greenhouse', label: 'Invernadero' },
  { value: 'paddock', label: 'Pastizal' },
  { value: 'building', label: 'Edificación' },
];

const DEFAULT_LOCATION_ID = FARM_CONFIG.LOCATION_ID;

// Helpers puros para construcción de payloads JSON:API
const formatNotes = (formData) => {
  const parts = [];
  if (formData.notes) parts.push(formData.notes);
  if (formData.estrato) {
    const label = ESTRATO_OPTIONS.find((e) => e.value === formData.estrato)?.label || formData.estrato;
    parts.push(`Estrato: ${label}`);
  }
  if (formData.gremio) {
    const label = GREMIO_OPTIONS.find((g) => g.value === formData.gremio)?.label || formData.gremio;
    parts.push(`Gremio: ${label}`);
  }
  return parts.length > 0 ? { value: parts.join(' | ') } : null;
};

const buildSeedingPayload = (seedingId, assetUUID, formData) => {
  const qty = parseInt(formData.quantity, 10) || 1;
  return {
    data: {
      type: 'log--seeding',
      id: seedingId,
      attributes: {
        name: `Siembra: ${formData.name}${qty > 1 ? ` (x${qty})` : ''}`,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'done',
        notes: formatNotes(formData) || { value: `Registro de siembra para ${formData.name}` },
      },
      relationships: {
        asset: { data: [{ type: 'asset--plant', id: assetUUID }] },
        location: { data: [{ type: 'asset--land', id: DEFAULT_LOCATION_ID }] },
        quantity: {
          data: [{
            type: 'quantity--standard',
            attributes: {
              measure: 'count',
              value: { decimal: String(qty) },
              label: 'Plantas sembradas',
            },
          }],
        },
      },
    },
  };
};

const INITIAL_FORM_STATE = {
  name: '', notes: '', status: 'active',
  plantType: '', estrato: '', gremio: '', quantity: '',
  parentLandId: '', // Fase 17: zona contenedora obligatoria
  geometry: null,   // Fase 17: GeoJSON dibujado o geolocalizado
  landType: 'field', // Fase 17.2: sub_type para asset--land
  speciesId: null,   // Fase 18: id para motor de gremios
};

const colorMap = {
  lime: { bg: 'bg-lime-600', border: 'border-lime-500', text: 'text-lime-400', light: 'bg-lime-900/30' },
  emerald: { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-900/30' },
  orange: { bg: 'bg-orange-600', border: 'border-orange-500', text: 'text-orange-400', light: 'bg-orange-900/30' },
  sky: { bg: 'bg-sky-600', border: 'border-sky-500', text: 'text-sky-400', light: 'bg-sky-900/30' },
  amber: { bg: 'bg-amber-700', border: 'border-amber-600', text: 'text-amber-400', light: 'bg-amber-900/30' },
};

const TAB_LABELS = {
  plant: 'Siembra',
  land: 'Zona',
  structure: 'Infraestructura',
  equipment: 'Herramienta',
  material: 'Insumo',
};

export default function AssetsDashboard({ onBack }) {
  const {
    plants, structures, equipment, materials, lands,
    isLoading, error, lastSync,
    hydrate, syncFromServer, addAsset, removeAsset, addHarvestLog,
    setSelectedAsset,
  } = useAssetStore();

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [currentZoneId, setCurrentZoneId] = useState(null); // drill-down Fase 17.2
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map' (Fase 17.3)

  const [activeTab, setActiveTab] = useState('plant');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Estado local del formulario de cosecha scoped por asset.id
  const [activeHarvestId, setActiveHarvestId] = useState(null);
  const [harvestData, setHarvestData] = useState({ yield: '', unit: 'kg', notes: '' });

  const resetHarvestForm = () => {
    setActiveHarvestId(null);
    setHarvestData({ yield: '', unit: 'kg', notes: '' });
  };

  const submitHarvest = async (asset) => {
    const cropName = asset.attributes?.name || asset.name || 'Cultivo';
    setIsSaving(true);
    try {
      await addHarvestLog(asset.id, { ...harvestData, cropName });
      resetHarvestForm();
    } catch (error) {
      console.error('[UI] Error al registrar cosecha:', error);
      window.dispatchEvent(new CustomEvent('syncError', {
        detail: { message: 'Error local al guardar la cosecha. Verifique el almacenamiento de su dispositivo.' }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await hydrate();
      if (navigator.onLine) {
        syncFromServer(fetchFromFarmOS);
      }
    };
    init();
  }, []);

  // Extrae el id del parent land desde las relationships JSON:API del asset.
  const getParentLandId = (asset) => {
    const rel = asset.relationships?.parent?.data || asset.relationships?.location?.data;
    if (Array.isArray(rel)) return rel[0]?.id || null;
    return rel?.id || null;
  };

  const getAssetsForTab = () => {
    let list = activeTab === 'plant' ? plants
      : activeTab === 'land' ? lands
      : activeTab === 'structure' ? structures
      : activeTab === 'equipment' ? equipment
      : materials;

    // Drill-down: para plants, si hay zona seleccionada, filtrar por parent.
    // '__all__' = modo "ver todos" sin filtro de zona.
    if (activeTab === 'plant' && currentZoneId && currentZoneId !== '__all__') {
      list = list.filter((p) => getParentLandId(p) === currentZoneId);
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(a => {
      const name = a.attributes?.name || a.name || '';
      return name.toLowerCase().includes(q);
    });
  };

  // Activos tipo land filtrados para la vista de zonas (drill-down raíz).
  const getZonesForDrillDown = () => {
    if (!searchQuery) return lands;
    const q = searchQuery.toLowerCase();
    return lands.filter((l) => (l.attributes?.name || l.name || '').toLowerCase().includes(q));
  };

  const selectedZone = lands.find((l) => l.id === currentZoneId);

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    const assetUUID = crypto.randomUUID();
    const notesValue = formatNotes(formData);

    // 1. Construcción del payload del asset
    const assetAttributes = {
      name: formData.name,
      status: formData.status || 'active',
      ...(notesValue ? { notes: notesValue } : {}),
    };

    // Fase 17: geometría opcional (WKT para FarmOS intrinsic_geometry)
    if (formData.geometry) {
      const wkt = geoJsonToWkt(formData.geometry);
      if (wkt) {
        assetAttributes.intrinsic_geometry = { value: wkt };
      }
    }

    // Fase 17.2: sub_type para asset--land (field/bed/greenhouse/...)
    if (activeTab === 'land' && formData.landType) {
      assetAttributes.land_type = formData.landType;
    }

    const assetPayload = {
      data: {
        type: `asset--${activeTab}`,
        id: assetUUID,
        attributes: assetAttributes,
      },
    };

    // Relaciones opcionales (preservadas + Fase 17 jerarquía)
    if (activeTab !== 'material') {
      const parentLandId = formData.parentLandId || DEFAULT_LOCATION_ID;
      assetPayload.data.relationships = {
        location: { data: [{ type: 'asset--land', id: parentLandId }] },
        parent: { data: [{ type: 'asset--land', id: parentLandId }] },
      };
    }
    if (activeTab === 'plant' && formData.plantType) {
      assetPayload.data.relationships = assetPayload.data.relationships || {};
      assetPayload.data.relationships.plant_type = {
        data: [{
          type: 'taxonomy_term--plant_type',
          attributes: { name: formData.plantType },
        }],
      };
    }

    // 2. Lista de pendientes para el commit atómico del store
    const pendingTxs = [{
      id: assetUUID,
      type: `asset_${activeTab}`,
      endpoint: `/api/asset/${activeTab}`,
      payload: assetPayload,
      method: 'POST',
    }];

    // Macro-transacción: plant + log--seeding con referencia cruzada por UUID
    if (activeTab === 'plant') {
      const seedingId = crypto.randomUUID();
      pendingTxs.push({
        id: seedingId,
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: buildSeedingPayload(seedingId, assetUUID, formData),
        method: 'POST',
      });
    }

    // 3. Ejecución atómica vía store
    try {
      const optimisticAsset = {
        id: assetUUID,
        type: `asset--${activeTab}`,
        attributes: assetAttributes,
        _pending: true,
        _createdAt: Date.now(),
      };

      await addAsset(activeTab, optimisticAsset, pendingTxs);

      window.dispatchEvent(new CustomEvent('taskAdded'));

      // Limpieza de UI solo tras éxito del commit IDB
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('[UI] Error en creación de activo:', error);
      window.dispatchEvent(new CustomEvent('syncError', {
        detail: { message: 'Fallo crítico al guardar localmente. Verifique el almacenamiento.' }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!window.confirm('¿Confirmas la eliminación de este activo? Esta acción se sincronizará con FarmOS.')) {
      return;
    }

    try {
      await removeAsset(activeTab, assetId);
    } catch (error) {
      console.error('[UI] Error en eliminación de activo:', error);
      window.dispatchEvent(new CustomEvent('syncError', {
        detail: { message: 'No se pudo eliminar el activo del almacenamiento local.' }
      }));
    }
  };

  const handleRefresh = () => {
    if (navigator.onLine) {
      syncFromServer(fetchFromFarmOS);
    }
  };

  const tabConfig = ASSET_TABS.find(t => t.id === activeTab);
  const currentAssets = getAssetsForTab();
  const colors = colorMap[tabConfig.color];

  const getPlaceholder = () => {
    if (activeTab === 'plant') return 'Ej: Café, Aguacate, Guanábana...';
    if (activeTab === 'structure') return 'Ej: ' + STRUCTURE_EXAMPLES[Math.floor(Math.random() * STRUCTURE_EXAMPLES.length)];
    if (activeTab === 'equipment') return 'Ej: ' + EQUIPMENT_EXAMPLES[Math.floor(Math.random() * EQUIPMENT_EXAMPLES.length)];
    return 'Ej: Bokashi, Biol, Purín de Ortiga...';
  };

  // Render del formulario específico para el tab de plantas
  const renderPlantForm = () => (
    <>
      {/* Selector obligatorio de zona contenedora (Fase 17) */}
      <div>
        <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
          Zona contenedora *
        </label>
        <select
          required
          value={formData.parentLandId || ''}
          onChange={(e) => setFormData({ ...formData, parentLandId: e.target.value })}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px] focus:ring-lime-500 focus:border-lime-500"
        >
          <option value="" disabled>Seleccione una zona...</option>
          {lands.map((land) => {
            const subType = land.attributes?.land_type || land.attributes?.sub_type || 'zona';
            const lname = land.attributes?.name || land.name || 'Sin nombre';
            return (
              <option key={land.id} value={land.id}>
                {lname} · {subType}
              </option>
            );
          })}
        </select>
        {lands.length === 0 && (
          <p className="mt-1 text-xs text-amber-400">
            No hay zonas registradas. Cree primero un activo tipo "Infraestructura" (ej. invernadero) o sincronice con FarmOS.
          </p>
        )}
      </div>

      {/* Selector de especie con fuzzy search + autocompletado (Fase 17) */}
      <SpeciesSelect
        value={formData.name}
        onChange={(name, speciesId) => setFormData({ ...formData, name, speciesId: speciesId || null })}
        onAutoFill={(defaults) => {
          setFormData((prev) => ({
            ...prev,
            estrato: defaults.estrato || prev.estrato,
            gremio: defaults.gremio || prev.gremio,
          }));
        }}
      />

      {/* Motor de gremios: compañeros sugeridos (Fase 18) */}
      {formData.speciesId && (
        <GuildSuggestions
          speciesId={formData.speciesId}
          onSelectCompanion={(companionName) => {
            // Siembra rápida: hereda zona y geometría, solo cambia especie
            setFormData((prev) => ({ ...prev, name: companionName, speciesId: null, plantType: '', estrato: '', gremio: '', quantity: '1' }));
          }}
        />
      )}

      {/* Variedad */}
      <input
        type="text"
        value={formData.plantType}
        onChange={(e) => setFormData({ ...formData, plantType: e.target.value })}
        placeholder="Variedad (Ej: Castillo, Hass, Criollo)"
        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px]"
      />

      {/* Estrato */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrato en el sistema</label>
        <div className="grid grid-cols-2 gap-2">
          {ESTRATO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormData({ ...formData, estrato: formData.estrato === opt.value ? '' : opt.value })}
              className={`p-3 rounded-xl text-left transition-all min-h-[56px] active:scale-[0.98] ${
                formData.estrato === opt.value
                  ? 'bg-lime-600/20 border-2 border-lime-500 text-lime-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}
            >
              <span className="font-bold text-sm block">{opt.label}</span>
              <span className="text-xs text-slate-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gremio / Función en el sistema */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gremio / Función ecológica</label>
        <div className="flex flex-wrap gap-1.5">
          {GREMIO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormData({ ...formData, gremio: formData.gremio === opt.value ? '' : opt.value })}
              className={`text-xs px-3 py-2 rounded-full transition-all active:scale-95 min-h-[36px] ${
                formData.gremio === opt.value
                  ? 'bg-lime-600/30 text-lime-300 border border-lime-500 font-bold'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cantidad de plantas */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cantidad (plantas sembradas)</label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          placeholder="1"
          className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-black text-center min-h-[64px]"
        />
      </div>

      {/* Notas */}
      <textarea
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Notas de campo (opcional)"
        rows="2"
        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm min-h-[56px]"
      />

      {/* Geometría (POINT para frutales dispersos) */}
      {renderGeometryField('point')}
    </>
  );

  // Campo reutilizable de captura de geometría.
  const renderGeometryField = (mode) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Ubicación física {mode === 'polygon' ? '(área)' : '(punto)'}
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowMapPicker(mode)}
          className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center gap-2 min-h-[48px]"
        >
          <MapPin size={16} className="text-blue-400" />
          {formData.geometry ? 'Geometría definida ✓' : (mode === 'polygon' ? 'Definir área' : 'Definir ubicación')}
        </button>
        {mode === 'point' && (
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setFormData((prev) => ({
                    ...prev,
                    geometry: {
                      type: 'Point',
                      coordinates: [pos.coords.longitude, pos.coords.latitude],
                    },
                  }));
                },
                (err) => console.error('[Geo] GPS error:', err.message),
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }}
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Usar mi ubicación"
          >
            <LocateFixed size={16} className="text-blue-400" />
          </button>
        )}
        {formData.geometry && (
          <button
            type="button"
            onClick={() => setFormData({ ...formData, geometry: null })}
            className="p-3 rounded-xl bg-red-900/30 border border-red-800 hover:bg-red-900/50 text-red-400 min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Limpiar geometría"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  // Render del formulario genérico (structure, equipment, material)
  const renderGenericForm = () => (
    <>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder={getPlaceholder()}
        className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg min-h-[56px]"
        autoFocus
      />

      {activeTab === 'material' && (
        <div className="flex flex-wrap gap-1.5">
          {MATERIAL_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => setFormData({ ...formData, name: preset.name, notes: preset.desc })}
              className="text-xs px-2.5 py-1.5 rounded-full bg-sky-900/30 text-sky-400 border border-sky-800 hover:bg-sky-800/40 transition-all active:scale-95"
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Selector de sub_type para asset--land */}
      {activeTab === 'land' && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de zona</label>
          <select
            value={formData.landType || 'field'}
            onChange={(e) => setFormData({ ...formData, landType: e.target.value })}
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px]"
          >
            {LAND_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>{lt.label}</option>
            ))}
          </select>
        </div>
      )}

      <textarea
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Notas (opcional)"
        rows="2"
        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm min-h-[56px]"
      />

      {/* Geometría obligatoria para land y structure (polygon); point para equipment */}
      {activeTab === 'land' && renderGeometryField('polygon')}
      {activeTab === 'structure' && renderGeometryField('polygon')}
      {activeTab === 'equipment' && renderGeometryField('point')}
    </>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4 shrink-0 shadow-md">
        <button onClick={onBack} aria-label="Volver al panel principal" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex justify-center items-center shrink-0">
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <h2 className="text-2xl font-black flex-1">Activos</h2>
        <div className="flex items-center gap-2">
          {/* Toggle Lista / Mapa (Fase 17.3) */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${
                viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
              aria-label="Vista de lista"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${
                viewMode === 'map' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
              aria-label="Vista de mapa"
            >
              <MapIcon size={14} />
            </button>
          </div>
          {!navigator.onLine && <WifiOff size={16} className="text-red-400" />}
          {lastSync && (
            <span className="text-xs text-slate-500">
              {new Date(lastSync).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={handleRefresh} disabled={isLoading} aria-label="Sincronizar activos" className="p-2 bg-slate-800 rounded-lg active:bg-slate-700 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <RefreshCw size={16} aria-hidden="true" className={isLoading ? 'motion-safe:animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Tipos de activos" className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
        {ASSET_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => { setActiveTab(tab.id); setShowForm(false); resetForm(); }}
              className={`flex-1 p-3 flex items-center justify-center gap-1.5 font-bold text-xs whitespace-nowrap transition-all min-h-[48px] ${
                isActive
                  ? `${colorMap[tab.color].text} border-b-2 ${colorMap[tab.color].border}`
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda */}
      <div className="p-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar activo..."
            aria-label="Buscar activo"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm min-h-[44px]"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 p-3 bg-red-900/30 border border-red-500 rounded-xl text-red-200 text-sm shrink-0">
          {error}
        </div>
      )}

      {/* Vista de mapa global (Fase 17.3) — reemplaza la lista cuando viewMode === 'map' */}
      {viewMode === 'map' && (
        <div className="flex-1 min-h-0">
          <FarmMap
            focusZoneId={activeTab === 'plant' ? currentZoneId : null}
            onAssetClick={(assetId) => setSelectedAsset(assetId)}
          />
        </div>
      )}

      {/* Breadcrumb de drill-down (Fase 17.2 / fix Fase 19) */}
      {viewMode === 'list' && activeTab === 'plant' && (
        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setCurrentZoneId(null)}
              className={`${currentZoneId ? 'text-blue-400 hover:underline' : 'text-slate-400 font-bold'}`}
            >
              Zonas
            </button>
            {selectedZone && (
              <>
                <span className="text-slate-600">›</span>
                <span className="text-slate-200 font-bold truncate">
                  {selectedZone.attributes?.name || selectedZone.name}
                </span>
              </>
            )}
          </div>
          {!currentZoneId && (
            <button
              type="button"
              onClick={() => setCurrentZoneId('__all__')}
              className="text-blue-400 hover:underline shrink-0"
            >
              Ver todos ({plants.length})
            </button>
          )}
        </div>
      )}

      {/* Lista de zonas (nivel raíz del drill-down, solo para plant) */}
      {viewMode === 'list' && activeTab === 'plant' && !currentZoneId && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {lands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <MapPin size={48} className="mb-3 opacity-30" />
              <p className="text-lg">Sin zonas registradas</p>
              <p className="text-sm mt-1">Crea una zona (asset--land) desde FarmOS o la tab Infraestructura</p>
            </div>
          ) : (
            getZonesForDrillDown().map((zone) => {
              const zname = zone.attributes?.name || zone.name || 'Sin nombre';
              const subType = zone.attributes?.land_type || zone.attributes?.sub_type || 'zona';
              const plantCount = plants.filter((p) => getParentLandId(p) === zone.id).length;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setCurrentZoneId(zone.id)}
                  className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-left transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-lg ${colors.light} shrink-0`}>
                        <MapPin size={20} className={colors.text} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-200 truncate">{zname}</h4>
                        <p className="text-xs text-slate-500 uppercase">{subType}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black text-lime-400 tabular-nums">{plantCount}</span>
                      <p className="text-[10px] text-slate-500 uppercase">cultivos</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Lista de activos (plants filtradas por zona, u otras tabs) */}
      {viewMode === 'list' && !(activeTab === 'plant' && !currentZoneId) && (
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && currentAssets.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-slate-500" />
            <span className="ml-3 text-slate-500">Cargando...</span>
          </div>
        ) : currentAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <tabConfig.icon size={48} className="mb-3 opacity-30" />
            <p className="text-lg">Sin {tabConfig.label.toLowerCase()} registrados</p>
            <p className="text-sm mt-1">Toca el botón para agregar</p>
          </div>
        ) : (
          currentAssets.map(asset => {
            const name = asset.attributes?.name || asset.name || 'Sin nombre';
            const notes = asset.attributes?.notes;
            const notesText = typeof notes === 'object' ? notes?.value : notes;
            const isPending = asset._pending;
            const TabIcon = tabConfig.icon;

            return (
              <div
                key={asset.id}
                className={`p-4 rounded-xl border transition-all ${
                  isPending
                    ? 'bg-slate-800/50 border-dashed border-slate-600'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(asset.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    <div className={`p-2.5 rounded-lg ${colors.light} shrink-0`}>
                      <TabIcon size={20} className={colors.text} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-200 truncate text-base">{name}</h4>
                        {isPending && (
                          <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full shrink-0">pendiente</span>
                        )}
                      </div>
                      {notesText && <p className="text-xs text-slate-500 truncate mt-1">{notesText}</p>}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="p-2 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Registro de cosecha (solo tab plant, no registros pendientes) */}
                {activeTab === 'plant' && !isPending && (
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    {activeHarvestId !== asset.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHarvestId(asset.id);
                          setHarvestData({ yield: '', unit: 'kg', notes: '' });
                        }}
                        className="w-full py-2 bg-lime-700 text-white rounded-md hover:bg-lime-600 transition-colors text-sm font-medium"
                      >
                        Registrar Cosecha
                      </button>
                    ) : (
                      <div className="bg-slate-900 p-3 rounded-md border border-slate-600">
                        <h4 className="text-sm font-bold text-slate-200 mb-2">Datos de Rendimiento</h4>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="number"
                            placeholder="Cantidad"
                            value={harvestData.yield}
                            onChange={(e) => setHarvestData({ ...harvestData, yield: e.target.value })}
                            className="w-2/3 p-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                          />
                          <select
                            value={harvestData.unit}
                            onChange={(e) => setHarvestData({ ...harvestData, unit: e.target.value })}
                            className="w-1/3 p-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="lb">lb</option>
                            <option value="unidades">unds</option>
                          </select>
                        </div>
                        <textarea
                          placeholder="Observaciones fitosanitarias o de calidad..."
                          value={harvestData.notes}
                          onChange={(e) => setHarvestData({ ...harvestData, notes: e.target.value })}
                          className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 mb-2"
                          rows="2"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={resetHarvestForm}
                            className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => submitHarvest(asset)}
                            disabled={!harvestData.yield}
                            className="px-3 py-1 bg-lime-600 text-white text-xs rounded hover:bg-lime-500 disabled:opacity-50"
                          >
                            Guardar Registro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Formulario de creación (slide-up) */}
      {showForm && (
        <div className="shrink-0 border-t border-slate-700 bg-slate-900 p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <tabConfig.icon size={20} className={colors.text} />
            {activeTab === 'plant' ? 'Registrar Siembra' : `Nuevo ${TAB_LABELS[activeTab]}`}
          </h3>

          {activeTab === 'plant' ? renderPlantForm() : renderGenericForm()}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="flex-1 p-4 rounded-xl bg-slate-800 text-slate-300 font-bold min-h-[56px] active:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim() || isSaving}
              className={`flex-1 p-4 rounded-xl ${colors.bg} text-white font-black disabled:opacity-50 transition-all min-h-[56px] active:brightness-90`}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      {!showForm && (
        <div className="shrink-0 p-3 border-t border-slate-800">
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className={`w-full p-5 rounded-2xl ${colors.bg} hover:brightness-110 text-white font-black flex items-center justify-center gap-2 shadow-lg transition-all min-h-[64px] active:brightness-90 text-lg`}
          >
            <Plus size={24} />
            <span>{activeTab === 'plant' ? 'Registrar Siembra' : `Agregar ${TAB_LABELS[activeTab]}`}</span>
          </button>
        </div>
      )}

      {/* Panel lateral de detalle de activo (Fase 12.2) */}
      <AssetDetailView />

      {/* Map picker modal (Fase 17.3) */}
      {showMapPicker && (
        <MapPicker
          mode={showMapPicker}
          initial={formData.geometry}
          onSave={(geometry) => {
            setFormData((prev) => ({ ...prev, geometry }));
            setShowMapPicker(false);
          }}
          onCancel={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}

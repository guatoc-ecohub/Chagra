import React, { useState, useEffect } from 'react';
import { MSG } from '../config/messages.js';
import { ArrowLeft, Plus, Trash2, RefreshCw, Building2, Leaf, Search, WifiOff, TreePine, Map as MapIcon, List, Sprout, FlaskConical, Ban, AlertTriangle, Warehouse, Square, ChevronDown } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { Virtuoso } from 'react-virtuoso';
import { fetchFromFarmOS } from '../services/apiService';
import AssetDetailView from './AssetDetailView';
import { FARM_CONFIG } from '../config/defaults';
import { MATERIAL_PRESETS } from '../config/materials';
import MapPicker from './MapPicker';
import FarmMap from './FarmMap';
import SpeciesSelect from './SpeciesSelect';
import GuildSuggestions from './GuildSuggestions';
import BiopreparadoSuggestionModal from './BiopreparadoSuggestionModal';
import { geoJsonToWkt } from '../utils/geo';
import { MapPin, LocateFixed } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import { findBiopreparadosByIngredient } from '../db/catalogDB';
import { generatePlanForPlant } from '../services/planGeneratorService';
import { enrichEntity } from '../services/voiceRagEnricher';
import { LAND_TYPES, isUrbanLandType } from '../utils/landTypes';
import { getAccessToken } from '../services/authService';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { savePhoto } from '../services/photoService';
import { wktToGeoJson } from '../utils/geo';
import { buildPlantMeta, formatPlantMetaFallbackLine, ETAPA_FENOLOGICA_OPTIONS } from '../utils/plantMeta';
import { agruparEntradas, claveMataAgrupada, stripInstanceSuffix, formatFechaSiembra } from '../utils/agruparEntradas';
import MultiFincaModal from './MultiFincaModal';

// Note: fincaNombre constant removed. Now derived from useFincaActiveStore inside the component.

// Thumb foto de planta para cards. Sub-componente porque usePhotoUrl no
// puede llamarse dentro de un map() condicional (regla de hooks).
// Si no hay foto de usuario para este asset, cae al placeholder (Fase 1
//, Fase 3 hidratará /catalog-photos/<slug>.jpg con fotos GBIF top-uso).
// eslint-disable-next-line no-unused-vars -- FallbackIcon SE USA en JSX, eslint react-jsx detection falla en este config
function PlantCardThumb({ asset, colors, FallbackIcon }) {
  const photo = usePhotoUrl({ assetId: asset?.id });
  if (photo.loading || !photo.url) {
    return (
      <div className={`p-2.5 rounded-lg ${colors.light} shrink-0`}>
        <FallbackIcon size={20} className={colors.text} />
      </div>
    );
  }
  return (
    <img
      src={photo.url}
      alt={asset?.attributes?.name || 'Planta'}
      className="w-12 h-12 rounded-lg object-cover bg-slate-900 shrink-0 border border-slate-700"
      loading="lazy"
    />
  );
}

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

// UX-15 (#286) 2026-05-27: helper urbano importado del módulo canónico
// `src/utils/landTypes.js` (introducido por UX-13 PR #1088, ya en main).

// UX-15 (#286) 2026-05-27: copy replanteado sin jerga forestal técnica.
// El operador reportó "dosel" como confuso ("ni yo sé qué es"). Reemplazos:
//   - "Dosel"             → "Capa superior" / "Árboles altos"
//   - "Emergente (>25m)"  → "Árboles muy altos" (poco común fuera de bosque)
//   - "Alto (10-25m)"     → "Árboles altos" (frutales, maderables)
//   - "Medio (2-10m)"     → "Arbustos" (café, cítricos)
//   - "Bajo (<2m)"        → "Plantas bajas" (hortalizas, hierbas, rastreras)
// Lenguaje accesible para usuarios de campo + niños 11+. Las alturas
// quedan como sub-label gris discreto para quien sí las quiera ver.
const ESTRATO_OPTIONS = [
  { value: 'emergente', label: 'Árboles muy altos', height: 'más de 25 m', desc: 'Solo en bosque o agroforestal de altura' },
  { value: 'alto', label: 'Árboles altos', height: '10 a 25 m', desc: 'Frutales, maderables' },
  { value: 'medio', label: 'Arbustos', height: '2 a 10 m', desc: 'Café, cítricos, mora' },
  { value: 'bajo', label: 'Plantas bajas', height: 'menos de 2 m', desc: 'Hortalizas, hierbas, rastreras, cobertura' },
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

// Audit finding 070.3 (2026-05-18): los helpers buildPlantMeta /
// formatPlantMetaFallbackLine y las opciones ETAPA_FENOLOGICA_OPTIONS
// viven en src/utils/plantMeta.js para mantener este componente liviano
// y permitir tests unitarios sin cargar todo el árbol de imports JSX.

// Feedback piloto #111 #112 #114, clarificar tabs:
// - 'Zonas' (land): áreas geográficas con polígono, tab mantenida con
//   descripción explícita en hover/aria.
// - 'Infraestructura' (structure): construcciones físicas (invernaderos,
//   bodegas), diferente de Zonas (que son polígonos abiertos).
// - 'Herramientas' (equipment): ELIMINADA, usuaria piloto "qué finalidad cumple?
//   sin agregar ubicación, sin contexto". Sin caso de uso MVP claro,
//   removed hasta que se valide demanda real. Si necesario re-agregar
//   en v1.x con scope definido (asignación a tasks, inventario físico).
const ASSET_TABS = [
  { id: 'plant', label: 'Siembras', icon: TreePine, color: 'lime', desc: 'Plantas y cultivos registrados' },
  { id: 'land', label: 'Zonas', icon: MapIcon, color: 'amber', desc: 'Áreas geográficas con coordenadas (lotes, potreros)' },
  { id: 'structure', label: 'Infraestructura', icon: Building2, color: 'emerald', desc: 'Construcciones físicas (invernaderos, bodegas, sistemas de riego)' },
  { id: 'material', label: 'Insumos', icon: Leaf, color: 'sky', desc: 'Stock de biopreparados, semillas, fertilizantes' },
];

// UX-13 (#286) 2026-05-27: LAND_TYPES + helpers urban-aware extraídos a
// src/utils/landTypes.js para cumplir react-refresh/only-export-components
// y permitir reuso desde otros componentes (UX-15/UX-16) sin acoplarse al
// dashboard. La data sigue siendo single-source-of-truth allí.

const DEFAULT_LOCATION_ID = FARM_CONFIG.LOCATION_ID;

// Bug fix #5 (2026-05-18): persistencia liviana de la zona pre-seleccionada
// en localStorage. La key vive scoped a "siembra pending" para que (a)
// re-abrir el form en la misma sesión recupere la zona elegida y (b) si el
// operador escanea/agrega varias plantas en la misma zona no tenga que
// re-seleccionar manualmente. Se limpia al guardar exitosamente.
const PENDING_FORM_ZONE_KEY = 'chagra:pending_form_parentLandId';

const readPendingFormZone = () => {
  try {
    return localStorage.getItem(PENDING_FORM_ZONE_KEY) || '';
  } catch (err) {
    console.warn('[AssetsDashboard] localStorage read failed:', err);
    return '';
  }
};

const writePendingFormZone = (id) => {
  try {
    if (id) localStorage.setItem(PENDING_FORM_ZONE_KEY, id);
    else localStorage.removeItem(PENDING_FORM_ZONE_KEY);
  } catch (err) {
    console.warn('[AssetsDashboard] localStorage write failed:', err);
  }
};

// Point-in-polygon ray-casting (lon/lat). Acepta un ring GeoJSON
// (array de [lon, lat]) cerrado o abierto. Robusto a polígonos pequeños
// (escalas de finca), suficiente para auto-sugerir zona.
const isPointInRing = (lon, lat, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

// Devuelve el land cuyo polígono contiene [lon, lat], o el más cercano
// por centroide si ninguno lo contiene (con cap de distancia). Si todos
// los lands son POINT (sin polígono), no auto-detecta para evitar falsos
// positivos. Operador: 'ideal sería que automáticamente lo sugiriera
// por ubicación GPS'.
const detectZoneByGps = (lon, lat, lands) => {
  if (!Array.isArray(lands) || lands.length === 0) return null;
  for (const land of lands) {
    const wkt = land.attributes?.intrinsic_geometry?.value;
    if (!wkt) continue;
    const geo = wktToGeoJson(wkt);
    if (!geo) continue;
    if (geo.type === 'Polygon') {
      // ring 0 = exterior
      const ring = geo.coordinates[0] || [];
      if (ring.length >= 3 && isPointInRing(lon, lat, ring)) {
        return land;
      }
    }
  }
  return null;
};

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

// ADR-030: acepta un assetUUID (string) o un array (para individual qty>1
// donde N assets comparten un único log--seeding).
const buildSeedingPayload = (seedingId, assetUUIDOrArray, formData) => {
  const qty = parseInt(formData.quantity, 10) || 1;
  const assetIds = Array.isArray(assetUUIDOrArray) ? assetUUIDOrArray : [assetUUIDOrArray];
  const assetCount = assetIds.length;
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
        asset: { data: assetIds.map((id) => ({ type: 'asset--plant', id })) },
        location: { data: [{ type: 'asset--land', id: DEFAULT_LOCATION_ID }] },
        quantity: {
          data: [{
            type: 'quantity--standard',
            attributes: {
              measure: 'count',
              // En individual qty>1: cantidad declarada Y N assets registran lo mismo (qty=N).
              // En aggregate: 1 asset, qty=N. En individual qty=1: 1 asset, qty=1.
              value: { decimal: String(qty > 1 ? qty : assetCount) },
              label: assetCount > 1 ? 'Plantas sembradas (individuales)' : 'Plantas sembradas',
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
  // ADR-030 Bloque A: tracking_mode resuelto desde catálogo per species.
  // El operario puede override per-creación con link sutil.
  // 'individual' = N assets qty=1 (frutales valiosos, trazabilidad por planta).
  // 'aggregate' = 1 asset qty=N (hortalizas en cama corrida, cereales).
  trackingMode: 'individual',  // default conservativo (mejor más datos que menos)
  // Bug fix #2 (2026-05-18): foto opcional capturada via SpeciesSelect.
  // El blob comprimido viaja en el form state hasta handleSave, donde
  // se persiste en media_cache (IndexedDB) atado al assetId recién creado.
  photoBlob: null,
  // Audit finding 070.3 (2026-05-18): estado actual de la planta opcional
  // (sembrada hace tiempo / altura conocida / etapa fenológica). Se persiste
  // en attributes._chagra_plant_meta (JSON) o, como fallback, dentro de
  // attributes.notes serializado para no romper el schema FarmOS.
  fechaGerminacion: '',  // yyyy-mm-dd (input type=date)
  alturaCm: '',          // string numérica (input type=number)
  etapaFenologica: '',   // '' | 'semillero' | 'vegetativo' | 'floracion' | ...
};

const buildInitialFormState = () => ({
  ...INITIAL_FORM_STATE,
  parentLandId: readPendingFormZone(),
});

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
/**
 * Panel principal de gestión de activos (CRUD) con pestañas para cada tipo de asset:
 * Siembra (plant), Zona (land), Infraestructura (structure), Herramienta (equipment),
 * e Insumo (material).
 *
 * Incluye filtro por nombre de finca activa, selector de mapa para coordenadas GPS,
 * modal de creación/edición inline por bundle, importación/exportación masiva,
 * búsqueda global con atajos de teclado y vista de lista/tarjeta.
 *
 * @param {Object} props
 * @param {Function} [props.onBack] - Callback para navegar hacia atrás o cerrar el dashboard.
 * @param {string} [props.initialTab] - Pestaña activa al montar (plant, land, structure, equipment, material).
 * @param {boolean} [props.initialShowForm=false] - Si true, abre el formulario de creación automáticamente al montar.
 * @returns {React.JSX.Element}
 */
export default function AssetsDashboard({ onBack, initialTab, initialShowForm = false }) {
  const {
    plants, structures, equipment, materials, lands,
    isLoading, error,
    hydrate, syncFromServer, addAsset, addAssetsBulk, removeAsset, addHarvestLog,
    setSelectedAsset,
  } = useAssetStore();

  const { activeFincaSlug, getActiveFinca, fincas } = useFincaActiveStore();
  const activeFinca = getActiveFinca();
  const fincaNombre = activeFinca.nombre;
  // BUG #10 (2026-06-21, steve, multi-finca): con 2+ fincas el "cambiar de
  // finca" no se hallaba — la píldora mostraba el nombre pero sin affordance
  // de selector. hasMultipleFincas activa el chevron + texto "cambiar" para
  // que sea claramente un conmutador. Con una sola finca queda como indicador.
  const hasMultipleFincas = fincas.length > 1;

  const { request: requestGeo } = useGeolocation();

  /** @type {[string|boolean, import('react').Dispatch<import('react').SetStateAction<string|boolean>>]} */
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showFincaModal, setShowFincaModal] = useState(false);
  // Sugerencias post-create. Miguel UX 2026-05-03: cuando user agrega
  // material (melaza/suero) al inventario, sugerir biopreparados que pueda
  // hacer con ese ingrediente. State del modal: { ingredientName, biopreparados[] }
  const [biopreparadoSuggestion, setBiopreparadoSuggestion] = useState(null);
  const [currentZoneId, setCurrentZoneId] = useState(null); // drill-down Fase 17.2
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map' (Fase 17.3)

  // Feedback piloto #113 + decisión 2026-05-02 (deprecar PlantAssetLog plano):
  // initialTab + initialShowForm permiten que App.jsx case 'plant_asset' redirija
  // aquí con el form rich abierto directo en tab=plant. Antes el TopBar `+`
  // navegaba al PlantAssetLog plano que NO usaba SpeciesSelect/GuildSuggestions/
  // autofill, rich form vivía escondido detrás de Plantas → Siembras → Nuevo.
  const [activeTab, setActiveTab] = useState(initialTab || 'plant');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(initialShowForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(buildInitialFormState);

  // Insights RAG del manual plant form (paridad con VoiceConfirmation, audit
  // 2026-05-19). Cuando el operador selecciona una species real del catálogo
  // (speciesId != null), enriquece async vía voiceRagEnricher para mostrar
  // companions/antagonists/biopreparados/warnings. Si la entrada es libre
  // (sin speciesId), no se dispara. Errores silenciosos por diseño.
  const [ragInsights, setRagInsights] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  useEffect(() => {
    if (!formData.speciesId || !formData.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset temprano en guard clause, no cambia durante render
      setRagInsights(null);
      setRagLoading(false);
      return;
    }
    let cancelled = false;
    setRagLoading(true);
    (async () => {
      try {
        const insights = await enrichEntity(/** @type {any} */ ({ crop: formData.name }));
        if (cancelled) return;
        setRagInsights(insights || null);
      } catch (err) {
        if (!cancelled) setRagInsights(null);
        console.warn('[AssetsDashboard] RAG enrich failed:', err);
      } finally {
        if (!cancelled) setRagLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formData.speciesId, formData.name]);

  // Bug 2026-05-18 operator: 'agregué 50 plantas dentro de Túnel +100 especies
  // y siguen sin aparecer ahí'. Causa: si el operador navega DENTRO de una
  // zona específica (currentZoneId NO __all__/__orphan__/__cemetery__) y
  // abre el form de agregar planta, formData.parentLandId queda vacío y
  // cae a DEFAULT_LOCATION_ID — la planta NO va al túnel actual.
  // Fix: al abrir el form, pre-poblar parentLandId con currentZoneId si es
  // una zona real (no virtual).
  useEffect(() => {
    if (!showForm) return;
    const isRealZone = currentZoneId && !['__all__', '__orphan__', '__cemetery__'].includes(currentZoneId);
    if (isRealZone && !formData.parentLandId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización de estado derivado, no afecta render actual
      setFormData((prev) => ({ ...prev, parentLandId: currentZoneId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formData.parentLandId es state, incluirlo causaría loop
  }, [showForm, currentZoneId]);

  // BUG #7 (2026-06-21, flujo core david/campesino): al agregar una planta
  // TODAS caían en "Sin zona asignada" porque el alta no auto-asignaba zona
  // cuando la finca tiene una sola. Fix: si el form está abierto en tab plant,
  // no hay zona elegida aún y la finca tiene EXACTAMENTE una zona registrada,
  // auto-asignarla — el campesino con una sola chagra no tiene que elegir nada.
  // Si tiene varias, el selector (renderPlantForm) sigue pidiendo cuál.
  useEffect(() => {
    if (!showForm || activeTab !== 'plant') return;
    if (formData.parentLandId) return; // ya hay zona (manual, currentZone o GPS)
    if (lands.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización de estado derivado, no afecta render actual
      setFormData((prev) => {
        if (prev.parentLandId) return prev; // race con otro efecto: no pisar
        return { ...prev, parentLandId: lands[0].id };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formData.parentLandId es state, incluirlo causaría loop
  }, [showForm, activeTab, lands]);

  // Estado local del formulario de cosecha scoped por asset.id
  const [activeHarvestId, setActiveHarvestId] = useState(null);
  const [harvestData, setHarvestData] = useState({ yield: '', unit: 'kg', notes: '' });

  // Grupos de matas expandidos (por clave). Cuando se siembran varias matas
  // iguales (individual + qty>1 → "Fresa #01".."#20"), el listado las colapsa
  // en UNA fila "Fresa ×20 · sembradas 4 mar · <zona>". Expandir muestra las
  // individuales para editar/cosechar/eliminar cada una.
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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
  }, [activeFincaSlug, hydrate, syncFromServer]); // Re-sync when finca changes

  // Extrae el id del parent land desde las relationships JSON:API del asset.
  const getParentLandId = (asset) => {
    const rel = asset.relationships?.parent?.data || asset.relationships?.location?.data;
    if (Array.isArray(rel)) return rel[0]?.id || null;
    return rel?.id || null;
  };

  const getAssetsForTab = () => {
    let list;
    if (activeTab === 'plant') {
      list = plants;
    } else if (activeTab === 'land') {
      list = lands;
    } else if (activeTab === 'structure') {
      // Bug pre-demo-institucional 2026-05-19: el operador percibe "Infraestructura"
      // como un único concepto físico/espacial (lotes, túneles, invernaderos,
      // bodegas). Reportó ver solo guatoc + "sin nombre" (lands) y no el
      // "tunel de la producción" (structure) que SÍ aparecía en el dropdown
      // de VoiceConfirmation (lands + structures combinados). Fix mínimo:
      // unificar lands + structures en este tab, dedupe por id priorizando
      // entradas con name no vacío. Los iconos por item se diferencian en
      // el render del Virtuoso (Warehouse vs Square).
      const byId = new Map();
      const hasName = (a) => Boolean((a.attributes?.name || a.name || '').trim());
      [...structures, ...lands].forEach((a) => {
        const existing = byId.get(a.id);
        if (!existing || (!hasName(existing) && hasName(a))) {
          byId.set(a.id, a);
        }
      });
      list = Array.from(byId.values());
    } else if (activeTab === 'equipment') {
      list = equipment;
    } else {
      list = materials;
    }

    // Cementerio (queue/038 + spine educativo): si zona === '__cemetery__'
    // mostramos solo plants status='dead'. Modo dedicado para reflexionar
    // sobre lecciones aprendidas. Por default las plantas muertas se ocultan
    // del listado normal de plant tab para no contaminar la vista activa.
    if (activeTab === 'plant') {
      if (currentZoneId === '__cemetery__') {
        list = list.filter((p) => (p.attributes?.status || p.status) === 'dead');
      } else {
        // Default: ocultar plantas muertas del listado normal
        list = list.filter((p) => (p.attributes?.status || p.status) !== 'dead');
      }
    }

    // Drill-down: para plants, si hay zona seleccionada, filtrar por parent.
    // '__all__' = modo "ver todos" sin filtro de zona.
    // '__orphan__' = plantas cuyo parent no resuelve a una zona existente.
    // '__cemetery__' = plantas muertas (manejado arriba).
    if (activeTab === 'plant' && currentZoneId && currentZoneId !== '__all__' && currentZoneId !== '__cemetery__') {
      if (currentZoneId === '__orphan__') {
        const landIds = new Set(lands.map((l) => l.id));
        list = list.filter((p) => {
          const pid = getParentLandId(p);
          return !pid || !landIds.has(pid);
        });
      } else {
        list = list.filter((p) => getParentLandId(p) === currentZoneId);
      }
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(a => {
      const name = a.attributes?.name || a.name || '';
      return name.toLowerCase().includes(q);
    });
  };

  // Cementerio: cuántas plantas muertas hay (para badge en el botón).
  const cemeteryCount = activeTab === 'plant'
    ? plants.filter((p) => (p.attributes?.status || p.status) === 'dead').length
    : 0;

  // Activos tipo land filtrados para la vista de zonas (drill-down raíz).
  const getZonesForDrillDown = () => {
    if (!searchQuery) return lands;
    const q = searchQuery.toLowerCase();
    return lands.filter((l) => (l.attributes?.name || l.name || '').toLowerCase().includes(q));
  };

  const selectedZone = lands.find((l) => l.id === currentZoneId);

  // Plantas huérfanas: aquellas cuyo parent/location no resuelve a ninguna zona
  // existente. Se muestran como card especial en el drill-down raíz para que el
  // usuario las detecte y reasigne (evita el bug de "17 plantas totales pero 0
  // en cada zona").
  const orphanPlants = React.useMemo(() => {
    const landIds = new Set(lands.map((l) => l.id));
    return plants.filter((p) => {
      const pid = getParentLandId(p);
      return !pid || !landIds.has(pid);
    });
  }, [plants, lands]);

  const resetForm = () => {
    setFormData(buildInitialFormState());
  };

  // Persistencia liviana de la zona pre-seleccionada (#5): cualquier cambio
  // de parentLandId mientras el form está abierto se refleja en localStorage
  // para sobrevivir re-open. Se limpia al guardar exitosamente más abajo.
  useEffect(() => {
    if (showForm && formData.parentLandId) {
      writePendingFormZone(formData.parentLandId);
    }
  }, [showForm, formData.parentLandId]);

  // GPS auto-detect zone (#5 avanzado, operador: 'ideal sería que
  // automáticamente lo sugiriera por ubicación GPS'). Al abrir el form
  // de siembra y SIN zona ya elegida, pide GPS (silent, no UI bloqueante)
  // y elige la zona cuyo polígono WKT contiene la ubicación. Si falla o
  // está fuera de cualquier polígono, NO bloquea — el operador puede
  // elegir manualmente como siempre.
  useEffect(() => {
    if (!showForm) return;
    if (activeTab !== 'plant') return;
    if (formData.parentLandId) return; // ya hay zona (manual o localStorage)
    if (!Array.isArray(lands) || lands.length === 0) return;
    if (!navigator?.geolocation) return;

    let cancelled = false;
    requestGeo({
      enableHighAccuracy: false, // suficiente para detectar zona, ahorra batería
      timeout: 8000,
      onSuccess: (pos) => {
        if (cancelled) return;
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;
        const land = detectZoneByGps(lon, lat, lands);
        if (land?.id) {
          setFormData((prev) => {
            // Race: si entre tanto el operador eligió manualmente, respetar
            if (prev.parentLandId) return prev;
            return { ...prev, parentLandId: land.id };
          });
        }
      },
      onError: () => { /* silent: deja al operador elegir manual */ },
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- detectZoneByGps es función utilidad estable, no cambia por referencia
  }, [showForm, activeTab, lands]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    const notesValue = formatNotes(formData);
    const qty = parseInt(formData.quantity, 10) || 1;

    // ADR-030 Bloque A Regla 1: detectar individual+qty>1 → N assets UUID
    // únicos compartiendo 1 log--seeding. Si aggregate o qty=1, comportamiento
    // legacy (1 asset, qty en log).
    const isIndividualMulti = activeTab === 'plant' && formData.trackingMode === 'individual' && qty > 1;
    const assetCount = isIndividualMulti ? qty : 1;

    // Construcción del template de attributes (compartido por todos los assets
    // en individual mode; en aggregate solo hay 1)
    /** @type {{status: string, notes?: string|{value: string}, intrinsic_geometry?: {value: string}, land_type?: string, _speciesSlug?: string, _chagra_plant_meta?: object}} */
    const baseAttributes = {
      status: formData.status || 'active',
      ...(notesValue ? { notes: notesValue } : {}),
    };

    if (formData.geometry) {
      const wkt = geoJsonToWkt(formData.geometry);
      if (wkt) baseAttributes.intrinsic_geometry = { value: wkt };
    }
    if (activeTab === 'land' && formData.landType) {
      baseAttributes.land_type = formData.landType;
    }

    // Audit finding 070.3 (2026-05-18): persistir estado actual de la planta
    // (fecha siembra/germinación, altura, etapa fenológica) cuando el
    // operador llena la sección colapsable opcional. Se guarda en
    // attributes._chagra_plant_meta (objeto JSON) — campo namespaced para
    // no chocar con el schema oficial FarmOS. Fallback: si _chagra_plant_meta
    // termina siendo ignorado por el server, también se serializa una línea
    // legible al final de attributes.notes para no perder la información.
    // Bug 2026-06-20 (operador, fresa): persistir el slug canónico del
    // catálogo en el asset al sembrar. Sin esto, la ficha derivaba el slug
    // del nombre común ("Fresa" → "fresa"), que NO coincide con el id del
    // catálogo ("fragaria_ananassa"), y la foto + el plan de alimentación
    // no resolvían. (matchSpeciesInCatalog cubre los assets viejos; esto
    // evita el problema de raíz para los nuevos.)
    if (activeTab === 'plant' && formData.speciesId) {
      baseAttributes._speciesSlug = formData.speciesId;
    }

    const plantMeta = activeTab === 'plant' ? buildPlantMeta(formData) : null;
    if (plantMeta) {
      baseAttributes._chagra_plant_meta = plantMeta;
      // Fallback notes: agrega una línea legible solo si NO está ya
      // contenida (evita duplicado en re-renders u optimistic UI).
      const metaLine = formatPlantMetaFallbackLine(plantMeta);
      if (metaLine) {
        const existingNotes = baseAttributes.notes;
        const existingText = existingNotes
          ? (typeof existingNotes === 'string' ? existingNotes : existingNotes.value || '')
          : '';
        if (!existingText.includes(metaLine)) {
          baseAttributes.notes = existingText ? `${existingText}\n${metaLine}` : metaLine;
        }
      }
    }

    // Relaciones compartidas (location + parent + plant_type)
    /** @type {Record<string, any> | null} */
    let baseRels = null;
    if (activeTab !== 'material') {
      const parentLandId = formData.parentLandId || DEFAULT_LOCATION_ID;
      baseRels = {
        location: { data: [{ type: 'asset--land', id: parentLandId }] },
        parent: { data: [{ type: 'asset--land', id: parentLandId }] },
      };
    }
    if (activeTab === 'plant' && formData.plantType) {
      baseRels = baseRels || {};
      baseRels.plant_type = {
        data: [{ type: 'taxonomy_term--plant_type', attributes: { name: formData.plantType } }],
      };
    }

    // Generar N assetUUIDs (1 si no individual-multi)
    const assetUUIDs = Array.from({ length: assetCount }, () => crypto.randomUUID());
    const token = navigator.onLine ? await getAccessToken() : null;
    const pendingReason = !navigator.onLine ? 'no_network' : (!token ? 'no_token' : 'sync_error');

    // Construir N pendingTxs para assets + (si plant) 1 pendingTx log compartido
    const pendingTxs = [];
    const optimisticAssets = [];

    assetUUIDs.forEach((id, i) => {
      // En individual-multi, cada asset lleva sufijo "#N" para diferenciarlos
      // visualmente en la lista. En aggregate / individual-single usa el name plano.
      const indexedName = isIndividualMulti
        ? `${formData.name} #${String(i + 1).padStart(String(qty).length, '0')}`
        : formData.name;
      const assetAttributes = { ...baseAttributes, name: indexedName };
      const assetPayload = {
        data: {
          type: `asset--${activeTab}`,
          id,
          attributes: assetAttributes,
          ...(baseRels ? { relationships: baseRels } : {}),
        },
      };
      pendingTxs.push({
        id,
        type: `asset_${activeTab}`,
        endpoint: `/api/asset/${activeTab}`,
        payload: assetPayload,
        method: 'POST',
      });
      optimisticAssets.push({
        id,
        type: `asset--${activeTab}`,
        attributes: assetAttributes,
        // Bug fix 2026-05-03: incluir relationships en optimistic asset.
        // Sin esto, getParentLandId(asset) retorna null y el drill-down por
        // zona filtra la planta aunque SÍ está guardada en IDB. Usuario
        // creaba zona + agregaba planta dentro y "no aparecía".
        ...(baseRels ? { relationships: baseRels } : {}),
        _pending: true,
        _pendingReason: pendingReason,
        _createdAt: Date.now(),
      });
    });

    // 1 log--seeding compartido para plants (tanto individual-multi como single)
    if (activeTab === 'plant') {
      const seedingId = crypto.randomUUID();
      pendingTxs.push({
        id: seedingId,
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: buildSeedingPayload(seedingId, isIndividualMulti ? assetUUIDs : assetUUIDs[0], formData),
        method: 'POST',
      });
    }

    // UX-20 (#286) 2026-05-27 — bug operador: "se registra la fresa ya
    // tiene toda la información pero no veo en el índice de plantas la
    // foto a pesar de que ya la tiene".
    //
    // Root cause: el orden previo era addAsset() → savePhoto(). Pero
    // `addAsset` updateaba el store → PlantCardThumb re-render → su
    // `usePhotoUrl(assetId)` se montaba ANTES de que savePhoto hubiera
    // persistido la foto, devolvía null + caía a placeholder. Como
    // useEffect solo re-corre cuando cambian sus deps `[assetId, ...]`,
    // nunca re-fetcheaba aunque la foto llegara después → la card
    // quedaba para siempre sin imagen hasta refresh manual.
    //
    // Fix: PRIMERO guardar la foto (assetId está pre-asignado vía
    // crypto.randomUUID() arriba, no necesita el store), DESPUÉS crear
    // el asset. Así cuando PlantCardThumb monta, la foto ya está en
    // media_cache y se ve inmediato. Bonus: emitimos `chagra:photo:saved`
    // por si algún componente quiere refrescar listas de fotos
    // (SpeciesPhotoGallery, etc.).
    try {
      if (activeTab === 'plant' && formData.photoBlob instanceof Blob) {
        try {
          await savePhoto({
            blob: formData.photoBlob,
            assetId: assetUUIDs[0],
            speciesSlug: formData.speciesId || null,
          });
          window.dispatchEvent(new CustomEvent('chagra:photo:saved', {
            detail: {
              assetId: assetUUIDs[0],
              speciesSlug: formData.speciesId || null,
            },
          }));
        } catch (err) {
          console.warn('[AssetsDashboard] savePhoto falló (no bloquea siembra):', err);
        }
      }

      // Ahora sí: guardar el asset. PlantCardThumb monta con la foto
      // ya disponible → render con thumb correcta sin refresh manual.
      if (assetCount > 1) {
        await addAssetsBulk(activeTab, optimisticAssets, pendingTxs);
      } else {
        await addAsset(activeTab, optimisticAssets[0], pendingTxs);
      }

      // Limpiar zona persistida — siembra guardada, próxima abrirá vacía
      // o con la nueva zona que el operador elija.
      writePendingFormZone('');

      window.dispatchEvent(new CustomEvent('taskAdded'));

      // Sugerencias post-create según tipo de asset (Fase 21, high-impact wiring)
      if (activeTab === 'material' && formData.name?.trim()) {
        findBiopreparadosByIngredient(formData.name.trim())
          .then((recipes) => {
            if (recipes.length > 0) {
              setBiopreparadoSuggestion({
                ingredientName: formData.name.trim(),
                biopreparados: recipes,
              });
            }
          })
          .catch((err) => console.warn('[AssetsDashboard] biopreparado suggestion failed:', err));
      } else if (activeTab === 'plant' && formData.speciesId) {
        // Audit finding 070.3 (2026-05-18): si el operador declaró fecha de
        // siembra/germinación, anclamos el plan a esa fecha (los offsets se
        // calculan retro/prospectivamente desde ahí). Caso por defecto: hoy.
        const plantingDateIso = formData.fechaGerminacion
          ? new Date(formData.fechaGerminacion).toISOString()
          : new Date().toISOString();
        generatePlanForPlant(/** @type {any} */ ({
          assetId: assetUUIDs[0],
          speciesSlug: formData.speciesId,
          plantingDate: plantingDateIso,
        })).then((plan) => {
          if (plan?.steps?.length > 0) {
            window.dispatchEvent(new CustomEvent('chagraToast', {
              detail: {
                message: `Plan de alimentación sugerido para ${formData.name} (${plan.steps.length} pasos). Ver en Bodega → Planes.`,
              },
            }));
          }
        }).catch((err) => console.warn('[AssetsDashboard] plan generation failed:', err));
      }

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

  // Nombre legible de un lote/zona a partir de su id (para las etiquetas de grupo).
  const landNameById = (id) => {
    if (!id) return '';
    const land = lands.find((l) => l.id === id);
    return (land?.attributes?.name || land?.name || '').trim();
  };

  // Mejor fecha de siembra conocida de una mata: la fecha_germinacion que el
  // operador escribió, o la de creación local.
  const plantSowDate = (asset) =>
    asset.attributes?._chagra_plant_meta?.fecha_germinacion
    || asset._createdAt
    || asset.attributes?.created
    || asset.attributes?.timestamp
    || null;

  // Filas a renderizar. Solo en la tab 'plant' colapsamos matas equivalentes
  // (misma especie + fecha de siembra + lote) en una fila agregada; el resto de
  // tabs (zonas, infraestructura, equipo, material) van fila por fila.
  const plantRows = activeTab === 'plant'
    ? agruparEntradas(currentAssets, (asset) => claveMataAgrupada({
        species: asset.attributes?._speciesSlug,
        name: asset.attributes?.name || asset.name,
        date: plantSowDate(asset),
        bed: getParentLandId(asset),
      }))
    : currentAssets.map((asset, i) => ({
        key: asset.id || `row-${i}`,
        items: [asset],
        count: 1,
        representative: asset,
        grouped: false,
      }));

  // Tarjeta individual de un activo (mata/zona/infra/…). Reutilizable tanto para
  // una fila suelta como para cada mata dentro de un grupo expandido, así no se
  // pierde ninguna funcionalidad por-mata (ver ficha, cosechar, eliminar).
  const renderAssetCard = (asset, { nested = false } = {}) => {
    // Bug pre-demo-institucional 2026-05-19: en tab 'structure' conviven lands +
    // structures. Diferenciamos icono y label fallback según el `type`.
    const rawName = (asset.attributes?.name || asset.name || '').trim();
    const isLand = asset.type === 'asset--land';
    const isStructure = asset.type === 'asset--structure';
    const typeLabel = isLand ? 'zona' : isStructure ? 'infraestructura' : '';
    const name = rawName || (typeLabel ? `(sin nombre · ${typeLabel})` : '(sin nombre)');
    const notes = asset.attributes?.notes;
    const notesText = typeof notes === 'object' ? notes?.value : notes;
    const isPending = asset._pending;
    const TabIcon = activeTab === 'structure'
      ? (isLand ? Square : Warehouse)
      : tabConfig.icon;

    return (
      <div
        role="article"
        className={`p-4 rounded-xl border transition-all ${isPending
          ? 'bg-slate-800/50 border-dashed border-slate-600'
          : nested
            ? 'bg-slate-800/60 border-slate-700/70'
            : 'bg-slate-800 border-slate-700'
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedAsset(asset.id)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            {activeTab === 'plant' ? (
              <PlantCardThumb asset={asset} colors={colors} FallbackIcon={TabIcon} />
            ) : (
              <div className={`p-2.5 rounded-lg ${colors.light} shrink-0`}>
                <TabIcon size={20} className={colors.text} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-slate-200 truncate text-base">{name}</h4>
                <span className="text-[10px] font-bold uppercase text-emerald-300/70 border border-emerald-700/40 bg-emerald-900/20 rounded-full px-2 py-0.5 shrink-0">{fincaNombre}</span>
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
                  rows={2}
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
  };

  // Tarjeta AGREGADA de un grupo de matas iguales: "🌱 Fresa ×20 · sembradas
  // 4 mar · Cama 1", expandible a las matas individuales.
  const renderGroupCard = (grupo) => {
    const rep = grupo.representative;
    const nombre = stripInstanceSuffix(rep.attributes?.name || rep.name) || '(sin nombre)';
    const fecha = formatFechaSiembra(plantSowDate(rep));
    const zona = landNameById(getParentLandId(rep));
    const isOpen = expandedGroups.has(grupo.key);
    const anyPending = grupo.items.some((a) => a._pending);
    const detalle = [fecha ? `sembradas ${fecha}` : '', zona].filter(Boolean).join(' · ');
    return (
      <div className={`rounded-xl border transition-all ${anyPending ? 'bg-slate-800/50 border-dashed border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
        <button
          type="button"
          onClick={() => toggleGroup(grupo.key)}
          aria-expanded={isOpen}
          className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
        >
          <PlantCardThumb asset={rep} colors={colors} FallbackIcon={tabConfig.icon} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-slate-200 truncate text-base">{nombre}</h4>
              <span className="text-xs font-bold text-lime-300 bg-lime-900/40 border border-lime-700/40 rounded-full px-2 py-0.5 shrink-0 tabular-nums">×{grupo.count}</span>
              {anyPending && (
                <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full shrink-0">pendiente</span>
              )}
            </div>
            {detalle && <p className="text-xs text-slate-500 truncate mt-1">{detalle}</p>}
          </div>
          <ChevronDown size={20} className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="px-3 pb-3 pt-0 flex flex-col gap-2 border-t border-slate-700/60">
            <p className="text-2xs text-slate-500 pt-2 px-1">{grupo.count} matas individuales — toca una para ver su ficha, cosechar o eliminar.</p>
            {grupo.items.map((asset) => (
              <div key={asset.id}>{renderAssetCard(asset, { nested: true })}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRow = (grupo) => (
    <div className="pb-2 px-1">
      {grupo.grouped ? renderGroupCard(grupo) : renderAssetCard(grupo.representative)}
    </div>
  );

  const getPlaceholder = () => {
    if (activeTab === 'plant') return 'Ej: Café, Aguacate, Guanábana...';
    // UX-13 (#286): placeholder contextual según tipo de zona.
    if (activeTab === 'land' && isUrbanLandType(formData.landType)) {
      const urbanExamples = {
        balcony: 'Ej: Balcón cocina, Balcón principal...',
        terrace: 'Ej: Terraza norte, Terraza azotea...',
        window_sill: 'Ej: Ventana cocina, Ventana sala...',
        indoor_pot: 'Ej: Matera sala, Matera comedor...',
        urban_garden: 'Ej: Huerta patio, Huerta vecinos...',
      };
      return urbanExamples[formData.landType] || 'Ej: Mi zona urbana...';
    }
    // Zona rural (land no-urbana): placeholder de zona, NO de insumos.
    if (activeTab === 'land') return 'Ej: Huerta, Lote de abajo, Potrero, Invernadero...';
    if (activeTab === 'structure') return 'Ej: ' + STRUCTURE_EXAMPLES[Math.floor(/* eslint-disable-line react-hooks/purity -- Math.random() es intencionalmente impuro para variar placeholder */ Math.random() * STRUCTURE_EXAMPLES.length)];
    if (activeTab === 'equipment') return 'Ej: ' + EQUIPMENT_EXAMPLES[Math.floor(/* eslint-disable-line react-hooks/purity -- Math.random() es intencionalmente impuro para variar placeholder */ Math.random() * EQUIPMENT_EXAMPLES.length)];
    return 'Ej: Bokashi, Biol, Purín de Ortiga...';
  };

  // Campo reutilizable de captura de geometría.
  //
  // Fix P0 TDZ (2026-06-20): debe declararse ANTES de renderPlantForm y
  // renderGenericForm, que lo invocan. Antes vivía DESPUÉS de ambos: aunque
  // en dev/jsdom el orden de inicialización tolera la referencia adelantada
  // (los tres son arrow consts y solo se llaman en el return final), el
  // bundle minificado de producción conservaba la referencia adelantada y
  // disparaba `ReferenceError: Cannot access 'X' before initialization`
  // (temporal dead zone) al abrir el formulario, tumbando todo el módulo
  // "Mi Finca" y la ficha de especie con "Algo falló en Mi Finca".
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
              requestGeo({
                onSuccess: (pos) => {
                  setFormData((prev) => ({
                    ...prev,
                    geometry: {
                      type: 'Point',
                      coordinates: [pos.coords.longitude, pos.coords.latitude],
                    },
                  }));
                },
                onError: (errorType) => {
                  console.warn('[AssetsDashboard] GPS inline falló:', errorType);
                },
              });
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

  // Render del formulario específico para el tab de plantas
  const renderPlantForm = () => (
    <>
      {/* Selector de zona contenedora (Fase 17 · BUG #7 2026-06-21).
          Antes "Zona contenedora *" obligatoria y vacía por defecto: si el
          campesino no elegía, la planta caía silenciosa en "Sin zona asignada".
          Ahora: lenguaje campesino, auto-asigna si la finca tiene una sola zona
          (ver efecto arriba) y ofrece "Sin zona por ahora" como elección
          EXPLÍCITA (reasignable después desde la tarjeta de huérfanas). */}
      <div>
        <label htmlFor="plant-zone-select" className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
          ¿En qué lote o zona va?
        </label>
        <select
          id="plant-zone-select"
          value={formData.parentLandId || ''}
          onChange={(e) => setFormData({ ...formData, parentLandId: e.target.value })}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px] focus:ring-lime-500 focus:border-lime-500"
        >
          {lands.map((land) => {
            const subType = land.attributes?.land_type || land.attributes?.sub_type || 'zona';
            const lname = land.attributes?.name || land.name || 'Sin nombre';
            return (
              <option key={land.id} value={land.id}>
                {lname} · {subType}
              </option>
            );
          })}
          {/* Elección explícita: sin zona aún. parentLandId vacío → la planta
              entra a la tarjeta "Sin zona asignada" y se reasigna luego. */}
          <option value="">Sin zona por ahora (la asigno después)</option>
        </select>
        {lands.length === 0 ? (
          <p className="mt-1 text-xs text-amber-400">
            Todavía no tienes lotes ni zonas. Puedes guardar la planta sin zona y asignarla luego, o crear una zona desde la pestaña "Zonas".
          </p>
        ) : !formData.parentLandId ? (
          <p className="mt-1 text-xs text-amber-400/80">
            Quedará en "Sin zona asignada". La podrás mover a un lote cuando quieras.
          </p>
        ) : null}
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
            // ADR-030: hereda tracking_mode del catálogo. Operario puede
            // overridear con link sutil más abajo en el form.
            trackingMode: defaults.tracking_mode || prev.trackingMode,
          }));
        }}
        // Bug fix #2 (2026-05-18): SpeciesSelect re-emite el blob ya
        // comprimido tras identificar especie. Lo guardamos en formData
        // para persistir en media_cache al hacer handleSave.
        onPhoto={(blob) => setFormData((prev) => ({ ...prev, photoBlob: blob }))}
      />
      {formData.photoBlob && (
        <p className="text-[10px] text-emerald-400 -mt-2 px-1">
          Foto adjunta — se guardará junto a la siembra.
        </p>
      )}

      {/* Insights RAG del manual plant form (paridad con VoiceConfirmation,
          audit 2026-05-19). Solo aparece cuando el operador seleccionó una
          especie del catálogo (speciesId != null) y el enricher devolvió
          datos. Degrade gracefully: si falla o no hay coincidencia, no se
          muestra nada. */}
      {formData.speciesId && ragInsights && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-2xs uppercase font-bold text-slate-500 flex items-center gap-1">
            <Sprout size={11} className="text-emerald-400" />
            Catálogo dice
            {ragInsights.sourceSlug && (
              <span className="normal-case font-mono text-slate-600 text-2xs">
                · {ragInsights.sourceSlug}
              </span>
            )}
          </p>

          {ragInsights.invasive && (
            <div className="bg-red-900/30 border border-red-800/60 rounded-lg p-2 text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Especie marcada invasora</p>
                {ragInsights.warnings.map((w, wi) => (
                  <p key={wi} className="text-2xs mt-0.5 text-red-300/90">{w}</p>
                ))}
              </div>
            </div>
          )}

          {ragInsights.companions.length > 0 && (
            <div className="text-xs text-emerald-200/90">
              <span className="font-bold inline-flex items-center gap-1">
                <Sprout size={12} className="text-emerald-400" /> Va bien con:
              </span>{' '}
              <span className="text-slate-300">
                {ragInsights.companions.slice(0, 4).map((c) => c.especie).join(', ')}
              </span>
            </div>
          )}

          {ragInsights.antagonists.length > 0 && (
            <div className="text-xs text-amber-200/90">
              <span className="font-bold inline-flex items-center gap-1">
                <Ban size={12} className="text-amber-400" /> Evitar junto a:
              </span>{' '}
              <span className="text-slate-300">
                {ragInsights.antagonists.slice(0, 4).map((a) => a.especie).join(', ')}
              </span>
            </div>
          )}

          {ragInsights.biopreparados.length > 0 && (
            <div className="text-xs text-sky-200/90">
              <span className="font-bold inline-flex items-center gap-1">
                <FlaskConical size={12} className="text-sky-400" /> Plan típico:
              </span>
              <ul className="mt-1 ml-4 list-disc text-2xs text-slate-300 space-y-0.5">
                {ragInsights.biopreparados.slice(0, 4).map((b, bi) => (
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
      {formData.speciesId && ragLoading && !ragInsights && (
        <p className="text-[10px] text-slate-500 -mt-1 px-1">
          Consultando catálogo agroecológico…
        </p>
      )}

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

      {/* UX-15 (#286) 2026-05-27: Capa del cultivo (antes "Estrato en el
          sistema"). Replanteo:
          - Copy sin jerga forestal (sin "dosel", sin "emergente >25m").
          - Si la zona parent es URBANA (balcón/terraza/ventana/matera) →
            OCULTAR el campo entero. Un balcón no tiene estructura por
            estratos forestales.
          - Si la especie del catálogo ya resolvió un estrato sugerido,
            mostramos badge "Sugerido por catálogo" con opción de cambiar.
          - Resto de casos: mismas opciones con copy nuevo.
          - Sub-label con la altura aproximada (gris discreto) para quien
            la quiera ver. */}
      {(() => {
        const parentLand = formData.parentLandId
          ? lands.find((l) => l.id === formData.parentLandId)
          : null;
        const parentLandType = parentLand?.attributes?.land_type;
        const isUrbanContext = isUrbanLandType(parentLandType);
        if (isUrbanContext) {
          return (
            <p className="text-xs text-slate-500 italic px-1" data-testid="estrato-hidden-urban">
              Zona urbana: no necesitas indicar capa del cultivo.
            </p>
          );
        }
        return (
          <div className="space-y-1.5" data-testid="estrato-field">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Capa del cultivo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ESTRATO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, estrato: formData.estrato === opt.value ? '' : opt.value })}
                  className={`p-3 rounded-xl text-left transition-all min-h-[56px] active:scale-[0.98] ${formData.estrato === opt.value
                    ? 'bg-lime-600/20 border-2 border-lime-500 text-lime-300'
                    : 'bg-slate-800 border border-slate-700 text-slate-300'
                    }`}
                >
                  <span className="font-bold text-sm block">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 block">{opt.height}</span>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 italic px-1">
              ¿Qué tan alta crece? Si la dudas, déjala en "Plantas bajas" o vacía.
            </p>
          </div>
        );
      })()}

      {/* UX-16 (#286) 2026-05-27: gremio condicional urbano. La jerga
          "fijador de nitrógeno", "atrayente de polinizadores",
          "productor de biomasa" es agroecología de sistemas grandes —
          no aplica a balcón / matera / ventana. Si la zona parent es
          urbana, ocultamos el bloque entero (mismo patrón que UX-15
          hizo para Capa del cultivo). */}
      {(() => {
        const parentLand = formData.parentLandId
          ? lands.find((l) => l.id === formData.parentLandId)
          : null;
        const parentLandType = parentLand?.attributes?.land_type;
        if (isUrbanLandType(parentLandType)) {
          return (
            <p className="text-xs text-slate-500 italic px-1" data-testid="gremio-hidden-urban">
              Zona urbana: no necesitas indicar función ecológica.
            </p>
          );
        }
        return (
      <div className="space-y-1.5" data-testid="gremio-field">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gremio / Función ecológica</label>
        <div className="flex flex-wrap gap-1.5">
          {GREMIO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormData({ ...formData, gremio: formData.gremio === opt.value ? '' : opt.value })}
              className={`text-xs px-3 py-2 rounded-full transition-all active:scale-95 min-h-[36px] ${formData.gremio === opt.value
                ? 'bg-lime-600/30 text-lime-300 border border-lime-500 font-bold'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
        );
      })()}

      {/* Cantidad de plantas (ADR-030: visible/editable según tracking_mode).
          - aggregate: input grande prominente (cama corrida, qty=N en 1 asset)
          - individual: input pequeño (default 1, casi siempre será 1 mata) */}
      {formData.trackingMode === 'aggregate' ? (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cantidad (plantas en la cama)</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="1"
            className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-black text-center min-h-[64px]"
          />
          <button
            type="button"
            onClick={() => setFormData({ ...formData, trackingMode: 'individual', quantity: '1' })}
            className="text-xs text-slate-500 hover:text-slate-300 underline mt-1"
          >
            Registrar individualmente cada planta (separa hoja de vida por mata)
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cantidad</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={formData.quantity || '1'}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="1"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-base text-center min-h-[48px]"
          />
          <button
            type="button"
            onClick={() => setFormData({ ...formData, trackingMode: 'aggregate' })}
            className="text-xs text-slate-500 hover:text-slate-300 underline mt-1"
          >
            Agrupar siembra (registrar como cama / chorrillo, 1 asset con qty=N)
          </button>
          <p className="text-[10px] text-slate-600 leading-snug">
            Cada planta tendrá su propia hoja de vida + foto + historial de cosechas.
            Si vas a sembrar muchas en cama corrida, usa &ldquo;Agrupar siembra&rdquo;.
          </p>
        </div>
      )}

      {/* Notas */}
      <textarea
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Notas de campo (opcional)"
        rows={2}
        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm min-h-[56px]"
      />

      {/*
        Audit finding 070.3 (2026-05-18): sección colapsable opcional para
        registrar el estado actual de la planta. Aplica tanto a siembras
        nuevas (default = hoy) como a plantas que el operador inscribe en
        Chagra después de haberlas sembrado hace tiempo. Persiste en
        attributes._chagra_plant_meta + fallback en notes (ver handleSave).
        Default colapsado para no saturar el flujo rápido de siembra.
      */}
      <details className="rounded-xl bg-slate-900 border border-slate-700">
        <summary
          className="cursor-pointer p-3 flex items-center gap-2 hover:bg-slate-800/60 active:bg-slate-800 rounded-xl min-h-[48px]"
          data-testid="plant-meta-toggle"
        >
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold flex-1 text-left">
            Estado actual de la planta (opcional)
          </span>
          <span className="text-[10px] text-slate-500">Tóquelo para abrir</span>
        </summary>
        <div className="p-3 space-y-3 border-t border-slate-800">
          {/* Fecha de siembra/germinación */}
          <div className="space-y-1.5">
            <label
              htmlFor="plant-fecha-germinacion"
              className="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >
              Fecha de siembra/germinación (opcional)
            </label>
            <input
              id="plant-fecha-germinacion"
              name="fecha_germinacion"
              type="date"
              value={formData.fechaGerminacion}
              onChange={(e) => setFormData({ ...formData, fechaGerminacion: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px]"
            />
            <p className="text-[10px] text-slate-500 leading-snug">
              Si la planta lleva tiempo en la chagra, ponga la fecha real para que el plan de
              alimentación calcule los pasos desde esa fecha.
            </p>
          </div>

          {/* Altura actual en cm */}
          <div className="space-y-1.5">
            <label
              htmlFor="plant-altura-cm"
              className="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >
              Altura actual (cm, opcional)
            </label>
            <input
              id="plant-altura-cm"
              name="altura_cm"
              type="number"
              inputMode="numeric"
              min="0"
              max="2000"
              step="1"
              value={formData.alturaCm}
              onChange={(e) => setFormData({ ...formData, alturaCm: e.target.value })}
              placeholder="Ej: 35"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px]"
            />
          </div>

          {/* UX-17 (#286) 2026-05-27: "etapa fenológica" → "¿En qué momento
              está la planta?" — copy amigable para gente de campo y niños 11+.
              Los `value` técnicos se mantienen (compat backend). El sub-label
              "technical" queda como title hover para agrónomos. */}
          <div className="space-y-1.5">
            <label
              htmlFor="plant-etapa-fenologica"
              className="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >
              ¿En qué momento está la planta? (opcional)
            </label>
            <select
              id="plant-etapa-fenologica"
              name="etapa_fenologica"
              value={formData.etapaFenologica}
              onChange={(e) => setFormData({ ...formData, etapaFenologica: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white min-h-[48px] focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="">— No sé / aún no aplica —</option>
              {ETAPA_FENOLOGICA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} title={opt.technical}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      {/* Geometría (POINT para frutales dispersos) */}
      {renderGeometryField('point')}
    </>
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
        rows={2}
        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm min-h-[56px]"
      />

      {/* Geometría obligatoria para land y structure (polygon); point para equipment.
          UX-13 (#286): para land URBANO (balcón/terraza/ventana/matera/jardín
          urbano) no mostramos el picker de polígono — un balcón no tiene
          contorno cartográfico útil. El operador puede igual agregar GPS
          después editando el asset si quiere. */}
      {activeTab === 'land' && !isUrbanLandType(formData.landType) && renderGeometryField('polygon')}
      {activeTab === 'land' && isUrbanLandType(formData.landType) && (
        <p className="text-xs text-slate-500 italic px-1">
          Zona urbana: no necesitas marcar un área en el mapa.
        </p>
      )}
      {activeTab === 'structure' && renderGeometryField('polygon')}
      {activeTab === 'equipment' && renderGeometryField('point')}
    </>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      {/* QA temas 2026-07-09: en 390px el título flex-1 no podía encoger (sin
          min-w-0) y el grupo de acciones empujaba el botón de sincronizar
          FUERA del borde derecho. Gap/padding compactos en angosto + título
          truncable + nombre de finca más corto → los 4 controles caben. */}
      <header className="px-2 py-4 min-[480px]:px-4 bg-slate-950 border-b border-slate-800 flex items-center gap-2 min-[480px]:gap-4 shrink-0 shadow-md">
        <button onClick={/** @type {React.MouseEventHandler<HTMLButtonElement>} */ (onBack)} aria-label="Volver al panel principal" className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex justify-center items-center shrink-0">
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <h2 className="text-xl min-[480px]:text-2xl font-black flex-1 min-w-0 truncate">Activos</h2>
        <div className="flex items-center gap-1.5 min-[480px]:gap-2 shrink-0">
          {/* Toggle Lista / Mapa (Fase 17.3) */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              aria-label="Vista de lista"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'map' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              aria-label="Vista de mapa"
            >
              <MapIcon size={14} />
            </button>
          </div>
          {!navigator.onLine && <WifiOff size={16} className="text-red-400" />}
          <button
            type="button"
            onClick={() => setShowFincaModal(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 rounded-full px-3 py-1.5 shrink-0 hover:bg-emerald-900/50 transition-all active:scale-95 group"
            aria-label={hasMultipleFincas ? `Cambiar de finca (actual: ${fincaNombre})` : `Finca activa: ${fincaNombre}`}
            data-testid="assets-finca-switcher"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse group-hover:scale-125 transition-transform"></div>
            <span className="truncate max-w-[7ch] min-[480px]:max-w-[10ch]">{fincaNombre}</span>
            {hasMultipleFincas && (
              <ChevronDown size={12} aria-hidden="true" className="-mr-0.5 opacity-80 group-hover:translate-y-0.5 transition-transform" />
            )}
          </button>
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
              aria-label={tab.desc ? `${tab.label}: ${tab.desc}` : tab.label}
              title={tab.desc || tab.label}
              onClick={() => { setActiveTab(tab.id); setShowForm(false); resetForm(); }}
              className={`flex-1 p-3 flex items-center justify-center gap-1.5 font-bold text-xs whitespace-nowrap transition-all min-h-[48px] ${isActive
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

      {/* Vista de mapa global (Fase 17.3), reemplaza la lista cuando viewMode === 'map' */}
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
            {currentZoneId === '__orphan__' && (
              <>
                <span className="text-slate-600">›</span>
                <span className="text-amber-300 font-bold truncate">Sin zona asignada</span>
              </>
            )}
            {currentZoneId === '__cemetery__' && (
              <>
                <span className="text-slate-600">›</span>
                <span className="text-slate-400 font-bold truncate">🪦 Cementerio</span>
              </>
            )}
          </div>
          {!currentZoneId && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentZoneId('__all__')}
                className="text-blue-400 hover:underline"
              >
                Ver todos ({plants.length - cemeteryCount})
              </button>
              {cemeteryCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentZoneId('__cemetery__')}
                  className="text-slate-400 hover:text-slate-300 hover:underline inline-flex items-center gap-1"
                  title="Ver plantas que se perdieron, fracaso como currículo"
                >
                  🪦 {cemeteryCount}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista de zonas (nivel raíz del drill-down, solo para plant) */}
      {viewMode === 'list' && activeTab === 'plant' && !currentZoneId && (
        <div className="flex-1">
          {lands.length === 0 && orphanPlants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-slate-500">
              {/* QA temas 2026-07-09: el empty-state iba pegado al borde (sin
                  padding lateral ni text-center) y con jerga técnica en tuteo. */}
              <MapPin size={48} className="mb-3 opacity-30" />
              <p className="text-lg">Sin zonas registradas</p>
              <p className="text-sm mt-1">Cree su primera zona desde la pestaña Infraestructura, o desde farmOS</p>
            </div>
          ) : (
            <Virtuoso
              data={getZonesForDrillDown()}
              style={{ height: '100%' }}
              overscan={200}
              components={{
                Header: () => (
                  <>
                    {orphanPlants.length > 0 && (
                      <div className="px-3 pt-3 pb-2">
                        <button
                          type="button"
                          onClick={() => setCurrentZoneId('__orphan__')}
                          className="w-full p-4 rounded-xl bg-amber-900/20 border border-amber-700/50 hover:bg-amber-900/30 text-left transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-lg bg-amber-900/40 shrink-0">
                                <TreePine size={20} className="text-amber-300" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-amber-100 truncate">Sin zona asignada</h4>
                                <p className="text-xs text-amber-300/80">Reasigna estas plantas a una zona</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-2xl font-black text-amber-300 tabular-nums">{orphanPlants.length}</span>
                              <p className="text-[10px] text-amber-300/60 uppercase">cultivos</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                    {cemeteryCount > 0 && (
                      <div className="px-3 pb-2">
                        <button
                          type="button"
                          onClick={() => setCurrentZoneId('__cemetery__')}
                          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-left transition-colors"
                          title="Plantas perdidas, espacio para revisar lecciones aprendidas"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-lg bg-slate-800 shrink-0 text-2xl leading-none">
                                🪦
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-200 truncate">Cementerio</h4>
                                <p className="text-xs text-slate-500">Lo que se perdió. Sin juicio, son datos para aprender.</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-2xl font-black text-slate-400 tabular-nums">{cemeteryCount}</span>
                              <p className="text-[10px] text-slate-500 uppercase">cultivos</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                ),
              }}
              itemContent={(index, zone) => {
                const zname = zone.attributes?.name || zone.name || 'Sin nombre';
                const subType = zone.attributes?.land_type || zone.attributes?.sub_type || 'zona';
                const plantCount = plants.filter((p) => getParentLandId(p) === zone.id).length;
                return (
                  <div className="px-3 pb-2">
                    <button
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
                  </div>
                );
              }}
            />
          )}
        </div>
      )}

      {/* Lista de activos (plants filtradas por zona, u otras tabs) */}
      {viewMode === 'list' && !(activeTab === 'plant' && !currentZoneId) && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && currentAssets.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-slate-500" />
              <span className="ml-3 text-slate-500">{MSG.ui.cargando}</span>
            </div>
          ) : currentAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <tabConfig.icon size={48} className="mb-3 opacity-30" />
              <p className="text-lg">Sin {tabConfig.label.toLowerCase()} registrados</p>
              <p className="text-sm mt-1">Toca el botón para agregar</p>
            </div>
          ) : (
            <Virtuoso
              data={plantRows}
              initialTopMostItemIndex={(() => {
                const saved = sessionStorage.getItem(`chagra:scroll:activos:${activeTab}`);
                return saved ? parseInt(saved, 10) : 0;
              })()}
              rangeChanged={(range) => {
                // Throttled save? sessionStorage is fast enough for small strings,
                // but let's follow the 056-1 rule of "topmost index".
                sessionStorage.setItem(`chagra:scroll:activos:${activeTab}`, String(range.startIndex));
              }}
              style={{ height: '100%', width: '100%' }}
              overscan={400}
              itemContent={(index, grupo) => renderRow(grupo)}
            />
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
          mode={/** @type {any} */ (showMapPicker)}
          initial={formData.geometry}
          center={null}
          onSave={(geometry) => {
            setFormData((prev) => ({ ...prev, geometry }));
            setShowMapPicker(false);
          }}
          onCancel={() => setShowMapPicker(false)}
        />
      )}

      {/* Modal sugerencia biopreparados post-create material (Miguel UX 2026-05-03) */}
      {biopreparadoSuggestion && (
        <BiopreparadoSuggestionModal
          ingredientName={biopreparadoSuggestion.ingredientName}
          biopreparados={biopreparadoSuggestion.biopreparados}
          onClose={() => setBiopreparadoSuggestion(null)}
        />
      )}
      {/* Selector de Fincas (Piloto Multi-finca) */}
      {showFincaModal && (
        <MultiFincaModal onClose={() => setShowFincaModal(false)} />
      )}
    </div>
  );
}

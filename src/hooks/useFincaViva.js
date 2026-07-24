/*
 * useFincaViva — espejo vivo de la finca REAL para mundos 3D y home.
 *
 * Reúne en un solo descriptor lo que ya existe en los caches locales:
 * procesos de finca, activos, logs de cosecha y clima cacheado. La idea es
 * simple: si el dato existe, se deriva; si no existe, se marca como tal y se
 * deja un fallback honesto para no romper los consumidores legados.
 */
import { useEffect, useMemo, useState } from 'react';
import useAssetStore from '../store/useAssetStore.js';
import { assetCache } from '../db/assetCache.js';
import { listFarmProcesses } from '../db/farmProcessCache.js';
import { logCache } from '../db/logCache.js';
import { HARVEST_LOG_TYPE, normalizeHarvestLog } from '../services/cosechaService.js';
import { buildFincaScene } from '../services/fincaSceneService.js';
import { buildClimaHoy } from '../services/hoyEnFincaService.js';
import { deriveAtmosphere } from '../services/atmosphereService.js';
import {
  CLIMA_UPDATED_EVENT,
  getCachedClimaSnapshot,
  resolveClimaLocation,
} from '../services/climaService.js';
import { getCachedSkyConditions } from '../services/skyConditionService.js';
import { getPisoTermicoInfo } from '../services/locationService.js';

const REEVAL_MS = 10 * 60 * 1000;

const SALUD_MUESTRA = Object.freeze({ matasVivas: 34, matasTotal: 41, agua: 0.72 });

function mapClimaEscena(luz, condicion) {
  if (condicion === 'lluvia') return 'lluvia';
  if (luz === 'noche') return 'noche';
  if (condicion === 'niebla') return 'niebla';
  if (luz === 'amanecer' || luz === 'atardecer') return 'dorada';
  return 'soleado';
}

function inferAnimalType(texto) {
  const s = String(texto || '').toLowerCase();
  if (/(cerd|marran|puerc|pig)/.test(s)) return 'cerdo';
  if (/(vaca|bovin|res|cebu|cebú)/.test(s)) return 'vaca';
  if (/(gallin|pollo|ave|aviar)/.test(s)) return 'gallina';
  if (/(ovej|ovino)/.test(s)) return 'oveja';
  if (/(cabr|caprin)/.test(s)) return 'cabra';
  if (/(conej|cunic)/.test(s)) return 'conejo';
  return s ? s.trim() : 'animal';
}

function inferAnimalEstado(raw) {
  const stage = String(raw?.attributes?.current_stage || raw?.current_stage || raw?.attributes?.status || raw?.status || 'sano').toLowerCase();
  if (stage === 'completed') return 'cerrado';
  if (stage === 'cancelled') return 'cancelado';
  return stage;
}

function mapAnimalAsset(asset, index = 0) {
  const a = asset?.attributes && typeof asset.attributes === 'object' ? asset.attributes : asset || {};
  const nombre = a.name || a.subject_label || a.subject_slug || `Animal ${index + 1}`;
  const tipo = inferAnimalType(a.animal_type || a.subject_slug || a.name || a.subject_label || a.type);
  const raza = String(a.breed || a.raza || a.variety || '').trim();
  return {
    id: asset?.id || a.id || `${tipo}-${index + 1}`,
    tipo,
    raza,
    estado: inferAnimalEstado(a),
    nombre,
  };
}

function mapAnimalProcess(proc, index = 0) {
  const a = proc?.attributes || proc || {};
  const typeText = a.animal_type || a.subject_slug || a.subject_label || a.process_type || 'animal';
  const tipo = inferAnimalType(typeText);
  const nombre = a.subject_label || a.name || `${tipo} ${index + 1}`;
  const raza = String(a.breed || a.raza || '').trim();
  const cantidad = Number.isFinite(Number(a.quantity)) ? Math.max(1, Math.floor(Number(a.quantity))) : 1;
  return {
    id: proc?.process_id || proc?.id || `${tipo}-${index + 1}`,
    tipo,
    raza,
    estado: inferAnimalEstado(a),
    nombre,
    cantidad,
  };
}

function esProcesoAnimal(proc) {
  const a = proc?.attributes || proc || {};
  const processType = String(a.process_type || '').toLowerCase();
  const subjectKind = String(a.subject_kind || '').toLowerCase();
  return subjectKind === 'animal'
    || processType.includes('animal')
    || processType === 'pigs'
    || Boolean(a.animal_type);
}

function buildAnimales({ animalAssets = [], processes = [] } = {}) {
  const reales = [];
  const seen = new Set();

  for (const [i, asset] of (Array.isArray(animalAssets) ? animalAssets : []).entries()) {
    const item = mapAnimalAsset(asset, i);
    seen.add(item.id);
    reales.push(item);
  }

  for (const [i, proc] of (Array.isArray(processes) ? processes : []).entries()) {
    if (!esProcesoAnimal(proc)) continue;
    const item = mapAnimalProcess(proc, i);
    const key = item.id || `${item.tipo}-${item.nombre}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reales.push(item);
  }

  return reales;
}

function buildHarvestRecent(harvestLogs = []) {
  const recent = (Array.isArray(harvestLogs) ? harvestLogs : [])
    .map(normalizeHarvestLog)
    .filter(Boolean)
    .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))[0] || null;

  if (!recent) return null;
  return {
    cultivo: recent.crop,
    cantidad: recent.value,
    unidad: recent.unit,
    kg: recent.kg,
    assetId: recent.assetId,
    fechaMs: recent.timestampMs,
  };
}

function buildFuente(general, clima, saludFinca, animales, cosecha) {
  return {
    general,
    clima,
    saludFinca,
    animales,
    cosecha,
  };
}

export function buildFincaVivaState({
  processes = [],
  plants = [],
  lands: _lands = [],
  animalAssets = [],
  harvestLogs = [],
  climaSnapshot = null,
  skySnapshot = null,
  location = null,
  now = new Date(),
} = {}) {
  const elevationM = location?.elevation ?? null;
  const climaHoy = buildClimaHoy({ snapshot: climaSnapshot, sky: skySnapshot, elevationM });
  const atmosfera = deriveAtmosphere({ snapshot: climaSnapshot, now, location });
  const climaEscena = mapClimaEscena(atmosfera.luz, atmosfera.condition || atmosfera.condicion);
  const pisoInfo = elevationM != null ? getPisoTermicoInfo(elevationM) : null;

  const scene = buildFincaScene({
    processes,
    plantAssetsCount: Array.isArray(plants) ? plants.length : 0,
  });

  const animales = buildAnimales({ animalAssets, processes });
  const cosechaReciente = buildHarvestRecent(harvestLogs);

  const climaReal = Boolean(climaHoy.hasData);
  const saludReal = !scene.vacia;
  const animalesReal = animales.length > 0;
  const cosechaReal = Boolean(cosechaReciente);

  const clima = climaReal
    ? {
        piso: pisoInfo?.slug || null,
        lluvia: climaHoy.condition === 'lluvia',
        temp: climaHoy.tempMaxC ?? climaHoy.tempMinC ?? null,
      }
    : {
        piso: pisoInfo?.slug || null,
        lluvia: true,
        temp: null,
      };

  const saludFinca = saludReal
    ? {
        matasVivas: scene.cultivosActivos,
        matasTotal: scene.totalCultivos,
        ...(climaHoy.tempMinC != null || climaHoy.tempMaxC != null ? { agua: SALUD_MUESTRA.agua } : {}),
      }
    : { ...SALUD_MUESTRA };

  const fuenteClima = climaReal ? 'real' : 'muestra';
  const fuenteSalud = saludReal ? 'real' : 'muestra';
  const fuenteAnimales = animalesReal ? 'real' : 'faltante';
  const fuenteCosecha = cosechaReal ? 'real' : 'faltante';
  const general = [fuenteClima, fuenteSalud, fuenteAnimales, fuenteCosecha].every((v) => v === 'real')
    ? 'real'
    : [fuenteClima, fuenteSalud, fuenteAnimales, fuenteCosecha].some((v) => v === 'muestra')
      ? 'muestra'
      : 'faltante';

  return {
    clima,
    climaEscena,
    climaDetalle: clima,
    enso: atmosfera.enso === 'nina' ? 'nina' : atmosfera.enso === 'nino' ? 'nino' : 'neutro',
    cosechaReciente,
    cosecha: { reciente: cosechaReciente },
    saludFinca,
    animales,
    _fuente: buildFuente(general, fuenteClima, fuenteSalud, fuenteAnimales, fuenteCosecha),
  };
}

export function useFincaViva() {
  const plants = useAssetStore((s) => s.plants);
  const lands = useAssetStore((s) => s.lands);
  const isHydrated = useAssetStore((s) => s.isHydrated);
  const hydrate = useAssetStore((s) => s.hydrate);

  const location = useMemo(() => resolveClimaLocation(), []);
  const [climaSnapshot, setClimaSnapshot] = useState(() => (
    location
      ? getCachedClimaSnapshot(location.lat, location.lng, location.elevation)
      : getCachedClimaSnapshot()
  ));
  const [skySnapshot, setSkySnapshot] = useState(() => (
    location
      ? getCachedSkyConditions(location.lat, location.lng, location.elevation)
      : null
  ));
  const [processes, setProcesses] = useState([]);
  const [animalAssets, setAnimalAssets] = useState([]);
  const [harvestLogs, setHarvestLogs] = useState([]);

  useEffect(() => {
    if (!isHydrated && typeof hydrate === 'function') {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  useEffect(() => {
    let alive = true;
    const cargar = async () => {
      const [procs, animals, harvests] = await Promise.all([
        listFarmProcesses({ status: 'active' }).catch(() => []),
        assetCache.getByType('animal').catch(() => []),
        logCache.getByType(HARVEST_LOG_TYPE).catch(() => []),
      ]);
      if (!alive) return;
      setProcesses(Array.isArray(procs) ? procs : []);
      setAnimalAssets(Array.isArray(animals) ? animals : []);
      setHarvestLogs(Array.isArray(harvests) ? harvests : []);
    };

    void cargar();
    const refrescar = () => { void cargar(); };
    window.addEventListener('tenantChanged', refrescar);
    window.addEventListener('syncCompleted', refrescar);
    return () => {
      alive = false;
      window.removeEventListener('tenantChanged', refrescar);
      window.removeEventListener('syncCompleted', refrescar);
    };
  }, []);

  useEffect(() => {
    const refrescarClima = () => {
      if (!location) {
        setClimaSnapshot(getCachedClimaSnapshot());
        setSkySnapshot(null);
        return;
      }
      setClimaSnapshot(getCachedClimaSnapshot(location.lat, location.lng, location.elevation));
      setSkySnapshot(getCachedSkyConditions(location.lat, location.lng, location.elevation));
    };

    refrescarClima();
    window.addEventListener(CLIMA_UPDATED_EVENT, refrescarClima);
    const timer = setInterval(refrescarClima, REEVAL_MS);
    return () => {
      window.removeEventListener(CLIMA_UPDATED_EVENT, refrescarClima);
      clearInterval(timer);
    };
  }, [location]);

  return useMemo(
    () => buildFincaVivaState({
      processes,
      plants,
      lands,
      animalAssets,
      harvestLogs,
      climaSnapshot,
      skySnapshot,
      location,
    }),
    [processes, plants, lands, animalAssets, harvestLogs, climaSnapshot, skySnapshot, location],
  );
}

export default useFincaViva;

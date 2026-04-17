import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAssetStore from '../store/useAssetStore';
import { wktToGeoJson } from '../utils/geo';
import { logCache } from '../db/logCache';
import type { FarmOSEnrichedAsset } from '../types';

/**
 * FarmMap — Vista maestra de activos geolocalizados (Fase 17.2).
 *
 * Props:
 *   - focusZoneId: UUID de asset--land para filtrar y hacer zoom (drill-down espacial).
 *   - onAssetClick: callback(assetId) al tocar una capa.
 *   - onTaskComplete: callback(logId) al completar tarea desde popup del mapa.
 *   - showTasks:  boolean — si true, renderiza capa de tareas pendientes.
 */

interface FarmMapProps {
  focusZoneId?: string | null;
  onAssetClick?: (assetId: string) => void;
  onTaskComplete?: (logId: string) => void;
  showTasks?: boolean;
}

const DEFAULT_CENTER: [number, number] = [4.5306, -73.9247]; // Choachí, Cundinamarca
const DEFAULT_ZOOM = 15;
const MAP_STATE_KEY = 'chagra:v1:map_state';

// Estilos por tipo (Fase 17.2 — estilizado por asset_type).
const STYLES = {
  land: {
    color: '#92400e',
    weight: 2,
    fillColor: 'transparent',
    fillOpacity: 0,
  },
  structure: {
    color: '#3b82f6',
    weight: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
  },
  plant: {
    radius: 7,
    color: '#16a34a',
    weight: 2,
    fillColor: '#22c55e',
    fillOpacity: 0.7,
  },
  default: {
    color: '#64748b',
    weight: 2,
    fillColor: '#64748b',
    fillOpacity: 0.3,
  },
};

// Extrae el WKT desde el shape JSON:API de FarmOS.
const getWkt = (asset: FarmOSEnrichedAsset): string | null => {
  const geo = asset.attributes?.intrinsic_geometry;
  if (!geo) return null;
  if (typeof geo === 'string') return geo;
  return (geo as { value?: string }).value ?? null;
};

// Construye el popup HTML.
const buildPopup = (asset: FarmOSEnrichedAsset, assetType: string): string => {
  const name = asset.attributes?.name || asset.name || 'Sin nombre';
  const subType = (asset.attributes as Record<string, unknown>)?.land_type as string
    || (asset.attributes as Record<string, unknown>)?.sub_type as string
    || assetType;
  const notes = asset.attributes?.notes;
  const notesText = typeof notes === 'object' ? (notes as { value?: string })?.value : notes;
  return `
    <div style="min-width:180px;font-family:system-ui;">
      <div style="font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;margin-bottom:2px;">${subType}</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a;">${name}</div>
      ${notesText ? `<div style="font-size:11px;color:#475569;margin-top:4px;">${notesText.slice(0, 80)}${notesText.length > 80 ? '…' : ''}</div>` : ''}
      <button data-asset-id="${asset.id}" class="chagra-popup-logs" style="margin-top:8px;padding:4px 10px;background:#0f172a;color:white;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;">Ver logs →</button>
    </div>
  `;
};

// Colores de tarea por tipo de log
const TASK_STYLES: Record<string, { color: string; label: string }> = {
  'log--observation': { color: '#3b82f6', label: 'Observación' },
  'log--maintenance': { color: '#f97316', label: 'Mantenimiento' },
  'log--harvest':     { color: '#22c55e', label: 'Cosecha' },
  'log--input':       { color: '#8b5cf6', label: 'Aplicación' },
  'log--activity':    { color: '#06b6d4', label: 'Tarea' },
};

export const FarmMap: React.FC<FarmMapProps> = ({ focusZoneId = null, onAssetClick, onTaskComplete, showTasks = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  const plants = useAssetStore((s) => s.plants) as FarmOSEnrichedAsset[];
  const structures = useAssetStore((s) => s.structures) as FarmOSEnrichedAsset[];
  const lands = useAssetStore((s) => s.lands) as FarmOSEnrichedAsset[];

  const [pendingTasks, setPendingTasks] = useState<Record<string, unknown>[]>([]);

  // Inicialización única del mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Restaurar posición guardada
    let savedCenter: [number, number] = DEFAULT_CENTER;
    let savedZoom = DEFAULT_ZOOM;
    try {
      const raw = localStorage.getItem(MAP_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { lat?: number; lng?: number; zoom?: number };
        if (parsed.lat && parsed.lng && parsed.zoom) {
          savedCenter = [parsed.lat, parsed.lng];
          savedZoom = parsed.zoom;
        }
      }
    } catch (_e) { /* noop */ }

    const map = L.map(containerRef.current, {
      center: savedCenter,
      zoom: savedZoom,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      minZoom: 10,
      attribution: '© OpenStreetMap',
      errorTileUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="%230f172a" width="256" height="256"/><text x="50%" y="50%" fill="%23475569" font-family="monospace" font-size="10" text-anchor="middle">tile offline</text></svg>',
    }).addTo(map);

    mapRef.current = map;
    featureGroupRef.current = L.featureGroup().addTo(map);

    // Persistir viewport al mover/zoom
    const saveViewport = () => {
      try {
        const c = map.getCenter();
        localStorage.setItem(MAP_STATE_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
      } catch (_e) { /* noop */ }
    };
    map.on('moveend', saveViewport);
    map.on('zoomend', saveViewport);

    // Delegación de click para botones "Ver logs →" dentro de popups
    if (onAssetClick) {
      map.on('popupopen', (e: L.PopupEvent) => {
        const btn = e.popup.getElement()?.querySelector('.chagra-popup-logs') as HTMLButtonElement | null;
        if (btn) {
          btn.addEventListener('click', () => {
            const assetId = btn.getAttribute('data-asset-id');
            if (assetId) onAssetClick(assetId);
          });
        }
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      featureGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar tareas pendientes con geometría
  useEffect(() => {
    if (!showTasks) { setPendingTasks([]); return; }
    (async () => {
      try {
        const all = await logCache.getAll() as unknown as Record<string, unknown>[];
        const tasks = all.filter((l) => {
          if (l['status'] !== 'pending' && (l['attributes'] as Record<string, unknown> | undefined)?.['status'] !== 'pending') return false;
          const attrs = l['attributes'] as Record<string, unknown> | undefined;
          const geo = attrs?.['intrinsic_geometry'] || attrs?.['geometry'];
          return !!geo;
        });
        setPendingTasks(tasks);
      } catch (e) {
        console.error('[FarmMap] Error cargando tareas:', e);
      }
    })();
  }, [showTasks]);

  // Re-render de capas cuando cambian los assets o el focusZoneId
  useEffect(() => {
    const map = mapRef.current;
    const fg = featureGroupRef.current;
    if (!map || !fg) return;

    fg.clearLayers();

    // Determinar qué assets dibujar según focusZoneId
    let landsToRender = lands;
    let structuresToRender = structures;
    let plantsToRender = plants;

    if (focusZoneId) {
      const filterByParent = (asset: FarmOSEnrichedAsset): boolean => {
        const rel = (asset.relationships?.parent as { data?: { id?: string }[] } | undefined)?.data
          || (asset.relationships?.location as { data?: { id?: string }[] } | undefined)?.data;
        const parentId = Array.isArray(rel) ? rel[0]?.id : (rel as { id?: string } | undefined)?.id;
        return parentId === focusZoneId;
      };
      landsToRender = lands.filter((l) => l.id === focusZoneId);
      structuresToRender = structures.filter(filterByParent);
      plantsToRender = plants.filter(filterByParent);
    }

    // 1. Lands
    for (const land of landsToRender) {
      const wkt = getWkt(land);
      if (!wkt) continue;
      const geo = wktToGeoJson(wkt) as { type: string; coordinates: number[][][] | number[] } | null;
      if (!geo) continue;
      let layer: L.Layer | undefined;
      if (geo.type === 'Polygon') {
        const latlngs = (geo.coordinates[0] as number[][]).map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
        layer = L.polygon(latlngs, STYLES.land);
      } else if (geo.type === 'Point') {
        const [lon, lat] = geo.coordinates as number[];
        layer = L.circleMarker([lat, lon] as L.LatLngTuple, { ...STYLES.land, fillOpacity: 0.3, radius: 8 });
      }
      if (layer) {
        (layer as L.Path).bindPopup(buildPopup(land, 'Zona'));
        fg.addLayer(layer);
      }
    }

    // 2. Structures
    for (const structure of structuresToRender) {
      const wkt = getWkt(structure);
      if (!wkt) continue;
      const geo = wktToGeoJson(wkt) as { type: string; coordinates: number[][][] | number[] } | null;
      if (!geo) continue;
      let layer: L.Layer | undefined;
      if (geo.type === 'Polygon') {
        const latlngs = (geo.coordinates[0] as number[][]).map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
        layer = L.polygon(latlngs, STYLES.structure);
      } else if (geo.type === 'Point') {
        const [lon, lat] = geo.coordinates as number[];
        layer = L.circleMarker([lat, lon] as L.LatLngTuple, { ...STYLES.structure, radius: 9 });
      }
      if (layer) {
        (layer as L.Path).bindPopup(buildPopup(structure, 'Estructura'));
        fg.addLayer(layer);
      }
    }

    // 3. Plants
    for (const plant of plantsToRender) {
      const wkt = getWkt(plant);
      if (!wkt) continue;
      const geo = wktToGeoJson(wkt) as { type: string; coordinates: number[][][] | number[] } | null;
      if (!geo) continue;
      let layer: L.Layer | undefined;
      if (geo.type === 'Point') {
        const [lon, lat] = geo.coordinates as number[];
        layer = L.circleMarker([lat, lon] as L.LatLngTuple, STYLES.plant);
      } else if (geo.type === 'Polygon') {
        const latlngs = (geo.coordinates[0] as number[][]).map(([lon, lat]) => [lat, lon] as L.LatLngTuple);
        layer = L.polygon(latlngs, { ...STYLES.plant, fillOpacity: 0.4 });
      }
      if (layer) {
        (layer as L.Path).bindPopup(buildPopup(plant, 'Cultivo'));
        fg.addLayer(layer);
      }
    }

    // 4. Tareas pendientes
    if (showTasks) {
      for (const task of pendingTasks) {
        const attrs = task['attributes'] as Record<string, unknown> | undefined;
        const rawGeo = attrs?.['intrinsic_geometry'] || attrs?.['geometry'];
        const taskWkt = typeof rawGeo === 'object' ? (rawGeo as { value?: string })?.value : (rawGeo as string | undefined);
        if (!taskWkt) continue;
        const geo = wktToGeoJson(taskWkt) as { type: string; coordinates: number[] } | null;
        if (!geo || geo.type !== 'Point') continue;
        const [lon, lat] = geo.coordinates;
        const taskType = task['type'] as string | undefined;
        const style = (taskType && TASK_STYLES[taskType]) ? TASK_STYLES[taskType]! : TASK_STYLES['log--activity']!;
        const taskName = task['name'] as string || attrs?.['name'] as string || 'Tarea sin título';
        const taskNotes = attrs?.['notes'];
        const notesText = typeof taskNotes === 'object' ? (taskNotes as { value?: string })?.value : (taskNotes as string | undefined);

        const marker = L.circleMarker([lat, lon] as L.LatLngTuple, {
          radius: 10,
          color: style.color,
          weight: 3,
          fillColor: style.color,
          fillOpacity: 0.5,
        });

        const popupHtml = `
          <div style="min-width:180px;font-family:system-ui;">
            <div style="font-size:10px;text-transform:uppercase;color:${style.color};font-weight:700;margin-bottom:2px;">${style.label}</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${taskName}</div>
            ${notesText ? `<div style="font-size:11px;color:#475569;margin-top:4px;">${notesText.slice(0, 100)}</div>` : ''}
            <button data-task-id="${task['id'] as string}" class="chagra-popup-complete" style="margin-top:8px;padding:6px 12px;background:${style.color};color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;width:100%;">Completar ahora ✓</button>
          </div>
        `;
        marker.bindPopup(popupHtml);
        fg.addLayer(marker);
      }

      // Delegación de click para botones "Completar ahora"
      if (onTaskComplete) {
        map.off('popupopen.tasks');
        map.on('popupopen.tasks', (e: L.PopupEvent) => {
          const btn = e.popup.getElement()?.querySelector('.chagra-popup-complete') as HTMLButtonElement | null;
          if (btn) btn.onclick = () => onTaskComplete(btn.getAttribute('data-task-id') ?? '');
        });
      }
    }

    // Encuadre automático
    if (fg.getLayers().length > 0) {
      try {
        map.fitBounds(fg.getBounds(), { padding: [30, 30], maxZoom: 18 });
      } catch (err) {
        console.warn('[FarmMap] fitBounds falló:', (err as Error).message);
      }
    }
  }, [plants, structures, lands, focusZoneId, showTasks, pendingTasks]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 bg-slate-950" />
      {plants.length === 0 && structures.length === 0 && lands.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-6 py-4 text-slate-300 text-sm">
            Sin activos georreferenciados aún.
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmMap;

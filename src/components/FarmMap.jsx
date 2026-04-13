import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAssetStore from '../store/useAssetStore';
import { useLogStore } from '../store/useLogStore';
import { wktToGeoJson } from '../utils/geo';
import { logCache } from '../db/logCache';

/**
 * FarmMap — Vista maestra de activos geolocalizados (Fase 17.2).
 *
 * Lee todos los assets con `attributes.intrinsic_geometry.value` (WKT) desde
 * el store, los parsea con `wktToGeoJson` y los dibuja como capas de Leaflet
 * tipadas por `asset_type`. Usa `L.featureGroup` para permitir encuadre
 * automático (fitBounds) tanto global como por zona filtrada.
 *
 * Props:
 *   - focusZoneId: UUID de asset--land para filtrar y hacer zoom (drill-down espacial).
 *                  Si es null, muestra toda la finca.
 *   - onAssetClick: callback(assetId) al tocar una capa. Integra con detalle/logs.
 *   - onTaskComplete: callback(logId) al completar tarea desde popup del mapa.
 *   - showTasks:  boolean — si true, renderiza capa de tareas pendientes.
 */

const DEFAULT_CENTER = [4.5306, -73.9247]; // Choachí, Cundinamarca
const DEFAULT_ZOOM = 15;
const MAP_STATE_KEY = 'chagra:v1:map_state';

// Estilos por tipo (Fase 17.2 — estilizado por asset_type).
const STYLES = {
  land: {
    color: '#92400e', // brown/amber-800 — borde marrón
    weight: 2,
    fillColor: 'transparent',
    fillOpacity: 0,
  },
  structure: {
    color: '#3b82f6', // blue-500
    weight: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
  },
  plant: {
    // CircleMarker styling
    radius: 7,
    color: '#16a34a', // green-600
    weight: 2,
    fillColor: '#22c55e', // green-500
    fillOpacity: 0.7,
  },
  default: {
    color: '#64748b', // slate-500
    weight: 2,
    fillColor: '#64748b',
    fillOpacity: 0.3,
  },
};

// Extrae el WKT desde el shape JSON:API de FarmOS.
const getWkt = (asset) => {
  const geo = asset.attributes?.intrinsic_geometry;
  if (!geo) return null;
  if (typeof geo === 'string') return geo;
  return geo.value || null;
};

// Construye el popup HTML (Leaflet acepta string o HTMLElement).
const buildPopup = (asset, assetType) => {
  const name = asset.attributes?.name || asset.name || 'Sin nombre';
  const subType = asset.attributes?.land_type || asset.attributes?.sub_type || assetType;
  const notes = asset.attributes?.notes;
  const notesText = typeof notes === 'object' ? notes?.value : notes;
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
const TASK_STYLES = {
  'log--observation': { color: '#3b82f6', label: 'Observación' },
  'log--maintenance': { color: '#f97316', label: 'Mantenimiento' },
  'log--harvest':     { color: '#22c55e', label: 'Cosecha' },
  'log--input':       { color: '#8b5cf6', label: 'Aplicación' },
  'log--activity':    { color: '#06b6d4', label: 'Tarea' },
};

export const FarmMap = ({ focusZoneId = null, onAssetClick, onTaskComplete, showTasks = false }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const featureGroupRef = useRef(null);

  const plants = useAssetStore((s) => s.plants);
  const structures = useAssetStore((s) => s.structures);
  const lands = useAssetStore((s) => s.lands);

  const [pendingTasks, setPendingTasks] = useState([]);

  // Inicialización única del mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Restaurar posición guardada (persistencia de viewport)
    let savedCenter = DEFAULT_CENTER;
    let savedZoom = DEFAULT_ZOOM;
    try {
      const raw = localStorage.getItem(MAP_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.lat && parsed.lng && parsed.zoom) {
          savedCenter = [parsed.lat, parsed.lng];
          savedZoom = parsed.zoom;
        }
      }
    } catch (e) { /* noop */ }

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

    // Persistir viewport al mover/zoom (Fase 17 — topografía compleja)
    const saveViewport = () => {
      try {
        const c = map.getCenter();
        localStorage.setItem(MAP_STATE_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
      } catch (e) { /* noop */ }
    };
    map.on('moveend', saveViewport);
    map.on('zoomend', saveViewport);

    // Delegación de click para botones "Ver logs →" dentro de popups
    if (onAssetClick) {
      map.on('popupopen', (e) => {
        const btn = e.popup.getElement()?.querySelector('.chagra-popup-logs');
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
        const all = await logCache.getAll();
        const tasks = all.filter((l) => {
          if (l.status !== 'pending' && l.attributes?.status !== 'pending') return false;
          const geo = l.attributes?.intrinsic_geometry || l.attributes?.geometry;
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
      // Filtrar plants y structures cuyo parent apunte a la zona enfocada
      const filterByParent = (asset) => {
        const rel = asset.relationships?.parent?.data || asset.relationships?.location?.data;
        const parentId = Array.isArray(rel) ? rel[0]?.id : rel?.id;
        return parentId === focusZoneId;
      };
      landsToRender = lands.filter((l) => l.id === focusZoneId);
      structuresToRender = structures.filter(filterByParent);
      plantsToRender = plants.filter(filterByParent);
    }

    // 1. Lands (polígonos marrones, fondo transparente)
    for (const land of landsToRender) {
      const wkt = getWkt(land);
      if (!wkt) continue;
      const geo = wktToGeoJson(wkt);
      if (!geo) continue;
      let layer;
      if (geo.type === 'Polygon') {
        const latlngs = geo.coordinates[0].map(([lon, lat]) => [lat, lon]);
        layer = L.polygon(latlngs, STYLES.land);
      } else if (geo.type === 'Point') {
        const [lon, lat] = geo.coordinates;
        layer = L.circleMarker([lat, lon], { ...STYLES.land, fillOpacity: 0.3, radius: 8 });
      }
      if (layer) {
        layer.bindPopup(buildPopup(land, 'Zona'));
        fg.addLayer(layer);
      }
    }

    // 2. Structures (polígonos azules)
    for (const structure of structuresToRender) {
      const wkt = getWkt(structure);
      if (!wkt) continue;
      const geo = wktToGeoJson(wkt);
      if (!geo) continue;
      let layer;
      if (geo.type === 'Polygon') {
        const latlngs = geo.coordinates[0].map(([lon, lat]) => [lat, lon]);
        layer = L.polygon(latlngs, STYLES.structure);
      } else if (geo.type === 'Point') {
        const [lon, lat] = geo.coordinates;
        layer = L.circleMarker([lat, lon], { ...STYLES.structure, radius: 9 });
      }
      if (layer) {
        layer.bindPopup(buildPopup(structure, 'Estructura'));
        fg.addLayer(layer);
      }
    }

    // 3. Plants (circle markers verdes)
    for (const plant of plantsToRender) {
      const wkt = getWkt(plant);
      if (!wkt) continue;
      const geo = wktToGeoJson(wkt);
      if (!geo) continue;
      let layer;
      if (geo.type === 'Point') {
        const [lon, lat] = geo.coordinates;
        layer = L.circleMarker([lat, lon], STYLES.plant);
      } else if (geo.type === 'Polygon') {
        const latlngs = geo.coordinates[0].map(([lon, lat]) => [lat, lon]);
        layer = L.polygon(latlngs, { ...STYLES.plant, fillOpacity: 0.4 });
      }
      if (layer) {
        layer.bindPopup(buildPopup(plant, 'Cultivo'));
        fg.addLayer(layer);
      }
    }

    // 4. Tareas pendientes (circle markers con color por tipo)
    if (showTasks) {
      for (const task of pendingTasks) {
        const rawGeo = task.attributes?.intrinsic_geometry || task.attributes?.geometry;
        const taskWkt = typeof rawGeo === 'object' ? rawGeo?.value : rawGeo;
        if (!taskWkt) continue;
        const geo = wktToGeoJson(taskWkt);
        if (!geo || geo.type !== 'Point') continue;
        const [lon, lat] = geo.coordinates;
        const style = TASK_STYLES[task.type] || TASK_STYLES['log--activity'];
        const taskName = task.name || task.attributes?.name || 'Tarea sin título';
        const taskNotes = task.attributes?.notes;
        const notesText = typeof taskNotes === 'object' ? taskNotes?.value : taskNotes;

        const marker = L.circleMarker([lat, lon], {
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
            <button data-task-id="${task.id}" class="chagra-popup-complete" style="margin-top:8px;padding:6px 12px;background:${style.color};color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;width:100%;">Completar ahora ✓</button>
          </div>
        `;
        marker.bindPopup(popupHtml);
        fg.addLayer(marker);
      }

      // Delegación de click para botones "Completar ahora" de tareas
      if (onTaskComplete) {
        map.off('popupopen.tasks');
        map.on('popupopen.tasks', (e) => {
          const btn = e.popup.getElement()?.querySelector('.chagra-popup-complete');
          if (btn) btn.onclick = () => onTaskComplete(btn.getAttribute('data-task-id'));
        });
      }
    }

    // Encuadre automático: fitBounds si hay capas con geometría
    if (fg.getLayers().length > 0) {
      try {
        map.fitBounds(fg.getBounds(), { padding: [30, 30], maxZoom: 18 });
      } catch (err) {
        console.warn('[FarmMap] fitBounds falló:', err.message);
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

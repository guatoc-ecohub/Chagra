import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Maximize2 } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import { wktToGeoJson } from '../utils/geo';
import { logCache } from '../db/logCache';
import EmptyState from './common/EmptyState';
import '../styles/farm-map.css';

/**
 * FarmMap, Vista maestra de activos geolocalizados (Fase 17.2).
 *
 * Lee todos los assets con `attributes.intrinsic_geometry.value` (WKT) desde
 * el store, los parsea con `wktToGeoJson` y los dibuja como capas de Leaflet
 * tipadas por `asset_type`. Usa `L.featureGroup` para permitir encuadre
 * automático (fitBounds) tanto global como por zona filtrada.
 *
 * Capa visual (pasada 2026-07): chrome de Leaflet con la piel Chagra
 * (farm-map.css, theme-aware), leyenda de campo, chips de navegación por
 * zona (solo viewport, no toca datos) y EmptyState estándar. Todo movimiento
 * de cámara respeta prefers-reduced-motion.
 *
 * Props:
 *   - focusZoneId: UUID de asset--land para filtrar y hacer zoom (drill-down espacial).
 *                  Si es null, muestra toda la finca.
 *   - onAssetClick: callback(assetId) al tocar una capa. Integra con detalle/logs.
 *   - onTaskComplete: callback(logId) al completar tarea desde popup del mapa.
 *   - showTasks:  boolean, si true, renderiza capa de tareas pendientes.
 */

const DEFAULT_CENTER = [4.5306, -73.9247]; // Choachí, Cundinamarca
const DEFAULT_ZOOM = 15;
const MAP_STATE_KEY = 'chagra:v1:map_state';

// Estilos por tipo (Fase 17.2, estilizado por asset_type).
const STYLES = {
  land: {
    color: '#92400e', // brown/amber-800, borde marrón
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

// Leyenda de campo: qué significa cada color del mapa. Espeja STYLES /
// TASK_STYLES — si cambia un color arriba, cambia acá.
const LEGEND_ASSETS = [
  { label: 'Zona', color: STYLES.land.color, outline: true },
  { label: 'Estructura', color: STYLES.structure.color },
  { label: 'Cultivo', color: STYLES.plant.fillColor },
];

// Movimiento de cámara accesible: sin animación si el sistema pide calma.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Extrae el WKT desde el shape JSON:API de FarmOS.
const getWkt = (asset) => {
  const geo = asset.attributes?.intrinsic_geometry;
  if (!geo) return null;
  if (typeof geo === 'string') return geo;
  return geo.value || null;
};

// Id del parent (zona) de un asset, shape JSON:API.
const getParentId = (asset) => {
  const rel = asset.relationships?.parent?.data || asset.relationships?.location?.data;
  return Array.isArray(rel) ? rel[0]?.id : rel?.id;
};

// Escape mínimo para strings que van dentro del HTML del popup.
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Construye el popup HTML (Leaflet acepta string o HTMLElement).
// Estilos en farm-map.css (.chagra-popup-*), theme-aware.
const buildPopup = (asset, assetType) => {
  const name = asset.attributes?.name || asset.name || 'Sin nombre';
  const subType = asset.attributes?.land_type || asset.attributes?.sub_type || assetType;
  const notes = asset.attributes?.notes;
  const notesText = typeof notes === 'object' ? notes?.value : notes;
  return `
    <div class="chagra-popup">
      <div class="chagra-popup-tipo">${esc(subType)}</div>
      <div class="chagra-popup-nombre">${esc(name)}</div>
      ${notesText ? `<div class="chagra-popup-notas">${esc(notesText.slice(0, 80))}${notesText.length > 80 ? '…' : ''}</div>` : ''}
      <button data-asset-id="${esc(asset.id)}" class="chagra-popup-logs chagra-popup-btn">Ver historial →</button>
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
  // Capa Leaflet de cada zona, para navegar desde los chips (solo viewport).
  const landLayersRef = useRef(new Map());

  const plants = useAssetStore((s) => s.plants);
  const structures = useAssetStore((s) => s.structures);
  const lands = useAssetStore((s) => s.lands);

  const [pendingTasks, setPendingTasks] = useState([]);
  // Chip activo (id de zona o null = toda la finca). Solo estado visual.
  const [activeZoneChip, setActiveZoneChip] = useState(null);

  // Chips de navegación: zonas con geometría + conteo de cultivos por zona.
  // Lectura pura del store (misma relación parent que el filtro del mapa).
  const zoneChips = useMemo(() => {
    return lands
      .filter((land) => getWkt(land))
      .map((land) => ({
        id: land.id,
        name: land.attributes?.name || land.name || 'Sin nombre',
        plantCount: plants.filter((p) => getParentId(p) === land.id).length,
      }));
  }, [lands, plants]);

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
    } catch (_e) { /* noop */ }

    const map = L.map(containerRef.current, {
      center: savedCenter,
      zoom: savedZoom,
      zoomControl: true,
      attributionControl: false,
      // prefers-reduced-motion: cámara sin animaciones (zoom/fade vía CSS).
      zoomAnimation: !prefersReducedMotion(),
      fadeAnimation: !prefersReducedMotion(),
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

    // Persistir viewport al mover/zoom (Fase 17, topografía compleja)
    const saveViewport = () => {
      try {
        const c = map.getCenter();
        localStorage.setItem(MAP_STATE_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
      } catch (_e) { /* noop */ }
    };
    map.on('moveend', saveViewport);
    map.on('zoomend', saveViewport);

    // Delegación de click para botones "Ver historial →" dentro de popups
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
      landLayersRef.current = new Map();
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
    landLayersRef.current = new Map();

    // Determinar qué assets dibujar según focusZoneId
    let landsToRender = lands;
    let structuresToRender = structures;
    let plantsToRender = plants;

    if (focusZoneId) {
      // Filtrar plants y structures cuyo parent apunte a la zona enfocada
      const filterByParent = (asset) => getParentId(asset) === focusZoneId;
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
        landLayersRef.current.set(land.id, layer);
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
          <div class="chagra-popup" style="--tarea-color:${style.color}">
            <div class="chagra-popup-tipo chagra-popup-tipo--tarea">${esc(style.label)}</div>
            <div class="chagra-popup-nombre">${esc(taskName)}</div>
            ${notesText ? `<div class="chagra-popup-notas">${esc(notesText.slice(0, 100))}</div>` : ''}
            <button data-task-id="${esc(task.id)}" class="chagra-popup-complete chagra-popup-btn">Completar ahora ✓</button>
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
        map.fitBounds(fg.getBounds(), {
          padding: [30, 30],
          maxZoom: 18,
          animate: !prefersReducedMotion(),
        });
      } catch (err) {
        console.warn('[FarmMap] fitBounds falló:', err.message);
      }
    }
  }, [plants, structures, lands, focusZoneId, showTasks, pendingTasks, onTaskComplete]);

  // Navegación por chip: encuadra la zona y abre su popup. Solo mueve la
  // cámara — no filtra datos ni toca el store.
  const goToZone = (zoneId) => {
    const map = mapRef.current;
    const layer = landLayersRef.current.get(zoneId);
    if (!map || !layer) return;
    setActiveZoneChip(zoneId);
    const animate = !prefersReducedMotion();
    if (typeof layer.getBounds === 'function') {
      map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 18, animate });
    } else if (typeof layer.getLatLng === 'function') {
      map.setView(layer.getLatLng(), 17, { animate });
    }
    if (typeof layer.openPopup === 'function') layer.openPopup();
  };

  // "Toda la finca": vuelve al encuadre global de todo lo dibujado.
  const goToAll = () => {
    const map = mapRef.current;
    const fg = featureGroupRef.current;
    setActiveZoneChip(null);
    if (!map || !fg || fg.getLayers().length === 0) return;
    try {
      map.fitBounds(fg.getBounds(), {
        padding: [30, 30],
        maxZoom: 18,
        animate: !prefersReducedMotion(),
      });
    } catch (_e) { /* noop */ }
  };

  const isEmpty = plants.length === 0 && structures.length === 0 && lands.length === 0;
  const showZoneChips = !focusZoneId && zoneChips.length > 0;

  return (
    <div className="chagra-farm-map relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 bg-slate-950" />

      {/* Chips de lugares: navegación entre zonas sin salir del mapa */}
      {showZoneChips && (
        <nav className="chagra-map-zonas" aria-label="Ir a un lugar de la finca">
          <button
            type="button"
            className="chagra-map-chip"
            aria-pressed={activeZoneChip === null}
            onClick={goToAll}
            data-testid="farm-map-chip-all"
          >
            <Maximize2 size={12} aria-hidden="true" />
            <span>Toda la finca</span>
          </button>
          {zoneChips.map((zone) => (
            <button
              key={zone.id}
              type="button"
              className="chagra-map-chip"
              aria-pressed={activeZoneChip === zone.id}
              onClick={() => goToZone(zone.id)}
              data-testid={`farm-map-chip-${zone.id}`}
            >
              <MapPin size={12} aria-hidden="true" />
              <span>{zone.name}</span>
              {zone.plantCount > 0 && (
                <span
                  className="chagra-map-chip-num"
                  aria-label={`${zone.plantCount} cultivos`}
                >
                  {zone.plantCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Leyenda de campo: qué significa cada color */}
      {!isEmpty && (
        <div className="chagra-map-leyenda" data-testid="farm-map-legend">
          {LEGEND_ASSETS.map((item) => (
            <span key={item.label} className="chagra-map-leyenda-item">
              <span
                aria-hidden="true"
                className={`chagra-map-leyenda-swatch${item.outline ? ' chagra-map-leyenda-swatch--contorno' : ''}`}
                style={item.outline ? { color: item.color } : { background: item.color }}
              />
              {item.label}
            </span>
          ))}
          {showTasks && Object.entries(TASK_STYLES).map(([type, style]) => (
            <span key={type} className="chagra-map-leyenda-item">
              <span
                aria-hidden="true"
                className="chagra-map-leyenda-swatch"
                style={{ background: style.color }}
              />
              {style.label}
            </span>
          ))}
        </div>
      )}

      {/* Estado vacío honesto: el mapa sigue detrás (navegable), la card invita */}
      {isEmpty && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center p-6 pointer-events-none">
          <div className="chagra-map-empty-card">
            <EmptyState
              size="compact"
              icon={MapPin}
              title="Sin lugares en el mapa todavía"
              description="Cuando registre sus zonas y siembras con ubicación, aquí las verá dibujadas sobre su finca."
              data-testid="farm-map-empty"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmMap;

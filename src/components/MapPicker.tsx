import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, LocateFixed, Check, Undo2 } from 'lucide-react';
import { latLngToPoint, latLngsToPolygon } from '../utils/geo';

/**
 * MapPicker — Modal de selección/dibujo de geometría (Fase 17.3).
 *
 * Props:
 *   - mode:       "point" | "polygon"
 *   - initial:    GeoJSON geometry opcional para pre-cargar
 *   - onSave:     callback(geoJsonGeometry)
 *   - onCancel:   callback()
 *   - center:     [lat, lng] opcional
 */

interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type GeoGeometry = GeoPoint | GeoPolygon | null;

interface MapPickerProps {
  mode?: 'point' | 'polygon';
  initial?: GeoGeometry;
  onSave: (geometry: GeoGeometry) => void;
  onCancel: () => void;
  center?: [number, number];
}

const DEFAULT_CENTER: [number, number] = [4.5306, -73.9247];
const DEFAULT_ZOOM = 17;



export const MapPicker: React.FC<MapPickerProps> = ({
  mode = 'point',
  initial = null,
  onSave,
  onCancel,
  center = DEFAULT_CENTER,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.Layer | null>(null);
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [marker, setMarker] = useState<L.LatLng | null>(null);

  // Inicializar Leaflet una sola vez al montar
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
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

    // Pre-cargar geometría inicial si existe
    if (initial) {
      if (initial.type === 'Point') {
        const [lng, lat] = initial.coordinates;
        const m = L.marker([lat, lng]).addTo(map);
        layerRef.current = m;
        setMarker(L.latLng(lat, lng));
        map.setView([lat, lng], DEFAULT_ZOOM);
      } else if (initial.type === 'Polygon') {
        const ring = initial.coordinates[0]?.map(([lng, lat]) => [lat, lng] as L.LatLngTuple) ?? [];
        const poly = L.polygon(ring, { color: '#3b82f6' }).addTo(map);
        layerRef.current = poly;
        setPoints(ring.map(([lat, lng]) => L.latLng(lat, lng)));
        map.fitBounds(poly.getBounds());
      }
    }

    // Click handler según modo
    const onClick = (e: L.LeafletMouseEvent) => {
      if (mode === 'point') {
        if (layerRef.current) map.removeLayer(layerRef.current);
        const m = L.marker(e.latlng).addTo(map);
        layerRef.current = m;
        setMarker(e.latlng);
      } else if (mode === 'polygon') {
        setPoints((prev) => {
          const next = [...prev, e.latlng];
          if (layerRef.current) map.removeLayer(layerRef.current);
          if (next.length >= 2) {
            layerRef.current = L.polyline(next, { color: '#3b82f6' }).addTo(map);
          }
          return next;
        });
      }
    };
    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinishPolygon = () => {
    if (points.length < 3) return;
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) map.removeLayer(layerRef.current);
    const poly = L.polygon(points, { color: '#3b82f6', fillOpacity: 0.2 }).addTo(map);
    layerRef.current = poly;
  };

  const handleUndo = () => {
    if (mode !== 'polygon') return;
    const next = points.slice(0, -1);
    setPoints(next);
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (next.length >= 2) {
      layerRef.current = L.polyline(next, { color: '#3b82f6' }).addTo(map);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      console.warn('[MapPicker] Geolocalización no disponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const map = mapRef.current;
        if (!map) return;
        map.setView(latlng, DEFAULT_ZOOM);
        if (mode === 'point') {
          if (layerRef.current) map.removeLayer(layerRef.current);
          const m = L.marker(latlng).addTo(map);
          layerRef.current = m;
          setMarker(latlng);
        }
      },
      (err) => {
        console.error('[MapPicker] Error GPS:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = () => {
    if (mode === 'point') {
      if (!marker) return;
      onSave(latLngToPoint(marker) as GeoPoint);
    } else if (mode === 'polygon') {
      if (points.length < 3) return;
      onSave(latLngsToPolygon(points) as GeoPolygon);
    }
  };

  const canSave = mode === 'point' ? !!marker : points.length >= 3;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex flex-col">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <MapPin size={20} className="text-blue-400" />
          <h3 className="font-bold">
            {mode === 'point' ? 'Marcar ubicación' : 'Definir área'}
          </h3>
          {mode === 'polygon' && (
            <span className="text-xs text-slate-400 ml-2">
              {points.length < 3
                ? `${points.length}/3 vértices mínimos`
                : `${points.length} vértices`}
            </span>
          )}
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 bg-slate-950" />

      <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUseLocation}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <LocateFixed size={16} /> Mi ubicación
          </button>
          {mode === 'polygon' && points.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Undo2 size={16} /> Deshacer
              </button>
              {points.length >= 3 && (
                <button
                  type="button"
                  onClick={handleFinishPolygon}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold"
                >
                  Cerrar polígono
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Check size={16} /> Guardar geometría
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;

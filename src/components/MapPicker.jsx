import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, LocateFixed, Check, Undo2, Footprints, Square, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { latLngToPoint, latLngsToPolygon } from '../utils/geo';
import useAssetStore from '../store/useAssetStore';

// Extrae centroide [lat, lng] de un asset land con geometría (Point o Polygon).
// Si la geometría es un Polygon, calcula el promedio de todos los vértices.
// Si no tiene geometría parseable, retorna null.
const extractZoneCentroid = (zone) => {
  const geo = zone?.attributes?.intrinsic_geometry;
  const wktOrObj = typeof geo === 'object' ? geo?.value : geo;
  if (!wktOrObj || typeof wktOrObj !== 'string') return null;
  // POINT(lng lat)
  const ptMatch = wktOrObj.match(/POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i);
  if (ptMatch) return [parseFloat(ptMatch[2]), parseFloat(ptMatch[1])];
  // POLYGON((lng1 lat1, lng2 lat2, ...))
  const polyMatch = wktOrObj.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
  if (polyMatch) {
    const coords = polyMatch[1].split(',').map((c) => c.trim().split(/\s+/).map(parseFloat));
    if (coords.length === 0) return null;
    const sumLat = coords.reduce((s, c) => s + c[1], 0);
    const sumLng = coords.reduce((s, c) => s + c[0], 0);
    return [sumLat / coords.length, sumLng / coords.length];
  }
  return null;
};

// Threshold para warning de baja precisión. Brave con Shields up devuelve
// posiciones gruesas (>1km) sin emitir error — el usuario veía "ubicación
// capturada" pero el punto estaba a kilómetros del lugar real. Miguel
// reportó este patrón 2026-05-02. Ahora si accuracy > 500m, mostramos un
// warning explícito mencionando Brave Shields.
const LOW_ACCURACY_THRESHOLD_M = 500;

/**
 * MapPicker — Modal de selección/dibujo de geometría (Fase 17.3).
 *
 * Soporta dos modos:
 *   - mode="point":   click en el mapa o botón "Usar mi ubicación" → POINT.
 *   - mode="polygon": click para añadir vértices; botón "Finalizar" cierra el ring.
 *
 * Tiles se cargan desde /tiles/{z}/{x}/{y}.png (servidos por Nginx desde
 * /mnt/fast/appdata/farmos-pwa/tiles para operación offline). Si el Service
 * Worker no ha cacheado los tiles o no existen, Leaflet mostrará el layer
 * vacío — la geometría sigue siendo dibujable y persistible.
 *
 * Props:
 *   - mode:       "point" | "polygon"
 *   - initial:    GeoJSON geometry opcional para pre-cargar
 *   - onSave:     callback(geoJsonGeometry)
 *   - onCancel:   callback()
 *   - center:     [lat, lng] opcional, default finca principal aproximado
 */

// Centro por defecto: Choachí, Cundinamarca (área aproximada finca principal).
// Se sobreescribe por `center` prop o por la primera geolocalización.
const DEFAULT_CENTER = [4.5306, -73.9247];
const DEFAULT_ZOOM = 17;

export const MapPicker = ({
  mode = 'point',
  initial = null,
  onSave,
  onCancel,
  center,  // deja undefined para usar el resolver adaptativo (zona del usuario o Choachí)
}) => {
  // Resolver adaptativo: si el caller no provee `center` explícito, usar
  // centroide de la primera zona del usuario con geometría. Fallback a
  // DEFAULT_CENTER Choachí cuando la finca no tiene zonas registradas.
  // Miguel UX 2026-05-03: reduce fricción en operadores fuera de Choachí.
  const lands = useAssetStore((s) => s.lands);
  const resolvedCenter = useMemo(() => {
    if (center) return center;
    for (const land of lands || []) {
      const c = extractZoneCentroid(land);
      if (c) return c;
    }
    return DEFAULT_CENTER;
  }, [center, lands]);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null); // capa de la geometría dibujada
  const watchIdRef = useRef(null); // id del watchPosition cuando traza caminando
  const [points, setPoints] = useState([]); // polígono en construcción
  const [marker, setMarker] = useState(null); // punto actual
  // Modo "trazar caminando": usa navigator.geolocation.watchPosition para
  // ir sumando vertices al polígono mientras el operario recorre el
  // perimetro del area (ej. un invernadero). Solo disponible en mode=polygon.
  const [isWalking, setIsWalking] = useState(false);
  // Estado machine GPS: idle → locating → located | low-accuracy | failed.
  // Renderizado como banner persistente arriba del mapa para que el operador
  // sepa qué está pasando — antes "Mi ubicación" silenciaba errores y el
  // usuario quedaba viendo el mapa en DEFAULT_CENTER sin saber por qué.
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsResult, setGpsResult] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.brave?.isBrave) {
      navigator.brave.isBrave().then((b) => setIsBrave(!!b)).catch(() => {});
    }
  }, []);

  // Inicializar Leaflet una sola vez al montar
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: resolvedCenter,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

    // Tiles OSM con subdominios; fallback SVG offline para tiles no resueltos.
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
        setMarker({ lat, lng });
        map.setView([lat, lng], DEFAULT_ZOOM);
      } else if (initial.type === 'Polygon') {
        const ring = initial.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const poly = L.polygon(ring, { color: '#3b82f6' }).addTo(map);
        layerRef.current = poly;
        setPoints(ring.map(([lat, lng]) => ({ lat, lng })));
        map.fitBounds(poly.getBounds());
      }
    }

    // Click handler según modo
    const onClick = (e) => {
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
      // Cleanup del watchPosition si quedo activo al desmontar
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle del modo "trazar caminando": al activar, arranca un watchPosition
  // con alta precision que va anadiendo vertices al polygon a medida que el
  // GPS reporta nuevas coordenadas (tipicamente cada 1-3s segun el dispositivo).
  // Desactivar detiene la captura — el polygon queda con los vertices
  // acumulados y el usuario puede editarlo con Undo / Cerrar polígono.
  const toggleWalkRecording = () => {
    if (mode !== 'polygon') return;
    if (isWalking) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWalking(false);
      return;
    }
    if (!navigator.geolocation) {
      console.warn('[MapPicker] Geolocalización no disponible para modo walk');
      return;
    }
    // Limpia cualquier vertice previo y arranca la captura
    setPoints([]);
    const map = mapRef.current;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    setIsWalking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPoints((prev) => {
          const next = [...prev, latlng];
          if (layerRef.current) map.removeLayer(layerRef.current);
          if (next.length >= 2) {
            layerRef.current = L.polyline(next, { color: '#10b981', weight: 4, opacity: 0.85 }).addTo(map);
          }
          map.panTo([latlng.lat, latlng.lng]);
          return next;
        });
      },
      (err) => {
        console.error('[MapPicker] Error watchPosition:', err.message);
        setIsWalking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      },
    );
  };

  const handleFinishPolygon = () => {
    if (points.length < 3) return;
    const map = mapRef.current;
    if (layerRef.current) map.removeLayer(layerRef.current);
    const poly = L.polygon(points, { color: '#3b82f6', fillOpacity: 0.2 }).addTo(map);
    layerRef.current = poly;
  };

  const handleUndo = () => {
    if (mode !== 'polygon') return;
    const next = points.slice(0, -1);
    setPoints(next);
    const map = mapRef.current;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (next.length >= 2) {
      layerRef.current = L.polyline(next, { color: '#3b82f6' }).addTo(map);
    }
  };

  // Lectura de GPS reutilizada por:
  //   (a) auto-locate al abrir el modal (useEffect tras montar Leaflet)
  //   (b) click del botón "Mi ubicación"
  // `placeMarker=true` solo cuando es action explícita del usuario o al abrir
  // sin geometría inicial (no queremos pisar un marker preexistente al re-locate).
  const captureGps = useCallback((placeMarker) => {
    if (!navigator.geolocation) {
      setGpsStatus('failed');
      setGpsError('Geolocalización no disponible en este navegador.');
      return;
    }
    setGpsStatus('locating');
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy || 0;
        setGpsResult({ lat: latlng.lat, lon: latlng.lng, accuracy });
        const map = mapRef.current;
        if (!map) return;
        map.setView([latlng.lat, latlng.lng], DEFAULT_ZOOM);
        if (placeMarker && mode === 'point') {
          if (layerRef.current) map.removeLayer(layerRef.current);
          const m = L.marker(latlng).addTo(map);
          layerRef.current = m;
          setMarker(latlng);
        }
        // Brave Shields a veces devuelve coords gruesas (>1km) sin disparar
        // error. Detectamos via accuracy y avisamos al usuario explícitamente.
        if (accuracy > LOW_ACCURACY_THRESHOLD_M) {
          setGpsStatus('low-accuracy');
        } else {
          setGpsStatus('located');
        }
      },
      (err) => {
        let msg = 'No se pudo obtener tu ubicación.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado por el navegador.';
        else if (err.code === 2) msg = 'GPS no disponible (sin señal o desactivado).';
        else if (err.code === 3) msg = 'Tiempo agotado esperando al GPS (15s).';
        console.error('[MapPicker] Error GPS:', err.code, err.message);
        setGpsStatus('failed');
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  }, [mode]);

  // Auto-locate al abrir el modal (solo si no hay geometría inicial cargada).
  // Con esto el operador ve el mapa centrado en su ubicación apenas abre,
  // en lugar del DEFAULT_CENTER de Choachí — fixing reporte Miguel 2026-05-02
  // "sale el mapa muy desubicado y no hace gran cosa".
  useEffect(() => {
    if (initial) return; // respetar geometría pre-cargada
    // Pequeño delay para que Leaflet termine de montar antes del setView
    const t = setTimeout(() => captureGps(false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseLocation = () => captureGps(true);

  const handleSave = () => {
    if (mode === 'point') {
      if (!marker) return;
      onSave(latLngToPoint(marker));
    } else if (mode === 'polygon') {
      if (points.length < 3) return;
      onSave(latLngsToPolygon(points));
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
            <span className="text-xs text-slate-400 ml-2 flex items-center gap-1.5">
              {points.length < 3
                ? `${points.length}/3 vértices mínimos`
                : `${points.length} vértices`}
              {isWalking && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                  REC
                </span>
              )}
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

      {/* GPS status banner — siempre visible para no silenciar errores. */}
      {gpsStatus !== 'idle' && (
        <div
          className={`px-4 py-2 text-xs flex items-center gap-2 border-b border-slate-800 ${
            gpsStatus === 'locating' ? 'bg-slate-900 text-blue-300' :
            gpsStatus === 'located' ? 'bg-emerald-900/30 text-emerald-300' :
            gpsStatus === 'low-accuracy' ? 'bg-amber-900/30 text-amber-300' :
            'bg-red-900/30 text-red-300'
          }`}
        >
          {gpsStatus === 'locating' && (
            <>
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>Obteniendo tu ubicación GPS…</span>
            </>
          )}
          {gpsStatus === 'located' && gpsResult && (
            <>
              <LocateFixed size={14} className="shrink-0" />
              <span className="font-mono text-[11px] truncate">
                {gpsResult.lat.toFixed(5)}, {gpsResult.lon.toFixed(5)} (±{Math.round(gpsResult.accuracy)}m)
              </span>
            </>
          )}
          {gpsStatus === 'low-accuracy' && gpsResult && (
            <>
              <AlertTriangle size={14} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold">Precisión baja: ±{Math.round(gpsResult.accuracy)}m. </span>
                {isBrave ? (
                  <span>
                    Brave Shields puede estar bloqueando el GPS preciso. Click en el escudo
                    <Shield size={11} className="inline mx-1" />
                    de la barra y desactivar &quot;Block fingerprinting&quot; para este sitio.
                  </span>
                ) : (
                  <span>Reintentá a cielo abierto o desactivá filtros de fingerprinting del navegador.</span>
                )}
              </div>
            </>
          )}
          {gpsStatus === 'failed' && (
            <>
              <AlertTriangle size={14} className="shrink-0" />
              <span className="flex-1">{gpsError || 'GPS no disponible.'} Podés marcar el punto haciendo click en el mapa.</span>
              <button
                type="button"
                onClick={() => captureGps(true)}
                className="px-2 py-0.5 rounded bg-red-800/40 border border-red-700 text-red-200 hover:bg-red-800/60 text-[11px] font-bold shrink-0"
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 bg-slate-950" />

      <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={gpsStatus === 'locating'}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            {gpsStatus === 'locating'
              ? <><Loader2 size={16} className="animate-spin" /> Buscando…</>
              : <><LocateFixed size={16} /> Mi ubicación</>}
          </button>
          {mode === 'polygon' && (
            <button
              type="button"
              onClick={toggleWalkRecording}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${isWalking
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] motion-safe:animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              aria-pressed={isWalking}
              aria-label={isWalking ? 'Detener trazado caminando' : 'Trazar caminando'}
            >
              {isWalking ? <Square size={16} /> : <Footprints size={16} />}
              {isWalking ? 'Detener' : 'Caminar'}
            </button>
          )}
          {mode === 'polygon' && points.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                disabled={isWalking}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Undo2 size={16} /> Deshacer
              </button>
              {points.length >= 3 && (
                <button
                  type="button"
                  onClick={handleFinishPolygon}
                  disabled={isWalking}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-sm font-bold"
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

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  MapPin,
  Mountain,
  Sprout,
  Check,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
import {
  resolveUbicacion,
  forwardGeocode,
  getPisoTermicoInfo,
} from '../services/locationService';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { saveProfile } from '../services/userProfileService';

// Fix del marcador por defecto de Leaflet (bundlers no resuelven las URLs
// relativas del CSS). Mismo patrón que MultiFincaGlobe.
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Mapeo piso térmico → clases Tailwind (estáticas para el JIT).
const PISO_CLASSES = {
  orange: 'text-orange-300 bg-orange-950/40 border-orange-700/50',
  amber: 'text-amber-300 bg-amber-950/40 border-amber-700/50',
  green: 'text-green-300 bg-green-950/40 border-green-700/50',
  indigo: 'text-indigo-300 bg-indigo-950/40 border-indigo-700/50',
  sky: 'text-sky-300 bg-sky-950/40 border-sky-700/50',
};

/**
 * PisoTermicoBadge — badge visual del piso térmico con color por estrato.
 * Reusa la clasificación de AltitudeBadge pero con etiqueta + rango.
 */
function PisoTermicoBadge({ info }) {
  if (!info) return null;
  const cls = PISO_CLASSES[info.color] || PISO_CLASSES.green;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${cls}`}
      data-testid="piso-termico-badge"
    >
      <span aria-hidden>{info.emoji}</span>
      Piso {info.label}
      <span className="opacity-70 font-mono text-xs">({info.rango})</span>
    </span>
  );
}

/**
 * LocationDetectedScreen — pantalla de confirmación visual de ubicación (#201).
 *
 * Se muestra cuando el onboarding o el botón "Configurar ubicación" resuelve
 * una ubicación (GPS o municipio escrito). Presenta:
 *   - Mini mapa (react-leaflet) con marcador en lat/lng.
 *   - Badge de piso térmico con color (cálido/templado/frío/páramo).
 *   - Datos enriquecidos: municipio, departamento, altitud, piso térmico,
 *     cultivos recomendados para la zona.
 *   - Botón "Confirmar" → guarda en fincaActiveStore + perfil.
 *
 * DEGRADACIÓN GRACEFUL: si no hay red, muestra lo que pueda derivar
 * localmente (piso térmico desde altitud, recomendaciones por zona) y
 * permite confirmar igual.
 *
 * Español colombiano (tú/usted, SIN voseo argentino).
 *
 * Props:
 *   - coords:        { lat, lng } opcional inicial (de GPS).
 *   - initialMunicipio: string opcional para arrancar por búsqueda escrita.
 *   - altitud:       msnm opcional ya conocido (evita red de elevación).
 *   - onConfirm(loc): callback con la ubicación enriquecida confirmada.
 *   - onBack():       cierre/atrás.
 */
export default function LocationDetectedScreen({
  coords = null,
  initialMunicipio = '',
  altitud = null,
  onConfirm,
  onBack,
}) {
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(initialMunicipio);
  const [searchError, setSearchError] = useState(null);
  const setFincaIndoorZone = useFincaActiveStore((s) => s.setIndoorZone);

  // Resolver inicial si vienen coords.
  useEffect(() => {
    let alive = true;
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      setLoading(true);
      resolveUbicacion({ lat: coords.lat, lng: coords.lng, altitud })
        .then((r) => {
          if (alive) setLoc(r);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }
    return () => {
      alive = false;
    };
  }, [coords, altitud]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearchError(null);
    try {
      const hit = await forwardGeocode(q);
      if (!hit) {
        setSearchError(
          'No encontramos ese lugar. Revisa la escritura o intenta con "Municipio, Departamento".',
        );
        return;
      }
      const enriched = await resolveUbicacion({ lat: hit.lat, lng: hit.lng });
      // Preferir el municipio/departamento del forward-geocode si el
      // reverse no lo trajo.
      setLoc({
        ...enriched,
        municipio: enriched.municipio || hit.municipio,
        departamento: enriched.departamento || hit.departamento,
      });
    } catch (e) {
      console.warn('[LocationDetected] búsqueda falló:', e);
      setSearchError('Hubo un problema buscando ese lugar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Piso térmico derivado en vivo (offline-safe) si tenemos altitud.
  const pisoInfo = useMemo(() => {
    if (loc?.pisoTermico) return loc.pisoTermico;
    if (loc?.altitud != null) return getPisoTermicoInfo(loc.altitud);
    return null;
  }, [loc]);

  const handleConfirm = () => {
    if (!loc) return;
    // Persistir en el perfil del usuario (#200) — ubicación enriquecida.
    saveProfile({
      ubicacion_lat: loc.lat,
      ubicacion_lng: loc.lng,
      region: loc.municipio
        ? [loc.municipio, loc.departamento].filter(Boolean).join(', ')
        : undefined,
      finca_altitud: loc.altitud != null ? String(loc.altitud) : undefined,
      piso_termico: pisoInfo?.slug,
    });
    // Recordar zona para fallback de contexto (no sincroniza a server).
    if (typeof setFincaIndoorZone === 'function' && pisoInfo?.slug) {
      try {
        setFincaIndoorZone(null);
      } catch (_) {
        /* no-op */
      }
    }
    if (onConfirm) onConfirm({ ...loc, pisoTermico: pisoInfo });
  };

  const center = loc
    ? [loc.lat, loc.lng]
    : coords
      ? [coords.lat, coords.lng]
      : [4.5306, -73.9247]; // Choachí por defecto

  const hasPoint = !!(loc || coords);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col">
      <div className="px-4 pt-6 pb-3 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
            <MapPin size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white leading-tight">
              {loc ? 'Confirma tu ubicación' : 'Detectar tu ubicación'}
            </h1>
            <p className="text-xs text-slate-400">
              Define tu piso térmico y los cultivos de tu zona.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 max-w-xl mx-auto w-full space-y-4">
        {/* Búsqueda por municipio (si no hay coords o el usuario quiere ajustar) */}
        <div>
          <label htmlFor="muni-search" className="block text-xs font-medium text-slate-400 mb-1.5">
            Escribe tu municipio o vereda
          </label>
          <div className="flex gap-2">
            <input
              id="muni-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Ej: Choachí, Cundinamarca"
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-colors"
              aria-label="Buscar"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
          {searchError && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <AlertCircle size={12} /> {searchError}
            </p>
          )}
        </div>

        {/* Mini mapa */}
        {hasPoint && (
          <div className="rounded-2xl overflow-hidden border border-slate-800 h-56">
            <MapContainer
              center={center}
              zoom={12}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <Marker position={center} />
            </MapContainer>
          </div>
        )}

        {loading && !loc && (
          <div className="flex items-center justify-center gap-2 text-slate-400 py-6">
            <Loader2 size={18} className="animate-spin" /> Resolviendo tu ubicación...
          </div>
        )}

        {/* Datos enriquecidos */}
        {loc && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  {loc.municipio || 'Ubicación detectada'}
                </p>
                {loc.departamento && (
                  <p className="text-xs text-slate-400">{loc.departamento}, Colombia</p>
                )}
                <p className="text-2xs text-slate-600 font-mono mt-0.5">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                <Mountain size={16} className="text-slate-400" />
                {loc.altitud != null ? `${loc.altitud} msnm` : 'Altitud no disponible'}
              </span>
              <PisoTermicoBadge info={pisoInfo} />
            </div>

            {pisoInfo && pisoInfo.cultivos?.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Sprout size={14} className="text-emerald-400" />
                  Cultivos recomendados para tu zona
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pisoInfo.cultivos.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/40 text-xs text-emerald-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            Atrás
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!loc}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <Check size={18} /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

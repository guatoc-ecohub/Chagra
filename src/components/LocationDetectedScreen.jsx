import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  List,
  ChevronDown,
  LocateFixed,
  Move,
} from 'lucide-react';
import {
  resolveUbicacion,
  forwardGeocode,
  getPisoTermicoInfo,
} from '../services/locationService';
import { useFincaActiveStore } from '../services/fincaActiveStore';
import { saveProfile } from '../services/userProfileService';
import { getDepartamentos, getMunicipios } from '../utils/colombiaLocations';

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

// Pisos térmicos colombianos en orden ascendente para la barra hero visual.
// Rangos coinciden con deriveThermalZoneFromAltitud / PISO_TERMICO_INFO.
const ALTITUDE_STOPS = [
  { slug: 'cálido', max: 1000, color: 'bg-orange-500', hex: '#f97316', label: 'Cálido' },
  { slug: 'templado', max: 2000, color: 'bg-amber-400', hex: '#fbbf24', label: 'Templado' },
  { slug: 'frío', max: 3000, color: 'bg-emerald-500', hex: '#10b981', label: 'Frío' },
  { slug: 'páramo', max: 3600, color: 'bg-indigo-400', hex: '#818cf8', label: 'Páramo' },
  { slug: 'glacial', max: 5000, color: 'bg-sky-300', hex: '#7dd3fc', label: 'Glacial' },
];
const ALTITUDE_BAR_MAX = 5000;

// Geometría de la montaña (viewBox 240×160). Base ancha cálida, pico glacial.
const MTN = { baseY: 148, peakY: 14, apexX: 120, leftX: 16, rightX: 224 };
const altToY = (alt) => {
  const clamped = Math.max(0, Math.min(ALTITUDE_BAR_MAX, alt));
  return MTN.baseY - (clamped / ALTITUDE_BAR_MAX) * (MTN.baseY - MTN.peakY);
};

/**
 * ThermalMountain — "hero visual" del onboarding (#201 + #333): una montaña
 * colombiana estratificada en sus pisos térmicos (cálido en la base →
 * glacial en el pico), con un marcador blanco en la altitud de la finca del
 * usuario. El campesino ve de un vistazo en qué piso cae su tierra dentro
 * del espectro completo del país.
 *
 * Implementación: triángulo recortado (clipPath) sobre el cual se pintan
 * bandas horizontales — una por piso — con altura proporcional a su rango
 * de altitud real. Marcador opcional si hay altitud conocida.
 *
 * Conserva data-testid="altitude-gradient-bar" por compatibilidad con los
 * tests #201 existentes, y agrega data-testid="thermal-mountain".
 */
function ThermalMountain({ altitud, pisoSlug }) {
  const hasAlt = typeof altitud === 'number' && !Number.isNaN(altitud);
  const yUser = hasAlt ? altToY(altitud) : null;
  const trianglePath = `M${MTN.leftX} ${MTN.baseY} L${MTN.apexX} ${MTN.peakY} L${MTN.rightX} ${MTN.baseY} Z`;

  return (
    <div
      className="space-y-2"
      data-testid="altitude-gradient-bar"
      data-testid-alt="thermal-mountain"
    >
      <p className="text-2xs text-slate-400 text-center font-medium">
        Pisos térmicos de Colombia
      </p>
      <div className="flex items-stretch gap-3">
        {/* Montaña SVG */}
        <svg
          viewBox="0 0 240 160"
          className="w-1/2 max-w-[200px] shrink-0"
          role="img"
          aria-label={
            hasAlt
              ? `Tu finca a ${altitud} msnm, piso ${pisoSlug || ''}`
              : 'Montaña de pisos térmicos'
          }
        >
          <defs>
            <clipPath id="mtn-clip">
              <path d={trianglePath} />
            </clipPath>
          </defs>
          {/* cielo sutil */}
          <rect x="0" y="0" width="240" height="160" fill="#0f172a" />
          {/* bandas por piso, recortadas al triángulo */}
          <g clipPath="url(#mtn-clip)">
            {ALTITUDE_STOPS.map((stop, idx) => {
              const prev = idx === 0 ? 0 : ALTITUDE_STOPS[idx - 1].max;
              const yTop = altToY(stop.max);
              const yBot = altToY(prev);
              const active = stop.slug === pisoSlug;
              return (
                <rect
                  key={stop.slug}
                  x="0"
                  y={yTop}
                  width="240"
                  height={Math.max(0, yBot - yTop)}
                  fill={stop.hex}
                  opacity={active ? 1 : 0.5}
                />
              );
            })}
          </g>
          {/* contorno */}
          <path
            d={trianglePath}
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* marcador de la finca */}
          {yUser != null && (
            <g>
              <line
                x1={MTN.leftX - 4}
                y1={yUser}
                x2={MTN.rightX + 4}
                y2={yUser}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <circle
                cx={MTN.apexX}
                cy={yUser}
                r="6"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Leyenda vertical (pico arriba → base abajo) */}
        <ul className="flex-1 flex flex-col justify-between text-2xs py-0.5">
          {[...ALTITUDE_STOPS].reverse().map((stop, ridx) => {
            const realIdx = ALTITUDE_STOPS.length - 1 - ridx;
            const prev = realIdx === 0 ? 0 : ALTITUDE_STOPS[realIdx - 1].max;
            const active = stop.slug === pisoSlug;
            const rango = stop.slug === 'glacial' ? `${prev}+ msnm` : `${prev}–${stop.max} msnm`;
            return (
              <li
                key={stop.slug}
                className={`flex items-center gap-1.5 ${active ? 'text-white font-bold' : 'text-slate-500'}`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: stop.hex, opacity: active ? 1 : 0.6 }}
                />
                <span className="truncate">{stop.label}</span>
                <span className="ml-auto font-mono opacity-70 whitespace-nowrap">{rango}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {hasAlt && (
        <p className="text-2xs text-center text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-white border border-slate-900 align-middle mr-1" />
          Tu finca: <span className="font-mono text-white">{altitud} msnm</span>
        </p>
      )}
    </div>
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
  // PR4 (#187) — cascade dropdown offline para cuando Nominatim falla o el
  // usuario no tiene buena ortografía. 32 dptos × municipios curados.
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [cascadeDpto, setCascadeDpto] = useState('');
  const [geoState, setGeoState] = useState('idle'); // idle | detecting | denied | unavailable
  const markerRef = useRef(null);
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

  /**
   * Geolocalización real del usuario. Reusable: la dispara tanto el auto-
   * detect on-mount como el botón "Usar mi ubicación real" (#334).
   *
   * `maximumAge: 0` fuerza una lectura GPS fresca. Antes usábamos 60s de
   * caché, lo que en Brave/Chromium (con permiso ya concedido) devolvía una
   * posición cacheada o por-defecto y el usuario nunca veía su ubicación
   * real ni tenía forma de re-disparar la detección.
   */
  const detectMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('unavailable');
      return;
    }
    setGeoState('detecting');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        resolveUbicacion({ lat: latitude, lng: longitude, altitud: altitude ?? null })
          .then((r) => {
            setLoc(r);
            setGeoState('idle');
          })
          .catch(() => setGeoState('idle'))
          .finally(() => setLoading(false));
      },
      (err) => {
        console.warn('[LocationDetected] geolocation:', err?.message || err);
        setGeoState(err?.code === 1 ? 'denied' : 'unavailable');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, []);

  /**
   * Auto-detección on-mount SOLO si el usuario no llegó con coords/municipio
   * preseteados. Si llegó con un default, NO lo pisamos automáticamente —
   * pero el botón "Usar mi ubicación real" queda siempre disponible (#334).
   */
  useEffect(() => {
    if (coords || initialMunicipio || loc) return;
    detectMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Ajuste manual via drag del marcador (#201 "NO ajustar"). Al soltar:
   *   - Toma la nueva lat/lng del marcador
   *   - Re-resuelve municipio + altitud + piso térmico
   * Optimistic UI: setea coords inmediato, refresca enriquecimiento.
   */
  const handleMarkerDragEnd = async (event) => {
    const marker = event?.target;
    if (!marker) return;
    const { lat, lng } = marker.getLatLng();
    setLoading(true);
    try {
      const enriched = await resolveUbicacion({ lat, lng });
      setLoc((prev) => ({
        ...(prev || {}),
        ...enriched,
        lat,
        lng,
      }));
    } catch (e) {
      console.warn('[LocationDetected] drag resolve falló:', e);
      setLoc((prev) => ({ ...(prev || {}), lat, lng }));
    } finally {
      setLoading(false);
    }
  };

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

  /**
   * PR4 (#187) — selección de un municipio del cascade hardcoded. No usa
   * Nominatim, resuelve directo con las coordenadas+altitud que vienen en
   * el dataset. resolveUbicacion sigue corriendo en background para enriquecer
   * con piso térmico + recomendaciones de cultivo, pero si falla la red el
   * fallback local en getPisoTermicoInfo ya cubre lo esencial.
   */
  const handleCascadeSelect = async (dpto, mun) => {
    setLoading(true);
    setSearchError(null);
    setCascadeOpen(false);
    try {
      const enriched = await resolveUbicacion({
        lat: mun.lat,
        lng: mun.lng,
        altitud: mun.altitud,
      });
      setLoc({
        ...enriched,
        // Preferir SIEMPRE los datos de la lista curada — Nominatim
        // a veces devuelve nombres con tildes raras o variantes.
        municipio: mun.name,
        departamento: dpto,
        altitud: mun.altitud,
        lat: mun.lat,
        lng: mun.lng,
      });
    } catch (e) {
      console.warn('[LocationDetected] cascade resolve falló (degradación):', e);
      // Fallback local — al menos el piso térmico se deriva de altitud
      // sin red. Marca location with piso info via memo.
      setLoc({
        lat: mun.lat,
        lng: mun.lng,
        altitud: mun.altitud,
        municipio: mun.name,
        departamento: dpto,
        pisoTermico: getPisoTermicoInfo(mun.altitud),
      });
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
    //
    // Bug fix 2026-05-30: además de `region` (texto "Municipio, Depto" para el
    // system prompt), guardamos `municipio`/`departamento` LIMPIOS por separado.
    // El card "Configurar ubicación" (ClimaStrip) deriva su municipio de este
    // campo: antes solo escribíamos en el perfil y el card leía de
    // fincaActiveStore/FARM_CONFIG → nunca se enteraba de la confirmación y el
    // menú reaparecía "como si no lo hubieras hecho". Ahora el card lo ve.
    saveProfile({
      ubicacion_lat: loc.lat,
      ubicacion_lng: loc.lng,
      municipio: loc.municipio || undefined,
      departamento: loc.departamento || undefined,
      region: loc.municipio
        ? [loc.municipio, loc.departamento].filter(Boolean).join(', ')
        : undefined,
      finca_altitud: loc.altitud != null ? String(loc.altitud) : undefined,
      piso_termico: pisoInfo?.slug,
    });
    // Avisar a la UI montada (ClimaStrip, dashboard) que la ubicación cambió,
    // por si no hay remount completo al navegar. Refresca el pronóstico sin
    // recargar la app.
    try {
      window.dispatchEvent(
        new CustomEvent('chagra:location-updated', {
          detail: { municipio: loc.municipio || null },
        }),
      );
    } catch (_) {
      /* no-op (SSR / tests sin window) */
    }
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

        {/* PR4 (#187) — cascade dropdown offline. Toggle por defecto cerrado
            para no agregar ruido a la búsqueda. El usuario abre solo si la
            búsqueda libre falla o prefiere elegir de lista. */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setCascadeOpen((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-300 hover:bg-slate-800/40"
            aria-expanded={cascadeOpen}
          >
            <span className="flex items-center gap-2">
              <List size={16} className="text-emerald-400" />
              <span>{cascadeOpen ? 'Cerrar lista de municipios' : 'Elegir desde lista de municipios'}</span>
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform ${cascadeOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {cascadeOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
              <p className="text-2xs text-slate-500 leading-relaxed pt-3">
                Lista rápida sin internet (municipios principales). ¿No está el
                tuyo? Escríbelo arriba en la búsqueda — encontramos cualquier
                municipio de Colombia.
              </p>
              <label className="block">
                <span className="text-xs font-medium text-slate-400 block mb-1.5">
                  Departamento
                </span>
                <select
                  value={cascadeDpto}
                  onChange={(e) => setCascadeDpto(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500/60 appearance-none"
                >
                  <option value="">— Selecciona departamento —</option>
                  {getDepartamentos().map((dpto) => (
                    <option key={dpto} value={dpto}>
                      {dpto}
                    </option>
                  ))}
                </select>
              </label>

              {cascadeDpto && (
                <label className="block">
                  <span className="text-xs font-medium text-slate-400 block mb-1.5">
                    Municipio
                  </span>
                  <select
                    onChange={(e) => {
                      const munName = e.target.value;
                      if (!munName) return;
                      const mun = getMunicipios(cascadeDpto).find((m) => m.name === munName);
                      if (mun) handleCascadeSelect(cascadeDpto, mun);
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500/60 appearance-none"
                  >
                    <option value="">— Selecciona municipio —</option>
                    {getMunicipios(cascadeDpto).map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}{m.altitud != null ? ` · ${m.altitud} msnm` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Usar mi ubicación real (#334) — SIEMPRE visible. En Brave/Chromium
            con permiso ya concedido, fuerza una lectura GPS fresca y
            sobrescribe cualquier ubicación por defecto preseteada. */}
        <button
          type="button"
          onClick={detectMyLocation}
          disabled={geoState === 'detecting'}
          data-testid="use-my-location"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
        >
          {geoState === 'detecting' ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Detectando tu ubicación…
            </>
          ) : (
            <>
              <LocateFixed size={16} /> Usar mi ubicación real
            </>
          )}
        </button>
        {/* Hint navegador (#2, 2026-05-30): Brave bloquea la Geolocation API
            con Shields/anti-fingerprint a nivel de navegador — ninguna app web
            puede forzarla. En vez de prometer algo imposible, guiamos al
            usuario a la entrada manual (que sí funciona en todos lados). */}
        <p className="text-2xs text-slate-500 leading-relaxed px-1 -mt-1">
          ¿No detecta tu ubicación? En Brave baja los Shields de este sitio
          (icono del león) o, más fácil, escribe tu municipio arriba.
        </p>

        {/* Mini mapa con marcador arrastrable (#201 NO ajustar) */}
        {hasPoint && (
          <div className="space-y-1.5">
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
                <Marker
                  position={center}
                  draggable
                  eventHandlers={{ dragend: handleMarkerDragEnd }}
                  ref={markerRef}
                />
              </MapContainer>
            </div>
            <p className="text-2xs text-slate-500 flex items-center gap-1.5 px-1">
              <Move size={11} /> Arrastra el pin si la ubicación no es exacta.
            </p>
          </div>
        )}

        {/* Estado geoloc cuando no hay coords iniciales */}
        {!hasPoint && geoState === 'detecting' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 py-6">
            <LocateFixed size={18} className="animate-pulse text-emerald-400" />
            Detectando tu ubicación...
          </div>
        )}
        {!hasPoint && geoState === 'denied' && (
          <div className="rounded-xl bg-amber-950/30 border border-amber-800/40 p-3 text-xs text-amber-300 flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>
              Permiso de ubicación denegado. Puedes elegir tu municipio en la lista o escribirlo arriba.
            </span>
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

            {loc.altitud != null && (
              <div className="pt-2 border-t border-slate-800">
                <ThermalMountain
                  altitud={loc.altitud}
                  pisoSlug={pisoInfo?.slug}
                />
              </div>
            )}

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

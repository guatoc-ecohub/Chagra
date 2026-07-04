import { useEffect, useState, useMemo, useCallback } from 'react';
import { Cloud, CloudRain, CloudFog, Sun, CloudSun, Droplets, Wind, Thermometer, MapPin, AlertCircle, Pencil } from 'lucide-react';
import { fetchClimaSnapshot, getCachedClimaSnapshot } from '../../services/climaService';
import { fetchSkyConditions, getCachedSkyConditions, skyForDay } from '../../services/skyConditionService';
import { findMunicipio } from '../../utils/colombiaLocations';
import { isSavedLocationCoarse } from '../../services/locationService';
import { FARM_CONFIG } from '../../config/defaults';
import useFincaActiveStore from '../../services/fincaActiveStore';
import { getProfile, getProfileMunicipio } from '../../services/userProfileService';

/**
 * ClimaStrip — pronóstico real de 7 días debajo del agente.
 *
 * Fuente: Open-Meteo (`openmeteo.forecast_7d` del snapshot del sidecar). Da
 * pronóstico real por lat/lon: temp máx/mín + precipitación por día, gratis y
 * sin key. (Antes pedía `get_clima_ideam('monthly_avg')`, que es climatología
 * histórica y además devolvía vacío porque la ingesta IDEAM nunca se pobló —
 * el widget se veía sin datos.)
 *
 * Coordenadas (necesarias para Open-Meteo):
 *   1. Perfil del usuario: `ubicacion_lat`/`ubicacion_lng` — los guarda
 *      LocationDetectedScreen al confirmar la ubicación (mini mapa, #200).
 *   2. Fallback offline: geocodificar el `municipio` contra el dataset DANE
 *      local (`findMunicipio`) → lat/lng. Cubre perfiles viejos que solo
 *      tienen el nombre del municipio (texto) sin haber pasado por el mapa.
 *
 * Estados:
 *   - loading: skeleton.
 *   - sin coords NI municipio: CTA "Configurar ubicación".
 *   - con coords pero Open-Meteo no disponible (offline / sidecar caído):
 *     degrada limpio — muestra el strip con aviso "pronóstico aún cargando",
 *     nunca rompe el dashboard.
 *
 * Nota: el IDEAM sigue alimentando el grounding histórico del agente por otro
 * lado (agentService); este cambio solo reapunta la FUENTE de ESTE widget.
 *
 * `embedded` (consolidación home F2 2026-07-04): dentro de EstadoDelDiaCard
 * (card único "Cómo va su finca hoy") el strip pierde su cáscara sky/indigo y
 * se compacta (header slim, celdas más bajas, sin fila de leyenda) — el clima
 * de HOY ya lo pinta la cabecera del card, este panel es la tira expandible de
 * 7 días. Datos y fetching idénticos al widget standalone.
 */

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Ícono + color por CONDICIÓN REAL del cielo (fix Choachí 2026-06).
 *
 * Antes: <2 mm de precipitación → "solecito" ámbar. En los pueblos altoandinos
 * (nubosidad orográfica + niebla SIN lluvia medible) eso prometía ~4 días de
 * sol cuando hubo 2. Ahora la condición sale de skyConditionService:
 * nubosidad real de Open-Meteo + corrección por piso térmico + ENSO; sin dato
 * de nube cae a un prior conservador (piso frío → variable, no sol).
 * El ámbar de "sol" queda RESERVADO para despejado de verdad.
 */
const CONDITION_ICONS = {
    despejado: { Icon: Sun, cls: 'text-amber-300' },
    parcial: { Icon: CloudSun, cls: 'text-slate-200' },
    nublado: { Icon: Cloud, cls: 'text-slate-400' },
    niebla: { Icon: CloudFog, cls: 'text-slate-300' },
    lluvia: { Icon: CloudRain, cls: 'text-sky-400' },
};

function dayLabel(isoDate, i) {
    if (i === 0) return 'Hoy';
    try {
        const d = new Date(isoDate);
        if (Number.isNaN(d.getTime())) return '–';
        return DAY_LABELS[d.getDay()];
    } catch (_) {
        return '–';
    }
}

/**
 * Resuelve la altitud (msnm) real de la finca para corregir Open-Meteo por
 * gradiente térmico. Prioridad:
 *   1. `finca_altitud` del perfil — la que confirma/detecta LocationDetectedScreen.
 *   2. `altitud` del perfil (alias de algunos flujos viejos).
 *   3. La altitud curada del municipio en el dataset DANE (`fallbackAltitud`).
 * Devuelve un número plausible (msnm) o null. Sin esto, Open-Meteo usa la
 * elevación de SU grilla (≈ cabecera/valle) y el pronóstico sale más cálido.
 * @returns {number | null}
 */
function plausibleMsnm(value) {
    const n = Number(value);
    // Rango físico Colombia: nivel del mar a ~5800 m (Cristóbal Colón, 5775 m).
    return Number.isFinite(n) && n >= -100 && n <= 6000 ? Math.round(n) : null;
}

/**
 * Altitud (msnm) del perfil para corregir Open-Meteo por gradiente térmico.
 * Prioriza `finca_altitud` (la que confirma/detecta LocationDetectedScreen) y
 * cae a `altitud` (alias de flujos viejos). NO geocodifica: el fallback al
 * municipio lo decide `resolveGeo` solo cuando hace falta. @returns {number|null}
 */
function profileElevation(profile) {
    return plausibleMsnm(profile?.finca_altitud) ?? plausibleMsnm(profile?.altitud);
}

/**
 * Resuelve { lat, lng, elevation } a partir del perfil o, en su defecto,
 * geocodificando el municipio contra el dataset DANE local (offline-friendly).
 * La elevación corrige la temperatura de Open-Meteo: prioriza la altitud real
 * de la finca (perfil) sobre la del municipio (cabecera, más baja). Solo se
 * geocodifica el municipio si NO hay coords del perfil, o si hay coords pero
 * el perfil no trae altitud (para aproximar el piso con la curada del DANE) —
 * así se respeta el contrato "con coords del perfil no geocodifica" cuando el
 * perfil ya está completo.
 * @returns {{ lat: number, lng: number, elevation: number | null } | null}
 */
function resolveGeo(profile, municipio) {
    const lat = Number(profile?.ubicacion_lat);
    const lng = Number(profile?.ubicacion_lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        // GPS real de la finca. La altitud sale del perfil; solo si el perfil
        // NO la trae caemos a la curada del municipio (evita geocodificar de
        // más cuando el perfil ya está completo).
        let elevation = profileElevation(profile);
        if (elevation == null && municipio) {
            const hit = findMunicipio(municipio.split(',')[0]);
            elevation = plausibleMsnm(hit?.altitud);
        }
        return { lat, lng, elevation };
    }
    if (municipio) {
        // Sin GPS: geocodificamos el municipio (centroide ≈ cabecera). Igual
        // pasamos la altitud curada para que el gradiente sea coherente con esa
        // posición, y la del perfil tiene prioridad si existe.
        const hit = findMunicipio(municipio.split(',')[0]);
        if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
            return {
                lat: hit.lat,
                lng: hit.lng,
                elevation: profileElevation(profile) ?? plausibleMsnm(hit.altitud),
            };
        }
    }
    return null;
}

export default function ClimaStrip({ onNavigate, embedded = false }) {
    const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
    const fincas = useFincaActiveStore((s) => s.fincas);
    const [snapshot, setSnapshot] = useState(() => getCachedClimaSnapshot());
    // Nubosidad real por día (Open-Meteo directo — el sidecar aún no la trae).
    const [sky, setSky] = useState(null);
    const [loading, setLoading] = useState(true);
    // Bug fix 2026-05-30: el municipio que el usuario confirma en
    // LocationDetectedScreen se guarda en el perfil (userProfileService), NO en
    // fincaActiveStore. Si no lo leemos de ahí, este card sigue mostrando
    // "Configurar ubicación" aunque el usuario ya la haya confirmado. `tick`
    // fuerza re-lectura del perfil al recibir 'chagra:location-updated'.
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const onLocUpdated = () => setTick((t) => t + 1);
        window.addEventListener('chagra:location-updated', onLocUpdated);
        return () => window.removeEventListener('chagra:location-updated', onLocUpdated);
    }, []);

    const municipio = useMemo(() => {
        const activeFinca = fincas.find((f) => f.slug === activeFincaSlug);
        // getProfileMunicipio retrocompatibiliza perfiles viejos: si solo tienen
        // `region` en texto libre, lo resuelve offline contra el dataset DANE.
        const profileMunicipio = getProfileMunicipio();
        return activeFinca?.municipio || profileMunicipio || FARM_CONFIG?.MUNICIPIO || null;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- getProfile* son funciones estables, no requieren deps
    }, [activeFincaSlug, fincas, tick]);

    const geo = useMemo(() => {
        return resolveGeo(getProfile(), municipio);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- getProfile y resolveGeo son funciones estables
    }, [municipio, tick]);

    // mitad geo de #364 (2026-06-03): ¿la ubicación GUARDADA es demasiado
    // gruesa para afirmar el municipio/zona con confianza? Pasa cuando el
    // onboarding grabó la cabecera del municipio grande (Brave difuminó el GPS)
    // y el usuario no corrigió la altura a mano. NO bloquea el pronóstico
    // (Open-Meteo ya corrige por altitud); solo degrada la CONFIANZA en el
    // municipio mostrado y empuja a confirmar la ubicación real.
    const coarse = useMemo(() => {
        return isSavedLocationCoarse(getProfile());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- getProfile e isSavedLocationCoarse son funciones estables
    }, [tick]);

    // Navegación a la pantalla de ubicación (mini-mapa + piso térmico). Reusada
    // por el CTA "Configurar ubicación" (sin ubicación), el aviso de confianza
    // gruesa y el botón de re-pin del header. Degrada al evento global
    // 'chagra:nav' (que App.jsx escucha) si no hay onNavigate — evita el
    // listener inline-string del feedback CSP-strict.
    const goToLocation = useCallback(() => {
        if (typeof onNavigate === 'function') {
            onNavigate('ubicacion-detectada');
            return;
        }
        try {
            window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'ubicacion-detectada' }));
        } catch (_) { /* noop */ }
    }, [onNavigate]);

    useEffect(() => {
        let alive = true;
        // Sin coords (ni del perfil ni geocodificando el municipio) no podemos
        // pedir Open-Meteo, que necesita lat/lon. Cerramos el loading y dejamos
        // que el render decida: CTA si tampoco hay municipio, strip neutro si
        // hay municipio pero sin match DANE.
        if (!geo) {
            Promise.resolve().then(() => { if (alive) setLoading(false); });
            return () => { alive = false; };
        }
        // Pintado instantáneo desde el cache keyed por coords+elevation si existe.
        const cached = getCachedClimaSnapshot(geo.lat, geo.lng, geo.elevation);
        if (cached && alive) setSnapshot(cached);
        // fetchClimaSnapshot nunca throw: devuelve null si offline / flag off /
        // HTTP≥400. Open-Meteo real 7d viene en payload.openmeteo.forecast_7d.
        // `elevation` (altitud real de la finca) corrige la temperatura por
        // gradiente térmico — sin esto el pronóstico sale más cálido (usa la
        // elevación de la cabecera/valle de la grilla de Open-Meteo).
        // Solo incluimos `elevation` cuando la conocemos: así, sin altitud, el
        // request queda { lat, lng } y Open-Meteo usa su grilla (comportamiento
        // previo intacto); con altitud, corrige la temperatura por gradiente.
        const climaArgs = geo.elevation != null
            ? { lat: geo.lat, lng: geo.lng, elevation: geo.elevation }
            : { lat: geo.lat, lng: geo.lng };
        fetchClimaSnapshot(climaArgs)
            .then((res) => { if (alive && res) setSnapshot(res); })
            .catch(() => { /* degrade limpio — nunca rompe el dashboard */ })
            .finally(() => { if (alive) setLoading(false); });
        // Nubosidad real 7 días (fix Choachí): el snapshot del sidecar aún no
        // trae cloud_cover, así que se pide directo a Open-Meteo (gratis, CORS
        // ok, cache 30 min compartido con AgentHero). Si falla, el ícono cae
        // al prior conservador por piso térmico — nunca a "sol" por defecto.
        const cachedSky = getCachedSkyConditions(geo.lat, geo.lng, geo.elevation);
        if (cachedSky && alive) setSky(cachedSky);
        fetchSkyConditions(climaArgs)
            .then((s) => { if (alive && s) setSky(s); })
            .catch(() => { /* degrade limpio */ });
        return () => { alive = false; };
    }, [geo]);

    if (loading) {
        return (
            <div className={`${embedded ? 'p-4 pt-2' : 'bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-5'} animate-pulse motion-reduce:animate-none`}>
                <div className="h-4 w-32 bg-slate-700/40 rounded mb-3" />
                <div className="grid grid-cols-7 gap-2">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className={`${embedded ? 'h-12' : 'h-16'} bg-slate-700/30 rounded-xl`} />
                    ))}
                </div>
            </div>
        );
    }

    if (!geo && !municipio) {
        return (
            <div className={embedded ? 'p-4 pt-2' : 'bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-5'}>
                <div className="flex items-center gap-2 mb-2">
                    <Cloud size={20} className="text-sky-300" />
                    <h3 className="text-base font-bold text-white">Clima en su zona</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                    Cuéntame en qué municipio queda su finca y le traigo el pronóstico real de los próximos 7 días.
                </p>
                {/* Bug fix 2026-05-28 (Brave laptop): el botón no tenía
                    onClick — operador clickeaba y nada pasaba.
                    #201 (2026-05-28): ahora navega a `ubicacion-detectada`,
                    la pantalla dedicada con mini mapa + piso térmico +
                    cultivos recomendados, que resuelve municipio y lo guarda
                    en el perfil. Si no hay onNavigate (uso aislado en tests
                    o storybook), el handler degrada a un dispatch del event
                    global `chagra:nav` que App.jsx escucha. Evita el listener
                    inline-string del feedback CSP-strict (memoria
                    feedback-csp-strict-inline-handlers-bloqueados). */}
                <button
                    type="button"
                    onClick={goToLocation}
                    className="mt-3 px-4 py-2 rounded-xl bg-sky-700/30 hover:bg-sky-600/40 border border-sky-500/40 text-sky-200 text-sm font-bold transition-colors flex items-center gap-2"
                >
                    <MapPin size={14} aria-hidden="true" />
                    Configurar ubicación
                </button>
            </div>
        );
    }

    // Pronóstico real de Open-Meteo. Cada día: { date, temp_max_c, temp_min_c,
    // precip_mm } (mismo shape que consume NotificationsBell).
    const openmeteo = snapshot?.openmeteo;
    const forecast = openmeteo?.available && Array.isArray(openmeteo.forecast_7d)
        ? openmeteo.forecast_7d
        : [];

    const today = new Date();
    // Nubosidad por fecha (fetch directo) — se cruza con el forecast del
    // sidecar por ISO date. El día también acepta cloud_cover_mean_pct /
    // weather_code DEL PROPIO forecast_7d (forward-compat: cuando el sidecar
    // los agregue, skyForDay los toma de ahí sin tocar este componente).
    const skyByDate = new Map(
        (Array.isArray(sky?.daily) ? sky.daily : []).map((d) => [d.date, d]),
    );
    const ensoPhase = snapshot?.enso_status?.phase || 'neutral';
    const filled = Array.from({ length: 7 }, (_, i) => {
        const d = forecast[i] || {};
        const fallbackDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const skyDay = (d.date && skyByDate.get(d.date)) || sky?.daily?.[i] || {};
        const condition = skyForDay(
            {
                precip_mm: typeof d.precip_mm === 'number' ? d.precip_mm : skyDay.precip_mm,
                cloud_cover_mean_pct: d.cloud_cover_mean_pct ?? skyDay.cloud_cover_mean_pct,
                weather_code: d.weather_code ?? skyDay.weather_code,
            },
            { elevationM: geo?.elevation ?? null, ensoPhase },
        );
        return {
            label: dayLabel(d.date || fallbackDate, i),
            tempMaxC: typeof d.temp_max_c === 'number' ? d.temp_max_c : null,
            tempMinC: typeof d.temp_min_c === 'number' ? d.temp_min_c : null,
            precipMm: typeof d.precip_mm === 'number' ? d.precip_mm : null,
            condition: condition.condition,
            conditionLabel: condition.label,
        };
    });

    const hasReal = filled.some((d) => d.tempMaxC != null);
    const headerLabel = (municipio || '').split(',')[0] || 'su finca';

    return (
        <div className={embedded ? 'px-4 pb-4 pt-1' : 'bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-5'}>
            <div className={`flex items-center justify-between ${embedded ? 'mb-2' : 'mb-3'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {!embedded && <Cloud size={20} className="text-sky-300 shrink-0" />}
                    <h3 className={`${embedded ? 'text-xs' : 'text-base'} font-bold text-white truncate`}>
                        {coarse ? 'Clima en su zona' : `Clima en ${headerLabel}`}
                    </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-sky-300/70 font-bold uppercase tracking-wider">
                        {embedded ? 'Open-Meteo' : 'Open-Meteo · 7 días'}
                    </span>
                    {/* Re-pin SIEMPRE alcanzable (mitad geo de #364): corregir una
                        ubicación guardada equivocada sin fricción. Navega al
                        mini-mapa donde el usuario re-fija su vereda real; al
                        confirmar, LocationDetectedScreen reescribe el perfil y
                        dispara 'chagra:location-updated' (este card refresca). */}
                    <button
                        type="button"
                        onClick={goToLocation}
                        data-testid="clima-repin"
                        aria-label="Corregir mi ubicación"
                        title="Corregir mi ubicación"
                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-sky-200 transition-colors"
                    >
                        <Pencil size={13} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* mitad geo de #364: aviso de confianza cuando la ubicación GUARDADA
                es gruesa (Brave/onboarding grabó la cabecera, no la vereda). NO
                afirmamos el municipio como cierto; empujamos a confirmar la
                ubicación real en el mini-mapa. El pronóstico igual se muestra
                (Open-Meteo corrige por altitud) — lo que degradamos es la
                confianza en el municipio/zona. */}
            {coarse && (
                <div
                    data-testid="clima-coarse-warning"
                    className="mb-3 rounded-xl bg-amber-950/30 border border-amber-800/40 p-3 text-xs text-amber-200 flex gap-2"
                >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                        <p className="leading-relaxed">
                            Confirme su ubicación para un clima exacto. La que tenemos
                            guardada es aproximada (puede ser la cabecera del municipio,
                            no su finca).
                        </p>
                        <button
                            type="button"
                            onClick={goToLocation}
                            data-testid="clima-coarse-cta"
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700/30 hover:bg-amber-600/40 border border-amber-500/40 text-amber-100 font-bold transition-colors"
                        >
                            <MapPin size={13} aria-hidden="true" />
                            Confirmar mi ubicación
                        </button>
                    </div>
                </div>
            )}

            {!hasReal && (
                <p className="text-xs text-slate-400 mb-3 italic">
                    El pronóstico fino aún se está cargando. Mientras tanto, tenga precaución en la noche con cultivos sensibles.
                </p>
            )}

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {filled.map((d, i) => {
                    const { Icon, cls } = CONDITION_ICONS[d.condition] || CONDITION_ICONS.parcial;
                    return (
                        <div
                            key={i}
                            data-condition={d.condition}
                            title={d.conditionLabel}
                            className={`flex flex-col items-center gap-1 ${embedded ? 'py-1.5' : 'py-2.5'} rounded-xl bg-white/[0.04] border border-white/[0.06]`}
                        >
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{d.label}</span>
                            <Icon size={embedded ? 18 : 22} className={cls} />
                            {d.tempMaxC != null && (
                                <span className={`${embedded ? 'text-xs' : 'text-sm'} font-bold text-white tabular-nums`}>{Math.round(d.tempMaxC)}°</span>
                            )}
                            {d.tempMinC != null && (
                                <span className="text-[10px] text-slate-400 tabular-nums">{Math.round(d.tempMinC)}°</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Leyenda: solo en el widget standalone — embebido el espacio es
                exactamente lo que la consolidación recorta (los íconos ya se
                explican solos con el title por día). */}
            {!embedded && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Thermometer size={14} className="text-rose-400" />
                        <span className="truncate">Máx/Mín</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Droplets size={14} className="text-sky-400" />
                        <span className="truncate">Lluvia</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Wind size={14} className="text-emerald-400" />
                        <span className="truncate">Viento</span>
                    </div>
                </div>
            )}
        </div>
    );
}

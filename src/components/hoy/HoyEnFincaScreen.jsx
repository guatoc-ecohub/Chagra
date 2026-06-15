import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Sun, CloudSun, Cloud, CloudFog, CloudRain, Sunrise,
    Bell, BellOff, MapPin, Droplets, Sprout, Mic, Bug,
    Package, ClipboardList, MessageCircle, Map as MapIcon, ChevronRight, WifiOff,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import AgendaCampesina from './AgendaCampesina';
import JourneyGuideCard from './JourneyGuideCard';
import FincaEvolutionCard from './FincaEvolutionCard';
import useAlertStore from '../../store/useAlertStore';
import { listFarmProcesses } from '../../db/farmProcessCache';
import { getProfile } from '../../services/userProfileService';
import {
    resolveClimaLocation,
    getCachedClimaSnapshot,
    fetchClimaSnapshot,
    describePhase,
} from '../../services/climaService';
import { getCachedSkyConditions, fetchSkyConditions } from '../../services/skyConditionService';
import { buildClimaHoy, buildTareasSemana, buildAgenda } from '../../services/hoyEnFincaService';

/**
 * HoyEnFincaScreen — el dashboard proactivo "Hoy en finca".
 *
 * La vista que responde de un vistazo: ¿cómo está el día?, ¿hay alertas?,
 * ¿qué me toca hacer esta semana?, ¿qué viene en el calendario?
 *
 * Secciones (todas ACCIONABLES, los toques rutean):
 *   1. Clima de HOY honesto — skyConditionService (nubosidad real + corrección
 *      orográfica + ENSO) + climaService (pronóstico Open-Meteo). Ubicación =
 *      la GUARDADA del perfil (resolveClimaLocation), NUNCA geo en vivo.
 *      Toque → pregunta pre-cargada al agente. Sin ubicación → CTA al mini-mapa.
 *   2. Alertas del día — useAlertStore (alertEngine + cropAlertEngine). NO
 *      duplica el motor de la campana: muestra las mismas alertas activas y
 *      referencia la campana. Toque → agente con prompt pre-cargado (mismo
 *      patrón de CriticalAlertBanner).
 *   3. Tareas del ciclo de ESTA SEMANA — fenología estimada + plantillas por
 *      etapa + preventivas ENSO (hoyEnFincaService). Toque → Ciclo del cultivo.
 *   4. Accesos rápidos — sembrar/cosechar/plagas/insumos/tareas/agente.
 *   5. Agenda campesina — semana/mes con ventanas fenológicas reales.
 *
 * Offline-first: pinta primero los caches (getCached*) y luego refresca; los
 * fetch nunca lanzan (contrato de climaService/skyConditionService). Sin red
 * y sin cache → estados vacíos honestos, jamás datos inventados.
 */

const CONDITION_ICONS = {
    despejado: { Icon: Sun, cls: 'text-amber-300' },
    parcial: { Icon: CloudSun, cls: 'text-slate-200' },
    nublado: { Icon: Cloud, cls: 'text-slate-400' },
    niebla: { Icon: CloudFog, cls: 'text-slate-300' },
    lluvia: { Icon: CloudRain, cls: 'text-sky-400' },
};

const SEVERITY_STYLES = {
    danger: 'bg-red-950/40 border-red-800/60 text-red-200',
    warning: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
    info: 'bg-sky-950/40 border-sky-800/60 text-sky-200',
};

/** Accesos rápidos: ícono GRANDE + una palabra. */
const QUICK_ACTIONS = [
    { id: 'procesos', label: 'Sembrar', Icon: Mic, desc: 'Registrar siembra por voz' },
    { id: 'cosechar', label: 'Cosechar', Icon: Sprout, desc: 'Anotar una cosecha' },
    { id: 'reportar_invasora', label: 'Plagas', Icon: Bug, desc: 'Reportar plaga o maleza' },
    { id: 'bodega', label: 'Insumos', Icon: Package, desc: 'Ver bodega de insumos' },
    { id: 'task_log', label: 'Tareas', Icon: ClipboardList, desc: 'Cola de pendientes' },
    { id: 'agente', label: 'Preguntar', Icon: MessageCircle, desc: 'Hablar con Chagra' },
];

/** Pre-carga un prompt para el agente (mismo canal que CriticalAlertBanner). */
function prefillAgent(prompt) {
    try {
        sessionStorage.setItem('chagra:agent:prefilled', prompt);
    } catch { /* privacy mode — el agente abre vacío, no rompe */ }
}

export default function HoyEnFincaScreen({ onBack, onHome, onNavigate }) {
    const activeAlerts = useAlertStore((s) => s.activeAlerts);

    // Ubicación GUARDADA del perfil — nunca geolocalización en vivo (memoria
    // feedback-clima-usa-ubicacion-guardada-no-geo-vivo).
    const geo = useMemo(() => resolveClimaLocation(), []);
    const municipio = useMemo(() => {
        const m = geo?.municipio || getProfile()?.municipio || '';
        return String(m).split(',')[0].trim();
    }, [geo]);

    // Offline-first: cache primero, refresh después (fetch nunca throw).
    const [snapshot, setSnapshot] = useState(() => (geo
        ? getCachedClimaSnapshot(geo.lat, geo.lng, geo.elevation)
        : getCachedClimaSnapshot()));
    const [sky, setSky] = useState(() => (geo
        ? getCachedSkyConditions(geo.lat, geo.lng, geo.elevation)
        : null));
    const [processes, setProcesses] = useState([]);
    const [ciclosCargados, setCiclosCargados] = useState(false);

    useEffect(() => {
        let alive = true;
        if (geo) {
            const args = geo.elevation != null
                ? { lat: geo.lat, lng: geo.lng, elevation: geo.elevation }
                : { lat: geo.lat, lng: geo.lng };
            fetchClimaSnapshot(args)
                .then((res) => { if (alive && res) setSnapshot(res); })
                .catch(() => { /* degrade limpio */ });
            fetchSkyConditions(args)
                .then((res) => { if (alive && res) setSky(res); })
                .catch(() => { /* degrade limpio */ });
        }
        listFarmProcesses({ status: 'active' })
            .then((list) => { if (alive) setProcesses(Array.isArray(list) ? list : []); })
            .catch(() => { /* IDB falló: lista vacía honesta */ })
            .finally(() => { if (alive) setCiclosCargados(true); });
        return () => { alive = false; };
    }, [geo]);

    const elevationM = geo?.elevation ?? null;
    const ensoPhase = snapshot?.enso_status?.phase || 'neutral';

    const clima = useMemo(
        () => buildClimaHoy({ snapshot, sky, elevationM }),
        [snapshot, sky, elevationM],
    );
    const tareas = useMemo(
        () => buildTareasSemana({ processes, altitudeM: elevationM, ensoPhase }),
        [processes, elevationM, ensoPhase],
    );
    const agendaItems = useMemo(
        () => buildAgenda({ processes, altitudeM: elevationM }),
        [processes, elevationM],
    );

    const fechaLarga = useMemo(
        () => new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
        [],
    );

    const goAgente = useCallback((prompt) => {
        if (prompt) prefillAgent(prompt);
        onNavigate?.('agente');
    }, [onNavigate]);

    const onClimaTap = useCallback(() => {
        if (!clima.hasData) return;
        goAgente(
            `Hoy en mi finca está ${clima.label?.toLowerCase() || 'variable'}`
            + (clima.tempMaxC != null ? `, con máxima de ${Math.round(clima.tempMaxC)}°C` : '')
            + '. ¿Qué me recomiendas hacer hoy en los cultivos?',
        );
    }, [clima, goAgente]);

    const onAlertTap = useCallback((alert) => {
        goAgente(
            alert.prefilled_prompt
            || `Tengo esta alerta en mi finca: ${alert.title || alert.type}. ${alert.message || ''} ¿Qué debo hacer?`,
        );
    }, [goAgente]);

    const { Icon: CondIcon, cls: condCls } = CONDITION_ICONS[clima.condition] || CONDITION_ICONS.parcial;

    return (
        <ScreenShell title="Hoy en finca" icon={Sunrise} onBack={onBack} onHome={onHome}>
            <div className="flex flex-col gap-3 px-4 pt-3 pb-8 max-w-2xl mx-auto">
                {/* Fecha de hoy, grande y en cristiano */}
                <p className="text-sm text-slate-400 capitalize px-1">{fechaLarga}</p>

                {/* ── 0. GUÍA DEL VIAJE — Chagra como agroecólogo desde el inicio ── */}
                <JourneyGuideCard processes={processes} onNavigate={onNavigate} />

                {/* ── 0b. CÓMO EVOLUCIONA TU FINCA — resumen TAPE/MESMIS ─────
                    El "¿Qué es esto?" rutea a la pantalla 'evolucion' (detalle
                    de indicadores + etapa del viaje). Antes la tarjeta vivía
                    huérfana y ese botón no llevaba a ningún lado. */}
                <FincaEvolutionCard
                    processes={processes}
                    onNavigate={onNavigate}
                />

                {/* ── 0c. MI FINCA VIVA — el modo juego kid-friendly ─────────
                    Misma evolución real (fincaEvolutionService), presentada como
                    un mundo que crece para que una niña juegue: criaturas,
                    misiones, audio. Rutea a la pantalla 'juego'. */}
                <button
                    type="button"
                    data-testid="entrada-juego-finca"
                    onClick={() => onNavigate?.('juego')}
                    className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-emerald-600/40 to-teal-700/40 border-2 border-emerald-400/40 hover:border-emerald-300/60 active:scale-[0.99] transition flex items-center gap-3"
                >
                    <span className="text-4xl shrink-0" aria-hidden="true">🌱</span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-base font-black text-white">Mi Finca Viva</span>
                        <span className="block text-sm text-emerald-100/90 leading-snug">
                            Mira crecer tu finca como un mundo: criaturas, misiones y aventuras. ¡Para jugar en familia!
                        </span>
                    </span>
                    <ChevronRight size={22} className="text-emerald-200 shrink-0" aria-hidden="true" />
                </button>

                {/* ── 1. CLIMA DE HOY (honesto) ─────────────────────────── */}
                {!geo ? (
                    <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud size={20} className="text-sky-300" aria-hidden="true" />
                            <h3 className="text-base font-bold text-white">El día en tu finca</h3>
                        </div>
                        <p className="text-sm text-slate-300">
                            Cuéntame dónde queda tu finca y te muestro el clima real de hoy.
                        </p>
                        <button
                            type="button"
                            onClick={() => onNavigate?.('ubicacion-detectada')}
                            className="mt-3 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-700/30 hover:bg-sky-600/40 border border-sky-500/40 text-sky-200 text-sm font-bold flex items-center gap-2"
                        >
                            <MapPin size={16} aria-hidden="true" />
                            Configurar ubicación
                        </button>
                    </section>
                ) : (
                    <button
                        type="button"
                        onClick={onClimaTap}
                        data-testid="clima-hoy-card"
                        aria-label={clima.hasData
                            ? `Clima de hoy: ${clima.label}. Tocar para preguntarle al agente`
                            : 'Clima de hoy sin datos'}
                        className="w-full text-left bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-4 active:scale-[0.99] transition-transform"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-bold text-white truncate">
                                {municipio ? `El día en ${municipio}` : 'El día en tu finca'}
                            </h3>
                            <span className="text-[10px] text-sky-300/70 font-bold uppercase tracking-wider shrink-0">
                                {clima.fuente}
                            </span>
                        </div>
                        {clima.hasData ? (
                            <div className="flex items-center gap-4">
                                <CondIcon size={52} className={`${condCls} shrink-0`} aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xl font-black text-white leading-tight" data-testid="clima-hoy-label">
                                        {clima.label}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-300">
                                        {clima.tempMaxC != null && (
                                            <span className="tabular-nums font-bold">
                                                {Math.round(clima.tempMaxC)}°
                                                {clima.tempMinC != null && (
                                                    <span className="text-slate-400 font-normal"> / {Math.round(clima.tempMinC)}°</span>
                                                )}
                                            </span>
                                        )}
                                        {clima.precipMm != null && (
                                            <span className="flex items-center gap-1 tabular-nums">
                                                <Droplets size={14} className="text-sky-400" aria-hidden="true" />
                                                {Math.round(clima.precipMm)} mm
                                            </span>
                                        )}
                                    </div>
                                    {/* ENSO en lenguaje llano (describePhase #1453/#1454) */}
                                    <p className="text-xs text-slate-400 mt-1.5" data-testid="enso-llano">
                                        {describePhase(ensoPhase)}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-slate-400">
                                <WifiOff size={28} className="shrink-0" aria-hidden="true" />
                                <p className="text-sm">
                                    Sin señal y sin clima guardado. Cuando vuelva la conexión te muestro el día real.
                                </p>
                            </div>
                        )}
                    </button>
                )}

                {/* ── 2. ALERTAS DEL DÍA ────────────────────────────────── */}
                <section
                    aria-label="Alertas de hoy"
                    className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4"
                >
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                        {activeAlerts.length > 0
                            ? <Bell size={20} className="text-amber-400" aria-hidden="true" />
                            : <BellOff size={20} className="text-slate-500" aria-hidden="true" />}
                        Alertas de hoy
                        {activeAlerts.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-black tabular-nums">
                                {activeAlerts.length}
                            </span>
                        )}
                    </h3>
                    {activeAlerts.length === 0 ? (
                        <p className="text-sm text-slate-400" data-testid="sin-alertas">
                            Tranquilidad: no hay alertas activas en tu finca.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {activeAlerts.map((a) => (
                                <li key={a.type}>
                                    <button
                                        type="button"
                                        onClick={() => onAlertTap(a)}
                                        aria-label={`Alerta: ${a.title || a.type}. Tocar para preguntarle al agente qué hacer`}
                                        className={`w-full text-left rounded-xl border p-3 min-h-[44px] flex items-center gap-3 active:scale-[0.99] transition-transform ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}
                                    >
                                        <span className="text-xl shrink-0" aria-hidden="true">
                                            {a.severity === 'danger' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️'}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold truncate">{a.title || a.type}</span>
                                            {a.message && <span className="block text-xs opacity-80 truncate">{a.message}</span>}
                                        </span>
                                        <ChevronRight size={16} className="shrink-0 opacity-60" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {/* Referencia a la campana unificada (#1464): mismas alertas, sin duplicar motor */}
                    <p className="text-[10px] text-slate-500 mt-2">
                        Estas son las mismas alertas de la campana 🔔 de arriba. Tócalas para preguntarle a Chagra qué hacer.
                    </p>
                </section>

                {/* ── 3. TAREAS DEL CICLO — ESTA SEMANA ─────────────────── */}
                <section
                    aria-label="Tareas de la semana"
                    className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4"
                >
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                        <ClipboardList size={20} style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
                        Para esta semana
                    </h3>
                    {!ciclosCargados ? (
                        <p className="text-sm text-slate-500">Cargando tus ciclos…</p>
                    ) : tareas.length === 0 ? (
                        <div className="text-center py-3">
                            <p className="text-sm text-slate-400">
                                Sin ciclos de cultivo registrados todavía.
                            </p>
                            <button
                                type="button"
                                onClick={() => onNavigate?.('procesos')}
                                className="mt-3 px-4 py-2.5 min-h-[44px] rounded-xl bg-lime-800/40 hover:bg-lime-700/40 border border-lime-700/50 text-lime-200 text-sm font-bold flex items-center gap-2 mx-auto"
                            >
                                <Mic size={16} aria-hidden="true" />
                                Contarle a Chagra qué sembré
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {tareas.map((g) => (
                                <button
                                    key={g.processId}
                                    type="button"
                                    onClick={() => onNavigate?.('ciclo')}
                                    aria-label={`${g.etiqueta} en etapa ${g.stageLabel}. Tocar para ver el ciclo completo`}
                                    className="w-full text-left rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] p-3 active:scale-[0.99] transition-transform"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-xl" aria-hidden="true">{g.emoji}</span>
                                        <span className="text-sm font-bold text-white truncate">{g.etiqueta}</span>
                                        <span className="text-xs text-slate-400 truncate">
                                            · {g.stageLabel}
                                            {g.diasDesdeSiembra != null && ` · día ${g.diasDesdeSiembra}`}
                                        </span>
                                        <ChevronRight size={16} className="text-slate-500 ml-auto shrink-0" aria-hidden="true" />
                                    </div>
                                    {g.tareas.length === 0 ? (
                                        <p className="text-xs text-slate-500">Sin labores sugeridas para esta etapa.</p>
                                    ) : (
                                        <ul className="flex flex-col gap-1">
                                            {g.tareas.map((t, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-center gap-2 text-xs text-slate-300"
                                                >
                                                    <span
                                                        className={`shrink-0 w-2 h-2 rounded-full ${t.priority === 'alta' ? 'bg-red-400' : t.priority === 'media' ? 'bg-amber-400' : 'bg-slate-500'}`}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="font-medium">{t.task}</span>
                                                    {t.origen === 'enso' && (
                                                        <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold uppercase">clima</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </button>
                            ))}
                            <p className="text-[10px] text-slate-500 leading-snug">
                                Labores sugeridas por la etapa del cultivo
                                {ensoPhase !== 'neutral' ? ' y el estado del clima (NOAA/IDEAM)' : ''}.
                                No reemplazan el ojo del campesino.
                            </p>
                        </div>
                    )}
                </section>

                {/* ── 4. ACCESOS RÁPIDOS ────────────────────────────────── */}
                <section aria-label="Accesos rápidos">
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_ACTIONS.map((accion) => (
                            <button
                                key={accion.id}
                                type="button"
                                onClick={() => onNavigate?.(accion.id)}
                                aria-label={`${accion.label}: ${accion.desc}`}
                                title={accion.desc}
                                className="flex flex-col items-center gap-1.5 py-3 min-h-[72px] rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 hover:bg-slate-800/60 active:scale-[0.97] transition-all"
                            >
                                <accion.Icon size={26} style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
                                <span className="text-xs font-bold text-slate-200">{accion.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* ── 5. AGENDA CAMPESINA ───────────────────────────────── */}
                <AgendaCampesina
                    items={agendaItems}
                    onItemTap={() => onNavigate?.('ciclo')}
                    onEmptyCta={() => onNavigate?.('procesos')}
                />

                {/* Mapa al cierre: dónde está todo */}
                <button
                    type="button"
                    onClick={() => onNavigate?.('mapa')}
                    className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-2xl bg-slate-900/40 border border-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-800/50"
                >
                    <MapIcon size={18} aria-hidden="true" />
                    Ver el mapa de la finca
                </button>
            </div>
        </ScreenShell>
    );
}

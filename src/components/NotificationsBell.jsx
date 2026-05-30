import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, X, AlertTriangle, Info, AlertCircle, Sprout, Cloud, Wifi, Droplets, ListChecks, Sparkles, Snowflake, CloudRain, Sun, CloudSun, Thermometer, Wind, Activity, RefreshCw } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import useAlertStore from '../store/useAlertStore';
import useFincaActiveStore from '../services/fincaActiveStore';
import { aggregateNotifications, dismissNotification } from '../services/notificationsService';
import { syncManager } from '../services/syncManager';
import { useLogStore } from '../store/useLogStore';
// PoC alertas meteorológicas (#316) — fuente de verdad ENSO + alertas locales.
import {
    getCachedClimaSnapshot,
    fetchClimaSnapshot,
    phaseBadgeColor,
    describePhase,
} from '../services/climaService';

const TYPE_ICONS = {
    climate_critical: Snowflake,
    tasks_pending: ListChecks,
    climate_zone: Cloud,
    iot_sensor: Droplets,
    sync_pending: Wifi,
    app_update: Sparkles,
    onboarding_incomplete: Sprout,
    calendar_month: Sprout,
};

const SEVERITY_STYLES = {
    critical: 'bg-red-900/30 border-red-700/50 text-red-200',
    warning: 'bg-amber-900/30 border-amber-700/50 text-amber-200',
    info: 'bg-sky-900/30 border-sky-700/50 text-sky-200',
};

const SEVERITY_ICONS = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

function readOnboardingComplete() {
    try {
        const raw = localStorage.getItem('chagra:onboarding:profile-v1');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return !!parsed?.completed_at;
    } catch {
        return false;
    }
}

function readUpdateAvailable() {
    try {
        return localStorage.getItem('chagra:sw:update-available') === '1';
    } catch {
        return false;
    }
}

// #308 — el motor de alertas (useAlertStore) emite alertas de sensor IoT
// (severity danger/warning) vía el evento `alertTriggered`. Las mapeamos a la
// shape `iotAlerts` que ya entiende aggregateNotifications, para que el centro
// de notificaciones unifique IoT + clima + tareas + sistema en un solo lugar.
// 'danger' → 'critical' (el sistema de notificaciones usa critical/warning/info)
// y se inyecta timestamp si falta para pasar el filtro de frescura (<24h).
function mapSensorAlertsToIot(alerts) {
  if (!Array.isArray(alerts)) return [];
  return alerts.map((a) => ({
    id: a.type || a.id,
    sensor: a.sensor || a.type || 'sensor',
    title: a.title || a.label || 'Alerta de sensor',
    message: a.message || a.body || a.detail || '',
    severity: a.severity === 'danger' ? 'critical' : (a.severity || 'warning'),
    timestamp: a.timestamp || a.created_at || Date.now(),
  }));
}

export default function NotificationsBell({ onNavigate }) {
    const [open, setOpen] = useState(false);
    const [tick, setTick] = useState(0);
    // PoC #316 — tabs Notificaciones / Clima. Default "notif" para no romper
    // memoria muscular del operador; el clima vive en su propia pestaña con
    // badge propio para llamarle la atención cuando hay alerta crítica.
    const [activeTab, setActiveTab] = useState('notif');
    const [clima, setClima] = useState(() => getCachedClimaSnapshot());
    const [climaLoading, setClimaLoading] = useState(false);
    // #308 — conteo real de transacciones en quarantine (cambios sin sincronizar),
    // cargado async desde syncManager. Antes estaba hardcodeado a 0, así que el
    // bell nunca mostraba "sync stuck". Conecta el estado de sincronización al
    // centro de notificaciones.
    const [failedTxCount, setFailedTxCount] = useState(0);
    // tasks vencidas reales desde useLogStore (log--task pending). Antes estaba
    // hardcodeado a [], así que el bell nunca mostraba "tareas vencidas".
    const [pendingTasks, setPendingTasks] = useState([]);

    const plants = useAssetStore((s) => s.plants);
    const sensorAlerts = useAlertStore((s) => s.activeAlerts);
    const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
    const fincas = useFincaActiveStore((s) => s.fincas);

    useEffect(() => {
        function onDismiss() { setTick((t) => t + 1); }
        function onClimaUpdated(e) { setClima(e.detail || getCachedClimaSnapshot()); }
        window.addEventListener('chagra:notifications-dismissed', onDismiss);
        window.addEventListener('chagra:sw:update-ready', onDismiss);
        window.addEventListener('chagra:clima:updated', onClimaUpdated);
        return () => {
            window.removeEventListener('chagra:notifications-dismissed', onDismiss);
            window.removeEventListener('chagra:sw:update-ready', onDismiss);
            window.removeEventListener('chagra:clima:updated', onClimaUpdated);
        };
    }, []);

    // #308 — carga el conteo de quarantine al montar y cada vez que se abre el
    // panel o se descarta una notif. setState dentro del .then() para no
    // disparar set-state-in-effect sincrónico.
    useEffect(() => {
        let alive = true;
        syncManager.getFailedTransactions()
            .then((txs) => { if (alive) setFailedTxCount(Array.isArray(txs) ? txs.length : 0); })
            .catch(() => {});
        useLogStore.getState().getPendingTasks()
            .then((tasks) => { if (alive) setPendingTasks(Array.isArray(tasks) ? tasks : []); })
            .catch(() => {});
        return () => { alive = false; };
    }, [open, tick]);

    // PoC #316 — pide snapshot fresco al abrir el panel. El sidecar tiene su
    // propia cache de 30 min, así que esto es un "ping" barato. setState va
    // dentro del .then() para evitar el flag react-hooks/set-state-in-effect.
    useEffect(() => {
        if (!open) return undefined;
        let alive = true;
        let started = false;
        const p = fetchClimaSnapshot();
        // marca loading vía microtask para no llamar setState sincrónicamente
        Promise.resolve().then(() => { if (alive) { started = true; setClimaLoading(true); } });
        p.then((payload) => { if (alive && payload) setClima(payload); })
            .finally(() => { if (alive && started) setClimaLoading(false); });
        return () => { alive = false; };
    }, [open]);

    const handleClimaRefresh = useCallback(() => {
        setClimaLoading(true);
        fetchClimaSnapshot({ forceRefresh: true })
            .then((payload) => { if (payload) setClima(payload); })
            .finally(() => setClimaLoading(false));
    }, []);

    const notifications = useMemo(() => {
        const finca = fincas.find((f) => f.slug === activeFincaSlug);
        return aggregateNotifications({
            plants,
            tasks: pendingTasks,
            failedTxCount,
            hasUpdate: readUpdateAvailable(),
            onboardingComplete: readOnboardingComplete(),
            bioculturalZone: finca?.biocultural_zone || null,
            calendarMonth: null,
            iotAlerts: mapSensorAlertsToIot(sensorAlerts),
        });
        // tick force re-run on dismiss event
    }, [plants, sensorAlerts, activeFincaSlug, fincas, tick, failedTxCount, pendingTasks]); // eslint-disable-line react-hooks/exhaustive-deps

    // PoC #316 — el clima cuenta para los badges del bell. Las alertas
    // locales de Open-Meteo (helada/calor/torrencial/etc) escalan severity;
    // la fase ENSO solo contribuye con "warning" si está en moderado/fuerte.
    const climaAlertasLocales = Array.isArray(clima?.alertas_locales) ? clima.alertas_locales : [];
    const climaCritical = climaAlertasLocales.filter((a) => a.severity === 'critical').length;
    const climaWarning = climaAlertasLocales.filter((a) => a.severity === 'warning').length;
    const climaInfo = climaAlertasLocales.filter((a) => a.severity === 'info').length;
    const climaTotal = climaAlertasLocales.length;
    const ensoSeverity = clima?.enso_status?.severity || 'neutral';
    const ensoIsCritical = ensoSeverity === 'critical';
    const ensoIsWarning = ensoSeverity === 'warning';

    const criticalCount = notifications.filter((n) => n.severity === 'critical').length + climaCritical + (ensoIsCritical ? 1 : 0);
    const warningCount = notifications.filter((n) => n.severity === 'warning').length + climaWarning + (ensoIsWarning ? 1 : 0);
    const totalCount = notifications.length + climaTotal + (ensoIsCritical || ensoIsWarning ? 1 : 0);

    const handleAction = useCallback((notif) => {
        if (notif.type === 'app_update') {
            window.location.reload();
            return;
        }
        if (notif.cta_view) {
            // 2026-05-28: si la notificación va al agente y trae prompt
            // pre-cargado + fuente, lo pasamos como initialContext para
            // que AgentScreen prellene el textarea y muestre la cita de
            // la entidad emisora. Para otros destinos (perfil, task_log,
            // mapa, etc.) onNavigate se llama sin payload — backwards
            // compatible.
            const goingToAgent = notif.cta_view === 'agente';
            const hasContext = !!(notif.prefilled_prompt || notif.source_url || notif.alert_context);
            if (goingToAgent && hasContext) {
                onNavigate?.('agente', {
                    prefilledPrompt: notif.prefilled_prompt || '',
                    sourceLabel: notif.source_label || null,
                    sourceUrl: notif.source_url || null,
                    alertContext: notif.alert_context || {
                        title: notif.title || '',
                        body: notif.body || '',
                        severity: notif.severity || 'info',
                        type: notif.type || null,
                    },
                });
            } else {
                onNavigate?.(notif.cta_view);
            }
        }
        setOpen(false);
    }, [onNavigate]);

    // 2026-05-28: handler para alertas dentro del ClimaPanel. Cada alerta
    // local (helada/lluvia/calor/etc.) puede saltar al agente con un prompt
    // pre-cargado y cita Open-Meteo. La fuente Open-Meteo siempre se cita
    // como respaldo institucional ("respaldado por IDEAM via Open-Meteo").
    const handleClimaAlertAction = useCallback((alerta) => {
        if (!onNavigate) return;
        const tipoHumano = (alerta.tipo || '').replace(/_/g, ' ');
        const diasTxt = Array.isArray(alerta.dias) && alerta.dias.length > 0
            ? ` en ${alerta.dias.slice(0, 3).join(', ')}`
            : '';
        const prompt = `Tengo alerta de ${tipoHumano}${diasTxt} (${alerta.mensaje || 'sin detalle adicional'}). ¿Qué hago para proteger mi cultivo?`;
        const sourceUrl = clima?.openmeteo?.source_url
            || 'https://open-meteo.com/en/docs';
        onNavigate('agente', {
            prefilledPrompt: prompt,
            sourceLabel: 'Open-Meteo (umbrales agroecológicos Chagra)',
            sourceUrl,
            alertContext: {
                title: `Alerta: ${tipoHumano}`,
                body: alerta.mensaje || '',
                severity: alerta.severity || 'warning',
                type: 'climate_local_alert',
            },
        });
        setOpen(false);
    }, [onNavigate, clima]);

    // 2026-05-28: handler para ENSO badge → agente con prompt situado.
    // El operador puede preguntar "qué significa para mi finca" sin re-tipear,
    // citando NOAA/IDEAM/CIIFEN como fuente.
    const handleEnsoAction = useCallback(() => {
        if (!onNavigate || !clima?.enso_status) return;
        const phase = clima.enso_status.phase || 'neutral';
        const phaseLabel = describePhase(phase);
        const sources = Array.isArray(clima.enso_status.sources) ? clima.enso_status.sources.join(', ') : '';
        const prompt = `Estoy con fase ENSO actual: ${phaseLabel}${sources ? ` (fuentes: ${sources})` : ''}. ¿Cómo afecta a mi finca en los próximos meses y qué medidas tomo?`;
        // IDEAM es la fuente preferida para Colombia; si no, NOAA CPC global.
        const sourceUrl = phase === 'neutral'
            ? 'http://www.pronosticosyalertas.gov.co/clima/condiciones-globales'
            : 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/';
        onNavigate('agente', {
            prefilledPrompt: prompt,
            sourceLabel: phase === 'neutral' ? 'IDEAM · Condiciones globales' : 'NOAA CPC · ENSO Advisory',
            sourceUrl,
            alertContext: {
                title: `ENSO: ${phaseLabel}`,
                body: '',
                severity: clima.enso_status.severity || 'info',
                type: 'enso_phase',
            },
        });
        setOpen(false);
    }, [onNavigate, clima]);

    const handleDismiss = useCallback((id, e) => {
        e?.stopPropagation();
        dismissNotification(id);
    }, []);

    // VIVO — severity-aware visual del botón. Si crítico: pulsa rojo, halo
    // expansivo, icono Bell shake suave. Si warning: ámbar steady. Si info: sky.
    const hasCritical = criticalCount > 0;
    const hasWarning = warningCount > 0;
    const buttonClass = hasCritical
        ? 'relative p-2 rounded-lg bg-red-900/40 border-2 border-red-500 text-red-200 min-h-[44px] min-w-[44px] flex items-center justify-center chagra-bell-critical'
        : hasWarning
            ? 'relative p-2 rounded-lg bg-amber-900/30 border border-amber-600/60 text-amber-200 min-h-[44px] min-w-[44px] flex items-center justify-center'
            : 'relative p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-700 border border-slate-700 text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center';

    const badgeBg = hasCritical ? 'bg-red-600' : hasWarning ? 'bg-amber-500' : 'bg-sky-500';

    return (
        <>
            <style>{`
                @keyframes chagra-bell-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55), 0 0 12px 0 rgba(239, 68, 68, 0.35); }
                    50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0), 0 0 22px 4px rgba(239, 68, 68, 0.55); }
                }
                @keyframes chagra-bell-shake {
                    0%, 100% { transform: rotate(0deg); }
                    20% { transform: rotate(-10deg); }
                    40% { transform: rotate(8deg); }
                    60% { transform: rotate(-6deg); }
                    80% { transform: rotate(4deg); }
                }
                .chagra-bell-critical {
                    animation: chagra-bell-pulse 1.6s ease-in-out infinite;
                }
                .chagra-bell-critical .chagra-bell-icon {
                    animation: chagra-bell-shake 1.6s ease-in-out infinite;
                    transform-origin: 50% 20%;
                }
            `}</style>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={totalCount > 0 ? `Notificaciones (${totalCount}${hasCritical ? ', urgente' : ''})` : 'Notificaciones'}
                title={hasCritical ? '⚠️ Alerta crítica' : 'Notificaciones'}
                aria-expanded={open}
                className={buttonClass}
            >
                <Bell size={20} aria-hidden="true" className="chagra-bell-icon" />
                {totalCount > 0 && (
                    <span
                        aria-hidden="true"
                        className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${badgeBg}`}
                    >
                        {totalCount > 9 ? '9+' : totalCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-[90]"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        role="dialog"
                        aria-label="Panel de notificaciones"
                        className="fixed top-[60px] right-2 left-2 sm:left-auto sm:right-3 sm:w-[400px] max-h-[80vh] overflow-y-auto bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl z-[95]"
                    >
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Bell size={18} className="text-emerald-400" />
                                Notificaciones {hasCritical && <span className="text-xs text-red-400 font-medium animate-pulse">· urgente</span>}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Cerrar panel"
                                className="p-1 rounded-full hover:bg-slate-800 text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* PoC #316 — tabs notif/clima. El clima vive en su propia
                            pestaña con badge propio para no enterrarlo en la lista
                            normal de notificaciones cuando hay alerta crítica. */}
                        <div className="sticky top-[58px] z-10 bg-slate-900/95 border-b border-slate-800 flex">
                            <TabButton
                                active={activeTab === 'notif'}
                                onClick={() => setActiveTab('notif')}
                                icon={Bell}
                                label="Notificaciones"
                                count={notifications.length}
                                accent="emerald"
                            />
                            <TabButton
                                active={activeTab === 'clima'}
                                onClick={() => setActiveTab('clima')}
                                icon={Cloud}
                                label="Clima"
                                count={climaTotal + (ensoIsCritical || ensoIsWarning ? 1 : 0)}
                                accent={phaseBadgeColor(clima?.enso_status?.phase)}
                            />
                        </div>

                        {activeTab === 'notif' && (
                            notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 text-sm">
                                    <Bell size={36} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-medium">Todo en orden por ahora.</p>
                                    <p className="text-xs mt-1">Te avisaré si hay algo urgente en tu finca.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-800">
                                    {notifications.map((n) => {
                                        const TypeIcon = TYPE_ICONS[n.type] || Info;
                                        const SeverityIcon = SEVERITY_ICONS[n.severity] || Info;
                                        return (
                                            <li
                                                key={n.id}
                                                className={`px-4 py-3 border-l-4 ${SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="shrink-0 mt-0.5">
                                                        <TypeIcon size={22} aria-hidden="true" />
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start gap-2">
                                                            <SeverityIcon size={14} className="shrink-0 mt-0.5 opacity-70" />
                                                            <h4 className="text-sm font-bold leading-tight">{n.title}</h4>
                                                        </div>
                                                        {n.body && (
                                                            <p className="text-xs mt-1 opacity-85 leading-relaxed">{n.body}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {n.cta_label && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAction(n)}
                                                                    className="text-xs font-bold px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 text-white"
                                                                >
                                                                    {n.cta_label}
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDismiss(n.id, e)}
                                                                className="text-xs px-2 py-1 rounded-md hover:bg-white/5 opacity-70 hover:opacity-100"
                                                                aria-label={`Descartar: ${n.title}`}
                                                            >
                                                                Descartar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )
                        )}

                        {activeTab === 'clima' && (
                            <ClimaPanel
                                snapshot={clima}
                                loading={climaLoading}
                                onRefresh={handleClimaRefresh}
                                climaInfo={climaInfo}
                                onAlertAction={handleClimaAlertAction}
                                onEnsoAction={handleEnsoAction}
                            />
                        )}
                    </div>
                </>
            )}
        </>
    );
}

/**
 * Tab button — controla activeTab. Muestra un dot pequeño si hay items en
 * la pestaña no-activa para guiar al operador.
 */
function TabButton(props) {
    const { active, onClick, icon, label, count, accent } = props;
    const Icon = icon;
    const accentMap = {
        emerald: 'border-emerald-500 text-emerald-300',
        red: 'border-red-500 text-red-300',
        amber: 'border-amber-500 text-amber-300',
        sky: 'border-sky-500 text-sky-300',
    };
    const activeClass = accentMap[accent] || accentMap.emerald;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 px-3 py-2.5 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${active ? activeClass : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/10' : 'bg-slate-800/80 text-slate-300'}`}>
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </button>
    );
}

const PHASE_COLOR_CLASSES = {
    red: 'bg-red-900/30 border-red-700/60 text-red-200',
    amber: 'bg-amber-900/30 border-amber-700/60 text-amber-200',
    sky: 'bg-sky-900/30 border-sky-700/60 text-sky-200',
    emerald: 'bg-emerald-900/30 border-emerald-700/60 text-emerald-200',
};

function pickWeatherIcon(precipMm, tempMax) {
    if (precipMm != null && precipMm >= 10) return CloudRain;
    if (precipMm != null && precipMm >= 2) return Cloud;
    if (tempMax != null && tempMax >= 30) return Sun;
    return CloudSun;
}

function formatDayLabel(isoDate, i) {
    if (i === 0) return 'Hoy';
    try {
        const d = new Date(isoDate);
        return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
    } catch (_) {
        return '–';
    }
}

/**
 * ClimaPanel — pestaña clima del bell. Muestra:
 *   1. Badge ENSO (NOAA + IDEAM)
 *   2. Alertas locales (Open-Meteo + umbrales agroecológicos)
 *   3. Pronóstico 7 días
 *   4. Recomendación general del agente (regla derivada del snapshot,
 *      sin segundo LLM round-trip — la verdadera recomendación situada
 *      vive en el chat del agente, que ya tiene el bloque inyectado).
 *   5. Atribuciones de fuente.
 */
function ClimaPanel({ snapshot, loading, onRefresh, climaInfo, onAlertAction, onEnsoAction }) {
    if (!snapshot) {
        return (
            <div className="p-6 text-center text-slate-500 text-sm">
                <Cloud size={36} className="mx-auto mb-3 opacity-40" />
                {loading ? (
                    <p className="font-medium">Consultando IDEAM, NOAA y Open-Meteo…</p>
                ) : (
                    <>
                        <p className="font-medium">Clima no disponible.</p>
                        <p className="text-xs mt-1">El sidecar de Chagra no contestó. Inténtalo más tarde.</p>
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                            <RefreshCw size={14} /> Reintentar
                        </button>
                    </>
                )}
            </div>
        );
    }

    const enso = snapshot.enso_status || {};
    const phase = enso.phase || 'neutral';
    const color = phaseBadgeColor(phase);
    const colorClass = PHASE_COLOR_CLASSES[color] || PHASE_COLOR_CLASSES.emerald;

    const alertas = Array.isArray(snapshot.alertas_locales) ? snapshot.alertas_locales : [];
    const forecast = snapshot.openmeteo?.available ? snapshot.openmeteo.forecast_7d : [];
    const sources = Array.isArray(enso.sources) ? enso.sources : [];
    const probs = enso.ideam_probabilities || enso.ideam_probabilidades || null;

    // Recomendación del agente generada client-side desde el snapshot — fast,
    // sin LLM. La recomendación "fina" la da el chat (que ya tiene el bloque
    // climático en su system prompt).
    const recomendacion = buildClientRecommendation(snapshot);

    return (
        <div className="divide-y divide-slate-800">
            {/* ENSO badge */}
            <section className={`p-4 border-l-4 ${colorClass}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Activity size={18} aria-hidden="true" />
                            <h4 className="text-sm font-bold">{describePhase(phase)}</h4>
                        </div>
                        {typeof enso.oni_value === 'number' && (
                            <p className="text-xs mt-1 opacity-85">
                                ONI NOAA: <span className="tabular-nums font-bold">{enso.oni_value.toFixed(2)}°C</span>
                                {enso.trend ? <> · tendencia {enso.trend === 'rising' ? '↑ subiendo' : enso.trend === 'falling' ? '↓ bajando' : '→ estable'}</> : null}
                            </p>
                        )}
                        {probs && (
                            <p className="text-xs mt-1 opacity-85">
                                IDEAM: <span className="font-bold">{probs.nino_pct}%</span> Niño · <span className="font-bold">{probs.neutral_pct}%</span> Neutro · <span className="font-bold">{probs.nina_pct}%</span> Niña
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="shrink-0 p-1.5 rounded-md hover:bg-white/10 text-slate-300"
                        aria-label="Refrescar clima"
                        title="Refrescar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
                {/* 2026-05-28 UX: CTA al agente con ENSO context pre-cargado */}
                {typeof onEnsoAction === 'function' && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={onEnsoAction}
                            className="text-xs font-bold px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 text-white"
                        >
                            Preguntar al agente
                        </button>
                        {sources.length > 0 && (
                            <span className="text-[10px] opacity-70 italic">
                                Cita: {sources[0]}
                            </span>
                        )}
                    </div>
                )}
            </section>

            {/* Alertas locales */}
            {alertas.length > 0 && (
                <section className="p-4 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Alertas locales</h5>
                    {alertas.slice(0, 6).map((a, i) => {
                        const sevClass =
                            a.severity === 'critical' ? 'bg-red-900/30 border-red-700/50 text-red-200' :
                            a.severity === 'warning' ? 'bg-amber-900/30 border-amber-700/50 text-amber-200' :
                            'bg-sky-900/30 border-sky-700/50 text-sky-200';
                        return (
                            <div key={`${a.tipo}-${i}`} className={`text-xs p-2.5 rounded-lg border ${sevClass}`}>
                                <p className="font-bold capitalize mb-0.5">{a.tipo.replace(/_/g, ' ')}</p>
                                <p className="opacity-90 leading-relaxed">{a.mensaje}</p>
                                {/* 2026-05-28 UX: salto al agente con prompt
                                    contextualizado + cita Open-Meteo */}
                                {typeof onAlertAction === 'function' && (
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            onClick={() => onAlertAction(a)}
                                            className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 text-white"
                                        >
                                            Preguntar al agente
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            )}

            {/* Forecast 7 días */}
            {forecast.length > 0 && (
                <section className="p-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pronóstico 7 días (Open-Meteo)</h5>
                    <div className="grid grid-cols-7 gap-1.5">
                        {forecast.slice(0, 7).map((d, i) => {
                            const Icon = pickWeatherIcon(d.precip_mm, d.temp_max_c);
                            return (
                                <div key={d.date || i} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDayLabel(d.date, i)}</span>
                                    <Icon size={20} className={(d.precip_mm ?? 0) >= 10 ? 'text-sky-400' : (d.precip_mm ?? 0) >= 2 ? 'text-slate-300' : 'text-amber-300'} aria-hidden="true" />
                                    {d.temp_max_c != null && (
                                        <span className="text-[11px] font-bold tabular-nums text-white">{Math.round(d.temp_max_c)}°</span>
                                    )}
                                    {d.temp_min_c != null && (
                                        <span className="text-[10px] tabular-nums text-slate-400">{Math.round(d.temp_min_c)}°</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Thermometer size={12} className="text-rose-400" /> Máx/Mín</span>
                        <span className="flex items-center gap-1"><Droplets size={12} className="text-sky-400" /> Lluvia</span>
                        <span className="flex items-center gap-1"><Wind size={12} className="text-emerald-400" /> Viento</span>
                    </div>
                </section>
            )}

            {/* Recomendación del agente */}
            <section className="p-4 bg-emerald-950/20 border-l-4 border-emerald-700/50">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">Recomendación del agente</h5>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{recomendacion}</p>
                {climaInfo > 0 && (
                    <p className="text-[10px] text-slate-400 mt-2 italic">Pregunta al agente "¿cómo afecta a mi cultivo?" para recomendación específica de manejo.</p>
                )}
            </section>

            {/* Sources */}
            {sources.length > 0 && (
                <section className="px-4 py-3 text-[10px] text-slate-500 leading-relaxed">
                    Fuentes: {sources.join(' · ')}
                    {snapshot.fetched_at && (
                        <> · actualizado {new Date(snapshot.fetched_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                </section>
            )}
        </div>
    );
}

/**
 * Recomendación corta derivada del snapshot (sin LLM round-trip). El chat
 * del agente ya tiene el bloque inyectado para la respuesta fina situada.
 */
function buildClientRecommendation(snapshot) {
    const phase = snapshot?.enso_status?.phase || 'neutral';
    const critical = (snapshot?.alertas_locales || []).filter((a) => a.severity === 'critical');
    if (critical.length > 0) {
        return `Tienes ${critical.length} alerta${critical.length === 1 ? '' : 's'} crítica${critical.length === 1 ? '' : 's'} en los próximos días. Protege primero los cultivos sensibles (semilleros, recién trasplantados, fruta a punto). Si vas al campo, lleva el celular para registrar lo que cambies.`;
    }
    if (phase === 'nino_fuerte' || phase === 'nino_moderado') {
        return 'El Niño activo. Espera más calor y menos lluvia que el promedio. Prioriza riego eficiente (goteo), mulch para conservar humedad, sombrío en cultivos jóvenes, y siembra variedades tolerantes a estrés hídrico.';
    }
    if (phase === 'nina_fuerte' || phase === 'nina_moderada') {
        return 'La Niña activa. Espera más lluvia que el promedio y enfermedades fúngicas. Revisa drenajes, rota fungicidas preventivos (biopreparados primero), siembra en camas altas y monitorea Phytophthora/mildiu en solanáceas.';
    }
    if (phase === 'nino_debil' || phase === 'nina_debil') {
        return 'Señal ENSO débil — el clima de los próximos meses se comporta cerca del promedio histórico. Mantén el calendario habitual de siembra y atención normal a plagas.';
    }
    return 'Condiciones ENSO neutras. Sigue tu calendario de siembra habitual y revisa el pronóstico de 7 días para decisiones de corto plazo.';
}

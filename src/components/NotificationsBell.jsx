import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, X, AlertTriangle, Info, AlertCircle, Sprout, Cloud, Wifi, Droplets, ListChecks, Sparkles, Snowflake } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import useFincaActiveStore from '../services/fincaActiveStore';
import { aggregateNotifications, dismissNotification } from '../services/notificationsService';

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

export default function NotificationsBell({ onNavigate }) {
    const [open, setOpen] = useState(false);
    const [tick, setTick] = useState(0);

    const plants = useAssetStore((s) => s.plants);
    const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
    const fincas = useFincaActiveStore((s) => s.fincas);

    useEffect(() => {
        function onDismiss() { setTick((t) => t + 1); }
        window.addEventListener('chagra:notifications-dismissed', onDismiss);
        window.addEventListener('chagra:sw:update-ready', onDismiss);
        return () => {
            window.removeEventListener('chagra:notifications-dismissed', onDismiss);
            window.removeEventListener('chagra:sw:update-ready', onDismiss);
        };
    }, []);

    const notifications = useMemo(() => {
        const finca = fincas.find((f) => f.slug === activeFincaSlug);
        return aggregateNotifications({
            plants,
            tasks: [],
            failedTxCount: 0,
            hasUpdate: readUpdateAvailable(),
            onboardingComplete: readOnboardingComplete(),
            bioculturalZone: finca?.biocultural_zone || null,
            calendarMonth: null,
            iotAlerts: [],
        });
        // tick force re-run on dismiss event
    }, [plants, activeFincaSlug, fincas, tick]); // eslint-disable-line react-hooks/exhaustive-deps

    const criticalCount = notifications.filter((n) => n.severity === 'critical').length;
    const warningCount = notifications.filter((n) => n.severity === 'warning').length;
    const totalCount = notifications.length;

    const handleAction = useCallback((notif) => {
        if (notif.type === 'app_update') {
            window.location.reload();
            return;
        }
        if (notif.cta_view) {
            onNavigate?.(notif.cta_view);
        }
        setOpen(false);
    }, [onNavigate]);

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

                        {totalCount === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                <Bell size={36} className="mx-auto mb-3 opacity-40" />
                                <p className="font-medium">Todo en orden por ahora.</p>
                                <p className="text-xs mt-1">Te avisaré si hay algo urgente en tu finca o cambio de clima.</p>
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
                        )}
                    </div>
                </>
            )}
        </>
    );
}

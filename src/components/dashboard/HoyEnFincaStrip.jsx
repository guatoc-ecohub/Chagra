import { useEffect, useMemo, useState } from 'react';
import { Sun, CloudSun, Cloud, CloudFog, CloudRain, Sunrise, Bell, ClipboardList, ChevronRight } from 'lucide-react';
import useAlertStore from '../../store/useAlertStore';
import { listFarmProcesses } from '../../db/farmProcessCache';
import {
    resolveClimaLocation,
    getCachedClimaSnapshot,
    fetchClimaSnapshot,
} from '../../services/climaService';
import { getCachedSkyConditions, fetchSkyConditions } from '../../services/skyConditionService';
import { buildClimaHoy, buildTareasSemana, buildAgenda, agendaPorDia } from '../../services/hoyEnFincaService';

/**
 * HoyEnFincaStrip — resumen proactivo "Hoy en finca" para el dashboard.
 *
 * Primera sección bajo el hero: de un vistazo el campesino ve el día
 * (condición HONESTA del cielo), cuántas alertas hay y cuántas labores
 * tiene la semana. Tocar cualquier parte → la vista completa 'hoy_finca'.
 *
 * Misma dieta offline-first de ClimaStrip: pinta caches al instante y
 * refresca en background (los fetch nunca lanzan). Sin datos → texto
 * honesto, sin sol inventado.
 *
 * `embedded` (consolidación home F2 2026-07-04): cuando el strip vive DENTRO
 * de EstadoDelDiaCard (el card único "Cómo va su finca hoy"), pierde su
 * cáscara de tarjeta (fondo/borde/redondeo) — el contenedor la pone UNA vez
 * para los tres paneles fundidos. Solo cambia la capa visual; datos idénticos.
 */

const CONDITION_ICONS = {
    despejado: { Icon: Sun, cls: 'text-amber-300' },
    parcial: { Icon: CloudSun, cls: 'text-slate-200' },
    nublado: { Icon: Cloud, cls: 'text-slate-400' },
    niebla: { Icon: CloudFog, cls: 'text-slate-300' },
    lluvia: { Icon: CloudRain, cls: 'text-sky-400' },
};

export default function HoyEnFincaStrip({ onNavigate, embedded = false }) {
    const activeAlerts = useAlertStore((s) => s.activeAlerts);
    const geo = useMemo(() => resolveClimaLocation(), []);

    const [snapshot, setSnapshot] = useState(() => (geo
        ? getCachedClimaSnapshot(geo.lat, geo.lng, geo.elevation)
        : getCachedClimaSnapshot()));
    const [sky, setSky] = useState(() => (geo
        ? getCachedSkyConditions(geo.lat, geo.lng, geo.elevation)
        : null));
    const [processes, setProcesses] = useState([]);

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
            .catch(() => { /* IDB falló — strip sin tareas, no rompe */ });
        return () => { alive = false; };
    }, [geo]);

    const elevationM = geo?.elevation ?? null;
    const ensoPhase = snapshot?.enso_status?.phase || 'neutral';
    const clima = useMemo(
        () => buildClimaHoy({ snapshot, sky, elevationM }),
        [snapshot, sky, elevationM],
    );
    const nTareas = useMemo(
        () => buildTareasSemana({ processes, altitudeM: elevationM, ensoPhase })
            .reduce((acc, g) => acc + g.tareas.length, 0),
        [processes, elevationM, ensoPhase],
    );
    const proximo = useMemo(() => {
        const dias = agendaPorDia(buildAgenda({ processes, altitudeM: elevationM }));
        const conItems = dias.find((d) => d.items.length > 0);
        return conItems ? { dia: conItems.label, item: conItems.items[0] } : null;
    }, [processes, elevationM]);

    const fecha = useMemo(
        () => new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
        [],
    );

    const { Icon: CondIcon, cls: condCls } = CONDITION_ICONS[clima.condition] || CONDITION_ICONS.parcial;

    return (
        <button
            type="button"
            data-testid="hoy-en-finca-strip"
            onClick={() => onNavigate?.('hoy_finca')}
            aria-label="Hoy en finca: ver el día completo, alertas, tareas y agenda"
            className={embedded
                ? 'group w-full text-left p-4 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors motion-reduce:transition-none'
                : 'group w-full text-left rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900/60 backdrop-blur-xl border border-emerald-800/30 p-4 ring-2 ring-emerald-500/0 hover:ring-emerald-500/30 active:scale-[0.99] transition-all'}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2 min-w-0">
                    <Sunrise size={20} style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
                    Hoy en finca
                </h3>
                {/* Sin `capitalize` (Tailwind): esa clase mayúscula CADA palabra
                    ("Sábado, 4 De Julio" — bug UX audit 2026-07-04 P2-4). El
                    es-CO de Intl ya devuelve la fecha en minúscula correcta. */}
                <span className="text-[10px] text-slate-400 truncate shrink">{fecha}</span>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </div>

            <div className="flex items-center gap-3">
                {/* Clima honesto de hoy */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {clima.hasData ? (
                        <>
                            <CondIcon size={32} className={`${condCls} shrink-0`} aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">{clima.label}</p>
                                {clima.tempMaxC != null && (
                                    <p className="text-xs text-slate-400 tabular-nums">
                                        {Math.round(clima.tempMaxC)}°{clima.tempMinC != null ? ` / ${Math.round(clima.tempMinC)}°` : ''}
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-400">El clima de hoy carga cuando haya señal.</p>
                    )}
                </div>

                {/* Chips: alertas + tareas */}
                <div className="flex items-center gap-2 shrink-0">
                    {activeAlerts.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-600/40 text-amber-300 text-xs font-black tabular-nums">
                            <Bell size={12} aria-hidden="true" />
                            {activeAlerts.length}
                        </span>
                    )}
                    {nTareas > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.07] border border-white/[0.1] text-slate-200 text-xs font-black tabular-nums">
                            <ClipboardList size={12} aria-hidden="true" />
                            {nTareas}
                        </span>
                    )}
                </div>
            </div>

            {/* Próximo evento de agenda (si existe — sin inventar) */}
            {proximo && (
                <p className="text-xs text-slate-300 mt-2 truncate">
                    <span aria-hidden="true">{proximo.item.emoji} </span>
                    <span className="font-bold">{proximo.dia}:</span>{' '}
                    {proximo.item.etiqueta} {proximo.item.tipo === 'cosecha' ? 'abre cosecha' : `entra a ${proximo.item.stageLabel}`}
                </p>
            )}
        </button>
    );
}

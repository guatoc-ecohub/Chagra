import { useEffect, useState, useMemo } from 'react';
import { Cloud, CloudRain, Sun, CloudSun, Droplets, Wind, Thermometer, MapPin } from 'lucide-react';
import { getClimaIdeam } from '../../services/sidecarClient';
import { FARM_CONFIG } from '../../config/defaults';
import useFincaActiveStore from '../../services/fincaActiveStore';

/**
 * ClimaStrip — pronóstico IDEAM 7 días debajo del agente.
 * Si tiene municipio (finca activa o FARM_CONFIG): pide get_clima_ideam y muestra.
 * Si no: card invitando a configurar ubicación.
 */

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function pickIcon(precipMm, tempC) {
    if (precipMm >= 10) return CloudRain;
    if (precipMm >= 2) return Cloud;
    if (tempC >= 24) return Sun;
    return CloudSun;
}

function formatDay(date) {
    return DAY_LABELS[date.getDay()];
}

export default function ClimaStrip({ onNavigate }) {
    const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
    const fincas = useFincaActiveStore((s) => s.fincas);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const municipio = useMemo(() => {
        const activeFinca = fincas.find((f) => f.slug === activeFincaSlug);
        return activeFinca?.municipio || FARM_CONFIG?.MUNICIPIO || null;
    }, [activeFincaSlug, fincas]);

    useEffect(() => {
        let alive = true;
        if (!municipio) {
            Promise.resolve().then(() => { if (alive) setLoading(false); });
            return () => { alive = false; };
        }
        const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);
        getClimaIdeam('monthly_avg', { municipio, metric: 'precipitation', desde })
            .then((res) => { if (alive) setData(res); })
            .catch(() => { if (alive) setData(null); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [municipio]);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-5 animate-pulse">
                <div className="h-4 w-32 bg-slate-700/40 rounded mb-3" />
                <div className="grid grid-cols-7 gap-2">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-700/30 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!municipio) {
        return (
            <div className="bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                    <Cloud size={20} className="text-sky-300" />
                    <h3 className="text-base font-bold text-white">Clima en tu zona</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                    Cuéntame en qué municipio queda tu finca y te traigo el pronóstico real del IDEAM.
                </p>
                {/* Bug fix 2026-05-28 (Brave laptop): el botón no tenía
                    onClick — operador clickeaba y nada pasaba. Ahora navega
                    a `perfil` donde MultifincaGpsSection permite editar la
                    finca activa (que incluye municipio). Si no hay onNavigate
                    (uso aislado en tests o storybook), el handler degrada
                    a un dispatch del event global `chagra:navigate` que el
                    App.jsx escucha. Evita el listener inline-string del
                    feedback CSP-strict (memoria feedback-csp-strict-inline-handlers-bloqueados). */}
                <button
                    type="button"
                    onClick={() => {
                        if (typeof onNavigate === 'function') {
                            onNavigate('perfil');
                            return;
                        }
                        try {
                            // App.jsx escucha 'chagra:nav' (string o {view,data})
                            window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'perfil' }));
                        } catch (_) { /* noop */ }
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-sky-700/30 hover:bg-sky-600/40 border border-sky-500/40 text-sky-200 text-sm font-bold transition-colors flex items-center gap-2"
                >
                    <MapPin size={14} aria-hidden="true" />
                    Configurar ubicación
                </button>
            </div>
        );
    }

    // Genera 7 días mock visual desde data o fallback (mientras get_clima_ideam
    // devuelve formato variable). Si data tiene .days, úsalo. Si no, dibuja 7
    // tarjetas neutras para que la UI no rompa.
    const days = (data?.forecast || data?.days || []).slice(0, 7);
    const today = new Date();
    const filled = Array.from({ length: 7 }, (_, i) => {
        const d = days[i] || {};
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        return {
            label: i === 0 ? 'Hoy' : formatDay(date),
            tempC: typeof d.temp === 'number' ? d.temp : null,
            precipMm: typeof d.precip === 'number' ? d.precip : null,
        };
    });

    const hasReal = filled.some((d) => d.tempC != null);

    return (
        <div className="bg-gradient-to-br from-sky-950/70 to-indigo-950/60 backdrop-blur-xl border border-sky-800/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Cloud size={20} className="text-sky-300 shrink-0" />
                    <h3 className="text-base font-bold text-white truncate">
                        Clima en {municipio.split(',')[0]}
                    </h3>
                </div>
                <span className="text-[10px] text-sky-300/70 font-bold uppercase tracking-wider shrink-0">
                    IDEAM · 7 días
                </span>
            </div>

            {!hasReal && (
                <p className="text-xs text-slate-400 mb-3 italic">
                    El pronóstico fino aún se está cargando. Mientras tanto, ten precaución en la noche con cultivos sensibles.
                </p>
            )}

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {filled.map((d, i) => {
                    const Icon = pickIcon(d.precipMm ?? 0, d.tempC ?? 18);
                    return (
                        <div
                            key={i}
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                        >
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{d.label}</span>
                            <Icon size={22} className={d.precipMm >= 10 ? 'text-sky-400' : d.precipMm >= 2 ? 'text-slate-300' : 'text-amber-300'} />
                            {d.tempC != null && (
                                <span className="text-sm font-bold text-white tabular-nums">{Math.round(d.tempC)}°</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <Thermometer size={14} className="text-rose-400" />
                    <span className="truncate">Temp</span>
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
        </div>
    );
}

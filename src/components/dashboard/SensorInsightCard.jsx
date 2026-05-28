import { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, ThermometerSun } from 'lucide-react';

/**
 * SensorInsightCard — resumen breve IA de los sensores IoT de la finca.
 *
 * Operator 2026-05-28: "el analisis de ia con info de los sensores lo
 * quiero justo debajo de los botones de insumos plagas etc". Card vive
 * pegado al borde inferior del grid de cards, no draggable — es el
 * resumen IA único.
 *
 * Estrategia:
 *   1. Lee del store useAssetStore.iotAlerts (ya hidrate-d al login).
 *   2. Si hay datos recientes (<24h), muestra 1 oración curada:
 *      "🌡️ Tu matera cocina: 18°C / 65% humedad. Sin update hace 4h."
 *   3. Si sin datos / sensor caído, sugiere reconectar.
 *   4. Click → navega a vista `mapa` (donde están los sensores en zonas).
 *
 * Sin llamar al LLM por ahora — texto template determinístico, rápido,
 * 100% predecible. En siguientes iteraciones puede pasar a agentService
 * para resumen LLM real (chagra:agent) con prompt corto.
 */

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30min

function getInsight(sensors) {
    if (!Array.isArray(sensors) || sensors.length === 0) {
        return {
            icon: Wifi,
            color: 'text-slate-400',
            title: 'Sin sensores conectados',
            line: 'Conectá un sensor IoT para ver lecturas en tiempo real.',
            cta: 'Configurar',
        };
    }

    // Stats
    const now = Date.now();
    const fresh = sensors.filter((s) => {
        const t = new Date(s.last_changed || s.timestamp || 0).getTime();
        return (now - t) < STALE_THRESHOLD_MS;
    });
    const stale = sensors.length - fresh.length;

    // Temperatura + humedad mínima si hay
    const temps = sensors.filter((s) => /temp/i.test(s.entity_id || s.kind || ''));
    const tempMin = temps.length > 0
        ? Math.min(...temps.map((s) => parseFloat(s.state) || Infinity).filter((n) => isFinite(n)))
        : null;
    const tempMax = temps.length > 0
        ? Math.max(...temps.map((s) => parseFloat(s.state) || -Infinity).filter((n) => isFinite(n)))
        : null;

    const hums = sensors.filter((s) => /hum/i.test(s.entity_id || s.kind || ''));
    const humAvg = hums.length > 0
        ? Math.round(hums.map((s) => parseFloat(s.state) || 0).reduce((a, b) => a + b, 0) / hums.length)
        : null;

    let line = '';
    if (tempMin != null && tempMax != null && isFinite(tempMin)) {
        line += `${tempMin.toFixed(1)} → ${tempMax.toFixed(1)} °C`;
    }
    if (humAvg != null && !isNaN(humAvg)) {
        line += line ? ` · ${humAvg}% hum.` : `${humAvg}% humedad`;
    }
    if (!line) line = `${sensors.length} sensor${sensors.length === 1 ? '' : 'es'} activos`;
    if (stale > 0) line += ` · ${stale} sin update`;

    // Color por salud
    let color = 'text-emerald-300';
    if (stale === sensors.length) color = 'text-rose-300';
    else if (stale > 0 || tempMin < 5 || tempMax > 35) color = 'text-amber-300';

    return {
        icon: stale === sensors.length ? WifiOff : ThermometerSun,
        color,
        title: 'Sensores de tu finca',
        line,
        cta: 'Ver mapa',
    };
}

export default function SensorInsightCard({ sensors = [], onNavigate }) {
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        // Animation en mount — fade-slide-up
        const t = setTimeout(() => setAnimateIn(true), 50);
        return () => clearTimeout(t);
    }, []);

    const insight = getInsight(sensors);
    const { icon: Icon, color, title, line, cta } = insight;

    return (
        <button
            type="button"
            onClick={() => onNavigate?.('mapa')}
            className="group relative w-full text-left rounded-2xl bg-gradient-to-br from-cyan-500/10 via-emerald-500/8 to-violet-500/10 backdrop-blur-xl border border-cyan-700/30 p-4 transition-all active:scale-[0.98] hover:border-cyan-500/50 mt-3"
            style={{
                opacity: animateIn ? 1 : 0,
                transform: animateIn ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 600ms ease-out, transform 600ms ease-out',
            }}
        >
            <div className="flex items-center gap-3">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-black/35 flex items-center justify-center relative">
                    <Activity size={20} className="text-cyan-300" />
                    {/* Pulse indicator */}
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Icon size={14} className={color} />
                        <h3 className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                            {title}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-200 uppercase tracking-wider">
                            IA
                        </span>
                    </div>
                    <p className={`text-sm font-medium mt-1 leading-snug ${color}`}>
                        {line}
                    </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400 group-hover:text-cyan-300 transition-colors">
                    {cta} →
                </span>
            </div>
        </button>
    );
}

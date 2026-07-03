import { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, ThermometerSun, CloudSun, Brain, Sparkles } from 'lucide-react';

/**
 * AIStatusFooter — barra inferior con status proactivo IA general.
 *
 * Operador 2026-05-28: "el analisis de ia que da el status proactivo en
 * general ponlo en la parte de abajo e integralo de la mejor manera
 * acorde a los ultimos cambios aplicados".
 *
 * Reemplaza SensorInsightCard (que estaba en el medio del dashboard).
 * Esta versión:
 *   1. Vive en el BOTTOM del scroll del DashboardLive (footer-like).
 *   2. Integra 3 ejes de status proactivo IA:
 *      • SENSORES IoT — temp/humedad/conexión última hora.
 *      • CLIMA — pronóstico + alertas ENSO si vienen del sidecar.
 *      • AGENTE — sugerencia contextual del agente Chagra (placeholder
 *        si no hay snapshot disponible).
 *   3. Tres chips clicables que navegan a sus respectivas vistas.
 *   4. Compatible con biopunk idle mode (fade-out junto con resto del
 *      contenido cuando user idle 12s).
 *   5. Animación entry desde abajo (slide-up suave).
 *
 * Props:
 *   - sensors: array de sensores IoT (from useAssetStore.iotAlerts).
 *   - climaSnapshot: objeto opcional con ENSO + 7d forecast (placeholder
 *     hasta que el sidecar #319 esté live).
 *   - agentHint: string opcional con sugerencia del agente.
 *   - onNavigate: handler (view) → navega.
 */

const STALE_THRESHOLD_MS = 30 * 60 * 1000;

function getSensorChip(sensors) {
    if (!Array.isArray(sensors) || sensors.length === 0) {
        return {
            Icon: Wifi,
            label: 'Sin sensores',
            sub: 'Conecta uno',
            color: 'text-slate-400',
            bg: 'bg-slate-800/40',
            border: 'border-slate-700/40',
        };
    }
    const now = Date.now();
    const fresh = sensors.filter((s) => {
        const t = new Date(s.last_changed || s.timestamp || 0).getTime();
        return (now - t) < STALE_THRESHOLD_MS;
    });
    const stale = sensors.length - fresh.length;
    const temps = sensors.filter((s) => /temp/i.test(s.entity_id || s.kind || ''));
    const tempMax = temps.length > 0
        ? Math.max(...temps.map((s) => parseFloat(s.state) || -Infinity).filter((n) => isFinite(n)))
        : null;
    const hums = sensors.filter((s) => /hum/i.test(s.entity_id || s.kind || ''));
    const humAvg = hums.length > 0
        ? Math.round(hums.map((s) => parseFloat(s.state) || 0).reduce((a, b) => a + b, 0) / hums.length)
        : null;

    let label = '';
    if (tempMax != null && isFinite(tempMax)) label += `${tempMax.toFixed(0)}°`;
    if (humAvg != null && !isNaN(humAvg)) label += `${label ? ' · ' : ''}${humAvg}%`;
    if (!label) label = `${sensors.length} sensor${sensors.length === 1 ? '' : 'es'}`;

    const sub = stale > 0 ? `${stale} sin update` : 'al día';
    // Semáforo del chip: todo caído = rose, parcial/extremos = amber, sano =
    // emerald. Bordes /50 + fondos /15 para que el estado se distinga también
    // con brillo de sol directo (antes /40 y /10 se lavaban).
    const color = stale === sensors.length ? 'text-rose-300' : (stale > 0 ? 'text-amber-300' : 'text-emerald-300');
    const bg = stale === sensors.length ? 'bg-rose-500/15' : (stale > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/15');
    const border = stale === sensors.length ? 'border-rose-500/50' : (stale > 0 ? 'border-amber-500/50' : 'border-emerald-500/50');
    return {
        Icon: stale === sensors.length ? WifiOff : ThermometerSun,
        label,
        sub,
        color,
        bg,
        border,
    };
}

function getClimaChip(snapshot) {
    if (!snapshot) {
        return {
            Icon: CloudSun,
            label: 'Clima',
            sub: 'Conectando…',
            color: 'text-slate-400',
            bg: 'bg-slate-800/40',
            border: 'border-slate-700/40',
        };
    }
    const enso = snapshot.enso_status || 'neutral';
    // Escala ENSO como rampa de riesgo: neutral (morpho, token theme-aware)
    // → Niña (sky, húmedo) → Niño débil (amber) → moderado (orange) → fuerte
    // (rose). Textos -300 del safe set (override en themes.css para claros);
    // bordes /50 y fondos /15 para legibilidad exterior.
    const ensoColors = {
        neutral: { color: 'text-morpho-glow', bg: 'bg-morpho/10', border: 'border-morpho/50' },
        nina: { color: 'text-sky-300', bg: 'bg-sky-500/15', border: 'border-sky-500/50' },
        nino_debil: { color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/50' },
        nino_moderado: { color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/50' },
        nino_fuerte: { color: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/50' },
    };
    const c = ensoColors[enso] || ensoColors.neutral;
    const labelByEnso = {
        neutral: 'ENSO Neutral',
        nina: 'La Niña',
        nino_debil: 'Niño débil',
        nino_moderado: 'Niño moderado',
        nino_fuerte: 'Niño fuerte',
    };
    const subtitle = snapshot.next_rain_h != null
        ? `Lluvia en ${snapshot.next_rain_h}h`
        : snapshot.temp_max != null
            ? `${snapshot.temp_max}° hoy`
            : 'Pronóstico OK';
    return {
        Icon: CloudSun,
        label: labelByEnso[enso] || 'Clima',
        sub: subtitle,
        ...c,
    };
}

function getAgentChip(hint) {
    if (!hint) {
        return {
            Icon: Brain,
            label: 'Agente listo',
            sub: 'Pregúntame algo',
            color: 'text-emerald-300',
            bg: 'bg-emerald-500/15',
            border: 'border-emerald-500/50',
        };
    }
    // orchid = token IA generativa del design system (magenta en biopunk,
    // terracota/ocre en los temas claros) — coherente con AIStreamPanel.
    return {
        Icon: Sparkles,
        label: 'Sugerencia',
        sub: hint.length > 30 ? hint.slice(0, 30) + '…' : hint,
        color: 'text-orchid-glow',
        bg: 'bg-orchid/10',
        border: 'border-orchid/50',
    };
}

function Chip({ Icon, label, sub, color, bg, border, onClick, ariaLabel }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border backdrop-blur-xl transition-all active:scale-[0.97] hover:-translate-y-0.5 ${bg} ${border}`}
        >
            <Icon size={18} className={`shrink-0 ${color}`} />
            <div className="flex flex-col items-start min-w-0">
                <span className={`text-xs font-black tracking-wide truncate w-full text-left ${color}`}>{label}</span>
                <span className="text-[10px] font-medium text-slate-400 truncate w-full text-left">{sub}</span>
            </div>
        </button>
    );
}

export default function AIStatusFooter({ sensors = [], climaSnapshot = null, agentHint = null, onNavigate }) {
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setAnimateIn(true), 100);
        return () => clearTimeout(t);
    }, []);

    const sensorChip = getSensorChip(sensors);
    const climaChip = getClimaChip(climaSnapshot);
    const agentChip = getAgentChip(agentHint);

    return (
        <div
            className="mt-6 mb-2 px-1"
            style={{
                opacity: animateIn ? 1 : 0,
                transform: animateIn ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 700ms ease-out, transform 700ms ease-out',
            }}
        >
            {/* Header con tokens morpho (theme-aware: cyan neón en biopunk,
                salvia/verde en los temas claros) en vez de cyan-* crudo. */}
            <div className="flex items-center gap-2 mb-2 px-1">
                <Activity size={14} className="text-morpho motion-safe:animate-pulse" />
                <span className="text-[10px] font-bold text-morpho-glow uppercase tracking-[0.18em]">
                    Status proactivo IA
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-morpho/20 text-morpho-glow uppercase tracking-wider">
                    Live
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-morpho/40 to-transparent" />
            </div>
            <div className="flex gap-2">
                <Chip
                    {...sensorChip}
                    onClick={() => onNavigate?.('mapa')}
                    ariaLabel={`Sensores: ${sensorChip.label}, ${sensorChip.sub}`}
                />
                <Chip
                    {...climaChip}
                    onClick={() => onNavigate?.('agente')}
                    ariaLabel={`Clima: ${climaChip.label}, ${climaChip.sub}`}
                />
                <Chip
                    {...agentChip}
                    onClick={() => onNavigate?.('agente')}
                    ariaLabel={`Agente: ${agentChip.label}, ${agentChip.sub}`}
                />
            </div>
            <p className="text-[9px] text-slate-500 text-center mt-2 italic">
                Toca cualquier chip para profundizar
            </p>
        </div>
    );
}

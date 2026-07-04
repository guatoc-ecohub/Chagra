import { useEffect, useMemo, useState } from 'react';
import {
    Brain,
    Sparkles,
    TrendingUp,
    Droplets,
    ThermometerSun,
    Leaf,
    AlertTriangle,
    CheckCircle2,
    ListTodo,
    CloudRain,
    ArrowRight,
} from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';
import useLogStore from '../../store/useLogStore';
import useAlertStore from '../../store/useAlertStore';
import { getProfile } from '../../services/userProfileService';
import { getEnsoOutlook, regionFromProfile } from '../../services/ensoContext';

/**
 * AnalisisProactivoIA — panel narrativo IA contextual al final del DashboardLive.
 *
 * Operador 2026-05-29: "de la versión vieja extraño el texto de análisis IA
 * basado en sensores. Pónlo al final del home pero (a) sin romper el concepto
 * estético actual, (b) súbele a las métricas IoT fake análisis proactivo
 * basado en clima + cultivos + tareas. Lleva el componente al siguiente nivel
 * estético + funcional."
 *
 * Vive DESPUÉS del AIStatusFooter (chips) y antes del CTA "Toca chip".
 * Lee local-only (sin red): assets store + logs store + alerts store + sensors.
 * El texto se compone con plantillas contextuales (NO llama Ollama por refresh
 * — eso quemaría GPU cada minuto). La inteligencia está en la combinación
 * y en saber qué destacar — el siguiente paso (Fase 2) será wire al sidecar
 * `/agent/proactive` para una narrativa LLM real.
 *
 * Composición:
 *   - Eyebrow: "Análisis Chagra · IA local"
 *   - Narrativa de 2-4 frases tejiendo: piso térmico/finca, estado plantas,
 *     tareas pendientes, alertas, sensores.
 *   - 3 mini-chips destacados (clickables): tareas / plantas / alertas.
 *   - CTA: "Habla con el agente" → onNavigate('agente').
 *
 * Español colombiano, trato de usted (SIN voseo argentino).
 */

const HORAS = {
    morning: { saludo: 'Buenos días', icono: '☀️' },
    afternoon: { saludo: 'Buenas tardes', icono: '🌤️' },
    evening: { saludo: 'Buenas noches', icono: '🌙' },
    night: { saludo: 'En esta noche', icono: '🌃' },
};

function getHora() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return HORAS.morning;
    if (h >= 12 && h < 18) return HORAS.afternoon;
    if (h >= 18 && h < 22) return HORAS.evening;
    return HORAS.night;
}

function summarizeSensors(sensors) {
    if (!Array.isArray(sensors) || sensors.length === 0) {
        return { tempMax: null, humAvg: null, fresh: 0, total: 0 };
    }
    const now = Date.now();
    const fresh = sensors.filter((s) => {
        const t = new Date(s.last_changed || s.timestamp || 0).getTime();
        return (now - t) < 30 * 60 * 1000;
    }).length;
    const temps = sensors
        .filter((s) => /temp/i.test(s.entity_id || s.kind || ''))
        .map((s) => parseFloat(s.state))
        .filter((n) => Number.isFinite(n));
    const hums = sensors
        .filter((s) => /hum/i.test(s.entity_id || s.kind || ''))
        .map((s) => parseFloat(s.state))
        .filter((n) => Number.isFinite(n));
    return {
        tempMax: temps.length ? Math.max(...temps) : null,
        humAvg: hums.length ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length) : null,
        fresh,
        total: sensors.length,
    };
}

function buildNarrative({ hora, plantasCount, pendingTasks, sensorSummary, alertsCount, ensoOutlook }) {
    const lines = [];
    const saludo = hora.saludo;

    // Frase 1: estado general
    if (plantasCount === 0) {
        lines.push(
            `${saludo}. Su chagra está vacía por ahora — agregue su primera planta para que empiece a aprender de su finca.`,
        );
    } else if (plantasCount === 1) {
        lines.push(
            `${saludo}. Tiene 1 cultivo registrado en la finca. Vamos paso a paso.`,
        );
    } else {
        lines.push(
            `${saludo}. Hoy llevo seguimiento a ${plantasCount} cultivos en su finca.`,
        );
    }

    // Frase 2: tareas pendientes (lo más accionable)
    if (pendingTasks > 0) {
        if (pendingTasks === 1) {
            lines.push('Hay 1 tarea pendiente que vale la pena resolver hoy.');
        } else if (pendingTasks <= 5) {
            lines.push(`Tiene ${pendingTasks} tareas pendientes — varias son rápidas.`);
        } else {
            lines.push(
                `Lleva ${pendingTasks} tareas en cola, conviene priorizar las del día y reprogramar el resto.`,
            );
        }
    } else if (plantasCount > 0) {
        lines.push('No hay tareas pendientes — buen momento para registrar un evento o explorar el calendario de siembra.');
    }

    // Frase 3: sensores / clima
    if (sensorSummary.total > 0) {
        const partes = [];
        if (sensorSummary.tempMax != null) {
            partes.push(`${Math.round(sensorSummary.tempMax)}° de máxima`);
        }
        if (sensorSummary.humAvg != null) {
            partes.push(`${sensorSummary.humAvg}% de humedad promedio`);
        }
        if (partes.length > 0) {
            lines.push(`Los sensores marcan ${partes.join(' y ')}.`);
        }
    }

    // Frase 4: alertas / ENSO si aplica
    if (alertsCount > 0) {
        lines.push(
            alertsCount === 1
                ? 'Hay 1 alerta activa — revísala antes de salir al campo.'
                : `Hay ${alertsCount} alertas activas — revísalas antes de salir al campo.`,
        );
    } else if (ensoOutlook) {
        // ENSO real desde el feed en vivo + lectura regional (ensoContext).
        // Cubre tanto fase activa (Niño/Niña) como vigilancia en fase neutral.
        // Fuente citada para auditabilidad (regla Chagra).
        lines.push(`${ensoOutlook.titulo}: ${ensoOutlook.detalle} (${ensoOutlook.fuente})`);
    }

    return lines.join(' ');
}

function buildPromptForAgent({ pendingTasks, alertsCount, plantasCount }) {
    if (alertsCount > 0) return '¿Qué hago con las alertas activas de mi finca?';
    if (pendingTasks > 0) return '¿Por dónde empiezo con las tareas pendientes de hoy?';
    if (plantasCount === 0) return 'Quiero agregar mi primera planta. ¿Por dónde empiezo?';
    return 'Dame un resumen del estado de mi finca hoy.';
}

function HighlightChip(props) {
    const { Icon, label, count, color, onClick } = props;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all active:scale-95 ${color}`}
        >
            <Icon size={12} className="shrink-0" />
            <span>{label}</span>
            {count != null && (
                <span className="font-mono opacity-90">{count}</span>
            )}
        </button>
    );
}

export default function AnalisisProactivoIA({ sensors = [], climaSnapshot = null, onNavigate, embedded = false }) {
    const plants = useAssetStore((s) => s.plants) || [];
    const activeAlerts = useAlertStore((s) => s.activeAlerts);
    const [pendingTasks, setPendingTasks] = useState(0);
    // `embedded` (consolidación home F2 2026-07-04): dentro de EstadoDelDiaCard
    // el panel pierde su cáscara propia y el slide-in de entrada (el card único
    // ya pinta la superficie; sin animación también es reduced-motion-safe).
    // Solo capa visual — narrativa, chips y CTA idénticos.
    const [revealed, setRevealed] = useState(embedded);

    // pendientes: el store los expone via método async (getPendingTasks).
    // Lo computamos on-mount + cada vez que cambie el contador de plantas
    // (proxy decent para "hubo actividad"). Sin polling agresivo.
    useEffect(() => {
        let alive = true;
        useLogStore
            .getState()
            .getPendingTasks()
            .then((ts) => {
                if (alive) setPendingTasks(Array.isArray(ts) ? ts.length : 0);
            })
            .catch(() => {
                if (alive) setPendingTasks(0);
            });
        return () => {
            alive = false;
        };
    }, [plants.length]);

    // Slide-in suave al primer paint (solo standalone — embebido entra plano).
    useEffect(() => {
        if (embedded) return undefined;
        const t = setTimeout(() => setRevealed(true), 200);
        return () => clearTimeout(t);
    }, [embedded]);

    const sensorSummary = useMemo(() => summarizeSensors(sensors), [sensors]);
    // useAlertStore.activeAlerts es un array (no Map). Soportamos ambos por
    // robustez para no regresar a 0 silencioso si cambia la forma del store.
    const alertsCount = Array.isArray(activeAlerts)
        ? activeAlerts.length
        : (activeAlerts instanceof Map ? activeAlerts.size : 0);
    // ENSO: phase del feed en vivo + lectura regional (DR) desde ensoContext.
    const ensoPhase = climaSnapshot?.enso_status?.phase || null;
    const ensoProbs = climaSnapshot?.enso_status?.ideam_probabilities
        || climaSnapshot?.enso_status?.ideam_probabilidades
        || null;
    const ensoOutlook = useMemo(() => {
        if (!ensoPhase) return null;
        const region = regionFromProfile(getProfile());
        return getEnsoOutlook({ phase: ensoPhase, region, probabilities: ensoProbs });
    }, [ensoPhase, ensoProbs]);
    const hora = useMemo(() => getHora(), []);

    const narrative = useMemo(
        () =>
            buildNarrative({
                hora,
                plantasCount: plants.length,
                pendingTasks,
                sensorSummary,
                alertsCount,
                ensoOutlook,
            }),
        [hora, plants.length, pendingTasks, sensorSummary, alertsCount, ensoOutlook],
    );

    const agentPrompt = useMemo(
        () =>
            buildPromptForAgent({
                pendingTasks,
                alertsCount,
                plantasCount: plants.length,
            }),
        [pendingTasks, alertsCount, plants.length],
    );

    const handleAgent = () => {
        if (typeof onNavigate !== 'function') return;
        // Sembramos el prompt en sessionStorage para que AgentScreen lo recoja
        // (mismo patrón usado por sugerencias rápidas del chat — task #286).
        try {
            sessionStorage.setItem('chagra:agent:prefilled', agentPrompt);
        } catch (_) {
            /* no-op */
        }
        onNavigate('agente');
    };

    return (
        <div
            className={embedded ? '' : 'mt-4 mb-2 px-1'}
            style={embedded ? undefined : {
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 700ms ease-out, transform 700ms ease-out',
            }}
            data-testid="analisis-proactivo-ia"
        >
            <div className={embedded
                ? 'relative p-4 pt-3'
                : 'relative rounded-2xl border border-cyan-700/30 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-emerald-950/30 backdrop-blur-xl p-3.5 overflow-hidden'}>
                {/* Acento gradient suave en el borde superior (solo standalone) */}
                {!embedded && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />}

                <div className="flex items-center gap-2 mb-2">
                    <div className="relative">
                        <Brain size={14} className="text-cyan-300" />
                        <Sparkles
                            size={8}
                            className="absolute -top-1 -right-1 text-emerald-300 animate-pulse"
                        />
                    </div>
                    <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-[0.18em]">
                        Análisis Chagra
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/15 text-emerald-200 uppercase tracking-wider">
                        IA local
                    </span>
                    <span className="ml-auto text-[9px] text-slate-500" aria-hidden>
                        {hora.icono}
                    </span>
                </div>

                <p className="text-[12px] leading-relaxed text-slate-200/95 font-medium">
                    {narrative}
                </p>

                {(plants.length > 0 || pendingTasks > 0 || alertsCount > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {plants.length > 0 && (
                            <HighlightChip
                                Icon={Leaf}
                                label="Cultivos"
                                count={plants.length}
                                color="text-emerald-200 bg-emerald-500/10 border-emerald-600/30 hover:bg-emerald-500/20"
                                onClick={() => onNavigate?.('plantas')}
                            />
                        )}
                        {pendingTasks > 0 && (
                            <HighlightChip
                                Icon={ListTodo}
                                label="Tareas"
                                count={pendingTasks}
                                color="text-amber-200 bg-amber-500/10 border-amber-600/30 hover:bg-amber-500/20"
                                onClick={() => onNavigate?.('bitacora')}
                            />
                        )}
                        {alertsCount > 0 && (
                            <HighlightChip
                                Icon={AlertTriangle}
                                label="Alertas"
                                count={alertsCount}
                                color="text-rose-200 bg-rose-500/10 border-rose-600/30 hover:bg-rose-500/20"
                                onClick={() => onNavigate?.('agente')}
                            />
                        )}
                        {sensorSummary.tempMax != null && (
                            <HighlightChip
                                Icon={ThermometerSun}
                                label={`${Math.round(sensorSummary.tempMax)}°`}
                                color="text-orange-200 bg-orange-500/10 border-orange-600/30 hover:bg-orange-500/20"
                                onClick={() => onNavigate?.('mapa')}
                            />
                        )}
                        {sensorSummary.humAvg != null && (
                            <HighlightChip
                                Icon={Droplets}
                                label={`${sensorSummary.humAvg}%`}
                                color="text-sky-200 bg-sky-500/10 border-sky-600/30 hover:bg-sky-500/20"
                                onClick={() => onNavigate?.('mapa')}
                            />
                        )}
                        {climaSnapshot?.next_rain_h != null && (
                            <HighlightChip
                                Icon={CloudRain}
                                label={`Lluvia ${climaSnapshot.next_rain_h}h`}
                                color="text-blue-200 bg-blue-500/10 border-blue-600/30 hover:bg-blue-500/20"
                                onClick={() => onNavigate?.('agente')}
                            />
                        )}
                        {plants.length > 0 && pendingTasks === 0 && alertsCount === 0 && (
                            <HighlightChip
                                Icon={CheckCircle2}
                                label="Sin alertas"
                                color="text-emerald-200 bg-emerald-500/10 border-emerald-600/30 hover:bg-emerald-500/20"
                                onClick={() => onNavigate?.('agente')}
                            />
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleAgent}
                    className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-600/30 transition-colors text-left group"
                    aria-label="Hablar con el agente Chagra sobre este análisis"
                >
                    <span className="flex items-center gap-1.5 text-[11px] text-cyan-100">
                        <TrendingUp size={12} className="text-cyan-300" />
                        Habla con el agente sobre esto
                    </span>
                    <ArrowRight
                        size={13}
                        className="text-cyan-300 group-hover:translate-x-0.5 transition-transform"
                    />
                </button>
            </div>
        </div>
    );
}

import { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, Sprout } from 'lucide-react';
import { agendaPorDia, agendaPorSemana } from '../../services/hoyEnFincaService';

/**
 * AgendaCampesina — calendario LEGIBLE de "qué viene" en la finca.
 *
 * Dos vistas con toggle grande (baja alfabetización: dos botones, no tabs
 * pequeñas): SEMANA (día por día: Hoy, Mañana, mié 13…) y MES (por semanas:
 * Esta semana, Próxima semana…). Los items son ventanas fenológicas REALES
 * calculadas de los ciclos registrados (hoyEnFincaService.buildAgenda) — si
 * no hay ciclos, no se inventa nada: empty-state con CTA a registrar.
 *
 * Theme-aware: todo sale de slate-* (indirección CSS-var por tema) + el
 * acento del tema activo vía --t-accent-rgb.
 */
export default function AgendaCampesina({ items = [], now = null, onItemTap, onEmptyCta }) {
    const [modo, setModo] = useState('semana');
    // "Ahora" estable por montaje (lazy init — sin Date.now() en render).
    const [mountedNow] = useState(() => Date.now());
    const nowTs = now ?? mountedNow;

    const dias = useMemo(() => agendaPorDia(items, { now: nowTs }), [items, nowTs]);
    const semanas = useMemo(() => agendaPorSemana(items, { now: nowTs }), [items, nowTs]);

    const sinNada = items.length === 0;

    return (
        <section
            aria-label="Agenda de la finca"
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4"
        >
            <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CalendarDays size={20} style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
                    Agenda de la finca
                </h3>
                {/* Toggle grande Semana/Mes */}
                <div className="flex rounded-xl overflow-hidden border border-slate-700" role="tablist" aria-label="Vista de agenda">
                    {[
                        { id: 'semana', label: 'Semana', Icon: CalendarDays },
                        { id: 'mes', label: 'Mes', Icon: CalendarRange },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={modo === tab.id}
                            onClick={() => setModo(tab.id)}
                            className={`px-3 py-2 min-h-[40px] text-xs font-bold flex items-center gap-1.5 transition-colors ${modo === tab.id
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'}`}
                        >
                            <tab.Icon size={14} aria-hidden="true" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {sinNada ? (
                <div className="text-center py-6">
                    <Sprout size={36} className="text-slate-600 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm text-slate-400">
                        Sin eventos en la agenda todavía.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Registra qué sembraste y aquí verás cuándo brota, florece y se cosecha.
                    </p>
                    {onEmptyCta && (
                        <button
                            type="button"
                            onClick={onEmptyCta}
                            className="mt-3 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-bold text-white"
                        >
                            🎤 Contarle a Chagra qué sembré
                        </button>
                    )}
                </div>
            ) : modo === 'semana' ? (
                <ul className="flex flex-col gap-1" data-testid="agenda-semana">
                    {dias.map((d) => (
                        <li
                            key={d.fecha}
                            className={`flex gap-3 rounded-xl px-2 py-1.5 ${d.esHoy ? 'bg-slate-800/60 border border-slate-700' : ''}`}
                        >
                            <span
                                className={`shrink-0 w-16 pt-1 text-xs font-black uppercase tracking-wide ${d.esHoy ? 'text-white' : 'text-slate-500'}`}
                            >
                                {d.label}
                            </span>
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                {d.items.length === 0 ? (
                                    <span className="text-xs text-slate-600 pt-1">—</span>
                                ) : d.items.map((it, i) => (
                                    <AgendaItem key={`${it.processId}-${it.stageCode}-${i}`} item={it} onTap={onItemTap} />
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="flex flex-col gap-2" data-testid="agenda-mes">
                    {semanas.map((s) => (
                        <li key={s.inicio}>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-1">{s.label}</p>
                            {s.items.length === 0 ? (
                                <p className="text-xs text-slate-600 pl-1">Sin eventos previstos.</p>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {s.items.map((it, i) => (
                                        <AgendaItem key={`${it.processId}-${it.stageCode}-${i}`} item={it} onTap={onItemTap} conFecha />
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {!sinNada && (
                <p className="text-[10px] text-slate-500 mt-3 leading-snug">
                    Las fechas son ventanas estimadas por la etapa del cultivo (fuente: plantillas
                    fenológicas con literatura citada). El campo manda: confirma con lo que veas en la mata.
                </p>
            )}
        </section>
    );
}

/** Item tocable de agenda: "🌸 Papa pastusa entra a Floración". */
function AgendaItem({ item, onTap, conFecha = false }) {
    const fechaCorta = conFecha
        ? new Date(item.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
        : null;
    const verbo = item.tipo === 'cosecha' ? 'abre cosecha' : `entra a ${item.stageLabel}`;
    return (
        <button
            type="button"
            onClick={() => onTap?.(item)}
            aria-label={`${item.etiqueta} ${verbo}. Ver el ciclo`}
            className="w-full text-left flex items-center gap-2 px-2 py-1.5 min-h-[40px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
        >
            <span className="text-lg shrink-0" aria-hidden="true">{item.emoji}</span>
            <span className="flex-1 min-w-0 text-xs text-slate-200 truncate">
                <span className="font-bold">{item.etiqueta}</span> {verbo}
            </span>
            {fechaCorta && (
                <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">{fechaCorta}</span>
            )}
        </button>
    );
}

import React, { useMemo } from 'react';
import { Droplets, Thermometer, ShieldAlert, ShieldCheck, Shield, Sprout, Hourglass } from 'lucide-react';
import {
    kcDeCultivo, etcMm, balanceHidricoDia, presionEnfermedad, amplitudTermica,
} from '../../services/agroIndices';
import { gddDia } from '../../services/gradosDiaCalculator';
import { QueEsEsto } from './pedagogia';

/**
 * CultivoTarjeta — LA tarjeta diferencial de la Página del Tiempo: el clima
 * traducido a decisión para UN cultivo de la finca. Ultrapersonalización real
 * (DOSSIER §5, T2.2). Consume el DATO CRUDO del día (agroMeteoService) y lo pasa
 * por los motores puros (agroIndices) — todo etiquetado con su fuente; lo que no
 * se puede calcular es SlotPendiente, nunca inventado.
 *
 * @param {{ficha:object, today:object|null, faseFamily:'nino'|'nina'|'neutral'}} props
 */

const SEMAFORO = {
    rojo: { icon: ShieldAlert, chip: 'bg-red-500/15 text-red-300 border-red-500/40', punto: 'bg-red-500', label: 'Alta' },
    amarillo: { icon: Shield, chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40', punto: 'bg-amber-400', label: 'Media' },
    verde: { icon: ShieldCheck, chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', punto: 'bg-emerald-500', label: 'Baja' },
};

const BALANCE_STYLE = {
    riego: { chip: 'text-amber-300', barra: 'bg-amber-400' },
    justo: { chip: 'text-amber-200', barra: 'bg-amber-300' },
    cubierto: { chip: 'text-emerald-300', barra: 'bg-emerald-400' },
    exceso: { chip: 'text-sky-300', barra: 'bg-sky-400' },
};

function accionDelDia({ balance, peores, ficha, faseFamily }) {
    const rojo = peores.find((p) => p?.nivel === 'rojo');
    if (rojo) return `Vigile ${rojo.modelo.nombre.toLowerCase()}: ventile, pode lo enfermo y evite mojar la hoja de noche.`;
    if (balance?.estado === 'riego') return `Le faltan ${balance.faltaMm} mm hoy — riegue temprano o refuerce el mulch para no perder humedad.`;
    if (balance?.estado === 'exceso') return 'Llueve de sobra — destape zanjas y drenajes para que no se encharque la raíz.';
    const amarillo = peores.find((p) => p?.nivel === 'amarillo');
    if (amarillo) return `Clima algo favorable a ${amarillo.modelo.nombre.toLowerCase()} — revise el cultivo de cerca esta semana.`;
    if (faseFamily === 'nino') return ficha.aguaNota || 'Época seca — cuide el agua y el sombrío.';
    return ficha.aguaNota || 'Cultivo en buenas condiciones hoy.';
}

export default function CultivoTarjeta({ ficha, today, faseFamily = 'neutral' }) {
    const calc = useMemo(() => {
        if (!today) return null;
        const kc = kcDeCultivo(ficha, 'mid');
        const etc = etcMm(today.eto_mm, kc);
        const balance = balanceHidricoDia(today.precip_mm, etc);
        const tempMedia = amplitudTermica(today.temp_max, today.temp_min) != null
            ? Math.round(((today.temp_max + today.temp_min) / 2) * 10) / 10
            : null;
        const enfermedades = (ficha.enfermedades || [])
            .map((key) => presionEnfermedad(key, {
                tempMedia,
                horasMojado: today.horas_hr_alta,
                precipMm: today.precip_mm,
            }))
            .filter(Boolean);
        const gdd = ficha.gddId && Number.isFinite(today.temp_min) && Number.isFinite(today.temp_max)
            ? gddDia(today.temp_min, today.temp_max, ficha.gddId === 'maiz' ? 10 : 5, ficha.gddId === 'maiz' ? 30 : null)
            : null;
        return { kc, etc, balance, tempMedia, enfermedades, gdd };
    }, [ficha, today]);

    const balStyle = calc?.balance ? (BALANCE_STYLE[calc.balance.estado] || BALANCE_STYLE.cubierto) : null;
    const accion = calc ? accionDelDia({ balance: calc.balance, peores: calc.enfermedades, ficha, faseFamily }) : null;
    const kcBaja = ficha.kcConfianza === 'baja';

    return (
        <article
            className="rounded-2xl border border-slate-700/60 bg-slate-900/60 overflow-hidden"
            data-testid={`cultivo-tarjeta-${ficha.key}`}
        >
            {/* Encabezado del cultivo */}
            <header className="flex items-center gap-3 px-4 pt-3.5 pb-2.5 border-b border-slate-800/80 bg-gradient-to-br from-emerald-950/30 to-transparent">
                <span aria-hidden="true" className="shrink-0 w-11 h-11 rounded-xl bg-slate-800/70 grid place-items-center text-2xl">
                    {ficha.emoji}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-slate-100 leading-tight">{ficha.nombre}</p>
                    <p className="text-[11px] text-slate-400 leading-tight">
                        <span className="capitalize">{ficha.piso}</span> · el clima para su cultivo hoy
                    </p>
                </div>
            </header>

            {!calc && (
                <div className="px-4 py-4 flex items-center gap-2 text-xs text-slate-400">
                    <Hourglass size={13} aria-hidden="true" />
                    Esperando el pronóstico de su finca para calcular el agua y la presión de enfermedad.
                </div>
            )}

            {calc && (
                <div className="p-4 space-y-3.5">
                    {/* Agua: ETc + balance ("cuánta le falta") */}
                    <div className="rounded-xl bg-slate-950/40 border border-slate-800/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                <Droplets size={13} className="text-sky-300" aria-hidden="true" /> Agua hoy
                            </p>
                            {calc.etc != null ? (
                                <p className="text-xs text-slate-400">
                                    pide <span className="font-black text-slate-100">{calc.etc} mm</span>
                                    <span className="text-slate-500"> · cae {Number.isFinite(today.precip_mm) ? today.precip_mm : 0} mm</span>
                                </p>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300" data-testid="slot-grounded-pendiente">
                                    <Hourglass size={10} aria-hidden="true" /> ETc en camino
                                </span>
                            )}
                        </div>
                        {calc.balance && (
                            <>
                                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${balStyle.barra}`}
                                        style={{ width: `${Math.max(6, Math.min(100, calc.etc ? (Math.min(today.precip_mm || 0, calc.etc) / calc.etc) * 100 : 0))}%` }}
                                    />
                                </div>
                                <p className={`mt-1.5 text-xs font-semibold ${balStyle.chip}`}>{calc.balance.mensaje}</p>
                            </>
                        )}
                        <p className="mt-1 text-[10px] text-slate-500">
                            ETc = ETo × Kc {calc.kc} · {ficha.kcFuente}
                            {kcBaja && ' (estimado, confírmelo con su técnico)'}
                        </p>
                    </div>

                    {/* Semáforo de enfermedad */}
                    {calc.enfermedades.length > 0 && (
                        <div className="space-y-2">
                            {calc.enfermedades.map((e) => {
                                const s = SEMAFORO[e.nivel] || SEMAFORO.verde;
                                const Icon = s.icon;
                                return (
                                    <div key={e.modelo.nombre} className={`rounded-xl border p-2.5 ${s.chip}`} data-testid={`semaforo-${e.nivel}`}>
                                        <div className="flex items-center gap-2">
                                            <Icon size={15} aria-hidden="true" />
                                            <p className="text-xs font-black flex-1 leading-tight">{e.modelo.nombre}</p>
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Presión {s.label}</span>
                                        </div>
                                        <p className="mt-1 text-[11px] leading-snug opacity-90">{e.razon}</p>
                                        <p className="mt-1 text-[10px] opacity-70">
                                            Fuente: {e.modelo.fuente}{e.modelo.confianza !== 'alta' ? ` · confianza ${e.modelo.confianza}` : ''}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Reloj térmico (GDD) donde hay Tb groundeada */}
                    {calc.gdd != null && (
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Thermometer size={13} className="text-amber-300" aria-hidden="true" />
                            <span>
                                Reloj térmico: <span className="font-bold text-slate-100">+{calc.gdd} °D</span> hoy
                                <span className="text-slate-500"> (calor que acumula el cultivo)</span>
                            </span>
                        </div>
                    )}

                    {/* La acción del día */}
                    <div className="flex gap-2.5 rounded-xl border border-emerald-700/40 bg-emerald-950/25 p-3">
                        <Sprout size={16} className="shrink-0 mt-0.5 text-emerald-300" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-300/90">La acción de hoy</p>
                            <p className="mt-0.5 text-sm leading-snug text-slate-100">{accion}</p>
                        </div>
                    </div>

                    <QueEsEsto titulo="¿Qué es la ETc?" compai="abejita" testid="que-es-etc">
                        La planta bebe agua todo el día y la suelta por las hojas, como cuando tú sudas. La <b>ETc</b> es
                        cuántos vasos de agua se bebió tu cultivo hoy. Si llovió menos que eso, le quedó sed: por eso hay
                        que regar. ¡{ficha.nombre} tiene su propia sed, distinta a las demás matas!
                    </QueEsEsto>
                </div>
            )}
        </article>
    );
}

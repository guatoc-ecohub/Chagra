import React, { useEffect, useMemo, useState } from 'react';
import {
    CloudSun, Compass, BookOpenText, MapPin, ExternalLink, Hourglass, Radio,
    Sun, CloudRain, Cloud, Droplets, Wind, Gauge, Sprout, ListChecks, Waves,
    ThermometerSun, Sparkles, CalendarClock, Leaf, RefreshCw,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import CieloENSO from './CieloENSO';
import GraficoClimaSemanal from './GraficoClimaSemanal';
import CultivoTarjeta from './CultivoTarjeta';
import { QueEsEsto, CompaiAvatar } from './pedagogia';
import { getEnsoPhase, getEnsoLabel, getEnsoPhaseSource } from '../../services/ensoService';
import { ensoFamily, regionFromProfile, ensoRegionalLine } from '../../services/ensoContext';
import { getProfile } from '../../services/userProfileService';
import { fetchClimaSnapshot, resolveClimaLocation } from '../../services/climaService';
import { fetchAgroMeteo, fetchNormales } from '../../services/agroMeteoService';
import {
    parseCultivos, vpdKpa, leerVpd, leerUv, amplitudTermica, anomalia,
} from '../../services/agroIndices';
import {
    LECTURA_ENSO, ACCIONES_ENSO, REGLA_INSIGNIA, BOLETINES_IDEAM,
    MTA_INFO, MTA_POR_REGION, FENALCE_INFO,
    ENSO_CALENDARIO_2026_27, ENSO_TRANSICION, MTA_VENTANA_SIEMBRA,
    FUENTES_VIVAS, ESTADO_GROUNDED_PENDIENTE, faseCalendarioActual,
} from '../../data/climaBoletines';
import './clima.css';

/*
 * ClimaBoletinScreen — LA PÁGINA DEL TIEMPO de Chagra (rediseño Fase 2, DOSSIER
 * PAGINA-TIEMPO-AGROCLIMA §5). Sobre la base del traductor ENSO ("El clima que
 * viene"), ahora en TRES HORIZONTES:
 *
 *   HOY          → el estado ahora (T, se-siente-como, HR, viento, UV, lluvia,
 *                  ETo, VPD, punto de rocío) + ANOMALÍA (hoy vs. lo normal) +
 *                  TARJETAS POR CULTIVO (el diferencial: ETc, "cuánta agua le
 *                  falta", semáforo de enfermedad, acción del día).
 *   7–16 DÍAS    → pronóstico + alertas + ventanas de labor (aplicar/secar).
 *   EL NIÑO      → fase ENSO en vivo (IDEAM manda) + lectura regional + checklist
 *                  de preparación para la temporada fuerte 2026–27.
 *
 * ARQUITECTURA (DOSSIER, híbrido): el DATO CRUDO viene de agroMeteoService
 * (Open-Meteo, ETo FAO-56 nativo) y del snapshot ENSO del sidecar (autoridad
 * IDEAM/NOAA); los ÍNDICES DERIVADOS se calculan en cliente puro (agroIndices).
 * ANTI-ALUCINACIÓN: cada número lleva su fuente; lo que caduca o falta el dato es
 * SlotPendiente, nunca inventado. IDEAM manda para el pronóstico oficial.
 */

const HORIZONTES = [
    { id: 'hoy', titulo: 'Hoy', sub: 'Ahora mismo', icon: Sun },
    { id: 'semana', titulo: '7–16 días', sub: 'Lo que viene', icon: CalendarClock },
    { id: 'estacional', titulo: 'El Niño', sub: 'La temporada', icon: Waves },
];

const FASE_ACENTO = {
    nino: { text: 'text-amber-300', border: 'border-amber-500/50', bg: 'bg-amber-500/10', chip: 'bg-amber-500/15 text-amber-200' },
    nina: { text: 'text-sky-300', border: 'border-sky-500/50', bg: 'bg-sky-500/10', chip: 'bg-sky-500/15 text-sky-200' },
    neutral: { text: 'text-slate-200', border: 'border-slate-600/60', bg: 'bg-slate-500/10', chip: 'bg-slate-500/15 text-slate-200' },
};

/* Chip honesto para cifras que caducan / sin dato: promete, no inventa. */
function SlotPendiente({ children }) {
    return (
        <span
            data-testid="slot-grounded-pendiente"
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300"
        >
            <Hourglass size={11} aria-hidden="true" />
            {children || 'Dato en camino'}
        </span>
    );
}

function FuenteFase({ source }) {
    const map = {
        live: { icon: Radio, label: 'En vivo (IDEAM/NOAA)', cls: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
        manual: { icon: MapPin, label: 'Fijada a mano', cls: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
        // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- copy UI es-CO, deuda ADR-050 (messages.js) pendiente igual que el resto del módulo
        default: { icon: Hourglass, label: 'Sin conexión — valor base', cls: 'text-slate-400 border-slate-600/50 bg-slate-700/20' },
    };
    const m = map[source] || map.default;
    const Icon = m.icon;
    return (
        <span data-testid="clima-fuente-fase" className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${m.cls}`}>
            <Icon size={11} aria-hidden="true" />
            {m.label}
        </span>
    );
}

/* Etiqueta de fuente de un dato derivado (anti-alucinación: cada número la lleva). */
function FuenteDato({ children }) {
    return <p className="mt-1 text-[10px] leading-tight text-slate-500">{children}</p>;
}

/* Ficha de un índice del día (tile). */
function IndiceTile({ icon, label, valor, unidad, sub, accent = 'slate', children }) {
    const Icon = icon;
    const tint = {
        sky: 'text-sky-300', amber: 'text-amber-300', emerald: 'text-emerald-300',
        red: 'text-red-300', orange: 'text-orange-300', slate: 'text-slate-200',
    }[accent] || 'text-slate-200';
    return (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <Icon size={13} className={tint} aria-hidden="true" /> {label}
            </p>
            <p className="mt-1 leading-none">
                {valor != null ? (
                    <>
                        <span className={`text-2xl font-black ${tint}`}>{valor}</span>
                        {unidad && <span className="text-sm font-bold text-slate-400 ml-0.5">{unidad}</span>}
                    </>
                ) : (
                    <SlotPendiente>sin dato</SlotPendiente>
                )}
            </p>
            {sub && <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{sub}</p>}
            {children}
        </div>
    );
}

/* ── HORIZONTE 1 · HOY ─────────────────────────────────────────────────── */
function HorizonteHoy({ agrometeo, loading, anom, cultivos, sinFicha, faseFamily, faseLabel, onRefresh }) {
    const now = agrometeo?.now;
    const today = agrometeo?.today;
    const vpd = now ? vpdKpa(now.temp, now.rh) : null;
    const vpdL = leerVpd(vpd);
    const uvL = leerUv(today?.uv_max);
    const amplitud = today ? amplitudTermica(today.temp_max, today.temp_min) : null;

    return (
        <section className="clima-seccion space-y-4" data-testid="horizonte-hoy">
            {/* HERO: el estado ahora, honesto */}
            <div className={`rounded-3xl border p-4 ${FASE_ACENTO[faseFamily].border} bg-gradient-to-br from-slate-900/70 to-slate-950/40`}>
                {!now && loading && (
                    <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
                        <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> Leyendo el cielo de su finca…
                    </div>
                )}
                {!now && !loading && (
                    <div className="py-6 text-center">
                        <p className="text-sm text-slate-300">Aún no tengo el pronóstico de su finca.</p>
                        <p className="mt-1 text-xs text-slate-500">Confirme la ubicación de la finca para ver el clima con números reales.</p>
                        <SlotPendiente>pronóstico en camino</SlotPendiente>
                    </div>
                )}
                {now && (
                    <>
                        <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="text-5xl leading-none">{now.weather?.emoji}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    {now.weather?.label} · fase {faseLabel}
                                </p>
                                <p className="text-4xl font-black leading-none text-slate-100">
                                    {Math.round(now.temp)}<span className="text-2xl text-slate-400">°C</span>
                                </p>
                                {Number.isFinite(now.aparente) && (
                                    <p className="text-xs text-slate-400 mt-0.5">Se siente como {Math.round(now.aparente)}°C</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onRefresh}
                                aria-label="Actualizar pronóstico"
                                className="shrink-0 self-start rounded-full border border-slate-700 bg-slate-800/60 p-2 text-slate-400 active:bg-slate-700"
                            >
                                <RefreshCw size={14} aria-hidden="true" />
                            </button>
                        </div>

                        {/* ANOMALÍA tangible */}
                        {anom ? (
                            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-2.5" data-testid="clima-anomalia">
                                <ThermometerSun size={16} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
                                <div>
                                    <p className="text-sm font-bold text-amber-200 leading-snug">
                                        Hoy está {anom.frases.join(' y ')}.
                                    </p>
                                    <FuenteDato>Comparado con {anom.fuente}</FuenteDato>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
                                <ThermometerSun size={12} aria-hidden="true" />
                                Anomalía (hoy vs. lo normal): <SlotPendiente>normales en camino</SlotPendiente>
                            </p>
                        )}

                        <QueEsEsto titulo="¿Qué es la anomalía?" compai="colibri" testid="que-es-anomalia">
                            Imagina que cada día del año tiene una temperatura "de costumbre", como tu estatura normal para
                            tu edad. La <b>anomalía</b> es cuánto se salió el día de esa costumbre: si hace más calor o
                            está más seco de lo que suele estar. Así sabemos si El Niño ya está apretando.
                        </QueEsEsto>
                    </>
                )}
            </div>

            {/* Rejilla de índices del día */}
            {now && (
                <div className="grid grid-cols-2 gap-2.5" data-testid="clima-indices-hoy">
                    <IndiceTile icon={Droplets} label="Humedad" valor={Number.isFinite(now.rh) ? Math.round(now.rh) : null} unidad="%" accent="sky"
                        sub={Number.isFinite(now.dew) ? `Rocío a ${Math.round(now.dew)}°C` : undefined}>
                        <FuenteDato>Open-Meteo</FuenteDato>
                    </IndiceTile>

                    <IndiceTile icon={Sun} label="Rayos UV" valor={Number.isFinite(today?.uv_max) ? Math.round(today.uv_max) : null}
                        accent={uvL?.color || 'amber'} sub={uvL?.texto}>
                        <FuenteDato>Open-Meteo · máx. del día</FuenteDato>
                    </IndiceTile>

                    <IndiceTile icon={CloudRain} label="Lluvia hoy" valor={Number.isFinite(today?.precip_mm) ? today.precip_mm : null} unidad="mm" accent="sky"
                        sub={Number.isFinite(today?.precip_prob) ? `${today.precip_prob}% de probabilidad` : undefined}>
                        <FuenteDato>Open-Meteo</FuenteDato>
                    </IndiceTile>

                    <IndiceTile icon={Waves} label="ETo (referencia)" valor={Number.isFinite(today?.eto_mm) ? today.eto_mm : null} unidad="mm" accent="emerald"
                        sub="agua que se evapora hoy">
                        <FuenteDato>Estimado por Chagra · Open-Meteo (FAO-56)</FuenteDato>
                        {/* compai NO-abeja (unificación 2026-08-23): antes "abejita",
                            que hacía eco de la Angelita canónica del FAB → dos abejas.
                            Borugo (cava y guarda agua) encaja con la ETo. */}
                        <QueEsEsto titulo="¿Qué es la ETo?" compai="borugo" testid="que-es-eto">
                            Es cuánta agua se sube al cielo en un día de sol y viento, evaporándose del suelo y las plantas.
                            Entre más sol y más viento, más "sed" tiene el aire. Sirve para saber cuánta agua reponerle a
                            los cultivos.
                        </QueEsEsto>
                    </IndiceTile>

                    <IndiceTile icon={Gauge} label="Sed del aire (VPD)" valor={vpd} unidad="kPa" accent={vpdL?.color || 'slate'} sub={vpdL?.texto}>
                        <FuenteDato>Estimado por Chagra · Open-Meteo (T+HR)</FuenteDato>
                    </IndiceTile>

                    <IndiceTile icon={ThermometerSun} label="Amplitud térmica" valor={amplitud} unidad="°C" accent="orange"
                        sub={amplitud != null ? (amplitud >= 12 ? 'grande: ojo helada/quemado' : 'moderada') : undefined}>
                        <FuenteDato>Estimado por Chagra · Open-Meteo (máx−mín)</FuenteDato>
                    </IndiceTile>
                </div>
            )}

            {/* EL DIFERENCIAL: tarjetas por cultivo */}
            <div className="pt-1">
                <div className="flex items-center gap-2 mb-2.5">
                    <Sprout size={18} className="text-emerald-300" aria-hidden="true" />
                    <h3 className="text-base font-black text-slate-100">El clima para sus cultivos</h3>
                </div>
                {cultivos.length === 0 ? (
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 text-sm text-slate-300">
                        <p>Cuéntele a Chagra qué siembra (café, papa, tomate…) y aquí verá, por cada cultivo, cuánta
                            agua le falta hoy y si hay riesgo de enfermedad.</p>
                        <p className="mt-2 text-xs text-slate-500">Se toma de su perfil (cultivos actuales).</p>
                    </div>
                ) : (
                    <div className="space-y-3" data-testid="clima-cultivos">
                        {cultivos.map((ficha) => (
                            <CultivoTarjeta key={ficha.key} ficha={ficha} today={today} faseFamily={faseFamily} />
                        ))}
                        {sinFicha.length > 0 && (
                            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-3 text-xs text-slate-400">
                                <p className="flex items-center gap-1.5">
                                    <Hourglass size={12} aria-hidden="true" />
                                    Aún sin ficha agroclimática para: <span className="text-slate-300">{sinFicha.join(', ')}</span>.
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">Chagra no inventa sus números: los agrega cuando estén groundeados.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ── HORIZONTE 2 · 7–16 DÍAS ───────────────────────────────────────────── */
const DIA_SEMANA = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];

function VentanaLabor({ dias }) {
    // Deriva ventanas de labor de los próximos días (agroecológico, no calendario químico):
    //  · aplicar bio-preparados foliares: viento < 15 km/h + prob. lluvia < 40%
    //  · secar café/cacao: sol > 5 h + HR media < 75% + sin lluvia
    const aplicar = dias.find((d) => Number.isFinite(d.viento_max) && d.viento_max < 15 && (d.precip_prob ?? 0) < 40);
    const secar = dias.find((d) => Number.isFinite(d.sol_horas) && d.sol_horas > 5 && (d.rh_mean ?? 100) < 75 && (d.precip_mm ?? 0) < 1);
    const fmt = (iso) => {
        const dt = new Date(`${iso}T12:00:00`);
        return `${DIA_SEMANA[dt.getDay()]} ${dt.getDate()}`;
    };
    return (
        <div className="grid grid-cols-2 gap-2.5" data-testid="clima-ventanas-labor">
            <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300"><Leaf size={13} aria-hidden="true" /> Aplicar foliar</p>
                <p className="mt-1 text-sm font-black text-slate-100">{aplicar ? fmt(aplicar.date) : 'Sin ventana'}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{aplicar ? 'Viento bajo y poca lluvia: no se lava ni deriva.' : 'Viento o lluvia altos estos días.'}</p>
            </div>
            <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-300"><Sun size={13} aria-hidden="true" /> Secar grano</p>
                <p className="mt-1 text-sm font-black text-slate-100">{secar ? fmt(secar.date) : 'Sin ventana'}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{secar ? 'Sol fuerte y aire seco: buen día de secado.' : 'Poco sol o mucha humedad estos días.'}</p>
            </div>
        </div>
    );
}

const ALERTA_STYLE = {
    critical: 'border-red-500/40 bg-red-500/10 text-red-200',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
};

function HorizonteSemana({ agrometeo, alertas }) {
    const dias = useMemo(() => agrometeo?.daily || [], [agrometeo]);
    const graf = useMemo(() => dias.slice(0, 7).map((d) => ({
        dia: d.date, tempMax: d.temp_max, tempMin: d.temp_min, lluviaMm: d.precip_mm ?? 0,
    })), [dias]);

    return (
        <section className="clima-seccion space-y-4" data-testid="horizonte-semana">
            {dias.length === 0 ? (
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 text-sm text-slate-300">
                    Aún sin pronóstico de la finca. <SlotPendiente>7–16 días en camino</SlotPendiente>
                </div>
            ) : (
                <>
                    {/* Alertas locales del snapshot */}
                    {alertas && alertas.length > 0 && (
                        <div className="space-y-2" data-testid="clima-alertas">
                            {alertas.slice(0, 4).map((a, i) => (
                                <div key={`${a.tipo}-${i}`} className={`rounded-2xl border p-3 ${ALERTA_STYLE[a.severity] || ALERTA_STYLE.info}`}>
                                    <p className="text-sm font-bold leading-snug">{a.mensaje}</p>
                                    {Array.isArray(a.dias) && a.dias.length > 0 && (
                                        <p className="text-[11px] opacity-80 mt-0.5">Días: {a.dias.join(', ')}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Ventanas de labor */}
                    <VentanaLabor dias={dias.slice(0, 8)} />

                    {/* Gráfico semanal (reusa GraficoClimaSemanal) */}
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3">
                        <p className="text-sm font-black text-slate-100 mb-1">Temperatura y lluvia · 7 días</p>
                        <GraficoClimaSemanal datos={graf} />
                        <FuenteDato>Open-Meteo · líneas máx/mín (rojo/azul), barras lluvia</FuenteDato>
                    </div>

                    {/* Tira de 16 días */}
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3">
                        <p className="text-sm font-black text-slate-100 mb-2">Hasta 16 días</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                            {dias.map((d) => {
                                const dt = new Date(`${d.date}T12:00:00`);
                                return (
                                    <div key={d.date} className="shrink-0 w-14 rounded-xl bg-slate-800/50 p-2 text-center">
                                        <p className="text-[10px] font-bold uppercase text-slate-400">{DIA_SEMANA[dt.getDay()]}</p>
                                        <p className="text-lg leading-none my-0.5" aria-hidden="true">
                                            {(d.precip_prob ?? 0) >= 60 ? '🌧️' : (d.precip_prob ?? 0) >= 30 ? '⛅' : '☀️'}
                                        </p>
                                        <p className="text-[11px] font-black text-slate-100">{Math.round(d.temp_max)}°</p>
                                        <p className="text-[10px] text-slate-400">{Math.round(d.temp_min)}°</p>
                                        {Number.isFinite(d.precip_prob) && <p className="text-[9px] text-sky-300 mt-0.5">{d.precip_prob}%</p>}
                                    </div>
                                );
                            })}
                        </div>
                        <FuenteDato>Open-Meteo · probabilidad de lluvia bajo cada día</FuenteDato>
                    </div>

                    {/* Contraste con la fuente oficial: BSA del IDEAM (semanal, lunes) */}
                    <a href={FUENTES_VIVAS.ideam_bsa_semanal} target="_blank" rel="noopener noreferrer" data-testid="clima-bsa-link"
                        className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5 active:bg-slate-800/60 transition-colors">
                        <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-sky-500/15 grid place-items-center"><Radio size={18} className="text-sky-300" /></span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-slate-100 leading-tight">Contraste con el IDEAM oficial</span>
                            <span className="block text-xs leading-snug text-slate-300 mt-0.5">Este pronóstico es de Open-Meteo. El oficial por departamento sale los lunes en el Boletín Semanal para el Sector Agrícola (BSA).</span>
                        </span>
                        <ExternalLink size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden="true" />
                    </a>
                </>
            )}
        </section>
    );
}

/* ── HORIZONTE 3 · EL NIÑO (estacional) ────────────────────────────────── */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- copy UI es-CO, deuda ADR-050 (messages.js) pendiente igual que el resto del módulo */
const CHECKLIST_ELNINO = [
    { emoji: '💧', t: 'Cosechar y guardar agua YA', d: 'Llene reservorios y aljibes mientras aún cae agua: en el pico seco cada caneca cuenta.' },
    { emoji: '🌾', t: 'Mulch y sombrío', d: 'Cubra el suelo con hojarasca y siembre sombrío en café/cacao para no perder humedad.' },
    { emoji: '🌱', t: 'Variedades precoces y rústicas', d: 'Elija material que madure rápido y aguante seco: menos días expuesto a la sequía.' },
    { emoji: '🔥', t: 'Rondas cortafuego', d: 'Con todo seco una quema se sale de control. Haga cortafuegos y evite quemar.' },
    { emoji: '❄️', t: 'Agua para riego nocturno (altiplano)', d: 'En piso frío despejado suben las heladas de madrugada: reserve agua para riego anti-helada.' },
    { emoji: '🐄', t: 'Ajustar carga animal y forraje', d: 'Guarde forraje y baje la carga: el pasto crece menos en seca.' },
];
/* eslint-enable chagra-i18n/no-hardcoded-spanish */

/* Timeline ENSO mes a mes 2026–27 (durable + citado; % = foto fechada, la
   vigente se lee del boletín vivo). Resalta el período actual por fecha. */
const CAL_ACENTO = {
    nino: { dot: 'bg-amber-400', text: 'text-amber-200', border: 'border-amber-500/40' },
    neutral: { dot: 'bg-emerald-400', text: 'text-emerald-200', border: 'border-emerald-600/40' },
};

function EnsoTimeline() {
    const ahora = faseCalendarioActual();
    return (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4" data-testid="clima-enso-timeline">
            <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
                <CalendarClock size={15} aria-hidden="true" /> El Niño, mes a mes
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
                Las probabilidades son la foto del boletín del {ENSO_TRANSICION.boletinFecha} —{' '}
                <SlotPendiente>la vigente se lee del boletín en vivo</SlotPendiente>. La acción por cultivo es del manejo del piso frío andino.
            </p>

            <ol className="mt-3 space-y-3">
                {ENSO_CALENDARIO_2026_27.map((p) => {
                    const ac = CAL_ACENTO[p.fase] || CAL_ACENTO.nino;
                    const esAhora = p.id === ahora;
                    return (
                        <li key={p.id} data-testid={`enso-cal-${p.id}`}
                            className={`relative rounded-2xl border p-3 pl-4 ${esAhora ? `${ac.border} bg-slate-900/70 ring-1 ring-inset ring-amber-500/20` : 'border-slate-700/50 bg-slate-900/40'}`}>
                            <span aria-hidden="true" className={`absolute left-1.5 top-4 h-2 w-2 rounded-full ${ac.dot}`} />
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[11px] font-black uppercase tracking-wide ${ac.text}`}>{p.periodo}</span>
                                <span className="text-sm font-bold text-slate-100">· {p.titulo}</span>
                                {esAhora && <span data-testid="enso-cal-ahora" className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200">Ahora</span>}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-200">{p.narrativa}</p>

                            {/* Probabilidad: foto fechada citada, o grounded_pendiente si el DR no da cifra dura */}
                            <p className="mt-1.5 text-[11px] leading-snug text-slate-400 flex items-start gap-1.5">
                                <Waves size={12} className="shrink-0 mt-0.5 text-sky-300" aria-hidden="true" />
                                {p.probFoto ? (
                                    <span>{p.probFoto.texto} <span className="text-slate-500">· {p.probFoto.fuente}, foto {p.probFoto.boletinFecha}</span></span>
                                ) : (
                                    <span className="flex items-center gap-1.5">Probabilidad de transición: <SlotPendiente>se lee del boletín vigente</SlotPendiente></span>
                                )}
                            </p>

                            {/* Acción por cultivo (piso frío andino) */}
                            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-emerald-200/90">
                                <Sprout size={13} className="shrink-0 mt-0.5 text-emerald-300" aria-hidden="true" />
                                <span>{p.accionCultivo}</span>
                            </p>
                        </li>
                    );
                })}
            </ol>

            {/* Cuándo se alivia + fuente viva */}
            <div className="mt-3 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid="clima-enso-alivio">
                <p className="text-sm leading-relaxed text-slate-200">
                    <b className="text-amber-200">Pico:</b> {ENSO_TRANSICION.pico}. <b className="text-emerald-200">Se alivia:</b> desde {ENSO_TRANSICION.aliviaDesde},
                    con transición a Neutral hacia {ENSO_TRANSICION.transicionNeutral}. {ENSO_TRANSICION.laNinaConfirmada ? '' : 'No hay La Niña inmediata confirmada.'}
                </p>
                <FuenteDato>{ENSO_TRANSICION.fuente}</FuenteDato>
                <a href={FUENTES_VIVAS.noaa_enso_disc} target="_blank" rel="noopener noreferrer" data-testid="clima-enso-live-link"
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-300 active:text-sky-200">
                    <ExternalLink size={12} aria-hidden="true" /> Ver el pronóstico ENSO vigente (NOAA CPC / IDEAM)
                </a>
            </div>
        </div>
    );
}

/* Ventana de siembra MTA región Andina: deflección honesta (patrón SIPSA) — la
   ventana vigente se lee del boletín en vivo, no se inventa. */
function MtaVentanaSiembra() {
    const v = MTA_VENTANA_SIEMBRA;
    const pendiente = v.ventanaVigente?.estado === ESTADO_GROUNDED_PENDIENTE;
    return (
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4" data-testid="clima-mta-ventana">
            <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
                <Sprout size={15} aria-hidden="true" /> Ventana de siembra · región Andina
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{v.zona}</p>

            <p className="mt-2 text-sm leading-relaxed text-slate-200">{v.regimenBimodal}</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-relaxed text-amber-200/90">
                <Sparkles size={13} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
                <span>{v.matizEnso}</span>
            </p>

            {/* Deflección honesta: la ventana vigente NO se inventa */}
            {pendiente && (
                <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-2.5" data-testid="clima-mta-ventana-pendiente">
                    <Hourglass size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
                    <p className="text-xs leading-snug text-slate-300">
                        La fecha exacta de siembra vigente para su zona la fija el <b className="text-slate-100">Boletín MTA región Andina</b>. Chagra no la inventa: se lee del boletín en vivo.
                    </p>
                </div>
            )}

            {/* Enlace al boletín MTA EN VIVO */}
            <a href={v.urlVivo} target="_blank" rel="noopener noreferrer" data-testid="clima-mta-ventana-live"
                className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-200 active:bg-emerald-500/20">
                <BookOpenText size={15} aria-hidden="true" /> Abrir el Boletín MTA región Andina (en vivo)
                <ExternalLink size={14} className="ml-auto shrink-0" aria-hidden="true" />
            </a>

            {/* Productos oficiales existentes con su última fecha (trazabilidad) */}
            <details className="mt-2.5 group">
                <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <BookOpenText size={12} aria-hidden="true" /> Los boletines de la zona y cuándo salieron
                </summary>
                <ul className="mt-2 space-y-1.5" data-testid="clima-mta-productos">
                    {v.productos.map((prod) => (
                        <li key={prod.nombre}>
                            <a href={prod.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] leading-snug text-slate-300 active:text-slate-100">
                                <ExternalLink size={11} className="shrink-0 text-slate-500" aria-hidden="true" />
                                <span><span className="text-slate-200">{prod.nombre}</span> — {prod.ultima}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </details>

            <p className="mt-2 text-[10px] text-slate-500">Fuente: {v.emisor} · {v.cadencia}</p>
        </div>
    );
}

function HorizonteEstacional({ faseFamily, faseLabel, source, regionLine, mtaRegional, onNavigate }) {
    const lectura = LECTURA_ENSO[faseFamily] || LECTURA_ENSO.neutral;
    const acento = FASE_ACENTO[faseFamily] || FASE_ACENTO.neutral;

    return (
        <section className="clima-seccion space-y-4" data-testid="horizonte-estacional">
            {/* Fase en vivo (IDEAM manda) */}
            <div className={`rounded-2xl border p-4 ${acento.border} ${acento.bg}`}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fase del clima ahora</p>
                <p className={`text-xl font-black leading-tight ${acento.text}`} data-testid="clima-fase-label">{faseLabel}</p>
                <div className="mt-2"><FuenteFase source={source} /></div>
                <p className="mt-3 text-sm font-bold text-slate-100">{lectura.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{lectura.resumen}</p>
                <p className="mt-2 text-[11px] italic text-slate-500">La fase la fija el IDEAM (boletín ENSO). Chagra la lee y la traduce — no inventa el clima.</p>
            </div>

            {/* El Niño 2026–27: outlook (cifra caduca → SlotPendiente) + checklist */}
            <div className="rounded-2xl border border-amber-600/40 bg-gradient-to-br from-amber-950/30 to-slate-950/30 p-4" data-testid="clima-elnino-2027">
                <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
                    <Sparkles size={15} aria-hidden="true" /> El Niño que viene · dic 2026 – ene 2027
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    El IDEAM y la NOAA proyectan el <b>pico entre {ENSO_TRANSICION.pico}</b>, con alivio desde{' '}
                    <b>{ENSO_TRANSICION.aliviaDesde}</b> y vuelta a Neutral hacia {ENSO_TRANSICION.transicionNeutral}: menos lluvia,
                    más calor y más riesgo de incendio hasta entonces. La probabilidad exacta cambia cada mes —{' '}
                    <SlotPendiente>se lee del boletín ENSO vigente</SlotPendiente>. Prepárese desde ya.
                </p>
                <div className="mt-2 flex gap-2.5 rounded-2xl border border-amber-500/20 bg-slate-900/60 p-3">
                    <CompaiAvatar compai="zariguya" size={40} />
                    <p className="text-xs leading-relaxed text-slate-200">
                        <span className="font-bold text-amber-200/90">Doña Zarigüeya:</span> "El mar Pacífico es como una
                        olla de sopa. Cuando se calienta mucho —eso es El Niño— el vapor se va para otro lado y a nosotros
                        nos llega menos lluvia y más sol fuerte. Los ríos bajan y la tierra se seca. ¡Hay que guardar agua
                        como guardo yo la comida para el invierno!"
                    </p>
                </div>
            </div>

            {/* Timeline ENSO mes a mes (durable + citado; % foto fechada) */}
            <EnsoTimeline />

            {/* Lectura regional */}
            {regionLine && (
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4" data-testid="clima-region-linea">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide mb-2">
                        <MapPin size={15} aria-hidden="true" /> En su región
                    </p>
                    <p className="text-sm leading-relaxed text-slate-200">{regionLine}</p>
                </div>
            )}

            {/* La regla insignia + checklist de preparación */}
            <div className={`rounded-2xl border p-4 ${acento.border} ${acento.bg}`}>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <ListChecks size={14} aria-hidden="true" /> La regla del momento
                </p>
                <p className={`mt-1 text-base font-black leading-snug ${acento.text}`} data-testid="clima-regla-insignia">
                    {REGLA_INSIGNIA[faseFamily] || REGLA_INSIGNIA.neutral}
                </p>
            </div>

            <div>
                <p className="text-sm font-black text-slate-100 mb-2.5">Checklist de preparación</p>
                <div className="grid gap-2.5" data-testid="clima-checklist">
                    {CHECKLIST_ELNINO.map((c) => (
                        <div key={c.t} className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3">
                            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-slate-800/70 grid place-items-center text-lg">{c.emoji}</span>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-100 leading-tight">{c.t}</p>
                                <p className="text-xs leading-snug text-slate-300 mt-0.5">{c.d}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Boletines oficiales (IDEAM manda) */}
            <div className="grid gap-2.5">
                {BOLETINES_IDEAM.map((b) => (
                    <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" data-testid={`boletin-${b.id}`}
                        className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5 active:bg-slate-800/60 transition-colors">
                        <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-sky-500/15 grid place-items-center"><BookOpenText size={18} className="text-sky-300" /></span>
                        <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-100 leading-tight">{b.nombre}</span>
                                <span className="shrink-0 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{b.frecuencia}</span>
                            </span>
                            <span className="block text-xs leading-snug text-slate-300 mt-0.5">{b.para}</span>
                            <span className="block text-[10px] text-slate-500 mt-1">{b.emisor}</span>
                        </span>
                        <ExternalLink size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden="true" />
                    </a>
                ))}
            </div>

            {/* MTA regional */}
            <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4" data-testid="clima-mta">
                <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide mb-2"><Compass size={15} aria-hidden="true" /> {MTA_INFO.titulo}</p>
                <p className="text-sm leading-relaxed text-slate-200">{MTA_INFO.descripcion}</p>
                {mtaRegional && (
                    <p className="mt-2 text-sm text-emerald-200" data-testid="clima-mta-regional">
                        Busque el <strong>Boletín Agroclimático</strong> de la <strong>{mtaRegional}</strong>: ahí está la ventana de siembra para su zona.
                    </p>
                )}
            </div>

            {/* Ventana de siembra MTA región Andina (deflección honesta + link vivo) */}
            <MtaVentanaSiembra />

            {/* Fenalce */}
            <a href={FENALCE_INFO.url} target="_blank" rel="noopener noreferrer" data-testid="clima-fenalce"
                className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5 active:bg-slate-800/60 transition-colors">
                <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 grid place-items-center text-lg">🌽</span>
                <span className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-100 leading-tight">{FENALCE_INFO.titulo}</span>
                    <span className="block text-xs leading-snug text-slate-300 mt-0.5">{FENALCE_INFO.descripcion}</span>
                </span>
                <ExternalLink size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden="true" />
            </a>

            {/* Puente al agente */}
            {typeof onNavigate === 'function' && (
                <button type="button" data-testid="clima-preguntar-agente"
                    onClick={() => onNavigate('agente', { prefilledPrompt: '¿Qué debo sembrar según la fase del clima que viene?' })}
                    className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors">
                    <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-sky-500/15 grid place-items-center"><CloudSun size={20} className="text-sky-300" /></span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-100 leading-tight">¿Y en su finca?</span>
                        <span className="block text-xs text-slate-400 leading-tight mt-0.5">Pregúntele al agente qué variedad y fecha le conviene con esta fase.</span>
                    </span>
                </button>
            )}
        </section>
    );
}

/* ── Pantalla principal ────────────────────────────────────────────────── */
export default function ClimaBoletinScreen({ onBack, onNavigate = undefined, location: locationProp = undefined, initialHorizonte = 'hoy' }) {
    const [horizonte, setHorizonte] = useState(
        ['hoy', 'semana', 'estacional'].includes(initialHorizonte) ? initialHorizonte : 'hoy',
    );
    const [agrometeo, setAgrometeo] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [normales, setNormales] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshTick, setRefreshTick] = useState(0);

    // Fase ENSO EN VIVO (fuente única, ensoService alimentado por el sidecar).
    const phase = getEnsoPhase();
    const faseLabel = getEnsoLabel();
    const source = getEnsoPhaseSource();
    const faseFamily = ensoFamily(phase === 'el_nino' ? 'nino' : phase === 'la_nina' ? 'nina' : phase);

    const profile = useMemo(() => getProfile(), []);
    const region = useMemo(() => regionFromProfile(profile), [profile]);
    const regionLine = useMemo(() => ensoRegionalLine(faseFamily, region), [faseFamily, region]);
    const mtaRegional = region ? MTA_POR_REGION[region] : null;

    const location = useMemo(
        () => locationProp || resolveClimaLocation(),
        [locationProp],
    );
    const { cultivos, sinFicha } = useMemo(
        () => parseCultivos(profile?.cultivos_actuales),
        [profile],
    );

    // Carga de datos crudos: snapshot ENSO (sidecar, autoridad) + agrometeo (Open-Meteo).
    // `loading` arranca en true (estado inicial) y en refresco lo re-activa el
    // handler onRefresh — no se toca síncrono dentro del efecto (cascading renders).
    useEffect(() => {
        let alive = true;
        const force = refreshTick > 0;
        Promise.allSettled([
            fetchClimaSnapshot(location ? { ...location, forceRefresh: force } : { forceRefresh: force }),
            location ? fetchAgroMeteo(location, { forceRefresh: force }) : Promise.resolve(null),
        ]).then(([snapRes, meteoRes]) => {
            if (!alive) return;
            if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value);
            if (meteoRes.status === 'fulfilled') setAgrometeo(meteoRes.value);
            setLoading(false);
        });
        return () => { alive = false; };
    }, [location, refreshTick]);

    // Normales (para la anomalía): lazy, solo cuando hay ubicación.
    useEffect(() => {
        let alive = true;
        if (location) fetchNormales(location).then((n) => { if (alive) setNormales(n); });
        return () => { alive = false; };
    }, [location]);

    const anom = useMemo(() => {
        const today = agrometeo?.today;
        if (!today || !normales) return null;
        const tempMedia = (today.temp_max + today.temp_min) / 2;
        return anomalia(tempMedia, today.precip_mm, normales);
    }, [agrometeo, normales]);

    const alertas = snapshot?.alertas_locales || snapshot?.openmeteo?.alertas || [];

    return (
        <ScreenShell title="La página del tiempo" icon={CloudSun} onBack={onBack}>
            <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="clima-boletin-screen">
                {/* Portada: cielo de la fase + ubicación */}
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
                    <CieloENSO family={faseFamily} />
                    <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-100">
                        <MapPin size={13} className="text-emerald-300" aria-hidden="true" />
                        {location?.municipio || location?.vereda || 'Su finca'}
                        {location?.precision === 'centroid' && <span className="text-[11px] font-normal text-slate-500">· aprox.</span>}
                    </p>
                    <p className="mt-1 text-center text-[11px] italic leading-snug text-slate-500">
                        El tiempo de su finca en tres miradas — hoy, la semana y la temporada. Números reales con su fuente; lo que no se sabe aún, se dice.
                    </p>
                </div>

                {/* Navegación por horizontes */}
                <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Horizontes del tiempo">
                    {HORIZONTES.map((h) => {
                        const activo = horizonte === h.id;
                        const Icon = h.icon;
                        return (
                            <button key={h.id} type="button" role="tab" aria-selected={activo}
                                data-testid={`horizonte-tab-${h.id}`} onClick={() => setHorizonte(h.id)}
                                className={`rounded-xl border px-2 py-2.5 text-center transition-colors min-h-[60px] ${
                                    activo ? 'clima-tab-activo border-sky-500/70 bg-sky-500/15 text-sky-200'
                                        : 'border-slate-700 bg-slate-900/50 text-slate-300 active:bg-slate-800/70'
                                }`}>
                                <Icon size={16} className="mx-auto mb-0.5" aria-hidden="true" />
                                <span className="block text-sm font-black leading-tight">{h.titulo}</span>
                                <span className={`block text-[10px] leading-tight ${activo ? 'text-sky-300/90' : 'text-slate-500'}`}>{h.sub}</span>
                            </button>
                        );
                    })}
                </div>

                {horizonte === 'hoy' && (
                    <HorizonteHoy
                        agrometeo={agrometeo} loading={loading} anom={anom}
                        cultivos={cultivos} sinFicha={sinFicha}
                        faseFamily={faseFamily} faseLabel={faseLabel}
                        onRefresh={() => { setLoading(true); setRefreshTick((t) => t + 1); }}
                    />
                )}
                {horizonte === 'semana' && <HorizonteSemana agrometeo={agrometeo} alertas={alertas} />}
                {horizonte === 'estacional' && (
                    <HorizonteEstacional
                        faseFamily={faseFamily} faseLabel={faseLabel} source={source}
                        regionLine={regionLine} mtaRegional={mtaRegional} onNavigate={onNavigate}
                    />
                )}
            </div>
        </ScreenShell>
    );
}

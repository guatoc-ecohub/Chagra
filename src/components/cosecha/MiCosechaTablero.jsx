/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que PoscosechaScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { useEffect, useMemo } from 'react';
import {
  Sprout, TrendingUp, TrendingDown, Minus, Trophy, CalendarDays, Table2, MapPin,
} from 'lucide-react';
import useCosechaStore from '../../store/useCosechaStore';
import './mi-cosecha.css';

/**
 * MiCosechaTablero — tablero visual de "Mi cosecha" (producción / rendimiento).
 *
 * Pinta el `summary` ya agregado por cosechaService (vía useCosechaStore):
 *   - Cifra héroe: total cosechado.
 *   - Tarjetas: este mes (con delta vs mes pasado), este año, cultivo estrella.
 *   - Columnas mensuales (SVG/CSS puro) + barras horizontales por cultivo.
 *   - Rendimiento por lote (kg/planta, kg/ha) cuando hay lotes con datos.
 *   - Tabla accesible con TODOS los números (gemela WCAG de las gráficas).
 *
 * Data-driven honesto: sin registros → estado vacío que invita a registrar la
 * primera cosecha (vista 'cosechar'). Nada se inventa.
 *
 * Byte-neutral: cero imágenes; solo CSS/SVG. Animaciones únicamente con
 * transform/opacity y apagadas bajo prefers-reduced-motion (mi-cosecha.css).
 */

/** Nombres cortos de mes en español (índice 0 = enero). */
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const nfCo = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const nfCo2 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Formatea kilos para mostrar (es-CO). */
export const formatKg = (kg) => nfCo.format(kg || 0);

/** 'YYYY-MM' → 'ene', y 'ene 26' cuando cambia el año respecto al bucket previo. */
export const monthLabel = (period, prevPeriod = null) => {
  const [y, m] = String(period).split('-');
  const label = MESES_CORTOS[Number(m) - 1] || period;
  const prevYear = prevPeriod ? String(prevPeriod).split('-')[0] : null;
  if (!prevPeriod || prevYear !== y) return `${label} ${y.slice(2)}`;
  return label;
};

/** 'YYYY-MM' → 'enero de 2026' (para la tabla y aria-labels). */
const monthLong = (period) => {
  const [y, m] = String(period).split('-');
  const nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${nombres[Number(m) - 1] || period} de ${y}`;
};

/** Bucket 'YYYY-MM' de una fecha. */
const bucketOf = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * Rellena los meses sin registro (con 0) entre el primero y el último bucket
 * de la serie, y recorta a los últimos `max` meses. La gráfica no debe
 * "saltarse" meses vacíos: eso mentiría sobre el ritmo real.
 */
export const buildMonthColumns = (series = [], max = 12) => {
  if (!series.length) return [];
  const byPeriod = new Map(series.map((s) => [s.period, s]));
  const [fy, fm] = series[0].period.split('-').map(Number);
  const [ly, lm] = series[series.length - 1].period.split('-').map(Number);
  const out = [];
  const cursor = new Date(Date.UTC(fy, fm - 1, 1));
  const end = new Date(Date.UTC(ly, lm - 1, 1));
  while (cursor <= end && out.length < 240) {
    const period = bucketOf(cursor);
    out.push(byPeriod.get(period) || { period, totalKg: 0, totalCount: 0, harvestCount: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out.slice(-max);
};

/** Delta del último mes calendario con registro vs el mes anterior. */
export const monthDelta = (series = [], useKg = true) => {
  if (series.length < 2) return null;
  const pick = (s) => (useKg ? s.totalKg : s.totalCount);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  return {
    period: last.period,
    value: pick(last),
    prevValue: pick(prev),
    diff: pick(last) - pick(prev),
  };
};

/** Total del año calendario actual sobre la serie mensual. */
export const yearTotal = (series = [], useKg = true, year = new Date().getFullYear()) =>
  series
    .filter((s) => s.period.startsWith(`${year}-`))
    .reduce((acc, s) => acc + (useKg ? s.totalKg : s.totalCount), 0);

/* ── Ilustración SVG propia del estado vacío: canasta esperando cosecha ────── */
function CanastaVaciaIlustracion() {
  return (
    <svg viewBox="0 0 220 130" className="mc-empty-art w-full max-w-[260px] h-auto" aria-hidden="true">
      <rect x="0" y="0" width="220" height="130" rx="10" fill="rgb(var(--t-accent-rgb, 16 185 129) / 0.08)" />
      {/* Loma y sol */}
      <path d="M0 104 Q60 84 120 100 T220 96 V130 H0 Z" fill="#14532d" opacity="0.55" />
      <circle cx="184" cy="30" r="13" fill="#f4b83c" className="mc-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="mc-sun">
        <path d="M184 10 V4" /><path d="M204 30 H210" /><path d="M198 16 L203 11" />
      </g>
      {/* Canasta vacía */}
      <path d="M62 84 H140 L131 112 H71 Z" fill="#b9822f" />
      <path d="M62 84 H140" stroke="#8a5f22" strokeWidth="3" strokeLinecap="round" />
      <path d="M76 90 L73 106 M101 90 L101 106 M126 90 L129 106" stroke="#8a5f22" strokeWidth="1.5" opacity="0.7" />
      {/* Matica que promete */}
      <g className="mc-sprout">
        <path d="M44 104 V88" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M44 92 Q34 88 32 78 Q43 80 44 92" fill="#10b981" />
        <path d="M44 96 Q54 92 56 82 Q45 84 44 96" fill="#059669" />
      </g>
    </svg>
  );
}

/* ── Tarjeta KPI (stat tile) ────────────────────────────────────────────────── */
function StatTile({ label, value, unit, hint, delta, icon: Icon }) {
  const deltaDir = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const DeltaIcon = deltaDir === 'up' ? TrendingUp : deltaDir === 'down' ? TrendingDown : Minus;
  return (
    <div className="mc-card rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col gap-0.5 min-w-0">
      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
        {Icon && <Icon size={13} aria-hidden="true" className="shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-semibold text-slate-100 truncate">
        {value}
        {unit && <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>}
      </div>
      {deltaDir != null && (
        <div
          className={`text-[11px] flex items-center gap-1 ${
            deltaDir === 'up' ? 'text-emerald-300' : deltaDir === 'down' ? 'text-rose-300' : 'text-slate-400'
          }`}
        >
          <DeltaIcon size={12} aria-hidden="true" />
          <span>
            {deltaDir === 'flat' ? 'igual que el mes pasado'
              : `${delta > 0 ? '+' : '−'}${formatKg(Math.abs(delta))} vs mes pasado`}
          </span>
        </div>
      )}
      {hint && <div className="text-[11px] text-slate-500 truncate">{hint}</div>}
    </div>
  );
}

/* ── Gráfica de columnas por mes (CSS puro, una sola serie/tono) ───────────── */
function ColumnasMes({ columns, useKg }) {
  const values = columns.map((c) => (useKg ? c.totalKg : c.totalCount));
  const max = Math.max(...values, 0);
  if (max <= 0) return null;
  const maxIdx = values.indexOf(Math.max(...values));
  const lastIdx = columns.length - 1;
  const unidad = useKg ? 'kg' : 'unidades';
  const resumen = columns
    .map((c, i) => `${monthLong(c.period)}: ${formatKg(values[i])} ${unidad}`)
    .join('; ');
  return (
    <div role="img" aria-label={`Cosecha por mes. ${resumen}.`}>
      <div className="mc-cols flex items-end gap-[3px] h-[132px]" aria-hidden="true">
        {columns.map((c, i) => {
          const v = values[i];
          const hPct = max > 0 ? (v / max) * 100 : 0;
          const labeled = (i === maxIdx || i === lastIdx) && v > 0;
          return (
            <div key={c.period} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">
              {labeled && (
                <span className="text-[10px] leading-none text-slate-300 whitespace-nowrap">
                  {formatKg(v)}
                </span>
              )}
              <div className="w-full max-w-[24px] h-full flex items-end">
                <div
                  className="mc-bar-v w-full rounded-t"
                  style={{ height: `${Math.max(hPct, v > 0 ? 3 : 0)}%`, animationDelay: `${i * 40}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mc-baseline" aria-hidden="true" />
      <div className="flex gap-[3px] mt-1" aria-hidden="true">
        {columns.map((c, i) => (
          <span key={c.period} className="flex-1 min-w-0 text-center text-[10px] text-slate-500 truncate">
            {monthLabel(c.period, i > 0 ? columns[i - 1].period : null)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Barras horizontales por cultivo (kg, un solo tono) ────────────────────── */
function BarrasCultivo({ crops }) {
  const max = Math.max(...crops.map((c) => c.totalKg), 0);
  if (max <= 0) return null;
  return (
    <ul className="flex flex-col gap-2.5">
      {crops.map((c, i) => (
        <li key={c.cropKey} className="min-w-0">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-200 truncate">{c.crop}</span>
            <span className="text-slate-300 text-xs shrink-0 tabular-nums">
              {formatKg(c.totalKg)} kg
            </span>
          </div>
          <div className="mc-track mt-1" aria-hidden="true">
            <div
              className="mc-bar-h"
              style={{ width: `${(c.totalKg / max) * 100}%`, animationDelay: `${i * 60}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Tabla accesible: todos los números de las gráficas ────────────────────── */
function TablaCosecha({ summary, columns, useKg }) {
  const unidad = useKg ? 'kg' : 'unidades';
  return (
    <details className="mc-card rounded-xl bg-slate-900 border border-slate-800">
      <summary className="p-3 text-sm text-slate-300 flex items-center gap-2 cursor-pointer select-none">
        <Table2 size={15} aria-hidden="true" />
        Ver los números en tabla
      </summary>
      <div className="px-3 pb-3 flex flex-col gap-4 overflow-x-auto">
        <table className="w-full text-xs text-slate-300">
          <caption className="text-left text-slate-400 pb-1.5">Cosecha por mes ({unidad})</caption>
          <thead>
            <tr className="text-slate-500 text-left">
              <th scope="col" className="py-1 pr-2 font-normal">Mes</th>
              <th scope="col" className="py-1 pr-2 font-normal text-right">{unidad === 'kg' ? 'Kilos' : 'Unidades'}</th>
              <th scope="col" className="py-1 font-normal text-right">Cosechas</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.period} className="border-t border-slate-800">
                <th scope="row" className="py-1 pr-2 font-normal text-left">{monthLong(c.period)}</th>
                <td className="py-1 pr-2 text-right tabular-nums">{formatKg(useKg ? c.totalKg : c.totalCount)}</td>
                <td className="py-1 text-right tabular-nums">{c.harvestCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-xs text-slate-300">
          <caption className="text-left text-slate-400 pb-1.5">Producción por cultivo</caption>
          <thead>
            <tr className="text-slate-500 text-left">
              <th scope="col" className="py-1 pr-2 font-normal">Cultivo</th>
              <th scope="col" className="py-1 pr-2 font-normal text-right">Total</th>
              <th scope="col" className="py-1 font-normal text-right">Cosechas</th>
            </tr>
          </thead>
          <tbody>
            {summary.byCrop.map((c) => (
              <tr key={c.cropKey} className="border-t border-slate-800">
                <th scope="row" className="py-1 pr-2 font-normal text-left">{c.crop}</th>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {c.totalKg > 0 ? `${formatKg(c.totalKg)} kg` : `${formatKg(c.totalCount)} und`}
                </td>
                <td className="py-1 text-right tabular-nums">{c.harvestCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.byLote.length > 0 && (
          <table className="w-full text-xs text-slate-300">
            <caption className="text-left text-slate-400 pb-1.5">Rendimiento por lote</caption>
            <thead>
              <tr className="text-slate-500 text-left">
                <th scope="col" className="py-1 pr-2 font-normal">Lote</th>
                <th scope="col" className="py-1 pr-2 font-normal text-right">Kilos</th>
                <th scope="col" className="py-1 pr-2 font-normal text-right">kg/planta</th>
                <th scope="col" className="py-1 font-normal text-right">kg/ha</th>
              </tr>
            </thead>
            <tbody>
              {summary.byLote.map((l) => (
                <tr key={l.loteId} className="border-t border-slate-800">
                  <th scope="row" className="py-1 pr-2 font-normal text-left">{l.name}</th>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatKg(l.totalKg)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{l.kgPerPlant != null ? nfCo2.format(l.kgPerPlant) : '—'}</td>
                  <td className="py-1 text-right tabular-nums">{l.kgPerHa != null ? formatKg(l.kgPerHa) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}

/* ── Estado vacío acogedor ──────────────────────────────────────────────────── */
function EstadoVacio({ onRegistrar }) {
  return (
    <div className="mc-tablero p-6 flex flex-col items-center text-center gap-4">
      <CanastaVaciaIlustracion />
      <div>
        <h3 className="text-base font-semibold text-slate-100">Aún no has registrado cosecha</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-[320px]">
          Cuando anotes lo que recoges, aquí verás cuánto produce tu finca,
          cultivo por cultivo y mes a mes.
        </p>
      </div>
      <button
        type="button"
        onClick={onRegistrar}
        className="mc-cta inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-950 bg-emerald-400 active:scale-[0.98]"
      >
        <Sprout size={16} aria-hidden="true" />
        Toca para registrar tu primera cosecha
      </button>
    </div>
  );
}

/* ── Tablero principal ──────────────────────────────────────────────────────── */
export default function MiCosechaTablero({ onRegistrar }) {
  const summary = useCosechaStore((s) => s.summary);
  const isLoading = useCosechaStore((s) => s.isLoading);
  const error = useCosechaStore((s) => s.error);
  const loadHarvests = useCosechaStore((s) => s.loadHarvests);

  useEffect(() => {
    loadHarvests();
  }, [loadHarvests]);

  const irARegistrar = useMemo(
    () => onRegistrar || (() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'cosechar' }))),
    [onRegistrar],
  );

  const useKg = (summary?.totalKg || 0) > 0;
  const columns = useMemo(
    () => buildMonthColumns(summary?.trend?.series || []),
    [summary],
  );
  const delta = useMemo(
    () => monthDelta(columns, useKg),
    [columns, useKg],
  );
  const totalAnio = useMemo(
    () => yearTotal(summary?.trend?.series || [], useKg),
    [summary, useKg],
  );

  if (isLoading && !summary) {
    return (
      <div className="p-4 flex flex-col gap-3" aria-busy="true" aria-label="Cargando tus cosechas">
        <div className="mc-skeleton h-20 rounded-xl" />
        <div className="mc-skeleton h-32 rounded-xl" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-4 text-sm text-slate-400" role="alert">
        No pudimos cargar tus cosechas. Intenta de nuevo en un momento.
      </div>
    );
  }

  if (!summary || summary.totalHarvests === 0) {
    return <EstadoVacio onRegistrar={irARegistrar} />;
  }

  const heroValue = useKg ? summary.totalKg : summary.byCrop.reduce((a, c) => a + c.totalCount, 0);
  const heroUnit = useKg ? 'kg' : 'unidades';
  const cropsKg = summary.byCrop.filter((c) => c.totalKg > 0);
  const cropsCount = summary.byCrop.filter((c) => !(c.totalKg > 0) && c.totalCount > 0);
  const rendimientos = (summary.yieldPerPlant || []).filter((y) => y.kgPerPlant != null && y.plantCount > 0);
  const lotesConArea = summary.byLote.filter((l) => l.kgPerHa != null || l.kgPerPlant != null);
  const TrendIcon = summary.trend.direction === 'subiendo' ? TrendingUp
    : summary.trend.direction === 'bajando' ? TrendingDown : Minus;
  const { firstMs, lastMs } = summary.dateRange;
  const rango = firstMs != null && lastMs != null
    ? `${monthLong(bucketOf(new Date(firstMs)))} a ${monthLong(bucketOf(new Date(lastMs)))}`
    : null;

  return (
    <section className="mc-tablero p-4 flex flex-col gap-4 text-slate-100">
      {/* Cifra héroe */}
      <header className="mc-card rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Sprout size={14} aria-hidden="true" className="text-emerald-400" />
          Lo que ha dado tu finca
        </p>
        <p className="mt-1">
          <span className="text-5xl font-semibold leading-none">{formatKg(heroValue)}</span>
          <span className="text-base text-slate-400 ml-2">{heroUnit}</span>
        </p>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <TrendIcon size={13} aria-hidden="true" />
          <span>
            Tendencia {summary.trend.direction} · {summary.totalHarvests} {summary.totalHarvests === 1 ? 'cosecha' : 'cosechas'}
            {rango ? ` · de ${rango}` : ''}
          </span>
        </p>
      </header>

      {/* Tarjetas: comparación simple + temporada + estrella */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {delta && (
          <StatTile
            label="Último mes"
            value={formatKg(delta.value)}
            unit={heroUnit}
            delta={delta.diff}
            icon={CalendarDays}
          />
        )}
        <StatTile
          label={`Este año (${new Date().getFullYear()})`}
          value={formatKg(totalAnio)}
          unit={heroUnit}
          hint={`${summary.cropCount} ${summary.cropCount === 1 ? 'cultivo' : 'cultivos'}`}
          icon={Sprout}
        />
        {summary.topCrop && (
          <StatTile
            label="Cultivo estrella"
            value={summary.topCrop.crop}
            hint={summary.topCrop.totalKg > 0
              ? `${formatKg(summary.topCrop.totalKg)} kg`
              : `${formatKg(summary.topCrop.totalCount)} und`}
            icon={Trophy}
          />
        )}
      </div>

      {/* Columnas por mes */}
      {columns.length > 1 && (
        <figure className="mc-card rounded-xl bg-slate-900 border border-slate-800 p-3 m-0">
          <figcaption className="text-sm font-semibold text-slate-200 mb-3">
            Tu cosecha, mes a mes
          </figcaption>
          <ColumnasMes columns={columns} useKg={useKg} />
        </figure>
      )}

      {/* Barras por cultivo */}
      {cropsKg.length > 0 && (
        <figure className="mc-card rounded-xl bg-slate-900 border border-slate-800 p-3 m-0">
          <figcaption className="text-sm font-semibold text-slate-200 mb-3">
            Lo que da cada cultivo <span className="text-slate-500 font-normal">(kg)</span>
          </figcaption>
          <BarrasCultivo crops={cropsKg} />
        </figure>
      )}

      {/* Cultivos medidos por unidades (escala aparte: no se mezclan con kg) */}
      {cropsCount.length > 0 && (
        <div className="mc-card rounded-xl bg-slate-900 border border-slate-800 p-3">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Cosechas por unidades</h4>
          <ul className="flex flex-col gap-1.5">
            {cropsCount.map((c) => (
              <li key={c.cropKey} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="mc-dot-count shrink-0" aria-hidden="true" />
                  <span className="text-slate-200 truncate">{c.crop}</span>
                </span>
                <span className="text-slate-300 text-xs shrink-0 tabular-nums">{formatKg(c.totalCount)} und</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rendimiento */}
      {(rendimientos.length > 0 || lotesConArea.length > 0) && (
        <div className="mc-card rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-slate-200">Rendimiento</h4>
          {rendimientos.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {rendimientos.map((y) => (
                <li key={y.crop} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-slate-300 truncate">{y.crop}</span>
                  <span className="text-slate-200 text-xs shrink-0 tabular-nums">
                    {nfCo2.format(y.kgPerPlant)} kg/planta · {y.plantCount} {y.plantCount === 1 ? 'planta' : 'plantas'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {lotesConArea.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-slate-800 pt-2">
              {lotesConArea.map((l) => (
                <li key={l.loteId} className="flex items-center justify-between text-sm gap-2">
                  <span className="flex items-center gap-1.5 text-slate-300 min-w-0">
                    <MapPin size={13} aria-hidden="true" className="shrink-0 text-slate-500" />
                    <span className="truncate">{l.name}</span>
                  </span>
                  <span className="text-slate-200 text-xs shrink-0 tabular-nums">
                    {formatKg(l.totalKg)} kg{l.kgPerHa != null ? ` · ${formatKg(l.kgPerHa)} kg/ha` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <TablaCosecha summary={summary} columns={columns} useKg={useKg} />

      <button
        type="button"
        onClick={irARegistrar}
        className="text-sm text-emerald-300 underline underline-offset-4 self-center py-1"
      >
        Registrar otra cosecha
      </button>
    </section>
  );
}

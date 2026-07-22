import React, { useMemo, useState } from 'react';
import {
  CloudSun, Compass, ListChecks, BookOpenText, MapPin, ExternalLink,
  Hourglass, Radio, ChevronRight, Sun, CloudRain, Cloud,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import CieloENSO from './CieloENSO';
import { getEnsoPhase, getEnsoLabel, getEnsoPhaseSource } from '../../services/ensoService';
import { ensoFamily, regionFromProfile, ensoRegionalLine } from '../../services/ensoContext';
import { getProfile } from '../../services/userProfileService';
import {
  PILARES_CLIMA,
  LECTURA_ENSO,
  ACCIONES_ENSO,
  REGLA_INSIGNIA,
  BOLETINES_IDEAM,
  MTA_INFO,
  MTA_POR_REGION,
  FENALCE_INFO,
} from '../../data/climaBoletines';
import './clima.css';

/**
 * ClimaBoletinScreen — módulo "El clima que viene": el TRADUCTOR CAMPESINO de
 * los boletines agroclimáticos del IDEAM.
 *
 * Chagra NO pronostica ni reemplaza al IDEAM. Este módulo:
 *   1. ¿Qué viene?  — lee la FASE ENSO en vivo (ensoService, alimentado por el
 *      sidecar NOAA/IDEAM) y la explica en palabras de finca. No fabrica fase.
 *   2. Qué hacer    — la regla accionable por fase (El Niño → material precoz y
 *      de menor demanda hídrica; La Niña → drenaje/exceso de agua), con la
 *      lectura regional de ensoContext según el perfil.
 *   3. Dónde mirar  — remite al Boletín Agroclimático de la Mesa Técnica del
 *      departamento, al boletín ENSO del IDEAM y a Fenalce.
 *
 * Todo lo coyuntural (probabilidades, mm por municipio) es un SLOT que se remite
 * a la fuente vigente — nunca un número inventado (las cifras ENSO caducan).
 */

const FASE_ICON = { nino: Sun, nina: CloudRain, neutral: Cloud };
const FASE_ACENTO = {
  nino: { text: 'text-amber-300', border: 'border-amber-500/50', bg: 'bg-amber-500/10', chip: 'bg-amber-500/15 text-amber-200' },
  nina: { text: 'text-sky-300', border: 'border-sky-500/50', bg: 'bg-sky-500/10', chip: 'bg-sky-500/15 text-sky-200' },
  neutral: { text: 'text-slate-200', border: 'border-slate-600/60', bg: 'bg-slate-500/10', chip: 'bg-slate-500/15 text-slate-200' },
};

/** Chip honesto para cifras que caducan / aún sin grounding: promete, no inventa. */
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

/** De dónde salió la fase: viva (sidecar), fijada a mano, o base sin conexión. */
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
    <span
      data-testid="clima-fuente-fase"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${m.cls}`}
    >
      <Icon size={11} aria-hidden="true" />
      {m.label}
    </span>
  );
}

/* ── PILAR 1 · ¿Qué viene? ─────────────────────────────────────────────── */
function PilarQueViene({ family, faseLabel, source, regionLine }) {
  const lectura = LECTURA_ENSO[family] || LECTURA_ENSO.neutral;
  const acento = FASE_ACENTO[family] || FASE_ACENTO.neutral;
  const FaseIcon = FASE_ICON[family] || Cloud;

  return (
    <section className="clima-seccion space-y-4" data-testid="pilar-que-viene">
      <div className={`rounded-2xl border p-4 ${acento.border} ${acento.bg}`}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`shrink-0 w-11 h-11 rounded-xl grid place-items-center ${acento.chip}`}>
            <FaseIcon size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fase del clima ahora</p>
            <p className={`text-xl font-black leading-tight ${acento.text}`} data-testid="clima-fase-label">
              {faseLabel}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <FuenteFase source={source} />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-100">{lectura.titulo}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-200">{lectura.resumen}</p>
      </div>

      {/* Señales que se ven en la finca */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-3">Qué se ve en la finca</p>
        <ul className="space-y-2">
          {lectura.senales.map((s) => (
            <li key={s} className="flex gap-2 text-sm leading-snug text-slate-200">
              <span aria-hidden="true" className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${acento.chip}`} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lectura regional (de ensoContext, según el perfil) */}
      {regionLine && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4" data-testid="clima-region-linea">
          <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide mb-2">
            <MapPin size={15} aria-hidden="true" /> En su región
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{regionLine}</p>
        </div>
      )}

      {/* Vigilancia: probabilidad de transición — CADUCA, se remite */}
      {family === 'neutral' && (
        <p className="text-xs leading-snug text-slate-400">
          El IDEAM vigila una posible transición de fase (probabilidades por trimestre){' '}
          <SlotPendiente>la cifra vigente cambia — se lee del boletín ENSO</SlotPendiente>. El respaldo sin
          conexión es del boletín NOAA/IDEAM de referencia, no un pronóstico propio.
        </p>
      )}

      <p className="text-[11px] italic text-slate-500">
        La fase la fija el IDEAM (boletín ENSO). Chagra solo la lee y la traduce — no inventa el clima.
      </p>
    </section>
  );
}

/* ── PILAR 2 · Qué hacer ───────────────────────────────────────────────── */
function PilarQueHacer({ family, regionLine, onNavigate = undefined }) {
  const acciones = ACCIONES_ENSO[family] || ACCIONES_ENSO.neutral;
  const acento = FASE_ACENTO[family] || FASE_ACENTO.neutral;

  return (
    <section className="clima-seccion space-y-4" data-testid="pilar-que-hacer">
      {/* La regla insignia del grounding */}
      <div className={`rounded-2xl border p-4 ${acento.border} ${acento.bg}`}>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <ListChecks size={14} aria-hidden="true" /> La regla del momento
        </p>
        <p className={`mt-1 text-base font-black leading-snug ${acento.text}`} data-testid="clima-regla-insignia">
          {REGLA_INSIGNIA[family] || REGLA_INSIGNIA.neutral}
        </p>
      </div>

      {/* Acciones concretas */}
      <div className="grid gap-2.5">
        {acciones.map((a) => (
          <div key={a.titulo} className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5">
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-slate-800/70 grid place-items-center text-lg">
              {a.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 leading-tight">{a.titulo}</p>
              <p className="text-xs leading-snug text-slate-300 mt-0.5">{a.detalle}</p>
            </div>
          </div>
        ))}
      </div>

      {regionLine && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4" data-testid="clima-region-accion">
          <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide mb-2">
            <MapPin size={15} aria-hidden="true" /> Ajuste para su región
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{regionLine}</p>
        </div>
      )}

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="clima-preguntar-agente"
          onClick={() => onNavigate('agente', { prefilledPrompt: '¿Qué debo sembrar según la fase del clima que viene?' })}
          className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-sky-500/15 grid place-items-center">
            <CloudSun size={20} className="text-sky-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">¿Y en su finca?</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Pregúntele al agente qué variedad y fecha le conviene con esta fase.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── PILAR 3 · Dónde mirar ─────────────────────────────────────────────── */
function PilarDondeMirar({ mtaRegional }) {
  return (
    <section className="clima-seccion space-y-4" data-testid="pilar-donde-mirar">
      <p className="text-sm leading-relaxed text-slate-200">
        Chagra le traduce el clima, pero la palabra oficial la tiene el IDEAM. Estos boletines los publican
        gratis y son la fuente de verdad de lo que viene:
      </p>

      {/* Boletines IDEAM */}
      <div className="grid gap-2.5">
        {BOLETINES_IDEAM.map((b) => (
          <a
            key={b.id}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`boletin-${b.id}`}
            className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5 active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-sky-500/15 grid place-items-center">
              <BookOpenText size={18} className="text-sky-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 leading-tight">{b.nombre}</span>
                <span className="shrink-0 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {b.frecuencia}
                </span>
              </span>
              <span className="block text-xs leading-snug text-slate-300 mt-0.5">{b.para}</span>
              <span className="block text-[10px] text-slate-500 mt-1">{b.emisor}</span>
            </span>
            <ExternalLink size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden="true" />
          </a>
        ))}
      </div>

      {/* Mesa Técnica Agroclimática — remite a la del departamento */}
      <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4" data-testid="clima-mta">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide mb-2">
          <Compass size={15} aria-hidden="true" /> {MTA_INFO.titulo}
        </p>
        <p className="text-sm leading-relaxed text-slate-200">{MTA_INFO.descripcion}</p>
        {mtaRegional && (
          <p className="mt-2 text-sm text-emerald-200" data-testid="clima-mta-regional">
            Busque el <strong>Boletín Agroclimático</strong> de la{' '}
            <strong>{mtaRegional}</strong>: ahí está la ventana de siembra para su zona.
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-500">{MTA_INFO.coordinacion}</p>
      </div>

      {/* Fenalce */}
      <a
        href={FENALCE_INFO.url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="clima-fenalce"
        className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5 active:bg-slate-800/60 transition-colors"
      >
        <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 grid place-items-center text-lg">🌽</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-100 leading-tight">{FENALCE_INFO.titulo}</span>
          <span className="block text-xs leading-snug text-slate-300 mt-0.5">{FENALCE_INFO.descripcion}</span>
        </span>
        <ExternalLink size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden="true" />
      </a>

      <p className="text-[11px] italic text-slate-500">
        Los pronósticos concretos y las probabilidades cambian cada mes: léalos en el boletín vigente, no de memoria.
      </p>
    </section>
  );
}

/* ── Pantalla principal ───────────────────────────────────────────────── */
export default function ClimaBoletinScreen({ onBack, onNavigate = undefined }) {
  const [pilar, setPilar] = useState('que_viene');

  // Fase ENSO EN VIVO (ensoService) — fuente única para toda la app. No se
  // fabrica aquí: viene del sidecar NOAA/IDEAM (o del override manual/base).
  const phase = getEnsoPhase();
  const faseLabel = getEnsoLabel();
  const source = getEnsoPhaseSource();
  // ensoService devuelve coarse ('el_nino'/'la_nina'/'neutral'); ensoContext
  // trabaja en familias por prefijo de slug ('nino'/'nina'/'neutral'). El coarse
  // 'el_nino' NO empieza por 'nino', así que hay que normalizar el prefijo ANTES
  // de pasarlo a ensoFamily/ensoRegionalLine — si no, El Niño caería a neutral.
  const family = ensoFamily(
    phase === 'el_nino' ? 'nino' : phase === 'la_nina' ? 'nina' : phase,
  );

  // Lectura regional según el perfil (ensoContext). Vacío si no hay región.
  const region = useMemo(() => regionFromProfile(getProfile()), []);
  const regionLine = useMemo(() => ensoRegionalLine(family, region), [family, region]);
  const mtaRegional = region ? MTA_POR_REGION[region] : null;

  return (
    <ScreenShell title="El clima que viene" icon={CloudSun} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="clima-boletin-screen">
        {/* Portada: el cielo de la fase actual + nota de cuaderno */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
          <CieloENSO family={family} />
          <p className="mt-2 text-xs italic leading-snug text-slate-400 text-center">
            Chagra le lee los boletines del IDEAM en palabras de finca: qué viene, qué hacer, y dónde
            confirmarlo. No adivina el clima — lo traduce.
          </p>
        </div>

        {/* Navegación entre pilares */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Pilares del clima">
          {PILARES_CLIMA.map((p) => {
            const activo = pilar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`pilar-tab-${p.id}`}
                onClick={() => setPilar(p.id)}
                className={`rounded-xl border px-2 py-2.5 text-center transition-colors min-h-[56px] ${
                  activo
                    ? 'clima-tab-activo border-sky-500/70 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 bg-slate-900/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span className="block text-sm font-black leading-tight">{p.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-sky-300/90' : 'text-slate-500'}`}>
                  {p.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {pilar === 'que_viene' && (
          <PilarQueViene family={family} faseLabel={faseLabel} source={source} regionLine={regionLine} />
        )}
        {pilar === 'que_hacer' && (
          <PilarQueHacer family={family} regionLine={regionLine} onNavigate={onNavigate} />
        )}
        {pilar === 'donde_mirar' && <PilarDondeMirar mtaRegional={mtaRegional} />}
      </div>
    </ScreenShell>
  );
}

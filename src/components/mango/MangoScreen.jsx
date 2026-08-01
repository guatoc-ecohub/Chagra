import React, { useState } from 'react';
import {
  Apple, Sprout, Trees, Bug, Leaf, Sun, Flower2, Ruler, Package,
  ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck,
  Mountain, Scissors, FlaskConical, CalendarDays, Info, Hourglass,
  Thermometer, Check, Ban, Droplets,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_MANGO,
  VARIEDADES_MANGO,
  PASOS_SIEMBRA_MANGO,
  DISTANCIA_SIEMBRA_MANGO,
  PISO_TERMICO_MANGO,
  PISO_TERMICO_NOTA,
  PISO_TERMICO_FUENTE,
  AGUA_LUZ_MANGO,
  VECINAS_MANGO,
  CICLO_FLOR_MANGO,
  MALES_MANGO,
  OTROS_MALES_MANGO,
  NOTA_SIN_QUIMICOS_MANGO,
  BIOPREPARADOS_MANGO,
  COSECHA_MANGO,
  FOTO_BASE_MANGO,
  FOTO_FRUTALES_MANGO,
  FOTO_FRUTALES_INJERTO,
  CREDITO_ARBOL_LADERA,
  CREDITO_INJERTO,
  CREDITOS_FOTOS_MANGO,
} from '../../data/mangoFinca';
import './mango.css';

/**
 * MangoScreen — mundo "El mango": el cultivo bandera de la TIERRA CÁLIDA
 * colombiana, contado por su ciclo, con vida y fotos reales (patrón
 * photo-forward de CafeScreen/AguaScreen/Frutales — NO se inventa motor nuevo).
 *
 * Es la PROFUNDIZACIÓN dedicada del mango (como el café o la caña tienen la
 * suya), más allá de la ficha corta que vive dentro de "Frutales de la finca".
 *
 * Cinco estaciones (pestañas), el ciclo del mango de principio a fin:
 *   1. Variedad y siembra — escoger variedad (fina injertada / criolla de pepa)
 *      + patrón, injerto y poda de formación.
 *   2. Piso térmico y agua — HONESTIDAD térmica: cálido 0–1200 msnm sí, ~1200–
 *      1600 arriesgado, por encima de ~1800 NO va. Pleno sol y seca para florecer.
 *   3. Floración y cuaje — la seca dispara la flor; de mucha flor cuaja poca.
 *   4. Plagas y males — antracnosis (enfermedad #1) y mosca de la fruta
 *      (Anastrepha), reconocerlas y manejarlas SIN veneno; + otros males del grafo.
 *   5. Cosecha y despensa — punto de sazón, el látex, madurar en casa y
 *      transformar la cosecha (pulpa, deshidratado, biche).
 *
 * TODO groundeado en el grafo (species.mangifera_indica: pest_controllers,
 * compatible_with, biopreparados) y en perennialCycles (AGROSAVIA). Las cifras
 * que dependen del sitio (dosis, densidad) NO se inventan: son "dato en camino"
 * (SlotPendiente) o se remiten al análisis de suelo / al agente.
 */

/** Chip honesto para cifras aún sin grounding (mismo criterio que el café). */
function SlotPendiente({ children = null }) {
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

/* ── Fotos reales (licencia abierta) — patrón "photo-forward" de Café ──────
 * Foto de Wikimedia Commons + crédito visible + fallback a ícono si no carga.
 * `src` explícito permite REUSAR fotos ya en el bundle (mundo Frutales) sin
 * sumar bytes; si no, arma la ruta desde el slug (/mango/<slug>.jpg). El scrim
 * oscuro es FIJO (no lo vira el remapeo de temas claros) para legibilidad. */
const creditoDe = (slug) => CREDITOS_FOTOS_MANGO.find((c) => c.slug === slug)?.autor || '';

function FotoMango({ slug = null, src = null, credito = null, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Apple, kenburns = false, children = null }) {
  const [ok, setOk] = useState(true);
  const autor = credito !== null ? credito : creditoDe(slug);
  const url = src || `${FOTO_BASE_MANGO}/${slug}.jpg`;
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#2a1e0d] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className={`${kenburns ? 'mango-foto--kenburns' : 'mango-foto'} absolute inset-0 w-full h-full object-cover`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-amber-900/70" />
        </div>
      )}
      {/* scrim fijo para legibilidad del texto/crédito sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {autor && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {autor}
        </span>
      )}
    </div>
  );
}

/** Sol de tierra caliente (firma del mundo): late suave sobre el hero. */
function SolMango() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="mango-sol absolute top-3 right-3.5 w-9 h-9 text-amber-300/80 pointer-events-none"
    >
      <circle cx="20" cy="20" r="7" fill="currentColor" opacity="0.85" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 20 + Math.cos(a) * 11;
        const y1 = 20 + Math.sin(a) * 11;
        const x2 = 20 + Math.cos(a) * 16;
        const y2 = 20 + Math.sin(a) * 16;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
      })}
    </svg>
  );
}

/** Pastilla de propagación (verde = injerto/fino, ámbar = de pepa/criollo). */
function ChipTipoVariedad({ tipo }) {
  const injerto = tipo === 'injerto';
  return (
    <span
      data-testid={`tipo-${tipo}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        injerto
          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
          : 'border-amber-500/50 bg-amber-500/15 text-amber-200'
      }`}
    >
      {injerto ? <Scissors size={11} aria-hidden="true" /> : <Sprout size={11} aria-hidden="true" />}
      {injerto ? 'Injerto (fino)' : 'De pepa (criollo)'}
    </span>
  );
}

/** Pastilla plaga/enfermedad (rose = plaga, violeta = enfermedad). */
function ChipMal({ tipo }) {
  const esEnfermedad = /enfermedad/i.test(tipo);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        esEnfermedad
          ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
          : 'border-rose-500/50 bg-rose-500/15 text-rose-200'
      }`}
    >
      {esEnfermedad ? <Leaf size={11} aria-hidden="true" /> : <Bug size={11} aria-hidden="true" />}
      {esEnfermedad ? 'Enfermedad' : 'Plaga'}
    </span>
  );
}

/* ── ESTACIÓN 1 · Variedad y siembra ──────────────────────────────────── */
function EstacionSiembra() {
  return (
    <section className="mango-seccion space-y-4" data-testid="estacion-siembra">
      {/* Hero con foto real del árbol de mango cargado */}
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241a0c]/60">
        <FotoMango slug="arbol" alt="Árbol de mango cargado de frutos en tierra cálida" ratio="aspect-[16/9]" kenburns Fallback={Apple}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Apple size={14} aria-hidden="true" /> El rey de la tierra caliente
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">Todo empieza por escoger e injertar bien</h3>
          </div>
        </FotoMango>
      </div>

      <PedagogicalBlock
        icon={Apple}
        lead="El mango es una siembra de paciencia y de espacio: un solo árbol grande, sembrado una vez, carga por décadas — si arranca con la variedad y el patrón correctos."
        clave="Las variedades finas se INJERTAN sobre un patrón de mango criollo de pepa: así el arbolito sale igual a la madre y produce en pocos años, no en muchos como el de pepa."
      >
        <p>
          En Colombia hay dos mundos de mango: el <em>fino injertado</em> (Tommy,
          Keitt, Kent, azúcar) para vender, y el <em>criollo de pepa</em> (hilacha,
          común) para jugo, sombra y para servir de patrón. Escoja sabiendo cuál es cuál.
        </p>
      </PedagogicalBlock>

      {/* Variedades con su tipo de propagación */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="mango-variedades">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Apple size={16} aria-hidden="true" /> Las variedades del mango
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        {VARIEDADES_MANGO.map((v) => (
          <div
            key={v.id}
            className={`mango-card rounded-xl border border-slate-700/50 border-l-2 ${
              v.tipo === 'injerto' ? 'border-l-emerald-500/60' : 'border-l-amber-500/60'
            } bg-slate-950/40 p-3`}
            data-testid={`variedad-${v.id}`}
          >
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {v.nombre}
              <ChipTipoVariedad tipo={v.tipo} />
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">{v.uso}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.nota}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Fuente: AGROSAVIA / Asohofrucol.</p>
      </div>

      {/* Del patrón al árbol (foto del injerto + pasos en orden) */}
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#241a0c]/50">
        <FotoMango src={FOTO_FRUTALES_INJERTO} credito={CREDITO_INJERTO} alt="Injerto de yema en un frutal" ratio="aspect-[16/8]" Fallback={Scissors}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> Del patrón al árbol
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">Patrón de pepa, copa fina injertada</h3>
          </div>
        </FotoMango>
        <div className="p-4">
          <ol className="space-y-3">
            {PASOS_SIEMBRA_MANGO.map((paso, i) => (
              <li key={paso.id} className={`mango-paso ${i < 2 ? 'mango-paso--verde' : ''} flex gap-3`} data-testid={`siembra-${paso.id}`}>
                <span aria-hidden="true" className={`shrink-0 w-6 h-6 rounded-full text-xs font-black grid place-items-center border ${i < 2 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300'}`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{paso.titulo}</p>
                  <p className="text-xs leading-snug text-slate-300 mt-0.5">{paso.detalle}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
            <Ruler size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
            <span>
              Distancia orientadora: <span className="font-bold text-slate-200">{DISTANCIA_SIEMBRA_MANGO.orientador}</span>.
              La densidad exacta (árboles por hectárea) cambia con la variedad, el patrón y el sistema{' '}
              <SlotPendiente>densidad por variedad y sistema en camino</SlotPendiente>. No se inventa un número por mata.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Piso térmico y agua (honestidad térmica) ────────────── */
const ICONO_BANDA = { optimo: Check, marginal: TriangleAlert, no_va: Ban };
const COLOR_BANDA = {
  optimo: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100',
  marginal: 'border-amber-500/60 bg-amber-500/10 text-amber-100',
  no_va: 'border-rose-600/60 bg-rose-600/10 text-rose-100',
};
const ICONO_COLOR_BANDA = { optimo: 'text-emerald-300', marginal: 'text-amber-300', no_va: 'text-rose-300' };

function EstacionClima({ onNavigate }) {
  return (
    <section className="mango-seccion space-y-4" data-testid="estacion-clima">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241a0c]/60">
        <FotoMango src={FOTO_FRUTALES_MANGO} credito={CREDITO_ARBOL_LADERA} alt="Árbol de mango solitario en una ladera de tierra cálida" ratio="aspect-[16/9]" kenburns Fallback={Mountain}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Thermometer size={14} aria-hidden="true" /> ¿A mi finca le va?
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">El mango es de tierra caliente</h3>
          </div>
        </FotoMango>
      </div>

      <PedagogicalBlock
        icon={Thermometer}
        tone="alerta"
        lead="Antes de sembrar mango, mírese la altura de su finca: el mango es de TIERRA CÁLIDA y con el frío no florece ni cuaja. Sembrarlo alto es botar plata y tiempo."
        clave="Óptimo por debajo de ~1200 msnm. Por encima de ~1800 msnm el mango NO produce, por bonito que se vea el árbol."
      />

      {/* Escala honesta de piso térmico */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4 space-y-3" data-testid="mango-piso-termico">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Mountain size={16} aria-hidden="true" /> El mango por piso térmico
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        <div className="space-y-2.5">
          {PISO_TERMICO_MANGO.map((b) => {
            const Icono = ICONO_BANDA[b.estado] || Info;
            return (
              <div key={b.id} className={`mango-banda rounded-xl border p-3 ${COLOR_BANDA[b.estado]}`} data-testid={`piso-${b.id}`}>
                <p className="flex flex-wrap items-center gap-2 text-sm font-black leading-tight">
                  <Icono size={16} aria-hidden="true" className={`shrink-0 ${ICONO_COLOR_BANDA[b.estado]}`} />
                  {b.titulo}
                  <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold tabular-nums">{b.rango}</span>
                </p>
                <p className="mt-1 text-xs leading-snug text-white/85">{b.detalle}</p>
              </div>
            );
          })}
        </div>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>{PISO_TERMICO_NOTA}</span>
        </p>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {PISO_TERMICO_FUENTE}.</p>
      </div>

      {/* Luz y agua */}
      <div className="rounded-2xl border border-sky-800/40 bg-[#241a0c]/50 p-4 space-y-3" data-testid="mango-agua-luz">
        <p className="flex items-center gap-2 text-sm font-black text-sky-200 uppercase tracking-wide">
          <Sun size={16} aria-hidden="true" /> {AGUA_LUZ_MANGO.titulo}
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-sky-500/40 to-transparent" />
        </p>
        <ul className="space-y-2">
          {AGUA_LUZ_MANGO.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Droplets size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />{p}
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {AGUA_LUZ_MANGO.fuente}.</p>
      </div>

      {/* Buenas vecinas (compatible_with del grafo) */}
      <div className="rounded-2xl border border-emerald-800/40 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="mango-vecinas">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Trees size={16} aria-hidden="true" /> Con quién vive en tierra cálida
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-transparent" />
        </p>
        {VECINAS_MANGO.map((v) => (
          <div key={v.id} className="mango-card rounded-xl border border-slate-700/50 border-l-2 border-l-emerald-500/50 bg-slate-950/40 p-3" data-testid={`vecina-${v.id}`}>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-bold text-slate-100 leading-tight">
              {v.nombre}
              <span className="text-[11px] italic font-normal text-slate-400">{v.cientifico}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.nota}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Compañías compatibles del catálogo Chagra (mismo piso térmico).</p>
      </div>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="mango-ir-clima"
          onClick={() => onNavigate('clima_boletin')}
          className="mango-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-sky-500/15 grid place-items-center">
            <Sun size={18} className="text-sky-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">¿Cuándo llega la seca?</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Vea el clima que viene (IDEAM): la seca es la que dispara la floración.</span>
          </span>
          <ChevronRight size={18} className="mango-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 3 · Floración y cuaje ───────────────────────────────────── */
function EstacionFlor() {
  const c = CICLO_FLOR_MANGO;
  return (
    <section className="mango-seccion space-y-4" data-testid="estacion-flor">
      <div className="rounded-2xl border border-yellow-800/30 overflow-hidden bg-[#241a0c]/60">
        <FotoMango slug="flor" alt="Panoja (ramillete) de flores de mango" ratio="aspect-[16/9]" kenburns Fallback={Flower2}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-yellow-100">
              <Flower2 size={14} aria-hidden="true" /> De la flor al fruto
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">La seca lo hace florecer</h3>
          </div>
        </FotoMango>
      </div>

      {/* Datos duros del ciclo (grounded del grafo) */}
      <div className="grid grid-cols-2 gap-2" data-testid="mango-ciclo-datos">
        <div className="mango-card rounded-xl border border-amber-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300 mb-1">
            <Flower2 size={13} aria-hidden="true" /> Floración
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{c.floracion}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Cosecha: {c.cosecha}</p>
        </div>
        <div className="mango-card rounded-xl border border-amber-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300 mb-1">
            <CalendarDays size={13} aria-hidden="true" /> Primera cosecha
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{c.primeraCosechaAnios[0]}–{c.primeraCosechaAnios[1]} años</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Injertado · {c.regimen}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{c.disparador}</p>

      {/* Pasos del ciclo flor→fruto */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide mb-3">
          El fruto, paso a paso
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        <ol className="space-y-3">
          {c.pasos.map((paso, i) => (
            <li key={paso.id} className="mango-paso flex gap-3" data-testid={`ciclo-${paso.id}`}>
              <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black grid place-items-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{paso.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{paso.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>{c.regionNota}</span>
        </p>
        <p className="text-[10px] leading-snug text-slate-500 mt-2">Fuente: {c.fuente}.</p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 4 · Plagas y males ──────────────────────────────────────── */
const ICONO_MAL = { antracnosis: Leaf, mosca: Bug };

function MalCard({ mal }) {
  const Icono = ICONO_MAL[mal.id] || Bug;
  return (
    <article className="rounded-2xl border border-rose-800/40 bg-[#241a0c]/50 overflow-hidden shadow-md shadow-black/30" data-testid={`mal-${mal.id}`}>
      <FotoMango slug={mal.foto} alt={`${mal.nombre} (${mal.cientifico}) en el mango`} ratio="aspect-[16/9]" kenburns Fallback={Icono}>
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-rose-200">
            <Icono size={14} aria-hidden="true" /> {mal.tipo}
          </p>
          <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">{mal.nombre}</h3>
          <p className="text-[11px] italic text-white/70 leading-tight">{mal.cientifico}</p>
        </div>
      </FotoMango>

      <div className="p-4 space-y-3">
        {/* Reconocerla */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-rose-300 mb-1.5">
            <TriangleAlert size={14} aria-hidden="true" /> Cómo reconocerla
            <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-rose-500/40 to-transparent" />
          </p>
          <ul className="space-y-1.5">
            {mal.reconocer.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
                <span aria-hidden="true" className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400/80 shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>
        {/* Manejarla (agroecológico / MIP) */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300 mb-2">
            <ShieldCheck size={14} aria-hidden="true" /> Cómo manejarla sin veneno
            <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-transparent" />
          </p>
          <ul className="space-y-2">
            {mal.manejo.map((m, i) => (
              <li key={i} className="mango-card rounded-lg border border-slate-700/50 border-l-2 border-l-emerald-500/50 bg-slate-950/40 p-2.5">
                <p className="text-sm font-bold text-slate-100 leading-tight">{m.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{m.detalle}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {mal.fuente}.</p>
      </div>
    </article>
  );
}

function EstacionMales({ onNavigate }) {
  return (
    <section className="mango-seccion space-y-4" data-testid="estacion-males">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="Dos males mandan en el mango: la antracnosis (un hongo que quema la flor y mancha el fruto) y la mosca de la fruta (que agusana el mango en sazón)."
        clave="A las dos se les gana con manejo, no con más veneno: florecer en seco y airear la copa contra la antracnosis; recoger la fruta picada contra la mosca."
      >
        <p>
          Reconocerlas temprano es media pelea ganada. La antracnosis le baja el
          cuaje y le daña la fruta en clima húmedo; la mosca le agusana el fruto y
          le cierra los mercados. Vea cómo se ven y cómo se manejan.
        </p>
      </PedagogicalBlock>

      {MALES_MANGO.map((mal) => <MalCard key={mal.id} mal={mal} />)}

      {/* Otros males del grafo (tarjetas compactas) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="mango-otros-males">
        <p className="flex items-center gap-2 text-sm font-black text-slate-200 uppercase tracking-wide">
          <Bug size={16} aria-hidden="true" /> Otros males que rondan
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-slate-500/40 to-transparent" />
        </p>
        {OTROS_MALES_MANGO.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 space-y-2" data-testid={`otro-mal-${m.id}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {m.nombre}
              <ChipMal tipo={m.tipo} />
            </p>
            <p className="text-xs leading-snug text-slate-300">
              <span className="font-bold text-rose-300">Se conoce por: </span>{m.senal}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.manejo.map((b, i) => (
                <span key={i} className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] leading-snug text-emerald-100">{b}</span>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Plagas y controladores del catálogo Chagra.</p>
      </div>

      {/* Biopreparados de apoyo */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4" data-testid="mango-biopreparados">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-2">
          <FlaskConical size={13} aria-hidden="true" /> Biopreparados de apoyo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BIOPREPARADOS_MANGO.map((b, i) => (
            <span key={i} className="rounded-full border border-slate-600/50 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-200">{b}</span>
          ))}
        </div>
      </div>

      {/* Guard anti-receta: nada de dosis químicas inventadas */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="mango-nota-sin-quimicos">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{NOTA_SIN_QUIMICOS_MANGO}</span>
        </p>
      </div>

      {/* Puentes a los mundos hermanos de sanidad */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="mango-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="mango-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Caldo bordelés, cola de caballo, lechada de cal y más, con su receta.</span>
            </span>
            <ChevronRight size={18} className="mango-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="mango-ir-sanidad"
            onClick={() => onNavigate('sanidad_sintoma')}
            className="mango-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-rose-500/15 grid place-items-center">
              <Bug size={18} className="text-rose-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Mi mata está enferma</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Diga qué le ve y sepa qué es y cómo manejarla.</span>
            </span>
            <ChevronRight size={18} className="mango-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── ESTACIÓN 5 · Cosecha y despensa ──────────────────────────────────── */
function EstacionCosecha({ onNavigate }) {
  const c = COSECHA_MANGO;
  return (
    <section className="mango-seccion space-y-4" data-testid="estacion-cosecha">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241a0c]/60">
        <FotoMango slug="fruto" alt="Mango maduro en sazón, listo para la cosecha" ratio="aspect-[16/9]" kenburns Fallback={Apple}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Apple size={14} aria-hidden="true" /> Cosecha y despensa
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">Cójalo en sazón, no verde-tierno</h3>
          </div>
        </FotoMango>
      </div>

      {/* Punto, látex y maduración */}
      <div className="space-y-3">
        {[c.punto, c.latex, c.maduracion].map((b, i) => (
          <div key={i} className="mango-card rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4" data-testid={`cosecha-bloque-${i}`}>
            <p className="flex items-center gap-2 text-sm font-bold text-amber-100 leading-tight">
              <Scissors size={15} aria-hidden="true" className="shrink-0 text-amber-300" /> {b.titulo}
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{b.detalle}</p>
          </div>
        ))}
      </div>

      {/* Transformar la cosecha (una cosecha grande de una vez) */}
      <div className="rounded-2xl border border-lime-800/40 bg-lime-950/20 p-4 space-y-3" data-testid="mango-transformar">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <Package size={16} aria-hidden="true" /> {c.transformar.titulo}
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-lime-500/40 to-transparent" />
        </p>
        <p className="text-xs leading-snug text-slate-200">{c.transformar.resumen}</p>
        <ul className="space-y-2">
          {c.transformar.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Leaf size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-400" />{p}
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {c.transformar.fuente}.</p>
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="mango-ir-poscosecha"
            onClick={() => onNavigate('poscosecha')}
            className="mango-cta w-full flex items-center gap-3 rounded-xl border border-lime-700/50 bg-lime-900/20 p-3 text-left active:bg-lime-900/40"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/20 grid place-items-center">
              <Package size={18} className="text-lime-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Poscosecha y despensa</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cómo guardar y transformar la cosecha sin que se pierda.</span>
            </span>
            <ChevronRight size={18} className="mango-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">Fuente: {c.fuente}.</p>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_MANGO.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#241a0c]/50 p-3" data-testid="mango-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 text-left"
      >
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_MANGO.map((cr) => (
            <li key={cr.slug} className="text-[11px] leading-snug text-slate-400">
              <a
                href={cr.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5"
              >
                {cr.slug}<ExternalLink size={10} className="inline shrink-0" aria-hidden="true" />
              </a>
              <span className="text-slate-500"> — {cr.autor} · {cr.licencia} · Wikimedia Commons</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Pantalla principal ───────────────────────────────────────────────── */
export default function MangoScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('siembra');

  return (
    <ScreenShell title="El mango" icon={Apple} onBack={onBack}>
      <div className="mango-mundo max-w-2xl mx-auto p-4 space-y-4" data-testid="mango-screen">
        {/* Portada del mundo: hero con foto real (árbol cargado) + sol. */}
        <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241a0c]/60 shadow-lg shadow-black/40">
          <FotoMango
            slug="arbol"
            alt="Árbol de mango cargado de frutos"
            ratio="aspect-[16/10]"
            kenburns
            Fallback={Apple}
          >
            <SolMango />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="mango-hero-linea flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                <Apple size={14} aria-hidden="true" /> El ciclo del mango
              </p>
              <h2 className="mango-hero-linea mango-hero-linea--2 mt-0.5 text-2xl font-black text-white leading-tight drop-shadow [text-wrap:balance]">
                El mango, cultivo bandera de la tierra cálida
              </h2>
              <p className="mango-hero-linea mango-hero-linea--3 mt-1.5 text-xs italic leading-snug text-white/85 drop-shadow-sm">
                Un árbol de tierra caliente, de una gran cosecha al año: escoger e injertar
                la variedad, sembrarlo donde el calor lo deje cuajar, aprovechar la seca que
                lo hace florecer, defenderlo de la antracnosis y la mosca, y cosecharlo en
                sazón — hasta transformar el sobrante para que no se pierda.
              </p>
            </div>
          </FotoMango>
        </div>

        {/* Navegación entre estaciones (2×… / 5). El numeral marca el orden real
            del ciclo del mango: siembra → clima → flor → sanidad → cosecha. */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones del mango">
          {ESTACIONES_MANGO.map((e, i) => {
            const activo = estacion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                id={`tab-mango-${e.id}`}
                aria-controls="panel-mango-estacion"
                aria-selected={activo}
                data-testid={`estacion-tab-${e.id}`}
                onClick={() => setEstacion(e.id)}
                className={`mango-tab relative rounded-xl border px-2 pt-2.5 pb-3 text-center min-h-[56px] ${
                  activo
                    ? 'mango-estacion-activa border-amber-500/70 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-100'
                    : 'border-slate-700 bg-[#241a0c]/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 right-1.5 text-[9px] font-black tabular-nums ${activo ? 'text-amber-300' : 'text-slate-600'}`}
                >
                  {i + 1}
                </span>
                <span className="block text-sm font-black leading-tight">{e.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-amber-200/90' : 'text-slate-500'}`}>
                  {e.descripcion}
                </span>
                {activo && (
                  <span
                    aria-hidden="true"
                    className="mango-tab-indicador absolute bottom-1 left-1/2 -ml-3 w-6 h-0.5 rounded-full bg-amber-400/90"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id="panel-mango-estacion" aria-labelledby={`tab-mango-${estacion}`}>
          {estacion === 'siembra' && <EstacionSiembra />}
          {estacion === 'clima' && <EstacionClima onNavigate={onNavigate} />}
          {estacion === 'flor' && <EstacionFlor />}
          {estacion === 'males' && <EstacionMales onNavigate={onNavigate} />}
          {estacion === 'cosecha' && <EstacionCosecha onNavigate={onNavigate} />}
        </div>

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="mango-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo cuido mi mango en la finca (variedad, floración, antracnosis y mosca de la fruta)?' })}
            className="mango-cta w-full flex items-center gap-3 rounded-2xl border border-amber-800/40 bg-gradient-to-r from-amber-950/40 to-slate-900/40 p-3.5 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Apple size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su mango es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su altura.</span>
            </span>
            <ChevronRight size={18} className="mango-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

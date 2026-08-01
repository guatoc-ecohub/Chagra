import React, { useState } from 'react';
import {
  Citrus, Sprout, Scissors, Bug, Leaf, Sun, Mountain, Thermometer, Snowflake,
  Ruler, Droplets, ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck,
  FlaskConical, CalendarDays, Info, Hourglass, Trees,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_CITRICOS,
  VARIEDADES_CITRICOS,
  INJERTO_CITRICOS,
  ASOCIACION_CITRICOS,
  PISO_TERMICO,
  PASOS_SIEMBRA,
  PODA_CITRICOS,
  PLAGAS_CITRICOS,
  HLB_CUARENTENA,
  GOMOSIS_PENDIENTE,
  BIOPREPARADOS_CITRICOS,
  NOTA_SIN_QUIMICOS,
  FERTILIZACION_CITRICOS,
  COSECHA_CITRICOS,
  CREDITOS_FOTOS_CITRICOS,
  fotoSrc,
} from '../../data/citricosFinca';
import './citricos.css';

/**
 * CitricosScreen — mundo "Los cítricos": profundización DEDICADA del frutal
 * cítrico (naranja, mandarina, limón y lima), el corazón del solar campesino de
 * tierra caliente. Sigue el patrón PHOTO-FORWARD de CafeScreen/AguaScreen (NO
 * inventa motor nuevo): 5 estaciones en pestañas, fotos CC reales con atribución
 * (reusadas de /frutales + tres nuevas en /citricos), scrim fijo para legibilidad
 * al sol y fallback a ícono.
 *
 * Cinco estaciones, el ciclo del cítrico de principio a fin:
 *   1. Variedades e injerto — cuál escoger y por qué injertado sobre patrón.
 *   2. El piso térmico       — el corazón: clima CÁLIDO-templado; dónde SÍ y dónde NO.
 *   3. Siembra y poda        — drenaje, hoyo, injerto por encima, formación.
 *   4. Plagas y HLB          — reconocerlas + manejo sin veneno; HLB/psílido y cuarentena.
 *   5. Abono y cosecha       — nutrición, punto de corte (no climatérico) y poscosecha.
 *
 * GROUNDING (src/data/citricosFinca.js): especies y plagas del grafo Chagra
 * (citrus_sinensis/reticulata/latifolia; pest_controllers → AFFECTS/CONTROLS),
 * piso térmico de perennialCycles (citrus_latifolia 0–2100 msnm, AGROSAVIA). Las
 * cifras que dependen del sitio (distancia por patrón, dosis) NO se inventan:
 * son "dato en camino". La gomosis (no está en el grafo para cítricos) se declara
 * faltante con honestidad, no se le inventa manejo.
 */

/** Chip honesto para cifras/fichas aún sin grounding (mismo criterio que café). */
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

/* ── Foto real (licencia abierta) — patrón "photo-forward" de Café/Agua ─────
 * El `src` sale de fotoSrc(slug), que resuelve el reuso (/frutales) o las fotos
 * nuevas (/citricos). Crédito visible + fallback a ícono si no carga. El scrim
 * oscuro es FIJO (no lo vira el remapeo de temas claros) para legibilidad. */
const creditoDe = (slug) => CREDITOS_FOTOS_CITRICOS.find((c) => c.slug === slug)?.autor || '';

function FotoCitrico({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Citrus, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const src = fotoSrc(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#241a0c] ${ratio} ${rounded}`}>
      {ok && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="citricos-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-amber-900/70" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {credito && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {credito}
        </span>
      )}
    </div>
  );
}

/** Pastilla plaga/enfermedad (rose = plaga insecto, violeta = enfermedad). */
function ChipTipoMal({ tipo }) {
  const esEnfermedad = tipo === 'enfermedad';
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

/* ── ESTACIÓN 1 · Variedades e injerto ────────────────────────────────── */
function EstacionVariedades() {
  return (
    <section className="citricos-seccion space-y-4" data-testid="estacion-variedades">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241a0c]/60">
        <FotoCitrico slug="naranjal" alt="Naranjal cargado de fruta en tierra caliente" ratio="aspect-[16/9]" Fallback={Citrus}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Citrus size={14} aria-hidden="true" /> El corazón del solar caliente
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Naranja, mandarina, limón y lima</h3>
          </div>
        </FotoCitrico>
      </div>

      <PedagogicalBlock
        icon={Citrus}
        lead="Los cítricos son la fruta de la casa en tierra caliente: se siembran una vez, injertados, y dan por muchos años."
        clave="El cítrico NO se siembra de pepa: se INJERTA sobre un patrón. Compre el arbolito a un vivero registrado ante el ICA — ahí empieza la sanidad."
      >
        <p>
          Naranja, mandarina y limón viven bien del nivel del mar a la tierra
          templada. Cada uno tiene sus variedades; escoja sabiendo cuál es cuál y,
          sobre todo, si su clima les conviene (eso lo vemos en la siguiente pestaña).
        </p>
      </PedagogicalBlock>

      {/* Variedades cítricas (grounded del grafo) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="citricos-variedades">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Citrus size={16} aria-hidden="true" /> Las cítricas de la finca
        </p>
        {VARIEDADES_CITRICOS.map((v) => (
          <div key={v.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`variedad-${v.id}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {v.nombre}
              <span className="text-[11px] italic font-normal text-slate-400">{v.cientifico}</span>
              {v.enGrafo
                ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-200"><ShieldCheck size={11} aria-hidden="true" /> En el catálogo</span>
                : <SlotPendiente>ficha en camino</SlotPendiente>}
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.nota}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Fuente: catálogo Chagra (naranja, mandarina, limón Tahití) · AGROSAVIA / ICA.</p>
      </div>

      {/* Por qué injertado (foto real del injerto de yema) */}
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#241a0c]/50" data-testid="citricos-injerto">
        <FotoCitrico slug="injerto" alt="Injerto de yema en un patrón cítrico" ratio="aspect-[16/8]" Fallback={Scissors}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> Patrón + copa
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow">{INJERTO_CITRICOS.titulo}</h3>
          </div>
        </FotoCitrico>
        <div className="p-4 space-y-3">
          <p className="text-xs leading-snug text-slate-200">{INJERTO_CITRICOS.resumen}</p>
          <ul className="space-y-2">
            {INJERTO_CITRICOS.puntos.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
                <Sprout size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-emerald-400" />{p}
              </li>
            ))}
          </ul>
          <p className="text-[10px] leading-snug text-slate-500">Fuente: {INJERTO_CITRICOS.fuente}.</p>
        </div>
      </div>

      {/* Buena vecina groundeada (compatible_with del grafo) */}
      <div className="rounded-xl border border-lime-800/40 bg-lime-950/20 p-3" data-testid="citricos-asociacion">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-lime-200 mb-1">
          <Trees size={13} aria-hidden="true" /> Buena vecina
        </p>
        <p className="text-xs leading-snug text-slate-200">
          <span className="font-bold text-slate-100">{ASOCIACION_CITRICOS.especie}</span>{' '}
          <span className="italic text-slate-400">({ASOCIACION_CITRICOS.cientifico})</span> — {ASOCIACION_CITRICOS.nota}
        </p>
        <p className="text-[10px] leading-snug text-slate-500 mt-1">Fuente: {ASOCIACION_CITRICOS.fuente}.</p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · El piso térmico (el corazón del mundo) ───────────────── */
const APTO_ESTILO = {
  optimo: { chip: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200', barra: 'bg-emerald-500', label: 'Ideal', Icono: Sun },
  bien: { chip: 'border-lime-500/60 bg-lime-500/15 text-lime-200', barra: 'bg-lime-500', label: 'Se da bien', Icono: Leaf },
  limite: { chip: 'border-amber-500/60 bg-amber-500/15 text-amber-200', barra: 'bg-amber-500', label: 'Al límite', Icono: Thermometer },
  no: { chip: 'border-rose-500/60 bg-rose-500/15 text-rose-200', barra: 'bg-rose-500', label: 'NO va', Icono: Snowflake },
};

function EstacionPiso({ onNavigate }) {
  const p = PISO_TERMICO;
  return (
    <section className="citricos-seccion space-y-4" data-testid="estacion-piso">
      <div className="rounded-2xl border border-sky-800/40 overflow-hidden bg-[#241a0c]/60">
        <FotoCitrico slug="naranjal" alt="Naranjal en clima cálido" ratio="aspect-[16/9]" Fallback={Mountain}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-sky-200">
              <Thermometer size={14} aria-hidden="true" /> Piso térmico
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">{p.titulo}</h3>
          </div>
        </FotoCitrico>
      </div>

      <PedagogicalBlock
        icon={Thermometer}
        tone="alerta"
        lead={p.lead}
        clave="Regla de oro: el cítrico es de tierra CALIENTE-templada (0–1800 msnm; el limón Tahití hasta ~2100). En clima frío alto NO va — no bote la plata sembrándolo."
      />

      {/* El "termómetro" de altitud: bandas con semáforo (grounded) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="citricos-termometro">
        <p className="flex items-center gap-2 text-sm font-black text-sky-200 uppercase tracking-wide">
          <Mountain size={16} aria-hidden="true" /> ¿A qué altura está su finca?
        </p>
        {p.bandas.map((b) => {
          const est = APTO_ESTILO[b.apto] || APTO_ESTILO.bien;
          const Icono = est.Icono;
          return (
            <div key={b.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 flex gap-3" data-testid={`piso-banda-${b.id}`}>
              <div className={`shrink-0 w-1.5 rounded-full ${est.barra}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
                  {b.rango}
                  <span className="text-[11px] font-normal text-slate-400">{b.clima}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${est.chip}`}>
                    <Icono size={11} aria-hidden="true" /> {est.label}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-snug text-slate-300">{b.nota}</p>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {p.fuente}.</p>
      </div>

      {/* Luz, agua y drenaje */}
      <div className="rounded-2xl border border-amber-800/40 bg-[#241a0c]/50 p-4 space-y-2" data-testid="citricos-agualuz">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Droplets size={16} aria-hidden="true" /> Sol y drenaje
        </p>
        <div className="flex items-start gap-2 text-xs leading-snug text-slate-300">
          <Sun size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{p.aguaLuz}</span>
        </div>
      </div>

      {/* Redirección honesta para clima frío (no dejar al campesino sin salida) */}
      <div className="rounded-xl border border-sky-700/40 bg-sky-950/20 p-3" data-testid="citricos-redireccion-frio">
        <p className="flex items-start gap-1.5 text-[12px] leading-snug text-sky-100">
          <Snowflake size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />
          <span>{p.redireccionFrio.texto}</span>
        </p>
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="citricos-ir-agente-frio"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Qué frutales sirven para mi finca de clima frío alto (más de 2100 msnm)?' })}
            className="mt-2 w-full flex items-center gap-3 rounded-xl border border-sky-700/50 bg-sky-900/20 p-2.5 text-left active:bg-sky-900/40 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-8 h-8 rounded-lg bg-sky-500/15 grid place-items-center">
              <Mountain size={16} className="text-sky-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-slate-100 leading-tight">¿Vivo en tierra fría?</span>
              <span className="block text-[11px] text-slate-400 leading-tight mt-0.5">Pregúntele al agente por frutales de frío.</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

/* ── ESTACIÓN 3 · Siembra y poda ──────────────────────────────────────── */
function EstacionSiembra({ onNavigate }) {
  return (
    <section className="citricos-seccion space-y-4" data-testid="estacion-siembra">
      <PedagogicalBlock
        icon={Sprout}
        lead="El cítrico se muere con los pies en el agua: la siembra bien hecha es, sobre todo, DRENAJE."
        clave="Siembre en alto si el suelo es pesado, deje el injerto por encima de la tierra y forme el árbol desde chiquito."
      />

      {/* Pasos de siembra en orden */}
      <div className="rounded-2xl border border-lime-800/40 bg-[#241a0c]/50 p-4" data-testid="citricos-siembra-pasos">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide mb-3">
          <Ruler size={16} aria-hidden="true" /> De la compra al hoyo
        </p>
        <ol className="space-y-3">
          {PASOS_SIEMBRA.map((paso, i) => (
            <li key={paso.id} className="flex gap-3" data-testid={`siembra-${paso.id}`}>
              <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-lime-500/20 border border-lime-500/40 text-lime-300 text-xs font-black grid place-items-center">
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
          <span>
            La distancia exacta entre árboles depende del patrón y del vigor de la variedad{' '}
            <SlotPendiente>marco de plantación por patrón</SlotPendiente>. Aquí no se inventa un número por hectárea.
          </span>
        </p>
      </div>

      {/* Poda */}
      <div className="rounded-2xl border border-teal-800/40 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="citricos-poda">
        <p className="flex items-center gap-2 text-sm font-black text-teal-200 uppercase tracking-wide">
          <Scissors size={16} aria-hidden="true" /> {PODA_CITRICOS.titulo}
        </p>
        <ul className="space-y-2">
          {PODA_CITRICOS.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Scissors size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-teal-300" />{p}
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {PODA_CITRICOS.fuente}.</p>
      </div>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="citricos-ir-suelo"
          onClick={() => onNavigate('salud_suelo')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
            <Mountain size={18} className="text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Lea su análisis y corrija la acidez y el drenaje antes de sembrar.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 4 · Plagas y HLB ────────────────────────────────────────── */
function PlagaCard({ plaga }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 overflow-hidden" data-testid={`plaga-${plaga.id}`}>
      {plaga.foto && (
        <FotoCitrico slug={plaga.foto} alt={`${plaga.nombre} en el cítrico`} ratio="aspect-[16/8]" Fallback={Bug} />
      )}
      <div className="p-3 space-y-2">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
          {plaga.nombre}
          <ChipTipoMal tipo={plaga.tipo} />
        </p>
        <p className="text-xs leading-snug text-slate-300">
          <span className="font-bold text-rose-300">Se conoce por: </span>{plaga.senal}
        </p>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-1.5">
            <ShieldCheck size={12} aria-hidden="true" /> Manejo sin veneno
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plaga.biocontrol.map((b, i) => (
              <span key={i} className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] leading-snug text-emerald-100">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EstacionPlagas({ onNavigate }) {
  const h = HLB_CUARENTENA;
  return (
    <section className="citricos-seccion space-y-4" data-testid="estacion-plagas">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="Al cítrico lo persiguen bichos y hongos, pero el que lo mata sin cura es el HLB (dragón amarillo)."
        clave="A casi todos se les gana con manejo (poda, control biológico, trampas). Al HLB solo se le gana PREVINIENDO: árbol certificado, controlar el psílido y reportar al ICA."
      >
        <p>
          Reconocerlos temprano es media pelea ganada. Los bichos buenos y los
          biocontroles que ve en cada tarjeta salen del catálogo Chagra (a qué le
          pega cada plaga y quién la controla).
        </p>
      </PedagogicalBlock>

      {/* HLB primero, por ser el más grave (foto real de la hoja moteada) */}
      <article className="rounded-2xl border border-amber-600/50 bg-amber-950/25 overflow-hidden" data-testid="citricos-hlb">
        <FotoCitrico slug={h.foto} alt="Hoja de cítrico con el moteado amarillo asimétrico del HLB / dragón amarillo" ratio="aspect-[16/9]" Fallback={TriangleAlert}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <TriangleAlert size={14} aria-hidden="true" /> Reporte obligatorio ICA
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow">{h.titulo}</h3>
          </div>
        </FotoCitrico>
        <div className="p-4 space-y-3">
          <p className="text-xs leading-snug text-amber-100/90">{h.detalle}</p>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-rose-300 mb-1.5">
              <TriangleAlert size={12} aria-hidden="true" /> Cómo reconocerlo
            </p>
            <ul className="space-y-1.5">
              {h.senales.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-snug text-slate-200">
                  <span aria-hidden="true" className="text-rose-400 shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-1.5">
              <ShieldCheck size={12} aria-hidden="true" /> Qué hacer (prevenir, no curar)
            </p>
            <ul className="space-y-1.5">
              {h.manejo.map((m, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-snug text-slate-200">
                  <span aria-hidden="true" className="text-emerald-400 shrink-0">•</span>{m}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] leading-snug text-slate-500">Fuente: {h.fuente}.</p>
        </div>
      </article>

      {/* El resto de plagas/enfermedades (grounded del grafo) */}
      <div className="space-y-2.5" data-testid="citricos-plagas-lista">
        {PLAGAS_CITRICOS.map((p) => <PlagaCard key={p.id} plaga={p} />)}
      </div>

      {/* Gomosis = honestidad de faltante (no está en el grafo → no se inventa) */}
      <div className="rounded-xl border border-slate-600/50 bg-slate-900/40 p-3" data-testid="citricos-gomosis-pendiente">
        <p className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-300 mb-1">
          <Leaf size={13} aria-hidden="true" /> {GOMOSIS_PENDIENTE.titulo} <SlotPendiente />
        </p>
        <p className="text-xs leading-snug text-slate-300">{GOMOSIS_PENDIENTE.texto}</p>
      </div>

      {/* Biopreparados groundeados de la especie */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241a0c]/50 p-4" data-testid="citricos-biopreparados">
        <p className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-emerald-200 mb-2">
          <FlaskConical size={16} aria-hidden="true" /> Biopreparados de apoyo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BIOPREPARADOS_CITRICOS.map((b, i) => (
            <span key={i} className="rounded-full border border-slate-600/50 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-200">{b}</span>
          ))}
        </div>
        <p className="text-[10px] leading-snug text-slate-500 mt-2">Fuente: catálogo Chagra (biopreparados de las especies cítricas).</p>
      </div>

      {/* Guard anti-receta */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="citricos-nota-sin-quimicos">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{NOTA_SIN_QUIMICOS}</span>
        </p>
      </div>

      {/* Puentes a los mundos hermanos de sanidad */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="citricos-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Nim, aceite-jabón, caldo de ceniza y más, con su receta.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="citricos-ir-sanidad"
            onClick={() => onNavigate('sanidad_sintoma')}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-rose-500/15 grid place-items-center">
              <Bug size={18} className="text-rose-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Mi mata está enferma</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Diga qué le ve y sepa qué es y cómo manejarla.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── ESTACIÓN 5 · Abono y cosecha ─────────────────────────────────────── */
function EstacionCosecha() {
  const f = FERTILIZACION_CITRICOS;
  const c = COSECHA_CITRICOS;
  return (
    <section className="citricos-seccion space-y-4" data-testid="estacion-cosecha">
      {/* Fertilización */}
      <div className="rounded-2xl border border-amber-800/40 bg-[#241a0c]/50 p-4 space-y-2.5" data-testid="citricos-fertilizacion">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <FlaskConical size={16} aria-hidden="true" /> {f.titulo}
        </p>
        <ul className="space-y-2">
          {f.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Sprout size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-400" />{p}
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>{f.slot.texto}{' '}<SlotPendiente>dosis según análisis de suelo</SlotPendiente>.</span>
        </p>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {f.fuente}.</p>
      </div>

      {/* Cosecha: primera cosecha por especie (grounded) */}
      <div className="rounded-2xl border border-orange-800/40 bg-[#241a0c]/50 p-4 space-y-3" data-testid="citricos-cosecha">
        <p className="flex items-center gap-2 text-sm font-black text-orange-200 uppercase tracking-wide">
          <CalendarDays size={16} aria-hidden="true" /> ¿Cuándo empieza a dar?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {c.primeraCosecha.map((e) => (
            <div key={e.id} className="rounded-xl border border-orange-700/40 bg-slate-950/40 p-2.5" data-testid={`cosecha-${e.id}`}>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-orange-300 mb-0.5">
                <Citrus size={12} aria-hidden="true" /> {e.nombre}
              </p>
              <p className="text-sm font-bold text-slate-100 leading-tight">
                {e.grounded ? e.valor : <SlotPendiente>{e.valor}</SlotPendiente>}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{e.nota}</p>
            </div>
          ))}
        </div>

        {/* El punto: no climatérico (dato clave y honesto) */}
        <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-200 mb-1">
            <TriangleAlert size={13} aria-hidden="true" /> El punto: cójalo maduro
          </p>
          <p className="text-xs leading-snug text-amber-100/90">{c.noClimaterico}</p>
        </div>

        {/* Poscosecha */}
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-300 mb-1.5">
            <Leaf size={12} aria-hidden="true" /> Poscosecha
          </p>
          <ul className="space-y-1.5">
            {c.poscosecha.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
                <Citrus size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-orange-300" />{p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {c.fuente}.</p>
      </div>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_CITRICOS.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#241a0c]/50 p-3" data-testid="citricos-creditos-fotos">
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
          {CREDITOS_FOTOS_CITRICOS.map((cr) => (
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
export default function CitricosScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('variedades');

  return (
    <ScreenShell title="Los cítricos" icon={Citrus} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="citricos-screen">
        {/* Portada breve del mundo */}
        <div className="rounded-2xl border border-amber-800/40 bg-[#241a0c]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-amber-200 leading-tight">
            <Citrus size={18} aria-hidden="true" className="shrink-0" />
            Los cítricos, del vivero a la fruta
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            Naranja, mandarina, limón y lima: el frutal de la casa en tierra caliente,
            contado por su ciclo — escoger la variedad e injertarla, saber si su clima
            les conviene, sembrarlas con drenaje, defenderlas de las plagas y del HLB
            sin veneno, y cosecharlas en el punto.
          </p>
        </div>

        {/* Navegación entre estaciones (legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones de los cítricos">
          {ESTACIONES_CITRICOS.map((e) => {
            const activo = estacion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`estacion-tab-${e.id}`}
                onClick={() => setEstacion(e.id)}
                className={`rounded-xl border px-2 py-2.5 text-center transition-colors min-h-[56px] ${
                  activo
                    ? 'citricos-estacion-activa border-amber-500/70 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 bg-[#241a0c]/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span className="block text-sm font-black leading-tight">{e.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-amber-200/90' : 'text-slate-500'}`}>
                  {e.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {estacion === 'variedades' && <EstacionVariedades />}
        {estacion === 'piso' && <EstacionPiso onNavigate={onNavigate} />}
        {estacion === 'siembra' && <EstacionSiembra onNavigate={onNavigate} />}
        {estacion === 'plagas' && <EstacionPlagas onNavigate={onNavigate} />}
        {estacion === 'cosecha' && <EstacionCosecha />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="citricos-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Puedo sembrar cítricos en mi finca? Le digo mi altura y clima.' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Citrus size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su finca da para cítricos?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su altura, su clima y su suelo.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

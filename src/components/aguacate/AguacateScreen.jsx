import React, { useState } from 'react';
import {
  Sprout, Trees, Bug, Leaf, Droplets, Sun, Flower2, Scissors,
  ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck,
  Mountain, FlaskConical, Info, Hourglass, Ban, Apple, HeartHandshake,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_AGUACATE,
  CICLO_AGUACATE,
  PISOS_TERMICOS,
  VARIEDADES_AGUACATE,
  INJERTO_AGUACATE,
  SIEMBRA_AGUACATE,
  SUELO_AGUA,
  ASOCIACION_AGUACATE,
  MALES_AGUACATE,
  MALES_FUENTE,
  BIOPREPARADOS_AGUACATE,
  NOTA_SIN_QUIMICOS,
  FLORACION_POLINIZACION,
  COSECHA_AGUACATE,
  CREDITOS_FOTOS_AGUACATE,
} from '../../data/aguacateFinca';
import './aguacate.css';

/**
 * AguacateScreen — mundo "El aguacate": la PROFUNDIZACIÓN dedicada del cultivo
 * bandera de alto valor (Hass y criollos de montaña). Sigue el patrón
 * PHOTO-FORWARD de CafeScreen/AguaScreen (NO inventa motor nuevo): fotos CC
 * reales con atribución, scrim fijo para legibilidad al sol, fallback a ícono y
 * micro-animaciones baratas en aguacate.css.
 *
 * Cinco estaciones (pestañas), el aguacate por su ciclo:
 *   1. Variedad y siembra — piso térmico, variedades por altura, injerto/patrón.
 *   2. Suelo y agua        — el drenaje contra la pudrición de raíz; asocio.
 *   3. Plagas y males      — reconocerlos y manejarlos SIN veneno (grafo).
 *   4. Flor y polinización — dicogamia tipo A/B + las abejas.
 *   5. Cosecha             — el punto de corte y la poscosecha.
 *
 * TODO groundeado en el grafo (species.persea_americana: pest_controllers,
 * compatible_with, antagonist_of, biopreparados) y perennialCycles (AGROSAVIA).
 * Las cifras que dependen del sitio (densidad, dosis, meses, % materia seca) NO
 * se inventan: son "dato en camino" (SlotPendiente) o se remiten al agente.
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

/* ── Foto real (licencia abierta) — patrón "photo-forward" de Café/Agua ─────
 * Wikimedia Commons + crédito visible + fallback a ícono si no carga. El scrim
 * oscuro es FIJO (no lo vira el remapeo de temas claros) para legibilidad. La
 * ruta sale del crédito (`src`), porque algunas fotos se reusan de /frutales. */
const fotoDe = (slug) => CREDITOS_FOTOS_AGUACATE.find((c) => c.slug === slug) || null;

function FotoAguacate({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Apple, children = null }) {
  const [ok, setOk] = useState(true);
  const foto = fotoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#1a2413] ${ratio} ${rounded}`}>
      {ok && foto ? (
        <img
          src={foto.src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="aguacate-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-lime-900/70" />
        </div>
      )}
      {/* scrim fijo para legibilidad del texto/crédito sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {foto?.autor && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {foto.autor}
        </span>
      )}
    </div>
  );
}

/** Pastilla del tipo floral (A/B) o "por confirmar" si el criollo no es firme. */
function ChipTipoFloral({ tipo, firme }) {
  if (!tipo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
        <Hourglass size={10} aria-hidden="true" /> Tipo floral por confirmar
      </span>
    );
  }
  return (
    <span
      data-testid={`tipo-floral-${tipo}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        tipo === 'A'
          ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
          : 'border-teal-500/50 bg-teal-500/15 text-teal-200'
      }`}
    >
      <Flower2 size={11} aria-hidden="true" /> Tipo {tipo}{firme ? '' : ' (aprox.)'}
    </span>
  );
}

/* ── ESTACIÓN 1 · Variedad y siembra ──────────────────────────────────── */
function EstacionSiembra() {
  const s = SIEMBRA_AGUACATE;
  return (
    <section className="aguacate-seccion space-y-4" data-testid="estacion-siembra">
      {/* Hero con foto real del árbol cargado */}
      <div className="rounded-2xl border border-lime-800/40 overflow-hidden bg-[#1a2413]/60">
        <FotoAguacate slug="arbol" alt="Árbol de aguacate cargado de fruta en la montaña" ratio="aspect-[16/9]" Fallback={Trees}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-lime-200">
              <Trees size={14} aria-hidden="true" /> El cultivo bandera de alto valor
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Escoja la variedad para su altura</h3>
          </div>
        </FotoAguacate>
      </div>

      <PedagogicalBlock
        icon={Mountain}
        lead="El aguacate se siembra por pisos: cada altura tiene su raza y sus variedades. El Hass es de montaña fría-moderada; los criollos y el papelillo bajan a clima medio y cálido."
        clave="La primera decisión es la variedad correcta para SU altura — sembrar Hass en tierra caliente, o un antillano en el frío, es perder el árbol."
      >
        <p>
          En Colombia se cultiva entre {CICLO_AGUACATE.altitud}. Da su
          primera cosecha a los {CICLO_AGUACATE.primeraCosechaAnios[0]}–{CICLO_AGUACATE.primeraCosechaAnios[1]} años
          (injertado) y vive productivo cerca de {CICLO_AGUACATE.vidaProductivaAnios} años:
          es una renta larga, así que vale la pena arrancar bien.
        </p>
      </PedagogicalBlock>

      {/* Pisos térmicos (las 3 razas por altura) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-2.5" data-testid="aguacate-pisos">
        <p className="flex items-center gap-2 text-sm font-black text-sky-200 uppercase tracking-wide">
          <Mountain size={16} aria-hidden="true" /> Cada altura, su aguacate
        </p>
        {PISOS_TERMICOS.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`piso-${p.id}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {p.franja}
              <span className="rounded-full bg-sky-500/15 border border-sky-600/40 px-2 py-0.5 text-[10px] font-bold text-sky-200">{p.altitud}</span>
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">{p.raza}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{p.detalle}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Rangos de referencia colombiana — AGROSAVIA / Universidad Nacional.</p>
      </div>

      {/* Variedades con su tipo floral */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-2.5" data-testid="aguacate-variedades">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <Apple size={16} aria-hidden="true" /> Variedades sembradas en Colombia
        </p>
        {VARIEDADES_AGUACATE.map((v) => (
          <div key={v.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`variedad-${v.id}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {v.nombre}
              <ChipTipoFloral tipo={v.tipoFloral} firme={v.tipoFloralFirme} />
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">{v.piso}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.detalle}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Fuente: AGROSAVIA. El tipo floral A/B se explica en la estación «Flor y polinización».</p>
      </div>

      {/* El injerto sobre patrón (foto reusada del mundo Frutales) */}
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#1a2413]/50" data-testid="aguacate-injerto">
        <FotoAguacate slug="injerto" alt="Injerto de yema sobre el patrón de un frutal" ratio="aspect-[16/8]" Fallback={Scissors}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> El injerto sobre patrón
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow">La raíz decide</h3>
          </div>
        </FotoAguacate>
        <div className="p-4 space-y-2.5">
          <p className="text-sm font-bold text-slate-100">{INJERTO_AGUACATE.metodo}</p>
          <p className="text-xs leading-snug text-slate-300">{INJERTO_AGUACATE.detalle}</p>
          <ul className="space-y-1.5">
            {INJERTO_AGUACATE.puntos.map((pt, i) => (
              <li key={i} className="flex gap-1.5 text-xs leading-snug text-slate-200">
                <span aria-hidden="true" className="text-emerald-400 shrink-0">•</span>{pt}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Siembra y distancias (densidad = dato en camino) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-2" data-testid="aguacate-siembra">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <Trees size={16} aria-hidden="true" /> Siembra y distancias
        </p>
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100">
          <span className="rounded-full bg-lime-500/15 border border-lime-600/40 px-2 py-0.5 text-[11px] font-bold text-lime-200">{s.distancia}</span>
        </p>
        <p className="text-xs leading-snug text-slate-300">{s.detalle}</p>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>
            La densidad exacta por hectárea cambia con la variedad y el patrón{' '}
            <SlotPendiente>densidad por variedad y sistema en camino</SlotPendiente>. Aquí no se inventa un número.
          </span>
        </p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Suelo y agua ────────────────────────────────────────── */
const ICONO_SUELO = { drenaje: Droplets, suelo: Mountain, agua: Droplets };

function EstacionSuelo({ onNavigate }) {
  const a = ASOCIACION_AGUACATE;
  return (
    <section className="aguacate-seccion space-y-4" data-testid="estacion-suelo">
      {/* Hero: las raíces — el corazón de la historia del aguacate */}
      <div className="rounded-2xl border border-sky-800/40 overflow-hidden bg-[#1a2413]/60">
        <FotoAguacate slug="raices" alt="Raíces de aguacate: la parte que hay que cuidar del encharcamiento" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-sky-200">
              <Droplets size={14} aria-hidden="true" /> Drenaje ante todo
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">El aguacate cuida su raíz</h3>
          </div>
        </FotoAguacate>
      </div>

      <PedagogicalBlock
        icon={Droplets}
        tone="alerta"
        lead="El enemigo número uno del aguacate vive en el suelo encharcado. Se muere más por exceso de agua que por falta."
        clave="Siembre SIEMPRE en alto (montículo o camellón) y en tierra que drene. Ese solo cuidado le evita la muerte más común del cultivo."
      />

      <div className="space-y-2.5" data-testid="aguacate-suelo-lista">
        {SUELO_AGUA.map((it) => {
          const Icono = ICONO_SUELO[it.icono] || Mountain;
          return (
            <div key={it.id} className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4" data-testid={`suelo-${it.id}`}>
              <p className="flex items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
                <Icono size={16} aria-hidden="true" className="shrink-0 text-sky-300" /> {it.titulo}
              </p>
              <p className="mt-1 text-xs leading-snug text-slate-300">{it.detalle}</p>
            </div>
          );
        })}
      </div>

      {/* Buenas vecinas (compatible_with del grafo) */}
      <div className="rounded-2xl border border-emerald-800/40 bg-[#1a2413]/50 p-4 space-y-2.5" data-testid="aguacate-compatibles">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Leaf size={16} aria-hidden="true" /> Con quién se lleva bien
        </p>
        {a.compatibles.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`compatible-${c.id}`}>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-bold text-slate-100 leading-tight">
              {c.nombre}
              <span className="text-[11px] italic font-normal text-slate-400">{c.cientifico}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-600/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200">{c.papel}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{c.detalle}</p>
          </div>
        ))}
        {/* Antagonista (antagonist_of del grafo) */}
        <div className="rounded-xl border border-rose-700/40 bg-rose-950/20 p-3" data-testid="aguacate-antagonista">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-rose-100 leading-tight">
            <Ban size={14} aria-hidden="true" className="shrink-0 text-rose-300" />
            {a.antagonista.nombre}
            <span className="text-[11px] italic font-normal text-rose-200/70">{a.antagonista.cientifico}</span>
          </p>
          <p className="mt-1 text-xs leading-snug text-rose-100/90">{a.antagonista.detalle}</p>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">Compatibilidades del catálogo Chagra.</p>
      </div>

      {/* Puente al cuaderno del suelo */}
      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="aguacate-ir-suelo"
          onClick={() => onNavigate('salud_suelo')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
            <Mountain size={18} className="text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Lea su análisis y corrija la tierra antes de sembrar.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 3 · Plagas y males ──────────────────────────────────────── */
function MalCard({ mal }) {
  return (
    <div
      className={`rounded-xl border p-3 space-y-2 ${mal.destacado ? 'border-rose-600/60 bg-rose-950/25' : 'border-slate-700/50 bg-slate-950/40'}`}
      data-testid={`mal-${mal.id}`}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
        {mal.destacado && <TriangleAlert size={14} aria-hidden="true" className="shrink-0 text-rose-300" />}
        {mal.nombre}
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
          mal.tipo === 'enfermedad' ? 'border-amber-500/50 bg-amber-500/10 text-amber-200' : 'border-rose-500/50 bg-rose-500/10 text-rose-200'
        }`}>
          {mal.tipo}
        </span>
      </p>
      <p className="text-xs leading-snug text-slate-300">
        <span className="font-bold text-rose-300">Se conoce por: </span>{mal.senal}
      </p>
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-1.5">
          <ShieldCheck size={12} aria-hidden="true" /> Manejo sin veneno
        </p>
        <div className="flex flex-wrap gap-1.5">
          {mal.biocontrol.map((b, i) => (
            <span key={i} className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] leading-snug text-emerald-100">
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EstacionSanidad({ onNavigate }) {
  return (
    <section className="aguacate-seccion space-y-4" data-testid="estacion-sanidad">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="El aguacate tiene un mal que manda sobre todos: la pudrición de la raíz. Lo demás —antracnosis, barrenadores, mosca, ácaros, escamas— se maneja reconociéndolo a tiempo."
        clave="A todos se les gana con manejo, no con más veneno: drenaje y siembra en alto, material sano, recoger la fruta caída, control biológico y biopreparados."
      />

      <div className="space-y-2.5" data-testid="aguacate-males">
        {MALES_AGUACATE.map((mal) => <MalCard key={mal.id} mal={mal} />)}
      </div>
      <p className="text-[10px] leading-snug text-slate-500" data-testid="aguacate-males-fuente">Fuente: {MALES_FUENTE}</p>

      {/* Biopreparados groundeados de la especie */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4" data-testid="aguacate-biopreparados">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-2">
          <FlaskConical size={12} aria-hidden="true" /> Biopreparados de apoyo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BIOPREPARADOS_AGUACATE.map((b, i) => (
            <span key={i} className="rounded-full border border-slate-600/50 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-200">{b}</span>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-500">Biopreparados del catálogo Chagra. Son apoyo, no reemplazan el manejo cultural.</p>
      </div>

      {/* Guard anti-receta */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="aguacate-nota-sin-quimicos">
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
            data-testid="aguacate-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Caldo bordelés, Trichoderma y más, con su receta.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="aguacate-ir-sanidad"
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

/* ── ESTACIÓN 4 · Flor y polinización ─────────────────────────────────── */
function EstacionFlor({ onNavigate }) {
  const f = FLORACION_POLINIZACION;
  return (
    <section className="aguacate-seccion space-y-4" data-testid="estacion-flor">
      <div className="rounded-2xl border border-violet-800/30 overflow-hidden bg-[#1a2413]/60">
        <FotoAguacate slug="flor" alt="Flores del aguacate: cada una abre dos veces, hembra y luego macho" ratio="aspect-[16/10]" Fallback={Flower2}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-violet-100">
              <Flower2 size={14} aria-hidden="true" /> La flor que abre dos veces
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Tipo A y tipo B</h3>
          </div>
        </FotoAguacate>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{f.resumen}</p>

      {/* Los dos tipos florales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="aguacate-tipos-florales">
        {f.tipos.map((t) => (
          <div
            key={t.id}
            data-testid={`tipo-floral-card-${t.id}`}
            className={`rounded-2xl border p-4 ${t.id === 'A' ? 'border-violet-600/50 bg-violet-950/20' : 'border-teal-600/50 bg-teal-950/20'}`}
          >
            <p className={`flex items-center gap-2 text-sm font-black ${t.id === 'A' ? 'text-violet-200' : 'text-teal-200'}`}>
              <Flower2 size={16} aria-hidden="true" /> {t.nombre}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-slate-200">{t.horario}</p>
            <p className="mt-1.5 text-[11px] font-bold text-slate-300">{t.ejemplo}</p>
          </div>
        ))}
      </div>

      {/* Por qué mezclarlos */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-2" data-testid="aguacate-flor-claves">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide">Por qué conviene mezclar A y B</p>
        <ul className="space-y-2">
          {f.claves.map((c, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <HeartHandshake size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-violet-300" />{c}
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>{f.tipoCriolloNota} <SlotPendiente>tipo floral del criollo, a observar en campo</SlotPendiente></span>
        </p>
      </div>

      {/* Las abejas → enlace al mundo de abejas */}
      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/15 p-4 space-y-2" data-testid="aguacate-abejas">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Sun size={16} aria-hidden="true" /> Las abejas hacen la cosecha
        </p>
        <p className="text-xs leading-snug text-amber-100/90">{f.abejas}</p>
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="aguacate-ir-abejas"
            onClick={() => onNavigate('animales_abejas')}
            className="w-full flex items-center gap-3 rounded-xl border border-amber-700/50 bg-amber-900/20 p-3 text-left active:bg-amber-900/40 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/20 grid place-items-center">
              <Sun size={18} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Abejas y polinización</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Colmenas y una finca amiga de los polinizadores.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="text-[10px] leading-snug text-slate-500">Fuente: {f.fuente}.</p>
    </section>
  );
}

/* ── ESTACIÓN 5 · Cosecha y poscosecha ────────────────────────────────── */
function EstacionCosecha() {
  const c = COSECHA_AGUACATE;
  return (
    <section className="aguacate-seccion space-y-4" data-testid="estacion-cosecha">
      <div className="rounded-2xl border border-orange-800/30 overflow-hidden bg-[#1a2413]/60">
        <FotoAguacate slug="cosecha" alt="Aguacates hechos en la rama, listos para cortar con cabito" ratio="aspect-[16/9]" Fallback={Apple}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-orange-100">
              <Apple size={14} aria-hidden="true" /> El punto de corte
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Se coge duro, madura en casa</h3>
          </div>
        </FotoAguacate>
      </div>

      {/* Datos del ciclo (grounded del grafo) */}
      <div className="grid grid-cols-2 gap-2" data-testid="aguacate-cosecha-datos">
        <div className="rounded-xl border border-orange-700/40 bg-slate-950/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-300 mb-0.5">Primera cosecha</p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{CICLO_AGUACATE.primeraCosechaAnios[0]}–{CICLO_AGUACATE.primeraCosechaAnios[1]} años</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Injertado</p>
        </div>
        <div className="rounded-xl border border-orange-700/40 bg-slate-950/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-300 mb-0.5">Vida productiva</p>
          <p className="text-sm font-bold text-slate-100 leading-tight">~{CICLO_AGUACATE.vidaProductivaAnios} años</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Renta larga</p>
        </div>
      </div>

      {/* El punto */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-2" data-testid="aguacate-punto">
        <p className="flex items-center gap-2 text-sm font-black text-orange-200 uppercase tracking-wide">
          <Apple size={16} aria-hidden="true" /> El punto de corte
        </p>
        <p className="text-xs leading-snug text-slate-200">{c.punto}</p>
        <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3">
          <p className="text-xs leading-snug text-slate-300">{c.materiaSeca.concepto}</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
            <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
            <span>El porcentaje mínimo de materia seca depende de la variedad y del mercado{' '}
              <SlotPendiente>% mínimo de materia seca por variedad/mercado</SlotPendiente>.
            </span>
          </p>
        </div>
      </div>

      {/* El corte */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-2" data-testid="aguacate-corte">
        <p className="flex items-center gap-2 text-sm font-black text-teal-200 uppercase tracking-wide">
          <Scissors size={16} aria-hidden="true" /> Cómo cortarlo
        </p>
        <ul className="space-y-2">
          {c.corte.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Scissors size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-teal-300" />{p}
            </li>
          ))}
        </ul>
      </div>

      {/* Maduración */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2413]/50 p-4 space-y-1.5" data-testid="aguacate-maduracion">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Sun size={16} aria-hidden="true" /> Madurarlo en casa
        </p>
        <p className="text-xs leading-snug text-slate-200">{c.maduracion}</p>
      </div>

      {/* Nota de calendario (régimen unknown en el grafo → dato en camino) */}
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400" data-testid="aguacate-calendario-nota">
        <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>
          {CICLO_AGUACATE.regionNota}{' '}
          <SlotPendiente>meses de floración y cosecha por localidad</SlotPendiente> Fuente: {c.fuente}.
        </span>
      </p>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_AGUACATE.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#1a2413]/50 p-3" data-testid="aguacate-creditos-fotos">
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
          {CREDITOS_FOTOS_AGUACATE.map((cr) => (
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
export default function AguacateScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('siembra');

  return (
    <ScreenShell title="El aguacate" icon={Apple} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="aguacate-screen">
        {/* Portada breve del mundo */}
        <div className="rounded-2xl border border-lime-800/40 bg-[#1a2413]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-lime-200 leading-tight">
            <Apple size={18} aria-hidden="true" className="shrink-0" />
            El aguacate, del injerto a la mesa
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            El cultivo bandera de alto valor de la montaña (Hass y criollos), contado por
            su ciclo: escoger la variedad para su altura, injertar sobre buen patrón,
            drenar el suelo contra la pudrición de raíz, entender su floración tipo A/B,
            manejar las plagas sin veneno y coger la fruta en su punto.
          </p>
        </div>

        {/* Navegación entre estaciones (2×… legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones del aguacate">
          {ESTACIONES_AGUACATE.map((e) => {
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
                    ? 'aguacate-estacion-activa border-lime-500/70 bg-lime-500/15 text-lime-100'
                    : 'border-slate-700 bg-[#1a2413]/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span className="block text-sm font-black leading-tight">{e.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-lime-200/90' : 'text-slate-500'}`}>
                  {e.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {estacion === 'siembra' && <EstacionSiembra />}
        {estacion === 'suelo' && <EstacionSuelo onNavigate={onNavigate} />}
        {estacion === 'sanidad' && <EstacionSanidad onNavigate={onNavigate} />}
        {estacion === 'flor' && <EstacionFlor onNavigate={onNavigate} />}
        {estacion === 'cosecha' && <EstacionCosecha />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="aguacate-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo manejo mi aguacate: piso térmico, la pudrición de raíz y el punto de cosecha?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-lime-500/15 grid place-items-center">
              <Apple size={20} className="text-lime-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su aguacate es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su altura.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

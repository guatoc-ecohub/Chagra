import React, { useState } from 'react';
import {
  Coffee, Bean, Sprout, Trees, Bug, Leaf, Droplets, Sun, Flower2,
  Recycle, ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck,
  Mountain, Scissors, FlaskConical, CalendarDays, Info, Hourglass,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import LaminaCafeto from './LaminaCafeto';
import {
  ESTACIONES_CAFE,
  VARIEDADES_CAFE,
  PASOS_ALMACIGO,
  SOMBRA_ASOCIACION,
  SUELO_CAFE,
  MALES_CAFE,
  NOTA_SIN_RECETAS_QUIMICAS,
  CICLO_FLOR_COSECHA,
  RECOLECCION_SELECTIVA,
  PASOS_BENEFICIO,
  BENEFICIO_FUENTE,
  PULPA_ABONO,
  FOTO_BASE_CAFE,
  CREDITOS_FOTOS_CAFE,
} from '../../data/cafeFinca';
import './cafe.css';

/**
 * CafeScreen — mundo "El café": el cultivo bandera del campesino colombiano,
 * contado por su ciclo, con vida y fotos reales (patrón photo-forward de
 * AguaScreen/CompostScreen — NO se inventa motor nuevo).
 *
 * Cinco estaciones (pestañas), el ciclo cafetero de principio a fin:
 *   1. Variedad y siembra — escoger variedad (roya) + almácigo/siembra.
 *   2. Sombra y suelo      — con quién vive (guamo, plátano…) y qué come.
 *   3. Broca y roya        — reconocerlas y manejarlas SIN recetas químicas.
 *   4. Flor y cosecha      — ciclo bimodal + recolección selectiva.
 *   5. El beneficio        — despulpado→fermentación→lavado→secado + pulpa→abono.
 *
 * TODO groundeado en el catálogo/grafo (species.coffea_arabica: ciclo bimodal,
 * pest_controllers, compatible_with, biopreparados) y en Cenicafé/FNC. Las
 * cifras que dependen del sitio (densidad, dosis) NO se inventan: son "dato en
 * camino" (SlotPendiente) o se remiten al análisis de suelo / al agente.
 *
 * 2ª PASADA VISUAL (byte-neutral, sin fotos nuevas): hero de portada con foto
 * real + vapor SVG (firma del mundo), Ken Burns de una pasada en los heros,
 * entradas escalonadas por estación, timeline en pasos ordenados, tarjetas con
 * hover/focus vivos y borde-código de roya. Todo GPU-friendly
 * (transform/opacity) y apagado con prefers-reduced-motion (cafe.css).
 */

/** Chip honesto para cifras aún sin grounding (mismo criterio que Agua). */
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

/* ── Fotos reales (licencia abierta) — patrón "photo-forward" de Agua ──────
 * Foto de Wikimedia Commons + crédito visible + fallback a ícono si no carga.
 * El scrim oscuro es FIJO (no lo vira el remapeo de temas claros) para que el
 * texto encima quede legible al sol. */
const creditoDe = (slug) => CREDITOS_FOTOS_CAFE.find((c) => c.slug === slug)?.autor || '';

function FotoCafe({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Coffee, kenburns = false, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#2a1c12] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_CAFE}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className={`${kenburns ? 'cafe-foto--kenburns' : 'cafe-foto'} absolute inset-0 w-full h-full object-cover`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-amber-900/70" />
        </div>
      )}
      {/* scrim fijo para legibilidad del texto/crédito sobre cualquier foto */}
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

/** Vapor de café (firma del mundo): tres hilos SVG que suben en loop sobre
 * el hero de portada. Decorativo, solo transform/opacity, se apaga con
 * prefers-reduced-motion (cafe.css). */
function VaporCafe() {
  return (
    <svg
      viewBox="0 0 34 40"
      fill="none"
      aria-hidden="true"
      className="absolute top-2.5 right-3.5 w-8 h-10 text-white/55 pointer-events-none"
    >
      <path className="cafe-vapor" d="M9 34c-3-4 3-7 0-11s2-7 0-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="cafe-vapor cafe-vapor--2" d="M17 36c-3-4 3-7 0-11s2-7 0-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="cafe-vapor cafe-vapor--3" d="M25 34c-3-4 3-7 0-11s2-7 0-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Pastilla de resistencia a la roya (verde = resistente, ámbar = susceptible). */
function ChipRoya({ estado }) {
  const resistente = estado === 'resistente';
  return (
    <span
      data-testid={`roya-${estado}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        resistente
          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
          : 'border-amber-500/50 bg-amber-500/15 text-amber-200'
      }`}
    >
      {resistente ? <ShieldCheck size={11} aria-hidden="true" /> : <TriangleAlert size={11} aria-hidden="true" />}
      {resistente ? 'Resiste roya' : 'Susceptible a roya'}
    </span>
  );
}

/* ── ESTACIÓN 1 · Variedad y siembra ──────────────────────────────────── */
function EstacionSiembra() {
  return (
    <section className="cafe-seccion space-y-4" data-testid="estacion-siembra">
      {/* Hero con foto real del cafetal */}
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241811]/60">
        <FotoCafe slug="cafetal" alt="Cafetal con árboles de sombra en la montaña colombiana" ratio="aspect-[16/9]" kenburns Fallback={Coffee}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Coffee size={14} aria-hidden="true" /> El cultivo bandera
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">Todo empieza por escoger bien la mata</h3>
          </div>
        </FotoCafe>
      </div>

      {/* Lámina propia (SVG de cuaderno de campo): la mata de café entera, con
          sus partes rotuladas, antes de contar el ciclo. */}
      <figure className="rounded-2xl border border-amber-900/40 bg-[#efe3c6] p-2 shadow-inner" data-testid="cafe-lamina">
        <LaminaCafeto />
        <figcaption className="mt-1 px-1 text-center text-[11px] font-semibold italic text-amber-900/80">
          La mata de café por dentro y por fuera — conózcala antes de sembrarla.
        </figcaption>
      </figure>

      <PedagogicalBlock
        icon={Bean}
        lead="La primera decisión del cafetal es la variedad — y con la roya rondando, esa decisión pesa por 20 años."
        clave="Si va a sembrar o renovar, arranque por una variedad resistente a la roya: es la defensa más barata y segura que existe."
      >
        <p>
          En Colombia se siembra café arábigo (<em>Coffea arabica</em>), entre los
          1200 y 2200 metros. Unas variedades son viejas y de buena taza pero
          indefensas ante la roya; otras, sacadas por Cenicafé, ya vienen con la
          defensa puesta. Escoja sabiendo cuál es cuál.
        </p>
      </PedagogicalBlock>

      {/* Variedades con su comportamiento frente a la roya */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241811]/50 p-4 space-y-2.5" data-testid="cafe-variedades">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Coffee size={16} aria-hidden="true" /> Las variedades y la roya
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        {VARIEDADES_CAFE.map((v) => (
          <div
            key={v.id}
            className={`cafe-card rounded-xl border border-slate-700/50 border-l-2 ${
              v.roya === 'resistente' ? 'border-l-emerald-500/60' : 'border-l-amber-500/60'
            } bg-slate-950/40 p-3`}
            data-testid={`variedad-${v.id}`}
          >
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {v.nombre}
              <ChipRoya estado={v.roya} />
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">porte {v.porte}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.nota}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">Fuente: Cenicafé / Federación Nacional de Cafeteros.</p>
      </div>

      {/* Del germinador al lote (foto del almácigo + pasos en orden) */}
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#241811]/50">
        <FotoCafe slug="almacigo" alt="Almácigo de café: chapolas y plántulas en bolsa en el vivero" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> El almácigo
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">De la chapola a la mata de cruz</h3>
          </div>
        </FotoCafe>
        <div className="p-4">
          <ol className="space-y-3">
            {PASOS_ALMACIGO.map((paso, i) => (
              <li key={paso.id} className="cafe-paso cafe-paso--verde flex gap-3" data-testid={`almacigo-${paso.id}`}>
                <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black grid place-items-center">
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
              La distancia y la densidad de siembra (matas por hectárea) cambian con la
              variedad y con el sistema (a libre exposición o bajo sombra){' '}
              <SlotPendiente>densidad por variedad y sistema en camino</SlotPendiente>. Tiempos del
              almácigo: de referencia (Cenicafé), varían con el clima.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Sombra y suelo ──────────────────────────────────────── */
function EstacionSombra({ onNavigate }) {
  return (
    <section className="cafe-seccion space-y-4" data-testid="estacion-sombra">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#241811]/60">
        <FotoCafe slug="cafetal" alt="Café bajo la sombra de guamos y plátano" ratio="aspect-[16/9]" kenburns Fallback={Trees}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <Trees size={14} aria-hidden="true" /> Buenas vecinas
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">El café no vive solo</h3>
          </div>
        </FotoCafe>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        El café de montaña se lleva bien con árboles que le dan sombra y, de paso,
        le abonan el suelo. La sombra regula el calor, guarda humedad y baja el
        golpe de la roya; las leguminosas, además, fijan nitrógeno gratis.
      </p>

      {/* Árboles de sombra/asociación (grounded: compatible_with del grafo) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241811]/50 p-4 space-y-2.5" data-testid="cafe-sombra">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Leaf size={16} aria-hidden="true" /> Con quién sembrar el café
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-transparent" />
        </p>
        {SOMBRA_ASOCIACION.map((a) => (
          <div key={a.id} className="cafe-card rounded-xl border border-slate-700/50 border-l-2 border-l-emerald-500/50 bg-slate-950/40 p-3" data-testid={`sombra-${a.id}`}>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-bold text-slate-100 leading-tight">
              {a.nombre}
              <span className="text-[11px] italic font-normal text-slate-400">{a.cientifico}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-600/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200">{a.papel}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{a.detalle}</p>
          </div>
        ))}
        <p className="text-[10px] leading-snug text-slate-500">
          Asociaciones del catálogo Chagra (compatibles con el café) — Cenicafé / AGROSAVIA.
        </p>
      </div>

      {/* Qué pide el café del suelo */}
      <div className="rounded-2xl border border-amber-800/40 bg-[#241811]/50 p-4 space-y-3" data-testid="cafe-suelo">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Mountain size={16} aria-hidden="true" /> Qué come el café
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        <ul className="space-y-3">
          {SUELO_CAFE.map((s) => (
            <li key={s.id} className="flex gap-3" data-testid={`suelo-${s.id}`}>
              <Sprout size={18} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{s.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{s.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <FlaskConical size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>
            Las dosis de abono y cal dependen del análisis de su lote{' '}
            <SlotPendiente>dosis según análisis de suelo</SlotPendiente>: no hay una receta
            única. Aquí no se inventan kilos por mata.
          </span>
        </p>
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="cafe-ir-suelo"
            onClick={() => onNavigate('salud_suelo')}
            className="cafe-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
              <Mountain size={18} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Lea su análisis y corrija la acidez antes de abonar.</span>
            </span>
            <ChevronRight size={18} className="cafe-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

/* ── ESTACIÓN 3 · Broca y roya ────────────────────────────────────────── */
const ICONO_MAL = { broca: Bug, roya: Leaf };

function MalCard({ mal }) {
  const Icono = ICONO_MAL[mal.id] || Bug;
  return (
    <article className="rounded-2xl border border-rose-800/40 bg-[#241811]/50 overflow-hidden shadow-md shadow-black/30" data-testid={`mal-${mal.id}`}>
      <FotoCafe slug={mal.foto} alt={`${mal.nombre} (${mal.cientifico}) en el café`} ratio="aspect-[16/9]" kenburns Fallback={Icono}>
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-rose-200">
            <Icono size={14} aria-hidden="true" /> {mal.tipo}
          </p>
          <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">{mal.nombre}</h3>
          <p className="text-[11px] italic text-white/70 leading-tight">{mal.cientifico}</p>
        </div>
      </FotoCafe>

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
              <li key={i} className="cafe-card rounded-lg border border-slate-700/50 border-l-2 border-l-emerald-500/50 bg-slate-950/40 p-2.5">
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
    <section className="cafe-seccion space-y-4" data-testid="estacion-males">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="Dos males mandan en el cafetal: la broca (un cucarrón que pica el grano) y la roya (un hongo que quema la hoja)."
        clave="A las dos se les gana con manejo, no con más veneno: recolección a tiempo, variedad resistente, control biológico y biopreparados."
      >
        <p>
          Reconocerlas temprano es media pelea ganada. La broca ataca el grano y le
          baja el peso y la calidad; la roya ataca la hoja y, si defolia la mata,
          le baja la cosecha. Vea cómo se ven y cómo se manejan.
        </p>
      </PedagogicalBlock>

      {MALES_CAFE.map((mal) => <MalCard key={mal.id} mal={mal} />)}

      {/* Guard anti-receta: nada de dosis químicas inventadas */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="cafe-nota-sin-recetas">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{NOTA_SIN_RECETAS_QUIMICAS}</span>
        </p>
      </div>

      {/* Puentes a los mundos hermanos de sanidad */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="cafe-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="cafe-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Caldo bordelés, cola de caballo con ceniza y más, con su receta.</span>
            </span>
            <ChevronRight size={18} className="cafe-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="cafe-ir-sanidad"
            onClick={() => onNavigate('sanidad_sintoma')}
            className="cafe-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-rose-500/15 grid place-items-center">
              <Bug size={18} className="text-rose-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Mi mata está enferma</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Diga qué le ve y sepa qué es y cómo manejarla.</span>
            </span>
            <ChevronRight size={18} className="cafe-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── ESTACIÓN 4 · Flor y cosecha ──────────────────────────────────────── */
function EstacionCosecha() {
  const c = CICLO_FLOR_COSECHA;
  return (
    <section className="cafe-seccion space-y-4" data-testid="estacion-cosecha">
      <div className="rounded-2xl border border-pink-800/30 overflow-hidden bg-[#241811]/60">
        <FotoCafe slug="flor" alt="Flores blancas de café tras las lluvias" ratio="aspect-[16/9]" kenburns Fallback={Flower2}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-pink-100">
              <Flower2 size={14} aria-hidden="true" /> De la flor al grano
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">La lluvia manda la floración</h3>
          </div>
        </FotoCafe>
      </div>

      {/* Datos duros del ciclo (grounded del grafo) */}
      <div className="grid grid-cols-2 gap-2" data-testid="cafe-ciclo-datos">
        <div className="cafe-card rounded-xl border border-amber-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300 mb-1">
            <CalendarDays size={13} aria-hidden="true" /> Picos de cosecha
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{c.picosCosecha}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Régimen bimodal (dos cosechas al año)</p>
        </div>
        <div className="cafe-card rounded-xl border border-amber-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300 mb-1">
            <Mountain size={13} aria-hidden="true" /> Dónde y cuándo
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{c.altitud}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Primera cosecha: {c.primeraCosechaAnios[0]}–{c.primeraCosechaAnios[1]} años</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{c.disparador}</p>

      {/* Pasos del ciclo flor→cereza */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241811]/50 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide mb-3">
          El grano, mes a mes
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        <ol className="space-y-3">
          {c.pasos.map((paso, i) => (
            <li key={paso.id} className="cafe-paso flex gap-3" data-testid={`ciclo-${paso.id}`}>
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
        <p className="text-[10px] leading-snug text-slate-500 mt-3">Fuente: {c.fuente}.</p>
      </div>

      {/* Recolección selectiva (foto de cerezas + por qué) */}
      <div className="rounded-2xl border border-red-800/40 overflow-hidden bg-[#241811]/50" data-testid="cafe-recoleccion">
        <FotoCafe slug="cereza" alt="Cerezas de café rojas y maduras en la rama, listas para la recolección selectiva" ratio="aspect-[16/9]" Fallback={Scissors}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-red-200">
              <Scissors size={14} aria-hidden="true" /> Recolección selectiva
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">{RECOLECCION_SELECTIVA.titulo}</h3>
          </div>
        </FotoCafe>
        <div className="p-4">
          <ul className="space-y-2">
            {RECOLECCION_SELECTIVA.puntos.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
                <Bean size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-red-300" />{p}
              </li>
            ))}
          </ul>
          <p className="text-[10px] leading-snug text-slate-500 mt-3">Fuente: {RECOLECCION_SELECTIVA.fuente}.</p>
        </div>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 5 · El beneficio ────────────────────────────────────────── */
const ICONO_BENEFICIO = { despulpado: Coffee, fermentacion: Hourglass, lavado: Droplets, secado: Sun };

function EstacionBeneficio({ onNavigate }) {
  return (
    <section className="cafe-seccion space-y-4" data-testid="estacion-beneficio">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241811]/60">
        <FotoCafe slug="secado" alt="Café pergamino secándose al sol en la marquesina" ratio="aspect-[16/9]" kenburns Fallback={Sun}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Coffee size={14} aria-hidden="true" /> El beneficio
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">Del grano rojo al café seco</h3>
          </div>
        </FotoCafe>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        Beneficiar es lo que convierte la cereza en café guardable. En Colombia se
        hace por la vía húmeda (café lavado), y cada paso tiene su punto: apurarse
        o descuidarse en cualquiera daña la taza de todo el año.
      </p>

      {/* Los 4 pasos del beneficio húmedo, en orden */}
      <ol className="space-y-3" data-testid="cafe-beneficio-pasos">
        {PASOS_BENEFICIO.map((paso, i) => {
          const Icono = ICONO_BENEFICIO[paso.icono] || Coffee;
          return (
            <li key={paso.id} className="cafe-card rounded-2xl border border-slate-700/60 bg-[#241811]/50 p-4" data-testid={`beneficio-${paso.id}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 grid place-items-center relative">
                  <Icono size={18} className="text-amber-300" />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 ring-2 ring-[#241811] text-[11px] font-black text-[#241811] grid place-items-center">{i + 1}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{paso.titulo}</p>
                  <p className="text-xs leading-snug text-slate-300 mt-1">{paso.detalle}</p>
                  {paso.cuidado && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-200/90">
                      <TriangleAlert size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />
                      {paso.cuidado}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400" data-testid="cafe-beneficio-fuente">
        <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>{BENEFICIO_FUENTE}</span>
      </p>

      {/* Cierre del ciclo: la pulpa como abono → enlace al mundo del compost */}
      <div className="rounded-2xl border border-lime-800/40 overflow-hidden bg-lime-950/20" data-testid="cafe-pulpa-abono">
        <FotoCafe slug="pulpa" alt="Pulpa de café amontonada para compostar" ratio="aspect-[16/9]" Fallback={Recycle}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-lime-200">
              <Recycle size={14} aria-hidden="true" /> Cerrar el ciclo
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">{PULPA_ABONO.titulo}</h3>
          </div>
        </FotoCafe>
        <div className="p-4 space-y-3">
          <p className="text-xs leading-snug text-slate-200">{PULPA_ABONO.resumen}</p>
          <ul className="space-y-2">
            {PULPA_ABONO.puntos.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
                <Leaf size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-400" />{p}
              </li>
            ))}
          </ul>
          <p className="text-[10px] leading-snug text-slate-500">Fuente: {PULPA_ABONO.fuente}.</p>
          {typeof onNavigate === 'function' && (
            <button
              type="button"
              data-testid="cafe-ir-compost"
              onClick={() => onNavigate(PULPA_ABONO.enlaceMundo)}
              className="cafe-cta w-full flex items-center gap-3 rounded-xl border border-lime-700/50 bg-lime-900/20 p-3 text-left active:bg-lime-900/40"
            >
              <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/20 grid place-items-center">
                <Recycle size={18} className="text-lime-300" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-100 leading-tight">{PULPA_ABONO.enlaceLabel}</span>
                <span className="block text-xs text-slate-400 leading-tight mt-0.5">Vaya al mundo «Del corral al abono»: compostaje y lombricultura.</span>
              </span>
              <ChevronRight size={18} className="cafe-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Agua). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_CAFE.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#241811]/50 p-3" data-testid="cafe-creditos-fotos">
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
          {CREDITOS_FOTOS_CAFE.map((cr) => (
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
export default function CafeScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('siembra');

  return (
    <ScreenShell title="El café" icon={Coffee} onBack={onBack}>
      <div className="cafe-mundo max-w-2xl mx-auto p-4 space-y-4" data-testid="cafe-screen">
        {/* Portada del mundo: hero con foto real (cerezas maduras) + vapor. */}
        <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241811]/60 shadow-lg shadow-black/40">
          <FotoCafe
            slug="cereza"
            alt="Cerezas de café rojas y maduras en la rama"
            ratio="aspect-[16/10]"
            kenburns
            Fallback={Coffee}
          >
            <VaporCafe />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="cafe-hero-linea flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                <Coffee size={14} aria-hidden="true" /> El ciclo cafetero
              </p>
              <h2 className="cafe-hero-linea cafe-hero-linea--2 mt-0.5 text-2xl font-black text-white leading-tight drop-shadow [text-wrap:balance]">
                El café, de la semilla a la taza
              </h2>
              <p className="cafe-hero-linea cafe-hero-linea--3 mt-1.5 text-xs italic leading-snug text-white/85 drop-shadow-sm">
                El cultivo bandera del campesino colombiano, contado por su ciclo: escoger
                la variedad, criar la mata, defenderla de la broca y la roya, cosechar el
                grano maduro y beneficiarlo — hasta devolverle al suelo la pulpa hecha abono.
              </p>
            </div>
          </FotoCafe>
        </div>

        {/* Navegación entre estaciones (2×3, legible al sol). El numeral marca
            el orden real del ciclo cafetero: siembra → sombra → sanidad →
            cosecha → beneficio. */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones del café">
          {ESTACIONES_CAFE.map((e, i) => {
            const activo = estacion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                id={`tab-cafe-${e.id}`}
                aria-controls="panel-cafe-estacion"
                aria-selected={activo}
                data-testid={`estacion-tab-${e.id}`}
                onClick={() => setEstacion(e.id)}
                className={`cafe-tab relative rounded-xl border px-2 pt-2.5 pb-3 text-center min-h-[56px] ${
                  activo
                    ? 'cafe-estacion-activa border-amber-500/70 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-100'
                    : 'border-slate-700 bg-[#241811]/50 text-slate-300 active:bg-slate-800/70'
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
                    className="cafe-tab-indicador absolute bottom-1 left-1/2 -ml-3 w-6 h-0.5 rounded-full bg-amber-400/90"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id="panel-cafe-estacion" aria-labelledby={`tab-cafe-${estacion}`}>
          {estacion === 'siembra' && <EstacionSiembra />}
          {estacion === 'sombra' && <EstacionSombra onNavigate={onNavigate} />}
          {estacion === 'males' && <EstacionMales onNavigate={onNavigate} />}
          {estacion === 'cosecha' && <EstacionCosecha />}
          {estacion === 'beneficio' && <EstacionBeneficio onNavigate={onNavigate} />}
        </div>

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="cafe-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo manejo la roya y la broca en mi cafetal sin veneno?' })}
            className="cafe-cta w-full flex items-center gap-3 rounded-2xl border border-amber-800/40 bg-gradient-to-r from-amber-950/40 to-slate-900/40 p-3.5 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Coffee size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su cafetal es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su altura.</span>
            </span>
            <ChevronRight size={18} className="cafe-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

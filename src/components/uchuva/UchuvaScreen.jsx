import React, { useState } from 'react';
import {
  Grape, Sprout, Bug, Leaf, Droplets, Sun, Flower2, Snowflake, Thermometer,
  Mountain, Scissors, FlaskConical, CalendarDays, Info, Hourglass, Package,
  MoveVertical, ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  UCHUVA_ESPECIE,
  ESTACIONES_UCHUVA,
  CLIMA_UCHUVA,
  CONTRASTE_PISO,
  MATA_UCHUVA,
  PASOS_SIEMBRA,
  TUTORADO_POR_QUE,
  SISTEMAS_TUTORADO,
  PODA_UCHUVA,
  MALES_UCHUVA,
  NOTA_FUSARIUM_GRAFO,
  NOTA_SIN_RECETAS_QUIMICAS,
  CICLO_COSECHA,
  PUNTO_COSECHA,
  POSCOSECHA_UCHUVA,
  FOTO_BASE_UCHUVA,
  CREDITOS_FOTOS_UCHUVA,
} from '../../data/uchuvaFinca';
import './uchuva.css';

/**
 * UchuvaScreen — mundo "La uchuva" (Physalis peruviana L.): la fruta andina de
 * exportación, contada por su ciclo, con vida y fotos reales (patrón
 * photo-forward de CafeScreen/FrutalesScreen — NO se inventa motor nuevo).
 *
 * A diferencia del mango o los cítricos (tierra caliente/templada), la uchuva
 * es de CLIMA FRÍO de altura (óptimo 1.800–2.800 msnm) — buen contraste
 * didáctico para fincas de altura como las de Choachí.
 *
 * Seis estaciones (pestañas), el ciclo de la uchuva de principio a fin:
 *   1. Clima y altura   — por qué es de tierra fría + la mata y el capacho.
 *   2. Semilla y siembra— del semillero al lote (drenaje, sol, variedad).
 *   3. Tutorado y poda  — párela y despéjela para que no se enferme.
 *   4. Plagas y males   — pulgón, polilla, minador y Fusarium, sin veneno.
 *   5. Cosecha y capacho— el punto por el color del capacho (NTC 4580).
 *   6. Poscosecha       — la fruta de exportación: selección, capacho, frío.
 *
 * TODO groundeado en el grafo (species.physalis_peruviana: pest edges →
 * AFFECTS, antagonist_of) y en cycle-content Tier A (AGROSAVIA / ICA / POWO /
 * GBIF). Las cifras que dependen del sitio (distancia, dosis, grado de color
 * por destino) NO se inventan: son "dato en camino" (SlotPendiente) o se
 * remiten al agente.
 */

/** Chip honesto para cifras aún sin grounding (mismo criterio que Café/Agua). */
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
 * El scrim oscuro es FIJO para que el texto encima quede legible al sol. */
const creditoDe = (slug) => CREDITOS_FOTOS_UCHUVA.find((c) => c.slug === slug)?.autor || '';

function FotoUchuva({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Grape, kenburns = false, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#221a38] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_UCHUVA}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className={`${kenburns ? 'uchuva-foto--kenburns' : 'uchuva-foto'} absolute inset-0 w-full h-full object-cover`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-indigo-900/70" />
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

/** El capacho (firma del mundo): una farolita SVG que se mece sobre el hero de
 * portada. Decorativa, solo transform/opacity, se apaga con
 * prefers-reduced-motion (uchuva.css). */
function CapachoGlyph() {
  return (
    <svg
      viewBox="0 0 40 44"
      fill="none"
      aria-hidden="true"
      className="uchuva-capacho-glyph absolute top-2.5 right-3.5 w-9 h-10 text-amber-200/80 pointer-events-none"
    >
      <path d="M20 5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* farol/capacho */}
      <path
        d="M20 11c7 0 12 5 12 13 0 7-5 13-12 13S8 31 8 24c0-8 5-13 12-13Z"
        stroke="currentColor"
        strokeWidth="2"
        className="uchuva-capacho-cuerpo"
      />
      <path d="M20 11v26M12 15c2 8 2 15 0 22M28 15c-2 8-2 15 0 22" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      {/* brillo interno de la baya */}
      <circle cx="20" cy="26" r="4.5" fill="currentColor" opacity="0.35" className="uchuva-capacho-baya" />
    </svg>
  );
}

/** Pastilla de piso térmico (frío = índigo; contraste con caliente). */
function ChipFrio() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/50 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-200">
      <Snowflake size={11} aria-hidden="true" /> Tierra fría
    </span>
  );
}

/* ── ESTACIÓN 1 · Clima y altura ──────────────────────────────────────── */
function EstacionClima() {
  const c = CLIMA_UCHUVA;
  const datos = [
    { icon: Mountain, label: 'Altura óptima', valor: c.altitud, hint: c.altitudRango },
    { icon: Thermometer, label: 'Temperatura', valor: c.temperatura, hint: c.helada },
    { icon: Sun, label: 'Luz', valor: c.sol, hint: 'A pleno sol da mejor color y sabor.' },
    { icon: Droplets, label: 'Suelo/agua', valor: c.drenaje, hint: 'El encharcamiento la enferma (Fusarium).' },
  ];
  return (
    <section className="uchuva-seccion space-y-4" data-testid="estacion-clima">
      <div className="rounded-2xl border border-indigo-800/40 overflow-hidden bg-[#221a38]/60">
        <FotoUchuva slug="cultivo" alt="Cultivo de uchuva (Physalis peruviana) en campo abierto de clima frío" ratio="aspect-[16/9]" kenburns Fallback={Mountain}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-200">
              <Snowflake size={14} aria-hidden="true" /> Fruta de altura
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">La uchuva es andina y le gusta el frío</h3>
          </div>
        </FotoUchuva>
      </div>

      <PedagogicalBlock
        icon={Snowflake}
        lead="La uchuva no es de tierra caliente: es una planta andina que da su mejor fruta en el frío de altura."
        clave="Si su finca es alta y fría —donde el mango o los cítricos no cuajan—, ese es justo el clima de la uchuva."
      >
        <p>
          La uchuva (<em>{UCHUVA_ESPECIE.cientifico}</em>, también «guchuva» o «uvilla»)
          se da mejor entre los 1.800 y 2.800 metros, con temperaturas frescas de
          13 a 18 °C. Es {UCHUVA_ESPECIE.familia.toLowerCase()}.
        </p>
      </PedagogicalBlock>

      {/* Datos duros del clima (grounded del cycle-content Tier A) */}
      <div className="grid grid-cols-2 gap-2" data-testid="uchuva-clima-datos">
        {datos.map((d) => {
          const Icono = d.icon;
          return (
            <div key={d.label} className="uchuva-card rounded-xl border border-indigo-700/40 bg-slate-950/40 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-indigo-300 mb-1">
                <Icono size={13} aria-hidden="true" /> {d.label}
              </p>
              <p className="text-sm font-bold text-slate-100 leading-tight">{d.valor}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{d.hint}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">Fuente: {c.fuente}.</p>

      {/* Contraste didáctico: uchuva (frío) vs. mango/cítricos (caliente) */}
      <div className="rounded-2xl border border-indigo-800/40 bg-[#221a38]/50 p-4 space-y-2.5" data-testid="uchuva-contraste">
        <p className="flex items-center gap-2 text-sm font-black text-indigo-200 uppercase tracking-wide">
          <ChipFrio /> {CONTRASTE_PISO.titulo}
        </p>
        <ul className="space-y-2">
          {CONTRASTE_PISO.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Mountain size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-indigo-300" />{p}
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {CONTRASTE_PISO.fuente}.</p>
      </div>

      {/* La mata y el capacho */}
      <div className="rounded-2xl border border-amber-800/30 overflow-hidden bg-[#221a38]/50" data-testid="uchuva-mata">
        <FotoUchuva slug="flor" alt="Flor de la uchuva: amarilla con centro morado" ratio="aspect-[16/9]" Fallback={Flower2}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Flower2 size={14} aria-hidden="true" /> La flor y la mata
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">De flor amarilla a farolito de papel</h3>
          </div>
        </FotoUchuva>
        <div className="p-4">
          <ul className="space-y-3">
            {MATA_UCHUVA.map((m) => (
              <li key={m.id} className="flex gap-3" data-testid={`mata-${m.id}`}>
                <Grape size={18} aria-hidden="true" className="shrink-0 text-amber-400 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{m.titulo}</p>
                  <p className="text-xs leading-snug text-slate-300 mt-0.5">{m.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Semilla y siembra ───────────────────────────────────── */
function EstacionSiembra() {
  return (
    <section className="uchuva-seccion space-y-4" data-testid="estacion-siembra">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#221a38]/60">
        <FotoUchuva slug="siembra" alt="Plántula de uchuva recién trasplantada al suelo" ratio="aspect-[16/9]" kenburns Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> Del semillero al lote
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">Empieza por semilla sana</h3>
          </div>
        </FotoUchuva>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-[#221a38]/50 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide mb-3">
          Paso a paso de la siembra
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-transparent" />
        </p>
        <ol className="space-y-3">
          {PASOS_SIEMBRA.map((paso, i) => (
            <li key={paso.id} className="uchuva-paso uchuva-paso--verde flex gap-3" data-testid={`siembra-${paso.id}`}>
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
            La distancia entre matas cambia con el sistema de tutorado y la fertilidad del
            lote{' '}
            <SlotPendiente>distancia por sistema de tutorado en camino</SlotPendiente>. Aquí
            no se inventa un número de matas por hectárea.
          </span>
        </p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 3 · Tutorado y poda ─────────────────────────────────────── */
function EstacionTutorado() {
  return (
    <section className="uchuva-seccion space-y-4" data-testid="estacion-tutorado">
      <div className="rounded-2xl border border-lime-800/40 overflow-hidden bg-[#221a38]/60">
        <FotoUchuva slug="planta" alt="Mata de uchuva crecida, con ramas cargadas que piden tutor" ratio="aspect-[16/9]" kenburns Fallback={MoveVertical}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-lime-200">
              <MoveVertical size={14} aria-hidden="true" /> Párela y despéjela
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">{TUTORADO_POR_QUE.titulo}</h3>
          </div>
        </FotoUchuva>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-[#221a38]/50 p-4 space-y-2.5">
        <ul className="space-y-2">
          {TUTORADO_POR_QUE.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <MoveVertical size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-400" />{p}
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {TUTORADO_POR_QUE.fuente}.</p>
      </div>

      {/* Sistemas de tutorado */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#221a38]/50 p-4 space-y-2.5" data-testid="uchuva-sistemas-tutorado">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <MoveVertical size={16} aria-hidden="true" /> Cómo se para la mata
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-lime-500/40 to-transparent" />
        </p>
        {SISTEMAS_TUTORADO.map((s) => (
          <div key={s.id} className="uchuva-card rounded-xl border border-slate-700/50 border-l-2 border-l-lime-500/50 bg-slate-950/40 p-3" data-testid={`tutorado-${s.id}`}>
            <p className="text-sm font-bold text-slate-100 leading-tight">{s.nombre}</p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{s.detalle}</p>
          </div>
        ))}
      </div>

      {/* Poda */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#221a38]/50 p-4 space-y-2.5" data-testid="uchuva-poda">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Scissors size={16} aria-hidden="true" /> La poda
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-transparent" />
        </p>
        <ul className="space-y-3">
          {PODA_UCHUVA.map((p) => (
            <li key={p.id} className="flex gap-3" data-testid={`poda-${p.id}`}>
              <Scissors size={18} aria-hidden="true" className="shrink-0 text-emerald-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{p.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{p.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 4 · Plagas y males ──────────────────────────────────────── */
const ICONO_MAL = { pulgon: Bug, polilla: Bug, minador: Bug, fusarium: Leaf };

function MalCard({ mal }) {
  const Icono = ICONO_MAL[mal.id] || Bug;
  return (
    <article className="rounded-2xl border border-rose-800/40 bg-[#221a38]/50 overflow-hidden shadow-md shadow-black/30" data-testid={`mal-${mal.id}`}>
      {/* Encabezado por ícono (sin foto: economía de bytes; foto reservada a los heros) */}
      <div className="flex items-start gap-3 p-4 pb-3 border-b border-rose-900/30 bg-gradient-to-r from-rose-950/30 to-transparent">
        <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/15 grid place-items-center">
          <Icono size={20} className="text-rose-300" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-200">{mal.tipo}</p>
          <h3 className="text-lg font-black text-white leading-tight [text-wrap:balance]">{mal.nombre}</h3>
          <p className="text-[11px] italic text-white/60 leading-tight">{mal.cientifico}</p>
        </div>
      </div>

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
              <li key={i} className="uchuva-card rounded-lg border border-slate-700/50 border-l-2 border-l-emerald-500/50 bg-slate-950/40 p-2.5">
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
    <section className="uchuva-seccion space-y-4" data-testid="estacion-males">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="A la uchuva la molestan chupadores (pulgón), perforadores (polilla, minador) y, sobre todo, un hongo del suelo: la marchitez por Fusarium."
        clave="A todos se les gana con manejo, no con más veneno: drenaje, tutorado, control biológico, Bt y limpieza."
      >
        <p>
          Reconocerlas temprano es media pelea ganada. El pulgón y la polilla le pegan a
          la parte de arriba; el Fusarium ataca por la raíz y es el que más lotes tumba.
          Vea cómo se ven y cómo se manejan sin envenenar la fruta.
        </p>
      </PedagogicalBlock>

      {MALES_UCHUVA.map((mal) => <MalCard key={mal.id} mal={mal} />)}

      {/* Nota de trazabilidad de la etiqueta del grafo para el Fusarium */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-3" data-testid="uchuva-nota-fusarium">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-300">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-400" />
          <span>{NOTA_FUSARIUM_GRAFO}</span>
        </p>
      </div>

      {/* Guard anti-receta: nada de dosis químicas inventadas */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="uchuva-nota-sin-recetas">
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
            data-testid="uchuva-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="uchuva-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Purín de ortiga, Bt, caldos y más, con su receta.</span>
            </span>
            <ChevronRight size={18} className="uchuva-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="uchuva-ir-sanidad"
            onClick={() => onNavigate('sanidad_sintoma')}
            className="uchuva-cta w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-rose-500/15 grid place-items-center">
              <Bug size={18} className="text-rose-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Mi mata está enferma</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Diga qué le ve y sepa qué es y cómo manejarla.</span>
            </span>
            <ChevronRight size={18} className="uchuva-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── ESTACIÓN 5 · Cosecha y capacho ───────────────────────────────────── */
function EstacionCosecha() {
  const c = CICLO_COSECHA;
  return (
    <section className="uchuva-seccion space-y-4" data-testid="estacion-cosecha">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#221a38]/60">
        <FotoUchuva slug="capacho" alt="Capacho verde de uchuva colgando de la rama, envolviendo la fruta" ratio="aspect-[16/9]" kenburns Fallback={Grape}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
              <Grape size={14} aria-hidden="true" /> El punto por el color
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">{PUNTO_COSECHA.titulo}</h3>
          </div>
        </FotoUchuva>
      </div>

      {/* Datos duros del ciclo (grounded del cycle-content Tier A) */}
      <div className="grid grid-cols-2 gap-2" data-testid="uchuva-ciclo-datos">
        <div className="uchuva-card rounded-xl border border-amber-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300 mb-1">
            <CalendarDays size={13} aria-hidden="true" /> Primera cosecha
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{c.aPrimeraCosecha}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{c.duracion}</p>
        </div>
        <div className="uchuva-card rounded-xl border border-amber-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300 mb-1">
            <Grape size={13} aria-hidden="true" /> Rendimiento
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{c.rendimiento}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{c.frecuencia}</p>
        </div>
      </div>

      {/* Escala de color del capacho (verde → naranja) */}
      <div className="rounded-2xl border border-amber-800/40 bg-[#221a38]/50 p-4 space-y-3" data-testid="uchuva-punto-color">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Grape size={16} aria-hidden="true" /> El color manda
          <span aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        </p>
        <div className="uchuva-escala-color h-3 rounded-full" aria-hidden="true" />
        <div className="flex justify-between text-[10px] font-bold text-slate-400">
          <span>Verde (espere)</span>
          <span>Pajizo</span>
          <span>Naranja (punto)</span>
        </div>
        <ul className="space-y-2">
          {PUNTO_COSECHA.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Grape size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />{p}
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>
            El grado de color exacto lo pone el destino (mercado nacional vs. exportación) y
            el comprador{' '}
            <SlotPendiente>grado NTC 4580 según destino</SlotPendiente>.
          </span>
        </p>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {PUNTO_COSECHA.fuente}.</p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 6 · Poscosecha y exportación ────────────────────────────── */
const ICONO_POST = { seleccion: ShieldCheck, capacho: Package, frio: Droplets };

function EstacionPoscosecha({ onNavigate }) {
  const p = POSCOSECHA_UCHUVA;
  return (
    <section className="uchuva-seccion space-y-4" data-testid="estacion-poscosecha">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#221a38]/60">
        <FotoUchuva slug="poscosecha" alt="Capachos de uchuva secándose, listos para el acopio" ratio="aspect-[16/9]" kenburns Fallback={Package}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Package size={14} aria-hidden="true" /> Fruta de exportación
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow [text-wrap:balance]">La joya de la fruta colombiana</h3>
          </div>
        </FotoUchuva>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{p.intro}</p>

      {/* Los 3 pasos de la poscosecha */}
      <ol className="space-y-3" data-testid="uchuva-poscosecha-pasos">
        {p.pasos.map((paso, i) => {
          const Icono = ICONO_POST[paso.icono] || Package;
          return (
            <li key={paso.id} className="uchuva-card rounded-2xl border border-slate-700/60 bg-[#221a38]/50 p-4" data-testid={`poscosecha-${paso.id}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 grid place-items-center relative">
                  <Icono size={18} className="text-amber-300" />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 ring-2 ring-[#221a38] text-[11px] font-black text-[#221a38] grid place-items-center">{i + 1}</span>
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

      <p className="text-[10px] leading-snug text-slate-500" data-testid="uchuva-poscosecha-fuente">Fuente: {p.fuente}.</p>

      {/* Puente al mundo de poscosecha/despensa */}
      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="uchuva-ir-poscosecha"
          onClick={() => onNavigate(p.enlaceMundo)}
          className="uchuva-cta w-full flex items-center gap-3 rounded-xl border border-amber-700/50 bg-amber-900/20 p-3 text-left active:bg-amber-900/40"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/20 grid place-items-center">
            <Package size={18} className="text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">{p.enlaceLabel}</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Vaya al mundo de poscosecha y despensa.</span>
          </span>
          <ChevronRight size={18} className="uchuva-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_UCHUVA.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#221a38]/50 p-3" data-testid="uchuva-creditos-fotos">
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
          {CREDITOS_FOTOS_UCHUVA.map((cr) => (
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
export default function UchuvaScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('clima');

  return (
    <ScreenShell title="La uchuva" icon={Grape} onBack={onBack}>
      <div className="uchuva-mundo max-w-2xl mx-auto p-4 space-y-4" data-testid="uchuva-screen">
        {/* Portada del mundo: hero con foto real (capacho maduro) + glifo capacho. */}
        <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#221a38]/60 shadow-lg shadow-black/40">
          <FotoUchuva
            slug="cosecha"
            alt="Capacho maduro de uchuva, anaranjado, colgando de la mata"
            ratio="aspect-[16/10]"
            kenburns
            Fallback={Grape}
          >
            <CapachoGlyph />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="uchuva-hero-linea flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                <Grape size={14} aria-hidden="true" /> El ciclo de la uchuva
              </p>
              <h2 className="uchuva-hero-linea uchuva-hero-linea--2 mt-0.5 text-2xl font-black text-white leading-tight drop-shadow [text-wrap:balance]">
                La uchuva, la fruta andina de exportación
              </h2>
              <p className="uchuva-hero-linea uchuva-hero-linea--3 mt-1.5 text-xs italic leading-snug text-white/85 drop-shadow-sm">
                La joya de la fruta colombiana, de tierra fría de altura, contada por su ciclo:
                por qué pide frío, cómo se siembra y tutora, cómo se defiende sin veneno,
                y cómo se cosecha en su punto —leyendo el color del capacho— hasta llegar
                al mundo con su farolito de papel.
              </p>
            </div>
          </FotoUchuva>
        </div>

        {/* Navegación entre estaciones. El numeral marca el orden del ciclo:
            clima → siembra → tutorado → sanidad → cosecha → poscosecha. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="tablist" aria-label="Estaciones de la uchuva">
          {ESTACIONES_UCHUVA.map((e, i) => {
            const activo = estacion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                id={`tab-uchuva-${e.id}`}
                aria-controls="panel-uchuva-estacion"
                aria-selected={activo}
                data-testid={`estacion-tab-${e.id}`}
                onClick={() => setEstacion(e.id)}
                className={`uchuva-tab relative rounded-xl border px-2 pt-2.5 pb-3 text-center min-h-[56px] ${
                  activo
                    ? 'uchuva-estacion-activa border-amber-500/70 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-100'
                    : 'border-slate-700 bg-[#221a38]/50 text-slate-300 active:bg-slate-800/70'
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
                    className="uchuva-tab-indicador absolute bottom-1 left-1/2 -ml-3 w-6 h-0.5 rounded-full bg-amber-400/90"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id="panel-uchuva-estacion" aria-labelledby={`tab-uchuva-${estacion}`}>
          {estacion === 'clima' && <EstacionClima />}
          {estacion === 'siembra' && <EstacionSiembra />}
          {estacion === 'tutorado' && <EstacionTutorado />}
          {estacion === 'males' && <EstacionMales onNavigate={onNavigate} />}
          {estacion === 'cosecha' && <EstacionCosecha />}
          {estacion === 'poscosecha' && <EstacionPoscosecha onNavigate={onNavigate} />}
        </div>

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="uchuva-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo manejo la uchuva en mi finca de tierra fría, del tutorado a la cosecha?' })}
            className="uchuva-cta w-full flex items-center gap-3 rounded-2xl border border-amber-800/40 bg-gradient-to-r from-amber-950/40 to-slate-900/40 p-3.5 text-left active:bg-slate-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Grape size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su lote de uchuva es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su altura.</span>
            </span>
            <ChevronRight size={18} className="uchuva-cta-flecha shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

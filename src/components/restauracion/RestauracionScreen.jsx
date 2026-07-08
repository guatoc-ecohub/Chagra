import React, { useState } from 'react';
import {
  Trees, TreeDeciduous, Sprout, Leaf, Layers, Recycle, ChevronRight, Camera,
  ExternalLink, Info, Hourglass, ShieldCheck, Mountain, Bug,
  ArrowUpNarrowWide, Shovel, FlaskConical, Flower2, TriangleAlert, Bird,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  FOTOS_RESTAURACION,
  CREDITOS_FOTOS_RESTAURACION,
  ESTACIONES_RESTAURACION,
  BOSQUE_INTRO,
  BOSQUE_VS_MONO,
  ESTRATOS,
  SUCESION_INTRO,
  SUCESION_ETAPAS,
  SUELO_HERIDO,
  SUELO_METODO,
  SUELO_NOTA_SIN_CIFRAS,
  ESPECIES_RESTAURACION,
  NOTA_GROUNDING,
} from '../../data/restauracionFinca';
import './restauracion.css';

/**
 * RestauracionScreen — mundo "Restauración y bosque de alimentos".
 *
 * COMPLEMENTA el mundo "Diseño de la finca" (reforestación/silvopastoreo/páramo)
 * con el enfoque del BOSQUE DE ALIMENTOS: los 7 estratos, la sucesión ecológica
 * y la restauración del suelo — el MÉTODO — sembrados con especies REALES.
 *
 * Patrón photo-forward de AguaScreen/CafeScreen/CompostScreen (NO motor nuevo).
 * Cinco estaciones (pestañas):
 *   1. El bosque de alimentos — qué es e imita al monte (vs monocultivo).
 *   2. Los 7 estratos         — los pisos de plantas, con especies groundeadas.
 *   3. Sucesión               — de pioneras fijadoras a bosque de clímax.
 *   4. Restaurar el suelo     — del suelo herido a la tierra viva.
 *   5. Con qué sembrar        — especies multipropósito del catálogo, con papel.
 *
 * GROUNDING RESPONSABLE (memoria feedback-restauracion-grounding-fabrica-
 * especies): toda especie es un id real de public/grafo-relations.json — el test
 * de grounding lo verifica. Nada de especies inventadas; sin dato = "dato en
 * camino".
 */

/** Chip honesto para lo que aún no tiene grounding (mismo criterio que Café). */
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

/** Pastilla "Nativa" — resalta el criterio de restauración con especies propias. */
function ChipNativo() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-200">
      <ShieldCheck size={11} aria-hidden="true" /> Nativa
    </span>
  );
}

/* ── Foto reusada (photo-forward, 0 KB de aporte) ──────────────────────────
 * Toma una clave de FOTOS_RESTAURACION → su `src` público ya existente. Scrim
 * fijo para legibilidad al sol; fallback a ícono si no carga; crédito visible. */
function FotoRest({ nombre, alt, ratio = 'aspect-[16/9]', rounded = '', Fallback = Trees, children = null }) {
  const [ok, setOk] = useState(true);
  const foto = FOTOS_RESTAURACION[nombre];
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#14231a] ${ratio} ${rounded}`}>
      {ok && foto ? (
        <img
          src={foto.src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="rest-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-emerald-900/70" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {ok && foto?.autor && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {foto.autor}
        </span>
      )}
    </div>
  );
}

/** Lista de especies groundeadas (nombre común + científico + badge nativa). */
function ListaEspecies({ especies, testidPrefix }) {
  return (
    <ul className="flex flex-wrap gap-1.5" data-testid={`${testidPrefix}-especies`}>
      {especies.map((e) => (
        <li
          key={e.id}
          data-testid={`especie-${e.id}`}
          data-species-id={e.id}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/40 px-2 py-1"
        >
          <span className="text-xs font-bold text-slate-100 leading-tight">{e.comun}</span>
          <span className="text-[10px] italic text-slate-400 leading-tight">{e.cientifico}</span>
          {e.nativo && <ChipNativo />}
        </li>
      ))}
    </ul>
  );
}

/* ── ESTACIÓN 1 · El bosque de alimentos ──────────────────────────────── */
function EstacionBosque({ onNavigate }) {
  return (
    <section className="rest-seccion space-y-4" data-testid="estacion-bosque">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#16261c]/60">
        <FotoRest nombre="agroforestal" alt="Sistema agroforestal: varios pisos de árboles y cultivos juntos" ratio="aspect-[16/9]" Fallback={Trees}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Trees size={14} aria-hidden="true" /> Una huerta que imita al monte
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">El bosque de alimentos</h3>
          </div>
        </FotoRest>
      </div>

      <PedagogicalBlock icon={Trees} lead={BOSQUE_INTRO.lead} clave={BOSQUE_INTRO.clave}>
        <p>{BOSQUE_INTRO.cuerpo}</p>
      </PedagogicalBlock>

      {/* Bosque de alimentos vs monocultivo (comparación honesta) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#16261c]/50 p-4 space-y-2.5" data-testid="rest-vs-mono">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Layers size={16} aria-hidden="true" /> Por qué en pisos y no en fila
        </p>
        {BOSQUE_VS_MONO.map((r) => (
          <div key={r.id} className="grid grid-cols-2 gap-2" data-testid={`vs-${r.id}`}>
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/25 p-2.5">
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-300 mb-1">
                <Sprout size={12} aria-hidden="true" /> Bosque de alimentos
              </p>
              <p className="text-xs leading-snug text-slate-200">{r.bosque}</p>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2.5">
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
                <TriangleAlert size={12} aria-hidden="true" /> Un solo cultivo
              </p>
              <p className="text-xs leading-snug text-slate-400">{r.mono}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Puente al mundo hermano de diseño (asociaciones), sin duplicarlo */}
      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="rest-ir-asociaciones"
          onClick={() => onNavigate('asociaciones')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
            <Flower2 size={18} className="text-emerald-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Buenas vecinas</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Qué cultivos se ayudan sembrados juntos, en el mundo del diseño de la finca.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 2 · Los 7 estratos ──────────────────────────────────────── */
const ICONO_ESTRATO = {
  dosel: Trees,
  arboles_bajos: TreeDeciduous,
  arbustos: Leaf,
  herbaceas: Sprout,
  cobertura: Recycle,
  raices: Shovel,
  trepadoras: ArrowUpNarrowWide,
};

function EstratoCard({ estrato }) {
  const Icono = ICONO_ESTRATO[estrato.id] || Leaf;
  return (
    <article className="rounded-2xl border border-emerald-800/40 bg-[#16261c]/50 overflow-hidden" data-testid={`estrato-${estrato.id}`}>
      {estrato.foto ? (
        <FotoRest nombre={estrato.foto} alt={`${estrato.titulo}: ${estrato.subtitulo}`} ratio="aspect-[16/9]" Fallback={Icono}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Icono size={14} aria-hidden="true" /> Estrato {estrato.n}
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow">{estrato.titulo}</h3>
            <p className="text-[11px] text-white/75 leading-tight">{estrato.subtitulo}</p>
          </div>
        </FotoRest>
      ) : (
        <div className="p-4 pb-0">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
            <Icono size={16} aria-hidden="true" /> Estrato {estrato.n}
          </p>
          <h3 className="text-lg font-black text-slate-100 leading-tight">{estrato.titulo}</h3>
          <p className="text-[11px] text-slate-400 leading-tight">{estrato.subtitulo}</p>
        </div>
      )}
      <div className="p-4 space-y-2.5">
        <p className="text-xs leading-snug text-slate-300">{estrato.papel}</p>
        <ListaEspecies especies={estrato.especies} testidPrefix={`estrato-${estrato.id}`} />
      </div>
    </article>
  );
}

function EstacionEstratos() {
  return (
    <section className="rest-seccion space-y-4" data-testid="estacion-estratos">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#16261c]/60">
        <FotoRest nombre="cafetal" alt="Varios pisos de vegetación: árboles altos, arbustos y suelo cubierto" ratio="aspect-[16/9]" Fallback={Layers}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Layers size={14} aria-hidden="true" /> Un piso sobre otro
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Los 7 estratos del bosque</h3>
          </div>
        </FotoRest>
      </div>

      <PedagogicalBlock
        icon={Layers}
        lead="El bosque de alimentos se siembra en 7 pisos: cada uno aprovecha una altura de luz y un espacio de raíz distinto, sin estorbarse."
        clave="Del árbol grande a la raíz bajo tierra: mientras más pisos llenos, más comida por metro y menos suelo desperdiciado."
      >
        <p>
          Piense en el monte: hay árboles altos, otros medianos debajo, arbustos,
          matas de tallo blando, rastreras que tapan el piso, raíces que trabajan
          bajo tierra y bejucos que suben por los troncos. Estos son los estratos.
          Sembrando en todos, la finca se llena de vida y de cosecha.
        </p>
      </PedagogicalBlock>

      {ESTRATOS.map((e) => <EstratoCard key={e.id} estrato={e} />)}

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
        <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>
          Las especies de cada piso salen del catálogo Chagra. La distancia entre
          matas y cuántas por piso dependen de su clima y su terreno{' '}
          <SlotPendiente>distancias según el predio</SlotPendiente> — eso no se inventa.
        </span>
      </p>
    </section>
  );
}

/* ── ESTACIÓN 3 · Sucesión ecológica ──────────────────────────────────── */
const ICONO_ETAPA = { pioneras: Sprout, climax: TreeDeciduous };

function EstacionSucesion() {
  return (
    <section className="rest-seccion space-y-4" data-testid="estacion-sucesion">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#16261c]/60">
        <FotoRest nombre="nodulos" alt="Nódulos en la raíz de una leguminosa: donde se fija el nitrógeno" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Recycle size={14} aria-hidden="true" /> El monte se arma por etapas
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Sucesión ecológica</h3>
          </div>
        </FotoRest>
      </div>

      <PedagogicalBlock icon={Recycle} lead={SUCESION_INTRO.lead} clave={SUCESION_INTRO.clave} />

      {SUCESION_ETAPAS.map((etapa, i) => {
        const Icono = ICONO_ETAPA[etapa.id] || Sprout;
        return (
          <div key={etapa.id} className="rounded-2xl border border-slate-700/60 bg-[#16261c]/50 p-4 space-y-3" data-testid={`sucesion-${etapa.id}`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 grid place-items-center relative">
                <Icono size={18} className="text-emerald-300" />
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-[11px] font-black text-[#14231a] grid place-items-center">{i + 1}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-100 leading-tight">{etapa.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-1">{etapa.detalle}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {etapa.especies.map((e) => (
                <div key={e.id} data-testid={`especie-${e.id}`} data-species-id={e.id} className="rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-bold text-slate-100 leading-tight">
                    {e.comun}
                    <span className="text-[10px] italic font-normal text-slate-400">{e.cientifico}</span>
                    {e.nativo && <ChipNativo />}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-emerald-300/90 leading-snug">{e.rol}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ── ESTACIÓN 4 · Restaurar el suelo ──────────────────────────────────── */
const ICONO_METODO = { tapar: Leaf, materia: Recycle, vida: Bug, nitrogeno: Sprout };

function EstacionSuelo({ onNavigate }) {
  return (
    <section className="rest-seccion space-y-4" data-testid="estacion-suelo">
      {/* El suelo herido (el problema) */}
      <div className="grid grid-cols-2 gap-2" data-testid="rest-suelo-herido">
        {SUELO_HERIDO.map((h) => (
          <div key={h.id} className="rounded-xl border border-rose-800/40 overflow-hidden bg-[#16261c]/50" data-testid={`herido-${h.id}`}>
            <FotoRest nombre={h.foto} alt={h.titulo} ratio="aspect-[4/3]" Fallback={Mountain}>
              <div className="absolute inset-0 flex flex-col justify-end p-2.5">
                <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-rose-200">
                  <TriangleAlert size={12} aria-hidden="true" /> {h.titulo}
                </p>
              </div>
            </FotoRest>
            <p className="p-2.5 text-[11px] leading-snug text-slate-300">{h.detalle}</p>
          </div>
        ))}
      </div>

      <PedagogicalBlock
        icon={Sprout}
        lead="Un suelo herido no se cura con bolsa: se cura devolviéndole cobertura, materia orgánica y vida. La restauración es de abajo hacia arriba."
        clave="Suelo tapado + materia orgánica + vida del suelo + fijadoras de nitrógeno = tierra que se vuelve a hacer sola."
      />

      {/* El método, paso a paso */}
      <ol className="space-y-3" data-testid="rest-suelo-metodo">
        {SUELO_METODO.map((m, i) => {
          const Icono = ICONO_METODO[m.id] || Leaf;
          return (
            <li key={m.id} className="rounded-2xl border border-slate-700/60 bg-[#16261c]/50 p-4" data-testid={`metodo-${m.id}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 grid place-items-center relative">
                  <Icono size={18} className="text-emerald-300" />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-[11px] font-black text-[#14231a] grid place-items-center">{i + 1}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{m.titulo}</p>
                  <p className="text-xs leading-snug text-slate-300 mt-1">{m.detalle}</p>
                  {m.fotos && (
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                      {m.fotos.map((f) => (
                        <FotoRest key={f} nombre={f} alt={f} ratio="aspect-square" rounded="rounded-lg" Fallback={FlaskConical} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Guard anti-cifras inventadas */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="rest-suelo-nota">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{SUELO_NOTA_SIN_CIFRAS}</span>
        </p>
      </div>

      {/* Puentes a los mundos hermanos (suelo vivo, abono) */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="rest-ir-suelo"
            onClick={() => onNavigate('salud_suelo')}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
              <Mountain size={18} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Lea su análisis y sepa qué corregir antes de sembrar.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="rest-ir-compost"
            onClick={() => onNavigate('compost')}
            className="w-full flex items-center gap-3 rounded-xl border border-lime-700/50 bg-lime-900/20 p-3 text-left active:bg-lime-900/40 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/20 grid place-items-center">
              <Recycle size={18} className="text-lime-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">El compost, paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">La materia orgánica que le devuelve la vida al suelo.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── ESTACIÓN 5 · Con qué sembrar (especies groundeadas) ──────────────── */
function EspecieCard({ especie }) {
  return (
    <article
      className="rounded-2xl border border-slate-700/60 bg-[#16261c]/50 p-3.5"
      data-testid={`especie-${especie.id}`}
      data-species-id={especie.id}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-bold text-slate-100 leading-tight">
        {especie.comun}
        <span className="text-[11px] italic font-normal text-slate-400">{especie.cientifico}</span>
        {especie.nativo && <ChipNativo />}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {especie.papeles.map((p) => (
          <span key={p} className="rounded-full bg-emerald-500/15 border border-emerald-600/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            {p}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-snug text-slate-300">{especie.nota}</p>
    </article>
  );
}

function EstacionEspecies({ onNavigate }) {
  return (
    <section className="rest-seccion space-y-4" data-testid="estacion-especies">
      <PedagogicalBlock
        icon={TreeDeciduous}
        lead="Estas son especies del catálogo Chagra para restaurar y armar bosque de alimentos, con su papel de verdad: fijar nitrógeno, dar sombra, madera, fruto o tapar el suelo."
        clave="Para restaurar, primero las nativas: son las que pertenecen a este monte y las que la fauna reconoce."
      >
        <p>
          Muchas son leguminosas que fijan nitrógeno (abono del aire) y otras
          acumulan minerales o hacen sombra. Se combinan por estratos y por
          etapas de sucesión — no todas de una.
        </p>
      </PedagogicalBlock>

      <div className="grid grid-cols-1 gap-2.5" data-testid="rest-especies-lista">
        {ESPECIES_RESTAURACION.map((e) => <EspecieCard key={e.id} especie={e} />)}
      </div>

      {/* Guard anti-fabricación de especies */}
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-3" data-testid="rest-nota-grounding">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-emerald-100">
          <ShieldCheck size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-emerald-300" />
          <span>{NOTA_GROUNDING}</span>
        </p>
      </div>

      {/* Puentes a los mundos hermanos de diseño/monte */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="rest-ir-reforestacion"
            onClick={() => onNavigate('seguimiento_reforestacion')}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <Trees size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Lleve la restauración a un proyecto</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Registre y siga su reforestación con árboles nativos.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="rest-ir-biodiversidad"
            onClick={() => onNavigate('biodiversidad')}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-teal-500/15 grid place-items-center">
              <Bird size={18} className="text-teal-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">El monte de la finca</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Las plantas y animales silvestres que la restauración trae de vuelta.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_RESTAURACION.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#16261c]/50 p-3" data-testid="rest-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 text-left"
      >
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta, reusadas de otros mundos)</span>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_RESTAURACION.map((cr) => (
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
export default function RestauracionScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('bosque');

  return (
    <ScreenShell title="Restauración y bosque de alimentos" icon={Trees} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="restauracion-screen">
        {/* Portada breve del mundo */}
        <div className="rounded-2xl border border-emerald-800/40 bg-[#16261c]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200 leading-tight">
            <Trees size={18} aria-hidden="true" className="shrink-0" />
            Sembrar un monte que da de comer
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            Restaurar el suelo herido y armar un bosque de alimentos: muchos pisos
            de plantas útiles, la sucesión de pioneras a bosque maduro, y la tierra
            que se vuelve a hacer sola — todo con especies del catálogo.
          </p>
        </div>

        {/* Navegación entre estaciones (2×3 → 5 en fila, legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Secciones de la restauración">
          {ESTACIONES_RESTAURACION.map((e) => {
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
                    ? 'rest-estacion-activa border-emerald-500/70 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-700 bg-[#16261c]/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span className="block text-sm font-black leading-tight">{e.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-emerald-200/90' : 'text-slate-500'}`}>
                  {e.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {estacion === 'bosque' && <EstacionBosque onNavigate={onNavigate} />}
        {estacion === 'estratos' && <EstacionEstratos />}
        {estacion === 'sucesion' && <EstacionSucesion />}
        {estacion === 'suelo' && <EstacionSuelo onNavigate={onNavigate} />}
        {estacion === 'especies' && <EstacionEspecies onNavigate={onNavigate} />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="rest-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo armo un bosque de alimentos para restaurar un lote degradado en mi finca?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 grid place-items-center">
              <Trees size={20} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su terreno es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su clima, su altura y qué especies le sirven.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

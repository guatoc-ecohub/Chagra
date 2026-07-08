import React, { useState } from 'react';
import {
  Wheat, Sprout, Mountain, Droplets, Sun, Bug, Leaf, ShieldCheck, TriangleAlert,
  ChevronRight, Camera, ExternalLink, Info, Hourglass, FlaskConical, Scissors,
  HeartPulse, Sparkles, CalendarDays,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_QUINUA,
  GRANOS_ANDINOS,
  INTRO_GRANOS,
  SIEMBRA_GRANOS,
  DESAPONIFICADO_QUINUA,
  DESAMARGADO_TARWI,
  SIN_DESAPONIFICAR,
  MALES_GRANOS,
  NOTA_SIN_RECETAS_QUIMICAS,
  COSECHA_TRILLA,
  VALOR_NUTRICIONAL,
  FOTO_BASE_QUINUA,
  CREDITOS_FOTOS_QUINUA,
} from '../../data/quinuaFinca';
import './quinua.css';

/**
 * QuinuaScreen — mundo "Quinua y granos andinos": recuperación de los granos
 * ancestrales de la montaña (quinua, amaranto/bledo, chía, cañihua y tarwi),
 * de alto valor nutricional y cultural. Contado por su ciclo, photo-forward, con
 * fotos reales — mismo patrón que CafeScreen/AguaScreen (NO se inventa motor).
 *
 * Cinco estaciones (pestañas):
 *   1. Los granos       — cuáles son, su piso térmico y qué alimentan.
 *   2. Siembra y piso   — época, altura alto-andina y distancias, por especie.
 *   3. Quitar el amargo — el DESAPONIFICADO de la quinua (lavar la saponina) +
 *                          el desamargado del tarwi; y los que NO se lavan.
 *   4. Mildiú y manejo  — reconocer el mildiú (Peronospora variabilis) y
 *                          manejarlo SIN recetas químicas.
 *   5. Cosecha y valor  — corte/secado/trilla + el valor nutricional (proteína
 *                          completa, sin gluten, hierro) groundeado en ICBF/FAO.
 *
 * TODO groundeado en el catálogo/grafo (fichas cycle-content + nutricion-humana
 * ICBF). Las cifras que dependen del sitio o que el ICBF aún no reporta NO se
 * inventan: son "dato en camino" (SlotPendiente).
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
 * El scrim oscuro es FIJO (no lo vira el remapeo de temas claros) para que el
 * texto encima quede legible al sol. */
const creditoDe = (slug) => CREDITOS_FOTOS_QUINUA.find((c) => c.slug === slug)?.autor || '';

function FotoQuinua({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Wheat, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#221d10] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_QUINUA}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="quinua-foto absolute inset-0 w-full h-full object-cover"
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

/** Pastilla de saponina: ámbar = hay que lavar, verde = no amarga. */
function ChipSaponina({ grano }) {
  if (grano.saponina) {
    return (
      <span
        data-testid={`saponina-${grano.id}`}
        className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200"
      >
        <Droplets size={11} aria-hidden="true" /> Se lava (saponina)
      </span>
    );
  }
  if (grano.amargo === 'alcaloides') {
    return (
      <span
        data-testid={`saponina-${grano.id}`}
        className="inline-flex items-center gap-1 rounded-full border border-orange-500/50 bg-orange-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-200"
      >
        <FlaskConical size={11} aria-hidden="true" /> Se desamarga
      </span>
    );
  }
  return (
    <span
      data-testid={`saponina-${grano.id}`}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-200"
    >
      <ShieldCheck size={11} aria-hidden="true" /> No amarga
    </span>
  );
}

/* ── ESTACIÓN 1 · Los granos ──────────────────────────────────────────── */
function EstacionGranos() {
  return (
    <section className="quinua-seccion space-y-4" data-testid="estacion-granos">
      {/* Hero con foto real de la quinua */}
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241d11]/60">
        <FotoQuinua slug="quinua" alt="Planta de quinua con panojas de colores en la montaña andina" ratio="aspect-[16/9]" Fallback={Wheat}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Wheat size={14} aria-hidden="true" /> Granos ancestrales
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">La despensa de los abuelos, de vuelta a la finca</h3>
          </div>
        </FotoQuinua>
      </div>

      <PedagogicalBlock
        icon={Sparkles}
        lead={INTRO_GRANOS.lead}
        clave={INTRO_GRANOS.clave}
      >
        <p>{INTRO_GRANOS.cuerpo}</p>
      </PedagogicalBlock>

      {/* Tarjetas por especie */}
      <div className="space-y-3" data-testid="quinua-granos-lista">
        {GRANOS_ANDINOS.map((g) => (
          <article key={g.id} className="rounded-2xl border border-slate-700/60 bg-[#241d11]/50 overflow-hidden" data-testid={`grano-${g.id}`}>
            <FotoQuinua slug={g.foto} alt={`${g.nombre} (${g.cientifico})`} ratio="aspect-[16/9]" Fallback={Wheat}>
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-200">
                  {g.tipo}
                </p>
                <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">{g.nombre}</h3>
                <p className="text-[11px] italic text-white/70 leading-tight">{g.cientifico} · {g.familia}</p>
              </div>
            </FotoQuinua>
            <div className="p-4 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <ChipSaponina grano={g} />
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                  <Mountain size={11} aria-hidden="true" /> {g.pisoTermico}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-lime-500/15 border border-lime-600/40 px-2 py-0.5 text-[10px] font-bold text-lime-200">
                  <HeartPulse size={11} aria-hidden="true" /> Proteína {g.proteina}
                </span>
              </div>
              <p className="text-xs leading-snug text-slate-300">{g.resumen}</p>
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
                <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
                <span>{g.nutriNota}</span>
              </p>
              <p className="text-[10px] leading-snug text-slate-500">Fuente: {g.fuente}.</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Siembra y piso térmico ──────────────────────────────── */
function EstacionSiembra({ onNavigate }) {
  return (
    <section className="quinua-seccion space-y-4" data-testid="estacion-siembra">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#241d11]/60">
        <FotoQuinua slug="tarwi" alt="Cultivo de tarwi y granos andinos en ladera de montaña" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> Cada grano, su altura
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Sembrar donde cada uno se da</h3>
          </div>
        </FotoQuinua>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        Estos granos son de tierra fría y alta —menos la chía, que pide clima más
        templado—. La clave está en sembrar cada uno en su piso térmico, al empezar
        las lluvias, y a la distancia que lo deje ventilar.
      </p>

      {/* Ficha de siembra por especie */}
      <div className="space-y-3" data-testid="quinua-siembra-lista">
        {SIEMBRA_GRANOS.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-700/60 bg-[#241d11]/50 p-4 space-y-2.5" data-testid={`siembra-${s.id}`}>
            <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
              <Wheat size={16} aria-hidden="true" /> {s.nombre}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <p className="flex items-start gap-2 text-xs leading-snug text-slate-200">
                <CalendarDays size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
                <span><span className="font-bold text-slate-100">Época y ciclo. </span>{s.epoca}</span>
              </p>
              <p className="flex items-start gap-2 text-xs leading-snug text-slate-200">
                <Sprout size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-300" />
                <span><span className="font-bold text-slate-100">Distancias. </span>{s.distancia}</span>
              </p>
              <p className="flex items-start gap-2 text-xs leading-snug text-slate-200">
                <Mountain size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />
                <span><span className="font-bold text-slate-100">Piso térmico. </span>{s.piso}</span>
              </p>
              <p className="flex items-start gap-2 text-xs leading-snug text-slate-200">
                <Sun size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-orange-300" />
                <span><span className="font-bold text-slate-100">Manejo. </span>{s.manejo}</span>
              </p>
            </div>
            <p className="text-[10px] leading-snug text-slate-500">Fuente: {s.fuente}.</p>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400" data-testid="quinua-siembra-dosis">
        <FlaskConical size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>
          La cantidad exacta de abono y de semilla certificada por hectárea depende
          del análisis de su lote y de la variedad{' '}
          <SlotPendiente>dosis según análisis de suelo</SlotPendiente>. Aquí no se inventan kilos por mata.
        </span>
      </p>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="quinua-ir-suelo"
          onClick={() => onNavigate('salud_suelo')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
            <Mountain size={18} className="text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Lea su análisis y corrija la tierra antes de abonar.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 3 · Quitar el amargo (desaponificado) ───────────────────── */
function EstacionDesaponificado({ onNavigate }) {
  const d = DESAPONIFICADO_QUINUA;
  return (
    <section className="quinua-seccion space-y-4" data-testid="estacion-desaponificado">
      <div className="rounded-2xl border border-sky-800/40 overflow-hidden bg-[#241d11]/60">
        <FotoQuinua slug="grano" alt="Granos de quinua listos para lavar antes de cocinar" ratio="aspect-[16/9]" Fallback={Droplets}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-sky-200">
              <Droplets size={14} aria-hidden="true" /> El paso que más importa
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">{d.titulo}</h3>
          </div>
        </FotoQuinua>
      </div>

      <PedagogicalBlock icon={Droplets} lead={d.porQue} />

      {/* Los 3 pasos del desaponificado */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241d11]/50 p-4" data-testid="quinua-desaponificado-pasos">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-3">Lavar la saponina, paso a paso</p>
        <ol className="space-y-3">
          {d.pasos.map((paso, i) => (
            <li key={paso.id} className="flex gap-3" data-testid={`desap-${paso.id}`}>
              <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-black grid place-items-center">
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
          <span>{d.dulces}</span>
        </p>
        <p className="text-[10px] leading-snug text-slate-500 mt-2">Fuente: {d.fuente}.</p>
      </div>

      {/* El tarwi se desamarga aparte (alcaloides, no saponina) */}
      <div className="rounded-2xl border border-orange-800/40 bg-orange-950/20 p-4 space-y-2" data-testid="quinua-desamargado-tarwi">
        <p className="flex items-center gap-2 text-sm font-black text-orange-200 uppercase tracking-wide">
          <FlaskConical size={16} aria-hidden="true" /> {DESAMARGADO_TARWI.titulo}
        </p>
        <p className="text-xs leading-snug text-slate-200">{DESAMARGADO_TARWI.detalle}</p>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {DESAMARGADO_TARWI.fuente}.</p>
      </div>

      {/* Los que NO se lavan */}
      <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/15 p-4 space-y-2" data-testid="quinua-sin-desaponificar">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <ShieldCheck size={16} aria-hidden="true" /> {SIN_DESAPONIFICAR.titulo}
        </p>
        <ul className="space-y-2">
          {SIN_DESAPONIFICAR.puntos.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
              <Leaf size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-emerald-400" />{p}
            </li>
          ))}
        </ul>
      </div>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="quinua-ir-nutricion"
          onClick={() => onNavigate('nutricion')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/15 grid place-items-center">
            <HeartPulse size={18} className="text-lime-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">La comida que alimenta</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Vea el aporte nutricional de cada cultivo (ICBF).</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 4 · Mildiú y manejo ─────────────────────────────────────── */
const ICONO_MAL = { mildiu: Leaf, pajaros: Bug };

function MalCard({ mal }) {
  const Icono = ICONO_MAL[mal.id] || Bug;
  return (
    <article className="rounded-2xl border border-rose-800/40 bg-[#241d11]/50 overflow-hidden p-4 space-y-3" data-testid={`mal-${mal.id}`}>
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-200">
          <Icono size={14} aria-hidden="true" /> {mal.tipo} · afecta {mal.afecta}
        </p>
        <h3 className="text-lg font-black text-slate-100 leading-tight">{mal.nombre}</h3>
        {mal.cientifico && <p className="text-[11px] italic text-slate-400 leading-tight">{mal.cientifico}</p>}
      </div>

      {/* Reconocerla */}
      <div>
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-rose-300 mb-1.5">
          <TriangleAlert size={14} aria-hidden="true" /> Cómo reconocerlo
        </p>
        <ul className="space-y-1.5">
          {mal.reconocer.map((r, i) => (
            <li key={i} className="flex gap-1.5 text-xs leading-snug text-slate-200">
              <span aria-hidden="true" className="text-rose-400 shrink-0">•</span>{r}
            </li>
          ))}
        </ul>
      </div>
      {/* Manejarlo (agroecológico) */}
      <div>
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300 mb-2">
          <ShieldCheck size={14} aria-hidden="true" /> Cómo manejarlo sin veneno
        </p>
        <ul className="space-y-2">
          {mal.manejo.map((m, i) => (
            <li key={i} className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2.5">
              <p className="text-sm font-bold text-slate-100 leading-tight">{m.titulo}</p>
              <p className="text-xs leading-snug text-slate-300 mt-0.5">{m.detalle}</p>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[10px] leading-snug text-slate-500">Fuente: {mal.fuente}.</p>
    </article>
  );
}

function EstacionMales({ onNavigate }) {
  return (
    <section className="quinua-seccion space-y-4" data-testid="estacion-plagas">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="El mal principal de la quinua y la cañihua es el mildiú velloso; a estos granos también les llegan los pájaros en la maduración."
        clave="Al mildiú se le gana con manejo, no con veneno: siembra que ventile, caldo de ceniza, variedades tolerantes y rotación."
      >
        <p>
          Reconocer el mildiú temprano y sembrar a la distancia justa (que ventile
          y le entre sol) es la mitad de la pelea. Aquí no verá dosis de fungicida:
          el manejo de los granos andinos es agroecológico.
        </p>
      </PedagogicalBlock>

      {MALES_GRANOS.map((mal) => <MalCard key={mal.id} mal={mal} />)}

      {/* Guard anti-receta: nada de dosis químicas inventadas */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="quinua-nota-sin-recetas">
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
            data-testid="quinua-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Caldo de ceniza y otros, con su receta.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="quinua-ir-sanidad"
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

/* ── ESTACIÓN 5 · Cosecha, trilla y valor nutricional ─────────────────── */
function EstacionCosecha() {
  const c = COSECHA_TRILLA;
  const v = VALOR_NUTRICIONAL;
  return (
    <section className="quinua-seccion space-y-4" data-testid="estacion-cosecha">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241d11]/60">
        <FotoQuinua slug="amaranto" alt="Espigas de amaranto listas para cosechar y trillar" ratio="aspect-[16/9]" Fallback={Scissors}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Scissors size={14} aria-hidden="true" /> De la mata al costal
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">{c.titulo}</h3>
          </div>
        </FotoQuinua>
      </div>

      {/* Pasos de cosecha/trilla */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241d11]/50 p-4" data-testid="quinua-cosecha-pasos">
        <ol className="space-y-3">
          {c.pasos.map((paso, i) => (
            <li key={paso.id} className="flex gap-3" data-testid={`cosecha-${paso.id}`}>
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

      {/* Valor nutricional — el corazón del mundo */}
      <div className="rounded-2xl border border-lime-800/40 bg-lime-950/15 p-4 space-y-3" data-testid="quinua-valor-nutricional">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <HeartPulse size={16} aria-hidden="true" /> {v.titulo}
        </p>
        <p className="text-sm leading-relaxed text-slate-200">{v.intro}</p>

        {/* Cifra dura groundeada (ICBF) para la quinua */}
        <div className="grid grid-cols-3 gap-2" data-testid="quinua-cifra-icbf">
          <div className="rounded-xl border border-lime-700/40 bg-slate-950/40 p-2.5 text-center">
            <p className="text-lg font-black text-lime-200 leading-none">{v.cifraQuinua.proteina}</p>
            <p className="text-[10px] text-slate-400 mt-1">proteína</p>
          </div>
          <div className="rounded-xl border border-lime-700/40 bg-slate-950/40 p-2.5 text-center">
            <p className="text-lg font-black text-lime-200 leading-none">{v.cifraQuinua.hierro}</p>
            <p className="text-[10px] text-slate-400 mt-1">hierro</p>
          </div>
          <div className="rounded-xl border border-lime-700/40 bg-slate-950/40 p-2.5 text-center">
            <p className="text-lg font-black text-lime-200 leading-none">{v.cifraQuinua.energia}</p>
            <p className="text-[10px] text-slate-400 mt-1">energía</p>
          </div>
        </div>
        <p className="text-[10px] leading-snug text-slate-500 text-center">
          Quinua, {v.cifraQuinua.porcion} — {v.cifraQuinua.fuente}.
        </p>

        <ul className="space-y-2">
          {v.puntos.map((p) => (
            <li key={p.id} className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2.5" data-testid={`valor-${p.id}`}>
              <p className="text-sm font-bold text-slate-100 leading-tight">{p.titulo}</p>
              <p className="text-xs leading-snug text-slate-300 mt-0.5">{p.detalle}</p>
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {v.fuente}.</p>
      </div>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_QUINUA.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#241d11]/50 p-3" data-testid="quinua-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((val) => !val)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 text-left"
      >
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_QUINUA.map((cr) => (
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
export default function QuinuaScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('granos');

  return (
    <ScreenShell title="Quinua y granos andinos" icon={Wheat} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="quinua-screen">
        {/* Portada breve del mundo */}
        <div className="rounded-2xl border border-amber-800/40 bg-[#241d11]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-amber-200 leading-tight">
            <Wheat size={18} aria-hidden="true" className="shrink-0" />
            Granos ancestrales de la montaña
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            Recuperar la quinua, el amaranto, la cañihua, la chía y el tarwi: granos
            de alto valor nutricional y cultural, que se dan en el frío alto-andino.
            Cuáles son y qué alimentan, cómo sembrarlos, el desaponificado de la
            quinua (lavar el amargo), el mildiú sin veneno, y la cosecha y su valor.
          </p>
        </div>

        {/* Navegación entre estaciones (2×3, legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones de los granos andinos">
          {ESTACIONES_QUINUA.map((e) => {
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
                    ? 'quinua-estacion-activa border-amber-500/70 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 bg-[#241d11]/50 text-slate-300 active:bg-slate-800/70'
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

        {estacion === 'granos' && <EstacionGranos />}
        {estacion === 'siembra' && <EstacionSiembra onNavigate={onNavigate} />}
        {estacion === 'desaponificado' && <EstacionDesaponificado onNavigate={onNavigate} />}
        {estacion === 'plagas' && <EstacionMales onNavigate={onNavigate} />}
        {estacion === 'cosecha' && <EstacionCosecha />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="quinua-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo siembro y desaponifico la quinua en mi finca de tierra fría?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Wheat size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su finca es distinta?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su altura, su clima y su suelo.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

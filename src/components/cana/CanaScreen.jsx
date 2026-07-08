import React, { useState } from 'react';
import {
  Wheat, Sprout, Bug, Leaf, Droplets, Recycle, ChevronRight, Camera,
  ExternalLink, TriangleAlert, ShieldCheck, Mountain, Scissors, FlaskConical,
  Info, Hourglass, Factory, Flame, CookingPot, Candy,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_CANA,
  VARIEDADES_CANA,
  PASOS_SIEMBRA,
  MANEJO_CANA,
  MALES_CANA,
  NOTA_SIN_RECETAS_QUIMICAS,
  CICLO_CORTE,
  PASOS_PANELA,
  PANELA_FUENTE,
  BPM_PANELA,
  BAGAZO_ABONO,
  FOTO_BASE_CANA,
  CREDITOS_FOTOS_CANA,
} from '../../data/canaFinca';
import './cana.css';

/**
 * CanaScreen — mundo "La caña y la panela": el cultivo y el oficio panelero
 * colombiano, contado por su ciclo y con vida y fotos reales (patrón
 * photo-forward de CafeScreen/AguaScreen — NO se inventa motor nuevo).
 *
 * Cinco estaciones (pestañas), del cañaveral al bloque de panela:
 *   1. La caña          — qué es la caña panelera y qué variedad escoger.
 *   2. Siembra y manejo — de estaca/esqueje, en ladera, y el cuidado del año.
 *   3. Plagas y males   — barrenador (Diatraea→Cotesia/Trichogramma), carbón, roya.
 *   4. Corte            — el punto de la caña y la cogida (moler pronto).
 *   5. La panela        — trapiche, clarificación con balso/cadillo, punteo y
 *                          moldeo; y la panela LIMPIA (sin clarol/hidrosulfito).
 *
 * TODO groundeado en el catálogo/grafo (Diatraea AFFECTS caña; Cotesia y
 * Trichogramma CONTROLS Diatraea) y en Cenicaña/AGROSAVIA/FEDEPANELA/INVIMA. Las
 * cifras que dependen del sitio (distancia de siembra, dosis, °Brix) NO se
 * inventan: son "dato en camino" (SlotPendiente) o se remiten al agente.
 */

/** Chip honesto para cifras aún sin grounding (mismo criterio que Café). */
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

/* ── Fotos reales (licencia abierta) — patrón "photo-forward" de Café ───────
 * Foto de Wikimedia Commons + crédito visible + fallback a ícono si no carga.
 * El scrim oscuro es FIJO (no lo vira el remapeo de temas claros) para que el
 * texto encima quede legible al sol. */
const creditoDe = (slug) => CREDITOS_FOTOS_CANA.find((c) => c.slug === slug)?.autor || '';

function FotoCana({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Wheat, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#2a1c0f] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_CANA}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="cana-foto absolute inset-0 w-full h-full object-cover"
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

/** Pastilla de aptitud panelera de la variedad. */
function ChipApto({ apto }) {
  const label = {
    panelera: 'Buena para panela',
    tradicional: 'Tradicional',
    regional: 'De la región',
  }[apto] || apto;
  const fuerte = apto === 'panelera';
  return (
    <span
      data-testid={`apto-${apto}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        fuerte
          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
          : 'border-amber-500/50 bg-amber-500/15 text-amber-200'
      }`}
    >
      {fuerte ? <ShieldCheck size={11} aria-hidden="true" /> : <Wheat size={11} aria-hidden="true" />}
      {label}
    </span>
  );
}

/* ── ESTACIÓN 1 · La caña (variedades paneleras) ──────────────────────────── */
function EstacionCana() {
  return (
    <section className="cana-seccion space-y-4" data-testid="estacion-cana">
      {/* Hero con foto real del cañaveral */}
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241708]/60">
        <FotoCana slug="canaveral" alt="Cañaveral panelero verde en la ladera colombiana" ratio="aspect-[16/9]" Fallback={Wheat}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Wheat size={14} aria-hidden="true" /> La caña de la panela
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">De la caña dulce sale el bloque de panela</h3>
          </div>
        </FotoCana>
      </div>

      <PedagogicalBlock
        icon={Wheat}
        lead="La caña panelera es un pasto gigante y dulce (Saccharum officinarum): en su tallo guarda el jugo que, cocinado, se vuelve panela."
        clave="Para panela no busque la caña de más tonelaje, sino la que da BUEN jugo y clarifica bien. La variedad se escoge por la zona y la altura."
      >
        <p>
          A diferencia del café, la caña no se siembra de semilla: se siembra de
          pedazo de tallo. Y a diferencia del azúcar de ingenio, la panela es un
          oficio de finca: caña, trapiche y hornilla. Empiece por escoger bien la
          variedad para su tierra.
        </p>
      </PedagogicalBlock>

      {/* Variedades con su aptitud panelera */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241708]/50 p-4 space-y-2.5" data-testid="cana-variedades">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <Wheat size={16} aria-hidden="true" /> Variedades paneleras
        </p>
        {VARIEDADES_CANA.map((v) => (
          <div key={v.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`variedad-${v.id}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {v.nombre}
              <ChipApto apto={v.apto} />
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.nota}</p>
          </div>
        ))}
        <p className="flex items-start gap-1.5 text-[10px] leading-snug text-slate-500">
          <Info size={12} aria-hidden="true" className="shrink-0 mt-0.5" />
          <span>
            La variedad recomendada para su zona y altura{' '}
            <SlotPendiente>variedad por zona en camino</SlotPendiente> se aterriza con el
            técnico de Cenicaña/AGROSAVIA. Fuente de las variedades: Cenicaña / AGROSAVIA.
          </span>
        </p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Siembra y manejo ────────────────────────────────────────── */
function EstacionSiembra({ onNavigate }) {
  return (
    <section className="cana-seccion space-y-4" data-testid="estacion-siembra">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#241708]/60">
        <FotoCana slug="cana-planta" alt="Mata de caña macollando en la finca panelera" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> De estaca, no de semilla
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">La caña se siembra de pedazo de tallo</h3>
          </div>
        </FotoCana>
      </div>

      {/* Pasos de la siembra por esqueje/estaca */}
      <div className="rounded-2xl border border-emerald-800/40 bg-[#241708]/50 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide mb-3">
          <Sprout size={16} aria-hidden="true" /> De la estaca al cañaveral
        </p>
        <ol className="space-y-3">
          {PASOS_SIEMBRA.map((paso, i) => (
            <li key={paso.id} className="flex gap-3" data-testid={`siembra-${paso.id}`}>
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
          <Mountain size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>
            En ladera se siembra en curvas de nivel para cuidar el suelo. La distancia
            entre surcos y la cantidad de semilla{' '}
            <SlotPendiente>distancia por variedad y sistema en camino</SlotPendiente> cambian con la
            variedad y con si es plano o loma.
          </span>
        </p>
      </div>

      {/* Manejo del año */}
      <div className="rounded-2xl border border-lime-800/40 bg-[#241708]/50 p-4 space-y-3" data-testid="cana-manejo">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <Leaf size={16} aria-hidden="true" /> El cuidado del cañaveral
        </p>
        <ul className="space-y-3">
          {MANEJO_CANA.map((m) => (
            <li key={m.id} className="flex gap-3" data-testid={`manejo-${m.id}`}>
              <Sprout size={18} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{m.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{m.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="cana-ir-suelo"
            onClick={() => onNavigate('salud_suelo')}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
              <Mountain size={18} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Lea su análisis y abone la caña con cuenta, no de oído.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

/* ── ESTACIÓN 3 · Plagas y males ──────────────────────────────────────────── */
const ICONO_MAL = { barrenador: Bug, carbon: Leaf, roya: Leaf };

function MalCard({ mal }) {
  const Icono = ICONO_MAL[mal.id] || Bug;
  return (
    <article className="rounded-2xl border border-rose-800/40 bg-[#241708]/50 overflow-hidden" data-testid={`mal-${mal.id}`}>
      {mal.foto ? (
        <FotoCana slug={mal.foto} alt={`${mal.nombre} (${mal.cientifico}) en la caña`} ratio="aspect-[16/9]" Fallback={Icono}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-200">
              <Icono size={14} aria-hidden="true" /> {mal.tipo}
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">{mal.nombre}</h3>
            <p className="text-[11px] italic text-white/70 leading-tight">{mal.cientifico}</p>
          </div>
        </FotoCana>
      ) : (
        <div className="p-4 pb-0">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-300">
            <Icono size={14} aria-hidden="true" /> {mal.tipo}
          </p>
          <h3 className="text-xl font-black text-slate-100 leading-tight">{mal.nombre}</h3>
          <p className="text-[11px] italic text-slate-400 leading-tight">{mal.cientifico}</p>
        </div>
      )}

      <div className="p-4 space-y-3">
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
        {/* Manejarlo (agroecológico / MIP) */}
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
      </div>
    </article>
  );
}

function EstacionMales({ onNavigate }) {
  return (
    <section className="cana-seccion space-y-4" data-testid="estacion-males">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="El mal número uno del cañaveral es el barrenador del tallo (Diatraea): un gusano que se mete y barrena la caña por dentro."
        clave="Al barrenador se le gana con control biológico —Cotesia y Trichogramma, las avispitas de Cenicaña— no con más veneno. Al carbón y la roya, con variedad resistente y semilla sana."
      >
        <p>
          Reconocer temprano es media pelea ganada. El barrenador baja peso y daña
          el jugo; el carbón (látigo negro) y la roya afean y debilitan la mata. Vea
          cómo se ven y cómo se manejan sin recetas de veneno.
        </p>
      </PedagogicalBlock>

      {/* Foto del enemigo natural: la avispita que controla el barrenador */}
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-emerald-950/20" data-testid="cana-controlador">
        <FotoCana slug="cotesia" alt="Cotesia flavipes, la avispa parasitoide que controla el barrenador de la caña" ratio="aspect-[16/9]" Fallback={ShieldCheck}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <ShieldCheck size={14} aria-hidden="true" /> El bicho bueno
            </p>
            <h3 className="text-lg font-black text-[#ffffff] leading-tight drop-shadow">Cotesia flavipes, la aliada contra el barrenador</h3>
          </div>
        </FotoCana>
        <p className="p-3 text-xs leading-snug text-slate-300">
          Esta avispa (y su compañera Trichogramma) es la que Cenicaña cría y libera
          para controlar a la Diatraea: el enemigo natural, no el veneno.
        </p>
      </div>

      {MALES_CANA.map((mal) => <MalCard key={mal.id} mal={mal} />)}

      {/* Guard anti-receta: nada de dosis químicas inventadas */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="cana-nota-sin-recetas">
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
            data-testid="cana-ir-defensores"
            onClick={() => onNavigate('defensores')}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <ShieldCheck size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Defensores de la finca</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Conozca los bichos buenos que controlan las plagas.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="cana-ir-sanidad"
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

/* ── ESTACIÓN 4 · Corte ───────────────────────────────────────────────────── */
function EstacionCorte() {
  const c = CICLO_CORTE;
  return (
    <section className="cana-seccion space-y-4" data-testid="estacion-corte">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241708]/60">
        <FotoCana slug="corte" alt="Corte manual de la caña con machete" ratio="aspect-[16/9]" Fallback={Scissors}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Scissors size={14} aria-hidden="true" /> La cogida
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Se corta hecha y se muele pronto</h3>
          </div>
        </FotoCana>
      </div>

      {/* Datos del corte */}
      <div className="rounded-2xl border border-amber-700/40 bg-slate-950/40 p-4 space-y-2" data-testid="cana-corte-datos">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300">
          <Scissors size={13} aria-hidden="true" /> El punto de la caña
        </p>
        <p className="text-sm leading-snug text-slate-200">{c.punto}</p>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-200/90">
          <TriangleAlert size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />
          {c.moliendaPronta}
        </p>
      </div>

      {/* Pasos del corte */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#241708]/50 p-4">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-3">Del cañaveral al trapiche</p>
        <ol className="space-y-3">
          {c.pasos.map((paso, i) => (
            <li key={paso.id} className="flex gap-3" data-testid={`corte-${paso.id}`}>
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
    </section>
  );
}

/* ── ESTACIÓN 5 · La panela (el proceso) ──────────────────────────────────── */
const ICONO_PANELA = {
  molienda: Factory,
  clarificacion: FlaskConical,
  evaporacion: Flame,
  punteo: CookingPot,
  moldeo: Candy,
};
const FOTO_PANELA = { molienda: 'trapiche', clarificacion: 'clarificacion', punteo: 'hornilla', moldeo: 'moldeo' };

function EstacionPanela({ onNavigate }) {
  return (
    <section className="cana-seccion space-y-4" data-testid="estacion-panela">
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#241708]/60">
        <FotoCana slug="hornilla" alt="Hornilla panelera con las pailas cocinando la miel" ratio="aspect-[16/9]" Fallback={Flame}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Flame size={14} aria-hidden="true" /> El oficio de la panela
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Del guarapo al bloque, en la hornilla</h3>
          </div>
        </FotoCana>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        Hacer panela es sacarle el jugo a la caña y cocinarlo hasta que cuaje. Cada
        paso tiene su punto: apurarse o descuidarse en cualquiera daña la panela de
        toda la molienda.
      </p>

      {/* Los pasos del proceso, en orden (con foto donde la hay) */}
      <ol className="space-y-3" data-testid="cana-panela-pasos">
        {PASOS_PANELA.map((paso, i) => {
          const Icono = ICONO_PANELA[paso.icono] || Factory;
          const foto = FOTO_PANELA[paso.id];
          return (
            <li key={paso.id} className="rounded-2xl border border-slate-700/60 bg-[#241708]/50 overflow-hidden" data-testid={`panela-${paso.id}`}>
              {foto && (
                <FotoCana slug={foto} alt={paso.titulo} ratio="aspect-[16/9]" Fallback={Icono} />
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 grid place-items-center relative">
                    <Icono size={18} className="text-amber-300" />
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-[11px] font-black text-[#241708] grid place-items-center">{i + 1}</span>
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
              </div>
            </li>
          );
        })}
      </ol>

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400" data-testid="cana-panela-fuente">
        <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>{PANELA_FUENTE}</span>
      </p>

      {/* Buenas prácticas: panela LIMPIA, sin clarol ni hidrosulfito (INVIMA) */}
      <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/20 p-4 space-y-3" data-testid="cana-bpm">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <ShieldCheck size={16} aria-hidden="true" /> {BPM_PANELA.titulo}
        </p>
        <p className="text-xs leading-snug text-slate-200">{BPM_PANELA.resumen}</p>
        <ul className="space-y-2">
          {BPM_PANELA.vetos.map((v, i) => (
            <li key={i} className="rounded-lg border border-emerald-800/40 bg-slate-950/40 p-2.5" data-testid={`bpm-veto-${i}`}>
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-100 leading-tight">
                <TriangleAlert size={13} aria-hidden="true" className="shrink-0 text-rose-400" />
                {v.titulo}
              </p>
              <p className="text-xs leading-snug text-slate-300 mt-0.5">{v.detalle}</p>
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {BPM_PANELA.fuente}.</p>
      </div>

      {/* Cierre del ciclo: bagazo y cachaza → enlace al mundo del compost */}
      <div className="rounded-2xl border border-lime-800/40 overflow-hidden bg-lime-950/20" data-testid="cana-bagazo-abono">
        <div className="p-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
            <Recycle size={16} aria-hidden="true" /> {BAGAZO_ABONO.titulo}
          </p>
          <p className="text-xs leading-snug text-slate-200">{BAGAZO_ABONO.resumen}</p>
          <ul className="space-y-2">
            {BAGAZO_ABONO.puntos.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-slate-200">
                <Leaf size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-400" />{p}
              </li>
            ))}
          </ul>
          <p className="text-[10px] leading-snug text-slate-500">Fuente: {BAGAZO_ABONO.fuente}.</p>
          {typeof onNavigate === 'function' && (
            <button
              type="button"
              data-testid="cana-ir-compost"
              onClick={() => onNavigate(BAGAZO_ABONO.enlaceMundo)}
              className="w-full flex items-center gap-3 rounded-xl border border-lime-700/50 bg-lime-900/20 p-3 text-left active:bg-lime-900/40 transition-colors"
            >
              <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/20 grid place-items-center">
                <Recycle size={18} className="text-lime-300" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-100 leading-tight">{BAGAZO_ABONO.enlaceLabel}</span>
                <span className="block text-xs text-slate-400 leading-tight mt-0.5">Vaya al mundo del compost: bagazo y cachaza hechos tierra negra.</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_CANA.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#241708]/50 p-3" data-testid="cana-creditos-fotos">
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
          {CREDITOS_FOTOS_CANA.map((cr) => (
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

/* ── Pantalla principal ───────────────────────────────────────────────────── */
export default function CanaScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('cana');

  return (
    <ScreenShell title="La caña y la panela" icon={Wheat} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="cana-screen">
        {/* Portada breve del mundo */}
        <div className="rounded-2xl border border-amber-800/40 bg-[#241708]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-amber-200 leading-tight">
            <Wheat size={18} aria-hidden="true" className="shrink-0" />
            La caña y la panela, de la estaca al bloque
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            El cultivo y el oficio panelero colombiano, contado por su ciclo: escoger
            la variedad, sembrar de estaca en la ladera, defender el cañaveral del
            barrenador con control biológico, cortar en el punto y hacer la panela en
            el trapiche y la hornilla — limpia, sin clarol ni químicos.
          </p>
        </div>

        {/* Navegación entre estaciones (2×3, legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones de la caña y la panela">
          {ESTACIONES_CANA.map((e) => {
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
                    ? 'cana-estacion-activa border-amber-500/70 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 bg-[#241708]/50 text-slate-300 active:bg-slate-800/70'
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

        {estacion === 'cana' && <EstacionCana />}
        {estacion === 'siembra' && <EstacionSiembra onNavigate={onNavigate} />}
        {estacion === 'males' && <EstacionMales onNavigate={onNavigate} />}
        {estacion === 'corte' && <EstacionCorte />}
        {estacion === 'panela' && <EstacionPanela onNavigate={onNavigate} />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="cana-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo manejo el barrenador de la caña y cómo saco buena panela sin clarol?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Wheat size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su trapiche es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su altura.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

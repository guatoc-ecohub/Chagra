import React, { useState } from 'react';
import {
  Citrus, Apple, Sprout, Scissors, Bug, Leaf, Sun, Mountain,
  Ruler, ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck,
  FlaskConical, CalendarDays, Info, Hourglass, Trees,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  FRUTALES,
  FOTO_BASE_FRUTALES,
  NOTA_SIN_QUIMICOS,
  SLOT_FERTILIZACION,
  CREDITOS_FOTOS_FRUTALES,
} from '../../data/frutalesFinca';
import './frutales.css';

/**
 * FrutalesScreen — mundo "Frutales de la finca con vida": los frutales de la
 * finca campesina colombiana (cítricos, aguacate, mango, guayaba, mora, lulo,
 * tomate de árbol, papaya), cada uno con su ficha de CULTIVO.
 *
 * Sigue el patrón PHOTO-FORWARD de AguaScreen/CafeScreen (NO inventa motor
 * nuevo): fotos CC reales con atribución, scrim fijo para legibilidad al sol,
 * fallback a ícono, y micro-animaciones baratas en frutales.css.
 *
 * A diferencia del café (un solo cultivo en 5 estaciones), aquí hay VARIOS
 * frutales: un selector con foto arriba y, debajo, la ficha del frutal escogido
 * con sus secciones: propagación · siembra y distancias · luz/agua/piso térmico
 * · plagas y enfermedades (grafo) · poda · cosecha y poscosecha.
 *
 * GROUNDING (src/data/frutalesFinca.js): plagas y controladores biológicos
 * salen del grafo (public/grafo-relations.json → pest_controllers), y el ciclo
 * (años a primera cosecha, piso térmico) de perennialCycles.js (AGROSAVIA). Las
 * cifras que dependen del sitio (dosis de abono) NO se inventan: "dato en
 * camino". El manejo es agroecológico, sin dosis de veneno.
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
 * oscuro es FIJO (no lo vira el remapeo de temas claros) para legibilidad. */
const creditoDe = (slug) => CREDITOS_FOTOS_FRUTALES.find((c) => c.slug === slug)?.autor || '';

function FotoFrutal({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Apple, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#20180f] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_FRUTALES}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="frutal-foto absolute inset-0 w-full h-full object-cover"
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

/** Bloque de una sección de la ficha (título + ícono + cuerpo). */
function SeccionFicha({ icon, titulo, accent = 'text-amber-200', children, testid }) {
  const IconoSeccion = icon;
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-[#20180f]/60 p-4 space-y-2.5" data-testid={testid}>
      <p className={`flex items-center gap-2 text-sm font-black uppercase tracking-wide ${accent}`}>
        <IconoSeccion size={16} aria-hidden="true" /> {titulo}
      </p>
      {children}
    </div>
  );
}

/** Tarjeta de una plaga/enfermedad (señal + biocontroles del grafo). */
function PlagaCard({ plaga }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 space-y-2" data-testid={`plaga-${plaga.id}`}>
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
  );
}

/* ── Ficha completa de un frutal ──────────────────────────────────────── */
function FichaFrutal({ frutal, onNavigate }) {
  const injertado = /injerto/i.test(frutal.propagacion.metodo);
  return (
    <section className="frutal-ficha space-y-4" data-testid={`frutal-ficha-${frutal.id}`}>
      {/* Hero con foto real del frutal */}
      <div className="rounded-2xl border border-amber-800/40 overflow-hidden bg-[#20180f]/60">
        <FotoFrutal slug={frutal.foto} alt={`${frutal.nombre} (${frutal.cientifico}) en la finca`} ratio="aspect-[16/9]" Fallback={Apple}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Apple size={14} aria-hidden="true" /> {frutal.subtitulo || 'Frutal de la finca'}
            </p>
            <h3 className="text-2xl font-black text-[#ffffff] leading-tight drop-shadow">{frutal.nombre}</h3>
            <p className="text-[11px] italic text-white/70 leading-tight">{frutal.cientifico}</p>
          </div>
        </FotoFrutal>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{frutal.resumen}</p>

      {/* Propagación */}
      <SeccionFicha icon={Sprout} titulo="Cómo se propaga" accent="text-emerald-200" testid="ficha-propagacion">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100">
          {frutal.propagacion.metodo}
        </p>
        <p className="text-xs leading-snug text-slate-300">{frutal.propagacion.detalle}</p>
        {injertado && (
          <div className="rounded-xl overflow-hidden border border-slate-700/50 mt-1">
            <FotoFrutal slug="injerto" alt="Injerto de yema en un frutal" ratio="aspect-[16/7]" Fallback={Scissors} />
          </div>
        )}
      </SeccionFicha>

      {/* Siembra y distancias */}
      <SeccionFicha icon={Ruler} titulo="Siembra y distancias" accent="text-lime-200" testid="ficha-siembra">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100">
          <span className="rounded-full bg-lime-500/15 border border-lime-600/40 px-2 py-0.5 text-[11px] font-bold text-lime-200">
            {frutal.siembra.distancia}
          </span>
        </p>
        <p className="text-xs leading-snug text-slate-300">{frutal.siembra.detalle}</p>
      </SeccionFicha>

      {/* Luz, agua y piso térmico */}
      <SeccionFicha icon={Mountain} titulo="Luz, agua y piso térmico" accent="text-sky-200" testid="ficha-clima">
        <div className="flex items-start gap-2 text-xs leading-snug text-slate-300">
          <Sun size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{frutal.aguaLuz}</span>
        </div>
        <div className="flex items-start gap-2 text-xs leading-snug text-slate-300">
          <Mountain size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />
          <span>
            <span className="font-bold text-slate-100">{frutal.piso.altitud}. </span>{frutal.piso.nota}
          </span>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {frutal.piso.fuente}.</p>
      </SeccionFicha>

      {/* Plagas y enfermedades (grounded del grafo) */}
      <SeccionFicha icon={Bug} titulo="Plagas y enfermedades" accent="text-rose-200" testid="ficha-plagas">
        <p className="text-xs leading-snug text-slate-400">
          Reconózcalas temprano y manéjelas sin veneno. Los bichos buenos y los biocontroles vienen del grafo Chagra (a qué le pega cada plaga y quién la controla).
        </p>
        <div className="space-y-2.5">
          {frutal.plagas.map((p) => <PlagaCard key={p.id} plaga={p} />)}
        </div>

        {/* Aviso de cuarentena (cítricos: HLB) */}
        {frutal.cuarentena && (
          <div className="rounded-xl border border-amber-600/50 bg-amber-950/30 p-3" data-testid="frutal-cuarentena">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-200 mb-1">
              <TriangleAlert size={13} aria-hidden="true" /> {frutal.cuarentena.titulo}
            </p>
            <p className="text-xs leading-snug text-amber-100/90">{frutal.cuarentena.detalle}</p>
          </div>
        )}
        {/* Aviso de virus (papaya: PRSV) */}
        {frutal.virus && (
          <div className="rounded-xl border border-amber-600/50 bg-amber-950/30 p-3" data-testid="frutal-virus">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-200 mb-1">
              <TriangleAlert size={13} aria-hidden="true" /> {frutal.virus.titulo}
            </p>
            <p className="text-xs leading-snug text-amber-100/90">{frutal.virus.detalle}</p>
          </div>
        )}

        {/* Biopreparados groundeados de la especie */}
        {frutal.biopreparados?.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-1.5">
              <FlaskConical size={12} aria-hidden="true" /> Biopreparados de apoyo
            </p>
            <div className="flex flex-wrap gap-1.5">
              {frutal.biopreparados.map((b, i) => (
                <span key={i} className="rounded-full border border-slate-600/50 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-200">{b}</span>
              ))}
            </div>
          </div>
        )}
      </SeccionFicha>

      {/* Poda */}
      <SeccionFicha icon={Scissors} titulo="Poda" accent="text-teal-200" testid="ficha-poda">
        <p className="text-xs leading-snug text-slate-300">{frutal.poda}</p>
      </SeccionFicha>

      {/* Cosecha y poscosecha */}
      <SeccionFicha icon={CalendarDays} titulo="Cosecha y poscosecha" accent="text-orange-200" testid="ficha-cosecha">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-orange-700/40 bg-slate-950/40 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-300 mb-0.5">Primera cosecha</p>
            <p className="text-sm font-bold text-slate-100 leading-tight">{frutal.cosecha.inicio}</p>
          </div>
          <div className="rounded-xl border border-orange-700/40 bg-slate-950/40 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-300 mb-0.5">El punto</p>
            <p className="text-xs text-slate-200 leading-tight">{frutal.cosecha.punto}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs leading-snug text-slate-300">
          <Apple size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-orange-300" />
          <span>{frutal.cosecha.poscosecha}</span>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {frutal.cosecha.fuente}.</p>
      </SeccionFicha>

      {/* Dosis de abono = dato en camino (no se inventa) */}
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
        <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>
          {SLOT_FERTILIZACION.texto}{' '}
          <SlotPendiente>dosis según análisis de suelo</SlotPendiente>
        </span>
      </p>

      {/* Profundización dedicada: el aguacate tiene su propio mundo (cultivo
          bandera de alto valor). Solo aparece en la ficha del aguacate — no
          duplica, lleva al detalle (injerto/patrón, drenaje, flor A/B). */}
      {frutal.id === 'aguacate' && typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="frutales-ir-aguacate"
          onClick={() => onNavigate('aguacate')}
          className="w-full flex items-center gap-3 rounded-2xl border border-lime-700/50 bg-lime-900/20 p-3.5 text-left active:bg-lime-900/40 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-lime-500/20 grid place-items-center text-xl">
            🥑
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">El aguacate, a fondo</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Su mundo dedicado: piso térmico e injerto, drenaje contra la pudrición, floración tipo A/B y el punto de cosecha.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}

      {/* Puentes a los mundos hermanos de sanidad */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="frutales-ir-biopreparados"
            onClick={() => onNavigate('biopreparados', { back: 'dashboard' })}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
              <FlaskConical size={18} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">Biopreparados paso a paso</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Caldo bordelés, nim, aceite-jabón y más, con su receta.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="frutales-ir-sanidad"
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

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_FRUTALES.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#20180f]/60 p-3" data-testid="frutales-creditos-fotos">
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
          {CREDITOS_FOTOS_FRUTALES.map((cr) => (
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
export default function FrutalesScreen({ onBack, onNavigate = undefined }) {
  const [sel, setSel] = useState(FRUTALES[0].id);
  const frutal = FRUTALES.find((f) => f.id === sel) || FRUTALES[0];

  return (
    <ScreenShell title="Frutales de la finca" icon={Citrus} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="frutales-screen">
        {/* Portada del mundo */}
        <div className="rounded-2xl border border-amber-800/40 bg-[#20180f]/60 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-amber-200 leading-tight">
            <Citrus size={18} aria-hidden="true" className="shrink-0" />
            Los frutales de la finca, con vida
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            Los árboles y matas de fruta del solar campesino, cada uno con su ficha:
            cómo se propaga, a qué distancia se siembra, qué piso térmico y agua pide,
            qué plagas lo atacan y cómo manejarlas sin veneno, cómo se poda y cómo se
            cosecha y guarda. Escoja un frutal.
          </p>
        </div>

        <PedagogicalBlock
          icon={Trees}
          lead="El frutal es una siembra de paciencia: se planta una vez y da por años, pero solo si se escoge bien la mata y se cuida el suelo, el agua y la sanidad."
          clave="La mayoría se INJERTAN o se propagan de la misma planta (no de pepa) para que salgan iguales a la madre y produzcan pronto. La sanidad empieza con material limpio y certificado."
        />

        {/* Selector de frutales (grilla con foto — photo-forward) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="tablist" aria-label="Frutales de la finca">
          {FRUTALES.map((f) => {
            const activo = f.id === sel;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`frutal-tile-${f.id}`}
                onClick={() => setSel(f.id)}
                className={`relative rounded-2xl overflow-hidden border text-left transition-all ${
                  activo
                    ? 'frutal-tile-activo border-emerald-400/80 ring-2 ring-emerald-400/40'
                    : 'border-slate-700/60 active:border-slate-500'
                }`}
              >
                <FotoFrutal slug={f.foto} alt={f.nombre} ratio="aspect-[4/3]" Fallback={Apple}>
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <span className="block text-sm font-black text-white leading-tight drop-shadow">{f.nombre}</span>
                    {f.subtitulo && (
                      <span className="block text-[10px] text-white/75 leading-tight truncate">{f.subtitulo}</span>
                    )}
                  </div>
                </FotoFrutal>
              </button>
            );
          })}
        </div>

        {/* Ficha del frutal escogido */}
        <FichaFrutal frutal={frutal} onNavigate={onNavigate} />

        {/* Guard anti-receta compartido del mundo */}
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="frutales-nota-sin-quimicos">
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
            <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
            <span>{NOTA_SIN_QUIMICOS}</span>
          </p>
        </div>

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="frutales-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: `¿Cómo cuido mi ${frutal.nombre.toLowerCase()} en mi finca (siembra, plagas y cosecha)?` })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Citrus size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su frutal es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su altura.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

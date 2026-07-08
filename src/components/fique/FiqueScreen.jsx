import React, { useState } from 'react';
import {
  Sprout, Mountain, Leaf, Scissors, Recycle, Droplets, Waves, Sun,
  Package, Shirt, Feather, ShieldCheck, TriangleAlert, Info, Hourglass,
  ChevronRight, Camera, ExternalLink, Sparkles, FlaskConical,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_FIQUE,
  FICHA_FIQUE,
  LADERA_EROSION,
  PASOS_MANEJO,
  DATOS_FIQUE,
  SANIDAD_FIQUE,
  PASOS_DESFIBRADO,
  DESFIBRADO_FUENTE,
  USOS_FIQUE,
  CULTURA_FIQUE,
  BAGAZO_JUGO,
  NOTA_SIN_RECETAS,
  FOTO_BASE_FIQUE,
  CREDITOS_FOTOS_FIQUE,
} from '../../data/fiqueFinca';
import './fique.css';

/**
 * FiqueScreen — mundo "El fique y las fibras": el cultivo de ladera del que sale
 * la cabuya, contado por su ciclo, con vida y fotos reales (patrón photo-forward
 * de CafeScreen/AguaScreen — NO se inventa motor nuevo).
 *
 * Cinco estaciones (pestañas), del fique en la ladera a la fibra y su residuo:
 *   1. La planta y la ladera — qué es Furcraea andina y por qué cuida el suelo.
 *   2. Cría y manejo         — propagación por hijos/bulbillos, vivero, cosecha.
 *   3. El desfibrado         — beneficio de la penca → fibra (macana/desfibradora).
 *   4. Usos y cultura        — empaques, cabuya, artesanía, jugo bioinsumo, patrimonio.
 *   5. Bagazo y jugo         — aprovechar el residuo SIN contaminar la quebrada.
 *
 * TODO groundeado en el catálogo Chagra (public/cycle-content/furcraea_andina.json:
 * altitud, roles cerca-viva/biomasa, propagación, desfibrado, usos, bagazo/jugo)
 * y fuentes Tier A (Agrosavia, Bernal 2015, Pérez Arbeláez 1947). Lo que el grafo
 * aún no respalda (plagas AFFECTS/CONTROLS) va como "dato en camino"; NO se
 * inventan plagas, dosis ni recetas.
 */

/** Chip honesto para datos aún sin grounding (mismo criterio que Café/Agua). */
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
const creditoDe = (slug) => CREDITOS_FOTOS_FIQUE.find((c) => c.slug === slug)?.autor || '';

function FotoFique({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Sprout, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#1a2412] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_FIQUE}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="fique-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-emerald-900/70" />
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

/* ── ESTACIÓN 1 · La planta y la ladera ───────────────────────────────── */
function EstacionPlanta() {
  const f = FICHA_FIQUE;
  return (
    <section className="fique-seccion space-y-4" data-testid="estacion-planta">
      {/* Hero con foto real del fique */}
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#1a2412]/60">
        <FotoFique slug="planta" alt="Roseta de fique (Furcraea andina) en una ladera andina" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> La fibra de Colombia
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">El fique nace en la ladera</h3>
            <p className="text-[11px] italic text-white/70 leading-tight mt-0.5">{f.cientifico}</p>
          </div>
        </FotoFique>
      </div>

      <PedagogicalBlock
        icon={Leaf}
        lead="El fique —la cabuya— es la planta de ladera de la que sale la fibra vegetal más colombiana."
        clave="Sembrado en la pendiente y en las cercas, el fique le da fibra y, de paso, le sujeta el suelo contra la erosión."
      >
        <p>{f.descripcion}</p>
      </PedagogicalBlock>

      {/* Ficha rápida (grounded del catálogo) */}
      <div className="grid grid-cols-2 gap-2" data-testid="fique-ficha">
        <div className="rounded-xl border border-emerald-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-300 mb-1">
            <Mountain size={13} aria-hidden="true" /> Dónde vive
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{f.altitud}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{f.zonas}</p>
        </div>
        <div className="rounded-xl border border-emerald-700/40 bg-slate-950/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-300 mb-1">
            <Sprout size={13} aria-hidden="true" /> Qué es
          </p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{f.familia}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Nativa: la domesticaron Muiscas, Guanes y Laches</p>
        </div>
      </div>

      {/* Por qué protege el suelo en la ladera (control de erosión) */}
      <div className="rounded-2xl border border-lime-800/40 bg-[#1a2412]/50 p-4 space-y-3" data-testid="fique-ladera">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <Mountain size={16} aria-hidden="true" /> El fique cuida la ladera
        </p>
        <ul className="space-y-3">
          {LADERA_EROSION.map((l) => (
            <li key={l.id} className="flex gap-3" data-testid={`ladera-${l.id}`}>
              <Sprout size={18} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{l.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{l.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {f.fuente} (roles de cerca viva y productor de biomasa del catálogo Chagra).</p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · Cría y manejo ───────────────────────────────────────── */
function EstacionManejo({ onNavigate }) {
  const d = DATOS_FIQUE;
  const s = SANIDAD_FIQUE;
  return (
    <section className="fique-seccion space-y-4" data-testid="estacion-manejo">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#1a2412]/60">
        <FotoFique slug="cabuya" alt="Mata de fique con sus pencas largas y dentadas" ratio="aspect-[16/9]" Fallback={Leaf}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> De hijo, no de semilla
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Cómo se cría el fique</h3>
          </div>
        </FotoFique>
      </div>

      {/* Pasos del manejo, en orden */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#1a2412]/50 p-4">
        <p className="text-sm font-black text-emerald-200 uppercase tracking-wide mb-3">Del hijo a la primera cosecha</p>
        <ol className="space-y-3">
          {PASOS_MANEJO.map((paso, i) => (
            <li key={paso.id} className="flex gap-3" data-testid={`manejo-${paso.id}`}>
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
      </div>

      {/* Datos productivos (rango de referencia grounded) */}
      <div className="grid grid-cols-3 gap-2" data-testid="fique-datos">
        <div className="rounded-xl border border-emerald-700/40 bg-slate-950/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-300 mb-1">Primera cosecha</p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{d.primeraCosechaAnios[0]}–{d.primeraCosechaAnios[1]} años</p>
        </div>
        <div className="rounded-xl border border-emerald-700/40 bg-slate-950/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-300 mb-1">Hojas al año</p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{d.hojasPorAnio}</p>
        </div>
        <div className="rounded-xl border border-emerald-700/40 bg-slate-950/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-300 mb-1">Vida útil</p>
          <p className="text-sm font-bold text-slate-100 leading-tight">{d.vidaUtilAnios[0]}–{d.vidaUtilAnios[1]} años</p>
        </div>
      </div>
      <p className="text-[10px] leading-snug text-slate-500 -mt-1">Rangos de referencia — {d.fuente}. Varían con clima, suelo y manejo.</p>

      {/* Sanidad: honesta, dato en camino del grafo (NO se inventan plagas) */}
      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/15 p-4 space-y-2.5" data-testid="fique-sanidad">
        <p className="flex flex-wrap items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          <ShieldCheck size={16} aria-hidden="true" /> Plagas y sanidad <SlotPendiente>plagas del grafo en camino</SlotPendiente>
        </p>
        <p className="text-xs leading-snug text-slate-200">{s.resumen}</p>
        <ul className="space-y-1.5">
          {s.puntos.map((p, i) => (
            <li key={i} className="flex gap-1.5 text-xs leading-snug text-slate-300">
              <Leaf size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-emerald-400" />{p}
            </li>
          ))}
        </ul>
      </div>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="fique-ir-suelo"
          onClick={() => onNavigate('salud_suelo')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/15 grid place-items-center">
            <Mountain size={18} className="text-lime-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Cuaderno del suelo</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">El fique aguanta suelos pobres, pero un suelo vivo produce más y mejor fibra.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 3 · El desfibrado ───────────────────────────────────────── */
const ICONO_DESFIBRADO = { corte: Scissors, desfibrado: Feather, lavado: Droplets, secado: Sun, hilado: Sparkles };

function EstacionDesfibrado() {
  return (
    <section className="fique-seccion space-y-4" data-testid="estacion-desfibrado">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#1a2412]/60">
        <FotoFique slug="fibra" alt="Fibra de fique beneficiada y peinada, lista para hilar la cabuya" ratio="aspect-[16/9]" Fallback={Feather}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Scissors size={14} aria-hidden="true" /> El beneficio
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">De la penca verde a la fibra blanca</h3>
          </div>
        </FotoFique>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        Desfibrar es lo que convierte la penca en fibra. De cada hoja sale apenas
        un poquito de fibra —el resto es bagazo y jugo—, así que el trabajo tiene
        su cuidado: sacar bien la hebra y no botar el residuo a la quebrada.
      </p>

      {/* Los pasos del desfibrado, en orden */}
      <ol className="space-y-3" data-testid="fique-desfibrado-pasos">
        {PASOS_DESFIBRADO.map((paso, i) => {
          const Icono = ICONO_DESFIBRADO[paso.icono] || Scissors;
          return (
            <li key={paso.id} className="rounded-2xl border border-slate-700/60 bg-[#1a2412]/50 p-4" data-testid={`desfibrado-${paso.id}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 grid place-items-center relative">
                  <Icono size={18} className="text-emerald-300" />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-[11px] font-black text-[#14210c] grid place-items-center">{i + 1}</span>
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

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400" data-testid="fique-desfibrado-fuente">
        <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
        <span>{DESFIBRADO_FUENTE}</span>
      </p>
    </section>
  );
}

/* ── ESTACIÓN 4 · Usos y cultura ──────────────────────────────────────── */
const ICONO_USO = { empaques: Package, cabuya: Feather, artesania: Shirt, bioinsumo: FlaskConical };

function EstacionUsos({ onNavigate }) {
  return (
    <section className="fique-seccion space-y-4" data-testid="estacion-usos">
      <div className="rounded-2xl border border-emerald-800/40 overflow-hidden bg-[#1a2412]/60">
        <FotoFique slug="artesania" alt="Tejido de fibra de fique para hacer bolsos y mochilas" ratio="aspect-[16/9]" Fallback={Shirt}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Shirt size={14} aria-hidden="true" /> Fibra que es oficio
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">Del costal a la mochila</h3>
          </div>
        </FotoFique>
      </div>

      {/* Usos de la fibra (grounded del catálogo) */}
      <div className="space-y-2.5" data-testid="fique-usos">
        {USOS_FIQUE.map((u) => {
          const Icono = ICONO_USO[u.id] || Feather;
          return (
            <div key={u.id} className="rounded-2xl border border-slate-700/60 bg-[#1a2412]/50 p-4" data-testid={`uso-${u.id}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 grid place-items-center">
                  <Icono size={18} className="text-emerald-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{u.titulo}</p>
                  <p className="text-xs leading-snug text-slate-300 mt-0.5">{u.detalle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Valor cultural y patrimonio */}
      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/15 p-4" data-testid="fique-cultura">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide mb-2">
          <Sparkles size={16} aria-hidden="true" /> Patrimonio vivo
        </p>
        <p className="text-xs leading-snug text-slate-200">{CULTURA_FIQUE}</p>
      </div>

      {/* Guard anti-receta: nada de dosis inventadas (ni del jugo bioinsumo) */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3" data-testid="fique-nota-sin-recetas">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
          <span>{NOTA_SIN_RECETAS}</span>
        </p>
      </div>

      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="fique-ir-mercado"
          onClick={() => onNavigate('mercado')}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 grid place-items-center">
            <Package size={18} className="text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Vender la fibra y la artesanía</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Ofrezca su cabuya, sus costales o su artesanía directo entre fincas.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/* ── ESTACIÓN 5 · Bagazo y jugo ───────────────────────────────────────── */
function EstacionAprovechar({ onNavigate }) {
  const b = BAGAZO_JUGO;
  return (
    <section className="fique-seccion space-y-4" data-testid="estacion-aprovechar">
      {/* Aviso ambiental — el punto número uno del fique */}
      <div className="rounded-2xl border border-rose-700/50 bg-rose-950/25 p-4" data-testid="fique-aviso-agua">
        <p className="flex items-center gap-2 text-sm font-black text-rose-200 leading-tight">
          <Waves size={18} aria-hidden="true" className="shrink-0" /> {b.aviso}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-rose-100/90">{b.avisoDetalle}</p>
      </div>

      <PedagogicalBlock
        icon={Recycle}
        tone="alerta"
        lead="Solo una pizca de la hoja es fibra: casi todo es bagazo y jugo. Ese residuo es abono si se maneja, o contaminación si se bota al agua."
        clave="Cierre el ciclo: el bagazo y el jugo vuelven a la ladera como abono; a la quebrada, nunca."
      >
        <p>
          El bagazo (la carnaza raspada) y el jugo del beneficio tienen mucha carga
          orgánica. Bien manejados, devuelven al suelo lo que la planta sacó; mal
          botados, le quitan el oxígeno al agua y matan la vida de la quebrada.
        </p>
      </PedagogicalBlock>

      {/* Cómo aprovechar el residuo */}
      <div className="space-y-2.5" data-testid="fique-aprovechar">
        {b.aprovechamientos.map((a) => (
          <div key={a.id} className="rounded-2xl border border-lime-800/40 bg-lime-950/15 p-4" data-testid={`aprovechar-${a.id}`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-xl bg-lime-500/15 grid place-items-center">
                <Recycle size={18} className="text-lime-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 leading-tight">{a.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{a.detalle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">Fuente: {b.fuente}.</p>

      {/* Puentes a los mundos hermanos: agua y compost */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="fique-ir-agua"
            onClick={() => onNavigate(b.enlaceMundo)}
            className="w-full flex items-center gap-3 rounded-xl border border-sky-700/50 bg-sky-950/20 p-3 text-left active:bg-sky-900/40 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-sky-500/15 grid place-items-center">
              <Droplets size={18} className="text-sky-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">{b.enlaceLabel}</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Por qué el jugo no va al cauce y cómo cuidar el agua de la finca.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="fique-ir-compost"
            onClick={() => onNavigate(b.enlaceCompostMundo)}
            className="w-full flex items-center gap-3 rounded-xl border border-lime-700/50 bg-lime-900/20 p-3 text-left active:bg-lime-900/40 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-lime-500/20 grid place-items-center">
              <Recycle size={18} className="text-lime-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">{b.enlaceCompostLabel}</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Vaya al mundo del compost: de residuo verde a tierra negra.</span>
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
  if (!CREDITOS_FOTOS_FIQUE.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#1a2412]/50 p-3" data-testid="fique-creditos-fotos">
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
          {CREDITOS_FOTOS_FIQUE.map((cr) => (
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
export default function FiqueScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('planta');

  return (
    <ScreenShell title="El fique y las fibras" icon={Sprout} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="fique-screen">
        {/* Portada breve del mundo */}
        <div className="rounded-2xl border border-emerald-800/40 bg-[#1a2412]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200 leading-tight">
            <Sprout size={18} aria-hidden="true" className="shrink-0" />
            El fique y las fibras, de la ladera a la cabuya
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            El cultivo de ladera del que sale la fibra más colombiana: conocer la
            planta nativa que cuida el suelo, criarla de hijos y bulbillos,
            desfibrar la penca, tejer la cabuya y la artesanía — y aprovechar el
            bagazo y el jugo sin contaminar la quebrada.
          </p>
        </div>

        {/* Navegación entre estaciones (2×3, legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones del fique">
          {ESTACIONES_FIQUE.map((e) => {
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
                    ? 'fique-estacion-activa border-emerald-500/70 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-700 bg-[#1a2412]/50 text-slate-300 active:bg-slate-800/70'
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

        {estacion === 'planta' && <EstacionPlanta />}
        {estacion === 'manejo' && <EstacionManejo onNavigate={onNavigate} />}
        {estacion === 'desfibrado' && <EstacionDesfibrado />}
        {estacion === 'usos' && <EstacionUsos onNavigate={onNavigate} />}
        {estacion === 'aprovechar' && <EstacionAprovechar onNavigate={onNavigate} />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="fique-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo siembro fique en mi ladera y qué hago con el jugo del desfibrado para no contaminar la quebrada?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 grid place-items-center">
              <Sprout size={20} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su ladera es distinta?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su altura y su pendiente.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

import React, { useState } from 'react';
import {
  Wheat, Bean, Carrot, Sprout, Leaf, Bug, Utensils, Flame, CloudRain,
  Camera, ExternalLink, ChevronRight, Hourglass, Handshake,
  ShieldCheck, Ruler, Sparkles, ArrowUp, Package,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  FOTO_BASE_MILPA,
  CREDITOS_FOTOS_MILPA,
  HERMANAS,
  POR_QUE_JUNTAS,
  CIERRE_ASOCIACION,
  VARIEDADES,
  SIEMBRA_PASOS,
  SIEMBRA_DISTANCIAS,
  MANEJO,
  PLAGAS,
  BIOPREPARADOS_MILPA,
  COSECHA,
  NUTRICION_MILPA,
  SECCIONES_MILPA,
} from '../../data/milpaFinca';
import LaminaMaiz from './LaminaMaiz';
import './milpa.css';

/**
 * MilpaScreen — módulo "La milpa: maíz, fríjol y calabaza".
 *
 * La milpa (las "tres hermanas") es la asociación ancestral maíz + fríjol +
 * calabaza sembrados JUNTOS. Tres secciones, un solo relato:
 *   1. Las tres juntas — por qué se ayudan (soporte / nitrógeno / cobertura),
 *      groundeado en la relación COMPATIBLE_WITH del grafo.
 *   2. Sembrarla       — variedades campesinas colombianas (fichas de ciclo) y
 *      el arreglo espacial (maíz primero, fríjol al pie, calabaza en los claros).
 *   3. Cuidarla        — plagas y su control agroecológico (pest_controllers del
 *      grafo, sin dosis químicas), cosecha y el valor nutricional combinado.
 *
 * Patrón "photo-forward" del módulo Agua: foto real de licencia abierta con
 * crédito visible, fallback a ícono, y toda cifra sin fuente se pinta como
 * "dato en camino" (SlotPendiente), nunca inventada.
 */

/* Acentos de color por hermana — sin fijar color de tema, solo Tailwind. */
const TONO = {
  amber: { text: 'text-amber-300', border: 'border-amber-600/40', chipBg: 'bg-amber-500/15', chipTx: 'text-amber-200', ring: 'border-amber-500/70 bg-amber-500/15 text-amber-100' },
  rose: { text: 'text-rose-300', border: 'border-rose-600/40', chipBg: 'bg-rose-500/15', chipTx: 'text-rose-200', ring: 'border-rose-500/70 bg-rose-500/15 text-rose-100' },
  orange: { text: 'text-orange-300', border: 'border-orange-600/40', chipBg: 'bg-orange-500/15', chipTx: 'text-orange-200', ring: 'border-orange-500/70 bg-orange-500/15 text-orange-100' },
};
const ICONO_HERMANA = { maiz: Wheat, frijol: Bean, calabaza: Carrot };
const ICONO_SECCION = { juntas: Handshake, sembrar: Sprout, cuidar: ShieldCheck };

const creditoDe = (slug) => CREDITOS_FOTOS_MILPA.find((c) => c.slug === slug)?.autor || '';

/** Chip honesto para cifras aún sin grounding: promete el dato, no lo inventa. */
function SlotPendiente({ children = null }) {
  return (
    <span
      data-testid="slot-grounded-pendiente"
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300"
    >
      <Hourglass size={11} aria-hidden="true" className="milpa-reloj" />
      {children || 'Dato en camino'}
    </span>
  );
}

/**
 * FotoMilpa — imagen a sangre con scrim inferior fijo, crédito de autor en la
 * esquina y fallback a un ícono. `children` va SOBRE la foto (títulos, stats).
 * El scrim es FIJO (no lo vira el remapeo de temas claros) para que el texto
 * encima quede legible al sol.
 */
function FotoMilpa({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Sprout, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_MILPA}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="milpa-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-slate-700" />
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

/**
 * DiagramaMilpa — ilustración propia (SVG, rsvg-safe) de las tres hermanas
 * juntas: la caña de maíz al centro, el fríjol trepando por ella y la calabaza
 * tapando el suelo. Es el gesto exacto de la asociación, ANIMADO en el orden
 * real de siembra: primero crece el maíz (el tutor), después trepa el fríjol,
 * de último la calabaza se riega por el piso; al final una brisa perpetua mece
 * la mata. Sin foreignObject, sin filtros; el movimiento lo pone milpa.css
 * (solo transform/opacity) y prefers-reduced-motion lo deja todo crecido.
 */
function DiagramaMilpa() {
  return (
    <div className="relative rounded-2xl border border-slate-700/60 bg-gradient-to-b from-sky-950/40 to-emerald-950/30 p-3" data-testid="milpa-diagrama">
      <svg viewBox="0 0 200 150" className="w-full h-auto" role="img" aria-label="Las tres hermanas creciendo en orden: la caña de maíz al centro, el fríjol trepando por ella y la calabaza cubriendo el suelo">
        {/* sol que late, suave */}
        <g className="milpa-sol">
          <circle cx="28" cy="26" r="14" fill="#f2c94c" opacity="0.18" />
          <circle cx="28" cy="26" r="8" fill="#f2c94c" opacity="0.85" />
        </g>
        {/* suelo */}
        <path d="M0 128 h200 v22 h-200 z" fill="#5b3a20" />
        <path d="M0 128 q50 -6 100 0 t100 0 v6 h-200 z" fill="#6b4626" />
        {/* MAÍZ — crece primero; la brisa lo mece desde la base */}
        <g className="milpa-anim-maiz">
          <g className="milpa-brisa">
            {/* caña alta y recta al centro (el tutor) */}
            <path d="M100 130 C 98 96, 102 70, 100 34" stroke="#caa23e" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* hojas del maíz */}
            <g stroke="#8fae3a" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M100 104 q-20 -8 -30 -22" />
              <path d="M100 88 q20 -8 30 -22" />
              <path d="M100 66 q-18 -8 -26 -22" />
            </g>
            {/* penacho del maíz */}
            <g stroke="#e6cf7a" strokeWidth="2" strokeLinecap="round">
              <path d="M100 34 v-12" />
              <path d="M100 30 l-7 -10" />
              <path d="M100 30 l7 -10" />
            </g>
            {/* FRÍJOL — trepa en espiral por la caña, después del maíz */}
            <path
              d="M100 128 q-9 -8 0 -16 q9 -8 0 -16 q-9 -8 0 -16 q9 -8 0 -16 q-9 -8 0 -16 q9 -7 0 -14"
              stroke="#e46a7a" strokeWidth="2.6" fill="none" strokeLinecap="round" className="milpa-anim-frijol"
            />
            {/* hojas y vaina de fríjol: brotan al final */}
            <g className="milpa-anim-brote">
              <g fill="#e46a7a">
                <ellipse cx="90" cy="112" rx="5" ry="3" transform="rotate(-30 90 112)" />
                <ellipse cx="110" cy="88" rx="5" ry="3" transform="rotate(30 110 88)" />
              </g>
              <path d="M108 64 q7 4 6 13" stroke="#c94f60" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </g>
        {/* CALABAZA — de última, se riega desde el centro y tapa el piso */}
        <g className="milpa-anim-calabaza">
          <g stroke="#3f8f4e" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M100 130 q-34 -2 -58 6" />
            <path d="M100 130 q34 -2 58 6" />
            <path d="M70 132 q-8 -6 -18 -4" />
            <path d="M130 132 q8 -6 18 -4" />
          </g>
          {/* hojas anchas de calabaza */}
          <g fill="#4fae5f">
            <ellipse cx="40" cy="134" rx="13" ry="8" transform="rotate(-14 40 134)" />
            <ellipse cx="160" cy="134" rx="13" ry="8" transform="rotate(14 160 134)" />
            <ellipse cx="66" cy="138" rx="9" ry="6" transform="rotate(-6 66 138)" />
          </g>
          {/* flor/fruto de calabaza */}
          <circle cx="36" cy="132" r="5" fill="#f0a92b" />
        </g>
      </svg>
      {/* etiquetas de rol, con su punto de color (aparecen al final) */}
      <div className="milpa-etiquetas mt-1 grid grid-cols-3 gap-1 text-center">
        {HERMANAS.map((h) => (
          <span key={h.id} className={`inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wide ${TONO[h.color].text}`}>
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${TONO[h.color].chipBg} border ${TONO[h.color].border}`} />
            {h.nombre}
          </span>
        ))}
      </div>
      <span className="absolute bottom-1 right-1.5 rounded bg-black/45 px-1 py-0.5 text-[9px] leading-none text-white/60">Ilustración</span>
    </div>
  );
}

/* ── SECCIÓN 1 · Las tres juntas ────────────────────────────────────────── */
const ICONO_ROL = { soporte: ArrowUp, nitrogeno: Sparkles, cobertura: Leaf };
/* Cada rol ES una hermana: la tarjeta hereda su color (misma paleta de TONO).
   Clases literales completas para que el JIT de Tailwind las recoja. */
const TONO_ROL = {
  soporte: { barra: 'bg-amber-500/70', chip: 'bg-amber-500/15', icono: 'text-amber-300' },
  nitrogeno: { barra: 'bg-rose-500/70', chip: 'bg-rose-500/15', icono: 'text-rose-300' },
  cobertura: { barra: 'bg-orange-500/70', chip: 'bg-orange-500/15', icono: 'text-orange-300' },
};

function SeccionJuntas() {
  return (
    <section className="milpa-seccion space-y-4" data-testid="milpa-juntas">
      {/* Hero: la asociación real (maíz-fríjol-calabaza en el mismo lote) */}
      <div className="rounded-2xl border border-amber-700/40 overflow-hidden bg-slate-900/60">
        <FotoMilpa slug="asociacion" alt="Lote de milpa: maíz, fríjol y calabaza creciendo juntos en la misma tierra" ratio="aspect-[16/10]" Fallback={Wheat}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Handshake size={14} aria-hidden="true" /> Las tres hermanas
            </p>
            <h3 className="text-xl font-black tracking-tight text-[#ffffff] leading-tight drop-shadow">Tres matas que se cuidan entre ellas</h3>
          </div>
        </FotoMilpa>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        La milpa no es sembrar tres cosas en el mismo pedazo por ahorrar tierra: es
        que el maíz, el fríjol y la calabaza <strong className="text-amber-200">se necesitan</strong>.
        Cada hermana hace un trabajo que les sirve a las otras dos — por eso el saber campesino
        las junta desde hace miles de años, en Mesoamérica y en los Andes.
      </p>

      {/* Las tres hermanas: identidad */}
      <div className="grid grid-cols-3 gap-2" data-testid="milpa-hermanas">
        {HERMANAS.map((h) => {
          const Icono = ICONO_HERMANA[h.id] || Sprout;
          const t = TONO[h.color];
          return (
            <div key={h.id} className={`milpa-card-viva rounded-2xl border ${t.border} bg-slate-900/60 p-2.5 text-center`} data-testid={`hermana-${h.id}`}>
              <span aria-hidden="true" className={`mx-auto mb-1.5 grid h-10 w-10 place-items-center rounded-xl ${t.chipBg}`}>
                <Icono size={20} className={t.text} />
              </span>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{h.apodo}</p>
              <p className="text-sm font-black text-slate-100 leading-tight">{h.nombre}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${t.text}`}>{h.papel}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-300">{h.resumen}</p>
            </div>
          );
        })}
      </div>

      {/* Diagrama propio de la asociación */}
      <DiagramaMilpa />

      {/* Por qué funcionan juntas: los tres roles, groundeados */}
      <div className="space-y-2.5" data-testid="milpa-por-que">
        {POR_QUE_JUNTAS.map((r) => {
          const Icono = ICONO_ROL[r.icono] || Sprout;
          const tr = TONO_ROL[r.icono] || TONO_ROL.soporte;
          return (
            <div key={r.id} className="milpa-card-viva relative rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5 pl-5" data-testid={`rol-${r.id}`}>
              {/* barra de acento: el color de la hermana que hace este trabajo */}
              <span aria-hidden="true" className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${tr.barra}`} />
              <p className="flex items-start gap-2.5 text-sm font-black text-slate-100 leading-tight">
                <span aria-hidden="true" className={`shrink-0 grid h-8 w-8 place-items-center rounded-lg ${tr.chip}`}>
                  <Icono size={17} className={tr.icono} />
                </span>
                {r.titulo}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{r.detalle}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-snug text-slate-500">
                <ShieldCheck size={11} aria-hidden="true" className="shrink-0 text-emerald-500/70" /> {r.fuente}
              </p>
            </div>
          );
        })}
      </div>

      {/* Cierre: en el plato se completan (puente al valor nutricional) */}
      <PedagogicalBlock icon={Utensils} lead={CIERRE_ASOCIACION.titulo} clave={CIERRE_ASOCIACION.fuente}>
        <p>{CIERRE_ASOCIACION.detalle}</p>
      </PedagogicalBlock>
    </section>
  );
}

/* ── SECCIÓN 2 · Sembrarla ──────────────────────────────────────────────── */
const ICONO_PASO = { lluvia: CloudRain, maiz: Wheat, frijol: Bean, calabaza: Carrot };

function VariedadesGrupo({ crop }) {
  const g = VARIEDADES[crop];
  const t = TONO[g.color];
  const Icono = ICONO_HERMANA[crop] || Sprout;
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5" data-testid={`variedades-${crop}`}>
      <p className={`flex items-center gap-2 text-sm font-black uppercase tracking-wide ${t.text}`}>
        <Icono size={16} aria-hidden="true" /> {g.nombre}
      </p>
      <ul className="mt-2.5 space-y-2">
        {g.items.map((v) => (
          <li key={v.slug} className="milpa-card-viva rounded-xl border border-slate-700/50 bg-slate-950/40 p-2.5 hover:border-slate-600" data-testid={`variedad-${v.slug}`}>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold text-slate-100 leading-tight">{v.nombre}</span>
              <span className="text-[11px] italic text-slate-400">{v.cientifico}</span>
            </p>
            <p className={`mt-0.5 inline-flex items-center gap-1 rounded-full ${t.chipBg} px-2 py-0.5 text-[10px] font-bold ${t.chipTx}`}>{v.piso}</p>
            <p className="mt-1 text-xs leading-snug text-slate-300">{v.nota}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeccionSembrar() {
  return (
    <section className="milpa-seccion space-y-4" data-testid="milpa-sembrar">
      {/* Hero de la técnica: el arreglo de siembra */}
      <div className="rounded-2xl border border-slate-700/60 overflow-hidden bg-slate-900/60">
        <FotoMilpa slug="siembra" alt="Golpe de siembra de las tres hermanas: maíz al centro, con fríjol y calabaza alrededor" ratio="aspect-[16/10]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> El arreglo
            </p>
            <h3 className="text-xl font-black tracking-tight text-[#ffffff] leading-tight drop-shadow">Cada hermana entra a su tiempo</h3>
          </div>
        </FotoMilpa>
      </div>

      {/* Variedades campesinas — grounded en fichas de ciclo */}
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
          <Leaf size={16} aria-hidden="true" className="text-lime-400" /> Variedades de la casa
        </p>
        <VariedadesGrupo crop="maiz" />
        <VariedadesGrupo crop="frijol" />
        <VariedadesGrupo crop="calabaza" />
        <p className="text-[10px] leading-snug text-slate-500">
          Variedades del catálogo de Chagra (ficha de ciclo de cada especie). Escoja las
          adaptadas a su piso térmico y guarde su propia semilla criolla.
        </p>
      </div>

      {/* Lámina botánica de la mata de maíz — conocer sus partes antes de sembrar */}
      <div className="space-y-3" data-testid="milpa-lamina-maiz">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
          <Wheat size={16} aria-hidden="true" className="text-amber-300" /> Conozca la mata de maíz
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          Antes de sembrar, mírela por dentro: la caña con sus nudos, las hojas de lámina y
          vaina, el <strong className="text-amber-200">penacho</strong> (la flor macho de arriba)
          y la <strong className="text-amber-200">mazorca</strong> con sus barbas (la flor hembra)
          donde se arman los granos. Saber cuál parte es cuál ayuda a entender cuándo está el choclo
          y cuándo guardar la semilla.
        </p>
        <LaminaMaiz />
      </div>

      {/* Pasos de siembra: el arreglo espacial y la época */}
      <div className="rounded-2xl border border-emerald-700/40 bg-slate-900/60 p-4">
        <p className="text-sm font-black text-emerald-200 uppercase tracking-wide mb-3">Cómo se arma el golpe de milpa</p>
        <ol className="space-y-3">
          {SIEMBRA_PASOS.map((paso, i) => {
            const Icono = ICONO_PASO[paso.icono] || Sprout;
            return (
              <li key={paso.id} className="relative flex gap-3" data-testid={`paso-${paso.id}`}>
                {/* hilo que une los pasos: la siembra es una secuencia real */}
                {i < SIEMBRA_PASOS.length - 1 && (
                  <span aria-hidden="true" className="absolute left-3.5 top-8 -bottom-3 w-px bg-emerald-500/25" />
                )}
                <span aria-hidden="true" className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black grid place-items-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-100 leading-tight">
                    <Icono size={14} aria-hidden="true" className="text-emerald-300/80" /> {paso.titulo}
                  </p>
                  <p className="text-xs leading-snug text-slate-300 mt-0.5">{paso.detalle}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Distancias orientadoras (método, no norma) */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-2.5" data-testid="milpa-distancias">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
          <Ruler size={16} aria-hidden="true" className="text-sky-300" /> Más o menos a qué distancia
        </p>
        <ul className="space-y-2">
          {SIEMBRA_DISTANCIAS.map((d) => (
            <li key={d.que} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="shrink-0 mt-0.5 inline-flex items-center justify-center min-w-[64px] rounded-lg border border-sky-500/40 bg-sky-500/15 px-1.5 py-0.5 text-xs font-black text-sky-200">
                {d.rango}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-100 leading-tight">{d.que}</span>
                <span className="block text-xs text-slate-300 leading-snug mt-0.5">{d.nota}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Hourglass size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />
          <span>
            Son distancias <strong className="text-slate-300">orientadoras</strong> del método, no una norma:
            la separación fina cambia con la variedad y el suelo{' '}
            <SlotPendiente>distancias por zona en camino</SlotPendiente>.
          </span>
        </p>
      </div>

      {/* Manejo del cultivo */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-3">Mientras crece</p>
        <ul className="space-y-3">
          {MANEJO.map((m) => (
            <li key={m.id} className="flex gap-3">
              <Sprout size={18} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{m.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{m.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── SECCIÓN 3 · Cuidarla (plagas + cosecha + nutrición) ────────────────── */
const TONO_NUTRI = {
  energetico: { chip: 'border-amber-500/40 bg-amber-500/15 text-amber-200', label: 'Energético' },
  proteico: { chip: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200', label: 'Proteico' },
  protector: { chip: 'border-sky-500/40 bg-sky-500/15 text-sky-200', label: 'Protector' },
};

function GrupoPlagas({ grupo }) {
  const t = TONO[grupo.color];
  const Icono = ICONO_HERMANA[grupo.hermana.toLowerCase()] || Bug;
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-3.5" data-testid={`plagas-${grupo.hermana.toLowerCase()}`}>
      <p className={`flex items-center gap-2 text-sm font-black uppercase tracking-wide ${t.text}`}>
        <Icono size={16} aria-hidden="true" /> {grupo.hermana}
      </p>
      <div className="mt-2.5 space-y-2.5">
        {grupo.items.map((p) => (
          <div key={p.id} className="milpa-card-viva rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 hover:border-slate-600" data-testid={`plaga-${p.id}`}>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100 leading-tight">
                <Bug size={14} aria-hidden="true" className="text-rose-300/80" /> {p.plaga}
              </span>
              <span className="text-[11px] italic text-slate-400">{p.cientifico}</span>
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-300"><strong className="text-slate-200">Se ve:</strong> {p.senal}</p>
            <div className="mt-2">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 mb-1">
                <ShieldCheck size={12} aria-hidden="true" /> Quién la controla
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.control.map((c) => (
                  <span key={c} className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeccionCuidar({ onNavigate }) {
  return (
    <section className="milpa-seccion space-y-4" data-testid="milpa-cuidar">
      <PedagogicalBlock
        icon={Bug}
        lead="En la milpa casi no hay que fumigar."
        clave="La calabaza ahoga la maleza y la diversidad de matas confunde a las plagas: menos plaga junta, más bichos buenos."
      >
        <p>
          Cuando las plagas llegan, se manejan con los <strong className="text-emerald-200">controladores biológicos</strong> y
          biopreparados que Chagra ya tiene en el catálogo — no con veneno. Aquí van las plagas más comunes
          de cada hermana y quién las controla. Las dosis y recetas están en el módulo de biopreparados.
        </p>
      </PedagogicalBlock>

      {/* Plagas por hermana, con controladores del grafo (sin dosis químicas) */}
      <div className="space-y-3">
        {PLAGAS.map((grupo) => <GrupoPlagas key={grupo.hermana} grupo={grupo} />)}
        <p className="flex items-center gap-1.5 text-[10px] leading-snug text-slate-500">
          <ShieldCheck size={11} aria-hidden="true" className="shrink-0 text-emerald-500/70" />
          Plagas y controladores del grafo de conocimiento de Chagra (relación CONTROLS). Sin dosis químicas.
        </p>
      </div>

      {/* Biopreparados destacados */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4" data-testid="milpa-biopreparados">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide mb-3">
          <Sparkles size={16} aria-hidden="true" className="text-lime-400" /> Los remedios de la milpa
        </p>
        <ul className="space-y-2">
          {BIOPREPARADOS_MILPA.map((b) => (
            <li key={b.id} className="flex gap-2.5">
              <Sprout size={16} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <p className="text-xs leading-snug text-slate-300">
                <strong className="text-slate-100">{b.nombre}.</strong> {b.para}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Cosecha */}
      <div className="rounded-2xl border border-amber-700/40 bg-slate-900/60 overflow-hidden" data-testid="milpa-cosecha">
        <FotoMilpa slug="maiz" alt="Mazorcas de maíz criollo secándose, listas para guardar" ratio="aspect-[16/9]" Fallback={Wheat}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Package size={14} aria-hidden="true" /> La cosecha
            </p>
            <h3 className="text-xl font-black tracking-tight text-[#ffffff] leading-tight drop-shadow">Cada hermana se recoge a su punto</h3>
          </div>
        </FotoMilpa>
        <div className="p-4 space-y-2.5">
          {COSECHA.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`cosecha-${c.id}`}>
              <p className="text-sm font-bold text-slate-100 leading-tight">{c.titulo}</p>
              <p className="text-xs leading-snug text-slate-300 mt-0.5">{c.detalle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrición combinada — ICBF grounded */}
      <div className="rounded-2xl border border-emerald-700/40 bg-slate-900/60 p-4 space-y-3" data-testid="milpa-nutricion">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Utensils size={16} aria-hidden="true" /> Lo que le da comer
        </p>
        <p className="text-xs leading-snug text-slate-200">
          Maíz + fríjol arman una <strong className="text-emerald-200">proteína completa</strong>: lo que a uno le falta,
          el otro lo tiene. La calabaza le suma la vitamina A. Aporte por 100 gramos:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700/60">
                <th className="py-1.5 pr-2 font-bold">Alimento</th>
                <th className="py-1.5 px-1.5 font-bold text-right">Energía</th>
                <th className="py-1.5 px-1.5 font-bold text-right">Proteína</th>
                <th className="py-1.5 pl-1.5 font-bold text-right">Hierro / Vit. A</th>
              </tr>
            </thead>
            <tbody>
              {NUTRICION_MILPA.items.map((n) => {
                const tn = TONO_NUTRI[n.grupo];
                return (
                  <tr key={n.crop} className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/40" data-testid={`nutri-${n.crop}`}>
                    <td className="py-2 pr-2">
                      <span className="block font-bold text-slate-100 leading-tight">{n.alimento}</span>
                      <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${tn.chip}`}>{tn.label}</span>
                    </td>
                    <td className="py-2 px-1.5 text-right font-black tabular-nums text-slate-100 whitespace-nowrap">{n.energia}<span className="text-[10px] font-bold text-slate-400"> kcal</span></td>
                    <td className="py-2 px-1.5 text-right font-black tabular-nums text-slate-100 whitespace-nowrap">{n.proteina}<span className="text-[10px] font-bold text-slate-400"> g</span></td>
                    <td className="py-2 pl-1.5 text-right whitespace-nowrap">
                      {n.hierro != null && <span className="font-bold text-rose-200">{n.hierro} mg Fe</span>}
                      {n.vitA != null && <span className="font-bold text-sky-200">{n.vitA} ER</span>}
                      {n.hierro == null && n.vitA == null && <SlotPendiente />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">
          Fuente: {NUTRICION_MILPA.fuente} · {NUTRICION_MILPA.unidad}. Celdas vacías = dato que la tabla no reporta.
        </p>
      </div>

      {/* Puente al agente */}
      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="milpa-preguntar-agente"
          onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo siembro la milpa (maíz, fríjol y calabaza juntos) en mi finca?' })}
          className="group w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left transition-colors hover:border-amber-500/50 hover:bg-slate-800/50 active:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
            <Wheat size={20} className="text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su caso es distinto?</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su clima y su tierra.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Agua). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3" data-testid="milpa-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 text-left rounded-lg transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_MILPA.map((cr) => (
            <li key={cr.slug} className="text-[11px] leading-snug text-slate-400">
              <a
                href={cr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5"
              >
                {cr.slug}<ExternalLink size={10} className="inline shrink-0" aria-hidden="true" />
              </a>
              <span className="text-slate-500"> — {cr.autor} · {cr.lic} · Wikimedia Commons</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Pantalla principal ───────────────────────────────────────────────── */
export default function MilpaScreen({ onBack, onNavigate = undefined }) {
  const [seccion, setSeccion] = useState('juntas');

  return (
    <ScreenShell title="La milpa: maíz, fríjol y calabaza" icon={Wheat} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="milpa-screen">
        {/* Portada: la milpa viva + nota de cuaderno */}
        <div className="rounded-2xl border border-slate-700/60 overflow-hidden bg-slate-900/50">
          <FotoMilpa slug="milpaviva" alt="Milpa llena de vida: maíz, fríjol y calabaza en un mismo lote" ratio="aspect-[16/9]" Fallback={Sprout}>
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-lime-200">
                <Flame size={13} aria-hidden="true" /> El cultivo de las tres hermanas
              </p>
              <h2 className="text-2xl font-black tracking-tight text-[#ffffff] leading-tight drop-shadow">Una tierra, tres cosechas que se ayudan</h2>
              {/* las tres hermanas, presentes desde la portada */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {HERMANAS.map((h) => {
                  const IconoChip = ICONO_HERMANA[h.id] || Sprout;
                  return (
                    <span key={h.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONO[h.color].ring}`}>
                      <IconoChip size={11} aria-hidden="true" /> {h.nombre}
                    </span>
                  );
                })}
              </div>
            </div>
          </FotoMilpa>
        </div>

        {/* Navegación entre secciones */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Secciones de la milpa">
          {SECCIONES_MILPA.map((s) => {
            const activo = seccion === s.id;
            const IconoTab = ICONO_SECCION[s.id] || Sprout;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`milpa-tab-${s.id}`}
                onClick={() => setSeccion(s.id)}
                className={`milpa-tab rounded-xl border px-2 py-2.5 text-center min-h-[56px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                  activo
                    ? 'milpa-tab-activa border-amber-500/70 bg-amber-500/15 text-amber-200'
                    : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60 active:bg-slate-800/70'
                }`}
              >
                <IconoTab size={15} aria-hidden="true" className={`mx-auto mb-1 ${activo ? 'text-amber-300' : 'text-slate-500'}`} />
                <span className="block text-sm font-black leading-tight">{s.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-amber-300/90' : 'text-slate-500'}`}>
                  {s.descripcion}
                </span>
                {activo && <span aria-hidden="true" className="milpa-tab-indicador mx-auto mt-1.5 block h-0.5 w-8 rounded-full bg-amber-400/80" />}
              </button>
            );
          })}
        </div>

        {seccion === 'juntas' && <SeccionJuntas />}
        {seccion === 'sembrar' && <SeccionSembrar />}
        {seccion === 'cuidar' && <SeccionCuidar onNavigate={onNavigate} />}

        <CreditosFotos />
      </div>
    </ScreenShell>
  );
}

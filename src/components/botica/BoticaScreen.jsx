import React, { useState } from 'react';
import {
  Leaf, Flower2, Sprout, Sun, Droplets, Mountain, Scissors, HeartPulse,
  ChevronRight, Camera, ExternalLink, TriangleAlert, ShieldCheck, Info,
  FlaskConical, Hand, Stethoscope,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  ESTACIONES_BOTICA,
  PLANTAS_BOTICA,
  plantasDeGrupo,
  DISCLAIMER_BOTICA,
  REGLAS_SEGURIDAD_BOTICA,
  SOL_LABEL,
  AGUA_LABEL,
  PISO_LABEL,
  PROPAGACION_LABEL,
  FOTO_BASE_BOTICA,
  CREDITOS_FOTOS_BOTICA,
} from '../../data/boticaCampesina';
import './botica.css';

/**
 * BoticaScreen — mundo "La botica campesina": la huerta MEDICINAL de la finca
 * andina, contada planta por planta, con vida y fotos reales (patrón
 * photo-forward de CafeScreen/AguaScreen — NO se inventa motor nuevo).
 *
 * ⚖️ DOMINIO DE SALUD — grounding responsable + legal:
 *   · Todo se enmarca como USO TRADICIONAL (saber popular citado), nunca como
 *     medicina, cura ni dosis terapéutica. El disclaimer es visible y se repite.
 *   · El CULTIVO (piso térmico, altitud, sol/sombra, agua, propagación) está
 *     GROUNDEADO en el catálogo Chagra (species + species_thermal_zones); cada
 *     ficha lleva su `catalogId` real.
 *   · Solo especies que existen en el catálogo/grafo. Complementa —no duplica—
 *     el mundo "Aromáticas y condimentarias" (la huerta de la cocina): aquí va
 *     la BOTICA medicinal; el poleo se queda en la cocina. La yerbabuena aparece
 *     en ambos mundos SIN duplicar: en la cocina, su uso culinario; aquí, su lado
 *     de botica, con un `cruce` que remite a la cocina y el aviso de no confundirla
 *     con el poleo (abortivo).
 *
 * Cinco estaciones (pestañas):
 *   1. Barriga y nervios — digestivas y calmantes (manzanilla, cidrón, toronjil, yerbabuena).
 *   2. Piel y heridas     — uso externo (caléndula, llantén).
 *   3. Gripa y tónico     — pecho y sangre (saúco, ortiga).
 *   4. Cultivar la botica — piso térmico, cosecha de hoja/flor y secado.
 *   5. Con cuidado        — la ruda (planta de respeto) + reglas de seguridad.
 */

/* ── Chip "USO TRADICIONAL" (marca honesta: saber popular, no medicina) ──── */
function ChipUsoTradicional() {
  return (
    <span
      data-testid="chip-uso-tradicional"
      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-200"
    >
      <Leaf size={11} aria-hidden="true" /> Uso tradicional
    </span>
  );
}

/* ── Fotos reales (licencia abierta) — patrón "photo-forward" de Café ────── */
const creditoDe = (slug) => CREDITOS_FOTOS_BOTICA.find((c) => c.slug === slug)?.autor || '';

function FotoBotica({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Leaf, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-[#182016] ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_BOTICA}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="botica-foto absolute inset-0 w-full h-full object-cover"
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

/* ── Datos de cultivo GROUNDED (del catálogo) en pastillas legibles ─────── */
function PastillasCultivo({ g }) {
  const sol = SOL_LABEL[g.sol];
  const agua = AGUA_LABEL[g.agua];
  const pisos = (g.pisos || []).map((p) => PISO_LABEL[p] || p).join(' · ');
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="botica-cultivo-grounded">
      <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
          <Mountain size={12} aria-hidden="true" /> Piso térmico
        </p>
        <p className="text-xs font-bold text-slate-100 leading-tight mt-0.5">{pisos}</p>
        {Array.isArray(g.altitudOpt) && (
          <p className="text-[10px] text-slate-400 leading-tight">{g.altitudOpt[0]}–{g.altitudOpt[1]} msnm</p>
        )}
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-300">
          <Sun size={12} aria-hidden="true" /> Sol
        </p>
        <p className="text-xs font-bold text-slate-100 leading-tight mt-0.5">{sol?.txt || g.sol}</p>
        <p className="text-[10px] text-slate-400 leading-tight">{sol?.detalle}</p>
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-sky-300">
          <Droplets size={12} aria-hidden="true" /> Agua
        </p>
        <p className="text-xs font-bold text-slate-100 leading-tight mt-0.5">{agua?.txt || g.agua}</p>
        <p className="text-[10px] text-slate-400 leading-tight">{agua?.detalle}</p>
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-2">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-lime-300">
          <Sprout size={12} aria-hidden="true" /> Se siembra
        </p>
        <p className="text-xs font-bold text-slate-100 leading-tight mt-0.5">{PROPAGACION_LABEL[g.propagacion] || 'Por semilla o gajo'}</p>
      </div>
    </div>
  );
}

/* ── Ficha de una planta de la botica (tarjeta photo-forward) ───────────── */
function PlantaCard({ planta }) {
  const p = planta;
  const peligrosa = p.grupo === 'cuidado';
  return (
    <article
      className={`rounded-2xl border overflow-hidden ${peligrosa ? 'border-rose-700/50 bg-rose-950/20' : 'border-emerald-900/40 bg-[#141b12]/60'}`}
      data-testid={`planta-${p.slug}`}
    >
      <FotoBotica
        slug={p.slug}
        alt={`${p.nombre} (${p.cientifico}) en la huerta medicinal`}
        ratio="aspect-[16/9]"
        Fallback={peligrosa ? TriangleAlert : Flower2}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-center gap-2">
            {peligrosa ? <TriangleAlert size={14} className="text-rose-200" aria-hidden="true" /> : <ChipUsoTradicional />}
          </div>
          <h3 className="mt-1 text-xl font-black text-white leading-tight drop-shadow">{p.nombre}</h3>
          <p className="text-[11px] italic text-white/70 leading-tight">{p.cientifico} · {p.familia}</p>
        </div>
      </FotoBotica>

      <div className="p-4 space-y-3">
        {/* Otros nombres de la mata */}
        {p.regionales?.length > 0 && (
          <p className="text-[11px] leading-snug text-slate-400">
            <span className="font-bold text-slate-300">También le dicen:</span> {p.regionales.join(', ')}.
          </p>
        )}

        {/* Cruce honesto: mata que también vive en la huerta de la cocina
            (misma especie, otro uso). Remite sin duplicar el contenido. */}
        {p.cruce && (
          <p
            className="flex items-start gap-1.5 rounded-lg border border-sky-800/40 bg-sky-950/20 p-2 text-[11px] leading-snug text-sky-100/90"
            data-testid={`cruce-${p.slug}`}
          >
            <Sprout size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />
            <span><span className="font-bold text-sky-200">También vive en {p.cruce.mundo}:</span> {p.cruce.nota}</span>
          </p>
        )}

        {/* Para qué se usa TRADICIONALMENTE (parte usada + uso) */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300 mb-1.5">
            <HeartPulse size={14} aria-hidden="true" /> Para qué se usa tradicionalmente
          </p>
          {p.parteUsada && p.parteUsada !== '—' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-200 mb-1.5">
              <Leaf size={10} aria-hidden="true" /> Se usa: {p.parteUsada}
            </span>
          )}
          <p className="text-sm leading-snug text-slate-200">{p.usoTradicional}</p>
          {p.comoSePrepara && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
              <Info size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
              <span><span className="font-bold text-slate-300">En la casa:</span> {p.comoSePrepara}</span>
            </p>
          )}
        </div>

        {/* Veto de seguridad honesto (cuando la mata lo pide) */}
        {p.veto && (
          <div className="rounded-lg border border-rose-600/50 bg-rose-950/30 p-2.5" data-testid={`veto-${p.slug}`}>
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-rose-100">
              <TriangleAlert size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-rose-300" />
              <span><span className="font-black uppercase tracking-wide">Cuidado:</span> {p.veto}</span>
            </p>
          </div>
        )}

        {/* Cómo se cultiva (GROUNDED del catálogo) */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-lime-300 mb-2">
            <Sprout size={14} aria-hidden="true" /> Cómo se cultiva
          </p>
          <PastillasCultivo g={p.grounded} />
          {p.grounded?.propagacionNota && (
            <p className="mt-2 text-[11px] leading-snug text-slate-400">{p.grounded.propagacionNota}</p>
          )}
        </div>

        {/* Qué y cómo se cosecha */}
        {p.cosecha && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-300 mb-1">
              <Scissors size={14} aria-hidden="true" /> Cosecha
            </p>
            <p className="text-xs leading-snug text-slate-300">{p.cosecha}</p>
          </div>
        )}

        <p className="text-[10px] leading-snug text-slate-500">
          Cultivo groundeado en el catálogo Chagra (piso térmico, luz, agua, propagación). Usos: saber popular campesino.
        </p>
      </div>
    </article>
  );
}

/* ── Estación por grupo (renderiza las plantas del grupo) ───────────────── */
/**
 * @param {{ grupo: string, icon: import('lucide-react').LucideIcon,
 *   tituloHero: React.ReactNode, lead: React.ReactNode, clave: React.ReactNode,
 *   tone?: 'neutral' | 'alerta' }} props
 */
function EstacionGrupo({ grupo, icon: Icono, tituloHero, lead, clave, tone = 'neutral' }) {
  const plantas = plantasDeGrupo(grupo);
  return (
    <section className="botica-seccion space-y-4" data-testid={`estacion-${grupo}`}>
      <PedagogicalBlock icon={Icono} tone={tone} lead={lead} clave={clave}>
        <p>{tituloHero}</p>
      </PedagogicalBlock>
      {plantas.map((p) => <PlantaCard key={p.slug} planta={p} />)}
    </section>
  );
}

/* ── ESTACIÓN 4 · Cultivar la botica (resumen grounded de todas) ────────── */
function EstacionCultivo() {
  return (
    <section className="botica-seccion space-y-4" data-testid="estacion-cultivo">
      <PedagogicalBlock
        icon={Sprout}
        lead="La botica se cultiva como cualquier huerta: cada mata pide su piso térmico, su sol y su agua — y casi todas se dan solas si les da el clima."
        clave="Coseche en día seco y de sol, seque a la SOMBRA (el sol fuerte les quita el aroma y el color) y guarde en frasco tapado, lejos de la luz y la humedad."
      >
        <p>
          Estos datos de cultivo salen del catálogo Chagra (piso térmico, altitud,
          sol y agua de cada especie). Escoja las que le den en su altura y ármese
          su rincón de aromáticas medicinales cerca de la cocina, a la mano.
        </p>
      </PedagogicalBlock>

      {/* Tabla-resumen del piso térmico de cada mata (grounded) */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#141b12]/50 overflow-hidden" data-testid="botica-tabla-cultivo">
        <div className="p-3 border-b border-slate-700/60">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
            <Mountain size={16} aria-hidden="true" /> Qué mata en qué clima
          </p>
        </div>
        <div className="divide-y divide-slate-800/60">
          {PLANTAS_BOTICA.map((p) => {
            const g = p.grounded;
            const pisos = (g.pisos || []).map((x) => PISO_LABEL[x] || x).join(' · ');
            return (
              <div key={p.slug} className="flex items-center gap-3 p-3" data-testid={`cultivo-fila-${p.slug}`}>
                <span aria-hidden="true" className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 grid place-items-center text-base">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{p.nombre}</p>
                  <p className="text-[11px] text-slate-400 leading-tight">{pisos}{Array.isArray(g.altitudOpt) ? ` · ${g.altitudOpt[0]}–${g.altitudOpt[1]} msnm` : ''}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Sun size={12} aria-hidden="true" className="text-amber-400" /> {SOL_LABEL[g.sol]?.txt || g.sol}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cómo secar y guardar (común a toda la botica) */}
      <div className="rounded-2xl border border-amber-800/40 bg-[#141b12]/50 p-4 space-y-2" data-testid="botica-secado">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide">
          {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- título de contenido campesino, migración i18n pendiente para todo el mundo (ADR-050, ver header de boticaCampesina.js) */}
          <Scissors size={16} aria-hidden="true" /> Cosechar, secar y guardar
        </p>
        <ul className="space-y-2 text-xs leading-snug text-slate-300">
          <li className="flex gap-2"><Leaf size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-lime-400" /><span><span className="font-bold text-slate-100">Coseche en punto:</span> la hoja tierna antes de florecer; la flor bien abierta, en día seco y de sol.</span></li>
          <li className="flex gap-2"><Sun size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" /><span><span className="font-bold text-slate-100">Seque a la sombra:</span> extendida y aireada, o colgada en manojos. El sol directo quema el aroma y el color.</span></li>
          <li className="flex gap-2"><FlaskConical size={14} aria-hidden="true" className="shrink-0 mt-0.5 text-emerald-400" /><span><span className="font-bold text-slate-100">Guarde seco:</span> en frasco de vidrio tapado, rotulado, lejos de la luz y la humedad, para que no críe moho.</span></li>
        </ul>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 5 · Con cuidado (seguridad + la planta de respeto) ────────── */
function EstacionCuidado({ onNavigate }) {
  const ruda = PLANTAS_BOTICA.find((p) => p.slug === 'ruda');
  return (
    <section className="botica-seccion space-y-4" data-testid="estacion-cuidado">
      {/* Disclaimer central del mundo, repetido aquí bien visible */}
      <div className="rounded-2xl border border-amber-600/50 bg-amber-950/25 p-4" data-testid="botica-disclaimer">
        <p className="flex items-center gap-2 text-sm font-black text-amber-200 uppercase tracking-wide mb-1.5">
          <Stethoscope size={16} aria-hidden="true" /> Saber tradicional, no medicina
        </p>
        <p className="text-xs leading-relaxed text-amber-50/90">{DISCLAIMER_BOTICA}</p>
      </div>

      {/* Reglas de seguridad honestas */}
      <div className="rounded-2xl border border-slate-700/60 bg-[#141b12]/50 p-4 space-y-3" data-testid="botica-reglas">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
          <ShieldCheck size={16} aria-hidden="true" className="text-emerald-300" /> Reglas de la casa
        </p>
        <ul className="space-y-2.5">
          {REGLAS_SEGURIDAD_BOTICA.map((r) => (
            <li key={r.id} className="flex gap-3" data-testid={`regla-${r.id}`}>
              <Info size={16} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{r.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{r.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* La planta de respeto: la ruda, con su veto fuerte */}
      <div>
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-rose-300 mb-2">
          <TriangleAlert size={14} aria-hidden="true" /> La planta de respeto
        </p>
        {ruda && <PlantaCard planta={ruda} />}
      </div>

      {/* Puente al agente para dudas concretas de salud → derivar al profesional */}
      {typeof onNavigate === 'function' && (
        <button
          type="button"
          data-testid="botica-ir-agente"
          onClick={() => onNavigate('agente', { prefilledPrompt: '¿Para qué se usa tradicionalmente la manzanilla y cómo la cultivo en mi finca?' })}
          className="w-full flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-left active:bg-slate-800/60 transition-colors"
        >
          <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 grid place-items-center">
            <Leaf size={18} className="text-emerald-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Pregúntele al agente por una mata</span>
            <span className="block text-xs text-slate-400 leading-tight mt-0.5">Él conoce su clima y su altura. Para una dolencia, siempre el médico primero.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Café). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (!CREDITOS_FOTOS_BOTICA.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#141b12]/50 p-3" data-testid="botica-creditos-fotos">
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
          {CREDITOS_FOTOS_BOTICA.map((cr) => (
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
export default function BoticaScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('barriga');

  return (
    <ScreenShell title="La botica campesina" icon={Leaf} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="botica-screen">
        {/* Portada breve del mundo + disclaimer siempre visible */}
        <div className="rounded-2xl border border-emerald-800/40 bg-[#141b12]/50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200 leading-tight">
            <Flower2 size={18} aria-hidden="true" className="shrink-0" />
            La huerta que cura de la finca andina
          </p>
          <p className="mt-1.5 text-xs italic leading-snug text-slate-400">
            Las plantas medicinales de la casa —caléndula, manzanilla, toronjil, cidrón,
            yerbabuena, saúco, ortiga, llantén— contadas por su uso tradicional y por cómo se
            cultivan y se cosechan. Complementa la huerta de aromáticas de la cocina: esto es la botica.
          </p>
          <div className="mt-2.5 rounded-lg border border-amber-600/40 bg-amber-950/20 p-2.5">
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
              <Stethoscope size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-300" />
              <span><span className="font-black">Saber tradicional, no medicina.</span> Estas plantas acompañan molestias leves; no curan enfermedades ni reemplazan al médico. En embarazo, con niños o si toma remedios, consulte a un profesional de la salud.</span>
            </p>
          </div>
        </div>

        {/* Navegación entre estaciones (2×3 / 5 columnas, legible al sol) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="tablist" aria-label="Estaciones de la botica">
          {ESTACIONES_BOTICA.map((e) => {
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
                    ? 'botica-estacion-activa border-emerald-500/70 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-700 bg-[#141b12]/50 text-slate-300 active:bg-slate-800/70'
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

        {estacion === 'barriga' && (
          <EstacionGrupo
            grupo="barriga"
            icon={HeartPulse}
            tituloHero="Las aromáticas de la casa: se toman en agua de tiempo después de comer, para el estómago pesado y los gases, y en la noche para calmar los nervios y ayudar a dormir."
            lead="La manzanilla, el cidrón, el toronjil y la yerbabuena son las aguas aromáticas de toda cocina campesina."
            clave="Son aguas para acompañar una molestia pasajera, no un tratamiento. Se toman con medida y de vez en cuando."
          />
        )}
        {estacion === 'piel' && (
          <EstacionGrupo
            grupo="piel"
            icon={Hand}
            tituloHero="La caléndula y el llantén se usan sobre todo POR FUERA: agua para lavar la piel irritada y hojas o flores en cataplasma sobre raspones y picaduras."
            lead="La botica de la piel es de uso externo: lavar, refrescar, acompañar la cicatrización."
            clave="Una herida seria (profunda, que no cierra, con pus o fiebre) es para el puesto de salud, no para la cataplasma."
          />
        )}
        {estacion === 'gripa' && (
          <EstacionGrupo
            grupo="gripa"
            icon={Droplets}
            tone="alerta"
            tituloHero="El saúco (solo la flor) se toma bien caliente cuando llega la gripa, para el pecho y la tos; la ortiga se usa como tónico 'para la sangre' y como alimento y abono."
            lead="Para el pecho y las defensas — con el respeto de conocer bien la mata y la parte correcta."
            clave="Del saúco solo la flor; la ortiga siempre cocida o seca. La gripa con fiebre alta, sobre todo en niños, es del médico."
          />
        )}
        {estacion === 'cultivo' && <EstacionCultivo />}
        {estacion === 'cuidado' && <EstacionCuidado onNavigate={onNavigate} />}

        {/* Créditos de todas las fotos del mundo (cumplimiento licencia abierta) */}
        <CreditosFotos />
      </div>
    </ScreenShell>
  );
}

import React, { useMemo, useState } from 'react';
import {
  Leaf, Sprout, Sun, Droplets, Mountain, Utensils, Scissors, Package,
  Bug, Flower2, TriangleAlert, ChevronDown, Camera, ExternalLink,
  ChevronRight, CookingPot,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import {
  AROMATICAS,
  FOTO_BASE_AROMATICAS,
  CREDITOS_FOTOS_AROMATICAS,
  SOL_LABEL,
  AGUA_LABEL,
  PISO_LABEL,
  PROPAGACION_LABEL,
} from '../../data/aromaticasHuerta';

/**
 * AromaticasScreen — mundo "Aromáticas y condimentarias" (la huerta de la
 * cocina campesina). Sigue el patrón PHOTO-FORWARD de AguaScreen/EstiercolScreen:
 * foto real (Wikimedia Commons, licencia abierta) + crédito visible + fallback
 * a ícono. Nada de motor nuevo: mismas piezas de UI de las otras pantallas.
 *
 * Cada hierba es una tarjeta con foto que se despliega en una ficha con dos
 * caras honestas:
 *   · COCINA  — para qué sirve en el fogón campesino (sin claims medicinales).
 *   · CULTIVO — cómo sembrarla, su piso térmico, sol/agua y con quién se lleva.
 *     Toda cifra dura de cultivo sale del catálogo Chagra (grounded), no se
 *     inventa; si el catálogo no la trae, se dice honestamente en vez de rellenar.
 */

/* ── Foto real (licencia abierta) — patrón "photo-forward" ────────────────
 * Igual que FotoAgua: imagen a sangre, scrim inferior FIJO (no lo vira el
 * remapeo de temas claros) para legibilidad al sol, crédito de autor en la
 * esquina y fallback a un ícono si la foto no carga. */
const creditoDe = (slug) => CREDITOS_FOTOS_AROMATICAS.find((c) => c.slug === slug)?.autor || '';

function FotoAromatica({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Leaf, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_AROMATICAS}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-slate-700" />
        </div>
      )}
      {/* scrim fijo para el texto/crédito encima de cualquier foto */}
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

/** Chip pequeño con ícono para las condiciones de cultivo (piso, sol, agua). */
function ChipDato({ Icon, children, tono = 'text-emerald-200 border-emerald-600/40 bg-emerald-900/25' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tono}`}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Fila de bloque con encabezado a ícono (cocina, siembra, vecinas, cosecha). */
function BloqueFicha({ Icon, titulo, tono, children }) {
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wide ${tono} mb-1.5`}>
        {Icon && <Icon size={14} aria-hidden="true" />} {titulo}
      </p>
      <div className="text-sm leading-snug text-slate-200/90 space-y-1.5">{children}</div>
    </div>
  );
}

/** Rango de altitud groundeado, en texto campesino. */
function textoAltitud(a) {
  if (!a) return null;
  return `Se da mejor entre ${a.optMin.toLocaleString('es-CO')} y ${a.optMax.toLocaleString('es-CO')} metros sobre el mar.`;
}

/* ── Ficha desplegable de una aromática ───────────────────────────────── */
function FichaAromatica({ item, abierta, onToggle }) {
  const g = item.grounded || {};
  const sol = g.sol ? SOL_LABEL[g.sol] : null;
  const agua = g.agua ? AGUA_LABEL[g.agua] : null;
  const prop = g.propagacion;

  return (
    <section
      className="rounded-2xl border border-emerald-800/40 bg-slate-900/50 overflow-hidden"
      data-testid={`ficha-${item.slug}`}
    >
      {/* Cabecera photo-forward: la foto ES el botón que abre la ficha */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        data-testid={`ficha-toggle-${item.slug}`}
        className="block w-full text-left"
      >
        <FotoAromatica
          slug={item.slug}
          alt={`${item.nombre} (${item.cientifico}) creciendo en la huerta`}
          ratio="aspect-[16/9]"
          Fallback={Leaf}
        >
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <span aria-hidden="true">{item.emoji}</span> {item.familia}
            </p>
            <h3 className="text-xl font-black text-white leading-tight drop-shadow">{item.nombre}</h3>
            <p className="text-xs text-emerald-100/90 leading-snug mt-0.5">{item.hook}</p>
          </div>
          <span className="absolute top-2.5 right-2.5 rounded-full bg-black/45 p-1.5 text-white/85">
            <ChevronDown
              size={18}
              className={`transition-transform ${abierta ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
        </FotoAromatica>
      </button>

      {abierta && (
        <div className="p-4 space-y-4">
          {/* Nombre científico + chips de cultivo groundeados del catálogo */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] italic text-slate-400 mr-1">{item.cientifico}</span>
            {(g.pisos || []).map((p) => (
              <ChipDato key={p} Icon={Mountain} tono="text-amber-200 border-amber-600/40 bg-amber-900/25">
                {PISO_LABEL[p] || p}
              </ChipDato>
            ))}
            {sol && <ChipDato Icon={Sun} tono="text-yellow-100 border-yellow-600/40 bg-yellow-900/20">{sol.txt}</ChipDato>}
            {agua && <ChipDato Icon={Droplets} tono="text-cyan-100 border-cyan-600/40 bg-cyan-900/25">{agua.txt}</ChipDato>}
          </div>

          {/* COCINA */}
          <BloqueFicha Icon={CookingPot} titulo="En la cocina" tono="text-orange-300">
            <p>{item.cocina}</p>
          </BloqueFicha>

          {/* Veto de seguridad honesto, solo si lo hay (poleo) */}
          {item.veto && (
            <div className="rounded-xl border border-rose-600/40 bg-rose-900/20 p-3">
              <p className="flex items-start gap-2 text-xs leading-snug text-rose-100">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
                <span>{item.veto}</span>
              </p>
            </div>
          )}

          {/* CULTIVO — cómo sembrarla */}
          <BloqueFicha Icon={Sprout} titulo="Cómo sembrarla" tono="text-emerald-300">
            <ol className="space-y-1.5">
              {item.siembra.map((paso, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full grid place-items-center text-[11px] font-black bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">
                    {i + 1}
                  </span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
            {/* Condiciones groundeadas del catálogo (o nota honesta si faltan) */}
            <div className="mt-2 rounded-lg border border-slate-700/50 bg-slate-950/40 p-2.5 space-y-1">
              {textoAltitud(g.altitud) && (
                <p className="flex items-start gap-1.5 text-xs text-slate-300">
                  <Mountain size={13} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                  {textoAltitud(g.altitud)}
                </p>
              )}
              {sol && (
                <p className="flex items-start gap-1.5 text-xs text-slate-300">
                  <Sun size={13} className="mt-0.5 shrink-0 text-yellow-300" aria-hidden="true" />
                  <span><strong className="text-slate-100">{sol.txt}:</strong> {sol.detalle}</span>
                </p>
              )}
              {agua && (
                <p className="flex items-start gap-1.5 text-xs text-slate-300">
                  <Droplets size={13} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden="true" />
                  <span><strong className="text-slate-100">{agua.txt}:</strong> {agua.detalle}</span>
                </p>
              )}
              {prop && (
                <p className="flex items-start gap-1.5 text-xs text-slate-300">
                  <Sprout size={13} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <span><strong className="text-slate-100">{PROPAGACION_LABEL[prop.metodo] || 'Propagación'}:</strong> {prop.nota}</span>
                </p>
              )}
              {!sol && !agua && !prop && (
                <p className="text-[11px] italic leading-snug text-slate-400">
                  El catálogo la ubica por clima y altura, pero todavía no trae sus
                  datos exactos de sol, agua y propagación: no los inventamos aquí.
                </p>
              )}
            </div>
          </BloqueFicha>

          {/* BUENAS VECINAS (asociaciones del catálogo) */}
          <BloqueFicha Icon={Flower2} titulo="Buenas vecinas" tono="text-lime-300">
            <p className="flex items-start gap-1.5">
              <Bug size={14} className="mt-0.5 shrink-0 text-lime-300" aria-hidden="true" />
              <span>{item.vecinas.buenas}</span>
            </p>
            {item.vecinas.ojo && (
              <p className="flex items-start gap-1.5 text-amber-200/90">
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                <span><strong>Ojo:</strong> {item.vecinas.ojo}</span>
              </p>
            )}
          </BloqueFicha>

          {/* COSECHA Y CONSERVACIÓN */}
          <BloqueFicha Icon={Scissors} titulo="Cosecha y conservación" tono="text-teal-300">
            <p className="flex items-start gap-1.5">
              <Scissors size={14} className="mt-0.5 shrink-0 text-teal-300" aria-hidden="true" />
              <span>{item.cosecha}</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Package size={14} className="mt-0.5 shrink-0 text-teal-300" aria-hidden="true" />
              <span>{item.conservacion}</span>
            </p>
          </BloqueFicha>
        </div>
      )}
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Agua). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  if (CREDITOS_FOTOS_AROMATICAS.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3" data-testid="aromaticas-creditos-fotos">
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
          {CREDITOS_FOTOS_AROMATICAS.map((cr) => (
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
export default function AromaticasScreen({ onBack, onNavigate = undefined }) {
  // La primera ficha (cilantro) arranca abierta: da ejemplo de cómo se lee.
  const [abierta, setAbierta] = useState(AROMATICAS[0]?.slug || null);
  const total = useMemo(() => AROMATICAS.length, []);

  return (
    <ScreenShell title="Aromáticas y condimentarias" icon={Leaf} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="aromaticas-screen">
        {/* Portada / intro del mundo */}
        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
            <Leaf size={14} aria-hidden="true" /> La huerta de la cocina
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-100 leading-snug">
            Las matas que le dan sabor a la olla
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200/90">
            La huerta de aromáticas es la despensa de sabor de la casa: un puñado
            de matas cerca del fogón que sazonan el guiso, espantan plagas de las
            otras siembras y no cuestan casi nada. Aquí van las {total} más comunes
            de la cocina campesina — para qué sirven y cómo sembrarlas.
          </p>
        </div>

        {/* Las fichas photo-forward */}
        <div className="space-y-3">
          {AROMATICAS.map((item) => (
            <FichaAromatica
              key={item.slug}
              item={item}
              abierta={abierta === item.slug}
              onToggle={() => setAbierta((cur) => (cur === item.slug ? null : item.slug))}
            />
          ))}
        </div>

        {/* Créditos de las fotos (licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el módulo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="aromaticas-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Qué aromáticas de cocina puedo sembrar en mi clima y con qué se llevan bien?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 grid place-items-center">
              <Utensils size={20} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Quiere otra hierba o duda de su clima?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca y su altura.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  FlaskConical, Sprout, Leaf, Bug, ShieldCheck, ShieldPlus, Layers,
  ShieldAlert, Clock, ScrollText, ChevronDown, Camera, ExternalLink,
  AlertCircle, Droplets, Hourglass, Repeat, HardHat, Ban,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import { getAllBiopreparados } from '../../db/catalogDB';
import { getDiagramaBiopreparado, iconoIngrediente } from '../../data/biopreparado-diagramas';
import {
  FOTO_BASE_BIOPREPARADOS,
  CATEGORIAS_BIOPREPARADO,
  categoriaDeBiopreparado,
  PROPOSITO_LABEL,
  PPE_LABEL,
  DO_NOT_USE_LABEL,
  SAFETY_LABEL,
  CREDITOS_FOTOS_BIOPREPARADOS,
  creditoFotoBiopreparado,
  tieneFotoBiopreparado,
  fichaMeta,
} from '../../data/biopreparadosFichas';
import './biopreparados.css';

/**
 * BiopreparadosScreen — mundo "Biopreparados" (Sanidad de la mata): fichas
 * didácticas photo-forward de caldos, purines, biofermentos y extractos, para
 * proteger o nutrir la mata sin veneno.
 *
 * PATRÓN (heredado de AguaScreen / módulo Suelo): foto real de licencia abierta
 * a sangre + scrim oscuro FIJO (legible al sol) + crédito de autor visible +
 * fallback a ícono si la foto no carga. NO se inventa un motor nuevo.
 *
 * GROUNDING — cero fabricación: la ficha se arma con el catálogo
 * (catalog/biopreparados-seed.json → getAllBiopreparados): ingredientes, dosis,
 * tiempo, precauciones, EPP, vetos, tiempo de reingreso y fuente. Los pasos
 * salen del overlay curado (biopreparado-diagramas.js), que RE-EXPRESA el mismo
 * catálogo. La glosa "para qué sirve" (biopreparadosFichas.js) solo nombra
 * objetivos que aparecen textuales en el `uso`/`dosis` del catálogo.
 */

const ORDEN_TIPO = Object.fromEntries(CATEGORIAS_BIOPREPARADO.map((c, i) => [c.tipo, i]));

/** Ícono + color por familia de propósito (`k` de PROPOSITO_LABEL). */
const FUNCION_STYLE = {
  nutre: { Icon: Sprout, cls: 'border-emerald-600/40 bg-emerald-500/15 text-emerald-200' },
  vida: { Icon: Leaf, cls: 'border-lime-600/40 bg-lime-500/15 text-lime-200' },
  repele: { Icon: Bug, cls: 'border-amber-600/40 bg-amber-500/15 text-amber-200' },
  previene: { Icon: ShieldCheck, cls: 'border-sky-600/40 bg-sky-500/15 text-sky-200' },
  cura: { Icon: ShieldPlus, cls: 'border-rose-600/40 bg-rose-500/15 text-rose-200' },
  enmienda: { Icon: Layers, cls: 'border-violet-600/40 bg-violet-500/15 text-violet-200' },
};

/** Estilo del semáforo de seguridad por tono. */
const SAFETY_STYLE = {
  bajo: { cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200', Icon: ShieldCheck },
  medio: { cls: 'border-amber-500/50 bg-amber-500/15 text-amber-200', Icon: ShieldAlert },
  alto: { cls: 'border-rose-500/50 bg-rose-500/15 text-rose-200', Icon: ShieldAlert },
  revisar: { cls: 'border-slate-500/50 bg-slate-500/15 text-slate-300', Icon: Hourglass },
};

/**
 * FotoBiopreparado — imagen real a sangre con scrim inferior FIJO (no lo vira el
 * tema claro), crédito de autor en la esquina y fallback a ícono. `children` va
 * SOBRE la foto (título, chips). Espejo de FotoAgua.
 */
function FotoBiopreparado({ slug, alt, ratio = 'aspect-[16/9]', Fallback = FlaskConical, children = null }) {
  const [ok, setOk] = useState(tieneFotoBiopreparado(slug));
  const credito = creditoFotoBiopreparado(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${ratio}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_BIOPREPARADOS}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="bio-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-800 to-slate-950" aria-hidden="true">
          <IconoFallback size={40} className="text-slate-600" />
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

/** Pastillas de "para qué sirve" derivadas del `proposito` del catálogo. */
function FuncionChips({ proposito = [] }) {
  const chips = proposito.map((p) => PROPOSITO_LABEL[p]).filter(Boolean);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="bio-funcion-chips">
      {chips.map((c) => {
        const st = FUNCION_STYLE[c.k] || FUNCION_STYLE.nutre;
        const { Icon } = st;
        return (
          <span key={c.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>
            <Icon size={11} aria-hidden="true" />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

/** Semáforo de seguridad (safety_class del catálogo). */
function SafetyBadge({ safetyClass }) {
  const meta = SAFETY_LABEL[safetyClass] || SAFETY_LABEL.revisar;
  const st = SAFETY_STYLE[meta.tone] || SAFETY_STYLE.revisar;
  const { Icon } = st;
  return (
    <span
      data-testid={`bio-safety-${meta.tone}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.cls}`}
    >
      <Icon size={11} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Stepper vertical de preparación (pasos del overlay curado del catálogo). */
function PasosPreparacion({ pasos }) {
  return (
    <ol className="space-y-0" data-testid="bio-pasos">
      {pasos.map((paso, idx) => {
        const isLast = idx === pasos.length - 1;
        return (
          <li key={paso.n} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <svg width="30" height="30" viewBox="0 0 32 32" role="img" aria-label={`Paso ${paso.n}`} className="shrink-0">
                <circle cx="16" cy="16" r="15" style={{ fill: 'rgb(var(--t-accent-rgb))' }} />
                <text x="16" y="17" textAnchor="middle" dominantBaseline="central" style={{ fill: '#04231b', fontSize: '15px', fontWeight: 700 }}>
                  {paso.n}
                </text>
              </svg>
              {!isLast && <span aria-hidden="true" className="w-0.5 flex-1 min-h-[1rem] bg-slate-700 my-1" />}
            </div>
            <div className="flex-1 pb-3.5">
              <div className="flex items-start gap-2">
                <span className="text-xl leading-none shrink-0" aria-hidden="true">{paso.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 flex items-center flex-wrap gap-1.5">
                    {paso.titulo}
                    {paso.cantidad && (
                      <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded">{paso.cantidad}</span>
                    )}
                  </p>
                  <p className={`text-xs leading-relaxed mt-0.5 ${paso.alerta ? 'text-amber-300' : 'text-slate-300'}`}>
                    {paso.alerta && <ShieldAlert size={12} className="inline-block mr-1 -mt-0.5 text-amber-400" aria-label="Cuidado" />}
                    {paso.detalle}
                  </p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Bloque de precauciones estructurado: EPP + vetos + reingreso + prosa. */
function Precauciones({ bp }) {
  const epp = (bp.ppe_required || []).map((p) => PPE_LABEL[p] || p);
  const vetos = (bp.do_not_use_when || []).map((v) => DO_NOT_USE_LABEL[v] || v);
  const reentry = bp.reentry_interval_dias;
  return (
    <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 space-y-2.5" data-testid="bio-precauciones">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-300">
        <ShieldAlert size={14} aria-hidden="true" /> Cuidados
      </p>
      {epp.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="bio-epp">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200/90"><HardHat size={12} aria-hidden="true" /> Protéjase:</span>
          {epp.map((e) => (
            <span key={e} className="rounded-full border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-100">{e}</span>
          ))}
        </div>
      )}
      {vetos.map((v) => (
        <p key={v} className="flex items-start gap-1.5 text-[11px] leading-snug text-rose-200">
          <Ban size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-rose-400" />{v}
        </p>
      ))}
      {reentry != null && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
          <Clock size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />
          Espere <strong className="text-white">{reentry} días</strong> antes de volver a entrar a tratar o cosechar (tiempo de reingreso).
        </p>
      )}
      {bp.precaucion_seguridad && (
        <p className="text-[11px] leading-relaxed text-amber-100/90">{bp.precaucion_seguridad}</p>
      )}
    </div>
  );
}

/** Ficha completa (contenido desplegado de una tarjeta). */
function FichaCuerpo({ bp }) {
  const meta = fichaMeta(bp.id);
  const diagrama = getDiagramaBiopreparado(bp.id);
  const ingredientes = bp.ingredientes || [];
  const dias = bp.tiempo_elaboracion_dias;

  return (
    <div className="bio-ficha-cuerpo px-3.5 pb-4 pt-1 space-y-4" data-testid={`bio-ficha-${bp.id}`}>
      {/* Para qué sirve */}
      {meta.paraQueSirve && (
        <p className="text-sm leading-relaxed text-slate-200">{meta.paraQueSirve}</p>
      )}

      {/* Ingredientes con medidas caseras (chips + emoji concreto) */}
      {ingredientes.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Necesita</p>
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ingredientes.map((ing, i) => (
              <li key={i} className="flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-center">
                <span className="text-2xl leading-none" aria-hidden="true">{iconoIngrediente(ing)}</span>
                <span className="text-[10px] leading-tight text-slate-400">{ing}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preparación paso a paso */}
      {diagrama ? (
        <div>
          <p className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            <span>Paso a paso</span>
            {diagrama.rinde && <span className="normal-case tracking-normal text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-full">{diagrama.rinde}</span>}
          </p>
          <PasosPreparacion pasos={diagrama.pasos} />
        </div>
      ) : bp.proceso_resumen ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Cómo se prepara</p>
          <p className="text-xs leading-relaxed text-slate-300">{bp.proceso_resumen}</p>
        </div>
      ) : null}

      {/* Tiempo de fermentación / reposo */}
      {dias != null && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
          <Clock size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-300">
            {dias <= 1
              ? <>Se usa el <strong className="text-slate-100">mismo día</strong></>
              : <>Listo en <strong className="text-slate-100">~{dias} días</strong> de fermentación/reposo</>}
            {bp.vida_util_dias != null && (
              <> · dura ~{bp.vida_util_dias} días guardado</>
            )}
          </span>
        </div>
      )}

      {/* Dosis de aplicación (grounded) */}
      {(bp.dosis || bp.dosis_aplicacion) && (
        <div className="rounded-xl border border-teal-800/50 bg-teal-950/20 p-3 space-y-1.5" data-testid="bio-dosis">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-teal-300">
            <Droplets size={14} aria-hidden="true" /> Dosis de aplicación
          </p>
          <p className="text-xs leading-relaxed text-slate-200">{bp.dosis || bp.dosis_aplicacion}</p>
          {bp.metodo && <p className="text-[11px] leading-snug text-slate-400"><strong className="text-slate-300">Cómo:</strong> {bp.metodo}</p>}
          {bp.frecuencia && <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400"><Repeat size={11} aria-hidden="true" className="shrink-0 mt-0.5" /> {bp.frecuencia}</p>}
        </div>
      )}

      {/* Precauciones (toxicidad, EPP, vetos, reingreso) */}
      <Precauciones bp={bp} />

      {/* Fuente — trazabilidad, no se inventa nada */}
      {bp.fuente && (
        <div className="flex items-start gap-2 pt-0.5">
          <ScrollText size={12} className="text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[10px] text-slate-500 italic leading-relaxed">{bp.fuente}</p>
        </div>
      )}
    </div>
  );
}

/** Tarjeta de ficha: cabecera photo-forward + cuerpo desplegable (acordeón). */
function FichaCard({ bp, abierto, onToggle }) {
  const meta = fichaMeta(bp.id);
  return (
    <article className="rounded-2xl border border-slate-700/60 bg-slate-900/60 overflow-hidden" data-testid={`bio-card-${bp.id}`}>
      <button
        type="button"
        data-testid={`bio-toggle-${bp.id}`}
        onClick={onToggle}
        aria-expanded={abierto}
        aria-controls={`bio-ficha-${bp.id}`}
        className="w-full text-left block"
      >
        <FotoBiopreparado slug={meta.foto} alt={`${bp.nombre}: biopreparado agroecológico`} ratio="aspect-[16/8]">
          <div className="absolute inset-0 flex flex-col justify-end p-3.5 gap-2">
            <div className="flex items-end justify-between gap-2">
              <h3 className="text-lg font-black text-white leading-tight drop-shadow">{bp.nombre}</h3>
              <SafetyBadge safetyClass={bp.safety_class} />
            </div>
            <FuncionChips proposito={bp.proposito} />
          </div>
        </FotoBiopreparado>
        <span className="flex items-center justify-between px-3.5 py-2 border-t border-slate-800/70">
          <span className="text-[11px] text-slate-400">{abierto ? 'Ocultar receta' : 'Ver receta y dosis'}</span>
          <ChevronDown size={18} className={`text-slate-500 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {abierto && <FichaCuerpo bp={bp} />}
    </article>
  );
}

/** Créditos de todas las fotos (cumplimiento de licencia abierta). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3" data-testid="bio-creditos-fotos">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="w-full flex items-center gap-2 text-left">
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_BIOPREPARADOS.map((cr) => (
            <li key={cr.slug} className="text-[11px] leading-snug text-slate-400">
              <a href={cr.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5">
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
export default function BiopreparadosScreen({ onBack, onHome = undefined, onNavigate = undefined }) {
  const [bps, setBps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => getAllBiopreparados())
      .then((list) => {
        if (!alive) return;
        const ordenados = (list || [])
          .filter((bp) => bp && bp.id)
          .sort((a, b) => {
            const oa = ORDEN_TIPO[a.tipo] ?? 99;
            const ob = ORDEN_TIPO[b.tipo] ?? 99;
            return oa - ob || String(a.nombre).localeCompare(String(b.nombre), 'es');
          });
        setBps(ordenados);
        setLoading(false);
      })
      .catch(() => { if (alive) { setBps([]); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  // Solo mostramos filtros de categorías que existen en el catálogo cargado.
  const categoriasPresentes = useMemo(() => {
    const tipos = new Set(bps.map((b) => b.tipo));
    return CATEGORIAS_BIOPREPARADO.filter((c) => tipos.has(c.tipo));
  }, [bps]);

  const visibles = useMemo(
    () => (filtro === 'todos' ? bps : bps.filter((b) => b.tipo === filtro)),
    [bps, filtro],
  );

  return (
    <ScreenShell title="Biopreparados" icon={FlaskConical} onBack={onBack} onHome={onHome}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="biopreparados-screen">
        <PedagogicalBlock
          icon={FlaskConical}
          lead="Remedios y abonos que usted mismo prepara, con lo que hay en la finca."
          clave="Ninguna dosis de aquí está inventada: sale del catálogo agroecológico (Restrepo Rivera, Agrosavia, ICA). Donde no hay dato, se dice."
        >
          <p>
            Un biopreparado es un caldo, purín, fermento o extracto casero que{' '}
            <strong className="text-emerald-200">protege o nutre la mata sin veneno</strong>. Abajo, cada ficha
            trae para qué sirve, los ingredientes con medidas de finca, el paso a paso, el tiempo de
            fermentación, la dosis y los cuidados.
          </p>
        </PedagogicalBlock>

        {/* Toxicología y seguridad (crítico para bordelés / sulfocálcico) */}
        <button
          type="button"
          data-testid="bio-toxicologia-link"
          onClick={() => (onNavigate ? onNavigate('toxicologia', { tab: 'insumos' }) : undefined)}
          className="w-full rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 flex items-center gap-2.5 text-left hover:border-amber-600 transition-colors"
        >
          <AlertCircle size={20} className="shrink-0 text-amber-400" aria-hidden="true" />
          <span className="text-sm text-amber-100 flex-1">
            <span className="font-bold">Toxicología y seguridad.</span> Antes de preparar, revise la
            protección (EPP), las dosis seguras y las restricciones legales.
          </span>
          <ChevronDown size={16} className="shrink-0 -rotate-90 text-amber-400/70" aria-hidden="true" />
        </button>

        {/* Filtro por categoría */}
        {categoriasPresentes.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Familias de biopreparados">
            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'todos'}
              data-testid="bio-filtro-todos"
              onClick={() => setFiltro('todos')}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                filtro === 'todos' ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900/50 text-slate-300 active:bg-slate-800/70'
              }`}
            >
              Todos
            </button>
            {categoriasPresentes.map((c) => (
              <button
                key={c.tipo}
                type="button"
                role="tab"
                aria-selected={filtro === c.tipo}
                data-testid={`bio-filtro-${c.tipo}`}
                onClick={() => setFiltro(c.tipo)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                  filtro === c.tipo ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900/50 text-slate-300 active:bg-slate-800/70'
                }`}
                title={c.desc}
              >
                <span aria-hidden="true">{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        )}

        {/* Lista de fichas */}
        {loading ? (
          <p className="text-sm italic text-slate-400 py-8 text-center" data-testid="bio-cargando">Cargando recetas…</p>
        ) : visibles.length === 0 ? (
          <p className="text-sm italic text-slate-400 py-8 text-center">No hay biopreparados en el catálogo.</p>
        ) : (
          <div className="space-y-3">
            {filtro !== 'todos' && (
              <p className="text-xs text-slate-400">
                {categoriaDeBiopreparado(visibles[0])?.desc}
              </p>
            )}
            {visibles.map((bp) => (
              <FichaCard
                key={bp.id}
                bp={bp}
                abierto={abierto === bp.id}
                onToggle={() => setAbierto((cur) => (cur === bp.id ? null : bp.id))}
              />
            ))}
          </div>
        )}

        {/* Créditos de fotos */}
        <CreditosFotos />

        {/* Puente al agente */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="bio-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Qué biopreparado casero me sirve para mi cultivo y cómo lo preparo?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 grid place-items-center">
              <Sprout size={20} className="text-emerald-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿No sabe cuál usar?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuéntele al agente su plaga o su cultivo y le recomienda la receta.</span>
            </span>
            <ChevronDown size={18} className="shrink-0 -rotate-90 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}

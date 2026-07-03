import React from 'react';
import {
  Leaf,
  Sprout,
  ShieldCheck,
  Ban,
  FlaskConical,
  Bug,
  ShieldAlert,
  BookOpen,
  Mountain,
  CalendarRange,
  ImageOff,
} from 'lucide-react';
import PisoTermicoBand from './PisoTermicoBand.jsx';
import Skeleton from '../common/Skeleton.jsx';
import { getSpeciesVisual, SPECIES_TONE_CLASSES } from '../../utils/speciesVisual.js';
import { ETAPA_CODE_ICONS } from '../icons/etapaCicloIcons.js';

/**
 * SpeciesFicha — ficha visual completa y grounded de una especie del Directorio.
 *
 * Identidad Chagra, mobile-first. Cada sección se autocontiene y muestra
 * deflección honesta ("sin datos de X todavía") cuando la fuente no tiene el
 * dato. NUNCA inventa. Recibe la ficha ya construida por
 * `buildSpeciesFicha(speciesId)` — este componente es SOLO capa visual.
 *
 * Sistema visual:
 *   - Emoji por especie (utils/speciesVisual) = contenido; iconos lucide =
 *     chrome de UI y etapas de ciclo (components/icons/etapaCicloIcons).
 *   - Radios/sombras/táctil desde los tokens globales (styles/tokens.css)
 *     vía valores arbitrarios de Tailwind con fallback byte-idéntico.
 *   - Todo movimiento va tras `motion-safe:` (prefers-reduced-motion).
 *
 * @param {object} props
 * @param {object} props.ficha — salida de buildSpeciesFicha.
 * @param {(id: string) => void} [props.onSelectSpecies] - navegar a otra especie
 *   (al tocar una asociación que está en el catálogo).
 */
export default function SpeciesFicha({ ficha, onSelectSpecies }) {
  if (!ficha) return null;
  const {
    comun, cientifico, familia, estrato, nombresRegionales = [],
    imagen, pisoTermico, asociaciones, biopreparados = [], amenazas = [],
    fenologia, fuentes = [],
  } = ficha;

  // El catálogo lista variantes de nombre común con "/" ("Mora andina / Mora
  // de Castilla"): el primero manda la jerarquía, el resto baja a chips junto
  // a los nombres regionales. Presentación pura — el dato no se toca.
  const nombreParts = String(comun || '').split('/').map((s) => s.trim()).filter(Boolean);
  const nombrePrincipal = nombreParts[0] || comun;
  const otrosNombres = [...nombreParts.slice(1), ...nombresRegionales];

  const nCompatibles = asociaciones?.compatibles?.length || 0;
  const nAntagonistas = asociaciones?.antagonistas?.length || 0;

  return (
    <article className="max-w-2xl mx-auto pb-10" data-testid="species-ficha">
      {/* FOTO / fallback ilustrado con el emoji de la especie */}
      <SpeciesPhoto imagen={imagen} comun={comun} ficha={ficha} />

      {/* Identidad — emoji por especie + nombre como jerarquía principal */}
      <header className="px-4 pt-4">
        <div className="flex items-start gap-3">
          <SpeciesEmojiBadge ficha={ficha} />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-emerald-100 leading-tight">{nombrePrincipal}</h2>
            {cientifico && (
              <p className="text-sm italic text-emerald-300/80 mt-0.5">{cientifico}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {familia && <Pill icon={Leaf} tone="emerald">{familia}</Pill>}
          {estrato && <Pill icon={Mountain} tone="slate">Estrato {estrato}</Pill>}
        </div>
        {otrosNombres.length > 0 && (
          <div className="mt-3" data-testid="ficha-nombres-regionales">
            <p className="text-[length:var(--fs-nota,0.78rem)] font-bold text-slate-400 mb-1.5">
              También conocida como
            </p>
            <div className="flex flex-wrap gap-1.5">
              {otrosNombres.map((n) => (
                <span
                  key={n}
                  className="px-2.5 py-1 rounded-[var(--r-pill,999px)] border border-slate-700/60 bg-slate-800/50 text-[11px] font-semibold text-slate-300 leading-tight"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* PISO TÉRMICO / ALTITUD */}
      <Section icon={Mountain} title="Piso térmico y clima" accent="amber">
        <PisoTermicoBand pisoTermico={pisoTermico} />
      </Section>

      {/* CICLO DE VIDA — iconos de etapa del set común (etapaCicloIcons) */}
      <Section icon={CalendarRange} title="Ciclo de vida" accent="lime">
        <CicloStats fenologia={fenologia} />
      </Section>

      {/* ASOCIACIONES */}
      <Section
        icon={Sprout}
        title="Asociaciones de cultivo"
        accent="emerald"
        count={nCompatibles + nAntagonistas || null}
      >
        <div className="space-y-3">
          <AssocGroup
            label="Asociar (favorables)"
            icon={ShieldCheck}
            tone="emerald"
            items={asociaciones?.compatibles}
            emptyText="Sin asociaciones favorables registradas todavía."
            onSelectSpecies={onSelectSpecies}
          />
          <AssocGroup
            label="Evitar (antagonistas)"
            icon={Ban}
            tone="rose"
            items={asociaciones?.antagonistas}
            emptyText="Sin antagonistas registrados todavía."
            onSelectSpecies={onSelectSpecies}
          />
        </div>
      </Section>

      {/* BIOPREPARADOS */}
      <Section
        icon={FlaskConical}
        title="Biopreparados asociados"
        accent="teal"
        count={biopreparados.length || null}
      >
        {biopreparados.length === 0 ? (
          <Empty>Sin biopreparados asociados en el grafo todavía.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-biopreparados">
            {biopreparados.map((b) => (
              <li
                key={b.id || b.nombre}
                className="rounded-[var(--r-md,16px)] border border-teal-700/40 bg-teal-950/30 p-3 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-teal-100 leading-tight flex items-center gap-1.5 min-w-0">
                    <FlaskConical size={14} className="text-teal-300 shrink-0" aria-hidden="true" />
                    {b.nombre}
                  </p>
                  {b.tipo && (
                    <span className="shrink-0 px-2 py-0.5 rounded-[var(--r-pill,999px)] border border-teal-600/40 bg-teal-900/40 text-[10px] uppercase tracking-wide font-bold text-teal-300">
                      {b.tipo}
                    </span>
                  )}
                </div>
                {b.dosis && (
                  <p className="text-xs text-slate-300 mt-1.5"><span className="font-semibold text-slate-200">Dosis:</span> {b.dosis}</p>
                )}
                {b.uso && (
                  <p className="text-xs text-slate-400 mt-0.5">{b.uso}</p>
                )}
                {Array.isArray(b.ingredientes) && b.ingredientes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {b.ingredientes.map((ing) => (
                      <span
                        key={ing}
                        className="px-1.5 py-0.5 rounded-[var(--r-xs,8px)] bg-slate-800/70 border border-slate-700/50 text-[10px] text-slate-300 leading-tight"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                )}
                {!b.enCatalogo && (
                  <p className="text-[10px] text-slate-500 italic mt-1">Receta detallada no curada en el catálogo todavía.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* PLAGAS / ENFERMEDADES + CONTROLADORES */}
      <Section
        icon={Bug}
        title="Plagas, enfermedades y control biológico"
        accent="rose"
        count={amenazas.length || null}
      >
        {amenazas.length === 0 ? (
          <Empty>Sin plagas o enfermedades registradas todavía.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-amenazas">
            {amenazas.map((a) => (
              <li
                key={`${a.tipo}-${a.nombre}`}
                className="rounded-[var(--r-md,16px)] border border-rose-800/40 bg-rose-950/20 p-3 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-rose-100 leading-tight flex items-center gap-1.5 min-w-0">
                    {a.tipo === 'enfermedad'
                      ? <ShieldAlert size={14} className="text-rose-300 shrink-0" aria-hidden="true" />
                      : <Bug size={14} className="text-rose-300 shrink-0" aria-hidden="true" />}
                    {a.nombre}
                  </p>
                  <span className="shrink-0 px-2 py-0.5 rounded-[var(--r-pill,999px)] border border-rose-700/40 bg-rose-900/40 text-[10px] uppercase tracking-wide font-bold text-rose-300">
                    {a.tipo}
                  </span>
                </div>
                {a.controladores && a.controladores.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400/80 mb-1 flex items-center gap-1">
                      <ShieldCheck size={11} aria-hidden="true" /> Control biológico
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {a.controladores.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-[var(--r-pill,999px)] border border-emerald-700/40 bg-emerald-950/40 text-[11px] font-semibold text-emerald-200 leading-tight"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic mt-1.5">Sin controlador biológico registrado todavía.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* FENOLOGÍA / SABERES */}
      {fenologia?.valorPedagogico && (
        <Section icon={BookOpen} title="Manejo y saberes" accent="indigo">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {fenologia.valorPedagogico}
          </p>
        </Section>
      )}

      {/* FUENTES — pie de página del dato, no una sección más */}
      {fuentes.length > 0 && (
        <footer className="px-4 pt-6" data-testid="ficha-fuentes">
          <div className="rounded-[var(--r-md,16px)] border border-slate-800/70 bg-slate-900/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
              <BookOpen size={12} aria-hidden="true" /> Fuentes
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {fuentes.map((f) => (
                <span
                  key={f.id || f.title}
                  className="px-2 py-0.5 rounded-[var(--r-xs,8px)] border border-slate-700/50 bg-slate-800/60 text-[11px] font-semibold text-slate-300 leading-tight"
                >
                  {f.title}
                </span>
              ))}
            </div>
            <p className="text-[length:var(--fs-nota,0.78rem)] text-slate-500 leading-relaxed">
              Datos del catálogo y del grafo de conocimiento de Chagra; sin datos
              no se inventa nada.
            </p>
          </div>
        </footer>
      )}
    </article>
  );
}

/* ---------------------------------------------------------------- subcomp. */

/** Badge grande del emoji por especie (mismo set que el Directorio). */
function SpeciesEmojiBadge({ ficha }) {
  const { emoji, tone } = getSpeciesVisual(ficha);
  const toneCls = SPECIES_TONE_CLASSES[tone] || SPECIES_TONE_CLASSES.emerald;
  return (
    <span
      className={`w-14 h-14 rounded-[var(--r-md,16px)] border grid place-items-center shrink-0 text-3xl leading-none shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))] ${toneCls}`}
      aria-hidden="true"
      data-testid="ficha-species-emoji"
    >
      {emoji}
    </span>
  );
}

/** Capitaliza un valor plano del catálogo para mostrarlo ("semilla" → "Semilla"). */
function cap(v) {
  const s = String(v || '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * CicloStats — duración de ciclo, propagación y tipo de cosecha como filas de
 * dato con los MISMOS iconos de etapa del set común (siembra = Bean, cosecha =
 * canasta). Solo pinta lo que la ficha trae; sin dato → deflección honesta.
 */
function CicloStats({ fenologia }) {
  const cycleMonths = typeof fenologia?.cycleMonths === 'number' && Number.isFinite(fenologia.cycleMonths)
    ? fenologia.cycleMonths
    : null;
  const propagation = typeof fenologia?.propagation === 'string' && fenologia.propagation.trim()
    ? fenologia.propagation
    : null;
  const harvestType = typeof fenologia?.harvestType === 'string' && fenologia.harvestType.trim()
    ? fenologia.harvestType
    : null;

  const SiembraIcon = ETAPA_CODE_ICONS.sowing;
  const CosechaIcon = ETAPA_CODE_ICONS.harvest_window;

  const stats = [
    cycleMonths !== null && {
      key: 'ciclo',
      Icon: CalendarRange,
      label: 'Duración del ciclo',
      value: cycleMonths === 1 ? '≈ 1 mes' : `≈ ${cycleMonths} meses`,
    },
    propagation && {
      key: 'propagacion',
      Icon: SiembraIcon,
      label: 'Propagación',
      value: cap(propagation),
    },
    harvestType && {
      key: 'cosecha',
      Icon: CosechaIcon,
      label: 'Cosecha',
      value: cap(harvestType),
    },
  ].filter(Boolean);

  if (stats.length === 0) {
    return <Empty>Sin datos de ciclo registrados para esta especie todavía.</Empty>;
  }

  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-2" data-testid="ficha-ciclo">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="flex items-center gap-2.5 min-h-[var(--tap-min,44px)] rounded-[var(--r-md,16px)] border border-lime-800/40 bg-lime-950/20 px-3 py-2"
        >
          <stat.Icon size={18} className="text-lime-300 shrink-0" aria-hidden="true" />
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] uppercase tracking-wide font-bold text-lime-400/80">{stat.label}</p>
            <p className="text-sm font-bold text-slate-100 truncate">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpeciesPhoto({ imagen, comun, ficha }) {
  if (imagen?.url) {
    return (
      <figure className="relative w-full aspect-[16/10] sm:aspect-[2/1] bg-slate-900 overflow-hidden">
        <img
          src={imagen.thumbUrl || imagen.url}
          alt={`Foto de ${comun}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <figcaption className="absolute bottom-0 inset-x-0 px-3 py-1 text-[10px] text-white/80 bg-gradient-to-t from-black/70 to-transparent">
          {imagen.source} · {imagen.license} · {imagen.rightsHolder}
        </figcaption>
      </figure>
    );
  }
  // Fallback ilustrado: el EMOJI de la especie (no un glifo genérico) sobre el
  // degradado de identidad — nunca imagen rota y cada especie se distingue.
  const { emoji } = getSpeciesVisual(ficha || { comun });
  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[2/1] flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 overflow-hidden"
      data-testid="species-photo-fallback"
      role="img"
      aria-label={`Sin foto de ${comun}; ilustración`}
    >
      <span className="text-6xl leading-none drop-shadow-lg" aria-hidden="true">{emoji}</span>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-200/70">
        <ImageOff size={12} aria-hidden="true" /> Sin foto en el catálogo todavía
      </p>
    </div>
  );
}

function Section({ icon, title, accent, count = null, children }) {
  const Icon = icon;
  const ACC = {
    amber: 'from-amber-400 to-orange-400',
    lime: 'from-lime-400 to-emerald-400',
    emerald: 'from-emerald-400 to-teal-400',
    teal: 'from-teal-400 to-cyan-400',
    rose: 'from-rose-400 to-pink-400',
    indigo: 'from-indigo-400 to-violet-400',
  }[accent] || 'from-slate-400 to-slate-500';
  return (
    <section className="px-4 pt-6">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
        <span aria-hidden="true" className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${ACC}`} />
        <Icon size={15} className="text-slate-400" aria-hidden="true" />
        <span>{title}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-[10px] font-bold text-slate-400 leading-none">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

function AssocGroup({ label, icon, tone, items, emptyText, onSelectSpecies }) {
  const Icon = icon;
  const TONE = {
    emerald: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-100',
    rose: 'border-rose-800/40 bg-rose-950/20 text-rose-100',
  }[tone];
  const list = Array.isArray(items) ? items : [];
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
        <Icon size={13} aria-hidden="true" /> {label}
      </p>
      {list.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((s) => {
            const clickable = s.enCatalogo && typeof onSelectSpecies === 'function';
            const { emoji } = getSpeciesVisual(s);
            const content = (
              <>
                <span aria-hidden="true" className="text-sm leading-none">{emoji}</span>
                <span className="font-bold">{s.comun || s.id}</span>
                {s.cientifico && <span className="italic text-[10px] text-slate-400">{s.cientifico}</span>}
              </>
            );
            return clickable ? (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSpecies(s.id)}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-[var(--r-pill,999px)] border text-[11px] leading-tight ${TONE} hover:brightness-125 motion-safe:transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60`}
              >
                {content}
              </button>
            ) : (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-[var(--r-pill,999px)] border text-[11px] leading-tight ${TONE} opacity-90`}
              >
                {content}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ icon, tone, children }) {
  const Icon = icon;
  const TONE = {
    emerald: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  }[tone] || 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-xs,8px)] border text-[11px] font-bold ${TONE}`}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  );
}

function Empty({ children }) {
  return <p className="text-xs text-slate-500 italic">{children}</p>;
}

/**
 * SpeciesFichaSkeleton — placeholder de carga con la SILUETA real de la ficha
 * (foto, identidad, secciones), construido con el Skeleton común. Reemplaza
 * las filas genéricas mientras `buildSpeciesFicha` lee el catálogo offline:
 * el ojo ya sabe qué viene y no hay salto de layout. El shimmer respeta
 * prefers-reduced-motion (motion-safe en Skeleton).
 */
export function SpeciesFichaSkeleton() {
  return (
    <div className="max-w-2xl mx-auto pb-10" data-testid="species-ficha-skeleton">
      {/* Foto */}
      <Skeleton variant="rect" width="100%" height={190} rounded="none" className="w-full" ariaLabel="Abriendo la ficha…" />
      {/* Identidad */}
      <div className="px-4 pt-4 flex items-start gap-3">
        <Skeleton variant="rect" width={56} height={56} rounded="xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton width="70%" height={20} />
          <Skeleton width="45%" height={12} />
        </div>
      </div>
      <div className="px-4 pt-3 flex gap-1.5">
        <Skeleton width={90} height={22} rounded="lg" />
        <Skeleton width={110} height={22} rounded="lg" />
      </div>
      {/* Secciones */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-4 pt-6 space-y-2">
          <Skeleton width="55%" height={12} />
          <Skeleton variant="rect" width="100%" height={72} rounded="xl" />
        </div>
      ))}
    </div>
  );
}

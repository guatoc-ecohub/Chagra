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
  Thermometer,
  Droplets,
  Repeat,
  Tag,
  Layers,
  ExternalLink,
  ImageOff,
} from 'lucide-react';
import PisoTermicoBand from './PisoTermicoBand.jsx';
import { PHASES } from '../CicloVivo/cicloVivoData.js';

/**
 * SpeciesFicha — ficha visual de REFERENCIA de una especie del Directorio.
 *
 * Es la superficie del moat de contenido: el catálogo grounded del proyecto
 * presentado como la mejor ficha agroecológica que un campesino haya visto.
 * Jerarquía por capítulos: identidad → clima de un vistazo → el arco del Ciclo
 * Vivo → con quién va / con quién no → sanidad → saberes → procedencia.
 *
 * Reglas que NO cambian (capa visual pura):
 *   - Cada sección se autocontiene y hace deflección honesta ("sin datos de X
 *     todavía") cuando la fuente no tiene el dato. NUNCA inventa.
 *   - La procedencia grounded se HACE SENTIR (la costura de confianza del chat):
 *     fuentes con enlace/DOI y grado A/B/C cuando existen.
 *   - Superficie oscura de alto contraste (legible al sol) coherente en los 4
 *     temas; sin animación que moleste con reduced-motion.
 *
 * Recibe la ficha ya construida por `buildSpeciesFicha(speciesId)`.
 *
 * @param {object} props
 * @param {object} props.ficha — salida de buildSpeciesFicha.
 * @param {(id: string) => void} [props.onSelectSpecies] - navegar a otra especie
 *   (al tocar una asociación que está en el catálogo).
 */
export default function SpeciesFicha({ ficha, onSelectSpecies }) {
  if (!ficha) return null;
  const {
    comun, cientifico, familia, estrato, categoria, nombresRegionales = [],
    imagen, pisoTermico, asociaciones, biopreparados = [], amenazas = [],
    fenologia, fuentes = [],
  } = ficha;

  const compatibles = asociaciones?.compatibles ?? [];
  const antagonistas = asociaciones?.antagonistas ?? [];
  const nAsoc = (Array.isArray(compatibles) ? compatibles.length : 0)
    + (Array.isArray(antagonistas) ? antagonistas.length : 0);

  return (
    <article className="max-w-2xl mx-auto pb-12" data-testid="species-ficha">
      {/* IDENTIDAD — retrato + nombre, como la portada de una guía de campo */}
      <SpeciesHero imagen={imagen} comun={comun} fuentesCount={fuentes.length} />

      <header className="px-4 pt-4">
        <p className="jp-tinta-suave text-[11px] font-black uppercase tracking-[0.18em] text-emerald-400/80">
          Ficha de especie
        </p>
        <h2 className="jp-tinta text-[26px] leading-[1.08] font-black text-emerald-50 mt-0.5">{comun}</h2>
        {cientifico && (
          <p className="font-serif italic text-[15px] text-emerald-300/85 leading-tight mt-0.5">{cientifico}</p>
        )}

        {/* Taxonomía de un vistazo */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {familia && <Pill icon={Leaf} tone="emerald">{familia}</Pill>}
          {categoria && <Pill icon={Tag} tone="teal">{cap(categoria)}</Pill>}
          {estrato && <Pill icon={Layers} tone="slate">Estrato {estrato}</Pill>}
        </div>

        {nombresRegionales.length > 0 && (
          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
            <span className="text-slate-500">También le dicen </span>
            {nombresRegionales.map((n, i) => (
              <React.Fragment key={n}>
                {i > 0 && <span className="text-slate-600"> · </span>}
                <span className="text-slate-300">{n}</span>
              </React.Fragment>
            ))}
          </p>
        )}

        {/* Costura de confianza — este dato viene del catálogo grounded */}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
          <ShieldCheck size={12} aria-hidden="true" />
          Ficha del catálogo Chagra
        </p>
      </header>

      {/* CLAVE DE UN VISTAZO — clima y ciclo escaneables al sol */}
      <GlanceStrip pisoTermico={pisoTermico} fenologia={fenologia} />

      {/* PISO TÉRMICO / ALTITUD */}
      <Section icon={Mountain} title="Piso térmico y clima" accent="amber">
        <PisoTermicoBand pisoTermico={pisoTermico} />
      </Section>

      {/* EL CICLO VIVO — arco de fenología (firma de la ficha) */}
      <Section icon={Repeat} title="El Ciclo Vivo" accent="lime">
        <CicloVivoArc fenologia={fenologia} />
      </Section>

      {/* ASOCIACIONES — con quién va / con quién no */}
      <Section icon={Sprout} title="Con quién va, con quién no" accent="emerald" count={nAsoc || null}>
        <div className="space-y-3">
          <AssocGroup
            label="Va bien con"
            icon={ShieldCheck}
            tone="emerald"
            items={compatibles}
            emptyText="Sin asociaciones favorables registradas todavía."
            onSelectSpecies={onSelectSpecies}
          />
          <AssocGroup
            label="Mejor lejos de"
            icon={Ban}
            tone="rose"
            items={antagonistas}
            emptyText="Sin antagonistas registrados todavía."
            onSelectSpecies={onSelectSpecies}
          />
        </div>
      </Section>

      {/* SANIDAD — plagas/enfermedades + su control agroecológico */}
      <Section icon={Bug} title="Sanidad y control agroecológico" accent="rose" count={amenazas.length || null}>
        {amenazas.length === 0 ? (
          <Empty>Sin plagas o enfermedades registradas todavía.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-amenazas">
            {amenazas.map((a) => (
              <li
                key={`${a.tipo}-${a.nombre}`}
                className="rounded-xl border border-rose-800/40 bg-rose-950/25 p-3"
              >
                <p className="text-sm font-bold text-rose-100 leading-tight flex items-center gap-1.5 flex-wrap">
                  {a.tipo === 'enfermedad'
                    ? <ShieldAlert size={15} className="text-rose-300 shrink-0" aria-hidden="true" />
                    : <Bug size={15} className="text-rose-300 shrink-0" aria-hidden="true" />}
                  {a.nombre}
                  <span className="text-[10px] font-black uppercase tracking-wide text-rose-300/90 rounded bg-rose-500/15 px-1.5 py-0.5">{a.tipo}</span>
                </p>
                {a.controladores && a.controladores.length > 0 ? (
                  <p className="text-xs text-emerald-200/90 mt-1.5 flex items-start gap-1.5">
                    <ShieldCheck size={13} className="mt-px shrink-0 text-emerald-300" aria-hidden="true" />
                    <span><span className="font-semibold text-emerald-300">Se controla con:</span> {a.controladores.join(' · ')}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 italic mt-1.5">Sin controlador biológico registrado todavía.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* BIOPREPARADOS */}
      <Section icon={FlaskConical} title="Biopreparados asociados" accent="teal" count={biopreparados.length || null}>
        {biopreparados.length === 0 ? (
          <Empty>Sin biopreparados asociados en el grafo todavía.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-biopreparados">
            {biopreparados.map((b) => (
              <li
                key={b.id || b.nombre}
                className="rounded-xl border border-teal-700/40 bg-teal-950/30 p-3"
              >
                <p className="text-sm font-bold text-teal-100 leading-tight flex items-center gap-1.5">
                  <FlaskConical size={15} className="text-teal-300 shrink-0" aria-hidden="true" />
                  {b.nombre}
                  {b.tipo && (
                    <span className="text-[10px] font-black uppercase tracking-wide text-teal-300/90 rounded bg-teal-500/15 px-1.5 py-0.5">{b.tipo}</span>
                  )}
                </p>
                {b.dosis && (
                  <p className="text-xs text-slate-300 mt-1.5"><span className="font-semibold text-slate-200">Dosis:</span> {b.dosis}</p>
                )}
                {b.uso && (
                  <p className="text-xs text-slate-400 mt-0.5">{b.uso}</p>
                )}
                {!b.enCatalogo && (
                  <p className="text-[11px] text-slate-500 italic mt-1">Receta detallada no curada en el catálogo todavía.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* SABERES / MANEJO */}
      {fenologia?.valorPedagogico && (
        <Section icon={BookOpen} title="Manejo y saberes" accent="indigo">
          <div className="rounded-xl border border-indigo-800/30 bg-indigo-950/20 p-3.5">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {fenologia.valorPedagogico}
            </p>
          </div>
        </Section>
      )}

      {/* PROCEDENCIA — la costura: de dónde sale cada dato */}
      <Procedencia fuentes={fuentes} />
    </article>
  );
}

/* ---------------------------------------------------------------- subcomp. */

/**
 * Retrato de la especie. Foto CC con crédito honesto, o ilustración botánica
 * propia (nunca imagen rota). Lleva un scrim inferior para que el crédito no
 * compita con la foto, y un sello de piso de confianza arriba a la izquierda.
 */
function SpeciesHero({ imagen, comun, fuentesCount }) {
  const seal = (
    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur px-2 py-1 text-[10px] font-bold text-emerald-100 ring-1 ring-white/15">
      <ShieldCheck size={11} aria-hidden="true" />
      Catálogo Chagra{fuentesCount > 0 ? ` · ${fuentesCount} ${fuentesCount === 1 ? 'fuente' : 'fuentes'}` : ''}
    </span>
  );

  if (imagen?.url) {
    return (
      <figure className="relative w-full aspect-[16/10] sm:aspect-[2/1] bg-slate-900 overflow-hidden">
        <img
          src={imagen.thumbUrl || imagen.url}
          alt={`Foto de ${comun}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Scrim inferior para legibilidad del crédito, y superior para el sello */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
        {seal}
        <figcaption className="absolute bottom-0 inset-x-0 px-3 py-1.5 text-[10px] text-white/85 flex items-center gap-1">
          <span className="opacity-70">Foto:</span> {[imagen.source, imagen.license, imagen.rightsHolder].filter(Boolean).join(' · ')}
        </figcaption>
      </figure>
    );
  }

  // Fallback ilustrado — mismo lenguaje del Ciclo Vivo (dos hojas + brote).
  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[2/1] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 50% 18%, #0b3b32 0%, #062a26 45%, #041b1c 100%)' }}
      data-testid="species-photo-fallback"
      role="img"
      aria-label={`Sin foto de ${comun}; ilustración`}
    >
      {seal}
      <svg viewBox="0 0 120 120" className="w-28 h-28" aria-hidden="true">
        <defs>
          <linearGradient id="fichaLeafA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b8a52" />
            <stop offset="100%" stopColor="#2f6f4f" />
          </linearGradient>
          <linearGradient id="fichaLeafB" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#7CA46B" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* horizonte del ciclo (eco de la rueda) */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="#4c7a3d" strokeWidth="1.4" strokeDasharray="2 8" strokeLinecap="round" opacity="0.4" />
        {/* tallo */}
        <path d="M60 108 L60 58" stroke="#3f6b3a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        {/* hoja izquierda */}
        <path d="M60 78 C44 74 34 60 32 44 C50 46 62 58 60 78 Z" fill="url(#fichaLeafA)" />
        {/* hoja derecha */}
        <path d="M60 68 C76 62 86 46 90 28 C70 30 56 46 60 68 Z" fill="url(#fichaLeafB)" />
        {/* brote/semilla en la punta */}
        <circle cx="60" cy="50" r="6" fill="#c9a227" />
      </svg>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-200/70">
        <ImageOff size={12} aria-hidden="true" /> Sin foto en el catálogo todavía
      </p>
    </div>
  );
}

/**
 * Franja "clave de un vistazo": los datos que un campesino busca de reojo —
 * piso térmico, temperatura, agua y ciclo. Solo renderiza los que existen; si
 * no hay ninguno, no aparece (nada de casillas vacías). El detalle vive en la
 * banda de piso térmico; esto es el resumen escaneable.
 */
function GlanceStrip({ pisoTermico, fenologia }) {
  const pt = pisoTermico || {};
  const fe = fenologia || {};
  const tiles = [];

  const zones = Array.isArray(pt.thermalZones) ? pt.thermalZones : [];
  if (zones.length > 0) {
    tiles.push({
      key: 'piso', icon: Mountain, tone: 'amber', label: 'Piso térmico',
      value: zones.map(zoneLabel).join(' · '),
    });
  }
  const t = pt.temperatura;
  if (t && (t.optimo_min != null || t.optimo_max != null)) {
    tiles.push({
      key: 'temp', icon: Thermometer, tone: 'rose', label: 'Temperatura',
      value: tempShort(t.optimo_min, t.optimo_max),
    });
  }
  if (pt.agua) {
    tiles.push({ key: 'agua', icon: Droplets, tone: 'sky', label: 'Agua', value: cap(pt.agua) });
  }
  const meses = cycleMonthsLabel(fe.cycleMonths);
  if (meses) {
    tiles.push({ key: 'ciclo', icon: Repeat, tone: 'lime', label: 'Ciclo', value: meses });
  }

  if (tiles.length === 0) return null;

  const TONE = {
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    sky: 'text-sky-300',
    lime: 'text-lime-300',
  };

  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="ficha-glance">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.key} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <Icon size={12} className={TONE[tile.tone]} aria-hidden="true" />
                {tile.label}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-100 leading-tight capitalize">{tile.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * CicloVivoArc — el arco de la fenología, firma visual de la ficha. Reusa las 7
 * fases canónicas de "El Ciclo Vivo" (semilla → poscosecha) con sus colores
 * aprobados, dibujadas como una cresta que se cierra en bucle (de la cosecha
 * vuelve a nacer la semilla). Es una ILUSTRACIÓN del arco general, no una
 * afirmación de fechas de esta especie; los datos reales de la especie (duración
 * del ciclo, propagación, cosecha) se anexan debajo solo cuando existen.
 */
function CicloVivoArc({ fenologia }) {
  const fe = fenologia || {};
  // Cresta (Bézier cuadrática): P0 → control P1 → P2.
  const P0 = { x: 26, y: 72 };
  const P1 = { x: 170, y: 12 };
  const P2 = { x: 314, y: 72 };
  const at = (tt) => {
    const u = 1 - tt;
    return {
      x: u * u * P0.x + 2 * u * tt * P1.x + tt * tt * P2.x,
      y: u * u * P0.y + 2 * u * tt * P1.y + tt * tt * P2.y,
    };
  };
  const nodes = PHASES.map((p, i) => ({ ...p, pt: at(PHASES.length === 1 ? 0 : i / (PHASES.length - 1)) }));

  const facts = [
    cycleMonthsLabel(fe.cycleMonths) && { k: 'ciclo', label: 'Duración', value: cycleMonthsLabel(fe.cycleMonths) },
    fe.propagation && { k: 'prop', label: 'Propagación', value: cap(String(fe.propagation)) },
    fe.harvestType && { k: 'cosecha', label: 'Cosecha', value: cap(String(fe.harvestType)) },
  ].filter(Boolean);

  return (
    <div data-testid="ficha-ciclo-vivo">
      <svg viewBox="0 0 340 114" className="w-full h-auto max-h-44" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Arco del ciclo de vida: de la semilla a la poscosecha y de vuelta a la semilla">
        <defs>
          <linearGradient id="cvArcGrad" x1="0" y1="0" x2="1" y2="0">
            {PHASES.map((p, i) => (
              <stop key={p.key} offset={`${(i / (PHASES.length - 1)) * 100}%`} stopColor={p.color} />
            ))}
          </linearGradient>
        </defs>

        {/* horizonte del ciclo (eco de la rueda del Ciclo Vivo) */}
        <path d={`M ${P0.x} 84 Q 170 100 ${P2.x} 84`} fill="none" stroke="#3f4a3f" strokeWidth="1" strokeDasharray="1.5 7" strokeLinecap="round" opacity="0.5" />

        {/* arco de retorno (poscosecha → semilla): cierra el ciclo */}
        <path
          d={`M ${P2.x} 84 Q 170 112 ${P0.x} 84`}
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.6"
          strokeDasharray="2 6"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path d={`M ${P0.x} 84 l 5 -4 M ${P0.x} 84 l 5 4`} fill="none" stroke="#c9a227" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />

        {/* la cresta del ciclo */}
        <path
          d={`M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`}
          fill="none"
          stroke="url(#cvArcGrad)"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* nodos de fase */}
        {nodes.map((n) => (
          <g key={n.key}>
            <circle cx={n.pt.x} cy={n.pt.y} r="7" fill={n.color} stroke="#020617" strokeWidth="2.5" />
            <circle cx={n.pt.x} cy={n.pt.y} r="7" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.35" />
          </g>
        ))}
      </svg>

      {/* leyenda de fases (color + nombre) */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
        {PHASES.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} aria-hidden="true" />
            {p.name}
          </span>
        ))}
      </div>

      <p className="text-[11px] italic text-slate-500 mt-2">De la cosecha vuelve a nacer la semilla.</p>

      {/* datos reales de ESTA especie, si existen */}
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {facts.map((f) => (
            <span key={f.k} className="inline-flex items-center gap-1 rounded-md border border-lime-700/40 bg-lime-950/25 px-2 py-1 text-[11px] text-lime-100">
              <span className="text-lime-400/90 font-semibold">{f.label}:</span> {f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Procedencia — la costura de confianza de la ficha. Cada fuente se muestra con
 * su grado (A/B/C) cuando existe, enlace al recurso citado si lo hay, y DOI
 * cuando el dato lo trae. Si no hay fuentes, no renderiza nada. Honestidad: no
 * se enlaza a homepages genéricas ni se inventa procedencia.
 */
function Procedencia({ fuentes }) {
  const list = Array.isArray(fuentes) ? fuentes.filter(Boolean) : [];
  if (list.length === 0) return null;

  return (
    <section className="px-4 pt-6" data-testid="ficha-procedencia">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
        <span aria-hidden="true" className="h-3.5 w-1 rounded-full bg-gradient-to-b from-sky-400 to-emerald-400" />
        <ShieldCheck size={15} className="text-sky-300" aria-hidden="true" />
        Procedencia
      </h3>
      <ul className="flex flex-wrap gap-2">
        {list.map((f, i) => (
          <li key={f.id || f.title || i}>
            <SourceChip fuente={f} />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        Cada dato viene del catálogo y del grafo de conocimiento de Chagra. Donde no hay fuente, no se inventa nada.
      </p>
    </section>
  );
}

const TIER_META = {
  A: { label: 'A', tone: 'border-emerald-600/50 bg-emerald-500/15 text-emerald-200', title: 'Fuente de grado A — institucional revisada, alta confianza.' },
  B: { label: 'B', tone: 'border-amber-600/50 bg-amber-500/15 text-amber-200', title: 'Fuente de grado B — referencia útil, contrástala.' },
  C: { label: 'C', tone: 'border-slate-600/60 bg-slate-500/15 text-slate-300', title: 'Fuente de grado C — de apoyo, tentativa.' },
};

function SourceChip({ fuente }) {
  const title = prettySource(fuente.title || fuente.id || 'Fuente');
  const url = typeof fuente.url === 'string' && /^https?:\/\//i.test(fuente.url) ? fuente.url : null;
  const doi = typeof fuente.doi === 'string' && fuente.doi.trim() ? fuente.doi.trim() : null;
  const tier = typeof fuente.tier === 'string' ? TIER_META[fuente.tier.trim().toUpperCase()] : null;

  const body = (
    <>
      {tier ? (
        <span
          className={`inline-flex items-center justify-center w-4 h-4 rounded-[4px] border text-[9px] font-black ${tier.tone}`}
          title={tier.title}
          aria-label={`Grado ${tier.label}`}
        >
          {tier.label}
        </span>
      ) : (
        <ShieldCheck size={12} className="text-sky-300/80 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate max-w-[15rem]">{title}</span>
      {doi && (
        <span className="text-[10px] font-mono text-sky-300/80" title={`DOI: ${doi}`}>DOI</span>
      )}
      {url && <ExternalLink size={11} className="shrink-0 opacity-80" aria-hidden="true" />}
    </>
  );

  const base = 'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs leading-tight';

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`tap-target ${base} border-sky-700/50 bg-sky-950/30 text-sky-200 hover:bg-sky-900/40 hover:underline underline-offset-2`}
        title={`Abre la fuente citada (${title}) en una pestaña nueva.`}
      >
        {body}
      </a>
    );
  }
  return (
    <span className={`${base} border-slate-700/60 bg-slate-900/60 text-slate-300`} title={`Fuente citada: ${title}`}>
      {body}
    </span>
  );
}

function Section({ icon, title, accent, count = null, children }) {
  const Icon = icon;
  const ACC = {
    amber: 'from-amber-400 to-orange-400',
    emerald: 'from-emerald-400 to-teal-400',
    teal: 'from-teal-400 to-cyan-400',
    rose: 'from-rose-400 to-pink-400',
    indigo: 'from-indigo-400 to-violet-400',
    lime: 'from-lime-400 to-emerald-400',
  }[accent] || 'from-slate-400 to-slate-500';
  return (
    <section className="px-4 pt-6">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
        <span aria-hidden="true" className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${ACC}`} />
        <Icon size={15} className="text-slate-400" aria-hidden="true" />
        {title}
        {count != null && (
          <span className="ml-0.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 tabular-nums">{count}</span>
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
  const HEAD = {
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
  }[tone] || 'text-slate-400';
  const list = Array.isArray(items) ? items : [];
  return (
    <div>
      <p className={`text-xs font-black uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${HEAD}`}>
        <Icon size={13} aria-hidden="true" /> {label}
      </p>
      {list.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((s) => {
            const clickable = s.enCatalogo && typeof onSelectSpecies === 'function';
            const content = (
              <>
                <span className="font-bold">{s.comun || s.id}</span>
                {s.cientifico && <span className="font-serif italic text-[10px] text-slate-400 ml-1">{s.cientifico}</span>}
              </>
            );
            return clickable ? (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSpecies(s.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs leading-tight ${TONE} hover:brightness-125 transition`}
              >
                {content}
              </button>
            ) : (
              <span key={s.id} className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs leading-tight ${TONE} opacity-90`}>
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
    teal: 'bg-teal-500/15 text-teal-200 border-teal-500/30',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  }[tone] || 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${TONE}`}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  );
}

function Empty({ children }) {
  return <p className="text-xs text-slate-500 italic">{children}</p>;
}

/* -------------------------------------------------------------- helpers viz */

const ZONE_LABEL = { calido: 'Cálido', templado: 'Templado', frio: 'Frío', paramo: 'Páramo' };
function zoneLabel(z) {
  return ZONE_LABEL[z] || cap(String(z || ''));
}

function tempShort(a, b) {
  if (a != null && b != null) return `${a}–${b} °C`;
  if (a != null) return `desde ${a} °C`;
  if (b != null) return `hasta ${b} °C`;
  return '—';
}

/**
 * Etiqueta legible de la duración del ciclo. `cycleMonths` puede venir como
 * número de meses o, si es grande, interpretarse como días. Solo formatea; no
 * inventa (devuelve null si no hay dato numérico).
 */
function cycleMonthsLabel(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  if (v > 24) {
    // valores grandes se reportan como días (algunos templates guardan días)
    return `~${Math.round(v)} días`;
  }
  const n = Math.round(v * 10) / 10;
  return `~${n} ${n === 1 ? 'mes' : 'meses'}`;
}

function cap(s) {
  const str = String(s || '');
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

/**
 * Formatea un id/slug de fuente a un título legible ("agrosavia-sol-andina" →
 * "Agrosavia sol andina"). Si ya viene un título con espacios, lo respeta. Es
 * solo presentación del MISMO identificador — no cambia ni inventa el dato.
 */
function prettySource(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'Fuente';
  if (/\s/.test(s)) return s; // ya es un título legible
  const words = s.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

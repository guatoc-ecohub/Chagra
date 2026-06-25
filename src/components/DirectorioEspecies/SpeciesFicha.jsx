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
  Sparkles,
  ImageOff,
} from 'lucide-react';
import PisoTermicoBand from './PisoTermicoBand.jsx';

/**
 * SpeciesFicha — ficha visual completa y grounded de una especie del Directorio.
 *
 * Identidad Chagra, mobile-first. Cada sección se autocontiene y muestra
 * deflección honesta ("sin datos de X todavía") cuando la fuente no tiene el
 * dato. NUNCA inventa. Recibe la ficha ya construida por
 * `buildSpeciesFicha(speciesId)`.
 *
 * @param {object} props
 * @param {object} props.ficha — salida de buildSpeciesFicha.
 * @param {(id: string) => void} [props.onSelectSpecies] — navegar a otra especie
 *   (al tocar una asociación que está en el catálogo).
 */
export default function SpeciesFicha({ ficha, onSelectSpecies }) {
  if (!ficha) return null;
  const {
    comun, cientifico, familia, estrato, nombresRegionales = [],
    imagen, pisoTermico, asociaciones, biopreparados = [], amenazas = [],
    fenologia, fuentes = [],
  } = ficha;

  return (
    <article className="max-w-2xl mx-auto pb-10" data-testid="species-ficha">
      {/* FOTO / fallback ilustrado */}
      <SpeciesPhoto imagen={imagen} comun={comun} />

      {/* Identidad */}
      <header className="px-4 pt-4">
        <h2 className="text-2xl font-black text-emerald-100 leading-tight">{comun}</h2>
        {cientifico && (
          <p className="text-sm italic text-emerald-300/80">{cientifico}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {familia && <Pill icon={Leaf} tone="emerald">{familia}</Pill>}
          {estrato && <Pill icon={Mountain} tone="slate">Estrato {estrato}</Pill>}
        </div>
        {nombresRegionales.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            También: {nombresRegionales.join(' · ')}
          </p>
        )}
      </header>

      {/* PISO TÉRMICO / ALTITUD */}
      <Section icon={Mountain} title="Piso térmico y clima" accent="amber">
        <PisoTermicoBand pisoTermico={pisoTermico} />
      </Section>

      {/* ASOCIACIONES */}
      <Section icon={Sprout} title="Asociaciones de cultivo" accent="emerald">
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
      <Section icon={FlaskConical} title="Biopreparados asociados" accent="teal">
        {biopreparados.length === 0 ? (
          <Empty>Sin biopreparados asociados en el grafo todavía.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-biopreparados">
            {biopreparados.map((b) => (
              <li
                key={b.id || b.nombre}
                className="rounded-lg border border-teal-700/40 bg-teal-950/30 p-2.5"
              >
                <p className="text-sm font-bold text-teal-100 leading-tight flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-teal-300 shrink-0" aria-hidden="true" />
                  {b.nombre}
                </p>
                {b.tipo && (
                  <span className="text-[10px] uppercase tracking-wide text-teal-400/80">{b.tipo}</span>
                )}
                {b.dosis && (
                  <p className="text-xs text-slate-300 mt-1"><span className="font-semibold text-slate-200">Dosis:</span> {b.dosis}</p>
                )}
                {b.uso && (
                  <p className="text-xs text-slate-400 mt-0.5">{b.uso}</p>
                )}
                {!b.enCatalogo && (
                  <p className="text-[10px] text-slate-500 italic mt-0.5">Receta detallada no curada en el catálogo todavía.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* PLAGAS / ENFERMEDADES + CONTROLADORES */}
      <Section icon={Bug} title="Plagas, enfermedades y control biológico" accent="rose">
        {amenazas.length === 0 ? (
          <Empty>Sin plagas o enfermedades registradas todavía.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-amenazas">
            {amenazas.map((a) => (
              <li
                key={`${a.tipo}-${a.nombre}`}
                className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-2.5"
              >
                <p className="text-sm font-bold text-rose-100 leading-tight flex items-center gap-1.5">
                  {a.tipo === 'enfermedad'
                    ? <ShieldAlert size={14} className="text-rose-300 shrink-0" aria-hidden="true" />
                    : <Bug size={14} className="text-rose-300 shrink-0" aria-hidden="true" />}
                  {a.nombre}
                  <span className="text-[10px] uppercase tracking-wide text-rose-400/70">{a.tipo}</span>
                </p>
                {a.controladores && a.controladores.length > 0 ? (
                  <p className="text-xs text-emerald-200/90 mt-1">
                    <ShieldCheck size={12} className="inline -mt-0.5 mr-1 text-emerald-300" aria-hidden="true" />
                    Control: {a.controladores.join(' · ')}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 italic mt-1">Sin controlador biológico registrado todavía.</p>
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

      {/* FUENTES */}
      {fuentes.length > 0 && (
        <div className="px-4 pt-5">
          <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
            <Sparkles size={12} className="text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Fuentes: {fuentes.map((f) => f.title).join(' · ')}. Datos del catálogo y
              del grafo de conocimiento de Chagra; sin datos no se inventa nada.
            </span>
          </p>
        </div>
      )}
    </article>
  );
}

/* ---------------------------------------------------------------- subcomp. */

function SpeciesPhoto({ imagen, comun }) {
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
  // Fallback ilustrado elegante (SVG inline) — nunca imagen rota.
  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[2/1] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 overflow-hidden"
      data-testid="species-photo-fallback"
      role="img"
      aria-label={`Sin foto de ${comun}; ilustración`}
    >
      <svg viewBox="0 0 120 120" className="w-24 h-24 opacity-80" aria-hidden="true">
        <defs>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <path
          d="M60 105 C60 70 42 58 30 40 C58 44 70 60 70 80 C84 60 86 40 90 22 C96 52 84 78 64 92 Z"
          fill="url(#leafGrad)"
        />
        <path d="M60 105 L60 70" stroke="#065f46" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-200/70">
        <ImageOff size={12} aria-hidden="true" /> Sin foto en el catálogo todavía
      </p>
    </div>
  );
}

function Section({ icon, title, accent, children }) {
  const Icon = icon;
  const ACC = {
    amber: 'from-amber-400 to-orange-400',
    emerald: 'from-emerald-400 to-teal-400',
    teal: 'from-teal-400 to-cyan-400',
    rose: 'from-rose-400 to-pink-400',
    indigo: 'from-indigo-400 to-violet-400',
  }[accent] || 'from-slate-400 to-slate-500';
  return (
    <section className="px-4 pt-5">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
        <span aria-hidden="true" className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${ACC}`} />
        <Icon size={15} className="text-slate-400" aria-hidden="true" />
        {title}
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
            const content = (
              <>
                <span className="font-bold">{s.comun || s.id}</span>
                {s.cientifico && <span className="italic text-[10px] text-slate-400 ml-1">{s.cientifico}</span>}
              </>
            );
            return clickable ? (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSpecies(s.id)}
                className={`px-2 py-1 rounded-md border text-[11px] leading-tight ${TONE} hover:brightness-125 transition`}
              >
                {content}
              </button>
            ) : (
              <span key={s.id} className={`px-2 py-1 rounded-md border text-[11px] leading-tight ${TONE} opacity-90`}>
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${TONE}`}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  );
}

function Empty({ children }) {
  return <p className="text-xs text-slate-500 italic">{children}</p>;
}

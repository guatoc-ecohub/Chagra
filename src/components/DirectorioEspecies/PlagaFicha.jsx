import React from 'react';
import {
  Bug,
  ShieldCheck,
  Leaf,
  Sprout,
  FlaskConical,
  Eye,
  Clock,
  AlertTriangle,
  ExternalLink,
  Microscope,
  Ban,
} from 'lucide-react';
import SanidadSintomaVineta from '../sanidad/SanidadSintomaVinetas.jsx';

/**
 * PlagaFicha — ficha visual de REFERENCIA de una plaga/enfermedad, el ESPEJO de
 * `SpeciesFicha`: photo-forward, para reconocer el bicho o el síndrome por foto
 * y saber cómo manejarlo sin veneno.
 *
 * Jerarquía por capítulos: identidad (foto + nombre común + binomio + tipo) →
 * a qué le pega (cultivos + especies del grafo) → cómo reconocerla (síntomas
 * visibles + con qué se confunde) → cuándo actuar (umbral) → manejo
 * agroecológico / MIP (biopreparado + controladores biológicos + cultural +
 * prevención) → procedencia.
 *
 * Reglas que NO cambian (capa visual pura):
 *   - Cada sección se autocontiene y hace deflección honesta ("dato en camino")
 *     cuando la fuente no lo trae. NUNCA inventa.
 *   - NO hay campo de control químico: sólo biopreparados, controladores
 *     biológicos y prácticas culturales (guard anti-veneno a nivel de datos).
 *   - Superficie oscura de alto contraste (legible al sol); la identidad de la
 *     plaga en tono rosa/ámbar (peligro), el manejo en verde (la cura/esperanza).
 *
 * Recibe la ficha ya construida por `buildPlagaFicha(causaId)`.
 *
 * @param {object} props
 * @param {object} props.ficha — salida de buildPlagaFicha.
 * @param {(id: string) => void} [props.onSelectEspecie] - navegar a la ficha de
 *   una especie afectada (si el consumidor cablea el puente al directorio).
 */
export default function PlagaFicha({ ficha, onSelectEspecie }) {
  if (!ficha) return null;
  const {
    nombreComun, binomio, tipo, tipoLabel, tipoEmoji, confianza, confianzaLabel,
    vineta, imagen, reconocer, cultivos = [], especiesAfectadas = [], ciclo,
    manejo, notaSuave, dosisPendiente, fuente,
  } = ficha;

  const esEnfermedad = ['hongo', 'oomiceto', 'bacteria', 'virus', 'complejo'].includes(tipo);
  const kicker = tipo === 'deficiencia'
    ? 'Ficha de carencia'
    : esEnfermedad ? 'Ficha de enfermedad' : 'Ficha de plaga';

  const pistas = reconocer?.pistas ?? [];
  const confusiones = reconocer?.confusiones ?? [];
  const controladores = manejo?.controladores ?? [];
  const nAfecta = cultivos.length + especiesAfectadas.length;

  return (
    <article className="max-w-2xl mx-auto pb-12" data-testid="plaga-ficha">
      {/* IDENTIDAD — retrato del daño/insecto, como la lámina de una guía de sanidad */}
      <PlagaHero imagen={imagen} nombre={nombreComun} vineta={vineta} tipoEmoji={tipoEmoji} />

      <header className="px-4 pt-4">
        <p className="jp-tinta-suave text-[11px] font-black uppercase tracking-[0.18em] text-rose-400/80">
          {kicker}
        </p>
        <h2 className="jp-tinta text-[26px] leading-[1.1] font-black text-rose-50 mt-0.5">{nombreComun}</h2>
        {binomio && (
          <p className="font-serif italic text-[15px] text-rose-300/85 leading-tight mt-0.5">{binomio}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <Pill icon={Microscope} tone="rose">{tipoEmoji} {tipoLabel}</Pill>
          <ConfianzaPill confianza={confianza} label={confianzaLabel} />
        </div>

        {/* Costura de confianza — este dato viene del catálogo de sanidad grounded */}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
          <ShieldCheck size={12} aria-hidden="true" />
          Ficha del catálogo de sanidad
        </p>
      </header>

      {/* CLAVE DE UN VISTAZO */}
      <GlanceStrip tipo={tipoLabel} tipoEmoji={tipoEmoji} confianzaLabel={confianzaLabel} umbral={ciclo?.umbral} nAfecta={nAfecta} />

      {/* A QUÉ LE PEGA — cultivos (curado) + especies del grafo (AFFECTS) */}
      <Section icon={Sprout} title="A qué le pega" accent="amber" count={nAfecta || null}>
        {nAfecta === 0 ? (
          <Empty>Sin cultivos registrados todavía — dato en camino.</Empty>
        ) : (
          <div className="space-y-3" data-testid="ficha-cultivos">
            {cultivos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cultivos.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-700/40 bg-amber-950/25 text-amber-100 text-sm font-bold"
                  >
                    <span aria-hidden="true">{c.emoji}</span> {c.label}
                  </span>
                ))}
              </div>
            )}
            {especiesAfectadas.length > 0 && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1.5">
                  Especies del catálogo que ataca
                </p>
                <div className="flex flex-wrap gap-2">
                  {especiesAfectadas.map((s) => {
                    const clickable = s.enCatalogo && typeof onSelectEspecie === 'function';
                    const content = (
                      <>
                        <Leaf size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
                        <span className="font-bold">{s.comun || s.id}</span>
                        {s.cientifico && <span className="font-serif italic text-[10px] text-slate-400">{s.cientifico}</span>}
                      </>
                    );
                    return clickable ? (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectEspecie(s.id)}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-700/40 bg-emerald-950/30 text-emerald-100 text-xs leading-tight hover:brightness-125 transition"
                      >
                        {content}
                      </button>
                    ) : (
                      <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-700/40 bg-emerald-950/25 text-emerald-100/90 text-xs leading-tight">
                        {content}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* CÓMO RECONOCERLA — síntomas visibles + con qué se confunde */}
      <Section icon={Eye} title="Cómo reconocerla" accent="rose" count={pistas.length || null}>
        {pistas.length === 0 ? (
          <Empty>Sin descripción de síntomas todavía — dato en camino.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="ficha-reconocer">
            {pistas.map((p) => (
              <li key={p.sintoma} className="rounded-xl border border-rose-800/40 bg-rose-950/25 p-3">
                <p className="text-sm font-bold text-rose-100 leading-tight flex items-center gap-1.5">
                  <span aria-hidden="true">{p.emoji}</span> {p.sintoma}
                </p>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{p.pista}</p>
                {p.nota && (
                  <p className="text-[11px] text-amber-200/90 mt-1.5 flex items-start gap-1.5">
                    <AlertTriangle size={12} className="mt-px shrink-0 text-amber-300" aria-hidden="true" />
                    <span>{p.nota}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {confusiones.length > 0 && (
          <p className="text-xs text-slate-400 mt-3 leading-relaxed flex items-start gap-1.5" data-testid="ficha-confusiones">
            <Ban size={13} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              <span className="font-semibold text-slate-300">No la confunda con </span>
              {confusiones.map((n, i) => (
                <React.Fragment key={n}>
                  {i > 0 && <span className="text-slate-600"> · </span>}
                  <span className="text-slate-300">{n}</span>
                </React.Fragment>
              ))}
              <span className="text-slate-500"> — el mismo nombre folk cambia según el cultivo.</span>
            </span>
          </p>
        )}
      </Section>

      {/* CUÁNDO ACTUAR — umbral */}
      <Section icon={Clock} title="¿Cuándo actuar?" accent="indigo">
        {ciclo?.umbral ? (
          <div className="rounded-xl border border-indigo-800/30 bg-indigo-950/20 p-3.5">
            <p className="text-sm text-indigo-50/90 leading-relaxed">{ciclo.umbral}</p>
          </div>
        ) : (
          <Empty>Sin umbral de acción registrado todavía — dato en camino.</Empty>
        )}
      </Section>

      {/* MANEJO AGROECOLÓGICO / MIP */}
      <Section icon={ShieldCheck} title="Manejo agroecológico (MIP)" accent="emerald">
        <div className="space-y-2.5" data-testid="ficha-manejo">
          {/* Doctrina anti-veneno — como en el mundo café */}
          <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300">
            <Leaf size={12} aria-hidden="true" />
            Manejo sin veneno: biopreparados, bichos buenos y manejo de la mata.
          </p>

          {manejo?.biopreparado && (
            <ManejoPilar icon={FlaskConical} tone="teal" titulo="Remedio casero (biopreparado)" texto={manejo.biopreparado} />
          )}
          {manejo?.biologico && (
            <ManejoPilar icon={Bug} tone="emerald" titulo="Los bichos que la ayudan a controlar" texto={manejo.biologico} />
          )}

          {/* Controladores biológicos del grafo (aristas CONTROLS) */}
          {controladores.length > 0 && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/25 p-3" data-testid="ficha-controladores">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-300 mb-1.5 flex items-center gap-1.5">
                <Bug size={13} aria-hidden="true" /> Controladores del grafo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {controladores.map((c) => (
                  <span key={c} className="inline-flex items-center px-2.5 py-1 rounded-lg border border-emerald-700/40 bg-emerald-900/30 text-emerald-100 text-xs">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {manejo?.cultural && (
            <ManejoPilar icon={ShieldCheck} tone="lime" titulo="Manejo de la mata (cultural)" texto={manejo.cultural} />
          )}

          {manejo?.prevencion && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-300" aria-hidden="true" /> Para que no vuelva
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{manejo.prevencion}</p>
            </div>
          )}

          {!manejo?.biopreparado && !manejo?.biologico && !manejo?.cultural && controladores.length === 0 && (
            <Empty>Sin manejo agroecológico registrado todavía — dato en camino.</Empty>
          )}

          {notaSuave && (
            <p className="text-[11px] text-amber-200/85 italic leading-relaxed flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-px shrink-0 text-amber-300/80" aria-hidden="true" />
              <span>{notaSuave}</span>
            </p>
          )}
          {dosisPendiente && (
            <p className="text-[11px] text-slate-500 italic leading-relaxed" data-testid="ficha-dosis-pendiente">
              Las DOSIS exactas del biopreparado están pendientes de verificar con la fuente — no se las inventamos. Antes de aplicar, revise la seguridad del insumo.
            </p>
          )}
        </div>
      </Section>

      {/* PROCEDENCIA */}
      <Procedencia fuente={fuente} confianzaLabel={confianzaLabel} />
    </article>
  );
}

/* ---------------------------------------------------------------- subcomp. */

/**
 * Retrato de la plaga. Foto CC con crédito honesto, o la viñeta dibujada a mano
 * del síntoma (nunca imagen rota). Scrim para legibilidad del crédito y sello
 * de piso de confianza arriba a la izquierda.
 */
function PlagaHero({ imagen, nombre, vineta, tipoEmoji }) {
  const seal = (
    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur px-2 py-1 text-[10px] font-bold text-emerald-100 ring-1 ring-white/15">
      <ShieldCheck size={11} aria-hidden="true" />
      Sanidad Chagra
    </span>
  );

  if (imagen?.url) {
    const credito = [imagen.source, imagen.license, imagen.rightsHolder].filter(Boolean).join(' · ');
    return (
      <figure className="relative w-full aspect-[16/10] sm:aspect-[2/1] bg-slate-900 overflow-hidden">
        <img
          src={imagen.thumbUrl || imagen.url}
          alt={`Foto de ${nombre}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
        {seal}
        <figcaption className="absolute bottom-0 inset-x-0 px-3 py-1.5 text-[10px] text-white/85 flex items-center gap-1">
          {imagen.sourceUrl ? (
            <a href={imagen.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
              <span className="opacity-70">Foto:</span> {credito}
              <ExternalLink size={10} className="opacity-80" aria-hidden="true" />
            </a>
          ) : (
            <><span className="opacity-70">Foto:</span> {credito}</>
          )}
        </figcaption>
      </figure>
    );
  }

  // Fallback: la viñeta dibujada a mano del síntoma (la misma de "Sanidad de la
  // mata"). No es una foto, pero es una lámina de campo real y honesta.
  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[2/1] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 50% 18%, #3b1b1b 0%, #2a1214 45%, #1b0f10 100%)' }}
      data-testid="plaga-photo-fallback"
      role="img"
      aria-label={`Sin foto de ${nombre}; ilustración del síntoma`}
    >
      {seal}
      <span className="w-32 h-32 flex items-center justify-center" aria-hidden="true">
        <SanidadSintomaVineta nombre={vineta} />
      </span>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-rose-200/70">
        <span aria-hidden="true">{tipoEmoji}</span> Foto en camino — así se ve el síntoma
      </p>
    </div>
  );
}

/**
 * Franja "clave de un vistazo": tipo, confianza, si hay umbral y a cuántos
 * cultivos/especies pega. Solo renderiza lo que existe.
 */
function GlanceStrip({ tipo, tipoEmoji, confianzaLabel, umbral, nAfecta }) {
  const tiles = [];
  if (tipo) tiles.push({ key: 'tipo', icon: Microscope, tone: 'rose', label: 'Qué es', value: `${tipoEmoji} ${tipo}` });
  if (confianzaLabel) tiles.push({ key: 'conf', icon: ShieldCheck, tone: 'sky', label: 'Confianza', value: confianzaLabel.replace('Confianza ', '').replace(' — desambigüe', '') });
  if (umbral) tiles.push({ key: 'umbral', icon: Clock, tone: 'indigo', label: 'Umbral', value: 'Sí, ver abajo' });
  if (nAfecta > 0) tiles.push({ key: 'afecta', icon: Sprout, tone: 'amber', label: 'Le pega a', value: `${nAfecta} ${nAfecta === 1 ? 'cultivo/especie' : 'cultivos/especies'}` });

  if (tiles.length === 0) return null;

  const TONE = {
    rose: 'text-rose-300',
    sky: 'text-sky-300',
    indigo: 'text-indigo-300',
    amber: 'text-amber-300',
  };

  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="plaga-glance">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.key} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <Icon size={12} className={TONE[tile.tone]} aria-hidden="true" />
                {tile.label}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-100 leading-tight">{tile.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Procedencia — la costura de confianza: la fuente institucional citada y el
 * grado de confianza. No inventa procedencia; si no hay fuente, no renderiza.
 */
function Procedencia({ fuente, confianzaLabel }) {
  if (!fuente) return null;
  return (
    <section className="px-4 pt-6" data-testid="plaga-procedencia">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
        <span aria-hidden="true" className="h-3.5 w-1 rounded-full bg-gradient-to-b from-sky-400 to-emerald-400" />
        <ShieldCheck size={15} className="text-sky-300" aria-hidden="true" />
        Procedencia
      </h3>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-700/50 bg-sky-950/30 px-2.5 py-1.5 text-xs leading-tight text-sky-200">
          <ShieldCheck size={12} className="text-sky-300/80 shrink-0" aria-hidden="true" />
          Fuente: <span className="font-bold">{fuente}</span>
        </span>
        {confianzaLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-xs leading-tight text-slate-300">
            {confianzaLabel}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        El manejo viene del catálogo de sanidad de Chagra (AGROSAVIA, Cenicafé, SciELO, FAO/IPM) y del grafo de conocimiento. Donde no hay fuente, no se inventa nada.
      </p>
    </section>
  );
}

function ManejoPilar({ icon, tone, titulo, texto }) {
  const Icon = icon;
  const TONE = {
    teal: { box: 'border-teal-700/40 bg-teal-950/30', head: 'text-teal-300' },
    emerald: { box: 'border-emerald-700/40 bg-emerald-950/30', head: 'text-emerald-300' },
    lime: { box: 'border-lime-700/40 bg-lime-950/25', head: 'text-lime-300' },
  }[tone] || { box: 'border-slate-700/50 bg-slate-900/60', head: 'text-slate-300' };
  return (
    <div className={`rounded-xl border p-3 ${TONE.box}`}>
      <p className={`text-xs font-black uppercase tracking-wide mb-1 flex items-center gap-1.5 ${TONE.head}`}>
        <Icon size={13} aria-hidden="true" /> {titulo}
      </p>
      <p className="text-sm text-slate-200 leading-relaxed">{texto}</p>
    </div>
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

function Pill({ icon, tone, children }) {
  const Icon = icon;
  const TONE = {
    rose: 'bg-rose-500/15 text-rose-200 border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  }[tone] || 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${TONE}`}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  );
}

const CONF_DOTS = { alta: 3, media: 2, baja: 1 };
function ConfianzaPill({ confianza, label }) {
  const dots = CONF_DOTS[confianza] ?? 2;
  const tone = confianza === 'alta'
    ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
    : confianza === 'baja'
      ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
      : 'bg-sky-500/15 text-sky-200 border-sky-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${tone}`} title={label}>
      <span aria-hidden="true" className="tracking-tight">{'●'.repeat(dots)}{'○'.repeat(3 - dots)}</span>
      {label}
    </span>
  );
}

function Empty({ children }) {
  return <p className="text-xs text-slate-500 italic">{children}</p>;
}

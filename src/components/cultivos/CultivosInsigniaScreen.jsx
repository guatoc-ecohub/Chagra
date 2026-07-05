/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda que SaludSueloScreen /
 * NutricionHumanaScreen; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Sprout, Mountain, FlaskConical, Users,
  Bug, ShieldCheck, Info, BookOpen, ExternalLink, Camera, Ban, Leaf,
} from 'lucide-react';
import {
  EDITORIAL, PISO_LABEL, PISO_ORDEN, NIVEL_DEMANDA, NUTRIENTE_INFO,
  NUTRIENTE_ORDEN, TIPO_PLAGA, FOTO_BASE,
} from '../../data/cultivosInsigniaEditorial';

/**
 * CultivosInsigniaScreen — «Los cultivos insignia» (mundo Cultivos y semillas).
 *
 * Le da VIDA visual, photo-forward, a lo que el grafo `chagra_kg` sabe de los
 * cultivos emblema de Colombia. Por cada uno, el campesino ve de un vistazo las
 * cuatro preguntas que importan:
 *   ¿DÓNDE va?          → piso térmico (GROWS_IN → PisoTermico: altitud + temp)
 *   ¿QUÉ le pide al suelo? → N/P/K (DEMANDA_NUTRIENTE: nivel + por qué + fuente)
 *   ¿CON QUÉ se lleva?   → asocios (COMPATIBLE_WITH) + la milpa / Tres Hermanas
 *   ¿QUÉ lo ataca?       → plagas (SUSCEPTIBLE_TO) y su manejo (Pest ← CONTROLS)
 *
 * FUENTE ÚNICA de los datos: grafo `chagra_kg`, exportado por
 * scripts/export-cultivos-insignia.mjs a public/cultivos-insignia.json (la PWA
 * no consulta AGE en vivo). Fotos reales de licencia abierta (Wikimedia
 * Commons) en public/crop-photos/ + atribución embebida. CERO invención: si el
 * grafo no trae un dato, la sección no se pinta.
 *
 * Legibilidad al sol + WCAG: superficies y texto vía tokens theme-aware
 * (slate/emerald/text-white, remapeados por tema). El texto SOBRE la foto usa
 * scrim oscuro FIJO + blanco literal (#fff, que el remapeo de temas claros no
 * vira) para leerse en cualquier tema. Colores vivos = solo grafismo (barras).
 * Animaciones sutiles con guarda prefers-reduced-motion (clases .ci-* en index.css).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function CultivosInsigniaScreen({ onBack, onNavigate }) {
  const [data, setData] = useState(null);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [selId, setSelId] = useState(null);
  const [creditos, setCreditos] = useState(false);
  const [meta, setMeta] = useState(null);

  const animar = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch('/cultivos-insignia.json')
      .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((j) => {
        if (!vivo) return;
        setData(j);
        setSelId(j.cultivos?.[0]?.id ?? null);
        setEstado('listo');
      })
      .catch(() => { if (vivo) setEstado('error'); });
    // Manifest de créditos (best-effort; no bloquea la pantalla).
    fetch(`${FOTO_BASE}/_meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (vivo && m) setMeta(m); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const cultivos = useMemo(() => data?.cultivos ?? [], [data]);
  const sel = useMemo(() => cultivos.find((c) => c.id === selId) ?? cultivos[0], [cultivos, selId]);

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight text-white flex items-center gap-1.5">
            <Sprout size={18} aria-hidden="true" /> Los cultivos insignia
          </h1>
          <p className="text-xs text-slate-400 leading-tight">Qué siembro, dónde, con qué, y qué lo ataca</p>
        </div>
      </header>

      <div className="px-4 pb-12">
        {estado === 'cargando' && (
          <p className="mt-8 text-center text-sm text-slate-400">Cargando los cultivos…</p>
        )}
        {estado === 'error' && (
          <p className="mt-8 text-center text-sm text-slate-100">
            No se pudieron cargar los cultivos. Intente de nuevo con conexión.
          </p>
        )}

        {estado === 'listo' && sel && (
          <div className="flex flex-col gap-4">
            {/* Gancho + fuente */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-[13px] uppercase tracking-wide font-bold" style={{ color: 'rgb(var(--t-accent-deep-rgb))' }}>
                Conozca sus matas
              </p>
              <p className="mt-1 text-[15px] text-slate-100 leading-snug">
                Cada cultivo quiere <span className="font-bold">su clima</span>, le pide algo distinto
                al <span className="font-bold">suelo</span>, tiene <span className="font-bold">buenas vecinas</span> y
                sus propias <span className="font-bold">plagas</span>. Toque uno y véalo completo.
              </p>
              <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug">
                <BookOpen size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>Todo sale del <span className="font-semibold text-slate-200">grafo de conocimiento de Chagra</span>. Piso térmico: IDEAM/IGAC. N-P-K: Agrosavia/Fedearroz/FAO.</span>
              </p>
            </section>

            {/* Roster: fila de cultivos con foto, seleccionable */}
            <nav className="-mx-4 px-4 overflow-x-auto ci-scroll" aria-label="Elija un cultivo">
              <ul className="flex gap-2.5 w-max">
                {cultivos.map((c) => {
                  const ed = EDITORIAL[c.id] || {};
                  const activo = c.id === sel.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelId(c.id)}
                        aria-pressed={activo}
                        data-testid={`crop-tile-${c.id}`}
                        className={`w-[92px] rounded-2xl overflow-hidden border-2 text-left transition ${
                          activo ? 'border-transparent' : 'border-slate-800 hover:border-slate-600'
                        }`}
                        style={activo ? { boxShadow: '0 0 0 3px rgb(var(--t-accent-rgb))' } : undefined}
                      >
                        <span className="relative block aspect-square bg-slate-950">
                          <CropImg slug={c.fotoSlug} emoji={c.emoji} nombre={ed.display || c.nombre} />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pt-4 pb-1">
                            <span className="block text-[11px] font-black text-[#ffffff] leading-tight truncate">
                              <span aria-hidden="true" className="mr-0.5">{c.emoji}</span>{ed.display || c.nombre}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Ficha del cultivo seleccionado */}
            <CultivoFicha cultivo={sel} animar={animar} onNavigate={onNavigate} />

            {/* Puentes a lo que ya existe */}
            {onNavigate ? (
              <div className="flex flex-col gap-2">
                <Puente
                  icon={Leaf}
                  titulo="Ver todas las especies"
                  sub="El directorio completo: qué puede sembrar en su clima."
                  onClick={() => onNavigate('directorio')}
                />
                <Puente
                  icon={Sprout}
                  titulo="Pregúntele a Chagra"
                  sub={`Dudas sobre sembrar ${(EDITORIAL[sel.id]?.display || sel.nombre).toLowerCase()}, con su fuente.`}
                  onClick={() => onNavigate('agente', { prompt: `¿Cómo siembro ${EDITORIAL[sel.id]?.display || sel.nombre} y qué le pide al suelo?` })}
                />
              </div>
            ) : null}

            {/* Créditos de fotos — cumplimiento de licencia abierta */}
            {meta && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <button
                  type="button"
                  onClick={() => setCreditos((v) => !v)}
                  aria-expanded={creditos}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <Camera size={15} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-300 flex-1">Créditos de las fotos (licencia abierta)</span>
                  <ChevronRight size={16} className={`text-slate-500 transition-transform ${creditos ? 'rotate-90' : ''}`} />
                </button>
                {creditos && (
                  <ul className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
                    {cultivos.map((c) => {
                      const cr = meta[c.fotoSlug];
                      if (!cr) return null;
                      return (
                        <li key={c.fotoSlug} className="text-[11px] text-slate-400 leading-snug">
                          <a
                            href={cr.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5"
                          >
                            {EDITORIAL[c.id]?.display || c.nombre}<ExternalLink size={10} className="inline shrink-0" />
                          </a>
                          <span className="text-slate-500"> — {cr.artist} · {cr.license} · Wikimedia Commons</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Ficha ──────────────────────────────────── */

function CultivoFicha({ cultivo, animar, onNavigate }) {
  const ed = EDITORIAL[cultivo.id] || {};
  const nombre = ed.display || cultivo.nombre;
  const pisos = ordenarPisos(cultivo.pisos);
  const nutrientes = ordenarNutrientes(cultivo.npk);

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden" data-testid={`ficha-${cultivo.id}`}>
      {/* Hero foto + identidad */}
      <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-slate-950">
        <CropImg slug={cultivo.fotoSlug} emoji={cultivo.emoji} nombre={nombre} big />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-14">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {cultivo.familia && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/15 text-[#ffffff]">
                {cultivo.familia}
              </span>
            )}
            {ed.milpa && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/85 text-[#06210f]">
                Milpa · Tres Hermanas
              </span>
            )}
          </div>
          <h2 className="text-[26px] font-black text-[#ffffff] leading-none drop-shadow">
            <span aria-hidden="true" className="mr-1.5">{cultivo.emoji}</span>{nombre}
          </h2>
          {cultivo.cientifico && (
            <p className="text-[12px] text-[#dbe4d6] italic leading-tight mt-0.5">{cultivo.cientifico}</p>
          )}
          {ed.lema && <p className="text-[13.5px] text-[#f0f4ec] leading-snug mt-1.5 font-medium">{ed.lema}</p>}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* ¿Dónde va? — piso térmico */}
        {pisos.length > 0 && (
          <Bloque icon={Mountain} titulo="¿Dónde va?" sub="El clima donde prospera">
            <div className="flex flex-wrap gap-2">
              {pisos.map((p) => {
                const pl = PISO_LABEL[p.id] || { nombre: p.id, emoji: '📍' };
                return (
                  <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 min-w-[128px]">
                    <p className="text-[13px] font-bold text-white leading-tight">
                      <span aria-hidden="true" className="mr-1">{pl.emoji}</span>{pl.nombre}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                      {altitudTexto(p)} · {tempTexto(p.temp)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Bloque>
        )}

        {/* ¿Qué le pide al suelo? — N/P/K */}
        {nutrientes.length > 0 && (
          <Bloque icon={FlaskConical} titulo="¿Qué le pide al suelo?" sub="Cuánto de cada alimento se lleva de la tierra">
            <div className="flex flex-col gap-2.5">
              {nutrientes.map((n) => (
                <DemandaBar key={n.simbolo} nutri={n} animar={animar} />
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">
              <Info size={12} className="inline mr-1 -mt-0.5" />
              Estos son los mismos N-P-K de su análisis de suelo. Un cultivo que pide «mucho» agota la tierra si no le devuelve abono.
            </p>
          </Bloque>
        )}

        {/* ¿Con qué se lleva? — asocios */}
        {cultivo.asocia?.length > 0 && (
          <Bloque icon={Users} titulo="¿Con qué se lleva?" sub="Buenas vecinas para sembrar cerca">
            {ed.milpa && (
              <p className="text-[13px] text-slate-200 leading-snug mb-2 rounded-lg bg-emerald-950/50 border border-emerald-800/50 p-2.5">
                <span className="font-bold text-emerald-300">La milpa (Tres Hermanas):</span> el maíz da el palo, el
                fríjol trepa y abona con nitrógeno, la ahuyama tapa el suelo. Juntas se cuidan.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {cultivo.asocia.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-100">
                  <Sprout size={12} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
                  {a.nombre}
                </span>
              ))}
            </div>
            {cultivo.asocia_total > cultivo.asocia.length && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                y {cultivo.asocia_total - cultivo.asocia.length} más en el grafo.
                {onNavigate ? (
                  <button type="button" onClick={() => onNavigate('asociaciones')} className="ml-1 underline font-semibold text-slate-300 hover:text-white">
                    Ver buenas vecinas
                  </button>
                ) : null}
              </p>
            )}
            {cultivo.incompat?.length > 0 && (
              <div className="mt-3 rounded-lg bg-rose-950/40 border border-rose-900/50 p-2.5">
                <p className="text-[11px] uppercase tracking-wider font-bold text-rose-300 mb-1 flex items-center gap-1">
                  <Ban size={12} aria-hidden="true" /> No las junte con
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cultivo.incompat.map((a) => (
                    <span key={a.id} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-rose-900/40 border border-rose-800/50 text-rose-100">
                      {a.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Bloque>
        )}

        {/* ¿Qué lo ataca? — plagas + manejo */}
        {cultivo.plagas?.length > 0 && (
          <Bloque icon={Bug} titulo="¿Qué lo ataca?" sub="Sus plagas y cómo manejarlas sin veneno">
            <div className="flex flex-col gap-2.5">
              {cultivo.plagas.map((p) => (
                <PlagaCard key={p.id} plaga={p} />
              ))}
            </div>
          </Bloque>
        )}
      </div>
    </article>
  );
}

/* ─────────────────────────── Piezas de UI ───────────────────────────────── */

function Bloque({ icon, titulo, sub, children }) {
  const Icon = icon;
  return (
    <section>
      <h3 className="text-[15px] font-black text-white flex items-center gap-2 leading-tight">
        <Icon size={17} style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
        {titulo}
      </h3>
      {sub && <p className="text-[12px] text-slate-400 leading-snug mb-2.5 mt-0.5">{sub}</p>}
      {children}
    </section>
  );
}

/** Barra de demanda de un nutriente: nivel → cuánto llena + palabra folk. */
function DemandaBar({ nutri, animar }) {
  const [porque, setPorque] = useState(false);
  const nivel = NIVEL_DEMANDA[nutri.nivel] || { pct: 20, palabra: nutri.nivel || '—' };
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 w-[112px] shrink-0 text-[12.5px] font-semibold text-slate-100">
          <span
            className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black text-[#0b1220] ${nutri.info.bar}`}
            aria-hidden="true"
          >
            {nutri.simbolo}
          </span>
          {nutri.info.nombre}
        </span>
        <div
          className="relative flex-1 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700"
          role="img"
          aria-label={`${nutri.info.nombre}: demanda ${nivel.palabra.toLowerCase()}`}
        >
          <div
            className={`${animar ? 'ci-bar ' : ''}h-full rounded-full ${nutri.info.bar}`}
            style={{ width: `${nivel.pct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-bold text-slate-100">
            {nivel.palabra}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1 pl-[120px]">
        <span className="text-[11px] text-slate-400 italic">{nutri.info.folk}</span>
        {nutri.nota && (
          <button
            type="button"
            onClick={() => setPorque((v) => !v)}
            aria-expanded={porque}
            className="text-[11px] font-semibold text-slate-300 hover:text-white underline decoration-slate-600"
          >
            {porque ? 'menos' : '¿por qué?'}
          </button>
        )}
      </div>
      {porque && nutri.nota && (
        <p className="text-[12px] text-slate-300 leading-snug mt-1 ml-[120px] rounded-lg bg-slate-800/70 border border-slate-700/60 p-2">
          {capitalizar(nutri.nota)}
          {nutri.fuente && <span className="block text-[10px] text-slate-500 mt-1">Fuente: {nutri.fuente}</span>}
        </p>
      )}
    </div>
  );
}

function PlagaCard({ plaga }) {
  const tp = TIPO_PLAGA[plaga.tipo] || { label: plaga.tipo || 'Plaga', emoji: '🐛' };
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5" aria-hidden="true">{tp.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-white leading-tight">{plaga.nombre}</p>
          <span className="inline-block text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">{tp.label}</span>
        </div>
      </div>
      {plaga.controles?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700/60">
          <p className="text-[10px] uppercase tracking-wider font-bold mb-1 flex items-center gap-1" style={{ color: 'rgb(var(--t-accent-deep-rgb))' }}>
            <ShieldCheck size={12} aria-hidden="true" /> Cómo se maneja
          </p>
          <ul className="flex flex-col gap-1">
            {plaga.controles.map((c, i) => (
              <li key={i} className="text-[12.5px] text-slate-200 leading-snug flex items-start gap-1.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
                {c.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Puente({ icon, titulo, sub, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 p-3 text-left transition"
    >
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.18)' }}>
        <Icon size={20} style={{ color: 'rgb(var(--t-accent-rgb))' }} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-white leading-tight">{titulo}</span>
        <span className="block text-[12px] text-slate-400 leading-snug">{sub}</span>
      </span>
      <ChevronRight size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
    </button>
  );
}

/** Foto de cultivo con fallback a emoji si no carga (offline / 404). */
function CropImg({ slug, emoji, nombre, big }) {
  const [ok, setOk] = useState(true);
  if (!ok) {
    return (
      <span className={`absolute inset-0 flex items-center justify-center ${big ? 'text-6xl' : 'text-3xl'}`} aria-hidden="true">
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={`${FOTO_BASE}/${slug}.jpg`}
      alt={`Foto de ${nombre}`}
      loading="lazy"
      decoding="async"
      onError={() => setOk(false)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

/* ──────────────────────────── Utilidades ────────────────────────────────── */

function ordenarPisos(pisos) {
  if (!Array.isArray(pisos)) return [];
  return [...pisos].sort((a, b) => PISO_ORDEN.indexOf(a.id) - PISO_ORDEN.indexOf(b.id));
}

function ordenarNutrientes(npk) {
  if (!npk) return [];
  return NUTRIENTE_ORDEN
    .filter((k) => npk[k])
    .map((k) => ({ simbolo: k, info: NUTRIENTE_INFO[k] || { nombre: k, folk: '', bar: 'bg-slate-500', dot: 'text-slate-400' }, ...npk[k] }));
}

function altitudTexto(p) {
  if (p.altMin == null && p.altMax == null) return '';
  if (p.altMax >= 9000) return `desde ${p.altMin} m`;
  if (p.altMin === 0) return `hasta ${p.altMax} m`;
  return `${p.altMin}–${p.altMax} m`;
}

function tempTexto(temp) {
  if (!temp) return '';
  return `${temp}°C`;
}

function capitalizar(s) {
  if (typeof s !== 'string' || !s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

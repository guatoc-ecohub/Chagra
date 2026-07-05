import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, Leaf, ShieldCheck, ShieldAlert, BookOpen, Layers, Mountain,
  Share2, Radio, WifiOff, RefreshCw, Sprout, Loader2,
} from 'lucide-react';
import SpeciesFicha from './SpeciesFicha.jsx';
import PedagogicalText from '../common/PedagogicalText.jsx';
import ChagraGrowLoader from '../ChagraGrowLoader.jsx';
import { fvhSkinClass } from '../../config/fvhSkin.js';
import {
  buildSpeciesFicha,
  LIVE_KNOWLEDGE_SECTIONS,
  isLiveGraphAvailable,
  fetchKnowledgeSection,
  fetchSpeciesConfirm,
  fetchLiveCompanions,
  fetchPestControllers,
  mergeCompanions,
  mergeControllers,
} from '../../services/especieFichaSidecar.js';

/**
 * EspecieFichaScreen — la Ficha de Especie REFERENCIADA (#2049), pantalla de
 * DETALLE photo-forward de cualquier especie del catálogo (~700), a la que se
 * llega por `#especie/<id>` desde el agente, el navegador del grafo o cultivos.
 *
 * Arquitectura: la ficha del catálogo (offline, `buildSpeciesFicha`) pinta al
 * instante — foto + identidad + piso térmico + ciclo + asociaciones/sanidad. En
 * paralelo, la ficha se ENRIQUECE en VIVO consultando el sidecar agro-mcp (las
 * mismas tools del agente): asocios frescos, controladores por plaga, y las
 * capas de conocimiento que la base no tiene (toxicidad, saberes, variedades,
 * suelo, cadenas multi-salto). Cada capa viva pinta su propio skeleton para no
 * congelar la ficha, y si el sidecar no responde, la base del catálogo la cubre.
 *
 * Reglas: superficie oscura opaca (legible al sol, WCAG AA en los 4 temas),
 * animaciones que respetan `prefers-reduced-motion`, y deflección honesta —
 * NUNCA se inventa un dato que el grafo no tiene.
 *
 * @param {object} props
 * @param {string} props.speciesId — id snake_case canónico del catálogo.
 * @param {() => void} [props.onBack]
 * @param {(id: string) => void} [props.onSelectSpecies] - navegar a otra especie.
 */
export default function EspecieFichaScreen({ speciesId, onBack, onSelectSpecies }) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'notfound'
  const [ficha, setFicha] = useState(null);
  const [liveMode, setLiveMode] = useState(false);
  const [confirm, setConfirm] = useState(null); // { speciesName, viabilidad } | null
  const [confirming, setConfirming] = useState(false);
  const [sections, setSections] = useState({}); // kind → { status, bloque, nota }
  const tokenRef = useRef(0);

  // Navegación entre especies: si el caller no la provee, caemos al hash router.
  const goToEspecie = useCallback(
    (id) => {
      if (!id) return;
      if (typeof onSelectSpecies === 'function') onSelectSpecies(id);
      else if (typeof window !== 'undefined') window.location.hash = `#especie/${id}`;
    },
    [onSelectSpecies],
  );

  // Dispara las capas VIVAS del grafo (extraído para el botón "reintentar").
  const runLive = useCallback((id, baseFicha, token) => {
    // Confirmación viva (get_species) → sello de cabecera.
    setConfirming(true);
    fetchSpeciesConfirm(id)
      .then((c) => { if (tokenRef.current === token) setConfirm(c); })
      .finally(() => { if (tokenRef.current === token) setConfirming(false); });

    // Asocios vivos (get_companions) → merge en la ficha base.
    fetchLiveCompanions(id).then((live) => {
      if (tokenRef.current !== token || !live) return;
      setFicha((prev) => (prev ? mergeCompanions(prev, live) : prev));
    });

    // Controladores vivos (get_pest_controllers) por cada plaga de la base
    // (acotado a 3 llamadas para no saturar el sidecar).
    const amenazas = Array.isArray(baseFicha?.amenazas) ? baseFicha.amenazas : [];
    amenazas.slice(0, 3).forEach((a, idx) => {
      if (!a?.nombre) return;
      fetchPestControllers(a.nombre).then((ctrls) => {
        if (tokenRef.current !== token || !ctrls.length) return;
        setFicha((prev) => (prev ? mergeControllers(prev, idx, ctrls) : prev));
      });
    });

    // Capas de conocimiento (bloques grounded) — cada una con su skeleton.
    setSections(() => {
      const init = {};
      for (const s of LIVE_KNOWLEDGE_SECTIONS) init[s.kind] = { status: 'loading' };
      return init;
    });
    for (const s of LIVE_KNOWLEDGE_SECTIONS) {
      fetchKnowledgeSection(s.tool, id).then((res) => {
        if (tokenRef.current !== token) return;
        setSections((prev) => ({ ...prev, [s.kind]: res }));
      });
    }
  }, []);

  // Carga la base offline + dispara el grafo vivo cuando cambia la especie.
  useEffect(() => {
    const token = ++tokenRef.current;
    setPhase('loading');
    setFicha(null);
    setConfirm(null);
    setSections({});
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });

    if (!speciesId) { setPhase('notfound'); return; }

    let cancelled = false;
    (async () => {
      let base = null;
      try {
        base = await buildSpeciesFicha(speciesId);
      } catch (_) {
        base = null;
      }
      if (cancelled || tokenRef.current !== token) return;
      if (!base) { setPhase('notfound'); return; }

      setFicha(base);
      setPhase('ready');

      const live = isLiveGraphAvailable();
      setLiveMode(live);
      if (live) runLive(speciesId, base, token);
    })();

    return () => { cancelled = true; };
  }, [speciesId, runLive]);

  const retryLive = useCallback(() => {
    if (!speciesId || !ficha) return;
    const token = ++tokenRef.current;
    setLiveMode(isLiveGraphAvailable());
    runLive(speciesId, ficha, token);
  }, [speciesId, ficha, runLive]);

  // ---- ESTADO: cargando la base ------------------------------------------
  if (phase === 'loading') {
    return (
      <ShellDark>
        <FichaTopBar onBack={onBack} title="Abriendo la ficha…" subtitle={speciesId} pill={<LivePill state="loading" />} />
        <div className="px-4 pt-3" data-testid="especie-loading">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ChagraGrowLoader size={54} ariaLabel="Abriendo la ficha de la especie" />
            <p className="mt-3 text-sm text-emerald-200/80">Buscando en el catálogo…</p>
          </div>
          <FichaSkeleton />
        </div>
      </ShellDark>
    );
  }

  // ---- ESTADO: no existe en el catálogo ----------------------------------
  if (phase === 'notfound' || !ficha) {
    return (
      <ShellDark>
        <FichaTopBar onBack={onBack} title="Especie no encontrada" />
        <div className="px-4 pt-10" data-testid="especie-notfound">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
            <Sprout size={34} className="mx-auto text-emerald-400/80" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold text-slate-100">Esta especie no está en el catálogo todavía.</h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              El identificador <code className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-200">{speciesId || '—'}</code>{' '}
              no corresponde a ninguna ficha. Búscala por nombre común o científico en el directorio.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-600/50 bg-emerald-900/40 px-4 text-sm font-bold text-emerald-100 hover:bg-emerald-800/50"
            >
              <ChevronLeft size={18} /> Volver
            </button>
          </div>
        </div>
      </ShellDark>
    );
  }

  // ---- ESTADO: ficha lista (base + enriquecimiento vivo) -----------------
  return (
    <ShellDark>
      <FichaTopBar
        onBack={onBack}
        title={ficha.comun}
        subtitle={ficha.cientifico}
        pill={<LivePill state={liveMode ? (confirming ? 'loading' : (confirm ? 'live' : 'idle')) : 'offline'} viabilidad={confirm?.viabilidad} onRetry={liveMode ? null : undefined} />}
      />

      <SpeciesFicha ficha={ficha} onSelectSpecies={goToEspecie} />

      {/* REGIÓN VIVA — conocimiento que solo aporta el grafo del sidecar */}
      <LiveKnowledgeRegion
        liveMode={liveMode}
        sections={sections}
        onRetry={retryLive}
      />

      <p className="px-4 pt-8 pb-12 text-center text-[11px] text-slate-600 leading-relaxed">
        Ficha del catálogo Chagra, enriquecida en vivo desde el grafo de conocimiento.
        <br />Donde el grafo no tiene el dato, no se inventa nada.
      </p>
    </ShellDark>
  );
}

/* --------------------------------------------------------------- estructura */

function ShellDark({ children }) {
  // Fondo sólido oscuro: garantiza contraste AA aunque el tema activo sea claro
  // (crema/durazno) — legible al sol.
  return (
    <div className={fvhSkinClass('jp-especie-ficha min-h-[100dvh] bg-slate-950 text-white')}>
      {children}
    </div>
  );
}

function FichaTopBar({ onBack, title, subtitle, pill }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-800/60 bg-slate-950/85 px-3 pt-[calc(12px+env(safe-area-inset-top))] pb-2 backdrop-blur">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex min-w-0 items-center gap-2">
        <Leaf size={20} className="shrink-0 text-emerald-400" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="jp-tinta truncate text-base font-bold leading-tight text-white">{title}</h1>
          {subtitle && (
            <p className="jp-tinta-suave truncate text-xs italic leading-tight text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {pill && <div className="ml-auto shrink-0">{pill}</div>}
    </header>
  );
}

/**
 * Sello de estado del grafo vivo (la costura de confianza de la cabecera).
 *  - 'live'    → verde, confirmado por el grafo (con viabilidad si la trae).
 *  - 'loading' → consultando el grafo (spinner discreto).
 *  - 'idle'    → grafo activo pero sin confirmación estructurada; neutro.
 *  - 'offline' → catálogo (grafo vivo inactivo).
 */
function LivePill({ state, viabilidad }) {
  if (state === 'offline') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1 text-[10px] font-bold text-slate-300" title="Grafo vivo inactivo — se muestra la ficha del catálogo.">
        <WifiOff size={11} aria-hidden="true" /> Catálogo
      </span>
    );
  }
  if (state === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/50 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
        <Loader2 size={11} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Grafo…
      </span>
    );
  }
  const via = typeof viabilidad === 'string' ? viabilidad.toLowerCase() : '';
  const viaLabel = via === 'viable' ? 'viable' : via === 'marginal' ? 'marginal' : via === 'inviable' ? 'no viable' : '';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-600/50 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200"
      title="Datos confirmados en vivo por el grafo de conocimiento."
    >
      <Radio size={11} aria-hidden="true" /> Grafo vivo{viaLabel ? ` · ${viaLabel}` : ''}
    </span>
  );
}

/* ------------------------------------------------------------- región viva */

const ACCENT = {
  rose: { bar: 'from-rose-400 to-pink-400', icon: 'text-rose-300', card: 'border-rose-800/40 bg-rose-950/20' },
  indigo: { bar: 'from-indigo-400 to-violet-400', icon: 'text-indigo-300', card: 'border-indigo-800/30 bg-indigo-950/20' },
  teal: { bar: 'from-teal-400 to-cyan-400', icon: 'text-teal-300', card: 'border-teal-700/40 bg-teal-950/25' },
  amber: { bar: 'from-amber-400 to-orange-400', icon: 'text-amber-300', card: 'border-amber-700/40 bg-amber-950/20' },
  emerald: { bar: 'from-emerald-400 to-teal-400', icon: 'text-emerald-300', card: 'border-emerald-800/40 bg-emerald-950/25' },
};

const SECTION_ICON = {
  toxicidad: ShieldAlert,
  saberes: BookOpen,
  variedades: Layers,
  suelo: Mountain,
  multihop: Share2,
};

/**
 * Región de conocimiento vivo. Muestra las capas del grafo que la base offline
 * no tiene. Estados: skeleton mientras carga; card grounded cuando hay dato;
 * y agrupa (compactas) las ausencias honestas y los errores para no meter ruido.
 */
function LiveKnowledgeRegion({ liveMode, sections, onRetry }) {
  // Fallback offline elegante: si el grafo vivo está inactivo, una sola nota.
  if (!liveMode) {
    return (
      <section className="px-4 pt-6" data-testid="especie-live-offline">
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <WifiOff size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="font-bold text-slate-300">Grafo vivo inactivo.</span> Estás viendo la ficha
            del catálogo (funciona sin conexión). Cuando el grafo esté disponible, esta ficha suma
            toxicidad, saberes, variedades, suelo y cadenas ecológicas en vivo.
          </p>
        </div>
      </section>
    );
  }

  const ready = [];
  const loading = [];
  const empty = [];
  const errored = [];
  for (const cfg of LIVE_KNOWLEDGE_SECTIONS) {
    const st = sections[cfg.kind]?.status || 'loading';
    if (st === 'ready') ready.push(cfg);
    else if (st === 'empty') empty.push(cfg);
    else if (st === 'error') errored.push(cfg);
    else loading.push(cfg); // 'loading' | 'offline' (transitorio)
  }

  return (
    <section className="px-4 pt-7" data-testid="especie-live-region">
      <h3 className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
        <span aria-hidden="true" className="h-3.5 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400" />
        <Radio size={15} className="text-emerald-300" aria-hidden="true" />
        Del grafo de conocimiento, en vivo
      </h3>
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        Consultado en el momento al sidecar del proyecto — las mismas fuentes que usa el agente.
      </p>

      <div className="space-y-4">
        {loading.map((cfg) => (
          <KnowledgeSkeleton key={cfg.kind} cfg={cfg} />
        ))}
        {ready.map((cfg) => (
          <KnowledgeCard key={cfg.kind} cfg={cfg} data={sections[cfg.kind]} />
        ))}
      </div>

      {empty.length > 0 && (
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500" data-testid="especie-live-empty">
          <span className="font-bold text-slate-400">Todavía sin datos en el grafo:</span>{' '}
          {empty.map((c) => c.title.toLowerCase()).join(' · ')}.
        </p>
      )}

      {errored.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500" data-testid="especie-live-error">
          <span>No se pudo consultar el grafo para: {errored.map((c) => c.title.toLowerCase()).join(' · ')}.</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw size={12} aria-hidden="true" /> Reintentar
          </button>
        </div>
      )}
    </section>
  );
}

function KnowledgeCard({ cfg, data }) {
  const acc = ACCENT[cfg.accent] || ACCENT.emerald;
  const Icon = SECTION_ICON[cfg.kind] || BookOpen;
  const bloque = data?.bloque || '';
  const tone = cfg.kind === 'saberes' || cfg.kind === 'multihop' ? 'indigo' : 'slate';
  return (
    <div data-testid={`especie-live-${cfg.kind}`}>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
        <span aria-hidden="true" className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${acc.bar}`} />
        <Icon size={15} className={acc.icon} aria-hidden="true" />
        {cfg.title}
      </h4>
      <div className={`rounded-xl border p-3.5 ${acc.card}`}>
        {bloque ? (
          <PedagogicalText texto={bloque} tone={tone} testId={`especie-live-${cfg.kind}-body`} />
        ) : (
          <p className="text-sm italic text-slate-400">{cfg.emptyText}</p>
        )}
      </div>
    </div>
  );
}

function KnowledgeSkeleton({ cfg }) {
  const acc = ACCENT[cfg.accent] || ACCENT.emerald;
  const Icon = SECTION_ICON[cfg.kind] || BookOpen;
  return (
    <div data-testid={`especie-live-${cfg.kind}-skeleton`} role="status" aria-busy="true">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
        <span aria-hidden="true" className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${acc.bar}`} />
        <Icon size={15} className={acc.icon} aria-hidden="true" />
        {cfg.title}
        <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold normal-case tracking-normal text-emerald-300/70">
          <Loader2 size={10} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> consultando el grafo…
        </span>
      </h4>
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
        <ShimmerLine w="w-3/4" />
        <ShimmerLine w="w-full" />
        <ShimmerLine w="w-5/6" />
      </div>
    </div>
  );
}

function FichaSkeleton() {
  return (
    <div className="mt-2 space-y-3" role="status" aria-busy="true" data-testid="especie-ficha-skeleton">
      <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-slate-800/60 motion-reduce:animate-none" />
      <ShimmerLine w="w-1/2" h="h-5" />
      <ShimmerLine w="w-2/3" />
      <div className="grid grid-cols-2 gap-2 pt-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/50 motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}

function ShimmerLine({ w = 'w-full', h = 'h-3.5' }) {
  return <div className={`${h} ${w} animate-pulse rounded bg-slate-700/50 motion-reduce:animate-none`} aria-hidden="true" />;
}

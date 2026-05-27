import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Sprout, Leaf, BookOpen, Database, Droplet, TreePine, Users, ShieldCheck,
  FileCheck, Cloud, Maximize2, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import ChagraAgentAvatar from './ChagraAgentAvatar';

/**
 * WelcomeStatsHero — widget de bienvenida con narrativa de impacto del agente.
 *
 * Operator feedback acumulado 2026-05-18:
 * - 'el carousel debe estar enfocado en estadísticas tipo el agente Chagra
 *   al frente del sistema de riego ayudó a ahorrar X litros en X días'.
 * - 'me registra 0 especies cuando tengo por lo menos 30, y 0 plantas
 *   cuando tengo cerca de 100' → bug: getCatalogStats no existía y los
 *   fallbacks arrancaban en 0. Plants count pre-login = 0 porque el store
 *   no hidrata hasta after login → cambiar a stats globales pre-login.
 * - 'usar más espacio a lo ancho, agregar versión ampliable más linda
 *   para demo módulo a módulo, y stats clickeables que naveguen al lugar
 *   pertinente'.
 *
 * Modos:
 * - `mode="pre-login"` (defecto en LoginScreen): estadísticas globales
 *   federadas de fincas-publicas.json + catálogo. NO usa plantsCount del
 *   operator porque el store aún no hidrata.
 * - `mode="post-login"`: incluye plantsCount del operator + stats catálogo.
 *
 * Variantes UI:
 * - Compacta: hero card rotativa + dots + minor 2x2.
 * - Expandida (modal): full-screen demo-listo, todas las stats visibles
 *   en grid + descripción larga + breakdown federado. Toggle con botón.
 */

// Feedback UX usuaria piloto 2026-05-19: 6s era muy poco para leer el card.
// 9s da tiempo cómodo de lectura sin sentir el carrusel "atascado".
const HERO_ROTATION_MS = 9000;
// Tras click manual (flecha/dot) damos 5s extra antes de retomar el auto-advance,
// para que el usuario pueda leer el card que acaba de elegir sin interrupciones.
const HERO_PAUSE_AFTER_INTERACTION_MS = 5000;
const MONITOR_DAYS_PER_PLANT = 90;
const DRIP_SAVING_L_PER_DAY = 5;
const CO2_KG_PER_TREE_YEAR = 22;
const TREE_FRACTION = 0.3;

// Fallback inicial: el catálogo seed tiene exactamente estos números.
// Renderizar valores reales desde el primer paint evita el destello "0".
//
// Sincronizado 2026-05-27 con `catalog/chagra-catalog-oss-subset-v3.2.json`
// (production seed bundled en el PWA) + `public/cycle-content/manifest.json`:
//   - species: 204 (subset v3.2)
//   - biopreparados: 36
//   - ragDocs: 491 (slugs del manifest, fichas pedagógicas embebidas)
//   - sourcesTierA: 50 (sources con tier === 'A')
//   - endangeredCount: 5 (conservation_status === 'nativo_protegido')
//   - endemicasCount: 1 (conservation_status === 'endemica_colombia')
//   - invasorasCount: 10 (category === 'especies_invasoras')
const CATALOG_FALLBACK = {
  species: 204,
  biopreparados: 36,
  ragDocs: 491,
  sourcesTierA: 50,
  endangeredCount: 5,
  endemicasCount: 1,
  invasorasCount: 10,
};

// Federación pre-login: cuando no hay store hidratado, usar números globales
// agregados. Hoy hay 1 finca activa (Guatoc) pero proyectamos crecimiento
// honesto: ~100 plantas registradas Guatoc + planificadas demo institucional.
const GLOBAL_FEDERATION_FALLBACK = {
  fincasActivas: 1,
  plantasRegistradas: 100,
};

function buildHeroStats({ plantsCount, species, ragDocs, biopreparados, sourcesTierA, endangeredCount, endemicasCount, invasorasCount, mode }) {
  const isPreLogin = mode === 'pre-login';
  const displayPlants = isPreLogin ? GLOBAL_FEDERATION_FALLBACK.plantasRegistradas : plantsCount;
  const aguaAhorradaL = Math.max(0, displayPlants) * DRIP_SAVING_L_PER_DAY * MONITOR_DAYS_PER_PLANT;
  const co2KgAnio = Math.max(0, displayPlants) * TREE_FRACTION * CO2_KG_PER_TREE_YEAR;
  const plantsLabel = displayPlants === 1 ? 'planta' : 'plantas';
  const scopeNote = isPreLogin ? 'en la red Chagra' : 'en tu finca';

  return [
    {
      key: 'agua',
      icon: Droplet,
      headline: 'El agente Chagra al frente del riego',
      value: aguaAhorradaL.toLocaleString('es-CO'),
      unit: `litros ahorrados en ${MONITOR_DAYS_PER_PLANT} días`,
      tone: 'cyan',
      story: `Acompañando ${displayPlants.toLocaleString('es-CO')} ${plantsLabel} con riego por goteo ${scopeNote}, en lugar de aspersión.`,
      caption: 'Factor FAO + AGROSAVIA · 5 L/día por planta',
      navTarget: 'biodiversidad',
    },
    {
      key: 'co2',
      icon: Cloud,
      headline: 'El agente Chagra cuida el aire',
      value: Math.round(co2KgAnio).toLocaleString('es-CO'),
      unit: 'kg de CO₂ secuestrados al año',
      tone: 'lime',
      story: `Monitoreando árboles nativos andinos sembrados ${scopeNote} con Chagra.`,
      caption: 'Factor IDEAM-MADS · 22 kg CO₂/año por árbol joven',
      navTarget: 'biodiversidad',
    },
    {
      key: 'especies',
      icon: Leaf,
      headline: 'El agente Chagra conoce',
      value: species,
      unit: 'especies del catálogo colombiano',
      tone: 'emerald',
      story: 'Sugiere nativas, advierte invasoras y propone asociaciones agroecológicas.',
      caption: 'Catálogo curado científicamente',
      navTarget: 'activos',
    },
    {
      key: 'protegidas',
      icon: ShieldCheck,
      headline: 'El agente Chagra protege',
      value: endangeredCount + endemicasCount,
      unit: 'especies endémicas y en peligro',
      tone: 'amber',
      story: 'Marca riesgos UICN y prioriza conservación in-situ con el campesino.',
      caption: `${endangeredCount} en peligro · ${endemicasCount} endémicas colombianas`,
      navTarget: 'biodiversidad',
    },
    {
      key: 'pueblos',
      icon: Users,
      headline: 'El agente Chagra recoge saberes',
      value: 8,
      unit: 'pueblos custodios documentados',
      tone: 'fuchsia',
      story: 'Conocimiento ancestral validado y entregado en cada recomendación.',
      caption: 'Embera · Wounaan · Tikuna · Bora · Muisca · Wayúu · Kogui · Inga',
      navTarget: 'biodiversidad',
    },
    {
      key: 'invasoras',
      icon: TreePine,
      headline: 'El agente Chagra alerta sobre invasoras',
      value: invasorasCount,
      unit: 'especies invasoras vigiladas',
      tone: 'orange',
      story: 'Sugiere sustitución por nativas y rutas de manejo agroecológico.',
      caption: 'Ulex · kikuyo · retamo · eucalipto · etc.',
      navTarget: 'reportar_invasora',
    },
    {
      key: 'biopreparados',
      icon: Database,
      headline: 'El agente Chagra reemplaza químicos',
      value: biopreparados,
      unit: 'biopreparados orgánicos sugeridos',
      tone: 'yellow',
      story: 'Bocashi, caldo bordelés, Trichoderma, neem, Bt y más, paso a paso.',
      caption: 'Sin glifosato · sin agroquímicos',
      navTarget: 'bodega',
    },
    {
      key: 'fuentes',
      icon: FileCheck,
      headline: 'El agente Chagra cita fuentes Tier A',
      value: sourcesTierA,
      unit: 'papers y guías institucionales',
      tone: 'sky',
      story: 'Cada respuesta respaldada por evidencia trazable.',
      caption: 'POWO · GBIF · IAvH · AGROSAVIA · ICA · UNAL · Humboldt',
      navTarget: 'agente',
    },
    {
      key: 'offline',
      icon: BookOpen,
      headline: 'El agente Chagra funciona offline',
      value: ragDocs,
      unit: 'fichas pedagógicas embebidas',
      tone: 'violet',
      story: 'Sin internet, sin nube ajena. RAG local con privacidad total.',
      caption: 'Soberanía digital campesina',
      navTarget: 'agente',
    },
  ];
}

const TONE_CLASSES = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60', accent: 'bg-emerald-500' },
  cyan: { text: 'text-cyan-300', bg: 'bg-cyan-950/40', border: 'border-cyan-800/60', accent: 'bg-cyan-500' },
  lime: { text: 'text-lime-300', bg: 'bg-lime-950/40', border: 'border-lime-800/60', accent: 'bg-lime-500' },
  amber: { text: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-800/60', accent: 'bg-amber-500' },
  fuchsia: { text: 'text-fuchsia-300', bg: 'bg-fuchsia-950/40', border: 'border-fuchsia-800/60', accent: 'bg-fuchsia-500' },
  sky: { text: 'text-sky-300', bg: 'bg-sky-950/40', border: 'border-sky-800/60', accent: 'bg-sky-500' },
  orange: { text: 'text-orange-300', bg: 'bg-orange-950/40', border: 'border-orange-800/60', accent: 'bg-orange-500' },
  violet: { text: 'text-violet-300', bg: 'bg-violet-950/40', border: 'border-violet-800/60', accent: 'bg-violet-500' },
  yellow: { text: 'text-yellow-300', bg: 'bg-yellow-950/40', border: 'border-yellow-800/60', accent: 'bg-yellow-500' },
};

/**
 * AgentColibriChip — colibri clickable que abre el agente desde el home.
 * Default idle (vuelo estacionario), hover thinking (libando), click navega.
 * Se anima en mouse over para invitar al click y en touch press en mobile.
 */
function AgentColibriChip({ onNavigate, size = 26 }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interactive = typeof onNavigate === 'function';
  const state = pressed ? 'speaking' : hover ? 'thinking' : 'idle';

  const handleClick = () => { if (interactive) onNavigate('agente'); };
  const enter = () => setHover(true);
  const leave = () => { setHover(false); setPressed(false); };
  const down = () => setPressed(true);
  const up = () => setPressed(false);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!interactive}
      aria-label="Abrir Chagra IA"
      title={interactive ? 'Abrir Chagra IA' : 'Chagra IA'}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onMouseDown={down}
      onMouseUp={up}
      onTouchStart={() => { setHover(true); setPressed(true); }}
      onTouchEnd={() => { setHover(false); setPressed(false); }}
      onFocus={enter}
      onBlur={leave}
      className={`shrink-0 inline-flex items-center justify-center rounded-full bg-slate-900 border ${
        hover ? 'border-emerald-400/70 shadow-[0_0_10px_rgba(16,185,129,.45)]' : 'border-emerald-700/40'
      } ${interactive ? 'cursor-pointer' : 'cursor-default opacity-90'} overflow-hidden transition-all duration-200`}
      style={{
        width: size + 6,
        height: size + 6,
        transform: pressed ? 'scale(0.94)' : hover ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      <ChagraAgentAvatar state={state} size={size} ariaLabel="Chagra IA" />
    </button>
  );
}

export default function WelcomeStatsHero({ mode = 'post-login', onNavigate }) {
  const isPreLogin = mode === 'pre-login';
  const plantsCount = useAssetStore((s) => s.plants?.length ?? 0);
  const [catalogStats, setCatalogStats] = useState(CATALOG_FALLBACK);
  const [fincasActivas, setFincasActivas] = useState(GLOBAL_FEDERATION_FALLBACK.fincasActivas);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Pausa temporal tras interacción manual (flecha/dot click). Guardamos
  // un timestamp en ref para no re-renderizar al setearlo; el effect de
  // auto-advance lo lee al armar el setTimeout.
  const pausedUntilRef = useRef(0);
  const [pauseTick, setPauseTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      try {
        // ragDocs desde manifest (fuente de verdad del corpus deployado)
        let ragDocs = CATALOG_FALLBACK.ragDocs;
        try {
          const manifestRes = await fetch('/cycle-content/manifest.json');
          const manifest = await manifestRes.json();
          if (Array.isArray(manifest.slugs)) ragDocs = manifest.slugs.length;
        } catch { /* keep fallback */ }

        // catalogStats desde SQLite (cuando esté listo)
        let species = CATALOG_FALLBACK.species;
        let biopreparados = CATALOG_FALLBACK.biopreparados;
        let sourcesTierA = CATALOG_FALLBACK.sourcesTierA;
        let endangeredCount = CATALOG_FALLBACK.endangeredCount;
        let endemicasCount = CATALOG_FALLBACK.endemicasCount;
        let invasorasCount = CATALOG_FALLBACK.invasorasCount;
        try {
          const { getCatalogStats } = await import('../db/catalogDB');
          if (typeof getCatalogStats === 'function') {
            const stats = await getCatalogStats();
            if (stats) {
              species = stats.species ?? species;
              biopreparados = stats.biopreparados ?? biopreparados;
              sourcesTierA = stats.sourcesTierA ?? sourcesTierA;
              endangeredCount = stats.endangered ?? endangeredCount;
              endemicasCount = stats.endemicas ?? endemicasCount;
              invasorasCount = stats.invasoras ?? invasorasCount;
            }
          }
        } catch { /* keep fallback */ }

        if (alive) setCatalogStats({ species, biopreparados, ragDocs, sourcesTierA, endangeredCount, endemicasCount, invasorasCount });

        // Fincas federadas (pre-login)
        if (isPreLogin) {
          try {
            const fincasRes = await fetch('/fincas-publicas.json');
            const fincas = await fincasRes.json();
            if (alive && Array.isArray(fincas)) setFincasActivas(fincas.filter(f => f.estado === 'activo').length);
          } catch { /* keep fallback */ }
        }
      } catch (err) {
        console.warn('[WelcomeStatsHero] Failed to load stats:', err);
      }
    };
    loadStats();
    return () => { alive = false; };
  }, [isPreLogin]);

  const heroStats = useMemo(
    () => buildHeroStats({ plantsCount, ...catalogStats, mode }),
    [plantsCount, catalogStats, mode],
  );

  useEffect(() => {
    if (expanded) return undefined; // pausar rotación en modo expandido
    if (isHovered) return undefined; // pausar mientras el mouse está encima
    const now = Date.now();
    const remainingPause = pausedUntilRef.current - now;
    // Si estamos dentro de la ventana de pausa post-interacción, esperar
    // ese tiempo extra antes del próximo avance; si no, ROTATION_MS normal.
    const delay = remainingPause > 0 ? remainingPause + HERO_ROTATION_MS : HERO_ROTATION_MS;
    const timeout = setTimeout(() => {
      setCarouselIndex((prev) => (prev + 1) % heroStats.length);
    }, delay);
    return () => clearTimeout(timeout);
  }, [heroStats.length, expanded, isHovered, carouselIndex, pauseTick]);

  const pauseAutoAdvance = useCallback(() => {
    pausedUntilRef.current = Date.now() + HERO_PAUSE_AFTER_INTERACTION_MS;
    setPauseTick((t) => t + 1); // dispara re-run del effect con el nuevo delay
  }, []);

  const goToIndex = useCallback((idx) => {
    setCarouselIndex(idx);
    pauseAutoAdvance();
  }, [pauseAutoAdvance]);

  const goPrev = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + heroStats.length) % heroStats.length);
    pauseAutoAdvance();
  }, [heroStats.length, pauseAutoAdvance]);

  const goNext = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % heroStats.length);
    pauseAutoAdvance();
  }, [heroStats.length, pauseAutoAdvance]);

  const handleStatClick = useCallback((stat) => {
    if (typeof onNavigate === 'function' && stat?.navTarget) {
      onNavigate(stat.navTarget);
      setExpanded(false);
    }
  }, [onNavigate]);

  const current = heroStats[carouselIndex] || heroStats[0];
  const CurrentIcon = current.icon;
  const tone = TONE_CLASSES[current.tone] || TONE_CLASSES.emerald;

  return (
    <>
      <section
        className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 sm:p-5 space-y-4 w-full"
        aria-label="Impacto del agente Chagra"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          {/* Header con colibri clickable → abre el agente desde el home.
              Hover anima a state thinking (libando), click navega y muestra el
              tap feedback con scale. Si no hay onNavigate, queda inerte como
              header decorativo (ej. en pre-login). */}
          <h2 className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 min-w-0">
            <AgentColibriChip onNavigate={onNavigate} size={26} />
            <span className="truncate">Agente Chagra · impacto</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {isPreLogin && (
              <span className="text-[10px] text-slate-500 italic hidden sm:inline">
                {fincasActivas} {fincasActivas === 1 ? 'finca' : 'fincas'} · red Chagra
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800/60"
              aria-label="Ampliar resumen Chagra"
              title="Ver versión ampliada"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          className={`${tone.bg} ${tone.border} border rounded-2xl p-5 sm:p-6 transition-all duration-500 animate-in fade-in w-full hover:border-slate-600 group relative`}
          key={carouselIndex}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="region"
          aria-roledescription="carrusel"
          aria-label={`Historia ${carouselIndex + 1} de ${heroStats.length}: ${current.headline}`}
        >
          {/* Flecha izquierda: discreta, opacity sube en hover (desktop) y
              full-opacity siempre en touch para descubribilidad mobile. */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Historia anterior"
            title="Anterior"
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-slate-900/70 text-slate-300 hover:text-slate-100 hover:bg-slate-800/90 opacity-70 sm:opacity-0 sm:group-hover:opacity-80 focus-visible:opacity-100 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Historia siguiente"
            title="Siguiente"
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-slate-900/70 text-slate-300 hover:text-slate-100 hover:bg-slate-800/90 opacity-70 sm:opacity-0 sm:group-hover:opacity-80 focus-visible:opacity-100 hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handleStatClick(current)}
            className="block w-full text-left"
            aria-label={current.navTarget ? `Ver módulo ${current.navTarget}` : current.headline}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <CurrentIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${tone.text} shrink-0 mt-1`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-300 font-bold leading-tight">
                  {current.headline}
                </div>
                <div className={`text-4xl sm:text-5xl font-black ${tone.text} leading-none mt-2`}>
                  {current.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-200 mt-1.5 font-medium">
                  {current.unit}
                </div>
                {current.story && (
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-2 leading-snug">
                    {current.story}
                  </div>
                )}
                {current.caption && (
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-snug italic">
                    {current.caption}
                  </div>
                )}
                {onNavigate && current.navTarget && (
                  <div className="flex items-center gap-1 mt-3 text-[10px] sm:text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                    <span>Ver módulo</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          </button>
          <div className="flex justify-center gap-1.5 mt-4 sm:mt-5">
            {heroStats.map((s, idx) => (
              <button
                key={s.key}
                type="button"
                onClick={() => goToIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === carouselIndex ? `w-6 ${tone.accent}` : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Ver historia ${idx + 1}`}
                aria-current={idx === carouselIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2">
            <Sprout className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-black text-lime-300 leading-tight">
                {isPreLogin ? GLOBAL_FEDERATION_FALLBACK.plantasRegistradas : plantsCount}
              </div>
              <div className="text-[9px] text-slate-500 truncate">
                {isPreLogin ? 'Plantas registradas' : (plantsCount === 1 ? 'Planta tuya' : 'Plantas tuyas')}
              </div>
            </div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-black text-violet-300 leading-tight">{catalogStats.ragDocs}</div>
              <div className="text-[9px] text-slate-500 truncate">Fichas IA</div>
            </div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2 col-span-2 sm:col-span-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-black text-emerald-300 leading-tight">{catalogStats.species}</div>
              <div className="text-[9px] text-slate-500 truncate">Especies catálogo</div>
            </div>
          </div>
        </div>
      </section>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Resumen ampliado del agente Chagra"
        >
          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2 pt-4">
              <div>
                <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-black uppercase tracking-wider text-slate-200">
                  <AgentColibriChip onNavigate={onNavigate} size={38} />
                  Agente Chagra · impacto
                </h2>
                {isPreLogin && (
                  <p className="text-xs text-slate-400 mt-1">
                    Datos federados de {fincasActivas} {fincasActivas === 1 ? 'finca activa' : 'fincas activas'} en la red Chagra
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-slate-100 p-2 rounded-md hover:bg-slate-800/60 transition-colors"
                aria-label="Cerrar resumen ampliado"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {heroStats.map((stat) => {
                const StatIcon = stat.icon;
                const t = TONE_CLASSES[stat.tone] || TONE_CLASSES.emerald;
                return (
                  <button
                    key={stat.key}
                    type="button"
                    onClick={() => handleStatClick(stat)}
                    disabled={!onNavigate}
                    className={`${t.bg} ${t.border} border rounded-xl p-4 sm:p-5 text-left transition-all hover:scale-[1.02] hover:border-slate-500 ${onNavigate ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <StatIcon className={`w-7 h-7 ${t.text} mb-3`} aria-hidden="true" />
                    <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold leading-tight">
                      {stat.headline}
                    </div>
                    <div className={`text-4xl font-black ${t.text} leading-none mt-2`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-200 mt-1.5 font-medium">
                      {stat.unit}
                    </div>
                    {stat.story && (
                      <div className="text-xs text-slate-400 mt-3 leading-snug">
                        {stat.story}
                      </div>
                    )}
                    {stat.caption && (
                      <div className="text-[11px] text-slate-500 mt-2 leading-snug italic">
                        {stat.caption}
                      </div>
                    )}
                    {onNavigate && stat.navTarget && (
                      <div className="flex items-center gap-1 mt-4 text-xs text-slate-400">
                        <span>Ir al módulo</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-500 italic text-center pt-2 pb-6">
              Soberanía alimentaria · agroecología campesina colombiana · código abierto AGPL-3.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}

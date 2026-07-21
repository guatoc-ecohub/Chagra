import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Sprout, Leaf, BookOpen, Database, Droplet, TreePine, Users, ShieldCheck,
  FileCheck, Cloud, Maximize2, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
} from 'lucide-react';
import useAssetStore from '../store/useAssetStore';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import { MSG } from '../config/messages.js';

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
 *
 * Fuente de verdad de especies/biopreparados/fuentes Tier A (2026-07-01,
 * cierre de drift de cifras entre superficies): se prioriza
 * `fetch('/chagra-stats.json')` — el JSON único generado en build por
 * `scripts/gen-chagra-stats.mjs` (ver #1938) que evita que este componente
 * contradiga el one-pager u otras superficies con números fabricados. Si
 * ese archivo todavía no existe en el deploy o el fetch falla, se conserva
 * el conteo SQLite en vivo (`getCatalogStats`) y, en último caso,
 * `CATALOG_FALLBACK`.
 */

// Feedback UX usuaria piloto 2026-05-19: 6s era muy poco para leer el card.
// 9s da tiempo cómodo de lectura sin sentir el carrusel "atascado".
const HERO_ROTATION_MS = 9000;
// Tras click manual (flecha/dot) damos 5s extra antes de retomar el auto-advance,
// para que el usuario pueda leer el card que acaba de elegir sin interrupciones.
const HERO_PAUSE_AFTER_INTERACTION_MS = 5000;
const MONITOR_DAYS_PER_PLANT = 90;
const DRIP_SAVING_L_PER_DAY = 5;

// Último recurso: solo se usa si `chagra-stats.json` todavía no existe en
// este deploy o el fetch falla, y además falla el conteo SQLite en vivo.
// Renderizar valores razonables desde el primer paint evita el destello "0";
// NO representan la fuente de verdad actual del catálogo (esa vive en
// `public/chagra-stats.json`, ver #1938).
const CATALOG_FALLBACK = {
  species: 486,
  biopreparados: 19,
  ragDocs: 176,
  sourcesTierA: 52,
  endangeredCount: 18,
  endemicasCount: 9,
  invasorasCount: 17,
};

// Fuente única de verdad del catálogo/grafo (generada en build por
// scripts/gen-chagra-stats.mjs, ver #1938). Se consume vía fetch directo
// porque el hook de conveniencia `useChagraStats` todavía no está en main.
const CHAGRA_STATS_URL = '/chagra-stats.json';

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
  const plantsLabel = displayPlants === 1 ? 'planta' : 'plantas';
  const scopeNote = isPreLogin ? 'en la red Chagra' : 'en tu finca';

  return [
    {
      key: 'agua',
      icon: Droplet,
      headline: 'Chagra al frente del riego',
      value: aguaAhorradaL.toLocaleString('es-CO'),
      unit: `litros ahorrados en ${MONITOR_DAYS_PER_PLANT} días`,
      tone: 'cyan',
      story: `Acompañando ${displayPlants.toLocaleString('es-CO')} ${plantsLabel} con riego por goteo ${scopeNote}, en lugar de aspersión.`,
      caption: 'Factor FAO + AGROSAVIA · 5 L/día por planta',
      navTarget: 'biodiversidad',
    },
    {
      key: 'biodiversidad',
      icon: Leaf,
      headline: 'Chagra registra biodiversidad',
      value: `${species} + ${displayPlants.toLocaleString('es-CO')}`,
      unit: 'especies + plantas registradas',
      tone: 'lime',
      story: `Documentando diversidad biológica ${scopeNote} con fichas científicas y seguimiento.`,
      caption: 'Datos medibles · Catálogo científico · Sin alucinaciones',
      navTarget: 'biodiversidad',
    },
    {
      key: 'especies',
      icon: Leaf,
      headline: 'Chagra conoce',
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
      headline: 'Chagra protege',
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
      headline: 'Chagra recoge saberes',
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
      headline: 'Chagra alerta sobre invasoras',
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
      headline: 'Chagra reemplaza químicos',
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
      headline: 'Chagra cita fuentes Tier A',
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
      headline: 'Chagra funciona offline',
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
 * AgentAngelitaChip — Angelita clickable que abre el agente desde el home.
 * Default idle (vuelo estacionario), hover thinking, click navega.
 * Se anima en mouse over para invitar al click y en touch press en mobile.
 *
 * Bug móvil "Abrir Chagra IA no abre el overlay" (2026-06-20): el botón solo
 * abría el agente vía `onClick`, pero el press anima un `transform: scale()`
 * que cambia la geometría del target ENTRE touchstart y touchend. En móvil
 * (iOS Safari + algunos Chrome Android) ese reescalado bajo el dedo hace que el
 * navegador CANCELE el click sintético → `onNavigate('agente')` nunca corría y
 * el overlay no abría (en desktop el click de mouse no se ve afectado, por eso
 * "funcionaba en desktop pero no en móvil"). Fix mobile-first: disparar la
 * navegación en `onTouchEnd` (la intención real del tap) y `preventDefault()`
 * para suprimir el ghost-click, deduplicando con `navigatedByTouchRef` para que
 * el click sintético —si igual llega— no navegue dos veces.
 */
function AgentAngelitaChip({ onNavigate, size = 36 }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interactive = typeof onNavigate === 'function';
  const state = pressed ? 'speaking' : hover ? 'thinking' : 'idle';
  // Marca que el tap táctil ya navegó, para ignorar el click sintético que
  // algunos navegadores móviles emiten después del touchend.
  const navigatedByTouchRef = useRef(false);

  const openAgent = () => { if (interactive) onNavigate('agente'); };
  const handleClick = () => {
    // Si el touchend ya navegó, el click sintético es un duplicado: no-op.
    if (navigatedByTouchRef.current) {
      navigatedByTouchRef.current = false;
      return;
    }
    openAgent();
  };
  const enter = () => setHover(true);
  const leave = () => { setHover(false); setPressed(false); };
  const down = () => setPressed(true);
  const up = () => setPressed(false);
  const handleTouchEnd = (e) => {
    setHover(false);
    setPressed(false);
    if (!interactive) return;
    // Suprime el ghost-click (evita doble navegación) y abre en el tap real.
    if (e?.cancelable) e.preventDefault();
    navigatedByTouchRef.current = true;
    openAgent();
  };

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
      onTouchEnd={handleTouchEnd}
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

const HERO_COLLAPSED_KEY = 'chagra:welcome-hero-collapsed:v1';

function readCollapsedPref(plantsCount) {
  try {
    const raw = localStorage.getItem(HERO_COLLAPSED_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch { /* private mode */ }
  // Sin preferencia explícita: colapsado si user ya tiene contexto (plants > 0).
  // Operator 2026-05-27: "un campesino entra de afán a cualquier cosa, esa info estorba".
  return plantsCount > 0;
}

// onNavigate con default undefined explícito: es opcional de verdad (todo el
// código guarda con `typeof onNavigate === 'function'` y el hero queda inerte
// en pre-login), pero sin default tsc la infiere requerida y el caller
// pre-login (LoginScreen) suma un falso error al gate tsc:check.
export default function WelcomeStatsHero({ mode = 'post-login', onNavigate = undefined }) {
  const isPreLogin = mode === 'pre-login';
  const plantsCount = useAssetStore((s) => s.plants?.length ?? 0);
  const [catalogStats, setCatalogStats] = useState(CATALOG_FALLBACK);
  const [fincasActivas, setFincasActivas] = useState(GLOBAL_FEDERATION_FALLBACK.fincasActivas);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Collapse toggle: default colapsado si ya hay plants, expandido si state cero.
  // PreLogin siempre expandido (es la home pública). Persist en localStorage.
  const [collapsed, setCollapsed] = useState(() => (isPreLogin ? false : readCollapsedPref(plantsCount)));
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(HERO_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);
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

        // Fuente única de verdad (#1938): pisa species/biopreparados/sourcesTierA
        // con el JSON generado en build cuando está disponible, para que este
        // componente nunca contradiga el one-pager ni otra superficie que lea
        // el mismo archivo. Si el fetch falla o el archivo todavía no existe
        // en este deploy, quedan los valores ya resueltos arriba (conteo
        // SQLite en vivo o CATALOG_FALLBACK).
        try {
          const chagraStatsRes = await fetch(CHAGRA_STATS_URL, { cache: 'no-cache' });
          if (chagraStatsRes.ok) {
            const chagraStats = await chagraStatsRes.json();
            const catalogo = chagraStats?.catalogo;
            if (catalogo && typeof catalogo === 'object') {
              if (typeof catalogo.especies === 'number') species = catalogo.especies;
              if (typeof catalogo.biopreparados === 'number') biopreparados = catalogo.biopreparados;
              if (typeof catalogo.fuentes_tier_a === 'number') sourcesTierA = catalogo.fuentes_tier_a;
            }
          }
        } catch { /* JSON aún no existe en este deploy o falló el fetch: se conservan los valores anteriores */ }

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
        className={`rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 w-full ${collapsed ? 'p-2 sm:p-3' : 'p-4 sm:p-5 space-y-4'}`}
        aria-label="Impacto de Chagra"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          {/* Header con Angelita clickable → abre el agente desde el home.
              Hover anima a state thinking, click navega y muestra el
              tap feedback con scale. Si no hay onNavigate, queda inerte como
              header decorativo (ej. en pre-login). */}
          <h2 className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 min-w-0">
            <AgentAngelitaChip onNavigate={onNavigate} size={collapsed ? 28 : 36} />
            <span className="truncate">Chagra · impacto</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {isPreLogin && !collapsed && (
              <span className="text-[10px] text-slate-400 italic hidden sm:inline">
                {fincasActivas} {fincasActivas === 1 ? 'finca' : 'fincas'} · red Chagra
              </span>
            )}
            {!isPreLogin && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-pressed={collapsed}
                aria-label={collapsed ? 'Mostrar resumen Chagra' : 'Ocultar resumen Chagra'}
                title={collapsed ? 'Mostrar' : 'Ocultar'}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800/60"
              >
                {collapsed ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronUp className="w-4 h-4" aria-hidden="true" />}
              </button>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800/60"
                aria-label="Ampliar resumen Chagra"
                title="Ver versión ampliada"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {!collapsed && <div
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
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 leading-snug italic">
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
        </div>}

        {!collapsed && (<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2">
            <Sprout className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-black text-lime-300 leading-tight">
                {isPreLogin ? GLOBAL_FEDERATION_FALLBACK.plantasRegistradas : plantsCount}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {isPreLogin ? MSG.welcomeStats.plantasRegistradas : (plantsCount === 1 ? MSG.welcomeStats.plantaTuya : MSG.welcomeStats.plantasTuyas)}
              </div>
            </div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-black text-violet-300 leading-tight">{catalogStats.ragDocs}</div>
              <div className="text-[9px] text-slate-400 truncate">Fichas IA</div>
            </div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2 col-span-2 sm:col-span-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-black text-emerald-300 leading-tight">{catalogStats.species}</div>
              <div className="text-[9px] text-slate-400 truncate">Especies catálogo</div>
            </div>
          </div>
        </div>)}
      </section>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Resumen ampliado de Chagra"
        >
          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2 pt-4">
              <div>
                <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-black uppercase tracking-wider text-slate-200">
                  <AgentAngelitaChip onNavigate={onNavigate} size={48} />
                  Chagra · impacto
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
                      <div className="text-[11px] text-slate-400 mt-2 leading-snug italic">
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

            <div className="text-[11px] text-slate-400 italic text-center pt-2 pb-6">
              Soberanía alimentaria · agroecología campesina colombiana · código abierto AGPL-3.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { Sprout, Leaf, BookOpen, Database, Droplet, TreePine, Users, ShieldCheck, FileCheck, Cloud } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';

/**
 * WelcomeStatsHero — widget de bienvenida con stats impactantes.
 * Renderiza pre-login (LoginScreen) y post-login (Dashboard hero).
 *
 * Operator feedback 2026-05-18: 'estadísticas generales de todas las
 * instalaciones de chagra, algo demo como agua ahorrada en riego por
 * goteo... datos más impactantes a nivel global'.
 *
 * Carousel rotativo cada 5s con 6 categorías de impact:
 * 1. Especies en catálogo (catalogStats.species) — siempre visible
 * 2. Agua ahorrada con riego goteo (proyectado por planta cuidada)
 * 3. CO2 secuestrado por árboles nativos plantados
 * 4. Especies endémicas + endangered protegidas (18 EN + 9 endémicas)
 * 5. Comunidades indígenas/afro custodias documentadas (8+ pueblos)
 * 6. Fuentes científicas Tier A curadas (52 papers + institucionales)
 *
 * Las stats locales (plantas cuidadas del operador) se muestran fijas
 * abajo en grid 2x2 minor.
 */

const HERO_ROTATION_MS = 5000;

// Hero stats agregados — algunos derivados (species, plantsCount), otros
// estimados con factores conservadores razonables para narrativa de impacto.
// Operator request demo Diana: 'imagina y complementa con datos impactantes
// a nivel global'.
function buildHeroStats({ plantsCount, species, ragDocs, biopreparados, sourcesTierA, endangeredCount, endemicasCount, invasorasCount }) {
  // Factor: planta con riego por goteo ahorra ~5 L/día vs aspersión
  // (FAO Riego Eficiente, AGROSAVIA Manual Riego 2018). Asumiendo
  // 90 días promedio de monitoreo activo por planta.
  const aguaAhorradaL = Math.max(0, plantsCount) * 5 * 90;

  // Factor: árbol nativo andino secuestra ~22 kg CO2/año en sus primeros
  // 5 años (IDEAM-MADS Tabla nacional carbono forestal). Conservador
  // para plantas no-arbóreas (estimación 30% de plantsCount sean árboles).
  const co2KgAnio = Math.max(0, plantsCount) * 0.3 * 22;

  return [
    {
      icon: Leaf,
      label: 'Especies en catálogo',
      value: species,
      unit: 'curadas científicamente',
      tone: 'emerald',
      caption: 'Catálogo agroecológico colombiano',
    },
    {
      icon: Droplet,
      label: 'Agua ahorrada estimada',
      value: aguaAhorradaL.toLocaleString('es-CO'),
      unit: 'litros · riego por goteo',
      tone: 'cyan',
      caption: 'Factor FAO + AGROSAVIA · 5 L/día/planta vs aspersión',
    },
    {
      icon: Cloud,
      label: 'CO₂ secuestrado',
      value: Math.round(co2KgAnio).toLocaleString('es-CO'),
      unit: 'kg/año · árboles nativos',
      tone: 'lime',
      caption: 'Factor IDEAM-MADS · 22 kg CO₂/año por árbol andino',
    },
    {
      icon: ShieldCheck,
      label: 'Species protegidas',
      value: endangeredCount + endemicasCount,
      unit: 'endémicas + en peligro',
      tone: 'amber',
      caption: 'Conservación in-situ documentada en Chagra',
    },
    {
      icon: Users,
      label: 'Pueblos custodios',
      value: 8,
      unit: 'culturas documentadas',
      tone: 'fuchsia',
      caption: 'Embera · Wounaan · Tikuna · Bora · Muisca · Wayúu · Kogui · Inga',
    },
    {
      icon: FileCheck,
      label: 'Fuentes científicas Tier A',
      value: sourcesTierA,
      unit: 'papers + institucionales',
      tone: 'sky',
      caption: 'POWO · GBIF · IAvH · AGROSAVIA · ICA · UNAL · Humboldt',
    },
    {
      icon: TreePine,
      label: 'Invasoras catalogadas',
      value: invasorasCount,
      unit: 'manejo y sustitución nativa',
      tone: 'orange',
      caption: 'Ulex europaeus · kikuyo · retamo · eucalipto · etc.',
    },
    {
      icon: BookOpen,
      label: 'Fichas pedagógicas',
      value: ragDocs,
      unit: 'agente IA con contexto',
      tone: 'violet',
      caption: 'RAG offline-first · 100% privacidad',
    },
    {
      icon: Database,
      label: 'Biopreparados',
      value: biopreparados,
      unit: 'orgánicos sin químicos',
      tone: 'yellow',
      caption: 'Bocashi · Bordelés · Trichoderma · Neem · Bt · etc.',
    },
  ];
}

const TONE_CLASSES = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60' },
  cyan: { text: 'text-cyan-300', bg: 'bg-cyan-950/40', border: 'border-cyan-800/60' },
  lime: { text: 'text-lime-300', bg: 'bg-lime-950/40', border: 'border-lime-800/60' },
  amber: { text: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-800/60' },
  fuchsia: { text: 'text-fuchsia-300', bg: 'bg-fuchsia-950/40', border: 'border-fuchsia-800/60' },
  sky: { text: 'text-sky-300', bg: 'bg-sky-950/40', border: 'border-sky-800/60' },
  orange: { text: 'text-orange-300', bg: 'bg-orange-950/40', border: 'border-orange-800/60' },
  violet: { text: 'text-violet-300', bg: 'bg-violet-950/40', border: 'border-violet-800/60' },
  yellow: { text: 'text-yellow-300', bg: 'bg-yellow-950/40', border: 'border-yellow-800/60' },
};

export default function WelcomeStatsHero() {
  const plantsCount = useAssetStore((s) => s.plants.length);
  const [catalogStats, setCatalogStats] = useState({
    species: 0,
    biopreparados: 0,
    ragDocs: 0,
    sourcesTierA: 0,
    endangeredCount: 0,
    endemicasCount: 0,
    invasorasCount: 0,
  });
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      try {
        const manifestRes = await fetch('/cycle-content/manifest.json');
        const manifest = await manifestRes.json();
        const ragDocs = Array.isArray(manifest.slugs) ? manifest.slugs.length : 0;

        // Try catálogo SQLite primero (más completo)
        let species = ragDocs;
        let biopreparados = 19;
        let sourcesTierA = 52;
        let endangeredCount = 18;
        let endemicasCount = 9;
        let invasorasCount = 17;

        try {
          const { getCatalogStats } = await import('../db/catalogDB');
          if (typeof getCatalogStats === 'function') {
            const stats = await getCatalogStats();
            if (stats) {
              species = stats.species ?? species;
              biopreparados = stats.biopreparados ?? biopreparados;
            }
          }
        } catch {
          // SQLite no inicializado, usar fallbacks razonables
        }

        if (alive) setCatalogStats({ species, biopreparados, ragDocs, sourcesTierA, endangeredCount, endemicasCount, invasorasCount });
      } catch (err) {
        console.warn('[WelcomeStatsHero] Failed to load catalog stats:', err);
      }
    };
    loadStats();
    return () => { alive = false; };
  }, []);

  const heroStats = useMemo(() => buildHeroStats({ plantsCount, ...catalogStats }), [plantsCount, catalogStats]);

  // Carousel rotativo cada 5s — auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % heroStats.length);
    }, HERO_ROTATION_MS);
    return () => clearInterval(interval);
  }, [heroStats.length]);

  const current = heroStats[carouselIndex] || heroStats[0];
  const CurrentIcon = current.icon;
  const tone = TONE_CLASSES[current.tone] || TONE_CLASSES.emerald;

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 space-y-4"
      aria-label="Resumen de Chagra"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Chagra en cifras
        </h2>
        <span className="text-[10px] text-slate-600 italic">
          Soberanía alimentaria · datos curados
        </span>
      </div>

      {/* Hero card grande con stat rotativa */}
      <div
        className={`${tone.bg} ${tone.border} border rounded-2xl p-5 transition-all duration-500 animate-in fade-in`}
        key={carouselIndex}
      >
        <div className="flex items-start gap-3">
          <CurrentIcon className={`w-6 h-6 ${tone.text} shrink-0 mt-1`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {current.label}
            </div>
            <div className={`text-4xl font-black ${tone.text} leading-none mt-1`}>
              {current.value}
            </div>
            <div className="text-xs text-slate-300 mt-1 font-medium">
              {current.unit}
            </div>
            {current.caption && (
              <div className="text-[10px] text-slate-500 mt-2 leading-snug italic">
                {current.caption}
              </div>
            )}
          </div>
        </div>
        {/* dots indicator del carousel */}
        <div className="flex justify-center gap-1.5 mt-4">
          {heroStats.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCarouselIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === carouselIndex
                  ? `w-6 ${tone.text.replace('text-', 'bg-')}`
                  : 'w-1.5 bg-slate-700'
              }`}
              aria-label={`Ver stat ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Stats locales del operador — grid 2x2 minor abajo */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 flex items-center gap-2">
          <Sprout className="w-3.5 h-3.5 text-lime-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-black text-lime-300 leading-tight">{plantsCount}</div>
            <div className="text-[9px] text-slate-500 truncate">
              {plantsCount === 1 ? 'Planta tuya' : 'Plantas tuyas'}
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
      </div>
    </section>
  );
}

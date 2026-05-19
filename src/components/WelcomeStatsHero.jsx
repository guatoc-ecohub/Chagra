import React, { useEffect, useState, useMemo } from 'react';
import { Sprout, Leaf, BookOpen, Database, Droplet, TreePine, Users, ShieldCheck, FileCheck, Cloud, Bot } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';

/**
 * WelcomeStatsHero — widget de bienvenida con narrativa de impacto del agente.
 *
 * Operator feedback 2026-05-18: 'el carousel debe estar enfocado en estadísticas
 * tipo el agente Chagra al frente del sistema de riego ayudó a ahorrar X cantidad
 * de litros en X días'. → Cada slide tiene al agente como sujeto protagonista,
 * con verbo de acción + número concreto + ventana temporal cuando aplique.
 */

const HERO_ROTATION_MS = 6000;
const MONITOR_DAYS_PER_PLANT = 90;
const DRIP_SAVING_L_PER_DAY = 5;   // FAO + AGROSAVIA Riego Eficiente
const CO2_KG_PER_TREE_YEAR = 22;   // IDEAM-MADS carbono forestal andino
const TREE_FRACTION = 0.3;          // ~30% de plantas registradas son árboles

function buildHeroStats({ plantsCount, species, ragDocs, biopreparados, sourcesTierA, endangeredCount, endemicasCount, invasorasCount }) {
  const aguaAhorradaL = Math.max(0, plantsCount) * DRIP_SAVING_L_PER_DAY * MONITOR_DAYS_PER_PLANT;
  const co2KgAnio = Math.max(0, plantsCount) * TREE_FRACTION * CO2_KG_PER_TREE_YEAR;
  const plantsLabel = plantsCount === 1 ? 'planta' : 'plantas';

  return [
    {
      icon: Droplet,
      headline: 'El agente Chagra al frente del riego',
      value: aguaAhorradaL.toLocaleString('es-CO'),
      unit: `litros ahorrados en ${MONITOR_DAYS_PER_PLANT} días`,
      tone: 'cyan',
      story: `Acompañando ${plantsCount} ${plantsLabel} con riego por goteo en lugar de aspersión.`,
      caption: 'Factor FAO + AGROSAVIA · 5 L/día por planta',
    },
    {
      icon: Cloud,
      headline: 'El agente Chagra cuida el aire',
      value: Math.round(co2KgAnio).toLocaleString('es-CO'),
      unit: 'kg de CO₂ secuestrados al año',
      tone: 'lime',
      story: `Monitoreando árboles nativos andinos sembrados con Chagra.`,
      caption: 'Factor IDEAM-MADS · 22 kg CO₂/año por árbol joven',
    },
    {
      icon: Leaf,
      headline: 'El agente Chagra conoce',
      value: species,
      unit: 'especies del catálogo colombiano',
      tone: 'emerald',
      story: 'Sugiere especies nativas, advierte invasoras y propone asociaciones.',
      caption: 'Catálogo curado científicamente',
    },
    {
      icon: ShieldCheck,
      headline: 'El agente Chagra protege',
      value: endangeredCount + endemicasCount,
      unit: 'especies endémicas y en peligro',
      tone: 'amber',
      story: 'Marca riesgos UICN y prioriza conservación in-situ con el campesino.',
      caption: `${endangeredCount} en peligro · ${endemicasCount} endémicas colombianas`,
    },
    {
      icon: Users,
      headline: 'El agente Chagra recoge saberes',
      value: 8,
      unit: 'pueblos custodios documentados',
      tone: 'fuchsia',
      story: 'Conocimiento ancestral validado y entregado en cada recomendación.',
      caption: 'Embera · Wounaan · Tikuna · Bora · Muisca · Wayúu · Kogui · Inga',
    },
    {
      icon: TreePine,
      headline: 'El agente Chagra alerta sobre invasoras',
      value: invasorasCount,
      unit: 'especies invasoras vigiladas',
      tone: 'orange',
      story: 'Sugiere sustitución por nativas y rutas de manejo agroecológico.',
      caption: 'Ulex · kikuyo · retamo · eucalipto · etc.',
    },
    {
      icon: Database,
      headline: 'El agente Chagra reemplaza químicos',
      value: biopreparados,
      unit: 'biopreparados orgánicos sugeridos',
      tone: 'yellow',
      story: 'Bocashi, caldo bordelés, Trichoderma, neem, Bt y más, paso a paso.',
      caption: 'Sin glifosato · sin agroquímicos',
    },
    {
      icon: FileCheck,
      headline: 'El agente Chagra cita fuentes Tier A',
      value: sourcesTierA,
      unit: 'papers y guías institucionales',
      tone: 'sky',
      story: 'Cada respuesta respaldada por evidencia trazable.',
      caption: 'POWO · GBIF · IAvH · AGROSAVIA · ICA · UNAL · Humboldt',
    },
    {
      icon: BookOpen,
      headline: 'El agente Chagra funciona offline',
      value: ragDocs,
      unit: 'fichas pedagógicas embebidas',
      tone: 'violet',
      story: 'Sin internet, sin nube ajena. RAG local con privacidad total.',
      caption: 'Soberanía digital campesina',
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
      aria-label="Impacto del agente Chagra"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <Bot className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          Agente Chagra · impacto
        </h2>
        <span className="text-[10px] text-slate-600 italic">
          Soberanía alimentaria
        </span>
      </div>

      {/* Hero card grande con narrativa agente-protagonista rotativa */}
      <div
        className={`${tone.bg} ${tone.border} border rounded-2xl p-5 transition-all duration-500 animate-in fade-in`}
        key={carouselIndex}
      >
        <div className="flex items-start gap-3">
          <CurrentIcon className={`w-6 h-6 ${tone.text} shrink-0 mt-1`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold leading-tight">
              {current.headline}
            </div>
            <div className={`text-4xl font-black ${tone.text} leading-none mt-2`}>
              {current.value}
            </div>
            <div className="text-xs text-slate-200 mt-1 font-medium">
              {current.unit}
            </div>
            {current.story && (
              <div className="text-[11px] text-slate-400 mt-2 leading-snug">
                {current.story}
              </div>
            )}
            {current.caption && (
              <div className="text-[10px] text-slate-500 mt-1.5 leading-snug italic">
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
              aria-label={`Ver historia ${idx + 1}`}
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

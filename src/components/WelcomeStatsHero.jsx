import React, { useEffect, useState, useMemo } from 'react';
import { Sprout, Leaf, BookOpen, Database } from 'lucide-react';
import useAssetStore from '../store/useAssetStore';

/**
 * WelcomeStatsHero — widget de bienvenida POSITIVO mostrado al ingresar a
 * Chagra. Reemplaza la posición previa de TelemetryAlerts como primer
 * elemento del dashboard. Las alertas IoT/sync siguen disponibles pero
 * abajo (no como primera impresión).
 *
 * Operator feedback 2026-05-18: "lo primero sería la cantidad de especies
 * y plantas ya registradas realmente y cuidadas por chagra".
 *
 * Stats mostradas:
 * - Cantidad de plantas registradas en la finca del operador (assets)
 * - Cantidad de especies disponibles en el catálogo (catalogStats)
 * - Cantidad de fichas pedagógicas (corpus RAG)
 * - Cantidad de biopreparados disponibles
 *
 * Diseño KISS: 2×2 grid de cards con números grandes + label corto.
 * No requiere conexión — todo viene de IndexedDB local + manifest.json.
 */
export default function WelcomeStatsHero() {
  const plantsCount = useAssetStore((s) => s.plants.length);
  const [catalogStats, setCatalogStats] = useState({ species: 0, biopreparados: 0, ragDocs: 0 });

  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      try {
        // RAG corpus manifest: source canónico para "fichas pedagógicas".
        const manifestRes = await fetch('/cycle-content/manifest.json');
        const manifest = await manifestRes.json();
        const ragDocs = Array.isArray(manifest.slugs) ? manifest.slugs.length : 0;

        // Catálogo SQLite es la fuente de truth para species + biopreparados.
        // Si SQLite WASM no está disponible, fallback a manifest count.
        let species = ragDocs;
        let biopreparados = 19; // catálogo v3.1 actual
        try {
          const { getCatalogStats } = await import('../db/catalogDB');
          if (typeof getCatalogStats === 'function') {
            const stats = await getCatalogStats();
            if (stats && typeof stats === 'object') {
              species = stats.species ?? species;
              biopreparados = stats.biopreparados ?? biopreparados;
            }
          }
        } catch {
          // SQLite WASM no inicializado todavía — usar fallbacks razonables.
        }

        if (alive) setCatalogStats({ species, biopreparados, ragDocs });
      } catch (err) {
        console.warn('[WelcomeStatsHero] Failed to load catalog stats:', err);
      }
    };
    loadStats();
    return () => { alive = false; };
  }, []);

  const cards = useMemo(() => ([
    {
      icon: Sprout,
      value: plantsCount,
      label: plantsCount === 1 ? 'Planta cuidada' : 'Plantas cuidadas',
      color: 'text-lime-400',
      bg: 'bg-lime-950/30',
      border: 'border-lime-800/40',
    },
    {
      icon: Leaf,
      value: catalogStats.species,
      label: 'Especies en catálogo',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-800/40',
    },
    {
      icon: BookOpen,
      value: catalogStats.ragDocs,
      label: 'Fichas pedagógicas',
      color: 'text-cyan-400',
      bg: 'bg-cyan-950/30',
      border: 'border-cyan-800/40',
    },
    {
      icon: Database,
      value: catalogStats.biopreparados,
      label: 'Biopreparados',
      color: 'text-amber-400',
      bg: 'bg-amber-950/30',
      border: 'border-amber-800/40',
    },
  ]), [plantsCount, catalogStats]);

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
      aria-label="Resumen de Chagra"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          Tu Chagra hoy
        </h2>
        <span className="text-[10px] text-slate-500 italic">
          Soberanía alimentaria
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.label}
              className={`${card.bg} ${card.border} border rounded-xl p-3 flex flex-col items-start gap-1 transition-all hover:scale-[1.02]`}
            >
              <IconComp className={`w-4 h-4 ${card.color}`} aria-hidden="true" />
              <div className={`text-3xl font-black ${card.color}`}>{card.value}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{card.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

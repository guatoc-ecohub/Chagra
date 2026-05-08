import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Mic, ChevronDown } from 'lucide-react';
import CycleContentRenderer from './CycleContentRenderer.jsx';
import HelpVoiceQuestion from './HelpVoiceQuestion.jsx';

const STARTER_CYCLES = [
  { slug: 'lechuga', emoji: '🥬', label: 'Lechuga', sub: 'Starter · 60-90 días · frío/templado' },
  { slug: 'fresa', emoji: '🍓', label: 'Fresa', sub: 'Starter Premium · 90-180 días · frío' },
  { slug: 'tomate_chonto', emoji: '🍅', label: 'Tomate chonto', sub: 'Intermediate · 90-130 días · templado' },
];

const PLACEHOLDER_CYCLES = [
  {
    emoji: '☕',
    label: 'Café arábica',
    sub: 'Advanced · varios años · curaduría pendiente',
    tooltip: 'Curaduría agronómica pendiente con Cenicafé e institutiones homólogas',
  },
  {
    emoji: '🥑',
    label: 'Aguacate Hass',
    sub: 'Advanced · varios años · injerto y patrón',
    tooltip: 'Curaduría agronómica pendiente con Agrosavia y extensión regional',
  },
];

/**
 * Sección educativa interactiva (queue/039): selector de especie starter,
 * corpus curado desde /public/cycle-content/ y voz con RAG estricto.
 */
export default function HelpCycleSection() {
  const [selectedSlug, setSelectedSlug] = useState('lechuga');
  const contentRef = useRef(null);
  const isFirstRender = useRef(true);

  // Tras cambio de especie: scroll al contenido + key forzando re-mount.
  // Skip on mount para no mover la vista al abrir Ayuda.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedSlug]);

  return (
    <div className="border rounded-xl border-amber-700/40 bg-slate-900/80 p-4 mb-6 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
          <GraduationCap size={22} className="text-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-amber-100 tracking-tight">
            Aprende sembrando: ciclo interactivo
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            Elija una especie para ver el corpus consolidado (DR-034) y, si quiere, haga una pregunta por voz.
            La IA solo usa ese texto, sin inventar.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-400/90 uppercase border border-amber-700/40 rounded-full px-2 py-0.5 shrink-0">
          <Mic size={12} /> Voz
        </span>
      </div>

      <p className="text-[11px] text-slate-500 mb-2">
        Disponibles ahora
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {STARTER_CYCLES.map((c) => {
          const isSelected = selectedSlug === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => setSelectedSlug(c.slug)}
              aria-pressed={isSelected}
              className={`relative p-3 rounded-lg text-left min-h-[64px] border transition-colors ${
                isSelected
                  ? 'bg-emerald-900/35 border-emerald-500/60 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-emerald-900/30 hover:bg-slate-800/80'
              }`}
            >
              <p className="font-bold text-emerald-300 text-sm">
                {c.emoji} {c.label}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
              {isSelected && (
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-emerald-400 animate-bounce"
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-orange-400/90 font-bold uppercase tracking-wider mt-4 mb-2">
        Próximamente
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PLACEHOLDER_CYCLES.map((c) => (
          <div
            key={c.label}
            title={c.tooltip}
            className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 opacity-60 cursor-not-allowed select-none"
            aria-disabled="true"
          >
            <p className="font-bold text-orange-300/80 text-sm">
              {c.emoji} {c.label}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">{c.sub}</p>
            <p className="text-[10px] text-slate-600 mt-1 italic">{c.tooltip}</p>
          </div>
        ))}
      </div>

      <div
        ref={contentRef}
        className="mt-4 rounded-xl bg-slate-950/70 border border-emerald-500/40 overflow-hidden ring-1 ring-emerald-500/20 scroll-mt-4"
      >
        <CycleContentRenderer key={selectedSlug} slug={selectedSlug} />
      </div>

      <HelpVoiceQuestion speciesSlug={selectedSlug} />
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Mic, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import CycleContentRenderer from './CycleContentRenderer.jsx';
import HelpVoiceQuestion from './HelpVoiceQuestion.jsx';

// Catálogo unificado: starters disponibles + futuros con curaduría pendiente.
// Cada entrada renderiza un accordion individual; los no disponibles también
// expanden, pero muestran nota educativa en lugar de corpus + voz IA.
const ALL_CYCLES = [
  {
    slug: 'lechuga',
    emoji: '🥬',
    label: 'Lechuga',
    sub: 'Starter · 60-90 días · frío/templado',
    leccionClave: 'Ciclo corto ideal para entrenar la observación de la planta entera y experimentar con sustrato sin esperar meses.',
    available: true,
    accent: 'from-emerald-900/40 to-emerald-950/70',
    accentRing: 'ring-emerald-500/30 border-emerald-500/60',
  },
  {
    slug: 'fresa',
    emoji: '🍓',
    label: 'Fresa',
    sub: 'Starter premium · 90-180 días · frío',
    leccionClave: 'Cultivo perenne. Enseña paciencia, multiplicación vegetativa por estolones y manejo sanitario sostenido.',
    available: true,
    accent: 'from-pink-900/30 to-pink-950/70',
    accentRing: 'ring-pink-500/30 border-pink-500/60',
  },
  {
    slug: 'tomate_chonto',
    emoji: '🍅',
    label: 'Tomate chonto',
    sub: 'Intermedio · 90-130 días · templado',
    leccionClave: 'Salto al manejo activo: tutoraje, poda, polinización asistida y plagas comunes (Tuta absoluta, oídio).',
    available: true,
    accent: 'from-red-900/30 to-red-950/70',
    accentRing: 'ring-red-500/30 border-red-500/60',
  },
  {
    slug: 'cafe',
    emoji: '☕',
    label: 'Café arábica',
    sub: 'Avanzado · varios años',
    available: false,
    pendingNote: 'Cultivo de curaduría avanzada. La asociación con Cenicafé y experiencia regional es prerequisito para emitir corpus responsable. Mientras tanto, observe sus cafetales y registre rendimientos, floraciones y plagas en Bitácora — cada nota suma al corpus base.',
    accent: 'from-amber-900/20 to-amber-950/60',
    accentRing: 'ring-amber-500/20 border-amber-500/40',
  },
  {
    slug: 'aguacate_hass',
    emoji: '🥑',
    label: 'Aguacate Hass',
    sub: 'Avanzado · varios años · injerto + patrón',
    available: false,
    pendingNote: 'Cultivo perenne con manejo de patrón e injerto. Pendiente colaboración con Agrosavia y extensión regional para curaduría rigurosa. Si tiene aguacates establecidos, sus observaciones son parte del corpus futuro.',
    accent: 'from-green-900/20 to-green-950/60',
    accentRing: 'ring-green-500/20 border-green-500/40',
  },
];

/**
 * Sección educativa interactiva (queue/039 + rediseño 2026-05-08).
 * Accordion por especie: cada card abre INLINE el corpus consolidado
 * (DR-034) + voz IA con guardrails RAG. Especies pendientes muestran
 * nota educativa al expandir en lugar de corpus.
 */
export default function HelpCycleSection() {
  const [openSlug, setOpenSlug] = useState(null);
  const refs = useRef({});

  const toggle = (slug) => {
    setOpenSlug((prev) => (prev === slug ? null : slug));
  };

  // Scroll al card abierto (offset bajo top-bar). Solo cuando se ABRE,
  // no al cerrar. Skip si vuelve a null por cierre.
  useEffect(() => {
    if (!openSlug) return;
    const el = refs.current[openSlug];
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [openSlug]);

  return (
    <div className="border rounded-xl border-amber-700/40 bg-slate-900/80 p-4 mb-6 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
          <GraduationCap size={22} className="text-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-amber-100 tracking-tight">
            Aprende sembrando: ciclo interactivo
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            Toque una especie para abrir el corpus consolidado (DR-034). La voz IA solo usa ese texto, sin inventar.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-400/90 uppercase border border-amber-700/40 rounded-full px-2 py-0.5 shrink-0">
          <Mic size={12} /> Voz
        </span>
      </div>

      {/* Lista accordion */}
      <div className="flex flex-col gap-2">
        {ALL_CYCLES.map((c) => {
          const isOpen = openSlug === c.slug;
          return (
            <article
              key={c.slug}
              ref={(el) => { refs.current[c.slug] = el; }}
              className={`overflow-hidden rounded-xl border transition-colors scroll-mt-4 bg-gradient-to-br ${c.accent} ${
                isOpen
                  ? `${c.accentRing} ring-1`
                  : c.available
                    ? 'border-emerald-900/30 hover:border-emerald-700/60'
                    : 'border-slate-800/80 hover:border-amber-700/40'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(c.slug)}
                aria-expanded={isOpen}
                aria-controls={`cycle-panel-${c.slug}`}
                className="w-full flex items-center gap-3 p-3 text-left min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                <span className="text-3xl shrink-0 leading-none" aria-hidden="true">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-base text-emerald-100">{c.label}</p>
                    {!c.available && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-900/40 border border-amber-700/50 rounded-full px-2 py-0.5">
                        <Lock size={10} /> Por agregar
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{c.sub}</p>
                </div>
                {isOpen
                  ? <ChevronUp size={20} className="text-emerald-400 shrink-0 transition-transform" />
                  : <ChevronDown size={20} className="text-slate-500 shrink-0 transition-transform" />
                }
              </button>

              {isOpen && (
                <div
                  id={`cycle-panel-${c.slug}`}
                  className="border-t border-emerald-900/30 px-4 pb-4 pt-3 transition-opacity duration-200"
                >
                  {c.available ? (
                    <>
                      {c.leccionClave && (
                        <div className="mb-4 rounded-lg bg-emerald-950/70 border-l-2 border-emerald-500 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                            Lección clave
                          </p>
                          <p className="text-sm text-slate-100 leading-relaxed">{c.leccionClave}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-slate-950/60 border border-emerald-900/30 overflow-hidden">
                        <CycleContentRenderer slug={c.slug} onClose={() => {}} />
                      </div>
                      <HelpVoiceQuestion speciesSlug={c.slug} />
                    </>
                  ) : (
                    <div className="rounded-lg bg-slate-950/70 border border-amber-800/30 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                        Cultivo en preparación
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">{c.pendingNote}</p>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

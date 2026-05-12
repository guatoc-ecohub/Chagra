import React from 'react';
import { Mic, BookOpen, Sprout, ChevronRight, Library } from 'lucide-react';
import HelpRegionSelector from './HelpRegionSelector.jsx';

/**
 * Home del Manual: 3 botones grandes para entrar a las sub-vistas del help.
 * Aplica P5 (ayuda discoverable, no monolítica) + P2 (densidad baja, tap
 * targets grandes pensando en uso real en campo) + P1 (tono cercano "tú").
 */
export default function HelpHomeScreen({ onSelect }) {
  const cards = [
    {
      key: 'voz',
      icon: Mic,
      title: 'Cómo usar la voz',
      sub: 'Habla y deja que Chagra registre tu siembra, cosecha o lo que veas en campo.',
      accent: 'from-emerald-900/60 to-emerald-950/80',
      border: 'border-emerald-600/50 hover:border-emerald-400/70',
      iconBg: 'bg-emerald-700/40 border-emerald-500/50',
      iconColor: 'text-emerald-300',
      titleColor: 'text-emerald-100',
      subColor: 'text-emerald-200/70',
    },
    {
      key: 'uso',
      icon: BookOpen,
      title: 'Cómo usar Chagra',
      sub: 'Inicio rápido, foto, zonas, plagas, cosecha, reportes y problemas comunes.',
      accent: 'from-amber-900/40 to-amber-950/80',
      border: 'border-amber-600/40 hover:border-amber-400/70',
      iconBg: 'bg-amber-700/40 border-amber-500/40',
      iconColor: 'text-amber-300',
      titleColor: 'text-amber-100',
      subColor: 'text-amber-200/70',
    },
    {
      key: 'ciclo',
      icon: Sprout,
      title: 'Aprende sembrando',
      sub: 'Lechuga, fresa, tomate y los próximos. Corpus consolidado y voz IA con guardrails.',
      accent: 'from-pink-900/40 to-rose-950/80',
      border: 'border-pink-600/40 hover:border-pink-400/70',
      iconBg: 'bg-pink-700/30 border-pink-500/40',
      iconColor: 'text-pink-300',
      titleColor: 'text-pink-100',
      subColor: 'text-pink-200/70',
    },
    {
      key: 'diccionario',
      icon: Library,
      title: 'Diccionario',
      sub: 'Bocashi, micorriza, milpa… palabras del campo explicadas como si tu hije de 11 años te preguntara.',
      accent: 'from-violet-900/40 to-purple-950/80',
      border: 'border-violet-600/40 hover:border-violet-400/70',
      iconBg: 'bg-violet-700/30 border-violet-500/40',
      iconColor: 'text-violet-300',
      titleColor: 'text-violet-100',
      subColor: 'text-violet-200/70',
    },
  ];

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Una mano rápida para entrar a Chagra. Toca lo que necesites.
      </p>

      <div className="flex flex-col gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c.key)}
              className={`rounded-2xl bg-gradient-to-br ${c.accent} border ${c.border} active:scale-[0.99] transition-all p-5 text-left flex items-start gap-4 min-h-[112px] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`}
            >
              <span className={`shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-xl border ${c.iconBg}`}>
                <Icon size={28} className={c.iconColor} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-lg font-black leading-tight ${c.titleColor}`}>{c.title}</p>
                <p className={`text-xs mt-1.5 leading-relaxed ${c.subColor}`}>{c.sub}</p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-slate-400 self-center" />
            </button>
          );
        })}
      </div>

      <HelpRegionSelector onNavigateToDemo={() => onSelect('voz-regional-demo')} />

      <p className="text-[11px] text-slate-600 text-center mt-4 italic leading-relaxed">
        Si algo no está aquí, toca el botón flotante 💬 para reportarlo. La app aprende contigo.
      </p>
    </main>
  );
}

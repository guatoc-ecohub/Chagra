import React, { useState, useMemo } from 'react';
import { Mic, BookOpen, Sprout, ChevronRight, Library, Bot, Database, Search, X } from 'lucide-react';
import HelpRegionSelector from './HelpRegionSelector.jsx';

/**
 * Home del Manual: botones grandes para entrar a las sub-vistas del help,
 * con un buscador simple arriba para filtrar por palabra (P5: ayuda
 * discoverable; el campesino encuentra la respuesta rápido sin leer todo).
 *
 * Aplica P5 (ayuda discoverable, no monolítica) + P2 (densidad baja, tap
 * targets grandes pensando en uso real en campo) + P1 (tono cercano "tú").
 *
 * El buscador NO usa IA: es un filtro de texto plano sobre título, resumen
 * y palabras clave de cada tema. Sin red, sin latencia, sin sorpresas.
 */
export default function HelpHomeScreen({ onSelect }) {
  const [query, setQuery] = useState('');

  const cards = [
    {
      key: 'voz',
      icon: Mic,
      title: 'Cómo usar la voz',
      sub: 'Habla y deja que Chagra registre tu siembra, cosecha o lo que veas en campo.',
      keywords: 'voz hablar microfono micrófono dictar grabar audio transcribir registrar sin manos',
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
      keywords: 'usar inicio rapido foto camara cámara zona ubicacion gps plaga cosecha reportar problema bug ayuda offline sin internet',
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
      keywords: 'aprender sembrar cultivar ciclo lechuga fresa tomate germinar cosechar biopreparado bocashi compañeros',
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
      keywords: 'diccionario palabras significado bocashi micorriza milpa terminos términos definicion qué es',
      accent: 'from-violet-900/40 to-purple-950/80',
      border: 'border-violet-600/40 hover:border-violet-400/70',
      iconBg: 'bg-violet-700/30 border-violet-500/40',
      iconColor: 'text-violet-300',
      titleColor: 'text-violet-100',
      subColor: 'text-violet-200/70',
    },
    {
      // Task #123: sección Ayuda > "Sobre el agente Chagra".
      // Cero hype, lo que SÍ y lo que NO puede el agente, auditable.
      key: 'agente',
      icon: Bot,
      title: 'Sobre el agente Chagra',
      sub: 'Qué SÍ puede y qué NO puede. Sin promesas mágicas. Con fuentes.',
      keywords: 'agente ia inteligencia artificial chat puede no puede limitaciones confiar auditar fuente',
      accent: 'from-sky-900/40 to-slate-950/80',
      border: 'border-sky-600/40 hover:border-sky-400/70',
      iconBg: 'bg-sky-700/30 border-sky-500/40',
      iconColor: 'text-sky-300',
      titleColor: 'text-sky-100',
      subColor: 'text-sky-200/70',
    },
    {
      // Tema nuevo: dónde se guardan tus datos (local-first + sync al
      // iniciar sesión). Responde la pregunta más confusa del piloto
      // ("¿por qué veo cosas distintas en mis aparatos?").
      key: 'datos',
      icon: Database,
      title: '¿Dónde se guardan mis datos?',
      sub: 'Tu cuaderno de campo en el bolsillo: todo se guarda en tu aparato, sin internet. Por qué a veces ves cosas distintas en el celular y el computador.',
      keywords: 'datos guardar guardan donde dónde almacenar privacidad sincronizar sincronización servidor nube internet sin conexion offline cuaderno celular computador aparato dispositivo perder respaldo iniciar sesion sesión usuario',
      accent: 'from-teal-900/50 to-slate-950/80',
      border: 'border-teal-600/40 hover:border-teal-400/70',
      iconBg: 'bg-teal-700/30 border-teal-500/40',
      iconColor: 'text-teal-300',
      titleColor: 'text-teal-100',
      subColor: 'text-teal-200/70',
    },
  ];

  // Filtro de texto plano (sin IA). Normaliza tildes para que "camara"
  // encuentre "cámara". Vacío = muestra todas las tarjetas.
  const normalize = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

  const visibleCards = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return cards;
    const terms = q.split(/\s+/);
    return cards.filter((c) => {
      const haystack = normalize(`${c.title} ${c.sub} ${c.keywords || ''}`);
      return terms.every((t) => haystack.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Una mano rápida para entrar a Chagra. Toca lo que necesites o busca tu pregunta.
      </p>

      {/* Buscador simple (filtro de texto, sin IA) */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en la ayuda (ej. datos, voz, cosecha)"
          aria-label="Buscar en la ayuda"
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/70 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-600/60 min-h-[48px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-200 active:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visibleCards.map((c) => {
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

      {/* Sin resultados: invita a reportar en lugar de dejar pantalla vacía */}
      {query && visibleCards.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center">
          <p className="text-sm text-slate-300 leading-relaxed">
            No encontramos un tema con esa palabra.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
            Prueba con otra (ej. <strong className="text-slate-300">datos</strong>,{' '}
            <strong className="text-slate-300">voz</strong>,{' '}
            <strong className="text-slate-300">cosecha</strong>) o usa el botón
            flotante 💬 para preguntarnos directo.
          </p>
        </div>
      )}

      {/* El selector regional solo cuando no hay búsqueda activa (no es un tema buscable) */}
      {!query && (
        <HelpRegionSelector onNavigateToDemo={() => onSelect('voz-regional-demo')} />
      )}

      <p className="text-[11px] text-slate-600 text-center mt-4 italic leading-relaxed">
        Si algo no está aquí, toca el botón flotante 💬 para reportarlo. La app aprende contigo.
      </p>
    </main>
  );
}

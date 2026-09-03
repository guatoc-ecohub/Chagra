import React, { useState, useMemo } from 'react';
import {
  BookOpen, Sprout, ChevronRight, Library, Search, X,
  Leaf, CalendarDays, Store, HelpCircle, Gamepad2, MessageSquare,
} from 'lucide-react';
import HelpRegionSelector from './HelpRegionSelector.jsx';
import ManoChagraGlyph from './dashboard/ManoChagraGlyph.jsx';
import {
  IlusVoz, IlusMundos, IlusCiclo, IlusDatos, IlusVerificado,
} from './help/HelpIllustrations.jsx';

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
 *
 * Actualización ola 1.1.0 (2026-06-25): la app se reorganizó en cuatro
 * lugares (Gestionar / Aprender / Jugar / Agente) y estrenó directorio de
 * especies, calendario de finca, mercado y FAQ. El Manual ahora:
 *   - explica de entrada los cuatro lugares (mapa mental del campesino),
 *   - ofrece atajos que ABREN esas pantallas nuevas (no solo las describen),
 *   - mantiene los seis temas guía (voz/uso/ciclo/diccionario/agente/datos).
 * Consistente con el FAQ groundeado (src/data/faqChagra.json, #1856).
 *
 * @param {object} props
 * @param {Function} props.onSelect    cambia de sub-vista DENTRO del Manual.
 * @param {Function} [props.onNavigate] cierra el Manual y abre una pantalla
 *   real de la app (atajos a especies / calendario / mercados / faq...).
 */
export default function HelpHomeScreen({ onSelect, onNavigate }) {
  const [query, setQuery] = useState('');

  // Atajos que SALEN del Manual hacia una pantalla real de la app (las
  // rutas existen en App.jsx y son las mismas que usa el FAQ groundeado).
  const go = (route) => {
    if (typeof onNavigate === 'function') onNavigate(route);
  };

  // Tarjetas de tema. `icon` acepta lucide O una ilustración propia de
  // help/HelpIllustrations.jsx (misma interfaz size/className): las
  // ilustraciones traen LA COSTURA del acento del tema — marca cosida.
  const cards = [
    {
      // Overhaul 2026-07: LA pregunta número uno del campesino nuevo ("¿esto
      // pa' qué sirve?") ahora es la PRIMERA tarjeta. Abre el mapa completo
      // de funciones derivado del manifiesto de la mano, con deep-links.
      key: 'funciones',
      icon: ManoChagraGlyph,
      title: '¿Qué puede hacer Chagra?',
      sub: 'Todas las funciones en tarjetas que abren directo: registrar, cuidar, planear, aprender, vender.',
      keywords: 'funciones capacidades que puede hacer todo lista mano boton abrir atajos empezar primera vez',
      accent: 'from-emerald-900/60 to-slate-950/80',
      border: 'border-emerald-500/50 hover:border-emerald-300/70',
      iconBg: 'bg-emerald-700/40 border-emerald-400/60',
      iconColor: 'text-emerald-200',
      titleColor: 'text-emerald-50',
      subColor: 'text-emerald-100/70',
    },
    {
      key: 'voz',
      icon: IlusVoz,
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
      icon: IlusMundos,
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
      icon: IlusCiclo,
      title: 'Aprende sembrando',
      sub: 'El ciclo de un cultivo paso a paso: germinar, crecer, florecer, cosechar. Con su fuente.',
      keywords: 'aprender sembrar cultivar ciclo lechuga fresa tomate germinar cosechar floracion fenologia biopreparado bocashi compañeros perenne',
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
      sub: 'Bocashi, micorriza, milpa… palabras del campo explicadas como si tu hijo de 11 años te preguntara.',
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
      icon: IlusVerificado,
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
      icon: IlusDatos,
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

  // Los cuatro lugares de Chagra (home F2 "Finca Viva"): el mapa mental que
  // un campesino nuevo necesita para no perderse. Cada uno abre una pantalla
  // real. Mismos nombres que los portales del home (FincaVivaHero).
  const lugares = [
    {
      key: 'gestionar',
      icon: Sprout,
      // Paridad con FincaVivaHero (bug viejo replicado aquí: el portal
      // "Gestionar" mandaba a 'juego', el mismo destino que "Jugar"). El
      // portal del home hoy se llama "Mi finca" y abre la gestión real.
      title: 'Mi finca (Gestionar)',
      sub: 'Registre y cuide sus siembras, zonas, animales y bitácora.',
      route: 'activos',
      iconColor: 'text-emerald-300',
      ring: 'border-emerald-600/40 hover:border-emerald-400/70',
    },
    {
      key: 'aprender',
      icon: BookOpen,
      title: 'Aprender',
      sub: 'Suelo vivo, milpa, biopreparados, MIP y fenología. Cinco lecciones.',
      route: 'aprende',
      iconColor: 'text-amber-300',
      ring: 'border-amber-600/40 hover:border-amber-400/70',
    },
    {
      key: 'jugar',
      icon: Gamepad2,
      title: 'Jugar',
      sub: 'Haga crecer su finca y defiéndala jugando: Mi Finca Viva.',
      route: 'juego',
      iconColor: 'text-pink-300',
      ring: 'border-pink-600/40 hover:border-pink-400/70',
    },
    {
      key: 'agente',
      icon: MessageSquare,
      title: 'Agente',
      sub: 'Pregunte lo que sea por texto, voz o foto. Respuestas con su fuente.',
      route: 'agente',
      iconColor: 'text-sky-300',
      ring: 'border-sky-600/40 hover:border-sky-400/70',
    },
  ];

  // Atajos a las pantallas nuevas de la ola 1.1.0 (rutas reales, mismas que
  // el FAQ groundeado). No describen: ABREN la pantalla.
  const shortcuts = [
    {
      key: 'especies',
      icon: Leaf,
      title: 'Directorio de especies',
      sub: 'Ficha de cada planta: piso térmico, asociaciones, plagas y biopreparados.',
      keywords: 'especie especies catalogo catálogo directorio ficha planta cultivo piso termico térmico altitud asociaciones compañeras plaga biopreparado buscar',
      route: 'especies',
      iconColor: 'text-emerald-300',
      ring: 'border-emerald-600/40 hover:border-emerald-400/70',
    },
    {
      key: 'calendario',
      icon: CalendarDays,
      title: 'Calendario de finca',
      sub: 'Cuándo sembrar, abonar, cuidar de plagas y cosechar, según su altitud.',
      keywords: 'calendario fecha cuando sembrar cosechar abonar nutricion nutrición fenologia fenología mip plaga perenne mes temporada',
      route: 'calendario',
      iconColor: 'text-amber-300',
      ring: 'border-amber-600/40 hover:border-amber-400/70',
    },
    {
      key: 'mercados',
      icon: Store,
      title: 'Vender mi cosecha',
      sub: 'Publique lo que produce y véndalo por circuitos cortos (WhatsApp).',
      keywords: 'vender venta mercado marketplace cosecha precio circuito corto whatsapp comprador feria plaza',
      route: 'mercados',
      iconColor: 'text-rose-300',
      ring: 'border-rose-600/40 hover:border-rose-400/70',
    },
    {
      key: 'faq',
      icon: HelpCircle,
      title: 'Preguntas frecuentes',
      sub: 'Una pregunta corta y le decimos dónde está la respuesta en la app.',
      keywords: 'faq pregunta preguntas frecuentes duda respuesta donde dónde como cómo busco encuentro',
      route: 'faq',
      iconColor: 'text-violet-300',
      ring: 'border-violet-600/40 hover:border-violet-400/70',
    },
  ];

  // Filtro de texto plano (sin IA). Normaliza tildes para que "camara"
  // encuentre "cámara". Vacío = muestra todas las tarjetas.
  const normalize = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

  const matches = (c, terms) => {
    const haystack = normalize(`${c.title} ${c.sub} ${c.keywords || ''}`);
    return terms.every((t) => haystack.includes(t));
  };

  const visibleCards = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return cards;
    const terms = q.split(/\s+/);
    return cards.filter((c) => matches(c, terms));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cards es constante (definido arriba), no cambia por referencia
  }, [query]);

  const visibleShortcuts = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return shortcuts;
    const terms = q.split(/\s+/);
    return shortcuts.filter((c) => matches(c, terms));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shortcuts es constante (definido arriba)
  }, [query]);

  // "Sin resultados" solo si NI temas NI atajos coinciden.
  const noResults = query && visibleCards.length === 0 && visibleShortcuts.length === 0;

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Una mano rápida para entrar a Chagra. Toca lo que necesites o busca tu pregunta.
      </p>

      {/* Mapa mental: los cuatro lugares de Chagra (home F2). Solo cuando no
          hay búsqueda activa — es orientación, no un resultado buscable. */}
      {!query && (
        <section
          aria-labelledby="lugares-chagra"
          className="rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/60 to-slate-950/70 p-4"
        >
          <p id="lugares-chagra" className="text-[11px] uppercase tracking-wider text-emerald-400/90 font-bold mb-1">
            Chagra tiene cuatro lugares
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            En la pantalla de inicio (su finca dibujada) toca uno de estos lugares. Aquí los abre directo:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {lugares.map((l) => {
              const Icon = l.icon;
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => go(l.route)}
                  className={`rounded-xl bg-slate-900/60 border ${l.ring} active:scale-[0.99] transition-all p-3 text-left flex flex-col gap-1.5 min-h-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`}
                >
                  <Icon size={22} className={`${l.iconColor} shrink-0`} />
                  <p className="text-sm font-black text-slate-100 leading-tight">{l.title}</p>
                  <p className="text-[11px] text-slate-400 leading-snug">{l.sub}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

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

      {/* Atajos a las pantallas nuevas (abren la app, no describen). */}
      {visibleShortcuts.length > 0 && (
        <div className="flex flex-col gap-2">
          {!query && (
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-1">
              Ir directo a…
            </p>
          )}
          {visibleShortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => go(s.route)}
                className={`rounded-xl bg-slate-900/60 border ${s.ring} active:scale-[0.99] transition-all p-4 text-left flex items-center gap-3 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`}
              >
                <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <Icon size={22} className={s.iconColor} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-100 leading-tight">{s.title}</p>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{s.sub}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-500" />
              </button>
            );
          })}
        </div>
      )}

      {visibleCards.length > 0 && !query && (
        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-1">
          Guías y temas
        </p>
      )}

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
              <span className={`shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-[16px_16px_16px_6px] border ${c.iconBg}`}>
                <Icon size={34} className={c.iconColor} />
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
      {noResults && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center">
          <p className="text-sm text-slate-300 leading-relaxed">
            No encontramos un tema con esa palabra.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
            Prueba con otra (ej. <strong className="text-slate-300">datos</strong>,{' '}
            <strong className="text-slate-300">voz</strong>,{' '}
            <strong className="text-slate-300">cosecha</strong>) o repórtalo en{' '}
            <strong className="text-slate-300">Cómo usar Chagra → Reportar problema</strong>.
          </p>
        </div>
      )}

      {/* El selector regional solo cuando no hay búsqueda activa (no es un tema buscable) */}
      {!query && (
        <HelpRegionSelector onNavigateToDemo={() => onSelect('voz-regional-demo')} />
      )}

      <p className="text-[11px] text-slate-600 text-center mt-4 italic leading-relaxed">
        Si algo no está aquí, repórtalo desde el tema de uso → &ldquo;Reportar problema&rdquo;. La app aprende contigo.
      </p>
    </main>
  );
}

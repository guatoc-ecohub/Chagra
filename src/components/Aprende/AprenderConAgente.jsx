/**
 * AprenderConAgente — Módulo educativo agroecológico.
 *
 * Flujo de usuario:
 *   1. Card de entrada (en HelpHomeScreen o donde se integre)
 *   2. Selección de tema (lección)
 *   3. Bloques de contenido de la lección con navegación avanzar/retroceder
 *   4. Insights del cultivo relacionado al final de cada lección
 *
 * Principios:
 *   - Todo dato tiene fuente.
 *   - non_co=true siempre muestra disclaimer.
 *   - Sin promesas de cura o milagro.
 *   - Lenguaje colombiano (tú/usted, sin voseo argentino).
 *   - Accesible: aria-labels, navegación por teclado.
 */
import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Sprout,
  Leaf,
  FlaskConical,
  Bug,
  CalendarDays,
  MessageCircle,
  GraduationCap,
} from 'lucide-react';

import lecciones from '../../data/agro-lecciones.json';
import todasLasCards from '../../data/agro-insight-cards.json';
import { SalaJuegosBanner } from '../juego/HubJuegos.jsx';
import InsightCard from './InsightCard.jsx';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph.jsx';
import LessonInfographic from '../LessonInfographic.jsx';
import { aprenderInfografiaActivo } from '../../config/aprenderInfografiaFlag.js';

// Infográfico por lección (PoC del audit triple: "cero gráficos"). Gateado
// dev-only por VITE_APRENDER_INFOGRAFIA; se evalúa una sola vez (flag de build).
const INFOGRAFIA_ACTIVA = aprenderInfografiaActivo();

// Íconos por slug de lección
const LECCION_ICONS = {
  suelo: Sprout,
  asociaciones: Leaf,
  biopreparados: FlaskConical,
  mip: Bug,
  fenologia: CalendarDays,
};

// Colores por slug de lección
const LECCION_COLORS = {
  suelo: {
    accent: 'from-amber-900/60 to-amber-950/80',
    border: 'border-amber-600/50 hover:border-amber-400/70',
    iconBg: 'bg-amber-700/40 border-amber-500/50',
    iconColor: 'text-amber-300',
    titleColor: 'text-amber-100',
    subColor: 'text-amber-200/70',
  },
  asociaciones: {
    accent: 'from-green-900/60 to-green-950/80',
    border: 'border-green-600/50 hover:border-green-400/70',
    iconBg: 'bg-green-700/40 border-green-500/50',
    iconColor: 'text-green-300',
    titleColor: 'text-green-100',
    subColor: 'text-green-200/70',
  },
  biopreparados: {
    accent: 'from-violet-900/60 to-violet-950/80',
    border: 'border-violet-600/50 hover:border-violet-400/70',
    iconBg: 'bg-violet-700/40 border-violet-500/50',
    iconColor: 'text-violet-300',
    titleColor: 'text-violet-100',
    subColor: 'text-violet-200/70',
  },
  mip: {
    accent: 'from-rose-900/60 to-rose-950/80',
    border: 'border-rose-600/50 hover:border-rose-400/70',
    iconBg: 'bg-rose-700/40 border-rose-500/50',
    iconColor: 'text-rose-300',
    titleColor: 'text-rose-100',
    subColor: 'text-rose-200/70',
  },
  fenologia: {
    accent: 'from-sky-900/60 to-sky-950/80',
    border: 'border-sky-600/50 hover:border-sky-400/70',
    iconBg: 'bg-sky-700/40 border-sky-500/50',
    iconColor: 'text-sky-300',
    titleColor: 'text-sky-100',
    subColor: 'text-sky-200/70',
  },
};

/**
 * Bloque de contenido individual de una lección.
 */
function BloqueContenido({ bloque }) {
  if (bloque.tipo === 'dato_clave') {
    return (
      <div
        data-testid="bloque-dato-clave"
        className="rounded-lg bg-emerald-900/30 border border-emerald-700/40 px-4 py-3"
      >
        <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-1.5">
          Dato verificado
        </p>
        <p className="text-sm text-emerald-100 leading-relaxed">{bloque.texto}</p>
        {bloque.fuente && (
          <p className="text-[11px] text-emerald-300/60 mt-2 leading-relaxed">
            Fuente: {bloque.fuente}
          </p>
        )}
      </div>
    );
  }

  if (bloque.tipo === 'advertencia') {
    return (
      <div
        data-testid="bloque-advertencia"
        className="rounded-lg bg-rose-900/20 border border-rose-700/40 px-4 py-3"
      >
        <p className="text-xs font-bold text-rose-300 uppercase tracking-wide mb-1.5">
          Importante
        </p>
        <p className="text-sm text-rose-100 leading-relaxed">{bloque.texto}</p>
      </div>
    );
  }

  // tipo: 'texto' (default)
  return (
    <p
      data-testid="bloque-texto"
      className="text-sm text-slate-200 leading-relaxed"
    >
      {bloque.texto}
    </p>
  );
}

/**
 * Botón "Pregúntale al agente" — conecta Aprender → Agente. Abre el chat del
 * agente con la pregunta de la lección pre-cargada en el compositor (el usuario
 * la revisa y envía; sin auto-submit). Identidad de marca: glifo de la mano de
 * Chagra + acento del tema (--t-accent-rgb), nada de estética genérica de IA.
 */
function PreguntaleAlAgenteButton({ pregunta, onAskAgent }) {
  return (
    <button
      type="button"
      data-testid="preguntale-al-agente"
      onClick={() => onAskAgent(pregunta)}
      className="w-full mt-1 inline-flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.99] transition-transform min-h-[52px] focus-visible:outline-none focus-visible:ring-2"
      style={{
        border: '1px solid rgba(var(--t-accent-rgb), 0.5)',
        background:
          'linear-gradient(135deg, rgba(var(--t-accent-rgb),0.16), rgba(15,23,20,0.5) 60%)',
      }}
    >
      <span
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
        style={{
          color: 'rgb(var(--t-accent-rgb))',
          background: 'rgba(var(--t-accent-rgb),0.12)',
        }}
        aria-hidden="true"
      >
        <ManoChagraGlyph size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-100 leading-tight">
          Pregúntale al agente
        </span>
        <span className="block text-xs text-slate-300/80 leading-snug mt-0.5 truncate">
          “{pregunta}”
        </span>
      </span>
      <MessageCircle
        size={18}
        className="shrink-0 self-center"
        style={{ color: 'rgb(var(--t-accent-rgb))' }}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * Vista de una lección completa con navegación y insights.
 */
function LeccionView({ leccion, onBack, onAskAgent }) {
  const [bloqueIdx, setBloqueIdx] = useState(0);
  const [mostrandoInsights, setMostrandoInsights] = useState(false);

  // "Pregúntale al agente" (conecta Aprender → Agente): la pregunta de ESTA
  // lección, pre-cargada en el chat. Si la lección no trae pregunta, caemos a
  // una pregunta honesta derivada del título.
  const preguntaLeccion =
    (typeof leccion.pregunta_agente === 'string' && leccion.pregunta_agente.trim())
      || `Cuéntame más sobre ${(leccion.titulo || leccion.slug || '').toLowerCase()}.`;
  const puedePreguntar = typeof onAskAgent === 'function';

  const bloques = leccion.contenido_bloques;
  const insightsDeLeccion = useMemo(
    () => todasLasCards.filter((c) => c.leccion_base === leccion.slug),
    [leccion.slug]
  );

  const esUltimoBloque = bloqueIdx >= bloques.length - 1;
  const colors = LECCION_COLORS[leccion.slug] || LECCION_COLORS.suelo;
  const Icon = LECCION_ICONS[leccion.slug] || BookOpen;

  return (
    <div
      data-testid="leccion-view"
      className="flex flex-col h-full"
      aria-label={`Lección: ${leccion.titulo}`}
    >
      {/* Sub-header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al menú de lecciones"
          className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-sky-400" />
        </button>
        <Icon size={16} className={colors.iconColor} aria-hidden="true" />
        <p className="text-sm font-bold text-slate-200 truncate">{leccion.titulo}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!mostrandoInsights ? (
          <>
            {/* Infográfico de apertura (PoC audit triple: "cero gráficos").
                Solo en el primer bloque, para introducir la lección de un
                vistazo. Gateado dev-only (VITE_APRENDER_INFOGRAFIA); si la
                lección no trae `infografia`, no se renderiza nada. */}
            {INFOGRAFIA_ACTIVA && bloqueIdx === 0 && leccion.infografia && (
              <LessonInfographic {...leccion.infografia} />
            )}

            {/* Bloque actual */}
            <div
              data-testid="bloque-actual"
              className="min-h-[120px]"
            >
              <BloqueContenido bloque={bloques[bloqueIdx]} />
            </div>

            {/* Indicador de progreso */}
            <div className="flex items-center gap-1" aria-label={`Paso ${bloqueIdx + 1} de ${bloques.length}`}>
              {bloques.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full flex-1 transition-colors ${
                    i === bloqueIdx
                      ? 'bg-emerald-400'
                      : i < bloqueIdx
                      ? 'bg-emerald-700'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Navegación */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBloqueIdx((i) => Math.max(0, i - 1))}
                disabled={bloqueIdx === 0}
                aria-label="Bloque anterior"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 disabled:opacity-40 hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Anterior
              </button>

              {esUltimoBloque ? (
                <button
                  type="button"
                  onClick={() => setMostrandoInsights(true)}
                  aria-label="Ver datos verificados de esta lección"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm font-bold text-emerald-50 active:bg-emerald-800 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  Ver datos verificados
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBloqueIdx((i) => Math.min(bloques.length - 1, i + 1))}
                  aria-label="Siguiente bloque"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700/70 hover:bg-emerald-700 text-sm font-bold text-emerald-100 active:bg-emerald-800 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                >
                  Siguiente
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Pregúntale al agente (Aprender → Agente): abre el chat con la
                pregunta de esta lección pre-cargada. */}
            {puedePreguntar && (
              <PreguntaleAlAgenteButton
                pregunta={preguntaLeccion}
                onAskAgent={onAskAgent}
              />
            )}

            {/* Fuente de la lección */}
            <p className="text-[11px] text-slate-600 leading-relaxed pt-2 border-t border-slate-800/40">
              <strong className="text-slate-500">Fuente base:</strong>{' '}
              {leccion.fuente}
            </p>
          </>
        ) : (
          /* Vista de insights */
          <div
            data-testid="insights-view"
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-200">
                Datos verificados — {leccion.titulo}
              </p>
              <button
                type="button"
                onClick={() => { setBloqueIdx(0); setMostrandoInsights(false); }}
                aria-label="Volver a la lección"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 min-h-[36px] px-2 rounded-lg hover:bg-slate-800"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Lección
              </button>
            </div>

            {insightsDeLeccion.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No hay datos verificados registrados para esta lección aún.
              </p>
            ) : (
              insightsDeLeccion.map((card) => (
                <InsightCard key={card.id} card={card} compact={false} />
              ))
            )}

            {/* Pregúntale al agente (Aprender → Agente): cierre de la lección con
                la pregunta pre-cargada en el chat. */}
            {puedePreguntar && (
              <PreguntaleAlAgenteButton
                pregunta={preguntaLeccion}
                onAskAgent={onAskAgent}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card de entrada — se usa en HelpHomeScreen o donde se integre.
 * onNavigate recibe 'aprende' para entrar al módulo completo.
 */
export function AprenderEntryCard({ onNavigate }) {
  return (
    <button
      type="button"
      data-testid="aprende-entry-card"
      onClick={() => onNavigate('aprende')}
      className="rounded-2xl bg-gradient-to-br from-emerald-900/60 to-teal-950/80 border border-emerald-600/50 hover:border-emerald-400/70 active:scale-[0.99] transition-all p-5 text-left flex items-start gap-4 min-h-[112px] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 w-full"
    >
      <span className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-700/40 border border-emerald-500/50">
        <BookOpen size={28} className="text-emerald-300" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black leading-tight text-emerald-100">
          Aprende con el agente
        </p>
        <p className="text-xs mt-1.5 leading-relaxed text-emerald-200/70">
          Datos agroecológicos verificados: suelo, asociaciones, biopreparados, MIP y fenología. Cada dato tiene fuente.
        </p>
      </div>
      <ChevronRight size={20} className="shrink-0 text-slate-400 self-center" />
    </button>
  );
}

/**
 * Componente principal — muestra el listado de lecciones y navega a cada una.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] - volver al dashboard.
 * @param {(pregunta: string) => void} [props.onAskAgent] - abre el chat del
 *   agente con la pregunta de la lección pre-cargada (conecta Aprender → Agente).
 * @param {string} [props.initialSlug] - abre directamente esta lección (deep-link
 *   desde el Curso guiado, ej. navigate('aprende', { leccion: 'suelo' })). Si el
 *   slug no existe, cae al listado normal.
 * @param {(view: string, data?: any) => void} [props.onNavigate] - navegación real
 *   de la app; se usa para el CTA "Ir al curso guiado" (navigate('curso')).
 */
export default function AprenderConAgente({ onBack, onAskAgent, initialSlug, onNavigate }) {
  const [leccionActual, setLeccionActual] = useState(
    () => (initialSlug ? lecciones.find((l) => l.slug === initialSlug) || null : null)
  );

  if (leccionActual) {
    return (
      <LeccionView
        leccion={leccionActual}
        onBack={() => setLeccionActual(null)}
        onAskAgent={onAskAgent}
      />
    );
  }

  return (
    <div
      data-testid="aprende-con-agente"
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-sky-400" />
          </button>
        )}
        <BookOpen size={16} className="text-emerald-400" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-200">Aprende con el agente</p>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* LA SALA DE JUEGOS — primero y bien visible (feedback del operador
            2026-07-16: "no veo los juegos"): el toldo de feria abre el hub
            con los 9 juegos (#juegos). Jugar también es aprender. */}
        {typeof onNavigate === 'function' && (
          <SalaJuegosBanner onNavigate={onNavigate} />
        )}

        {/* ¿Nuevo en Chagra? El curso guiado enseña a USAR la app (video +
            lección + probar), del primer registro a la venta. Va arriba de las
            lecciones sueltas: es el camino para volverse autónomo. */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="aprende-curso-cta"
            onClick={() => onNavigate('curso')}
            className="w-full rounded-2xl bg-gradient-to-br from-cyan-900/60 to-emerald-950/80 border border-cyan-600/50 hover:border-cyan-400/70 active:scale-[0.99] transition-all p-4 text-left flex items-center gap-3 min-h-[84px] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
          >
            <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-700/40 border border-cyan-500/50">
              <GraduationCap size={26} className="text-cyan-200" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black leading-tight text-cyan-50">
                Curso: aprende a usar Chagra
              </span>
              <span className="block text-xs mt-1 leading-snug text-cyan-100/70">
                5 pasos con video, del primer registro a la venta.
              </span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-slate-400 self-center" />
          </button>
        )}

        <p className="text-xs text-slate-400 leading-relaxed">
          O elige un tema suelto. Cada lección tiene datos verificados con fuente real: nada inventado.
        </p>

        {lecciones.map((leccion) => {
          const colors = LECCION_COLORS[leccion.slug] || LECCION_COLORS.suelo;
          const Icon = LECCION_ICONS[leccion.slug] || BookOpen;
          const insightsCount = todasLasCards.filter(
            (c) => c.leccion_base === leccion.slug
          ).length;

          return (
            <button
              key={leccion.slug}
              type="button"
              data-testid={`leccion-card-${leccion.slug}`}
              onClick={() => setLeccionActual(leccion)}
              className={`w-full rounded-2xl bg-gradient-to-br ${colors.accent} border ${colors.border} active:scale-[0.99] transition-all p-4 text-left flex items-start gap-3 min-h-[88px] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`}
            >
              <span className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl border ${colors.iconBg}`}>
                <Icon size={24} className={colors.iconColor} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-base font-black leading-tight ${colors.titleColor}`}>
                  {leccion.titulo}
                </p>
                <p className={`text-xs mt-1 leading-relaxed ${colors.subColor}`}>
                  {leccion.descripcion}
                </p>
                {insightsCount > 0 && (
                  <p className={`text-[11px] mt-1.5 ${colors.subColor} opacity-80`}>
                    {insightsCount} dato{insightsCount !== 1 ? 's' : ''} verificado{insightsCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-400 self-center" aria-hidden="true" />
            </button>
          );
        })}

        <p className="text-[11px] text-slate-600 text-center pt-2 leading-relaxed">
          Solo se incluyen datos con fuente verificada. Si un dato no tiene fuente, no está aquí.
        </p>
      </main>
    </div>
  );
}

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
import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ScrollText,
  Sprout,
  Leaf,
  FlaskConical,
  Bug,
  CalendarDays,
  MessageCircle,
} from 'lucide-react';

import lecciones from '../../data/agro-lecciones.json';
import todasLasCards from '../../data/agro-insight-cards.json';
import InsightCard from './InsightCard.jsx';
import LeccionIlustracion from './LeccionIlustracion.jsx';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph.jsx';
import LessonInfographic from '../LessonInfographic.jsx';
import { aprenderInfografiaActivo } from '../../config/aprenderInfografiaFlag.js';
import './aprender-hub.css';

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

/* ── Progreso local por lección (solo capa visual, offline-first) ──────────
   Guarda hasta dónde llegó el usuario en cada lección para que el hub muestre
   progreso visible (audit: "progreso visible"). localStorage con try/catch:
   si el almacenamiento falla (modo privado, cuota), el hub degrada limpio
   a "sin progreso" y la lección funciona igual. */
const PROGRESO_KEY = 'chagra.aprender.progreso.v1';

function leerProgresoLecciones() {
  try {
    const raw = window.localStorage.getItem(PROGRESO_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function guardarProgresoLeccion(slug, patch) {
  try {
    const data = leerProgresoLecciones();
    data[slug] = { ...(data[slug] || {}), ...patch };
    window.localStorage.setItem(PROGRESO_KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento: el progreso simplemente no persiste */
  }
}

/* ── Fuente con DOI destacado ──────────────────────────────────────────────
   Si la fuente trae un DOI, lo separa a un chip monoespaciado propio para que
   la trazabilidad científica sea visible de un vistazo (audit: pie de
   fuente/DOI donde aplique). Si no hay DOI, muestra la fuente tal cual. */
function extraerDoi(fuente) {
  if (typeof fuente !== 'string') return { texto: fuente || '', doi: null };
  const match = /,?\s*DOI[:\s]+(\S+)/i.exec(fuente);
  if (!match) return { texto: fuente, doi: null };
  return {
    texto: fuente.slice(0, match.index).trim().replace(/[,;]$/, ''),
    doi: match[1],
  };
}

function FuentePie({ etiqueta = 'Fuente base', fuente }) {
  const { texto, doi } = extraerDoi(fuente);
  if (!texto && !doi) return null;
  return (
    <div className="flex items-start gap-2 pt-2 border-t border-slate-800/40">
      <ScrollText size={12} className="text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-[11px] text-slate-500 leading-relaxed min-w-0">
        <strong className="text-slate-500">{etiqueta}:</strong> {texto}
        {doi && (
          <>
            {' '}
            <span className="aprh-doi inline-block text-slate-400 mt-0.5">DOI {doi}</span>
          </>
        )}
      </p>
    </div>
  );
}

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
        {bloque.fuente && (() => {
          const { texto, doi } = extraerDoi(bloque.fuente);
          return (
            <p className="text-[11px] text-emerald-300/60 mt-2 leading-relaxed">
              Fuente: {texto}
              {doi && (
                <>
                  {' '}
                  <span className="aprh-doi inline-block text-emerald-300/70 mt-0.5">
                    DOI {doi}
                  </span>
                </>
              )}
            </p>
          );
        })()}
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
 * Botón "Pregúntele al agente" — conecta Aprender → Agente. Abre el chat del
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
          Pregúntele al agente
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
      || `Cuénteme más sobre ${(leccion.titulo || leccion.slug || '').toLowerCase()}.`;
  const puedePreguntar = typeof onAskAgent === 'function';

  const bloques = leccion.contenido_bloques;
  const insightsDeLeccion = useMemo(
    () => todasLasCards.filter((c) => c.leccion_base === leccion.slug),
    [leccion.slug]
  );

  // Posición en el currículo ("Lección N de M") para orientar la navegación.
  const numeroLeccion = lecciones.findIndex((l) => l.slug === leccion.slug) + 1;

  // Progreso visible (hub): persistir hasta dónde llegó en esta lección.
  // Al llegar a los datos verificados, la lección cuenta como completada.
  useEffect(() => {
    const previo = leerProgresoLecciones()[leccion.slug] || {};
    guardarProgresoLeccion(leccion.slug, {
      visto: Math.max(previo.visto || 0, bloqueIdx + 1),
      total: bloques.length,
      ...(mostrandoInsights ? { completada: true } : {}),
    });
  }, [leccion.slug, bloqueIdx, mostrandoInsights, bloques.length]);

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
        <p className="text-sm font-bold text-slate-200 truncate flex-1 min-w-0">
          {leccion.titulo}
        </p>
        {numeroLeccion > 0 && (
          <span className="shrink-0 text-[11px] text-slate-500 font-semibold tabular-nums">
            Lección {numeroLeccion} de {lecciones.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!mostrandoInsights ? (
          <>
            {/* Portada de la lección: SU ilustración (audit: "una ilustración
                por lección") + descripción. Solo en el primer bloque, para
                abrir el tema de un vistazo sin repetirse en cada paso. */}
            {bloqueIdx === 0 && (
              <div
                className={`aprh-card flex items-center gap-4 p-4 bg-gradient-to-br ${colors.accent} border ${colors.border.split(' ')[0]}`}
              >
                <span className="aprh-illo shrink-0 inline-flex items-center justify-center w-20 h-20 p-1.5">
                  <LeccionIlustracion slug={leccion.slug} size={68} />
                </span>
                <p className={`text-xs leading-relaxed min-w-0 ${colors.subColor}`}>
                  {leccion.descripcion}
                </p>
              </div>
            )}

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

            {/* Indicador de progreso (dots + texto visible del paso) */}
            <div aria-label={`Paso ${bloqueIdx + 1} de ${bloques.length}`}>
              <div className="flex items-center gap-1">
                {bloques.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full flex-1 transition-colors motion-reduce:transition-none ${
                      i === bloqueIdx
                        ? 'bg-emerald-400'
                        : i < bloqueIdx
                        ? 'bg-emerald-700'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p
                className="text-[11px] text-slate-500 mt-1.5 text-center tabular-nums"
                aria-hidden="true"
              >
                Paso {bloqueIdx + 1} de {bloques.length}
              </p>
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

            {/* Pie de fuente de la lección (con DOI destacado si aplica) */}
            <FuentePie fuente={leccion.fuente} />
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
      className="aprh-card bg-gradient-to-br from-emerald-900/60 to-teal-950/80 border border-emerald-600/50 hover:border-emerald-400/70 p-5 text-left flex items-start gap-4 min-h-[112px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 w-full"
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
 */
export default function AprenderConAgente({ onBack, onAskAgent }) {
  const [leccionActual, setLeccionActual] = useState(null);

  // Progreso persistido por lección; se relee al volver de una lección
  // (leccionActual → null) para que las barras del hub queden al día.
  const progreso = useMemo(
    () => (leccionActual ? {} : leerProgresoLecciones()),
    [leccionActual]
  );
  const completadas = lecciones.filter((l) => progreso[l.slug]?.completada).length;

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
        <div className="flex items-end justify-between gap-3">
          <p className="text-xs text-slate-400 leading-relaxed min-w-0">
            Elija un tema. Cada lección tiene datos verificados con fuente real: nada inventado.
          </p>
          {completadas > 0 && (
            <span
              data-testid="aprende-progreso-global"
              className="shrink-0 text-[11px] font-bold text-emerald-300 tabular-nums inline-flex items-center gap-1"
            >
              <CheckCircle2 size={12} aria-hidden="true" />
              {completadas} de {lecciones.length}
            </span>
          )}
        </div>

        {lecciones.map((leccion, idx) => {
          const colors = LECCION_COLORS[leccion.slug] || LECCION_COLORS.suelo;
          const insightsCount = todasLasCards.filter(
            (c) => c.leccion_base === leccion.slug
          ).length;
          const totalBloques = leccion.contenido_bloques.length;
          const avance = progreso[leccion.slug] || {};
          const vistos = Math.min(avance.visto || 0, totalBloques);
          const completada = Boolean(avance.completada);
          const pct = completada ? 100 : Math.round((vistos / totalBloques) * 100);

          return (
            <button
              key={leccion.slug}
              type="button"
              data-testid={`leccion-card-${leccion.slug}`}
              onClick={() => setLeccionActual(leccion)}
              aria-label={`Lección ${idx + 1} de ${lecciones.length}: ${leccion.titulo}${
                completada ? '. Completada' : vistos > 0 ? '. En progreso' : ''
              }`}
              className={`aprh-card w-full bg-gradient-to-br ${colors.accent} border ${colors.border} p-4 text-left flex items-start gap-3.5 min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`}
            >
              {/* Ilustración propia de la lección (audit: una por lección) */}
              <span className={`aprh-illo shrink-0 inline-flex items-center justify-center w-[68px] h-[68px] p-1 border ${colors.iconBg.split(' ').pop()}`}>
                <LeccionIlustracion slug={leccion.slug} size={60} />
              </span>

              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.subColor} opacity-90 flex items-center gap-1.5`}>
                  Lección {idx + 1}
                  {completada && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-300 normal-case tracking-normal">
                      <CheckCircle2 size={11} aria-hidden="true" />
                      Completada
                    </span>
                  )}
                </p>
                <p className={`text-base font-black leading-tight mt-0.5 ${colors.titleColor}`}>
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
                {/* Progreso visible por lección (solo si ya la empezó) */}
                {vistos > 0 && !completada && (
                  <div
                    className="aprh-progress-track mt-2"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progreso de la lección: ${pct} %`}
                  >
                    <div className="aprh-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
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

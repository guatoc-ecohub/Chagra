/**
 * InsightProactivoCard — la OFERTA y la ENTREGA de un insight proactivo del
 * agente guiado, DENTRO de la conversación del chat.
 *
 * Antes el contenido de los insights (agro-insight-cards.json) solo vivía en el
 * módulo "Aprende"; el hook `useInsightProactivo` existía pero NO estaba
 * cableado al chat en vivo (auditoría UX §7.4 P3). Esta tarjeta cierra ese hueco:
 * cuando un turno del agente menciona un cultivo con dato verificado disponible,
 * se ofrece el insight como un mensaje más de la conversación. El usuario decide
 * (opt-in): "Ver el dato" expande la InsightCard; "Ahora no" lo descarta.
 *
 * Identidad visual (NO estética genérica de IA — mandato del operador):
 *   - Reusa los primitivos REALES de la marca: la mano de Chagra
 *     (ManoChagraGlyph) y el colibrí (ChagraAgentAvatar), nada inventado.
 *   - Paleta theme-aware vía --t-accent-rgb (teal biopunk / ocre nature /
 *     verde minimalista) — el MISMO token que pinta la mano radial y el wordmark.
 *   - Una rama orgánica SVG (eco de la red de capacidades del AgentRedMenu)
 *     nace del glifo de la mano hacia el nodo del dato: "de la mano de Chagra
 *     crece el conocimiento". Respeta prefers-reduced-motion.
 *
 * Seguridad: la InsightCard ya impone fuente siempre visible + disclaimer
 * non_co. Esta tarjeta no inventa nada: solo presenta lo que el hook eligió.
 */
import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import InsightCard from './InsightCard.jsx';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph.jsx';
import ChagraAgentAvatar from '../ChagraAgentAvatar.jsx';

/**
 * Marco visual con la identidad de Chagra (mano + colibrí + rama radial),
 * theme-aware por --t-accent-rgb. Envuelve el contenido del insight.
 */
function ChagraInsightFrame({ children, titulo }) {
  return (
    <div
      data-testid="insight-proactivo-frame"
      className="relative overflow-hidden rounded-2xl insight-proactivo-frame"
      style={{
        border: '1px solid rgba(var(--t-accent-rgb), 0.45)',
        background:
          'linear-gradient(135deg, rgba(var(--t-accent-rgb),0.14), rgba(15,23,20,0.55) 60%)',
      }}
    >
      <style>{FRAME_CSS}</style>

      {/* Rama radial orgánica de fondo — eco de la mano de Chagra (AgentRedMenu).
          Decorativa, nace abajo-izquierda (la mano) hacia el dato; pinta con el
          acento del tema. aria-hidden: es ornamento, no contenido. */}
      <svg
        className="insight-proactivo-vena"
        viewBox="0 0 120 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M2 76 C 26 70, 30 40, 56 38 S 92 30, 118 8"
          fill="none"
          stroke="rgb(var(--t-accent-rgb))"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="56" cy="38" r="2.4" fill="rgb(var(--t-accent-rgb))" opacity="0.7" />
        <circle cx="118" cy="8" r="2.8" fill="rgb(var(--t-accent-rgb))" opacity="0.6" />
      </svg>

      <div className="relative z-10 p-3">
        <div className="flex items-center gap-2 mb-2">
          {/* Colibrí de Chagra — el avatar real de la marca, en pequeño */}
          <span
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-slate-900/70"
            style={{ border: '1px solid rgba(var(--t-accent-rgb),0.5)' }}
          >
            <ChagraAgentAvatar state="idle" size={28} ariaLabel="Chagra" />
          </span>
          {/* Glifo de la mano de Chagra — hereda el acento del tema */}
          <span
            className="shrink-0"
            style={{ color: 'rgb(var(--t-accent-rgb))' }}
            aria-hidden="true"
          >
            <ManoChagraGlyph size={18} />
          </span>
          <p
            className="text-[11px] font-bold uppercase tracking-wide truncate"
            style={{ color: 'rgb(var(--t-accent-rgb))' }}
          >
            Dato verificado de Chagra
          </p>
        </div>
        {titulo && (
          <p className="text-sm font-bold text-slate-100 leading-tight mb-2">{titulo}</p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * InsightProactivoCard
 * @param {object} props
 * @param {object} props.insight — la card de agro-insight-cards.json elegida.
 * @param {() => void} [props.onDismiss] - descarta la oferta/entrega.
 */
export default function InsightProactivoCard({ insight, onDismiss }) {
  const [aceptado, setAceptado] = useState(false);

  if (!insight) return null;

  // Estado ENTREGADO: la InsightCard completa dentro del marco de Chagra.
  if (aceptado) {
    return (
      <div className="flex justify-start mb-3" data-testid="insight-proactivo-aceptado">
        <div className="max-w-[88%] w-full">
          <ChagraInsightFrame titulo={null}>
            <InsightCard card={insight} compact={false} />
          </ChagraInsightFrame>
        </div>
      </div>
    );
  }

  // Estado OFERTA: tarjeta compacta con la identidad de Chagra + opt-in.
  return (
    <div className="flex justify-start mb-3" data-testid="insight-proactivo-oferta">
      <div className="max-w-[88%] w-full">
        <ChagraInsightFrame titulo={insight.titulo}>
          {insight.cifra && (
            <p
              className="text-xs font-mono mb-2"
              style={{ color: 'rgb(var(--t-accent-strong-rgb))' }}
            >
              {insight.cifra}
            </p>
          )}
          <p className="text-xs text-slate-300/90 leading-relaxed mb-3">
            Chagra tiene un dato verificado con fuente sobre esto. ¿Lo quieres ver?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="insight-proactivo-aceptar"
              onClick={() => setAceptado(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-950 active:scale-[.98] transition-transform min-h-[40px]"
              style={{ backgroundColor: 'rgb(var(--t-accent-rgb))' }}
            >
              <Sparkles size={14} aria-hidden="true" />
              Ver el dato
            </button>
            <button
              type="button"
              data-testid="insight-proactivo-rechazar"
              onClick={onDismiss}
              aria-label="Ahora no"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs text-slate-300 border border-slate-600/60 hover:bg-slate-800/60 min-h-[40px]"
            >
              <X size={13} aria-hidden="true" />
              Ahora no
            </button>
          </div>
        </ChagraInsightFrame>
      </div>
    </div>
  );
}

const FRAME_CSS = `
.insight-proactivo-frame { box-shadow: 0 8px 24px -16px rgba(0,0,0,0.6); }
.insight-proactivo-vena {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 0;
}
.insight-proactivo-vena path {
  stroke-dasharray: 320;
  stroke-dashoffset: 320;
  animation: insight-vena-grow 1.1s ease-out forwards;
}
@keyframes insight-vena-grow { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .insight-proactivo-vena path { animation: none !important; stroke-dashoffset: 0 !important; }
}
`;

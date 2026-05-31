import React from 'react';
import { User, BadgeCheck, Info, Sparkles, AlertTriangle } from 'lucide-react';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import { speak, speakKokoro, stop, isSpeaking, isKokoroAvailable } from '../../services/ttsService';
import { agentSounds } from '../../services/agentSoundService';
import usePrefsStore from '../../store/usePrefsStore';
import FeedbackButtons from '../FeedbackButtons';
import AIBetaBadge from '../AIBetaBadge';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Mapa de nombres "humanizados" de tools del sidecar agro-mcp. Cuando un
 * tool no está mapeado, mostramos el nombre técnico tal cual (e.g.
 * "get_pest_controllers" si no lo tradujimos todavía). Wording cero hype:
 * "compañeras", "biopreparados", no "perfectos", "garantizados".
 */
const TOOL_LABELS = {
  get_species: 'especie',
  get_companions: 'compañeras',
  get_biopreparados: 'biopreparados',
  get_pest_controllers: 'controladores de plagas',
  get_multihop_companions: 'compañeras multi-salto',
  validate_visual_match: 'visión',
};

function toolLabel(toolName) {
  if (!toolName) return '';
  return TOOL_LABELS[toolName] || toolName;
}

/**
 * Renderiza el badge de "fuente" según el metadata del turno del assistant:
 *   - grounded === true             → verde "Catálogo verificado · <tool>"
 *   - tool_used && !grounded        → amber "Tool sin match · <tool>"
 *   - !tool_used (LLM only)         → gris "Respuesta generativa"
 *
 * Wording deliberadamente sobrio (cero hype). Sin "garantizado", "100%",
 * "perfecto" — el catálogo Chagra está en construcción, el badge solo dice
 * "esta respuesta viene del catálogo verificado vs solo del modelo".
 */
function SourceBadge({ metadata }) {
  const md = metadata || {};
  const toolUsed = md.tool_used || null;
  const grounded = md.grounded === true;
  // Capa 2 cross-check (operador 2026-05-30): nombres científicos que el
  // modelo citó y que existen en el catálogo PERO no corresponden a la entidad
  // que el usuario preguntó (ej. Solanum lycopersicum para 'tomate de árbol').
  // Badge no intrusivo, convive con el badge de fuente: avisa sin bloquear.
  const suspectNames = Array.isArray(md.suspect_names) ? md.suspect_names : [];
  const hasSuspect = suspectNames.length > 0;

  if (hasSuspect) {
    return (
      <span
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-amber-600/20 text-amber-300 border border-amber-700"
        data-testid="suspect-name-badge"
        data-source="suspect-scientific-name"
        title={`El nombre científico citado existe en el catálogo pero podría no corresponder a lo que preguntaste: ${suspectNames.join(', ')}. Verifícalo antes de aplicarlo.`}
      >
        <AlertTriangle size={12} aria-hidden="true" />
        <span>Verifica el nombre científico</span>
      </span>
    );
  }

  if (toolUsed && grounded) {
    return (
      <span
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-green-600/20 text-green-300 border border-green-700"
        data-testid="source-badge"
        data-source="catalog"
      >
        <BadgeCheck size={12} aria-hidden="true" />
        <span>Catálogo verificado · {toolLabel(toolUsed)}</span>
      </span>
    );
  }

  if (toolUsed && !grounded) {
    return (
      <span
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-amber-600/20 text-amber-300 border border-amber-700"
        data-testid="source-badge"
        data-source="tool-no-match"
      >
        <Info size={12} aria-hidden="true" />
        <span>Tool sin match · {toolLabel(toolUsed)}</span>
      </span>
    );
  }

  return (
    <span
      className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-amber-900/30 text-amber-300 border border-amber-700/50"
      data-testid="source-badge"
      data-source="generative"
      title="Respuesta del modelo de IA SIN consulta al catálogo Chagra. Puede contener errores; verifica antes de aplicar al cultivo."
    >
      <AlertTriangle size={12} aria-hidden="true" />
      <Sparkles size={12} aria-hidden="true" />
      <span>Respuesta generativa · verifica</span>
    </span>
  );
}

export default function ChatBubble({ message, isStreaming = false, promptText, onConsentNeeded, onRetryOrphan }) {
  const isUser = message.role === 'user';
  const showSourceBadges = usePrefsStore((s) => s.showSourceBadges);
  // Badge "fuente" solo aplica a respuestas del agente, no del usuario, y
  // no durante streaming (se muestra cuando el turn está estabilizado).
  // Mensajes _orphan_recovery (recuperación de pregunta sin respuesta) no
  // llevan badge — no son una respuesta real del agente. Backward compat:
  // mensajes assistant viejos sin metadata se renderizan como "generativa".
  const shouldShowBadge =
    !isUser &&
    !isStreaming &&
    showSourceBadges &&
    !message._orphan_recovery;
  // 2026-05-19 operator: el avatar del agente en el chat debe verse SIEMPRE
  // vivo, no inerte. Aunque la respuesta ya este completa, el colibri sigue
  // libando suavemente — comunica que el agente esta "presente" y listo para
  // la proxima pregunta. Si esta streaming, intensifica a thinking (sip mas
  // rapido + alas en blur). Si no, idle suave igual queda en movimiento.
  const agentState = isStreaming ? 'thinking' : 'thinking';

  // Task #122 (2026-05-23): doble-click en burbuja del agente activa/silencia
  // SOLO ese mensaje. Si TTS está sonando → stop. Si está silenciado →
  // reproducir SOLO esa respuesta puntual (no cambia el toggle global de
  // ttsEnabled). Permite al operador "leer en voz alta este párrafo" sin
  // reactivar toda la voz del agente.
  const handleBubbleDoubleClick = async (e) => {
    if (isUser || isStreaming) return;
    if (typeof message.content !== 'string' || message.content.trim().length === 0) return;
    e.stopPropagation();
    if (isSpeaking()) {
      stop();
      agentSounds.cancel();
      return;
    }
    try {
      const kokoroReady = await isKokoroAvailable();
      if (kokoroReady) {
        await speakKokoro(message.content, { rate: 0.9, pitch: 1.0 });
      } else {
        speak(message.content, { rate: 0.9, pitch: 1.0 });
      }
      agentSounds.chime();
    } catch (_) {
      // No reportar al UI — el TTS es secundario, no debe interrumpir lectura.
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {isUser ? (
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-600">
            <User size={16} className="text-white" />
          </div>
        ) : (
          <div
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 border overflow-hidden ${
              isStreaming ? 'border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,.4)]' : 'border-emerald-700/40'
            }`}
          >
            <ChagraAgentAvatar state={agentState} size={32} ariaLabel="Chagra IA" />
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-emerald-700/60 text-white rounded-tr-sm'
              : 'bg-slate-800/80 text-slate-100 rounded-tl-sm cursor-pointer'
          }`}
          onDoubleClick={handleBubbleDoubleClick}
          title={!isUser && !isStreaming ? 'Doble click reproduce o silencia esta respuesta' : undefined}
        >
          {/* Bug 2026-05-31: la foto del compositor del home NO llegaba al chat,
              solo el texto. Si el mensaje trae `imageUrl` (foto adjuntada en
              AgentHero → outbox → AgentScreen), la pintamos como miniatura
              DENTRO de la burbuja de usuario, encima del caption. El object URL
              lo revoca el AgentScreen al desmontar (no aquí: re-renders no deben
              invalidar el preview). */}
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt={message.imageAlt || 'Foto enviada al agente'}
              data-testid="chat-bubble-image"
              className="mb-2 rounded-xl max-h-56 w-auto object-cover border border-white/15"
            />
          )}
          {/* #339: fallback visible si el contenido del assistant llega vacío
              (respuesta degradada del LLM, stream sin tokens, etc.). Nunca
              dejamos la burbuja en blanco — el usuario campesino no debe ver
              una respuesta "fantasma". Para el usuario sí mostramos su texto
              tal cual (puede ser vacío sólo si tipeó vacío, que el submit ya
              previene). Cero hype, español colombiano. */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {!isUser && (typeof message.content !== 'string' || message.content.trim().length === 0)
              ? <span className="italic text-slate-400">No recibí respuesta del asistente. Intenta de nuevo.</span>
              : message.content}
          </p>
          {/* UX-1 (#284): badge "beta" permanente cerca de cualquier respuesta
              IA del agente. NO reemplaza a SourceBadge (que es la fuente
              grounded vs generativa) — convive. Suprimido para mensajes de
              recuperación huérfana porque no son respuesta real del modelo. */}
          {!isUser && !isStreaming && !message._orphan_recovery && (
            <AIBetaBadge
              className="mt-1"
              confidence={message._grounded?.confidence ?? message.metadata?.confidence}
            />
          )}
          {shouldShowBadge && (
            <div className="mt-1">
              <SourceBadge metadata={message.metadata} />
            </div>
          )}
          {message.timestamp && (
            <p className={`text-[10px] mt-1 ${isUser ? 'text-emerald-300/60' : 'text-slate-500'}`}>
              {formatTime(message.timestamp)}
            </p>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-2 bg-violet-400 rounded-full ml-1 animate-pulse" />
          )}
          {/* Task #194: Botones de feedback 👍/👎 para respuestas del agente */}
          {!isUser && !isStreaming && !message._orphan_recovery && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <FeedbackButtons
                prompt={promptText || ''}
                response={message.content || ''}
                edges={Array.isArray(message._edges) ? message._edges : []}
                onConsentNeeded={onConsentNeeded}
              />
            </div>
          )}
          {/* Bug fix 2026-05-27: botón Reintentar en mensaje _orphan_recovery.
              Re-envía el prompt original via onRetryOrphan sin re-tipear.
              Si no hay handler o no hay prompt original, no se renderiza
              el botón (fallback al copy estático). */}
          {!isUser && !isStreaming && message._orphan_recovery
            && typeof onRetryOrphan === 'function'
            && typeof message._orphan_prompt === 'string'
            && message._orphan_prompt.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <button
                type="button"
                onClick={() => onRetryOrphan(message._orphan_prompt)}
                className="w-full px-3 py-2 rounded-lg bg-emerald-700/40 hover:bg-emerald-700/60 active:bg-emerald-700/80 text-emerald-200 text-sm font-bold border border-emerald-700/60 min-h-[44px] transition-colors"
                data-testid="orphan-recovery-retry"
              >
                Reintentar
              </button>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                Volvemos a procesar tu pregunta anterior.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
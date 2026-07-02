import React from 'react';
import { User, BadgeCheck, Info, Sparkles, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
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
  // FIX 2 (2026-05-31): nombres científicos INVENTADOS — el post-validate los
  // detectó como binomios que NO existen en el catálogo/AGE (ni en la realidad,
  // ej. "Neolepidopteron daquila"). Antes el PWA solo consumía `suspect` y el
  // inventado se tiraba en silencio. Es la señal MÁS fuerte (riesgo mayor que un
  // nombre real mal atribuido), así que tiene prioridad sobre el resto.
  const hallucinatedNames = Array.isArray(md.hallucinated_names) ? md.hallucinated_names : [];
  const hasHallucinated = hallucinatedNames.length > 0;

  if (hasHallucinated) {
    return (
      <span
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-red-700/25 text-red-200 border border-red-700"
        data-testid="hallucinated-name-badge"
        data-source="hallucinated-scientific-name"
        title={`La respuesta menciona un nombre científico que NO está verificado en el catálogo y podría estar inventado por el modelo: ${hallucinatedNames.join(', ')}. No lo uses sin confirmarlo.`}
      >
        <AlertTriangle size={12} aria-hidden="true" />
        <span>Nombre científico sin verificar</span>
      </span>
    );
  }

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

/**
 * #18 (+ refinamiento 2026-06-03) — FuenteBadge: surfacéa la fuente de un turno
 * grounded al MÁXIMO de trazabilidad HONESTA disponible. Dos formas:
 *
 *   1. LINK (`metadata.fuente_url` http/https): la cita lleva al RECURSO citado
 *      (deep-link de ficha, sección del dato, o búsqueda del concepto). CSP-safe:
 *      `<a href target="_blank">` nativo (NO onclick inline) — no requiere
 *      'unsafe-inline'. `rel="noopener noreferrer"` evita fuga de window.opener.
 *   2. TEXTO PLANO (`metadata.fuente_texto === true`, sin URL válida): la fuente
 *      es institucional reconocida pero NO hay recurso puntual al que acercar
 *      (p.ej. IDEAM/Open-Meteo, cuyo portal no permite deep-link al pronóstico
 *      citado). Mostramos "Fuente: X" como `<span>` — NUNCA un link a la
 *      homepage genérica (eso sería trazabilidad teatral). Honestidad ante todo.
 *
 * Si no hay ni URL ni `fuente_texto`, no renderiza nada (graceful).
 */
function FuenteBadge({ metadata }) {
  const md = metadata || {};
  const url = typeof md.fuente_url === 'string' ? md.fuente_url.trim() : '';
  const label = (typeof md.fuente === 'string' && md.fuente.trim()) || 'fuente externa';

  // Forma 1: recurso citado → link clickeable.
  if (/^https?:\/\//i.test(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="fuente-badge"
        data-source="verifiable-source"
        title={`Esta respuesta cita una fuente verificable (${label}). Abre el recurso citado en una pestaña nueva.`}
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-sky-600/20 text-sky-300 border border-sky-700 hover:bg-sky-600/30 underline-offset-2 hover:underline"
      >
        <ShieldCheck size={12} aria-hidden="true" />
        <span>Fuente verificable: {label}</span>
        <ExternalLink size={11} aria-hidden="true" />
      </a>
    );
  }

  // Forma 2: institución reconocida pero sin recurso puntual → texto plano.
  // NO emitimos <a> (no linkeamos a la homepage): solo citamos honestamente.
  if (md.fuente_texto === true) {
    return (
      <span
        data-testid="fuente-badge-text"
        data-source="cited-source-text"
        title={`Esta respuesta cita a ${label}. La institución no expone un enlace directo al dato citado, por eso se muestra como referencia (sin enlace).`}
        className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-slate-600/20 text-slate-300 border border-slate-700"
      >
        <ShieldCheck size={12} aria-hidden="true" />
        <span>Fuente: {label}</span>
      </span>
    );
  }

  return null;
}

/**
 * #19 — AutoCorrectedBadge: aviso sutil de que los guards deterministas
 * (applyOutputGuards) modificaron la respuesta del modelo (corrigieron una
 * viabilidad invertida, anexaron la ruta orgánica a un agroquímico, advirtieron
 * una invasora, etc.). Aparece solo si `metadata.auto_corrected === true`.
 * Reusa el patrón de badge con AlertTriangle. Wording honesto, no alarmista.
 */
function AutoCorrectedBadge({ metadata }) {
  const md = metadata || {};
  if (md.auto_corrected !== true) return null;
  return (
    <span
      className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 bg-violet-600/20 text-violet-300 border border-violet-700"
      data-testid="auto-corrected-badge"
      data-source="auto-corrected"
      title="El sistema ajustó automáticamente esta respuesta para corregir un posible error del modelo (viabilidad, agroquímico sintético, especie invasora, dosis sin fuente). El contenido mostrado ya está corregido."
    >
      <AlertTriangle size={12} aria-hidden="true" />
      <span>Respuesta auto-corregida</span>
    </span>
  );
}

/**
 * #20 — ConfianzaBadge: refleja en la UX cuán firme es un dato CURADO del
 * grounding (p.ej. la dosis de un biopreparado). El nivel `metadata.confianza`
 * ∈ {alta,media,baja} viene del catálogo. Color para que el campesino lo capte
 * sin leer:
 *   - alta  → verde   (dato respaldado/curado, alta confianza)
 *   - media → ámbar   (referencia útil, contrastar)
 *   - baja  → gris     (tentativo, no actuar sin verificar)
 * Aparece solo si el turno trae un nivel reconocible.
 */
const _CONFIANZA_BADGE = {
  alta: {
    label: 'Confianza alta',
    classes: 'bg-emerald-600/20 text-emerald-300 border-emerald-700',
    title: 'Dato del catálogo con alta confianza (curado / respaldado por fuente).',
    Icon: BadgeCheck,
  },
  media: {
    label: 'Confianza media',
    classes: 'bg-amber-600/20 text-amber-300 border-amber-700',
    title: 'Dato del catálogo con confianza media — útil de referencia, contrástalo antes de aplicar.',
    Icon: Info,
  },
  baja: {
    label: 'Confianza baja',
    classes: 'bg-slate-600/20 text-slate-300 border-slate-600',
    title: 'Dato del catálogo con confianza baja — tentativo, no actúes sin verificar con un técnico.',
    Icon: AlertTriangle,
  },
};

function ConfianzaBadge({ metadata }) {
  const md = metadata || {};
  const cfg = _CONFIANZA_BADGE[md.confianza];
  if (!cfg) return null;
  const { Icon } = cfg;
  return (
    <span
      className={`text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 mt-1 border ${cfg.classes}`}
      data-testid="confianza-badge"
      data-confianza={md.confianza}
      title={cfg.title}
    >
      <Icon size={12} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

/**
 * Burbuja individual de chat para un mensaje del usuario o del agente.
 * Soporta renderizado de imágenes, badges de fuente verificable, confianza,
 * auto-corrección, nombres científicos sospechosos/alucinados, feedback,
 * reproducción TTS con doble click y botón de reintento para mensajes huérfanos.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.message - Objeto mensaje con `role` ('user'|'assistant'), `content`, `timestamp`,
 *   `metadata` (fuente, confianza, tool_used, grounded), `imageUrl`, `photo`, `_orphan_recovery`,
 *   `_orphan_prompt`, `_deepResearch`, `_edges`.
 * @param {boolean} [props.isStreaming=false] - Indica si este mensaje está en streaming.
 * @param {string} [props.promptText] - Texto del prompt del usuario asociado a esta respuesta (para feedback).
 * @param {Function} props.onConsentNeeded - Callback cuando se requiere consentimiento para enviar feedback.
 * @param {Function} props.onRetryOrphan - Callback para reintentar un mensaje huérfano sin respuesta.
 */
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
    // `chagra-bubble-in`: entrada suave (fade+rise) definida en el CSS del área
    // de chat (ChatHistory). Bajo prefers-reduced-motion queda inerte; fuera de
    // ChatHistory (tests / usos sueltos) la clase sin keyframes es un no-op.
    <div className={`chagra-bubble-in flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
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
          /* Polish visual 2026-07: borde sutil + sombra corta para que la
             burbuja "flote" sobre el scrim con foto de fondo sin perder
             contraste. Usuario en degradé esmeralda (dirección del envío),
             agente en slate con borde — se distinguen de un vistazo. */
          className={`rounded-2xl px-4 py-2.5 shadow-md ${
            isUser
              ? 'bg-gradient-to-br from-emerald-600/70 to-emerald-800/65 text-white rounded-tr-sm border border-emerald-500/25 shadow-emerald-950/25'
              : 'bg-slate-800/90 text-slate-100 rounded-tl-sm cursor-pointer border border-slate-700/60 shadow-slate-950/30'
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
          {/* FEAT-2 (#291): foto adjunta por el usuario al chat (ID +
              diagnóstico inline). Se renderiza como thumbnail dentro de la
              burbuja del usuario, encima del texto/caption. */}
          {message.photo && (
            <img
              src={message.photo}
              alt="Foto enviada"
              className="mb-2 rounded-lg max-h-48 w-auto object-cover border border-emerald-800/50"
              data-testid="chat-bubble-photo"
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
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <SourceBadge metadata={message.metadata} />
              {/* #20: confianza del dato curado (alta/media/baja → verde/ámbar/gris). */}
              <ConfianzaBadge metadata={message.metadata} />
              {/* #18: fuente verificable clickeable (Agrosavia/FAO), CSP-safe. */}
              <FuenteBadge metadata={message.metadata} />
              {/* #19: aviso de que los guards deterministas corrigieron la respuesta. */}
              <AutoCorrectedBadge metadata={message.metadata} />
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
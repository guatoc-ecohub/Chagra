import React, { useState } from 'react';
import {
  BadgeCheck, Info, Sparkles, AlertTriangle, ExternalLink, ShieldCheck,
  OctagonAlert, SearchX, Wrench, ChevronDown,
} from 'lucide-react';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import { speak, speakKokoro, stop, isSpeaking, isKokoroAvailable } from '../../services/ttsService';
import { agentSounds } from '../../services/agentSoundService';
import usePrefsStore from '../../store/usePrefsStore';
import FeedbackButtons from '../FeedbackButtons';
import AIBetaBadge from '../AIBetaBadge';
import SemaforoConfianza from './SemaforoConfianza';
import AgentMarkdown from './AgentMarkdown';

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
 * Sello — la pieza base del SEMÁFORO DE CONFIANZA (pulido visual 2026-07).
 * TODOS los badges bajo una respuesta del agente comparten esta anatomía:
 * lámpara (punto sólido del color del nivel con el ícono en negativo) +
 * etiqueta + caret si es expandible. El nivel es el semáforo que el
 * campesino lee de un vistazo:
 *
 *   verde → verificado en el catálogo/grafo · ámbar → generativo/parcial,
 *   verifica · rojo → posible invento del modelo · gris → neutro (beta).
 *
 * Accesible sin depender del color: cada nivel usa un ícono de FORMA
 * distinta (check/triángulo/octágono/chispa) + texto. En celular no hay
 * tooltip nativo, así que si el sello trae `explica`, se vuelve botón y al
 * toque abre una "nota al margen" (.sello-nota) con la explicación en
 * español llano. CSS en src/styles/sello-confianza.css (theme-aware,
 * GPU-friendly, prefers-reduced-motion). Este componente es SOLO
 * presentación — qué sello sale lo decide el pipeline aguas arriba.
 *
 * @param {Object} props
 * @param {'verde'|'ambar'|'rojo'|'gris'} props.nivel - Nivel del semáforo.
 * @param {React.ComponentType<any>} props.Icon - Ícono lucide de la lámpara.
 * @param {string} props.label - Etiqueta corta del sello.
 * @param {string} [props.sub] - Sufijo secundario (" · <sub>", más tenue).
 * @param {string} [props.explica] - Explicación llana; si viene, el sello es
 *   un botón expandible que la muestra como nota al margen.
 * @param {string} props.testId - data-testid estable (contrato de tests).
 * @param {string} [props.title] - Tooltip nativo (desktop).
 * @param {Object} [props.dataAttrs] - Atributos data-* extra (data-source…).
 */
function Sello({ nivel, Icon, label, sub, explica, testId, title, dataAttrs = {} }) {
  const [abierto, setAbierto] = useState(false);
  const cuerpo = (
    <>
      <span className="sello-lampara" aria-hidden="true">
        <Icon size={10} strokeWidth={2.75} />
      </span>
      <span className="sello-texto">
        {label}
        {sub ? <span className="sello-sub"> · {sub}</span> : null}
      </span>
      {explica ? <ChevronDown size={10} className="sello-caret" aria-hidden="true" /> : null}
    </>
  );

  if (!explica) {
    return (
      <span className="sello" data-nivel={nivel} data-testid={testId} title={title} {...dataAttrs}>
        {cuerpo}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="sello"
        data-nivel={nivel}
        data-testid={testId}
        title={title || explica}
        aria-expanded={abierto}
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        {...dataAttrs}
      >
        {cuerpo}
      </button>
      {abierto && (
        <span className="sello-nota" role="note" data-nivel={nivel}>
          {explica}
        </span>
      )}
    </>
  );
}

/**
 * Renderiza el badge de "fuente" según el metadata del turno del assistant:
 *   - grounded === true             → verde "Catálogo verificado · <tool>"
 *   - tool_used && !grounded        → ámbar "No está en el catálogo · <tool>"
 *   - !tool_used (LLM only)         → ámbar "Respuesta generativa · verifica"
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
      <Sello
        nivel="rojo"
        Icon={OctagonAlert}
        label="Nombre científico sin verificar"
        testId="hallucinated-name-badge"
        dataAttrs={{ 'data-source': 'hallucinated-scientific-name' }}
        title={`La respuesta menciona un nombre científico que NO está verificado en el catálogo y podría estar inventado por el modelo: ${hallucinatedNames.join(', ')}. No lo uses sin confirmarlo.`}
        explica={`La respuesta menciona un nombre científico que NO está en el catálogo y podría ser un invento del modelo: ${hallucinatedNames.join(', ')}. No lo use sin confirmarlo con un técnico.`}
      />
    );
  }

  if (hasSuspect) {
    return (
      <Sello
        nivel="ambar"
        Icon={AlertTriangle}
        label="Verifica el nombre científico"
        testId="suspect-name-badge"
        dataAttrs={{ 'data-source': 'suspect-scientific-name' }}
        title={`El nombre científico citado existe en el catálogo pero podría no corresponder a lo que preguntaste: ${suspectNames.join(', ')}. Verifícalo antes de aplicarlo.`}
        explica={`El nombre científico citado existe en el catálogo, pero podría no ser el de la planta que usted preguntó: ${suspectNames.join(', ')}. Verifíquelo antes de aplicarlo.`}
      />
    );
  }

  // AFFECTS-GATE (anti-contaminación cruzada de cultivo): la evidencia surfaceó
  // un organismo (plaga) que NO afecta al cultivo en foco — la arista AFFECTS no
  // existe (ej. la BROCA, plaga de café, en una conversación de cacao). El sello
  // "Catálogo verificado" YA se degradó aguas arriba (grounded=false); acá lo
  // decimos explícito y honesto: el dato es de OTRO cultivo. Ámbar, no verde.
  // Wording sobrio, cero hype. Ver services/affectsGate.js.
  const crossCrop = md.cross_crop === true;
  if (crossCrop) {
    const organismos = Array.isArray(md.cross_crop_organisms)
      ? md.cross_crop_organisms.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [];
    const detalle = organismos.length > 0 ? ` (${organismos.join(', ')})` : '';
    return (
      <Sello
        nivel="ambar"
        Icon={AlertTriangle}
        label="Dato de otro cultivo"
        sub="verifica"
        testId="cross-crop-badge"
        dataAttrs={{ 'data-source': 'cross-crop' }}
        title={`Este dato${detalle} existe en el catálogo pero corresponde a OTRO cultivo, no al que tienes en foco. No es un "dato verificado" para tu cultivo: verifícalo antes de aplicarlo.`}
        explica={`Este dato${detalle} sí está en el catálogo, pero es de OTRO cultivo, no del que usted tiene en foco. No lo tome como verificado para su cultivo: verifíquelo antes de aplicarlo.`}
      />
    );
  }

  if (toolUsed && grounded) {
    return (
      <Sello
        nivel="verde"
        Icon={BadgeCheck}
        label="Catálogo verificado"
        sub={toolLabel(toolUsed)}
        testId="source-badge"
        dataAttrs={{ 'data-source': 'catalog' }}
        explica="Este dato viene del catálogo Chagra, armado con fuentes revisadas. No es solo palabra del modelo: tiene respaldo. Ante la duda, consulte a su técnico."
      />
    );
  }

  if (toolUsed && !grounded) {
    return (
      <Sello
        nivel="ambar"
        Icon={SearchX}
        label="No está en el catálogo"
        sub={toolLabel(toolUsed)}
        testId="source-badge"
        dataAttrs={{ 'data-source': 'tool-no-match' }}
        explica="Chagra buscó en su catálogo y no encontró este dato. Lo que lee salió del modelo de IA, sin respaldo del catálogo: verifíquelo antes de aplicarlo."
      />
    );
  }

  return (
    <Sello
      nivel="ambar"
      Icon={Sparkles}
      label="Respuesta generativa"
      sub="verifica"
      testId="source-badge"
      dataAttrs={{ 'data-source': 'generative' }}
      title="Respuesta del modelo de IA SIN consulta al catálogo Chagra. Puede contener errores; verifica antes de aplicar al cultivo."
      explica="Esta respuesta salió del modelo de IA sin consultar el catálogo Chagra. Puede traer errores: verifíquela antes de aplicarla en su cultivo."
    />
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

  // Forma 1: recurso citado → link clickeable. Sello VERDE del semáforo (la
  // fuente es verificable), pero sigue siendo <a> nativo CSP-safe — el toque
  // navega al recurso, no expande nota.
  if (/^https?:\/\//i.test(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="fuente-badge"
        data-source="verifiable-source"
        data-nivel="verde"
        title={`Esta respuesta cita una fuente verificable (${label}). Abre el recurso citado en una pestaña nueva.`}
        className="sello tap-target"
      >
        <span className="sello-lampara" aria-hidden="true">
          <ShieldCheck size={10} strokeWidth={2.75} />
        </span>
        <span className="sello-texto">Fuente verificable: {label}</span>
        <ExternalLink size={10} className="sello-caret" aria-hidden="true" />
      </a>
    );
  }

  // Forma 2: institución reconocida pero sin recurso puntual → texto plano.
  // NO emitimos <a> (no linkeamos a la homepage): solo citamos honestamente.
  if (md.fuente_texto === true) {
    return (
      <Sello
        nivel="gris"
        Icon={ShieldCheck}
        label={`Fuente: ${label}`}
        testId="fuente-badge-text"
        dataAttrs={{ 'data-source': 'cited-source-text' }}
        title={`Esta respuesta cita a ${label}. La institución no expone un enlace directo al dato citado, por eso se muestra como referencia (sin enlace).`}
        explica={`Esta respuesta cita a ${label}. Esa institución no tiene un enlace directo al dato citado, por eso se muestra solo como referencia, sin enlace.`}
      />
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
    <Sello
      nivel="ambar"
      Icon={Wrench}
      label="Respuesta auto-corregida"
      testId="auto-corrected-badge"
      dataAttrs={{ 'data-source': 'auto-corrected' }}
      title="El sistema ajustó automáticamente esta respuesta para corregir un posible error del modelo (viabilidad, agroquímico sintético, especie invasora, dosis sin fuente). El contenido mostrado ya está corregido."
      explica="El sistema corrigió automáticamente un posible error del modelo en esta respuesta (viabilidad, agroquímico sintético, especie invasora o dosis sin fuente). Lo que usted lee ya está corregido."
    />
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
    nivel: 'verde',
    title: 'Dato del catálogo con alta confianza (curado / respaldado por fuente).',
    explica: 'Este dato del catálogo tiene alta confianza: fue curado y tiene fuente que lo respalda.',
    Icon: BadgeCheck,
  },
  media: {
    label: 'Confianza media',
    nivel: 'ambar',
    title: 'Dato del catálogo con confianza media — útil de referencia, contrástalo antes de aplicar.',
    explica: 'Este dato del catálogo tiene confianza media: sirve de referencia, pero contrástelo con su técnico antes de aplicarlo.',
    Icon: Info,
  },
  baja: {
    label: 'Confianza baja',
    nivel: 'gris',
    title: 'Dato del catálogo con confianza baja — tentativo, no actúes sin verificar con un técnico.',
    explica: 'Este dato del catálogo tiene confianza baja: es tentativo. No actúe sin verificarlo con un técnico.',
    Icon: AlertTriangle,
  },
};

function ConfianzaBadge({ metadata }) {
  const md = metadata || {};
  const cfg = _CONFIANZA_BADGE[md.confianza];
  if (!cfg) return null;
  return (
    <Sello
      nivel={cfg.nivel}
      Icon={cfg.Icon}
      label={cfg.label}
      testId="confianza-badge"
      dataAttrs={{ 'data-confianza': md.confianza }}
      title={cfg.title}
      explica={cfg.explica}
    />
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
  // Indicador SUTIL de grounding (pulido voice-first 2026-07): además de los
  // badges detallados (que dependen del pref showSourceBadges), una respuesta
  // groundeada lleva SIEMPRE un filo esmeralda a la izquierda + un check junto
  // a la hora. Señal barata de "esto viene respaldado" que el campesino capta
  // sin leer. Solo lee metadata YA existente en el turno — cero backend nuevo.
  const isGrounded =
    !isUser &&
    !isStreaming &&
    !message._orphan_recovery &&
    message?.metadata?.grounded === true;
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
        // Sin rate hardcodeado: hereda la velocidad preferida del operador.
        await speakKokoro(message.content);
      } else {
        speak(message.content, { rate: 0.9, pitch: 1.0 });
      }
      agentSounds.chime();
    } catch (_) {
      // No reportar al UI — el TTS es secundario, no debe interrumpir lectura.
    }
  };

  // V3 "cuaderno de campo cosido": los turnos ya no son la pareja genérica
  // avatar-circulito + burbuja slate de chatbot. El turno del AGENTE es una
  // ENTRADA de cuaderno: byline chiquito (colibrí 22px + "Chagra" en Baloo 2)
  // y debajo la tarjeta-papel del tema (.v3-card), con LA COSTURA de hilo
  // esmeralda en el borde izquierdo cuando la respuesta viene respaldada por
  // el catálogo (data-grounded — el CSS pinta la puntada). El turno del
  // USUARIO es una nota compacta con el verde del tema (.v3-bubble-user), sin
  // ícono de personita: la alineación derecha ya dice quién habla y el chat
  // recupera ese ancho en el celular. CSS en AGENT_V3_CSS (agentEntrance.js).
  return (
    <div className={`v3-turn ${isUser ? 'v3-turn-user' : 'v3-turn-agent'}`}>
      {!isUser && (
        <div className="v3-byline" aria-hidden="true">
          <span className={`v3-byline-avatar${isStreaming ? ' is-streaming' : ''}`}>
            <ChagraAgentAvatar state={agentState} size={30} ariaLabel="Chagra IA" />
          </span>
          <span>Chagra</span>
        </div>
      )}

      <div
        className={isUser ? 'v3-bubble-user' : 'v3-card cursor-pointer'}
        data-grounded={isGrounded ? 'true' : undefined}
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
              una respuesta "fantasma". Cero hype, español colombiano.

              Task #58: el agente emite markdown (**negritas**, ### títulos,
              * viñetas). Antes se mostraba CRUDO (whitespace-pre-wrap) y el
              campesino/niña veía los asteriscos. Ahora las respuestas YA
              ESTABILIZADAS del agente se renderizan como markdown limpio
              (AgentMarkdown → escape + DOMPurify). El texto del usuario y el
              streaming en curso siguen como texto plano: el del usuario no es
              markdown, y el streaming evita parpadeo por `**` aún sin cerrar. */}
          {!isUser && (typeof message.content !== 'string' || message.content.trim().length === 0) ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              <span className="italic text-slate-400">No recibí respuesta del asistente. Intenta de nuevo.</span>
            </p>
          ) : !isUser && !isStreaming ? (
            <AgentMarkdown content={message.content} />
          ) : (
            /* break-words: sin esto una URL o palabra larga sin espacios
               desborda la burbuja en horizontal a 320px. */
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {/* UX-1 (#284): badge "beta" permanente cerca de cualquier respuesta
              IA del agente. NO reemplaza a SourceBadge (que es la fuente
              grounded vs generativa) — convive. Suprimido para mensajes de
              recuperación huérfana porque no son respuesta real del modelo. */}
          {/* SEMÁFORO DE CONFIANZA: una sola fila coherente de sellos. El pill
              beta (siempre visible) y los sellos de fuente/confianza (pref
              showSourceBadges) comparten fila y anatomía — antes eran
              etiquetas sueltas apiladas con estilos distintos. */}
          {!isUser && !isStreaming && !message._orphan_recovery && (
            <div className="mt-1.5 sello-fila" data-testid="sello-fila">
              {/* SEMÁFORO DE CONFIANZA por-respuesta + PANEL DE PROCEDENCIA
                  por-afirmación (lever moat anti-alucinación visible). Va
                  PRIMERO en la fila (es el titular) y NO depende del pref
                  showSourceBadges: decisión del operador, TODAS las cuentas.
                  Graceful: sin señal de grounding en metadata → no pinta. */}
              <SemaforoConfianza metadata={message.metadata} />
              <AIBetaBadge
                confidence={message._grounded?.confidence ?? message.metadata?.confidence}
              />
              {shouldShowBadge && (
                <>
                  <SourceBadge metadata={message.metadata} />
                  {/* #20: confianza del dato curado (alta/media/baja → verde/ámbar/gris). */}
                  <ConfianzaBadge metadata={message.metadata} />
                  {/* #18: fuente verificable clickeable (Agrosavia/FAO), CSP-safe. */}
                  <FuenteBadge metadata={message.metadata} />
                  {/* #19: aviso de que los guards deterministas corrigieron la respuesta. */}
                  <AutoCorrectedBadge metadata={message.metadata} />
                </>
              )}
            </div>
          )}
          {message.timestamp && (
            <div className={`flex items-center gap-1 mt-1.5 ${isUser ? 'justify-end' : ''}`}>
              {/* Check sutil de grounding: siempre visible en respuestas
                  respaldadas por el catálogo, aunque los badges detallados
                  estén apagados en preferencias. Solo lectura de metadata. */}
              {isGrounded && (
                <span
                  className="inline-flex shrink-0 text-emerald-400/80"
                  title="Respuesta con respaldo del catálogo Chagra"
                  data-testid="grounded-tick"
                >
                  <BadgeCheck size={11} aria-hidden="true" />
                </span>
              )}
              <p className={`text-[10px] ${isUser ? 'text-emerald-200/70' : 'text-slate-500'}`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          )}
          {isStreaming && (
            <span
              className="inline-block w-[3px] h-3.5 ml-1 rounded-full bg-emerald-300/90 animate-pulse align-middle"
              aria-hidden="true"
            />
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
  );
}
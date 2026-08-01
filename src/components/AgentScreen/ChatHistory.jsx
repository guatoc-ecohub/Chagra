import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import DeepResearchCard from '../DeepResearchCard';
import InsightProactivoCard from '../Aprende/InsightProactivoCard';
import ThinkingSteps from './ThinkingSteps';
import { MSG } from '../../config/messages';

// Bug piloto 2026-06-04 (B): "para devolverme tengo que ir hasta el inicio de
// la conversación sin importar lo larga que sea". El único "Volver" vivía en el
// header. Umbral en px a partir del cual mostramos un botón "Volver" FLOTANTE
// dentro del área de chat — así el operador puede salir sin scrollear hasta
// arriba. 160px ≈ un par de mensajes desplazados: suficiente para saber que ya
// no estamos viendo el header.
const FLOATING_BACK_THRESHOLD_PX = 160;

// Bug visual Vi4 (auditoría IA 2026-07-08): el botón flotante TAPABA las
// primeras palabras de cada línea mientras el operador LEÍA (peor en 320px).
// El botón es un overlay — siempre va a cubrir algo — así que la corrección
// es temporal, no espacial: visible mientras el operador scrollea (cuando lo
// necesita para salir) y se esconde solo tras esta pausa sin scroll (cuando
// está leyendo). Cualquier scroll nuevo lo trae de vuelta.
const FLOATING_BACK_IDLE_HIDE_MS = 2200;

/**
 * Área de historial de mensajes del chat con el agente. Renderiza burbujas de
 * chat, tarjetas de Deep Research, saludo proactivo dinámico y estados vacíos.
 * Incluye un botón "Volver" flotante que aparece al hacer scroll lejos del header.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Array} [props.messages=[]] - Lista de mensajes del chat.
 * @param {string} [props.streamingContent=''] - Texto parcial del streaming actual.
 * @param {boolean} [props.isStreaming=false] - Indica si hay un streaming en curso.
 * @param {Function} [props.onConsentNeeded] - Callback cuando se requiere consentimiento del usuario.
 * @param {Function} [props.onRetryOrphan] - Callback para reintentar un mensaje huérfano (sin respuesta).
 * @param {Function} [props.onDismissInsight] - Callback para descartar un insight proactivo.
 * @param {Function} [props.onCancelDeepResearch] - Callback para cancelar una investigación profunda en curso.
 * @param {Function} [props.onAyudaAction] - Callback del deep-link «Abrir …» de la ayuda groundeada (AYUDA_FUNCIONES).
 * @param {Object|null} [props.proactiveGreeting=null] - Datos del saludo proactivo dinámico.
 * @param {string|null} [props.thinkingPhase=null] - Fase REAL del pipeline mientras
 *   se espera el primer token ('entendiendo' | 'consultando' | 'escribiendo' | ...).
 *   ThinkingSteps la traduce a pasos contextuales con ícono ("Consultando el
 *   catálogo…" → "Revisando el grafo…") y rota los de la fase larga. Si es
 *   null cae al "Pensando" genérico — perceived performance, la espera avanza.
 * @param {Function} [props.onBack] - Callback para volver a la pantalla anterior.
 */
export default function ChatHistory({ messages = [], streamingContent = '', isStreaming = false, thinkingPhase = null, onConsentNeeded, onRetryOrphan, onCancelDeepResearch, onDismissInsight, onAyudaAction, proactiveGreeting = null, onBack }) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  // (B) Botón "Volver" flotante: visible solo cuando el operador se alejó del
  // inicio (header fuera de vista). Arriba del todo lo ocultamos porque el
  // header ya ofrece su propio "Volver" y no queremos duplicar affordance.
  const [showFloatingBack, setShowFloatingBack] = useState(false);
  // (Vi4) Timer del auto-ocultado por inactividad de scroll. Ref, no state:
  // solo lo toca el handler; no debe re-renderizar.
  const floatingBackIdleTimerRef = useRef(null);

  const handleScroll = useCallback((e) => {
    const top = e?.target?.scrollTop ?? scrollRef.current?.scrollTop ?? 0;
    const lejosDelInicio = top > FLOATING_BACK_THRESHOLD_PX;
    setShowFloatingBack(lejosDelInicio);
    // (Vi4) El botón se esconde solo cuando el scroll se queda quieto — así
    // no tapa el texto mientras el operador lee. Cada evento de scroll
    // reinicia la cuenta; al vencer, el botón se va hasta el próximo scroll.
    if (floatingBackIdleTimerRef.current) clearTimeout(floatingBackIdleTimerRef.current);
    if (lejosDelInicio) {
      floatingBackIdleTimerRef.current = setTimeout(() => {
        setShowFloatingBack(false);
      }, FLOATING_BACK_IDLE_HIDE_MS);
    }
  }, []);

  // (Vi4) Limpieza del timer al desmontar (evita setState sobre componente muerto).
  useEffect(() => () => {
    if (floatingBackIdleTimerRef.current) clearTimeout(floatingBackIdleTimerRef.current);
  }, []);

  // Fuente ÚNICA del auto-scroll del chat (tarea #58). El contenedor scrollable
  // real es `scrollRef`; `bottomRef` es el marcador del fondo DENTRO de él.
  //
  // Reglas:
  //   - Primer render con contenido (abrir una conversación larga) → saltar al
  //     fondo SIN animación, para no aterrizar a media altura ni ver un barrido.
  //   - Mensajes/tokens nuevos → seguir al fondo SOLO si el usuario ya estaba
  //     cerca del fondo (umbral 120px) o si está llegando una respuesta en
  //     curso. Así no le arrebatamos el scroll cuando subió a releer historial.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    const container = scrollRef.current;
    const anchor = bottomRef.current;
    if (!anchor) return;

    if (!didInitialScrollRef.current) {
      // Salto instantáneo la primera vez que hay contenido para ver.
      didInitialScrollRef.current = true;
      anchor.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }

    const distFromBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0;
    const nearBottom = distFromBottom < 120;
    if (nearBottom || isStreaming) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, streamingContent, isStreaming]);

  // Empty state: aprovechamos el espacio vacío para mostrar el colibrí
  // libando en su tamaño más grande de toda la app (size=200). El header
  // ya tiene una versión chiquita (size=40) — acá vive en grande, como
  // primera impresión del agente.
  //
  // SALUDO PROACTIVO (#162/#298/#331): si AgentScreen ya resolvió el saludo
  // dinámico, lideramos con lo clave (1-2 pendientes) o con una idea contextual.
  // El resto de pendientes vive en la campana/panel — NO los listamos todos
  // aquí. Si el saludo aún no resolvió, caemos al copy estático de siempre.
  if (messages.length === 0 && !isStreaming) {
    return (
      // `relative z-10`: el AgentScreen pinta un velo `.agent-scrim`
      // `absolute inset-0` como PRIMER hijo del root. En temas claros ese velo
      // es crema casi opaco (rgb(--c-surface)/0.94) y, al ser posicionado,
      // pintaba ENCIMA del empty-state (contenido en flujo, sin z-index) →
      // lavaba el saludo a crema-sobre-crema (BUG legibilidad nature/minimalista,
      // operador 2026-06-22). El header y el compositor ya escapan con `z-10`;
      // aquí elevamos el contenido del chat al mismo plano para que el velo
      // quede DETRÁS del texto (su rol real: velar la foto del body, no el copy).
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ChagraAgentAvatar state="idle" size={200} className="mx-auto mb-4" />
          {proactiveGreeting ? (
            <ProactiveGreeting greeting={proactiveGreeting} />
          ) : (
            <>
              {/* V3: saludo en Baloo 2 (display de la casa) — el mismo trazo
                  redondo del home Finca Viva, no la sans genérica. */}
              <p
                className="text-slate-200 text-xl mb-2"
                style={{ fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.3px' }}
              >
                ¡Hola! Soy Angelita, su asistente agroecológica.
              </p>
              <p className="text-slate-500 text-xs">Puede hablarme o escribirme sobre sus plantas.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Loading state mientras el LLM genera el primer token: colibrí libando del
  // abutilón en estado `thinking` (alas en blur rápido + sip motion hacia la
  // flor + corola vibra). Reemplaza el "loading plano" para que la espera
  // se sienta viva.
  const showThinkingAvatar = isStreaming && !streamingContent;

  // Función para encontrar el prompt (pregunta del usuario) correspondiente
  // a cada respuesta del agente. Busca el mensaje anterior más reciente
  // que sea del usuario.
  const findPromptForResponse = (responseIndex) => {
    for (let i = responseIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  return (
    // `z-10`: igual que el empty-state, el chat poblado debe pintar SOBRE el
    // velo `.agent-scrim` (absolute inset-0 en el root del AgentScreen). Sin
    // esto, en temas claros el velo crema casi opaco lava también los mensajes.
    <div className="relative z-10 flex-1 min-h-0">
      {/* (B) Botón "Volver" FLOTANTE: sticky-ish respecto al área de chat,
          aparece al alejarse del inicio. Resuelve "tengo que ir hasta el
          inicio para devolverme". La animación de entrada respeta
          prefers-reduced-motion vía el CSS de abajo. */}
      {typeof onBack === 'function' && showFloatingBack && (
        <button
          type="button"
          onClick={onBack ? () => onBack() : undefined}
          data-testid="chat-floating-back"
          aria-label="Volver"
          className="chagra-floating-back absolute top-3 left-3 z-20 flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-full bg-slate-900/90 backdrop-blur-sm border border-slate-700 text-amber-300 shadow-lg active:scale-95 hover:bg-slate-800"
        >
          <ArrowLeft size={18} className="text-amber-400" />
          <span className="text-xs font-semibold">Volver</span>
        </button>
      )}
      <style>{FLOATING_BACK_CSS}</style>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        data-testid="chat-scroll"
        /* pb-40 (tarea #58): el compositor fijo crece con la franja de voz y el
           tip de foto; pb-28 (112px) dejaba el último mensaje tapado. 160px da
           aire suficiente para que el fondo del chat quede SOBRE el compositor. */
        className="h-full overflow-y-auto p-4 pb-40"
      >
      {messages.map((msg, idx) => {
        // Deep Research (A6/A7): si el mensaje lleva _deepResearch, renderizamos
        // el card de progreso/informe en lugar de (o junto a) la burbuja.
        if (msg._deepResearch) {
          const dr = msg._deepResearch;
          return (
            <div key={msg.id || idx} className="mb-3">
              {/* Burbuja del usuario ya está en el mensaje anterior — el card es
                  la "respuesta" del asistente: no pintamos burbuja de asistente vacía */}
              <DeepResearchCard
                status={dr.status}
                steps={dr.steps}
                report={dr.report}
                citations={dr.citations}
                query={dr.query}
                onCancel={
                  typeof onCancelDeepResearch === 'function' && msg.id
                    ? () => onCancelDeepResearch(msg.id)
                    : undefined
                }
              />
            </div>
          );
        }
        return (
          <React.Fragment key={msg.id || idx}>
            <ChatBubble
              message={msg}
              isStreaming={false}
              promptText={msg.role === 'assistant' ? findPromptForResponse(idx) : undefined}
              onConsentNeeded={onConsentNeeded}
              onRetryOrphan={onRetryOrphan}
            />
            {/* AGENTE GUIADO (auditoría UX §7.4 P3): si este turno del agente trae
                un insight verificado proactivo, lo ofrecemos como una tarjeta más
                de la conversación (opt-in). Aparece DENTRO del chat, justo bajo la
                respuesta que lo motivó — no es un panel aparte. */}
            {msg._insightProactivo && (
              <InsightProactivoCard
                insight={msg._insightProactivo}
                onDismiss={
                  typeof onDismissInsight === 'function'
                    ? () => onDismissInsight(msg.id || idx)
                    : undefined
                }
              />
            )}
            {/* AYUDA GROUNDED («Chagra enseña a usar Chagra»): deep-link a la
                función que el agente acaba de explicar. Navega con el mismo
                mecanismo de la mano (onNavigate) o siembra la pregunta insignia. */}
            {msg._ayudaAction && typeof onAyudaAction === 'function' && (
              <div className="mb-4 ml-12 -mt-2">
                <button
                  type="button"
                  onClick={() => onAyudaAction(msg._ayudaAction)}
                  data-testid="ayuda-deeplink"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg active:scale-95 transition"
                >
                  <span aria-hidden>↗</span>
                  <span>{msg._ayudaAction.label}</span>
                </button>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Placeholder visible mientras llega el primer token (pre-stream).
          Sin esto el chat se ve "muerto" entre el envío del usuario y la
          aparición del primer token — el indicador del header pasa
          desapercibido porque el ojo del operador está en la ventana de
          diálogo. Acá el colibrí late en thinking + texto "Pensando…". */}
      {showThinkingAvatar && (
        // V3: la espera del primer token es una ENTRADA más del cuaderno —
        // byline "Chagra" + tarjeta-papel, coherente con las respuestas. El
        // colibrí late en thinking (alas en blur + sip rápido) en el byline.
        <div className="v3-turn animate-fadeIn">
          <div className="v3-byline">
            <span className="v3-byline-avatar is-streaming">
              <ChagraAgentAvatar
                state="thinking"
                size={30}
                ariaLabel={MSG.agente.pensandoAria}
              />
            </span>
            <span>Chagra</span>
          </div>
          <div className="v3-card text-sm italic text-slate-300" aria-live="polite">
            <ThinkingSteps phase={thinkingPhase} />
            <span className="inline-block ml-1 animate-thinkingDot">·</span>
            <span className="inline-block ml-0.5 animate-thinkingDot [animation-delay:200ms]">·</span>
            <span className="inline-block ml-0.5 animate-thinkingDot [animation-delay:400ms]">·</span>
          </div>
        </div>
      )}

      {isStreaming && streamingContent && (
        <ChatBubble
          message={{ role: 'assistant', content: streamingContent }}
          isStreaming={true}
          onConsentNeeded={onConsentNeeded}
          onRetryOrphan={onRetryOrphan}
        />
      )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/**
 * CSS del botón "Volver" flotante. Fade+rise corto al aparecer; neutralizado
 * bajo prefers-reduced-motion siguiendo el patrón del proyecto (agentEntrance,
 * BiopunkBackground). Inyectado una vez vía <style> en el área de chat.
 */
const FLOATING_BACK_CSS = `
@keyframes chagra-floating-back-kf {
  0% { opacity: 0; transform: translateY(-6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.chagra-floating-back {
  animation: chagra-floating-back-kf 200ms ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .chagra-floating-back { animation: none !important; }
}
`;

/**
 * ProactiveGreeting — el saludo de entrada DINÁMICO del agente. Lidera con lo
 * clave: si state==='pending' muestra 1-2 pendientes destacados (la alerta/tarea
 * top) + un hint de cuántos más hay en la campana; si state==='idea' muestra
 * una idea contextual sin inventar alarmas. CTA siembra el prompt sugerido en
 * el input (el operador revisa y envía — no auto-submit).
 */
function ProactiveGreeting({ greeting }) {
  if (!greeting) return null;
  // `prompt` del saludo ya no se usa: la pastilla-CTA se retiró (tarea #58).
  const { hi, state, lead, items = [], restCount = 0 } = greeting;
  const isPending = state === 'pending';
  return (
    <div data-testid="proactive-greeting" data-greeting-state={state}>
      {/* V3: saludo en Baloo 2 — misma voz tipográfica que el resto del agente. */}
      <p
        className="text-slate-200 text-xl mb-1.5"
        style={{ fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.3px' }}
      >
        {/* 2026-07-16: el agente ES Angelita (la abeja) — el texto acompaña
            a la cara que el operador ya ve arriba. */}
        {hi}. Soy <span className="text-emerald-300">Angelita</span>, de Chagra.
      </p>
      <p
        className="text-slate-300 text-sm leading-relaxed mb-3"
        data-testid="proactive-greeting-lead"
      >
        {lead}
      </p>

      {isPending && items.length > 0 && (
        <ul className="text-left space-y-1.5 mb-3" data-testid="proactive-greeting-items">
          {items.map((it, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                it.kind === 'alert'
                  ? 'bg-rose-500/10 border-rose-600/30 text-rose-100'
                  : 'bg-amber-500/10 border-amber-600/30 text-amber-100'
              }`}
            >
              <span aria-hidden className="shrink-0">{it.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="font-medium">{it.title}</span>
                {it.due && <span className="block opacity-80 text-[11px] mt-0.5">{it.due}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isPending && restCount > 0 && (
        <p className="text-[11px] text-slate-500 mb-3" data-testid="proactive-greeting-rest">
          {restCount === 1
            ? 'Hay 1 pendiente más en la campana 🔔.'
            : `Hay ${restCount} pendientes más en la campana 🔔.`}
        </p>
      )}

      {/* CTA-pastilla de sugerencia RETIRADA (tarea #58): el operador pidió
          quitar los chips de sugerencia del agente porque ensucian y disparan
          flujos confusos. El saludo conserva el contexto (pendientes/idea) pero
          ya no propone una pregunta clickeable; el usuario habla o escribe. */}
    </div>
  );
}
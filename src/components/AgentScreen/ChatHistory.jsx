import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import DeepResearchCard from '../DeepResearchCard';

// Bug piloto 2026-06-04 (B): "para devolverme tengo que ir hasta el inicio de
// la conversación sin importar lo larga que sea". El único "Volver" vivía en el
// header. Umbral en px a partir del cual mostramos un botón "Volver" FLOTANTE
// dentro del área de chat — así el operador puede salir sin scrollear hasta
// arriba. 160px ≈ un par de mensajes desplazados: suficiente para saber que ya
// no estamos viendo el header.
const FLOATING_BACK_THRESHOLD_PX = 160;

/**
 * Área de historial de mensajes del chat con el agente. Renderiza burbujas de
 * chat, tarjetas de Deep Research, saludo proactivo dinámico y estados vacíos.
 * Incluye un botón "Volver" flotante que aparece al hacer scroll lejos del header.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Array} [props.messages=[]] - Lista de mensajes del chat.
 * @param {string} [props.streamingContent=''] - Texto parcial del streaming actual.
 * @param {boolean} [props.isStreaming=false] - Indica si hay un streaming en curso.
 * @param {Function} props.onConsentNeeded - Callback cuando se requiere consentimiento del usuario.
 * @param {Function} props.onRetryOrphan - Callback para reintentar un mensaje huérfano (sin respuesta).
 * @param {Function} props.onCancelDeepResearch - Callback para cancelar una investigación profunda en curso.
 * @param {Object|null} [props.proactiveGreeting=null] - Datos del saludo proactivo dinámico.
 * @param {Function} props.onGreetingPrompt - Callback al seleccionar un prompt sugerido del saludo.
 * @param {Function} props.onBack - Callback para volver a la pantalla anterior.
 */
export default function ChatHistory({ messages = [], streamingContent = '', isStreaming = false, onConsentNeeded, onRetryOrphan, onCancelDeepResearch, proactiveGreeting = null, onGreetingPrompt, onBack }) {
  const scrollRef = useRef(null);
  // (B) Botón "Volver" flotante: visible solo cuando el operador se alejó del
  // inicio (header fuera de vista). Arriba del todo lo ocultamos porque el
  // header ya ofrece su propio "Volver" y no queremos duplicar affordance.
  const [showFloatingBack, setShowFloatingBack] = useState(false);

  const handleScroll = useCallback((e) => {
    const top = e?.target?.scrollTop ?? scrollRef.current?.scrollTop ?? 0;
    setShowFloatingBack(top > FLOATING_BACK_THRESHOLD_PX);
  }, []);

  // Auto-scroll al fondo — ÚNICA fuente de verdad del scroll del chat
  // (task #58: AgentScreen tenía un segundo efecto con chatEndRef que apuntaba
  // al contenedor equivocado —el flex exterior con overflow-hidden— y peleaba
  // con éste, trabando/cortando el scroll). Sólo arrastramos al fondo si el
  // usuario YA estaba cerca del fondo (≤120px) o si llega un stream en curso;
  // si subió a leer mensajes viejos, NO lo interrumpimos. Bug operador
  // "scroll complicado / se corta": antes scrolleábamos en cada cambio sin
  // condición, robándole la lectura. scrollTop directo (no scrollIntoView) para
  // no mover NADA fuera del contenedor de mensajes.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom <= 120 || isStreaming) {
      // scrollTo no existe en jsdom (tests) ni navegadores muy viejos → fallback
      // a setear scrollTop directo. Ambos llevan el contenedor al fondo.
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
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
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ChagraAgentAvatar state="idle" size={200} className="mx-auto mb-4" />
          {proactiveGreeting ? (
            <ProactiveGreeting greeting={proactiveGreeting} onPrompt={onGreetingPrompt} />
          ) : (
            <>
              <p className="text-slate-200 text-base mb-2 font-medium">¡Hola! Soy tu asistente agroecológico.</p>
              <p className="text-slate-500 text-xs">Puedes hablarme o escribirme sobre tus plantas.</p>
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
    <div className="relative flex-1 min-h-0">
      {/* (B) Botón "Volver" FLOTANTE: sticky-ish respecto al área de chat,
          aparece al alejarse del inicio. Resuelve "tengo que ir hasta el
          inicio para devolverme". La animación de entrada respeta
          prefers-reduced-motion vía el CSS de abajo. */}
      {typeof onBack === 'function' && showFloatingBack && (
        <button
          type="button"
          onClick={onBack}
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
        className="h-full overflow-y-auto p-4 pb-28"
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
          <ChatBubble
            key={msg.id || idx}
            message={msg}
            isStreaming={false}
            promptText={msg.role === 'assistant' ? findPromptForResponse(idx) : undefined}
            onConsentNeeded={onConsentNeeded}
            onRetryOrphan={onRetryOrphan}
          />
        );
      })}

      {/* Placeholder visible mientras llega el primer token (pre-stream).
          Sin esto el chat se ve "muerto" entre el envío del usuario y la
          aparición del primer token — el indicador del header pasa
          desapercibido porque el ojo del operador está en la ventana de
          diálogo. Acá el colibrí late en thinking + texto "Pensando…". */}
      {/* eslint-disable chagra-i18n/no-hardcoded-spanish -- "Pensando"/aria-label
          legacy preexistentes; migración i18n diferida a ADR-050 (no introducidos
          en este cambio). */}
      {showThinkingAvatar && (
        <div className="flex items-end gap-3 mb-4 animate-fadeIn">
          <ChagraAgentAvatar
            state="thinking"
            size={96}
            className="shrink-0 mb-1"
            ariaLabel="Chagra IA está pensando"
          />
          <div className="rounded-2xl rounded-bl-sm bg-slate-800/80 border border-slate-700/60 px-4 py-3 text-slate-300 text-sm italic shadow-lg">
            Pensando
            <span className="inline-block ml-1 animate-thinkingDot">·</span>
            <span className="inline-block ml-0.5 animate-thinkingDot [animation-delay:200ms]">·</span>
            <span className="inline-block ml-0.5 animate-thinkingDot [animation-delay:400ms]">·</span>
          </div>
        </div>
      )}
      {/* eslint-enable chagra-i18n/no-hardcoded-spanish */}

      {isStreaming && streamingContent && (
        <ChatBubble
          message={{ role: 'assistant', content: streamingContent }}
          isStreaming={true}
          onConsentNeeded={onConsentNeeded}
        />
      )}

        {/* Espaciador final: deja aire bajo el último mensaje sobre el input. */}
        <div aria-hidden="true" className="h-1" />
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
function ProactiveGreeting({ greeting, onPrompt }) {
  if (!greeting) return null;
  const { hi, state, lead, items = [], restCount = 0, prompt } = greeting;
  const isPending = state === 'pending';
  return (
    <div data-testid="proactive-greeting" data-greeting-state={state}>
      <p className="text-slate-200 text-base mb-1.5 font-medium">
        {hi}. Soy <span className="text-emerald-300">Chagra</span>.
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

      {prompt && typeof onPrompt === 'function' && (
        <button
          type="button"
          onClick={() => onPrompt(prompt)}
          data-testid="proactive-greeting-cta"
          className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-600/30 text-cyan-100 transition-colors active:scale-95"
        >
          {prompt}
        </button>
      )}
    </div>
  );
}
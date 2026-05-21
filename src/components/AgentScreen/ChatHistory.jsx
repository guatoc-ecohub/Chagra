import React, { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import ChagraAgentAvatar from '../ChagraAgentAvatar';

export default function ChatHistory({ messages = [], streamingContent = '', isStreaming = false }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isStreaming]);

  // Empty state: aprovechamos el espacio vacío para mostrar el colibrí
  // libando en su tamaño más grande de toda la app (size=200). El header
  // ya tiene una versión chiquita (size=40) — acá vive en grande, como
  // primera impresión del agente.
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <ChagraAgentAvatar state="idle" size={200} className="mx-auto mb-4" />
          <p className="text-slate-200 text-base mb-2 font-medium">¡Hola! Soy tu asistente agroecológico.</p>
          <p className="text-slate-500 text-xs">Puedes hablarme o escribirme sobre tus plantas.</p>
        </div>
      </div>
    );
  }

  // Loading state mientras el LLM genera el primer token: colibrí libando del
  // abutilón en estado `thinking` (alas en blur rápido + sip motion hacia la
  // flor + corola vibra). Reemplaza el "loading plano" para que la espera
  // se sienta viva.
  const showThinkingAvatar = isStreaming && !streamingContent;

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-2">
      {messages.map((msg, idx) => (
        <ChatBubble
          key={msg.id || idx}
          message={msg}
          isStreaming={false}
        />
      ))}

      {/* Placeholder visible mientras llega el primer token (pre-stream).
          Sin esto el chat se ve "muerto" entre el envío del usuario y la
          aparición del primer token — el indicador del header pasa
          desapercibido porque el ojo del operador está en la ventana de
          diálogo. Acá el colibrí late en thinking + texto "Pensando…". */}
      {isStreaming && !streamingContent && (
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

      {isStreaming && streamingContent && (
        <ChatBubble
          message={{ role: 'assistant', content: streamingContent }}
          isStreaming={true}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
import React, { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';

export default function ChatHistory({ messages = [], streamingContent = '', isStreaming = false }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-slate-400 text-sm mb-2">¡Hola! Soy tu asistente agroecológico.</p>
          <p className="text-slate-500 text-xs">Puedes hablarme o escribirme sobre tus plantas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-2">
      {messages.map((msg, idx) => (
        <ChatBubble
          key={msg.id || idx}
          message={msg}
          isStreaming={false}
        />
      ))}

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
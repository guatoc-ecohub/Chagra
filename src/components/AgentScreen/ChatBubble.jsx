import React from 'react';
import { User, Bot } from 'lucide-react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-emerald-600' : 'bg-violet-700'
        }`}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
        </div>

        <div className={`rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-emerald-700/60 text-white rounded-tr-sm'
            : 'bg-slate-800/80 text-slate-100 rounded-tl-sm'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          {message.timestamp && (
            <p className={`text-[10px] mt-1 ${isUser ? 'text-emerald-300/60' : 'text-slate-500'}`}>
              {formatTime(message.timestamp)}
            </p>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-2 bg-violet-400 rounded-full ml-1 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
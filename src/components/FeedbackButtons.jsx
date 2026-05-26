import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, Loader2 } from 'lucide-react';
import { sendFeedback, hasConsent } from '../services/feedbackService';

/**
 * Botones de feedback 👍/👎 para respuestas del agente.
 *
 * Comportamiento:
 * - 👍: marca positivo y envía feedback inmediatamente (si hay consentimiento)
 * - 👎: marca negativo, muestra textarea opcional para comentario, luego envía
 *
 * Si no hay consentimiento, muestra el modal de consentimiento primero.
 */
export default function FeedbackButtons({ 
  prompt, 
  response, 
  onConsentNeeded,
  onFeedbackSent 
}) {
  const [selectedThumb, setSelectedThumb] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleThumbClick = async (thumb) => {
    // Si ya envió feedback, no hacer nada
    if (feedbackSent) return;

    // Verificar consentimiento
    if (!hasConsent()) {
      onConsentNeeded();
      return;
    }

    setSelectedThumb(thumb);

    if (thumb === 'down') {
      // Para 👎, mostrar caja de comentario
      setShowCommentBox(true);
    } else {
      // Para 👍, enviar inmediatamente
      await submitFeedback('up', null);
    }
  };

  const submitFeedback = async (thumb, commentText) => {
    setIsSending(true);
    try {
      const success = await sendFeedback({
        prompt,
        response,
        thumb,
        comment: commentText,
      });

      if (success) {
        setFeedbackSent(true);
        setShowCommentBox(false);
        if (onFeedbackSent) {
          onFeedbackSent(thumb);
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitComment = async () => {
    await submitFeedback('down', comment.trim() || null);
  };

  const handleCancelComment = () => {
    setShowCommentBox(false);
    setComment('');
    setSelectedThumb(null);
  };

  // Si ya envió feedback, mostrar estado final
  if (feedbackSent) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {selectedThumb === 'up' ? (
          <>
            <ThumbsUp size={14} className="text-emerald-400" />
            <span>Gracias por tu feedback</span>
          </>
        ) : (
          <>
            <ThumbsDown size={14} className="text-red-400" />
            <span>Gracias por tu feedback</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Botones de thumbs */}
      {!showCommentBox && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleThumbClick('up')}
            disabled={isSending || feedbackSent}
            className={`p-1.5 rounded-lg transition-all ${
              selectedThumb === 'up'
                ? 'bg-emerald-600/30 text-emerald-400'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
            } disabled:opacity-50`}
            title="Esta respuesta fue útil"
          >
            <ThumbsUp size={16} />
          </button>
          <button
            onClick={() => handleThumbClick('down')}
            disabled={isSending || feedbackSent}
            className={`p-1.5 rounded-lg transition-all ${
              selectedThumb === 'down'
                ? 'bg-red-600/30 text-red-400'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
            } disabled:opacity-50`}
            title="Esta respuesta necesita mejorar"
          >
            <ThumbsDown size={16} />
          </button>
        </div>
      )}

      {/* Caja de comentario para 👎 */}
      {showCommentBox && (
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-400">
            ¿Qué mejoraría esta respuesta? (opcional)
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Describe qué falta o qué está incorrecto..."
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            rows={2}
            disabled={isSending}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancelComment}
              disabled={isSending}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitComment}
              disabled={isSending}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isSending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={12} />
                  Enviar
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

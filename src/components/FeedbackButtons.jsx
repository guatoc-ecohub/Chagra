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
  edges = [],
  onConsentNeeded,
  onFeedbackSent = undefined,
  modulo = null,
  enAsistente = false,
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

    // UX-8 (#288) 2026-05-27: ambos pulgares disparan envío inmediato
    // (1-click), sin obligar comentario. El comment box queda disponible
    // como opt-in tras el feedback rápido si el user quiere ampliar.
    await submitFeedback(thumb, null);
  };

  const submitFeedback = async (thumb, commentText) => {
    setIsSending(true);
    try {
      const success = await sendFeedback({
        prompt,
        response,
        thumb,
        comment: commentText,
        // A-15 (#248): edges del grafo AGE usados en este turno. El motor E3
        // (sidecar) los mapea a aristas reales para ajustar r.confidence.
        edges: Array.isArray(edges) ? edges : [],
      });

      if (success) {
        setFeedbackSent(true);
        setShowCommentBox(false);
        if (onFeedbackSent) {
          onFeedbackSent(thumb);
        }
        try {
          import('../services/pilotTelemetryService.js').then(({ recordPilotEvent }) => {
            recordPilotEvent({
              event_type: 'feedback_dado',
              metadata: {
                tipo: thumb === 'down' ? 'thumb_down' : 'thumb_up',
                modulo: modulo || undefined,
                en_asistente: !!enAsistente,
              },
            }).catch(() => {});
          }).catch(() => {});
        } catch (_) { /* telemetría nunca rompe el flujo */ }
      }
    } finally {
      setIsSending(false);
    }
  };

  // Si ya envió feedback rápido, mostrar estado final + opción opt-in para
  // agregar comentario después (UX-8 #288). Mantiene el flujo 1-click pero
  // deja una puerta abierta para detalle adicional sin friction.
  if (feedbackSent) {
    return (
      <div className="flex flex-col gap-2">
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
          {!showCommentBox && (
            <button
              type="button"
              onClick={() => setShowCommentBox(true)}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
            >
              Agregar detalle
            </button>
          )}
        </div>
        {showCommentBox && (
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-400">
              ¿Qué mejorarías de esta respuesta? (opcional)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos qué falta o está incorrecto…"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              rows={2}
              disabled={isSending}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCommentBox(false); setComment(''); }}
                disabled={isSending}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
              >
                Listo
              </button>
              <button
                onClick={async () => {
                  // Resend con comentario para enriquecer el feedback ya enviado.
                  await submitFeedback(selectedThumb, comment.trim() || null);
                  setShowCommentBox(false);
                }}
                disabled={isSending || comment.trim().length === 0}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isSending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Enviando…
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

  return (
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
        aria-label="Marcar respuesta como útil"
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
        aria-label="Marcar respuesta como mejorable"
      >
        <ThumbsDown size={16} />
      </button>
      {isSending && <Loader2 size={12} className="animate-spin text-slate-400" />}
    </div>
  );
}

import React, { useState } from 'react';
import { Shield, X, Loader2 } from 'lucide-react';
import { saveConsent } from '../services/feedbackService';

/**
 * Modal de consentimiento para feedback del agente.
 *
 * Solo se muestra la primera vez que el usuario intenta dar feedback.
 * El texto explica claramente que el consentimiento solo aplica cuando
 * el usuario da feedback, no a todas las interacciones.
 */
export default function FeedbackConsentModal({ isOpen, onAccept, onDecline }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsProcessing(true);
    saveConsent(true);
    await onAccept();
    setIsProcessing(false);
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    saveConsent(false);
    await onDecline();
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDecline} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Shield size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Mejorar Chagra
              </h3>
              <p className="text-xs text-slate-400">Tu opinión nos ayuda</p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Aceptas que guardemos tu solicitud y respuesta para que mejoremos Chagra.
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Qué incluye:</p>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Tu pregunta y la respuesta del agente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Tu evaluación (👍 o 👎)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Comentario opcional si es 👎</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-400">
            Este consentimiento solo aplica cuando das feedback. Si no das feedback, 
            no guardamos nada adicional.
          </p>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={handleDecline}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
          >
            No, gracias
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : null}
            Acepto
          </button>
        </div>
      </div>
    </div>
  );
}

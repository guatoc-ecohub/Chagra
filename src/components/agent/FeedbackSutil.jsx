/**
 * FeedbackSutil.jsx — Señal de calidad mínima para el agente Chagra.
 *
 * PRIVACIDAD PRIMERO: dos botones (👍 / 👎) al pie de cada respuesta del
 * agente. Sin texto, sin tracking de identidad. Una sola interacción:
 * al tocar, se registra la señal en agentTelemetryFlywheel y el botón
 * queda en estado "gracias". No se muestra en modo campo (voz).
 *
 * Es aditivo y silencioso: nunca bloquea la UI ni rompe el agente.
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} props
 * @param {string} props.interaccionId — ULID de la interacción registrada
 * @param {(id: string, senal: string) => void} props.onFeedback
 */
export default function FeedbackSutil({ interaccionId, onFeedback }) {
  const [estado, setEstado] = useState('pendiente'); // 'pendiente' | 'buena' | 'mala'

  const darFeedback = useCallback((tipo) => {
    if (estado !== 'pendiente') return;
    setEstado(tipo);
    const senal = tipo === 'buena' ? 'explicita_buena' : 'explicita_mala';
    try { onFeedback(interaccionId, senal); } catch { /* silencioso */ }
  }, [estado, interaccionId, onFeedback]);

  if (estado !== 'pendiente') {
    return (
      <span className="text-xs text-slate-500 ml-2 select-none" aria-label="Gracias por tu feedback">
        {estado === 'buena' ? '👍' : '👎'}
      </span>
    );
  }

  return (
    <span className="inline-flex gap-1 ml-2 select-none">
      <button
        type="button"
        className="text-xs text-slate-600 hover:text-emerald-400 transition-colors p-0.5"
        onClick={() => darFeedback('buena')}
        aria-label="Respuesta útil"
        title="Me sirvió"
      >👍</button>
      <button
        type="button"
        className="text-xs text-slate-600 hover:text-rose-400 transition-colors p-0.5"
        onClick={() => darFeedback('mala')}
        aria-label="Respuesta no útil"
        title="No me sirvió"
      >👎</button>
    </span>
  );
}

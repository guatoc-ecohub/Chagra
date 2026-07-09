import React from 'react';
import { Mic, Volume2, Square, Info, X } from 'lucide-react';

/**
 * VoiceStatusStrip — superficie de estado del flujo de VOZ punta-a-punta
 * (TIER 2 #5, 2026-06-10) para baja alfabetización.
 *
 * El campesino que casi no lee debe ENTENDER de un vistazo qué está pasando
 * cuando le habla a Chagra. Tres estados evidentes con ícono+animación (no
 * solo texto), más el botón GRANDE "Volver a oír" y el aviso amable de
 * degradación cuando el oído (Whisper) o la voz (Kokoro/Web Speech) fallan:
 *
 *   - listening → "Chagra te escucha"  (mic con ondas)
 *   - thinking  → "Chagra está pensando" (puntos que respiran)
 *   - speaking  → "Chagra está hablando" (ecualizador animado) + Parar
 *   - idle + canRepeat → botón "Volver a oír" (replayLast)
 *   - notice    → degradación amable: nunca error mudo, nunca pantalla rota
 *
 * Theme-aware: SOLO clases Tailwind (slate/emerald/amber/rose/violet van por
 * la indirección CSS-var --c-*) y `currentColor` en las animaciones. Cero
 * hex hardcodeado. Respeta prefers-reduced-motion (las keyframes custom se
 * apagan vía @media).
 */

// Ecualizador de "hablando": 4 barras que suben/bajan con currentColor.
// Inyectado una vez por render del strip — string estático, costo nulo.
const STRIP_CSS = `
@keyframes vsb-eq {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}
.vsb-eq-bar {
  display: inline-block; width: 4px; height: 18px; border-radius: 2px;
  background: currentColor; transform-origin: 50% 100%;
  animation: vsb-eq 0.9s ease-in-out infinite;
}
@keyframes vsb-dot {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
.vsb-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 9999px;
  background: currentColor; animation: vsb-dot 1.2s ease-in-out infinite;
}
@keyframes vsb-ring {
  0%   { transform: scale(0.72); opacity: 0.85; }
  100% { transform: scale(1.65); opacity: 0; }
}
.vsb-ring {
  position: absolute; inset: 0; border-radius: 9999px;
  border: 2px solid currentColor; pointer-events: none;
  animation: vsb-ring 1.5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
}
.vsb-ring--late { animation-delay: 0.75s; }
@media (prefers-reduced-motion: reduce) {
  .vsb-eq-bar, .vsb-dot { animation: none !important; }
  /* Sin movimiento: las ondas del mic se congelan como un anillo estático
     tenue — sigue comunicando "escuchando" sin animar. */
  .vsb-ring { animation: none !important; opacity: 0.35; transform: scale(1.15); }
  .vsb-ring--late { display: none; }
}
`;

function Equalizer() {
  return (
    <span className="flex items-end gap-[3px] h-[18px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="vsb-eq-bar" style={{ animationDelay: `${i * 0.14}s` }} />
      ))}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="vsb-dot" style={{ animationDelay: `${i * 0.22}s` }} />
      ))}
    </span>
  );
}

export default function VoiceStatusStrip({
  phase = 'idle',
  canRepeat = false,
  notice = '',
  onRepeat,
  onStopSpeaking,
  onDismissNotice,
}) {
  const isListening = phase === 'listening';
  const isThinking = phase === 'thinking';
  const isSpeaking = phase === 'speaking';
  const showRepeat = phase === 'idle' && canRepeat && typeof onRepeat === 'function';
  const showNotice = typeof notice === 'string' && notice.length > 0;

  if (!isListening && !isSpeaking && !showRepeat && !showNotice) {
    return null;
  }

  return (
    <div className="px-4 pb-1" data-testid="voice-status-strip">
      <style>{STRIP_CSS}</style>

      {/* Estado activo: ícono + animación + frase corta, grande y legible */}
      {(isListening || isSpeaking) && (
        <div
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
            isListening
              ? 'bg-rose-900/30 border-rose-700/50 text-rose-300'
              : isThinking
                ? 'bg-violet-900/30 border-violet-700/50 text-violet-300'
                : 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
          }`}
        >
          <span className="relative shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-slate-900/60">
            {/* Escuchando: ondas tipo sonar que emanan del mic (currentColor
                → hereda el rose del estado). Bajo prefers-reduced-motion se
                congelan en un anillo estático tenue (CSS de arriba). */}
            {isListening && (
              <>
                <span className="vsb-ring" aria-hidden="true" />
                <span className="vsb-ring vsb-ring--late" aria-hidden="true" />
                <Mic size={20} className="animate-pulse" aria-hidden="true" />
              </>
            )}
            {isThinking && <ThinkingDots />}
            {isSpeaking && <Equalizer />}
          </span>
          <p
            className="flex-1 text-base leading-tight"
            data-testid="voice-state-label"
            aria-live="polite"
            /* V3: la voz de estado habla en Baloo 2 — la misma letra redonda y
               amable del resto del agente (byline, mochila), no la sans dura. */
            style={{ fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif", fontWeight: 700, letterSpacing: '0.1px' }}
          >
            {isListening && 'Chagra te escucha'}
            {isThinking && 'Chagra está pensando'}
            {isSpeaking && 'Chagra está hablando'}
          </p>
          {isSpeaking && typeof onStopSpeaking === 'function' && (
            <button
              type="button"
              onClick={onStopSpeaking}
              data-testid="voice-stop-btn"
              aria-label="Parar la voz de Chagra"
              className="shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-sm font-bold border border-slate-600 transition-all"
            >
              <Square size={14} strokeWidth={2.5} aria-hidden="true" />
              Parar
            </button>
          )}
        </div>
      )}

      {/* Botón GRANDE "Volver a oír" — re-reproduce la última respuesta */}
      {showRepeat && (
        <button
          type="button"
          onClick={onRepeat}
          data-testid="voice-repeat-btn"
          aria-label="Volver a oír la última respuesta de Chagra"
          className="w-full min-h-[52px] mt-1 flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-900/40 hover:bg-emerald-800/50 active:scale-[0.99] text-emerald-200 text-base font-bold border border-emerald-700/60 transition-all"
        >
          <Volume2 size={20} aria-hidden="true" />
          Volver a oír
        </button>
      )}

      {/* Aviso amable de degradación (STT/TTS caído) — nunca error mudo */}
      {showNotice && (
        <div
          className="flex items-start gap-2 mt-1.5 px-3 py-2.5 rounded-xl bg-amber-900/30 border border-amber-800/50"
          role="status"
          aria-live="polite"
        >
          <Info size={15} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1 text-xs text-amber-200 leading-snug" data-testid="voice-notice">
            {notice}
          </p>
          {typeof onDismissNotice === 'function' && (
            <button
              type="button"
              onClick={onDismissNotice}
              data-testid="voice-notice-dismiss"
              aria-label="Cerrar aviso"
              className="shrink-0 p-1 rounded-md hover:bg-white/10 text-amber-400"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

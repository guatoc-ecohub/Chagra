import { useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * LevelUpCelebration — la fiesta cuando la finca sube de nivel.
 *
 * Overlay alegre con confeti de emojis, el nombre del nuevo mundo y un botón
 * grande para seguir. Dispara sonido (agentSoundService.chime) y, si la niña
 * tiene audio, narra el logro con TTS (kokoro/Web Speech) al montar.
 *
 * Se muestra UNA sola vez por subida (la pantalla controla cuándo, comparando
 * el nivel actual con el último visto persistido). Cero fabricación: solo
 * aparece cuando el nivel REAL (derivado de indicadores) subió.
 *
 * @param {Object} props
 * @param {Object} props.mundo        WORLD_STAGES del nuevo nivel
 * @param {Function} props.onClose    cerrar la celebración
 * @param {Function} [props.onSound]  reproducir sonido de celebración
 * @param {Function} [props.onNarrate] narrar el logro (TTS)
 */
export default function LevelUpCelebration({ mundo, onClose, onSound, onNarrate }) {
  useEffect(() => {
    onSound?.();
    onNarrate?.();
    // Se ejecuta una sola vez al montar la celebración.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confeti determinista (no salta entre renders del overlay).
  const confetti = useMemo(() => {
    const piezas = ['🌟', '🌿', '🦋', '🌸', '✨', '🍃', '🌻', '🐝'];
    return Array.from({ length: 18 }, (_, i) => ({
      key: `c${i}`,
      emoji: piezas[i % piezas.length],
      left: (i * 53) % 100,
      delay: (i % 6) * 0.4,
      dur: 3 + (i % 4),
    }));
  }, []);

  if (!mundo) return null;

  return (
    <div
      className="fv-celebration-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Tu finca subió de nivel: ${mundo.nombreNino}`}
      data-testid="level-up-celebration"
      onClick={/** @type {React.MouseEventHandler<HTMLDivElement>} */ (onClose)}
    >
      {confetti.map((c) => (
        <span
          key={c.key}
          className="fv-confetti"
          style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
          aria-hidden="true"
        >
          {c.emoji}
        </span>
      ))}

      <div
        className="fv-celebration-card bg-gradient-to-br from-emerald-700 to-teal-800 border-4 border-emerald-300/60 rounded-3xl p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fv-celebration-emoji" aria-hidden="true">{mundo.emoji}</div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Sparkles size={22} className="text-yellow-300" aria-hidden="true" />
          <p className="text-yellow-200 font-black text-sm uppercase tracking-widest">
            ¡Subiste de nivel!
          </p>
          <Sparkles size={22} className="text-yellow-300" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-black text-white mt-2 leading-tight">
          {mundo.nombreNino}
        </h2>
        <p className="text-emerald-50 text-base mt-3 leading-relaxed">{mundo.mensaje}</p>

        <button
          type="button"
          onClick={/** @type {React.MouseEventHandler<HTMLButtonElement>} */ (onClose)}
          className="mt-6 w-full min-h-[56px] rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition text-emerald-950 font-black text-lg shadow-lg"
        >
          ¡Seguir jugando! 🎉
        </button>
      </div>
    </div>
  );
}

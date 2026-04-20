import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import StreamingText from './StreamingText';

/**
 * AIStreamPanel — bloque cyberpunk de render para generaciones del LLM.
 *
 * Efectos visuales:
 *   - Entrada con "glitch-in": fade + blur + saturación reducida que se
 *     estabiliza, diferencia IA de contenidos deterministas (reglas).
 *   - Scanline: barrido horizontal CRT sobre el panel mientras `active`.
 *   - Neon-pulse: glow del borde (color según `accent`) en loop mientras
 *     sigue generando.
 *   - Cursor pulsante al final del texto (vía StreamingText).
 *   - Spark de cierre: al detectar la transición active:true → false con
 *     texto presente, dispara un rayo luminoso horizontal + burst circular
 *     en el borde derecho (~700ms), marcando el fin de la generación.
 *
 * Props:
 *   - text    string        contenido acumulado (chunk a chunk).
 *   - active  boolean       true mientras el LLM genera.
 *   - label   string        header (ej. "IA generando", "Diagnóstico IA").
 *   - accent  string        'orchid' | 'muzo' | 'morpho' — paleta neon.
 *   - meta    ReactNode     texto pequeño a la derecha del header (modelo, duración).
 */
export default function AIStreamPanel({
  text = '',
  active = true,
  label = 'IA',
  accent = 'orchid',
  meta = null,
}) {
  const [justFinished, setJustFinished] = useState(false);
  const prevActive = useRef(active);

  useEffect(() => {
    if (prevActive.current && !active && text) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), 750);
      return () => {
        clearTimeout(t);
      };
    }
    prevActive.current = active;
  }, [active, text]);

  const palette = {
    orchid: {
      border: 'border-orchid/50',
      glow: 'shadow-neon-orchid',
      text: 'text-orchid',
      fill: 'bg-orchid',
      fromVia: 'via-orchid/80',
    },
    muzo: {
      border: 'border-muzo/50',
      glow: 'shadow-neon-muzo',
      text: 'text-muzo',
      fill: 'bg-muzo',
      fromVia: 'via-muzo/80',
    },
    morpho: {
      border: 'border-morpho/50',
      glow: 'shadow-neon-morpho',
      text: 'text-morpho',
      fill: 'bg-morpho',
      fromVia: 'via-morpho/80',
    },
  };
  const c = palette[accent] || palette.orchid;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${c.border} bg-slate-950/70 motion-safe:animate-glitch-in ${
        active ? `${c.glow} motion-safe:animate-neon-pulse` : ''
      }`}
    >
      {/* Scanline horizontal que desciende en loop, solo activa durante stream */}
      {active && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${c.fromVia} to-transparent opacity-60 motion-safe:animate-scanline`}
        />
      )}

      {/* Spark de cierre: rayo horizontal que cruza + burst al borde */}
      {justFinished && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-24 ${c.fill} opacity-70 motion-safe:animate-spark-flash`}
            style={{ filter: 'blur(12px)' }}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 right-2 w-3 h-3 -translate-y-1/2 rounded-full ${c.fill} motion-safe:animate-spark-burst`}
            style={{ filter: 'blur(1px)' }}
          />
        </>
      )}

      <div className="relative p-3">
        <div className={`flex items-center justify-between mb-1.5 text-2xs uppercase tracking-widest font-bold ${c.text}`}>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${c.fill} ${
                active ? 'motion-safe:animate-pulse' : ''
              }`}
              aria-hidden="true"
            />
            {active ? (
              <span className="flex items-center gap-1">
                <Zap size={12} aria-hidden="true" />
                {label}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Sparkles size={12} aria-hidden="true" />
                {label}
              </span>
            )}
          </div>
          {meta && <span className="text-slate-400 normal-case tracking-normal font-normal">{meta}</span>}
        </div>

        <div className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap min-h-[2rem]">
          <StreamingText text={text} active={active} cursorClassName={c.text} />
        </div>
      </div>
    </div>
  );
}

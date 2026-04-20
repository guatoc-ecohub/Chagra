import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import StreamingText from './StreamingText';

/**
 * AIStreamPanel — bloque cyberpunk de render para generaciones del LLM.
 *
 * Diferencia el contenido IA del contenido determinista con efectos visuales
 * que evocan una terminal CRT + un HUD cyberpunk:
 *
 *   - Entrada "glitch-in": fade + blur + saturacion que se estabiliza.
 *   - Scanline: linea de luz (color accent) desciende en loop mientras genera.
 *   - Neon pulse: glow del borde en loop mientras active.
 *   - Texto estilo terminal IBM / VT100: font monoespaciada verde fosforo
 *     con text-shadow bloom + CRT flicker sutil + overlay de scanlines
 *     horizontales fijas + block cursor parpadeante (variant="block").
 *   - Spark de cierre (~1.4s): rayo horizontal de izquierda a derecha con
 *     blur + burst circular expansivo en borde derecho. Marca claramente
 *     el fin del stream.
 *
 * Props:
 *   - text    string        contenido acumulado (chunk a chunk).
 *   - active  boolean       true mientras el LLM genera.
 *   - label   string        header (ej. "IA generando", "Diagnostico IA").
 *   - accent  string        'orchid' | 'muzo' | 'morpho' — borde/glow/header.
 *                           El TEXTO siempre es verde fosforo (look uniforme).
 *   - meta    ReactNode     pequeno texto a la derecha del header.
 */
export default function AIStreamPanel({
  text = '',
  active = true,
  label = 'IA',
  accent = 'orchid',
  meta = null,
}) {
  // Fases del ciclo de vida del panel:
  //   idle      — sin actividad, estatico.
  //   streaming — LLM genera (active=true); texto pulsa con negative-breath
  //               cada 8s como "latido" de IA viva.
  //   closing   — transicion de cierre inicial: flash de negativo (500ms)
  //               que invierte colores momentaneamente, anuncia el fin.
  //   finished  — rayo + burst de cierre (1400/1200ms), fase final visual.
  const [phase, setPhase] = useState(active ? 'streaming' : 'idle');
  const prevActive = useRef(active);

  useEffect(() => {
    if (active) {
      setPhase('streaming');
    } else if (prevActive.current && text) {
      // streaming -> closing (500ms) -> finished (1400ms) -> idle
      setPhase('closing');
      const closingTimer = setTimeout(() => {
        setPhase('finished');
      }, 500);
      const resetTimer = setTimeout(() => {
        setPhase('idle');
      }, 500 + 1400);
      return () => {
        clearTimeout(closingTimer);
        clearTimeout(resetTimer);
      };
    }
    prevActive.current = active;
  }, [active, text]);

  const justFinished = phase === 'finished';
  const isClosingFlash = phase === 'closing';

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

  // Verde fosforo estilo terminal IBM 3270 / monitor CRT antiguo.
  // Uniforme en las 3 superficies de IA para mantener la metafora de terminal.
  const phosphorColor = '#4ade80';

  // Overlay de scanlines horizontales fijas (repeating-gradient 2px).
  // Simulado a ~3% de opacidad para no distraer la lectura del texto.
  const scanlinesBg = {
    backgroundImage:
      'repeating-linear-gradient(to bottom, rgba(74, 222, 128, 0.06) 0px, rgba(74, 222, 128, 0.06) 1px, transparent 1px, transparent 2px)',
  };

  // Text-shadow que simula el bloom del fosforo en tubo CRT.
  const phosphorTextStyle = {
    color: phosphorColor,
    textShadow: '0 0 4px rgba(74, 222, 128, 0.75), 0 0 8px rgba(74, 222, 128, 0.35)',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${c.border} bg-slate-950/80 motion-safe:animate-glitch-in ${
        active ? `${c.glow} motion-safe:animate-neon-pulse` : ''
      }`}
    >
      {/* Scanline horizontal que desciende en loop (efecto barrido CRT) */}
      {active && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${c.fromVia} to-transparent opacity-60 motion-safe:animate-scanline`}
        />
      )}

      {/* Spark de cierre: rayo horizontal + burst circular */}
      {justFinished && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-28 ${c.fill} opacity-75 motion-safe:animate-spark-flash`}
            style={{ filter: 'blur(14px)' }}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 right-2 w-3 h-3 -translate-y-1/2 rounded-full ${c.fill} motion-safe:animate-spark-burst`}
            style={{ filter: 'blur(1.5px)' }}
          />
        </>
      )}

      <div className="relative p-3">
        <div
          className={`flex items-center justify-between mb-2 text-2xs uppercase tracking-widest font-bold ${c.text}`}
        >
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
          {meta && (
            <span className="text-slate-400 normal-case tracking-normal font-normal">
              {meta}
            </span>
          )}
        </div>

        {/* Bloque de texto tipo terminal CRT: scanlines + fosforo verde + flicker.
            Durante streaming aplica `negative-breath` (8s loop) como latido
            periodico que invierte colores brevemente y anuncia que la IA
            sigue viva. Al cerrar, primero `negative-flash` (500ms) como
            transicion antes del rayo. */}
        <div
          className={`relative rounded-sm px-2 py-2 bg-black/40 overflow-hidden motion-safe:animate-crt-flicker ${
            phase === 'streaming' ? 'motion-safe:animate-negative-breath' : ''
          } ${
            isClosingFlash ? 'motion-safe:animate-negative-flash' : ''
          }`}
          style={scanlinesBg}
        >
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[1.5rem] tracking-wide"
            style={phosphorTextStyle}
          >
            <StreamingText
              text={text}
              active={active}
              variant="block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

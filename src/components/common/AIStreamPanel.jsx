import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import StreamingText from './StreamingText';

/**
 * AIStreamPanel, bloque cyberpunk de render para generaciones del LLM.
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
 *   - accent  string        'orchid' | 'muzo' | 'morpho', borde/glow/header.
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
  //   idle     , sin actividad, estatico.
  //   streaming, LLM genera (active=true); texto pulsa con negative-breath
  //               cada 8s como "latido" de IA viva.
  //   closing  , transicion de cierre inicial: flash de negativo (500ms)
  //               que invierte colores momentaneamente, anuncia el fin.
  //   finished , rayo + burst de cierre (1400/1200ms), fase final visual.
  // Phase machine: cuando active=true, derivamos 'streaming' directo de la prop
  // (evita cascading renders de setState-in-effect). Solo persistimos en state
  // las transiciones temporizadas closing → finished → idle del cierre.
  const [closingPhase, setClosingPhase] = useState('idle'); // 'closing' | 'finished' | 'idle'
  const prevActive = useRef(active);
  const phase = active ? 'streaming' : closingPhase;

  useEffect(() => {
    if (!active && prevActive.current && text) {
      // streaming -> closing (700ms negative-flash) -> finished (1400ms) -> idle.
      // Set inicial sincrónico está acotado: sólo se ejecuta cuando active
      // pasa de true→false con texto presente, y la condición prevActive
      // garantiza que no se re-dispare en el siguiente render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClosingPhase('closing');
      const closingTimer = setTimeout(() => {
        setClosingPhase('finished');
      }, 700);
      const resetTimer = setTimeout(() => {
        setClosingPhase('idle');
      }, 700 + 1400);
      prevActive.current = active;
      return () => {
        clearTimeout(closingTimer);
        clearTimeout(resetTimer);
      };
    }
    prevActive.current = active;
  }, [active, text]);

  const justFinished = phase === 'finished';
  const isClosingFlash = phase === 'closing';
  // El latido "IA viva" y el destello del borde corren mientras el panel
  // esta visible y tiene sentido mostrar pulso vital: durante streaming y
  // despues (fase idle con texto). Se pausa en closing/finished para no
  // competir visualmente con el flash/rayo de cierre.
  const showBreath = phase === 'streaming' || (phase === 'idle' && text);

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
  // Solo se aplica durante streaming/closing, el texto final consolidado
  // usa estilos neutros (font-sans, text-slate-300) para maxima legibilidad.
  const phosphorTextStyle = {
    color: phosphorColor,
    textShadow: '0 0 4px rgba(74, 222, 128, 0.75), 0 0 8px rgba(74, 222, 128, 0.35)',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  };

  // Decision UX (v0.6.4+): el texto final mantiene el look terminal CRT
  // verde fosforo, coherente con la metafora "terminal activa" y el
  // aspecto unico del panel IA. La variante neutra sans-serif fue revertida
  // por preferencia del usuario.

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

      {/* Destello luminoso que recorre el perimetro del panel, sincronizado
          con el latido de negative-breath. pathLength=1 normaliza el
          dash-offset a 0..-1 independiente del tamano real del rect. El
          dasharray 0.12 visible / 0.88 gap crea un arco del 12% del perimetro
          que avanza en loop. Visible tanto durante streaming como en idle
          con texto (panel estatico con resultado final visible). */}
      {showBreath && (
        <svg
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 w-full h-full ${c.text}`}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <rect
            x="0.5"
            y="0.5"
            width="99"
            height="99"
            rx="2"
            ry="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="0.12 0.88"
            pathLength="1"
            vectorEffect="non-scaling-stroke"
            className="motion-safe:animate-border-march"
            style={{ filter: 'drop-shadow(0 0 3px currentColor) drop-shadow(0 0 6px currentColor)' }}
          />
        </svg>
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

        {/* Bloque de texto tipo terminal CRT (uniforme para todas las fases):
            scanlines + fosforo verde + flicker + block cursor parpadeante.
            Durante showBreath aplica negativeBreath (latido); en closing
            aplica negativeFlash (transicion al rayo de cierre). */}
        <div
          className={`relative rounded-sm px-2 py-2 bg-black/40 overflow-hidden motion-safe:animate-crt-flicker ${
            showBreath ? 'motion-safe:animate-negative-breath' : ''
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

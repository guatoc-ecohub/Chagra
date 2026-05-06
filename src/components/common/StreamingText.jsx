import React from 'react';

/**
 * StreamingText, renderiza texto en progresion con cursor parpadeante.
 *
 * Se usa para mostrar al usuario la generacion token-por-token del LLM
 * (entity extractor, vision, analisis agronomico). Cuando `active` es
 * false, oculta el cursor.
 *
 * Props:
 *   - text: string que se acumula a medida que llegan chunks.
 *   - active: boolean, si false, oculta el cursor (streaming terminado).
 *   - variant: 'line' (default, barra neon fina) | 'block' (cursor
 *              cuadrado estilo terminal IBM / VT100 con parpadeo duro).
 *   - className / cursorClassName: customizacion de estilo.
 */
export default function StreamingText({
  text = '',
  active = true,
  variant = 'line',
  className = '',
  cursorClassName = '',
}) {
  const cursorBase = variant === 'block'
    // Block cursor tipo terminal: cuadrado ~0.55em, parpadeo duro de 1.1s.
    ? 'inline-block w-[0.55em] h-[1em] align-text-bottom ml-0.5 bg-current motion-safe:animate-crt-blink'
    // Line cursor neon (default): barra vertical de 2px con pulse suave.
    : 'inline-block w-[2px] h-[1em] align-text-bottom ml-0.5 bg-current motion-safe:animate-pulse';

  return (
    <span className={className}>
      {text}
      {active && (
        <span
          aria-hidden="true"
          className={`${cursorBase} ${cursorClassName}`}
        />
      )}
    </span>
  );
}

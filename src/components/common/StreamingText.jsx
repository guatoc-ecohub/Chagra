import React from 'react';

/**
 * StreamingText — renderiza texto en progresion con cursor pulsante.
 *
 * Se usa para mostrar al usuario la generacion token-por-token del LLM
 * (entity extractor o vision). Cuando `active` es false, oculta el
 * cursor (la generacion termino).
 *
 * Props:
 *   - text: string que se acumula a medida que llegan chunks.
 *   - active: boolean — si false, oculta el cursor (streaming terminado).
 *   - className / cursorClassName: customizacion de estilo.
 */
export default function StreamingText({
  text = '',
  active = true,
  className = '',
  cursorClassName = '',
}) {
  return (
    <span className={className}>
      {text}
      {active && (
        <span
          aria-hidden="true"
          className={`inline-block w-[2px] h-[1em] align-text-bottom ml-0.5 animate-pulse bg-current ${cursorClassName}`}
        />
      )}
    </span>
  );
}

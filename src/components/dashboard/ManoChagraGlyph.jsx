/**
 * ManoChagraGlyph — el emblema de "la mano de Chagra" como GLIFO pequeño,
 * pensado para botones (18-24px): el botón que ABRE la red de capacidades
 * (AgentRedMenu). Reemplaza al ícono de tema (que en algunos temas leía como
 * una estrella/forma genérica) por la metáfora central de la marca: "Chagra,
 * su mano en el campo".
 *
 * Diseño: silueta de una mano abierta (palma + 4 dedos) en trazo grueso
 * round-cap del color del texto (`currentColor`) para que herede el color del
 * botón en cualquier tema. De las yemas de los dedos centrales brota una
 * ramita corta con un nodo (la lógica micorriza/rama del emblema grande),
 * sugiriendo que de la mano crece la red de capacidades. Mismo lenguaje visual
 * que `ManoChagraEmblem` (memoria del proyecto, 2026-06-09) pero reducido a
 * tamaño de ícono.
 *
 * `currentColor` + `fill="none"` lo hacen theme-agnóstico (legible al sol y de
 * noche). Sin animación: a tamaño de botón distrae; la animación viva vive en
 * la red que el botón despliega.
 *
 * Props:
 *   - size: número (px) del lado del glifo. Default 20.
 *   - className: clases extra para el <svg>.
 */
import React from 'react';

export default function ManoChagraGlyph({ size = 20, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Palma + muñeca: cuenco de la mano */}
      <path d="M6 21c-1.2-1.4-2-3.1-2-5v-3.2c0-.7.6-1.3 1.3-1.3.7 0 1.2.5 1.2 1.2" />
      <path d="M18 21c1.2-1.4 2-3.1 2-5v-3.2c0-.7-.6-1.3-1.3-1.3-.7 0-1.2.5-1.2 1.2" />
      {/* Cuatro dedos (de izquierda a derecha) que parten de la palma */}
      <path d="M6.5 12.9V9.4" />
      <path d="M9.8 12.6V7.2" />
      <path d="M13.2 12.6V6.6" />
      <path d="M16.6 12.9V8" />
      {/* Brote/yema en la punta de los dedos centrales: ramita + nodo
          (la red de capacidades que crece de la mano). */}
      <path d="M9.8 7.2l-1.6-1.5M9.8 7.2l1.5-1.7" />
      <path d="M13.2 6.6l-1.5-1.7M13.2 6.6l1.6-1.5" />
      <circle cx="8.2" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="11.3" cy="5.4" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="11.7" cy="4.8" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

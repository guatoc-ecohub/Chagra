import React from 'react';

/**
 * ManoChagraIcon — ícono de la MANO de Chagra para botones/triggers del agente.
 *
 * Reemplaza la ESTRELLA (lucide Sparkles) que se usaba en los botones "Abrir la
 * mano de Chagra" (task #58, operador 2026-06-19: el ícono era incoherente con
 * el nombre del botón — decía "mano" y mostraba una estrellita). Es una mano
 * abierta dibujada en el mismo lenguaje visual que lucide-react (trazo de 2px,
 * currentColor, redondeos), así combina con el resto de íconos del overlay sin
 * cargar un asset externo ni introducir riesgo de XSS.
 *
 * La "mano de Chagra" plena (la red orgánica de capacidades) vive en
 * AgentRedMenu; esto es solo su firma reducida para un botón pequeño.
 *
 * @param {Object} props
 * @param {number} [props.size=18] - Lado en px.
 * @param {string} [props.className] - Clases del SVG (color vía text-*).
 */
export default function ManoChagraIcon({ size = 18, className = '', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* Mano abierta: palma + cuatro dedos + pulgar. Mismo estilo que lucide. */}
      <path d="M9 11V5a1.5 1.5 0 0 1 3 0v5" />
      <path d="M12 10V4a1.5 1.5 0 0 1 3 0v6" />
      <path d="M15 10.5V6a1.5 1.5 0 0 1 3 0v7" />
      <path d="M18 13V8" />
      <path d="M9 11V8.5a1.5 1.5 0 0 0-3 0v4.5l-1.6-1.6a1.5 1.5 0 0 0-2.1 2.12l3.2 3.4A6 6 0 0 0 12 21a6 6 0 0 0 6-6" />
    </svg>
  );
}
